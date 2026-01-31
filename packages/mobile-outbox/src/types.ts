export type OutboxStatus = "pending" | "sent" | "failed";

export interface OutboxMeta {
  /** Optional human readable tag like "styx-message" or "private-tx". */
  kind?: string;
  /** Optional Solana address / recipient for UI grouping. */
  to?: string;
  /** Optional message/thread hints (local-only). */
  threadKey?: string;
  /** Optional signature once sent. */
  signature?: string;
  /** Optional confirmation timestamp once confirmed (local-only). */
  confirmedAt?: number;
  /** Optional confirmation slot (local-only). */
  confirmedSlot?: number;
  /** Optional error code/message (local-only). */
  lastError?: string;
}

export interface OutboxRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  status: OutboxStatus;
  /** Payload bytes to send (e.g., base64 transaction bytes or serialized tx) */
  payloadB64: string;
  meta?: OutboxMeta;
}

export interface OutboxStore {
  enqueue(payloadB64: string, meta?: OutboxMeta): Promise<OutboxRecord>;
  list(status?: OutboxStatus): Promise<OutboxRecord[]>;
  get(id: string): Promise<OutboxRecord | null>;
  update(id: string, patch: Partial<Pick<OutboxRecord, "status" | "payloadB64" | "meta">>): Promise<OutboxRecord | null>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}
