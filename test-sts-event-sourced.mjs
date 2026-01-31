#!/usr/bin/env node
/**
 * STS COMPLETE FEATURE TEST - EVENT-SOURCED MODE
 * 
 * Tests the full Styx Token Standard using the native event-sourced architecture.
 * This is the PROPER way STS works - state inscribed to logs, not accounts.
 * 
 * Features tested:
 * - STS Note lifecycle (mint, transfer, burn)
 * - VSL Escrow (create, release)
 * - NFT marketplace (mint, list, buy)
 * - Privacy Vouchers (PPV)
 * - Global Pool operations
 * - Core messaging
 * 
 * All operations use trust_level=0 (INDEXER) for zero-rent, event-sourced state.
 * 
 * DEVNET ONLY - Mainnet protected
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
// CONFIGURATION - DEVNET ONLY
// ============================================================================

const DEVNET_RPC = 'https://api.devnet.solana.com';
const DEVNET_PMP_PROGRAM_ID = new PublicKey('FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW');
const TREASURY = new PublicKey('13xnC9kDksJMBE9FYVW1S7dukLjRDgrh4Dzm6eq5moon');
const TEST_WALLET_PATH = '.devnet/test-wallet.json';

// Trust levels - STS uses event-sourcing by default (0)
const TRUST_INDEXER = 0;      // Free, event-sourced (DEFAULT)
const TRUST_NULLIFIER_PDA = 1; // Creates PDA (0.00089 SOL)

// TAGs
const TAG = {
  // Core messaging
  PRIVATE_MESSAGE: 3,
  ROUTED_MESSAGE: 4,
  PRIVATE_TRANSFER: 5,
  RATCHET_MESSAGE: 7,
  COMPLIANCE_REVEAL: 8,
  
  // STS Notes
  NOTE_MINT: 80,
  NOTE_TRANSFER: 81,
  NOTE_BURN: 84,
  
  // VSL
  VSL_ESCROW_CREATE: 39,
  VSL_ESCROW_RELEASE: 40,
  
  // NFT
  NFT_MINT: 107,
  NFT_LIST: 112,
  NFT_BUY: 114,
  
  // PPV
  PPV_CREATE: 122,
  
  // Pool
  GPOOL_DEPOSIT: 85,
  POOL_CREATE: 139,
  
  // AMM (event-sourced)
  AMM_ADD_LIQUIDITY: 177,
  AMM_SWAP: 179,
};

console.log(`
╔══════════════════════════════════════════════════════════════════════════════════════╗
║              STS COMPLETE FEATURE TEST - EVENT-SOURCED MODE                          ║
║                                                                                      ║
║  🌊 Zero-rent, inscribed to logs, not accounts                                       ║
║  📝 Full STS functionality without PDA overhead                                      ║
║  🔒 DEVNET ONLY - Mainnet protected                                                  ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
`);

// ============================================================================
// UTILITIES
// ============================================================================

function loadTestWallet() {
  const secret = JSON.parse(fs.readFileSync(TEST_WALLET_PATH, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

function keccakHash(...inputs) {
  const combined = Buffer.concat(inputs.map(x => Buffer.isBuffer(x) ? x : Buffer.from(x)));
  return Buffer.from(keccak_256(combined));
}

function randomBytes(n) {
  const bytes = Buffer.alloc(n);
  for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
}

function randomPubkey() {
  return Keypair.generate().publicKey;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function getStandardAccounts(payer) {
  return [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: TREASURY, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
}

function encryptRecipient(sender, recipient) {
  const mask = keccakHash(Buffer.from('STYX_META_V3'), Buffer.from(sender.toBytes()));
  const recipientBytes = recipient.toBytes();
  const encrypted = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) encrypted[i] = recipientBytes[i] ^ mask[i];
  return encrypted;
}

// ============================================================================
// INSTRUCTION BUILDERS - All use TRUST_INDEXER (event-sourced)
// ============================================================================

function buildPrivateMessage(payer, message) {
  const recipient = randomPubkey();
  const encRecipient = encryptRecipient(payer.publicKey, recipient);
  const msgBytes = Buffer.from(message, 'utf8');
  
  const data = Buffer.alloc(1 + 1 + 32 + 32 + 2 + msgBytes.length);
  let offset = 0;
  data.writeUInt8(TAG.PRIVATE_MESSAGE, offset++);
  data.writeUInt8(TRUST_INDEXER, offset++); // Event-sourced mode
  encRecipient.copy(data, offset); offset += 32;
  Buffer.from(payer.publicKey.toBytes()).copy(data, offset); offset += 32;
  data.writeUInt16LE(msgBytes.length, offset); offset += 2;
  msgBytes.copy(data, offset);
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data: data.slice(0, offset + msgBytes.length),
  });
}

function buildPrivateTransfer(payer, recipient, amount) {
  const encRecipient = encryptRecipient(payer.publicKey, recipient);
  const nonce = randomBytes(8);
  
  // Encrypt amount
  const mask = keccakHash(Buffer.from('STYX_XFER_V3'), Buffer.from(payer.publicKey.toBytes()), Buffer.from(recipient.toBytes()), nonce);
  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(BigInt(amount));
  const encAmount = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) encAmount[i] = amountBuf[i] ^ mask[i];
  
  // Use standard accounts only - simpler for event-sourced mode
  const data = Buffer.alloc(1 + 1 + 32 + 8 + 8);
  let offset = 0;
  data.writeUInt8(TAG.PRIVATE_TRANSFER, offset++);
  data.writeUInt8(TRUST_INDEXER, offset++);
  encRecipient.copy(data, offset); offset += 32;
  encAmount.copy(data, offset); offset += 8;
  nonce.copy(data, offset);
  
  return new TransactionInstruction({
    keys: getStandardAccounts({ publicKey: payer.publicKey }),
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

function buildNoteMint(payer, mintPubkey, amount) {
  const noteCommitment = keccakHash(Buffer.from('STS_NOTE_COMMIT'), randomBytes(32));
  const encryptedNote = randomBytes(64);
  
  // MIN_LEN: 138 bytes
  const data = Buffer.alloc(138);
  let offset = 0;
  data.writeUInt8(TAG.NOTE_MINT, offset++);
  data.writeUInt8(TRUST_INDEXER, offset++); // Event-sourced
  Buffer.from(mintPubkey.toBytes()).copy(data, offset); offset += 32;
  data.writeBigUInt64LE(BigInt(amount), offset); offset += 8;
  noteCommitment.copy(data, offset); offset += 32;
  encryptedNote.copy(data, offset);
  
  return {
    ix: new TransactionInstruction({
      keys: getStandardAccounts(payer),
      programId: DEVNET_PMP_PROGRAM_ID,
      data,
    }),
    noteCommitment,
  };
}

function buildNoteTransfer(payer, nullifier, newCommitment, amount) {
  const encryptedAmount = randomBytes(8);
  
  // MIN_LEN: 75 bytes
  const data = Buffer.alloc(75);
  let offset = 0;
  data.writeUInt8(TAG.NOTE_TRANSFER, offset++);
  data.writeUInt8(TRUST_INDEXER, offset++); // Event-sourced - no PDA creation
  nullifier.copy(data, offset); offset += 32;
  newCommitment.copy(data, offset); offset += 32;
  encryptedAmount.copy(data, offset); offset += 8;
  data.writeUInt8(0, offset); // proof_len = 0
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

function buildNoteBurn(payer, nullifier) {
  const burnProof = randomBytes(64);
  const encAmount = randomBytes(8);
  
  // MIN_LEN: 106 bytes
  const data = Buffer.alloc(106);
  let offset = 0;
  data.writeUInt8(TAG.NOTE_BURN, offset++);
  data.writeUInt8(TRUST_INDEXER, offset++);
  nullifier.copy(data, offset); offset += 32;
  burnProof.copy(data, offset); offset += 64;
  encAmount.copy(data, offset);
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

function buildVslEscrowCreate(payer, mintPubkey) {
  const nullifier = randomBytes(32);
  const escrowCommitment = randomBytes(32);
  const arbiterHash = keccakHash(Buffer.from(payer.publicKey.toBytes()));
  const conditionsHash = randomBytes(32);
  const timeoutSlot = BigInt(Math.floor(Date.now() / 400) + 10000);
  
  // MIN_LEN: 170 bytes
  const data = Buffer.alloc(170);
  let offset = 0;
  data.writeUInt8(TAG.VSL_ESCROW_CREATE, offset++);
  data.writeUInt8(TRUST_INDEXER | 0x01, offset++); // has_arbiter flag
  Buffer.from(mintPubkey.toBytes()).copy(data, offset); offset += 32;
  nullifier.copy(data, offset); offset += 32;
  escrowCommitment.copy(data, offset); offset += 32;
  arbiterHash.copy(data, offset); offset += 32;
  conditionsHash.copy(data, offset); offset += 32;
  data.writeBigUInt64LE(timeoutSlot, offset);
  
  return {
    ix: new TransactionInstruction({
      keys: getStandardAccounts(payer),
      programId: DEVNET_PMP_PROGRAM_ID,
      data,
    }),
    escrowCommitment,
    arbiterHash,
    mint: mintPubkey,
  };
}

function buildVslEscrowRelease(payer, escrowId) {
  const recipientCommitment = randomBytes(32);
  const releaseProof = randomBytes(64);
  const encryptedAmount = randomBytes(8);
  
  // MIN_LEN: 137 bytes
  const data = Buffer.alloc(137);
  let offset = 0;
  data.writeUInt8(TAG.VSL_ESCROW_RELEASE, offset++);
  escrowId.copy(data, offset); offset += 32;
  recipientCommitment.copy(data, offset); offset += 32;
  releaseProof.copy(data, offset); offset += 64;
  encryptedAmount.copy(data, offset);
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

function buildNftMint(payer, collectionPubkey) {
  const metadataHash = randomBytes(32);
  const encryptedOwner = randomBytes(32);
  const mintProof = randomBytes(64);
  const nonce = randomBytes(8);
  
  // MIN_LEN: ~172 bytes
  const data = Buffer.alloc(172);
  let offset = 0;
  data.writeUInt8(TAG.NFT_MINT, offset++);
  data.writeUInt8(TRUST_INDEXER, offset++);
  Buffer.from(collectionPubkey.toBytes()).copy(data, offset); offset += 32;
  metadataHash.copy(data, offset); offset += 32;
  data.writeUInt16LE(500, offset); offset += 2; // 5% royalty
  encryptedOwner.copy(data, offset); offset += 32;
  mintProof.copy(data, offset); offset += 64;
  nonce.copy(data, offset);
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

function buildNftList(payer, nftId, price) {
  const encryptedSeller = randomBytes(32);
  const listingProof = randomBytes(32);
  
  // MIN_LEN: 105 bytes
  const data = Buffer.alloc(105);
  let offset = 0;
  data.writeUInt8(TAG.NFT_LIST, offset++);
  nftId.copy(data, offset); offset += 32;
  data.writeBigUInt64LE(BigInt(price), offset); offset += 8;
  encryptedSeller.copy(data, offset); offset += 32;
  listingProof.copy(data, offset);
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

function buildNftBuy(payer, listingId) {
  const inputNullifier = randomBytes(32);
  const buyerCommitment = randomBytes(32);
  const encryptedAmount = randomBytes(8);
  
  // MIN_LEN: 106 bytes
  const data = Buffer.alloc(106);
  let offset = 0;
  data.writeUInt8(TAG.NFT_BUY, offset++);
  data.writeUInt8(TRUST_INDEXER, offset++);
  listingId.copy(data, offset); offset += 32;
  inputNullifier.copy(data, offset); offset += 32;
  buyerCommitment.copy(data, offset); offset += 32;
  encryptedAmount.copy(data, offset);
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

function buildPpvCreate(payer) {
  const noteNullifier = randomBytes(32);
  const voucherCommitment = randomBytes(32);
  const allowlistRoot = randomBytes(32);
  const encryptedValue = randomBytes(8);
  const expirySlot = BigInt(Math.floor(Date.now() / 400) + 50000);
  const proof = randomBytes(24);
  
  // MIN_LEN: 138 bytes
  const data = Buffer.alloc(138);
  let offset = 0;
  data.writeUInt8(TAG.PPV_CREATE, offset++);
  data.writeUInt8(TRUST_INDEXER, offset++);
  noteNullifier.copy(data, offset); offset += 32;
  voucherCommitment.copy(data, offset); offset += 32;
  allowlistRoot.copy(data, offset); offset += 32;
  encryptedValue.copy(data, offset); offset += 8;
  data.writeBigUInt64LE(expirySlot, offset); offset += 8;
  proof.copy(data, offset);
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

function buildGPoolDeposit(payer, mintPubkey, amount) {
  const noteCommitment = randomBytes(32);
  const encryptedNote = randomBytes(64);
  const proof = randomBytes(32);
  
  // MIN_LEN: 170 bytes
  const data = Buffer.alloc(170);
  let offset = 0;
  data.writeUInt8(TAG.GPOOL_DEPOSIT, offset++);
  data.writeUInt8(TRUST_INDEXER, offset++);
  Buffer.from(mintPubkey.toBytes()).copy(data, offset); offset += 32;
  data.writeBigUInt64LE(BigInt(amount), offset); offset += 8;
  noteCommitment.copy(data, offset); offset += 32;
  encryptedNote.copy(data, offset); offset += 64;
  proof.copy(data, offset);
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

function buildPoolCreate(payer) {
  const poolId = randomBytes(32);
  const config = randomBytes(32);
  
  const data = Buffer.alloc(1 + 1 + 32 + 8 + 32);
  let offset = 0;
  data.writeUInt8(TAG.POOL_CREATE, offset++);
  data.writeUInt8(TRUST_INDEXER, offset++);
  poolId.copy(data, offset); offset += 32;
  data.writeBigUInt64LE(BigInt(100000), offset); offset += 8;
  config.copy(data, offset);
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

function buildAmmAddLiquidity(payer) {
  const poolId = randomBytes(32);
  const lpCommitment = randomBytes(32);
  const proof = randomBytes(32);
  
  // MIN_LEN: 114 bytes
  const data = Buffer.alloc(114);
  let offset = 0;
  data.writeUInt8(TAG.AMM_ADD_LIQUIDITY, offset++);
  data.writeUInt8(TRUST_INDEXER, offset++);
  poolId.copy(data, offset); offset += 32;
  data.writeBigUInt64LE(BigInt(50000), offset); offset += 8;
  data.writeBigUInt64LE(BigInt(50000), offset); offset += 8;
  lpCommitment.copy(data, offset); offset += 32;
  proof.copy(data, offset);
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

function buildAmmSwap(payer) {
  const poolId = randomBytes(32);
  const inputNullifier = randomBytes(32);
  const outputCommitment = randomBytes(32);
  
  // MIN_LEN: 114 bytes
  const data = Buffer.alloc(114);
  let offset = 0;
  data.writeUInt8(TAG.AMM_SWAP, offset++);
  data.writeUInt8(TRUST_INDEXER, offset++);
  poolId.copy(data, offset); offset += 32;
  inputNullifier.copy(data, offset); offset += 32;
  outputCommitment.copy(data, offset); offset += 32;
  data.writeBigUInt64LE(BigInt(1000), offset); offset += 8;
  data.writeBigUInt64LE(BigInt(990), offset);
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

// ============================================================================
// TEST WORKFLOWS
// ============================================================================

async function runTest(connection, payer, name, buildFn) {
  process.stdout.write(`   ${name}... `);
  try {
    const ix = typeof buildFn === 'function' ? buildFn() : buildFn;
    const actualIx = ix.ix || ix;
    const sig = await sendAndConfirmTransaction(connection, new Transaction().add(actualIx), [payer]);
    console.log(`✅ ${sig.slice(0, 16)}...`);
    return { name, pass: true, sig };
  } catch (err) {
    console.log(`❌ ${err.message?.slice(0, 50)}`);
    return { name, pass: false, error: err.message };
  }
}

async function main() {
  const connection = new Connection(DEVNET_RPC, 'confirmed');
  
  // Safety check - DEVNET ONLY
  const genesisHash = await connection.getGenesisHash();
  if (genesisHash === '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d') {
    console.error('🛑 MAINNET DETECTED - ABORTING FOR SAFETY');
    process.exit(1);
  }
  
  const payer = loadTestWallet();
  const startBalance = await connection.getBalance(payer.publicKey);
  
  console.log(`✅ Connected to DEVNET (genesis: ${genesisHash.slice(0, 12)}...)`);
  console.log(`   Wallet: ${payer.publicKey.toString()}`);
  console.log(`   Balance: ${(startBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log(`   Mode: Event-Sourced (trust_level=0, zero-rent)\n`);
  
  const results = [];
  const recipient = Keypair.generate();
  const mint = randomPubkey();
  const collection = randomPubkey();
  const nftId = keccakHash(Buffer.from(payer.publicKey.toBytes()), randomBytes(32));
  
  // Core Messaging
  console.log('📨 CORE MESSAGING');
  results.push(await runTest(connection, payer, 'Private Message', () => buildPrivateMessage(payer, 'Hello STS!')));
  await sleep(500);
  // Note: Private Transfer (TAG=5) is actual SOL transfer requiring matched accounts
  // Using Routed Message instead for comprehensive event-sourced test
  results.push(await runTest(connection, payer, 'Routed Message', () => {
    // Build a routed message (TAG 4) which is purely event-sourced
    const routingPath = [];
    for (let i = 0; i < 3; i++) {
      routingPath.push(randomPubkey());
    }
    const encMessage = randomBytes(64);
    
    const data = Buffer.alloc(1 + 1 + 32 + 1 + 3*32 + 64);
    let offset = 0;
    data.writeUInt8(TAG.ROUTED_MESSAGE, offset++);
    data.writeUInt8(TRUST_INDEXER, offset++);
    Buffer.from(payer.publicKey.toBytes()).copy(data, offset); offset += 32;
    data.writeUInt8(3, offset++); // num_hops
    for (const hop of routingPath) {
      Buffer.from(hop.toBytes()).copy(data, offset);
      offset += 32;
    }
    encMessage.copy(data, offset);
    
    return new TransactionInstruction({
      keys: getStandardAccounts(payer),
      programId: DEVNET_PMP_PROGRAM_ID,
      data,
    });
  }));
  await sleep(500);
  
  // STS Note Lifecycle
  console.log('\n💎 STS NOTE LIFECYCLE');
  const { ix: mintIx, noteCommitment } = buildNoteMint(payer, mint, 1000000);
  results.push(await runTest(connection, payer, 'Note Mint', mintIx));
  await sleep(500);
  
  const nullifier = keccakHash(Buffer.from('STS_NULLIFIER'), noteCommitment);
  const newCommitment = keccakHash(Buffer.from('STS_NEW'), randomBytes(32));
  results.push(await runTest(connection, payer, 'Note Transfer', () => buildNoteTransfer(payer, nullifier, newCommitment, 500000)));
  await sleep(500);
  
  const burnNullifier = keccakHash(Buffer.from('STS_BURN'), newCommitment);
  results.push(await runTest(connection, payer, 'Note Burn', () => buildNoteBurn(payer, burnNullifier)));
  await sleep(500);
  
  // VSL Escrow
  console.log('\n📦 VSL ESCROW');
  const { ix: escrowIx, escrowCommitment, arbiterHash, mint: escrowMint } = buildVslEscrowCreate(payer, mint);
  results.push(await runTest(connection, payer, 'Escrow Create', escrowIx));
  await sleep(500);
  
  const escrowId = keccakHash(Buffer.from('STYX_VSL_ESCROW_V1'), Buffer.from(escrowMint.toBytes()), escrowCommitment, arbiterHash);
  results.push(await runTest(connection, payer, 'Escrow Release', () => buildVslEscrowRelease(payer, escrowId)));
  await sleep(500);
  
  // NFT Marketplace
  console.log('\n🎨 NFT MARKETPLACE');
  results.push(await runTest(connection, payer, 'NFT Mint', () => buildNftMint(payer, collection)));
  await sleep(500);
  results.push(await runTest(connection, payer, 'NFT List', () => buildNftList(payer, nftId, 1000000000)));
  await sleep(500);
  results.push(await runTest(connection, payer, 'NFT Buy', () => buildNftBuy(payer, nftId)));
  await sleep(500);
  
  // Privacy Vouchers
  console.log('\n🎫 PRIVACY VOUCHERS');
  results.push(await runTest(connection, payer, 'PPV Create', () => buildPpvCreate(payer)));
  await sleep(500);
  
  // Pool Operations
  console.log('\n💧 POOL OPERATIONS');
  results.push(await runTest(connection, payer, 'GPool Deposit', () => buildGPoolDeposit(payer, mint, 100000)));
  await sleep(500);
  results.push(await runTest(connection, payer, 'Pool Create', () => buildPoolCreate(payer)));
  await sleep(500);
  
  // AMM/DEX
  console.log('\n🔄 AMM/DEX');
  results.push(await runTest(connection, payer, 'AMM Add Liquidity', () => buildAmmAddLiquidity(payer)));
  await sleep(500);
  results.push(await runTest(connection, payer, 'AMM Swap', () => buildAmmSwap(payer)));
  await sleep(500);
  
  // Summary
  const endBalance = await connection.getBalance(payer.publicKey);
  const spent = (startBalance - endBalance) / LAMPORTS_PER_SOL;
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  
  console.log('\n' + '═'.repeat(70));
  console.log('📊 STS EVENT-SOURCED TEST SUMMARY');
  console.log('═'.repeat(70));
  
  const categories = {
    'Core Messaging': results.slice(0, 2),
    'STS Note Lifecycle': results.slice(2, 5),
    'VSL Escrow': results.slice(5, 7),
    'NFT Marketplace': results.slice(7, 10),
    'Privacy Vouchers': results.slice(10, 11),
    'Pool Operations': results.slice(11, 13),
    'AMM/DEX': results.slice(13, 15),
  };
  
  for (const [cat, items] of Object.entries(categories)) {
    const catPassed = items.filter(i => i.pass).length;
    const status = catPassed === items.length ? '✅' : '🔄';
    console.log(`${status} ${cat.padEnd(20)} ${catPassed}/${items.length}`);
  }
  
  console.log('─'.repeat(70));
  console.log(`TOTAL: ${results.length} | PASSED: ${passed} | FAILED: ${failed} | RATE: ${(passed/results.length*100).toFixed(0)}%`);
  console.log(`\n💰 Spent: ${spent.toFixed(4)} SOL | Remaining: ${(endBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  
  // Save log
  const log = {
    timestamp: new Date().toISOString(),
    network: 'devnet',
    genesisHash: genesisHash.slice(0, 20),
    program: DEVNET_PMP_PROGRAM_ID.toString(),
    mode: 'event-sourced (trust_level=0)',
    totalTests: results.length,
    passed,
    failed,
    successRate: `${(passed/results.length*100).toFixed(0)}%`,
    spentSOL: spent,
    transactions: results.filter(r => r.pass).map(r => ({
      test: r.name,
      signature: r.sig,
      explorer: `https://explorer.solana.com/tx/${r.sig}?cluster=devnet`
    }))
  };
  
  fs.writeFileSync('STS_EVENT_SOURCED_TEST_LOG.json', JSON.stringify(log, null, 2));
  console.log('\n📝 Log saved to STS_EVENT_SOURCED_TEST_LOG.json');
  
  console.log('\n✅ SAFETY: All tests on DEVNET only - mainnet protected\n');
}

main().catch(console.error);
