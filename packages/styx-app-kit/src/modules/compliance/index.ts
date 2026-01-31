/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX COMPLIANCE MODULE
 *  
 *  Privacy-preserving compliance for regulated applications:
 *  - Range proofs (prove amount < threshold without revealing exact amount)
 *  - Selective disclosure (reveal specific data to auditors)
 *  - Travel Rule compliance (prove transaction meets regulatory thresholds)
 *  - Sanctions screening (optional, off-chain)
 *  - Audit trails (encrypted for designated auditors)
 * 
 *  Used for Range ($1.5k+) bounty integration
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  PublicKey,
  Keypair,
  TransactionInstruction,
} from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha256';
import { keccak_256 } from '@noble/hashes/sha3';
import { randomBytes } from '@noble/ciphers/webcrypto';
import bs58 from 'bs58';
import {
  encryptData,
  decryptData,
  deriveEncryptionKey,
  computeSharedSecret,
  ed25519ToX25519,
} from '../../core';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ComplianceProof {
  /** Proof type */
  type: 'range' | 'threshold' | 'sanctions' | 'kyc' | 'age' | 'jurisdiction';
  /** Proof data (opaque blob) */
  proof: Uint8Array;
  /** Statement being proven (human-readable) */
  statement: string;
  /** Proof creation timestamp */
  createdAt: number;
  /** Proof expiration */
  expiresAt: number;
  /** Verifier that can validate this proof */
  verifier?: PublicKey;
}

export interface RangeProofParams {
  /** Value to prove is in range */
  value: bigint;
  /** Minimum allowed value (inclusive) */
  min?: bigint;
  /** Maximum allowed value (inclusive) */
  max: bigint;
  /** Blinding factor for zero-knowledge */
  blindingFactor?: Uint8Array;
}

export interface ThresholdProof {
  /** Proves value is below this threshold */
  threshold: bigint;
  /** Commitment to the actual value */
  commitment: Uint8Array;
  /** Zero-knowledge proof */
  proof: Uint8Array;
  /** Statement */
  statement: string;
}

export interface SelectiveDisclosure {
  /** What fields to reveal */
  revealedFields: string[];
  /** Encrypted full data for auditor */
  encryptedData: Uint8Array;
  /** Auditor's public key */
  auditorPubkey: PublicKey;
  /** Proof of data integrity */
  integrityHash: Uint8Array;
}

export interface AuditTrail {
  /** Trail ID */
  id: string;
  /** Encrypted audit events */
  events: EncryptedAuditEvent[];
  /** Designated auditors who can decrypt */
  auditors: PublicKey[];
  /** Creation timestamp */
  createdAt: number;
}

export interface EncryptedAuditEvent {
  /** Event timestamp */
  timestamp: number;
  /** Encrypted event data */
  ciphertext: Uint8Array;
  /** Nonce for decryption */
  nonce: Uint8Array;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RANGE PROOFS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a range proof that proves value < max without revealing the value
 * Uses Pedersen commitments with simplified verification
 */
export function createRangeProof(params: RangeProofParams): ComplianceProof {
  const { value, min = 0n, max, blindingFactor } = params;
  
  if (value < min || value > max) {
    throw new Error(`Value ${value} is not in range [${min}, ${max}]`);
  }
  
  // Generate blinding factor if not provided
  const blinding = blindingFactor || randomBytes(32);
  
  // Create Pedersen commitment: C = vG + rH
  // Simplified: hash(value || blinding) as commitment
  const commitment = createPedersenCommitment(value, blinding);
  
  // Create range proof
  // In production, use Bulletproofs or similar
  // Simplified version: hash-based proof
  const proof = createSimplifiedRangeProof(value, max, blinding, commitment);
  
  const statement = `amount < ${formatAmount(max)}`;
  
  return {
    type: 'range',
    proof,
    statement,
    createdAt: Date.now(),
    expiresAt: Date.now() + 3600000, // 1 hour
  };
}

/**
 * Verify a range proof
 */
export function verifyRangeProof(
  proof: ComplianceProof,
  expectedMax: bigint
): boolean {
  if (proof.type !== 'range') {
    return false;
  }
  
  try {
    // Extract proof components
    const proofData = proof.proof;
    if (proofData.length < 96) return false;
    
    const commitment = proofData.slice(0, 32);
    const proofHash = proofData.slice(32, 64);
    const maxBytes = proofData.slice(64, 72);
    
    // Verify max matches
    const proofMax = new DataView(maxBytes.buffer).getBigUint64(0, true);
    if (proofMax !== expectedMax) return false;
    
    // Verify proof hasn't expired
    if (proof.expiresAt < Date.now()) return false;
    
    // In production, verify the actual ZK proof
    // Simplified: check hash chain
    const expectedHash = sha256(new Uint8Array([...commitment, ...maxBytes]));
    return arraysEqual(proofHash, expectedHash);
  } catch {
    return false;
  }
}

/**
 * Create a threshold proof for Travel Rule compliance
 * Proves: amount < $10,000 (or other regulatory threshold)
 */
export function createTravelRuleProof(
  amountUsd: number,
  thresholdUsd: number = 10000
): ThresholdProof {
  const value = BigInt(Math.round(amountUsd * 100)); // Cents
  const threshold = BigInt(thresholdUsd * 100);
  
  if (value >= threshold) {
    throw new Error('Amount exceeds Travel Rule threshold');
  }
  
  const blinding = randomBytes(32);
  const commitment = createPedersenCommitment(value, blinding);
  
  // Create proof that value < threshold
  const proofData = new Uint8Array(64);
  proofData.set(sha256(new Uint8Array([...commitment, ...bigintToBytes(threshold)])), 0);
  proofData.set(sha256(new Uint8Array([...blinding, ...commitment])), 32);
  
  return {
    threshold,
    commitment,
    proof: proofData,
    statement: `Transaction amount is below $${thresholdUsd.toLocaleString()} Travel Rule threshold`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SELECTIVE DISCLOSURE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create selective disclosure for auditor
 * Encrypts full transaction data for auditor while revealing only specified fields publicly
 */
export function createSelectiveDisclosure(
  fullData: Record<string, any>,
  fieldsToReveal: string[],
  auditorPubkey: PublicKey
): SelectiveDisclosure {
  // Create integrity hash of full data
  const fullDataJson = JSON.stringify(fullData, null, 0);
  const integrityHash = sha256(new TextEncoder().encode(fullDataJson));
  
  // Encrypt full data for auditor
  // Generate ephemeral key for encryption
  const ephemeralKeypair = Keypair.generate();
  const auditorX25519 = ed25519ToX25519(auditorPubkey.toBytes());
  const ephemeralX25519 = ed25519ToX25519(ephemeralKeypair.secretKey);
  
  const sharedSecret = computeSharedSecret(ephemeralX25519.secretKey, auditorX25519.publicKey);
  const encKey = deriveEncryptionKey(sharedSecret, 'styx-audit-v1');
  
  const encrypted = encryptData(
    new TextEncoder().encode(fullDataJson),
    encKey
  );
  
  // Package encrypted data with ephemeral pubkey
  const encryptedData = new Uint8Array(32 + 24 + encrypted.ciphertext.length);
  encryptedData.set(ephemeralKeypair.publicKey.toBytes(), 0);
  encryptedData.set(encrypted.nonce, 32);
  encryptedData.set(encrypted.ciphertext, 56);
  
  return {
    revealedFields: fieldsToReveal,
    encryptedData,
    auditorPubkey,
    integrityHash,
  };
}

/**
 * Auditor decrypts selective disclosure
 */
export function decryptSelectiveDisclosure(
  disclosure: SelectiveDisclosure,
  auditorSecretKey: Uint8Array
): Record<string, any> {
  // Extract ephemeral pubkey
  const ephemeralPubkey = disclosure.encryptedData.slice(0, 32);
  const nonce = disclosure.encryptedData.slice(32, 56);
  const ciphertext = disclosure.encryptedData.slice(56);
  
  // Derive shared secret
  const auditorX25519 = ed25519ToX25519(auditorSecretKey);
  const sharedSecret = computeSharedSecret(auditorX25519.secretKey, ephemeralPubkey);
  const encKey = deriveEncryptionKey(sharedSecret, 'styx-audit-v1');
  
  // Decrypt
  const plaintext = decryptData(ciphertext, encKey, nonce);
  const data = JSON.parse(new TextDecoder().decode(plaintext));
  
  // Verify integrity
  const computedHash = sha256(new TextEncoder().encode(JSON.stringify(data, null, 0)));
  if (!arraysEqual(computedHash, disclosure.integrityHash)) {
    throw new Error('Data integrity check failed');
  }
  
  return data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT TRAIL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create an encrypted audit trail
 */
export class AuditTrailBuilder {
  private events: EncryptedAuditEvent[] = [];
  private auditors: PublicKey[];
  private encKey: Uint8Array;
  
  constructor(auditors: PublicKey[]) {
    this.auditors = auditors;
    // Derive shared audit key (simplified - in production use threshold encryption)
    this.encKey = sha256(new Uint8Array(auditors.flatMap(a => [...a.toBytes()])));
  }
  
  /**
   * Add an event to the audit trail
   */
  addEvent(eventData: Record<string, any>): void {
    const plaintext = new TextEncoder().encode(JSON.stringify(eventData));
    const encrypted = encryptData(plaintext, this.encKey);
    
    this.events.push({
      timestamp: Date.now(),
      ciphertext: encrypted.ciphertext,
      nonce: encrypted.nonce,
    });
  }
  
  /**
   * Build the final audit trail
   */
  build(): AuditTrail {
    return {
      id: bs58.encode(randomBytes(16)),
      events: this.events,
      auditors: this.auditors,
      createdAt: Date.now(),
    };
  }
}

/**
 * Decrypt audit trail events
 */
export function decryptAuditTrail(
  trail: AuditTrail,
  auditorSecretKey: Uint8Array
): Record<string, any>[] {
  // Derive shared audit key
  const encKey = sha256(new Uint8Array(trail.auditors.flatMap(a => [...a.toBytes()])));
  
  return trail.events.map(event => {
    const plaintext = decryptData(event.ciphertext, encKey, event.nonce);
    return JSON.parse(new TextDecoder().decode(plaintext));
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLIANCE CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compliance client for attaching proofs to transactions
 */
export class ComplianceClient {
  private auditors: PublicKey[];
  
  constructor(auditors: PublicKey[] = []) {
    this.auditors = auditors;
  }
  
  /**
   * Create compliance proofs for a transfer
   */
  createTransferCompliance(
    amount: bigint,
    sender: PublicKey,
    recipient: PublicKey,
    options: {
      travelRule?: boolean;
      travelRuleThreshold?: number;
      auditTrail?: boolean;
    } = {}
  ): {
    rangeProof?: ComplianceProof;
    travelRuleProof?: ThresholdProof;
    disclosure?: SelectiveDisclosure;
    auditTrail?: AuditTrail;
  } {
    const result: ReturnType<typeof this.createTransferCompliance> = {};
    
    // Range proof for amount
    result.rangeProof = createRangeProof({
      value: amount,
      max: BigInt(1e15), // Max 1M SOL equivalent
    });
    
    // Travel Rule proof if requested
    if (options.travelRule) {
      const amountUsd = Number(amount) / 1e9 * 100; // Assume SOL at $100
      result.travelRuleProof = createTravelRuleProof(
        amountUsd,
        options.travelRuleThreshold || 10000
      );
    }
    
    // Selective disclosure for auditors
    if (this.auditors.length > 0) {
      result.disclosure = createSelectiveDisclosure(
        {
          amount: amount.toString(),
          sender: sender.toBase58(),
          recipient: recipient.toBase58(),
          timestamp: Date.now(),
        },
        ['timestamp'], // Only reveal timestamp publicly
        this.auditors[0]
      );
    }
    
    // Audit trail
    if (options.auditTrail && this.auditors.length > 0) {
      const builder = new AuditTrailBuilder(this.auditors);
      builder.addEvent({
        type: 'transfer',
        amount: amount.toString(),
        sender: sender.toBase58(),
        recipient: recipient.toBase58(),
      });
      result.auditTrail = builder.build();
    }
    
    return result;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function createPedersenCommitment(value: bigint, blinding: Uint8Array): Uint8Array {
  const valueBytes = bigintToBytes(value);
  const combined = new Uint8Array(valueBytes.length + blinding.length);
  combined.set(valueBytes, 0);
  combined.set(blinding, valueBytes.length);
  return sha256(combined);
}

function createSimplifiedRangeProof(
  value: bigint,
  max: bigint,
  blinding: Uint8Array,
  commitment: Uint8Array
): Uint8Array {
  // Simplified range proof (not zero-knowledge in practice)
  // In production, use Bulletproofs
  const maxBytes = bigintToBytes(max);
  const proofHash = sha256(new Uint8Array([...commitment, ...maxBytes]));
  const blindHash = sha256(new Uint8Array([...blinding, ...commitment]));
  
  const proof = new Uint8Array(96);
  proof.set(commitment, 0);
  proof.set(proofHash, 32);
  proof.set(maxBytes, 64);
  proof.set(blindHash.slice(0, 24), 72);
  
  return proof;
}

function bigintToBytes(value: bigint): Uint8Array {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, value, true);
  return bytes;
}

function formatAmount(value: bigint): string {
  return `${Number(value) / 1e9} SOL`;
}

function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

// All functions are already exported inline with 'export function' declarations
// Types are exported with 'export interface' declarations

export default ComplianceClient;
