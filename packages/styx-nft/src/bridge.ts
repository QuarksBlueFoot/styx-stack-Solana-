/**
 * Metaplex Bridge - ANONFT ↔ Metaplex Interoperability
 * 
 * Enables bidirectional conversion between:
 * - ANONFT ANONFTs ↔ Metaplex Token Metadata NFTs
 * - ANONFT ANONFTs ↔ Metaplex Bubblegum cNFTs
 * - ANONFT ANONFTs ↔ Metaplex Core NFTs
 * 
 * Philosophy: "Compatible with everything, better than anything"
 * 
 * When a ANONFT is "revealed", it becomes a standard Metaplex NFT
 * that any marketplace, wallet, or tool can understand.
 * 
 * When a Metaplex NFT is "phantomized", it gains privacy features
 * while remaining linked to its original identity.
 * 
 * @module @styxstack/styx-nft/bridge
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

// Import from local modules
import type { ShadowForest, PhantomLeaf, ForestProof } from './forest.js';
import type { Ring, LsagSignature } from './ring.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Metaplex Token Metadata Program */
export const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

/** Metaplex Bubblegum Program */
export const BUBBLEGUM_PROGRAM_ID = new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY');

/** Metaplex Core Program */
export const MPL_CORE_PROGRAM_ID = new PublicKey('CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d');

/** ANONFT Program ID (placeholder - deploy your own) */
export const STYX_NFT_PROGRAM_ID_BRIDGE = new PublicKey('3bBTcqtLWL8ShLjjCjAKWACAE12E8g4g2Mc3GNFE1McA');

/** Token-2022 Program ID */
export const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

/** SPL Token Program ID */
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

// Bridge instruction tags
export const TAG_REVEAL_TO_METAPLEX = 13;
export const TAG_REVEAL_TO_BUBBLEGUM = 14;
export const TAG_REVEAL_TO_CORE = 15;
export const TAG_PHANTOMIZE_METAPLEX = 16;
export const TAG_PHANTOMIZE_BUBBLEGUM = 17;
export const TAG_PHANTOMIZE_CORE = 18;
export const TAG_SYNC_METADATA = 19;

// ============================================================================
// TYPES
// ============================================================================

/**
 * ANONFT phases (privacy states)
 */
export type PhantomPhase = 'phantom' | 'silhouette' | 'revealed';

/**
 * Target Metaplex standard for reveal
 */
export type MetaplexStandard = 'token-metadata' | 'bubblegum' | 'core';

/**
 * A ANONFT
 */
export interface PhantomNft {
    /** Unique commitment */
    commitment: Uint8Array;
    /** Encrypted owner (ring or stealth) */
    encryptedOwner: Uint8Array;
    /** Encrypted metadata */
    encryptedMetadata: Uint8Array;
    /** Current phase */
    phase: PhantomPhase;
    /** Key image (for double-spend prevention) */
    keyImage: Uint8Array;
    /** Ownership ring */
    ring?: Ring;
    /** Forest location */
    forestAddress?: PublicKey;
    /** Tree index in forest */
    treeIndex?: number;
    /** Leaf index in tree */
    leafIndex?: number;
    /** Creation slot */
    createdAt: number;
    /** Metaplex bridge data (if revealed) */
    metaplexBridge?: MetaplexBridgeData;
}

/**
 * Metaplex bridge data for revealed NFTs
 */
export interface MetaplexBridgeData {
    /** Which Metaplex standard */
    standard: MetaplexStandard;
    /** Mint address (for Token Metadata) */
    mint?: PublicKey;
    /** Metadata account */
    metadata?: PublicKey;
    /** Asset ID (for Bubblegum/Core) */
    assetId?: PublicKey;
    /** Merkle tree (for Bubblegum) */
    merkleTree?: PublicKey;
    /** Collection mint */
    collection?: PublicKey;
    /** Whether collection is verified */
    collectionVerified?: boolean;
}

/**
 * Metaplex-style metadata
 */
export interface MetaplexMetadata {
    /** NFT name */
    name: string;
    /** NFT symbol */
    symbol: string;
    /** URI to off-chain metadata */
    uri: string;
    /** Seller fee basis points (royalties) */
    sellerFeeBasisPoints: number;
    /** Creators */
    creators: Array<{
        address: PublicKey;
        verified: boolean;
        share: number;
    }>;
    /** Collection */
    collection?: {
        verified: boolean;
        key: PublicKey;
    };
    /** Primary sale happened */
    primarySaleHappened: boolean;
    /** Is mutable */
    isMutable: boolean;
}

/**
 * Result of revealing a ANONFT
 */
export interface RevealResult {
    /** Original ANONFT commitment */
    phantomCommitment: Uint8Array;
    /** Metaplex standard used */
    standard: MetaplexStandard;
    /** New mint/asset address */
    address: PublicKey;
    /** Metadata account */
    metadataAccount: PublicKey;
    /** Transaction signature */
    signature: string;
    /** Whether fully revealed or silhouette */
    phase: 'silhouette' | 'revealed';
}

/**
 * Result of phantomizing a Metaplex NFT
 */
export interface PhantomizeResult {
    /** New ANONFT */
    phantom: PhantomNft;
    /** Original Metaplex data */
    original: MetaplexBridgeData;
    /** Transaction signature */
    signature: string;
}

// ============================================================================
// REVEAL OPERATIONS (Phantom → Metaplex)
// ============================================================================

/**
 * Reveal a ANONFT to standard Metaplex Token Metadata.
 * 
 * This creates:
 * 1. A new Token-2022 or SPL Token mint
 * 2. A Metaplex metadata account
 * 3. Transfers ownership to the revealer
 * 
 * The ANONFT is marked as "revealed" but can be re-phantomized later.
 */
export async function revealToMetaplex(args: {
    connection: Connection;
    payer: Keypair;
    phantom: PhantomNft;
    metadata: MetaplexMetadata;
    forestProof: ForestProof;
    ringSignature: LsagSignature;
    useToken2022?: boolean;
}): Promise<RevealResult> {
    const { connection, payer, phantom, metadata, forestProof, ringSignature } = args;
    const useToken2022 = args.useToken2022 ?? true;
    
    console.log(`🌟 Revealing ANONFT to Metaplex...`);
    console.log(`   Commitment: ${Buffer.from(phantom.commitment).toString('hex').slice(0, 16)}...`);
    console.log(`   Using Token-2022: ${useToken2022}`);
    
    // Verify ring signature proves ownership
    // (In production, this would be verified on-chain)
    
    // Generate new mint keypair
    const mint = Keypair.generate();
    
    // Derive metadata PDA
    const [metadataAccount] = PublicKey.findProgramAddressSync(
        [
            Buffer.from('metadata'),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mint.publicKey.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
    );
    
    console.log(`   Mint: ${mint.publicKey.toBase58()}`);
    console.log(`   Metadata: ${metadataAccount.toBase58()}`);
    
    // Build reveal instruction
    const instructionData = Buffer.alloc(1024);
    let offset = 0;
    
    instructionData.writeUInt8(TAG_REVEAL_TO_METAPLEX, offset);
    offset += 1;
    
    // Phantom commitment
    Buffer.from(phantom.commitment).copy(instructionData, offset);
    offset += 32;
    
    // Key image
    Buffer.from(phantom.keyImage).copy(instructionData, offset);
    offset += 32;
    
    // Use Token-2022 flag
    instructionData.writeUInt8(useToken2022 ? 1 : 0, offset);
    offset += 1;
    
    // In production, would send transaction
    
    return {
        phantomCommitment: phantom.commitment,
        standard: 'token-metadata',
        address: mint.publicKey,
        metadataAccount,
        signature: 'simulated',
        phase: 'revealed',
    };
}

/**
 * Reveal a ANONFT to Bubblegum (compressed NFT).
 * 
 * This is more gas-efficient for large collections.
 */
export async function revealToBubblegum(args: {
    connection: Connection;
    payer: Keypair;
    phantom: PhantomNft;
    metadata: MetaplexMetadata;
    merkleTree: PublicKey;
    forestProof: ForestProof;
    ringSignature: LsagSignature;
}): Promise<RevealResult> {
    const { connection, payer, phantom, metadata, merkleTree, forestProof, ringSignature } = args;
    
    console.log(`🌲 Revealing ANONFT to Bubblegum...`);
    console.log(`   Commitment: ${Buffer.from(phantom.commitment).toString('hex').slice(0, 16)}...`);
    console.log(`   Merkle tree: ${merkleTree.toBase58()}`);
    
    // Compute asset ID (hash of tree + nonce)
    const assetId = new PublicKey(
        keccak_256(Buffer.concat([
            merkleTree.toBuffer(),
            Buffer.from(Date.now().toString()),
        ])).slice(0, 32)
    );
    
    // Derive metadata PDA (Bubblegum style)
    const [metadataAccount] = PublicKey.findProgramAddressSync(
        [
            Buffer.from('metadata'),
            BUBBLEGUM_PROGRAM_ID.toBuffer(),
            assetId.toBuffer(),
        ],
        BUBBLEGUM_PROGRAM_ID
    );
    
    console.log(`   Asset ID: ${assetId.toBase58()}`);
    
    return {
        phantomCommitment: phantom.commitment,
        standard: 'bubblegum',
        address: assetId,
        metadataAccount,
        signature: 'simulated',
        phase: 'revealed',
    };
}

/**
 * Reveal a ANONFT to Metaplex Core.
 * 
 * Core is Metaplex's newest standard with plugins.
 */
export async function revealToCore(args: {
    connection: Connection;
    payer: Keypair;
    phantom: PhantomNft;
    metadata: MetaplexMetadata;
    forestProof: ForestProof;
    ringSignature: LsagSignature;
    plugins?: CorePlugin[];
}): Promise<RevealResult> {
    const { connection, payer, phantom, metadata, forestProof, ringSignature, plugins } = args;
    
    console.log(`⚡ Revealing ANONFT to Metaplex Core...`);
    console.log(`   Commitment: ${Buffer.from(phantom.commitment).toString('hex').slice(0, 16)}...`);
    console.log(`   Plugins: ${plugins?.length ?? 0}`);
    
    // Generate asset address
    const asset = Keypair.generate();
    
    // Derive metadata (Core stores inline)
    const metadataAccount = asset.publicKey;
    
    console.log(`   Asset: ${asset.publicKey.toBase58()}`);
    
    return {
        phantomCommitment: phantom.commitment,
        standard: 'core',
        address: asset.publicKey,
        metadataAccount,
        signature: 'simulated',
        phase: 'revealed',
    };
}

/**
 * Reveal to silhouette (metadata visible, owner hidden)
 */
export async function revealToSilhouette(args: {
    connection: Connection;
    payer: Keypair;
    phantom: PhantomNft;
    metadata: MetaplexMetadata;
    standard: MetaplexStandard;
    ringSignature: LsagSignature;
}): Promise<RevealResult> {
    const { phantom, metadata, standard } = args;
    
    console.log(`👤 Revealing to Silhouette...`);
    console.log(`   Standard: ${standard}`);
    console.log(`   Owner: [ring-hidden]`);
    
    // In silhouette mode:
    // - Metadata is public
    // - Owner is ring (not revealed which member)
    
    const address = Keypair.generate().publicKey;
    
    return {
        phantomCommitment: phantom.commitment,
        standard,
        address,
        metadataAccount: address,
        signature: 'simulated',
        phase: 'silhouette',
    };
}

// ============================================================================
// PHANTOMIZE OPERATIONS (Metaplex → Phantom)
// ============================================================================

/**
 * Phantomize a Metaplex Token Metadata NFT.
 * 
 * The original NFT is held in escrow while the Phantom version exists.
 */
export async function phantomizeMetaplex(args: {
    connection: Connection;
    payer: Keypair;
    mint: PublicKey;
    forest: ShadowForest;
    ring: Ring;
    signerIndex: number;
}): Promise<PhantomizeResult> {
    const { connection, payer, mint, forest, ring, signerIndex } = args;
    
    console.log(`👻 Phantomizing Metaplex NFT...`);
    console.log(`   Mint: ${mint.toBase58()}`);
    console.log(`   Ring size: ${ring.members.length}`);
    
    // Fetch existing metadata
    const [metadataAccount] = PublicKey.findProgramAddressSync(
        [
            Buffer.from('metadata'),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
    );
    
    // Create commitment
    const commitment = keccak_256(Buffer.concat([
        mint.toBuffer(),
        Buffer.from(ring.id),
        Buffer.from(Date.now().toString()),
    ]));
    
    // Create key image
    const keyImage = keccak_256(Buffer.concat([
        Buffer.from(commitment),
        Buffer.from('key_image'),
    ]));
    
    // Build ANONFT
    const phantom: PhantomNft = {
        commitment: new Uint8Array(commitment),
        encryptedOwner: new Uint8Array(32), // Encrypted with ring key
        encryptedMetadata: new Uint8Array(256), // Encrypted metadata
        phase: 'phantom',
        keyImage: new Uint8Array(keyImage),
        ring,
        forestAddress: forest.address,
        treeIndex: 0, // Would be selected by forest
        leafIndex: 0, // Would be assigned
        createdAt: Date.now(),
        metaplexBridge: {
            standard: 'token-metadata',
            mint,
            metadata: metadataAccount,
        },
    };
    
    console.log(`   Commitment: ${Buffer.from(commitment).toString('hex').slice(0, 16)}...`);
    
    return {
        phantom,
        original: phantom.metaplexBridge!,
        signature: 'simulated',
    };
}

/**
 * Phantomize a Bubblegum cNFT
 */
export async function phantomizeBubblegum(args: {
    connection: Connection;
    payer: Keypair;
    assetId: PublicKey;
    merkleTree: PublicKey;
    leafIndex: number;
    proof: Uint8Array[];
    forest: ShadowForest;
    ring: Ring;
}): Promise<PhantomizeResult> {
    const { assetId, merkleTree, forest, ring } = args;
    
    console.log(`👻 Phantomizing Bubblegum cNFT...`);
    console.log(`   Asset: ${assetId.toBase58()}`);
    console.log(`   Tree: ${merkleTree.toBase58()}`);
    
    const commitment = keccak_256(Buffer.concat([
        assetId.toBuffer(),
        merkleTree.toBuffer(),
        Buffer.from(ring.id),
    ]));
    
    const keyImage = keccak_256(Buffer.concat([
        Buffer.from(commitment),
        Buffer.from('key_image'),
    ]));
    
    const phantom: PhantomNft = {
        commitment: new Uint8Array(commitment),
        encryptedOwner: new Uint8Array(32),
        encryptedMetadata: new Uint8Array(256),
        phase: 'phantom',
        keyImage: new Uint8Array(keyImage),
        ring,
        forestAddress: forest.address,
        createdAt: Date.now(),
        metaplexBridge: {
            standard: 'bubblegum',
            assetId,
            merkleTree,
        },
    };
    
    return {
        phantom,
        original: phantom.metaplexBridge!,
        signature: 'simulated',
    };
}

/**
 * Phantomize a Metaplex Core NFT
 */
export async function phantomizeCore(args: {
    connection: Connection;
    payer: Keypair;
    asset: PublicKey;
    forest: ShadowForest;
    ring: Ring;
}): Promise<PhantomizeResult> {
    const { asset, forest, ring } = args;
    
    console.log(`👻 Phantomizing Metaplex Core NFT...`);
    console.log(`   Asset: ${asset.toBase58()}`);
    
    const commitment = keccak_256(Buffer.concat([
        asset.toBuffer(),
        Buffer.from(ring.id),
    ]));
    
    const keyImage = keccak_256(Buffer.concat([
        Buffer.from(commitment),
        Buffer.from('key_image'),
    ]));
    
    const phantom: PhantomNft = {
        commitment: new Uint8Array(commitment),
        encryptedOwner: new Uint8Array(32),
        encryptedMetadata: new Uint8Array(256),
        phase: 'phantom',
        keyImage: new Uint8Array(keyImage),
        ring,
        forestAddress: forest.address,
        createdAt: Date.now(),
        metaplexBridge: {
            standard: 'core',
            assetId: asset,
        },
    };
    
    return {
        phantom,
        original: phantom.metaplexBridge!,
        signature: 'simulated',
    };
}

// ============================================================================
// CORE PLUGINS (For Metaplex Core integration)
// ============================================================================

/**
 * Metaplex Core plugin types
 */
export type CorePlugin = 
    | { type: 'royalties'; basisPoints: number; creators: Array<{ address: PublicKey; share: number }> }
    | { type: 'freezeDelegate'; frozen: boolean }
    | { type: 'burnDelegate' }
    | { type: 'transferDelegate' }
    | { type: 'updateDelegate' }
    | { type: 'attributes'; attributes: Array<{ key: string; value: string }> }
    | { type: 'permanentFreeze'; frozen: boolean }
    | { type: 'permanentTransfer'; authority: PublicKey }
    | { type: 'permanentBurn' };

/**
 * Create royalties plugin for Core
 */
export function createRoyaltiesPlugin(
    basisPoints: number,
    creators: Array<{ address: PublicKey; share: number }>
): CorePlugin {
    return {
        type: 'royalties',
        basisPoints,
        creators,
    };
}

/**
 * Create attributes plugin for Core
 */
export function createAttributesPlugin(
    attributes: Array<{ key: string; value: string }>
): CorePlugin {
    return {
        type: 'attributes',
        attributes,
    };
}

// ============================================================================
// METADATA SYNC
// ============================================================================

/**
 * Sync metadata between Phantom and Metaplex representations
 */
export async function syncMetadata(args: {
    connection: Connection;
    payer: Keypair;
    phantom: PhantomNft;
    direction: 'phantom-to-metaplex' | 'metaplex-to-phantom';
}): Promise<string> {
    const { phantom, direction } = args;
    
    console.log(`🔄 Syncing metadata...`);
    console.log(`   Direction: ${direction}`);
    
    if (!phantom.metaplexBridge) {
        throw new Error('ANONFT has no Metaplex bridge');
    }
    
    // In production, would update appropriate account
    return 'simulated';
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Check if a Metaplex NFT has been phantomized
 */
export async function isPhantomized(args: {
    connection: Connection;
    mint: PublicKey;
}): Promise<{ phantomized: boolean; phantom?: PhantomNft }> {
    console.log(`🔍 Checking phantomization status...`);
    
    // In production, query indexer or on-chain
    return { phantomized: false };
}

/**
 * Get the Metaplex representation of a revealed ANONFT
 */
export function getMetaplexAddress(phantom: PhantomNft): PublicKey | null {
    if (phantom.phase === 'phantom') {
        return null;
    }
    
    if (!phantom.metaplexBridge) {
        return null;
    }
    
    return phantom.metaplexBridge.mint ?? 
           phantom.metaplexBridge.assetId ?? 
           null;
}

// ============================================================================
// COLLECTION OPERATIONS
// ============================================================================

/**
 * Create a collection with both Phantom and Metaplex representations
 */
export async function createDualCollection(args: {
    connection: Connection;
    payer: Keypair;
    name: string;
    symbol: string;
    uri: string;
    forest: ShadowForest;
}): Promise<{
    phantomCollectionId: Uint8Array;
    metaplexCollectionMint: PublicKey;
}> {
    const { name, symbol, forest } = args;
    
    console.log(`📁 Creating dual collection...`);
    console.log(`   Name: ${name}`);
    
    // Create Phantom collection ID
    const phantomCollectionId = keccak_256(Buffer.concat([
        Buffer.from(name),
        Buffer.from(symbol),
        forest.address.toBuffer(),
    ]));
    
    // Create Metaplex collection mint
    const metaplexCollectionMint = Keypair.generate().publicKey;
    
    console.log(`   Phantom ID: ${Buffer.from(phantomCollectionId).toString('hex').slice(0, 16)}...`);
    console.log(`   Metaplex: ${metaplexCollectionMint.toBase58()}`);
    
    return {
        phantomCollectionId: new Uint8Array(phantomCollectionId),
        metaplexCollectionMint,
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
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
    STYX_NFT_PROGRAM_ID_BRIDGE,
};
