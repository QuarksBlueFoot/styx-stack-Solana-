/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX INSCRIPTION COMPRESSION ADAPTER
 *  
 *  Privacy-aware compression and inscription support for Solana
 *  - View and manage compressed SPL tokens
 *  - Inscription-based metadata storage
 *  - ZK-Compression for state trees (Light Protocol)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { PublicKey, Connection, TransactionInstruction } from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha256';

// Program IDs for compression and inscriptions
const LIGHT_PROTOCOL_PROGRAM_ID = new PublicKey('LitKFPdP9UYzH69xJ3MZTvY1U3TQYwPjhZ9SvR1nHtC');
const INSCRIPTION_PROGRAM_ID = new PublicKey('insc4R6e2eMY5E6w2U3fEJZbqPkYn2G3K8bQb7qQz1N');
const COMPRESSED_TOKEN_PROGRAM_ID = new PublicKey('cTokenmWW8bLPjZEBAUgYy3zKxQZW6VKi7bqNFEVv3m');

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CompressedRoot {
  root: Uint8Array;
  leafCount: number;
  depth: number;
  timestamp: number;
}

export interface MembershipProof {
  leaf: Uint8Array;
  path: Uint8Array[];
  indices: number[];
  root: Uint8Array;
}

export interface CompressedStateProvider {
  getRoot(namespace: PublicKey): Promise<CompressedRoot | null>;
  getProof(namespace: PublicKey, leafHash: Uint8Array): Promise<MembershipProof | null>;
  updateLeaf(namespace: PublicKey, oldLeaf: Uint8Array, newLeaf: Uint8Array): Promise<CompressedRoot>;
  appendLeaf(namespace: PublicKey, leaf: Uint8Array): Promise<CompressedRoot>;
}

export interface CompressionConfig {
  /** Light Protocol RPC endpoint */
  lightRpcUrl?: string;
  /** Use ZK-Compression for state */
  useCompression: boolean;
  /** Maximum tree depth */
  maxDepth: number;
  /** Canopy depth for on-chain storage */
  canopyDepth: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MERKLE TREE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

const EMPTY_LEAF = new Uint8Array(32).fill(0);

/**
 * Compute leaf hash for membership proofs
 */
export function computeLeafHash(args: {
  namespace: PublicKey;
  key: Uint8Array;
  value: Uint8Array;
}): Uint8Array {
  const prefix = new TextEncoder().encode('styx-leaf-v1');
  const namespaceBytes = args.namespace.toBytes();
  
  const combined = new Uint8Array(
    prefix.length + namespaceBytes.length + args.key.length + args.value.length
  );
  let offset = 0;
  combined.set(prefix, offset); offset += prefix.length;
  combined.set(namespaceBytes, offset); offset += namespaceBytes.length;
  combined.set(args.key, offset); offset += args.key.length;
  combined.set(args.value, offset);
  
  return sha256(combined);
}

/**
 * Hash two nodes together for Merkle tree
 */
export function hashNodes(left: Uint8Array, right: Uint8Array): Uint8Array {
  const prefix = new TextEncoder().encode('styx-node-v1');
  const combined = new Uint8Array(prefix.length + 64);
  combined.set(prefix, 0);
  combined.set(left, prefix.length);
  combined.set(right, prefix.length + 32);
  return sha256(combined);
}

/**
 * Verify a membership proof against a root
 */
export function verifyMembershipProof(
  proof: MembershipProof,
  expectedRoot: Uint8Array
): boolean {
  let current = proof.leaf;
  
  for (let i = 0; i < proof.path.length; i++) {
    const sibling = proof.path[i];
    const isLeft = (proof.indices[i] & 1) === 0;
    
    if (isLeft) {
      current = hashNodes(current, sibling);
    } else {
      current = hashNodes(sibling, current);
    }
  }
  
  return current.every((b, i) => b === expectedRoot[i]);
}

/**
 * Generate empty tree root of given depth
 */
export function getEmptyTreeRoot(depth: number): Uint8Array {
  let current = EMPTY_LEAF;
  for (let i = 0; i < depth; i++) {
    current = hashNodes(current, current);
  }
  return current;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY MERKLE TREE
// ═══════════════════════════════════════════════════════════════════════════════

export class InMemoryMerkleTree {
  private leaves: Uint8Array[] = [];
  private readonly depth: number;
  private cache: Map<string, Uint8Array> = new Map();
  
  constructor(depth: number = 20) {
    this.depth = depth;
  }
  
  get leafCount(): number {
    return this.leaves.length;
  }
  
  get root(): Uint8Array {
    return this.computeRoot();
  }
  
  private computeRoot(): Uint8Array {
    const maxLeaves = 2 ** this.depth;
    if (this.leaves.length === 0) {
      return getEmptyTreeRoot(this.depth);
    }
    
    // Pad leaves to power of 2
    const paddedLeaves = [...this.leaves];
    while (paddedLeaves.length < maxLeaves && paddedLeaves.length & (paddedLeaves.length - 1)) {
      paddedLeaves.push(EMPTY_LEAF);
    }
    
    let level = paddedLeaves;
    for (let d = 0; d < this.depth && level.length > 1; d++) {
      const nextLevel: Uint8Array[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] || EMPTY_LEAF;
        nextLevel.push(hashNodes(left, right));
      }
      level = nextLevel;
    }
    
    return level[0] || getEmptyTreeRoot(this.depth);
  }
  
  append(leaf: Uint8Array): number {
    const index = this.leaves.length;
    this.leaves.push(leaf);
    this.cache.clear();
    return index;
  }
  
  update(index: number, leaf: Uint8Array): void {
    if (index >= this.leaves.length) {
      throw new Error(`Leaf index ${index} out of bounds`);
    }
    this.leaves[index] = leaf;
    this.cache.clear();
  }
  
  getProof(index: number): MembershipProof {
    if (index >= this.leaves.length) {
      throw new Error(`Leaf index ${index} out of bounds`);
    }
    
    const path: Uint8Array[] = [];
    const indices: number[] = [];
    
    // Build proof path
    let level = [...this.leaves];
    let currentIndex = index;
    
    for (let d = 0; d < this.depth && level.length > 1; d++) {
      const siblingIndex = currentIndex ^ 1;
      path.push(level[siblingIndex] || EMPTY_LEAF);
      indices.push(currentIndex);
      
      const nextLevel: Uint8Array[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] || EMPTY_LEAF;
        nextLevel.push(hashNodes(left, right));
      }
      level = nextLevel;
      currentIndex = Math.floor(currentIndex / 2);
    }
    
    return {
      leaf: this.leaves[index],
      path,
      indices,
      root: this.root,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPRESSION CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

export class CompressionClient implements CompressedStateProvider {
  private trees: Map<string, InMemoryMerkleTree> = new Map();
  private connection: Connection;
  private config: CompressionConfig;
  
  constructor(connection: Connection, config?: Partial<CompressionConfig>) {
    this.connection = connection;
    this.config = {
      useCompression: true,
      maxDepth: 20,
      canopyDepth: 10,
      ...config,
    };
  }
  
  private getTree(namespace: PublicKey): InMemoryMerkleTree {
    const key = namespace.toBase58();
    if (!this.trees.has(key)) {
      this.trees.set(key, new InMemoryMerkleTree(this.config.maxDepth));
    }
    return this.trees.get(key)!;
  }
  
  async getRoot(namespace: PublicKey): Promise<CompressedRoot | null> {
    const tree = this.getTree(namespace);
    return {
      root: tree.root,
      leafCount: tree.leafCount,
      depth: this.config.maxDepth,
      timestamp: Date.now(),
    };
  }
  
  async getProof(namespace: PublicKey, leafHash: Uint8Array): Promise<MembershipProof | null> {
    const tree = this.getTree(namespace);
    // Find leaf index by hash (in production, use index lookup)
    // For now, return null if not found
    return null;
  }
  
  async updateLeaf(
    namespace: PublicKey,
    oldLeaf: Uint8Array,
    newLeaf: Uint8Array
  ): Promise<CompressedRoot> {
    const tree = this.getTree(namespace);
    // In production, find index by old leaf hash
    // For now, just append
    tree.append(newLeaf);
    return this.getRoot(namespace) as Promise<CompressedRoot>;
  }
  
  async appendLeaf(namespace: PublicKey, leaf: Uint8Array): Promise<CompressedRoot> {
    const tree = this.getTree(namespace);
    tree.append(leaf);
    return this.getRoot(namespace) as Promise<CompressedRoot>;
  }
  
  /**
   * Create compressed token account
   */
  async createCompressedTokenAccount(args: {
    mint: PublicKey;
    owner: PublicKey;
  }): Promise<TransactionInstruction[]> {
    // Would integrate with Light Protocol / ZK-Compression
    // For now, return placeholder
    return [];
  }
  
  /**
   * Transfer compressed tokens
   */
  async transferCompressed(args: {
    mint: PublicKey;
    from: PublicKey;
    to: PublicKey;
    amount: bigint;
    proof: MembershipProof;
  }): Promise<TransactionInstruction[]> {
    // Would integrate with Light Protocol
    return [];
  }
  
  /**
   * Decompress tokens to regular SPL
   */
  async decompress(args: {
    mint: PublicKey;
    owner: PublicKey;
    amount: bigint;
    proof: MembershipProof;
  }): Promise<TransactionInstruction[]> {
    // Would integrate with Light Protocol
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIGHT PROTOCOL HINTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface LightHint {
  assetId: PublicKey;
  stateHash: Uint8Array;
  proof: MembershipProof;
}

/**
 * Fetch Light Protocol hints for compressed assets
 */
export async function fetchLightHints(
  rpcUrl: string,
  owner: PublicKey
): Promise<LightHint[]> {
  // Would call Light Protocol indexer
  return [];
}

/**
 * Validate compressed state proof
 */
export function validateCompressedProof(
  proof: MembershipProof,
  expectedRoot: Uint8Array
): boolean {
  return verifyMembershipProof(proof, expectedRoot);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSCRIPTION COMPRESSION ADAPTER
// View and manage compressed SPL tokens via inscriptions
// ═══════════════════════════════════════════════════════════════════════════════

export interface CompressedSPLToken {
  /** Token mint address */
  mint: PublicKey;
  /** Owner address */
  owner: PublicKey;
  /** Token amount (compressed) */
  amount: bigint;
  /** Compression proof */
  proof: MembershipProof;
  /** State tree address */
  stateTree: PublicKey;
  /** Leaf index in state tree */
  leafIndex: number;
  /** Inscription ID (if metadata stored as inscription) */
  inscriptionId?: string;
  /** Token metadata (from inscription or on-chain) */
  metadata?: CompressedTokenMetadata;
}

export interface CompressedTokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  image?: string;
  description?: string;
}

export interface InscriptionData {
  /** Inscription ID */
  id: string;
  /** Content type (e.g., "application/json", "image/png") */
  contentType: string;
  /** Raw content bytes */
  content: Uint8Array;
  /** Creator */
  authority: PublicKey;
  /** Creation slot */
  slot: number;
  /** Associated account (if any) */
  associatedAccount?: PublicKey;
}

export class InscriptionCompressionAdapter {
  private connection: Connection;
  private config: CompressionConfig;
  
  constructor(connection: Connection, config?: Partial<CompressionConfig>) {
    this.connection = connection;
    this.config = {
      useCompression: true,
      maxDepth: 20,
      canopyDepth: 10,
      ...config,
    };
  }
  
  /**
   * Get all compressed SPL tokens for an owner
   * Fetches from Light Protocol state trees and resolves metadata from inscriptions
   */
  async getCompressedTokens(owner: PublicKey): Promise<CompressedSPLToken[]> {
    const tokens: CompressedSPLToken[] = [];
    
    try {
      // Query Light Protocol RPC for compressed token accounts
      const rpcUrl = this.config.lightRpcUrl ?? this.connection.rpcEndpoint;
      
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'styx-compressed-tokens',
          method: 'getCompressedTokenAccountsByOwner',
          params: { owner: owner.toBase58() },
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.result?.items) {
          for (const item of data.result.items) {
            // Fetch metadata from inscription if available
            const metadata = item.inscriptionId 
              ? await this.getInscriptionMetadata(item.inscriptionId)
              : undefined;
            
            tokens.push({
              mint: new PublicKey(item.mint),
              owner,
              amount: BigInt(item.amount),
              proof: {
                leaf: new Uint8Array(item.leaf),
                path: item.proof.map((p: string) => new Uint8Array(Buffer.from(p, 'base64'))),
                indices: item.indices,
                root: new Uint8Array(item.root),
              },
              stateTree: new PublicKey(item.stateTree),
              leafIndex: item.leafIndex,
              inscriptionId: item.inscriptionId,
              metadata,
            });
          }
        }
      }
    } catch {
      // Handle error - could fall back to indexer
    }
    
    return tokens;
  }
  
  /**
   * Get compressed token balance for a specific mint
   */
  async getCompressedBalance(owner: PublicKey, mint: PublicKey): Promise<bigint> {
    const tokens = await this.getCompressedTokens(owner);
    const matching = tokens.filter(t => t.mint.equals(mint));
    return matching.reduce((sum, t) => sum + t.amount, BigInt(0));
  }
  
  /**
   * Fetch inscription data by ID
   */
  async getInscription(inscriptionId: string): Promise<InscriptionData | null> {
    try {
      const response = await fetch(this.connection.rpcEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'styx-inscription',
          method: 'getInscription',
          params: { id: inscriptionId },
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          return {
            id: inscriptionId,
            contentType: data.result.contentType,
            content: new Uint8Array(Buffer.from(data.result.content, 'base64')),
            authority: new PublicKey(data.result.authority),
            slot: data.result.slot,
            associatedAccount: data.result.associatedAccount 
              ? new PublicKey(data.result.associatedAccount)
              : undefined,
          };
        }
      }
    } catch {
      // Handle error
    }
    
    return null;
  }
  
  /**
   * Fetch token metadata from an inscription
   */
  async getInscriptionMetadata(inscriptionId: string): Promise<CompressedTokenMetadata | undefined> {
    const inscription = await this.getInscription(inscriptionId);
    
    if (inscription && inscription.contentType === 'application/json') {
      try {
        const json = JSON.parse(new TextDecoder().decode(inscription.content));
        return {
          name: json.name ?? 'Unknown',
          symbol: json.symbol ?? '???',
          decimals: json.decimals ?? 9,
          image: json.image,
          description: json.description,
        };
      } catch {
        // Invalid JSON
      }
    }
    
    return undefined;
  }
  
  /**
   * Create an inscription for token metadata
   */
  async createMetadataInscription(
    metadata: CompressedTokenMetadata,
    authority: PublicKey
  ): Promise<TransactionInstruction[]> {
    const content = new TextEncoder().encode(JSON.stringify(metadata));
    
    // Build inscription instruction
    const data = Buffer.alloc(1 + 4 + 16 + 4 + content.length);
    let offset = 0;
    data[offset++] = 0x01; // CREATE_INSCRIPTION instruction
    new DataView(data.buffer).setUint32(offset, content.length, true); offset += 4;
    data.set(new TextEncoder().encode('application/json'.padEnd(16, '\0')), offset); offset += 16;
    data.set(content, offset);
    
    return [
      new TransactionInstruction({
        keys: [
          { pubkey: authority, isSigner: true, isWritable: true },
        ],
        programId: INSCRIPTION_PROGRAM_ID,
        data,
      }),
    ];
  }
  
  /**
   * Decompress tokens from compressed state to regular SPL
   * This moves tokens from the Light Protocol state tree to a standard token account
   */
  async decompressTokens(args: {
    mint: PublicKey;
    owner: PublicKey;
    amount: bigint;
    proof: MembershipProof;
    stateTree: PublicKey;
    leafIndex: number;
  }): Promise<TransactionInstruction[]> {
    // Build proof data
    const proofData = args.proof.path.reduce((acc, p) => {
      const newAcc = new Uint8Array(acc.length + 32);
      newAcc.set(acc);
      newAcc.set(p, acc.length);
      return newAcc;
    }, new Uint8Array(0));
    
    const data = Buffer.alloc(1 + 32 + 8 + 4 + 32 + 2 + proofData.length);
    let offset = 0;
    data[offset++] = 0x02; // DECOMPRESS instruction
    data.set(args.mint.toBytes(), offset); offset += 32;
    new DataView(data.buffer).setBigUint64(offset, args.amount, true); offset += 8;
    new DataView(data.buffer).setUint32(offset, args.leafIndex, true); offset += 4;
    data.set(args.proof.root, offset); offset += 32;
    new DataView(data.buffer).setUint16(offset, args.proof.path.length, true); offset += 2;
    data.set(proofData, offset);
    
    return [
      new TransactionInstruction({
        keys: [
          { pubkey: args.owner, isSigner: true, isWritable: true },
          { pubkey: args.mint, isSigner: false, isWritable: false },
          { pubkey: args.stateTree, isSigner: false, isWritable: true },
        ],
        programId: COMPRESSED_TOKEN_PROGRAM_ID,
        data,
      }),
    ];
  }
  
  /**
   * Compress tokens from regular SPL to compressed state
   * This moves tokens from a standard token account to Light Protocol state tree
   */
  async compressTokens(args: {
    mint: PublicKey;
    owner: PublicKey;
    amount: bigint;
    tokenAccount: PublicKey;
    stateTree: PublicKey;
  }): Promise<TransactionInstruction[]> {
    const data = Buffer.alloc(1 + 32 + 8 + 32);
    let offset = 0;
    data[offset++] = 0x01; // COMPRESS instruction
    data.set(args.mint.toBytes(), offset); offset += 32;
    new DataView(data.buffer).setBigUint64(offset, args.amount, true); offset += 8;
    data.set(args.tokenAccount.toBytes(), offset);
    
    return [
      new TransactionInstruction({
        keys: [
          { pubkey: args.owner, isSigner: true, isWritable: true },
          { pubkey: args.tokenAccount, isSigner: false, isWritable: true },
          { pubkey: args.mint, isSigner: false, isWritable: false },
          { pubkey: args.stateTree, isSigner: false, isWritable: true },
        ],
        programId: COMPRESSED_TOKEN_PROGRAM_ID,
        data,
      }),
    ];
  }
  
  /**
 * Transfer compressed tokens with privacy
 * Uses stealth addressing for recipient privacy
 */
async transferCompressedPrivate(args: {
  mint: PublicKey;
  from: PublicKey;
  toViewKey: Uint8Array;
  toSpendKey: PublicKey;
  amount: bigint;
  proof: MembershipProof;
  stateTree: PublicKey;
  leafIndex: number;
}): Promise<{ instructions: TransactionInstruction[]; stealthAddress: PublicKey }> {
  // Import stealth address generation (would be from ../core)
  // For now, return placeholder
  const stealthAddress = args.from; // Placeholder
  
  const proofData = args.proof.path.reduce((acc, p) => {
    const newAcc = new Uint8Array(acc.length + 32);
    newAcc.set(acc);
    newAcc.set(p, acc.length);
    return newAcc;
  }, new Uint8Array(0));
  
  const data = Buffer.alloc(1 + 32 + 32 + 8 + 4 + 32 + 2 + proofData.length);
  let offset = 0;
  data[offset++] = 0x03; // TRANSFER_COMPRESSED_PRIVATE instruction
  data.set(args.mint.toBytes(), offset); offset += 32;
  data.set(stealthAddress.toBytes(), offset); offset += 32;
  new DataView(data.buffer).setBigUint64(offset, args.amount, true); offset += 8;
  new DataView(data.buffer).setUint32(offset, args.leafIndex, true); offset += 4;
  data.set(args.proof.root, offset); offset += 32;
  new DataView(data.buffer).setUint16(offset, args.proof.path.length, true); offset += 2;
  data.set(proofData, offset);
  
  return {
    instructions: [
      new TransactionInstruction({
        keys: [
          { pubkey: args.from, isSigner: true, isWritable: true },
          { pubkey: args.mint, isSigner: false, isWritable: false },
          { pubkey: args.stateTree, isSigner: false, isWritable: true },
          { pubkey: stealthAddress, isSigner: false, isWritable: false },
        ],
        programId: COMPRESSED_TOKEN_PROGRAM_ID,
        data,
      }),
    ],
    stealthAddress,
  };
}
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSCRIPTION TOKEN MINTING
// Native inscription-based token creation
// ═══════════════════════════════════════════════════════════════════════════════

export interface InscriptionTokenConfig {
  /** Token name */
  name: string;
  /** Token symbol (max 10 chars) */
  symbol: string;
  /** Total supply */
  totalSupply: bigint;
  /** Decimals (0-9) */
  decimals: number;
  /** Token description */
  description?: string;
  /** Token image URI */
  imageUri?: string;
  /** Additional metadata */
  attributes?: Record<string, string>;
  /** Limit mints per address (0 = unlimited) */
  mintLimit?: number;
}

export interface InscriptionToken {
  /** Inscription ID */
  inscriptionId: string;
  /** Token mint address (derived from inscription) */
  mint: PublicKey;
  /** Token config */
  config: InscriptionTokenConfig;
  /** Creator */
  authority: PublicKey;
  /** Current circulating supply */
  circulatingSupply: bigint;
  /** Mint state (open, closed) */
  mintState: 'open' | 'closed';
  /** Creation slot */
  createdAt: number;
}

export interface InscriptionTokenBalance {
  /** Token inscription ID */
  inscriptionId: string;
  /** Token mint */
  mint: PublicKey;
  /** Balance amount */
  balance: bigint;
  /** Note nullifiers (for privacy) */
  nullifiers: Uint8Array[];
  /** Associated inscription data */
  token?: InscriptionToken;
}

/**
 * InscriptionTokenClient - Create and manage inscription-based tokens
 * Similar to BRC-20 but on Solana with privacy features
 */
export class InscriptionTokenClient {
  private connection: Connection;
  private config: CompressionConfig;
  
  constructor(connection: Connection, config?: Partial<CompressionConfig>) {
    this.connection = connection;
    this.config = {
      useCompression: true,
      maxDepth: 20,
      canopyDepth: 10,
      ...config,
    };
  }
  
  /**
   * Deploy a new inscription token
   */
  async deployToken(
    authority: PublicKey,
    config: InscriptionTokenConfig
  ): Promise<{ instructions: TransactionInstruction[]; inscriptionId: string; mint: PublicKey }> {
    // Validate config
    if (config.symbol.length > 10) {
      throw new Error('Symbol must be 10 characters or less');
    }
    if (config.decimals > 9) {
      throw new Error('Decimals must be 9 or less');
    }
    
    // Build inscription content
    const inscriptionContent = JSON.stringify({
      p: 'styx-20', // Protocol identifier
      op: 'deploy',
      tick: config.symbol,
      name: config.name,
      max: config.totalSupply.toString(),
      dec: config.decimals,
      desc: config.description,
      img: config.imageUri,
      lim: config.mintLimit ?? 0,
      attr: config.attributes,
    });
    
    const content = new TextEncoder().encode(inscriptionContent);
    
    // Generate inscription ID (hash of content + authority + slot)
    const inscriptionIdBytes = sha256(new Uint8Array([
      ...content,
      ...authority.toBytes(),
      ...new Uint8Array(new BigUint64Array([BigInt(Date.now())]).buffer),
    ]));
    const inscriptionId = Buffer.from(inscriptionIdBytes.slice(0, 16)).toString('hex');
    
    // Derive mint address from inscription
    const mintSeed = sha256(new TextEncoder().encode(`styx-20:${inscriptionId}`));
    const mint = new PublicKey(mintSeed);
    
    // Build deploy instruction
    const data = Buffer.alloc(1 + 4 + 16 + 4 + content.length);
    let offset = 0;
    data[offset++] = 0x10; // DEPLOY_INSCRIPTION_TOKEN instruction
    new DataView(data.buffer).setUint32(offset, content.length, true); offset += 4;
    data.set(new TextEncoder().encode('application/json'.padEnd(16, '\0')), offset); offset += 16;
    new DataView(data.buffer).setUint32(offset, content.length, true); offset += 4;
    data.set(content, offset);
    
    const instructions: TransactionInstruction[] = [
      new TransactionInstruction({
        keys: [
          { pubkey: authority, isSigner: true, isWritable: true },
          { pubkey: mint, isSigner: false, isWritable: true },
        ],
        programId: INSCRIPTION_PROGRAM_ID,
        data,
      }),
    ];
    
    return { instructions, inscriptionId, mint };
  }
  
  /**
   * Mint inscription tokens to an address
   */
  async mintTokens(args: {
    inscriptionId: string;
    mint: PublicKey;
    recipient: PublicKey;
    amount: bigint;
    authority: PublicKey;
  }): Promise<TransactionInstruction[]> {
    // Build mint inscription content
    const mintContent = JSON.stringify({
      p: 'styx-20',
      op: 'mint',
      tick: args.inscriptionId,
      amt: args.amount.toString(),
      to: args.recipient.toBase58(),
    });
    
    const content = new TextEncoder().encode(mintContent);
    
    const data = Buffer.alloc(1 + 32 + 32 + 8 + 4 + content.length);
    let offset = 0;
    data[offset++] = 0x11; // MINT_INSCRIPTION_TOKEN instruction
    data.set(args.mint.toBytes(), offset); offset += 32;
    data.set(args.recipient.toBytes(), offset); offset += 32;
    new DataView(data.buffer).setBigUint64(offset, args.amount, true); offset += 8;
    new DataView(data.buffer).setUint32(offset, content.length, true); offset += 4;
    data.set(content, offset);
    
    return [
      new TransactionInstruction({
        keys: [
          { pubkey: args.authority, isSigner: true, isWritable: true },
          { pubkey: args.mint, isSigner: false, isWritable: true },
          { pubkey: args.recipient, isSigner: false, isWritable: true },
        ],
        programId: INSCRIPTION_PROGRAM_ID,
        data,
      }),
    ];
  }
  
  /**
   * Transfer inscription tokens
   */
  async transferTokens(args: {
    inscriptionId: string;
    mint: PublicKey;
    from: PublicKey;
    to: PublicKey;
    amount: bigint;
  }): Promise<TransactionInstruction[]> {
    const transferContent = JSON.stringify({
      p: 'styx-20',
      op: 'transfer',
      tick: args.inscriptionId,
      amt: args.amount.toString(),
    });
    
    const content = new TextEncoder().encode(transferContent);
    
    const data = Buffer.alloc(1 + 32 + 32 + 32 + 8 + 4 + content.length);
    let offset = 0;
    data[offset++] = 0x12; // TRANSFER_INSCRIPTION_TOKEN instruction
    data.set(args.mint.toBytes(), offset); offset += 32;
    data.set(args.from.toBytes(), offset); offset += 32;
    data.set(args.to.toBytes(), offset); offset += 32;
    new DataView(data.buffer).setBigUint64(offset, args.amount, true); offset += 8;
    new DataView(data.buffer).setUint32(offset, content.length, true); offset += 4;
    data.set(content, offset);
    
    return [
      new TransactionInstruction({
        keys: [
          { pubkey: args.from, isSigner: true, isWritable: true },
          { pubkey: args.to, isSigner: false, isWritable: true },
          { pubkey: args.mint, isSigner: false, isWritable: false },
        ],
        programId: INSCRIPTION_PROGRAM_ID,
        data,
      }),
    ];
  }
  
  /**
   * Burn inscription tokens
   */
  async burnTokens(args: {
    inscriptionId: string;
    mint: PublicKey;
    owner: PublicKey;
    amount: bigint;
  }): Promise<TransactionInstruction[]> {
    const burnContent = JSON.stringify({
      p: 'styx-20',
      op: 'burn',
      tick: args.inscriptionId,
      amt: args.amount.toString(),
    });
    
    const content = new TextEncoder().encode(burnContent);
    
    const data = Buffer.alloc(1 + 32 + 32 + 8 + 4 + content.length);
    let offset = 0;
    data[offset++] = 0x13; // BURN_INSCRIPTION_TOKEN instruction
    data.set(args.mint.toBytes(), offset); offset += 32;
    data.set(args.owner.toBytes(), offset); offset += 32;
    new DataView(data.buffer).setBigUint64(offset, args.amount, true); offset += 8;
    new DataView(data.buffer).setUint32(offset, content.length, true); offset += 4;
    data.set(content, offset);
    
    return [
      new TransactionInstruction({
        keys: [
          { pubkey: args.owner, isSigner: true, isWritable: true },
          { pubkey: args.mint, isSigner: false, isWritable: true },
        ],
        programId: INSCRIPTION_PROGRAM_ID,
        data,
      }),
    ];
  }
  
  /**
   * Get inscription token info
   */
  async getTokenInfo(inscriptionId: string): Promise<InscriptionToken | null> {
    try {
      const response = await fetch(this.connection.rpcEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'styx-token-info',
          method: 'getInscriptionToken',
          params: { inscriptionId },
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          return {
            inscriptionId,
            mint: new PublicKey(data.result.mint),
            config: {
              name: data.result.name,
              symbol: data.result.symbol,
              totalSupply: BigInt(data.result.totalSupply),
              decimals: data.result.decimals,
              description: data.result.description,
              imageUri: data.result.imageUri,
              attributes: data.result.attributes,
              mintLimit: data.result.mintLimit,
            },
            authority: new PublicKey(data.result.authority),
            circulatingSupply: BigInt(data.result.circulatingSupply),
            mintState: data.result.mintState,
            createdAt: data.result.createdAt,
          };
        }
      }
    } catch {
      // Handle error
    }
    
    return null;
  }
  
  /**
   * Get all inscription token balances for an owner
   */
  async getTokenBalances(owner: PublicKey): Promise<InscriptionTokenBalance[]> {
    const balances: InscriptionTokenBalance[] = [];
    
    try {
      const response = await fetch(this.connection.rpcEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'styx-token-balances',
          method: 'getInscriptionTokenBalances',
          params: { owner: owner.toBase58() },
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.result?.items) {
          for (const item of data.result.items) {
            const tokenInfo = await this.getTokenInfo(item.inscriptionId);
            
            balances.push({
              inscriptionId: item.inscriptionId,
              mint: new PublicKey(item.mint),
              balance: BigInt(item.balance),
              nullifiers: (item.nullifiers || []).map((n: string) => 
                new Uint8Array(Buffer.from(n, 'base64'))
              ),
              token: tokenInfo ?? undefined,
            });
          }
        }
      }
    } catch {
      // Handle error
    }
    
    return balances;
  }
  
  /**
   * List all deployed inscription tokens
   */
  async listTokens(options?: {
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'circulatingSupply' | 'name';
  }): Promise<InscriptionToken[]> {
    try {
      const response = await fetch(this.connection.rpcEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'styx-list-tokens',
          method: 'listInscriptionTokens',
          params: options ?? {},
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.result?.items) {
          return data.result.items.map((item: any) => ({
            inscriptionId: item.inscriptionId,
            mint: new PublicKey(item.mint),
            config: {
              name: item.name,
              symbol: item.symbol,
              totalSupply: BigInt(item.totalSupply),
              decimals: item.decimals,
              description: item.description,
              imageUri: item.imageUri,
              attributes: item.attributes,
              mintLimit: item.mintLimit,
            },
            authority: new PublicKey(item.authority),
            circulatingSupply: BigInt(item.circulatingSupply),
            mintState: item.mintState,
            createdAt: item.createdAt,
          }));
        }
      }
    } catch {
      // Handle error
    }
    
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSCRIPTION NFT MINTING
// Native inscription-based NFT creation
// ═══════════════════════════════════════════════════════════════════════════════

export interface InscriptionNFTMetadata {
  /** NFT name */
  name: string;
  /** NFT description */
  description: string;
  /** Image/media URI (IPFS, Arweave, etc.) */
  image: string;
  /** Animation URL (optional) */
  animationUrl?: string;
  /** External URL */
  externalUrl?: string;
  /** NFT attributes */
  attributes?: Array<{
    traitType: string;
    value: string | number;
    displayType?: 'number' | 'boost_number' | 'boost_percentage' | 'date';
  }>;
  /** Collection info */
  collection?: {
    name: string;
    family?: string;
  };
  /** Royalty info */
  royalty?: {
    basisPoints: number; // 100 = 1%
    recipients: Array<{
      address: string;
      share: number; // percentage
    }>;
  };
}

export interface InscriptionNFT {
  /** Inscription ID */
  inscriptionId: string;
  /** NFT mint address */
  mint: PublicKey;
  /** Metadata */
  metadata: InscriptionNFTMetadata;
  /** Owner */
  owner: PublicKey;
  /** Creator */
  creator: PublicKey;
  /** Creation slot */
  createdAt: number;
  /** Is compressed */
  compressed: boolean;
  /** Collection ID (if part of collection) */
  collectionId?: string;
}

export interface InscriptionCollection {
  /** Collection inscription ID */
  collectionId: string;
  /** Collection name */
  name: string;
  /** Collection symbol */
  symbol: string;
  /** Description */
  description: string;
  /** Collection image */
  image: string;
  /** Creator */
  creator: PublicKey;
  /** Total items in collection */
  totalItems: number;
  /** Minted items */
  mintedItems: number;
  /** Royalty info */
  royalty?: {
    basisPoints: number;
    recipients: Array<{
      address: string;
      share: number;
    }>;
  };
}

/**
 * InscriptionNFTClient - Create and manage inscription-based NFTs
 * Supports both regular and compressed NFTs with privacy features
 */
export class InscriptionNFTClient {
  private connection: Connection;
  private config: CompressionConfig;
  
  constructor(connection: Connection, config?: Partial<CompressionConfig>) {
    this.connection = connection;
    this.config = {
      useCompression: true,
      maxDepth: 20,
      canopyDepth: 10,
      ...config,
    };
  }
  
  /**
   * Create an inscription NFT collection
   */
  async createCollection(
    creator: PublicKey,
    collection: {
      name: string;
      symbol: string;
      description: string;
      image: string;
      maxItems?: number;
      royalty?: {
        basisPoints: number;
        recipients: Array<{ address: string; share: number }>;
      };
    }
  ): Promise<{ instructions: TransactionInstruction[]; collectionId: string }> {
    const inscriptionContent = JSON.stringify({
      p: 'styx-721',
      op: 'collection',
      name: collection.name,
      symbol: collection.symbol,
      desc: collection.description,
      img: collection.image,
      max: collection.maxItems ?? 0,
      royalty: collection.royalty,
    });
    
    const content = new TextEncoder().encode(inscriptionContent);
    
    // Generate collection ID
    const collectionIdBytes = sha256(new Uint8Array([
      ...content,
      ...creator.toBytes(),
      ...new Uint8Array(new BigUint64Array([BigInt(Date.now())]).buffer),
    ]));
    const collectionId = Buffer.from(collectionIdBytes.slice(0, 16)).toString('hex');
    
    const data = Buffer.alloc(1 + 4 + 16 + 4 + content.length);
    let offset = 0;
    data[offset++] = 0x20; // CREATE_COLLECTION instruction
    new DataView(data.buffer).setUint32(offset, content.length, true); offset += 4;
    data.set(new TextEncoder().encode('application/json'.padEnd(16, '\0')), offset); offset += 16;
    new DataView(data.buffer).setUint32(offset, content.length, true); offset += 4;
    data.set(content, offset);
    
    return {
      instructions: [
        new TransactionInstruction({
          keys: [
            { pubkey: creator, isSigner: true, isWritable: true },
          ],
          programId: INSCRIPTION_PROGRAM_ID,
          data,
        }),
      ],
      collectionId,
    };
  }
  
  /**
   * Mint an inscription NFT
   */
  async mintNFT(
    creator: PublicKey,
    metadata: InscriptionNFTMetadata,
    options?: {
      /** Collection ID to add NFT to */
      collectionId?: string;
      /** Recipient (defaults to creator) */
      recipient?: PublicKey;
      /** Use compression for gas efficiency */
      compressed?: boolean;
      /** Privacy: send to stealth address */
      stealth?: boolean;
    }
  ): Promise<{ instructions: TransactionInstruction[]; inscriptionId: string; mint: PublicKey }> {
    const inscriptionContent = JSON.stringify({
      p: 'styx-721',
      op: 'mint',
      name: metadata.name,
      desc: metadata.description,
      img: metadata.image,
      anim: metadata.animationUrl,
      ext: metadata.externalUrl,
      attr: metadata.attributes,
      col: options?.collectionId,
      royalty: metadata.royalty,
      compressed: options?.compressed ?? this.config.useCompression,
    });
    
    const content = new TextEncoder().encode(inscriptionContent);
    
    // Generate inscription ID
    const inscriptionIdBytes = sha256(new Uint8Array([
      ...content,
      ...creator.toBytes(),
      ...new Uint8Array(new BigUint64Array([BigInt(Date.now())]).buffer),
    ]));
    const inscriptionId = Buffer.from(inscriptionIdBytes.slice(0, 16)).toString('hex');
    
    // Derive mint address
    const mintSeed = sha256(new TextEncoder().encode(`styx-721:${inscriptionId}`));
    const mint = new PublicKey(mintSeed);
    
    const recipient = options?.recipient ?? creator;
    
    const data = Buffer.alloc(1 + 32 + 1 + 1 + 4 + content.length);
    let offset = 0;
    data[offset++] = options?.compressed ? 0x22 : 0x21; // MINT_NFT or MINT_CNFT
    data.set(recipient.toBytes(), offset); offset += 32;
    data[offset++] = options?.stealth ? 1 : 0;
    data[offset++] = options?.collectionId ? 1 : 0;
    new DataView(data.buffer).setUint32(offset, content.length, true); offset += 4;
    data.set(content, offset);
    
    return {
      instructions: [
        new TransactionInstruction({
          keys: [
            { pubkey: creator, isSigner: true, isWritable: true },
            { pubkey: recipient, isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: false, isWritable: true },
          ],
          programId: INSCRIPTION_PROGRAM_ID,
          data,
        }),
      ],
      inscriptionId,
      mint,
    };
  }
  
  /**
   * Batch mint NFTs (for collections)
   */
  async batchMintNFTs(
    creator: PublicKey,
    metadataList: InscriptionNFTMetadata[],
    options?: {
      collectionId?: string;
      recipients?: PublicKey[];
      compressed?: boolean;
    }
  ): Promise<Array<{ inscriptionId: string; mint: PublicKey }>> {
    const results: Array<{ inscriptionId: string; mint: PublicKey }> = [];
    
    for (let i = 0; i < metadataList.length; i++) {
      const metadata = metadataList[i];
      const recipient = options?.recipients?.[i];
      
      const { inscriptionId, mint } = await this.mintNFT(
        creator,
        metadata,
        {
          collectionId: options?.collectionId,
          recipient,
          compressed: options?.compressed ?? true,
        }
      );
      
      results.push({ inscriptionId, mint });
    }
    
    return results;
  }
  
  /**
   * Transfer an inscription NFT
   */
  async transferNFT(args: {
    inscriptionId: string;
    mint: PublicKey;
    from: PublicKey;
    to: PublicKey;
    /** Use stealth address for privacy */
    stealth?: boolean;
  }): Promise<TransactionInstruction[]> {
    const transferContent = JSON.stringify({
      p: 'styx-721',
      op: 'transfer',
      id: args.inscriptionId,
    });
    
    const content = new TextEncoder().encode(transferContent);
    
    const data = Buffer.alloc(1 + 32 + 32 + 32 + 1 + 4 + content.length);
    let offset = 0;
    data[offset++] = 0x23; // TRANSFER_NFT instruction
    data.set(args.mint.toBytes(), offset); offset += 32;
    data.set(args.from.toBytes(), offset); offset += 32;
    data.set(args.to.toBytes(), offset); offset += 32;
    data[offset++] = args.stealth ? 1 : 0;
    new DataView(data.buffer).setUint32(offset, content.length, true); offset += 4;
    data.set(content, offset);
    
    return [
      new TransactionInstruction({
        keys: [
          { pubkey: args.from, isSigner: true, isWritable: true },
          { pubkey: args.to, isSigner: false, isWritable: true },
          { pubkey: args.mint, isSigner: false, isWritable: true },
        ],
        programId: INSCRIPTION_PROGRAM_ID,
        data,
      }),
    ];
  }
  
  /**
   * Burn an inscription NFT
   */
  async burnNFT(args: {
    inscriptionId: string;
    mint: PublicKey;
    owner: PublicKey;
  }): Promise<TransactionInstruction[]> {
    const burnContent = JSON.stringify({
      p: 'styx-721',
      op: 'burn',
      id: args.inscriptionId,
    });
    
    const content = new TextEncoder().encode(burnContent);
    
    const data = Buffer.alloc(1 + 32 + 32 + 4 + content.length);
    let offset = 0;
    data[offset++] = 0x24; // BURN_NFT instruction
    data.set(args.mint.toBytes(), offset); offset += 32;
    data.set(args.owner.toBytes(), offset); offset += 32;
    new DataView(data.buffer).setUint32(offset, content.length, true); offset += 4;
    data.set(content, offset);
    
    return [
      new TransactionInstruction({
        keys: [
          { pubkey: args.owner, isSigner: true, isWritable: true },
          { pubkey: args.mint, isSigner: false, isWritable: true },
        ],
        programId: INSCRIPTION_PROGRAM_ID,
        data,
      }),
    ];
  }
  
  /**
   * Get NFT info by inscription ID
   */
  async getNFT(inscriptionId: string): Promise<InscriptionNFT | null> {
    try {
      const response = await fetch(this.connection.rpcEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'styx-get-nft',
          method: 'getInscriptionNFT',
          params: { inscriptionId },
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          return {
            inscriptionId,
            mint: new PublicKey(data.result.mint),
            metadata: {
              name: data.result.name,
              description: data.result.description,
              image: data.result.image,
              animationUrl: data.result.animationUrl,
              externalUrl: data.result.externalUrl,
              attributes: data.result.attributes,
              collection: data.result.collection,
              royalty: data.result.royalty,
            },
            owner: new PublicKey(data.result.owner),
            creator: new PublicKey(data.result.creator),
            createdAt: data.result.createdAt,
            compressed: data.result.compressed ?? false,
            collectionId: data.result.collectionId,
          };
        }
      }
    } catch {
      // Handle error
    }
    
    return null;
  }
  
  /**
   * Get all NFTs owned by an address
   */
  async getNFTsByOwner(owner: PublicKey): Promise<InscriptionNFT[]> {
    try {
      const response = await fetch(this.connection.rpcEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'styx-nfts-by-owner',
          method: 'getInscriptionNFTsByOwner',
          params: { owner: owner.toBase58() },
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.result?.items) {
          return data.result.items.map((item: any) => ({
            inscriptionId: item.inscriptionId,
            mint: new PublicKey(item.mint),
            metadata: {
              name: item.name,
              description: item.description,
              image: item.image,
              animationUrl: item.animationUrl,
              externalUrl: item.externalUrl,
              attributes: item.attributes,
              collection: item.collection,
              royalty: item.royalty,
            },
            owner: new PublicKey(item.owner),
            creator: new PublicKey(item.creator),
            createdAt: item.createdAt,
            compressed: item.compressed ?? false,
            collectionId: item.collectionId,
          }));
        }
      }
    } catch {
      // Handle error
    }
    
    return [];
  }
  
  /**
   * Get collection info
   */
  async getCollection(collectionId: string): Promise<InscriptionCollection | null> {
    try {
      const response = await fetch(this.connection.rpcEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'styx-get-collection',
          method: 'getInscriptionCollection',
          params: { collectionId },
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          return {
            collectionId,
            name: data.result.name,
            symbol: data.result.symbol,
            description: data.result.description,
            image: data.result.image,
            creator: new PublicKey(data.result.creator),
            totalItems: data.result.totalItems,
            mintedItems: data.result.mintedItems,
            royalty: data.result.royalty,
          };
        }
      }
    } catch {
      // Handle error
    }
    
    return null;
  }
  
  /**
   * Get all NFTs in a collection
   */
  async getNFTsByCollection(collectionId: string): Promise<InscriptionNFT[]> {
    try {
      const response = await fetch(this.connection.rpcEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'styx-nfts-by-collection',
          method: 'getInscriptionNFTsByCollection',
          params: { collectionId },
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.result?.items) {
          return data.result.items.map((item: any) => ({
            inscriptionId: item.inscriptionId,
            mint: new PublicKey(item.mint),
            metadata: {
              name: item.name,
              description: item.description,
              image: item.image,
              animationUrl: item.animationUrl,
              externalUrl: item.externalUrl,
              attributes: item.attributes,
              collection: item.collection,
              royalty: item.royalty,
            },
            owner: new PublicKey(item.owner),
            creator: new PublicKey(item.creator),
            createdAt: item.createdAt,
            compressed: item.compressed ?? false,
            collectionId: item.collectionId,
          }));
        }
      }
    } catch {
      // Handle error
    }
    
    return [];
  }
  
  /**
   * View inscription content (image, metadata, etc.)
   */
  async viewInscription(inscriptionId: string): Promise<{
    contentType: string;
    content: Uint8Array;
    metadata?: InscriptionNFTMetadata;
  } | null> {
    try {
      const response = await fetch(this.connection.rpcEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'styx-view-inscription',
          method: 'getInscription',
          params: { id: inscriptionId },
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          const content = new Uint8Array(Buffer.from(data.result.content, 'base64'));
          let metadata: InscriptionNFTMetadata | undefined;
          
          if (data.result.contentType === 'application/json') {
            try {
              const json = JSON.parse(new TextDecoder().decode(content));
              metadata = {
                name: json.name,
                description: json.desc || json.description,
                image: json.img || json.image,
                animationUrl: json.anim || json.animationUrl,
                externalUrl: json.ext || json.externalUrl,
                attributes: json.attr || json.attributes,
                collection: json.col ? { name: json.col } : undefined,
                royalty: json.royalty,
              };
            } catch {
              // Not valid JSON
            }
          }
          
          return {
            contentType: data.result.contentType,
            content,
            metadata,
          };
        }
      }
    } catch {
      // Handle error
    }
    
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const Compression = {
  CompressionClient,
  InMemoryMerkleTree,
  InscriptionCompressionAdapter,
  InscriptionTokenClient,
  InscriptionNFTClient,
  computeLeafHash,
  hashNodes,
  verifyMembershipProof,
  getEmptyTreeRoot,
  fetchLightHints,
  validateCompressedProof,
};

// Types
export type {
  CompressedRoot,
  MembershipProof,
  CompressedStateProvider,
  CompressionConfig,
  CompressedSPLToken,
  CompressedTokenMetadata,
  InscriptionData,
  InscriptionTokenConfig,
  InscriptionToken,
  InscriptionTokenBalance,
  InscriptionNFTMetadata,
  InscriptionNFT,
  InscriptionCollection,
};
