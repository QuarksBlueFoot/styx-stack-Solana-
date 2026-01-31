#!/usr/bin/env node
/**
 * STS v3.0 DEVNET COMPREHENSIVE TEST SUITE - FIXED
 * 
 * Tests all domains with CORRECT payload formats matching lib.rs
 * 
 * Run: node scripts/test-sts-v3-devnet-fixed.mjs
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
import { readFileSync, writeFileSync } from 'fs';
import { createHash, randomBytes } from 'crypto';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEVNET_RPC = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('CumUDpSpjmMEsaPhLMZEE8NKtgq9BTT6eyN7RCpsWmPE');
const NULLIFIER_SEED = Buffer.from('sts_nullifier');

// Test wallets
const WALLET_PATH = '/workspaces/StyxStack/.devnet/test-wallet.json';
const USER1_PATH = '/workspaces/StyxStack/.devnet/test-users/user1.json';
const USER2_PATH = '/workspaces/StyxStack/.devnet/test-users/user2.json';
const USER3_PATH = '/workspaces/StyxStack/.devnet/test-users/user3.json';

// ============================================================================
// DOMAIN & OPERATION CODES (from domains.rs)
// ============================================================================

const DOMAIN = {
  EXTENDED: 0x00,
  STS: 0x01,       // Token standard core
  MESSAGING: 0x02, // Private messaging
  ACCOUNT: 0x03,   // VTA, delegation
  VSL: 0x04,       // Virtual Shielded Ledger
  NOTES: 0x05,     // UTXO primitives
  COMPLIANCE: 0x06,
  PRIVACY: 0x07,
  DEFI: 0x08,
  NFT: 0x09,
  DERIVATIVES: 0x0A,
  BRIDGE: 0x0B,
  SECURITIES: 0x0C,
  GOVERNANCE: 0x0D,
  TLV: 0xFE,
  SCHEMA: 0xFF,
};

// STS Domain ops (from domains.rs sts module)
const STS_OP = {
  CREATE_MINT: 0x01,
  UPDATE_MINT: 0x02,
  FREEZE_MINT: 0x03,
  MINT_TO: 0x04,
  BURN: 0x05,
  TRANSFER: 0x06,
  SHIELD: 0x07,
  UNSHIELD: 0x08,
  CREATE_RULESET: 0x09,
  UPDATE_RULESET: 0x0A,
  FREEZE_RULESET: 0x0B,
  REVEAL_TO_AUDITOR: 0x0C,
  ATTACH_POI: 0x0D,
  BATCH_TRANSFER: 0x0E,
  DECOY_STORM: 0x0F,
  CHRONO_VAULT: 0x10,
  CREATE_NFT: 0x11,
  TRANSFER_NFT: 0x12,
  REVEAL_NFT: 0x13,
  CREATE_POOL: 0x14,
  CREATE_RECEIPT_MINT: 0x15,
  STEALTH_UNSHIELD: 0x16,
  PRIVATE_SWAP: 0x17,
  CREATE_AMM_POOL: 0x18,
  ADD_LIQUIDITY: 0x19,
  REMOVE_LIQUIDITY: 0x1A,
  GENERATE_STEALTH: 0x1B,
};

// Messaging Domain ops
const MSG_OP = {
  PRIVATE_MESSAGE: 0x01,
  ROUTED_MESSAGE: 0x02,
  PRIVATE_TRANSFER: 0x03,
  RATCHET_MESSAGE: 0x04,
  COMPLIANCE_REVEAL: 0x05,
  PREKEY_BUNDLE_PUBLISH: 0x06,
  PREKEY_BUNDLE_REFRESH: 0x07,
  REFERRAL_REGISTER: 0x08,
  REFERRAL_CLAIM: 0x09,
};

// ============================================================================
// UTILITIES
// ============================================================================

function loadKeypair(path) {
  const secret = JSON.parse(readFileSync(path, 'utf-8'));
  return Keypair.fromSecretKey(new Uint8Array(secret));
}

function keccakHash(data) {
  return createHash('sha3-256').update(Buffer.concat(data)).digest();
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
  summary: { passed: 0, failed: 0 }
};

async function recordTest(name, domain, op, fn) {
  const test = {
    name,
    domain: `0x${domain.toString(16).padStart(2, '0')}`,
    operation: `0x${op.toString(16).padStart(2, '0')}`,
    startTime: new Date().toISOString(),
    status: 'running',
    signature: null,
    error: null,
  };
  
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`   Domain: ${test.domain} | Op: ${test.operation}`);
  
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
    test.error = error.message?.slice(0, 200);
    test.status = 'failed';
    test.endTime = new Date().toISOString();
    testResults.summary.failed++;
    console.log(`   ❌ FAILED: ${test.error}`);
  }
  
  testResults.tests.push(test);
  return test;
}

// ============================================================================
// TEST: STS TRANSFER (Domain 0x01, Op 0x06)
// ============================================================================
// Format: [0x01][0x06][mint:32][nullifier:32][commit1:32][commit2:32][amt1:8][amt2:8][enc_len:4][encrypted...]

async function testStsTransfer(connection, payer, recipient) {
  const mintId = randomBytes(32);
  const inputNullifier = randomBytes(32);
  const outputCommit1 = randomBytes(32);
  const outputCommit2 = randomBytes(32);
  const amount1 = 500000n;
  const amount2 = 500000n;
  const encryptedNotes = randomBytes(64); // Minimal encrypted data
  
  // Build payload: MIN_LEN = 150 + encrypted_len
  const data = Buffer.alloc(150 + encryptedNotes.length);
  let offset = 0;
  
  data.writeUInt8(DOMAIN.STS, offset++);
  data.writeUInt8(STS_OP.TRANSFER, offset++);
  mintId.copy(data, offset); offset += 32;
  inputNullifier.copy(data, offset); offset += 32;
  outputCommit1.copy(data, offset); offset += 32;
  outputCommit2.copy(data, offset); offset += 32;
  data.writeBigUInt64LE(amount1, offset); offset += 8;
  data.writeBigUInt64LE(amount2, offset); offset += 8;
  data.writeUInt32LE(encryptedNotes.length, offset); offset += 4;
  encryptedNotes.copy(data, offset);
  
  // Derive nullifier PDA
  const [nullifierPda] = PublicKey.findProgramAddressSync(
    [NULLIFIER_SEED, inputNullifier],
    PROGRAM_ID
  );
  
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: nullifierPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
  
  const tx = new Transaction().add(ix);
  const signature = await sendAndConfirmTransaction(connection, tx, [payer]);
  return { signature };
}

// ============================================================================
// TEST: STS CREATE MINT (Domain 0x01, Op 0x01)
// ============================================================================

async function testStsCreateMint(connection, payer) {
  const mintId = randomBytes(32);
  const decimals = 9;
  const name = 'Test Token';
  const symbol = 'TEST';
  
  const nameBytes = Buffer.from(name, 'utf8');
  const symbolBytes = Buffer.from(symbol, 'utf8');
  
  // Build payload
  const data = Buffer.alloc(2 + 32 + 1 + 4 + nameBytes.length + 4 + symbolBytes.length);
  let offset = 0;
  
  data.writeUInt8(DOMAIN.STS, offset++);
  data.writeUInt8(STS_OP.CREATE_MINT, offset++);
  mintId.copy(data, offset); offset += 32;
  data.writeUInt8(decimals, offset++);
  data.writeUInt32LE(nameBytes.length, offset); offset += 4;
  nameBytes.copy(data, offset); offset += nameBytes.length;
  data.writeUInt32LE(symbolBytes.length, offset); offset += 4;
  symbolBytes.copy(data, offset);
  
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

// ============================================================================
// TEST: PRIVATE MESSAGE (Domain 0x02, Op 0x01)
// ============================================================================

async function testPrivateMessage(connection, payer, recipient) {
  // Private message format from lib.rs process_private_message
  // Layout: [domain][op][recipient:32][ephemeral:32][msg_len:4][encrypted_msg]
  
  const message = 'Hello STS v3.0! 🔐';
  const encryptedMsg = Buffer.from(message, 'utf8');
  const ephemeralPubkey = randomBytes(32);
  
  const data = Buffer.alloc(2 + 32 + 32 + 4 + encryptedMsg.length);
  let offset = 0;
  
  data.writeUInt8(DOMAIN.MESSAGING, offset++);
  data.writeUInt8(MSG_OP.PRIVATE_MESSAGE, offset++);
  recipient.publicKey.toBuffer().copy(data, offset); offset += 32;
  ephemeralPubkey.copy(data, offset); offset += 32;
  data.writeUInt32LE(encryptedMsg.length, offset); offset += 4;
  encryptedMsg.copy(data, offset);
  
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

// ============================================================================
// TEST: EXTENDED MODE (Domain 0x00)
// ============================================================================

async function testExtendedMode(connection, payer) {
  // Extended mode: [0x00][sighash:8][payload...]
  const sighash = createHash('sha256').update('global:custom_operation').digest().slice(0, 8);
  const payload = randomBytes(64);
  
  const data = Buffer.alloc(1 + 8 + payload.length);
  data.writeUInt8(DOMAIN.EXTENDED, 0);
  sighash.copy(data, 1);
  payload.copy(data, 9);
  
  console.log(`   Sighash: ${sighash.toString('hex')}`);
  
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

// ============================================================================
// TEST: TLV MODE (Domain 0xFE)
// ============================================================================

async function testTlvMode(connection, payer) {
  // TLV format: [0xFE][type:1][len:2][data...]
  const extensionData = randomBytes(48);
  
  const data = Buffer.alloc(4 + extensionData.length);
  data.writeUInt8(DOMAIN.TLV, 0);
  data.writeUInt8(0x01, 1); // Type: transfer fee
  data.writeUInt16LE(extensionData.length, 2);
  extensionData.copy(data, 4);
  
  console.log(`   TLV Type: 0x01 (TransferFee) | Length: ${extensionData.length}`);
  
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

// ============================================================================
// TEST: SCHEMA MODE (Domain 0xFF)
// ============================================================================

async function testSchemaMode(connection, payer) {
  // Schema format: [0xFF][schema_hash:32][payload...]
  const schemaDefinition = '{"name":"CustomToken","version":"1.0.0"}';
  const schemaHash = createHash('sha256').update(schemaDefinition).digest();
  const payload = randomBytes(48);
  
  const data = Buffer.alloc(33 + payload.length);
  data.writeUInt8(DOMAIN.SCHEMA, 0);
  schemaHash.copy(data, 1);
  payload.copy(data, 33);
  
  console.log(`   Schema: ${schemaHash.toString('hex').slice(0, 16)}...`);
  
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

// ============================================================================
// TEST: STS CREATE NFT (Domain 0x01, Op 0x11)
// ============================================================================

async function testStsCreateNft(connection, payer) {
  const nftId = randomBytes(32);
  const name = 'STS Test NFT';
  const symbol = 'STSNFT';
  const uri = 'https://arweave.net/test';
  
  const nameBytes = Buffer.from(name, 'utf8');
  const symbolBytes = Buffer.from(symbol, 'utf8');
  const uriBytes = Buffer.from(uri, 'utf8');
  
  // Build payload
  const data = Buffer.alloc(2 + 32 + 32 + 4 + nameBytes.length + 4 + symbolBytes.length + 4 + uriBytes.length + 1);
  let offset = 0;
  
  data.writeUInt8(DOMAIN.STS, offset++);
  data.writeUInt8(STS_OP.CREATE_NFT, offset++);
  nftId.copy(data, offset); offset += 32;
  payer.publicKey.toBuffer().copy(data, offset); offset += 32; // owner
  data.writeUInt32LE(nameBytes.length, offset); offset += 4;
  nameBytes.copy(data, offset); offset += nameBytes.length;
  data.writeUInt32LE(symbolBytes.length, offset); offset += 4;
  symbolBytes.copy(data, offset); offset += symbolBytes.length;
  data.writeUInt32LE(uriBytes.length, offset); offset += 4;
  uriBytes.copy(data, offset); offset += uriBytes.length;
  data.writeUInt8(1, offset); // privacy mode: silhouette
  
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

// ============================================================================
// TEST: REFERRAL REGISTER (Domain 0x02, Op 0x08)
// ============================================================================

async function testReferralRegister(connection, payer) {
  // Referral register: [domain][op][referrer_pubkey:32]
  const referrerPubkey = randomBytes(32); // Mock referrer
  
  const data = Buffer.alloc(2 + 32);
  data.writeUInt8(DOMAIN.MESSAGING, 0);
  data.writeUInt8(MSG_OP.REFERRAL_REGISTER, 1);
  referrerPubkey.copy(data, 2);
  
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

// ============================================================================
// TEST: MULTI-USER TRANSFER CHAIN
// ============================================================================

async function testMultiUserTransfer(connection, user1, user2, user3) {
  // User1 → User2 transfer
  const mintId1 = randomBytes(32);
  const nullifier1 = randomBytes(32);
  const [nullifierPda1] = PublicKey.findProgramAddressSync(
    [NULLIFIER_SEED, nullifier1],
    PROGRAM_ID
  );
  
  const data1 = Buffer.alloc(214);
  let offset = 0;
  data1.writeUInt8(DOMAIN.STS, offset++);
  data1.writeUInt8(STS_OP.TRANSFER, offset++);
  mintId1.copy(data1, offset); offset += 32;
  nullifier1.copy(data1, offset); offset += 32;
  randomBytes(32).copy(data1, offset); offset += 32; // commit1
  randomBytes(32).copy(data1, offset); offset += 32; // commit2
  data1.writeBigUInt64LE(100000n, offset); offset += 8;
  data1.writeBigUInt64LE(100000n, offset); offset += 8;
  data1.writeUInt32LE(64, offset); offset += 4;
  randomBytes(64).copy(data1, offset);
  
  const ix1 = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: user1.publicKey, isSigner: true, isWritable: true },
      { pubkey: nullifierPda1, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: data1,
  });
  
  const tx1 = new Transaction().add(ix1);
  const sig1 = await sendAndConfirmTransaction(connection, tx1, [user1]);
  
  // User2 → User3 transfer
  const mintId2 = randomBytes(32);
  const nullifier2 = randomBytes(32);
  const [nullifierPda2] = PublicKey.findProgramAddressSync(
    [NULLIFIER_SEED, nullifier2],
    PROGRAM_ID
  );
  
  const data2 = Buffer.alloc(214);
  offset = 0;
  data2.writeUInt8(DOMAIN.STS, offset++);
  data2.writeUInt8(STS_OP.TRANSFER, offset++);
  mintId2.copy(data2, offset); offset += 32;
  nullifier2.copy(data2, offset); offset += 32;
  randomBytes(32).copy(data2, offset); offset += 32;
  randomBytes(32).copy(data2, offset); offset += 32;
  data2.writeBigUInt64LE(50000n, offset); offset += 8;
  data2.writeBigUInt64LE(50000n, offset); offset += 8;
  data2.writeUInt32LE(64, offset); offset += 4;
  randomBytes(64).copy(data2, offset);
  
  const ix2 = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: user2.publicKey, isSigner: true, isWritable: true },
      { pubkey: nullifierPda2, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: data2,
  });
  
  const tx2 = new Transaction().add(ix2);
  const sig2 = await sendAndConfirmTransaction(connection, tx2, [user2]);
  
  return { signature: `${sig1}` };
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     STS v3.0 DEVNET COMPREHENSIVE TEST SUITE (FIXED)             ║');
  console.log('║     Network: DEVNET (Mainnet Safe ✅)                             ║');
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
  
  const balance = await connection.getBalance(payer.publicKey);
  console.log(`   Main balance: ${balance / 1e9} SOL`);
  
  // ═══════════════════════════════════════════════════════════════════════
  // CORE STS DOMAIN TESTS (0x01)
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('            STS DOMAIN (0x01) - Core Token Operations');
  console.log('═'.repeat(70));
  
  await recordTest('STS Transfer', DOMAIN.STS, STS_OP.TRANSFER,
    () => testStsTransfer(connection, payer, user1));
  
  await recordTest('STS Create Mint', DOMAIN.STS, STS_OP.CREATE_MINT,
    () => testStsCreateMint(connection, payer));
  
  await recordTest('STS Create NFT', DOMAIN.STS, STS_OP.CREATE_NFT,
    () => testStsCreateNft(connection, payer));
  
  // ═══════════════════════════════════════════════════════════════════════
  // MESSAGING DOMAIN TESTS (0x02)
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('          MESSAGING DOMAIN (0x02) - Private Communication');
  console.log('═'.repeat(70));
  
  await recordTest('Private Message', DOMAIN.MESSAGING, MSG_OP.PRIVATE_MESSAGE,
    () => testPrivateMessage(connection, payer, user2));
  
  await recordTest('Referral Register', DOMAIN.MESSAGING, MSG_OP.REFERRAL_REGISTER,
    () => testReferralRegister(connection, payer));
  
  // ═══════════════════════════════════════════════════════════════════════
  // EXTENSIBILITY MODE TESTS
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('              v3.0 EXTENSIBILITY MODES');
  console.log('═'.repeat(70));
  
  await recordTest('Extended Mode (0x00)', DOMAIN.EXTENDED, 0x00,
    () => testExtendedMode(connection, payer));
  
  await recordTest('TLV Extension Mode (0xFE)', DOMAIN.TLV, 0x01,
    () => testTlvMode(connection, payer));
  
  await recordTest('Schema Mode (0xFF)', DOMAIN.SCHEMA, 0x00,
    () => testSchemaMode(connection, payer));
  
  // ═══════════════════════════════════════════════════════════════════════
  // MULTI-USER TESTS
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('                  MULTI-USER TESTS');
  console.log('═'.repeat(70));
  
  await recordTest('Multi-User Transfer Chain (U1→U2→U3)', DOMAIN.STS, STS_OP.TRANSFER,
    () => testMultiUserTransfer(connection, user1, user2, user3));
  
  // ═══════════════════════════════════════════════════════════════════════
  // RESULTS SUMMARY
  // ═══════════════════════════════════════════════════════════════════════
  testResults.endTime = new Date().toISOString();
  
  console.log('\n' + '═'.repeat(70));
  console.log('                     TEST RESULTS SUMMARY');
  console.log('═'.repeat(70));
  
  console.log(`\n📊 Results:`);
  console.log(`   ✅ Passed: ${testResults.summary.passed}`);
  console.log(`   ❌ Failed: ${testResults.summary.failed}`);
  console.log(`   📈 Success Rate: ${((testResults.summary.passed / testResults.tests.length) * 100).toFixed(1)}%`);
  
  console.log('\n📋 All Transactions:');
  for (const test of testResults.tests) {
    const status = test.status === 'passed' ? '✅' : '❌';
    console.log(`   ${status} ${test.name} (${test.domain}:${test.operation})`);
    if (test.explorerUrl) {
      console.log(`      ${test.explorerUrl}`);
    }
    if (test.error) {
      console.log(`      Error: ${test.error}`);
    }
  }
  
  // Save results
  const resultsPath = '/workspaces/StyxStack/.devnet/test-results-v3-fixed.json';
  writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
  console.log(`\n💾 Full results saved to: ${resultsPath}`);
  
  console.log('\n' + '═'.repeat(70));
  console.log('                STS v3.0 DEVNET TESTING COMPLETE');
  console.log('═'.repeat(70));
}

main().catch(console.error);
