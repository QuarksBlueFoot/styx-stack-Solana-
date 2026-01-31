/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX PRIVATE AIRDROP (WhisperDrop)
 *  
 *  Private airdrops on Solana with:
 *  - Merkle proof claims (cheap, scalable)
 *  - Token-gated eligibility
 *  - Time-locked releases
 *  - Anonymous claiming via stealth addresses
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha256';
import { keccak_256 } from '@noble/hashes/sha3';
import { randomBytes } from '@noble/ciphers/webcrypto';
import bs58 from 'bs58';
import {
  StyxClient,
  encryptData,
  generateStealthAddress,
  generateNullifier,
  WHISPERDROP_PROGRAM_ID,
} from '../../core';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Airdrop {
  /** Airdrop ID */
  id: string;
  /** Airdrop name */
  name: string;
  /** Description */
  description?: string;
  /** Creator */
  creator: PublicKey;
  /** Token mint being distributed */
  mint: PublicKey | null; // null for SOL
  /** Total tokens allocated */
  totalAmount: bigint;
  /** Claimed amount */
  claimedAmount: bigint;
  /** Number of recipients */
  recipientCount: number;
  /** Merkle root */
  merkleRoot: Uint8Array;
  /** Claim start time */
  startsAt: number;
  /** Claim end time */
  endsAt: number;
  /** Eligibility requirements */
  eligibility: EligibilityRequirement[];
  /** Privacy settings */
  privacy: AirdropPrivacy;
  /** Status */
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  /** Created at */
  createdAt: number;
}

export interface EligibilityRequirement {
  type: 
    | 'token_holder'     // Must hold SPL token
    | 'nft_holder'       // Must hold any NFT
    | 'collection_holder'// Must hold NFT from specific collection
    | 'cnft_holder'      // Must hold compressed NFT
    | 'cnft_collection'  // Must hold cNFT from specific collection
    | 'snapshot'         // Based on historical snapshot
    | 'allowlist'        // Explicit allowlist
    | 'custom';          // Custom verification logic
  
  /** Token/NFT mint for holder requirements */
  mint?: PublicKey;
  /** Collection address for collection_holder/cnft_collection */
  collection?: PublicKey;
  /** Minimum balance required */
  minBalance?: bigint;
  /** Minimum NFTs required from collection */
  minNFTCount?: number;
  /** Snapshot slot */
  snapshotSlot?: number;
  /** Specific trait requirements for NFT gating */
  traitRequirements?: TraitRequirement[];
  /** Description */
  description: string;
}

/** Trait requirement for NFT collection gating */
export interface TraitRequirement {
  trait_type: string;
  value?: string | number;
  values?: (string | number)[]; // Any of these values
  operator?: 'equals' | 'contains' | 'greater_than' | 'less_than';
}

/** Collection gating configuration */
export interface CollectionGate {
  /** Collection address (verified collection) */
  collection: PublicKey;
  /** Minimum NFTs required from this collection */
  minCount: number;
  /** Specific trait requirements */
  traits?: TraitRequirement[];
  /** Whether to include compressed NFTs (cNFTs) */
  includeCNFTs: boolean;
  /** Snapshot slot (optional - for historical gating) */
  snapshotSlot?: number;
}

export interface AirdropPrivacy {
  /** Hide claim amounts */
  hiddenAmounts: boolean;
  /** Allow anonymous claiming via stealth */
  stealthClaims: boolean;
  /** Hide recipient list */
  hiddenRecipients: boolean;
  /** Encrypt claim data */
  encryptedClaims: boolean;
}

export interface AirdropRecipient {
  /** Recipient address */
  address: PublicKey;
  /** Amount allocated */
  amount: bigint;
  /** Merkle proof */
  proof: Uint8Array[];
  /** Leaf index */
  index: number;
  /** Claimed status */
  claimed: boolean;
  /** Claim signature */
  claimSignature?: string;
}

export interface ClaimResult {
  /** Transaction signature */
  signature: string;
  /** Amount claimed */
  amount: bigint;
  /** Destination address (may be stealth) */
  destination: PublicKey;
  /** Timestamp */
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MERKLE TREE (for efficient airdrop claims)
// ═══════════════════════════════════════════════════════════════════════════════

export class AirdropMerkleTree {
  private leaves: Uint8Array[];
  private layers: Uint8Array[][];

  constructor(recipients: Array<{ address: PublicKey; amount: bigint }>) {
    // Create leaves
    this.leaves = recipients.map(({ address, amount }, index) => {
      const leaf = new Uint8Array(32 + 8 + 4);
      leaf.set(address.toBytes(), 0);
      new DataView(leaf.buffer).setBigUint64(32, amount, true);
      new DataView(leaf.buffer).setUint32(40, index, true);
      return keccak_256(leaf);
    });

    // Pad to power of 2
    while (this.leaves.length & (this.leaves.length - 1)) {
      this.leaves.push(new Uint8Array(32));
    }

    // Build tree
    this.layers = [this.leaves];
    let currentLayer = this.leaves;

    while (currentLayer.length > 1) {
      const nextLayer: Uint8Array[] = [];
      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        const right = currentLayer[i + 1];
        const combined = new Uint8Array(64);
        
        // Sort to ensure consistent ordering
        if (this.compareBytes(left, right) < 0) {
          combined.set(left, 0);
          combined.set(right, 32);
        } else {
          combined.set(right, 0);
          combined.set(left, 32);
        }
        
        nextLayer.push(keccak_256(combined));
      }
      this.layers.push(nextLayer);
      currentLayer = nextLayer;
    }
  }

  private compareBytes(a: Uint8Array, b: Uint8Array): number {
    for (let i = 0; i < 32; i++) {
      if (a[i] < b[i]) return -1;
      if (a[i] > b[i]) return 1;
    }
    return 0;
  }

  /**
   * Get the merkle root
   */
  getRoot(): Uint8Array {
    return this.layers[this.layers.length - 1][0];
  }

  /**
   * Get proof for a leaf index
   */
  getProof(index: number): Uint8Array[] {
    const proof: Uint8Array[] = [];
    let currentIndex = index;

    for (let i = 0; i < this.layers.length - 1; i++) {
      const layer = this.layers[i];
      const isRight = currentIndex % 2 === 1;
      const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;
      
      if (siblingIndex < layer.length) {
        proof.push(layer[siblingIndex]);
      }
      
      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }

  /**
   * Verify a proof
   */
  static verifyProof(
    leaf: Uint8Array,
    proof: Uint8Array[],
    root: Uint8Array
  ): boolean {
    let computed = leaf;

    for (const sibling of proof) {
      const combined = new Uint8Array(64);
      
      // Sort for consistent ordering
      const compareResult = computed.every((byte, i) => byte <= sibling[i]);
      if (compareResult) {
        combined.set(computed, 0);
        combined.set(sibling, 32);
      } else {
        combined.set(sibling, 0);
        combined.set(computed, 32);
      }
      
      computed = keccak_256(combined);
    }

    return computed.every((byte, i) => byte === root[i]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE AIRDROP CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface AirdropClientOptions {
  client: StyxClient;
  signer: Keypair;
}

export class PrivateAirdropClient {
  private readonly client: StyxClient;
  private readonly signer: Keypair;
  private trees: Map<string, AirdropMerkleTree> = new Map();

  constructor(options: AirdropClientOptions) {
    this.client = options.client;
    this.signer = options.signer;
  }

  /**
   * Create a new airdrop
   */
  async createAirdrop(options: {
    name: string;
    description?: string;
    mint?: PublicKey;
    recipients: Array<{ address: PublicKey; amount: bigint }>;
    startsAt?: number;
    endsAt?: number;
    eligibility?: EligibilityRequirement[];
    privacy?: Partial<AirdropPrivacy>;
  }): Promise<Airdrop> {
    const airdropId = bs58.encode(randomBytes(8));
    
    // Build merkle tree
    const tree = new AirdropMerkleTree(options.recipients);
    const merkleRoot = tree.getRoot();
    this.trees.set(airdropId, tree);
    
    // Calculate total amount
    const totalAmount = options.recipients.reduce((sum, r) => sum + r.amount, BigInt(0));
    
    const privacy: AirdropPrivacy = {
      hiddenAmounts: options.privacy?.hiddenAmounts ?? false,
      stealthClaims: options.privacy?.stealthClaims ?? true,
      hiddenRecipients: options.privacy?.hiddenRecipients ?? true,
      encryptedClaims: options.privacy?.encryptedClaims ?? false,
    };
    
    // Derive airdrop PDA
    const [airdropPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('whisperdrop'), this.signer.publicKey.toBytes(), bs58.decode(airdropId)],
      WHISPERDROP_PROGRAM_ID
    );
    
    // Build creation transaction
    const createData = Buffer.alloc(1 + 8 + 32 + 8 + 8 + 8 + 4 + 1);
    createData[0] = 0x01; // CREATE_AIRDROP instruction
    createData.set(bs58.decode(airdropId), 1);
    createData.set(merkleRoot, 9);
    new DataView(createData.buffer).setBigUint64(41, totalAmount, true);
    new DataView(createData.buffer).setBigUint64(49, BigInt(options.startsAt ?? Date.now()), true);
    new DataView(createData.buffer).setBigUint64(57, BigInt(options.endsAt ?? Date.now() + 30 * 24 * 60 * 60 * 1000), true);
    new DataView(createData.buffer).setUint32(65, options.recipients.length, true);
    createData[69] = (privacy.hiddenAmounts ? 1 : 0) | 
                      (privacy.stealthClaims ? 2 : 0) | 
                      (privacy.hiddenRecipients ? 4 : 0) | 
                      (privacy.encryptedClaims ? 8 : 0);
    
    const tx = new Transaction();
    tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 }));
    
    // Fund the airdrop (SOL transfer to PDA)
    if (!options.mint) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: this.signer.publicKey,
          toPubkey: airdropPda,
          lamports: totalAmount,
        })
      );
    }
    
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: true },
          { pubkey: airdropPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: WHISPERDROP_PROGRAM_ID,
        data: createData,
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    await this.client.connection.sendRawTransaction(tx.serialize());
    
    return {
      id: airdropId,
      name: options.name,
      description: options.description,
      creator: this.signer.publicKey,
      mint: options.mint ?? null,
      totalAmount,
      claimedAmount: BigInt(0),
      recipientCount: options.recipients.length,
      merkleRoot,
      startsAt: options.startsAt ?? Date.now(),
      endsAt: options.endsAt ?? Date.now() + 30 * 24 * 60 * 60 * 1000,
      eligibility: options.eligibility ?? [],
      privacy,
      status: 'active',
      createdAt: Date.now(),
    };
  }

  /**
   * Claim from an airdrop
   */
  async claim(
    airdropId: string,
    options?: {
      useStealth?: boolean;
      recipientViewKey?: Uint8Array;
      recipientSpendKey?: PublicKey;
    }
  ): Promise<ClaimResult> {
    // Fetch airdrop details
    const airdrop = await this.getAirdrop(airdropId);
    if (!airdrop) {
      throw new Error('Airdrop not found');
    }
    
    // Get our allocation and proof
    const allocation = await this.getAllocation(airdropId, this.signer.publicKey);
    if (!allocation) {
      throw new Error('Not eligible for this airdrop');
    }
    
    if (allocation.claimed) {
      throw new Error('Already claimed');
    }
    
    // Determine destination
    let destination = this.signer.publicKey;
    let ephemeralData: Uint8Array | undefined;
    
    if (options?.useStealth && options.recipientViewKey && options.recipientSpendKey) {
      const stealth = generateStealthAddress(
        options.recipientViewKey,
        options.recipientSpendKey
      );
      destination = stealth.stealthAddress;
      ephemeralData = new Uint8Array([...stealth.ephemeralPubkey, stealth.viewTag]);
    }
    
    // Create nullifier
    const nullifier = generateNullifier(
      new TextEncoder().encode(airdropId),
      this.signer.secretKey,
      'whisperdrop-claim'
    );
    
    // Serialize proof
    const proofBytes = allocation.proof.reduce((acc, p) => {
      const newAcc = new Uint8Array(acc.length + 32);
      newAcc.set(acc);
      newAcc.set(p, acc.length);
      return newAcc;
    }, new Uint8Array(0));
    
    // Build claim transaction
    const claimData = Buffer.alloc(1 + 8 + 32 + 4 + 8 + 4 + proofBytes.length + (ephemeralData?.length ?? 0));
    let offset = 0;
    claimData[offset++] = 0x02; // CLAIM instruction
    claimData.set(bs58.decode(airdropId), offset); offset += 8;
    claimData.set(nullifier, offset); offset += 32;
    new DataView(claimData.buffer).setUint32(offset, allocation.index, true); offset += 4;
    new DataView(claimData.buffer).setBigUint64(offset, allocation.amount, true); offset += 8;
    new DataView(claimData.buffer).setUint32(offset, allocation.proof.length, true); offset += 4;
    claimData.set(proofBytes, offset); offset += proofBytes.length;
    if (ephemeralData) {
      claimData.set(ephemeralData, offset);
    }
    
    // Derive airdrop PDA
    const [airdropPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('whisperdrop'), airdrop.creator.toBytes(), bs58.decode(airdropId)],
      WHISPERDROP_PROGRAM_ID
    );
    
    const tx = new Transaction();
    tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 }));
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: true },
          { pubkey: airdropPda, isSigner: false, isWritable: true },
          { pubkey: destination, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: WHISPERDROP_PROGRAM_ID,
        data: claimData,
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    const signature = await this.client.connection.sendRawTransaction(tx.serialize());
    
    return {
      signature,
      amount: allocation.amount,
      destination,
      timestamp: Date.now(),
    };
  }

  /**
   * Get airdrop details
   */
  async getAirdrop(airdropId: string): Promise<Airdrop | null> {
    const indexerUrl = this.client.getIndexerUrl();
    
    try {
      const response = await fetch(`${indexerUrl}/v1/airdrop/${airdropId}`);
      
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Handle error
    }
    
    return null;
  }

  /**
   * Get my allocation for an airdrop
   */
  async getAllocation(
    airdropId: string,
    address: PublicKey
  ): Promise<AirdropRecipient | null> {
    const indexerUrl = this.client.getIndexerUrl();
    
    try {
      const response = await fetch(`${indexerUrl}/v1/airdrop/${airdropId}/allocation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.toBase58() }),
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Handle error
    }
    
    return null;
  }

  /**
   * Check eligibility for an airdrop
   */
  async checkEligibility(airdropId: string): Promise<{
    eligible: boolean;
    amount: bigint;
    requirements: Array<{ requirement: EligibilityRequirement; met: boolean }>;
  }> {
    const allocation = await this.getAllocation(airdropId, this.signer.publicKey);
    
    if (allocation) {
      return {
        eligible: true,
        amount: allocation.amount,
        requirements: [],
      };
    }
    
    return {
      eligible: false,
      amount: BigInt(0),
      requirements: [],
    };
  }

  /**
   * Get all airdrops I can claim
   */
  async getClaimableAirdrops(): Promise<Airdrop[]> {
    const indexerUrl = this.client.getIndexerUrl();
    
    try {
      const response = await fetch(`${indexerUrl}/v1/airdrops/claimable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: this.signer.publicKey.toBase58() }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.airdrops ?? [];
      }
    } catch {
      // Handle error
    }
    
    return [];
  }

  /**
   * Get airdrops I created
   */
  async getMyAirdrops(): Promise<Airdrop[]> {
    const indexerUrl = this.client.getIndexerUrl();
    
    try {
      const response = await fetch(`${indexerUrl}/v1/airdrops/created`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creator: this.signer.publicKey.toBase58() }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.airdrops ?? [];
      }
    } catch {
      // Handle error
    }
    
    return [];
  }

  /**
   * Cancel an airdrop (reclaim remaining funds)
   */
  async cancelAirdrop(airdropId: string): Promise<string> {
    const airdrop = await this.getAirdrop(airdropId);
    if (!airdrop) {
      throw new Error('Airdrop not found');
    }
    
    if (airdrop.creator.toBase58() !== this.signer.publicKey.toBase58()) {
      throw new Error('Not the creator');
    }
    
    const [airdropPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('whisperdrop'), this.signer.publicKey.toBytes(), bs58.decode(airdropId)],
      WHISPERDROP_PROGRAM_ID
    );
    
    const cancelData = Buffer.alloc(1 + 8);
    cancelData[0] = 0x03; // CANCEL_AIRDROP instruction
    cancelData.set(bs58.decode(airdropId), 1);
    
    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: true },
          { pubkey: airdropPda, isSigner: false, isWritable: true },
        ],
        programId: WHISPERDROP_PROGRAM_ID,
        data: cancelData,
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    return await this.client.connection.sendRawTransaction(tx.serialize());
  }

  /**
   * Generate claim URL for sharing
   */
  generateClaimUrl(airdropId: string, baseUrl: string = 'https://drop.styxprivacy.app'): string {
    return `${baseUrl}/claim/${airdropId}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // COLLECTION GATING
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Create a collection-gated airdrop (WhisperDrop)
   * Only holders of specific NFT collections can claim
   */
  async createCollectionGatedAirdrop(options: {
    name: string;
    description?: string;
    mint?: PublicKey;
    totalAmount: bigint;
    amountPerClaim: bigint;
    maxClaims?: number;
    collectionGates: CollectionGate[];
    startsAt?: number;
    endsAt?: number;
    privacy?: Partial<AirdropPrivacy>;
  }): Promise<Airdrop> {
    const airdropId = bs58.encode(randomBytes(8));
    
    // Build eligibility from collection gates
    const eligibility: EligibilityRequirement[] = options.collectionGates.map(gate => ({
      type: gate.includeCNFTs ? 'cnft_collection' : 'collection_holder',
      collection: gate.collection,
      minNFTCount: gate.minCount,
      traitRequirements: gate.traits,
      snapshotSlot: gate.snapshotSlot,
      description: `Hold ${gate.minCount}+ NFT(s) from collection ${gate.collection.toBase58().slice(0, 8)}...`,
    }));
    
    const privacy: AirdropPrivacy = {
      hiddenAmounts: options.privacy?.hiddenAmounts ?? false,
      stealthClaims: options.privacy?.stealthClaims ?? true,
      hiddenRecipients: options.privacy?.hiddenRecipients ?? true,
      encryptedClaims: options.privacy?.encryptedClaims ?? false,
    };
    
    // Derive airdrop PDA
    const [airdropPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('whisperdrop'), this.signer.publicKey.toBytes(), bs58.decode(airdropId)],
      WHISPERDROP_PROGRAM_ID
    );
    
    // Serialize collection gate data
    const gateData = this.serializeCollectionGates(options.collectionGates);
    
    // Build creation transaction
    const createData = Buffer.alloc(1 + 8 + 8 + 8 + 4 + 8 + 8 + 1 + 2 + gateData.length);
    let offset = 0;
    createData[offset++] = 0x10; // CREATE_GATED_AIRDROP instruction
    createData.set(bs58.decode(airdropId), offset); offset += 8;
    new DataView(createData.buffer).setBigUint64(offset, options.totalAmount, true); offset += 8;
    new DataView(createData.buffer).setBigUint64(offset, options.amountPerClaim, true); offset += 8;
    new DataView(createData.buffer).setUint32(offset, options.maxClaims ?? 0, true); offset += 4;
    new DataView(createData.buffer).setBigUint64(offset, BigInt(options.startsAt ?? Date.now()), true); offset += 8;
    new DataView(createData.buffer).setBigUint64(offset, BigInt(options.endsAt ?? Date.now() + 30 * 24 * 60 * 60 * 1000), true); offset += 8;
    createData[offset++] = (privacy.hiddenAmounts ? 1 : 0) | 
                          (privacy.stealthClaims ? 2 : 0) | 
                          (privacy.hiddenRecipients ? 4 : 0) | 
                          (privacy.encryptedClaims ? 8 : 0);
    new DataView(createData.buffer).setUint16(offset, gateData.length, true); offset += 2;
    createData.set(gateData, offset);
    
    const tx = new Transaction();
    tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 }));
    
    // Fund the airdrop
    if (!options.mint) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: this.signer.publicKey,
          toPubkey: airdropPda,
          lamports: options.totalAmount,
        })
      );
    }
    
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: true },
          { pubkey: airdropPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: WHISPERDROP_PROGRAM_ID,
        data: createData,
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    await this.client.connection.sendRawTransaction(tx.serialize());
    
    return {
      id: airdropId,
      name: options.name,
      description: options.description,
      creator: this.signer.publicKey,
      mint: options.mint ?? null,
      totalAmount: options.totalAmount,
      claimedAmount: BigInt(0),
      recipientCount: options.maxClaims ?? 0,
      merkleRoot: new Uint8Array(32), // Not used for gated airdrops
      startsAt: options.startsAt ?? Date.now(),
      endsAt: options.endsAt ?? Date.now() + 30 * 24 * 60 * 60 * 1000,
      eligibility,
      privacy,
      status: 'active',
      createdAt: Date.now(),
    };
  }

  /**
   * Claim from a collection-gated airdrop
   * Requires proof of collection ownership (NFT or cNFT)
   */
  async claimGatedAirdrop(
    airdropId: string,
    ownershipProof: {
      /** NFT mint address (for standard NFTs) */
      nftMint?: PublicKey;
      /** cNFT asset ID (for compressed NFTs) */
      cnftAssetId?: PublicKey;
      /** cNFT merkle proof (if using cNFT) */
      cnftProof?: {
        root: Uint8Array;
        dataHash: Uint8Array;
        creatorHash: Uint8Array;
        leafIndex: number;
        proofNodes: PublicKey[];
      };
    },
    options?: {
      useStealth?: boolean;
      recipientViewKey?: Uint8Array;
      recipientSpendKey?: PublicKey;
    }
  ): Promise<ClaimResult> {
    const airdrop = await this.getAirdrop(airdropId);
    if (!airdrop) {
      throw new Error('Airdrop not found');
    }
    
    // Determine destination
    let destination = this.signer.publicKey;
    let ephemeralData: Uint8Array | undefined;
    
    if (options?.useStealth && options.recipientViewKey && options.recipientSpendKey) {
      const stealth = generateStealthAddress(
        options.recipientViewKey,
        options.recipientSpendKey
      );
      destination = stealth.stealthAddress;
      ephemeralData = new Uint8Array([...stealth.ephemeralPubkey, stealth.viewTag]);
    }
    
    // Create nullifier
    const nullifier = generateNullifier(
      new TextEncoder().encode(airdropId),
      this.signer.secretKey,
      'whisperdrop-gated-claim'
    );
    
    // Build claim instruction with ownership proof
    const proofData = ownershipProof.cnftProof 
      ? this.serializeCNFTProof(ownershipProof.cnftAssetId!, ownershipProof.cnftProof)
      : this.serializeNFTOwnership(ownershipProof.nftMint!);
    
    const claimData = Buffer.alloc(1 + 8 + 32 + 32 + 2 + proofData.length + (ephemeralData?.length ?? 0));
    let offset = 0;
    claimData[offset++] = 0x11; // CLAIM_GATED instruction
    claimData.set(bs58.decode(airdropId), offset); offset += 8;
    claimData.set(nullifier, offset); offset += 32;
    claimData.set(destination.toBytes(), offset); offset += 32;
    new DataView(claimData.buffer).setUint16(offset, proofData.length, true); offset += 2;
    claimData.set(proofData, offset); offset += proofData.length;
    if (ephemeralData) {
      claimData.set(ephemeralData, offset);
    }
    
    // Derive airdrop PDA
    const [airdropPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('whisperdrop'), airdrop.creator.toBytes(), bs58.decode(airdropId)],
      WHISPERDROP_PROGRAM_ID
    );
    
    const tx = new Transaction();
    tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 }));
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: true },
          { pubkey: airdropPda, isSigner: false, isWritable: true },
          { pubkey: destination, isSigner: false, isWritable: true },
          { pubkey: ownershipProof.nftMint ?? ownershipProof.cnftAssetId!, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: WHISPERDROP_PROGRAM_ID,
        data: claimData,
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    const signature = await this.client.connection.sendRawTransaction(tx.serialize());
    
    return {
      signature,
      amount: BigInt(0), // Will be filled by indexer
      destination,
      timestamp: Date.now(),
    };
  }

  /**
   * Verify if an address is eligible for a collection-gated airdrop
   */
  async verifyCollectionEligibility(
    airdropId: string,
    address?: PublicKey
  ): Promise<{
    eligible: boolean;
    ownedNFTs: Array<{ mint: PublicKey; collection: PublicKey; isCNFT: boolean }>;
    missingRequirements: string[];
  }> {
    const checkAddress = address ?? this.signer.publicKey;
    const airdrop = await this.getAirdrop(airdropId);
    
    if (!airdrop) {
      return { eligible: false, ownedNFTs: [], missingRequirements: ['Airdrop not found'] };
    }
    
    const indexerUrl = this.client.getIndexerUrl();
    
    try {
      const response = await fetch(`${indexerUrl}/v1/airdrop/${airdropId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: checkAddress.toBase58() }),
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Handle error
    }
    
    return { eligible: false, ownedNFTs: [], missingRequirements: ['Verification failed'] };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  private serializeCollectionGates(gates: CollectionGate[]): Uint8Array {
    const buffers: Uint8Array[] = [];
    
    for (const gate of gates) {
      // Collection address (32) + minCount (4) + includeCNFTs (1) + traits count (2) + traits
      const traitsData = gate.traits 
        ? this.serializeTraits(gate.traits) 
        : new Uint8Array(0);
      
      const gateBuffer = new Uint8Array(32 + 4 + 1 + 2 + traitsData.length + (gate.snapshotSlot ? 8 : 0));
      let offset = 0;
      gateBuffer.set(gate.collection.toBytes(), offset); offset += 32;
      new DataView(gateBuffer.buffer).setUint32(offset, gate.minCount, true); offset += 4;
      gateBuffer[offset++] = gate.includeCNFTs ? 1 : 0;
      new DataView(gateBuffer.buffer).setUint16(offset, gate.traits?.length ?? 0, true); offset += 2;
      if (traitsData.length > 0) {
        gateBuffer.set(traitsData, offset); offset += traitsData.length;
      }
      if (gate.snapshotSlot) {
        new DataView(gateBuffer.buffer).setBigUint64(offset, BigInt(gate.snapshotSlot), true);
      }
      
      buffers.push(gateBuffer);
    }
    
    // Combine with count header
    const totalLength = buffers.reduce((sum, b) => sum + b.length, 0);
    const result = new Uint8Array(2 + totalLength);
    new DataView(result.buffer).setUint16(0, gates.length, true);
    
    let offset = 2;
    for (const buffer of buffers) {
      result.set(buffer, offset);
      offset += buffer.length;
    }
    
    return result;
  }

  private serializeTraits(traits: TraitRequirement[]): Uint8Array {
    const encoder = new TextEncoder();
    const buffers: Uint8Array[] = [];
    
    for (const trait of traits) {
      const traitTypeBytes = encoder.encode(trait.trait_type);
      const valueBytes = trait.value !== undefined 
        ? encoder.encode(String(trait.value)) 
        : new Uint8Array(0);
      
      const buffer = new Uint8Array(1 + traitTypeBytes.length + 1 + valueBytes.length + 1);
      let offset = 0;
      buffer[offset++] = traitTypeBytes.length;
      buffer.set(traitTypeBytes, offset); offset += traitTypeBytes.length;
      buffer[offset++] = valueBytes.length;
      if (valueBytes.length > 0) {
        buffer.set(valueBytes, offset); offset += valueBytes.length;
      }
      buffer[offset++] = trait.operator === 'equals' ? 0 
        : trait.operator === 'contains' ? 1 
        : trait.operator === 'greater_than' ? 2 
        : trait.operator === 'less_than' ? 3 
        : 0;
      
      buffers.push(buffer);
    }
    
    const totalLength = buffers.reduce((sum, b) => sum + b.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
      result.set(buffer, offset);
      offset += buffer.length;
    }
    
    return result;
  }

  private serializeNFTOwnership(mint: PublicKey): Uint8Array {
    const buffer = new Uint8Array(1 + 32);
    buffer[0] = 0x00; // NFT proof type
    buffer.set(mint.toBytes(), 1);
    return buffer;
  }

  private serializeCNFTProof(
    assetId: PublicKey,
    proof: {
      root: Uint8Array;
      dataHash: Uint8Array;
      creatorHash: Uint8Array;
      leafIndex: number;
      proofNodes: PublicKey[];
    }
  ): Uint8Array {
    const proofNodesData = proof.proofNodes.reduce((acc, node) => {
      const newAcc = new Uint8Array(acc.length + 32);
      newAcc.set(acc);
      newAcc.set(node.toBytes(), acc.length);
      return newAcc;
    }, new Uint8Array(0));
    
    const buffer = new Uint8Array(1 + 32 + 32 + 32 + 32 + 4 + 2 + proofNodesData.length);
    let offset = 0;
    buffer[offset++] = 0x01; // cNFT proof type
    buffer.set(assetId.toBytes(), offset); offset += 32;
    buffer.set(proof.root, offset); offset += 32;
    buffer.set(proof.dataHash, offset); offset += 32;
    buffer.set(proof.creatorHash, offset); offset += 32;
    new DataView(buffer.buffer).setUint32(offset, proof.leafIndex, true); offset += 4;
    new DataView(buffer.buffer).setUint16(offset, proof.proofNodes.length, true); offset += 2;
    buffer.set(proofNodesData, offset);
    
    return buffer;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { PrivateAirdropClient as AirdropClient, AirdropMerkleTree as MerkleTree };
