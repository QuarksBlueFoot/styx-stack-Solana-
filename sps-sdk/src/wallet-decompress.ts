/**
 * @styx-stack/sps-sdk - Wallet Decompress Module
 * 
 * Styx Token Decompression System (STDS)
 * 
 * Enables wallets to decompress inscription-compressed tokens back to SPL tokens.
 * Users can then trade/sell on any DEX or marketplace.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════
 * DECOMPRESSION FLOW
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * ┌─────────────────────────────────────────────────────────────────────────────────┐
 * │                        TOKEN DECOMPRESSION                                      │
 * ├─────────────────────────────────────────────────────────────────────────────────┤
 * │                                                                                 │
 * │  ┌─────────────────┐                  ┌─────────────────┐                       │
 * │  │  COMPRESSED     │                  │  SPL TOKEN      │                       │
 * │  │  TOKEN          │ ──────────────▶  │  ACCOUNT        │                       │
 * │  │                 │   DECOMPRESS     │                 │                       │
 * │  │  • Merkle leaf  │                  │  • Real account │                       │
 * │  │  • Commitment   │                  │  • Tradeable    │                       │
 * │  │  • Low rent     │                  │  • DEX ready    │                       │
 * │  └─────────────────┘                  └─────────────────┘                       │
 * │          │                                    │                                 │
 * │          ▼                                    ▼                                 │
 * │  ┌─────────────────┐                  ┌─────────────────┐                       │
 * │  │  NULLIFIER      │                  │  POOL TRANSFER  │                       │
 * │  │  CREATED        │                  │  TO USER ATA    │                       │
 * │  │                 │                  │                 │                       │
 * │  │  Prevents       │                  │  Real SPL       │                       │
 * │  │  double-spend   │                  │  balance now!   │                       │
 * │  └─────────────────┘                  └─────────────────┘                       │
 * │                                                                                 │
 * └─────────────────────────────────────────────────────────────────────────────────┘
 * 
 * WALLET INTEGRATION:
 * 
 * 1. Wallet fetches compressed tokens via getCompressedTokenAccountsByOwner
 * 2. User selects tokens to decompress
 * 3. Wallet calls decompressTokens() with proofs
 * 4. User signs transaction
 * 5. Tokens appear in standard SPL balance
 * 6. User can now trade on Jupiter, Raydium, etc.
 * 
 * BATCH DECOMPRESS:
 * 
 * Decompress multiple tokens in a single transaction (up to 4 per tx).
 * Saves on transaction fees for airdrops.
 */

import {
  Connection,
  PublicKey,
  Keypair,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { keccak_256 } from '@noble/hashes/sha3';
import { randomBytes } from '@noble/hashes/utils';

// ============================================================================
// CONSTANTS
// ============================================================================

/** SPS Program ID (mainnet) */
export const SPS_PROGRAM_ID = new PublicKey('GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9');

/** SPS Program ID (devnet) */
export const SPS_PROGRAM_ID_DEVNET = new PublicKey('FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW');

/** SPL Token Program */
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

/** Token-2022 Program */
export const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

/** Associated Token Program */
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

/** Domain ID for Inscription Compression */
export const DOMAIN_IC = 0x0F;

/** Decompress operation code */
export const OP_DECOMPRESS = 0x12;

/** PDA Seeds */
export const DECOMPRESS_SEEDS = {
  POOL: Buffer.from('ic_pool'),
  NULLIFIER: Buffer.from('ic_null'),
  STATE: Buffer.from('ic_state'),
} as const;

/** Maximum tokens per batch decompress */
export const MAX_BATCH_SIZE = 4;

// ============================================================================
// TYPES
// ============================================================================

/** Compressed token to decompress */
export interface CompressedToken {
  /** Token mint */
  mint: PublicKey;
  /** Amount to decompress */
  amount: bigint;
  /** Commitment hash (leaf in merkle tree) */
  commitment: Uint8Array;
  /** Merkle proof */
  proof: MerkleProof;
  /** Owner's secret for nullifier generation */
  ownerSecret?: Uint8Array;
}

/** Merkle proof for compressed token */
export interface MerkleProof {
  /** Sibling hashes (bottom to top) */
  siblings: Uint8Array[];
  /** Direction bits (0 = left, 1 = right) */
  directions: number[];
  /** Leaf index in tree */
  index: number;
  /** Root this proof verifies against */
  root: Uint8Array;
  /** Root slot (when root was published) */
  rootSlot?: bigint;
}

/** Decompress result */
export interface DecompressResult {
  /** Transaction signature */
  signature: string;
  /** SPL token account receiving tokens */
  tokenAccount: PublicKey;
  /** Amount decompressed */
  amount: bigint;
  /** Nullifier created (prevents double-decompress) */
  nullifier: Uint8Array;
}

/** Batch decompress result */
export interface BatchDecompressResult {
  /** Transaction signature */
  signature: string;
  /** Individual results */
  results: DecompressResult[];
  /** Total amount decompressed */
  totalAmount: bigint;
}

/** Decompress fee estimate */
export interface DecompressFeeEstimate {
  /** Network transaction fee (lamports) */
  networkFee: bigint;
  /** Rent for new token account if needed (lamports) */
  rentFee: bigint;
  /** Total fee (lamports) */
  totalFee: bigint;
  /** Will create new token account? */
  createsAccount: boolean;
}

// ============================================================================
// WALLET DECOMPRESS CLIENT
// ============================================================================

export class WalletDecompress {
  private connection: Connection;
  private programId: PublicKey;
  
  constructor(
    connection: Connection, 
    options?: { programId?: PublicKey; cluster?: 'mainnet-beta' | 'devnet' }
  ) {
    this.connection = connection;
    this.programId = options?.programId || 
      (options?.cluster === 'devnet' ? SPS_PROGRAM_ID_DEVNET : SPS_PROGRAM_ID);
  }
  
  /**
   * Decompress a single compressed token to SPL
   */
  async decompressToken(
    owner: Keypair,
    token: CompressedToken
  ): Promise<DecompressResult> {
    // Validate proof
    if (!this.verifyProof(token.commitment, token.proof)) {
      throw new Error('Invalid merkle proof');
    }
    
    // Generate nullifier
    const nullifier = this.generateNullifier(
      token.commitment,
      owner.publicKey,
      token.ownerSecret
    );
    
    // Check if already decompressed
    const isSpent = await this.isNullifierSpent(nullifier);
    if (isSpent) {
      throw new Error('Token already decompressed (nullifier spent)');
    }
    
    // Derive accounts
    const [poolPda] = PublicKey.findProgramAddressSync(
      [DECOMPRESS_SEEDS.POOL, token.mint.toBytes()],
      this.programId
    );
    
    // Get or create ATA
    const tokenAccount = await this.getOrCreateATA(owner, token.mint);
    
    // Build instruction
    const ix = this.buildDecompressInstruction(
      owner.publicKey,
      token,
      nullifier,
      poolPda,
      tokenAccount
    );
    
    // Send transaction
    const signature = await this.buildAndSend(owner, [ix]);
    
    return {
      signature,
      tokenAccount,
      amount: token.amount,
      nullifier,
    };
  }
  
  /**
   * Decompress multiple tokens in a single transaction
   * More efficient for airdrops
   */
  async batchDecompressTokens(
    owner: Keypair,
    tokens: CompressedToken[]
  ): Promise<BatchDecompressResult> {
    if (tokens.length > MAX_BATCH_SIZE) {
      throw new Error(`Maximum ${MAX_BATCH_SIZE} tokens per batch`);
    }
    
    if (tokens.length === 0) {
      throw new Error('No tokens to decompress');
    }
    
    const results: DecompressResult[] = [];
    const instructions: TransactionInstruction[] = [];
    let totalAmount = 0n;
    
    for (const token of tokens) {
      // Validate proof
      if (!this.verifyProof(token.commitment, token.proof)) {
        throw new Error(`Invalid proof for commitment ${Buffer.from(token.commitment).toString('hex').slice(0, 16)}...`);
      }
      
      // Generate nullifier
      const nullifier = this.generateNullifier(
        token.commitment,
        owner.publicKey,
        token.ownerSecret
      );
      
      // Check if already decompressed
      const isSpent = await this.isNullifierSpent(nullifier);
      if (isSpent) {
        console.warn(`Skipping already decompressed token: ${Buffer.from(token.commitment).toString('hex').slice(0, 16)}...`);
        continue;
      }
      
      // Derive pool
      const [poolPda] = PublicKey.findProgramAddressSync(
        [DECOMPRESS_SEEDS.POOL, token.mint.toBytes()],
        this.programId
      );
      
      // Get or create ATA
      const tokenAccount = await this.getOrCreateATA(owner, token.mint);
      
      // Build instruction
      const ix = this.buildDecompressInstruction(
        owner.publicKey,
        token,
        nullifier,
        poolPda,
        tokenAccount
      );
      
      instructions.push(ix);
      results.push({
        signature: '', // Will be filled after tx
        tokenAccount,
        amount: token.amount,
        nullifier,
      });
      totalAmount += token.amount;
    }
    
    if (instructions.length === 0) {
      throw new Error('All tokens already decompressed');
    }
    
    // Send transaction
    const signature = await this.buildAndSend(owner, instructions);
    
    // Update results with signature
    results.forEach(r => r.signature = signature);
    
    return {
      signature,
      results,
      totalAmount,
    };
  }
  
  /**
   * Estimate fees for decompression
   */
  async estimateDecompressFee(
    owner: PublicKey,
    mint: PublicKey
  ): Promise<DecompressFeeEstimate> {
    // Check if ATA exists
    const ata = this.deriveATA(owner, mint);
    const ataInfo = await this.connection.getAccountInfo(ata);
    const createsAccount = ataInfo === null;
    
    // Network fee (approximate)
    const networkFee = 5000n; // ~5000 lamports
    
    // Rent for new token account if needed
    const rentFee = createsAccount 
      ? BigInt(await this.connection.getMinimumBalanceForRentExemption(165))
      : 0n;
    
    return {
      networkFee,
      rentFee,
      totalFee: networkFee + rentFee,
      createsAccount,
    };
  }
  
  /**
   * Check if a commitment has already been decompressed
   */
  async isTokenDecompressed(
    commitment: Uint8Array,
    owner: PublicKey
  ): Promise<boolean> {
    const nullifier = this.generateNullifier(commitment, owner);
    return this.isNullifierSpent(nullifier);
  }
  
  /**
   * Get pool balance for a mint
   */
  async getPoolBalance(mint: PublicKey): Promise<bigint> {
    const [poolPda] = PublicKey.findProgramAddressSync(
      [DECOMPRESS_SEEDS.POOL, mint.toBytes()],
      this.programId
    );
    
    // Get pool token account
    const poolAta = this.deriveATA(poolPda, mint);
    
    try {
      const balance = await this.connection.getTokenAccountBalance(poolAta);
      return BigInt(balance.value.amount);
    } catch {
      return 0n;
    }
  }
  
  /**
   * Parse compressed token from claim URL
   * (For airdrops that provide claim links)
   */
  parseClaimUrl(url: string): CompressedToken | null {
    try {
      const parsed = new URL(url);
      
      // Extract parameters
      const mint = parsed.searchParams.get('m');
      const amount = parsed.searchParams.get('a');
      const commitment = parsed.searchParams.get('c');
      const proofData = parsed.searchParams.get('p');
      
      if (!mint || !amount || !commitment || !proofData) {
        return null;
      }
      
      const proof = this.decodeProof(proofData);
      
      return {
        mint: new PublicKey(mint),
        amount: BigInt(amount),
        commitment: Buffer.from(commitment, 'base64url'),
        proof,
      };
    } catch {
      return null;
    }
  }
  
  /**
   * Generate shareable claim URL
   */
  generateClaimUrl(
    baseUrl: string,
    token: CompressedToken
  ): string {
    const params = new URLSearchParams({
      m: token.mint.toBase58(),
      a: token.amount.toString(),
      c: Buffer.from(token.commitment).toString('base64url'),
      p: this.encodeProof(token.proof),
    });
    
    return `${baseUrl}/claim?${params.toString()}`;
  }
  
  // ==========================================================================
  // INTERNAL HELPERS
  // ==========================================================================
  
  private buildDecompressInstruction(
    owner: PublicKey,
    token: CompressedToken,
    nullifier: Uint8Array,
    poolPda: PublicKey,
    tokenAccount: PublicKey
  ): TransactionInstruction {
    // Encode instruction data
    const data = this.encodeDecompressData(token, nullifier);
    
    // Derive nullifier PDA
    const [nullifierPda] = PublicKey.findProgramAddressSync(
      [DECOMPRESS_SEEDS.NULLIFIER, nullifier],
      this.programId
    );
    
    // Derive state tree PDA
    const [statePda] = PublicKey.findProgramAddressSync(
      [DECOMPRESS_SEEDS.STATE, token.mint.toBytes()],
      this.programId
    );
    
    // Pool token account
    const poolAta = this.deriveATA(poolPda, token.mint);
    
    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: token.mint, isSigner: false, isWritable: false },
        { pubkey: statePda, isSigner: false, isWritable: true },
        { pubkey: nullifierPda, isSigner: false, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: false },
        { pubkey: poolAta, isSigner: false, isWritable: true },
        { pubkey: tokenAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });
  }
  
  private encodeDecompressData(token: CompressedToken, nullifier: Uint8Array): Buffer {
    const siblingsFlat = Buffer.concat(token.proof.siblings);
    const directions = Buffer.from(token.proof.directions);
    
    return Buffer.concat([
      Buffer.from([DOMAIN_IC, OP_DECOMPRESS]),
      this.bigintToBytes(token.amount, 8),
      Buffer.from(token.commitment),
      nullifier,
      Buffer.from([token.proof.siblings.length]),
      siblingsFlat,
      directions,
      this.intToBytes(token.proof.index, 4),
      Buffer.from(token.proof.root),
    ]);
  }
  
  private generateNullifier(
    commitment: Uint8Array,
    owner: PublicKey,
    secret?: Uint8Array
  ): Uint8Array {
    const data = Buffer.concat([
      Buffer.from(commitment),
      owner.toBytes(),
      secret || Buffer.alloc(0),
    ]);
    return keccak_256(data);
  }
  
  private verifyProof(commitment: Uint8Array, proof: MerkleProof): boolean {
    let computed = commitment;
    
    for (let i = 0; i < proof.siblings.length; i++) {
      const sibling = proof.siblings[i];
      const isRight = proof.directions[i] === 1;
      
      // Sort to ensure consistent ordering
      const [left, right] = isRight 
        ? [sibling, computed]
        : [computed, sibling];
      
      // Handle direction properly
      if (Buffer.compare(Buffer.from(left), Buffer.from(right)) > 0) {
        computed = keccak_256(Buffer.concat([right, left]));
      } else {
        computed = keccak_256(Buffer.concat([left, right]));
      }
    }
    
    return Buffer.from(computed).equals(Buffer.from(proof.root));
  }
  
  private async isNullifierSpent(nullifier: Uint8Array): Promise<boolean> {
    const [nullifierPda] = PublicKey.findProgramAddressSync(
      [DECOMPRESS_SEEDS.NULLIFIER, nullifier],
      this.programId
    );
    
    const info = await this.connection.getAccountInfo(nullifierPda);
    return info !== null;
  }
  
  private deriveATA(owner: PublicKey, mint: PublicKey): PublicKey {
    const [ata] = PublicKey.findProgramAddressSync(
      [owner.toBytes(), TOKEN_PROGRAM_ID.toBytes(), mint.toBytes()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    return ata;
  }
  
  private async getOrCreateATA(owner: Keypair, mint: PublicKey): Promise<PublicKey> {
    const ata = this.deriveATA(owner.publicKey, mint);
    
    // Check if exists
    const info = await this.connection.getAccountInfo(ata);
    if (info) {
      return ata;
    }
    
    // Would create ATA in production
    // For now, return derived address (instruction will fail if doesn't exist)
    return ata;
  }
  
  private encodeProof(proof: MerkleProof): string {
    const data = Buffer.concat([
      Buffer.from([proof.siblings.length]),
      ...proof.siblings,
      Buffer.from(proof.directions),
      this.intToBytes(proof.index, 4),
      Buffer.from(proof.root),
    ]);
    return data.toString('base64url');
  }
  
  private decodeProof(data: string): MerkleProof {
    const buf = Buffer.from(data, 'base64url');
    let offset = 0;
    
    const numSiblings = buf[offset++];
    
    const siblings: Uint8Array[] = [];
    for (let i = 0; i < numSiblings; i++) {
      siblings.push(buf.slice(offset, offset + 32));
      offset += 32;
    }
    
    const directions = Array.from(buf.slice(offset, offset + numSiblings));
    offset += numSiblings;
    
    const index = buf.readUInt32LE(offset);
    offset += 4;
    
    const root = buf.slice(offset, offset + 32);
    
    return { siblings, directions, index, root };
  }
  
  private async buildAndSend(signer: Keypair, ixs: TransactionInstruction[]): Promise<string> {
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    
    const message = new TransactionMessage({
      payerKey: signer.publicKey,
      recentBlockhash: blockhash,
      instructions: ixs,
    }).compileToV0Message();
    
    const tx = new VersionedTransaction(message);
    tx.sign([signer]);
    
    const sig = await this.connection.sendTransaction(tx, { skipPreflight: false });
    await this.connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });
    
    return sig;
  }
  
  private bigintToBytes(n: bigint, len: number): Buffer {
    const bytes = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = Number((n >> BigInt(i * 8)) & 0xffn);
    }
    return bytes;
  }
  
  private intToBytes(n: number, len: number): Buffer {
    const bytes = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = (n >> (i * 8)) & 0xff;
    }
    return bytes;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default WalletDecompress;
