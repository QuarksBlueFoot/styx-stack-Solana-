import { PublicKey } from "@solana/web3.js";
import { PRIVATE_MEMO_PROGRAM_ID } from "@styx/private-memo-program-client";
import { b58, b64, bytesToB64Url } from "@styx/crypto-core";
import { fromMemoString, decodeStyxEnvelope } from "@styx/memo";

/**
 * Lightweight inbox indexer utilities.
 * Scans confirmed signatures and extracts MEM1 / PMP1 markers.
 * Tooling-only: caller controls RPC, limits, caching.
 */
export type InboxItem = {
  signature: string;
  slot: number;
  program: "memo" | "pmp";
  sender?: string;
  recipient?: string;
  payloadHash?: string;
  kind?: "styx" | "unknown";
};

export type InboxPayloadItem = InboxItem & {
  /** base64url-encoded Styx Envelope bytes when available */
  envelopeB64Url?: string;
  /** original memo string when program==memo */
  memoString?: string;
  /** deterministic id for dedupe (base64url) when kind=="styx" */
  messageId?: string;
};


export async function scanInbox(args: {
  connection: any; // Connection
  owner: PublicKey;
  limit?: number;
  before?: string;
  /** Max parallel RPC calls when falling back to per-tx fetch. Default 6. */
  maxConcurrency?: number;
}): Promise<InboxItem[]> {
  const sigs = await args.connection.getSignaturesForAddress(args.owner, {
    limit: args.limit ?? 50,
    before: args.before,
  });

  const signatures = sigs.map((s: any) => s.signature);
  const out: InboxItem[] = [];

  // Preferred fast path (supported by newer RPCs): batch fetch transactions.
  const getTxs = args.connection.getTransactions?.bind(args.connection);
  if (typeof getTxs === "function") {
    const txs = await getTxs(signatures, { maxSupportedTransactionVersion: 0 });
    for (let i = 0; i < signatures.length; i++) {
      const tx = txs?.[i];
      if (!tx) continue;
      out.push(...extractInboxItemsFromParsedTx(tx, signatures[i], sigs[i]?.slot));
    }
    return out;
  }

  // Compatibility path: fetch transactions one by one with bounded concurrency.
  const maxConc = Math.max(1, Math.min(24, args.maxConcurrency ?? 6));
  const queue = signatures.slice();
  const workers = Array.from({ length: Math.min(maxConc, queue.length) }, async () => {
    while (queue.length) {
      const sig = queue.shift();
      if (!sig) break;
      const tx = await args.connection.getParsedTransaction(sig, { maxSupportedTransactionVersion: 0 });
      if (!tx) continue;
      // slot lookup is best-effort
      const slot = sigs.find((x: any) => x.signature === sig)?.slot ?? 0;
      out.push(...extractInboxItemsFromParsedTx(tx, sig, slot));
    }
  });
  await Promise.all(workers);
  return out;
}



/**
 * Like scanInbox(), but also attempts to extract the underlying Styx Envelope bytes
 * (as base64url) for memo + PMP rails. Useful for end-to-end inbox pipelines.
 */
export async function scanInboxWithPayload(args: {
  connection: any;
  owner: PublicKey | string;
  limit?: number;
  before?: string;
  until?: string;
  maxConcurrency?: number;
  pmpProgramId?: PublicKey;
}): Promise<InboxPayloadItem[]> {
  const ownerKey = typeof args.owner === "string" ? new PublicKey(args.owner) : args.owner;
  const limit = Math.max(1, Math.min(1000, args.limit ?? 50));

  const sigs = await args.connection.getSignaturesForAddress(ownerKey, {
    limit,
    before: args.before,
    until: args.until,
  });

  const signatures = sigs.map((s: any) => s.signature);
  const out: InboxPayloadItem[] = [];

  const getTxs = args.connection.getTransactions?.bind(args.connection);
  if (typeof getTxs === "function") {
    const txs = await getTxs(signatures, { maxSupportedTransactionVersion: 0 });
    for (let i = 0; i < signatures.length; i++) {
      const tx = txs?.[i];
      if (!tx) continue;
      out.push(...extractInboxPayloadItemsFromParsedTx(tx, signatures[i], sigs[i]?.slot));
    }
    return out;
  }

  const maxConc = Math.max(1, Math.min(24, args.maxConcurrency ?? 6));
  const queue = signatures.slice();
  const workers = Array.from({ length: Math.min(maxConc, queue.length) }, async () => {
    while (queue.length) {
      const sig = queue.shift();
      if (!sig) break;
      const tx = await args.connection.getParsedTransaction(sig, { maxSupportedTransactionVersion: 0 });
      if (!tx) continue;
      const slot = sigs.find((x: any) => x.signature === sig)?.slot ?? 0;
      out.push(...extractInboxPayloadItemsFromParsedTx(tx, sig, slot));
    }
  });
  await Promise.all(workers);
  return out;
}


function extractInboxItemsFromParsedTx(tx: any, signature: string, slot: number): InboxItem[] {
  const items: InboxItem[] = [];
  const ixs = tx?.transaction?.message?.instructions ?? [];

  for (const ix of ixs as any[]) {
    const pid = ix.programId?.toBase58?.() ?? "";

    // ---- SPL Memo rail (UTF-8 memo string) ----
    if (pid === "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr") {
      const memoStr: string | null =
        (ix.parsed?.info?.memo as string | undefined) ??
        (typeof ix.parsed === "string" ? ix.parsed : undefined) ??
        null;

      let payloadHash: string | undefined;
      let kind: "styx" | "unknown" = "unknown";

      if (memoStr) {
        const bytes = fromMemoString(memoStr);
        if (bytes) {
          try {
            const env = decodeStyxEnvelope(bytes!);
            payloadHash = bytesToB64Url((env.id || new Uint8Array(0)));
            kind = "styx";
          } catch {
            // ignore decode errors
          }
        }
      }

      items.push({ signature, slot, program: "memo", payloadHash, kind });
      continue;
    }

    // ---- PMP rail (opaque bytes) ----
    if (pid === PRIVATE_MEMO_PROGRAM_ID.toBase58()) {
      const dataStr: string | null = typeof ix.data === "string" ? ix.data : null;

      // getTransactions() often returns compiled instructions with data as base58.
      // Some RPCs may return base64; we try both.
      let dataBytes: Uint8Array | null = null;
      if (dataStr) {
        try { dataBytes = b58.decode(dataStr); } catch { /* ignore */ }
        if (!dataBytes) {
          try { dataBytes = b64.decode(dataStr); } catch { /* ignore */ }
        }
      }

      let payloadHash: string | undefined;
      let kind: "styx" | "unknown" = "unknown";
      let recipient: string | undefined;

      if (dataBytes && dataBytes.length >= 5) {
        const tag = dataBytes[0];
        const hasRecipient = dataBytes[2];
        let off = 3;

        if (tag === 1) {
          if (hasRecipient === 1 && dataBytes.length >= off + 32 + 2) {
            recipient = b58.encode(dataBytes.slice(off, off + 32));
            off += 32;
          } else if (hasRecipient !== 0 && hasRecipient !== 1) {
            off = dataBytes.length; // invalid
          }

          if (off + 2 <= dataBytes.length) {
            const payloadLen = dataBytes[off] | (dataBytes[off + 1] << 8);
            off += 2;

            if (off + payloadLen === dataBytes.length) {
              const payload = dataBytes.slice(off, off + payloadLen);

              try {
                const env = decodeStyxEnvelope(payload);
                payloadHash = bytesToB64Url((env.id || new Uint8Array(0)));
                kind = "styx";
              } catch {
                // unknown payload
              }
            }
          }
        }
      }

      items.push({ signature, slot, program: "pmp", recipient, payloadHash, kind });
    }
  }

  return items;
}



function extractInboxPayloadItemsFromParsedTx(tx: any, signature: string, slot: number): InboxPayloadItem[] {
  const items: InboxPayloadItem[] = [];
  const message = tx?.transaction?.message;
  const ixs = message?.instructions ?? [];
  const accountKeys = message?.accountKeys ?? [];

  for (const ix of ixs) {
    const pid = resolveProgramId(ix, accountKeys);
    if (!pid) continue;

    // ---- Memo rail ----
    if (pid === "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr") {
      const memo: string | null = extractMemoString(ix);
      if (!memo) continue;

      let payloadHash: string | undefined;
      let kind: "styx" | "unknown" = "unknown";
      let messageId: string | undefined;
      let envelopeB64Url: string | undefined;

      if (memo.startsWith("styx1:")) {
        kind = "styx";
        envelopeB64Url = memo.slice("styx1:".length);
        try {
          const bytes = fromMemoString(memo);
          const env = decodeStyxEnvelope(bytes!);
          messageId = bytesToB64Url((env.id || new Uint8Array(0)));
          payloadHash = messageId;
        } catch {
          // ignore decode errors
        }
      }

      items.push({ signature, slot, program: "memo", payloadHash, kind, memoString: memo, envelopeB64Url, messageId });
      continue;
    }

    // ---- PMP rail ----
    if (pid === PRIVATE_MEMO_PROGRAM_ID.toBase58()) {
      const dataBytes = extractIxDataBytes(ix);
      let payloadHash: string | undefined;
      let kind: "styx" | "unknown" = "unknown";
      let recipient: string | undefined;
      let envelopeB64Url: string | undefined;
      let messageId: string | undefined;

      if (dataBytes && dataBytes.length >= 5) {
        const tag = dataBytes[0];
        const hasRecipient = dataBytes[2];
        let off = 3;

        if (tag === 1) {
          if (hasRecipient === 1 && dataBytes.length >= off + 32 + 2) {
            recipient = b58.encode(dataBytes.slice(off, off + 32));
            off += 32;
          } else if (hasRecipient !== 0 && hasRecipient !== 1) {
            off = dataBytes.length;
          }

          if (dataBytes.length >= off + 2) {
            const payloadLen = dataBytes[off] | (dataBytes[off + 1] << 8);
            off += 2;

            if (payloadLen >= 0 && dataBytes.length >= off + payloadLen) {
              const payload = dataBytes.slice(off, off + payloadLen);
              try {
                const env = decodeStyxEnvelope(payload);
                kind = "styx";
                messageId = bytesToB64Url((env.id || new Uint8Array(0)));
                payloadHash = messageId;
                envelopeB64Url = bytesToB64Url(payload);
              } catch {
                // unknown payload
              }
            }
          }
        }
      }

      items.push({ signature, slot, program: "pmp", recipient, payloadHash, kind, envelopeB64Url, messageId });
    }
  }

  return items;
}

function resolveProgramId(ix: any, accountKeys: any[]): string | null {
  try {
    if (typeof ix.programId === "string") return ix.programId;
    if (ix.programId?.toBase58) return ix.programId.toBase58();
    if (typeof ix.programIdIndex === "number") {
      const key = accountKeys[ix.programIdIndex];
      if (typeof key === "string") return key;
      if (key?.pubkey?.toBase58) return key.pubkey.toBase58();
      if (key?.toBase58) return key.toBase58();
    }
  } catch {}
  return null;
}

function extractMemoString(ix: any): string | null {
  // getParsedTransaction style: parsed.info.memo
  const parsed = ix?.parsed;
  const memo = parsed?.info?.memo;
  if (typeof memo === "string" && memo.length) return memo;

  // getTransactions style: raw base64 in ix.data
  if (typeof ix?.data === "string") {
    try {
      const bytes = b64.decode(ix.data);
      const str = new TextDecoder().decode(bytes);
      if (str) return str;
    } catch {}
  }
  return null;
}

function extractIxDataBytes(ix: any): Uint8Array | null {
  if (typeof ix?.data === "string") {
    try { return b64.decode(ix.data); } catch { /* ignore */ }
    try { return b58.decode(ix.data); } catch { return null; }
  }
  // parsed instruction data sometimes in base58? keep minimal
  return null;
}


