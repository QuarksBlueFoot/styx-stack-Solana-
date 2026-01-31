import { OutboxRecord, OutboxStatus, OutboxStore, OutboxMeta } from "./types";

function now(): number { return Date.now(); }
function uuid(): string {
  // Deterministic-enough for local outbox IDs; not used for crypto.
  return "obx_" + Math.random().toString(16).slice(2) + "_" + now().toString(16);
}

export class MemoryOutboxStore implements OutboxStore {
  private records = new Map<string, OutboxRecord>();

  async enqueue(payloadB64: string, meta?: OutboxMeta): Promise<OutboxRecord> {
    const t = now();
    const rec: OutboxRecord = { id: uuid(), createdAt: t, updatedAt: t, status: "pending", payloadB64, meta };
    this.records.set(rec.id, rec);
    return rec;
  }

  async list(status?: OutboxStatus): Promise<OutboxRecord[]> {
    const all = Array.from(this.records.values());
    const filtered = status ? all.filter(r => r.status === status) : all;
    return filtered.sort((a,b) => b.createdAt - a.createdAt);
  }

  async get(id: string): Promise<OutboxRecord | null> {
    return this.records.get(id) ?? null;
  }

  async update(id: string, patch: Partial<Pick<OutboxRecord, "status" | "payloadB64" | "meta">>): Promise<OutboxRecord | null> {
    const rec = this.records.get(id);
    if (!rec) return null;
    const next: OutboxRecord = {
      ...rec,
      ...patch,
      meta: patch.meta ? { ...(rec.meta ?? {}), ...patch.meta } : rec.meta,
      updatedAt: now()
    };
    this.records.set(id, next);
    return next;
  }

  async remove(id: string): Promise<void> {
    this.records.delete(id);
  }

  async clear(): Promise<void> {
    this.records.clear();
  }
}
