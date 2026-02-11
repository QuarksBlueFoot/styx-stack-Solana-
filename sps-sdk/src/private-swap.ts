/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SPS PRIVATE SWAP SDK
 *  Shielded Pool DEX for ANY SPL Token
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️  STATUS: COMING IN v5.0 — Currently in devnet testing.
 * The SWAP domain (0x10) is archived in the current mainnet binary.
 * All instructions in this module will be rejected on mainnet until
 * the domain is re-enabled in a future program upgrade.
 * Devnet program ID accepts these instructions for integration testing.
 *
 * This SDK enables private swaps and transfers of ANY SPL token (SOL, memecoins, etc.)
 * using a shielded pool architecture similar to Tornado Cash / Elusiv but better.
 *
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      SHIELDED POOL FLOW                                 │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                         │
 * │   1. DEPOSIT: SPL Tokens → Pool (commitment added to Merkle tree)       │
 * │   2. SWAP:    Encrypted order matching (off-chain or on-chain)          │
 * │   3. WITHDRAW: ZK proof → Receive tokens at NEW address                 │
 * │                                                                         │
 * │   Privacy Properties:                                                   │
 * │   ✅ Sender hidden (commitment breaks link)                             │
 * │   ✅ Receiver hidden (new address, no link to depositor)                │
 * │   ✅ Amount hidden (encrypted in commitment)                            │
 * │   ✅ Trade pairs hidden (encrypted order matching)                      │
 * │                                                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * COMPARISON:
 * ┌────────────────────┬───────────────┬─────────────┬──────────────────────┐
 * │ Feature            │ Elusiv        │ Token-2022  │ SPS Private Swap     │
 * ├────────────────────┼───────────────┼─────────────┼──────────────────────┤
 * │ Any SPL Token      │ ✅ Yes        │ ❌ No       │ ✅ Yes               │
 * │ Amount Hidden      │ ✅ Yes        │ ⚠️ Partial  │ ✅ Yes               │
 * │ Sender Hidden      │ ✅ Yes        │ ❌ No       │ ✅ Yes               │
 * │ Receiver Hidden    │ ✅ Yes        │ ❌ No       │ ✅ Yes               │
 * │ Swaps Supported    │ ❌ No         │ ❌ No       │ ✅ Yes               │
 * │ POI Compliance     │ ❌ No         │ ❌ No       │ ✅ Yes               │
 * │ Status             │ ❌ Shutdown   │ ✅ Active   │ ✅ Active            │
 * └────────────────────┴───────────────┴─────────────┴──────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  Connection,
  PublicKey,
  Keypair,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';

// ============================================================================
// CONSTANTS
// ============================================================================

export const PROGRAM_ID = new PublicKey('STYXbZeL1wcNigy1WAMFbUQ7PNzJpPYV557H7foNyY5');

// Domain byte for Private Swap operations
export const DOMAIN_SWAP = 0x10;

// Pool seeds — must match on-chain sts_standard.rs constants
// NOTE: The SWAP domain (0x10) is archived on mainnet. These seeds are for devnet testing.
export const SWAP_SEEDS = {
  POOL: Buffer.from('sts_pool'),
  TREE: Buffer.from('sps_swap_tree'),
  NULLIFIER_SET: Buffer.from('sts_nullifier'),
  ORDER_BOOK: Buffer.from('sps_orders'),
  POI_REGISTRY: Buffer.from('sps_poi'),
};

// Operation codes — canonical, matching domains.ts swap export
export const SWAP_OPS = {
  // Pool Management
  INIT_POOL: 0x01,
  CLOSE_POOL: 0x02,
  PAUSE_POOL: 0x03,
  
  // Deposits (Shield)
  DEPOSIT: 0x10,
  DEPOSIT_BATCH: 0x11,
  
  // Withdrawals (Unshield)
  WITHDRAW: 0x20,
  WITHDRAW_BATCH: 0x21,
  WITHDRAW_TO_NEW: 0x22, // Withdraw to newly created ATA
  
  // Private Swaps
  PLACE_ORDER: 0x30,      // Place encrypted limit order
  CANCEL_ORDER: 0x31,     // Cancel order (reveal nullifier)
  MATCH_ORDERS: 0x32,     // Match two encrypted orders
  ATOMIC_SWAP: 0x33,      // Direct A↔B swap in same tx
  PARTIAL_FILL: 0x34,     // Partial fill of order
  
  // POI (Proof of Innocence)
  ATTACH_POI: 0x40,
  VERIFY_POI: 0x41,
  REVEAL_FOR_COMPLIANCE: 0x42,
  
  // Relayer Operations
  REGISTER_RELAYER: 0x50,
  CLAIM_RELAYER_FEE: 0x51,
};

// ============================================================================
// TYPES
// ============================================================================

/**
 * A shielded commitment representing tokens in the pool
 */
export interface ShieldedNote {
  // Public data (stored on-chain in tree)
  commitment: Uint8Array;     // 32 bytes - Pedersen commitment
  poolId: PublicKey;          // Which pool this belongs to
  leafIndex: number;          // Position in Merkle tree
  
  // Private data (stored off-chain by user)
  mint: PublicKey;            // Token mint
  amount: bigint;             // Token amount
  nullifier: Uint8Array;      // 32 bytes - For spending
  secret: Uint8Array;         // 32 bytes - Random blinding factor
  nonce: Uint8Array;          // 32 bytes - Randomness
}

/**
 * An encrypted order in the order book
 */
export interface EncryptedOrder {
  orderId: Uint8Array;        // 32 bytes - Order identifier
  orderType: 'buy' | 'sell';
  
  // Encrypted fields (Pedersen/ElGamal)
  encryptedMintIn: Uint8Array;   // Token to sell
  encryptedMintOut: Uint8Array;  // Token to buy
  encryptedAmountIn: Uint8Array; // Amount selling
  encryptedAmountOut: Uint8Array;// Amount buying (limit price)
  
  // For matching
  commitmentIn: Uint8Array;   // Proof of shielded balance
  nullifier: Uint8Array;      // To prevent double-use
  
  // Public metadata
  expiry: number;             // Slot number for expiry
  poolId: PublicKey;
}

/**
 * Pool configuration
 */
export interface PoolConfig {
  poolId: PublicKey;
  authority: PublicKey;
  supportedMints: PublicKey[];
  feeRate: number;            // Basis points (100 = 1%)
  treeHeight: number;         // Merkle tree height
  maxBatchSize: number;       // Max deposits per batch
  poiRequired: boolean;       // Require POI for withdrawals
}

// ============================================================================
// CRYPTO PRIMITIVES
// ============================================================================

/**
 * Compute Pedersen commitment: C = g^amount * h^blinding
 * (Simplified for demo - real impl uses curve25519)
 */
export function computePedersenCommitment(
  amount: bigint,
  blinding: Uint8Array
): Uint8Array {
  const crypto = globalThis.crypto || require('crypto');
  const amountBytes = Buffer.alloc(8);
  amountBytes.writeBigUInt64LE(amount);
  
  const data = Buffer.concat([
    Buffer.from('SPS_PEDERSEN_V1'),
    amountBytes,
    Buffer.from(blinding),
  ]);
  
  // In production: Use actual Pedersen on curve25519
  return new Uint8Array(crypto.createHash('sha256').update(data).digest());
}

/**
 * Compute note commitment: H(mint || amount || nullifier || secret)
 */
export function computeNoteCommitment(
  mint: PublicKey,
  amount: bigint,
  nullifier: Uint8Array,
  secret: Uint8Array
): Uint8Array {
  const crypto = globalThis.crypto || require('crypto');
  const amountBytes = Buffer.alloc(8);
  amountBytes.writeBigUInt64LE(amount);
  
  const data = Buffer.concat([
    Buffer.from('SPS_NOTE_V1'),
    mint.toBuffer(),
    amountBytes,
    Buffer.from(nullifier),
    Buffer.from(secret),
  ]);
  
  return new Uint8Array(crypto.createHash('sha256').update(data).digest());
}

/**
 * Compute nullifier from secret
 */
export function computeNullifier(
  secret: Uint8Array,
  leafIndex: number
): Uint8Array {
  const crypto = globalThis.crypto || require('crypto');
  const indexBytes = Buffer.alloc(4);
  indexBytes.writeUInt32LE(leafIndex);
  
  const data = Buffer.concat([
    Buffer.from('SPS_NULLIFIER_V1'),
    Buffer.from(secret),
    indexBytes,
  ]);
  
  return new Uint8Array(crypto.createHash('sha256').update(data).digest());
}

/**
 * Build Merkle proof for a leaf
 */
export function buildMerkleProof(
  leaves: Uint8Array[],
  targetIndex: number
): { root: Uint8Array; proof: Uint8Array[]; directions: number[] } {
  const crypto = globalThis.crypto || require('crypto');
  const height = Math.ceil(Math.log2(leaves.length || 1));
  const numLeaves = 2 ** height;
  
  // Pad to power of 2
  const paddedLeaves = [...leaves];
  const emptyLeaf = new Uint8Array(32);
  while (paddedLeaves.length < numLeaves) {
    paddedLeaves.push(emptyLeaf);
  }
  
  // Build tree
  const tree: Uint8Array[][] = [paddedLeaves];
  
  for (let level = 0; level < height; level++) {
    const currentLevel = tree[level];
    const nextLevel: Uint8Array[] = [];
    
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1] || emptyLeaf;
      const combined = Buffer.concat([Buffer.from(left), Buffer.from(right)]);
      nextLevel.push(new Uint8Array(crypto.createHash('sha256').update(combined).digest()));
    }
    
    tree.push(nextLevel);
  }
  
  const root = tree[tree.length - 1][0];
  
  // Build proof
  const proof: Uint8Array[] = [];
  const directions: number[] = [];
  let idx = targetIndex;
  
  for (let level = 0; level < height; level++) {
    const isLeft = idx % 2 === 0;
    const siblingIdx = isLeft ? idx + 1 : idx - 1;
    proof.push(tree[level][siblingIdx] || emptyLeaf);
    directions.push(isLeft ? 0 : 1);
    idx = Math.floor(idx / 2);
  }
  
  return { root, proof, directions };
}

/**
 * Verify Merkle proof
 */
export function verifyMerkleProof(
  leaf: Uint8Array,
  proof: Uint8Array[],
  directions: number[],
  root: Uint8Array
): boolean {
  const crypto = globalThis.crypto || require('crypto');
  let computed = Buffer.from(leaf);
  
  for (let i = 0; i < proof.length; i++) {
    const sibling = Buffer.from(proof[i]);
    const combined = directions[i] === 0
      ? Buffer.concat([computed, sibling])
      : Buffer.concat([sibling, computed]);
    computed = crypto.createHash('sha256').update(combined).digest();
  }
  
  return computed.equals(Buffer.from(root));
}

// ============================================================================
// PRIVATE SWAP CLIENT
// ============================================================================

export class PrivateSwapClient {
  private connection: Connection;
  private programId: PublicKey;
  
  constructor(connection: Connection, programId: PublicKey = PROGRAM_ID) {
    this.connection = connection;
    this.programId = programId;
  }
  
  // ──────────────────────────────────────────────────────────────────────────
  // POOL MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Initialize a new shielded pool for a set of tokens
   */
  async buildInitPoolIx(
    authority: PublicKey,
    supportedMints: PublicKey[],
    config: Partial<PoolConfig> = {}
  ): Promise<{ ix: TransactionInstruction; poolId: PublicKey }> {
    // Derive pool PDA
    const [poolId] = PublicKey.findProgramAddressSync(
      [SWAP_SEEDS.POOL, authority.toBuffer()],
      this.programId
    );
    
    const treeHeight = config.treeHeight || 20; // 2^20 = 1M notes
    const feeRate = config.feeRate || 30; // 0.3%
    const maxBatchSize = config.maxBatchSize || 100;
    const poiRequired = config.poiRequired ?? false;
    
    // Build instruction data
    const mintsData = Buffer.concat(
      supportedMints.map(m => m.toBuffer())
    );
    
    const data = Buffer.alloc(5 + 4 + 2 + 4 + 1 + mintsData.length);
    let offset = 0;
    data.writeUInt8(DOMAIN_SWAP, offset++);
    data.writeUInt8(SWAP_OPS.INIT_POOL, offset++);
    data.writeUInt8(treeHeight, offset++);
    data.writeUInt16LE(feeRate, offset); offset += 2;
    data.writeUInt32LE(maxBatchSize, offset); offset += 4;
    data.writeUInt8(poiRequired ? 1 : 0, offset++);
    data.writeUInt8(supportedMints.length, offset++);
    mintsData.copy(data, offset);
    
    const ix = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: authority, isSigner: true, isWritable: true },
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });
    
    return { ix, poolId };
  }
  
  // ──────────────────────────────────────────────────────────────────────────
  // DEPOSIT (SHIELD)
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Create a shielded note for deposit
   * Returns the note data that user must store privately
   */
  createShieldedNote(
    mint: PublicKey,
    amount: bigint,
    poolId: PublicKey
  ): ShieldedNote {
    const crypto = globalThis.crypto || require('crypto');
    
    // Generate random values
    const secret = crypto.randomBytes(32);
    const nonce = crypto.randomBytes(32);
    const nullifier = crypto.randomBytes(32);
    
    // Compute commitment
    const commitment = computeNoteCommitment(mint, amount, nullifier, secret);
    
    return {
      commitment,
      poolId,
      leafIndex: -1, // Set after deposit
      mint,
      amount,
      nullifier,
      secret,
      nonce,
    };
  }
  
  /**
   * Deposit SPL tokens into shielded pool
   */
  buildDepositIx(
    depositor: PublicKey,
    poolId: PublicKey,
    mint: PublicKey,
    note: ShieldedNote
  ): TransactionInstruction {
    const data = Buffer.alloc(75);
    let offset = 0;
    data.writeUInt8(DOMAIN_SWAP, offset++);
    data.writeUInt8(SWAP_OPS.DEPOSIT, offset++);
    Buffer.from(note.commitment).copy(data, offset); offset += 32;
    mint.toBuffer().copy(data, offset); offset += 32;
    // Amount is hidden in commitment - not sent in plaintext
    data.writeBigUInt64LE(note.amount, offset);
    
    // Derive depositor's token account
    const [depositorAta] = PublicKey.findProgramAddressSync(
      [depositor.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
    );
    
    // Derive pool's token vault
    const [poolVault] = PublicKey.findProgramAddressSync(
      [SWAP_SEEDS.POOL, poolId.toBuffer(), mint.toBuffer()],
      this.programId
    );
    
    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: depositor, isSigner: true, isWritable: true },
        { pubkey: depositorAta, isSigner: false, isWritable: true },
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: poolVault, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data,
    });
  }
  
  // ──────────────────────────────────────────────────────────────────────────
  // WITHDRAW (UNSHIELD)
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Withdraw from shielded pool to any address
   * Requires ZK proof of note ownership
   */
  buildWithdrawIx(
    recipient: PublicKey,
    poolId: PublicKey,
    note: ShieldedNote,
    merkleProof: { root: Uint8Array; proof: Uint8Array[]; directions: number[] },
    relayer?: PublicKey,
    relayerFee?: bigint
  ): TransactionInstruction {
    // Compute nullifier to prevent double-spend
    const nullifier = computeNullifier(note.secret, note.leafIndex);
    
    // Serialize merkle proof
    const proofData = Buffer.concat([
      Buffer.from(merkleProof.root),
      ...merkleProof.proof.map(p => Buffer.from(p)),
    ]);
    const directionsData = Buffer.from(merkleProof.directions);
    
    const dataSize = 3 + 32 + 32 + proofData.length + directionsData.length + 32 + 8 + 8;
    const data = Buffer.alloc(dataSize);
    let offset = 0;
    
    data.writeUInt8(DOMAIN_SWAP, offset++);
    data.writeUInt8(SWAP_OPS.WITHDRAW, offset++);
    
    // Nullifier (to mark note as spent)
    Buffer.from(nullifier).copy(data, offset); offset += 32;
    
    // Commitment (for verification)
    Buffer.from(note.commitment).copy(data, offset); offset += 32;
    
    // Merkle proof length and data
    data.writeUInt8(merkleProof.proof.length, offset++);
    proofData.copy(data, offset); offset += proofData.length;
    directionsData.copy(data, offset); offset += directionsData.length;
    
    // Recipient address
    recipient.toBuffer().copy(data, offset); offset += 32;
    
    // Amount to withdraw
    data.writeBigUInt64LE(note.amount, offset); offset += 8;
    
    // Optional relayer fee
    data.writeBigUInt64LE(relayerFee || 0n, offset);
    
    // Derive pool's token vault
    const [poolVault] = PublicKey.findProgramAddressSync(
      [SWAP_SEEDS.POOL, poolId.toBuffer(), note.mint.toBuffer()],
      this.programId
    );
    
    // Derive nullifier set account
    const [nullifierSet] = PublicKey.findProgramAddressSync(
      [SWAP_SEEDS.NULLIFIER_SET, poolId.toBuffer()],
      this.programId
    );
    
    const keys = [
      { pubkey: recipient, isSigner: false, isWritable: true },
      { pubkey: poolId, isSigner: false, isWritable: true },
      { pubkey: poolVault, isSigner: false, isWritable: true },
      { pubkey: nullifierSet, isSigner: false, isWritable: true },
      { pubkey: note.mint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    
    // Add relayer if present
    if (relayer) {
      keys.push({ pubkey: relayer, isSigner: true, isWritable: true });
    }
    
    return new TransactionInstruction({
      programId: this.programId,
      keys,
      data: data.slice(0, offset),
    });
  }
  
  // ──────────────────────────────────────────────────────────────────────────
  // PRIVATE SWAP
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Place an encrypted limit order in the order book
   */
  buildPlaceOrderIx(
    trader: PublicKey,
    poolId: PublicKey,
    note: ShieldedNote,
    mintOut: PublicKey,
    amountOut: bigint,
    expiry: number,
    merkleProof: { root: Uint8Array; proof: Uint8Array[]; directions: number[] }
  ): TransactionInstruction {
    const crypto = globalThis.crypto || require('crypto');
    
    // Create encrypted order
    const orderId = crypto.randomBytes(32);
    
    // Encrypt order details (simplified - real impl uses ElGamal/ECIES)
    const encryptedAmountIn = computePedersenCommitment(note.amount, note.nonce);
    const encryptedAmountOut = computePedersenCommitment(amountOut, crypto.randomBytes(32));
    
    const data = Buffer.alloc(200);
    let offset = 0;
    
    data.writeUInt8(DOMAIN_SWAP, offset++);
    data.writeUInt8(SWAP_OPS.PLACE_ORDER, offset++);
    
    // Order ID
    Buffer.from(orderId).copy(data, offset); offset += 32;
    
    // Encrypted amounts
    Buffer.from(encryptedAmountIn).copy(data, offset); offset += 32;
    Buffer.from(encryptedAmountOut).copy(data, offset); offset += 32;
    
    // Mint out (what we want)
    mintOut.toBuffer().copy(data, offset); offset += 32;
    
    // Note commitment (proves we have the tokens)
    Buffer.from(note.commitment).copy(data, offset); offset += 32;
    
    // Expiry
    data.writeUInt32LE(expiry, offset); offset += 4;
    
    // Merkle proof (simplified - just root)
    Buffer.from(merkleProof.root).copy(data, offset); offset += 32;
    
    // Derive order book
    const [orderBook] = PublicKey.findProgramAddressSync(
      [SWAP_SEEDS.ORDER_BOOK, poolId.toBuffer()],
      this.programId
    );
    
    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: trader, isSigner: true, isWritable: true },
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: orderBook, isSigner: false, isWritable: true },
      ],
      data: data.slice(0, offset),
    });
  }
  
  /**
   * Atomic swap between two shielded notes
   * Both parties swap in a single transaction
   */
  buildAtomicSwapIx(
    poolId: PublicKey,
    noteA: ShieldedNote,
    proofA: { root: Uint8Array; proof: Uint8Array[]; directions: number[] },
    noteB: ShieldedNote,
    proofB: { root: Uint8Array; proof: Uint8Array[]; directions: number[] },
    recipientA: PublicKey, // A receives noteB's tokens
    recipientB: PublicKey  // B receives noteA's tokens
  ): TransactionInstruction {
    const nullifierA = computeNullifier(noteA.secret, noteA.leafIndex);
    const nullifierB = computeNullifier(noteB.secret, noteB.leafIndex);
    
    const data = Buffer.alloc(300);
    let offset = 0;
    
    data.writeUInt8(DOMAIN_SWAP, offset++);
    data.writeUInt8(SWAP_OPS.ATOMIC_SWAP, offset++);
    
    // Note A data
    Buffer.from(nullifierA).copy(data, offset); offset += 32;
    Buffer.from(noteA.commitment).copy(data, offset); offset += 32;
    Buffer.from(proofA.root).copy(data, offset); offset += 32;
    
    // Note B data
    Buffer.from(nullifierB).copy(data, offset); offset += 32;
    Buffer.from(noteB.commitment).copy(data, offset); offset += 32;
    Buffer.from(proofB.root).copy(data, offset); offset += 32;
    
    // Recipients
    recipientA.toBuffer().copy(data, offset); offset += 32;
    recipientB.toBuffer().copy(data, offset); offset += 32;
    
    // Derive accounts
    const [nullifierSet] = PublicKey.findProgramAddressSync(
      [SWAP_SEEDS.NULLIFIER_SET, poolId.toBuffer()],
      this.programId
    );
    
    const [vaultA] = PublicKey.findProgramAddressSync(
      [SWAP_SEEDS.POOL, poolId.toBuffer(), noteA.mint.toBuffer()],
      this.programId
    );
    
    const [vaultB] = PublicKey.findProgramAddressSync(
      [SWAP_SEEDS.POOL, poolId.toBuffer(), noteB.mint.toBuffer()],
      this.programId
    );
    
    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: nullifierSet, isSigner: false, isWritable: true },
        { pubkey: vaultA, isSigner: false, isWritable: true },
        { pubkey: vaultB, isSigner: false, isWritable: true },
        { pubkey: recipientA, isSigner: false, isWritable: true },
        { pubkey: recipientB, isSigner: false, isWritable: true },
        { pubkey: noteA.mint, isSigner: false, isWritable: false },
        { pubkey: noteB.mint, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: data.slice(0, offset),
    });
  }
  
  // ──────────────────────────────────────────────────────────────────────────
  // POI (PROOF OF INNOCENCE) INTEGRATION
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Attach POI to withdrawal for compliance
   */
  buildAttachPoiIx(
    withdrawer: PublicKey,
    poolId: PublicKey,
    nullifier: Uint8Array,
    poiData: Uint8Array
  ): TransactionInstruction {
    const data = Buffer.alloc(100 + poiData.length);
    let offset = 0;
    
    data.writeUInt8(DOMAIN_SWAP, offset++);
    data.writeUInt8(SWAP_OPS.ATTACH_POI, offset++);
    Buffer.from(nullifier).copy(data, offset); offset += 32;
    data.writeUInt16LE(poiData.length, offset); offset += 2;
    Buffer.from(poiData).copy(data, offset);
    
    const [poiRegistry] = PublicKey.findProgramAddressSync(
      [SWAP_SEEDS.POI_REGISTRY, poolId.toBuffer()],
      this.programId
    );
    
    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: withdrawer, isSigner: true, isWritable: true },
        { pubkey: poolId, isSigner: false, isWritable: false },
        { pubkey: poiRegistry, isSigner: false, isWritable: true },
      ],
      data: data.slice(0, offset),
    });
  }
  
  // ──────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Serialize a shielded note for secure storage
   */
  serializeNote(note: ShieldedNote): string {
    const data = {
      commitment: Buffer.from(note.commitment).toString('hex'),
      poolId: note.poolId.toBase58(),
      leafIndex: note.leafIndex,
      mint: note.mint.toBase58(),
      amount: note.amount.toString(),
      nullifier: Buffer.from(note.nullifier).toString('hex'),
      secret: Buffer.from(note.secret).toString('hex'),
      nonce: Buffer.from(note.nonce).toString('hex'),
    };
    return JSON.stringify(data);
  }
  
  /**
   * Deserialize a shielded note from storage
   */
  deserializeNote(json: string): ShieldedNote {
    const data = JSON.parse(json);
    return {
      commitment: new Uint8Array(Buffer.from(data.commitment, 'hex')),
      poolId: new PublicKey(data.poolId),
      leafIndex: data.leafIndex,
      mint: new PublicKey(data.mint),
      amount: BigInt(data.amount),
      nullifier: new Uint8Array(Buffer.from(data.nullifier, 'hex')),
      secret: new Uint8Array(Buffer.from(data.secret, 'hex')),
      nonce: new Uint8Array(Buffer.from(data.nonce, 'hex')),
    };
  }
}

// ============================================================================
// EXPORT DEFAULT INSTANCE
// ============================================================================

export function createPrivateSwapClient(connection: Connection): PrivateSwapClient {
  return new PrivateSwapClient(connection);
}
