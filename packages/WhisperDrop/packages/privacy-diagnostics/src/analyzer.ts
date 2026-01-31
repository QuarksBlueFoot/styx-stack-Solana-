import { Transaction, VersionedTransaction, PublicKey } from "@solana/web3.js";

/**
 * Privacy leak types that can be detected in transactions.
 */
export type PrivacyLeakType =
  | "recipient-visible"      // Recipient address is public
  | "sender-visible"         // Sender address is public  
  | "amount-visible"         // Transfer amount is public
  | "timing-correlatable"    // Timing can be used to correlate
  | "size-correlatable"      // Transaction size reveals info
  | "memo-plaintext"         // Memo contains unencrypted data
  | "account-linkable"       // Accounts can be linked
  | "fee-payer-visible"      // Fee payer reveals identity
  | "program-identifiable"   // Program being called is visible
  | "input-count-visible"    // Number of inputs visible
  | "output-count-visible";  // Number of outputs visible

export type PrivacyLevel = "none" | "low" | "medium" | "high" | "maximum";

export type PrivacyRecommendation = {
  issue: PrivacyLeakType;
  severity: "info" | "warning" | "critical";
  recommendation: string;
  canFix: boolean;
};

export type TransactionPrivacyReport = {
  /** Overall privacy level */
  level: PrivacyLevel;
  /** Numeric score (0-100) */
  score: number;
  /** Detected privacy leaks */
  leaks: PrivacyLeakType[];
  /** Recommendations for improvement */
  recommendations: PrivacyRecommendation[];
  /** Programs involved in the transaction */
  programsInvolved: string[];
  /** Whether the transaction uses encryption */
  hasEncryption: boolean;
  /** Whether stealth addressing is used */
  usesStealth: boolean;
  /** Whether confidential transfers are used */
  usesConfidentialTransfer: boolean;
};

// Known privacy-preserving programs
const PRIVACY_PROGRAMS = new Set([
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr", // SPL Memo
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", // Token-2022
  // Private Memo Program - varies by deployment
]);

const CT_EXTENSION_DISCRIMINATOR = 0x0a; // Confidential transfer extension

/**
 * Analyze a transaction for privacy characteristics.
 */
export function analyzeTransactionPrivacy(
  tx: Transaction | VersionedTransaction,
  options?: {
    /** Known private programs to check for */
    additionalPrivacyPrograms?: string[];
    /** Expected recipient (to check if hidden) */
    expectedRecipient?: PublicKey;
  }
): TransactionPrivacyReport {
  const leaks: PrivacyLeakType[] = [];
  const recommendations: PrivacyRecommendation[] = [];
  const programsInvolved: string[] = [];
  
  let hasEncryption = false;
  let usesStealth = false;
  let usesConfidentialTransfer = false;
  
  // Extract instructions
  const instructions = "instructions" in tx 
    ? tx.instructions 
    : tx.message.compiledInstructions.map(ci => ({
        programId: tx.message.staticAccountKeys[ci.programIdIndex],
        keys: ci.accountKeyIndexes.map(i => ({ pubkey: tx.message.staticAccountKeys[i] })),
        data: Buffer.from(ci.data)
      }));
  
  // Analyze each instruction
  for (const ix of instructions) {
    const programId = "programId" in ix 
      ? ix.programId.toBase58() 
      : (ix as any).programId?.toBase58?.() ?? "";
    
    if (programId && !programsInvolved.includes(programId)) {
      programsInvolved.push(programId);
    }
    
    // Check for encrypted memo (styx1: prefix)
    if (programId === "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr") {
      const data = "data" in ix ? ix.data : Buffer.alloc(0);
      const memoText = data.toString("utf8");
      
      if (memoText.startsWith("styx1:")) {
        hasEncryption = true;
      } else if (memoText.length > 0 && !memoText.startsWith("styx1:")) {
        leaks.push("memo-plaintext");
        recommendations.push({
          issue: "memo-plaintext",
          severity: "critical",
          recommendation: "Use Styx encrypted memo format (styx1:...) instead of plaintext",
          canFix: true
        });
      }
    }
    
    // Check for Token-2022 confidential transfer
    if (programId === "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb") {
      const data = "data" in ix ? ix.data : Buffer.alloc(0);
      // CT instructions have specific discriminators
      if (data.length > 0 && data[0] === 27) { // ConfidentialTransfer instruction
        usesConfidentialTransfer = true;
        hasEncryption = true;
      }
    }
  }
  
  // Check for visible fee payer (always visible in Solana)
  leaks.push("fee-payer-visible");
  recommendations.push({
    issue: "fee-payer-visible",
    severity: "info",
    recommendation: "Consider using a relay or fee sponsor to hide fee payer identity",
    canFix: true
  });
  
  // Program identifiability is always a leak
  if (programsInvolved.length > 0) {
    leaks.push("program-identifiable");
    recommendations.push({
      issue: "program-identifiable",
      severity: "info",
      recommendation: "Program calls are visible on-chain; this is inherent to Solana",
      canFix: false
    });
  }
  
  // If no encryption detected, mark common leaks
  if (!hasEncryption && !usesConfidentialTransfer) {
    leaks.push("amount-visible");
    recommendations.push({
      issue: "amount-visible",
      severity: "warning",
      recommendation: "Use Token-2022 Confidential Transfers or encrypted payloads",
      canFix: true
    });
  }
  
  // Calculate privacy score
  let score = 100;
  for (const leak of leaks) {
    switch (leak) {
      case "amount-visible":
        score -= 25;
        break;
      case "memo-plaintext":
        score -= 30;
        break;
      case "fee-payer-visible":
        score -= 10;
        break;
      case "program-identifiable":
        score -= 5;
        break;
      case "recipient-visible":
        score -= 15;
        break;
      case "sender-visible":
        score -= 15;
        break;
      default:
        score -= 5;
    }
  }
  score = Math.max(0, score);
  
  // Determine privacy level
  let level: PrivacyLevel;
  if (score >= 90) level = "maximum";
  else if (score >= 70) level = "high";
  else if (score >= 50) level = "medium";
  else if (score >= 25) level = "low";
  else level = "none";
  
  return {
    level,
    score,
    leaks,
    recommendations,
    programsInvolved,
    hasEncryption,
    usesStealth,
    usesConfidentialTransfer
  };
}

/**
 * Check if a memo string contains encrypted content.
 */
export function isEncryptedMemo(memo: string): boolean {
  return memo.startsWith("styx1:");
}

/**
 * Estimate the privacy cost of various transaction patterns.
 */
export type PrivacyCostEstimate = {
  /** Whether this pattern is recommended */
  recommended: boolean;
  /** Privacy score impact (negative = reduces privacy) */
  privacyImpact: number;
  /** Gas cost estimate */
  estimatedCu: number;
  /** Notes about this pattern */
  notes: string[];
};

export function estimatePrivacyCost(pattern: {
  useMemo: boolean;
  useEncryptedMemo: boolean;
  useConfidentialTransfer: boolean;
  useStealth: boolean;
  useDecoys: boolean;
  usePadding: boolean;
}): PrivacyCostEstimate {
  let privacyImpact = 0;
  let estimatedCu = 0;
  const notes: string[] = [];
  
  if (pattern.useMemo) {
    estimatedCu += 5000;
    if (pattern.useEncryptedMemo) {
      privacyImpact += 20;
      notes.push("Encrypted memo hides message content");
    } else {
      privacyImpact -= 30;
      notes.push("Plaintext memo exposes message content");
    }
  }
  
  if (pattern.useConfidentialTransfer) {
    privacyImpact += 35;
    estimatedCu += 200000; // CT is expensive
    notes.push("Confidential transfer hides amounts");
  }
  
  if (pattern.useStealth) {
    privacyImpact += 25;
    estimatedCu += 10000;
    notes.push("Stealth addresses hide recipient");
  }
  
  if (pattern.useDecoys) {
    privacyImpact += 15;
    estimatedCu += 50000;
    notes.push("Decoy outputs confuse analysis");
  }
  
  if (pattern.usePadding) {
    privacyImpact += 10;
    estimatedCu += 5000;
    notes.push("Padding normalizes transaction size");
  }
  
  const recommended = privacyImpact > 0;
  
  return {
    recommended,
    privacyImpact,
    estimatedCu,
    notes
  };
}

/**
 * Generate a privacy report summary for display.
 */
export function formatPrivacyReport(report: TransactionPrivacyReport): string {
  const lines: string[] = [
    `Privacy Level: ${report.level.toUpperCase()} (${report.score}/100)`,
    "",
    "Features:",
    `  • Encryption: ${report.hasEncryption ? "✓" : "✗"}`,
    `  • Stealth: ${report.usesStealth ? "✓" : "✗"}`,
    `  • Confidential Transfer: ${report.usesConfidentialTransfer ? "✓" : "✗"}`,
    "",
  ];
  
  if (report.leaks.length > 0) {
    lines.push("Detected Leaks:");
    for (const leak of report.leaks) {
      lines.push(`  ⚠ ${leak}`);
    }
    lines.push("");
  }
  
  if (report.recommendations.length > 0) {
    lines.push("Recommendations:");
    for (const rec of report.recommendations) {
      const icon = rec.severity === "critical" ? "🔴" : rec.severity === "warning" ? "🟡" : "🔵";
      lines.push(`  ${icon} ${rec.recommendation}`);
    }
  }
  
  return lines.join("\n");
}
