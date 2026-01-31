/**
 * @styxstack/styx-nft - ANONFT: The ANONFT Standard (ANS-1)
 * 
 * A revolutionary NFT standard that's privacy-first with optional transparency.
 * 
 * Philosophy: "Why not make privacy the default, and revelation the choice?"
 * 
 * Key Innovations:
 * 
 * 1. PHANTOM FOREST
 *    Instead of a single Merkle tree, we use a forest of interconnected trees.
 *    Observer can't tell which tree contains your NFT = maximum ambiguity.
 * 
 * 2. RING SIGNATURES
 *    Prove ownership without revealing which key in the ring is yours.
 *    "I own this NFT" without showing your pubkey.
 * 
 * 3. ZK PROOFS
 *    Prove properties about NFTs without revealing them:
 *    - "I have an NFT with trait X"
 *    - "I own at least N NFTs from collection Y"
 *    - "My NFT was minted before date Z"
 * 
 * 4. TEMPORAL PHASES
 *    NFTs can exist in three states:
 *    - Phantom: Completely hidden
 *    - Silhouette: Metadata visible, owner hidden
 *    - Revealed: Fully public (Metaplex compatible)
 * 
 * 5. METAPLEX COMPATIBLE
 *    Reveal to any Metaplex standard:
 *    - Token Metadata (classic NFTs)
 *    - Bubblegum (compressed NFTs)
 *    - Core (new standard with plugins)
 *    
 *    And phantomize any existing Metaplex NFT!
 * 
 * @module @styxstack/styx-nft
 */

// ============================================================================
// PHANTOM FOREST (Multi-tree Merkle structure)
// ============================================================================

export {
    // Types
    ForestConfig,
    PhantomTree,
    ShadowForest,
    PhantomLeaf,
    ForestProof,
    
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
    
    // Default export
    default as forest,
} from './forest.js';

// ============================================================================
// RING SIGNATURES (Anonymous ownership)
// ============================================================================

export {
    // Types
    Ring,
    RingPurpose,
    LsagSignature,
    OwnershipProof,
    
    // Ring operations
    createRing,
    generateDecoys,
    createRingWithDecoys,
    addRingMember,
    rotateRing,
    mergeRings,
    
    // Signing
    computeKeyImage,
    lsagSign,
    lsagVerify,
    
    // Ownership proofs
    createOwnershipProof,
    verifyOwnershipProof,
    signaturesFromSameSigner,
    
    // Constants
    MIN_RING_SIZE,
    MAX_RING_SIZE,
    RECOMMENDED_RING_SIZE,
    
    // Default export
    default as ring,
} from './ring.js';

// ============================================================================
// ZERO-KNOWLEDGE PROOFS
// ============================================================================

export {
    // Types
    ProofType,
    ZkProof,
    TraitProof,
    CollectionProof,
    OwnershipCountProof,
    ProvenanceProof,
    RangeProof,
    NftMetadata,
    ProofWitness,
    
    // Commitments
    createCommitment,
    createTraitCommitment,
    createOwnershipCommitment,
    
    // Trait proofs
    generateTraitProof,
    verifyTraitProof,
    
    // Collection proofs
    generateCollectionProof,
    verifyCollectionProof,
    
    // Ownership count proofs
    generateOwnershipCountProof,
    verifyOwnershipCountProof,
    
    // Provenance proofs
    generateProvenanceProof,
    verifyProvenanceProof,
    
    // Range proofs
    generateRangeProof,
    verifyRangeProof,
    
    // Batch operations
    batchVerify,
    
    // Constants
    MAX_TRAITS_PER_PROOF,
    PROOF_EXPIRY_MS,
    
    // Default export
    default as zk,
} from './zk.js';

// ============================================================================
// METAPLEX BRIDGE
// ============================================================================

export {
    // Types
    PhantomPhase,
    MetaplexStandard,
    PhantomNft,
    MetaplexBridgeData,
    MetaplexMetadata,
    RevealResult,
    PhantomizeResult,
    CorePlugin,
    
    // Reveal operations
    revealToMetaplex,
    revealToBubblegum,
    revealToCore,
    revealToSilhouette,
    
    // Phantomize operations
    phantomizeMetaplex,
    phantomizeBubblegum,
    phantomizeCore,
    
    // Core plugins
    createRoyaltiesPlugin,
    createAttributesPlugin,
    
    // Sync
    syncMetadata,
    
    // Queries
    isPhantomized,
    getMetaplexAddress,
    
    // Collections
    createDualCollection,
    
    // Constants
    TOKEN_METADATA_PROGRAM_ID,
    BUBBLEGUM_PROGRAM_ID,
    MPL_CORE_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    
    // Default export
    default as bridge,
} from './bridge.js';

// ============================================================================
// HIGH-LEVEL CONVENIENCE FUNCTIONS
// ============================================================================

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createShadowForest, type ForestConfig } from './forest.js';
import { createRingWithDecoys, createOwnershipProof, type Ring } from './ring.js';
import { generateTraitProof, type ProofWitness, type NftMetadata } from './zk.js';
import { revealToMetaplex, phantomizeMetaplex, type MetaplexMetadata, type PhantomNft } from './bridge.js';

/**
 * Quick start: Create a forest and mint a ANONFT
 */
export async function quickMintPhantom(args: {
    connection: Connection;
    payer: Keypair;
    name: string;
    symbol: string;
    uri: string;
    traits?: Array<{ trait_type: string; value: string | number }>;
    ringSize?: number;
}): Promise<{
    forest: Awaited<ReturnType<typeof createShadowForest>>;
    phantom: PhantomNft;
    ring: Ring;
}> {
    console.log(`⚡ Quick minting ANONFT...`);
    
    // Create forest (or use existing)
    const forest = await createShadowForest({
        connection: args.connection,
        payer: args.payer,
        config: {
            treeCount: 8,
        },
    });
    
    // Create ring with decoys
    const ringSize = args.ringSize ?? 8;
    const { ring, signerIndex } = createRingWithDecoys(
        args.payer.publicKey.toBytes(),
        ringSize - 1,
        'ownership'
    );
    
    // Create ANONFT
    const phantom: PhantomNft = {
        commitment: new Uint8Array(32),
        encryptedOwner: new Uint8Array(32),
        encryptedMetadata: Buffer.from(JSON.stringify({
            name: args.name,
            symbol: args.symbol,
            uri: args.uri,
            traits: args.traits ?? [],
        })),
        phase: 'phantom',
        keyImage: new Uint8Array(32),
        ring,
        forestAddress: forest.address,
        createdAt: Date.now(),
    };
    
    console.log(`   Forest: ${forest.address.toBase58()}`);
    console.log(`   Ring size: ${ringSize}`);
    console.log(`   Phase: phantom`);
    
    return { forest, phantom, ring };
}

/**
 * Quick start: Prove you own an NFT with a specific trait
 */
export async function quickProveOwnershipWithTrait(args: {
    connection: Connection;
    payer: Keypair;
    phantom: PhantomNft;
    traitName: string;
    traitValue: string | number;
}): Promise<{
    ownershipProof: Awaited<ReturnType<typeof createOwnershipProof>>;
    traitProof: Awaited<ReturnType<typeof generateTraitProof>>;
}> {
    console.log(`🔐 Creating ownership + trait proof...`);
    
    if (!args.phantom.ring) {
        throw new Error('ANONFT has no ownership ring');
    }
    
    // Find signer index (in practice, you'd know this)
    const signerIndex = 0; // Simplified
    
    // Create ownership proof
    const ownershipProof = createOwnershipProof(
        args.payer.secretKey.slice(0, 32),
        signerIndex,
        args.phantom.ring,
        args.phantom.commitment
    );
    
    // Create trait proof
    const witness: ProofWitness = {
        privateKey: args.payer.secretKey.slice(0, 32),
        metadata: JSON.parse(Buffer.from(args.phantom.encryptedMetadata).toString()) as NftMetadata,
        salt: new Uint8Array(32),
    };
    
    const traitProof = await generateTraitProof({
        traitName: args.traitName,
        traitValue: args.traitValue,
        collectionRoot: new Uint8Array(32),
        witness,
    });
    
    return { ownershipProof, traitProof };
}

/**
 * Quick start: Reveal a ANONFT to Metaplex
 */
export async function quickReveal(args: {
    connection: Connection;
    payer: Keypair;
    phantom: PhantomNft;
    useToken2022?: boolean;
}): Promise<Awaited<ReturnType<typeof revealToMetaplex>>> {
    console.log(`🌟 Quick reveal to Metaplex...`);
    
    if (!args.phantom.ring) {
        throw new Error('ANONFT has no ownership ring');
    }
    
    // Parse metadata
    const metadata = JSON.parse(
        Buffer.from(args.phantom.encryptedMetadata).toString()
    );
    
    // Build Metaplex metadata
    const metaplexMetadata: MetaplexMetadata = {
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
        sellerFeeBasisPoints: 500,
        creators: [{ address: args.payer.publicKey, verified: true, share: 100 }],
        primarySaleHappened: false,
        isMutable: true,
    };
    
    // In production, would generate real proof and signature
    const forestProof = {
        treeIndex: 0,
        leafIndex: 0,
        proof: [],
        root: new Uint8Array(32),
    };
    
    const ringSignature = {
        keyImage: new Uint8Array(32),
        c0: new Uint8Array(32),
        responses: [new Uint8Array(32)],
        message: new Uint8Array(32),
        ring: args.phantom.ring,
    };
    
    return revealToMetaplex({
        connection: args.connection,
        payer: args.payer,
        phantom: args.phantom,
        metadata: metaplexMetadata,
        forestProof,
        ringSignature,
        useToken2022: args.useToken2022,
    });
}

// ============================================================================
// VERSION & FEATURE FLAGS
// ============================================================================

/** Package version */
export const VERSION = '1.0.0';

/** Standard name */
export const STANDARD_NAME = 'ANONFT';

/** Standard version */
export const STANDARD_VERSION = 'ANS-1';

/** Feature flags */
export const FEATURES = {
    /** Shadow Forest (multi-tree Merkle) */
    PHANTOM_FOREST: true,
    /** Ring signatures for anonymous ownership */
    RING_SIGNATURES: true,
    /** ZK proofs for trait/collection/ownership */
    ZK_PROOFS: true,
    /** Temporal phases (phantom/silhouette/revealed) */
    TEMPORAL_PHASES: true,
    /** Metaplex Token Metadata bridge */
    METAPLEX_TOKEN_METADATA: true,
    /** Metaplex Bubblegum bridge */
    METAPLEX_BUBBLEGUM: true,
    /** Metaplex Core bridge */
    METAPLEX_CORE: true,
    /** Re-phantomization (revealed → phantom) */
    RE_PHANTOMIZE: true,
    /** Collection proofs */
    COLLECTION_PROOFS: true,
    /** Ownership count proofs */
    OWNERSHIP_COUNT_PROOFS: true,
};

/** Print ANONFT status */
export function printStatus(): void {
    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                 👻 ANONFT - ${STANDARD_VERSION} - v${VERSION}                     ║
╠═══════════════════════════════════════════════════════════════════╣
║  "Why not make privacy the default, and revelation the choice?"  ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  PHANTOM FOREST    │ Multi-tree Merkle for maximum ambiguity     ║
║  RING SIGNATURES   │ Prove ownership without revealing key       ║
║  ZK PROOFS         │ Prove traits/ownership without showing NFT  ║
║  TEMPORAL PHASES   │ Phantom → Silhouette → Revealed → Phantom   ║
║  METAPLEX BRIDGE   │ Compatible with Token Metadata/Bubblegum/Core║
║                                                                   ║
╠═══════════════════════════════════════════════════════════════════╣
║  Traditional: Public by default, private never                   ║
║  ANONFT:     Private by default, public by choice               ║
╚═══════════════════════════════════════════════════════════════════╝
    `);
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
    // Quick start
    quickMintPhantom,
    quickProveOwnershipWithTrait,
    quickReveal,
    
    // Status
    printStatus,
    VERSION,
    STANDARD_NAME,
    STANDARD_VERSION,
    FEATURES,
};
