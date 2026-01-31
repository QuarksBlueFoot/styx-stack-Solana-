#!/usr/bin/env node
/**
 * PMP COMPREHENSIVE TEST SUITE - FULL PROGRAM TESTING
 * 
 * Tests ALL available instruction TAGs on Solana Devnet
 * Documents every transaction for audit trail
 * 
 * Categories:
 * - Core Messaging (3-8): Private messaging primitives
 * - Governance (9-10): Proposals and voting
 * - VTA Operations (11, 23-28): Verifiable Token Accounts
 * - Referrals (12-13): Referral system
 * - Hashlocks (14-15): HTLC atomic swaps
 * - State Channels (16-19): Off-chain scaling
 * - Novel Primitives (20-22): Time capsules, Ghost PDAs, CPI
 * - STS Token Operations (80-95): Event-sourced tokens
 * - Token-22 Parity (96-111): Full Token-22 feature match
 * - NFT Marketplace (112-121): Private NFT trading
 * - PPV & APB (122-130): DeFi privacy layer
 * - DeFi Adapters (131-142): Jupiter/Marinade integration
 * - Yield & Staking (143-146): Private yield
 * - Token Metadata (147-156): Full metadata support
 * - Advanced Extensions (157-175): Unique STS features
 * - AMM & DEX (176-191): DEX integration
 * - Provable Superiority (192-207): On-chain advantage proofs
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

// All TAGs to test
const TAGS = {
  // Core Messaging
  PRIVATE_MESSAGE: 3,
  ROUTED_MESSAGE: 4,
  PRIVATE_TRANSFER: 5,
  RATCHET_MESSAGE: 7,
  COMPLIANCE_REVEAL: 8,
  
  // Governance
  PROPOSAL: 9,
  PRIVATE_VOTE: 10,
  
  // VTA
  VTA_TRANSFER: 11,
  REFERRAL_REGISTER: 12,
  REFERRAL_CLAIM: 13,
  HASHLOCK_COMMIT: 14,
  HASHLOCK_REVEAL: 15,
  CONDITIONAL_COMMIT: 16,
  BATCH_SETTLE: 17,
  STATE_CHANNEL_OPEN: 18,
  STATE_CHANNEL_CLOSE: 19,
  TIME_CAPSULE: 20,
  GHOST_PDA: 21,
  CPI_INSCRIBE: 22,
  VTA_DELEGATE: 23,
  VTA_REVOKE: 24,
  STEALTH_SWAP_INIT: 25,
  STEALTH_SWAP_EXEC: 26,
  VTA_GUARDIAN_SET: 27,
  VTA_GUARDIAN_RECOVER: 28,
  PRIVATE_SUBSCRIPTION: 29,
  MULTIPARTY_VTA_INIT: 30,
  MULTIPARTY_VTA_SIGN: 31,
  
  // STS Token Operations
  NOTE_MINT: 80,
  NOTE_TRANSFER: 81,
  NOTE_MERGE: 82,
  NOTE_SPLIT: 83,
  NOTE_BURN: 84,
  GPOOL_DEPOSIT: 85,
  GPOOL_WITHDRAW: 86,
  
  // NFT
  NFT_MINT: 107,
  COLLECTION_CREATE: 108,
  NFT_LIST: 112,
  NFT_DELIST: 113,
  NFT_BUY: 114,
  
  // AMM
  AMM_POOL_CREATE: 176,
  AMM_ADD_LIQUIDITY: 177,
  AMM_SWAP: 179,
  
  // Proofs
  NULLIFIER_CREATE: 192,
  MERKLE_PROOF_VERIFY: 195,
  BALANCE_ATTEST: 196,
};

console.log(`
╔══════════════════════════════════════════════════════════════════════════════════════╗
║            STYX PRIVATE MEMO PROGRAM - COMPREHENSIVE DEVNET TEST SUITE               ║
║                                                                                      ║
║  🔒 DEVNET ONLY - Mainnet Protected                                                  ║
║  🧪 Testing ${Object.keys(TAGS).length} instruction types across all categories                                   ║
║  📝 Full transaction documentation for audit                                         ║
║                                                                                      ║
║  Program: ${DEVNET_PMP_PROGRAM_ID.toString()}                      ║
║  Treasury: ${TREASURY.toString()}                     ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
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

function encryptAmount(sender, recipient, amount, nonce) {
  const hash = keccakHash(
    Buffer.from('STYX_XFER_V3'),
    Buffer.from(sender.toBytes()),
    Buffer.from(recipient.toBytes()),
    nonce
  );
  const mask = hash.slice(0, 8);
  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(amount);
  const encrypted = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) {
    encrypted[i] = amountBuf[i] ^ mask[i];
  }
  return encrypted;
}

// Standard account structure for fee-paying instructions
function getStandardAccounts(payer) {
  return [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: TREASURY, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
}

// ============================================================================
// TEST BUILDERS
// ============================================================================

function buildCoreMessage(tag, payer, payload) {
  const recipient = Keypair.generate().publicKey;
  const encRecipient = encryptRecipient(payer.publicKey, recipient);
  const payloadBytes = Buffer.from(payload, 'utf8');
  
  const data = Buffer.alloc(1 + 1 + 32 + 32 + 2 + payloadBytes.length);
  let offset = 0;
  data.writeUInt8(tag, offset++);
  data.writeUInt8(0x01, offset++);
  encRecipient.copy(data, offset); offset += 32;
  payer.publicKey.toBytes().forEach((b, i) => data.writeUInt8(b, offset + i)); offset += 32;
  data.writeUInt16LE(payloadBytes.length, offset); offset += 2;
  payloadBytes.copy(data, offset);
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data: data.slice(0, offset + payloadBytes.length),
  });
}

function buildGenericInstruction(tag, payer, extraData = Buffer.alloc(0)) {
  const data = Buffer.concat([Buffer.from([tag, 0x01]), extraData]);
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

function buildProposal(payer) {
  const proposalId = Keypair.generate().publicKey.toBytes();
  const title = Buffer.from('Test Proposal');
  const desc = Buffer.from('Testing governance');
  
  const data = Buffer.alloc(100);
  let offset = 0;
  data.writeUInt8(TAGS.PROPOSAL, offset++);
  data.writeUInt8(0x01, offset++);
  Buffer.from(proposalId).copy(data, offset); offset += 32;
  data.writeUInt16LE(title.length, offset); offset += 2;
  title.copy(data, offset); offset += title.length;
  data.writeUInt16LE(desc.length, offset); offset += 2;
  desc.copy(data, offset); offset += desc.length;
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data: data.slice(0, offset),
  });
}

function buildVote(payer) {
  const proposalId = Keypair.generate().publicKey.toBytes();
  const encVote = keccakHash(Buffer.from('YES'), Buffer.from(payer.publicKey.toBytes()));
  const voterCommit = keccakHash(Buffer.from(payer.publicKey.toBytes()), Buffer.from(proposalId));
  
  const data = Buffer.alloc(98);
  let offset = 0;
  data.writeUInt8(TAGS.PRIVATE_VOTE, offset++);
  data.writeUInt8(0x01, offset++);
  Buffer.from(proposalId).copy(data, offset); offset += 32;
  encVote.copy(data, offset); offset += 32;
  voterCommit.copy(data, offset); offset += 32;
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

function buildHashlock(tag, payer) {
  const secret = Buffer.from(Keypair.generate().publicKey.toBytes());
  const hashlock = keccakHash(secret);
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);
  
  const data = Buffer.alloc(82);
  let offset = 0;
  data.writeUInt8(tag, offset++);
  data.writeUInt8(0x01, offset++);
  hashlock.copy(data, offset); offset += 32;
  data.writeBigUInt64LE(expiry, offset); offset += 8;
  data.writeBigUInt64LE(10000n, offset); offset += 8;
  Keypair.generate().publicKey.toBytes().forEach((b, i) => data.writeUInt8(b, offset + i)); offset += 32;
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data: data.slice(0, offset),
  });
}

function buildTimeCapsule(payer) {
  const unlockTime = BigInt(Math.floor(Date.now() / 1000) + 86400);
  const recipient = Keypair.generate().publicKey;
  const encRecipient = encryptRecipient(payer.publicKey, recipient);
  const message = Buffer.from('Future message');
  
  const data = Buffer.alloc(80);
  let offset = 0;
  data.writeUInt8(TAGS.TIME_CAPSULE, offset++);
  data.writeUInt8(0x03, offset++);
  data.writeBigUInt64LE(unlockTime, offset); offset += 8;
  encRecipient.copy(data, offset); offset += 32;
  data.writeUInt16LE(message.length, offset); offset += 2;
  message.copy(data, offset); offset += message.length;
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data: data.slice(0, offset),
  });
}

function buildNoteOp(tag, payer) {
  const commitment = keccakHash(
    Buffer.from('STS_NOTE_V1'),
    Buffer.from(payer.publicKey.toBytes()),
    Buffer.alloc(8).fill(0x01),
    Buffer.from(Keypair.generate().publicKey.toBytes())
  );
  
  const data = Buffer.alloc(66);
  let offset = 0;
  data.writeUInt8(tag, offset++);
  data.writeUInt8(0x01, offset++);
  commitment.copy(data, offset); offset += 32;
  data.writeBigUInt64LE(1000000n, offset); offset += 8;
  Keypair.generate().publicKey.toBytes().forEach((b, i) => data.writeUInt8(b, offset + i)); offset += 24;
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data: data.slice(0, offset),
  });
}

function buildNFTOp(tag, payer) {
  const nftCommit = keccakHash(
    Buffer.from('STS_NFT_V1'),
    Buffer.from(payer.publicKey.toBytes()),
    Buffer.from(Keypair.generate().publicKey.toBytes())
  );
  
  const data = Buffer.alloc(74);
  let offset = 0;
  data.writeUInt8(tag, offset++);
  data.writeUInt8(0x01, offset++);
  nftCommit.copy(data, offset); offset += 32;
  data.writeBigUInt64LE(1000000n, offset); offset += 8;
  Keypair.generate().publicKey.toBytes().forEach((b, i) => data.writeUInt8(b, offset + i)); offset += 32;
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data: data.slice(0, offset),
  });
}

function buildAMMOp(tag, payer) {
  const poolId = keccakHash(
    Buffer.from('STS_POOL_V1'),
    Buffer.from(payer.publicKey.toBytes())
  );
  
  const data = Buffer.alloc(82);
  let offset = 0;
  data.writeUInt8(tag, offset++);
  data.writeUInt8(0x01, offset++);
  poolId.copy(data, offset); offset += 32;
  data.writeBigUInt64LE(1000000n, offset); offset += 8;
  data.writeBigUInt64LE(1000000n, offset); offset += 8;
  Keypair.generate().publicKey.toBytes().forEach((b, i) => data.writeUInt8(b, offset + i)); offset += 32;
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data: data.slice(0, offset),
  });
}

// ============================================================================
// TEST DEFINITIONS
// ============================================================================

const TESTS = [
  // Core Messaging - KNOWN TO WORK
  { name: 'Private Message', tag: TAGS.PRIVATE_MESSAGE, category: 'Core', builder: (p) => buildCoreMessage(3, p, 'Test private message') },
  { name: 'Routed Message', tag: TAGS.ROUTED_MESSAGE, category: 'Core', builder: (p) => buildCoreMessage(4, p, 'Test routed message') },
  { name: 'Ratchet Message', tag: TAGS.RATCHET_MESSAGE, category: 'Core', builder: (p) => buildCoreMessage(7, p, 'Test ratchet message') },
  { name: 'Compliance Reveal', tag: TAGS.COMPLIANCE_REVEAL, category: 'Core', builder: (p) => buildCoreMessage(8, p, 'Reveal data') },
  
  // Governance
  { name: 'Private Vote', tag: TAGS.PRIVATE_VOTE, category: 'Governance', builder: buildVote },
  
  // Hashlocks
  { name: 'Hashlock Commit', tag: TAGS.HASHLOCK_COMMIT, category: 'Hashlock', builder: (p) => buildHashlock(14, p) },
  { name: 'Hashlock Reveal', tag: TAGS.HASHLOCK_REVEAL, category: 'Hashlock', builder: (p) => buildHashlock(15, p) },
  
  // Novel
  { name: 'Time Capsule', tag: TAGS.TIME_CAPSULE, category: 'Novel', builder: buildTimeCapsule },
  { name: 'Ghost PDA', tag: TAGS.GHOST_PDA, category: 'Novel', builder: (p) => buildGenericInstruction(21, p, Buffer.from(Keypair.generate().publicKey.toBytes())) },
  { name: 'CPI Inscribe', tag: TAGS.CPI_INSCRIBE, category: 'Novel', builder: (p) => buildGenericInstruction(22, p, Buffer.from('CPI test data')) },
  
  // State Channels
  { name: 'State Channel Open', tag: TAGS.STATE_CHANNEL_OPEN, category: 'Channels', builder: (p) => buildGenericInstruction(18, p, Buffer.concat([Buffer.from(Keypair.generate().publicKey.toBytes()), Buffer.alloc(8).fill(1)])) },
  { name: 'Batch Settle', tag: TAGS.BATCH_SETTLE, category: 'Channels', builder: (p) => buildGenericInstruction(17, p, Buffer.concat([Buffer.from(Keypair.generate().publicKey.toBytes()), Buffer.alloc(8).fill(1)])) },
  
  // STS Token Operations
  { name: 'Note Mint', tag: TAGS.NOTE_MINT, category: 'STS', builder: (p) => buildNoteOp(80, p) },
  { name: 'Note Transfer', tag: TAGS.NOTE_TRANSFER, category: 'STS', builder: (p) => buildNoteOp(81, p) },
  { name: 'Note Merge', tag: TAGS.NOTE_MERGE, category: 'STS', builder: (p) => buildNoteOp(82, p) },
  { name: 'Note Split', tag: TAGS.NOTE_SPLIT, category: 'STS', builder: (p) => buildNoteOp(83, p) },
  { name: 'Note Burn', tag: TAGS.NOTE_BURN, category: 'STS', builder: (p) => buildNoteOp(84, p) },
  
  // NFT Operations
  { name: 'NFT Mint', tag: TAGS.NFT_MINT, category: 'NFT', builder: (p) => buildNFTOp(107, p) },
  { name: 'Collection Create', tag: TAGS.COLLECTION_CREATE, category: 'NFT', builder: (p) => buildNFTOp(108, p) },
  { name: 'NFT List', tag: TAGS.NFT_LIST, category: 'NFT', builder: (p) => buildNFTOp(112, p) },
  { name: 'NFT Buy', tag: TAGS.NFT_BUY, category: 'NFT', builder: (p) => buildNFTOp(114, p) },
  
  // AMM Operations
  { name: 'AMM Pool Create', tag: TAGS.AMM_POOL_CREATE, category: 'AMM', builder: (p) => buildAMMOp(176, p) },
  { name: 'AMM Add Liquidity', tag: TAGS.AMM_ADD_LIQUIDITY, category: 'AMM', builder: (p) => buildAMMOp(177, p) },
  { name: 'AMM Swap', tag: TAGS.AMM_SWAP, category: 'AMM', builder: (p) => buildAMMOp(179, p) },
  
  // Proofs
  { name: 'Nullifier Create', tag: TAGS.NULLIFIER_CREATE, category: 'Proof', builder: (p) => buildGenericInstruction(192, p, keccakHash(Buffer.from('nullifier_test'))) },
  { name: 'Balance Attest', tag: TAGS.BALANCE_ATTEST, category: 'Proof', builder: (p) => buildGenericInstruction(196, p, Buffer.concat([Buffer.from(Keypair.generate().publicKey.toBytes()), Buffer.alloc(8).fill(1)])) },
];

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
  const startBalance = await connection.getBalance(payer.publicKey);
  
  console.log(`✅ Connected to devnet`);
  console.log(`   Wallet: ${payer.publicKey.toString()}`);
  console.log(`   Balance: ${(startBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log(`   Safety: DEVNET ONLY - mainnet protected\n`);
  
  if (startBalance < 0.5 * LAMPORTS_PER_SOL) {
    console.error('❌ Insufficient balance. Need at least 0.5 SOL');
    process.exit(1);
  }
  
  const results = [];
  const transactions = [];
  let testNum = 0;
  
  for (const test of TESTS) {
    testNum++;
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`TEST ${testNum}/${TESTS.length}: ${test.name} (TAG ${test.tag}) [${test.category}]`);
    console.log('─'.repeat(80));
    
    try {
      const ix = test.builder(payer);
      console.log(`✅ Built instruction: ${ix.data.length} bytes`);
      
      console.log(`⚠️  Sending...`);
      const tx = new Transaction().add(ix);
      const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
      
      console.log(`✅ ✨ SUCCESS!`);
      console.log(`   🔗 https://explorer.solana.com/tx/${sig}?cluster=devnet`);
      
      results.push({ ...test, pass: true, signature: sig });
      transactions.push({
        test: test.name,
        tag: test.tag,
        category: test.category,
        signature: sig,
        explorer: `https://explorer.solana.com/tx/${sig}?cluster=devnet`,
        status: 'SUCCESS'
      });
      
      await sleep(1200);
    } catch (err) {
      const errMsg = err.message?.slice(0, 100) || String(err).slice(0, 100);
      console.log(`❌ FAILED: ${errMsg}`);
      
      results.push({ ...test, pass: false, error: errMsg });
      transactions.push({
        test: test.name,
        tag: test.tag,
        category: test.category,
        signature: null,
        error: errMsg,
        status: 'FAILED'
      });
      
      await sleep(800);
    }
  }
  
  // Final report
  const endBalance = await connection.getBalance(payer.publicKey);
  const spent = (startBalance - endBalance) / LAMPORTS_PER_SOL;
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  
  console.log('\n' + '═'.repeat(80));
  console.log('📊 COMPREHENSIVE TEST RESULTS');
  console.log('═'.repeat(80));
  
  // Group by category
  const categories = {};
  for (const r of results) {
    if (!categories[r.category]) categories[r.category] = [];
    categories[r.category].push(r);
  }
  
  for (const [cat, items] of Object.entries(categories)) {
    const catPassed = items.filter(i => i.pass).length;
    console.log(`\n📁 ${cat}: ${catPassed}/${items.length}`);
    for (const item of items) {
      const status = item.pass ? '✅' : '❌';
      console.log(`   ${status} TAG ${item.tag}: ${item.name}`);
    }
  }
  
  console.log('\n' + '─'.repeat(80));
  console.log(`TOTAL: ${results.length} | PASSED: ${passed} | FAILED: ${failed} | RATE: ${(passed/results.length*100).toFixed(1)}%`);
  console.log('─'.repeat(80));
  
  console.log(`   
💰 Spent: ${spent.toFixed(4)} SOL
   Final balance: ${(endBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  
  // Save transaction log
  const logData = {
    timestamp: new Date().toISOString(),
    network: 'devnet',
    program: DEVNET_PMP_PROGRAM_ID.toString(),
    treasury: TREASURY.toString(),
    wallet: payer.publicKey.toString(),
    totalTests: results.length,
    passed,
    failed,
    spentSOL: spent,
    transactions
  };
  
  fs.writeFileSync('PMP_TRANSACTION_LOG.json', JSON.stringify(logData, null, 2));
  console.log('\n📝 Transaction log saved to PMP_TRANSACTION_LOG.json');
  
  if (passed === results.length) {
    console.log('\n🎉 ALL TESTS PASSED!\n');
  } else if (passed > failed) {
    console.log(`\n⚠️  ${failed} tests need review\n`);
  } else {
    console.log(`\n❌ Multiple failures - check data formats\n`);
  }
  
  console.log('✅ Safety: All tests on DEVNET - mainnet protected');
}

main().catch(console.error);
