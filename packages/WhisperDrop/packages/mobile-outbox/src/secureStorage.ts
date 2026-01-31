import { SecureStorage } from "@styx/secure-storage";
import { OutboxRecord, OutboxStore, OutboxStatus, OutboxMeta } from "./types";

function now(): number { return Date.now(); }
function uuid(): string {
  return "obx_" + Math.random().toString(16).slice(2) + "_" + now().toString(16);
}

const INDEX_KEY = "styx.outbox.index.v1";

function itemKey(id: string): string {
  return `styx.outbox.item.v1.${id}`;
}

async function readIndex(storage: SecureStorage): Promise<string[]> {
  const raw = await storage.getString(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(x => typeof x === "string") : [];
  } catch {
    return [];
  }
}

async function writeIndex(storage: SecureStorage, ids: string[]): Promise<void> {
  await storage.setString(INDEX_KEY, JSON.stringify(ids));
}

export class SecureStorageOutboxStore implements OutboxStore {
  constructor(private readonly storage: SecureStorage) {}

  async enqueue(payloadB64: string, meta?: OutboxMeta): Promise<OutboxRecord> {
    const t = now();
    const rec: OutboxRecord = { id: uuid(), createdAt: t, updatedAt: t, status: "pending", payloadB64, meta };
    const ids = await readIndex(this.storage);
    ids.unshift(rec.id);
    await writeIndex(this.storage, ids);
    await this.storage.setString(itemKey(rec.id), JSON.stringify(rec));
    return rec;
  }

  async list(status?: OutboxStatus): Promise<OutboxRecord[]> {
    const ids = await readIndex(this.storage);
    const out: OutboxRecord[] = [];
    for (const id of ids) {
      const raw = await this.storage.getString(itemKey(id));
      if (!raw) continue;
      try {
        const rec = JSON.parse(raw) as OutboxRecord;
        if (!status || rec.status === status) out.push(rec);
      } catch {
        // ignore corrupt record
      }
    }
    return out.sort((a,b) => b.createdAt - a.createdAt);
  }

  async get(id: string): Promise<OutboxRecord | null> {
    const raw = await this.storage.getString(itemKey(id));
    if (!raw) return null;
    try { return JSON.parse(raw) as OutboxRecord; } catch { return null; }
  }

  async update(id: string, patch: Partial<Pick<OutboxRecord, "status" | "payloadB64" | "meta">>): Promise<OutboxRecord | null> {
    const cur = await this.get(id);
    if (!cur) return null;
    const next: OutboxRecord = {
      ...cur,
      ...patch,
      meta: patch.meta ? { ...(cur.meta ?? {}), ...patch.meta } : cur.meta,
      updatedAt: now()
    };
    await this.storage.setString(itemKey(id), JSON.stringify(next));
    return next;
  }

  async remove(id: string): Promise<void> {
    const ids = await readIndex(this.storage);
    const next = ids.filter(x => x !== id);
    await writeIndex(this.storage, next);
    await this.storage.remove(itemKey(id));
  }

  async clear(): Promise<void> {
    const ids = await readIndex(this.storage);
    for (const id of ids) {
      await this.storage.remove(itemKey(id));
    }
    await this.storage.remove(INDEX_KEY);
  }
}
