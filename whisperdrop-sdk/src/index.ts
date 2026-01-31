/**
 * @styx-stack/whisperdrop-sdk
 * 
 * TypeScript SDK for WhisperDrop - Privacy-Preserving Airdrops on Solana
 * 
 * Features:
 * - Merkle tree generation and proof creation
 * - Token-gated claiming (NFT, token balance)
 * - Campaign creation and management
 * - Claim and reclaim operations
 * 
 * @author @moonmanquark (Bluefoot Labs)
 * @license Apache-2.0
 */

import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    TransactionInstruction,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha256';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Mainnet Program ID */
export const WHISPERDROP_PROGRAM_ID = new PublicKey('GhstFNnEbixAGQgLnWg1nWetJQgGfSUMhnxdBA6hWu5e');

/** Devnet Program ID */
export const WHISPERDROP_DEVNET_PROGRAM_ID = new PublicKey('BPM5VuX9YrG7CgueWGxtqQZBQwMTacc315ppWCtTCJ5q');

/** Token Program ID (SPL Token) */
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

/** Token-2022 Program ID */
export const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

/** Metaplex Token Metadata Program ID */
export const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

/** Bubblegum (cNFT) Program ID */
export const BUBBLEGUM_PROGRAM_ID = new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY');

// PDA Seeds
const SEED_CAMPAIGN = Buffer.from('wd_campaign');
const SEED_ESCROW = Buffer.from('wd_escrow');
const SEED_NULLIFIER = Buffer.from('wd_null');

// Domain separators
const LEAF_DOMAIN = Buffer.from('whisperdrop:leaf:v1');
const NODE_DOMAIN = Buffer.from('whisperdrop:node:v1');

// Instruction tags
const TAG_INIT_CAMPAIGN = 0;
const TAG_CLAIM = 1;
const TAG_RECLAIM = 2;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Gate type for selective claiming
 * 
 * Supports multiple token standards:
 * - SPL Token (original Solana token program)
 * - Token-2022 (Token Extensions)
 * - NFT (Metaplex standard)
 * - cNFT (Compressed NFT via Bubblegum)
 */
export enum GateType {
    /** No gate - anyone with valid proof can claim */
    None = 0,
    
    // SPL Token (TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA)
    /** Must hold any amount of SPL token */
    SplTokenHolder = 1,
    /** Must hold minimum balance of SPL token */
    SplMinBalance = 2,
    
    // Token-2022 (TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb)
    /** Must hold any amount of Token-2022 token */
    Token22Holder = 3,
    /** Must hold minimum balance of Token-2022 token */
    Token22MinBalance = 4,
    
    // NFT (Metaplex via SPL Token)
    /** Must hold specific NFT */
    NftHolder = 5,
    /** Must hold NFT from verified collection */
    NftCollection = 6,
    
    // cNFT (Compressed NFT via Bubblegum)
    /** Must hold specific cNFT */
    CnftHolder = 7,
    /** Must hold cNFT from collection */
    CnftCollection = 8,
}

/**
 * Helper to determine which token program a gate type uses
 */
export function getTokenProgramForGate(gateType: GateType): PublicKey | null {
    switch (gateType) {
        case GateType.SplTokenHolder:
        case GateType.SplMinBalance:
        case GateType.NftHolder:
        case GateType.NftCollection:
            return TOKEN_PROGRAM_ID;
        case GateType.Token22Holder:
        case GateType.Token22MinBalance:
            return TOKEN_2022_PROGRAM_ID;
        case GateType.CnftHolder:
        case GateType.CnftCollection:
            // cNFT uses Bubblegum, no traditional token account
            return null;
        default:
            return null;
    }
}

/**
 * Check if gate type requires minimum balance check
 */
export function requiresMinBalance(gateType: GateType): boolean {
    return gateType === GateType.SplMinBalance || gateType === GateType.Token22MinBalance;
}

/**
 * Check if gate type is for compressed NFTs
 */
export function isCnftGate(gateType: GateType): boolean {
    return gateType === GateType.CnftHolder || gateType === GateType.CnftCollection;
}

/** Recipient allocation for Merkle tree */
export interface Allocation {
    recipient: PublicKey;
    amount: bigint;
    nonce: Uint8Array; // 16 bytes
}

/** Campaign configuration */
export interface CampaignConfig {
    campaignId: Uint8Array; // 32 bytes
    merkleRoot: Uint8Array; // 32 bytes
    expiryUnix: bigint;
    gateType?: GateType;
    gateMint?: PublicKey;
    gateAmount?: bigint;
}

/** Merkle proof for claiming */
export interface MerkleProof {
    allocation: Allocation;
    proof: Uint8Array[]; // Array of 32-byte nodes
}

/** Campaign state (on-chain) */
export interface Campaign {
    authority: PublicKey;
    mint: PublicKey;
    campaignId: Uint8Array;
    merkleRoot: Uint8Array;
    expiryUnix: bigint;
    gateType: GateType;
    gateMint: PublicKey;
    gateAmount: bigint;
}

// ============================================================================
// MERKLE TREE
// ============================================================================

/**
 * Compute leaf hash for an allocation
 */
export function computeLeafHash(
    campaignId: Uint8Array,
    recipient: PublicKey,
    amount: bigint,
    nonce: Uint8Array
): Uint8Array {
    const amountBytes = Buffer.alloc(8);
    amountBytes.writeBigUInt64LE(amount);
    
    const data = Buffer.concat([
        LEAF_DOMAIN,
        Buffer.from(campaignId),
        recipient.toBytes(),
        amountBytes,
        Buffer.from(nonce),
    ]);
    
    return sha256(data);
}

/**
 * Compute node hash (sorted pair)
 */
export function computeNodeHash(left: Uint8Array, right: Uint8Array): Uint8Array {
    // Sort for order-independence
    const [first, second] = Buffer.compare(Buffer.from(left), Buffer.from(right)) <= 0
        ? [left, right]
        : [right, left];
    
    return sha256(Buffer.concat([
        NODE_DOMAIN,
        Buffer.from(first),
        Buffer.from(second),
    ]));
}

/**
 * Build Merkle tree from allocations
 * Returns root hash and all proofs
 */
export function buildMerkleTree(
    campaignId: Uint8Array,
    allocations: Allocation[]
): { root: Uint8Array; proofs: Map<string, Uint8Array[]> } {
    if (allocations.length === 0) {
        throw new Error('Cannot build tree with no allocations');
    }
    
    // Compute leaf hashes
    const leaves = allocations.map(a => 
        computeLeafHash(campaignId, a.recipient, a.amount, a.nonce)
    );
    
    // Build tree bottom-up
    let currentLevel = leaves;
    const tree: Uint8Array[][] = [currentLevel];
    
    while (currentLevel.length > 1) {
        const nextLevel: Uint8Array[] = [];
        for (let i = 0; i < currentLevel.length; i += 2) {
            const left = currentLevel[i];
            const right = currentLevel[i + 1] || left; // Duplicate if odd
            nextLevel.push(computeNodeHash(left, right));
        }
        tree.push(nextLevel);
        currentLevel = nextLevel;
    }
    
    const root = tree[tree.length - 1][0];
    
    // Generate proofs for each leaf
    const proofs = new Map<string, Uint8Array[]>();
    
    for (let leafIndex = 0; leafIndex < allocations.length; leafIndex++) {
        const proof: Uint8Array[] = [];
        let index = leafIndex;
        
        for (let level = 0; level < tree.length - 1; level++) {
            const isLeft = index % 2 === 0;
            const siblingIndex = isLeft ? index + 1 : index - 1;
            
            if (siblingIndex < tree[level].length) {
                proof.push(tree[level][siblingIndex]);
            } else {
                proof.push(tree[level][index]); // Duplicate
            }
            
            index = Math.floor(index / 2);
        }
        
        proofs.set(allocations[leafIndex].recipient.toBase58(), proof);
    }
    
    return { root, proofs };
}

/**
 * Verify Merkle proof
 */
export function verifyMerkleProof(
    campaignId: Uint8Array,
    allocation: Allocation,
    proof: Uint8Array[],
    root: Uint8Array
): boolean {
    let current = computeLeafHash(
        campaignId,
        allocation.recipient,
        allocation.amount,
        allocation.nonce
    );
    
    for (const sibling of proof) {
        current = computeNodeHash(current, sibling);
    }
    
    return Buffer.from(current).equals(Buffer.from(root));
}

// ============================================================================
// PDA DERIVATION
// ============================================================================

/**
 * Derive campaign PDA
 */
export function deriveCampaignPDA(
    campaignId: Uint8Array,
    programId: PublicKey = WHISPERDROP_PROGRAM_ID
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [SEED_CAMPAIGN, Buffer.from(campaignId)],
        programId
    );
}

/**
 * Derive escrow PDA
 */
export function deriveEscrowPDA(
    campaignPDA: PublicKey,
    programId: PublicKey = WHISPERDROP_PROGRAM_ID
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [SEED_ESCROW, campaignPDA.toBytes()],
        programId
    );
}

/**
 * Derive nullifier PDA
 */
export function deriveNullifierPDA(
    campaignPDA: PublicKey,
    recipient: PublicKey,
    programId: PublicKey = WHISPERDROP_PROGRAM_ID
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [SEED_NULLIFIER, campaignPDA.toBytes(), recipient.toBytes()],
        programId
    );
}

// ============================================================================
// SDK CLASS
// ============================================================================

/**
 * WhisperDrop SDK
 */
export class WhisperDrop {
    connection: Connection;
    programId: PublicKey;

    constructor(connection: Connection, programId?: PublicKey) {
        this.connection = connection;
        this.programId = programId || WHISPERDROP_PROGRAM_ID;
    }

    /**
     * Initialize a new airdrop campaign
     */
    async initCampaign(
        authority: Keypair,
        mint: PublicKey,
        config: CampaignConfig
    ): Promise<{ signature: string; campaignPDA: PublicKey; escrowPDA: PublicKey }> {
        const [campaignPDA] = deriveCampaignPDA(config.campaignId, this.programId);
        const [escrowPDA] = deriveEscrowPDA(campaignPDA, this.programId);
        
        // Build instruction data
        // V2: [tag:1][campaign_id:32][merkle_root:32][expiry:8][gate_type:1][gate_mint:32][gate_amount:8]
        const expiryBuf = Buffer.alloc(8);
        expiryBuf.writeBigInt64LE(config.expiryUnix);
        
        const gateAmountBuf = Buffer.alloc(8);
        gateAmountBuf.writeBigUInt64LE(config.gateAmount || 0n);
        
        const data = Buffer.concat([
            Buffer.from([TAG_INIT_CAMPAIGN]),
            Buffer.from(config.campaignId),
            Buffer.from(config.merkleRoot),
            expiryBuf,
            Buffer.from([config.gateType || GateType.None]),
            (config.gateMint || PublicKey.default).toBytes(),
            gateAmountBuf,
        ]);
        
        const instruction = new TransactionInstruction({
            programId: this.programId,
            keys: [
                { pubkey: authority.publicKey, isSigner: true, isWritable: true },
                { pubkey: campaignPDA, isSigner: false, isWritable: true },
                { pubkey: escrowPDA, isSigner: false, isWritable: true },
                { pubkey: mint, isSigner: false, isWritable: false },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
            ],
            data,
        });
        
        const tx = new Transaction().add(instruction);
        const signature = await sendAndConfirmTransaction(this.connection, tx, [authority]);
        
        return { signature, campaignPDA, escrowPDA };
    }

    /**
     * Claim tokens with Merkle proof
     */
    async claim(
        payer: Keypair,
        recipient: Keypair,
        campaignPDA: PublicKey,
        allocation: Allocation,
        proof: Uint8Array[],
        recipientATA: PublicKey,
        gateTokenAccount?: PublicKey
    ): Promise<string> {
        const [escrowPDA] = deriveEscrowPDA(campaignPDA, this.programId);
        const [nullifierPDA] = deriveNullifierPDA(campaignPDA, recipient.publicKey, this.programId);
        
        // Build instruction data
        // [tag:1][amount:8][nonce:16][proof_len:1][proof:32*n]
        const amountBuf = Buffer.alloc(8);
        amountBuf.writeBigUInt64LE(allocation.amount);
        
        const proofData = Buffer.concat(proof.map(p => Buffer.from(p)));
        
        const data = Buffer.concat([
            Buffer.from([TAG_CLAIM]),
            amountBuf,
            Buffer.from(allocation.nonce),
            Buffer.from([proof.length]),
            proofData,
        ]);
        
        const keys = [
            { pubkey: payer.publicKey, isSigner: true, isWritable: true },
            { pubkey: recipient.publicKey, isSigner: true, isWritable: false },
            { pubkey: campaignPDA, isSigner: false, isWritable: false },
            { pubkey: escrowPDA, isSigner: false, isWritable: true },
            { pubkey: recipientATA, isSigner: false, isWritable: true },
            { pubkey: nullifierPDA, isSigner: false, isWritable: true },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ];
        
        // Add gate token account if provided
        if (gateTokenAccount) {
            keys.push({ pubkey: gateTokenAccount, isSigner: false, isWritable: false });
        }
        
        const instruction = new TransactionInstruction({
            programId: this.programId,
            keys,
            data,
        });
        
        const tx = new Transaction().add(instruction);
        const signers = payer.publicKey.equals(recipient.publicKey) 
            ? [payer] 
            : [payer, recipient];
        
        return await sendAndConfirmTransaction(this.connection, tx, signers);
    }

    /**
     * Reclaim remaining tokens after expiry
     */
    async reclaim(
        authority: Keypair,
        campaignPDA: PublicKey,
        authorityATA: PublicKey
    ): Promise<string> {
        const [escrowPDA] = deriveEscrowPDA(campaignPDA, this.programId);
        
        const data = Buffer.from([TAG_RECLAIM]);
        
        const instruction = new TransactionInstruction({
            programId: this.programId,
            keys: [
                { pubkey: authority.publicKey, isSigner: true, isWritable: false },
                { pubkey: campaignPDA, isSigner: false, isWritable: false },
                { pubkey: escrowPDA, isSigner: false, isWritable: true },
                { pubkey: authorityATA, isSigner: false, isWritable: true },
                { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ],
            data,
        });
        
        const tx = new Transaction().add(instruction);
        return await sendAndConfirmTransaction(this.connection, tx, [authority]);
    }

    /**
     * Check if recipient has already claimed
     */
    async hasClaimed(campaignPDA: PublicKey, recipient: PublicKey): Promise<boolean> {
        const [nullifierPDA] = deriveNullifierPDA(campaignPDA, recipient, this.programId);
        const account = await this.connection.getAccountInfo(nullifierPDA);
        return account !== null && account.data.length > 0;
    }

    /**
     * Get campaign state
     */
    async getCampaign(campaignPDA: PublicKey): Promise<Campaign | null> {
        const account = await this.connection.getAccountInfo(campaignPDA);
        if (!account) return null;
        
        const data = account.data;
        if (data.length < 180 || data[0] !== 1) return null;
        
        let offset = 1;
        
        const authority = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        
        const mint = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        
        const campaignId = data.slice(offset, offset + 32);
        offset += 32;
        
        const merkleRoot = data.slice(offset, offset + 32);
        offset += 32;
        
        const expiryUnix = data.readBigInt64LE(offset);
        offset += 8;
        
        offset += 2; // bumps
        
        const gateType = data[offset] as GateType;
        offset += 1;
        
        const gateMint = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        
        const gateAmount = data.readBigUInt64LE(offset);
        
        return {
            authority,
            mint,
            campaignId,
            merkleRoot,
            expiryUnix,
            gateType,
            gateMint,
            gateAmount,
        };
    }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Generate random nonce for allocation
 */
export function generateNonce(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Generate campaign ID
 */
export function generateCampaignId(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(32));
}

// ============================================================================
// EXPORTS
// ============================================================================

export default WhisperDrop;
