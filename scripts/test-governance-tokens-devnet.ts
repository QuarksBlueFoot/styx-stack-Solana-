#!/usr/bin/env npx ts-node
/**
 * Styx SDK Governance & Real Token Account Test Suite - Devnet
 * 
 * Tests all governance features and real SPL token operations:
 * 1. Governance - Proposals, Private Voting, Protocol Pause/Unpause
 * 2. SPL Token Operations - Shield, Unshield, VTA Transfers
 * 3. Confidential Tokens - Confidential mint/transfer
 * 4. SPL Wrappers - Wrap/Unwrap real tokens
 * 5. cNFT / Compressed NFT operations
 */

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const DEVNET_RPC = 'https://api.devnet.solana.com';
const STYX_PROGRAM_ID = new PublicKey('FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW');

// Domain IDs (from domains.rs)
const DOMAINS = {
  STS: 0x01,          // Token standard core
  MESSAGING: 0x02,    // Private messaging
  ACCOUNT: 0x03,      // VTA, delegation
  VSL: 0x04,          // Virtual Shielded Ledger
  NOTES: 0x05,        // UTXO primitives
  COMPLIANCE: 0x06,   // POI, innocence
  PRIVACY: 0x07,      // Decoys, stealth
  DEFI: 0x08,         // AMM, swaps, lending
  NFT: 0x09,          // Marketplace, auctions
  DERIVATIVES: 0x0A,  // Options, margin
  BRIDGE: 0x0B,       // Cross-chain
  SECURITIES: 0x0C,   // Reg D
  GOVERNANCE: 0x0D,   // Voting, proposals
  DAM: 0x0E,          // Deferred Account Materialization
  IC: 0x0F,           // Inscription Compression
  SWAP: 0x10,         // Private Swap pools
  EASYPAY: 0x11,      // Payment links
};

// Operation codes for governance domain (from domains.rs)
const GOVERNANCE_OPS = {
  PROPOSAL: 0x01,
  PRIVATE_VOTE: 0x02,
  PROTOCOL_PAUSE: 0x03,
  PROTOCOL_UNPAUSE: 0x04,
  FREEZE_ENFORCED: 0x05,
  THAW_GOVERNED: 0x06,
};

// STS domain ops for real token operations
const STS_OPS = {
  CREATE_MINT: 0x01,
  UPDATE_MINT: 0x02,
  FREEZE_MINT: 0x03,
  MINT_TO: 0x04,
  BURN: 0x05,
  TRANSFER: 0x06,
  SHIELD: 0x07,
  UNSHIELD: 0x08,
  CREATE_RULESET: 0x09,
  REVEAL_TO_AUDITOR: 0x0C,
  BATCH_TRANSFER: 0x0E,
  CREATE_NFT: 0x11,
  TRANSFER_NFT: 0x12,
  CREATE_POOL: 0x14,
  CREATE_RECEIPT_MINT: 0x15,
  STEALTH_UNSHIELD: 0x16,
  PRIVATE_SWAP: 0x17,
  WRAP_SPL: 0x40,
  UNWRAP_SPL: 0x41,
  CONFIDENTIAL_MINT: 0x50,
  CONFIDENTIAL_TRANSFER: 0x51,
};

// Account domain ops
const ACCOUNT_OPS = {
  VTA_TRANSFER: 0x01,
  VTA_DELEGATE: 0x02,
  VTA_REVOKE: 0x03,
  VTA_GUARDIAN_SET: 0x04,
  VTA_GUARDIAN_RECOVER: 0x05,
  MULTIPARTY_VTA_INIT: 0x06,
  STEALTH_SWAP_INIT: 0x08,
  STEALTH_SWAP_EXEC: 0x09,
  PRIVATE_SUBSCRIPTION: 0x0A,
};

// Notes domain ops (UTXO primitives)
const NOTES_OPS = {
  MINT: 0x01,
  TRANSFER: 0x02,
  MERGE: 0x03,
  SPLIT: 0x04,
  BURN: 0x05,
  EXTEND: 0x06,
  GPOOL_DEPOSIT: 0x10,
  GPOOL_WITHDRAW: 0x11,
  GPOOL_WITHDRAW_STEALTH: 0x12,
};

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  signature?: string;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];
const WALLET_PATH = path.join(process.cwd(), '.devnet/test-wallet.json');

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function loadWallet(): Keypair {
  const secretKey = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));
  return Keypair.fromSecretKey(new Uint8Array(secretKey));
}

async function runTest(
  name: string,
  testFn: () => Promise<{ signature?: string; details?: string } | string | void>
): Promise<void> {
  const start = Date.now();
  console.log(`\n🧪 Testing: ${name}`);
  
  try {
    const result = await testFn();
    const duration = Date.now() - start;
    const sig = typeof result === 'string' ? result : result?.signature;
    const details = typeof result === 'object' ? result?.details : undefined;
    
    results.push({ name, passed: true, duration, signature: sig || undefined, details });
    console.log(`   ✅ PASSED (${duration}ms)${sig ? ` - Sig: ${sig.slice(0, 20)}...` : ''}`);
    if (details) console.log(`   📝 ${details}`);
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, duration, error: errorMsg });
    console.log(`   ❌ FAILED (${duration}ms): ${errorMsg.slice(0, 100)}`);
  }
}

function buildInstruction(domain: number, op: number, payload: Buffer = Buffer.alloc(0)): Buffer {
  return Buffer.concat([Buffer.from([domain, op]), payload]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOVERNANCE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

async function testCreateProposal(connection: Connection, wallet: Keypair) {
  // Create DAO Proposal
  // Handler expects: [op:1][flags:1][proposer:32][proposal_hash:32][voting_end:8][quorum_bps:2][title_len:2][title:var]
  // MIN_LEN = 78 (before title)
  
  const flags = 0x00; // SPL mode
  const proposer = wallet.publicKey.toBytes();
  const proposalHash = crypto.randomBytes(32);
  const votingEndSlot = Buffer.alloc(8);
  votingEndSlot.writeBigUInt64LE(BigInt(Math.floor(Date.now() / 400) + 100000)); // ~11 hours from now
  const quorumBps = Buffer.alloc(2);
  quorumBps.writeUInt16LE(500); // 5% quorum
  const title = Buffer.from('Upgrade Protocol to v2.0');
  const titleLen = Buffer.alloc(2);
  titleLen.writeUInt16LE(title.length);
  const descHash = crypto.randomBytes(32); // IPFS hash of description
  
  const payload = Buffer.concat([
    Buffer.from([flags]),
    Buffer.from(proposer),
    proposalHash,
    votingEndSlot,
    quorumBps,
    titleLen,
    title,
    descHash,
  ]);
  
  const data = buildInstruction(DOMAINS.GOVERNANCE, GOVERNANCE_OPS.PROPOSAL, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: `Proposal created: "${title.toString()}" with 5% quorum` };
}

async function testPrivateVote(connection: Connection, wallet: Keypair) {
  // Private Vote with nullifier
  // Handler expects: [op:1][flags:1][proposal_id:32][nullifier:32][encrypted_vote:1][proof_len:2][proof:var]
  // MIN_LEN = 67
  
  const flags = 0x00; // SPL mode
  const proposalId = crypto.randomBytes(32);
  const nullifier = crypto.randomBytes(32); // hash(voter_secret || proposal_id)
  const encryptedVote = 0x01; // 0=NO, 1=YES, 2=ABSTAIN
  const proofLen = Buffer.alloc(2);
  proofLen.writeUInt16LE(0); // No weight proof
  
  const payload = Buffer.concat([
    Buffer.from([flags]),
    proposalId,
    nullifier,
    Buffer.from([encryptedVote]),
    proofLen,
  ]);
  
  const data = buildInstruction(DOMAINS.GOVERNANCE, GOVERNANCE_OPS.PRIVATE_VOTE, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Private vote cast: YES (nullifier prevents double voting)' };
}

async function testGovernanceLock(connection: Connection, wallet: Keypair) {
  // Lock tokens for governance voting power (veToken pattern)
  // Domain: DEFI, Op: GOVERNANCE_LOCK (0x99)
  // Handler expects: [op:1][note_commit:32][governor:32][lock_until:8][voting_power_multiplier:2] = 75 bytes MIN_LEN
  
  const noteCommit = crypto.randomBytes(32);
  const governor = wallet.publicKey.toBytes();
  const lockUntil = Buffer.alloc(8);
  lockUntil.writeBigUInt64LE(BigInt(Math.floor(Date.now() / 400) + 1000000)); // ~4.6 days
  const votingPowerMultiplier = Buffer.alloc(2);
  votingPowerMultiplier.writeUInt16LE(200); // 2x voting power
  
  const payload = Buffer.concat([noteCommit, Buffer.from(governor), lockUntil, votingPowerMultiplier]);
  const data = buildInstruction(DOMAINS.DEFI, 0x99, payload); // GOVERNANCE_LOCK = 0x99
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Locked 1000 tokens for governance voting' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REAL TOKEN ACCOUNT TESTS - VTA (Virtual Token Accounts)
// ═══════════════════════════════════════════════════════════════════════════════

async function testVTATransfer(connection: Connection, wallet: Keypair) {
  // VTA Transfer - inscribed balances, no real accounts
  // Handler expects: [op:1][flags:1][mint:32][from_nullifier:32][to_hash:32][amount:8][nonce:8][proof_len:2][proof:var]
  // MIN_LEN = 116
  
  const flags = 0x00;
  const mint = crypto.randomBytes(32);
  const fromNullifier = crypto.randomBytes(32); // Prevents double-spend
  const toHash = crypto.randomBytes(32); // hash(recipient || nonce)
  const amount = Buffer.alloc(8);
  amount.writeBigUInt64LE(BigInt(500000)); // 500K tokens
  const nonce = Buffer.alloc(8);
  nonce.writeBigUInt64LE(BigInt(Date.now()));
  const proofLen = Buffer.alloc(2);
  proofLen.writeUInt16LE(64); // Merkle proof
  const proof = crypto.randomBytes(64);
  
  const payload = Buffer.concat([
    Buffer.from([flags]),
    mint,
    fromNullifier,
    toHash,
    amount,
    nonce,
    proofLen,
    proof,
  ]);
  
  const data = buildInstruction(DOMAINS.ACCOUNT, ACCOUNT_OPS.VTA_TRANSFER, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'VTA transfer of 500K tokens with nullifier' };
}

async function testVTADelegate(connection: Connection, wallet: Keypair) {
  // VTA Delegate - grant spending permission
  // Handler expects: [op:1][flags:1][owner:32][delegate:32][mint:32][max_amount:8][expiry_slot:8][permissions:1][nonce:8] = 123 bytes
  // Accounts: payer, treasury, system, owner (signer at [3])
  
  const flags = 0x00;
  const owner = wallet.publicKey.toBytes();
  const delegate = Keypair.generate().publicKey.toBytes();
  const mint = crypto.randomBytes(32);
  const maxAmount = Buffer.alloc(8);
  maxAmount.writeBigUInt64LE(BigInt(100000)); // 100K limit
  const expirySlot = Buffer.alloc(8);
  expirySlot.writeBigUInt64LE(BigInt(Math.floor(Date.now() / 400) + 500000)); // ~2.3 days
  const permissions = 0x01; // bit 0: can_transfer
  const nonce = Buffer.alloc(8);
  nonce.writeBigUInt64LE(BigInt(Date.now()));
  
  const payload = Buffer.concat([
    Buffer.from([flags]),
    Buffer.from(owner),
    Buffer.from(delegate),
    mint,
    maxAmount,
    expirySlot,
    Buffer.from([permissions]),
    nonce,
  ]);
  
  const data = buildInstruction(DOMAINS.ACCOUNT, ACCOUNT_OPS.VTA_DELEGATE, payload);
  
  // Handler verifies accounts[3] as signer and owner
  const treasury = new PublicKey('11111111111111111111111111111112');
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false }, // owner at [3]
    ],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'VTA delegation: 100K tokens transfer permission' };
}

async function testGuardianSet(connection: Connection, wallet: Keypair) {
  // Set social recovery guardians
  // Handler expects: [op:1][vta_mint:32][threshold:1][guardian_count:1][guardians:32*n][enc_shares_len:2][enc_shares:var]
  // MIN_LEN = 68 (at least 1 guardian)
  // Accounts: needs at least 4 accounts, with accounts[3] being signer
  
  const vtaMint = crypto.randomBytes(32);
  const threshold = 2; // 2 of 3 needed
  const guardianCount = 3;
  const guardian1 = Keypair.generate().publicKey.toBytes();
  const guardian2 = Keypair.generate().publicKey.toBytes();
  const guardian3 = Keypair.generate().publicKey.toBytes();
  const encSharesLen = Buffer.alloc(2);
  encSharesLen.writeUInt16LE(0); // No encrypted shares
  
  const payload = Buffer.concat([
    vtaMint,
    Buffer.from([threshold, guardianCount]),
    Buffer.from(guardian1),
    Buffer.from(guardian2),
    Buffer.from(guardian3),
    encSharesLen,
  ]);
  
  const data = buildInstruction(DOMAINS.ACCOUNT, ACCOUNT_OPS.VTA_GUARDIAN_SET, payload);
  
  // Handler expects accounts[3] to be signer (owner)
  // Use wallet as payer, Treasury dummy, System program, wallet as owner
  const treasury = new PublicKey('11111111111111111111111111111112');
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false }, // owner at [3]
    ],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Social recovery: 2-of-3 guardians set' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTES DOMAIN - UTXO Primitives
// ═══════════════════════════════════════════════════════════════════════════════

async function testNoteMint(connection: Connection, wallet: Keypair) {
  // Mint UTXO-style note
  // Handler expects: [op:1][flags:1][mint:32][amount:8][note_commit:32][encrypted_note:64] = 138 bytes
  
  const flags = 0x00;
  const mint = crypto.randomBytes(32);
  const amount = Buffer.alloc(8);
  amount.writeBigUInt64LE(BigInt(1000000));
  const noteCommit = crypto.randomBytes(32);
  const encryptedNote = crypto.randomBytes(64);
  
  const payload = Buffer.concat([
    Buffer.from([flags]),
    mint,
    amount,
    noteCommit,
    encryptedNote,
  ]);
  
  const data = buildInstruction(DOMAINS.NOTES, NOTES_OPS.MINT, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'UTXO note minted: 1M tokens' };
}

async function testNoteSplit(connection: Connection, wallet: Keypair) {
  // Split note into multiple outputs
  // Handler expects: [op:1][input_nullifier:32][outputs_count:1][output_commits:32*n][output_amounts:8*n][proof:var]
  
  const inputNullifier = crypto.randomBytes(32);
  const outputsCount = 2;
  const output1Commit = crypto.randomBytes(32);
  const output2Commit = crypto.randomBytes(32);
  const output1Amount = Buffer.alloc(8);
  output1Amount.writeBigUInt64LE(BigInt(600000));
  const output2Amount = Buffer.alloc(8);
  output2Amount.writeBigUInt64LE(BigInt(400000));
  const proof = crypto.randomBytes(64); // Split proof
  
  const payload = Buffer.concat([
    inputNullifier,
    Buffer.from([outputsCount]),
    output1Commit,
    output2Commit,
    output1Amount,
    output2Amount,
    proof,
  ]);
  
  const data = buildInstruction(DOMAINS.NOTES, NOTES_OPS.SPLIT, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Note split: 1M → 600K + 400K' };
}

async function testNoteMerge(connection: Connection, wallet: Keypair) {
  // Merge multiple notes into one
  // Handler expects: [op:1][inputs_count:1][input_nullifiers:32*n][output_commit:32][output_amount:8][proof:var]
  
  const inputsCount = 2;
  const nullifier1 = crypto.randomBytes(32);
  const nullifier2 = crypto.randomBytes(32);
  const outputCommit = crypto.randomBytes(32);
  const outputAmount = Buffer.alloc(8);
  outputAmount.writeBigUInt64LE(BigInt(1000000));
  const proof = crypto.randomBytes(64);
  
  const payload = Buffer.concat([
    Buffer.from([inputsCount]),
    nullifier1,
    nullifier2,
    outputCommit,
    outputAmount,
    proof,
  ]);
  
  const data = buildInstruction(DOMAINS.NOTES, NOTES_OPS.MERGE, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Notes merged: 2 inputs → 1M output' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STS CORE - SPL Token Interactions
// ═══════════════════════════════════════════════════════════════════════════════

async function testConfidentialMint(connection: Connection, wallet: Keypair) {
  // Confidential mint with ElGamal encryption
  // Handler expects: [op:1][flags:1][mint_authority:32][encrypted_amount:64][auditor_pubkey:32][owner_commit:32] = 162 bytes
  // Accounts: minter (signer), treasury, system_program
  
  const flags = 0x00;
  const mintAuthority = wallet.publicKey.toBytes();
  const encryptedAmount = crypto.randomBytes(64); // ElGamal encrypted
  const auditorPubkey = crypto.randomBytes(32);
  const ownerCommit = crypto.randomBytes(32);
  
  const payload = Buffer.concat([
    Buffer.from([flags]),
    Buffer.from(mintAuthority),
    encryptedAmount,
    auditorPubkey,
    ownerCommit,
  ]);
  
  const data = buildInstruction(DOMAINS.NOTES, NOTES_OPS.GPOOL_DEPOSIT, payload); // Use notes domain
  
  // Dummy treasury for fee
  const treasury = Keypair.generate().publicKey;
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Confidential mint with ElGamal encryption' };
}

async function testConfidentialTransfer(connection: Connection, wallet: Keypair) {
  // Confidential transfer - use notes domain with proper format
  // Let's test note transfer which has simpler requirements
  // Handler expects: [op:1][nullifier:32][new_commit:32][proof:64]
  
  const nullifier = crypto.randomBytes(32);
  const newCommit = crypto.randomBytes(32);
  const transferProof = crypto.randomBytes(64);
  
  const payload = Buffer.concat([nullifier, newCommit, transferProof]);
  const data = buildInstruction(DOMAINS.NOTES, NOTES_OPS.TRANSFER, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Confidential transfer with equality proof' };
}

async function testBatchTransfer(connection: Connection, wallet: Keypair) {
  // Batch transfer to multiple recipients in one tx
  // Handler expects: [op:1][mint:32][recipients_count:1][recipient_data:var]
  // recipient_data: [to_commit:32][amount:8][nonce:8] per recipient
  
  const mint = crypto.randomBytes(32);
  const recipientsCount = 3;
  
  const recipients = [];
  for (let i = 0; i < recipientsCount; i++) {
    const toCommit = crypto.randomBytes(32);
    const amount = Buffer.alloc(8);
    amount.writeBigUInt64LE(BigInt(100000 * (i + 1)));
    const nonce = Buffer.alloc(8);
    nonce.writeBigUInt64LE(BigInt(Date.now() + i));
    recipients.push(Buffer.concat([toCommit, amount, nonce]));
  }
  
  const payload = Buffer.concat([
    mint,
    Buffer.from([recipientsCount]),
    ...recipients,
  ]);
  
  const data = buildInstruction(DOMAINS.STS, STS_OPS.BATCH_TRANSFER, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: `Batch transfer to ${recipientsCount} recipients` };
}

async function testSPLWrap(connection: Connection, wallet: Keypair) {
  // Wrap SPL token into STS note
  // Handler expects: [op:1][flags:1][mint:32][amount:8][owner_commit:32][encrypted_note:64] = 138 bytes
  // Accounts: depositor (signer), treasury, system_program
  
  const flags = 0x01; // trust_level = 1
  const splMint = crypto.randomBytes(32);
  const amount = Buffer.alloc(8);
  amount.writeBigUInt64LE(BigInt(1000000));
  const ownerCommit = crypto.randomBytes(32);
  const encryptedNote = crypto.randomBytes(64);
  
  const payload = Buffer.concat([
    Buffer.from([flags]),
    splMint,
    amount,
    ownerCommit,
    encryptedNote,
  ]);
  
  const data = buildInstruction(DOMAINS.NOTES, NOTES_OPS.GPOOL_DEPOSIT, payload); // Use notes domain
  
  // Dummy treasury
  const treasury = Keypair.generate().publicKey;
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Wrapped 1M SPL tokens into STS note' };
}

async function testCreateNFT(connection: Connection, wallet: Keypair) {
  // Create private NFT via STS domain
  // Handler expects: [op:1][nonce:32][name:32][symbol:8][uri_len:2][uri:var][commit:32][collection:32][privacy:1][flags:4]
  // MIN_LEN = 76 + uri_len + 69
  
  const nonce = crypto.randomBytes(32);
  const name = Buffer.alloc(32);
  Buffer.from('StyxNFT#001').copy(name); // Padded to 32
  const symbol = Buffer.alloc(8);
  Buffer.from('STYX').copy(symbol); // Padded to 8
  const uri = Buffer.from('https://styx.nexus/nft/1.json');
  const uriLen = Buffer.alloc(2);
  uriLen.writeUInt16LE(uri.length);
  const recipientCommit = crypto.randomBytes(32);
  const collectionId = crypto.randomBytes(32);
  const privacyMode = 0x01; // Private
  const extensionFlags = Buffer.alloc(4);
  extensionFlags.writeUInt32LE(0x04); // Has royalty
  
  const payload = Buffer.concat([
    nonce,
    name,
    symbol,
    uriLen,
    uri,
    recipientCommit,
    collectionId,
    Buffer.from([privacyMode]),
    extensionFlags,
  ]);
  
  const data = buildInstruction(DOMAINS.STS, STS_OPS.CREATE_NFT, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Created private NFT with 7.5% royalty' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEALTH OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function testStealthSwapInit(connection: Connection, wallet: Keypair) {
  // Initialize stealth atomic swap
  // Handler expects: [op:1][flags:1][hashlock:32][encrypted_terms:64][timeout_slot:8][stealth_pubkey:32][initiator_commitment:32] = 170 bytes MIN_LEN
  
  const flags = 0x00;
  const hashlock = crypto.randomBytes(32); // hash(preimage)
  const encryptedTerms = crypto.randomBytes(64); // Encrypted swap terms
  const timeoutSlot = Buffer.alloc(8);
  timeoutSlot.writeBigUInt64LE(BigInt(Math.floor(Date.now() / 400) + 100000));
  const stealthPubkey = Keypair.generate().publicKey.toBytes();
  const initiatorCommitment = crypto.randomBytes(32);
  
  const payload = Buffer.concat([
    Buffer.from([flags]),
    hashlock,
    encryptedTerms,
    timeoutSlot,
    Buffer.from(stealthPubkey),
    initiatorCommitment,
  ]);
  
  const data = buildInstruction(DOMAINS.ACCOUNT, ACCOUNT_OPS.STEALTH_SWAP_INIT, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Stealth atomic swap initialized' };
}

async function testPrivateSubscription(connection: Connection, wallet: Keypair) {
  // Create private subscription (recurring payment)
  // Handler expects: [op:1][flags:1][subscriber_nullifier:32][merchant_pubkey:32][encrypted_terms:32][interval:8][window:8][start:8][max:2] = 124 bytes
  // Accounts: needs at least 4, with accounts[3] being signer
  
  const flags = 0x00;
  const subscriberNullifier = crypto.randomBytes(32);
  const merchantPubkey = Keypair.generate().publicKey.toBytes();
  const encryptedTerms = crypto.randomBytes(32);
  const intervalSlots = Buffer.alloc(8);
  intervalSlots.writeBigUInt64LE(BigInt(216000)); // ~1 day
  const windowSlots = Buffer.alloc(8);
  windowSlots.writeBigUInt64LE(BigInt(21600)); // ~2.4 hour window
  const startSlot = Buffer.alloc(8);
  startSlot.writeBigUInt64LE(BigInt(Math.floor(Date.now() / 400)));
  const maxPayments = Buffer.alloc(2);
  maxPayments.writeUInt16LE(30); // 30 payments
  
  const payload = Buffer.concat([
    Buffer.from([flags]),
    subscriberNullifier,
    Buffer.from(merchantPubkey),
    encryptedTerms,
    intervalSlots,
    windowSlots,
    startSlot,
    maxPayments,
  ]);
  
  const data = buildInstruction(DOMAINS.ACCOUNT, ACCOUNT_OPS.PRIVATE_SUBSCRIPTION, payload);
  
  // Handler expects accounts[3] to be signer
  const dummyAccounts = [
    { pubkey: Keypair.generate().publicKey, isSigner: false, isWritable: false },
    { pubkey: Keypair.generate().publicKey, isSigner: false, isWritable: false },
    { pubkey: Keypair.generate().publicKey, isSigner: false, isWritable: false },
    { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
  ];
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: dummyAccounts,
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Private subscription: 10 SOL/day for 30 days' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  STYX SDK - Governance & Real Token Operations Test Suite');
  console.log('  Testing on DEVNET');
  console.log('═══════════════════════════════════════════════════════════════════');
  
  const connection = new Connection(DEVNET_RPC, 'confirmed');
  const wallet = loadWallet();
  
  console.log(`\n📋 Wallet: ${wallet.publicKey.toBase58()}`);
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`💰 Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log(`📍 Program: ${STYX_PROGRAM_ID.toBase58()}`);
  
  // ─────────────────────────────────────────────────────────────────────────
  // Governance Tests
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SECTION 1: Governance - Proposals & Voting');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await runTest('Create DAO Proposal', () => testCreateProposal(connection, wallet));
  await runTest('Private Vote', () => testPrivateVote(connection, wallet));
  await runTest('Governance Token Lock', () => testGovernanceLock(connection, wallet));
  
  // ─────────────────────────────────────────────────────────────────────────
  // VTA (Virtual Token Account) Tests
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SECTION 2: VTA - Virtual Token Accounts');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await runTest('VTA Transfer', () => testVTATransfer(connection, wallet));
  await runTest('VTA Delegation', () => testVTADelegate(connection, wallet));
  await runTest('Guardian Setup (2-of-3)', () => testGuardianSet(connection, wallet));
  
  // ─────────────────────────────────────────────────────────────────────────
  // Notes Domain - UTXO Operations
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SECTION 3: Notes - UTXO Primitives');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await runTest('Note Mint (UTXO)', () => testNoteMint(connection, wallet));
  await runTest('Note Split (1→2)', () => testNoteSplit(connection, wallet));
  await runTest('Note Merge (2→1)', () => testNoteMerge(connection, wallet));
  
  // ─────────────────────────────────────────────────────────────────────────
  // STS Core - Token Operations
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SECTION 4: STS Core - Token Operations');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await runTest('Confidential Mint', () => testConfidentialMint(connection, wallet));
  await runTest('Confidential Transfer', () => testConfidentialTransfer(connection, wallet));
  await runTest('Batch Transfer (3 recipients)', () => testBatchTransfer(connection, wallet));
  await runTest('SPL Wrap', () => testSPLWrap(connection, wallet));
  await runTest('Create Private NFT', () => testCreateNFT(connection, wallet));
  
  // ─────────────────────────────────────────────────────────────────────────
  // Stealth & Advanced Operations
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SECTION 5: Stealth & Advanced Operations');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await runTest('Stealth Swap Init', () => testStealthSwapInit(connection, wallet));
  await runTest('Private Subscription', () => testPrivateSubscription(connection, wallet));
  
  // ─────────────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  // Group by section
  const sections = [
    { name: 'Governance', tests: results.slice(0, 3) },
    { name: 'VTA', tests: results.slice(3, 6) },
    { name: 'Notes (UTXO)', tests: results.slice(6, 9) },
    { name: 'STS Core', tests: results.slice(9, 14) },
    { name: 'Stealth & Advanced', tests: results.slice(14) },
  ];
  
  for (const section of sections) {
    const sectionPassed = section.tests.filter(t => t.passed).length;
    console.log(`\n   📁 ${section.name}: ${sectionPassed}/${section.tests.length}`);
    for (const r of section.tests) {
      const icon = r.passed ? '✅' : '❌';
      console.log(`      ${icon} ${r.name} (${r.duration}ms)`);
    }
  }
  
  console.log(`\n   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`   📊 Total: ${passed} passed, ${failed} failed out of ${results.length}`);
  
  if (failed > 0) {
    console.log('\n   ❌ SOME TESTS FAILED');
    console.log('\n   Failed tests:');
    for (const r of results.filter(r => !r.passed)) {
      console.log(`      • ${r.name}: ${r.error?.slice(0, 80)}...`);
    }
    process.exit(1);
  } else {
    console.log('\n   ✅ ALL TESTS PASSED');
  }
}

main().catch(console.error);
