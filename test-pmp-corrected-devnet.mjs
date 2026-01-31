#!/usr/bin/env node
/**
 * PMP Instruction Test Suite - CORRECTED - DEVNET ONLY
 * 
 * Fixed account structures based on actual program code
 * 
 * Account Order (for fee-paying instructions):
 * 0: Payer (signer, writable)
 * 1: Treasury (13xnC9kDksJMBE9FYVW1S7dukLjRDgrh4Dzm6eq5moon)
 * 2: System Program (11111111111111111111111111111111)
 * 3+: Additional accounts per instruction
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
import crypto from 'crypto';
import { keccak_256 } from '@noble/hashes/sha3.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEVNET_RPC = 'https://api.devnet.solana.com';
const DEVNET_PMP_PROGRAM_ID = new PublicKey('FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW');
const TREASURY = new PublicKey('13xnC9kDksJMBE9FYVW1S7dukLjRDgrh4Dzm6eq5moon');
const TEST_WALLET_PATH = '.devnet/test-wallet.json';

const TAG_PRIVATE_MESSAGE = 3;
const TAG_ROUTED_MESSAGE = 4;
const TAG_PRIVATE_TRANSFER = 5;
const TAG_RATCHET_MESSAGE = 7;
const TAG_COMPLIANCE_REVEAL = 8;

console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║           PMP INSTRUCTION TEST SUITE - CORRECTED ACCOUNTS                    ║
║                                                                              ║
║  ✅ Fixed account structures based on program code                          ║
║  🔒 DEVNET ONLY - Mainnet protected                                         ║
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

function printTestHeader(num, name, tag) {
  console.log('\n' + '═'.repeat(80));
  console.log(`TEST ${num}/5: ${name} (TAG ${tag})`);
  console.log('═'.repeat(80));
}

function printSuccess(msg) { console.log(`✅ ${msg}`); }
function printInfo(msg) { console.log(`   ${msg}`); }
function printWarning(msg) { console.log(`⚠️  ${msg}`); }
function printTransaction(sig) {
  console.log(`   🔗 https://explorer.solana.com/tx/${sig}?cluster=devnet`);
}

// Keccak hash for recipient encryption (matching program)
function keccakHash(...data) {
  // Use proper Keccak-256 (NOT SHA3-256) to match Solana's keccak::hashv
  const combined = Buffer.concat(data);
  return Buffer.from(keccak_256(combined));
}

function encryptRecipient(sender, recipient) {
  // Big program uses Keccak256 with STYX_META_V3
  const mask = keccakHash(Buffer.from('STYX_META_V3'), Buffer.from(sender.toBytes()));
  const recipientBytes = recipient.toBytes();
  const encrypted = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) {
    encrypted[i] = recipientBytes[i] ^ mask[i];
  }
  return encrypted;
}

function encryptAmount(sender, recipient, amount, nonce) {
  const hash = keccakHash(
    Buffer.from('STYX_XFER_V3'),
    Buffer.from(sender.toBytes()),
    Buffer.from(recipient.toBytes()),
    nonce
  );
  const mask = hash.readBigUInt64LE(0);
  return BigInt(amount) ^ mask;
}

// ============================================================================
// TEST 1: TAG_PRIVATE_MESSAGE (3)
// ============================================================================

async function testPrivateMessage(connection, wallet) {
  printTestHeader(1, 'Private Message', TAG_PRIVATE_MESSAGE);
  
  console.log('\n📝 Testing encrypted message through PMP program');
  printInfo('Data format: [tag:1][flags:1][enc_recipient:32][sender:32][payload_len:2][payload:var]');
  
  try {
    const receiver = Keypair.generate();
    const plaintext = 'Hello from corrected PMP test!';
    
    printInfo(`Receiver: ${receiver.publicKey.toString()}`);
    printInfo(`Message: "${plaintext}"`);
    
    // Encrypt recipient address
    const encryptedRecipient = encryptRecipient(wallet.publicKey, receiver.publicKey);
    
    // Build instruction data (matching program format)
    const flags = 0x00; // No special flags
    const payloadBytes = Buffer.from(plaintext, 'utf8');
    const payloadLen = payloadBytes.length;
    
    const instructionData = Buffer.concat([
      Buffer.from([TAG_PRIVATE_MESSAGE]), // tag (1 byte)
      Buffer.from([flags]), // flags (1 byte)
      encryptedRecipient, // encrypted recipient (32 bytes)
      Buffer.from(wallet.publicKey.toBytes()), // sender (32 bytes)
      Buffer.from([payloadLen & 0xFF, (payloadLen >> 8) & 0xFF]), // payload_len (2 bytes)
      payloadBytes, // payload (variable)
    ]);
    
    printSuccess(`Built instruction: ${instructionData.length} bytes`);
    
    // Full program WITH fee collection for TAG 3
    const transaction = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // payer
          { pubkey: TREASURY, isSigner: false, isWritable: true }, // treasury
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system
        ],
        programId: DEVNET_PMP_PROGRAM_ID,
        data: instructionData,
      })
    );
    
    printWarning('Sending transaction...');
    
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet],
      { commitment: 'confirmed' }
    );
    
    printSuccess('✨ Private message sent!');
    printTransaction(signature);
    
    return { success: true, signature };
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    if (error.logs) console.error('Logs:', error.logs.join('\n'));
    return { success: false, error: error.message };
  }
}

// ============================================================================
// TEST 2: TAG_ROUTED_MESSAGE (4)
// ============================================================================

async function testRoutedMessage(connection, wallet) {
  printTestHeader(2, 'Routed Message', TAG_ROUTED_MESSAGE);
  
  console.log('\n🔀 Testing multi-hop message routing');
  printInfo('Data format: [tag:1][flags:1][hop_count:1][...routing_data][payload_len:2][payload:var]');
  
  try {
    const message = 'Routed through hops';
    const hopCount = 2;
    const currentHop = 0;
    
    // Build routing data
    const flags = 0x00;
    const payloadBytes = Buffer.from(message, 'utf8');
    const payloadLen = payloadBytes.length;
    
    // Note: Program expects specific byte positions, let's match them
    const routingData = Buffer.alloc(69); // Up to position 69 for payload_len
    routingData[0] = TAG_ROUTED_MESSAGE;
    routingData[1] = flags;
    routingData[2] = hopCount;
    routingData[36] = currentHop; // Current hop at position 36
    
    const instructionData = Buffer.concat([
      routingData,
      Buffer.from([payloadLen & 0xFF, (payloadLen >> 8) & 0xFF]), // payload_len at position 69
      payloadBytes,
    ]);
    
    printSuccess(`Built routing instruction: ${instructionData.length} bytes`);
    printInfo(`Hops: ${hopCount}, Current: ${currentHop}`);
    
    // Full program WITH fee collection
    const transaction = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // payer
          { pubkey: TREASURY, isSigner: false, isWritable: true }, // treasury
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system
        ],
        programId: DEVNET_PMP_PROGRAM_ID,
        data: instructionData,
      })
    );
    
    printWarning('Sending routed message...');
    
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet],
      { commitment: 'confirmed' }
    );
    
    printSuccess('✨ Routed message sent!');
    printTransaction(signature);
    
    return { success: true, signature, hops: hopCount };
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    if (error.logs) console.error('Logs:', error.logs.join('\n'));
    return { success: false, error: error.message };
  }
}

// ============================================================================
// TEST 3: TAG_PRIVATE_TRANSFER (5)
// ============================================================================

async function testPrivateTransfer(connection, wallet) {
  printTestHeader(3, 'Private Transfer', TAG_PRIVATE_TRANSFER);
  
  console.log('\n💰 Testing private SOL transfer with encrypted amount');
  printInfo('Needs accounts: [payer, treasury, system, from, to, system_program_again]');
  
  try {
    const receiver = Keypair.generate();
    const transferAmount = 0.001 * LAMPORTS_PER_SOL;
    
    printInfo(`Receiver: ${receiver.publicKey.toString()}`);
    printInfo(`Amount: 0.001 SOL (encrypted)`);
    
    // Encrypt recipient
    const encryptedRecipient = encryptRecipient(wallet.publicKey, receiver.publicKey);
    
    // Encrypt amount
    const amountNonce = crypto.randomBytes(8);
    const encryptedAmount = encryptAmount(
      wallet.publicKey,
      receiver.publicKey,
      transferAmount,
      amountNonce
    );
    
    // Build instruction data
    const memoLen = 0;
    const instructionData = Buffer.alloc(84); // TAG(1) + FLAGS(1) + ENC_RECIPIENT(32) + SENDER(32) + ENC_AMOUNT(8) + NONCE(8) + MEMO_LEN(2)
    
    let offset = 0;
    instructionData[offset++] = TAG_PRIVATE_TRANSFER; // tag
    instructionData[offset++] = 0; // flags
    encryptedRecipient.copy(instructionData, offset); offset += 32; // encrypted recipient
    Buffer.from(wallet.publicKey.toBytes()).copy(instructionData, offset); offset += 32; // sender
    instructionData.writeBigUInt64LE(encryptedAmount, offset); offset += 8; // encrypted_amount at position 66
    amountNonce.copy(instructionData, offset); offset += 8; // nonce at position 74
    instructionData.writeUInt16LE(memoLen, offset); // memo_len at position 82

    
    printSuccess('Amount encrypted');
    printInfo(`Encrypted: 0x${encryptedAmount.toString(16)}`);
    
    // Create transaction with proper accounts for private_transfer
    // [0-2] Fee collection: payer, treasury, system
    // [3-5] Transfer: from, to, system
    const transaction = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // [0] payer
          { pubkey: TREASURY, isSigner: false, isWritable: true }, // [1] treasury
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // [2] system
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // [3] from
          { pubkey: receiver.publicKey, isSigner: false, isWritable: true }, // [4] to
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // [5] system
        ],
        programId: DEVNET_PMP_PROGRAM_ID,
        data: instructionData,
      })
    );
    
    printWarning('Sending private transfer...');
    
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet],
      { commitment: 'confirmed' }
    );
    
    printSuccess('✨ Private transfer completed!');
    printTransaction(signature);
    
    // Verify
    const balance = await connection.getBalance(receiver.publicKey);
    printSuccess(`Receiver balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    return { success: true, signature, receiver: receiver.publicKey };
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    if (error.logs) console.error('Logs:', error.logs.join('\n'));
    return { success: false, error: error.message };
  }
}

// ============================================================================
// TEST 4: TAG_RATCHET_MESSAGE (7)
// ============================================================================

async function testRatchetMessage(connection, wallet) {
  printTestHeader(4, 'Ratchet Message', TAG_RATCHET_MESSAGE);
  
  console.log('\n🔐 Testing forward-secret ratchet messaging');
  printInfo('Data format: [tag:1][...][counter:8 at pos 34][...][ciphertext_len:2 at pos 74][ciphertext:var]');
  
  try {
    const message = 'Forward-secret ratcheted message';
    const counter = BigInt(1);
    
    // Build ratchet data (program expects specific positions)
    const ratchetData = Buffer.alloc(76); // Up to position 76
    ratchetData[0] = TAG_RATCHET_MESSAGE;
    ratchetData.writeBigUInt64LE(counter, 34); // Counter at position 34
    
    const ciphertextBytes = Buffer.from(message, 'utf8');
    const ciphertextLen = ciphertextBytes.length;
    
    const instructionData = Buffer.concat([
      ratchetData,
      Buffer.from([ciphertextLen & 0xFF, (ciphertextLen >> 8) & 0xFF]), // at position 74
      ciphertextBytes,
    ]);
    
    printSuccess(`Built ratchet instruction: ${instructionData.length} bytes`);
    printInfo(`Counter: ${counter}, Message: "${message}"`);
    
    // Full program WITH fee collection
    const transaction = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // payer
          { pubkey: TREASURY, isSigner: false, isWritable: true }, // treasury
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system
        ],
        programId: DEVNET_PMP_PROGRAM_ID,
        data: instructionData,
      })
    );
    
    printWarning('Sending ratchet message...');
    
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet],
      { commitment: 'confirmed' }
    );
    
    printSuccess('✨ Ratchet message sent!');
    printTransaction(signature);
    
    return { success: true, signature, counter: Number(counter) };
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    if (error.logs) console.error('Logs:', error.logs.join('\n'));
    return { success: false, error: error.message };
  }
}

// ============================================================================
// TEST 5: TAG_COMPLIANCE_REVEAL (8) - Already working!
// ============================================================================

async function testComplianceReveal(connection, wallet) {
  printTestHeader(5, 'Compliance Reveal', TAG_COMPLIANCE_REVEAL);
  
  console.log('\n🔍 Testing compliance/audit disclosure');
  printInfo('Data format: [tag:1][...][auditor:32 at pos 34][disclosure_key:32 at pos 66][reveal_type:1 at pos 98]');
  
  try {
    const auditor = Keypair.generate().publicKey;
    const disclosureKey = crypto.randomBytes(32);
    const revealType = 0; // 0=Full, 1=Amount, 2=Recipient, 3=Memo
    
    printInfo(`Auditor: ${auditor.toString()}`);
    printInfo(`Reveal type: ${['Full', 'Amount', 'Recipient', 'Memo'][revealType]}`);
    
    // Build compliance data
    const complianceData = Buffer.alloc(99); // Up to position 99
    complianceData[0] = TAG_COMPLIANCE_REVEAL;
    Buffer.from(auditor.toBytes()).copy(complianceData, 34); // auditor at 34
    disclosureKey.copy(complianceData, 66); // disclosure_key at 66
    complianceData[98] = revealType; // reveal_type at 98
    
    // Full program WITH fee collection  
    const transaction = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // payer
          { pubkey: TREASURY, isSigner: false, isWritable: true }, // treasury
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system
        ],
        programId: DEVNET_PMP_PROGRAM_ID,
        data: complianceData,
      })
    );
    
    printWarning('Sending compliance reveal...');
    
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet],
      { commitment: 'confirmed' }
    );
    
    printSuccess('✨ Compliance reveal submitted!');
    printTransaction(signature);
    
    return { success: true, signature, auditor };
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    if (error.logs) console.error('Logs:', error.logs.join('\n'));
    return { success: false, error: error.message };
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function runTests() {
  const results = { connection: null, wallet: null, initialBalance: 0, finalBalance: 0, tests: [] };
  
  try {
    console.log('\n🔧 Setup...\n');
    results.connection = new Connection(DEVNET_RPC, 'confirmed');
    results.wallet = loadTestWallet();
    results.initialBalance = await results.connection.getBalance(results.wallet.publicKey);
    
    printSuccess('Connected to devnet');
    printInfo(`Wallet: ${results.wallet.publicKey.toString()}`);
    printInfo(`Balance: ${(results.initialBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    printInfo('Safety: DEVNET ONLY - mainnet protected\n');
    
    await sleep(1500);
    
    const test1 = await testPrivateMessage(results.connection, results.wallet);
    results.tests.push({ name: 'Private Message (TAG 3)', ...test1 });
    await sleep(1500);
    
    const test2 = await testRoutedMessage(results.connection, results.wallet);
    results.tests.push({ name: 'Routed Message (TAG 4)', ...test2 });
    await sleep(1500);
    
    const test3 = await testPrivateTransfer(results.connection, results.wallet);
    results.tests.push({ name: 'Private Transfer (TAG 5)', ...test3 });
    await sleep(1500);
    
    const test4 = await testRatchetMessage(results.connection, results.wallet);
    results.tests.push({ name: 'Ratchet Message (TAG 7)', ...test4 });
    await sleep(1500);
    
    const test5 = await testComplianceReveal(results.connection, results.wallet);
    results.tests.push({ name: 'Compliance Reveal (TAG 8)', ...test5 });
    
    results.finalBalance = await results.connection.getBalance(results.wallet.publicKey);
    const spent = (results.initialBalance - results.finalBalance) / LAMPORTS_PER_SOL;
    
    // Summary
    console.log('\n' + '═'.repeat(80));
    console.log('📊 FINAL RESULTS');
    console.log('═'.repeat(80) + '\n');
    
    const passed = results.tests.filter(t => t.success).length;
    const failed = results.tests.filter(t => !t.success).length;
    
    results.tests.forEach((test, idx) => {
      const status = test.success ? '✅ PASS' : '❌ FAIL';
      console.log(`   ${idx + 1}. ${test.name.padEnd(35)} ${status}`);
    });
    
    console.log('\n' + '─'.repeat(80));
    console.log(`Total: ${results.tests.length} | Passed: ${passed} | Failed: ${failed}`);
    console.log('─'.repeat(80));
    
    printInfo(`\n💰 Spent: ${spent.toFixed(4)} SOL`);
    printInfo(`   Final balance: ${(results.finalBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    
    if (passed === 5) {
      console.log('\n🎉 ALL PMP INSTRUCTIONS WORKING!');
      console.log('✅ Successfully tested all core PMP features on devnet');
    }
    
    console.log('\n✅ Safety: All tests on DEVNET - mainnet protected\n');
    
  } catch (error) {
    console.error('\n💥 Crashed:', error.message);
    process.exit(1);
  }
}

runTests();
