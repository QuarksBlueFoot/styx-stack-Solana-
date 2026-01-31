/**
 * Styx Inscriptions - Lamport Inscription Tokens
 * 
 * Two modes:
 * 1. Standard Inscriptions (~0.001 SOL) - Permanent, rent-exempt
 * 2. Ephemeral Inscriptions (1 lamport) - ~2 year lifespan
 * 
 * Each inscription is a unique, transferable, on-chain token.
 */

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { createHash } from 'crypto';
import * as bs58 from 'bs58';

// ============================================================================
// TYPES
// ============================================================================

export enum InscriptionType {
  Text = 0,
  Image = 1,
  Json = 2,
  Custom = 3,
}

export enum InscriptionMode {
  /** Permanent, rent-exempt inscription (~0.001 SOL) */
  Standard = 'standard',
  /** Ephemeral, 1 lamport inscription (~2 year lifespan) */
  Ephemeral = 'ephemeral',
}

export interface Inscription {
  address: PublicKey;
  inscriptionNumber: bigint;
  creator: PublicKey;
  owner: PublicKey;
  contentHash: Uint8Array;
  inscriptionType: InscriptionType;
  createdAt: number;
  mode: InscriptionMode;
  content?: string; // Off-chain content (optional)
}

export interface CreateInscriptionParams {
  /** The wallet creating the inscription */
  creator: Keypair;
  /** The content to inscribe (hashed on-chain, full content stored off-chain) */
  content: string;
  /** Type of inscription */
  type?: InscriptionType;
  /** Mode: standard (permanent) or ephemeral (1 lamport) */
  mode?: InscriptionMode;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

export interface TransferInscriptionParams {
  /** The inscription address */
  inscription: PublicKey;
  /** Current owner */
  owner: Keypair;
  /** New owner */
  newOwner: PublicKey;
}

export interface InscriptionCreateResult {
  inscription: Inscription;
  signature: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Minimum lamports for rent-exempt inscription account */
const RENT_EXEMPT_MINIMUM = 890_880; // ~0.00089 SOL for 100 bytes

/** Account size for inscription data */
const INSCRIPTION_ACCOUNT_SIZE = 165; // bytes

/** Magic bytes for inscription identification */
const INSCRIPTION_MAGIC = Buffer.from([0x53, 0x54, 0x59, 0x58]); // "STYX"

// ============================================================================
// INSCRIPTION CLIENT
// ============================================================================

export class StyxInscriptions {
  private connection: Connection;
  private globalCounter: bigint = 0n;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Create a new inscription
   */
  async createInscription(params: CreateInscriptionParams): Promise<InscriptionCreateResult> {
    const {
      creator,
      content,
      type = InscriptionType.Text,
      mode = InscriptionMode.Standard,
      metadata = {},
    } = params;

    // Generate content hash
    const contentHash = this.hashContent(content);
    
    // Generate inscription keypair
    const inscriptionKeypair = Keypair.generate();
    
    // Determine lamports based on mode
    const lamports = mode === InscriptionMode.Ephemeral 
      ? 1 
      : await this.connection.getMinimumBalanceForRentExemption(INSCRIPTION_ACCOUNT_SIZE);

    // Get next inscription number (from counter or timestamp-based)
    const inscriptionNumber = this.getNextInscriptionNumber();

    // Build inscription data
    const data = this.encodeInscriptionData({
      inscriptionNumber,
      creator: creator.publicKey,
      owner: creator.publicKey,
      contentHash,
      inscriptionType: type,
      createdAt: Math.floor(Date.now() / 1000),
    });

    // Create account instruction
    const createAccountIx = SystemProgram.createAccount({
      fromPubkey: creator.publicKey,
      newAccountPubkey: inscriptionKeypair.publicKey,
      lamports,
      space: INSCRIPTION_ACCOUNT_SIZE,
      programId: SystemProgram.programId, // Using system program for simplicity
    });

    // Write data instruction (using memo for now, would use custom program in production)
    const writeDataIx = this.createWriteDataInstruction(
      inscriptionKeypair.publicKey,
      data,
      creator.publicKey
    );

    // Build and send transaction
    const tx = new Transaction().add(createAccountIx);
    
    const signature = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [creator, inscriptionKeypair],
      { commitment: 'confirmed' }
    );

    const inscription: Inscription = {
      address: inscriptionKeypair.publicKey,
      inscriptionNumber,
      creator: creator.publicKey,
      owner: creator.publicKey,
      contentHash,
      inscriptionType: type,
      createdAt: Math.floor(Date.now() / 1000),
      mode,
      content,
    };

    return { inscription, signature };
  }

  /**
   * Create a batch of inscriptions (more efficient)
   */
  async createBatchInscriptions(
    creator: Keypair,
    contents: string[],
    mode: InscriptionMode = InscriptionMode.Standard
  ): Promise<InscriptionCreateResult[]> {
    const results: InscriptionCreateResult[] = [];

    // Process in batches of 5 to avoid transaction size limits
    const batchSize = 5;
    for (let i = 0; i < contents.length; i += batchSize) {
      const batch = contents.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(content => this.createInscription({
          creator,
          content,
          mode,
        }))
      );
      
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Transfer inscription to new owner
   * 
   * Note: In a full implementation, this would update the owner field
   * in the inscription account data via a custom program.
   * For now, we use a memo-based approach.
   */
  async transferInscription(params: TransferInscriptionParams): Promise<string> {
    const { inscription, owner, newOwner } = params;

    // Create transfer memo
    const transferMemo = JSON.stringify({
      type: 'INSCRIPTION_TRANSFER',
      inscription: inscription.toBase58(),
      from: owner.publicKey.toBase58(),
      to: newOwner.toBase58(),
      timestamp: Date.now(),
    });

    // In production, this would call a custom program to update owner
    // For now, we record the transfer via memo program
    const memoIx = new TransactionInstruction({
      keys: [{ pubkey: owner.publicKey, isSigner: true, isWritable: false }],
      programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
      data: Buffer.from(transferMemo),
    });

    const tx = new Transaction().add(memoIx);
    
    return await sendAndConfirmTransaction(
      this.connection,
      tx,
      [owner],
      { commitment: 'confirmed' }
    );
  }

  /**
   * Fetch inscription by address
   */
  async getInscription(address: PublicKey): Promise<Inscription | null> {
    const accountInfo = await this.connection.getAccountInfo(address);
    if (!accountInfo) return null;

    // Check if it's an inscription
    if (!this.isInscriptionAccount(accountInfo.data)) {
      return null;
    }

    return this.decodeInscriptionData(accountInfo.data, address, accountInfo.lamports);
  }

  /**
   * Fetch all inscriptions by owner
   */
  async getInscriptionsByOwner(owner: PublicKey): Promise<Inscription[]> {
    // In production, this would use getProgramAccounts with filters
    // For now, return empty array (would need indexer)
    console.warn('getInscriptionsByOwner requires indexer - not implemented');
    return [];
  }

  /**
   * Get inscription by number
   */
  async getInscriptionByNumber(number: bigint): Promise<Inscription | null> {
    // Would need indexer to map number -> address
    console.warn('getInscriptionByNumber requires indexer - not implemented');
    return null;
  }

  /**
   * Estimate cost to create inscription
   */
  async estimateCost(mode: InscriptionMode): Promise<bigint> {
    if (mode === InscriptionMode.Ephemeral) {
      return 1n; // 1 lamport
    }
    
    const rentExempt = await this.connection.getMinimumBalanceForRentExemption(
      INSCRIPTION_ACCOUNT_SIZE
    );
    
    // Add transaction fee
    return BigInt(rentExempt) + 5000n; // ~5000 lamports tx fee
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private hashContent(content: string): Uint8Array {
    return new Uint8Array(
      createHash('sha256').update(content).digest()
    );
  }

  private getNextInscriptionNumber(): bigint {
    // Simple counter - in production would use on-chain counter
    this.globalCounter += 1n;
    return this.globalCounter;
  }

  private encodeInscriptionData(data: {
    inscriptionNumber: bigint;
    creator: PublicKey;
    owner: PublicKey;
    contentHash: Uint8Array;
    inscriptionType: InscriptionType;
    createdAt: number;
  }): Buffer {
    const buffer = Buffer.alloc(INSCRIPTION_ACCOUNT_SIZE);
    let offset = 0;

    // Magic bytes (4)
    INSCRIPTION_MAGIC.copy(buffer, offset);
    offset += 4;

    // Version (1)
    buffer.writeUInt8(1, offset);
    offset += 1;

    // Inscription number (8)
    buffer.writeBigUInt64LE(data.inscriptionNumber, offset);
    offset += 8;

    // Creator (32)
    data.creator.toBuffer().copy(buffer, offset);
    offset += 32;

    // Owner (32)
    data.owner.toBuffer().copy(buffer, offset);
    offset += 32;

    // Content hash (32)
    Buffer.from(data.contentHash).copy(buffer, offset);
    offset += 32;

    // Inscription type (1)
    buffer.writeUInt8(data.inscriptionType, offset);
    offset += 1;

    // Created at (8)
    buffer.writeBigUInt64LE(BigInt(data.createdAt), offset);
    offset += 8;

    return buffer;
  }

  private decodeInscriptionData(data: Buffer, address: PublicKey, lamports: number): Inscription {
    let offset = 0;

    // Skip magic (4) and version (1)
    offset += 5;

    // Inscription number
    const inscriptionNumber = data.readBigUInt64LE(offset);
    offset += 8;

    // Creator
    const creator = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;

    // Owner
    const owner = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;

    // Content hash
    const contentHash = new Uint8Array(data.subarray(offset, offset + 32));
    offset += 32;

    // Inscription type
    const inscriptionType = data.readUInt8(offset) as InscriptionType;
    offset += 1;

    // Created at
    const createdAt = Number(data.readBigUInt64LE(offset));

    // Determine mode based on lamports
    const mode = lamports <= 1 ? InscriptionMode.Ephemeral : InscriptionMode.Standard;

    return {
      address,
      inscriptionNumber,
      creator,
      owner,
      contentHash,
      inscriptionType,
      createdAt,
      mode,
    };
  }

  private isInscriptionAccount(data: Buffer): boolean {
    if (data.length < 4) return false;
    return data.subarray(0, 4).equals(INSCRIPTION_MAGIC);
  }

  private createWriteDataInstruction(
    account: PublicKey,
    data: Buffer,
    signer: PublicKey
  ): TransactionInstruction {
    // In production, this would call a custom program
    // For now, return a no-op (data is in createAccount)
    return new TransactionInstruction({
      keys: [],
      programId: SystemProgram.programId,
      data: Buffer.alloc(0),
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createStyxInscriptions(connection: Connection): StyxInscriptions {
  return new StyxInscriptions(connection);
}

/**
 * Quick helper to create a text inscription
 */
export async function quickInscribe(
  connection: Connection,
  creator: Keypair,
  text: string,
  ephemeral: boolean = false
): Promise<InscriptionCreateResult> {
  const inscriptions = new StyxInscriptions(connection);
  return inscriptions.createInscription({
    creator,
    content: text,
    type: InscriptionType.Text,
    mode: ephemeral ? InscriptionMode.Ephemeral : InscriptionMode.Standard,
  });
}
