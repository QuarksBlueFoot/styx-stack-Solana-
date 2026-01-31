import { BackoffStrategy, exponentialBackoff } from "./backoff";

export type RetryDecision = "retry" | "abort";

export function isTransientError(err: unknown): boolean {
  const msg = typeof err === "object" && err && "message" in err ? String((err as any).message) : String(err);
  // keep this conservative and mobile-friendly: RPC flakiness, fetch/network, timeouts
  return /(429|rate|timeout|timed out|network|fetch failed|ECONNRESET|EAI_AGAIN|503|502)/i.test(msg);
}

export type RetryPolicy = {
    maxAttempts?: number;
    backoff?: BackoffStrategy;
    shouldRetry?: (err: unknown, attempt: number) => RetryDecision;
    onRetry?: (info: { attempt: number; delayMs: number; err: unknown }) => void;
};

/**
 * Generic retry helper designed for mobile networks (flaky + background).
 * - Does NOT swallow errors; throws last error.
 */
export async function withRetries<T>(
  fn: (attempt: number) => Promise<T>,
  opts?: RetryPolicy
): Promise<T> {
  const maxAttempts = opts?.maxAttempts ?? 4;
  const backoff = opts?.backoff ?? exponentialBackoff({ baseMs: 250, maxMs: 8000, jitter: "full" });

  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;

      const decision = opts?.shouldRetry
        ? opts.shouldRetry(err, attempt)
        : (isTransientError(err) ? "retry" : "abort");

      if (decision === "abort" || attempt === maxAttempts - 1) break;

      const delayMs = backoff(attempt);
      opts?.onRetry?.({ attempt, delayMs, err });

      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}
