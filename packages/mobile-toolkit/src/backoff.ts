export type BackoffStrategy = (attempt: number) => number;

/**
 * Exponential backoff with optional jitter.
 * - attempt starts at 0
 * - returns delay in milliseconds
 */
export function exponentialBackoff(opts?: {
  baseMs?: number;
  maxMs?: number;
  factor?: number;
  jitter?: "none" | "full";
}): BackoffStrategy {
  const baseMs = opts?.baseMs ?? 250;
  const maxMs = opts?.maxMs ?? 10_000;
  const factor = opts?.factor ?? 2;
  const jitter = opts?.jitter ?? "full";

  return (attempt: number) => {
    const exp = Math.min(maxMs, Math.floor(baseMs * Math.pow(factor, Math.max(0, attempt))));
    if (jitter === "none") return exp;
    // full jitter: random in [0, exp]
    return Math.floor(Math.random() * exp);
  };
}

export function clampMs(ms: number, minMs: number, maxMs: number): number {
  return Math.max(minMs, Math.min(maxMs, ms));
}
