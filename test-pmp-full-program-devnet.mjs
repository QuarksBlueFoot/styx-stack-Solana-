#!/usr/bin/env node
/**
 * PMP FULL PROGRAM TEST - ALL 207 TAGs
 * 
 * Tests every single instruction in the Styx Private Memo Program
 * Documents all transactions for complete audit trail
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
// CONFIGURATION
// ============================================================================

const DEVNET_RPC = 'https://api.devnet.solana.com';
const DEVNET_PMP_PROGRAM_ID = new PublicKey('FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW');
const TREASURY = new PublicKey('13xnC9kDksJMBE9FYVW1S7dukLjRDgrh4Dzm6eq5moon');
const TEST_WALLET_PATH = '.devnet/test-wallet.json';

// ALL TAGs from the program (3-207)
const ALL_TAGS = {
  // Core Messaging (3-8)
  PRIVATE_MESSAGE: 3,
  ROUTED_MESSAGE: 4,
  PRIVATE_TRANSFER: 5,
  RATCHET_MESSAGE: 7,
  COMPLIANCE_REVEAL: 8,
  
  // Governance & VTA (9-31)
  PROPOSAL: 9,
  PRIVATE_VOTE: 10,
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
  
  // VSL (32-53)
  VSL_DEPOSIT: 32,
  VSL_WITHDRAW: 33,
  VSL_PRIVATE_TRANSFER: 34,
  VSL_PRIVATE_SWAP: 35,
  VSL_SHIELDED_SEND: 36,
  VSL_SPLIT: 37,
  VSL_MERGE: 38,
  VSL_ESCROW_CREATE: 39,
  VSL_ESCROW_RELEASE: 40,
  VSL_ESCROW_REFUND: 41,
  VSL_BALANCE_PROOF: 42,
  VSL_AUDIT_REVEAL: 43,
  DECOY_STORM: 44,
  DECOY_REVEAL: 45,
  EPHEMERAL_CREATE: 46,
  EPHEMERAL_DRAIN: 47,
  CHRONO_LOCK: 48,
  CHRONO_REVEAL: 49,
  SHADOW_FOLLOW: 50,
  SHADOW_UNFOLLOW: 51,
  PHANTOM_NFT_COMMIT: 52,
  PHANTOM_NFT_PROVE: 53,
  
  // STS Token Operations (80-95)
  NOTE_MINT: 80,
  NOTE_TRANSFER: 81,
  NOTE_MERGE: 82,
  NOTE_SPLIT: 83,
  NOTE_BURN: 84,
  GPOOL_DEPOSIT: 85,
  GPOOL_WITHDRAW: 86,
  GPOOL_WITHDRAW_STEALTH: 87,
  GPOOL_WITHDRAW_SWAP: 88,
  MERKLE_UPDATE: 89,
  MERKLE_EMERGENCY: 90,
  NOTE_EXTEND: 91,
  NOTE_FREEZE: 92,
  NOTE_THAW: 93,
  PROTOCOL_PAUSE: 94,
  PROTOCOL_UNPAUSE: 95,
  
  // Token-22 Parity (96-111)
  GROUP_CREATE: 96,
  GROUP_ADD_MEMBER: 97,
  GROUP_REMOVE_MEMBER: 98,
  HOOK_REGISTER: 99,
  WRAP_SPL: 101,
  UNWRAP_SPL: 102,
  INTEREST_ACCRUE: 103,
  NFT_MINT: 107,
  COLLECTION_CREATE: 108,
  ROYALTY_CLAIM: 109,
  FAIR_LAUNCH_COMMIT: 110,
  FAIR_LAUNCH_REVEAL: 111,
  
  // NFT Marketplace (112-121)
  NFT_LIST: 112,
  NFT_DELIST: 113,
  NFT_BUY: 114,
  NFT_OFFER: 115,
  NFT_ACCEPT_OFFER: 116,
  NFT_CANCEL_OFFER: 117,
  AUCTION_CREATE: 118,
  AUCTION_BID: 119,
  AUCTION_SETTLE: 120,
  AUCTION_CANCEL: 121,
  
  // PPV & APB (122-130)
  PPV_CREATE: 122,
  PPV_VERIFY: 123,
  PPV_REDEEM: 124,
  PPV_TRANSFER: 125,
  PPV_EXTEND: 126,
  PPV_REVOKE: 127,
  APB_TRANSFER: 128,
  APB_BATCH: 129,
  STEALTH_SCAN_HINT: 130,
  
  // DeFi Adapters (131-142)
  ADAPTER_REGISTER: 131,
  ADAPTER_CALL: 132,
  ADAPTER_CALLBACK: 133,
  PRIVATE_SWAP: 134,
  PRIVATE_STAKE: 135,
  PRIVATE_UNSTAKE: 136,
  PRIVATE_LP_ADD: 137,
  PRIVATE_LP_REMOVE: 138,
  POOL_CREATE: 139,
  POOL_DEPOSIT: 140,
  POOL_WITHDRAW: 141,
  POOL_DONATE: 142,
  
  // Yield (143-146)
  YIELD_VAULT_CREATE: 143,
  YIELD_DEPOSIT: 144,
  YIELD_CLAIM: 145,
  YIELD_WITHDRAW: 146,
  
  // Token Metadata (147-156)
  TOKEN_CREATE: 147,
  TOKEN_SET_AUTHORITY: 148,
  TOKEN_METADATA_SET: 149,
  TOKEN_METADATA_UPDATE: 150,
  HOOK_EXECUTE_REAL: 151,
  CONFIDENTIAL_TRANSFER_V2: 152,
  INTEREST_CLAIM_REAL: 153,
  ROYALTY_CLAIM_REAL: 154,
  BATCH_NOTE_OPS: 155,
  EXCHANGE_PROOF: 156,
  
  // Advanced Features (157-175)
  SELECTIVE_DISCLOSURE: 157,
  CONDITIONAL_TRANSFER: 158,
  DELEGATION_CHAIN: 159,
  TIME_LOCKED_REVEAL: 160,
  CROSS_MINT_ATOMIC: 161,
  SOCIAL_RECOVERY: 162,
  JUPITER_ROUTE: 163,
  MARINADE_STAKE: 164,
  DRIFT_PERP: 165,
  PRIVATE_LENDING: 166,
  FLASH_LOAN: 167,
  ORACLE_BOUND: 168,
  VELOCITY_LIMIT: 169,
  GOVERNANCE_LOCK: 170,
  REPUTATION_GATE: 171,
  GEO_RESTRICTION: 172,
  TIME_DECAY: 173,
  MULTI_SIG_NOTE: 174,
  RECOVERABLE_NOTE: 175,
  
  // AMM & DEX (176-191)
  AMM_POOL_CREATE: 176,
  AMM_ADD_LIQUIDITY: 177,
  AMM_REMOVE_LIQUIDITY: 178,
  AMM_SWAP: 179,
  AMM_QUOTE: 180,
  AMM_SYNC: 181,
  LP_NOTE_MINT: 182,
  LP_NOTE_BURN: 183,
  ROUTER_SWAP: 184,
  ROUTER_SPLIT: 185,
  LIMIT_ORDER_PLACE: 186,
  LIMIT_ORDER_FILL: 187,
  LIMIT_ORDER_CANCEL: 188,
  TWAP_ORDER_START: 189,
  TWAP_ORDER_FILL: 190,
  CONCENTRATED_LP: 191,
  
  // Provable Superiority (192-207)
  NULLIFIER_CREATE: 192,
  NULLIFIER_CHECK: 193,
  MERKLE_ROOT_PUBLISH: 194,
  MERKLE_PROOF_VERIFY: 195,
  BALANCE_ATTEST: 196,
  BALANCE_VERIFY: 197,
  FREEZE_ENFORCED: 198,
  THAW_GOVERNED: 199,
  WRAPPER_MINT: 200,
  WRAPPER_BURN: 201,
  VALIDATOR_PROOF: 202,
  SECURITY_AUDIT: 203,
  COMPLIANCE_PROOF: 204,
  DECENTRALIZATION_METRIC: 205,
  ATOMIC_CPI_TRANSFER: 206,
  BATCH_NULLIFIER: 207,
};

console.log(`
╔══════════════════════════════════════════════════════════════════════════════════════╗
║            STYX PMP - FULL PROGRAM TEST (ALL ${Object.keys(ALL_TAGS).length} INSTRUCTIONS)                       ║
║                                                                                      ║
║  🔒 DEVNET ONLY - Mainnet Protected                                                  ║
║  📝 Testing every instruction in the program                                         ║
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

function randomBytes(n) {
  const bytes = Buffer.alloc(n);
  for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
}

function randomPubkey() {
  return Keypair.generate().publicKey;
}

function encryptRecipient(sender, recipient) {
  const mask = keccakHash(Buffer.from('STYX_META_V3'), Buffer.from(sender.toBytes()));
  const recipientBytes = recipient.toBytes();
  const encrypted = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) encrypted[i] = recipientBytes[i] ^ mask[i];
  return encrypted;
}

// Standard accounts for fee-paying instructions
function getStandardAccounts(payer) {
  return [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: TREASURY, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
}

// ============================================================================
// INSTRUCTION BUILDERS BY CATEGORY
// ============================================================================

// Generic builder - just tag + flags + random data
function buildGeneric(tag, payer, extraLen = 32) {
  const data = Buffer.alloc(2 + extraLen);
  data.writeUInt8(tag, 0);
  data.writeUInt8(0x01, 1);
  randomBytes(extraLen).copy(data, 2);
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

// Core messaging format
function buildCoreMessage(tag, payer, message) {
  const recipient = randomPubkey();
  const encRecipient = encryptRecipient(payer.publicKey, recipient);
  const msgBytes = Buffer.from(message, 'utf8');
  
  const data = Buffer.alloc(1 + 1 + 32 + 32 + 2 + msgBytes.length);
  let offset = 0;
  data.writeUInt8(tag, offset++);
  data.writeUInt8(0x01, offset++);
  encRecipient.copy(data, offset); offset += 32;
  Buffer.from(payer.publicKey.toBytes()).copy(data, offset); offset += 32;
  data.writeUInt16LE(msgBytes.length, offset); offset += 2;
  msgBytes.copy(data, offset);
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

// Routed message format
function buildRoutedMessage(tag, payer, message) {
  const hop1 = randomPubkey();
  const hop2 = randomPubkey();
  const msgBytes = Buffer.from(message);
  
  const data = Buffer.alloc(1 + 1 + 1 + 1 + 32 + 32 + 2 + msgBytes.length);
  let offset = 0;
  data.writeUInt8(tag, offset++);
  data.writeUInt8(0x02, offset++);
  data.writeUInt8(2, offset++); // hop_count
  data.writeUInt8(0, offset++); // current_hop
  Buffer.from(hop1.toBytes()).copy(data, offset); offset += 32;
  Buffer.from(hop2.toBytes()).copy(data, offset); offset += 32;
  data.writeUInt16LE(msgBytes.length, offset); offset += 2;
  msgBytes.copy(data, offset);
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data: data.slice(0, offset + msgBytes.length),
  });
}

// Private transfer format (with accounts)
function buildPrivateTransfer(payer, recipient) {
  const encRecipient = encryptRecipient(payer.publicKey, recipient);
  const nonce = randomBytes(8);
  const amount = BigInt(1000); // 0.000001 SOL
  
  // Encrypt amount
  const mask = keccakHash(Buffer.from('STYX_XFER_V3'), Buffer.from(payer.publicKey.toBytes()), Buffer.from(recipient.toBytes()), nonce);
  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(amount);
  const encAmount = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) encAmount[i] = amountBuf[i] ^ mask[i];
  
  const data = Buffer.alloc(1 + 1 + 32 + 8 + 8);
  let offset = 0;
  data.writeUInt8(5, offset++); // TAG_PRIVATE_TRANSFER
  data.writeUInt8(0x01, offset++);
  encRecipient.copy(data, offset); offset += 32;
  encAmount.copy(data, offset); offset += 8;
  nonce.copy(data, offset);
  
  return new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: payer.publicKey, isSigner: false, isWritable: true },
      { pubkey: recipient, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

// Ratchet message format
function buildRatchetMessage(payer, message) {
  const recipient = randomPubkey();
  const encRecipient = encryptRecipient(payer.publicKey, recipient);
  const msgBytes = Buffer.from(message);
  const counter = BigInt(1);
  const ephemeral = randomBytes(32);
  const prevChain = randomBytes(32);
  
  const data = Buffer.alloc(1 + 1 + 32 + 8 + 32 + 32 + 2 + msgBytes.length);
  let offset = 0;
  data.writeUInt8(7, offset++); // TAG_RATCHET_MESSAGE
  data.writeUInt8(0x01, offset++);
  encRecipient.copy(data, offset); offset += 32;
  data.writeBigUInt64LE(counter, offset); offset += 8;
  ephemeral.copy(data, offset); offset += 32;
  prevChain.copy(data, offset); offset += 32;
  data.writeUInt16LE(msgBytes.length, offset); offset += 2;
  msgBytes.copy(data, offset);
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data: data.slice(0, offset + msgBytes.length),
  });
}

// Compliance reveal format
function buildComplianceReveal(payer) {
  const auditor = randomPubkey();
  const disclosureKey = randomBytes(32);
  
  const data = Buffer.alloc(1 + 1 + 32 + 32 + 32 + 1);
  let offset = 0;
  data.writeUInt8(8, offset++); // TAG_COMPLIANCE_REVEAL
  data.writeUInt8(0x01, offset++);
  encryptRecipient(payer.publicKey, auditor).copy(data, offset); offset += 32;
  Buffer.from(auditor.toBytes()).copy(data, offset); offset += 32;
  disclosureKey.copy(data, offset); offset += 32;
  data.writeUInt8(2, offset++); // reveal_type: FULL
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data: data.slice(0, offset),
  });
}

// Vote format
function buildVote(payer) {
  const proposalId = randomBytes(32);
  const encVote = keccakHash(Buffer.from('YES'), Buffer.from(payer.publicKey.toBytes()));
  const voterCommit = keccakHash(Buffer.from(payer.publicKey.toBytes()), proposalId);
  
  const data = Buffer.alloc(1 + 1 + 32 + 32 + 32);
  let offset = 0;
  data.writeUInt8(10, offset++);
  data.writeUInt8(0x01, offset++);
  proposalId.copy(data, offset); offset += 32;
  encVote.copy(data, offset); offset += 32;
  voterCommit.copy(data, offset);
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

// Hashlock format
function buildHashlock(tag, payer) {
  const secret = randomBytes(32);
  const hashlock = keccakHash(secret);
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const amount = BigInt(10000);
  const recipient = randomPubkey();
  
  const data = Buffer.alloc(1 + 1 + 32 + 8 + 8 + 32);
  let offset = 0;
  data.writeUInt8(tag, offset++);
  data.writeUInt8(0x01, offset++);
  hashlock.copy(data, offset); offset += 32;
  data.writeBigUInt64LE(expiry, offset); offset += 8;
  data.writeBigUInt64LE(amount, offset); offset += 8;
  Buffer.from(recipient.toBytes()).copy(data, offset);
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

// Time capsule format
function buildTimeCapsule(payer) {
  const unlockTime = BigInt(Math.floor(Date.now() / 1000) + 86400);
  const recipient = randomPubkey();
  const encRecipient = encryptRecipient(payer.publicKey, recipient);
  const message = Buffer.from('Future message');
  
  const data = Buffer.alloc(1 + 1 + 8 + 32 + 2 + message.length);
  let offset = 0;
  data.writeUInt8(20, offset++);
  data.writeUInt8(0x03, offset++);
  data.writeBigUInt64LE(unlockTime, offset); offset += 8;
  encRecipient.copy(data, offset); offset += 32;
  data.writeUInt16LE(message.length, offset); offset += 2;
  message.copy(data, offset);
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data: data.slice(0, offset + message.length),
  });
}

// ============================================================================
// TEST DEFINITIONS
// ============================================================================

function buildTest(name, tag, category, builder) {
  return { name, tag, category, builder };
}

const TESTS = [
  // Core Messaging - verified working formats
  buildTest('Private Message', 3, 'Core', (p) => buildCoreMessage(3, p, 'Test private message')),
  buildTest('Routed Message', 4, 'Core', (p) => buildRoutedMessage(4, p, 'Test routed message')),
  buildTest('Private Transfer', 5, 'Core', (p) => buildPrivateTransfer(p, randomPubkey())),
  buildTest('Ratchet Message', 7, 'Core', (p) => buildRatchetMessage(p, 'Test ratchet message')),
  buildTest('Compliance Reveal', 8, 'Core', (p) => buildComplianceReveal(p)),
  
  // Governance
  buildTest('Proposal', 9, 'Governance', (p) => buildGeneric(9, p, 64)),
  buildTest('Private Vote', 10, 'Governance', (p) => buildVote(p)),
  buildTest('VTA Transfer', 11, 'Governance', (p) => buildGeneric(11, p, 48)),
  buildTest('Referral Register', 12, 'Governance', (p) => buildGeneric(12, p, 32)),
  buildTest('Referral Claim', 13, 'Governance', (p) => buildGeneric(13, p, 32)),
  
  // Hashlocks
  buildTest('Hashlock Commit', 14, 'Hashlock', (p) => buildHashlock(14, p)),
  buildTest('Hashlock Reveal', 15, 'Hashlock', (p) => buildHashlock(15, p)),
  buildTest('Conditional Commit', 16, 'Hashlock', (p) => buildGeneric(16, p, 64)),
  buildTest('Batch Settle', 17, 'Hashlock', (p) => buildGeneric(17, p, 64)),
  
  // State Channels
  buildTest('State Channel Open', 18, 'Channels', (p) => buildGeneric(18, p, 48)),
  buildTest('State Channel Close', 19, 'Channels', (p) => buildGeneric(19, p, 48)),
  
  // Novel Primitives
  buildTest('Time Capsule', 20, 'Novel', (p) => buildTimeCapsule(p)),
  buildTest('Ghost PDA', 21, 'Novel', (p) => buildGeneric(21, p, 32)),
  buildTest('CPI Inscribe', 22, 'Novel', (p) => buildGeneric(22, p, 16)),
  
  // VTA Extended
  buildTest('VTA Delegate', 23, 'VTA', (p) => buildGeneric(23, p, 48)),
  buildTest('VTA Revoke', 24, 'VTA', (p) => buildGeneric(24, p, 32)),
  buildTest('Stealth Swap Init', 25, 'VTA', (p) => buildGeneric(25, p, 64)),
  buildTest('Stealth Swap Exec', 26, 'VTA', (p) => buildGeneric(26, p, 64)),
  buildTest('VTA Guardian Set', 27, 'VTA', (p) => buildGeneric(27, p, 64)),
  buildTest('VTA Guardian Recover', 28, 'VTA', (p) => buildGeneric(28, p, 96)),
  buildTest('Private Subscription', 29, 'VTA', (p) => buildGeneric(29, p, 48)),
  buildTest('Multiparty VTA Init', 30, 'VTA', (p) => buildGeneric(30, p, 64)),
  buildTest('Multiparty VTA Sign', 31, 'VTA', (p) => buildGeneric(31, p, 64)),
  
  // VSL
  buildTest('VSL Deposit', 32, 'VSL', (p) => buildGeneric(32, p, 48)),
  buildTest('VSL Withdraw', 33, 'VSL', (p) => buildGeneric(33, p, 48)),
  buildTest('VSL Private Transfer', 34, 'VSL', (p) => buildGeneric(34, p, 64)),
  buildTest('VSL Private Swap', 35, 'VSL', (p) => buildGeneric(35, p, 64)),
  buildTest('VSL Shielded Send', 36, 'VSL', (p) => buildGeneric(36, p, 64)),
  buildTest('VSL Split', 37, 'VSL', (p) => buildGeneric(37, p, 48)),
  buildTest('VSL Merge', 38, 'VSL', (p) => buildGeneric(38, p, 48)),
  buildTest('VSL Escrow Create', 39, 'VSL', (p) => buildGeneric(39, p, 64)),
  buildTest('VSL Escrow Release', 40, 'VSL', (p) => buildGeneric(40, p, 32)),
  buildTest('VSL Escrow Refund', 41, 'VSL', (p) => buildGeneric(41, p, 32)),
  buildTest('VSL Balance Proof', 42, 'VSL', (p) => buildGeneric(42, p, 48)),
  buildTest('VSL Audit Reveal', 43, 'VSL', (p) => buildGeneric(43, p, 64)),
  
  // Privacy Enhancers
  buildTest('Decoy Storm', 44, 'Privacy', (p) => buildGeneric(44, p, 32)),
  buildTest('Decoy Reveal', 45, 'Privacy', (p) => buildGeneric(45, p, 32)),
  buildTest('Ephemeral Create', 46, 'Privacy', (p) => buildGeneric(46, p, 32)),
  buildTest('Ephemeral Drain', 47, 'Privacy', (p) => buildGeneric(47, p, 32)),
  buildTest('Chrono Lock', 48, 'Privacy', (p) => buildGeneric(48, p, 48)),
  buildTest('Chrono Reveal', 49, 'Privacy', (p) => buildGeneric(49, p, 32)),
  buildTest('Shadow Follow', 50, 'Privacy', (p) => buildGeneric(50, p, 32)),
  buildTest('Shadow Unfollow', 51, 'Privacy', (p) => buildGeneric(51, p, 32)),
  buildTest('Phantom NFT Commit', 52, 'Privacy', (p) => buildGeneric(52, p, 32)),
  buildTest('Phantom NFT Prove', 53, 'Privacy', (p) => buildGeneric(53, p, 32)),
  
  // STS Token Operations
  buildTest('Note Mint', 80, 'STS', (p) => buildGeneric(80, p, 48)),
  buildTest('Note Transfer', 81, 'STS', (p) => buildGeneric(81, p, 64)),
  buildTest('Note Merge', 82, 'STS', (p) => buildGeneric(82, p, 64)),
  buildTest('Note Split', 83, 'STS', (p) => buildGeneric(83, p, 48)),
  buildTest('Note Burn', 84, 'STS', (p) => buildGeneric(84, p, 32)),
  buildTest('GPool Deposit', 85, 'STS', (p) => buildGeneric(85, p, 48)),
  buildTest('GPool Withdraw', 86, 'STS', (p) => buildGeneric(86, p, 48)),
  buildTest('GPool Withdraw Stealth', 87, 'STS', (p) => buildGeneric(87, p, 64)),
  buildTest('GPool Withdraw Swap', 88, 'STS', (p) => buildGeneric(88, p, 64)),
  buildTest('Merkle Update', 89, 'STS', (p) => buildGeneric(89, p, 32)),
  buildTest('Merkle Emergency', 90, 'STS', (p) => buildGeneric(90, p, 32)),
  buildTest('Note Extend', 91, 'STS', (p) => buildGeneric(91, p, 32)),
  buildTest('Note Freeze', 92, 'STS', (p) => buildGeneric(92, p, 32)),
  buildTest('Note Thaw', 93, 'STS', (p) => buildGeneric(93, p, 32)),
  buildTest('Protocol Pause', 94, 'STS', (p) => buildGeneric(94, p, 16)),
  buildTest('Protocol Unpause', 95, 'STS', (p) => buildGeneric(95, p, 16)),
  
  // Token-22 Parity
  buildTest('Group Create', 96, 'Token22', (p) => buildGeneric(96, p, 48)),
  buildTest('Group Add Member', 97, 'Token22', (p) => buildGeneric(97, p, 32)),
  buildTest('Group Remove Member', 98, 'Token22', (p) => buildGeneric(98, p, 32)),
  buildTest('Hook Register', 99, 'Token22', (p) => buildGeneric(99, p, 32)),
  buildTest('Wrap SPL', 101, 'Token22', (p) => buildGeneric(101, p, 48)),
  buildTest('Unwrap SPL', 102, 'Token22', (p) => buildGeneric(102, p, 48)),
  buildTest('Interest Accrue', 103, 'Token22', (p) => buildGeneric(103, p, 32)),
  buildTest('NFT Mint', 107, 'Token22', (p) => buildGeneric(107, p, 64)),
  buildTest('Collection Create', 108, 'Token22', (p) => buildGeneric(108, p, 48)),
  buildTest('Royalty Claim', 109, 'Token22', (p) => buildGeneric(109, p, 32)),
  buildTest('Fair Launch Commit', 110, 'Token22', (p) => buildGeneric(110, p, 32)),
  buildTest('Fair Launch Reveal', 111, 'Token22', (p) => buildGeneric(111, p, 32)),
  
  // NFT Marketplace
  buildTest('NFT List', 112, 'NFT', (p) => buildGeneric(112, p, 48)),
  buildTest('NFT Delist', 113, 'NFT', (p) => buildGeneric(113, p, 32)),
  buildTest('NFT Buy', 114, 'NFT', (p) => buildGeneric(114, p, 48)),
  buildTest('NFT Offer', 115, 'NFT', (p) => buildGeneric(115, p, 48)),
  buildTest('NFT Accept Offer', 116, 'NFT', (p) => buildGeneric(116, p, 32)),
  buildTest('NFT Cancel Offer', 117, 'NFT', (p) => buildGeneric(117, p, 32)),
  buildTest('Auction Create', 118, 'NFT', (p) => buildGeneric(118, p, 64)),
  buildTest('Auction Bid', 119, 'NFT', (p) => buildGeneric(119, p, 48)),
  buildTest('Auction Settle', 120, 'NFT', (p) => buildGeneric(120, p, 32)),
  buildTest('Auction Cancel', 121, 'NFT', (p) => buildGeneric(121, p, 32)),
  
  // PPV & APB
  buildTest('PPV Create', 122, 'PPV', (p) => buildGeneric(122, p, 64)),
  buildTest('PPV Verify', 123, 'PPV', (p) => buildGeneric(123, p, 32)),
  buildTest('PPV Redeem', 124, 'PPV', (p) => buildGeneric(124, p, 32)),
  buildTest('PPV Transfer', 125, 'PPV', (p) => buildGeneric(125, p, 64)),
  buildTest('PPV Extend', 126, 'PPV', (p) => buildGeneric(126, p, 32)),
  buildTest('PPV Revoke', 127, 'PPV', (p) => buildGeneric(127, p, 32)),
  buildTest('APB Transfer', 128, 'PPV', (p) => buildGeneric(128, p, 64)),
  buildTest('APB Batch', 129, 'PPV', (p) => buildGeneric(129, p, 64)),
  buildTest('Stealth Scan Hint', 130, 'PPV', (p) => buildGeneric(130, p, 32)),
  
  // DeFi Adapters
  buildTest('Adapter Register', 131, 'DeFi', (p) => buildGeneric(131, p, 48)),
  buildTest('Adapter Call', 132, 'DeFi', (p) => buildGeneric(132, p, 48)),
  buildTest('Adapter Callback', 133, 'DeFi', (p) => buildGeneric(133, p, 48)),
  buildTest('Private Swap', 134, 'DeFi', (p) => buildGeneric(134, p, 64)),
  buildTest('Private Stake', 135, 'DeFi', (p) => buildGeneric(135, p, 48)),
  buildTest('Private Unstake', 136, 'DeFi', (p) => buildGeneric(136, p, 48)),
  buildTest('Private LP Add', 137, 'DeFi', (p) => buildGeneric(137, p, 64)),
  buildTest('Private LP Remove', 138, 'DeFi', (p) => buildGeneric(138, p, 48)),
  buildTest('Pool Create', 139, 'DeFi', (p) => buildGeneric(139, p, 48)),
  buildTest('Pool Deposit', 140, 'DeFi', (p) => buildGeneric(140, p, 48)),
  buildTest('Pool Withdraw', 141, 'DeFi', (p) => buildGeneric(141, p, 48)),
  buildTest('Pool Donate', 142, 'DeFi', (p) => buildGeneric(142, p, 48)),
  
  // Yield
  buildTest('Yield Vault Create', 143, 'Yield', (p) => buildGeneric(143, p, 48)),
  buildTest('Yield Deposit', 144, 'Yield', (p) => buildGeneric(144, p, 48)),
  buildTest('Yield Claim', 145, 'Yield', (p) => buildGeneric(145, p, 32)),
  buildTest('Yield Withdraw', 146, 'Yield', (p) => buildGeneric(146, p, 48)),
  
  // Token Metadata
  buildTest('Token Create', 147, 'Metadata', (p) => buildGeneric(147, p, 64)),
  buildTest('Token Set Authority', 148, 'Metadata', (p) => buildGeneric(148, p, 32)),
  buildTest('Token Metadata Set', 149, 'Metadata', (p) => buildGeneric(149, p, 64)),
  buildTest('Token Metadata Update', 150, 'Metadata', (p) => buildGeneric(150, p, 48)),
  buildTest('Hook Execute Real', 151, 'Metadata', (p) => buildGeneric(151, p, 48)),
  buildTest('Confidential Transfer V2', 152, 'Metadata', (p) => buildGeneric(152, p, 64)),
  buildTest('Interest Claim Real', 153, 'Metadata', (p) => buildGeneric(153, p, 32)),
  buildTest('Royalty Claim Real', 154, 'Metadata', (p) => buildGeneric(154, p, 32)),
  buildTest('Batch Note Ops', 155, 'Metadata', (p) => buildGeneric(155, p, 64)),
  buildTest('Exchange Proof', 156, 'Metadata', (p) => buildGeneric(156, p, 48)),
  
  // Advanced Features
  buildTest('Selective Disclosure', 157, 'Advanced', (p) => buildGeneric(157, p, 48)),
  buildTest('Conditional Transfer', 158, 'Advanced', (p) => buildGeneric(158, p, 64)),
  buildTest('Delegation Chain', 159, 'Advanced', (p) => buildGeneric(159, p, 64)),
  buildTest('Time Locked Reveal', 160, 'Advanced', (p) => buildGeneric(160, p, 48)),
  buildTest('Cross Mint Atomic', 161, 'Advanced', (p) => buildGeneric(161, p, 64)),
  buildTest('Social Recovery', 162, 'Advanced', (p) => buildGeneric(162, p, 96)),
  buildTest('Jupiter Route', 163, 'Advanced', (p) => buildGeneric(163, p, 64)),
  buildTest('Marinade Stake', 164, 'Advanced', (p) => buildGeneric(164, p, 48)),
  buildTest('Drift Perp', 165, 'Advanced', (p) => buildGeneric(165, p, 48)),
  buildTest('Private Lending', 166, 'Advanced', (p) => buildGeneric(166, p, 48)),
  buildTest('Flash Loan', 167, 'Advanced', (p) => buildGeneric(167, p, 48)),
  buildTest('Oracle Bound', 168, 'Advanced', (p) => buildGeneric(168, p, 48)),
  buildTest('Velocity Limit', 169, 'Advanced', (p) => buildGeneric(169, p, 32)),
  buildTest('Governance Lock', 170, 'Advanced', (p) => buildGeneric(170, p, 48)),
  buildTest('Reputation Gate', 171, 'Advanced', (p) => buildGeneric(171, p, 32)),
  buildTest('Geo Restriction', 172, 'Advanced', (p) => buildGeneric(172, p, 32)),
  buildTest('Time Decay', 173, 'Advanced', (p) => buildGeneric(173, p, 32)),
  buildTest('Multi Sig Note', 174, 'Advanced', (p) => buildGeneric(174, p, 64)),
  buildTest('Recoverable Note', 175, 'Advanced', (p) => buildGeneric(175, p, 64)),
  
  // AMM & DEX
  buildTest('AMM Pool Create', 176, 'AMM', (p) => buildGeneric(176, p, 64)),
  buildTest('AMM Add Liquidity', 177, 'AMM', (p) => buildGeneric(177, p, 48)),
  buildTest('AMM Remove Liquidity', 178, 'AMM', (p) => buildGeneric(178, p, 48)),
  buildTest('AMM Swap', 179, 'AMM', (p) => buildGeneric(179, p, 48)),
  buildTest('AMM Quote', 180, 'AMM', (p) => buildGeneric(180, p, 32)),
  buildTest('AMM Sync', 181, 'AMM', (p) => buildGeneric(181, p, 32)),
  buildTest('LP Note Mint', 182, 'AMM', (p) => buildGeneric(182, p, 48)),
  buildTest('LP Note Burn', 183, 'AMM', (p) => buildGeneric(183, p, 48)),
  buildTest('Router Swap', 184, 'AMM', (p) => buildGeneric(184, p, 64)),
  buildTest('Router Split', 185, 'AMM', (p) => buildGeneric(185, p, 64)),
  buildTest('Limit Order Place', 186, 'AMM', (p) => buildGeneric(186, p, 48)),
  buildTest('Limit Order Fill', 187, 'AMM', (p) => buildGeneric(187, p, 48)),
  buildTest('Limit Order Cancel', 188, 'AMM', (p) => buildGeneric(188, p, 32)),
  buildTest('TWAP Order Start', 189, 'AMM', (p) => buildGeneric(189, p, 48)),
  buildTest('TWAP Order Fill', 190, 'AMM', (p) => buildGeneric(190, p, 48)),
  buildTest('Concentrated LP', 191, 'AMM', (p) => buildGeneric(191, p, 64)),
  
  // Provable Superiority
  buildTest('Nullifier Create', 192, 'Proof', (p) => buildGeneric(192, p, 32)),
  buildTest('Nullifier Check', 193, 'Proof', (p) => buildGeneric(193, p, 32)),
  buildTest('Merkle Root Publish', 194, 'Proof', (p) => buildGeneric(194, p, 32)),
  buildTest('Merkle Proof Verify', 195, 'Proof', (p) => buildGeneric(195, p, 64)),
  buildTest('Balance Attest', 196, 'Proof', (p) => buildGeneric(196, p, 48)),
  buildTest('Balance Verify', 197, 'Proof', (p) => buildGeneric(197, p, 48)),
  buildTest('Freeze Enforced', 198, 'Proof', (p) => buildGeneric(198, p, 32)),
  buildTest('Thaw Governed', 199, 'Proof', (p) => buildGeneric(199, p, 32)),
  buildTest('Wrapper Mint', 200, 'Proof', (p) => buildGeneric(200, p, 48)),
  buildTest('Wrapper Burn', 201, 'Proof', (p) => buildGeneric(201, p, 48)),
  buildTest('Validator Proof', 202, 'Proof', (p) => buildGeneric(202, p, 32)),
  buildTest('Security Audit', 203, 'Proof', (p) => buildGeneric(203, p, 48)),
  buildTest('Compliance Proof', 204, 'Proof', (p) => buildGeneric(204, p, 48)),
  buildTest('Decentralization Metric', 205, 'Proof', (p) => buildGeneric(205, p, 32)),
  buildTest('Atomic CPI Transfer', 206, 'Proof', (p) => buildGeneric(206, p, 64)),
  buildTest('Batch Nullifier', 207, 'Proof', (p) => buildGeneric(207, p, 64)),
];

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const connection = new Connection(DEVNET_RPC, 'confirmed');
  
  // Safety check
  const genesisHash = await connection.getGenesisHash();
  if (genesisHash === '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d') {
    console.error('🛑 SAFETY: Detected MAINNET. Aborting.');
    process.exit(1);
  }
  
  console.log('\n🔧 Setup...\n');
  
  const payer = loadTestWallet();
  const startBalance = await connection.getBalance(payer.publicKey);
  
  console.log(`✅ Connected to devnet`);
  console.log(`   Wallet: ${payer.publicKey.toString()}`);
  console.log(`   Balance: ${(startBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log(`   Tests: ${TESTS.length} instructions\n`);
  
  if (startBalance < 0.5 * LAMPORTS_PER_SOL) {
    console.error('❌ Need at least 0.5 SOL');
    process.exit(1);
  }
  
  const results = [];
  const transactions = [];
  
  for (let i = 0; i < TESTS.length; i++) {
    const test = TESTS[i];
    const progress = `[${i + 1}/${TESTS.length}]`;
    
    process.stdout.write(`${progress} TAG ${test.tag} ${test.name}... `);
    
    try {
      const ix = test.builder(payer);
      const tx = new Transaction().add(ix);
      const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
      
      console.log(`✅`);
      
      results.push({ ...test, pass: true, signature: sig });
      transactions.push({
        test: test.name,
        tag: test.tag,
        category: test.category,
        signature: sig,
        explorer: `https://explorer.solana.com/tx/${sig}?cluster=devnet`,
        status: 'SUCCESS'
      });
      
      await sleep(800);
    } catch (err) {
      console.log(`❌`);
      results.push({ ...test, pass: false, error: err.message?.slice(0, 80) });
      transactions.push({
        test: test.name,
        tag: test.tag,
        category: test.category,
        error: err.message?.slice(0, 80),
        status: 'FAILED'
      });
      await sleep(500);
    }
  }
  
  // Summary
  const endBalance = await connection.getBalance(payer.publicKey);
  const spent = (startBalance - endBalance) / LAMPORTS_PER_SOL;
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  
  console.log('\n' + '═'.repeat(80));
  console.log('📊 FULL PROGRAM TEST RESULTS');
  console.log('═'.repeat(80));
  
  // Group by category
  const categories = {};
  for (const r of results) {
    if (!categories[r.category]) categories[r.category] = { pass: 0, fail: 0, total: 0 };
    categories[r.category].total++;
    if (r.pass) categories[r.category].pass++;
    else categories[r.category].fail++;
  }
  
  for (const [cat, stats] of Object.entries(categories)) {
    const pct = ((stats.pass / stats.total) * 100).toFixed(0);
    const bar = '█'.repeat(Math.floor(stats.pass / stats.total * 20)) + '░'.repeat(20 - Math.floor(stats.pass / stats.total * 20));
    console.log(`${cat.padEnd(12)} ${bar} ${stats.pass}/${stats.total} (${pct}%)`);
  }
  
  console.log('\n' + '─'.repeat(80));
  console.log(`TOTAL: ${TESTS.length} | PASSED: ${passed} | FAILED: ${failed} | RATE: ${(passed/TESTS.length*100).toFixed(1)}%`);
  console.log('─'.repeat(80));
  
  console.log(`\n💰 Spent: ${spent.toFixed(4)} SOL | Balance: ${(endBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  
  // Save detailed log
  const logData = {
    timestamp: new Date().toISOString(),
    network: 'devnet',
    program: DEVNET_PMP_PROGRAM_ID.toString(),
    totalTests: TESTS.length,
    passed,
    failed,
    rate: `${(passed/TESTS.length*100).toFixed(1)}%`,
    spentSOL: spent,
    transactions
  };
  
  fs.writeFileSync('PMP_FULL_TEST_LOG.json', JSON.stringify(logData, null, 2));
  console.log('\n📝 Full log saved to PMP_FULL_TEST_LOG.json');
  
  // Generate markdown report
  const mdReport = generateMarkdownReport(results, transactions, passed, failed, spent);
  fs.writeFileSync('PMP_FULL_TEST_REPORT.md', mdReport);
  console.log('📝 Report saved to PMP_FULL_TEST_REPORT.md');
  
  console.log('\n✅ Safety: All tests on DEVNET - mainnet protected\n');
}

function generateMarkdownReport(results, transactions, passed, failed, spent) {
  let md = `# PMP Full Program Test Report

**Date:** ${new Date().toISOString()}  
**Network:** Solana Devnet  
**Program:** \`FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW\`

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${results.length} |
| Passed | ${passed} |
| Failed | ${failed} |
| Pass Rate | ${(passed/results.length*100).toFixed(1)}% |
| SOL Spent | ${spent.toFixed(4)} |

## Results by Category

`;
  
  const categories = {};
  for (const r of results) {
    if (!categories[r.category]) categories[r.category] = [];
    categories[r.category].push(r);
  }
  
  for (const [cat, items] of Object.entries(categories)) {
    const catPassed = items.filter(i => i.pass).length;
    md += `### ${cat} (${catPassed}/${items.length})\n\n`;
    md += `| TAG | Instruction | Status | Transaction |\n`;
    md += `|-----|-------------|--------|-------------|\n`;
    
    for (const item of items) {
      const status = item.pass ? '✅' : '❌';
      const link = item.signature ? `[View](https://explorer.solana.com/tx/${item.signature}?cluster=devnet)` : 'N/A';
      md += `| ${item.tag} | ${item.name} | ${status} | ${link} |\n`;
    }
    md += '\n';
  }
  
  md += `\n---\n\n*Generated by PMP Full Program Test Suite*\n`;
  
  return md;
}

main().catch(console.error);
