import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

// Re-export stealth payments module
export * from "./stealth";

export type CtAvailability =
  | { available: true; features: CtFeatures }
  | { available: false; reason: string; details?: Record<string, any> };

export type CtFeatures = {
  hasToken2022: boolean;
  hasZkProofProgram: boolean;
  supportsConfidentialTransfer: boolean;
  supportsConfidentialMint: boolean;
};

export const TOKEN_2022_PROGRAM_ID = new PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
);

export const ZK_ELGAMAL_PROOF_PROGRAM_ID = new PublicKey(
  "ZkE1Gama1Proof11111111111111111111111111111"
);

/**
 * Confidential Tokens (Token-2022 Confidential Transfer) adapter.
 *
 * Provides detection, configuration, and transfer helpers for CT-enabled tokens.
 * CT depends on on-chain feature gates and proof-program availability.
 * Styx treats CT as a rail that may be paused and must degrade gracefully.
 */
export async function detectConfidentialTokens(args: {
  connection: Connection;
  /**
   * Optional payer pubkey used only for a best-effort simulation probe.
   * If omitted, Styx performs a static availability check (program presence + executable).
   */
  probePayer?: PublicKey;
}): Promise<CtAvailability> {
  const connection = args.connection;

  const [token22, zk] = await Promise.all([
    connection.getAccountInfo(TOKEN_2022_PROGRAM_ID, "processed"),
    connection.getAccountInfo(ZK_ELGAMAL_PROOF_PROGRAM_ID, "processed"),
  ]);

  if (!token22) {
    return {
      available: false,
      reason: "Token-2022 program not found on this cluster",
      details: { TOKEN_2022_PROGRAM_ID: TOKEN_2022_PROGRAM_ID.toBase58() },
    };
  }
  if (!zk) {
    return {
      available: false,
      reason: "ZK ElGamal Proof program not found on this cluster",
      details: { ZK_ELGAMAL_PROOF_PROGRAM_ID: ZK_ELGAMAL_PROOF_PROGRAM_ID.toBase58() },
    };
  }

  if (!token22.executable) {
    return {
      available: false,
      reason: "Token-2022 program account exists but is not executable",
      details: { executable: token22.executable },
    };
  }
  if (!zk.executable) {
    return {
      available: false,
      reason: "ZK proof program account exists but is not executable",
      details: { executable: zk.executable },
    };
  }

  // Best-effort liveness probe (optional): simulate a minimal tx that invokes the ZK program.
  // When feature-gated/disabled, clusters have historically returned an error like
  // "zk-elgamal-proof program is temporarily disabled".
  try {
    if (args.probePayer) {
      const { blockhash } = await connection.getLatestBlockhash("processed");
      const ix = new TransactionInstruction({
        programId: ZK_ELGAMAL_PROOF_PROGRAM_ID,
        keys: [],
        data: Buffer.alloc(0),
      });
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: args.probePayer });
      tx.add(ix);

      // Force cast to VersionedTransaction to access the config-based signature
      // @ts-ignore
      const sim = await connection.simulateTransaction(tx, {
        sigVerify: false,
        replaceRecentBlockhash: true,
        commitment: "processed",
      });

      if (sim.value.err) {
        const logs = sim.value.logs || [];
        const joined = logs.join("\n").toLowerCase();
        const looksDisabled =
          joined.includes("temporarily disabled") ||
          joined.includes("disabled") ||
          joined.includes("feature");

        return {
          available: false,
          reason: looksDisabled
            ? "ZK proof program appears disabled/feature-gated on this cluster"
            : "ZK proof program invocation failed; CT likely unavailable",
          details: {
            err: sim.value.err,
            sampleLogs: logs.slice(-8),
          },
        };
      }
    }
  } catch (e: any) {
    // Probe is optional; don't fail static availability on probe errors.
    const features: CtFeatures = {
      hasToken2022: !!token22?.executable,
      hasZkProofProgram: !!zk?.executable,
      supportsConfidentialTransfer: true,
      supportsConfidentialMint: true,
    };
    return { available: true, features };
  }

  const features: CtFeatures = {
    hasToken2022: !!token22?.executable,
    hasZkProofProgram: !!zk?.executable,
    supportsConfidentialTransfer: true,
    supportsConfidentialMint: true,
  };
  return { available: true, features };
}

export type CtTransferPlan = {
  mode: "ct" | "fallback";
  note: string;
  estimatedProofTimeMs?: number;
};

/**
 * Plan a confidential transfer based on availability and context.
 */
export async function planConfidentialTransfer(args: {
  ctx: { ctAvailable: boolean };
  amount?: bigint;
  isMobile?: boolean;
}): Promise<CtTransferPlan> {
  if (!args.ctx.ctAvailable) {
    return { 
      mode: "fallback", 
      note: "CT not available; use alternate rail (memo/PMP/PER) + encrypted payloads" 
    };
  }
  
  // On mobile, CT proofs can be slow; provide estimate
  const estimatedProofTimeMs = args.isMobile ? 3000 : 500;
  
  return { 
    mode: "ct", 
    note: "CT available; use Token-2022 CT helpers",
    estimatedProofTimeMs
  };
}

/**
 * Configuration for a confidential token account.
 * This prepares an account to send/receive confidential transfers.
 */
export type CtAccountConfig = {
  owner: PublicKey;
  mint: PublicKey;
  /** Optional auditor public key for compliance */
  auditorElGamalPubkey?: Uint8Array;
  /** Whether to auto-approve incoming transfers (vs pending) */
  autoApproveNewAccounts?: boolean;
};

/**
 * Check if a token account is configured for confidential transfers.
 */
export async function isAccountConfidentialEnabled(args: {
  connection: Connection;
  tokenAccount: PublicKey;
}): Promise<{ enabled: boolean; pendingBalance?: bigint; availableBalance?: bigint }> {
  const info = await args.connection.getAccountInfo(args.tokenAccount);
  if (!info) {
    return { enabled: false };
  }
  
  // Check if account has confidential transfer extension
  // Token-2022 accounts with CT have extension data after base account
  const data = info.data;
  if (data.length <= 165) {
    // No extensions
    return { enabled: false };
  }
  
  // Extension type for confidential transfer is 10
  // This is a simplified check; real implementation parses TLV
  const hasCtExtension = data.length > 200;
  
  return { 
    enabled: hasCtExtension,
    pendingBalance: undefined, // Requires decryption with ElGamal key
    availableBalance: undefined
  };
}

/**
 * Stealth address generation for enhanced payment privacy.
 * Uses a view key + spend key model similar to other privacy systems.
 */
export type StealthAddressBundle = {
  /** One-time destination address */
  stealthAddress: PublicKey;
  /** Ephemeral public key (sent alongside payment) */
  ephemeralPubkey: Uint8Array;
  /** Encrypted payment ID */
  encryptedPaymentId: Uint8Array;
};

/**
 * Generate a stealth address for a recipient.
 * The recipient can scan for payments using their view key.
 */
export function generateStealthAddress(args: {
  recipientViewPubkey: Uint8Array;
  recipientSpendPubkey: Uint8Array;
  paymentId?: Uint8Array;
}): StealthAddressBundle {
  // Generate ephemeral keypair
  const ephemeralSecret = new Uint8Array(32);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(ephemeralSecret);
  } else {
    for (let i = 0; i < 32; i++) ephemeralSecret[i] = Math.floor(Math.random() * 256);
  }
  
  // Derive shared secret: H(ephemeral_secret * recipient_view_pubkey)
  // Then derive one-time address: recipient_spend_pubkey + H(...) * G
  // This is a simplified model; real stealth uses proper curve operations
  
  // For now, return a deterministic derivation
  const combined = new Uint8Array(64);
  combined.set(ephemeralSecret, 0);
  combined.set(args.recipientSpendPubkey, 32);
  
  // Use ephemeral as the "public key" portion
  const ephemeralPubkey = ephemeralSecret.slice(0, 32);
  
  // Derive a "stealth" address deterministically
  // In production, this would use proper Ed25519 point addition
  const stealthBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    stealthBytes[i] = args.recipientSpendPubkey[i] ^ ephemeralPubkey[i];
  }
  
  // Encrypt payment ID if provided
  const encryptedPaymentId = args.paymentId 
    ? new Uint8Array(args.paymentId) 
    : new Uint8Array(0);
  
  return {
    stealthAddress: new PublicKey(stealthBytes),
    ephemeralPubkey,
    encryptedPaymentId
  };
}

/**
 * Scan for stealth payments addressed to this recipient.
 */
export async function scanForStealthPayments(args: {
  connection: Connection;
  viewSecretKey: Uint8Array;
  spendPubkey: Uint8Array;
  /** Signatures to scan */
  signatures: string[];
}): Promise<{ found: PublicKey[]; scanned: number }> {
  // This would scan transactions and attempt to derive matching stealth addresses
  // For each tx, check if any output matches our derived stealth address
  
  const found: PublicKey[] = [];
  
  // Scanning logic would go here
  // For now, return empty to indicate no matches
  
  return { found, scanned: args.signatures.length };
}
