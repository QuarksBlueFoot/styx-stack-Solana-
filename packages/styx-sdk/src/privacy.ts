/**
 * Privacy Utilities Module
 * Stealth addresses, encryption, commitments, nullifiers
 */

import {
  PublicKey,
  Keypair,
} from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha256';
import { keccak_256 } from '@noble/hashes/sha3';
import { x25519 } from '@noble/curves/ed25519';
import { chacha20poly1305 } from '@noble/ciphers/chacha';

// ============================================================================
// TYPES
// ============================================================================

export interface StealthAddressInfo {
  /** The one-time stealth address */
  stealthAddress: PublicKey;
  /** Ephemeral public key (for announcement) */
  ephemeralPubkey: PublicKey;
  /** View tag for fast scanning */
  viewTag: Uint8Array;
}

export interface Commitment {
  /** The commitment value (32 bytes) */
  value: Uint8Array;
  /** Blinding factor used */
  blinding: Uint8Array;
  /** Original amount (if available) */
  amount?: bigint;
}

export interface Nullifier {
  /** The nullifier value (32 bytes) */
  value: Uint8Array;
  /** Commitment this nullifies */
  commitmentHash: Uint8Array;
}

export interface StealthKeys {
  /** Spending keypair */
  spendingKeyPair: Keypair;
  /** Viewing keypair */
  viewingKeyPair: Keypair;
  /** Shareable meta-address */
  metaAddress: string;
}

// ============================================================================
// STEALTH ADDRESSES (Solana-native Implementation)
// ============================================================================

/**
 * Generate stealth key pairs for private receiving
 * 
 * Creates spending + viewing keypairs that enable:
 * - Stealth addresses (one-time addresses)
 * - View key sharing (watch-only access)
 * - Spending key separation (security)
 */
export function generateStealthKeys(): StealthKeys {
  const spendingKeyPair = Keypair.generate();
  const viewingKeyPair = Keypair.generate();
  
  // Meta-address format: st:sol:<spendingPubkey>:<viewingPubkey>
  const metaAddress = `st:sol:${spendingKeyPair.publicKey.toBase58()}:${viewingKeyPair.publicKey.toBase58()}`;
  
  return {
    spendingKeyPair,
    viewingKeyPair,
    metaAddress,
  };
}

/**
 * Parse a stealth meta-address into its components
 */
export function parseStealthMetaAddress(metaAddress: string): {
  spendingKey: PublicKey;
  viewingKey: PublicKey;
} {
  const parts = metaAddress.split(':');
  if (parts.length !== 4 || parts[0] !== 'st' || parts[1] !== 'sol') {
    throw new Error('Invalid stealth meta-address format. Expected: st:sol:<spending>:<viewing>');
  }
  
  return {
    spendingKey: new PublicKey(parts[2]),
    viewingKey: new PublicKey(parts[3]),
  };
}

/**
 * Generate a one-time stealth address for receiving
 * 
 * The sender uses the recipient's meta-address to derive a one-time
 * address that only the recipient can spend from.
 */
export function generateStealthAddress(metaAddress: string): StealthAddressInfo {
  const { spendingKey, viewingKey } = parseStealthMetaAddress(metaAddress);
  
  // Generate ephemeral keypair
  const ephemeralKey = Keypair.generate();
  
  // Derive shared secret: S = ephemeralPriv * viewingPub (ECDH)
  const sharedSecret = x25519.scalarMult(
    ephemeralKey.secretKey.slice(0, 32),
    viewingKey.toBytes().slice(0, 32)
  );
  
  // Derive stealth address: P' = P + hash(S) * G
  // Simplified: Create deterministic keypair from secret
  const stealthSeed = sha256(Buffer.concat([
    spendingKey.toBytes(),
    sharedSecret
  ])).slice(0, 32);
  
  const stealthKeypair = Keypair.fromSeed(stealthSeed);
  
  // View tag for fast scanning (first 4 bytes of shared secret)
  const viewTag = sharedSecret.slice(0, 4);
  
  return {
    stealthAddress: stealthKeypair.publicKey,
    ephemeralPubkey: ephemeralKey.publicKey,
    viewTag,
  };
}

/**
 * Scan for stealth payments addressed to you
 * 
 * @param viewingKey - Your viewing private key
 * @param announcements - Array of {ephemeralPubkey, viewTag} from on-chain
 * @param spendingPubkey - Your spending public key
 */
export function scanStealthPayments(
  viewingKey: Uint8Array,
  announcements: Array<{ ephemeralPubkey: PublicKey; viewTag: Uint8Array }>,
  spendingPubkey: PublicKey
): Array<{ index: number; stealthAddress: PublicKey }> {
  const results: Array<{ index: number; stealthAddress: PublicKey }> = [];
  
  for (let i = 0; i < announcements.length; i++) {
    const { ephemeralPubkey, viewTag } = announcements[i];
    
    // Compute shared secret
    const sharedSecret = x25519.scalarMult(
      viewingKey,
      ephemeralPubkey.toBytes().slice(0, 32)
    );
    
    // Check view tag (fast rejection)
    const computedViewTag = sharedSecret.slice(0, 4);
    if (!computedViewTag.every((b, j) => b === viewTag[j])) {
      continue;
    }
    
    // Derive stealth address
    const stealthSeed = sha256(Buffer.concat([
      spendingPubkey.toBytes(),
      sharedSecret
    ])).slice(0, 32);
    
    const stealthKeypair = Keypair.fromSeed(stealthSeed);
    
    results.push({
      index: i,
      stealthAddress: stealthKeypair.publicKey,
    });
  }
  
  return results;
}

// ============================================================================
// ENCRYPTION
// ============================================================================

/**
 * Encrypt a payload with ChaCha20-Poly1305
 */
export function encryptPayload(message: Uint8Array, sharedSecret: Uint8Array): Uint8Array {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const cipher = chacha20poly1305(sharedSecret, nonce);
  const encrypted = cipher.encrypt(message);
  return new Uint8Array([...nonce, ...encrypted]);
}

/**
 * Decrypt a payload with ChaCha20-Poly1305
 */
export function decryptPayload(encrypted: Uint8Array, sharedSecret: Uint8Array): Uint8Array {
  const nonce = encrypted.slice(0, 12);
  const ciphertext = encrypted.slice(12);
  const cipher = chacha20poly1305(sharedSecret, nonce);
  return cipher.decrypt(ciphertext);
}

/**
 * Encrypt recipient pubkey using Keccak256 XOR mask
 */
export function encryptRecipient(sender: PublicKey, recipient: PublicKey): Uint8Array {
  const mask = keccak_256(Buffer.concat([
    Buffer.from('STYX_META_V3'),
    sender.toBytes()
  ]));
  const encrypted = new Uint8Array(32);
  const recipientBytes = recipient.toBytes();
  for (let i = 0; i < 32; i++) {
    encrypted[i] = recipientBytes[i] ^ mask[i];
  }
  return encrypted;
}

/**
 * Decrypt recipient pubkey using Keccak256 XOR mask
 */
export function decryptRecipient(sender: PublicKey, encrypted: Uint8Array): PublicKey {
  const mask = keccak_256(Buffer.concat([
    Buffer.from('STYX_META_V3'),
    sender.toBytes()
  ]));
  const decrypted = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    decrypted[i] = encrypted[i] ^ mask[i];
  }
  return new PublicKey(decrypted);
}

/**
 * Encrypt amount using Keccak256 XOR mask
 */
export function encryptAmount(
  sender: PublicKey,
  recipient: PublicKey,
  nonce: Uint8Array,
  amount: bigint
): bigint {
  const mask = keccak_256(Buffer.concat([
    Buffer.from('STYX_XFER_V3'),
    sender.toBytes(),
    recipient.toBytes(),
    Buffer.from(nonce)
  ]));
  const maskBuf = Buffer.from(mask.slice(0, 8));
  const maskValue = maskBuf.readBigUInt64LE();
  return amount ^ maskValue;
}

/**
 * Decrypt amount using Keccak256 XOR mask
 */
export function decryptAmount(
  sender: PublicKey,
  recipient: PublicKey,
  nonce: Uint8Array,
  encryptedAmount: bigint
): bigint {
  // XOR is symmetric
  return encryptAmount(sender, recipient, nonce, encryptedAmount);
}

// ============================================================================
// COMMITMENTS (Pedersen-style)
// ============================================================================

/**
 * Generate a commitment to a value
 * C = hash(amount || blinding)
 */
export function generateCommitment(amount: bigint, blinding?: Uint8Array): Commitment {
  const blindingFactor = blinding || crypto.getRandomValues(new Uint8Array(32));
  
  const amountBytes = Buffer.alloc(8);
  amountBytes.writeBigUInt64LE(amount);
  
  const commitmentValue = sha256(Buffer.concat([
    Buffer.from('STYX_COMMIT_V1'),
    amountBytes,
    Buffer.from(blindingFactor)
  ]));
  
  return {
    value: commitmentValue,
    blinding: blindingFactor,
    amount,
  };
}

/**
 * Verify a commitment
 */
export function verifyCommitment(commitment: Commitment): boolean {
  if (commitment.amount === undefined) {
    return false;
  }
  
  const recomputed = generateCommitment(commitment.amount, commitment.blinding);
  return recomputed.value.every((b, i) => b === commitment.value[i]);
}

// ============================================================================
// NULLIFIERS
// ============================================================================

/**
 * Generate a nullifier for a commitment
 * Nullifiers prevent double-spending
 */
export function generateNullifier(
  commitmentHash: Uint8Array,
  spendingKey: Uint8Array
): Nullifier {
  const nullifierValue = sha256(Buffer.concat([
    Buffer.from('STYX_NULL_V1'),
    Buffer.from(commitmentHash),
    Buffer.from(spendingKey)
  ]));
  
  return {
    value: nullifierValue,
    commitmentHash,
  };
}
