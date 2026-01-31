
import type { InboxItem } from "./inboxIndexer";
import { tryDecodeChunkFrame, groupChunkFrames, assembleAllCompleteGroups, type StyxChunkFrame } from "./chunking";

/**
 * Decrypt function provided by the app. Styx remains tooling-only:
 * - no key custody assumptions
 * - no backend assumptions
 */
export type InboxDecryptFn<TMeta = any> = (item: InboxItem) => Promise<{ plaintext: string; meta?: TMeta } | null>;

export type ReassembledInboxMessage<TMeta = any> = {
  /** Stable id (chunk msgId if chunked, else derived from signature) */
  messageId: string;
  /** One or more source items that contributed to this message */
  sources: InboxItem[];
  /** Decrypted plaintext (full reassembled content for chunked messages) */
  plaintext: string;
  /** content type (only present for chunked frames) */
  contentType?: string;
  /** Whether this message was chunked */
  chunked: boolean;
  /** Optional caller metadata (from decryptFn) */
  meta?: TMeta;
};

export type ReassemblyResult<TMeta = any> = {
  messages: ReassembledInboxMessage<TMeta>[];
  /** Frames we decoded but could not assemble yet (missing chunks) */
  incompleteChunkGroups: Record<string, StyxChunkFrame[]>;
  /** Items we could not decrypt (decryptFn returned null/errored) */
  undecoded: InboxItem[];
};

/**
 * Given InboxItems + a decrypt function, reassemble any chunked messages.
 * - Chunk metadata is inside encrypted plaintext by design.
 * - This function operates AFTER decryption.
 */
export async function reassembleInbox<TMeta = any>(
  items: InboxItem[],
  decryptFn: InboxDecryptFn<TMeta>
): Promise<ReassemblyResult<TMeta>> {
  const frames: StyxChunkFrame[] = [];
  const nonChunked: { item: InboxItem; plaintext: string; meta?: TMeta }[] = [];
  const undecoded: InboxItem[] = [];

  for (const item of items) {
    try {
      const dec = await decryptFn(item);
      if (!dec) {
        undecoded.push(item);
        continue;
      }
      const frame = tryDecodeChunkFrame(dec.plaintext);
      if (frame) {
        frames.push(frame);
      } else {
        nonChunked.push({ item, plaintext: dec.plaintext, meta: dec.meta });
      }
    } catch {
      undecoded.push(item);
    }
  }

  const grouped = groupChunkFrames(frames);
  const assembledComplete = assembleAllCompleteGroups(frames);
  const completeIds = new Set(assembledComplete.map(a => a.msgId));
  const incomplete: Record<string, StyxChunkFrame[]> = {};
  for (const [msgId, group] of grouped.entries()) {
    if (!completeIds.has(msgId)) incomplete[msgId] = group;
  }

  const out: ReassembledInboxMessage<TMeta>[] = [];

  // completed chunked groups
  for (const assembled of assembledComplete) {
    // We cannot reliably map msgId -> source InboxItems without decrypt metadata.
    // Return empty sources unless caller supplies mapping via meta; keep deterministic.
    out.push({
      messageId: assembled.msgId,
      sources: [],
      plaintext: new TextDecoder().decode(assembled.bytes),
      contentType: assembled.contentType,
      chunked: true,
    });
  }

  // non-chunked messages
  for (const n of nonChunked) {
    out.push({
      messageId: n.item.payloadHash ?? n.item.signature,
      sources: [n.item],
      plaintext: n.plaintext,
      chunked: false,
      meta: n.meta,
    });
  }

  return {
    messages: out,
    incompleteChunkGroups: incomplete,
    undecoded,
  };
}
