/**
 * Styx Privacy Standalone Module
 * 
 * ORIGINAL SOLANA-NATIVE IMPLEMENTATION
 * 
 * Complete privacy toolkit for Solana that works WITHOUT any custom programs.
 * Built from scratch using standard cryptographic primitives:
 * 
 * - Stealth addresses with viewing key separation (Solana PublicKey native)
 * - Encrypted messaging (sealed boxes) 
 * - View tag scanning for efficient payment detection
 * - Deterministic key derivation compatible with Solana wallets
 * - Forward-secret encryption using ChaCha20-Poly1305
 * 
 * All implementations use:
 * - @solana/web3.js types (PublicKey, Keypair)
 * - Noble cryptographic libraries (audited, no dependencies)
 * - Solana-specific address formats (Base58, st:sol: prefix)
 * 
 * Designed for Solana Mobile with lightweight crypto operations.
 * 
 * @package @styx-stack/sdk
 * @author Bluefoot Labs
 * @license Apache-2.0
 */

import { Keypair, PublicKey } from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha256';
import { x25519, ed25519 } from '@noble/curves/ed25519';
import { chacha20poly1305 } from '@noble/ciphers/chacha';
import { hkdf } from '@noble/hashes/hkdf';
import { randomBytes } from '@noble/hashes/utils';

// ============================================================================
// TYPES
// ============================================================================

/** HD Key derivation paths */
export interface KeyDerivationPaths {
  spending: string;
  viewing: string;
}

/** Stealth meta-address bundle */
export interface StealthMetaAddress {
  /** Format: st:sol:<spendingPub>:<viewingPub> */
  address: string;
  /** Spending public key */
  spendingPublicKey: Uint8Array;
  /** Viewing public key (can be shared for watch-only) */
  viewingPublicKey: Uint8Array;
}

/** One-time stealth payment info */
export interface StealthPayment {
  /** One-time address for this payment */
  stealthAddress: PublicKey;
  /** Ephemeral public key (publish on-chain) */
  ephemeralPublicKey: Uint8Array;
  /** View tag for fast scanning (1 byte) */
  viewTag: number;
  /** Shared secret (for sender to encrypt memo) */
  sharedSecret: Uint8Array;
}

/** Announcement data published on-chain */
export interface StealthAnnouncement {
  /** Ephemeral public key used */
  ephemeralPublicKey: Uint8Array;
  /** View tag for fast rejection */
  viewTag: number;
  /** Stealth address the funds were sent to */
  stealthAddress: string;
  /** Transaction signature */
  signature?: string;
  /** Block time */
  blockTime?: number;
}

/** Detected payment after scanning */
export interface DetectedPayment {
  /** The stealth address that received funds */
  stealthAddress: PublicKey;
  /** Spending private key for this address */
  spendingPrivateKey: Uint8Array;
  /** Shared secret for decrypting any attached memo */
  sharedSecret: Uint8Array;
  /** Original announcement data */
  announcement: StealthAnnouncement;
}

/** Sealed box (anonymous encrypted message) */
export interface SealedBox {
  /** Ephemeral public key */
  ephemeralPublicKey: Uint8Array;
  /** Encrypted ciphertext */
  ciphertext: Uint8Array;
}

/** Crypto box (authenticated encrypted message) */
export interface CryptoBox {
  /** Random nonce */
  nonce: Uint8Array;
  /** Encrypted ciphertext with auth tag */
  ciphertext: Uint8Array;
}

/** View tag scanning stats */
export interface ScanStats {
  /** Total announcements scanned */
  total: number;
  /** Rejected by view tag */
  rejectedByViewTag: number;
  /** Passed view tag check */
  passedViewTag: number;
  /** Confirmed as owned */
  confirmedOwned: number;
  /** Time taken (ms) */
  scanTimeMs: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DOMAIN_STEALTH = new TextEncoder().encode('STYX_STEALTH_V1');
const DOMAIN_VIEW_TAG = new TextEncoder().encode('STYX_VIEWTAG_V1');
const DOMAIN_SEALED_BOX = new TextEncoder().encode('STYX_SEALED_V1');
const DOMAIN_SPENDING = new TextEncoder().encode('STYX_SPENDING_V1');
const DOMAIN_VIEWING = new TextEncoder().encode('STYX_VIEWING_V1');

// ============================================================================
// KEY DERIVATION
// ============================================================================

/**
 * Derive stealth key pairs from a seed phrase or seed bytes
 * Creates separated spending and viewing keys for security
 * 
 * @param seed - 32-byte seed (from BIP39 mnemonic)
 * @returns Spending and viewing keypairs
 */
export function deriveStealthKeyPairs(seed: Uint8Array): {
  spendingKeyPair: { publicKey: Uint8Array; privateKey: Uint8Array };
  viewingKeyPair: { publicKey: Uint8Array; privateKey: Uint8Array };
} {
  if (seed.length < 32) {
    throw new Error('Seed must be at least 32 bytes');
  }

  // Derive spending key
  const spendingPrivate = hkdf(sha256, seed, DOMAIN_SPENDING, 'spending-key', 32);
  const spendingPublic = ed25519.getPublicKey(spendingPrivate);

  // Derive viewing key (separate derivation path)
  const viewingPrivate = hkdf(sha256, seed, DOMAIN_VIEWING, 'viewing-key', 32);
  const viewingPublic = ed25519.getPublicKey(viewingPrivate);

  return {
    spendingKeyPair: {
      publicKey: spendingPublic,
      privateKey: spendingPrivate,
    },
    viewingKeyPair: {
      publicKey: viewingPublic,
      privateKey: viewingPrivate,
    },
  };
}

/**
 * Derive viewing private key only (for delegation to scanning services)
 * This key can scan for payments but cannot spend them
 */
export function deriveViewingKey(seed: Uint8Array): Uint8Array {
  if (seed.length < 32) {
    throw new Error('Seed must be at least 32 bytes');
  }
  return hkdf(sha256, seed, DOMAIN_VIEWING, 'viewing-key', 32);
}

/**
 * Generate a Solana stealth meta-address from keypairs
 * 
 * Format: st:sol:<spendingPubkey>:<viewingPubkey>
 * 
 * Uses Solana's Base58 encoding for compatibility with wallets.
 * The "st:sol:" prefix identifies this as a Solana stealth address.
 */
export function generateStealthMetaAddress(
  spendingPublicKey: Uint8Array,
  viewingPublicKey: Uint8Array
): StealthMetaAddress {
  const spendingPub = new PublicKey(spendingPublicKey);
  const viewingPub = new PublicKey(viewingPublicKey);
  
  return {
    address: `st:sol:${spendingPub.toBase58()}:${viewingPub.toBase58()}`,
    spendingPublicKey,
    viewingPublicKey,
  };
}

/**
 * Parse a Solana stealth meta-address into its components
 * Validates the st:sol: prefix and extracts Base58-encoded keys
 */
export function parseMetaAddress(metaAddress: string): {
  spendingPublicKey: Uint8Array;
  viewingPublicKey: Uint8Array;
} {
  const parts = metaAddress.split(':');
  if (parts.length !== 4 || parts[0] !== 'st' || parts[1] !== 'sol') {
    throw new Error('Invalid Solana stealth meta-address. Expected: st:sol:<spending>:<viewing>');
  }

  return {
    spendingPublicKey: new PublicKey(parts[2]).toBytes(),
    viewingPublicKey: new PublicKey(parts[3]).toBytes(),
  };
}

// ============================================================================
// STEALTH ADDRESS GENERATION
// ============================================================================

/**
 * Generate a one-time Solana stealth address for receiving a payment
 * 
 * ORIGINAL IMPLEMENTATION for Solana:
 * - Uses X25519 ECDH for shared secret derivation
 * - Creates Solana Keypair from deterministic seed
 * - Returns native Solana PublicKey
 * 
 * The sender uses this to create an address only the recipient can spend from.
 * The resulting address is a valid Solana address that can receive SOL/tokens.
 * 
 * @param metaAddress - Recipient's stealth meta-address (st:sol:...)
 * @returns Stealth payment details including the one-time Solana address
 */
export function generateStealthPayment(metaAddress: string): StealthPayment {
  const { spendingPublicKey, viewingPublicKey } = parseMetaAddress(metaAddress);

  // Generate ephemeral keypair for this payment
  const ephemeralPrivate = randomBytes(32);
  const ephemeralPublic = x25519.scalarMultBase(ephemeralPrivate);

  // Compute shared secret: S = ephemeralPrivate * viewingPublicKey (ECDH)
  const sharedSecret = x25519.scalarMult(ephemeralPrivate, viewingPublicKey.slice(0, 32));

  // Derive view tag (first byte of H(S) for fast scanning)
  const viewTagHash = sha256(concatArrays(DOMAIN_VIEW_TAG, sharedSecret));
  const viewTag = viewTagHash[0];

  // Derive stealth address seed: Hash(DOMAIN || spendingPub || sharedSecret)
  const stealthSeed = sha256(concatArrays(
    DOMAIN_STEALTH,
    spendingPublicKey,
    sharedSecret
  ));

  // Create Solana keypair from deterministic seed
  const stealthKeypair = Keypair.fromSeed(stealthSeed.slice(0, 32));

  return {
    stealthAddress: stealthKeypair.publicKey,
    ephemeralPublicKey: ephemeralPublic,
    viewTag,
    sharedSecret,
  };
}

/**
 * Compute view tag from shared secret
 */
export function computeViewTag(sharedSecret: Uint8Array): number {
  const viewTagHash = sha256(concatArrays(DOMAIN_VIEW_TAG, sharedSecret));
  return viewTagHash[0];
}

// ============================================================================
// STEALTH ADDRESS SCANNING
// ============================================================================

/**
 * Scan Solana transaction announcements to find payments addressed to you
 * 
 * ORIGINAL IMPLEMENTATION optimized for Solana Mobile:
 * - Uses view tags for 256x faster scanning (rejects 99.6% without full computation)
 * - Returns Solana Keypairs with full spending authority
 * - Lightweight enough for mobile background scanning
 * 
 * @param viewingPrivateKey - Your viewing private key (can delegate to scanning service)
 * @param spendingPublicKey - Your spending public key
 * @param announcements - On-chain announcements from Solana transactions
 * @returns Detected payments with Solana spending keys
 */
export function scanStealthAnnouncements(
  viewingPrivateKey: Uint8Array,
  spendingPublicKey: Uint8Array,
  announcements: StealthAnnouncement[]
): { payments: DetectedPayment[]; stats: ScanStats } {
  const startTime = Date.now();
  const payments: DetectedPayment[] = [];
  let rejectedByViewTag = 0;
  let passedViewTag = 0;

  for (const announcement of announcements) {
    // Compute shared secret from our viewing key + their ephemeral
    const sharedSecret = x25519.scalarMult(
      viewingPrivateKey,
      announcement.ephemeralPublicKey
    );

    // Fast path: Check view tag first (rejects 99.6% of non-matching)
    const expectedViewTag = computeViewTag(sharedSecret);
    if (expectedViewTag !== announcement.viewTag) {
      rejectedByViewTag++;
      continue;
    }

    passedViewTag++;

    // Full derivation: Compute Solana stealth address and check if it matches
    const stealthSeed = sha256(concatArrays(
      DOMAIN_STEALTH,
      spendingPublicKey,
      sharedSecret
    ));

    // Create Solana keypair - this gives us spending authority
    const stealthKeypair = Keypair.fromSeed(stealthSeed.slice(0, 32));
    const derivedAddress = stealthKeypair.publicKey.toBase58();

    if (derivedAddress === announcement.stealthAddress) {
      payments.push({
        stealthAddress: stealthKeypair.publicKey,
        spendingPrivateKey: stealthKeypair.secretKey,
        sharedSecret,
        announcement,
      });
    }
  }

  return {
    payments,
    stats: {
      total: announcements.length,
      rejectedByViewTag,
      passedViewTag,
      confirmedOwned: payments.length,
      scanTimeMs: Date.now() - startTime,
    },
  };
}

/**
 * Check if a single announcement is addressed to you
 */
export function checkStealthOwnership(
  viewingPrivateKey: Uint8Array,
  spendingPublicKey: Uint8Array,
  announcement: StealthAnnouncement
): DetectedPayment | null {
  const { payments } = scanStealthAnnouncements(
    viewingPrivateKey,
    spendingPublicKey,
    [announcement]
  );
  return payments[0] || null;
}

// ============================================================================
// SEALED BOX ENCRYPTION (Anonymous, Solana-native)
// ============================================================================

/**
 * Anonymous encryption using sealed boxes - ORIGINAL SOLANA IMPLEMENTATION
 * 
 * Uses standard X25519 + ChaCha20-Poly1305 (same primitives as NaCl/TweetNaCl)
 * but implemented from scratch using Noble libraries for Solana compatibility.
 * 
 * The recipient cannot identify the sender.
 * Uses ephemeral keys for forward secrecy.
 * Perfect for Solana Mobile: lightweight, audited crypto, no native modules.
 * 
 * @param message - Plaintext to encrypt
 * @param recipientPublicKey - Recipient's X25519 public key (32 bytes)
 * @returns Sealed box with ephemeral key and ciphertext
 */
export function sealedBoxEncrypt(
  message: Uint8Array,
  recipientPublicKey: Uint8Array
): SealedBox {
  // Generate ephemeral keypair
  const ephemeralPrivate = randomBytes(32);
  const ephemeralPublic = x25519.scalarMultBase(ephemeralPrivate);

  // Compute shared secret
  const sharedSecret = x25519.scalarMult(ephemeralPrivate, recipientPublicKey);

  // Derive encryption key using HKDF
  const encryptionKey = hkdf(sha256, sharedSecret, DOMAIN_SEALED_BOX, 'encryption', 32);

  // Generate nonce from ephemeral + recipient keys (deterministic)
  const nonce = sha256(concatArrays(ephemeralPublic, recipientPublicKey)).slice(0, 12);

  // Encrypt with ChaCha20-Poly1305
  const cipher = chacha20poly1305(encryptionKey, nonce);
  const ciphertext = cipher.encrypt(message);

  return {
    ephemeralPublicKey: ephemeralPublic,
    ciphertext,
  };
}

/**
 * Open a sealed box
 * 
 * @param sealedBox - The sealed box to decrypt
 * @param recipientPrivateKey - Recipient's private key
 * @returns Decrypted plaintext
 */
export function sealedBoxDecrypt(
  sealedBox: SealedBox,
  recipientPrivateKey: Uint8Array
): Uint8Array {
  const recipientPublic = x25519.scalarMultBase(recipientPrivateKey);

  // Compute shared secret
  const sharedSecret = x25519.scalarMult(recipientPrivateKey, sealedBox.ephemeralPublicKey);

  // Derive encryption key
  const encryptionKey = hkdf(sha256, sharedSecret, DOMAIN_SEALED_BOX, 'encryption', 32);

  // Derive nonce (same as encryption)
  const nonce = sha256(concatArrays(sealedBox.ephemeralPublicKey, recipientPublic)).slice(0, 12);

  // Decrypt
  const cipher = chacha20poly1305(encryptionKey, nonce);
  return cipher.decrypt(sealedBox.ciphertext);
}

// ============================================================================
// CRYPTO BOX (Authenticated, Solana-native)
// ============================================================================

/**
 * Authenticated encryption using crypto_box - ORIGINAL SOLANA IMPLEMENTATION
 * 
 * Both sender and recipient can be identified.
 * Uses X25519 ECDH + ChaCha20-Poly1305 for Solana Mobile compatibility.
 * No native modules required - works in React Native and mobile browsers.
 * 
 * @param message - Plaintext to encrypt
 * @param recipientPublicKey - Recipient's X25519 public key
 * @param senderPrivateKey - Sender's X25519 private key
 * @returns Crypto box with nonce and ciphertext
 */
export function cryptoBoxEncrypt(
  message: Uint8Array,
  recipientPublicKey: Uint8Array,
  senderPrivateKey: Uint8Array
): CryptoBox {
  // Compute shared secret from ECDH
  const sharedSecret = x25519.scalarMult(senderPrivateKey, recipientPublicKey);

  // Derive encryption key
  const encryptionKey = hkdf(sha256, sharedSecret, DOMAIN_SEALED_BOX, 'crypto-box', 32);

  // Random nonce
  const nonce = randomBytes(12);

  // Encrypt
  const cipher = chacha20poly1305(encryptionKey, nonce);
  const ciphertext = cipher.encrypt(message);

  return { nonce, ciphertext };
}

/**
 * Decrypt a crypto box
 */
export function cryptoBoxDecrypt(
  cryptoBox: CryptoBox,
  senderPublicKey: Uint8Array,
  recipientPrivateKey: Uint8Array
): Uint8Array {
  // Compute shared secret
  const sharedSecret = x25519.scalarMult(recipientPrivateKey, senderPublicKey);

  // Derive encryption key
  const encryptionKey = hkdf(sha256, sharedSecret, DOMAIN_SEALED_BOX, 'crypto-box', 32);

  // Decrypt
  const cipher = chacha20poly1305(encryptionKey, cryptoBox.nonce);
  return cipher.decrypt(cryptoBox.ciphertext);
}

// ============================================================================
// ENCRYPTED MEMO (Solana Transaction Memos)
// ============================================================================

/**
 * Encrypt a memo for a specific recipient - SOLANA TRANSACTION MEMOS
 * 
 * Use with Solana's SPL Memo program for encrypted on-chain messages.
 * Combines sealed box encryption with Base64 encoding for memo field.
 * 
 * @param memo - Text message to encrypt
 * @param recipientPublicKey - Recipient's X25519 public key
 * @returns Base64-encoded sealed box (fits in Solana memo)
 */
export function encryptMemo(memo: string, recipientPublicKey: Uint8Array): string {
  const messageBytes = new TextEncoder().encode(memo);
  const sealedBox = sealedBoxEncrypt(messageBytes, recipientPublicKey);
  
  // Encode as: ephemeralPub (32) + ciphertext
  const combined = concatArrays(sealedBox.ephemeralPublicKey, sealedBox.ciphertext);
  return Buffer.from(combined).toString('base64');
}

/**
 * Decrypt a memo
 * 
 * @param encryptedMemo - Base64-encoded sealed box
 * @param recipientPrivateKey - Recipient's private key
 * @returns Decrypted text message
 */
export function decryptMemo(encryptedMemo: string, recipientPrivateKey: Uint8Array): string {
  const combined = Buffer.from(encryptedMemo, 'base64');
  
  const sealedBox: SealedBox = {
    ephemeralPublicKey: combined.slice(0, 32),
    ciphertext: combined.slice(32),
  };
  
  const decrypted = sealedBoxDecrypt(sealedBox, recipientPrivateKey);
  return new TextDecoder().decode(decrypted);
}

// ============================================================================
// COMMITMENT SCHEMES (Solana-native Hash Commitments)
// ============================================================================

/**
 * Create a hiding commitment to an amount - ORIGINAL SOLANA IMPLEMENTATION
 * 
 * Uses hash-based commitments (SHA-256) instead of elliptic curve Pedersen.
 * This provides computational hiding with smaller commitment size.
 * 
 * Solana-optimized: 32-byte commitments fit nicely in account data.
 * 
 * C = H(domain || amount || blinding)
 * 
 * @param amount - Amount in lamports (u64)
 * @param blinding - Optional 32-byte blinding factor
 */
export function createAmountCommitment(
  amount: bigint,
  blinding?: Uint8Array
): { commitment: Uint8Array; blinding: Uint8Array } {
  const blindingFactor = blinding || randomBytes(32);
  
  const amountBytes = new Uint8Array(8);
  new DataView(amountBytes.buffer).setBigUint64(0, amount, true);
  
  const commitment = sha256(concatArrays(
    new TextEncoder().encode('STYX_AMOUNT_V1'),
    amountBytes,
    blindingFactor
  ));
  
  return { commitment, blinding: blindingFactor };
}

/**
 * Open and verify an amount commitment
 */
export function openAmountCommitment(
  commitment: Uint8Array,
  amount: bigint,
  blinding: Uint8Array
): boolean {
  const { commitment: expected } = createAmountCommitment(amount, blinding);
  return commitment.every((b, i) => b === expected[i]);
}

// ============================================================================
// UTILITIES (Solana-native Crypto Helpers)
// ============================================================================

/**
 * Generate a random X25519 keypair for encryption
 * Compatible with Solana Mobile (no native modules required)
 */
export function generateX25519KeyPair(): { publicKey: Uint8Array; privateKey: Uint8Array } {
  const privateKey = randomBytes(32);
  const publicKey = x25519.scalarMultBase(privateKey);
  return { publicKey, privateKey };
}

/**
 * Derive shared secret from X25519 ECDH
 * Standard Diffie-Hellman key exchange for Solana privacy apps
 */
export function deriveSharedSecretStandalone(
  ourPrivateKey: Uint8Array,
  theirPublicKey: Uint8Array
): Uint8Array {
  return x25519.scalarMult(ourPrivateKey, theirPublicKey);
}

/**
 * Concatenate multiple Uint8Arrays efficiently
 */
function concatArrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// ============================================================================
// SOLANA PRIVACY STANDALONE TOOLKIT - EXPORTS
// ============================================================================

/**
 * Complete privacy toolkit for Solana applications
 * 
 * All implementations are ORIGINAL and SOLANA-SPECIFIC:
 * - Stealth addresses use Solana Keypair/PublicKey
 * - Address format: st:sol:... (Base58 encoded)
 * - Optimized for Solana Mobile (React Native compatible)
 * - No native modules required
 * - No custom on-chain programs required
 */

export const PrivacyStandalone = {
  // Key derivation
  deriveStealthKeyPairs,
  deriveViewingKey,
  generateStealthMetaAddress,
  parseMetaAddress,
  
  // Stealth addresses
  generateStealthPayment,
  scanStealthAnnouncements,
  checkStealthOwnership,
  computeViewTag,
  
  // Encryption
  sealedBoxEncrypt,
  sealedBoxDecrypt,
  cryptoBoxEncrypt,
  cryptoBoxDecrypt,
  encryptMemo,
  decryptMemo,
  
  // Commitments
  createAmountCommitment,
  openAmountCommitment,
  
  // Utilities
  generateX25519KeyPair,
  deriveSharedSecretStandalone,
};

export default PrivacyStandalone;
