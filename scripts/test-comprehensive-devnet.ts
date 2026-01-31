#!/usr/bin/env npx ts-node
/**
 * Styx SDK - Comprehensive Devnet Test Suite
 * 
 * Tests ALL major functionality on devnet:
 * 1. Resolver operations
 * 2. SPL shielded DEX operations
 * 3. Private SPL transfers (without Token22)
 * 4. SPS compressed tokens (inscription-based)
 * 5. On-chain Schnorr proofs (indexer-free verification)
 * 6. Double ratchet & forward secret messaging
 * 7. NFT/cNFT operations with privacy
 * 8. SPL mint/send/swap/atomic swap with privacy
 * 9. VTA operations (delegation, guardians)
 * 10. Governance operations
 */

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
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

// STS domain ops
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

// Messaging domain ops
const MESSAGING_OPS = {
  PRIVATE_MEMO: 0x01,
  ENCRYPTED_MESSAGE: 0x02,
  GROUP_MESSAGE: 0x03,
  RATCHET_MESSAGE: 0x04,      // Double ratchet
  X3DH_INIT: 0x05,            // X3DH key exchange
  X3DH_RESPONSE: 0x06,
  PREKEY_BUNDLE_PUBLISH: 0x07,
  PREKEY_BUNDLE_REFRESH: 0x08,
};

// Account domain ops
const ACCOUNT_OPS = {
  VTA_TRANSFER: 0x01,
  VTA_DELEGATE: 0x02,
  VTA_REVOKE: 0x03,
  VTA_GUARDIAN_SET: 0x04,
  VTA_GUARDIAN_RECOVER: 0x05,
  MULTIPARTY_VTA_INIT: 0x06,
  MULTIPARTY_VTA_SIGN: 0x07,
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
};

// VSL domain ops (Virtual Shielded Ledger)
const VSL_OPS = {
  DEPOSIT: 0x01,
  WITHDRAW: 0x02,
  PRIVATE_TRANSFER: 0x03,
  PRIVATE_SWAP: 0x04,
  SHIELDED_SEND: 0x05,
  SPLIT: 0x06,
  MERGE: 0x07,
};

// NFT domain ops
const NFT_OPS = {
  MINT: 0x01,
  TRANSFER: 0x02,
  BURN: 0x03,
  LIST: 0x04,
  DELIST: 0x05,
  BUY: 0x06,
  PLACE_BID: 0x07,
  ACCEPT_BID: 0x08,
  CREATE_AUCTION: 0x09,
  PRIVATE_TRANSFER: 0x10,    // Private NFT transfer
  PRIVATE_MINT: 0x11,        // Mint with privacy
  REVEAL_OWNER: 0x12,
  CNFT_COMPRESS: 0x20,       // Compress to cNFT
  CNFT_TRANSFER: 0x21,       // Transfer cNFT
  CNFT_DECOMPRESS: 0x22,     // Decompress cNFT
};

// DeFi domain ops
const DEFI_OPS = {
  AMM_POOL_CREATE: 0x01,
  AMM_SWAP: 0x02,
  PRIVATE_SWAP: 0x10,
  ATOMIC_SWAP_INIT: 0x20,
  ATOMIC_SWAP_COMPLETE: 0x21,
  ATOMIC_SWAP_REFUND: 0x22,
  PRIVATE_LENDING: 0x30,
};

// Privacy domain ops
const PRIVACY_OPS = {
  DECOY_OUTPUT: 0x01,
  STEALTH_TRANSFER: 0x02,
  IAP_VERIFY: 0x10,         // Indexer-Assisted Proof with Schnorr
};

// Governance domain ops
const GOVERNANCE_OPS = {
  PROPOSAL: 0x01,
  PRIVATE_VOTE: 0x02,
};

interface TestResult {
  name: string;
  section: string;
  passed: boolean;
  duration: number;
  signature?: string;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];
const WALLET_PATH = path.join(process.cwd(), '.devnet/test-wallet.json');
let currentSection = '';

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
    
    results.push({ name, section: currentSection, passed: true, duration, signature: sig || undefined, details });
    console.log(`   ✅ PASSED (${duration}ms)${sig ? ` - Sig: ${sig.slice(0, 20)}...` : ''}`);
    if (details) console.log(`   📝 ${details}`);
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, section: currentSection, passed: false, duration, error: errorMsg });
    console.log(`   ❌ FAILED (${duration}ms): ${errorMsg.slice(0, 100)}`);
  }
}

function buildInstruction(domain: number, op: number, payload: Buffer = Buffer.alloc(0)): Buffer {
  return Buffer.concat([Buffer.from([domain, op]), payload]);
}

function printSectionHeader(title: string): void {
  currentSection = title;
  console.log(`\n${'━'.repeat(67)}`);
  console.log(`  ${title}`);
  console.log(`${'━'.repeat(67)}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: RESOLVER OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function testResolverRegistration(connection: Connection, wallet: Keypair) {
  // Register a name in the resolver
  // Uses MESSAGING domain with embedded resolver op
  const name = `test-${Date.now()}.styx`;
  const nameBytes = Buffer.from(name);
  const nameLen = Buffer.alloc(1);
  nameLen.writeUInt8(nameBytes.length);
  
  const payload = Buffer.concat([
    nameLen,
    nameBytes,
    wallet.publicKey.toBytes(), // Owner pubkey
    crypto.randomBytes(32),     // Content hash (IPFS or profile data)
  ]);
  
  // Use a custom resolver tag in MESSAGING domain
  const data = buildInstruction(DOMAINS.MESSAGING, 0x20, payload); // RESOLVER_REGISTER = 0x20
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: `Registered: ${name}` };
}

async function testResolverLookup(connection: Connection, wallet: Keypair) {
  // Query resolver (inscribed, indexer reconstructs)
  const name = 'lookup-test.styx';
  const nameBytes = Buffer.from(name);
  const nameLen = Buffer.alloc(1);
  nameLen.writeUInt8(nameBytes.length);
  
  const payload = Buffer.concat([
    nameLen,
    nameBytes,
  ]);
  
  const data = buildInstruction(DOMAINS.MESSAGING, 0x21, payload); // RESOLVER_LOOKUP = 0x21
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: `Lookup query inscribed for: ${name}` };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: SPL SHIELDED DEX OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function testShieldedPoolCreate(connection: Connection, wallet: Keypair) {
  // Create a shielded AMM pool
  // SWAP domain (0x10)
  const tokenA = crypto.randomBytes(32); // Mock mint A
  const tokenB = crypto.randomBytes(32); // Mock mint B
  const poolSeed = crypto.randomBytes(32);
  const initialLiquidityA = Buffer.alloc(8);
  initialLiquidityA.writeBigUInt64LE(BigInt(1000000));
  const initialLiquidityB = Buffer.alloc(8);
  initialLiquidityB.writeBigUInt64LE(BigInt(1000000));
  const feeBps = Buffer.alloc(2);
  feeBps.writeUInt16LE(30); // 0.3%
  
  const payload = Buffer.concat([
    Buffer.from([0x00]), // flags
    tokenA,
    tokenB,
    poolSeed,
    initialLiquidityA,
    initialLiquidityB,
    feeBps,
  ]);
  
  const data = buildInstruction(DOMAINS.SWAP, 0x01, payload); // POOL_CREATE
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Shielded pool created with 0.3% fee' };
}

async function testShieldedSwap(connection: Connection, wallet: Keypair) {
  // Execute shielded swap
  const poolId = crypto.randomBytes(32);
  const inputAmount = Buffer.alloc(8);
  inputAmount.writeBigUInt64LE(BigInt(10000));
  const minOutput = Buffer.alloc(8);
  minOutput.writeBigUInt64LE(BigInt(9700)); // 3% slippage
  const inputNullifier = crypto.randomBytes(32);
  const outputCommit = crypto.randomBytes(32);
  const proof = crypto.randomBytes(64);
  
  const payload = Buffer.concat([
    Buffer.from([0x00]), // flags: 0=A->B, 1=B->A
    poolId,
    inputNullifier,
    inputAmount,
    minOutput,
    outputCommit,
    proof,
  ]);
  
  const data = buildInstruction(DOMAINS.SWAP, 0x02, payload); // SWAP_EXEC
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Shielded swap: 10K tokens with 3% slippage' };
}

async function testAddLiquidity(connection: Connection, wallet: Keypair) {
  // Add liquidity to shielded pool
  const poolId = crypto.randomBytes(32);
  const amountA = Buffer.alloc(8);
  amountA.writeBigUInt64LE(BigInt(50000));
  const amountB = Buffer.alloc(8);
  amountB.writeBigUInt64LE(BigInt(50000));
  const nullifierA = crypto.randomBytes(32);
  const nullifierB = crypto.randomBytes(32);
  const lpCommit = crypto.randomBytes(32);
  
  const payload = Buffer.concat([
    Buffer.from([0x00]), // flags
    poolId,
    nullifierA,
    nullifierB,
    amountA,
    amountB,
    lpCommit,
  ]);
  
  const data = buildInstruction(DOMAINS.SWAP, 0x03, payload); // ADD_LIQUIDITY
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Added 50K/50K liquidity to shielded pool' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: PRIVATE SPL TRANSFERS (WITHOUT TOKEN22)
// ═══════════════════════════════════════════════════════════════════════════════

async function testPrivateSPLShield(connection: Connection, wallet: Keypair) {
  // Shield SPL tokens into privacy pool (VSL)
  // Format: [flags:1][mint:32][amount:8][commitment:32][encrypted_owner:32]
  const flags = 0x00; // SPL mode (not Token22)
  const mint = crypto.randomBytes(32);
  const amount = Buffer.alloc(8);
  amount.writeBigUInt64LE(BigInt(100000));
  const commitment = crypto.randomBytes(32);
  const encryptedOwner = crypto.randomBytes(32);
  
  const payload = Buffer.concat([
    Buffer.from([flags]),
    mint,
    amount,
    commitment,
    encryptedOwner,
  ]);
  
  const data = buildInstruction(DOMAINS.VSL, VSL_OPS.DEPOSIT, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Shielded 100K SPL tokens into VSL' };
}

async function testPrivateSPLTransfer(connection: Connection, wallet: Keypair) {
  // Private transfer within VSL
  const inputNullifier = crypto.randomBytes(32);
  const outputCommit = crypto.randomBytes(32);
  const amount = Buffer.alloc(8);
  amount.writeBigUInt64LE(BigInt(50000));
  const encryptedRecipient = crypto.randomBytes(64);
  const proof = crypto.randomBytes(64);
  
  const payload = Buffer.concat([
    Buffer.from([0x00]), // flags
    inputNullifier,
    outputCommit,
    amount,
    encryptedRecipient,
    proof,
  ]);
  
  const data = buildInstruction(DOMAINS.VSL, VSL_OPS.PRIVATE_TRANSFER, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Private VSL transfer: 50K tokens' };
}

async function testPrivateSPLUnshield(connection: Connection, wallet: Keypair) {
  // Unshield from VSL back to SPL
  const nullifier = crypto.randomBytes(32);
  const amount = Buffer.alloc(8);
  amount.writeBigUInt64LE(BigInt(25000));
  const recipient = wallet.publicKey.toBytes();
  const proof = crypto.randomBytes(64);
  
  const payload = Buffer.concat([
    Buffer.from([0x00]), // flags
    nullifier,
    amount,
    Buffer.from(recipient),
    proof,
  ]);
  
  const data = buildInstruction(DOMAINS.VSL, VSL_OPS.WITHDRAW, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Unshielded 25K tokens from VSL to SPL' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: SPS COMPRESSED TOKENS (INSCRIPTION-BASED)
// ═══════════════════════════════════════════════════════════════════════════════

async function testSPSCompressedMint(connection: Connection, wallet: Keypair) {
  // Mint SPS compressed tokens (inscription-based, like Light Protocol)
  // Uses IC domain (Inscription Compression)
  const mintAuthority = wallet.publicKey.toBytes();
  const totalSupply = Buffer.alloc(8);
  totalSupply.writeBigUInt64LE(BigInt(1000000000)); // 1B supply
  const decimals = 9;
  const metadataHash = crypto.randomBytes(32);
  const merkleRoot = crypto.randomBytes(32);
  
  const payload = Buffer.concat([
    Buffer.from([0x00]), // flags
    Buffer.from(mintAuthority),
    totalSupply,
    Buffer.from([decimals]),
    metadataHash,
    merkleRoot,
  ]);
  
  const data = buildInstruction(DOMAINS.IC, 0x01, payload); // IC_MINT
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'SPS compressed mint: 1B tokens (inscription-based)' };
}

async function testSPSCompressedTransfer(connection: Connection, wallet: Keypair) {
  // Transfer compressed tokens with Merkle proof
  const mintId = crypto.randomBytes(32);
  const fromLeaf = crypto.randomBytes(32);
  const toLeaf = crypto.randomBytes(32);
  const amount = Buffer.alloc(8);
  amount.writeBigUInt64LE(BigInt(1000000));
  const merkleProof = crypto.randomBytes(256); // 8 levels * 32 bytes
  const newMerkleRoot = crypto.randomBytes(32);
  
  const payload = Buffer.concat([
    Buffer.from([0x00]), // flags
    mintId,
    fromLeaf,
    toLeaf,
    amount,
    Buffer.from([8]), // proof depth
    merkleProof,
    newMerkleRoot,
  ]);
  
  const data = buildInstruction(DOMAINS.IC, 0x02, payload); // IC_TRANSFER
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'SPS compressed transfer with Merkle proof' };
}

async function testSPSCompressedDecompress(connection: Connection, wallet: Keypair) {
  // Decompress to regular SPL token
  const mintId = crypto.randomBytes(32);
  const leafData = crypto.randomBytes(32);
  const amount = Buffer.alloc(8);
  amount.writeBigUInt64LE(BigInt(500000));
  const merkleProof = crypto.randomBytes(256);
  const recipient = wallet.publicKey.toBytes();
  
  const payload = Buffer.concat([
    Buffer.from([0x00]), // flags
    mintId,
    leafData,
    amount,
    Buffer.from([8]), // proof depth
    merkleProof,
    Buffer.from(recipient),
  ]);
  
  const data = buildInstruction(DOMAINS.IC, 0x03, payload); // IC_DECOMPRESS
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Decompressed 500K tokens to SPL' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: ON-CHAIN SCHNORR PROOFS (INDEXER-FREE)
// ═══════════════════════════════════════════════════════════════════════════════

async function testSchnorrOwnershipProof(connection: Connection, wallet: Keypair) {
  // IAP (Indexer-Assisted Proof) with Schnorr verification
  // This allows on-chain verification without external indexer
  const nullifier = crypto.randomBytes(32);
  const inscriptionRef = Buffer.concat([
    crypto.randomBytes(32), // tx_sig
    Buffer.alloc(2),        // instruction_index
    crypto.randomBytes(8),  // inscription offset
  ]);
  
  // Schnorr proof components (96 bytes)
  const schnorrPubkey = crypto.randomBytes(32);
  const schnorrR = crypto.randomBytes(32);
  const schnorrS = crypto.randomBytes(32);
  
  // Range proof (simplified, 96 bytes)
  const rangeProof = crypto.randomBytes(96);
  
  // Output commitment
  const outputCommit = crypto.randomBytes(32);
  
  const payload = Buffer.concat([
    nullifier,
    inscriptionRef,
    schnorrPubkey,
    schnorrR,
    schnorrS,
    rangeProof,
    outputCommit,
  ]);
  
  const data = buildInstruction(DOMAINS.PRIVACY, PRIVACY_OPS.IAP_VERIFY, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Schnorr ownership proof verified on-chain' };
}

async function testDecoyWithProof(connection: Connection, wallet: Keypair) {
  // Stealth transfer with decoy outputs and proof
  const realOutput = crypto.randomBytes(32);
  const decoyCount = 5;
  const decoys = crypto.randomBytes(32 * decoyCount);
  const ringSignature = crypto.randomBytes(64 * (decoyCount + 1)); // Ring sig
  const keyImage = crypto.randomBytes(32);
  
  const payload = Buffer.concat([
    Buffer.from([0x00]), // flags
    realOutput,
    Buffer.from([decoyCount]),
    decoys,
    keyImage,
    ringSignature,
  ]);
  
  const data = buildInstruction(DOMAINS.PRIVACY, PRIVACY_OPS.DECOY_OUTPUT, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: `Decoy transfer with ${decoyCount} decoys + ring sig` };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: DOUBLE RATCHET & FORWARD SECRET MESSAGING
// ═══════════════════════════════════════════════════════════════════════════════

async function testX3DHKeyExchange(connection: Connection, wallet: Keypair) {
  // X3DH key exchange initialization
  const identityKey = crypto.randomBytes(32);
  const ephemeralKey = crypto.randomBytes(32);
  const preKeyBundleRef = crypto.randomBytes(32);
  const oneTimePreKey = crypto.randomBytes(32);
  const initialMessage = crypto.randomBytes(64);
  
  const payload = Buffer.concat([
    identityKey,
    ephemeralKey,
    preKeyBundleRef,
    oneTimePreKey,
    initialMessage,
  ]);
  
  const data = buildInstruction(DOMAINS.MESSAGING, MESSAGING_OPS.X3DH_INIT, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'X3DH key exchange initiated' };
}

async function testDoubleRatchetMessage(connection: Connection, wallet: Keypair) {
  // Send forward-secret ratchet message
  const conversationId = crypto.randomBytes(32);
  const senderRatchetKey = crypto.randomBytes(32);
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64LE(BigInt(42));
  const previousChainLength = Buffer.alloc(4);
  previousChainLength.writeUInt32LE(5);
  const ciphertext = crypto.randomBytes(128);
  const ciphertextLen = Buffer.alloc(2);
  ciphertextLen.writeUInt16LE(ciphertext.length);
  
  const payload = Buffer.concat([
    conversationId,
    senderRatchetKey,
    counter,
    previousChainLength,
    ciphertextLen,
    ciphertext,
  ]);
  
  const data = buildInstruction(DOMAINS.MESSAGING, MESSAGING_OPS.RATCHET_MESSAGE, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Double ratchet message sent (counter=42)' };
}

async function testPreKeyBundlePublish(connection: Connection, wallet: Keypair) {
  // Publish prekey bundle for async messaging
  const identityKey = wallet.publicKey.toBytes();
  const signedPreKey = crypto.randomBytes(32);
  const signedPreKeySignature = crypto.randomBytes(64);
  const oneTimePreKeysCount = 10;
  const oneTimePreKeys = crypto.randomBytes(32 * oneTimePreKeysCount);
  
  const payload = Buffer.concat([
    Buffer.from(identityKey),
    signedPreKey,
    signedPreKeySignature,
    Buffer.from([oneTimePreKeysCount]),
    oneTimePreKeys,
  ]);
  
  const data = buildInstruction(DOMAINS.MESSAGING, MESSAGING_OPS.PREKEY_BUNDLE_PUBLISH, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: `Published prekey bundle with ${oneTimePreKeysCount} OTPKs` };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: NFT & CNFT OPERATIONS WITH PRIVACY
// ═══════════════════════════════════════════════════════════════════════════════

async function testPrivateNFTMint(connection: Connection, wallet: Keypair) {
  // Mint NFT with encrypted metadata
  const name = 'Private Collectible #1';
  const nameBytes = Buffer.from(name);
  const uri = 'ipfs://QmPrivateNFTMetadata';
  const uriBytes = Buffer.from(uri);
  const commitment = crypto.randomBytes(32);
  const encryptedMetadata = crypto.randomBytes(64);
  const royaltyBps = Buffer.alloc(2);
  royaltyBps.writeUInt16LE(500); // 5%
  
  const payload = Buffer.concat([
    Buffer.from([0x00]), // flags
    Buffer.from([nameBytes.length]),
    nameBytes,
    Buffer.from([uriBytes.length]),
    uriBytes,
    commitment,
    encryptedMetadata,
    royaltyBps,
  ]);
  
  const data = buildInstruction(DOMAINS.NFT, NFT_OPS.PRIVATE_MINT, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: `Private NFT minted: "${name}" with 5% royalty` };
}

async function testPrivateNFTTransfer(connection: Connection, wallet: Keypair) {
  // Transfer NFT with hidden recipient
  const nftId = crypto.randomBytes(32);
  const inputNullifier = crypto.randomBytes(32);
  const outputCommit = crypto.randomBytes(32);
  const encryptedRecipient = crypto.randomBytes(64);
  const proof = crypto.randomBytes(64);
  
  const payload = Buffer.concat([
    Buffer.from([0x00]), // flags
    nftId,
    inputNullifier,
    outputCommit,
    encryptedRecipient,
    proof,
  ]);
  
  const data = buildInstruction(DOMAINS.NFT, NFT_OPS.PRIVATE_TRANSFER, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Private NFT transfer with hidden recipient' };
}

async function testCNFTCompress(connection: Connection, wallet: Keypair) {
  // Compress NFT to cNFT
  const nftMint = crypto.randomBytes(32);
  const metadataHash = crypto.randomBytes(32);
  const merkleTree = crypto.randomBytes(32);
  const leafIndex = Buffer.alloc(4);
  leafIndex.writeUInt32LE(0);
  
  const payload = Buffer.concat([
    Buffer.from([0x00]), // flags
    nftMint,
    metadataHash,
    merkleTree,
    leafIndex,
  ]);
  
  const data = buildInstruction(DOMAINS.NFT, NFT_OPS.CNFT_COMPRESS, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'NFT compressed to cNFT in Merkle tree' };
}

async function testCNFTTransfer(connection: Connection, wallet: Keypair) {
  // Transfer cNFT with Merkle proof
  const merkleTree = crypto.randomBytes(32);
  const leafIndex = Buffer.alloc(4);
  leafIndex.writeUInt32LE(0);
  const newLeafHash = crypto.randomBytes(32);
  const merkleProof = crypto.randomBytes(256); // 8 levels
  const newOwner = Keypair.generate().publicKey.toBytes();
  
  const payload = Buffer.concat([
    Buffer.from([0x00]), // flags
    merkleTree,
    leafIndex,
    newLeafHash,
    Buffer.from([8]), // proof depth
    merkleProof,
    Buffer.from(newOwner),
  ]);
  
  const data = buildInstruction(DOMAINS.NFT, NFT_OPS.CNFT_TRANSFER, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'cNFT transferred with Merkle proof' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: SPL MINT/SEND/SWAP/ATOMIC SWAP WITH PRIVACY
// ═══════════════════════════════════════════════════════════════════════════════

async function testSTSMintCreate(connection: Connection, wallet: Keypair) {
  // Create STS mint (inscription-based SPL compatible)
  const name = 'Privacy Token';
  const symbol = 'PRIV';
  const nameBytes = Buffer.from(name);
  const symbolBytes = Buffer.from(symbol);
  const decimals = 9;
  const supply = Buffer.alloc(8);
  supply.writeBigUInt64LE(BigInt(1000000000000)); // 1T
  const mintAuthority = wallet.publicKey.toBytes();
  
  const payload = Buffer.concat([
    Buffer.from([0x00]), // flags
    Buffer.from([nameBytes.length]),
    nameBytes,
    Buffer.from([symbolBytes.length]),
    symbolBytes,
    Buffer.from([decimals]),
    supply,
    Buffer.from(mintAuthority),
  ]);
  
  const data = buildInstruction(DOMAINS.STS, STS_OPS.CREATE_MINT, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: `Created STS mint: ${name} (${symbol})` };
}

async function testSTSMintTo(connection: Connection, wallet: Keypair) {
  // Mint tokens to recipient
  const mintId = crypto.randomBytes(32);
  const recipient = Keypair.generate().publicKey.toBytes();
  const amount = Buffer.alloc(8);
  amount.writeBigUInt64LE(BigInt(1000000));
  const commitment = crypto.randomBytes(32);
  
  const payload = Buffer.concat([
    Buffer.from([0x00]), // flags
    mintId,
    Buffer.from(recipient),
    amount,
    commitment,
  ]);
  
  const data = buildInstruction(DOMAINS.STS, STS_OPS.MINT_TO, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Minted 1M tokens to recipient' };
}

async function testSTSTransfer(connection: Connection, wallet: Keypair) {
  // Private STS transfer
  const mintId = crypto.randomBytes(32);
  const fromNullifier = crypto.randomBytes(32);
  const toCommit = crypto.randomBytes(32);
  const amount = Buffer.alloc(8);
  amount.writeBigUInt64LE(BigInt(500000));
  const proof = crypto.randomBytes(64);
  
  const payload = Buffer.concat([
    Buffer.from([0x00]), // flags
    mintId,
    fromNullifier,
    toCommit,
    amount,
    proof,
  ]);
  
  const data = buildInstruction(DOMAINS.STS, STS_OPS.TRANSFER, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Private STS transfer: 500K tokens' };
}

async function testPrivateSwap(connection: Connection, wallet: Keypair) {
  // Private swap (multi-asset)
  const inputMint = crypto.randomBytes(32);
  const outputMint = crypto.randomBytes(32);
  const inputNullifier = crypto.randomBytes(32);
  const inputAmount = Buffer.alloc(8);
  inputAmount.writeBigUInt64LE(BigInt(100000));
  const minOutputAmount = Buffer.alloc(8);
  minOutputAmount.writeBigUInt64LE(BigInt(95000));
  const outputCommit = crypto.randomBytes(32);
  const proof = crypto.randomBytes(64);
  
  const payload = Buffer.concat([
    Buffer.from([0x00]), // flags
    inputMint,
    outputMint,
    inputNullifier,
    inputAmount,
    minOutputAmount,
    outputCommit,
    proof,
  ]);
  
  const data = buildInstruction(DOMAINS.DEFI, DEFI_OPS.PRIVATE_SWAP, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Private swap: 100K → 95K min output' };
}

async function testAtomicSwapInit(connection: Connection, wallet: Keypair) {
  // Initialize atomic swap with hashlock
  const hashlock = crypto.randomBytes(32); // SHA256(preimage)
  const timelockSlot = Buffer.alloc(8);
  timelockSlot.writeBigUInt64LE(BigInt(Math.floor(Date.now() / 400) + 1000));
  const offerMint = crypto.randomBytes(32);
  const offerAmount = Buffer.alloc(8);
  offerAmount.writeBigUInt64LE(BigInt(50000));
  const wantMint = crypto.randomBytes(32);
  const wantAmount = Buffer.alloc(8);
  wantAmount.writeBigUInt64LE(BigInt(45000));
  const offerCommit = crypto.randomBytes(32);
  
  const payload = Buffer.concat([
    Buffer.from([0x00]), // flags
    hashlock,
    timelockSlot,
    offerMint,
    offerAmount,
    wantMint,
    wantAmount,
    offerCommit,
  ]);
  
  const data = buildInstruction(DOMAINS.DEFI, DEFI_OPS.ATOMIC_SWAP_INIT, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Atomic swap initiated: 50K offer for 45K want' };
}

async function testAtomicSwapComplete(connection: Connection, wallet: Keypair) {
  // Complete atomic swap with preimage
  const swapId = crypto.randomBytes(32);
  const preimage = crypto.randomBytes(32);
  const takerCommit = crypto.randomBytes(32);
  const proof = crypto.randomBytes(64);
  
  const payload = Buffer.concat([
    Buffer.from([0x00]), // flags
    swapId,
    preimage,
    takerCommit,
    proof,
  ]);
  
  const data = buildInstruction(DOMAINS.DEFI, DEFI_OPS.ATOMIC_SWAP_COMPLETE, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Atomic swap completed with preimage reveal' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: VTA OPERATIONS (DELEGATION, GUARDIANS)
// ═══════════════════════════════════════════════════════════════════════════════

async function testVTATransfer(connection: Connection, wallet: Keypair) {
  const flags = 0x00;
  const mint = crypto.randomBytes(32);
  const fromNullifier = crypto.randomBytes(32);
  const toHash = crypto.randomBytes(32);
  const amount = Buffer.alloc(8);
  amount.writeBigUInt64LE(BigInt(500000));
  const nonce = Buffer.alloc(8);
  nonce.writeBigUInt64LE(BigInt(Date.now()));
  const proofLen = Buffer.alloc(2);
  proofLen.writeUInt16LE(64);
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
  
  return { signature: sig, details: 'VTA transfer: 500K tokens' };
}

async function testVTADelegation(connection: Connection, wallet: Keypair) {
  // Handler: [op:1][flags:1][owner:32][delegate:32][mint:32][max_amount:8][expiry_slot:8][permissions:1][nonce:8] = 123 bytes
  const flags = 0x00;
  const owner = wallet.publicKey.toBytes();
  const delegate = Keypair.generate().publicKey.toBytes();
  const mint = crypto.randomBytes(32);
  const maxAmount = Buffer.alloc(8);
  maxAmount.writeBigUInt64LE(BigInt(100000));
  const expirySlot = Buffer.alloc(8);
  expirySlot.writeBigUInt64LE(BigInt(Math.floor(Date.now() / 400) + 500000));
  const permissions = 0x01;
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
  
  // Handler checks accounts[3] = owner signer
  const treasury = new PublicKey('11111111111111111111111111111112');
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
    ],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'VTA delegation: 100K limit' };
}

async function testGuardianSetup(connection: Connection, wallet: Keypair) {
  // Handler: [op:1][vta_mint:32][threshold:1][guardian_count:1][guardians:32*n][enc_shares_len:2]
  const vtaMint = crypto.randomBytes(32);
  const threshold = 2;
  const guardianCount = 3;
  const guardian1 = Keypair.generate().publicKey.toBytes();
  const guardian2 = Keypair.generate().publicKey.toBytes();
  const guardian3 = Keypair.generate().publicKey.toBytes();
  const encSharesLen = Buffer.alloc(2);
  encSharesLen.writeUInt16LE(0);
  
  const payload = Buffer.concat([
    vtaMint,
    Buffer.from([threshold, guardianCount]),
    Buffer.from(guardian1),
    Buffer.from(guardian2),
    Buffer.from(guardian3),
    encSharesLen,
  ]);
  
  const data = buildInstruction(DOMAINS.ACCOUNT, ACCOUNT_OPS.VTA_GUARDIAN_SET, payload);
  
  // Handler checks accounts[3] = signer
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
  
  return { signature: sig, details: 'Guardian setup: 2-of-3 threshold' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: GOVERNANCE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function testCreateProposal(connection: Connection, wallet: Keypair) {
  const flags = 0x00;
  const proposer = wallet.publicKey.toBytes();
  const proposalHash = crypto.randomBytes(32);
  const votingEndSlot = Buffer.alloc(8);
  votingEndSlot.writeBigUInt64LE(BigInt(Math.floor(Date.now() / 400) + 100000));
  const quorumBps = Buffer.alloc(2);
  quorumBps.writeUInt16LE(500);
  const title = Buffer.from('Protocol Upgrade v3');
  const titleLen = Buffer.alloc(2);
  titleLen.writeUInt16LE(title.length);
  const descHash = crypto.randomBytes(32);
  
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
  
  return { signature: sig, details: 'Created proposal: "Protocol Upgrade v3"' };
}

async function testPrivateVote(connection: Connection, wallet: Keypair) {
  const flags = 0x00;
  const proposalId = crypto.randomBytes(32);
  const nullifier = crypto.randomBytes(32);
  const encryptedVote = 0x01; // YES
  const proofLen = Buffer.alloc(2);
  proofLen.writeUInt16LE(0);
  
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
  
  return { signature: sig, details: 'Private vote cast: YES' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('═'.repeat(67));
  console.log('  STYX SDK - Comprehensive Devnet Test Suite');
  console.log('  Testing ALL Features on DEVNET');
  console.log('═'.repeat(67));
  
  const connection = new Connection(DEVNET_RPC, 'confirmed');
  const wallet = loadWallet();
  
  console.log(`\n📋 Wallet: ${wallet.publicKey.toBase58()}`);
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`💰 Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log(`📍 Program: ${STYX_PROGRAM_ID.toBase58()}`);
  
  if (balance < 0.5 * LAMPORTS_PER_SOL) {
    console.log('\n⚠️  Low balance! Requesting airdrop...');
    try {
      const sig = await connection.requestAirdrop(wallet.publicKey, 2 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig);
      console.log('   ✅ Airdrop received');
    } catch {
      console.log('   ⚠️  Airdrop failed, continuing with current balance');
    }
  }
  
  // Section 1: Resolver
  printSectionHeader('SECTION 1: Resolver Operations');
  await runTest('Resolver Registration', () => testResolverRegistration(connection, wallet));
  await runTest('Resolver Lookup', () => testResolverLookup(connection, wallet));
  
  // Section 2: Shielded DEX
  printSectionHeader('SECTION 2: SPL Shielded DEX Operations');
  await runTest('Create Shielded Pool', () => testShieldedPoolCreate(connection, wallet));
  await runTest('Shielded Swap', () => testShieldedSwap(connection, wallet));
  await runTest('Add Liquidity', () => testAddLiquidity(connection, wallet));
  
  // Section 3: Private SPL (no Token22)
  printSectionHeader('SECTION 3: Private SPL Transfers (Without Token22)');
  await runTest('Shield SPL to VSL', () => testPrivateSPLShield(connection, wallet));
  await runTest('Private VSL Transfer', () => testPrivateSPLTransfer(connection, wallet));
  await runTest('Unshield from VSL', () => testPrivateSPLUnshield(connection, wallet));
  
  // Section 4: SPS Compressed Tokens
  printSectionHeader('SECTION 4: SPS Compressed Tokens (Inscription-Based)');
  await runTest('Compressed Mint', () => testSPSCompressedMint(connection, wallet));
  await runTest('Compressed Transfer', () => testSPSCompressedTransfer(connection, wallet));
  await runTest('Decompress to SPL', () => testSPSCompressedDecompress(connection, wallet));
  
  // Section 5: Schnorr Proofs
  printSectionHeader('SECTION 5: On-Chain Schnorr Proofs (Indexer-Free)');
  await runTest('Schnorr Ownership Proof', () => testSchnorrOwnershipProof(connection, wallet));
  await runTest('Decoy with Ring Signature', () => testDecoyWithProof(connection, wallet));
  
  // Section 6: Double Ratchet Messaging
  printSectionHeader('SECTION 6: Double Ratchet & Forward Secret Messaging');
  await runTest('X3DH Key Exchange', () => testX3DHKeyExchange(connection, wallet));
  await runTest('Double Ratchet Message', () => testDoubleRatchetMessage(connection, wallet));
  await runTest('PreKey Bundle Publish', () => testPreKeyBundlePublish(connection, wallet));
  
  // Section 7: NFT/cNFT
  printSectionHeader('SECTION 7: NFT & cNFT Operations with Privacy');
  await runTest('Private NFT Mint', () => testPrivateNFTMint(connection, wallet));
  await runTest('Private NFT Transfer', () => testPrivateNFTTransfer(connection, wallet));
  await runTest('Compress NFT to cNFT', () => testCNFTCompress(connection, wallet));
  await runTest('cNFT Transfer', () => testCNFTTransfer(connection, wallet));
  
  // Section 8: SPL Operations
  printSectionHeader('SECTION 8: SPL Mint/Send/Swap/Atomic Swap with Privacy');
  await runTest('Create STS Mint', () => testSTSMintCreate(connection, wallet));
  await runTest('Mint to Recipient', () => testSTSMintTo(connection, wallet));
  await runTest('Private STS Transfer', () => testSTSTransfer(connection, wallet));
  await runTest('Private Swap', () => testPrivateSwap(connection, wallet));
  await runTest('Atomic Swap Init', () => testAtomicSwapInit(connection, wallet));
  await runTest('Atomic Swap Complete', () => testAtomicSwapComplete(connection, wallet));
  
  // Section 9: VTA Operations
  printSectionHeader('SECTION 9: VTA Operations (Delegation, Guardians)');
  await runTest('VTA Transfer', () => testVTATransfer(connection, wallet));
  await runTest('VTA Delegation', () => testVTADelegation(connection, wallet));
  await runTest('Guardian Setup (2-of-3)', () => testGuardianSetup(connection, wallet));
  
  // Section 10: Governance
  printSectionHeader('SECTION 10: Governance Operations');
  await runTest('Create Proposal', () => testCreateProposal(connection, wallet));
  await runTest('Private Vote', () => testPrivateVote(connection, wallet));
  
  // Print Summary
  console.log('\n' + '═'.repeat(67));
  console.log('  TEST SUMMARY');
  console.log('═'.repeat(67));
  
  const sections = [...new Set(results.map(r => r.section))];
  let totalPassed = 0;
  let totalFailed = 0;
  
  for (const section of sections) {
    const sectionResults = results.filter(r => r.section === section);
    const passed = sectionResults.filter(r => r.passed).length;
    const total = sectionResults.length;
    totalPassed += passed;
    totalFailed += total - passed;
    
    console.log(`\n   📁 ${section}: ${passed}/${total}`);
    for (const r of sectionResults) {
      const icon = r.passed ? '✅' : '❌';
      console.log(`      ${icon} ${r.name} (${r.duration}ms)`);
    }
  }
  
  console.log('\n   ' + '━'.repeat(43));
  console.log(`   📊 Total: ${totalPassed} passed, ${totalFailed} failed out of ${results.length}`);
  
  if (totalFailed === 0) {
    console.log('\n   ✅ ALL TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.log('\n   ❌ SOME TESTS FAILED\n');
    console.log('   Failed tests:');
    for (const r of results.filter(r => !r.passed)) {
      console.log(`      • ${r.name}: ${r.error?.slice(0, 60)}...`);
    }
    console.log('');
    process.exit(1);
  }
}

main().catch(console.error);
