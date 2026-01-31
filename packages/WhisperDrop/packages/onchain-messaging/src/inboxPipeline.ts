import { PublicKey } from "@solana/web3.js";
import { b64UrlToBytes } from "@styx/crypto-core";
import { scanInboxWithPayload, type InboxPayloadItem } from "./inboxIndexer";
import { assembleAllCompleteGroups, type StyxChunkFrame, tryDecodeChunkFrame } from "./chunking";
import { tryDecodePlaintextEnvelopeV1 } from "./plaintextEnvelope";
import type { InboxStore } from "@styx/inbox-store";

/**
 * End-to-end inbox pipeline helper (tooling-only).
 *
 * Flow: scan -> extract envelope bytes -> caller decrypts -> optional chunk reassembly.
 *
 * - No backend assumptions.
 * - No key custody: caller supplies decryptFn.
 */
export async function scanDecryptReassembleInbox(args: {
  connection: any;
  owner: PublicKey | string;
  limit?: number;
  before?: string;
  /** Stop scanning once this signature is reached (cursoring). */
  until?: string;
  /** Optional local-first inbox persistence (encrypted on mobile via SecureStorageInboxStore). */
  store?: InboxStore;
  /** If true, store plaintext alongside metadata (off by default). */
  persistPlaintext?: boolean;
  /** Decrypt function provided by app (wallet keys, session keys, etc). */
  decryptFn: (ctx: { item: InboxPayloadItem; envelopeBytes: Uint8Array }) => Promise<string | Uint8Array | null>;
  /** Optional: derive a local-only deterministic thread key from decrypted plaintext. */
  deriveThreadKey?: (ctx: { item: InboxPayloadItem; plaintext: string }) => string | null;
  /** Optional: derive a local-only resend/collapse key from decrypted plaintext. */
  deriveResendKey?: (ctx: { item: InboxPayloadItem; plaintext: string }) => string | null;
  /** If true, attempt to parse STYXP1 plaintext envelope and use its fields for thread/resend hints. Default true. */
  usePlaintextEnvelopeV1?: boolean;
}): Promise<{
  items: InboxPayloadItem[];
  plaintexts: { item: InboxPayloadItem; plaintext: string; threadKey?: string; resendKey?: string }[];
  assembledChunks: { msgId: string; contentType: string; plaintext: string }[];
  undecoded: InboxPayloadItem[];
}> {
  const ownerB58 = typeof args.owner === "string" ? args.owner : args.owner.toBase58();
  const storedCursor = args.store ? await args.store.getCursor(ownerB58).catch(() => null) : null;
  const until = args.until ?? storedCursor ?? undefined;

  const items = await scanInboxWithPayload({
    connection: args.connection,
    owner: args.owner,
    limit: args.limit,
    before: args.before,
    until,
  });

  // Update cursor to newest signature so next scan can stop at it.
  if (args.store && items.length > 0) {
    await args.store.setCursor(ownerB58, items[0].signature).catch(() => void 0);
  }

  const plaintexts: { item: InboxPayloadItem; plaintext: string; threadKey?: string; resendKey?: string }[] = [];
  const undecoded: InboxPayloadItem[] = [];
  const frames: StyxChunkFrame[] = [];

  for (const item of items) {
    // Defensive dedupe: prefer signature-based dedupe when store supports it
    if (args.store && typeof (args.store as any).hasSignature === "function" && item.signature) {
      const seenSig = await (args.store as any).hasSignature(ownerB58, item.signature).catch(() => false);
      if (seenSig) continue;
    }

    if (args.store && item.messageId) {
      const seen = await args.store.hasMessage?.(ownerB58, item.messageId).catch(() => false);
      if (seen) continue;
    }

    if (!item.envelopeB64Url) {
      undecoded.push(item);
      continue;
    }

    let envelopeBytes: Uint8Array;
    try {
      envelopeBytes = b64UrlToBytes(item.envelopeB64Url);
    } catch {
      undecoded.push(item);
      continue;
    }

    const decFn = args.decryptFn as any;
    const dec = await decFn({ item, envelopeBytes }).catch(() => null);
    if (dec == null) {
      undecoded.push(item);
      continue;
    }

    const plaintext = typeof dec === "string" ? dec : new TextDecoder().decode(dec);
    plaintexts.push({ item, plaintext });

    if (args.store && item.messageId) {
      await args.store.putMessage(ownerB58, {
        messageId: item.messageId,
        signature: item.signature,
        slot: item.slot,
        program: item.program,
        receivedAt: Date.now(),
        envelopeB64Url: item.envelopeB64Url,
        memoString: item.memoString,
        plaintext: args.persistPlaintext ? plaintext : undefined,
      }).catch(() => void 0);
    }

    const frame = tryDecodeChunkFrame(plaintext);
    if (frame) frames.push(frame);
  }

  const assembled = assembleAllCompleteGroups(frames).map(g => ({
    msgId: g.msgId,
    contentType: g.contentType,
    plaintext: new TextDecoder().decode(g.bytes),
  }));

  return { items, plaintexts, assembledChunks: assembled, undecoded };
}