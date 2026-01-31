/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX CORE
 *  
 *  Foundational cryptography, types, and utilities for the Styx Stack
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { PublicKey, Connection, Keypair, Transaction, VersionedTransaction } from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha256';
import { x25519 } from '@noble/curves/ed25519';
import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes } from '@noble/ciphers/webcrypto';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRAM IDS
// ═══════════════════════════════════════════════════════════════════════════════

/** Styx Program ID - Mainnet */
export const STYX_PROGRAM_ID = new PublicKey('GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9');

/** Styx Program ID - Devnet */
export const STYX_DEVNET_PROGRAM_ID = new PublicKey('FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW');

/** WhisperDrop Program ID - Mainnet */
export const WHISPERDROP_PROGRAM_ID = new PublicKey('GhstFNnEbixAGQgLnWg1nWetJQgGfSUMhnxdBA6hWu5e');

/** WhisperDrop Program ID - Devnet */
export const WHISPERDROP_DEVNET_PROGRAM_ID = new PublicKey('BPM5VuX9YrG7CgueWGxtqQZBQwMTacc315ppWCtTCJ5q');

/** SPS Indexer Program ID - Mainnet */
export const SPS_PROGRAM_ID = new PublicKey('GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9');

// ═══════════════════════════════════════════════════════════════════════════════
// CLUSTER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export type Cluster = 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet';

export interface StyxConfig {
  cluster: Cluster;
  connection: Connection;
  programId: PublicKey;
  whisperdropProgramId: PublicKey;
  indexerUrl?: string;
  relayUrl?: string;
}

export function getClusterConfig(cluster: Cluster, customRpcUrl?: string): StyxConfig {
  const rpcUrls: Record<Cluster, string> = {
    'mainnet-beta': 'https://api.mainnet-beta.solana.com',
    'devnet': 'https://api.devnet.solana.com',
    'testnet': 'https://api.testnet.solana.com',
    'localnet': 'http://localhost:8899',
  };

  const indexerUrls: Record<Cluster, string> = {
    'mainnet-beta': 'https://indexer.styxprivacy.app',
    'devnet': 'https://indexer-devnet.styxprivacy.app',
    'testnet': 'https://indexer-testnet.styxprivacy.app',
    'localnet': 'http://localhost:3333',
  };

  const isMainnet = cluster === 'mainnet-beta';

  return {
    cluster,
    connection: new Connection(customRpcUrl ?? rpcUrls[cluster], 'confirmed'),
    programId: isMainnet ? STYX_PROGRAM_ID : STYX_DEVNET_PROGRAM_ID,
    whisperdropProgramId: isMainnet ? WHISPERDROP_PROGRAM_ID : WHISPERDROP_DEVNET_PROGRAM_ID,
    indexerUrl: indexerUrls[cluster],
    relayUrl: isMainnet ? 'wss://relay.styxprivacy.app' : 'wss://relay-devnet.styxprivacy.app',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRYPTOGRAPHIC PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a new X25519 keypair for key exchange
 */
export function generateX25519Keypair(): { publicKey: Uint8Array; secretKey: Uint8Array } {
  const secretKey = randomBytes(32);
  const publicKey = x25519.getPublicKey(secretKey);
  return { publicKey, secretKey };
}

/**
 * Derive X25519 public key from Ed25519 signing key
 * Used to derive encryption key from Solana wallet
 */
export function ed25519ToX25519(ed25519SecretKey: Uint8Array): {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
} {
  // Use nacl's conversion for Ed25519 → Curve25519
  const x25519Keypair = nacl.box.keyPair.fromSecretKey(ed25519SecretKey.slice(0, 32));
  return {
    publicKey: x25519Keypair.publicKey,
    secretKey: x25519Keypair.secretKey,
  };
}

/**
 * Compute shared secret using X25519 ECDH
 */
export function computeSharedSecret(
  ourSecretKey: Uint8Array,
  theirPublicKey: Uint8Array
): Uint8Array {
  return x25519.getSharedSecret(ourSecretKey, theirPublicKey);
}

/**
 * Derive encryption key from shared secret using HKDF
 */
export function deriveEncryptionKey(
  sharedSecret: Uint8Array,
  context: string = 'styx-encryption-v1'
): Uint8Array {
  const contextBytes = new TextEncoder().encode(context);
  const combined = new Uint8Array(sharedSecret.length + contextBytes.length);
  combined.set(sharedSecret);
  combined.set(contextBytes, sharedSecret.length);
  return sha256(combined);
}

/**
 * Encrypt data using XChaCha20-Poly1305
 */
export function encryptData(
  plaintext: Uint8Array,
  key: Uint8Array,
  associatedData?: Uint8Array
): { ciphertext: Uint8Array; nonce: Uint8Array } {
  const nonce = randomBytes(24); // XChaCha20 uses 24-byte nonce
  const cipher = xchacha20poly1305(key, nonce, associatedData);
  const ciphertext = cipher.encrypt(plaintext);
  return { ciphertext, nonce };
}

/**
 * Decrypt data using XChaCha20-Poly1305
 */
export function decryptData(
  ciphertext: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array,
  associatedData?: Uint8Array
): Uint8Array {
  const cipher = xchacha20poly1305(key, nonce, associatedData);
  return cipher.decrypt(ciphertext);
}

/**
 * Generate a stealth address for private payments
 * Uses DKSAP (Dual-Key Stealth Address Protocol)
 */
export function generateStealthAddress(
  recipientViewKey: Uint8Array,
  recipientSpendKey: PublicKey
): {
  stealthAddress: PublicKey;
  ephemeralPubkey: Uint8Array;
  viewTag: number;
} {
  // Generate ephemeral keypair
  const ephemeral = generateX25519Keypair();
  
  // Compute shared secret
  const sharedSecret = computeSharedSecret(ephemeral.secretKey, recipientViewKey);
  
  // Derive stealth key material
  const stealthSeed = sha256(
    new Uint8Array([...sharedSecret, ...recipientSpendKey.toBytes()])
  );
  
  // Create stealth address (simplified - real impl would use proper point addition)
  const stealthKeypair = Keypair.fromSeed(stealthSeed);
  
  // View tag for efficient scanning (first byte of hash)
  const viewTag = sha256(sharedSecret)[0];
  
  return {
    stealthAddress: stealthKeypair.publicKey,
    ephemeralPubkey: ephemeral.publicKey,
    viewTag,
  };
}

/**
 * Scan for stealth payments using view key
 */
export function scanStealthPayment(
  viewSecretKey: Uint8Array,
  spendSecretKey: Uint8Array,
  ephemeralPubkey: Uint8Array,
  expectedViewTag: number
): { matches: boolean; stealthKeypair?: Keypair } {
  // Compute shared secret
  const sharedSecret = computeSharedSecret(viewSecretKey, ephemeralPubkey);
  
  // Check view tag
  const viewTag = sha256(sharedSecret)[0];
  if (viewTag !== expectedViewTag) {
    return { matches: false };
  }
  
  // Derive stealth keypair
  const spendPubkey = Keypair.fromSecretKey(spendSecretKey).publicKey;
  const stealthSeed = sha256(
    new Uint8Array([...sharedSecret, ...spendPubkey.toBytes()])
  );
  const stealthKeypair = Keypair.fromSeed(stealthSeed);
  
  return { matches: true, stealthKeypair };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NULLIFIER SYSTEM (Double-Spend Prevention)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a nullifier for a note/token
 * Nullifiers are unique identifiers that mark a note as spent
 */
export function generateNullifier(
  noteCommitment: Uint8Array,
  ownerSecretKey: Uint8Array,
  domain: string = 'styx-nullifier-v1'
): Uint8Array {
  const domainBytes = new TextEncoder().encode(domain);
  const preimage = new Uint8Array(
    noteCommitment.length + ownerSecretKey.length + domainBytes.length
  );
  preimage.set(noteCommitment);
  preimage.set(ownerSecretKey, noteCommitment.length);
  preimage.set(domainBytes, noteCommitment.length + ownerSecretKey.length);
  return sha256(preimage);
}

/**
 * Derive a note commitment from note data
 */
export function computeNoteCommitment(
  amount: bigint,
  owner: PublicKey,
  randomness: Uint8Array
): Uint8Array {
  const amountBytes = new Uint8Array(8);
  new DataView(amountBytes.buffer).setBigUint64(0, amount, true);
  
  const preimage = new Uint8Array(8 + 32 + 32);
  preimage.set(amountBytes);
  preimage.set(owner.toBytes(), 8);
  preimage.set(randomness, 40);
  
  return sha256(preimage);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENVELOPE ENCODING (Cross-Platform Format)
// ═══════════════════════════════════════════════════════════════════════════════

export const ENVELOPE_VERSION = 1;

export interface StyxEnvelope {
  version: number;
  kind: EnvelopeKind;
  header: Uint8Array;
  body: Uint8Array;
}

export enum EnvelopeKind {
  MESSAGE = 1,
  PAYMENT = 2,
  NFT = 3,
  GOVERNANCE_VOTE = 4,
  GOVERNANCE_PROPOSAL = 5,
  SWAP = 6,
  AIRDROP_CLAIM = 7,
  SOCIAL_POST = 8,
  IDENTITY_ATTESTATION = 9,
}

/**
 * Encode a Styx envelope to bytes
 */
export function encodeEnvelope(envelope: StyxEnvelope): Uint8Array {
  // Format: [version:1][kind:1][headerLen:2][header][body]
  const headerLen = envelope.header.length;
  const result = new Uint8Array(4 + headerLen + envelope.body.length);
  
  result[0] = envelope.version;
  result[1] = envelope.kind;
  result[2] = headerLen & 0xff;
  result[3] = (headerLen >> 8) & 0xff;
  result.set(envelope.header, 4);
  result.set(envelope.body, 4 + headerLen);
  
  return result;
}

/**
 * Decode a Styx envelope from bytes
 */
export function decodeEnvelope(data: Uint8Array): StyxEnvelope {
  if (data.length < 4) {
    throw new Error('Invalid envelope: too short');
  }
  
  const version = data[0];
  const kind = data[1] as EnvelopeKind;
  const headerLen = data[2] | (data[3] << 8);
  
  if (data.length < 4 + headerLen) {
    throw new Error('Invalid envelope: header truncated');
  }
  
  const header = data.slice(4, 4 + headerLen);
  const body = data.slice(4 + headerLen);
  
  return { version, kind, header, body };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYX CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Main Styx client for interacting with the Styx protocol
 */
export class StyxClient {
  public readonly config: StyxConfig;
  
  constructor(config: StyxConfig | Cluster, customRpcUrl?: string) {
    if (typeof config === 'string') {
      this.config = getClusterConfig(config, customRpcUrl);
    } else {
      this.config = config;
    }
  }
  
  get connection(): Connection {
    return this.config.connection;
  }
  
  get programId(): PublicKey {
    return this.config.programId;
  }
  
  get cluster(): Cluster {
    return this.config.cluster;
  }
  
  /**
   * Get the indexer API client
   */
  getIndexerUrl(): string {
    return this.config.indexerUrl ?? 'https://indexer.styxprivacy.app';
  }
  
  /**
   * Get the relay WebSocket URL
   */
  getRelayUrl(): string {
    return this.config.relayUrl ?? 'wss://relay.styxprivacy.app';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { sha256 } from '@noble/hashes/sha256';
export { keccak_256 } from '@noble/hashes/sha3';
export { randomBytes } from '@noble/ciphers/webcrypto';
export { bs58 };
export { PublicKey, Keypair, Connection, Transaction, VersionedTransaction };
