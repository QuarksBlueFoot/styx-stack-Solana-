import { bytesToB64Url, b64UrlToBytes } from "@styx/crypto-core";

/**
 * Chunk frame format (encrypted inside the Styx envelope plaintext):
 *
 *   STYXCHUNK1|<msgIdB64Url>|<index>|<total>|<contentType>|<chunkB64Url>
 *
 * - Versioned and easy to parse.
 * - Chunk payload is base64url so the frame remains delimiter-safe.
 */

const PREFIX = "STYXCHUNK1";

export type StyxChunkFrame = {
  msgId: string;
  index: number;
  total: number;
  contentType: string;
  chunkBytes: Uint8Array;
};

export function encodeChunkFrame(frame: StyxChunkFrame): string {
  const chunkB64Url = bytesToB64Url(frame.chunkBytes);
  return [PREFIX, frame.msgId, String(frame.index), String(frame.total), frame.contentType, chunkB64Url].join("|");
}

export function tryDecodeChunkFrame(plaintext: string): StyxChunkFrame | null {
  if (!plaintext.startsWith(PREFIX + "|")) return null;
  const parts = plaintext.split("|");
  if (parts.length < 6) return null;
  const [, msgId, indexStr, totalStr, contentType, chunkB64Url] = parts;
  const index = Number(indexStr);
  const total = Number(totalStr);
  if (!Number.isFinite(index) || !Number.isFinite(total) || index < 0 || total <= 0 || index >= total) return null;
  try {
    const chunkBytes = b64UrlToBytes(chunkB64Url);
    return { msgId, index, total, contentType, chunkBytes };
  } catch {
    return null;
  }
}

export function splitUtf8ToChunks(text: string, maxChunkBytes: number): Uint8Array[] {
  const enc = new TextEncoder();
  const bytes = enc.encode(text);
  if (bytes.length <= maxChunkBytes) return [bytes];

  const chunks: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; i += maxChunkBytes) {
    chunks.push(bytes.slice(i, i + maxChunkBytes));
  }
  return chunks;
}

export function assembleChunks(frames: StyxChunkFrame[]): { contentType: string; bytes: Uint8Array } | null {
  if (frames.length === 0) return null;
  const msgId = frames[0].msgId;
  const total = frames[0].total;
  const contentType = frames[0].contentType;
  if (!frames.every(f => f.msgId === msgId && f.total === total && f.contentType === contentType)) return null;
  if (frames.length !== total) return null;

  const sorted = [...frames].sort((a, b) => a.index - b.index);
  if (!sorted.every((f, i) => f.index === i)) return null;

  const totalLen = sorted.reduce((acc, f) => acc + f.chunkBytes.length, 0);
  const out = new Uint8Array(totalLen);
  let off = 0;
  for (const f of sorted) {
    out.set(f.chunkBytes, off);
    off += f.chunkBytes.length;
  }
  return { contentType, bytes: out };
}

/** @deprecated Use splitUtf8ToChunks (kept for backward compatibility). */
export function splitUtf8IntoChunks(text: string, maxChunkBytes: number): Uint8Array[] {
  return splitUtf8ToChunks(text, maxChunkBytes);
}

/**
 * Reassembles chunk frames into the original bytes.
 * Returns null if missing chunks.
 */
export function tryAssembleChunks(frames: StyxChunkFrame[]): { msgId: string; contentType: string; bytes: Uint8Array } | null {
  if (frames.length === 0) return null;
  const msgId = frames[0].msgId;
  const total = frames[0].total;
  const contentType = frames[0].contentType;
  if (!frames.every((f) => f.msgId === msgId && f.total === total && f.contentType === contentType)) return null;
  const map = new Map<number, Uint8Array>();
  for (const f of frames) map.set(f.index, f.chunkBytes);
  if (map.size !== total) return null;
  const ordered: Uint8Array[] = [];
  let len = 0;
  for (let i = 0; i < total; i++) {
    const b = map.get(i);
    if (!b) return null;
    ordered.push(b);
    len += b.length;
  }
  const merged = new Uint8Array(len);
  let off = 0;
  for (const b of ordered) {
    merged.set(b, off);
    off += b.length;
  }
  return { msgId, contentType, bytes: merged };
}

/** Groups chunk frames by msgId. */
export function groupChunkFrames(frames: StyxChunkFrame[]): Map<string, StyxChunkFrame[]> {
  const out = new Map<string, StyxChunkFrame[]>();
  for (const f of frames) {
    const arr = out.get(f.msgId) ?? [];
    arr.push(f);
    out.set(f.msgId, arr);
  }
  return out;
}

/**
 * Attempts to reassemble all complete groups.
 * Returns assembled blobs; incomplete groups are ignored.
 */
export function assembleAllCompleteGroups(frames: StyxChunkFrame[]): Array<{ msgId: string; contentType: string; bytes: Uint8Array }> {
  const groups = groupChunkFrames(frames);
  const out: Array<{ msgId: string; contentType: string; bytes: Uint8Array }> = [];
  for (const [msgId, g] of groups.entries()) {
    const res = tryAssembleChunks(g);
    if (res) out.push({ msgId, contentType: res.contentType, bytes: res.bytes });
  }
  return out;
}

/**
 * Convenience: parse plaintexts into frames (when you already decrypted envelopes)
 * and attempt to reassemble complete groups.
 */
export function assembleFromPlaintexts(plaintexts: string[]): Array<{ msgId: string; contentType: string; bytes: Uint8Array }> {
  const frames: StyxChunkFrame[] = [];
  for (const p of plaintexts) {
    const f = tryDecodeChunkFrame(p);
    if (f) frames.push(f);
  }
  return assembleAllCompleteGroups(frames);
}
