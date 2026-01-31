/**
 * Shadow Forest - Multi-Tree Merkle Structure for Private NFTs
 * 
 * Innovation: Instead of a single Merkle tree (like Bubblegum), we use a
 * "Shadow Forest" - a collection of interconnected trees that provides:
 * 
 * 1. **Ambiguity**: Observer can't tell which tree contains an NFT
 * 2. **Randomized Insertion**: NFTs are randomly distributed across trees
 * 3. **Cross-References**: Trees reference each other for extra privacy
 * 4. **Variable Depth**: Each tree has random depth (14-20 levels)
 * 
 * Why not a single tree?
 * - Single tree: All leaves in one structure = easier pattern analysis
 * - Forest: Leaves scattered across multiple trees = much harder to trace
 * 
 * @module @styxstack/styx-nft/forest
 */

import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    TransactionInstruction,
    SystemProgram,
} from '@solana/web3.js';
import { keccak_256 } from '@noble/hashes/sha3';
import { sha256 } from '@noble/hashes/sha256';

// ============================================================================
// CONSTANTS
// ============================================================================

/** ANONFT Program ID (placeholder - deploy your own) */
export const STYX_NFT_PROGRAM_ID = new PublicKey('3bBTcqtLWL8ShLjjCjAKWACAE12E8g4g2Mc3GNFE1McA');

/** SPL Account Compression Program ID */
export const SPL_COMPRESSION_PROGRAM_ID = new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK');

/** SPL Noop Program ID */
export const SPL_NOOP_PROGRAM_ID = new PublicKey('noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV');

/** Minimum trees in a forest */
export const MIN_FOREST_TREES = 4;

/** Maximum trees in a forest */
export const MAX_FOREST_TREES = 32;

/** Minimum tree depth */
export const MIN_TREE_DEPTH = 14;

/** Maximum tree depth */
export const MAX_TREE_DEPTH = 20;

/** Default canopy depth */
export const DEFAULT_CANOPY_DEPTH = 10;

// Instruction tags
export const TAG_CREATE_FOREST = 0;
export const TAG_ADD_TREE = 1;
export const TAG_MINT_PHANTOM = 2;
export const TAG_TRANSFER_PHANTOM = 3;
export const TAG_UPDATE_ROOT = 4;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuration for creating a new Shadow Forest
 */
export interface ForestConfig {
    /** Number of trees to create initially */
    treeCount: number;
    /** Tree depths (random if not specified) */
    depths?: number[];
    /** Canopy depths for each tree */
    canopyDepths?: number[];
    /** Maximum NFTs per tree */
    maxPerTree?: number;
    /** Cross-reference density (0-1) */
    crossRefDensity?: number;
    /** Authority (defaults to payer) */
    authority?: PublicKey;
}

/**
 * A single tree within the Shadow Forest
 */
export interface PhantomTree {
    /** Tree address */
    address: PublicKey;
    /** Merkle root */
    root: Uint8Array;
    /** Tree depth */
    depth: number;
    /** Canopy depth */
    canopyDepth: number;
    /** Number of leaves */
    leafCount: number;
    /** Maximum leaves */
    maxLeaves: number;
    /** Rightmost leaf index */
    rightmostLeaf: number;
    /** Tree index in forest */
    index: number;
}

/**
 * The Shadow Forest structure
 */
export interface ShadowForest {
    /** Forest address (PDA) */
    address: PublicKey;
    /** Authority */
    authority: PublicKey;
    /** Trees in the forest */
    trees: PhantomTree[];
    /** Total leaves across all trees */
    totalLeaves: number;
    /** Total capacity across all trees */
    totalCapacity: number;
    /** Cross-tree reference hashes */
    crossReferences: Uint8Array[];
    /** Insertion seed for randomization */
    insertionSeed: Uint8Array;
    /** Creation slot */
    createdAt: number;
}

/**
 * A leaf in the Shadow Forest
 */
export interface PhantomLeaf {
    /** Leaf index within tree */
    index: number;
    /** Tree index within forest */
    treeIndex: number;
    /** NFT commitment hash */
    commitment: Uint8Array;
    /** Data hash (encrypted metadata) */
    dataHash: Uint8Array;
    /** Creator hash */
    creatorHash: Uint8Array;
    /** Key image (for double-spend prevention) */
    keyImage: Uint8Array;
}

/**
 * Proof of a leaf's inclusion in the forest
 */
export interface ForestProof {
    /** Which tree the leaf is in */
    treeIndex: number;
    /** Leaf index within tree */
    leafIndex: number;
    /** Merkle proof (path from leaf to root) */
    proof: Uint8Array[];
    /** Root at time of proof */
    root: Uint8Array;
    /** Canopy nodes (if using canopy) */
    canopyNodes?: Uint8Array[];
}

// ============================================================================
// FOREST CREATION
// ============================================================================

/**
 * Derive the forest PDA address
 */
export function deriveForestAddress(
    authority: PublicKey,
    seed: Uint8Array
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from('phantom_forest'),
            authority.toBuffer(),
            Buffer.from(seed),
        ],
        STYX_NFT_PROGRAM_ID
    );
}

/**
 * Derive a tree address within a forest
 */
export function deriveTreeAddress(
    forest: PublicKey,
    treeIndex: number
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from('phantom_tree'),
            forest.toBuffer(),
            Buffer.from([treeIndex & 0xff, (treeIndex >> 8) & 0xff]),
        ],
        STYX_NFT_PROGRAM_ID
    );
}

/**
 * Generate random tree depths for a forest
 */
export function generateRandomDepths(count: number): number[] {
    const depths: number[] = [];
    for (let i = 0; i < count; i++) {
        // Random depth between MIN and MAX
        const range = MAX_TREE_DEPTH - MIN_TREE_DEPTH;
        const randomDepth = MIN_TREE_DEPTH + Math.floor(Math.random() * (range + 1));
        depths.push(randomDepth);
    }
    return depths;
}

/**
 * Calculate cost to create a forest
 */
export function calculateForestCost(config: ForestConfig): bigint {
    const depths = config.depths ?? generateRandomDepths(config.treeCount);
    const canopyDepths = config.canopyDepths ?? depths.map(() => DEFAULT_CANOPY_DEPTH);
    
    let totalCost = 0n;
    
    for (let i = 0; i < config.treeCount; i++) {
        const depth = depths[i];
        const canopy = Math.min(canopyDepths[i], depth);
        
        // Tree account size
        const maxLeaves = 2 ** depth;
        const canopyNodes = (2 ** (canopy + 1)) - 2;
        const treeSize = 32 * (depth - canopy) + 32 * canopyNodes + 256; // +256 for metadata
        
        // Rent exemption (~0.00227 SOL per 100 bytes)
        totalCost += BigInt(Math.ceil(treeSize * 6960 / 100));
    }
    
    // Forest account (metadata)
    totalCost += 100_000n; // ~0.0001 SOL
    
    return totalCost;
}

/**
 * Create a new Shadow Forest.
 * 
 * A Shadow Forest is a collection of Merkle trees that provides:
 * - Ambiguity about which tree contains an NFT
 * - Randomized insertion across trees
 * - Cross-tree references for privacy
 */
export async function createShadowForest(args: {
    connection: Connection;
    payer: Keypair;
    config: ForestConfig;
}): Promise<ShadowForest> {
    const { connection, payer, config } = args;
    
    console.log(`🌲 Creating Shadow Forest...`);
    console.log(`   Trees: ${config.treeCount}`);
    
    if (config.treeCount < MIN_FOREST_TREES || config.treeCount > MAX_FOREST_TREES) {
        throw new Error(`Tree count must be between ${MIN_FOREST_TREES} and ${MAX_FOREST_TREES}`);
    }
    
    // Generate random seed for forest
    const forestSeed = Keypair.generate().publicKey.toBytes().slice(0, 32);
    
    // Derive forest address
    const [forestAddress, forestBump] = deriveForestAddress(payer.publicKey, forestSeed);
    
    // Generate depths
    const depths = config.depths ?? generateRandomDepths(config.treeCount);
    const canopyDepths = config.canopyDepths ?? depths.map(() => DEFAULT_CANOPY_DEPTH);
    
    console.log(`   Depths: ${depths.join(', ')}`);
    console.log(`   Canopy: ${canopyDepths.join(', ')}`);
    
    // Generate cross-references
    const crossRefs: Uint8Array[] = [];
    const crossRefCount = Math.floor(config.treeCount * (config.crossRefDensity ?? 0.5));
    for (let i = 0; i < crossRefCount; i++) {
        crossRefs.push(new Uint8Array(keccak_256(Buffer.from(`crossref_${i}_${Date.now()}`))));
    }
    
    // Calculate total capacity
    let totalCapacity = 0;
    const trees: PhantomTree[] = [];
    
    for (let i = 0; i < config.treeCount; i++) {
        const [treeAddress] = deriveTreeAddress(forestAddress, i);
        const maxLeaves = 2 ** depths[i];
        totalCapacity += maxLeaves;
        
        trees.push({
            address: treeAddress,
            root: new Uint8Array(32),
            depth: depths[i],
            canopyDepth: canopyDepths[i],
            leafCount: 0,
            maxLeaves,
            rightmostLeaf: 0,
            index: i,
        });
    }
    
    console.log(`   Total capacity: ${totalCapacity.toLocaleString()} NFTs`);
    console.log(`   Cross-references: ${crossRefs.length}`);
    
    // Build create forest instruction
    const instructionData = Buffer.alloc(512);
    let offset = 0;
    
    instructionData.writeUInt8(TAG_CREATE_FOREST, offset);
    offset += 1;
    
    // Tree count
    instructionData.writeUInt16LE(config.treeCount, offset);
    offset += 2;
    
    // Depths
    for (const depth of depths) {
        instructionData.writeUInt8(depth, offset);
        offset += 1;
    }
    
    // Canopy depths
    for (const canopy of canopyDepths) {
        instructionData.writeUInt8(canopy, offset);
        offset += 1;
    }
    
    // Forest seed
    Buffer.from(forestSeed).copy(instructionData, offset);
    offset += 32;
    
    // In production, would create and send transaction
    
    console.log(`   Forest: ${forestAddress.toBase58()}`);
    
    return {
        address: forestAddress,
        authority: config.authority ?? payer.publicKey,
        trees,
        totalLeaves: 0,
        totalCapacity,
        crossReferences: crossRefs,
        insertionSeed: forestSeed,
        createdAt: Date.now(),
    };
}

// ============================================================================
// LEAF INSERTION
// ============================================================================

/**
 * Determine which tree to insert a new leaf into.
 * 
 * Uses a combination of:
 * 1. Forest insertion seed
 * 2. Leaf commitment
 * 3. Current tree fill levels
 * 4. Random jitter
 * 
 * This ensures leaves are distributed unpredictably across trees.
 */
export function selectInsertionTree(
    forest: ShadowForest,
    commitment: Uint8Array
): number {
    // Create randomness from commitment and seed
    const randomBytes = keccak_256(Buffer.concat([
        Buffer.from(forest.insertionSeed),
        Buffer.from(commitment),
        Buffer.from(Date.now().toString()),
    ]));
    
    // Get trees that aren't full
    const availableTrees = forest.trees.filter(t => t.leafCount < t.maxLeaves);
    
    if (availableTrees.length === 0) {
        throw new Error('All trees in forest are full');
    }
    
    // Weight by remaining capacity (prefer emptier trees slightly)
    const weights = availableTrees.map(t => {
        const fillRatio = t.leafCount / t.maxLeaves;
        return 1 - fillRatio * 0.3; // Slight preference for emptier trees
    });
    
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let threshold = (randomBytes[0] / 256) * totalWeight;
    
    for (let i = 0; i < availableTrees.length; i++) {
        threshold -= weights[i];
        if (threshold <= 0) {
            return availableTrees[i].index;
        }
    }
    
    return availableTrees[availableTrees.length - 1].index;
}

/**
 * Create a Merkle proof for a leaf
 */
export function createMerkleProof(
    tree: PhantomTree,
    leafIndex: number,
    leaves: Uint8Array[]
): Uint8Array[] {
    const proof: Uint8Array[] = [];
    const depth = tree.depth;
    
    // Build tree level by level
    let currentLevel = [...leaves];
    let index = leafIndex;
    
    for (let level = 0; level < depth; level++) {
        const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
        
        if (siblingIndex < currentLevel.length) {
            proof.push(currentLevel[siblingIndex]);
        } else {
            // Empty sibling (zero hash)
            proof.push(new Uint8Array(32));
        }
        
        // Move up a level
        const nextLevel: Uint8Array[] = [];
        for (let i = 0; i < currentLevel.length; i += 2) {
            const left = currentLevel[i];
            const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : new Uint8Array(32);
            nextLevel.push(new Uint8Array(keccak_256(Buffer.concat([
                Buffer.from(left),
                Buffer.from(right),
            ]))));
        }
        currentLevel = nextLevel;
        index = Math.floor(index / 2);
    }
    
    return proof;
}

/**
 * Verify a Merkle proof
 */
export function verifyMerkleProof(
    leaf: Uint8Array,
    leafIndex: number,
    proof: Uint8Array[],
    root: Uint8Array
): boolean {
    let current = leaf;
    let index = leafIndex;
    
    for (const sibling of proof) {
        if (index % 2 === 0) {
            current = new Uint8Array(keccak_256(Buffer.concat([
                Buffer.from(current),
                Buffer.from(sibling),
            ])));
        } else {
            current = new Uint8Array(keccak_256(Buffer.concat([
                Buffer.from(sibling),
                Buffer.from(current),
            ])));
        }
        index = Math.floor(index / 2);
    }
    
    return Buffer.from(current).equals(Buffer.from(root));
}

// ============================================================================
// CROSS-TREE REFERENCES
// ============================================================================

/**
 * Generate cross-tree reference hash.
 * 
 * Cross-references create links between trees that make it harder
 * to analyze which tree contains a specific NFT.
 */
export function generateCrossReference(
    sourceTree: PhantomTree,
    targetTree: PhantomTree,
    slot: number
): Uint8Array {
    return new Uint8Array(keccak_256(Buffer.concat([
        Buffer.from(sourceTree.root),
        Buffer.from(targetTree.root),
        Buffer.from(slot.toString()),
    ])));
}

/**
 * Update all cross-references in a forest.
 * Called periodically to refresh privacy.
 */
export function updateCrossReferences(forest: ShadowForest): Uint8Array[] {
    const newRefs: Uint8Array[] = [];
    const slot = Date.now();
    
    // Create references between adjacent trees
    for (let i = 0; i < forest.trees.length - 1; i++) {
        newRefs.push(generateCrossReference(forest.trees[i], forest.trees[i + 1], slot));
    }
    
    // Create some random cross-tree references
    const randomCount = Math.floor(forest.trees.length / 2);
    for (let i = 0; i < randomCount; i++) {
        const source = Math.floor(Math.random() * forest.trees.length);
        let target = Math.floor(Math.random() * forest.trees.length);
        while (target === source) {
            target = Math.floor(Math.random() * forest.trees.length);
        }
        newRefs.push(generateCrossReference(forest.trees[source], forest.trees[target], slot));
    }
    
    return newRefs;
}

// ============================================================================
// FOREST QUERIES
// ============================================================================

/**
 * Get forest statistics
 */
export function getForestStats(forest: ShadowForest): {
    treeCount: number;
    totalLeaves: number;
    totalCapacity: number;
    fillPercentage: number;
    averageDepth: number;
    minDepth: number;
    maxDepth: number;
} {
    const depths = forest.trees.map(t => t.depth);
    const totalLeaves = forest.trees.reduce((sum, t) => sum + t.leafCount, 0);
    
    return {
        treeCount: forest.trees.length,
        totalLeaves,
        totalCapacity: forest.totalCapacity,
        fillPercentage: (totalLeaves / forest.totalCapacity) * 100,
        averageDepth: depths.reduce((a, b) => a + b, 0) / depths.length,
        minDepth: Math.min(...depths),
        maxDepth: Math.max(...depths),
    };
}

/**
 * Find a leaf by commitment (returns proof if found)
 */
export async function findLeafByCommitment(
    forest: ShadowForest,
    commitment: Uint8Array
): Promise<ForestProof | null> {
    // In production, this would query an indexer
    // For now, return null (leaf not found)
    console.log(`🔍 Searching for leaf: ${Buffer.from(commitment).toString('hex').slice(0, 16)}...`);
    return null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    // Creation
    createShadowForest,
    calculateForestCost,
    deriveForestAddress,
    deriveTreeAddress,
    generateRandomDepths,
    
    // Insertion
    selectInsertionTree,
    
    // Proofs
    createMerkleProof,
    verifyMerkleProof,
    
    // Cross-references
    generateCrossReference,
    updateCrossReferences,
    
    // Queries
    getForestStats,
    findLeafByCommitment,
    
    // Constants
    STYX_NFT_PROGRAM_ID,
    SPL_COMPRESSION_PROGRAM_ID,
    MIN_FOREST_TREES,
    MAX_FOREST_TREES,
    MIN_TREE_DEPTH,
    MAX_TREE_DEPTH,
};
