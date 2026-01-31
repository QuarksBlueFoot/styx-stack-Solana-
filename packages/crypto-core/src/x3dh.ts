/**
 * X3DH - Extended Triple Diffie-Hellman Key Agreement
 * 
 * Implements the X3DH protocol for establishing shared secrets with forward secrecy.
 * Based on Signal Protocol / Canary Protocol specifications.
 * 
 * X3DH provides:
 * - Asynchronous key agreement (recipient doesn't need to be online)
 * - Forward secrecy through one-time prekeys
 * - Mutual authentication through identity keys
 * - Deniability (either party could have created the transcript)
 * 
 * Key Types:
 * - Identity Key (IK): Long-term Ed25519/X25519 key pair
 * - Signed Prekey (SPK): Medium-term X25519 key, signed by identity key
 * - One-Time Prekeys (OPK): Ephemeral X25519 keys, consumed per conversation
 * 
 * Reference: https://signal.org/docs/specifications/x3dh/
 */

import { sha256Bytes } from "./hash";
import { concatBytes } from "./bytes";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * X25519 Key Pair
 */
export interface X25519KeyPair {
  /** 32-byte public key (safe to share) */
  publicKey: Uint8Array;
  /** 32-byte private key (never share!) */
  privateKey: Uint8Array;
}

/**
 * Ed25519 Key Pair (for signing)
 */
export interface Ed25519KeyPair {
  /** 32-byte public key */
  publicKey: Uint8Array;
  /** 64-byte private key (includes public key) */
  privateKey: Uint8Array;
}

/**
 * Signed Prekey - Medium-term key signed by identity key
 */
export interface SignedPrekey {
  /** Unique identifier for this signed prekey */
  id: number;
  /** X25519 public key */
  publicKey: Uint8Array;
  /** Ed25519 signature over the public key */
  signature: Uint8Array;
  /** Creation timestamp */
  timestamp: number;
}

/**
 * One-Time Prekey - Ephemeral key consumed per conversation
 */
export interface OneTimePrekey {
  /** Unique identifier */
  id: number;
  /** X25519 public key */
  publicKey: Uint8Array;
}

/**
 * Prekey Bundle - Published to blockchain for message senders
 * 
 * Contains all public keys needed for X3DH key agreement.
 * This is what senders fetch to initiate encrypted conversations.
 */
export interface PrekeyBundle {
  /** User identifier (e.g., wallet address or .sol domain) */
  userId: string;
  
  /** Long-term identity public key (Ed25519 for signing, X25519 for DH) */
  identityKey: Uint8Array;
  
  /** Medium-term signed prekey */
  signedPrekey: SignedPrekey;
  
  /** Pool of one-time prekeys (consumed per conversation) */
  oneTimePrekeys: OneTimePrekey[];
  
  /** Bundle creation timestamp */
  timestamp: number;
  
  /** Bundle version for forward compatibility */
  version: number;
}

/**
 * Local Prekey State - Private keys stored locally
 */
export interface LocalPrekeyState {
  /** Identity key pair */
  identityKeyPair: {
    signing: Ed25519KeyPair;
    exchange: X25519KeyPair;
  };
  
  /** Signed prekey pair with private key */
  signedPrekeyPair: X25519KeyPair & { id: number; timestamp: number };
  
  /** One-time prekey pairs with private keys */
  oneTimePrekeyPairs: Map<number, X25519KeyPair>;
  
  /** Next prekey ID counter */
  nextPrekeyId: number;
}

/**
 * X3DH Output - Result of key agreement
 */
export interface X3DHOutput {
  /** 32-byte shared secret for Double Ratchet initialization */
  sharedSecret: Uint8Array;
  
  /** Ephemeral public key to include in first message */
  ephemeralPublic: Uint8Array;
  
  /** ID of one-time prekey used (if any) */
  usedOnetimePrekeyId?: number;
  
  /** Associated data for AEAD (identity keys || ephemeral || etc) */
  associatedData: Uint8Array;
}

/**
 * X3DH Initial Message - Sent with first message
 */
export interface X3DHInitialMessage {
  /** Sender's identity public key */
  identityKey: Uint8Array;
  
  /** Ephemeral public key for this session */
  ephemeralKey: Uint8Array;
  
  /** ID of one-time prekey used (if any) */
  usedOnetimePrekeyId?: number;
  
  /** Ciphertext of actual message */
  ciphertext: Uint8Array;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const X3DH_VERSION = 1;
const X3DH_INFO = new TextEncoder().encode("STYX_X3DH_V1");
const SIGNED_PREKEY_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ONE_TIME_PREKEY_COUNT = 100;
const LOW_PREKEY_THRESHOLD = 50;

// ============================================================================
// X3DH PROTOCOL FUNCTIONS
// ============================================================================

/**
 * Perform X3DH as initiator (Alice)
 * 
 * Alice initiates a session with Bob using Bob's prekey bundle.
 * 
 * DH calculations:
 * - DH1 = DH(IKa, SPKb) - Alice identity with Bob's signed prekey
 * - DH2 = DH(EKa, IKb) - Alice ephemeral with Bob's identity
 * - DH3 = DH(EKa, SPKb) - Alice ephemeral with Bob's signed prekey
 * - DH4 = DH(EKa, OPKb) - Alice ephemeral with Bob's one-time prekey (optional)
 * 
 * @param myIdentityPrivate My identity private key (X25519)
 * @param recipientBundle Recipient's prekey bundle
 * @param x25519DH Function to perform X25519 DH
 * @returns X3DH output with shared secret
 */
export function x3dhInitiate(
  myIdentityPrivate: Uint8Array,
  myIdentityPublic: Uint8Array,
  recipientBundle: PrekeyBundle,
  x25519DH: (privateKey: Uint8Array, publicKey: Uint8Array) => Uint8Array,
  generateKeyPair: () => X25519KeyPair
): X3DHOutput {
  // Generate ephemeral key pair for this session
  const ephemeralKeyPair = generateKeyPair();
  
  // Select a one-time prekey (if available)
  const usedOneTimePrekey = recipientBundle.oneTimePrekeys.length > 0
    ? recipientBundle.oneTimePrekeys[0]
    : undefined;
  
  // Perform DH calculations
  // DH1: IKa private × SPKb public
  const dh1 = x25519DH(myIdentityPrivate, recipientBundle.signedPrekey.publicKey);
  
  // DH2: EKa private × IKb public (for X25519, we use the exchange key)
  const dh2 = x25519DH(ephemeralKeyPair.privateKey, recipientBundle.identityKey);
  
  // DH3: EKa private × SPKb public
  const dh3 = x25519DH(ephemeralKeyPair.privateKey, recipientBundle.signedPrekey.publicKey);
  
  // DH4: EKa private × OPKb public (if available)
  const dh4 = usedOneTimePrekey
    ? x25519DH(ephemeralKeyPair.privateKey, usedOneTimePrekey.publicKey)
    : new Uint8Array(32); // Zero bytes if no one-time prekey
  
  // Combine DH outputs
  const dhConcat = concatBytes(dh1, dh2, dh3, dh4);
  
  // Derive shared secret using KDF
  const sharedSecret = kdf(dhConcat, X3DH_INFO);
  
  // Build associated data (for binding to identities)
  const associatedData = concatBytes(
    myIdentityPublic,
    recipientBundle.identityKey,
    ephemeralKeyPair.publicKey,
    usedOneTimePrekey?.publicKey ?? new Uint8Array(32)
  );
  
  // Clear ephemeral private key from memory (caller should handle)
  // ephemeralKeyPair.privateKey.fill(0);
  
  return {
    sharedSecret,
    ephemeralPublic: ephemeralKeyPair.publicKey,
    usedOnetimePrekeyId: usedOneTimePrekey?.id,
    associatedData,
  };
}

/**
 * Perform X3DH as responder (Bob)
 * 
 * Bob processes an initial message from Alice to derive the shared secret.
 * 
 * @param myState My local prekey state
 * @param initialMessage The initial message from Alice
 * @param x25519DH Function to perform X25519 DH
 * @returns X3DH output with shared secret
 */
export function x3dhRespond(
  myState: LocalPrekeyState,
  senderIdentityKey: Uint8Array,
  senderEphemeralKey: Uint8Array,
  usedOnetimePrekeyId: number | undefined,
  x25519DH: (privateKey: Uint8Array, publicKey: Uint8Array) => Uint8Array
): X3DHOutput {
  const myIdentityPrivate = myState.identityKeyPair.exchange.privateKey;
  const myIdentityPublic = myState.identityKeyPair.exchange.publicKey;
  const signedPrekeyPrivate = myState.signedPrekeyPair.privateKey;
  
  // DH1: SPKb private × IKa public
  const dh1 = x25519DH(signedPrekeyPrivate, senderIdentityKey);
  
  // DH2: IKb private × EKa public
  const dh2 = x25519DH(myIdentityPrivate, senderEphemeralKey);
  
  // DH3: SPKb private × EKa public
  const dh3 = x25519DH(signedPrekeyPrivate, senderEphemeralKey);
  
  // DH4: OPKb private × EKa public (if used)
  let dh4: Uint8Array;
  let usedOnetimePublic: Uint8Array;
  
  if (usedOnetimePrekeyId !== undefined) {
    const onetimeKeyPair = myState.oneTimePrekeyPairs.get(usedOnetimePrekeyId);
    if (onetimeKeyPair) {
      dh4 = x25519DH(onetimeKeyPair.privateKey, senderEphemeralKey);
      usedOnetimePublic = onetimeKeyPair.publicKey;
      
      // Remove used one-time prekey (it's consumed)
      myState.oneTimePrekeyPairs.delete(usedOnetimePrekeyId);
    } else {
      // Prekey not found (already used or rotated)
      dh4 = new Uint8Array(32);
      usedOnetimePublic = new Uint8Array(32);
    }
  } else {
    dh4 = new Uint8Array(32);
    usedOnetimePublic = new Uint8Array(32);
  }
  
  // Combine DH outputs (same order as initiator)
  const dhConcat = concatBytes(dh1, dh2, dh3, dh4);
  
  // Derive shared secret
  const sharedSecret = kdf(dhConcat, X3DH_INFO);
  
  // Build associated data
  const associatedData = concatBytes(
    senderIdentityKey,
    myIdentityPublic,
    senderEphemeralKey,
    usedOnetimePublic
  );
  
  return {
    sharedSecret,
    ephemeralPublic: senderEphemeralKey,
    usedOnetimePrekeyId,
    associatedData,
  };
}

// ============================================================================
// PREKEY BUNDLE MANAGEMENT
// ============================================================================

/**
 * Generate a new prekey bundle for publishing
 * 
 * @param localState Local prekey state with private keys
 * @param userId User identifier (wallet address or .sol domain)
 * @returns Prekey bundle ready for publishing
 */
export function generatePrekeyBundle(
  localState: LocalPrekeyState,
  userId: string
): PrekeyBundle {
  // Extract public keys
  const oneTimePrekeys: OneTimePrekey[] = [];
  localState.oneTimePrekeyPairs.forEach((keyPair, id) => {
    oneTimePrekeys.push({
      id,
      publicKey: keyPair.publicKey,
    });
  });
  
  return {
    userId,
    identityKey: localState.identityKeyPair.exchange.publicKey,
    signedPrekey: {
      id: localState.signedPrekeyPair.id,
      publicKey: localState.signedPrekeyPair.publicKey,
      signature: new Uint8Array(64), // TODO: Add Ed25519 signature
      timestamp: localState.signedPrekeyPair.timestamp,
    },
    oneTimePrekeys,
    timestamp: Date.now(),
    version: X3DH_VERSION,
  };
}

/**
 * Initialize local prekey state (for new users)
 * 
 * @param generateX25519 Function to generate X25519 key pair
 * @param generateEd25519 Function to generate Ed25519 key pair
 * @returns Fresh local prekey state
 */
export function initializeLocalPrekeyState(
  generateX25519: () => X25519KeyPair,
  generateEd25519: () => Ed25519KeyPair
): LocalPrekeyState {
  // Generate identity key pairs
  const signingKey = generateEd25519();
  const exchangeKey = generateX25519();
  
  // Generate signed prekey
  const signedPrekey = generateX25519();
  
  // Generate one-time prekeys
  const oneTimePrekeyPairs = new Map<number, X25519KeyPair>();
  for (let i = 0; i < ONE_TIME_PREKEY_COUNT; i++) {
    oneTimePrekeyPairs.set(i, generateX25519());
  }
  
  return {
    identityKeyPair: {
      signing: signingKey,
      exchange: exchangeKey,
    },
    signedPrekeyPair: {
      ...signedPrekey,
      id: 1,
      timestamp: Date.now(),
    },
    oneTimePrekeyPairs,
    nextPrekeyId: ONE_TIME_PREKEY_COUNT,
  };
}

/**
 * Check if prekey bundle needs refresh
 * 
 * @param bundle Prekey bundle to check
 * @returns True if bundle needs refresh
 */
export function needsPrekeyRefresh(bundle: PrekeyBundle): boolean {
  const now = Date.now();
  
  // Check signed prekey age
  const signedPrekeyAge = now - bundle.signedPrekey.timestamp;
  if (signedPrekeyAge > SIGNED_PREKEY_LIFETIME_MS) {
    return true;
  }
  
  // Check one-time prekey count
  if (bundle.oneTimePrekeys.length < LOW_PREKEY_THRESHOLD) {
    return true;
  }
  
  return false;
}

/**
 * Replenish one-time prekeys
 * 
 * @param localState Local prekey state to update
 * @param generateX25519 Function to generate X25519 key pair
 * @param targetCount Target number of prekeys
 */
export function replenishOneTimePrekeys(
  localState: LocalPrekeyState,
  generateX25519: () => X25519KeyPair,
  targetCount: number = ONE_TIME_PREKEY_COUNT
): void {
  const currentCount = localState.oneTimePrekeyPairs.size;
  const needed = targetCount - currentCount;
  
  for (let i = 0; i < needed; i++) {
    const id = localState.nextPrekeyId++;
    localState.oneTimePrekeyPairs.set(id, generateX25519());
  }
}

// ============================================================================
// SERIALIZATION
// ============================================================================

/**
 * Serialize prekey bundle to JSON for blockchain storage
 */
export function serializePrekeyBundle(bundle: PrekeyBundle): string {
  return JSON.stringify({
    v: bundle.version,
    u: bundle.userId,
    ik: bytesToBase64(bundle.identityKey),
    spk: {
      id: bundle.signedPrekey.id,
      pk: bytesToBase64(bundle.signedPrekey.publicKey),
      sig: bytesToBase64(bundle.signedPrekey.signature),
      ts: bundle.signedPrekey.timestamp,
    },
    opks: bundle.oneTimePrekeys.map(opk => ({
      id: opk.id,
      pk: bytesToBase64(opk.publicKey),
    })),
    ts: bundle.timestamp,
  });
}

/**
 * Deserialize prekey bundle from JSON
 */
export function deserializePrekeyBundle(json: string): PrekeyBundle {
  const obj = JSON.parse(json);
  
  return {
    version: obj.v,
    userId: obj.u,
    identityKey: base64ToBytes(obj.ik),
    signedPrekey: {
      id: obj.spk.id,
      publicKey: base64ToBytes(obj.spk.pk),
      signature: base64ToBytes(obj.spk.sig),
      timestamp: obj.spk.ts,
    },
    oneTimePrekeys: obj.opks.map((opk: { id: number; pk: string }) => ({
      id: opk.id,
      publicKey: base64ToBytes(opk.pk),
    })),
    timestamp: obj.ts,
  };
}

/**
 * Serialize local state for secure storage
 */
export function serializeLocalState(state: LocalPrekeyState): string {
  const onetimePrekeys: { id: number; pub: string; priv: string }[] = [];
  state.oneTimePrekeyPairs.forEach((kp, id) => {
    onetimePrekeys.push({
      id,
      pub: bytesToBase64(kp.publicKey),
      priv: bytesToBase64(kp.privateKey),
    });
  });
  
  return JSON.stringify({
    identity: {
      signing: {
        pub: bytesToBase64(state.identityKeyPair.signing.publicKey),
        priv: bytesToBase64(state.identityKeyPair.signing.privateKey),
      },
      exchange: {
        pub: bytesToBase64(state.identityKeyPair.exchange.publicKey),
        priv: bytesToBase64(state.identityKeyPair.exchange.privateKey),
      },
    },
    signedPrekey: {
      id: state.signedPrekeyPair.id,
      pub: bytesToBase64(state.signedPrekeyPair.publicKey),
      priv: bytesToBase64(state.signedPrekeyPair.privateKey),
      ts: state.signedPrekeyPair.timestamp,
    },
    onetimePrekeys,
    nextPrekeyId: state.nextPrekeyId,
  });
}

/**
 * Deserialize local state from secure storage
 */
export function deserializeLocalState(json: string): LocalPrekeyState {
  const obj = JSON.parse(json);
  
  const oneTimePrekeyPairs = new Map<number, X25519KeyPair>();
  for (const opk of obj.onetimePrekeys) {
    oneTimePrekeyPairs.set(opk.id, {
      publicKey: base64ToBytes(opk.pub),
      privateKey: base64ToBytes(opk.priv),
    });
  }
  
  return {
    identityKeyPair: {
      signing: {
        publicKey: base64ToBytes(obj.identity.signing.pub),
        privateKey: base64ToBytes(obj.identity.signing.priv),
      },
      exchange: {
        publicKey: base64ToBytes(obj.identity.exchange.pub),
        privateKey: base64ToBytes(obj.identity.exchange.privateKey),
      },
    },
    signedPrekeyPair: {
      publicKey: base64ToBytes(obj.signedPrekey.pub),
      privateKey: base64ToBytes(obj.signedPrekey.priv),
      id: obj.signedPrekey.id,
      timestamp: obj.signedPrekey.ts,
    },
    oneTimePrekeyPairs,
    nextPrekeyId: obj.nextPrekeyId,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Simple KDF using SHA-256
 */
function kdf(input: Uint8Array, info: Uint8Array): Uint8Array {
  return sha256Bytes(concatBytes(info, input));
}

/**
 * Convert bytes to base64 string
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to bytes
 */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  X3DH_VERSION,
  ONE_TIME_PREKEY_COUNT,
  LOW_PREKEY_THRESHOLD,
  SIGNED_PREKEY_LIFETIME_MS,
};
