#!/usr/bin/env node
/**
 * STS v3.0 DEVNET COMPREHENSIVE TEST SUITE
 * 
 * Tests all domains with the new v3.0 hybrid extensibility architecture:
 * - COMPACT: [DOMAIN:u8][OP:u8][payload...] (2 bytes, 255 ops/domain)
 * - EXTENDED: [0x00][SIGHASH:8][payload...] (9 bytes, 2^64 ops)
 * - TLV: [0xFE][TYPE:u8][LEN:u16][data...] (∞ extensions)
 * - SCHEMA: [0xFF][SCHEMA_HASH:32][payload...] (∞ schemas)
 * 
 * Run: node scripts/test-sts-v3-devnet.mjs
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash, randomBytes } from 'crypto';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEVNET_RPC = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('CumUDpSpjmMEsaPhLMZEE8NKtgq9BTT6eyN7RCpsWmPE');

// Test wallets
const WALLET_PATH = '/workspaces/StyxStack/.devnet/test-wallet.json';
const USER1_PATH = '/workspaces/StyxStack/.devnet/test-users/user1.json';
const USER2_PATH = '/workspaces/StyxStack/.devnet/test-users/user2.json';
const USER3_PATH = '/workspaces/StyxStack/.devnet/test-users/user3.json';

// ============================================================================
// STS v3.0 DOMAIN ENCODING
// ============================================================================

const DOMAINS = {
  CORE: 0x01,       // Core token operations
  BRIDGE: 0x02,     // SPL bridge
  STEALTH: 0x03,    // Stealth addresses
  GOVERNANCE: 0x04, // Voting/proposals
  DEFI: 0x05,       // DeFi operations
  COMPLIANCE: 0x06, // KYC/AML
  MESSAGING: 0x07,  // Private messaging
  ENVELOPE: 0x08,   // Encrypted envelopes
  NFT: 0x09,        // NFT operations
  DERIVATIVES: 0x0A, // Options/futures
  BRIDGE_PROTOCOL: 0x0B, // Cross-chain
  SECURITIES: 0x0C,  // Security tokens
  GAMING: 0x0D,      // Gaming privacy
};

const OPERATIONS = {
  // Core (0x01)
  CORE_MINT: 0x01,
  CORE_TRANSFER: 0x02,
  CORE_BURN: 0x03,
  CORE_APPROVE: 0x04,
  
  // NFT (0x09)
  NFT_CREATE: 0x11,
  NFT_TRANSFER: 0x12,
  NFT_LIST: 0x13,
  NFT_BID: 0x14,
  
  // Messaging (0x07)
  MSG_SEND: 0x01,
  MSG_READ_RECEIPT: 0x02,
  
  // Governance (0x04)
  GOV_CREATE_PROPOSAL: 0x01,
  GOV_VOTE: 0x02,
  
  // DeFi (0x05)
  DEFI_SWAP: 0x01,
  DEFI_ADD_LIQUIDITY: 0x02,
  
  // Stealth (0x03)
  STEALTH_SEND: 0x01,
  STEALTH_SCAN: 0x02,
};

// Extended mode constants
const EXTENDED_MODE = 0x00;
const TLV_MODE = 0xFE;
const SCHEMA_MODE = 0xFF;

// ============================================================================
// UTILITIES
// ============================================================================

function loadKeypair(path) {
  const secret = JSON.parse(readFileSync(path, 'utf-8'));
  return Keypair.fromSecretKey(new Uint8Array(secret));
}

function encodeCompact(domain, op, payload = Buffer.alloc(0)) {
  const data = Buffer.alloc(2 + payload.length);
  data.writeUInt8(domain, 0);
  data.writeUInt8(op, 1);
  payload.copy(data, 2);
  return data;
}

function encodeExtended(sighash, payload = Buffer.alloc(0)) {
  const data = Buffer.alloc(9 + payload.length);
  data.writeUInt8(EXTENDED_MODE, 0);
  sighash.copy(data, 1);
  payload.copy(data, 9);
  return data;
}

function encodeTLV(type, value) {
  const data = Buffer.alloc(4 + value.length);
  data.writeUInt8(TLV_MODE, 0);
  data.writeUInt8(type, 1);
  data.writeUInt16LE(value.length, 2);
  value.copy(data, 4);
  return data;
}

function encodeSchema(schemaHash, payload) {
  const data = Buffer.alloc(33 + payload.length);
  data.writeUInt8(SCHEMA_MODE, 0);
  schemaHash.copy(data, 1);
  payload.copy(data, 33);
  return data;
}

function computeSighash(name) {
  return createHash('sha256').update(`global:${name}`).digest().slice(0, 8);
}

function computeSchemaHash(schemaDefinition) {
  return createHash('sha256').update(schemaDefinition).digest();
}

// ============================================================================
// TEST RESULTS TRACKING
// ============================================================================

const testResults = {
  startTime: new Date().toISOString(),
  network: 'devnet',
  programId: PROGRAM_ID.toBase58(),
  upgradeSignature: '2p9RUwNQ8iS5gUJ6YhpS2nfLY9nStn2VksFSeafo56FuNzcd2sGefnqGKrKMYC39j3JkuZnC1p7GbPmzreCzdvWt',
  tests: [],
  summary: { passed: 0, failed: 0, skipped: 0 }
};

async function recordTest(name, domain, operation, fn) {
  const test = {
    name,
    domain,
    operation,
    startTime: new Date().toISOString(),
    status: 'running',
    signature: null,
    error: null,
  };
  
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`   Domain: 0x${domain.toString(16).padStart(2, '0')} | Op: 0x${operation.toString(16).padStart(2, '0')}`);
  
  try {
    const result = await fn();
    test.signature = result.signature;
    test.status = 'passed';
    test.endTime = new Date().toISOString();
    test.explorerUrl = `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`;
    testResults.summary.passed++;
    console.log(`   ✅ PASSED: ${result.signature}`);
    console.log(`   🔗 ${test.explorerUrl}`);
  } catch (error) {
    test.error = error.message;
    test.status = 'failed';
    test.endTime = new Date().toISOString();
    testResults.summary.failed++;
    console.log(`   ❌ FAILED: ${error.message}`);
  }
  
  testResults.tests.push(test);
  return test;
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

async function testCompactCoreMint(connection, payer) {
  const payload = Buffer.alloc(72);
  
  // amount (8 bytes)
  payload.writeBigUInt64LE(1000000n, 0);
  
  // recipient (32 bytes)
  payer.publicKey.toBuffer().copy(payload, 8);
  
  // salt (32 bytes)
  randomBytes(32).copy(payload, 40);
  
  const data = encodeCompact(DOMAINS.CORE, OPERATIONS.CORE_MINT, payload);
  
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const signature = await sendAndConfirmTransaction(connection, tx, [payer]);
  return { signature };
}

async function testCompactCoreTransfer(connection, payer, recipient) {
  const payload = Buffer.alloc(72);
  
  // amount (8 bytes)
  payload.writeBigUInt64LE(500000n, 0);
  
  // recipient (32 bytes)
  recipient.publicKey.toBuffer().copy(payload, 8);
  
  // salt (32 bytes)
  randomBytes(32).copy(payload, 40);
  
  const data = encodeCompact(DOMAINS.CORE, OPERATIONS.CORE_TRANSFER, payload);
  
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: recipient.publicKey, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const signature = await sendAndConfirmTransaction(connection, tx, [payer]);
  return { signature };
}

async function testCompactNFTCreate(connection, payer) {
  // NFT metadata
  const name = 'STS Test NFT #1';
  const symbol = 'STSTEST';
  const uri = 'https://arweave.net/test-nft-metadata';
  
  const nameBytes = Buffer.from(name, 'utf8');
  const symbolBytes = Buffer.from(symbol, 'utf8');
  const uriBytes = Buffer.from(uri, 'utf8');
  
  const payload = Buffer.alloc(4 + nameBytes.length + 4 + symbolBytes.length + 4 + uriBytes.length + 32 + 1);
  let offset = 0;
  
  // name length + name
  payload.writeUInt32LE(nameBytes.length, offset);
  offset += 4;
  nameBytes.copy(payload, offset);
  offset += nameBytes.length;
  
  // symbol length + symbol
  payload.writeUInt32LE(symbolBytes.length, offset);
  offset += 4;
  symbolBytes.copy(payload, offset);
  offset += symbolBytes.length;
  
  // uri length + uri
  payload.writeUInt32LE(uriBytes.length, offset);
  offset += 4;
  uriBytes.copy(payload, offset);
  offset += uriBytes.length;
  
  // owner (32 bytes)
  payer.publicKey.toBuffer().copy(payload, offset);
  offset += 32;
  
  // privacy mode: 0=phantom, 1=silhouette, 2=revealed
  payload.writeUInt8(1, offset);
  
  const data = encodeCompact(DOMAINS.NFT, OPERATIONS.NFT_CREATE, payload);
  
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const signature = await sendAndConfirmTransaction(connection, tx, [payer]);
  return { signature };
}

async function testCompactMessaging(connection, payer, recipient) {
  const message = 'Hello from STS v3.0! 🚀';
  const messageBytes = Buffer.from(message, 'utf8');
  
  // Encrypt with simple XOR for demo (real: ChaCha20-Poly1305)
  const key = randomBytes(32);
  const encrypted = Buffer.alloc(messageBytes.length);
  for (let i = 0; i < messageBytes.length; i++) {
    encrypted[i] = messageBytes[i] ^ key[i % 32];
  }
  
  const payload = Buffer.alloc(32 + 32 + 4 + encrypted.length);
  let offset = 0;
  
  // recipient (32 bytes)
  recipient.publicKey.toBuffer().copy(payload, offset);
  offset += 32;
  
  // ephemeral key (32 bytes) - for decryption
  key.copy(payload, offset);
  offset += 32;
  
  // message length + encrypted message
  payload.writeUInt32LE(encrypted.length, offset);
  offset += 4;
  encrypted.copy(payload, offset);
  
  const data = encodeCompact(DOMAINS.MESSAGING, OPERATIONS.MSG_SEND, payload);
  
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: recipient.publicKey, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const signature = await sendAndConfirmTransaction(connection, tx, [payer]);
  return { signature };
}

async function testCompactGovernanceVote(connection, payer) {
  const payload = Buffer.alloc(32 + 1 + 8);
  let offset = 0;
  
  // proposal_id (32 bytes)
  randomBytes(32).copy(payload, offset);
  offset += 32;
  
  // vote: 0=no, 1=yes, 2=abstain
  payload.writeUInt8(1, offset);
  offset += 1;
  
  // voting_power (8 bytes)
  payload.writeBigUInt64LE(100n, offset);
  
  const data = encodeCompact(DOMAINS.GOVERNANCE, OPERATIONS.GOV_VOTE, payload);
  
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const signature = await sendAndConfirmTransaction(connection, tx, [payer]);
  return { signature };
}

async function testCompactDeFiSwap(connection, payer) {
  const payload = Buffer.alloc(32 + 32 + 8 + 8 + 8);
  let offset = 0;
  
  // from_mint (32 bytes) - mock
  randomBytes(32).copy(payload, offset);
  offset += 32;
  
  // to_mint (32 bytes) - mock
  randomBytes(32).copy(payload, offset);
  offset += 32;
  
  // amount_in (8 bytes)
  payload.writeBigUInt64LE(1000000n, offset);
  offset += 8;
  
  // min_amount_out (8 bytes)
  payload.writeBigUInt64LE(990000n, offset);
  offset += 8;
  
  // deadline (8 bytes)
  payload.writeBigUInt64LE(BigInt(Date.now() + 60000), offset);
  
  const data = encodeCompact(DOMAINS.DEFI, OPERATIONS.DEFI_SWAP, payload);
  
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const signature = await sendAndConfirmTransaction(connection, tx, [payer]);
  return { signature };
}

async function testCompactStealthSend(connection, payer, recipient) {
  const payload = Buffer.alloc(32 + 32 + 8 + 32);
  let offset = 0;
  
  // stealth_address (32 bytes) - derived from recipient
  const stealthAddr = createHash('sha256')
    .update(recipient.publicKey.toBuffer())
    .update(randomBytes(32))
    .digest();
  stealthAddr.copy(payload, offset);
  offset += 32;
  
  // ephemeral_pubkey (32 bytes)
  randomBytes(32).copy(payload, offset);
  offset += 32;
  
  // amount (8 bytes)
  payload.writeBigUInt64LE(250000n, offset);
  offset += 8;
  
  // view_tag (32 bytes)
  randomBytes(32).copy(payload, offset);
  
  const data = encodeCompact(DOMAINS.STEALTH, OPERATIONS.STEALTH_SEND, payload);
  
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const signature = await sendAndConfirmTransaction(connection, tx, [payer]);
  return { signature };
}

async function testExtendedMode(connection, payer) {
  // Test extended mode with custom sighash
  const sighash = computeSighash('custom_operation_v2');
  
  const payload = Buffer.alloc(64);
  randomBytes(64).copy(payload, 0);
  
  const data = encodeExtended(sighash, payload);
  
  console.log(`   Using sighash: ${sighash.toString('hex')}`);
  
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const signature = await sendAndConfirmTransaction(connection, tx, [payer]);
  return { signature };
}

async function testTLVMode(connection, payer) {
  // Test TLV extension mode
  const extensionData = Buffer.alloc(48);
  
  // Custom extension: privacy settings
  extensionData.writeUInt8(0x01, 0); // version
  extensionData.writeUInt8(0x02, 1); // privacy level
  randomBytes(46).copy(extensionData, 2); // extension-specific data
  
  const data = encodeTLV(0x42, extensionData); // Type 0x42 = custom extension
  
  console.log(`   TLV Type: 0x42 | Length: ${extensionData.length}`);
  
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const signature = await sendAndConfirmTransaction(connection, tx, [payer]);
  return { signature };
}

async function testSchemaMode(connection, payer) {
  // Test schema mode with custom schema
  const schemaDefinition = JSON.stringify({
    name: 'CustomTokenSchema',
    version: '1.0.0',
    fields: [
      { name: 'amount', type: 'u64' },
      { name: 'recipient', type: 'pubkey' },
      { name: 'memo', type: 'string' },
    ]
  });
  
  const schemaHash = computeSchemaHash(schemaDefinition);
  
  const payload = Buffer.alloc(8 + 32 + 32);
  let offset = 0;
  
  // amount (u64)
  payload.writeBigUInt64LE(777777n, offset);
  offset += 8;
  
  // recipient (pubkey)
  payer.publicKey.toBuffer().copy(payload, offset);
  offset += 32;
  
  // memo hash
  createHash('sha256').update('Schema mode test!').digest().copy(payload, offset);
  
  const data = encodeSchema(schemaHash, payload);
  
  console.log(`   Schema hash: ${schemaHash.toString('hex').slice(0, 16)}...`);
  
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const signature = await sendAndConfirmTransaction(connection, tx, [payer]);
  return { signature };
}

async function testMultiUserTransfer(connection, user1, user2, user3) {
  // User1 sends to User2
  const payload1 = Buffer.alloc(72);
  payload1.writeBigUInt64LE(100000n, 0);
  user2.publicKey.toBuffer().copy(payload1, 8);
  randomBytes(32).copy(payload1, 40);
  
  const data1 = encodeCompact(DOMAINS.CORE, OPERATIONS.CORE_TRANSFER, payload1);
  
  const ix1 = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: user1.publicKey, isSigner: true, isWritable: true },
      { pubkey: user2.publicKey, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: data1,
  });
  
  const tx1 = new Transaction().add(ix1);
  const sig1 = await sendAndConfirmTransaction(connection, tx1, [user1]);
  
  // User2 sends to User3
  const payload2 = Buffer.alloc(72);
  payload2.writeBigUInt64LE(50000n, 0);
  user3.publicKey.toBuffer().copy(payload2, 8);
  randomBytes(32).copy(payload2, 40);
  
  const data2 = encodeCompact(DOMAINS.CORE, OPERATIONS.CORE_TRANSFER, payload2);
  
  const ix2 = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: user2.publicKey, isSigner: true, isWritable: true },
      { pubkey: user3.publicKey, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: data2,
  });
  
  const tx2 = new Transaction().add(ix2);
  const sig2 = await sendAndConfirmTransaction(connection, tx2, [user2]);
  
  return { signature: `${sig1} | ${sig2}` };
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       STS v3.0 DEVNET COMPREHENSIVE TEST SUITE                   ║');
  console.log('║       Network: DEVNET (Mainnet Safe ✅)                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log();
  
  const connection = new Connection(DEVNET_RPC, 'confirmed');
  
  // Load keypairs
  console.log('📂 Loading keypairs...');
  const payer = loadKeypair(WALLET_PATH);
  const user1 = loadKeypair(USER1_PATH);
  const user2 = loadKeypair(USER2_PATH);
  const user3 = loadKeypair(USER3_PATH);
  
  console.log(`   Main wallet: ${payer.publicKey.toBase58()}`);
  console.log(`   User 1: ${user1.publicKey.toBase58()}`);
  console.log(`   User 2: ${user2.publicKey.toBase58()}`);
  console.log(`   User 3: ${user3.publicKey.toBase58()}`);
  
  // Check balances
  const balance = await connection.getBalance(payer.publicKey);
  console.log(`   Main balance: ${balance / 1e9} SOL`);
  
  console.log('\n' + '═'.repeat(70));
  console.log('                    COMPACT MODE TESTS (2-byte header)');
  console.log('═'.repeat(70));
  
  // Test 1: Core Mint
  await recordTest(
    'Core Token Mint',
    DOMAINS.CORE,
    OPERATIONS.CORE_MINT,
    () => testCompactCoreMint(connection, payer)
  );
  
  // Test 2: Core Transfer
  await recordTest(
    'Core Token Transfer',
    DOMAINS.CORE,
    OPERATIONS.CORE_TRANSFER,
    () => testCompactCoreTransfer(connection, payer, user1)
  );
  
  // Test 3: NFT Create
  await recordTest(
    'NFT Creation (ANONFT)',
    DOMAINS.NFT,
    OPERATIONS.NFT_CREATE,
    () => testCompactNFTCreate(connection, payer)
  );
  
  // Test 4: Messaging
  await recordTest(
    'Private Message Send',
    DOMAINS.MESSAGING,
    OPERATIONS.MSG_SEND,
    () => testCompactMessaging(connection, payer, user2)
  );
  
  // Test 5: Governance Vote
  await recordTest(
    'Governance Vote',
    DOMAINS.GOVERNANCE,
    OPERATIONS.GOV_VOTE,
    () => testCompactGovernanceVote(connection, payer)
  );
  
  // Test 6: DeFi Swap
  await recordTest(
    'DeFi Token Swap',
    DOMAINS.DEFI,
    OPERATIONS.DEFI_SWAP,
    () => testCompactDeFiSwap(connection, payer)
  );
  
  // Test 7: Stealth Send
  await recordTest(
    'Stealth Address Send',
    DOMAINS.STEALTH,
    OPERATIONS.STEALTH_SEND,
    () => testCompactStealthSend(connection, payer, user3)
  );
  
  console.log('\n' + '═'.repeat(70));
  console.log('                  EXTENDED MODE TESTS (9-byte header)');
  console.log('═'.repeat(70));
  
  // Test 8: Extended Mode
  await recordTest(
    'Extended Mode (Sighash)',
    0x00,
    0x00,
    () => testExtendedMode(connection, payer)
  );
  
  console.log('\n' + '═'.repeat(70));
  console.log('                     TLV MODE TESTS (Variable)');
  console.log('═'.repeat(70));
  
  // Test 9: TLV Mode
  await recordTest(
    'TLV Extension Mode',
    0xFE,
    0x42,
    () => testTLVMode(connection, payer)
  );
  
  console.log('\n' + '═'.repeat(70));
  console.log('                   SCHEMA MODE TESTS (33-byte header)');
  console.log('═'.repeat(70));
  
  // Test 10: Schema Mode
  await recordTest(
    'Schema Mode (Custom Schema)',
    0xFF,
    0x00,
    () => testSchemaMode(connection, payer)
  );
  
  console.log('\n' + '═'.repeat(70));
  console.log('                    MULTI-USER TESTS');
  console.log('═'.repeat(70));
  
  // Test 11: Multi-user transfer chain
  await recordTest(
    'Multi-User Transfer Chain (User1→User2→User3)',
    DOMAINS.CORE,
    OPERATIONS.CORE_TRANSFER,
    () => testMultiUserTransfer(connection, user1, user2, user3)
  );
  
  // ========================================================================
  // RESULTS SUMMARY
  // ========================================================================
  
  console.log('\n' + '═'.repeat(70));
  console.log('                         TEST RESULTS SUMMARY');
  console.log('═'.repeat(70));
  
  testResults.endTime = new Date().toISOString();
  
  console.log(`\n📊 Results:`);
  console.log(`   ✅ Passed: ${testResults.summary.passed}`);
  console.log(`   ❌ Failed: ${testResults.summary.failed}`);
  console.log(`   ⏭️  Skipped: ${testResults.summary.skipped}`);
  console.log(`   📈 Success Rate: ${((testResults.summary.passed / testResults.tests.length) * 100).toFixed(1)}%`);
  
  console.log('\n📋 Transaction Links:');
  for (const test of testResults.tests) {
    if (test.signature && test.status === 'passed') {
      console.log(`   ${test.name}:`);
      console.log(`      ${test.explorerUrl}`);
    }
  }
  
  // Save results to file
  const resultsPath = '/workspaces/StyxStack/.devnet/test-results-v3.json';
  writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
  console.log(`\n💾 Full results saved to: ${resultsPath}`);
  
  console.log('\n' + '═'.repeat(70));
  console.log('                    STS v3.0 DEVNET TESTING COMPLETE');
  console.log('═'.repeat(70));
}

main().catch(console.error);
