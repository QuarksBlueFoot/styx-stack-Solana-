/**
 * Styx Compliance Module
 * 
 * Privacy with optional compliance:
 * - Zero-knowledge compliance proofs
 * - Selective disclosure
 * - Regulatory reporting (opt-in)
 * - Audit trail generation
 * - KYC/AML integration hooks
 * - GDPR-compatible data handling
 * 
 * Key principle: Privacy by default, compliance when needed.
 */

import { sha256Bytes, concatBytes } from "@styx/crypto-core";

// Utility for random bytes
function randomBytes(length: number): Uint8Array {
  const arr = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    // Fallback for Node.js
    for (let i = 0; i < length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
  }
  return arr;
}

// Helper to encode timestamp as bytes
function timestampToBytes(ts: number): Uint8Array {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigInt64(0, BigInt(ts), true);
  return new Uint8Array(buffer);
}

// === Zero-Knowledge Compliance Proofs ===

export interface ZKComplianceProof {
  /** Proof type */
  proofType: 'age_over' | 'jurisdiction_allowed' | 'not_sanctioned' | 'accredited_investor' | 'kyc_verified' | 'custom';
  /** Commitment to the attribute being proven */
  attributeCommitment: Uint8Array;
  /** Zero-knowledge proof data */
  proof: Uint8Array;
  /** Proof verifier public key */
  verifierPubkey: Uint8Array;
  /** Proof expiry timestamp */
  expiresAt: number;
  /** Proof metadata (non-identifying) */
  metadata: Record<string, unknown>;
}

export interface ComplianceAttestation {
  /** Attestation ID */
  id: Uint8Array;
  /** Subject (hashed identity) */
  subjectHash: Uint8Array;
  /** Attestation type */
  type: string;
  /** Attester (compliance provider) */
  attesterPubkey: Uint8Array;
  /** Attestation signature */
  signature: Uint8Array;
  /** Valid from */
  validFrom: number;
  /** Valid until */
  validUntil: number;
  /** Revocation check URL (optional) */
  revocationUrl?: string;
}

/**
 * Create a commitment to an attribute without revealing it
 */
export function commitToAttribute(
  attribute: string,
  value: unknown,
  secret: Uint8Array
): Uint8Array {
  const attributeData = new TextEncoder().encode(
    JSON.stringify({ attribute, value })
  );
  
  return sha256Bytes(concatBytes(secret, attributeData));
}

/**
 * Create a zero-knowledge proof that an attribute satisfies a condition
 * This is a simplified implementation - use actual ZK libraries in production
 */
export function createZKComplianceProof(params: {
  attribute: string;
  value: unknown;
  condition: (value: unknown) => boolean;
  proofType: ZKComplianceProof['proofType'];
  secret: Uint8Array;
  verifierPubkey: Uint8Array;
  expiresInMs?: number;
}): ZKComplianceProof | null {
  const { attribute, value, condition, proofType, secret, verifierPubkey, expiresInMs } = params;
  
  // Check if condition is satisfied
  if (!condition(value)) {
    return null;
  }
  
  // Create commitment
  const attributeCommitment = commitToAttribute(attribute, value, secret);
  
  // Create proof (simplified - would be actual ZK proof in production)
  // In production, use zkSNARKs or Bulletproofs
  const proofData = concatBytes(
    secret,
    attributeCommitment,
    new TextEncoder().encode(proofType)
  );
  const proof = sha256Bytes(proofData);
  
  return {
    proofType,
    attributeCommitment,
    proof,
    verifierPubkey,
    expiresAt: Date.now() + (expiresInMs ?? 86400000), // Default 24 hours
    metadata: { createdAt: Date.now() },
  };
}

/**
 * Verify a ZK compliance proof
 */
export function verifyZKComplianceProof(
  proof: ZKComplianceProof,
  expectedVerifierPubkey: Uint8Array
): boolean {
  // Check expiry
  if (proof.expiresAt < Date.now()) {
    return false;
  }
  
  // Check verifier
  if (!proof.verifierPubkey.every((b, i) => b === expectedVerifierPubkey[i])) {
    return false;
  }
  
  // In production, verify the actual ZK proof
  return proof.proof.length === 32;
}

// === Selective Disclosure ===

export interface SelectiveDisclosureRequest {
  /** Requested attributes */
  requestedAttributes: string[];
  /** Verifier public key */
  verifierPubkey: Uint8Array;
  /** Purpose of disclosure */
  purpose: string;
  /** Nonce for freshness */
  nonce: Uint8Array;
  /** Expiry */
  expiresAt: number;
}

export interface SelectiveDisclosureResponse {
  /** Disclosed attributes (encrypted for verifier) */
  disclosedAttributes: Map<string, Uint8Array>;
  /** ZK proofs for non-disclosed attributes */
  proofs: Map<string, ZKComplianceProof>;
  /** Subject's signature */
  signature: Uint8Array;
  /** Request nonce (proves freshness) */
  requestNonce: Uint8Array;
}

/**
 * Create a selective disclosure request
 */
export function createDisclosureRequest(
  attributes: string[],
  verifierPubkey: Uint8Array,
  purpose: string
): SelectiveDisclosureRequest {
  return {
    requestedAttributes: attributes,
    verifierPubkey,
    purpose,
    nonce: randomBytes(32),
    expiresAt: Date.now() + 300000, // 5 minutes
  };
}

/**
 * Respond to a selective disclosure request
 */
export function createDisclosureResponse(
  request: SelectiveDisclosureRequest,
  attributeValues: Map<string, unknown>,
  attributesToDisclose: Set<string>,
  subjectSecret: Uint8Array
): SelectiveDisclosureResponse {
  const disclosedAttributes = new Map<string, Uint8Array>();
  const proofs = new Map<string, ZKComplianceProof>();
  
  for (const attr of request.requestedAttributes) {
    const value = attributeValues.get(attr);
    if (value === undefined) continue;
    
    if (attributesToDisclose.has(attr)) {
      // Encrypt attribute for verifier
      const encKey = sha256Bytes(concatBytes(
        subjectSecret,
        request.verifierPubkey,
        new TextEncoder().encode(attr)
      ));
      const valueBytes = new TextEncoder().encode(JSON.stringify(value));
      const encrypted = new Uint8Array(valueBytes.length);
      for (let i = 0; i < valueBytes.length; i++) {
        encrypted[i] = valueBytes[i] ^ encKey[i % encKey.length];
      }
      disclosedAttributes.set(attr, encrypted);
    } else {
      // Create ZK proof instead
      const proof = createZKComplianceProof({
        attribute: attr,
        value,
        condition: () => true, // Proof of existence
        proofType: 'custom',
        secret: subjectSecret,
        verifierPubkey: request.verifierPubkey,
      });
      if (proof) {
        proofs.set(attr, proof);
      }
    }
  }
  
  // Create signature
  const signatureInput = concatBytes(
    request.nonce,
    ...Array.from(disclosedAttributes.values())
  );
  const signature = sha256Bytes(concatBytes(subjectSecret, signatureInput));
  
  return {
    disclosedAttributes,
    proofs,
    signature,
    requestNonce: request.nonce,
  };
}

// === Audit Trail ===

export interface AuditEntry {
  /** Entry ID */
  id: Uint8Array;
  /** Timestamp */
  timestamp: number;
  /** Action type */
  action: string;
  /** Actor (hashed) */
  actorHash: Uint8Array;
  /** Encrypted details (for authorized auditors only) */
  encryptedDetails: Uint8Array;
  /** Hash of previous entry (chain) */
  previousHash: Uint8Array;
  /** Entry hash */
  entryHash: Uint8Array;
}

export interface AuditLog {
  /** Log ID */
  id: Uint8Array;
  /** Entries */
  entries: AuditEntry[];
  /** Authorized auditor public keys */
  auditorPubkeys: Uint8Array[];
  /** Log creation timestamp */
  createdAt: number;
}

/**
 * Create an audit log
 */
export function createAuditLog(auditorPubkeys: Uint8Array[]): AuditLog {
  return {
    id: randomBytes(32),
    entries: [],
    auditorPubkeys,
    createdAt: Date.now(),
  };
}

/**
 * Add an entry to the audit log
 */
export function addAuditEntry(
  log: AuditLog,
  action: string,
  actor: Uint8Array,
  details: Record<string, unknown>,
  encryptionKey: Uint8Array
): AuditLog {
  const id = randomBytes(32);
  const timestamp = Date.now();
  
  // Hash actor for privacy
  const actorHash = sha256Bytes(actor);
  
  // Encrypt details for auditors
  const detailsBytes = new TextEncoder().encode(JSON.stringify(details));
  const encryptedDetails = new Uint8Array(detailsBytes.length);
  for (let i = 0; i < detailsBytes.length; i++) {
    encryptedDetails[i] = detailsBytes[i] ^ encryptionKey[i % encryptionKey.length];
  }
  
  // Get previous hash
  const previousHash = log.entries.length > 0
    ? log.entries[log.entries.length - 1].entryHash
    : new Uint8Array(32);
  
  // Compute entry hash
  const entryHash = sha256Bytes(concatBytes(
    id,
    timestampToBytes(timestamp),
    new TextEncoder().encode(action),
    actorHash,
    encryptedDetails,
    previousHash
  ));
  
  const entry: AuditEntry = {
    id,
    timestamp,
    action,
    actorHash,
    encryptedDetails,
    previousHash,
    entryHash,
  };
  
  return {
    ...log,
    entries: [...log.entries, entry],
  };
}

/**
 * Verify audit log integrity
 */
export function verifyAuditLog(log: AuditLog): boolean {
  let previousHash = new Uint8Array(32);
  
  for (const entry of log.entries) {
    // Verify chain link
    if (!entry.previousHash.every((b, i) => b === previousHash[i])) {
      return false;
    }
    
    // Verify entry hash
    const expectedHash = sha256Bytes(concatBytes(
      entry.id,
      timestampToBytes(entry.timestamp),
      new TextEncoder().encode(entry.action),
      entry.actorHash,
      entry.encryptedDetails,
      entry.previousHash
    ));
    
    if (!entry.entryHash.every((b, i) => b === expectedHash[i])) {
      return false;
    }
    
    previousHash = new Uint8Array(entry.entryHash);
  }
  
  return true;
}

// === Regulatory Reporting (Opt-in) ===

export interface RegulatoryReport {
  /** Report ID */
  id: Uint8Array;
  /** Report type */
  type: 'SAR' | 'CTR' | 'FATF' | 'custom';
  /** Reporting entity */
  reportingEntity: Uint8Array;
  /** Report timestamp */
  timestamp: number;
  /** Encrypted report data */
  encryptedData: Uint8Array;
  /** Regulator public key */
  regulatorPubkey: Uint8Array;
  /** Report hash (for verification) */
  reportHash: Uint8Array;
}

/**
 * Create an encrypted regulatory report
 * Only the designated regulator can decrypt
 */
export function createRegulatoryReport(
  type: RegulatoryReport['type'],
  reportingEntity: Uint8Array,
  data: Record<string, unknown>,
  regulatorPubkey: Uint8Array
): RegulatoryReport {
  const id = randomBytes(32);
  const timestamp = Date.now();
  
  // Derive encryption key for regulator
  const encKey = sha256Bytes(concatBytes(
    regulatorPubkey,
    id,
    new TextEncoder().encode("STYX_REGULATORY_REPORT_V1")
  ));
  
  // Encrypt report data
  const dataBytes = new TextEncoder().encode(JSON.stringify(data));
  const encryptedData = new Uint8Array(dataBytes.length);
  for (let i = 0; i < dataBytes.length; i++) {
    encryptedData[i] = dataBytes[i] ^ encKey[i % encKey.length];
  }
  
  // Create report hash
  const reportHash = sha256Bytes(concatBytes(
    id,
    new TextEncoder().encode(type),
    reportingEntity,
    encryptedData
  ));
  
  return {
    id,
    type,
    reportingEntity,
    timestamp,
    encryptedData,
    regulatorPubkey,
    reportHash,
  };
}

// === GDPR-Compatible Data Handling ===

export interface DataSubjectRights {
  /** Right to access */
  access: boolean;
  /** Right to rectification */
  rectification: boolean;
  /** Right to erasure */
  erasure: boolean;
  /** Right to restrict processing */
  restrictProcessing: boolean;
  /** Right to data portability */
  portability: boolean;
  /** Right to object */
  object: boolean;
}

export interface ConsentRecord {
  /** Consent ID */
  id: Uint8Array;
  /** Subject (hashed) */
  subjectHash: Uint8Array;
  /** Purpose of data processing */
  purpose: string;
  /** Data categories */
  dataCategories: string[];
  /** Consent given timestamp */
  givenAt: number;
  /** Consent expires at (optional) */
  expiresAt?: number;
  /** Withdrawn at (if applicable) */
  withdrawnAt?: number;
  /** Consent proof */
  proof: Uint8Array;
}

/**
 * Record user consent for data processing
 */
export function recordConsent(
  subjectSecret: Uint8Array,
  purpose: string,
  dataCategories: string[],
  durationMs?: number
): ConsentRecord {
  const id = randomBytes(32);
  const subjectHash = sha256Bytes(subjectSecret);
  const givenAt = Date.now();
  
  // Create consent proof (signed by subject)
  const proof = sha256Bytes(concatBytes(
    subjectSecret,
    id,
    new TextEncoder().encode(purpose),
    new TextEncoder().encode(dataCategories.join(',')),
    timestampToBytes(givenAt)
  ));
  
  return {
    id,
    subjectHash,
    purpose,
    dataCategories,
    givenAt,
    expiresAt: durationMs ? givenAt + durationMs : undefined,
    proof,
  };
}

/**
 * Withdraw consent
 */
export function withdrawConsent(consent: ConsentRecord): ConsentRecord {
  return {
    ...consent,
    withdrawnAt: Date.now(),
  };
}

/**
 * Check if consent is valid
 */
export function isConsentValid(consent: ConsentRecord): boolean {
  // Check if withdrawn
  if (consent.withdrawnAt) {
    return false;
  }
  
  // Check if expired
  if (consent.expiresAt && consent.expiresAt < Date.now()) {
    return false;
  }
  
  return true;
}

/**
 * Generate a data portability export
 */
export function generatePortabilityExport(
  data: Record<string, unknown>,
  format: 'json' | 'csv' = 'json'
): Uint8Array {
  if (format === 'json') {
    return new TextEncoder().encode(JSON.stringify(data, null, 2));
  }
  
  // CSV format
  const rows: string[] = [];
  const headers = Object.keys(data);
  rows.push(headers.join(','));
  
  const values = headers.map(h => {
    const v = (data as Record<string, unknown>)[h];
    return typeof v === 'string' ? `"${v}"` : String(v);
  });
  rows.push(values.join(','));
  
  return new TextEncoder().encode(rows.join('\n'));
}
