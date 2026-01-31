#!/usr/bin/env node
/**
 * PMP Extended Instruction Test Suite - DEVNET ONLY
 * 
 * Tests additional TAGs beyond the core 5 (3,4,5,7,8):
 * - TAG 9: Proposal
 * - TAG 10: Private Vote
 * - TAG 11: VTA Transfer
 * - TAG 14: Hashlock Commit
 * - TAG 15: Hashlock Reveal
 * - TAG 20: Time Capsule
 * - TAG 23: VTA Delegate
 * 
 * Uses verified account structure from core tests
 */

import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import fs from 'fs';
import { keccak_256 } from '@noble/hashes/sha3.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEVNET_RPC = 'https://api.devnet.solana.com';
const DEVNET_PMP_PROGRAM_ID = new PublicKey('FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW');
const TREASURY = new PublicKey('13xnC9kDksJMBE9FYVW1S7dukLjRDgrh4Dzm6eq5moon');
const TEST_WALLET_PATH = '.devnet/test-wallet.json';

// Extended TAGs
const TAG_PROPOSAL = 9;
const TAG_PRIVATE_VOTE = 10;
const TAG_VTA_TRANSFER = 11;
const TAG_HASHLOCK_COMMIT = 14;
const TAG_HASHLOCK_REVEAL = 15;
const TAG_TIME_CAPSULE = 20;
const TAG_VTA_DELEGATE = 23;

console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║           PMP EXTENDED TEST SUITE - ADDITIONAL INSTRUCTIONS                  ║
║                                                                              ║
║  🔒 DEVNET ONLY - Mainnet protected                                         ║
║  🧪 Testing TAGs 9, 10, 11, 14, 15, 20, 23                                   ║
║                                                                              ║
║  Program: ${DEVNET_PMP_PROGRAM_ID.toString()}     ║
║  Treasury: ${TREASURY.toString()}    ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

// ============================================================================
// UTILITIES
// ============================================================================

function loadTestWallet() {
  const secret = JSON.parse(fs.readFileSync(TEST_WALLET_PATH, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function printTestHeader(num, total, name, tag) {
  console.log('\n' + '═'.repeat(80));
  console.log(`TEST ${num}/${total}: ${name} (TAG ${tag})`);
  console.log('═'.repeat(80));
}

function printSuccess(msg) { console.log(`✅ ${msg}`); }
function printInfo(msg) { console.log(`   ${msg}`); }
function printWarning(msg) { console.log(`⚠️  ${msg}`); }
function printError(msg) { console.log(`❌ ${msg}`); }
function printTransaction(sig) {
  console.log(`   🔗 https://explorer.solana.com/tx/${sig}?cluster=devnet`);
}

// Keccak hash for encryption (matching program)
function keccakHash(...data) {
  const combined = Buffer.concat(data);
  return Buffer.from(keccak_256(combined));
}

function encryptRecipient(sender, recipient) {
  const mask = keccakHash(Buffer.from('STYX_META_V3'), Buffer.from(sender.toBytes()));
  const recipientBytes = recipient.toBytes();
  const encrypted = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) {
    encrypted[i] = recipientBytes[i] ^ mask[i];
  }
  return encrypted;
}

// ============================================================================
// TEST IMPLEMENTATIONS
// ============================================================================

async function testProposal(connection, payer) {
  printTestHeader(1, 7, 'Proposal', TAG_PROPOSAL);
  
  printInfo('📋 Testing governance proposal creation');
  printInfo('   Data format: [tag:1][flags:1][proposal_id:32][title_len:2][title]');
  
  // Create proposal data
  const proposalId = Keypair.generate().publicKey.toBytes();
  const title = 'Privacy Protocol Upgrade v2.0';
  const titleBytes = Buffer.from(title, 'utf8');
  const description = 'Enable encrypted voting for on-chain governance';
  const descBytes = Buffer.from(description, 'utf8');
  
  const data = Buffer.alloc(1 + 1 + 32 + 2 + titleBytes.length + 2 + descBytes.length);
  let offset = 0;
  
  data.writeUInt8(TAG_PROPOSAL, offset++);
  data.writeUInt8(0x01, offset++); // flags: active proposal
  proposalId.forEach((b, i) => data.writeUInt8(b, offset + i));
  offset += 32;
  data.writeUInt16LE(titleBytes.length, offset);
  offset += 2;
  titleBytes.copy(data, offset);
  offset += titleBytes.length;
  data.writeUInt16LE(descBytes.length, offset);
  offset += 2;
  descBytes.copy(data, offset);
  
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: DEVNET_PMP_PROGRAM_ID,
    data: data.slice(0, offset),
  });
  
  printSuccess(`Built proposal instruction: ${offset} bytes`);
  printInfo(`   Title: "${title}"`);
  
  printWarning('Sending proposal...');
  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
  
  printSuccess('✨ Proposal created!');
  printTransaction(sig);
  
  return true;
}

async function testPrivateVote(connection, payer) {
  printTestHeader(2, 7, 'Private Vote', TAG_PRIVATE_VOTE);
  
  printInfo('🗳️  Testing encrypted voting');
  printInfo('   Data format: [tag:1][flags:1][proposal_id:32][enc_vote:32][voter_commit:32]');
  
  const proposalId = Keypair.generate().publicKey.toBytes();
  const encryptedVote = keccakHash(Buffer.from('YES'), Buffer.from(payer.publicKey.toBytes()));
  const voterCommit = keccakHash(Buffer.from(payer.publicKey.toBytes()), Buffer.from(proposalId));
  
  const data = Buffer.alloc(1 + 1 + 32 + 32 + 32);
  let offset = 0;
  
  data.writeUInt8(TAG_PRIVATE_VOTE, offset++);
  data.writeUInt8(0x01, offset++); // flags
  proposalId.forEach((b, i) => data.writeUInt8(b, offset + i));
  offset += 32;
  encryptedVote.copy(data, offset);
  offset += 32;
  voterCommit.copy(data, offset);
  offset += 32;
  
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
  
  printSuccess(`Built vote instruction: ${data.length} bytes`);
  
  printWarning('Casting encrypted vote...');
  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
  
  printSuccess('✨ Private vote cast!');
  printTransaction(sig);
  
  return true;
}

async function testVTATransfer(connection, payer) {
  printTestHeader(3, 7, 'VTA Transfer', TAG_VTA_TRANSFER);
  
  printInfo('🔒 Testing Verifiable Token Account transfer');
  printInfo('   Data format: [tag:1][flags:1][enc_recipient:32][enc_amount:8][memo_len:2][memo]');
  
  const recipient = Keypair.generate().publicKey;
  const encRecipient = encryptRecipient(payer.publicKey, recipient);
  const amount = BigInt(50000); // 0.00005 SOL equivalent
  const encAmount = keccakHash(
    Buffer.from('STYX_XFER_V3'),
    Buffer.from(payer.publicKey.toBytes()),
    Buffer.from(recipient.toBytes())
  ).slice(0, 8);
  
  // XOR amount into encrypted
  const amountBytes = Buffer.alloc(8);
  amountBytes.writeBigUInt64LE(amount);
  for (let i = 0; i < 8; i++) {
    encAmount[i] ^= amountBytes[i];
  }
  
  const memo = 'VTA test transfer';
  const memoBytes = Buffer.from(memo);
  
  const data = Buffer.alloc(1 + 1 + 32 + 8 + 2 + memoBytes.length);
  let offset = 0;
  
  data.writeUInt8(TAG_VTA_TRANSFER, offset++);
  data.writeUInt8(0x02, offset++); // flags
  encRecipient.copy(data, offset);
  offset += 32;
  encAmount.copy(data, offset);
  offset += 8;
  data.writeUInt16LE(memoBytes.length, offset);
  offset += 2;
  memoBytes.copy(data, offset);
  offset += memoBytes.length;
  
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: DEVNET_PMP_PROGRAM_ID,
    data: data.slice(0, offset),
  });
  
  printSuccess(`Built VTA transfer instruction: ${offset} bytes`);
  printInfo(`   Memo: "${memo}"`);
  
  printWarning('Sending VTA transfer...');
  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
  
  printSuccess('✨ VTA transfer completed!');
  printTransaction(sig);
  
  return true;
}

async function testHashlockCommit(connection, payer) {
  printTestHeader(4, 7, 'Hashlock Commit', TAG_HASHLOCK_COMMIT);
  
  printInfo('🔐 Testing atomic hashlock commitment (HTLC-style)');
  printInfo('   Data format: [tag:1][flags:1][hash:32][expiry:8][enc_amount:8][recipient:32]');
  
  // Generate secret and its hash
  const secret = Buffer.from(Keypair.generate().publicKey.toBytes());
  const hashlock = keccakHash(secret);
  
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now
  const recipient = Keypair.generate().publicKey;
  const amount = BigInt(10000);
  
  const data = Buffer.alloc(1 + 1 + 32 + 8 + 8 + 32);
  let offset = 0;
  
  data.writeUInt8(TAG_HASHLOCK_COMMIT, offset++);
  data.writeUInt8(0x01, offset++); // flags
  hashlock.copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(expiry, offset);
  offset += 8;
  data.writeBigUInt64LE(amount, offset);
  offset += 8;
  recipient.toBytes().forEach((b, i) => data.writeUInt8(b, offset + i));
  offset += 32;
  
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: DEVNET_PMP_PROGRAM_ID,
    data: data.slice(0, offset),
  });
  
  printSuccess(`Built hashlock commit: ${offset} bytes`);
  printInfo(`   Hashlock: ${hashlock.toString('hex').slice(0, 16)}...`);
  
  printWarning('Committing hashlock...');
  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
  
  printSuccess('✨ Hashlock committed!');
  printTransaction(sig);
  
  return true;
}

async function testHashlockReveal(connection, payer) {
  printTestHeader(5, 7, 'Hashlock Reveal', TAG_HASHLOCK_REVEAL);
  
  printInfo('🔓 Testing hashlock reveal/claim');
  printInfo('   Data format: [tag:1][flags:1][secret:32][commit_id:32]');
  
  const secret = Buffer.from(Keypair.generate().publicKey.toBytes());
  const commitId = keccakHash(secret, Buffer.from(payer.publicKey.toBytes()));
  
  const data = Buffer.alloc(1 + 1 + 32 + 32);
  let offset = 0;
  
  data.writeUInt8(TAG_HASHLOCK_REVEAL, offset++);
  data.writeUInt8(0x01, offset++);
  secret.copy(data, offset);
  offset += 32;
  commitId.copy(data, offset);
  offset += 32;
  
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: DEVNET_PMP_PROGRAM_ID,
    data: data.slice(0, offset),
  });
  
  printSuccess(`Built hashlock reveal: ${offset} bytes`);
  
  printWarning('Revealing hashlock...');
  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
  
  printSuccess('✨ Hashlock revealed!');
  printTransaction(sig);
  
  return true;
}

async function testTimeCapsule(connection, payer) {
  printTestHeader(6, 7, 'Time Capsule', TAG_TIME_CAPSULE);
  
  printInfo('⏰ Testing time-locked message/transfer');
  printInfo('   Data format: [tag:1][flags:1][unlock_time:8][enc_recipient:32][payload_len:2][payload]');
  
  const unlockTime = BigInt(Math.floor(Date.now() / 1000) + 86400); // 24h from now
  const recipient = Keypair.generate().publicKey;
  const encRecipient = encryptRecipient(payer.publicKey, recipient);
  const message = 'This message unlocks in the future!';
  const msgBytes = Buffer.from(message);
  
  const data = Buffer.alloc(1 + 1 + 8 + 32 + 2 + msgBytes.length);
  let offset = 0;
  
  data.writeUInt8(TAG_TIME_CAPSULE, offset++);
  data.writeUInt8(0x03, offset++); // flags: encrypted + timed
  data.writeBigUInt64LE(unlockTime, offset);
  offset += 8;
  encRecipient.copy(data, offset);
  offset += 32;
  data.writeUInt16LE(msgBytes.length, offset);
  offset += 2;
  msgBytes.copy(data, offset);
  offset += msgBytes.length;
  
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: DEVNET_PMP_PROGRAM_ID,
    data: data.slice(0, offset),
  });
  
  printSuccess(`Built time capsule: ${offset} bytes`);
  printInfo(`   Unlocks: ${new Date(Number(unlockTime) * 1000).toISOString()}`);
  
  printWarning('Creating time capsule...');
  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
  
  printSuccess('✨ Time capsule created!');
  printTransaction(sig);
  
  return true;
}

async function testVTADelegate(connection, payer) {
  printTestHeader(7, 7, 'VTA Delegate', TAG_VTA_DELEGATE);
  
  printInfo('👥 Testing VTA delegation (spending authority)');
  printInfo('   Data format: [tag:1][flags:1][delegate:32][limit:8][expiry:8]');
  
  const delegate = Keypair.generate().publicKey;
  const spendLimit = BigInt(1000000); // 0.001 SOL
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 7200); // 2 hours
  
  const data = Buffer.alloc(1 + 1 + 32 + 8 + 8);
  let offset = 0;
  
  data.writeUInt8(TAG_VTA_DELEGATE, offset++);
  data.writeUInt8(0x01, offset++); // flags
  delegate.toBytes().forEach((b, i) => data.writeUInt8(b, offset + i));
  offset += 32;
  data.writeBigUInt64LE(spendLimit, offset);
  offset += 8;
  data.writeBigUInt64LE(expiry, offset);
  offset += 8;
  
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: DEVNET_PMP_PROGRAM_ID,
    data: data.slice(0, offset),
  });
  
  printSuccess(`Built VTA delegate: ${offset} bytes`);
  printInfo(`   Delegate: ${delegate.toString().slice(0, 20)}...`);
  printInfo(`   Limit: ${spendLimit} lamports`);
  
  printWarning('Setting delegation...');
  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
  
  printSuccess('✨ VTA delegation set!');
  printTransaction(sig);
  
  return true;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const connection = new Connection(DEVNET_RPC, 'confirmed');
  
  // Safety check
  const genesisHash = await connection.getGenesisHash();
  if (genesisHash === '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d') {
    console.error('🛑 SAFETY: Detected MAINNET connection. Aborting.');
    process.exit(1);
  }
  
  console.log('\n🔧 Setup...\n');
  
  const payer = loadTestWallet();
  const balance = await connection.getBalance(payer.publicKey);
  
  printSuccess('Connected to devnet');
  printInfo(`Wallet: ${payer.publicKey.toString()}`);
  printInfo(`Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  printInfo(`Safety: DEVNET ONLY - mainnet protected\n`);
  
  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.error('❌ Insufficient balance. Need at least 0.1 SOL');
    process.exit(1);
  }
  
  const results = [];
  const tests = [
    { name: 'Proposal', tag: TAG_PROPOSAL, fn: testProposal },
    { name: 'Private Vote', tag: TAG_PRIVATE_VOTE, fn: testPrivateVote },
    { name: 'VTA Transfer', tag: TAG_VTA_TRANSFER, fn: testVTATransfer },
    { name: 'Hashlock Commit', tag: TAG_HASHLOCK_COMMIT, fn: testHashlockCommit },
    { name: 'Hashlock Reveal', tag: TAG_HASHLOCK_REVEAL, fn: testHashlockReveal },
    { name: 'Time Capsule', tag: TAG_TIME_CAPSULE, fn: testTimeCapsule },
    { name: 'VTA Delegate', tag: TAG_VTA_DELEGATE, fn: testVTADelegate },
  ];
  
  const startBalance = balance;
  
  for (const test of tests) {
    try {
      const pass = await test.fn(connection, payer);
      results.push({ ...test, pass });
      await sleep(1500);
    } catch (err) {
      console.error(`\n❌ FAILED: ${err.message}`);
      results.push({ ...test, pass: false, error: err.message });
      await sleep(1000);
    }
  }
  
  // Final report
  const endBalance = await connection.getBalance(payer.publicKey);
  const spent = (startBalance - endBalance) / LAMPORTS_PER_SOL;
  
  console.log('\n' + '═'.repeat(80));
  console.log('📊 EXTENDED TEST RESULTS');
  console.log('═'.repeat(80));
  
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  
  for (const r of results) {
    const status = r.pass ? '✅ PASS' : '❌ FAIL';
    console.log(`\n   ${r.name} (TAG ${r.tag}): ${status}`);
    if (r.error) console.log(`      Error: ${r.error.slice(0, 60)}...`);
  }
  
  console.log('\n' + '─'.repeat(80));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('─'.repeat(80));
  
  console.log(`   
💰 Spent: ${spent.toFixed(4)} SOL
   Final balance: ${(endBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL EXTENDED PMP INSTRUCTIONS WORKING!\n');
  } else {
    console.log(`\n⚠️  ${failed} tests failed - review errors above\n`);
  }
  
  console.log('✅ Safety: All tests on DEVNET - mainnet protected');
}

main().catch(console.error);
