/**
 * Ring Signature Library for ANONFT
 * 
 * Implements Linkable Spontaneous Anonymous Group (LSAG) signatures:
 * - Prove ownership without revealing which key in the ring
 * - Key images prevent double-spending while maintaining privacy
 * - Supports 2-16 ring members
 * 
 * Innovation: "Why not hide which key signed?"
 * 
 * Traditional: One pubkey = one owner (publicly visible)
 * Ring-signed: Owner is ONE of N pubkeys (observer can't tell which)
 * 
 * Use cases:
 * - Anonymous NFT transfers
 * - Private collection proofs
 * - Deniable ownership
 * 
 * @module @styxstack/styx-nft/ring
 */

import { ed25519 } from '@noble/curves/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { keccak_256 } from '@noble/hashes/sha3';
import {
    Connection,
    Keypair,
    PublicKey,
} from '@solana/web3.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Minimum ring size */
export const MIN_RING_SIZE = 2;

/** Maximum ring size */
export const MAX_RING_SIZE = 16;

/** Recommended ring size for good anonymity */
export const RECOMMENDED_RING_SIZE = 8;

/** Ed25519 curve order */
const L = 2n ** 252n + 27742317777372353535851937790883648493n;

/** Ed25519 base point */
const G = ed25519.ExtendedPoint.BASE;

// ============================================================================
// TYPES
// ============================================================================

/**
 * A ring of public keys
 */
export interface Ring {
    /** Ring ID (hash of all members) */
    id: Uint8Array;
    /** Public keys in the ring */
    members: Uint8Array[];
    /** Creation timestamp */
    createdAt: number;
    /** Ring purpose (ownership, transfer, etc.) */
    purpose: RingPurpose;
}

/**
 * Ring purpose
 */
export type RingPurpose = 'ownership' | 'transfer' | 'collection' | 'auction' | 'custom';

/**
 * LSAG signature
 */
export interface LsagSignature {
    /** Key image (links signatures from same key) */
    keyImage: Uint8Array;
    /** Challenge seed */
    c0: Uint8Array;
    /** Response scalars */
    responses: Uint8Array[];
    /** Message that was signed */
    message: Uint8Array;
    /** Ring used for signing */
    ring: Ring;
}

/**
 * Ownership proof (ring signature over NFT commitment)
 */
export interface OwnershipProof {
    /** The ring signature */
    signature: LsagSignature;
    /** NFT commitment being proved */
    nftCommitment: Uint8Array;
    /** Proof timestamp */
    timestamp: number;
    /** Optional: reveal hint (partial info about owner) */
    revealHint?: Uint8Array;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Hash arbitrary data to a curve point (for key image computation)
 * 
 * Uses try-and-increment with cofactor clearing to ensure the result
 * is in the prime-order subgroup. This is essential for LSAG correctness
 * since scalar multiplication must be associative.
 */
function hashToPoint(data: Uint8Array): typeof G {
    let hash = keccak_256(data);
    let attempts = 0;
    
    while (attempts < 256) {
        try {
            // Try to interpret hash as a curve point
            const point = ed25519.ExtendedPoint.fromHex(hash);
            // CRITICAL: Multiply by cofactor 8 to clear small subgroup component
            // This ensures the point is in the prime-order subgroup where
            // (a * P) * b = (a * b) * P = a * (b * P) holds correctly
            return point.multiply(8n);
        } catch {
            // Not a valid point, try next hash
            hash = keccak_256(hash);
            attempts++;
        }
    }
    
    // Fallback: scalar * G is already in prime order subgroup
    const scalar = bytesToScalar(hash);
    return G.multiply(scalar);
}

/**
 * Convert bytes to a scalar (mod L) in big-endian order
 */
function bytesToScalar(bytes: Uint8Array): bigint {
    let result = 0n;
    for (let i = 0; i < bytes.length; i++) {
        result = (result << 8n) | BigInt(bytes[i]);
    }
    return result % L;
}

/**
 * Convert bytes to a scalar (mod L) in little-endian order
 */
function bytesToScalarLE(bytes: Uint8Array): bigint {
    let result = 0n;
    for (let i = bytes.length - 1; i >= 0; i--) {
        result = (result << 8n) | BigInt(bytes[i]);
    }
    return result % L;
}

/**
 * Derive the ed25519 signing scalar from a private key seed.
 * 
 * ed25519 uses SHA-512 hash of the seed, then clamps the first 32 bytes.
 * This is necessary because ed25519.getPublicKey() uses this derived scalar,
 * so LSAG operations must use the same scalar for consistency.
 */
function deriveEd25519Scalar(seed: Uint8Array): bigint {
    // Hash the seed with SHA-512 (ed25519 standard)
    const h = sha512(seed);
    const h32 = new Uint8Array(h.slice(0, 32));
    
    // Clamp as per ed25519 spec
    h32[0] &= 248;     // Clear lowest 3 bits
    h32[31] &= 127;    // Clear highest bit
    h32[31] |= 64;     // Set second-highest bit
    
    // Convert to scalar (little-endian, as ed25519 uses)
    return bytesToScalarLE(h32);
}

/**
 * Convert scalar to 32 bytes
 */
function scalarToBytes(scalar: bigint): Uint8Array {
    const bytes = new Uint8Array(32);
    let temp = scalar;
    for (let i = 31; i >= 0; i--) {
        bytes[i] = Number(temp & 0xffn);
        temp >>= 8n;
    }
    return bytes;
}

/**
 * Generate a random scalar
 */
function randomScalar(): bigint {
    const bytes = new Uint8Array(64);
    crypto.getRandomValues(bytes);
    return bytesToScalar(bytes);
}

/**
 * Compute challenge hash
 */
function computeChallenge(
    message: Uint8Array,
    lPoints: Array<typeof G>,
    rPoints: Array<typeof G>
): Uint8Array {
    const data = Buffer.concat([
        Buffer.from(message),
        ...lPoints.map(p => Buffer.from(p.toRawBytes())),
        ...rPoints.map(p => Buffer.from(p.toRawBytes())),
    ]);
    return new Uint8Array(keccak_256(data));
}

// ============================================================================
// RING OPERATIONS
// ============================================================================

/**
 * Create a new ring from public keys
 */
export function createRing(
    members: Uint8Array[],
    purpose: RingPurpose = 'ownership'
): Ring {
    if (members.length < MIN_RING_SIZE) {
        throw new Error(`Ring must have at least ${MIN_RING_SIZE} members`);
    }
    if (members.length > MAX_RING_SIZE) {
        throw new Error(`Ring must have at most ${MAX_RING_SIZE} members`);
    }
    
    // Compute ring ID as hash of all members
    const id = keccak_256(Buffer.concat(members.map(m => Buffer.from(m))));
    
    console.log(`💍 Created ring with ${members.length} members`);
    console.log(`   ID: ${Buffer.from(id).toString('hex').slice(0, 16)}...`);
    console.log(`   Purpose: ${purpose}`);
    
    return {
        id: new Uint8Array(id),
        members,
        createdAt: Date.now(),
        purpose,
    };
}

/**
 * Generate decoy public keys for a ring
 * 
 * Decoys should look like real keys to prevent analysis
 */
export function generateDecoys(count: number): Uint8Array[] {
    const decoys: Uint8Array[] = [];
    
    for (let i = 0; i < count; i++) {
        // Generate random keypair
        const kp = Keypair.generate();
        decoys.push(kp.publicKey.toBytes());
    }
    
    console.log(`🎭 Generated ${count} decoy keys`);
    
    return decoys;
}

/**
 * Create a ring with your key hidden among decoys
 */
export function createRingWithDecoys(
    realPublicKey: Uint8Array,
    decoyCount: number,
    purpose: RingPurpose = 'ownership'
): { ring: Ring; signerIndex: number } {
    const decoys = generateDecoys(decoyCount);
    
    // Insert real key at random position
    const signerIndex = Math.floor(Math.random() * (decoyCount + 1));
    const members = [
        ...decoys.slice(0, signerIndex),
        realPublicKey,
        ...decoys.slice(signerIndex),
    ];
    
    const ring = createRing(members, purpose);
    
    return { ring, signerIndex };
}

// ============================================================================
// LSAG SIGNATURE
// ============================================================================

/**
 * Compute key image: I = sk * H_p(pk)
 * 
 * Key images are unique per private key and can be used to:
 * - Detect if the same key signed twice (prevents double-spend)
 * - NOT reveal which key in the ring signed
 */
export function computeKeyImage(privateKey: Uint8Array): Uint8Array {
    // Derive public key
    const pk = ed25519.getPublicKey(privateKey);
    
    // Hash public key to a point
    const hPoint = hashToPoint(pk);
    
    // Derive the proper ed25519 scalar from the private key seed
    const sk = deriveEd25519Scalar(privateKey);
    const keyImage = hPoint.multiply(sk);
    
    return keyImage.toRawBytes();
}

/**
 * Sign a message with LSAG ring signature
 * 
 * @param privateKey - Signer's private key
 * @param signerIndex - Position of signer's public key in ring
 * @param ring - The ring of public keys
 * @param message - Message to sign
 */
export function lsagSign(
    privateKey: Uint8Array,
    signerIndex: number,
    ring: Ring,
    message: Uint8Array
): LsagSignature {
    const n = ring.members.length;
    
    if (signerIndex < 0 || signerIndex >= n) {
        throw new Error('Invalid signer index');
    }
    
    console.log(`✍️ Creating LSAG signature...`);
    console.log(`   Ring size: ${n}`);
    console.log(`   Signer index: [hidden]`);
    
    // Compute key image
    const keyImage = computeKeyImage(privateKey);
    const keyImagePoint = ed25519.ExtendedPoint.fromHex(keyImage);
    
    // Parse public keys to points
    const pubKeyPoints = ring.members.map(pk => ed25519.ExtendedPoint.fromHex(pk));
    
    // Hash points for each member
    const hashPoints = ring.members.map(pk => hashToPoint(pk));
    
    // Derive the proper ed25519 scalar from the private key seed
    const sk = deriveEd25519Scalar(privateKey);
    
    // Generate random values
    const alpha = randomScalar();
    const responses: bigint[] = new Array(n).fill(0n);
    const challenges: bigint[] = new Array(n).fill(0n);
    
    // Initialize random responses for all except signer
    for (let i = 0; i < n; i++) {
        if (i !== signerIndex) {
            responses[i] = randomScalar();
        }
    }
    
    // Compute L_s = alpha * G
    const Ls = G.multiply(alpha);
    
    // Compute R_s = alpha * H_p(pk_s)
    const Rs = hashPoints[signerIndex].multiply(alpha);
    
    // Start computing challenges from signer + 1
    const lPoints: Array<typeof G> = new Array(n);
    const rPoints: Array<typeof G> = new Array(n);
    
    lPoints[signerIndex] = Ls;
    rPoints[signerIndex] = Rs;
    
    // Compute challenge c_{s+1}
    let currentChallenge = bytesToScalar(computeChallenge(message, [Ls], [Rs]));
    
    // Go around the ring
    for (let offset = 1; offset < n; offset++) {
        const i = (signerIndex + offset) % n;
        challenges[i] = currentChallenge;
        
        // L_i = c_i * pk_i + r_i * G
        const Li = pubKeyPoints[i].multiply(currentChallenge).add(G.multiply(responses[i]));
        
        // R_i = c_i * I + r_i * H_p(pk_i)
        const Ri = keyImagePoint.multiply(currentChallenge).add(hashPoints[i].multiply(responses[i]));
        
        lPoints[i] = Li;
        rPoints[i] = Ri;
        
        // Next challenge
        currentChallenge = bytesToScalar(computeChallenge(message, [Li], [Ri]));
    }
    
    // Set challenge for signer
    challenges[signerIndex] = currentChallenge;
    
    // Compute signer's response: r_s = alpha - c_s * sk (mod L)
    responses[signerIndex] = (alpha - (challenges[signerIndex] * sk % L) + L) % L;
    
    // Package signature
    const c0 = scalarToBytes(challenges[0]);
    const responseBytes = responses.map(r => scalarToBytes(r));
    
    console.log(`   Key image: ${Buffer.from(keyImage).toString('hex').slice(0, 16)}...`);
    
    return {
        keyImage,
        c0,
        responses: responseBytes,
        message,
        ring,
    };
}

/**
 * Verify an LSAG ring signature
 */
export function lsagVerify(signature: LsagSignature): boolean {
    const { keyImage, c0, responses, message, ring } = signature;
    const n = ring.members.length;
    
    console.log(`🔍 Verifying LSAG signature...`);
    console.log(`   Ring size: ${n}`);
    
    try {
        // Parse key image
        const keyImagePoint = ed25519.ExtendedPoint.fromHex(keyImage);
        
        // Parse public keys
        const pubKeyPoints = ring.members.map(pk => ed25519.ExtendedPoint.fromHex(pk));
        const hashPoints = ring.members.map(pk => hashToPoint(pk));
        
        // Parse responses
        const responseScalars = responses.map(r => bytesToScalar(r));
        
        // Start verification
        let currentChallenge = bytesToScalar(c0);
        
        for (let i = 0; i < n; i++) {
            // L_i = c_i * pk_i + r_i * G
            const Li = pubKeyPoints[i].multiply(currentChallenge).add(G.multiply(responseScalars[i]));
            
            // R_i = c_i * I + r_i * H_p(pk_i)
            const Ri = keyImagePoint.multiply(currentChallenge).add(hashPoints[i].multiply(responseScalars[i]));
            
            // Next challenge
            currentChallenge = bytesToScalar(computeChallenge(message, [Li], [Ri]));
        }
        
        // Verify: c_n should equal c_0
        const c0Scalar = bytesToScalar(c0);
        const valid = currentChallenge === c0Scalar;
        
        console.log(`   Valid: ${valid}`);
        
        return valid;
    } catch (err) {
        console.log(`   Error: ${err}`);
        return false;
    }
}

// ============================================================================
// OWNERSHIP PROOFS
// ============================================================================

/**
 * Create an ownership proof for an NFT
 * 
 * Proves "I own this NFT" without revealing which key in the ring is yours
 */
export function createOwnershipProof(
    privateKey: Uint8Array,
    signerIndex: number,
    ring: Ring,
    nftCommitment: Uint8Array
): OwnershipProof {
    console.log(`🔐 Creating ownership proof...`);
    console.log(`   NFT: ${Buffer.from(nftCommitment).toString('hex').slice(0, 16)}...`);
    
    // Message is the NFT commitment + timestamp
    const timestamp = Date.now();
    const message = Buffer.concat([
        Buffer.from(nftCommitment),
        Buffer.from(timestamp.toString()),
    ]);
    
    // Sign with ring signature
    const signature = lsagSign(privateKey, signerIndex, ring, message);
    
    return {
        signature,
        nftCommitment,
        timestamp,
    };
}

/**
 * Verify an ownership proof
 */
export function verifyOwnershipProof(proof: OwnershipProof): boolean {
    console.log(`🔍 Verifying ownership proof...`);
    
    // Reconstruct message
    const message = Buffer.concat([
        Buffer.from(proof.nftCommitment),
        Buffer.from(proof.timestamp.toString()),
    ]);
    
    // Verify message matches
    if (!Buffer.from(proof.signature.message).equals(message)) {
        console.log(`   Message mismatch`);
        return false;
    }
    
    // Check timestamp is recent (within 5 minutes)
    const age = Date.now() - proof.timestamp;
    if (age > 5 * 60 * 1000) {
        console.log(`   Proof expired`);
        return false;
    }
    
    // Verify ring signature
    return lsagVerify(proof.signature);
}

/**
 * Check if two signatures are from the same signer (via key image)
 */
export function signaturesFromSameSigner(
    sig1: LsagSignature,
    sig2: LsagSignature
): boolean {
    return Buffer.from(sig1.keyImage).equals(Buffer.from(sig2.keyImage));
}

// ============================================================================
// RING MANAGEMENT
// ============================================================================

/**
 * Add a member to an existing ring
 */
export function addRingMember(ring: Ring, newMember: Uint8Array): Ring {
    if (ring.members.length >= MAX_RING_SIZE) {
        throw new Error(`Ring is at maximum size (${MAX_RING_SIZE})`);
    }
    
    // Insert at random position
    const position = Math.floor(Math.random() * (ring.members.length + 1));
    const newMembers = [
        ...ring.members.slice(0, position),
        newMember,
        ...ring.members.slice(position),
    ];
    
    return createRing(newMembers, ring.purpose);
}

/**
 * Rotate ring (replace all decoys while keeping real owner)
 */
export function rotateRing(
    ring: Ring,
    realPublicKey: Uint8Array,
    currentIndex: number
): { ring: Ring; newIndex: number } {
    const decoyCount = ring.members.length - 1;
    const result = createRingWithDecoys(realPublicKey, decoyCount, ring.purpose);
    return { ring: result.ring, newIndex: result.signerIndex };
}

/**
 * Merge two rings (for combined ownership proofs)
 */
export function mergeRings(ring1: Ring, ring2: Ring): Ring {
    // Deduplicate members
    const allMembers = new Set<string>();
    ring1.members.forEach(m => allMembers.add(Buffer.from(m).toString('hex')));
    ring2.members.forEach(m => allMembers.add(Buffer.from(m).toString('hex')));
    
    const members = Array.from(allMembers).map(hex => {
        const buf = Buffer.from(hex, 'hex');
        return new Uint8Array(buf);
    });
    
    if (members.length > MAX_RING_SIZE) {
        throw new Error(`Merged ring would exceed maximum size`);
    }
    
    return createRing(members, 'custom');
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
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
};
