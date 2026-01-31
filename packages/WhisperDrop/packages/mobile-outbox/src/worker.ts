import { OutboxRecord, OutboxStore } from "./types";
import { withRetries } from "@styx/mobile-toolkit";
import { b64ToBytes } from "./base64";

export interface DrainResult {
  attempted: number;
  sent: number;
  confirmed: number;
  failed: number;
  skippedOffline: number;
}

export interface OutboxDrainOptions {
  /** How many pending items to process per run. Default: 25 */
  limit?: number;
  /** Concurrency for sending. Default: 1 (mobile-safe) */
  concurrency?: number;
  /** Max attempts per item. Default: 4 */
  maxAttempts?: number;
  /** Optional connectivity check. If provided and returns false, drain skips. */
  isOnline?: () => Promise<boolean> | boolean;
  /** Called when an item is retried. */
  onRetry?: (info: { id: string; attempt: number; delayMs: number; err: unknown }) => void;
}

/**
 * Drain pending outbox items using a caller-provided send function.
 * This is tooling-only: you bring the wallet/session + RPC connection.
 */
export async function drainOutbox(
  store: OutboxStore,
  sendFn: (payloadBytes: Uint8Array, record: OutboxRecord) => Promise<{ signature?: string; confirmedAt?: number; confirmedSlot?: number }>,
  opts?: OutboxDrainOptions
): Promise<DrainResult> {
  const limit = opts?.limit ?? 25;
  const concurrency = Math.max(1, opts?.concurrency ?? 1);

  const online = opts?.isOnline ? await opts.isOnline() : true;
  if (!online) {
    return { attempted: 0, sent: 0, confirmed: 0, failed: 0, skippedOffline: 1 };
  }

  const pending = (await store.list("pending")).slice(0, limit);

  let idx = 0;
  let sent = 0;
  let confirmed = 0;
  let failed = 0;

  async function workerLoop() {
    for (;;) {
      const my = idx++;
      const rec = pending[my];
      if (!rec) return;

      const payloadBytes = b64ToBytes(rec.payloadB64);

      try {
        const maxAttempts = opts?.maxAttempts ?? 4;
        const res = await withRetries(
          async () => sendFn(payloadBytes, rec),
          {
            maxAttempts,
            onRetry: ({ attempt, delayMs, err }) => opts?.onRetry?.({ id: rec.id, attempt, delayMs, err })
          }
        );

        const patchMeta = {
          ...(rec.meta ?? {}),
          signature: res.signature ?? rec.meta?.signature,
          confirmedAt: res.confirmedAt ?? rec.meta?.confirmedAt,
          confirmedSlot: res.confirmedSlot ?? rec.meta?.confirmedSlot,
          lastError: undefined
        };

        await store.update(rec.id, { status: "sent", meta: patchMeta });

        sent += 1;
        if (res.confirmedAt) confirmed += 1;
      } catch (err) {
        const patchMeta = { ...(rec.meta ?? {}), lastError: String((err as any)?.message ?? err) };
        await store.update(rec.id, { status: "failed", meta: patchMeta });
        failed += 1;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => workerLoop());
  await Promise.all(workers);

  return {
    attempted: pending.length,
    sent,
    confirmed,
    failed,
    skippedOffline: 0
  };
}
