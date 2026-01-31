/**
 * @styx-stack/sps-sdk - DAM Client
 * 
 * Deferred Account Materialization - World's First Bidirectional Token Architecture
 * 
 * Features:
 * - Virtual tokens (zero rent, commitment-based)
 * - Materialize on-demand (creates real SPL account)
 * - De-materialize to reclaim rent (UNIQUE to SPS!)
 * - Full DEX compatibility when materialized
 * 
 * Cost comparison (1M holders):
 * - SPL Token: 2,000 SOL rent
 * - Token-2022: 1,150 SOL rent
 * - Light Protocol: 40 SOL rent
 * - SPS DAM (5% active): ~100 SOL (with privacy + rent recovery!)
 */

import {
  Connection,
  PublicKey,
  Keypair,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
} from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha256';
import { DOMAIN_DAM, dam, buildInstructionPrefix } from './domains';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default SPS Program ID */
export const SPS_PROGRAM_ID = new PublicKey('GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9');

/** PDA Seeds */
export const SEEDS = {
  DAM_POOL: Buffer.from('dam_pool'),
  VIRTUAL_BALANCE: Buffer.from('dam_vbal'),
  MERKLE_ROOT: Buffer.from('dam_root'),
  NULLIFIER: Buffer.from('dam_null'),
} as const;

// ============================================================================
// TYPES
// ============================================================================

/** DAM Pool configuration */
export interface DAMPoolConfig {
  /** Token mint address */
  mint: PublicKey;
  /** Pool authority (can update settings) */
  authority: PublicKey;
  /** Fee tier (basis points) */
  feeBps?: number;
  /** Minimum materialize amount */
  minMaterializeAmount?: bigint;
}

/** Virtual balance entry */
export interface VirtualBalance {
  /** Owner's public key */
  owner: PublicKey;
  /** Token mint */
  mint: PublicKey;
  /** Amount (private, hidden in commitment if privacy mode) */
  amount: bigint;
  /** Privacy nonce (for commitment derivation) */
  nonce: Uint8Array;
  /** Commitment hash (if private mode) */
  commitment?: Uint8Array;
}

/** Merkle proof for materialization */
export interface MaterializationProof {
  /** Leaf data (virtual balance commitment) */
  leaf: Uint8Array;
  /** Merkle path (siblings) */
  path: Uint8Array[];
  /** Path directions (0 = left, 1 = right) */
  directions: number[];
  /** Root this proof verifies against */
  root: Uint8Array;
  /** Slot when root was published */
  rootSlot: bigint;
}

/** Materialization result */
export interface MaterializationResult {
  /** Transaction signature */
  signature: string;
  /** Created token account */
  tokenAccount: PublicKey;
  /** Amount materialized */
  amount: bigint;
  /** Rent paid */
  rentPaid: bigint;
}

/** De-materialization result */
export interface DematerializationResult {
  /** Transaction signature */
  signature: string;
  /** New virtual balance commitment */
  newCommitment: Uint8Array;
  /** Rent reclaimed */
  rentReclaimed: bigint;
}

// ============================================================================
// DAM CLIENT
// ============================================================================

export class DAMClient {
  constructor(
    public readonly connection: Connection,
    public readonly programId: PublicKey = SPS_PROGRAM_ID,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  // POOL OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Derive DAM pool PDA for a token mint
   */
  getPoolPda(mint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [SEEDS.DAM_POOL, mint.toBytes()],
      this.programId,
    );
  }

  /**
   * Create DAM pool for a token mint
   * Uses Token-2022 with Permanent Delegate + Immutable Owner
   * Cost: ~0.002 SOL once (shared by ALL holders!)
   */
  buildCreatePoolIx(
    config: DAMPoolConfig,
    payer: PublicKey,
  ): TransactionInstruction {
    const [poolPda] = this.getPoolPda(config.mint);
    
    // Build instruction data
    // Format: [DOMAIN_DAM][OP_POOL_CREATE][mint:32][authority:32][fee_bps:2][min_amount:8]
    const data = Buffer.alloc(76);
    let offset = 0;
    
    data.writeUInt8(DOMAIN_DAM, offset++);
    data.writeUInt8(dam.OP_POOL_CREATE, offset++);
    config.mint.toBuffer().copy(data, offset); offset += 32;
    config.authority.toBuffer().copy(data, offset); offset += 32;
    data.writeUInt16LE(config.feeBps ?? 0, offset); offset += 2;
    data.writeBigUInt64LE(config.minMaterializeAmount ?? 0n, offset);

    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: true },
        { pubkey: config.mint, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VIRTUAL BALANCE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Compute virtual balance commitment
   * commitment = sha256(owner || mint || amount || nonce)
   */
  computeCommitment(balance: VirtualBalance): Uint8Array {
    const data = Buffer.concat([
      balance.owner.toBytes(),
      balance.mint.toBytes(),
      Buffer.from(balance.amount.toString()),
      balance.nonce,
    ]);
    return sha256(data);
  }

  /**
   * Build virtual mint instruction (inscription-based, ZERO rent!)
   */
  buildVirtualMintIx(
    mint: PublicKey,
    recipient: PublicKey,
    amount: bigint,
    minter: PublicKey,
    privateMode: boolean = true,
  ): TransactionInstruction {
    const nonce = new Uint8Array(32);
    crypto.getRandomValues(nonce);
    
    const balance: VirtualBalance = {
      owner: recipient,
      mint,
      amount,
      nonce,
    };
    
    const commitment = privateMode ? this.computeCommitment(balance) : new Uint8Array(32);
    
    // Format: [DOMAIN_DAM][OP_VIRTUAL_MINT][mint:32][recipient:32][amount:8][private:1][commitment:32]
    const data = Buffer.alloc(107);
    let offset = 0;
    
    data.writeUInt8(DOMAIN_DAM, offset++);
    data.writeUInt8(dam.OP_VIRTUAL_MINT, offset++);
    mint.toBuffer().copy(data, offset); offset += 32;
    recipient.toBuffer().copy(data, offset); offset += 32;
    data.writeBigUInt64LE(amount, offset); offset += 8;
    data.writeUInt8(privateMode ? 1 : 0, offset++);
    Buffer.from(commitment).copy(data, offset);

    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: minter, isSigner: true, isWritable: true },
      ],
      data,
    });
  }

  /**
   * Build virtual transfer instruction (private, free)
   */
  buildVirtualTransferIx(
    mint: PublicKey,
    from: PublicKey,
    to: PublicKey,
    amount: bigint,
    fromNonce: Uint8Array,
    signer: PublicKey,
  ): TransactionInstruction {
    const newNonce = new Uint8Array(32);
    crypto.getRandomValues(newNonce);
    
    // Compute nullifier for the spent balance
    const nullifier = sha256(Buffer.concat([
      Buffer.from('DAM_NULLIFIER_V1'),
      from.toBytes(),
      mint.toBytes(),
      fromNonce,
    ]));
    
    // Format: [DOMAIN_DAM][OP_VIRTUAL_TRANSFER][mint:32][from:32][to:32][amount:8][nullifier:32][new_nonce:32]
    const data = Buffer.alloc(170);
    let offset = 0;
    
    data.writeUInt8(DOMAIN_DAM, offset++);
    data.writeUInt8(dam.OP_VIRTUAL_TRANSFER, offset++);
    mint.toBuffer().copy(data, offset); offset += 32;
    from.toBuffer().copy(data, offset); offset += 32;
    to.toBuffer().copy(data, offset); offset += 32;
    data.writeBigUInt64LE(amount, offset); offset += 8;
    Buffer.from(nullifier).copy(data, offset); offset += 32;
    Buffer.from(newNonce).copy(data, offset);

    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: signer, isSigner: true, isWritable: true },
      ],
      data,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MATERIALIZATION - Convert virtual to real SPL account
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Build materialize instruction
   * Creates real SPL token account from virtual balance
   * User pays ~0.002 SOL rent, but gets DEX-compatible tokens!
   */
  buildMaterializeIx(
    mint: PublicKey,
    owner: PublicKey,
    amount: bigint,
    proof: MaterializationProof,
    destinationAccount: PublicKey,
  ): TransactionInstruction {
    const [poolPda] = this.getPoolPda(mint);
    
    // Compute nullifier to prevent double-materialize
    const nullifier = sha256(Buffer.concat([
      Buffer.from('DAM_MATERIALIZE_V1'),
      proof.leaf,
      Buffer.from(proof.rootSlot.toString()),
    ]));
    
    // Derive nullifier PDA
    const [nullifierPda] = PublicKey.findProgramAddressSync(
      [SEEDS.NULLIFIER, nullifier],
      this.programId,
    );
    
    // Build proof data
    const proofData = Buffer.alloc(1 + proof.path.length * 33);
    proofData.writeUInt8(proof.path.length, 0);
    for (let i = 0; i < proof.path.length; i++) {
      proof.path[i].slice().forEach((b, j) => proofData[1 + i * 33 + j] = b);
      proofData[1 + i * 33 + 32] = proof.directions[i];
    }
    
    // Format: [DOMAIN_DAM][OP_MATERIALIZE][mint:32][amount:8][leaf:32][root:32][root_slot:8][proof...]
    const data = Buffer.concat([
      buildInstructionPrefix(DOMAIN_DAM, dam.OP_MATERIALIZE),
      mint.toBuffer(),
      Buffer.from(new BigUint64Array([amount]).buffer),
      Buffer.from(proof.leaf),
      Buffer.from(proof.root),
      Buffer.from(new BigUint64Array([proof.rootSlot]).buffer),
      proofData,
    ]);

    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: true },
        { pubkey: destinationAccount, isSigner: false, isWritable: true },
        { pubkey: nullifierPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DE-MATERIALIZATION - Return to virtual, RECLAIM RENT!
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Build de-materialize instruction
   * Returns tokens to pool, closes account, reclaims rent!
   * Balance returns to virtual/private mode
   * UNIQUE TO SPS - Light Protocol cannot do this!
   */
  buildDematerializeIx(
    mint: PublicKey,
    owner: PublicKey,
    sourceAccount: PublicKey,
    amount: bigint,
  ): TransactionInstruction {
    const [poolPda] = this.getPoolPda(mint);
    
    // Generate new nonce for virtual balance
    const newNonce = new Uint8Array(32);
    crypto.getRandomValues(newNonce);
    
    // Compute new commitment
    const newBalance: VirtualBalance = {
      owner,
      mint,
      amount,
      nonce: newNonce,
    };
    const newCommitment = this.computeCommitment(newBalance);
    
    // Format: [DOMAIN_DAM][OP_DEMATERIALIZE][mint:32][amount:8][new_commitment:32][new_nonce:32]
    const data = Buffer.alloc(106);
    let offset = 0;
    
    data.writeUInt8(DOMAIN_DAM, offset++);
    data.writeUInt8(dam.OP_DEMATERIALIZE, offset++);
    mint.toBuffer().copy(data, offset); offset += 32;
    data.writeBigUInt64LE(amount, offset); offset += 8;
    Buffer.from(newCommitment).copy(data, offset); offset += 32;
    Buffer.from(newNonce).copy(data, offset);

    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: sourceAccount, isSigner: false, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: true },
      ],
      data,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Estimate rent savings for virtual vs real accounts
   */
  estimateRentSavings(userCount: number, activeTraderPercent: number = 5): {
    splTokenCost: number;
    token22Cost: number;
    lightProtocolCost: number;
    damCost: number;
    damSavingsVsSpl: number;
    damSavingsVsLight: number;
  } {
    const splRentPerAccount = 0.00203928; // SOL
    const token22RentPerAccount = 0.00115; // SOL
    const lightTreeCost = 0.0089; // SOL per tree (depth 20)
    const lightPerUser = 0.00004; // SOL amortized
    const damPoolCost = 0.002; // SOL (one time)
    const damMaterializeRent = 0.002; // SOL per materialized account
    
    const splTokenCost = userCount * splRentPerAccount;
    const token22Cost = userCount * token22RentPerAccount;
    const lightProtocolCost = lightTreeCost + (userCount * lightPerUser);
    const damCost = damPoolCost + (userCount * (activeTraderPercent / 100) * damMaterializeRent);
    
    return {
      splTokenCost: Math.round(splTokenCost * 1000) / 1000,
      token22Cost: Math.round(token22Cost * 1000) / 1000,
      lightProtocolCost: Math.round(lightProtocolCost * 1000) / 1000,
      damCost: Math.round(damCost * 1000) / 1000,
      damSavingsVsSpl: Math.round((1 - damCost / splTokenCost) * 100),
      damSavingsVsLight: Math.round((damCost / lightProtocolCost - 1) * 100),
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default DAMClient;
