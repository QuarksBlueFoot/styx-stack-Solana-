export type InboxRecord = {
  /** Deterministic identifier for this message payload (Styx envelope hash). */
  messageId: string;

  /** Solana transaction signature that carried this message. */
  signature: string;

  slot: number;
  program: "memo" | "pmp";
  receivedAt: number;

  /** Optional raw envelope bytes (base64url), extracted from memo string or PMP payload. */
  envelopeB64Url?: string;

  /** Optional original memo string, when program === "memo". */
  memoString?: string;

  /** Optional decrypted plaintext. Off by default; provided by caller-owned decryptFn. */
  plaintext?: string;

  /** Optional content type hint (set by app or derived post-decrypt). */
  contentType?: string;

  /** Local-only read marker. If absent, treat as unread unless app chooses otherwise. */
  readAt?: number;

  /**
   * Local-only thread key for UI grouping.
   * Best practice: derive this *after decrypt* using app-level metadata (e.g. conversation id),
   * or a deterministic peer key (e.g. other party pubkey) if your plaintext includes it.
   */
  threadKey?: string;

  /**
   * Local-only resend/deduplication key.
   * If provided, inbox views can collapse resends/retries into a single entry.
   * This must be derived from *decrypted* content (or app-level metadata) so it never leaks on-chain.
   */
  resendKey?: string;

  /**
   * Local-only pointer used when collapsing resends:
   * if this record was superseded by a later resend, store the newer messageId here.
   */
  supersededBy?: string;
};

export type InboxStore = {
  /** Return the newest processed tx signature cursor, if any. */
  getCursor(ownerB58: string): Promise<string | null>;
  setCursor(ownerB58: string, signature: string): Promise<void>;

  /** Store or update a message record. */
  putMessage(ownerB58: string, record: InboxRecord): Promise<void>;

  /** List all stored messages for an owner (order not guaranteed). */
  listMessages(ownerB58: string): Promise<InboxRecord[]>;

  /** Optional: check if a messageId exists (fast path). */
  hasMessage?(ownerB58: string, messageId: string): Promise<boolean>;

  /** Optional: tx-signature index (fast scan dedupe). */
  hasSignature?(ownerB58: string, signature: string): Promise<boolean>;
  indexSignature?(ownerB58: string, signature: string, messageId: string): Promise<void>;

  /** Optional: resend-key index (collapse retries). */
  hasResendKey?(ownerB58: string, resendKey: string): Promise<boolean>;
  getByResendKey?(ownerB58: string, resendKey: string): Promise<InboxRecord | null>;
  indexResendKey?(ownerB58: string, resendKey: string, messageId: string): Promise<void>;

  /** Optional: read-state helpers */
  getMessage?(ownerB58: string, messageId: string): Promise<InboxRecord | null>;
  updateMessage?(ownerB58: string, messageId: string, patch: Partial<InboxRecord>): Promise<InboxRecord | null>;
  markRead?(ownerB58: string, messageId: string, readAt?: number): Promise<InboxRecord | null>;

  /** Optional: paginated message listing (newest-first). */
  listMessagesPage?(
    ownerB58: string,
    opts?: { limit?: number; beforeReceivedAt?: number }
  ): Promise<InboxRecord[]>;

  /** Optional: delete all local state for an owner. */
  clearOwner?(ownerB58: string): Promise<void>;
};
