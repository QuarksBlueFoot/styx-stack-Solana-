#!/usr/bin/env npx ts-node
/**
 * Styx SDK DeFi & Advanced Features Test Suite - Devnet
 * 
 * Tests all new features:
 * 1. Private Swap (Shielded Pool)
 * 2. AMM Operations
 * 3. DAM (Deferred Account Materialization)
 * 4. Lending
 * 5. NFT Operations
 * 6. Compliance/POI
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
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

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
  GOVERNANCE: 0x0D,   // Voting
  DAM: 0x0E,          // Deferred Account Materialization
  IC: 0x0F,           // Inscription Compression
  SWAP: 0x10,         // Private Swap pools
};

// Operation codes for each domain (from domains.rs - EXACT values)
const OPS = {
  // STS (0x01) - from sts_standard.rs
  STS_CREATE_MINT: 0x01,     // STS_OP_CREATE_MINT
  STS_MINT_TO: 0x04,         // STS_OP_MINT_TO - use this for minting!
  STS_TRANSFER: 0x06,        // STS_OP_TRANSFER
  STS_BURN: 0x07,            // STS_OP_BURN
  
  // DeFi (0x08) - from domains.rs defi module
  AMM_POOL_CREATE: 0x01,     // OP_AMM_POOL_CREATE
  AMM_ADD_LIQUIDITY: 0x02,   // OP_AMM_ADD_LIQUIDITY
  AMM_REMOVE_LIQUIDITY: 0x03,// OP_AMM_REMOVE_LIQUIDITY
  AMM_SWAP: 0x04,            // OP_AMM_SWAP
  POOL_CREATE: 0x40,         // OP_POOL_CREATE (lending pools)
  PRIVATE_SWAP: 0x70,        // OP_PRIVATE_SWAP
  PRIVATE_LENDING: 0x83,     // OP_PRIVATE_LENDING
  
  // NFT (0x09) - from domains.rs nft module
  NFT_MINT: 0x01,            // OP_MINT
  NFT_LIST: 0x02,            // OP_LIST
  NFT_COLLECTION_CREATE: 0x10, // OP_COLLECTION_CREATE
  NFT_AUCTION_CREATE: 0x20,  // OP_AUCTION_CREATE
  
  // DAM (0x0E) - from domains.rs dam module
  DAM_POOL_CREATE: 0x01,     // OP_POOL_CREATE
  DAM_VIRTUAL_MINT: 0x10,    // OP_VIRTUAL_MINT
  DAM_MATERIALIZE: 0x20,     // OP_MATERIALIZE
  DAM_DEMATERIALIZE: 0x30,   // OP_DEMATERIALIZE
  
  // Privacy (0x07) - from domains.rs privacy module
  DECOY_STORM: 0x01,         // OP_DECOY_STORM
  EPHEMERAL_CREATE: 0x10,    // OP_EPHEMERAL_CREATE
  CHRONO_LOCK: 0x20,         // OP_CHRONO_LOCK
  
  // Compliance (0x06) - from domains.rs compliance module
  INNOCENCE_MINT: 0x01,      // OP_INNOCENCE_MINT (POI)
  INNOCENCE_VERIFY: 0x02,    // OP_INNOCENCE_VERIFY
  CLEAN_SOURCE_REGISTER: 0x10, // OP_CLEAN_SOURCE_REGISTER
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

function buildInstruction(
  domain: number,
  op: number,
  payload: Buffer = Buffer.alloc(0)
): Buffer {
  return Buffer.concat([Buffer.from([domain, op]), payload]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST: STS CORE - Mint & Transfer
// ═══════════════════════════════════════════════════════════════════════════════

async function testSTSMint(connection: Connection, wallet: Keypair) {
  // Mint tokens using STS_OP_MINT_TO
  // Handler expects: [domain:1][op:1][mint_id:32][amount:8][commitment:32][encrypted_len:4][encrypted:var]
  // MIN_LEN = 78 (with encrypted_len=0)
  
  const mintId = crypto.randomBytes(32);
  const amount = Buffer.alloc(8);
  amount.writeBigUInt64LE(1000000n); // 1M tokens
  const commitment = crypto.randomBytes(32);
  const encryptedLen = Buffer.alloc(4);
  encryptedLen.writeUInt32LE(0); // No encrypted data
  
  const payload = Buffer.concat([mintId, amount, commitment, encryptedLen]);
  // Total: 2 + 32 + 8 + 32 + 4 = 78 bytes ✓
  
  const data = buildInstruction(DOMAINS.STS, OPS.STS_MINT_TO, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { 
    signature: sig, 
    details: `Minted 1M tokens to commitment ${commitment.toString('hex').slice(0, 16)}...` 
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST: DEFI - AMM Pool Create
// ═══════════════════════════════════════════════════════════════════════════════

async function testAMMPoolCreate(connection: Connection, wallet: Keypair) {
  // AMM Pool Create - Domain routing now works!
  // Handler receives &data[1..] = [op:1][mint_a:32][mint_b:32][fee:2][type:1][price:8] = 75 bytes
  
  let mintA = crypto.randomBytes(32);
  let mintB = crypto.randomBytes(32);
  
  // Ensure canonical ordering won't be the failure reason
  if (Buffer.compare(mintA, mintB) >= 0) {
    [mintA, mintB] = [mintB, mintA];
  }
  
  const fee = Buffer.alloc(2);
  fee.writeUInt16LE(30); // 0.3% fee
  const poolType = Buffer.from([0x01]); // Constant product  
  const sqrtPrice = Buffer.alloc(8);
  sqrtPrice.writeBigUInt64LE(1000000n);
  
  const payload = Buffer.concat([mintA, mintB, fee, poolType, sqrtPrice]);
  const data = buildInstruction(DOMAINS.DEFI, OPS.AMM_POOL_CREATE, payload);
  
  const dummyPayer = Keypair.generate().publicKey;
  const dummyTreasury = Keypair.generate().publicKey;
  const dummySystem = Keypair.generate().publicKey;
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [
      { pubkey: dummyPayer, isSigner: false, isWritable: false },
      { pubkey: dummyTreasury, isSigner: false, isWritable: false },
      { pubkey: dummySystem, isSigner: false, isWritable: false },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
    ],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'AMM pool created with 0.3% fee' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST: DEFI - AMM Swap
// ═══════════════════════════════════════════════════════════════════════════════

async function testAMMSwap(connection: Connection, wallet: Keypair) {
  // Execute a private AMM swap
  // Format: [DOMAIN_DEFI][OP_AMM_SWAP][pool_id:32][amount_in:8][min_out:8][nullifier:32][commitment:32]
  const poolId = crypto.randomBytes(32);
  const amountIn = Buffer.alloc(8);
  amountIn.writeBigUInt64LE(100000n); // 0.0001 tokens
  const minOut = Buffer.alloc(8);
  minOut.writeBigUInt64LE(95000n); // 5% slippage
  const nullifier = crypto.randomBytes(32);
  const newCommitment = crypto.randomBytes(32);
  
  const payload = Buffer.concat([poolId, amountIn, minOut, nullifier, newCommitment]);
  const data = buildInstruction(DOMAINS.DEFI, OPS.AMM_SWAP, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Private swap executed with 5% slippage tolerance' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST: DAM - Pool Init
// ═══════════════════════════════════════════════════════════════════════════════

async function testDAMPoolInit(connection: Connection, wallet: Keypair) {
  // Create a DAM pool (virtual token with on-demand materialization)
  // Handler expects: [op:1][mint:32][config:8][fee:2] = 43 bytes (MIN_LEN=42)
  // Accounts: creator (signer), pool_pda, system_program
  const splMint = crypto.randomBytes(32);
  const config = Buffer.alloc(8);
  config.writeBigUInt64LE(BigInt(10000));
  const feeBps = Buffer.alloc(2);
  feeBps.writeUInt16LE(50); // 0.5% fee
  
  const payload = Buffer.concat([splMint, config, feeBps]);
  const data = buildInstruction(DOMAINS.DAM, OPS.DAM_POOL_CREATE, payload);
  
  // Derive pool PDA
  const [poolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('dam_pool'), splMint],
    STYX_PROGRAM_ID
  );
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: poolPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'DAM pool initialized with 1M capacity' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST: DAM - Materialize (Virtual → Real SPL)
// ═══════════════════════════════════════════════════════════════════════════════

async function testDAMMaterialize(connection: Connection, wallet: Keypair) {
  // Materialize virtual balance to real SPL token
  // Format: [DOMAIN_DAM][OP_MATERIALIZE][pool_id:32][nullifier:32][proof:varies][recipient:32][amount:8]
  const poolId = crypto.randomBytes(32);
  const nullifier = crypto.randomBytes(32);
  const proofRoot = crypto.randomBytes(32);
  const proofSibling = crypto.randomBytes(32);
  const recipient = wallet.publicKey.toBytes();
  const amount = Buffer.alloc(8);
  amount.writeBigUInt64LE(500000n);
  
  const payload = Buffer.concat([
    poolId,
    nullifier,
    Buffer.from([1]), // proof length
    proofRoot,
    proofSibling,
    Buffer.from(recipient),
    amount,
  ]);
  const data = buildInstruction(DOMAINS.DAM, OPS.DAM_MATERIALIZE, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Materialized 500K virtual tokens to real SPL' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST: NFT - Private Mint
// ═══════════════════════════════════════════════════════════════════════════════

async function testNFTMint(connection: Connection, wallet: Keypair) {
  // Mint a private NFT
  // Handler expects: [op:1][flags:1][collection:32][metadata:32][owner_commit:32][royalty:2][creator:32] = 131 bytes
  // Accounts: minter (signer), treasury, system_program
  const flags = 0x04; // Has royalty
  const collection = crypto.randomBytes(32);
  const metadataHash = crypto.randomBytes(32);
  const ownerCommit = crypto.randomBytes(32);
  const royalty = Buffer.alloc(2);
  royalty.writeUInt16LE(500); // 5% royalty
  const creator = wallet.publicKey.toBytes();
  
  const payload = Buffer.concat([
    Buffer.from([flags]),
    collection,
    metadataHash,
    ownerCommit,
    royalty,
    Buffer.from(creator),
  ]);
  const data = buildInstruction(DOMAINS.NFT, OPS.NFT_MINT, payload);
  
  // Use program's treasury (could be derived PDA)
  const treasury = Keypair.generate().publicKey; // Placeholder - real would be PDA
  
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
  
  return { signature: sig, details: `Minted private NFT with 5% royalty` };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST: COMPLIANCE - POI Submit
// ═══════════════════════════════════════════════════════════════════════════════

async function testPOISubmit(connection: Connection, wallet: Keypair) {
  // Submit Proof of Innocence (Innocence Mint operation)
  // Handler expects: [op:1][source_type:1][commit:32][validity:8][attestor:32][sig:64] = 138 bytes
  // But receives &data[1..] so MIN_LEN=137 (op included as byte 0)
  
  const sourceType = 0x01; // SOURCE_TYPE_CEX
  const sourceCommit = crypto.randomBytes(32);
  const validitySlots = Buffer.alloc(8);
  validitySlots.writeBigUInt64LE(BigInt(432000)); // ~2 days
  const attestor = crypto.randomBytes(32);
  const attestationSig = crypto.randomBytes(64);
  
  const payload = Buffer.concat([
    Buffer.from([sourceType]),
    sourceCommit,
    validitySlots,
    attestor,
    attestationSig,
  ]);
  // Total payload: 1 + 32 + 8 + 32 + 64 = 137 bytes
  // After buildInstruction: [domain:1][op:1][payload:137] = 139 bytes
  // After router strips domain: [op:1][payload:137] = 138 bytes -> exceeds MIN_LEN=137 ✓
  
  const data = buildInstruction(DOMAINS.COMPLIANCE, OPS.INNOCENCE_MINT, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'POI submitted for compliance attestation (CEX source)' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST: PRIVACY - Decoy Storm
// ═══════════════════════════════════════════════════════════════════════════════

async function testDecoyStorm(connection: Connection, wallet: Keypair) {
  // Send a batch of decoy transactions for privacy
  // Handler expects: [op:1][count:1][enc_idx:1][payloads:64*count][nonce:12][commit:32]
  const numDecoys = 2; // Minimum allowed
  const encryptedIndex = 0; // Which decoy is real (encrypted)
  
  // Each decoy is 64 bytes of encrypted payload
  const decoyPayloads = Buffer.concat([
    crypto.randomBytes(64), // decoy 0
    crypto.randomBytes(64), // decoy 1
  ]);
  
  const nonce = crypto.randomBytes(12);
  const commitment = crypto.randomBytes(32);
  
  const payload = Buffer.concat([
    Buffer.from([numDecoys, encryptedIndex]),
    decoyPayloads,
    nonce,
    commitment,
  ]);
  const data = buildInstruction(DOMAINS.PRIVACY, OPS.DECOY_STORM, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: `Decoy storm with ${numDecoys} fake transactions` };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST: LENDING - Create Offer
// ═══════════════════════════════════════════════════════════════════════════════

async function testLendingCreateOffer(connection: Connection, wallet: Keypair) {
  // Create a private lending operation
  // Handler expects: [op:1][action:1][nullifier:32][pool:32][amount:8][cf:2] = 76 bytes
  // But receives &data[1..] so MIN_LEN=75 (op included as byte 0)
  
  const action = 0x00; // 0=deposit
  const noteNullifier = crypto.randomBytes(32);
  const pool = crypto.randomBytes(32);
  const amount = Buffer.alloc(8);
  amount.writeBigUInt64LE(BigInt(100 * LAMPORTS_PER_SOL)); // 100 SOL
  const collateralFactor = Buffer.alloc(2);
  collateralFactor.writeUInt16LE(8000); // 80% collateral factor
  
  const payload = Buffer.concat([Buffer.from([action]), noteNullifier, pool, amount, collateralFactor]);
  // Total payload: 1 + 32 + 32 + 8 + 2 = 75 bytes
  // After buildInstruction: [domain:1][op:1][payload:75] = 77 bytes
  // After router strips domain: [op:1][payload:75] = 76 bytes -> exceeds MIN_LEN=75 ✓
  
  const data = buildInstruction(DOMAINS.DEFI, OPS.PRIVATE_LENDING, payload);
  
  const ix = new TransactionInstruction({
    programId: STYX_PROGRAM_ID,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  
  return { signature: sig, details: 'Private lending operation: 100 SOL deposit' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  STYX SDK - DeFi & Advanced Features Test Suite');
  console.log('  Testing on DEVNET');
  console.log('═══════════════════════════════════════════════════════════════════');
  
  const connection = new Connection(DEVNET_RPC, 'confirmed');
  const wallet = loadWallet();
  
  console.log(`\n📋 Wallet: ${wallet.publicKey.toBase58()}`);
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`💰 Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log(`📍 Program: ${STYX_PROGRAM_ID.toBase58()}`);
  
  // ─────────────────────────────────────────────────────────────────────────
  // Core Token Tests
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SECTION 1: STS Token Standard');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await runTest('STS Token Mint (Virtual)', () => testSTSMint(connection, wallet));
  
  // ─────────────────────────────────────────────────────────────────────────
  // DeFi Tests
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SECTION 2: DeFi - AMM & Swaps');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await runTest('AMM Pool Create', () => testAMMPoolCreate(connection, wallet));
  await runTest('AMM Private Swap', () => testAMMSwap(connection, wallet));
  await runTest('Lending Create Offer', () => testLendingCreateOffer(connection, wallet));
  
  // ─────────────────────────────────────────────────────────────────────────
  // DAM Tests - SKIPPED: Domain 0x0E not routed in current program version
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SECTION 3: DAM (Deferred Account Materialization)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await runTest('DAM Pool Init', () => testDAMPoolInit(connection, wallet));
  await runTest('DAM Materialize', () => testDAMMaterialize(connection, wallet));
  
  // ─────────────────────────────────────────────────────────────────────────
  // NFT & Privacy Tests - Some require special setup
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SECTION 4: NFT & Privacy');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await runTest('NFT Private Mint', () => testNFTMint(connection, wallet));
  await runTest('Privacy Decoy Storm', () => testDecoyStorm(connection, wallet));
  
  // ─────────────────────────────────────────────────────────────────────────
  // Compliance Tests - Handler expects specific byte layout
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SECTION 5: Compliance & POI');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await runTest('POI Submit (Innocence Mint)', () => testPOISubmit(connection, wallet));
  
  // ─────────────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  // Group by section - updated for all tests enabled
  const sections = [
    { name: 'STS Token Standard', tests: results.slice(0, 1) },
    { name: 'DeFi - AMM & Swaps', tests: results.slice(1, 4) },
    { name: 'DAM', tests: results.slice(4, 6) },
    { name: 'NFT & Privacy', tests: results.slice(6, 8) },
    { name: 'Compliance & POI', tests: results.slice(8) },
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
