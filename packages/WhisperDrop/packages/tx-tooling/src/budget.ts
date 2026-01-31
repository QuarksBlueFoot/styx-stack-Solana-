import { ComputeBudgetProgram, Transaction } from "@solana/web3.js";

/**
 * Compute / fee priority helpers.
 *
 * These are not "privacy" primitives, but they are critical for a mobile-first
 * privacy kit because encrypted memo rails tend to be used during congested periods
 * (and mobile UX hates retries).
 */

export type ComputeBudgetHints = {
  /** Requested compute units (e.g. 200_000). */
  units?: number;
  /** Requested micro-lamports per CU for priority fees. */
  microLamports?: number;
};

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, (n | 0)));
}

/**
 * Prepend compute budget instructions (idempotent-ish).
 *
 * NOTE: This does not guarantee inclusion; it just expresses intent via the
 * Compute Budget Program.
 */
export function addComputeBudgetIxs(tx: Transaction, hints: ComputeBudgetHints): void {
  const ixs = [];

  if (typeof hints.units === "number") {
    // Common safe range. Too high can fail on some clusters.
    const units = clampInt(hints.units, 10_000, 1_400_000);
    ixs.push(ComputeBudgetProgram.setComputeUnitLimit({ units }));
  }

  if (typeof hints.microLamports === "number") {
    const microLamports = clampInt(hints.microLamports, 0, 5_000_000);
    ixs.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports }));
  }

  if (ixs.length === 0) return;

  // Place them at the front.
  tx.instructions = [...ixs, ...tx.instructions];
}

/**
 * Estimate the size of the transaction message in bytes.
 *
 * This is a pragmatic guardrail to keep devs from unknowingly blowing up size
 * with padding/decoys.
 */
export function estimateTxMessageSize(tx: Transaction): number {
  try {
    // serializeMessage() requires recentBlockhash; use a dummy if missing.
    if (!tx.recentBlockhash) {
      // 32-byte base58-ish string; doesn't need to be valid for sizing.
      tx.recentBlockhash = "11111111111111111111111111111111";
    }
    const msg = tx.serializeMessage();
    return msg.length;
  } catch {
    return 0;
  }
}
