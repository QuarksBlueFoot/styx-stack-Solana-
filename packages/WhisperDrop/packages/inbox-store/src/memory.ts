import type { InboxRecord, InboxStore } from "./types";

export class MemoryInboxStore implements InboxStore {
  private cursors = new Map<string, string>();
  private records = new Map<string, Map<string, InboxRecord>>();
  private sigIndex = new Map<string, Set<string>>(); // owner -> signatures
  private resendIndex = new Map<string, Map<string, string>>(); // owner -> (resendKey -> messageId)

  async getCursor(ownerB58: string): Promise<string | null> {
    return this.cursors.get(ownerB58) ?? null;
  }

  async setCursor(ownerB58: string, signature: string): Promise<void> {
    this.cursors.set(ownerB58, signature);
  }

  private ownerMap(ownerB58: string): Map<string, InboxRecord> {
    const m = this.records.get(ownerB58);
    if (m) return m;
    const created = new Map<string, InboxRecord>();
    this.records.set(ownerB58, created);
    return created;
  }

  async putMessage(ownerB58: string, record: InboxRecord): Promise<void> {
    this.ownerMap(ownerB58).set(record.messageId, record);
  }

  async listMessages(ownerB58: string): Promise<InboxRecord[]> {
    const m = this.records.get(ownerB58);
    if (!m) return [];
    return Array.from(m.values());
  }

  async hasMessage(ownerB58: string, messageId: string): Promise<boolean> {
    return this.records.get(ownerB58)?.has(messageId) ?? false;
  }

  async hasSignature(ownerB58: string, signature: string): Promise<boolean> {
    return this.sigIndex.get(ownerB58)?.has(signature) ?? false;
  }

  async indexSignature(ownerB58: string, signature: string, _messageId: string): Promise<void> {
    if (!signature) return;
    const set = this.sigIndex.get(ownerB58) ?? new Set<string>();
    set.add(signature);
    this.sigIndex.set(ownerB58, set);
  }

  async hasResendKey(ownerB58: string, resendKey: string): Promise<boolean> {
    return this.resendIndex.get(ownerB58)?.has(resendKey) ?? false;
  }

  async getByResendKey(ownerB58: string, resendKey: string): Promise<InboxRecord | null> {
    const id = this.resendIndex.get(ownerB58)?.get(resendKey);
    if (!id) return null;
    return this.records.get(ownerB58)?.get(id) ?? null;
  }

  async indexResendKey(ownerB58: string, resendKey: string, messageId: string): Promise<void> {
    if (!resendKey) return;
    const map = this.resendIndex.get(ownerB58) ?? new Map<string, string>();
    map.set(resendKey, messageId);
    this.resendIndex.set(ownerB58, map);
  }

  async getMessage(ownerB58: string, messageId: string): Promise<InboxRecord | null> {
    return this.records.get(ownerB58)?.get(messageId) ?? null;
  }

  async updateMessage(ownerB58: string, messageId: string, patch: Partial<InboxRecord>): Promise<InboxRecord | null> {
    const cur = await this.getMessage(ownerB58, messageId);
    if (!cur) return null;
    const next = { ...cur, ...patch };
    this.ownerMap(ownerB58).set(messageId, next);
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
    this.cursors.delete(ownerB58);
    this.records.delete(ownerB58);
    this.sigIndex.delete(ownerB58);
    this.resendIndex.delete(ownerB58);
  }
}
