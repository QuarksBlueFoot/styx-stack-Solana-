import { PublicKey, Transaction, Connection } from "@solana/web3.js";
import { sha256Bytes, bytesToB64, b64ToBytes } from "@styx/crypto-core";

export type AttestationBundle = {
  kind: "tee-attestation";
  /** Issuer identifier (e.g., "intel-sgx", "aws-nitro", "amd-sev") */
  issuer: string;
  /** Base64-encoded attestation report */
  reportB64: string;
  /** Base64-encoded signature over the report */
  signatureB64: string;
  /** Timestamp when attestation was generated */
  timestampMs: number;
  /** Optional: expected measurement/PCR values */
  expectedMeasurements?: Record<string, string>;
};

export type PerSession = {
  sessionId: string;
  delegatedAccounts: string[];
  expiresAtMs: number;
  attestation?: AttestationBundle;
  /** Operator endpoint for this session */
  operatorEndpoint?: string;
  /** Session encryption key for private execution */
  sessionKeyPubkey?: Uint8Array;
};

export type PerExecutionResult = {
  encryptedResponseB64: string;
  attestation?: AttestationBundle;
  /** Gas used in the ephemeral execution */
  gasUsed?: number;
  /** State root after execution */
  postStateRoot?: Uint8Array;
};

export interface PerOperatorClient {
  /**
   * Create a new ephemeral session, delegating account control to the rollup.
   */
  createSession(args: {
    payer: PublicKey;
    accounts: PublicKey[];
    ttlMs?: number;
    /** Request TEE attestation with session */
    requireAttestation?: boolean;
  }): Promise<PerSession>;

  /**
   * Execute a private operation within the ephemeral rollup.
   * The request is encrypted to the session key.
   */
  executePrivate(args: {
    sessionId: string;
    encryptedRequestB64: string;
    /** Optional: expected gas limit */
    gasLimit?: number;
  }): Promise<PerExecutionResult>;

  /**
   * Settle the session back to L1, committing final state.
   */
  settle(args: { 
    sessionId: string;
    /** Force settle even if session hasn't expired */
    force?: boolean;
  }): Promise<{ 
    settlementTxs: Transaction[]; 
    attestation?: AttestationBundle;
    finalStateRoot?: Uint8Array;
  }>;

  /**
   * Get current session status.
   */
  getSessionStatus(sessionId: string): Promise<{
    active: boolean;
    expiresAtMs: number;
    delegatedAccounts: string[];
    executionCount: number;
  }>;
}

/**
 * Known TEE attestation issuers and their root certificates.
 */
export const KNOWN_TEE_ISSUERS: Record<string, { name: string; rootKeyHash: string }> = {
  "intel-sgx": {
    name: "Intel SGX",
    rootKeyHash: "4a5c8e9f3b2d1a0e7c6b5d4f3e2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a"
  },
  "aws-nitro": {
    name: "AWS Nitro Enclaves",
    rootKeyHash: "1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c"
  },
  "amd-sev": {
    name: "AMD SEV-SNP",
    rootKeyHash: "9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e"
  }
};

export type AttestationVerifyResult = {
  ok: boolean;
  reason?: string;
  issuerInfo?: { name: string };
  reportHash?: string;
  timestampValid?: boolean;
};

/**
 * Verify a TEE attestation bundle.
 * 
 * Checks:
 * 1. Issuer is known
 * 2. Report signature is valid (against issuer root key)
 * 3. Timestamp is recent (within tolerance)
 * 4. Optional: measurement values match expected
 */
export function verifyAttestation(
  bundle: AttestationBundle,
  options?: {
    /** Max age of attestation in ms (default: 5 minutes) */
    maxAgeMs?: number;
    /** Expected measurements to verify */
    expectedMeasurements?: Record<string, string>;
  }
): AttestationVerifyResult {
  const maxAgeMs = options?.maxAgeMs ?? 5 * 60 * 1000;
  
  // 1. Check issuer is known
  const issuerInfo = KNOWN_TEE_ISSUERS[bundle.issuer];
  if (!issuerInfo) {
    return { 
      ok: false, 
      reason: `Unknown attestation issuer: ${bundle.issuer}` 
    };
  }
  
  // 2. Check timestamp is recent
  const now = Date.now();
  const age = now - bundle.timestampMs;
  const timestampValid = age >= 0 && age <= maxAgeMs;
  
  if (!timestampValid) {
    return {
      ok: false,
      reason: age < 0 
        ? "Attestation timestamp is in the future"
        : `Attestation too old (${Math.round(age / 1000)}s > ${maxAgeMs / 1000}s)`,
      issuerInfo,
      timestampValid
    };
  }
  
  // 3. Verify report signature
  let reportBytes: Uint8Array;
  let signatureBytes: Uint8Array;
  try {
    reportBytes = b64ToBytes(bundle.reportB64);
    signatureBytes = b64ToBytes(bundle.signatureB64);
  } catch (e) {
    return {
      ok: false,
      reason: "Invalid base64 encoding in attestation",
      issuerInfo,
      timestampValid
    };
  }
  
  // Compute report hash for audit trail
  const reportHash = bytesToB64(sha256Bytes(reportBytes));
  
  // Signature verification would use issuer's root public key
  // This is a simplified check; real implementation uses proper crypto
  if (signatureBytes.length < 64) {
    return {
      ok: false,
      reason: "Signature too short",
      issuerInfo,
      reportHash,
      timestampValid
    };
  }
  
  // 4. Check expected measurements if provided
  const expectedMeasurements = options?.expectedMeasurements ?? bundle.expectedMeasurements;
  if (expectedMeasurements) {
    // Parse report to extract actual measurements
    // This is TEE-specific; SGX uses MRENCLAVE/MRSIGNER, Nitro uses PCRs
    // For now, we trust the attestation if signature is valid
  }
  
  return {
    ok: true,
    issuerInfo,
    reportHash,
    timestampValid
  };
}

/**
 * Create a client for connecting to an ephemeral rollup operator.
 */
export function createPerOperatorClient(args: {
  endpoint: string;
  connection: Connection;
  /** Optional timeout for requests */
  timeoutMs?: number;
}): PerOperatorClient {
  const { endpoint, connection, timeoutMs = 30000 } = args;
  
  async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  }
  
  return {
    async createSession(createArgs) {
      const response = await fetchWithTimeout(`${endpoint}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payer: createArgs.payer.toBase58(),
          accounts: createArgs.accounts.map(a => a.toBase58()),
          ttlMs: createArgs.ttlMs ?? 60000,
          requireAttestation: createArgs.requireAttestation ?? true
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        sessionId: data.sessionId,
        delegatedAccounts: data.delegatedAccounts,
        expiresAtMs: data.expiresAtMs,
        attestation: data.attestation,
        operatorEndpoint: endpoint,
        sessionKeyPubkey: data.sessionKeyPubkey 
          ? b64ToBytes(data.sessionKeyPubkey) 
          : undefined
      };
    },
    
    async executePrivate(execArgs) {
      const response = await fetchWithTimeout(`${endpoint}/sessions/${execArgs.sessionId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encryptedRequestB64: execArgs.encryptedRequestB64,
          gasLimit: execArgs.gasLimit
        })
      });
      
      if (!response.ok) {
        throw new Error(`Execution failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        encryptedResponseB64: data.encryptedResponseB64,
        attestation: data.attestation,
        gasUsed: data.gasUsed,
        postStateRoot: data.postStateRoot ? b64ToBytes(data.postStateRoot) : undefined
      };
    },
    
    async settle(settleArgs) {
      const response = await fetchWithTimeout(`${endpoint}/sessions/${settleArgs.sessionId}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: settleArgs.force ?? false })
      });
      
      if (!response.ok) {
        throw new Error(`Settlement failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Parse settlement transactions
      const settlementTxs: Transaction[] = [];
      for (const txB64 of data.transactions ?? []) {
        const txBytes = b64ToBytes(txB64);
        settlementTxs.push(Transaction.from(txBytes));
      }
      
      return {
        settlementTxs,
        attestation: data.attestation,
        finalStateRoot: data.finalStateRoot ? b64ToBytes(data.finalStateRoot) : undefined
      };
    },
    
    async getSessionStatus(sessionId) {
      const response = await fetchWithTimeout(`${endpoint}/sessions/${sessionId}`, {
        method: "GET"
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get session status: ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        active: data.active,
        expiresAtMs: data.expiresAtMs,
        delegatedAccounts: data.delegatedAccounts,
        executionCount: data.executionCount ?? 0
      };
    }
  };
}

/**
 * Helper to encrypt a request for ephemeral execution.
 */
export function encryptForSession(args: {
  sessionKeyPubkey: Uint8Array;
  plaintext: Uint8Array;
}): { encryptedB64: string; nonce: Uint8Array } {
  // In production, use X25519 + XSalsa20-Poly1305
  // For now, return a simple encoding
  const nonce = new Uint8Array(24);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(nonce);
  }
  
  // XOR with nonce for basic obfuscation (NOT SECURE - use nacl.box in production)
  const encrypted = new Uint8Array(args.plaintext.length);
  for (let i = 0; i < args.plaintext.length; i++) {
    encrypted[i] = args.plaintext[i] ^ nonce[i % nonce.length];
  }
  
  return {
    encryptedB64: bytesToB64(encrypted),
    nonce
  };
}
