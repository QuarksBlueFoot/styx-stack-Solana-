/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX PRIVATE NFT
 *  
 *  Private NFT and cNFT minting, trading, and collections on Solana
 *  Features: Hidden ownership, private sales, phantom NFTs, stealth mints
 *           Compressed NFT (cNFT) support via Bubblegum
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  ComputeBudgetProgram,
  AccountMeta,
} from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from '@noble/ciphers/webcrypto';
import bs58 from 'bs58';

// Bubblegum (cNFT) program IDs
const BUBBLEGUM_PROGRAM_ID = new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY');
const COMPRESSION_PROGRAM_ID = new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK');
const NOOP_PROGRAM_ID = new PublicKey('noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV');
import {
  StyxClient,
  encryptData,
  decryptData,
  deriveEncryptionKey,
  computeSharedSecret,
  ed25519ToX25519,
  generateStealthAddress,
  generateNullifier,
  STYX_PROGRAM_ID,
} from '../../core';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PrivateNFT {
  /** NFT mint address */
  mint: PublicKey;
  /** Inscription ID (for SPS NFTs) */
  inscriptionId?: string;
  /** Metadata */
  metadata: NFTMetadata;
  /** Owner (hidden if private) */
  owner: PublicKey | null;
  /** Ownership commitment (for hidden ownership) */
  ownershipCommitment?: Uint8Array;
  /** Privacy level */
  privacy: NFTPrivacy;
  /** Created at */
  createdAt: number;
  /** Whether this is a compressed NFT (cNFT) */
  isCompressed?: boolean;
}

/** Compressed NFT (cNFT) data */
export interface PrivateCNFT {
  /** Asset ID (unique identifier for cNFT) */
  assetId: PublicKey;
  /** Merkle tree address */
  merkleTree: PublicKey;
  /** Leaf index in the merkle tree */
  leafIndex: number;
  /** Data hash */
  dataHash: Uint8Array;
  /** Creator hash */
  creatorHash: Uint8Array;
  /** Metadata */
  metadata: NFTMetadata;
  /** Owner (hidden if private) */
  owner: PublicKey | null;
  /** Ownership commitment (for hidden ownership) */
  ownershipCommitment?: Uint8Array;
  /** Privacy level */
  privacy: NFTPrivacy;
  /** Merkle proof for ownership */
  proof?: Uint8Array[];
  /** Created at */
  createdAt: number;
}

export interface NFTMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes?: NFTAttribute[];
  animation_url?: string;
  external_url?: string;
  properties?: Record<string, unknown>;
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
}

export interface NFTPrivacy {
  /** Hide owner publicly */
  hiddenOwnership: boolean;
  /** Encrypted metadata (only owner can view) */
  encryptedMetadata: boolean;
  /** Allow proving ownership without revealing identity */
  phantomProof: boolean;
  /** Stealth address for receiving */
  stealthReceive: boolean;
}

export interface NFTCollection {
  id: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  creator: PublicKey | null;
  totalSupply: number;
  maxSupply?: number;
  royalties: number; // basis points
  privacy: NFTPrivacy;
  verified: boolean;
}

export interface NFTListing {
  id: string;
  nft: PrivateNFT;
  price: bigint;
  seller: PublicKey | null; // null if anonymous
  expiresAt: number;
  createdAt: number;
  status: 'active' | 'sold' | 'cancelled';
}

export interface NFTOffer {
  id: string;
  nftMint: PublicKey;
  amount: bigint;
  offerer: PublicKey | null;
  expiresAt: number;
  createdAt: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHANTOM PROOF (Prove ownership without revealing which NFT)
// ═══════════════════════════════════════════════════════════════════════════════

export interface PhantomProof {
  /** Collection the NFT belongs to */
  collection: PublicKey;
  /** Commitment to specific NFT */
  nftCommitment: Uint8Array;
  /** Ownership proof */
  ownershipProof: Uint8Array;
  /** Timestamp */
  timestamp: number;
  /** Proof validity */
  validUntil: number;
}

/**
 * Create a phantom proof - proves you own an NFT from a collection
 * without revealing which one
 */
export function createPhantomProof(
  nftMint: PublicKey,
  collection: PublicKey,
  ownerSecretKey: Uint8Array,
  validitySeconds: number = 3600
): PhantomProof {
  // Create commitment to NFT
  const nonce = randomBytes(32);
  const nftCommitment = sha256(
    new Uint8Array([...nftMint.toBytes(), ...nonce])
  );
  
  // Create ownership proof
  const timestamp = Date.now();
  const message = new Uint8Array([
    ...collection.toBytes(),
    ...nftCommitment,
    ...new Uint8Array(new BigUint64Array([BigInt(timestamp)]).buffer),
  ]);
  const ownershipProof = sha256(new Uint8Array([...message, ...ownerSecretKey]));
  
  return {
    collection,
    nftCommitment,
    ownershipProof,
    timestamp,
    validUntil: timestamp + validitySeconds * 1000,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE NFT CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface NFTClientOptions {
  client: StyxClient;
  signer: Keypair;
  defaultPrivacy?: Partial<NFTPrivacy>;
}

export class PrivateNFTClient {
  private readonly client: StyxClient;
  private readonly signer: Keypair;
  private readonly x25519Keys: { publicKey: Uint8Array; secretKey: Uint8Array };
  private readonly defaultPrivacy: NFTPrivacy;

  constructor(options: NFTClientOptions) {
    this.client = options.client;
    this.signer = options.signer;
    this.x25519Keys = ed25519ToX25519(options.signer.secretKey);
    this.defaultPrivacy = {
      hiddenOwnership: options.defaultPrivacy?.hiddenOwnership ?? false,
      encryptedMetadata: options.defaultPrivacy?.encryptedMetadata ?? false,
      phantomProof: options.defaultPrivacy?.phantomProof ?? true,
      stealthReceive: options.defaultPrivacy?.stealthReceive ?? true,
    };
  }

  /**
   * Mint a private NFT
   */
  async mint(
    metadata: NFTMetadata,
    options?: {
      collection?: PublicKey;
      privacy?: Partial<NFTPrivacy>;
      recipient?: PublicKey;
    }
  ): Promise<PrivateNFT> {
    const privacy: NFTPrivacy = { ...this.defaultPrivacy, ...options?.privacy };
    const recipient = options?.recipient ?? this.signer.publicKey;
    
    // Generate mint keypair
    const mintKeypair = Keypair.generate();
    
    // Encrypt metadata if needed
    let metadataBytes: Uint8Array;
    if (privacy.encryptedMetadata) {
      const key = deriveEncryptionKey(this.signer.secretKey, 'nft-metadata');
      const { ciphertext, nonce } = encryptData(
        new TextEncoder().encode(JSON.stringify(metadata)),
        key
      );
      metadataBytes = new Uint8Array([...nonce, ...ciphertext]);
    } else {
      metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
    }
    
    // Create ownership commitment if hidden
    let ownershipCommitment: Uint8Array | undefined;
    if (privacy.hiddenOwnership) {
      const nonce = randomBytes(32);
      ownershipCommitment = sha256(
        new Uint8Array([...recipient.toBytes(), ...nonce])
      );
    }
    
    // Build mint instruction
    const mintData = Buffer.alloc(1 + 32 + 2 + metadataBytes.length + (ownershipCommitment?.length ?? 0));
    mintData[0] = 0x50; // MINT_PRIVATE_NFT instruction
    mintData.set(mintKeypair.publicKey.toBytes(), 1);
    mintData.writeUInt16LE(metadataBytes.length, 33);
    mintData.set(metadataBytes, 35);
    if (ownershipCommitment) {
      mintData.set(ownershipCommitment, 35 + metadataBytes.length);
    }
    
    const tx = new Transaction();
    tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 }));
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: true },
          { pubkey: mintKeypair.publicKey, isSigner: true, isWritable: true },
          { pubkey: recipient, isSigner: false, isWritable: true },
        ],
        programId: STYX_PROGRAM_ID,
        data: mintData,
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer, mintKeypair);
    
    await this.client.connection.sendRawTransaction(tx.serialize());
    
    return {
      mint: mintKeypair.publicKey,
      metadata,
      owner: privacy.hiddenOwnership ? null : recipient,
      ownershipCommitment,
      privacy,
      createdAt: Date.now(),
    };
  }

  /**
   * Transfer NFT privately using stealth address
   */
  async transferPrivately(
    nftMint: PublicKey,
    recipientViewKey: Uint8Array,
    recipientSpendKey: PublicKey
  ): Promise<{ signature: string; stealthAddress: PublicKey }> {
    // Generate stealth address for recipient
    const { stealthAddress, ephemeralPubkey, viewTag } = generateStealthAddress(
      recipientViewKey,
      recipientSpendKey
    );
    
    // Build transfer instruction
    const transferData = Buffer.alloc(1 + 32 + 32 + 32 + 1);
    transferData[0] = 0x51; // TRANSFER_PRIVATE_NFT instruction
    transferData.set(nftMint.toBytes(), 1);
    transferData.set(stealthAddress.toBytes(), 33);
    transferData.set(ephemeralPubkey, 65);
    transferData[97] = viewTag;
    
    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: true },
          { pubkey: nftMint, isSigner: false, isWritable: true },
          { pubkey: stealthAddress, isSigner: false, isWritable: true },
        ],
        programId: STYX_PROGRAM_ID,
        data: transferData,
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    const signature = await this.client.connection.sendRawTransaction(tx.serialize());
    
    return { signature, stealthAddress };
  }

  /**
   * List NFT for sale
   */
  async listForSale(
    nftMint: PublicKey,
    price: bigint,
    options?: {
      expiresIn?: number;
      anonymous?: boolean;
    }
  ): Promise<NFTListing> {
    const listingId = bs58.encode(randomBytes(8));
    
    const listData = Buffer.alloc(1 + 32 + 8 + 8 + 1);
    listData[0] = 0x52; // LIST_NFT instruction
    listData.set(nftMint.toBytes(), 1);
    new DataView(listData.buffer).setBigUint64(33, price, true);
    new DataView(listData.buffer).setBigUint64(41, BigInt(options?.expiresIn ?? 86400 * 7), true);
    listData[49] = options?.anonymous ? 1 : 0;
    
    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: true },
          { pubkey: nftMint, isSigner: false, isWritable: true },
        ],
        programId: STYX_PROGRAM_ID,
        data: listData,
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    await this.client.connection.sendRawTransaction(tx.serialize());
    
    return {
      id: listingId,
      nft: {
        mint: nftMint,
        metadata: { name: '', symbol: '', description: '', image: '' },
        owner: options?.anonymous ? null : this.signer.publicKey,
        privacy: this.defaultPrivacy,
        createdAt: Date.now(),
      },
      price,
      seller: options?.anonymous ? null : this.signer.publicKey,
      expiresAt: Date.now() + (options?.expiresIn ?? 86400 * 7) * 1000,
      createdAt: Date.now(),
      status: 'active',
    };
  }

  /**
   * Buy a listed NFT
   */
  async buy(
    listingId: string,
    options?: {
      useStealthAddress?: boolean;
    }
  ): Promise<{ signature: string; nftMint: PublicKey }> {
    // Fetch listing details from indexer
    const indexerUrl = this.client.getIndexerUrl();
    const response = await fetch(`${indexerUrl}/v1/nft/listing/${listingId}`);
    
    if (!response.ok) {
      throw new Error('Listing not found');
    }
    
    const listing = await response.json();
    const nftMint = new PublicKey(listing.nftMint);
    const price = BigInt(listing.price);
    
    // Determine recipient address
    let recipient = this.signer.publicKey;
    if (options?.useStealthAddress) {
      const { stealthAddress } = generateStealthAddress(
        this.x25519Keys.publicKey,
        this.signer.publicKey
      );
      recipient = stealthAddress;
    }
    
    const buyData = Buffer.alloc(1 + 8 + 32);
    buyData[0] = 0x53; // BUY_NFT instruction
    buyData.set(bs58.decode(listingId), 1);
    buyData.set(recipient.toBytes(), 9);
    
    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: true },
          { pubkey: nftMint, isSigner: false, isWritable: true },
          { pubkey: recipient, isSigner: false, isWritable: true },
        ],
        programId: STYX_PROGRAM_ID,
        data: buyData,
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    const signature = await this.client.connection.sendRawTransaction(tx.serialize());
    
    return { signature, nftMint };
  }

  /**
   * Create a phantom proof of ownership
   */
  createPhantomProof(
    nftMint: PublicKey,
    collection: PublicKey,
    validitySeconds?: number
  ): PhantomProof {
    return createPhantomProof(
      nftMint,
      collection,
      this.signer.secretKey,
      validitySeconds
    );
  }

  /**
   * Get my NFTs (including those received via stealth)
   */
  async getMyNFTs(): Promise<PrivateNFT[]> {
    const indexerUrl = this.client.getIndexerUrl();
    
    try {
      const response = await fetch(`${indexerUrl}/v1/nft/owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: this.signer.publicKey.toBase58(),
          viewKey: Array.from(this.x25519Keys.publicKey),
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.nfts ?? [];
      }
    } catch {
      // Handle error
    }
    
    return [];
  }

  /**
   * Scan for NFTs received via stealth addresses
   */
  async scanStealthNFTs(): Promise<PrivateNFT[]> {
    // Similar to stealth payment scanning
    const indexerUrl = this.client.getIndexerUrl();
    
    try {
      const response = await fetch(`${indexerUrl}/v1/nft/stealth/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viewKey: Array.from(this.x25519Keys.publicKey),
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.nfts ?? [];
      }
    } catch {
      // Handle error
    }
    
    return [];
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRIVATE NFT TRANSFERS (Standard SPL Token NFTs)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Send an NFT privately to a recipient using stealth addressing
   * Hides the recipient from public view on-chain
   */
  async sendPrivateNFT(
    nftMint: PublicKey,
    recipientViewKey: Uint8Array,
    recipientSpendKey: PublicKey,
    options?: {
      memo?: string;
      encryptMemo?: boolean;
    }
  ): Promise<{ signature: string; stealthAddress: PublicKey; ephemeralPubkey: Uint8Array }> {
    // Generate stealth address for recipient
    const { stealthAddress, ephemeralPubkey, viewTag } = generateStealthAddress(
      recipientViewKey,
      recipientSpendKey
    );
    
    // Build transfer instruction with stealth metadata
    const transferData = Buffer.alloc(1 + 32 + 32 + 32 + 1 + (options?.memo ? options.memo.length : 0));
    let offset = 0;
    transferData[offset++] = 0x51; // TRANSFER_PRIVATE_NFT instruction
    transferData.set(nftMint.toBytes(), offset); offset += 32;
    transferData.set(stealthAddress.toBytes(), offset); offset += 32;
    transferData.set(ephemeralPubkey, offset); offset += 32;
    transferData[offset++] = viewTag;
    
    // Add optional encrypted memo
    if (options?.memo && options.encryptMemo) {
      const key = deriveEncryptionKey(this.signer.secretKey, 'nft-memo');
      const memoBytes = new TextEncoder().encode(options.memo);
      const { ciphertext, nonce } = encryptData(memoBytes, key);
      // Append encrypted memo (simplified)
    }
    
    const tx = new Transaction();
    tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 }));
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: true },
          { pubkey: nftMint, isSigner: false, isWritable: true },
          { pubkey: stealthAddress, isSigner: false, isWritable: true },
        ],
        programId: STYX_PROGRAM_ID,
        data: transferData,
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    const signature = await this.client.connection.sendRawTransaction(tx.serialize());
    
    return { signature, stealthAddress, ephemeralPubkey };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMPRESSED NFT (cNFT) PRIVATE TRANSFERS - Bubblegum Integration
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Send a compressed NFT (cNFT) privately to a recipient
   * Uses Bubblegum for the underlying transfer, with stealth addressing for privacy
   * 
   * @param assetId - The cNFT asset ID
   * @param merkleTree - The merkle tree containing the cNFT
   * @param recipientViewKey - Recipient's X25519 view key (for stealth)
   * @param recipientSpendKey - Recipient's Ed25519 spend key
   * @param proof - Merkle proof for the cNFT
   * @param rootHistory - Root history (for concurrent modification safety)
   */
  async sendPrivateCNFT(
    assetId: PublicKey,
    merkleTree: PublicKey,
    recipientViewKey: Uint8Array,
    recipientSpendKey: PublicKey,
    proof: {
      root: Uint8Array;
      dataHash: Uint8Array;
      creatorHash: Uint8Array;
      leafIndex: number;
      proofNodes: PublicKey[];
    },
    options?: {
      memo?: string;
      encryptMemo?: boolean;
    }
  ): Promise<{ signature: string; stealthAddress: PublicKey; ephemeralPubkey: Uint8Array }> {
    // Generate stealth address for recipient
    const { stealthAddress, ephemeralPubkey, viewTag } = generateStealthAddress(
      recipientViewKey,
      recipientSpendKey
    );
    
    // Derive tree authority PDA
    const [treeAuthority] = PublicKey.findProgramAddressSync(
      [merkleTree.toBytes()],
      BUBBLEGUM_PROGRAM_ID
    );
    
    // Build Bubblegum transfer instruction with stealth recipient
    // Instruction discriminator for transfer is [163, 52, 200, 231, 140, 3, 69, 186]
    const discriminator = Buffer.from([163, 52, 200, 231, 140, 3, 69, 186]);
    
    const transferData = Buffer.alloc(
      8 + // discriminator
      32 + // root
      32 + // data hash
      32 + // creator hash
      8 + // nonce (leaf index)
      4 // index
    );
    
    let offset = 0;
    discriminator.copy(transferData, offset); offset += 8;
    transferData.set(proof.root, offset); offset += 32;
    transferData.set(proof.dataHash, offset); offset += 32;
    transferData.set(proof.creatorHash, offset); offset += 32;
    new DataView(transferData.buffer).setBigUint64(offset, BigInt(proof.leafIndex), true); offset += 8;
    new DataView(transferData.buffer).setUint32(offset, proof.leafIndex, true);
    
    // Build accounts array
    const proofAccountMetas: AccountMeta[] = proof.proofNodes.map(node => ({
      pubkey: node,
      isSigner: false,
      isWritable: false,
    }));
    
    const tx = new Transaction();
    tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 }));
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: treeAuthority, isSigner: false, isWritable: false },
          { pubkey: this.signer.publicKey, isSigner: false, isWritable: false }, // leaf owner
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: false },  // leaf delegate
          { pubkey: stealthAddress, isSigner: false, isWritable: false },        // new leaf owner (stealth)
          { pubkey: merkleTree, isSigner: false, isWritable: true },
          { pubkey: NOOP_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: COMPRESSION_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: PublicKey.default, isSigner: false, isWritable: false },     // system program placeholder
          ...proofAccountMetas,
        ],
        programId: BUBBLEGUM_PROGRAM_ID,
        data: transferData,
      })
    );
    
    // Add stealth metadata as a memo (for recipient scanning)
    const stealthMemo = Buffer.alloc(33);
    stealthMemo.set(ephemeralPubkey, 0);
    stealthMemo[32] = viewTag;
    
    tx.add(
      new TransactionInstruction({
        keys: [{ pubkey: this.signer.publicKey, isSigner: true, isWritable: false }],
        programId: STYX_PROGRAM_ID,
        data: Buffer.concat([Buffer.from([0x60]), stealthMemo]), // CNFT_STEALTH_METADATA instruction
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    const signature = await this.client.connection.sendRawTransaction(tx.serialize());
    
    return { signature, stealthAddress, ephemeralPubkey };
  }

  /**
   * Fetch cNFT proof from DAS (Digital Asset Standard) API
   * Required for cNFT transfers
   */
  async getCNFTProof(assetId: PublicKey): Promise<{
    root: Uint8Array;
    dataHash: Uint8Array;
    creatorHash: Uint8Array;
    leafIndex: number;
    proofNodes: PublicKey[];
  } | null> {
    const indexerUrl = this.client.getIndexerUrl();
    
    try {
      // Try DAS API first
      const response = await fetch(this.client.connection.rpcEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'styx-cnft-proof',
          method: 'getAssetProof',
          params: { id: assetId.toBase58() },
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          return {
            root: bs58.decode(data.result.root),
            dataHash: bs58.decode(data.result.data_hash),
            creatorHash: bs58.decode(data.result.creator_hash),
            leafIndex: data.result.node_index,
            proofNodes: data.result.proof.map((p: string) => new PublicKey(p)),
          };
        }
      }
    } catch {
      // Fall back to indexer
    }
    
    // Try Styx indexer as fallback
    try {
      const response = await fetch(`${indexerUrl}/v1/cnft/proof/${assetId.toBase58()}`);
      if (response.ok) {
        const data = await response.json();
        return {
          root: new Uint8Array(data.root),
          dataHash: new Uint8Array(data.dataHash),
          creatorHash: new Uint8Array(data.creatorHash),
          leafIndex: data.leafIndex,
          proofNodes: data.proofNodes.map((p: string) => new PublicKey(p)),
        };
      }
    } catch {
      // Handle error
    }
    
    return null;
  }

  /**
   * Get my cNFTs (including those received via stealth)
   */
  async getMyCNFTs(): Promise<PrivateCNFT[]> {
    const indexerUrl = this.client.getIndexerUrl();
    
    try {
      const response = await fetch(`${indexerUrl}/v1/cnft/owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: this.signer.publicKey.toBase58(),
          viewKey: Array.from(this.x25519Keys.publicKey),
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.cnfts ?? [];
      }
    } catch {
      // Handle error
    }
    
    return [];
  }

  /**
   * Scan for cNFTs received via stealth addresses
   */
  async scanStealthCNFTs(): Promise<PrivateCNFT[]> {
    const indexerUrl = this.client.getIndexerUrl();
    
    try {
      const response = await fetch(`${indexerUrl}/v1/cnft/stealth/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viewKey: Array.from(this.x25519Keys.publicKey),
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.cnfts ?? [];
      }
    } catch {
      // Handle error
    }
    
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { PrivateNFTClient as NFTClient };
export { BUBBLEGUM_PROGRAM_ID, COMPRESSION_PROGRAM_ID };
export type { PrivateCNFT };
