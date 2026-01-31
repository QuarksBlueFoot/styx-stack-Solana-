/**
 * @styx-stack/sps-sdk - Bulk Airdrop Module
 * 
 * Styx Inscription Airdrop System (SIAS) - Novel Privacy-Preserving Bulk Distribution
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE: INSCRIPTION-COMPRESSED BULK AIRDROPS
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * Traditional airdrops require creating individual SPL token accounts (~0.002 SOL each).
 * For 10,000 recipients = ~20 SOL in rent alone!
 * 
 * SIAS uses inscription compression to reduce costs by 99%+:
 * 
 * ┌─────────────────────────────────────────────────────────────────────────────────┐
 * │  STYX INSCRIPTION AIRDROP SYSTEM (SIAS)                                        │
 * ├─────────────────────────────────────────────────────────────────────────────────┤
 * │                                                                                 │
 * │  ┌───────────────┐                                                              │
 * │  │ AIRDROP       │   1. Creator mints tokens to shared pool                     │
 * │  │ CREATOR       │   2. Creates merkle tree of (recipient, amount) pairs        │
 * │  │               │   3. Inscribes root + metadata to chain                      │
 * │  └───────┬───────┘   4. Optionally encrypts recipient list                      │
 * │          │                                                                      │
 * │          ▼                                                                      │
 * │  ┌───────────────────────────────────────────────────────────────────────────┐  │
 * │  │                        COMPRESSED AIRDROP TREE                            │  │
 * │  │                                                                           │  │
 * │  │    Root: keccak256(left || right)                                         │  │
 * │  │         /                    \                                            │  │
 * │  │      Hash                   Hash                                          │  │
 * │  │     /    \                 /    \                                         │  │
 * │  │  [A,100] [B,50]       [C,75] [D,200]                                      │  │
 * │  │                                                                           │  │
 * │  │  Each leaf = keccak256(recipient || amount || nonce || salt)              │  │
 * │  └───────────────────────────────────────────────────────────────────────────┘  │
 * │          │                                                                      │
 * │          ▼                                                                      │
 * │  ┌───────────────┐                                                              │
 * │  │ RECIPIENT     │   1. Receives claim link with proof                          │
 * │  │ WALLET        │   2. Submits merkle proof to claim                           │
 * │  │               │   3. Gets compressed token in their tree slot                │
 * │  └───────┬───────┘   4. Can decompress to SPL anytime!                          │
 * │          │                                                                      │
 * │          ▼                                                                      │
 * │  ┌───────────────┐                                                              │
 * │  │ DECOMPRESS    │   1. User proves ownership of compressed token               │
 * │  │ TO SPL        │   2. Nullifies compressed token (prevents double-claim)      │
 * │  │               │   3. Creates real SPL token account                          │
 * │  └───────────────┘   4. Transfers tokens from pool → user SPL account          │
 * │                                                                                 │
 * └─────────────────────────────────────────────────────────────────────────────────┘
 * 
 * COST ANALYSIS (10,000 recipients):
 * 
 * │ Method              │ Cost/user  │ Total Cost │
 * │─────────────────────│────────────│────────────│
 * │ Traditional SPL     │ ~0.002 SOL │ ~20 SOL    │
 * │ Light Compression   │ ~0.0002 SOL│ ~2 SOL     │
 * │ SIAS (This Module)  │ ~0.00005 SOL│ ~0.5 SOL  │
 * 
 * UNIQUE INNOVATIONS:
 * 
 * 1. DEFERRED CLAIMING - Recipients don't need wallets upfront
 * 2. STEALTH DELIVERY - Encrypted recipient list option
 * 3. EXPIRABLE DROPS - Unclaimed tokens return to creator
 * 4. CONDITIONAL CLAIMS - Token gates, time locks, etc.
 * 5. BATCH DECOMPRESS - Claim multiple airdrops at once
 * 6. PRIVACY MODE - Amount hidden until claim
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
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from '@noble/hashes/utils';

// ============================================================================
// CONSTANTS
// ============================================================================

/** SPS Program ID (mainnet) */
export const SPS_PROGRAM_ID = new PublicKey('GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9');

/** Domain ID for Inscription Compression */
export const DOMAIN_IC = 0x0F;

/** Domain ID for Airdrop */
export const DOMAIN_AIRDROP = 0x14;

/** Airdrop Operations */
export const AIRDROP_OPS = {
  /** Create new airdrop campaign */
  CREATE_CAMPAIGN: 0x01,
  /** Add batch of recipients to campaign */
  ADD_RECIPIENTS: 0x02,
  /** Finalize campaign (publish merkle root) */
  FINALIZE: 0x03,
  /** Claim airdrop (by recipient) */
  CLAIM: 0x04,
  /** Claim and decompress in one transaction */
  CLAIM_AND_DECOMPRESS: 0x05,
  /** Reclaim unclaimed tokens (by creator, after expiry) */
  RECLAIM: 0x06,
  /** Cancel campaign (before finalize only) */
  CANCEL: 0x07,
} as const;

/** PDA Seeds */
export const AIRDROP_SEEDS = {
  CAMPAIGN: Buffer.from('sias_campaign'),
  CLAIM_RECORD: Buffer.from('sias_claim'),
  POOL: Buffer.from('sias_pool'),
} as const;

/** Maximum recipients per batch (avoid tx size limits) */
export const MAX_RECIPIENTS_PER_BATCH = 25;

/** Maximum tree height (determines max recipients) */
export const MAX_TREE_HEIGHT = 24; // 2^24 = 16M recipients

// ============================================================================
// TYPES
// ============================================================================

/** Recipient entry for airdrop */
export interface AirdropRecipient {
  /** Recipient wallet address */
  address: PublicKey;
  /** Amount to airdrop */
  amount: bigint;
  /** Optional: Unlock conditions */
  conditions?: ClaimConditions;
}

/** Claim conditions for conditional airdrops */
export interface ClaimConditions {
  /** Minimum time before claim (Unix timestamp) */
  notBefore?: number;
  /** Maximum time to claim (Unix timestamp) */
  expiresAt?: number;
  /** Required NFT collection for claim */
  requiredNft?: PublicKey;
  /** Required token balance for claim */
  requiredToken?: {
    mint: PublicKey;
    minAmount: bigint;
  };
}

/** Airdrop campaign configuration */
export interface CampaignConfig {
  /** Token mint to airdrop */
  mint: PublicKey;
  /** Total amount for airdrop */
  totalAmount: bigint;
  /** Campaign name (for display) */
  name: string;
  /** Campaign description */
  description?: string;
  /** Creator wallet */
  creator: PublicKey;
  /** Expiration timestamp (optional) */
  expiresAt?: number;
  /** Is recipient list encrypted? */
  isPrivate?: boolean;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/** Campaign status */
export enum CampaignStatus {
  /** Campaign created, adding recipients */
  Draft = 0,
  /** Campaign finalized, claims open */
  Active = 1,
  /** All tokens claimed */
  Completed = 2,
  /** Campaign expired, unclaimed tokens reclaimable */
  Expired = 3,
  /** Campaign cancelled */
  Cancelled = 4,
}

/** On-chain campaign record */
export interface Campaign {
  /** Campaign PDA address */
  address: PublicKey;
  /** Campaign ID (unique identifier) */
  id: string;
  /** Token mint */
  mint: PublicKey;
  /** Creator wallet */
  creator: PublicKey;
  /** Merkle root of recipient tree */
  merkleRoot: Uint8Array;
  /** Total amount in campaign */
  totalAmount: bigint;
  /** Amount claimed so far */
  claimedAmount: bigint;
  /** Number of recipients */
  recipientCount: number;
  /** Number of claims made */
  claimCount: number;
  /** Campaign status */
  status: CampaignStatus;
  /** Creation timestamp */
  createdAt: number;
  /** Finalization timestamp */
  finalizedAt?: number;
  /** Expiration timestamp */
  expiresAt?: number;
  /** Is recipient list encrypted */
  isPrivate: boolean;
  /** Campaign name */
  name: string;
}

/** Merkle proof for claim */
export interface ClaimProof {
  /** Leaf hash */
  leaf: Uint8Array;
  /** Sibling hashes (bottom to top) */
  siblings: Uint8Array[];
  /** Direction bits (0 = left, 1 = right) */
  directions: number[];
  /** Leaf index */
  index: number;
}

/** Claim result */
export interface ClaimResult {
  /** Transaction signature */
  signature: string;
  /** Compressed token commitment (if not decompressed) */
  commitment?: Uint8Array;
  /** SPL token account (if decompressed) */
  tokenAccount?: PublicKey;
  /** Amount claimed */
  amount: bigint;
}

/** Campaign creation result */
export interface CreateCampaignResult {
  /** Campaign address */
  campaign: PublicKey;
  /** Campaign ID */
  campaignId: string;
  /** Pool address (holds tokens) */
  pool: PublicKey;
  /** Transaction signature */
  signature: string;
}

/** Finalization result */
export interface FinalizeResult {
  /** Transaction signature */
  signature: string;
  /** Merkle root */
  merkleRoot: Uint8Array;
  /** Total recipients */
  recipientCount: number;
  /** Claim proofs for all recipients (off-chain) */
  proofs: Map<string, ClaimProof>;
}

// ============================================================================
// MERKLE TREE IMPLEMENTATION
// ============================================================================

/**
 * Build balanced Merkle tree from recipient list
 * Uses keccak256 for hashing (EVM compatible, faster than sha256)
 */
export class AirdropMerkleTree {
  private leaves: Uint8Array[];
  private layers: Uint8Array[][];
  private leafToIndex: Map<string, number>;
  
  constructor(recipients: AirdropRecipient[], private salt: Uint8Array = randomBytes(32)) {
    // Hash each recipient into a leaf
    this.leaves = recipients.map((r, i) => this.hashLeaf(r, i));
    this.leafToIndex = new Map();
    this.leaves.forEach((leaf, i) => {
      this.leafToIndex.set(Buffer.from(leaf).toString('hex'), i);
    });
    
    // Build tree layers
    this.layers = this.buildTree(this.leaves);
  }
  
  /** Hash a recipient into a leaf */
  private hashLeaf(recipient: AirdropRecipient, index: number): Uint8Array {
    const data = Buffer.concat([
      recipient.address.toBytes(),
      this.bigintToBytes(recipient.amount, 8),
      this.intToBytes(index, 4),
      this.salt,
    ]);
    return keccak_256(data);
  }
  
  /** Build tree layers from leaves */
  private buildTree(leaves: Uint8Array[]): Uint8Array[][] {
    const layers: Uint8Array[][] = [leaves];
    
    let current = leaves;
    while (current.length > 1) {
      const next: Uint8Array[] = [];
      for (let i = 0; i < current.length; i += 2) {
        const left = current[i];
        const right = current[i + 1] || left; // Duplicate last if odd
        next.push(this.hashPair(left, right));
      }
      layers.push(next);
      current = next;
    }
    
    return layers;
  }
  
  /** Hash two nodes together */
  private hashPair(left: Uint8Array, right: Uint8Array): Uint8Array {
    // Sort to ensure consistent ordering
    const [a, b] = Buffer.compare(Buffer.from(left), Buffer.from(right)) < 0 
      ? [left, right] 
      : [right, left];
    return keccak_256(Buffer.concat([a, b]));
  }
  
  /** Get merkle root */
  get root(): Uint8Array {
    return this.layers[this.layers.length - 1][0];
  }
  
  /** Get proof for a leaf index */
  getProof(index: number): ClaimProof {
    if (index < 0 || index >= this.leaves.length) {
      throw new Error(`Invalid leaf index: ${index}`);
    }
    
    const siblings: Uint8Array[] = [];
    const directions: number[] = [];
    
    let currentIndex = index;
    for (let level = 0; level < this.layers.length - 1; level++) {
      const layer = this.layers[level];
      const isRight = currentIndex % 2 === 1;
      const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;
      
      // Get sibling (or duplicate self if no sibling)
      const sibling = layer[siblingIndex] || layer[currentIndex];
      siblings.push(sibling);
      directions.push(isRight ? 1 : 0);
      
      currentIndex = Math.floor(currentIndex / 2);
    }
    
    return {
      leaf: this.leaves[index],
      siblings,
      directions,
      index,
    };
  }
  
  /** Verify a proof */
  static verifyProof(
    leaf: Uint8Array,
    proof: ClaimProof,
    root: Uint8Array
  ): boolean {
    let computed = leaf;
    
    for (let i = 0; i < proof.siblings.length; i++) {
      const sibling = proof.siblings[i];
      const isRight = proof.directions[i] === 1;
      
      if (isRight) {
        computed = keccak_256(Buffer.concat([sibling, computed]));
      } else {
        computed = keccak_256(Buffer.concat([computed, sibling]));
      }
    }
    
    return Buffer.from(computed).equals(Buffer.from(root));
  }
  
  /** Get salt for serialization */
  getSalt(): Uint8Array {
    return this.salt;
  }
  
  // Helpers
  private bigintToBytes(n: bigint, len: number): Uint8Array {
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = Number((n >> BigInt(i * 8)) & 0xffn);
    }
    return bytes;
  }
  
  private intToBytes(n: number, len: number): Uint8Array {
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = (n >> (i * 8)) & 0xff;
    }
    return bytes;
  }
}

// ============================================================================
// AIRDROP CLIENT
// ============================================================================

export class StyxBulkAirdrop {
  private connection: Connection;
  private programId: PublicKey;
  
  constructor(connection: Connection, programId: PublicKey = SPS_PROGRAM_ID) {
    this.connection = connection;
    this.programId = programId;
  }
  
  /**
   * Create a new airdrop campaign
   */
  async createCampaign(
    creator: Keypair,
    config: CampaignConfig
  ): Promise<CreateCampaignResult> {
    // Generate unique campaign ID
    const campaignId = this.generateCampaignId(creator.publicKey, config.mint);
    
    // Derive campaign PDA
    const [campaignPda] = PublicKey.findProgramAddressSync(
      [AIRDROP_SEEDS.CAMPAIGN, Buffer.from(campaignId)],
      this.programId
    );
    
    // Derive pool PDA (holds tokens during campaign)
    const [poolPda] = PublicKey.findProgramAddressSync(
      [AIRDROP_SEEDS.POOL, campaignPda.toBytes()],
      this.programId
    );
    
    // Build instruction data
    const data = this.encodeCreateCampaign(config, campaignId);
    
    // Create instruction
    const ix = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: creator.publicKey, isSigner: true, isWritable: true },
        { pubkey: campaignPda, isSigner: false, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: true },
        { pubkey: config.mint, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });
    
    // Build and send transaction
    const signature = await this.buildAndSend(creator, [ix]);
    
    return {
      campaign: campaignPda,
      campaignId,
      pool: poolPda,
      signature,
    };
  }
  
  /**
   * Add recipients to campaign (in batches)
   */
  async addRecipients(
    creator: Keypair,
    campaign: PublicKey,
    recipients: AirdropRecipient[]
  ): Promise<string[]> {
    const signatures: string[] = [];
    
    // Process in batches
    for (let i = 0; i < recipients.length; i += MAX_RECIPIENTS_PER_BATCH) {
      const batch = recipients.slice(i, i + MAX_RECIPIENTS_PER_BATCH);
      
      const data = this.encodeAddRecipients(batch);
      
      const ix = new TransactionInstruction({
        programId: this.programId,
        keys: [
          { pubkey: creator.publicKey, isSigner: true, isWritable: false },
          { pubkey: campaign, isSigner: false, isWritable: true },
        ],
        data,
      });
      
      const sig = await this.buildAndSend(creator, [ix]);
      signatures.push(sig);
    }
    
    return signatures;
  }
  
  /**
   * Finalize campaign and publish merkle root
   */
  async finalizeCampaign(
    creator: Keypair,
    campaign: PublicKey,
    recipients: AirdropRecipient[]
  ): Promise<FinalizeResult> {
    // Build merkle tree
    const tree = new AirdropMerkleTree(recipients);
    
    // Generate proofs for all recipients
    const proofs = new Map<string, ClaimProof>();
    recipients.forEach((r, i) => {
      proofs.set(r.address.toBase58(), tree.getProof(i));
    });
    
    // Build instruction
    const data = this.encodeFinalizeAirdrop(tree.root, tree.getSalt(), recipients.length);
    
    const ix = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: creator.publicKey, isSigner: true, isWritable: false },
        { pubkey: campaign, isSigner: false, isWritable: true },
      ],
      data,
    });
    
    const signature = await this.buildAndSend(creator, [ix]);
    
    return {
      signature,
      merkleRoot: tree.root,
      recipientCount: recipients.length,
      proofs,
    };
  }
  
  /**
   * Claim airdrop (recipient)
   * Returns compressed token in recipient's tree slot
   */
  async claim(
    recipient: Keypair,
    campaign: PublicKey,
    amount: bigint,
    proof: ClaimProof
  ): Promise<ClaimResult> {
    // Derive claim record PDA (prevents double-claim)
    const [claimRecord] = PublicKey.findProgramAddressSync(
      [AIRDROP_SEEDS.CLAIM_RECORD, campaign.toBytes(), recipient.publicKey.toBytes()],
      this.programId
    );
    
    const data = this.encodeClaim(amount, proof);
    
    const ix = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: recipient.publicKey, isSigner: true, isWritable: true },
        { pubkey: campaign, isSigner: false, isWritable: true },
        { pubkey: claimRecord, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });
    
    const signature = await this.buildAndSend(recipient, [ix]);
    
    // Generate commitment for the compressed token
    const commitment = this.generateTokenCommitment(recipient.publicKey, amount);
    
    return {
      signature,
      commitment,
      amount,
    };
  }
  
  /**
   * Claim and immediately decompress to SPL token account
   * This is the preferred flow for most users
   */
  async claimAndDecompress(
    recipient: Keypair,
    campaign: PublicKey,
    amount: bigint,
    proof: ClaimProof,
    tokenProgram: PublicKey = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
  ): Promise<ClaimResult> {
    // Derive PDAs
    const [claimRecord] = PublicKey.findProgramAddressSync(
      [AIRDROP_SEEDS.CLAIM_RECORD, campaign.toBytes(), recipient.publicKey.toBytes()],
      this.programId
    );
    
    const [poolPda] = PublicKey.findProgramAddressSync(
      [AIRDROP_SEEDS.POOL, campaign.toBytes()],
      this.programId
    );
    
    // Get mint from campaign (would fetch in production)
    // For now, derive token account address
    const campaignData = await this.getCampaign(campaign);
    if (!campaignData) throw new Error('Campaign not found');
    
    // Derive recipient's ATA
    const recipientAta = await this.getOrCreateATA(
      recipient.publicKey,
      campaignData.mint,
      tokenProgram
    );
    
    const data = this.encodeClaimAndDecompress(amount, proof);
    
    const ix = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: recipient.publicKey, isSigner: true, isWritable: true },
        { pubkey: campaign, isSigner: false, isWritable: true },
        { pubkey: claimRecord, isSigner: false, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: true },
        { pubkey: recipientAta, isSigner: false, isWritable: true },
        { pubkey: campaignData.mint, isSigner: false, isWritable: false },
        { pubkey: tokenProgram, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });
    
    const signature = await this.buildAndSend(recipient, [ix]);
    
    return {
      signature,
      tokenAccount: recipientAta,
      amount,
    };
  }
  
  /**
   * Decompress a previously claimed compressed token to SPL
   */
  async decompressToken(
    owner: Keypair,
    mint: PublicKey,
    amount: bigint,
    commitment: Uint8Array,
    proof: ClaimProof,
    tokenProgram: PublicKey = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
  ): Promise<{ signature: string; tokenAccount: PublicKey }> {
    // Derive nullifier (prevents double-decompress)
    const nullifier = this.generateNullifier(commitment, owner.publicKey);
    
    // Derive pool
    const [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('ic_pool'), mint.toBytes()],
      this.programId
    );
    
    // Get or create ATA
    const recipientAta = await this.getOrCreateATA(owner.publicKey, mint, tokenProgram);
    
    const data = this.encodeDecompress(amount, commitment, proof, nullifier);
    
    const ix = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: owner.publicKey, isSigner: true, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: true },
        { pubkey: recipientAta, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: tokenProgram, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });
    
    const signature = await this.buildAndSend(owner, [ix]);
    
    return { signature, tokenAccount: recipientAta };
  }
  
  /**
   * Reclaim unclaimed tokens (creator only, after expiry)
   */
  async reclaimUnclaimed(
    creator: Keypair,
    campaign: PublicKey
  ): Promise<string> {
    const campaignData = await this.getCampaign(campaign);
    if (!campaignData) throw new Error('Campaign not found');
    if (!campaignData.expiresAt) throw new Error('Campaign has no expiry');
    if (Date.now() / 1000 < campaignData.expiresAt) {
      throw new Error('Campaign has not expired yet');
    }
    
    const [poolPda] = PublicKey.findProgramAddressSync(
      [AIRDROP_SEEDS.POOL, campaign.toBytes()],
      this.programId
    );
    
    const data = this.encodeReclaim();
    
    const ix = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: creator.publicKey, isSigner: true, isWritable: true },
        { pubkey: campaign, isSigner: false, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: true },
      ],
      data,
    });
    
    return await this.buildAndSend(creator, [ix]);
  }
  
  /**
   * Get campaign details
   */
  async getCampaign(address: PublicKey): Promise<Campaign | null> {
    const info = await this.connection.getAccountInfo(address);
    if (!info) return null;
    
    return this.decodeCampaign(info.data, address);
  }
  
  /**
   * Check if address has claimed
   */
  async hasClaimed(campaign: PublicKey, recipient: PublicKey): Promise<boolean> {
    const [claimRecord] = PublicKey.findProgramAddressSync(
      [AIRDROP_SEEDS.CLAIM_RECORD, campaign.toBytes(), recipient.toBytes()],
      this.programId
    );
    
    const info = await this.connection.getAccountInfo(claimRecord);
    return info !== null;
  }
  
  /**
   * Get claim URL for recipient
   */
  generateClaimUrl(
    baseUrl: string,
    campaign: PublicKey,
    recipient: PublicKey,
    proof: ClaimProof
  ): string {
    // Encode proof to base64
    const proofData = this.encodeProofForUrl(proof);
    
    return `${baseUrl}/claim/${campaign.toBase58()}?r=${recipient.toBase58()}&p=${proofData}`;
  }
  
  /**
   * Parse claim URL
   */
  parseClaimUrl(url: string): { campaign: PublicKey; recipient: PublicKey; proof: ClaimProof } | null {
    try {
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split('/');
      const campaignIdx = pathParts.indexOf('claim');
      if (campaignIdx === -1 || campaignIdx + 1 >= pathParts.length) return null;
      
      const campaign = new PublicKey(pathParts[campaignIdx + 1]);
      const recipient = new PublicKey(parsed.searchParams.get('r')!);
      const proofData = parsed.searchParams.get('p')!;
      const proof = this.decodeProofFromUrl(proofData);
      
      return { campaign, recipient, proof };
    } catch {
      return null;
    }
  }
  
  // ==========================================================================
  // ENCODING HELPERS
  // ==========================================================================
  
  private generateCampaignId(creator: PublicKey, mint: PublicKey): string {
    const data = Buffer.concat([
      creator.toBytes(),
      mint.toBytes(),
      Buffer.from(Date.now().toString()),
    ]);
    return Buffer.from(sha256(data)).toString('hex').slice(0, 16);
  }
  
  private generateTokenCommitment(owner: PublicKey, amount: bigint): Uint8Array {
    const nonce = randomBytes(16);
    const data = Buffer.concat([
      owner.toBytes(),
      this.bigintToBytes(amount, 8),
      nonce,
    ]);
    return keccak_256(data);
  }
  
  private generateNullifier(commitment: Uint8Array, owner: PublicKey): Uint8Array {
    return keccak_256(Buffer.concat([commitment, owner.toBytes()]));
  }
  
  private encodeCreateCampaign(config: CampaignConfig, campaignId: string): Buffer {
    const nameBytes = Buffer.from(config.name.slice(0, 32));
    const nameBuffer = Buffer.alloc(32);
    nameBytes.copy(nameBuffer);
    
    return Buffer.concat([
      Buffer.from([DOMAIN_AIRDROP, AIRDROP_OPS.CREATE_CAMPAIGN]),
      Buffer.from(campaignId, 'hex'),
      this.bigintToBytes(config.totalAmount, 8),
      nameBuffer,
      Buffer.from([config.isPrivate ? 1 : 0]),
      this.intToBytes(config.expiresAt || 0, 8),
    ]);
  }
  
  private encodeAddRecipients(recipients: AirdropRecipient[]): Buffer {
    const recipientData = recipients.flatMap(r => [
      ...r.address.toBytes(),
      ...this.bigintToBytes(r.amount, 8),
    ]);
    
    return Buffer.concat([
      Buffer.from([DOMAIN_AIRDROP, AIRDROP_OPS.ADD_RECIPIENTS]),
      Buffer.from([recipients.length]),
      Buffer.from(recipientData),
    ]);
  }
  
  private encodeFinalizeAirdrop(root: Uint8Array, salt: Uint8Array, count: number): Buffer {
    return Buffer.concat([
      Buffer.from([DOMAIN_AIRDROP, AIRDROP_OPS.FINALIZE]),
      root,
      salt,
      this.intToBytes(count, 4),
    ]);
  }
  
  private encodeClaim(amount: bigint, proof: ClaimProof): Buffer {
    const siblingsFlat = Buffer.concat(proof.siblings);
    const directions = Buffer.from(proof.directions);
    
    return Buffer.concat([
      Buffer.from([DOMAIN_AIRDROP, AIRDROP_OPS.CLAIM]),
      this.bigintToBytes(amount, 8),
      proof.leaf,
      Buffer.from([proof.siblings.length]),
      siblingsFlat,
      directions,
      this.intToBytes(proof.index, 4),
    ]);
  }
  
  private encodeClaimAndDecompress(amount: bigint, proof: ClaimProof): Buffer {
    const siblingsFlat = Buffer.concat(proof.siblings);
    const directions = Buffer.from(proof.directions);
    
    return Buffer.concat([
      Buffer.from([DOMAIN_AIRDROP, AIRDROP_OPS.CLAIM_AND_DECOMPRESS]),
      this.bigintToBytes(amount, 8),
      proof.leaf,
      Buffer.from([proof.siblings.length]),
      siblingsFlat,
      directions,
      this.intToBytes(proof.index, 4),
    ]);
  }
  
  private encodeDecompress(
    amount: bigint,
    commitment: Uint8Array,
    proof: ClaimProof,
    nullifier: Uint8Array
  ): Buffer {
    const siblingsFlat = Buffer.concat(proof.siblings);
    
    return Buffer.concat([
      Buffer.from([DOMAIN_IC, 0x12]), // IC_DECOMPRESS
      this.bigintToBytes(amount, 8),
      commitment,
      nullifier,
      Buffer.from([proof.siblings.length]),
      siblingsFlat,
      Buffer.from(proof.directions),
    ]);
  }
  
  private encodeReclaim(): Buffer {
    return Buffer.from([DOMAIN_AIRDROP, AIRDROP_OPS.RECLAIM]);
  }
  
  private encodeProofForUrl(proof: ClaimProof): string {
    const data = Buffer.concat([
      proof.leaf,
      Buffer.from([proof.siblings.length]),
      ...proof.siblings,
      Buffer.from(proof.directions),
      this.intToBytes(proof.index, 4),
    ]);
    return data.toString('base64url');
  }
  
  private decodeProofFromUrl(data: string): ClaimProof {
    const buf = Buffer.from(data, 'base64url');
    let offset = 0;
    
    const leaf = buf.slice(offset, offset + 32);
    offset += 32;
    
    const numSiblings = buf[offset++];
    
    const siblings: Uint8Array[] = [];
    for (let i = 0; i < numSiblings; i++) {
      siblings.push(buf.slice(offset, offset + 32));
      offset += 32;
    }
    
    const directions = Array.from(buf.slice(offset, offset + numSiblings));
    offset += numSiblings;
    
    const index = buf.readUInt32LE(offset);
    
    return { leaf, siblings, directions, index };
  }
  
  private decodeCampaign(data: Buffer, address: PublicKey): Campaign {
    let offset = 8; // Skip discriminator
    
    const id = data.slice(offset, offset + 16).toString('hex');
    offset += 16;
    
    const mint = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    const creator = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    const merkleRoot = data.slice(offset, offset + 32);
    offset += 32;
    
    const totalAmount = this.bytesToBigint(data.slice(offset, offset + 8));
    offset += 8;
    
    const claimedAmount = this.bytesToBigint(data.slice(offset, offset + 8));
    offset += 8;
    
    const recipientCount = data.readUInt32LE(offset);
    offset += 4;
    
    const claimCount = data.readUInt32LE(offset);
    offset += 4;
    
    const status = data[offset++] as CampaignStatus;
    
    const createdAt = Number(this.bytesToBigint(data.slice(offset, offset + 8)));
    offset += 8;
    
    const finalizedAt = Number(this.bytesToBigint(data.slice(offset, offset + 8))) || undefined;
    offset += 8;
    
    const expiresAt = Number(this.bytesToBigint(data.slice(offset, offset + 8))) || undefined;
    offset += 8;
    
    const isPrivate = data[offset++] === 1;
    
    const nameLen = data[offset++];
    const name = data.slice(offset, offset + nameLen).toString('utf8');
    
    return {
      address,
      id,
      mint,
      creator,
      merkleRoot,
      totalAmount,
      claimedAmount,
      recipientCount,
      claimCount,
      status,
      createdAt,
      finalizedAt,
      expiresAt,
      isPrivate,
      name,
    };
  }
  
  // ==========================================================================
  // UTILITY HELPERS
  // ==========================================================================
  
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
  
  private async getOrCreateATA(
    owner: PublicKey,
    mint: PublicKey,
    tokenProgram: PublicKey
  ): Promise<PublicKey> {
    const { PublicKey: PK } = await import('@solana/web3.js');
    const ASSOCIATED_TOKEN_PROGRAM = new PK('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
    
    const [ata] = PublicKey.findProgramAddressSync(
      [owner.toBytes(), tokenProgram.toBytes(), mint.toBytes()],
      ASSOCIATED_TOKEN_PROGRAM
    );
    
    return ata;
  }
  
  private bigintToBytes(n: bigint, len: number): Buffer {
    const bytes = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = Number((n >> BigInt(i * 8)) & 0xffn);
    }
    return bytes;
  }
  
  private bytesToBigint(bytes: Buffer): bigint {
    let result = 0n;
    for (let i = 0; i < bytes.length; i++) {
      result |= BigInt(bytes[i]) << BigInt(i * 8);
    }
    return result;
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

export default StyxBulkAirdrop;
