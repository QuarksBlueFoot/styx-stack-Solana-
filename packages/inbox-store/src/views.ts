import type { InboxRecord } from "./types";

/**
 * Convenience view helpers for building mobile inbox UIs.
 * Pure functions only: no crypto, no networking, no storage assumptions.
 */

export type Thread<T = InboxRecord> = {
  threadKey: string;
  latest: T;
  messages: T[];
  unreadCount: number;
};

export function sortNewestFirst<T extends { receivedAt: number }>(records: T[]): T[] {
  return [...records].sort((a, b) => b.receivedAt - a.receivedAt);
}

export function computeUnreadCount(records: Array<{ readAt?: number }>): number {
  return records.reduce((n, r) => n + (typeof r.readAt === "number" ? 0 : 1), 0);
}

export function filterUnread<T extends { readAt?: number }>(records: T[]): T[] {
  return records.filter(r => typeof r.readAt !== "number");
}

/**
 * Collapse resend/retry duplicates into a single latest entry.
 * If resendKey is missing, the record is treated as unique.
 *
 * Rule:
 * - If a record has supersededBy set, it is considered not-displayable.
 * - Otherwise, if multiple records share the same resendKey, keep the newest receivedAt.
 */
export function collapseByResendKey(records: InboxRecord[]): InboxRecord[] {
  const visible = records.filter(r => !r.supersededBy);
  const byKey = new Map<string, InboxRecord>();
  const out: InboxRecord[] = [];

  for (const r of sortNewestFirst(visible)) {
    const k = r.resendKey ? `rk:${r.resendKey}` : `id:${r.messageId}`;
    const existing = byKey.get(k);
    if (!existing) {
      byKey.set(k, r);
      out.push(r);
    }
  }
  return out;
}

/**
 * Group messages into threads.
 * If threadKey is missing on a record, it will fall back to a caller-provided deriveThreadKey,
 * else it will group under "unthreaded".
 */
export function groupIntoThreads(
  records: InboxRecord[],
  deriveThreadKey?: (r: InboxRecord) => string | null | undefined
): Thread[] {
  const sorted = sortNewestFirst(records);
  const map = new Map<string, InboxRecord[]>();

  for (const r of sorted) {
    const key = r.threadKey ?? deriveThreadKey?.(r) ?? "unthreaded";
    const arr = map.get(key) ?? [];
    arr.push(r);
    map.set(key, arr);
  }

  const threads: Thread[] = [];
  for (const [threadKey, msgs] of map.entries()) {
    const messages = sortNewestFirst(msgs);
    threads.push({
      threadKey,
      latest: messages[0],
      messages,
      unreadCount: computeUnreadCount(messages),
    });
  }

  return threads.sort((a, b) => b.latest.receivedAt - a.latest.receivedAt);
}

export function paginateByReceivedAt(
  records: InboxRecord[],
  opts?: { limit?: number; beforeReceivedAt?: number }
): InboxRecord[] {
  const sorted = sortNewestFirst(records);
  const filtered =
    typeof opts?.beforeReceivedAt === "number"
      ? sorted.filter(r => r.receivedAt < opts.beforeReceivedAt!)
      : sorted;
  return filtered.slice(0, Math.max(0, opts?.limit ?? 50));
}
