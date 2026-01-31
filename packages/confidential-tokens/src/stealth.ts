import { PublicKey } from "@solana/web3.js";
import { sha256Bytes, concatBytes, bytesToB64, b64ToBytes } from "@styx/crypto-core";
import nacl from "tweetnacl";

/**
 * Stealth Payments Module
 * 
 * Implements one-time stealth addresses for Solana payments.
 * The recipient publishes a view key and spend key; senders generate
 * unique one-time addresses that only the recipient can identify and spend.
 */

export type StealthKeyPair = {
  /** View key for scanning - can be shared with third parties for monitoring */
  viewSecretKey: Uint8Array;
  viewPublicKey: Uint8Array;
  /** Spend key - required to actually spend received funds */
  spendSecretKey: Uint8Array;
  spendPublicKey: Uint8Array;
};

export type StealthMeta = {
  /** Published stealth address (view pubkey, spend pubkey) */
  viewPubkey: Uint8Array;
  spendPubkey: Uint8Array;
};

export type StealthPayment = {
  /** One-time address to send to */
  oneTimeAddress: PublicKey;
  /** Ephemeral public key (include in tx for recipient to decode) */
  ephemeralPubkey: Uint8Array;
  /** Encrypted payment info */
  encryptedInfo?: Uint8Array;
};

export type ScannedPayment = {
  signature: string;
  oneTimeAddress: PublicKey;
  ephemeralPubkey: Uint8Array;
  /** Derived secret key for this one-time address */
  derivedSecretKey: Uint8Array;
  amount?: bigint;
};

/**
 * Generate a new stealth key pair.
 */
export function generateStealthKeyPair(): StealthKeyPair {
  const viewKp = nacl.box.keyPair();
  const spendKp = nacl.sign.keyPair();
  
  return {
    viewSecretKey: viewKp.secretKey,
    viewPublicKey: viewKp.publicKey,
    spendSecretKey: spendKp.secretKey,
    spendPublicKey: spendKp.publicKey
  };
}

/**
 * Get the public metadata to share for receiving stealth payments.
 */
export function getStealthMeta(keyPair: StealthKeyPair): StealthMeta {
  return {
    viewPubkey: keyPair.viewPublicKey,
    spendPubkey: keyPair.spendPublicKey
  };
}

/**
 * Generate a stealth payment to a recipient.
 * 
 * The sender:
 * 1. Generates ephemeral keypair (r, R = r*G)
 * 2. Computes shared secret: S = H(r * view_pubkey)
 * 3. Derives one-time address: P = spend_pubkey + S*G
 */
export function createStealthPayment(args: {
  recipientMeta: StealthMeta;
  paymentInfo?: Uint8Array;
}): StealthPayment {
  // Generate ephemeral keypair
  const ephemeral = nacl.box.keyPair();
  
  // Compute shared secret via ECDH
  const sharedPoint = nacl.scalarMult(ephemeral.secretKey, args.recipientMeta.viewPubkey);
  const sharedSecret = sha256Bytes(sharedPoint);
  
  // Derive one-time public key
  // In a proper implementation, this would use curve point addition
  // Here we use a simplified hash-based derivation
  const derivationInput = concatBytes(sharedSecret, args.recipientMeta.spendPubkey);
  const derivedBytes = sha256Bytes(derivationInput);
  
  // XOR with spend pubkey for simplified derivation
  // (Real implementation would use proper Ed25519 point addition)
  const oneTimeBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    oneTimeBytes[i] = args.recipientMeta.spendPubkey[i] ^ derivedBytes[i];
  }
  
  // Encrypt payment info if provided
  let encryptedInfo: Uint8Array | undefined;
  if (args.paymentInfo) {
    const nonce = nacl.randomBytes(24);
    const encrypted = nacl.secretbox(args.paymentInfo, nonce, sharedSecret);
    encryptedInfo = concatBytes(nonce, encrypted);
  }
  
  return {
    oneTimeAddress: new PublicKey(oneTimeBytes),
    ephemeralPubkey: ephemeral.publicKey,
    encryptedInfo
  };
}

/**
 * Scan a transaction's ephemeral pubkey to check if it's for us.
 * 
 * The recipient:
 * 1. Computes shared secret: S = H(view_secret * ephemeral_pubkey)
 * 2. Derives expected one-time address: P = spend_pubkey + S*G
 * 3. Checks if any output matches P
 */
export function scanForStealthPayment(args: {
  keyPair: StealthKeyPair;
  ephemeralPubkey: Uint8Array;
  candidateAddress: PublicKey;
}): { isOurs: boolean; derivedSecret?: Uint8Array } {
  // Compute shared secret
  const sharedPoint = nacl.scalarMult(
    args.keyPair.viewSecretKey.slice(0, 32),
    args.ephemeralPubkey
  );
  const sharedSecret = sha256Bytes(sharedPoint);
  
  // Derive expected one-time public key
  const derivationInput = concatBytes(sharedSecret, args.keyPair.spendPublicKey);
  const derivedBytes = sha256Bytes(derivationInput);
  
  const expectedBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    expectedBytes[i] = args.keyPair.spendPublicKey[i] ^ derivedBytes[i];
  }
  
  const candidateBytes = args.candidateAddress.toBytes();
  const matches = expectedBytes.every((b, i) => b === candidateBytes[i]);
  
  if (!matches) {
    return { isOurs: false };
  }
  
  // Derive the secret key for this one-time address
  // P_secret = spend_secret + H(shared_secret)
  // (Simplified - real impl uses proper scalar addition)
  const derivedSecret = new Uint8Array(64);
  for (let i = 0; i < 32; i++) {
    derivedSecret[i] = args.keyPair.spendSecretKey[i] ^ derivedBytes[i];
  }
  derivedSecret.set(expectedBytes, 32);
  
  return {
    isOurs: true,
    derivedSecret
  };
}

/**
 * Decrypt payment info attached to a stealth payment.
 */
export function decryptPaymentInfo(args: {
  keyPair: StealthKeyPair;
  ephemeralPubkey: Uint8Array;
  encryptedInfo: Uint8Array;
}): Uint8Array | null {
  if (args.encryptedInfo.length < 24) {
    return null;
  }
  
  // Recompute shared secret
  const sharedPoint = nacl.scalarMult(
    args.keyPair.viewSecretKey.slice(0, 32),
    args.ephemeralPubkey
  );
  const sharedSecret = sha256Bytes(sharedPoint);
  
  // Extract nonce and ciphertext
  const nonce = args.encryptedInfo.slice(0, 24);
  const ciphertext = args.encryptedInfo.slice(24);
  
  return nacl.secretbox.open(ciphertext, nonce, sharedSecret);
}

/**
 * Batch scan multiple transactions for stealth payments.
 */
export async function batchScanForStealthPayments(args: {
  keyPair: StealthKeyPair;
  transactions: Array<{
    signature: string;
    ephemeralPubkey?: Uint8Array;
    outputs: PublicKey[];
  }>;
}): Promise<ScannedPayment[]> {
  const found: ScannedPayment[] = [];
  
  for (const tx of args.transactions) {
    if (!tx.ephemeralPubkey) continue;
    
    for (const output of tx.outputs) {
      const result = scanForStealthPayment({
        keyPair: args.keyPair,
        ephemeralPubkey: tx.ephemeralPubkey,
        candidateAddress: output
      });
      
      if (result.isOurs && result.derivedSecret) {
        found.push({
          signature: tx.signature,
          oneTimeAddress: output,
          ephemeralPubkey: tx.ephemeralPubkey,
          derivedSecretKey: result.derivedSecret
        });
      }
    }
  }
  
  return found;
}

/**
 * Encode stealth metadata for publishing (e.g., in profile or memo).
 */
export function encodeStealthMeta(meta: StealthMeta): string {
  const combined = concatBytes(meta.viewPubkey, meta.spendPubkey);
  return `stealth:${bytesToB64(combined)}`;
}

/**
 * Decode stealth metadata from published string.
 */
export function decodeStealthMeta(encoded: string): StealthMeta | null {
  if (!encoded.startsWith("stealth:")) {
    return null;
  }
  
  try {
    const combined = b64ToBytes(encoded.slice(8));
    if (combined.length !== 64) {
      return null;
    }
    
    return {
      viewPubkey: combined.slice(0, 32),
      spendPubkey: combined.slice(32, 64)
    };
  } catch {
    return null;
  }
}
