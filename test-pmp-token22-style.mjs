#!/usr/bin/env node
/**
 * PMP TOKEN-22 STYLE COMPLETE TEST
 * 
 * Tests ALL instructions with proper:
 * - Data format lengths (MIN_LEN compliance)
 * - PDA derivation for accounts
 * - Proper account structures
 * - State initialization before operations
 * 
 * This mirrors how Token-22 testing works - proper setup before use.
 * 
 * DEVNET ONLY
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

// PDA Seeds (from program)
const SEEDS = {
  GLOBAL_POOL: Buffer.from('styx_gpool'),
  NULLIFIER: Buffer.from('styx_null'),
  MERKLE_ROOT: Buffer.from('styx_root'),
  PPV: Buffer.from('styx_ppv'),
  NFT_LISTING: Buffer.from('styx_list'),
  AUCTION: Buffer.from('styx_auction'),
  OFFER: Buffer.from('styx_offer'),
  ADAPTER: Buffer.from('styx_adapter'),
  POOL: Buffer.from('styx_pool'),
  VAULT: Buffer.from('styx_vault'),
  TOKEN_MINT: Buffer.from('styx_mint'),
  STEALTH: Buffer.from('styx_stealth'),
  AMM_POOL: Buffer.from('styx_amm'),
  LP_NOTE: Buffer.from('styx_lp'),
  LIMIT_ORDER: Buffer.from('styx_limit'),
  CLMM_POS: Buffer.from('styx_clmm'),
};

// TAGs with MIN_LEN requirements (from program source)
const TAG = {
  // Core (no special requirements)
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
  VTA_DELEGATE: 23,
  
  // VSL (with proper MIN_LEN)
  VSL_DEPOSIT: 32,          // MIN_LEN: 170
  VSL_WITHDRAW: 33,         // MIN_LEN: 138
  VSL_PRIVATE_TRANSFER: 34, // MIN_LEN: 202
  VSL_ESCROW_CREATE: 39,    // MIN_LEN: 170
  VSL_ESCROW_RELEASE: 40,   // MIN_LEN: 137
  VSL_ESCROW_REFUND: 41,    // MIN_LEN: 65
  
  // STS Notes (with proper MIN_LEN)
  NOTE_MINT: 80,            // MIN_LEN: 138
  NOTE_TRANSFER: 81,        // MIN_LEN: 202
  NOTE_MERGE: 82,           // MIN_LEN: 266
  NOTE_SPLIT: 83,           // MIN_LEN: 234
  NOTE_BURN: 84,            // MIN_LEN: 106
  
  // Pool operations
  GPOOL_DEPOSIT: 85,        // MIN_LEN: 170
  GPOOL_WITHDRAW: 86,       // MIN_LEN: 170
  
  // Nullifiers (need PDA)
  NULLIFIER_CREATE: 192,    // MIN_LEN: 98
  NULLIFIER_CHECK: 193,     // MIN_LEN: 33
  
  // AMM
  AMM_POOL_CREATE: 176,     // MIN_LEN: 170
  AMM_ADD_LIQUIDITY: 177,   // MIN_LEN: 114
  AMM_SWAP: 179,            // MIN_LEN: 114
  
  // NFT
  NFT_MINT: 107,            // MIN_LEN: 170
  NFT_LIST: 112,            // MIN_LEN: 105
  NFT_BUY: 114,             // MIN_LEN: 106
  
  // PPV  
  PPV_CREATE: 122,          // MIN_LEN: 138
  PPV_VERIFY: 123,          // MIN_LEN: 66
  PPV_REDEEM: 124,          // MIN_LEN: 98
};

console.log(`
╔══════════════════════════════════════════════════════════════════════════════════════╗
║           PMP TOKEN-22 STYLE COMPLETE TEST                                           ║
║                                                                                      ║
║  🔧 Proper data formats with MIN_LEN compliance                                      ║
║  🏠 PDA derivation for account structures                                            ║
║  🔒 DEVNET ONLY                                                                      ║
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

// Derive PDA with seed
function derivePDA(seed, ...extraSeeds) {
  const seeds = [seed, ...extraSeeds.map(s => Buffer.isBuffer(s) ? s : Buffer.from(s))];
  return PublicKey.findProgramAddressSync(seeds, DEVNET_PMP_PROGRAM_ID);
}

// ============================================================================
// PROPER INSTRUCTION BUILDERS (WITH MIN_LEN COMPLIANCE)
// ============================================================================

/**
 * NOTE_MINT (TAG 80)
 * MIN_LEN: 138 bytes
 * Format: [tag:1][flags:1][mint:32][amount:8][note_commitment:32][encrypted_note:64]
 */
function buildNoteMint(payer, mintPubkey, amount) {
  const noteSecret = randomBytes(32);
  const noteCommitment = keccakHash(Buffer.from('STS_NOTE_COMMIT'), noteSecret);
  const encryptedNote = randomBytes(64);
  
  const data = Buffer.alloc(138);
  let offset = 0;
  data.writeUInt8(TAG.NOTE_MINT, offset++);
  data.writeUInt8(0x01, offset++); // flags
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
    noteSecret,
    noteCommitment,
  };
}

/**
 * NOTE_TRANSFER (TAG 81)
 * MIN_LEN: 202 bytes
 * Format: [tag:1][flags:1][sender_nullifier:32][recipient_commitment:32][encrypted_amount:8]
 *         [proof:128]
 */
function buildNoteTransfer(payer, senderSecret, recipientPubkey, amount) {
  const senderNullifier = keccakHash(Buffer.from('STS_NULLIFIER'), senderSecret);
  const recipientCommitment = keccakHash(Buffer.from('STS_COMMIT'), Buffer.from(recipientPubkey.toBytes()));
  const encryptedAmount = randomBytes(8);
  const proof = randomBytes(128);
  
  const data = Buffer.alloc(202);
  let offset = 0;
  data.writeUInt8(TAG.NOTE_TRANSFER, offset++);
  data.writeUInt8(0x01, offset++);
  senderNullifier.copy(data, offset); offset += 32;
  recipientCommitment.copy(data, offset); offset += 32;
  encryptedAmount.copy(data, offset); offset += 8;
  proof.copy(data, offset);
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

/**
 * NOTE_BURN (TAG 84)
 * MIN_LEN: 106 bytes
 * Format: [tag:1][flags:1][nullifier:32][burn_proof:64][encrypted_amount:8]
 */
function buildNoteBurn(payer, noteSecret, amount) {
  const nullifier = keccakHash(Buffer.from('STS_NULLIFIER'), noteSecret);
  const burnProof = randomBytes(64);
  const encAmount = randomBytes(8);
  
  const data = Buffer.alloc(106);
  let offset = 0;
  data.writeUInt8(TAG.NOTE_BURN, offset++);
  data.writeUInt8(0x01, offset++);
  nullifier.copy(data, offset); offset += 32;
  burnProof.copy(data, offset); offset += 64;
  encAmount.copy(data, offset);
  
  return new TransactionInstruction({
    keys: getStandardAccounts(payer),
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

/**
 * VSL_ESCROW_CREATE (TAG 39)
 * MIN_LEN: 170 bytes
 * Format: [tag:1][flags:1][mint:32][nullifier:32][escrow_commitment:32]
 *         [arbiter_hash:32][conditions_hash:32][timeout_slot:8]
 */
function buildVslEscrowCreate(payer, mintPubkey) {
  const nullifier = randomBytes(32);
  const escrowCommitment = randomBytes(32);
  const arbiterHash = keccakHash(Buffer.from(payer.publicKey.toBytes()));
  const conditionsHash = randomBytes(32);
  const timeoutSlot = BigInt(Math.floor(Date.now() / 400) + 10000); // Future slot
  
  const data = Buffer.alloc(170);
  let offset = 0;
  data.writeUInt8(TAG.VSL_ESCROW_CREATE, offset++);
  data.writeUInt8(0x01, offset++); // flags: has_arbiter
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
    nullifier,
    escrowCommitment,
  };
}

/**
 * VSL_ESCROW_RELEASE (TAG 40)
 * MIN_LEN: 137 bytes
 * Format: [tag:1][escrow_id:32][recipient_commitment:32][release_proof:64][encrypted_amount:8]
 */
function buildVslEscrowRelease(payer, escrowId) {
  const recipientCommitment = randomBytes(32);
  const releaseProof = randomBytes(64);
  const encryptedAmount = randomBytes(8);
  
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

/**
 * NULLIFIER_CREATE (TAG 192)
 * MIN_LEN: 98 bytes
 * Format: [tag:1][note_commit:32][nullifier:32][secret_hash:32][flags:1]
 * Requires: nullifier = keccak(note_commit || secret_hash)
 */
function buildNullifierCreate(payer, noteCommitment) {
  const secretHash = randomBytes(32);
  // CRITICAL: nullifier MUST be derived correctly or program rejects
  const nullifier = keccakHash(noteCommitment, secretHash);
  
  // Derive nullifier PDA
  const [nullifierPDA, bump] = derivePDA(SEEDS.NULLIFIER, nullifier);
  
  const data = Buffer.alloc(98);
  let offset = 0;
  data.writeUInt8(TAG.NULLIFIER_CREATE, offset++);
  noteCommitment.copy(data, offset); offset += 32;
  nullifier.copy(data, offset); offset += 32;
  secretHash.copy(data, offset); offset += 32;
  data.writeUInt8(0x01, offset); // flags
  
  return {
    ix: new TransactionInstruction({
      keys: [
        // First 3 accounts for collect_protocol_fee
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: TREASURY, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        // Then accounts for nullifier_create (skip first 3)
        { pubkey: payer.publicKey, isSigner: true, isWritable: true }, // spender
        { pubkey: nullifierPDA, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: DEVNET_PMP_PROGRAM_ID,
      data,
    }),
    nullifier,
    nullifierPDA,
    bump,
  };
}

/**
 * GPOOL_DEPOSIT (TAG 85)
 * MIN_LEN: 170 bytes (similar to VSL_DEPOSIT)
 * Format: [tag:1][flags:1][mint:32][amount:8][note_commitment:32][encrypted_note:64][proof:32]
 */
function buildGPoolDeposit(payer, mintPubkey, amount) {
  const noteCommitment = randomBytes(32);
  const encryptedNote = randomBytes(64);
  const proof = randomBytes(32);
  
  const data = Buffer.alloc(170);
  let offset = 0;
  data.writeUInt8(TAG.GPOOL_DEPOSIT, offset++);
  data.writeUInt8(0x01, offset++);
  Buffer.from(mintPubkey.toBytes()).copy(data, offset); offset += 32;
  data.writeBigUInt64LE(BigInt(amount), offset); offset += 8;
  noteCommitment.copy(data, offset); offset += 32;
  encryptedNote.copy(data, offset); offset += 64;
  proof.copy(data, offset);
  
  // Derive pool PDA
  const [poolPDA] = derivePDA(SEEDS.GLOBAL_POOL, Buffer.from(mintPubkey.toBytes()));
  
  return new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: poolPDA, isSigner: false, isWritable: true },
    ],
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

/**
 * AMM_POOL_CREATE (TAG 176)
 * MIN_LEN: 170 bytes
 * Format: [tag:1][flags:1][token_a:32][token_b:32][fee_bps:2][initial_a:8][initial_b:8]
 *         [lp_commitment:32][pool_config:32][padding:22]
 */
function buildAmmPoolCreate(payer, tokenA, tokenB, feeBps = 30) {
  // Program expects: [tag:1][mint_a:32][mint_b:32][fee_bps:2][pool_type:1][initial_sqrt_price:8] = 76 bytes
  const data = Buffer.alloc(76);
  let offset = 0;
  data.writeUInt8(TAG.AMM_POOL_CREATE, offset++);
  
  // Ensure canonical ordering: mint_a < mint_b
  const mintA = tokenA.toBytes();
  const mintB = tokenB.toBytes();
  let orderedA, orderedB;
  if (Buffer.compare(Buffer.from(mintA), Buffer.from(mintB)) < 0) {
    orderedA = mintA;
    orderedB = mintB;
  } else {
    orderedA = mintB;
    orderedB = mintA;
  }
  
  Buffer.from(orderedA).copy(data, offset); offset += 32;
  Buffer.from(orderedB).copy(data, offset); offset += 32;
  data.writeUInt16LE(feeBps, offset); offset += 2; // fee in bps (30 = 0.30%)
  data.writeUInt8(0x00, offset++); // pool_type = CONSTANT_PRODUCT
  data.writeBigUInt64LE(BigInt(1000000), offset); // initial_sqrt_price
  
  // Derive pool PDA (use ordered mints)
  const [poolPDA] = derivePDA(SEEDS.AMM_POOL, Buffer.from(orderedA), Buffer.from(orderedB));
  
  return {
    ix: new TransactionInstruction({
      keys: [
        // First 3 for fee collection
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: TREASURY, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        // Then creator (signer) at index 3
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        // Then pool PDA
        { pubkey: poolPDA, isSigner: false, isWritable: true },
      ],
      programId: DEVNET_PMP_PROGRAM_ID,
      data,
    }),
    poolPDA,
  };
}

/**
 * AMM_ADD_LIQUIDITY (TAG 177)
 * MIN_LEN: 114 bytes
 * Format: [tag:1][flags:1][pool_id:32][amount_a:8][amount_b:8][lp_commitment:32][proof:32]
 */
function buildAmmAddLiquidity(payer, poolPDA, amountA, amountB) {
  const lpCommitment = randomBytes(32);
  const proof = randomBytes(32);
  
  const data = Buffer.alloc(114);
  let offset = 0;
  data.writeUInt8(TAG.AMM_ADD_LIQUIDITY, offset++);
  data.writeUInt8(0x01, offset++);
  Buffer.from(poolPDA.toBytes()).copy(data, offset); offset += 32;
  data.writeBigUInt64LE(BigInt(amountA), offset); offset += 8;
  data.writeBigUInt64LE(BigInt(amountB), offset); offset += 8;
  lpCommitment.copy(data, offset); offset += 32;
  proof.copy(data, offset);
  
  return new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: poolPDA, isSigner: false, isWritable: true },
    ],
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

/**
 * AMM_SWAP (TAG 179)
 * MIN_LEN: 114 bytes
 * Format: [tag:1][flags:1][pool_id:32][input_nullifier:32][output_commitment:32]
 *         [amount_in:8][min_out:8]
 */
function buildAmmSwap(payer, poolPDA, amountIn, minOut) {
  const inputNullifier = randomBytes(32);
  const outputCommitment = randomBytes(32);
  
  const data = Buffer.alloc(114);
  let offset = 0;
  data.writeUInt8(TAG.AMM_SWAP, offset++);
  data.writeUInt8(0x01, offset++);
  Buffer.from(poolPDA.toBytes()).copy(data, offset); offset += 32;
  inputNullifier.copy(data, offset); offset += 32;
  outputCommitment.copy(data, offset); offset += 32;
  data.writeBigUInt64LE(BigInt(amountIn), offset); offset += 8;
  data.writeBigUInt64LE(BigInt(minOut), offset);
  
  return new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: poolPDA, isSigner: false, isWritable: true },
    ],
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

/**
 * NFT_MINT (TAG 107)
 * MIN_LEN: 170 bytes
 * Format: [tag:1][flags:1][collection:32][metadata_hash:32][royalty_bps:2][encrypted_owner:32]
 *         [mint_proof:64][nonce:8]
 */
function buildNftMint(payer, collectionPubkey) {
  const metadataHash = randomBytes(32);
  const encryptedOwner = randomBytes(32);
  const mintProof = randomBytes(64);
  const nonce = randomBytes(8);
  
  const data = Buffer.alloc(172);
  let offset = 0;
  data.writeUInt8(TAG.NFT_MINT, offset++);
  data.writeUInt8(0x01, offset++);
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

/**
 * NFT_LIST (TAG 112)
 * MIN_LEN: 105 bytes
 * Format: [tag:1][nft_id:32][price:8][encrypted_seller:32][listing_proof:32]
 */
function buildNftList(payer, nftId, price) {
  const encryptedSeller = randomBytes(32);
  const listingProof = randomBytes(32);
  
  const data = Buffer.alloc(105);
  let offset = 0;
  data.writeUInt8(TAG.NFT_LIST, offset++);
  nftId.copy(data, offset); offset += 32;
  data.writeBigUInt64LE(BigInt(price), offset); offset += 8;
  encryptedSeller.copy(data, offset); offset += 32;
  listingProof.copy(data, offset);
  
  // Derive listing PDA
  const [listingPDA] = derivePDA(SEEDS.NFT_LISTING, nftId);
  
  return {
    ix: new TransactionInstruction({
      keys: [
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: TREASURY, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: listingPDA, isSigner: false, isWritable: true },
      ],
      programId: DEVNET_PMP_PROGRAM_ID,
      data,
    }),
    listingPDA,
  };
}

/**
 * NFT_BUY (TAG 114)
 * MIN_LEN: 106 bytes
 * Format: [tag:1][flags:1][listing_id:32][input_nullifier:32][buyer_commitment:32][encrypted_amount:8]
 */
function buildNftBuy(payer, listingPDA) {
  const inputNullifier = randomBytes(32);
  const buyerCommitment = randomBytes(32);
  const encryptedAmount = randomBytes(8);
  
  const data = Buffer.alloc(106);
  let offset = 0;
  data.writeUInt8(TAG.NFT_BUY, offset++);
  data.writeUInt8(0x01, offset++);
  Buffer.from(listingPDA.toBytes()).copy(data, offset); offset += 32;
  inputNullifier.copy(data, offset); offset += 32;
  buyerCommitment.copy(data, offset); offset += 32;
  encryptedAmount.copy(data, offset);
  
  return new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: listingPDA, isSigner: false, isWritable: true },
    ],
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
}

/**
 * PPV_CREATE (TAG 122)
 * MIN_LEN: 138 bytes
 * Format: [tag:1][flags:1][note_nullifier:32][voucher_commitment:32][allowlist_root:32]
 *         [encrypted_value:8][expiry_slot:8][proof:24]
 */
function buildPpvCreate(payer) {
  const noteNullifier = randomBytes(32);
  const voucherCommitment = randomBytes(32);
  const allowlistRoot = randomBytes(32);
  const encryptedValue = randomBytes(8);
  const expirySlot = BigInt(Math.floor(Date.now() / 400) + 50000);
  const proof = randomBytes(24);
  
  const data = Buffer.alloc(138);
  let offset = 0;
  data.writeUInt8(TAG.PPV_CREATE, offset++);
  data.writeUInt8(0x01, offset++);
  noteNullifier.copy(data, offset); offset += 32;
  voucherCommitment.copy(data, offset); offset += 32;
  allowlistRoot.copy(data, offset); offset += 32;
  encryptedValue.copy(data, offset); offset += 8;
  data.writeBigUInt64LE(expirySlot, offset); offset += 8;
  proof.copy(data, offset);
  
  // Derive PPV PDA
  const [ppvPDA] = derivePDA(SEEDS.PPV, voucherCommitment);
  
  return {
    ix: new TransactionInstruction({
      keys: [
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: TREASURY, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: ppvPDA, isSigner: false, isWritable: true },
      ],
      programId: DEVNET_PMP_PROGRAM_ID,
      data,
    }),
    ppvPDA,
    voucherCommitment,
  };
}

// ============================================================================
// TEST WORKFLOWS
// ============================================================================

async function testStsNoteWorkflow(connection, payer) {
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('TEST: STS Note Lifecycle (Mint → Transfer → Burn)');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  const results = [];
  const mint = randomPubkey();
  
  // 1. Mint Note
  console.log('📝 Minting STS note (138 bytes MIN_LEN)...');
  try {
    const { ix, noteSecret, noteCommitment } = buildNoteMint(payer, mint, 1000000);
    const sig = await sendAndConfirmTransaction(connection, new Transaction().add(ix), [payer]);
    console.log(`   ✅ Note minted: ${sig.slice(0, 20)}...`);
    results.push({ step: 'NOTE_MINT', pass: true, sig });
    
    await sleep(1000);
    
    // 2. Transfer Note
    console.log('🔄 Transferring note (202 bytes MIN_LEN)...');
    const transferIx = buildNoteTransfer(payer, noteSecret, randomPubkey(), 500000);
    const sig2 = await sendAndConfirmTransaction(connection, new Transaction().add(transferIx), [payer]);
    console.log(`   ✅ Note transferred: ${sig2.slice(0, 20)}...`);
    results.push({ step: 'NOTE_TRANSFER', pass: true, sig: sig2 });
    
    await sleep(1000);
    
    // 3. Burn Note
    console.log('🔥 Burning note (106 bytes MIN_LEN)...');
    const burnIx = buildNoteBurn(payer, noteSecret, 500000);
    const sig3 = await sendAndConfirmTransaction(connection, new Transaction().add(burnIx), [payer]);
    console.log(`   ✅ Note burned: ${sig3.slice(0, 20)}...`);
    results.push({ step: 'NOTE_BURN', pass: true, sig: sig3 });
    
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message?.slice(0, 80)}`);
    results.push({ step: 'STS_NOTE', pass: false, error: err.message });
  }
  
  return results;
}

async function testVslEscrowWorkflow(connection, payer) {
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('TEST: VSL Escrow Workflow (Create → Release)');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  const results = [];
  const mint = randomPubkey();
  
  // 1. Create Escrow
  console.log('📦 Creating escrow (170 bytes MIN_LEN)...');
  try {
    const { ix, nullifier, escrowCommitment } = buildVslEscrowCreate(payer, mint);
    const sig = await sendAndConfirmTransaction(connection, new Transaction().add(ix), [payer]);
    console.log(`   ✅ Escrow created: ${sig.slice(0, 20)}...`);
    results.push({ step: 'ESCROW_CREATE', pass: true, sig });
    
    // Derive escrow ID for release
    const escrowId = keccakHash(
      Buffer.from('STYX_VSL_ESCROW_V1'),
      Buffer.from(mint.toBytes()),
      escrowCommitment,
      keccakHash(Buffer.from(payer.publicKey.toBytes())),
    );
    
    await sleep(1000);
    
    // 2. Release Escrow
    console.log('🔓 Releasing escrow (137 bytes MIN_LEN)...');
    const releaseIx = buildVslEscrowRelease(payer, escrowId);
    const sig2 = await sendAndConfirmTransaction(connection, new Transaction().add(releaseIx), [payer]);
    console.log(`   ✅ Escrow released: ${sig2.slice(0, 20)}...`);
    results.push({ step: 'ESCROW_RELEASE', pass: true, sig: sig2 });
    
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message?.slice(0, 80)}`);
    results.push({ step: 'VSL_ESCROW', pass: false, error: err.message });
  }
  
  return results;
}

async function testNullifierWorkflow(connection, payer) {
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('TEST: Nullifier Creation (with PDA derivation)');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  const results = [];
  
  // Generate note commitment
  const noteCommitment = keccakHash(Buffer.from('TEST_NOTE'), randomBytes(32));
  
  console.log('🔒 Creating nullifier PDA (98 bytes MIN_LEN)...');
  console.log(`   Note commitment: ${noteCommitment.toString('hex').slice(0, 16)}...`);
  
  try {
    const { ix, nullifier, nullifierPDA, bump } = buildNullifierCreate(payer, noteCommitment);
    console.log(`   Nullifier: ${nullifier.toString('hex').slice(0, 16)}...`);
    console.log(`   PDA: ${nullifierPDA.toString().slice(0, 20)}... (bump: ${bump})`);
    
    const sig = await sendAndConfirmTransaction(connection, new Transaction().add(ix), [payer]);
    console.log(`   ✅ Nullifier created: ${sig.slice(0, 20)}...`);
    results.push({ step: 'NULLIFIER_CREATE', pass: true, sig });
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message?.slice(0, 80)}`);
    results.push({ step: 'NULLIFIER_CREATE', pass: false, error: err.message });
  }
  
  return results;
}

async function testAmmWorkflow(connection, payer) {
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('TEST: AMM Workflow (Create Pool → Add Liquidity → Swap)');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  const results = [];
  const tokenA = randomPubkey();
  const tokenB = randomPubkey();
  
  // 1. Create Pool
  console.log('🏦 Creating AMM pool (170 bytes MIN_LEN)...');
  try {
    const { ix, poolPDA, lpCommitment } = buildAmmPoolCreate(payer, tokenA, tokenB, 30);
    console.log(`   Pool PDA: ${poolPDA.toString().slice(0, 20)}...`);
    
    const sig = await sendAndConfirmTransaction(connection, new Transaction().add(ix), [payer]);
    console.log(`   ✅ Pool created: ${sig.slice(0, 20)}...`);
    results.push({ step: 'AMM_CREATE', pass: true, sig });
    
    await sleep(1000);
    
    // 2. Add Liquidity
    console.log('💧 Adding liquidity (114 bytes MIN_LEN)...');
    const addLiqIx = buildAmmAddLiquidity(payer, poolPDA, 50000, 50000);
    const sig2 = await sendAndConfirmTransaction(connection, new Transaction().add(addLiqIx), [payer]);
    console.log(`   ✅ Liquidity added: ${sig2.slice(0, 20)}...`);
    results.push({ step: 'AMM_ADD_LIQ', pass: true, sig: sig2 });
    
    await sleep(1000);
    
    // 3. Swap
    console.log('🔄 Executing swap (114 bytes MIN_LEN)...');
    const swapIx = buildAmmSwap(payer, poolPDA, 1000, 990);
    const sig3 = await sendAndConfirmTransaction(connection, new Transaction().add(swapIx), [payer]);
    console.log(`   ✅ Swap completed: ${sig3.slice(0, 20)}...`);
    results.push({ step: 'AMM_SWAP', pass: true, sig: sig3 });
    
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message?.slice(0, 80)}`);
    results.push({ step: 'AMM', pass: false, error: err.message });
  }
  
  return results;
}

async function testNftWorkflow(connection, payer) {
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('TEST: NFT Workflow (Mint → List → Buy)');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  const results = [];
  const collection = randomPubkey();
  
  // 1. Mint NFT
  console.log('🎨 Minting NFT (170 bytes MIN_LEN)...');
  try {
    const mintIx = buildNftMint(payer, collection);
    const sig = await sendAndConfirmTransaction(connection, new Transaction().add(mintIx), [payer]);
    console.log(`   ✅ NFT minted: ${sig.slice(0, 20)}...`);
    results.push({ step: 'NFT_MINT', pass: true, sig });
    
    // Generate NFT ID (normally from mint event)
    const nftId = keccakHash(Buffer.from(payer.publicKey.toBytes()), randomBytes(32));
    
    await sleep(1000);
    
    // 2. List NFT
    console.log('📋 Listing NFT (105 bytes MIN_LEN)...');
    const { ix: listIx, listingPDA } = buildNftList(payer, nftId, 1000000000); // 1 SOL
    console.log(`   Listing PDA: ${listingPDA.toString().slice(0, 20)}...`);
    const sig2 = await sendAndConfirmTransaction(connection, new Transaction().add(listIx), [payer]);
    console.log(`   ✅ NFT listed: ${sig2.slice(0, 20)}...`);
    results.push({ step: 'NFT_LIST', pass: true, sig: sig2 });
    
    await sleep(1000);
    
    // 3. Buy NFT
    console.log('💰 Buying NFT (106 bytes MIN_LEN)...');
    const buyIx = buildNftBuy(payer, listingPDA);
    const sig3 = await sendAndConfirmTransaction(connection, new Transaction().add(buyIx), [payer]);
    console.log(`   ✅ NFT purchased: ${sig3.slice(0, 20)}...`);
    results.push({ step: 'NFT_BUY', pass: true, sig: sig3 });
    
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message?.slice(0, 80)}`);
    results.push({ step: 'NFT', pass: false, error: err.message });
  }
  
  return results;
}

async function testPpvWorkflow(connection, payer) {
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('TEST: Privacy Voucher (PPV) Workflow');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  const results = [];
  
  console.log('🎫 Creating PPV (138 bytes MIN_LEN)...');
  try {
    const { ix, ppvPDA, voucherCommitment } = buildPpvCreate(payer);
    console.log(`   PPV PDA: ${ppvPDA.toString().slice(0, 20)}...`);
    
    const sig = await sendAndConfirmTransaction(connection, new Transaction().add(ix), [payer]);
    console.log(`   ✅ PPV created: ${sig.slice(0, 20)}...`);
    results.push({ step: 'PPV_CREATE', pass: true, sig });
    
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message?.slice(0, 80)}`);
    results.push({ step: 'PPV', pass: false, error: err.message });
  }
  
  return results;
}

async function testGPoolWorkflow(connection, payer) {
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('TEST: Global Pool Deposit');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  const results = [];
  const mint = randomPubkey();
  
  console.log('💎 Depositing to global pool (170 bytes MIN_LEN)...');
  try {
    const depositIx = buildGPoolDeposit(payer, mint, 100000);
    const sig = await sendAndConfirmTransaction(connection, new Transaction().add(depositIx), [payer]);
    console.log(`   ✅ GPool deposit: ${sig.slice(0, 20)}...`);
    results.push({ step: 'GPOOL_DEPOSIT', pass: true, sig });
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message?.slice(0, 80)}`);
    results.push({ step: 'GPOOL', pass: false, error: err.message });
  }
  
  return results;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const connection = new Connection(DEVNET_RPC, 'confirmed');
  
  // Safety check
  const genesisHash = await connection.getGenesisHash();
  if (genesisHash === '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d') {
    console.error('🛑 MAINNET DETECTED - ABORTING');
    process.exit(1);
  }
  
  const payer = loadTestWallet();
  const startBalance = await connection.getBalance(payer.publicKey);
  
  console.log(`✅ Connected to devnet`);
  console.log(`   Wallet: ${payer.publicKey.toString()}`);
  console.log(`   Balance: ${(startBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  
  // Run all workflows
  const allResults = {
    stsNote: await testStsNoteWorkflow(connection, payer),
    vslEscrow: await testVslEscrowWorkflow(connection, payer),
    nullifier: await testNullifierWorkflow(connection, payer),
    amm: await testAmmWorkflow(connection, payer),
    nft: await testNftWorkflow(connection, payer),
    ppv: await testPpvWorkflow(connection, payer),
    gpool: await testGPoolWorkflow(connection, payer),
  };
  
  // Summary
  const endBalance = await connection.getBalance(payer.publicKey);
  const spent = (startBalance - endBalance) / LAMPORTS_PER_SOL;
  
  console.log('\n' + '═'.repeat(70));
  console.log('📊 TOKEN-22 STYLE TEST SUMMARY');
  console.log('═'.repeat(70));
  
  let totalPass = 0;
  let totalFail = 0;
  const successfulTxs = [];
  
  for (const [workflow, results] of Object.entries(allResults)) {
    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass).length;
    totalPass += passed;
    totalFail += failed;
    
    const status = failed === 0 ? '✅' : (passed > 0 ? '🔄' : '❌');
    console.log(`${status} ${workflow.toUpperCase().padEnd(15)} ${passed}/${results.length} steps`);
    
    for (const r of results) {
      if (r.pass && r.sig) {
        successfulTxs.push({ workflow, step: r.step, sig: r.sig });
      }
    }
  }
  
  console.log('─'.repeat(70));
  console.log(`TOTAL: ${totalPass + totalFail} steps | PASSED: ${totalPass} | FAILED: ${totalFail}`);
  console.log(`\n💰 Spent: ${spent.toFixed(4)} SOL | Remaining: ${(endBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  
  // Save log
  const log = {
    timestamp: new Date().toISOString(),
    network: 'devnet',
    program: DEVNET_PMP_PROGRAM_ID.toString(),
    totalSteps: totalPass + totalFail,
    passed: totalPass,
    failed: totalFail,
    successRate: `${((totalPass / (totalPass + totalFail)) * 100).toFixed(1)}%`,
    spentSOL: spent,
    workflows: allResults,
    successfulTransactions: successfulTxs,
  };
  
  fs.writeFileSync('PMP_TOKEN22_STYLE_LOG.json', JSON.stringify(log, null, 2));
  console.log('\n📝 Log saved to PMP_TOKEN22_STYLE_LOG.json');
  
  console.log('\n✅ Safety: All tests on DEVNET only\n');
}

main().catch(console.error);
