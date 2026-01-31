import type { InboxRecord, InboxStore } from "./types";
import { SecureStorage } from "@styx/secure-storage";

function keyCursor(ownerB58: string): string {
  return `styx.inbox.${ownerB58}.cursor`;
}
function keyIndex(ownerB58: string): string {
  return `styx.inbox.${ownerB58}.index`;
}
function keyRecord(ownerB58: string, messageId: string): string {
  return `styx.inbox.${ownerB58}.msg.${messageId}`;
}
function keySig(ownerB58: string, signature: string): string {
  return `styx.inbox.${ownerB58}.sig.${signature}`;
}
function keyResend(ownerB58: string, resendKey: string): string {
  return `styx.inbox.${ownerB58}.rkey.${resendKey}`;
}

type IndexV1 = { v: 1; messageIds: string[] };

async function loadIndex(storage: SecureStorage, ownerB58: string): Promise<IndexV1> {
  const raw = await storage.getString(keyIndex(ownerB58));
  if (!raw) return { v: 1, messageIds: [] };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.v === 1 && Array.isArray(parsed.messageIds)) return parsed;
  } catch {}
  return { v: 1, messageIds: [] };
}

async function saveIndex(storage: SecureStorage, ownerB58: string, idx: IndexV1): Promise<void> {
  await storage.setString(keyIndex(ownerB58), JSON.stringify(idx));
}

export class SecureStorageInboxStore implements InboxStore {
  constructor(private readonly storage: SecureStorage) {}

  async getCursor(ownerB58: string): Promise<string | null> {
    return (await this.storage.getString(keyCursor(ownerB58))) ?? null;
  }

  async setCursor(ownerB58: string, signature: string): Promise<void> {
    await this.storage.setString(keyCursor(ownerB58), signature);
  }

  async putMessage(ownerB58: string, record: InboxRecord): Promise<void> {
    // persist record
    await this.storage.setString(keyRecord(ownerB58, record.messageId), JSON.stringify(record));

    // update index list
    const idx = await loadIndex(this.storage, ownerB58);
    if (!idx.messageIds.includes(record.messageId)) {
      idx.messageIds.push(record.messageId);
      // keep index bounded (local-first UX, not archival)
      if (idx.messageIds.length > 5000) idx.messageIds = idx.messageIds.slice(-5000);
      await saveIndex(this.storage, ownerB58, idx);
    }

    // secondary indexes
    if (record.signature) await this.indexSignature(ownerB58, record.signature, record.messageId);
    if (record.resendKey) await this.indexResendKey(ownerB58, record.resendKey, record.messageId);
  }

  async listMessages(ownerB58: string): Promise<InboxRecord[]> {
    const idx = await loadIndex(this.storage, ownerB58);
    const out: InboxRecord[] = [];
    for (const id of idx.messageIds) {
      const raw = await this.storage.getString(keyRecord(ownerB58, id));
      if (!raw) continue;
      try {
        out.push(JSON.parse(raw));
      } catch {}
    }
    return out;
  }

  async hasMessage(ownerB58: string, messageId: string): Promise<boolean> {
    const raw = await this.storage.getString(keyRecord(ownerB58, messageId));
    return !!raw;
  }

  async hasSignature(ownerB58: string, signature: string): Promise<boolean> {
    const raw = await this.storage.getString(keySig(ownerB58, signature));
    return !!raw;
  }

  async indexSignature(ownerB58: string, signature: string, messageId: string): Promise<void> {
    if (!signature) return;
    await this.storage.setString(keySig(ownerB58, signature), messageId);
  }

  async hasResendKey(ownerB58: string, resendKey: string): Promise<boolean> {
    const raw = await this.storage.getString(keyResend(ownerB58, resendKey));
    return !!raw;
  }

  async getByResendKey(ownerB58: string, resendKey: string): Promise<InboxRecord | null> {
    const id = await this.storage.getString(keyResend(ownerB58, resendKey));
    if (!id) return null;
    return await this.getMessage(ownerB58, id);
  }

  async indexResendKey(ownerB58: string, resendKey: string, messageId: string): Promise<void> {
    if (!resendKey) return;
    await this.storage.setString(keyResend(ownerB58, resendKey), messageId);
  }

  async getMessage(ownerB58: string, messageId: string): Promise<InboxRecord | null> {
    const raw = await this.storage.getString(keyRecord(ownerB58, messageId));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async updateMessage(ownerB58: string, messageId: string, patch: Partial<InboxRecord>): Promise<InboxRecord | null> {
    const cur = await this.getMessage(ownerB58, messageId);
    if (!cur) return null;
    const next = { ...cur, ...patch };
    await this.storage.setString(keyRecord(ownerB58, messageId), JSON.stringify(next));
    // keep resend index up to date if resendKey changed/added
    if (next.resendKey) await this.indexResendKey(ownerB58, next.resendKey, next.messageId);
    return next;
  }

  async markRead(ownerB58: string, messageId: string, readAt?: number): Promise<InboxRecord | null> {
    return this.updateMessage(ownerB58, messageId, { readAt: readAt ?? Date.now() });
  }

  async listMessagesPage(ownerB58: string, opts?: { limit?: number; beforeReceivedAt?: number }): Promise<InboxRecord[]> {
    const all = (await this.listMessages(ownerB58)).sort((a, b) => b.receivedAt - a.receivedAt);
    const filtered =
      typeof opts?.beforeReceivedAt === "number"
        ? all.filter(r => r.receivedAt < opts.beforeReceivedAt!)
        : all;
    return filtered.slice(0, Math.max(0, opts?.limit ?? 50));
  }

  async clearOwner(ownerB58: string): Promise<void> {
    await this.storage.remove(keyCursor(ownerB58));
    const idx = await loadIndex(this.storage, ownerB58);
    for (const id of idx.messageIds) {
      await this.storage.remove(keyRecord(ownerB58, id));
    }
    await this.storage.remove(keyIndex(ownerB58));
    // best-effort: signature/resend indexes are not enumerated here (would require another index).
  }
}
