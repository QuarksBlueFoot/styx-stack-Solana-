import type { Bytes } from "@styx/crypto-core";
import {
  bytesToB64Url,
  b64UrlToBytes,
  concatBytes,
  sha256Bytes,
  utf8ToBytes,
  bytesToUtf8,
  varBytesDecode,
  varBytesEncode,
} from "@styx/crypto-core";

/**
 * STYX Envelope v1
 *
 * A single, compact, versioned binary envelope used across rails:
 * - Memo program (data carried as UTF-8: `styx1:<b64url>`)
 * - Private Memo Program (raw bytes)
 * - Relay (raw bytes)
 *
 * Privacy note (truth-in-advertising):
 * - Ciphertext is public on-chain.
 * - Fees, timing, sizes, and payer are public.
 * - Privacy comes from strong encryption + minimizing metadata.
 */

export const STYX_MAGIC = new Uint8Array([0x53, 0x54, 0x59, 0x58]); // "STYX"
export const STYX_V1 = 1;

export type StyxEnvelopeKind =
  | "message" // encrypted payload
  | "reveal" // selective disclosure bundle
  | "keybundle"; // rotated key bundle / registry update

export type StyxAlgo =
  | "pmf1"; // PMF1 encrypted payloads (see pmf1_binary.ts)

export type StyxEnvelopeV1 = {
  v: 1;
  kind: StyxEnvelopeKind;
  algo: StyxAlgo;
  /** 32-byte message id (sha256 of ciphertext bytes by default) */
  id: Bytes;
  /** Optional recipient hint: sha256(recipient_pubkey_bytes) */
  toHash?: Bytes;
  /** Optional sender hint (ed25519 public key) */
  from?: Bytes;
  /** Encryption nonce (if applicable) */
  nonce?: Bytes;
  /** Ciphertext bytes */
  body: Bytes;
  /** Additional authenticated data, if used */
  aad?: Bytes;
  /** Optional detached signature over the canonical bytes */
  sig?: Bytes;
};

const KIND: Record<StyxEnvelopeKind, number> = { message: 1, reveal: 2, keybundle: 3 };
const KIND_INV: Record<number, StyxEnvelopeKind> = { 1: "message", 2: "reveal", 3: "keybundle" };
const ALGO: Record<StyxAlgo, number> = { pmf1: 1 };
const ALGO_INV: Record<number, StyxAlgo> = { 1: "pmf1" };

// flags bitset
const F_TOHASH = 1 << 0;
const F_FROM = 1 << 1;
const F_NONCE = 1 << 2;
const F_AAD = 1 << 3;
const F_SIG = 1 << 4;

function u16le(n: number): Bytes {
  const out = new Uint8Array(2);
  out[0] = n & 0xff;
  out[1] = (n >>> 8) & 0xff;
  return out;
}

function readU16le(buf: Bytes, o: number): number {
  return buf[o] | (buf[o + 1] << 8);
}

/**
 * Canonical binary encoding.
 */
export function encodeStyxEnvelope(env: StyxEnvelopeV1): Bytes {
  if (env.v !== 1) throw new Error("encodeStyxEnvelope: only v=1 supported");
  if (env.id.length !== 32) throw new Error("encodeStyxEnvelope: id must be 32 bytes");
  if (env.toHash && env.toHash.length !== 32) throw new Error("encodeStyxEnvelope: toHash must be 32 bytes");
  if (env.from && env.from.length !== 32) throw new Error("encodeStyxEnvelope: from must be 32 bytes");

  let flags = 0;
  if (env.toHash) flags |= F_TOHASH;
  if (env.from) flags |= F_FROM;
  if (env.nonce) flags |= F_NONCE;
  if (env.aad) flags |= F_AAD;
  if (env.sig) flags |= F_SIG;

  const header = concatBytes(
    STYX_MAGIC,
    new Uint8Array([STYX_V1]),
    new Uint8Array([KIND[env.kind] ?? 0]),
    u16le(flags),
    new Uint8Array([ALGO[env.algo] ?? 0]),
    env.id,
  );

  const parts: Bytes[] = [header];
  if (env.toHash) parts.push(env.toHash);
  if (env.from) parts.push(env.from);
  if (env.nonce) parts.push(varBytesEncode(env.nonce));
  parts.push(varBytesEncode(env.body));
  if (env.aad) parts.push(varBytesEncode(env.aad));
  if (env.sig) parts.push(varBytesEncode(env.sig));
  return concatBytes(...parts);
}

export function decodeStyxEnvelope(buf: Bytes): StyxEnvelopeV1 {
  if (buf.length < 4 + 1 + 1 + 2 + 1 + 32) throw new Error("decodeStyxEnvelope: too short");
  const magic = buf.slice(0, 4);
  if (magic[0] !== STYX_MAGIC[0] || magic[1] !== STYX_MAGIC[1] || magic[2] !== STYX_MAGIC[2] || magic[3] !== STYX_MAGIC[3]) {
    throw new Error("decodeStyxEnvelope: bad magic");
  }
  const v = buf[4];
  if (v !== 1) throw new Error(`decodeStyxEnvelope: unsupported version ${v}`);
  const kind = KIND_INV[buf[5]];
  const flags = readU16le(buf, 6);
  const algo = ALGO_INV[buf[8]];
  if (!kind || !algo) throw new Error("decodeStyxEnvelope: unknown kind/algo");
  let o = 9;
  const id = buf.slice(o, o + 32);
  o += 32;

  const env: StyxEnvelopeV1 = { v: 1, kind, algo, id, body: new Uint8Array() };
  if (flags & F_TOHASH) {
    env.toHash = buf.slice(o, o + 32);
    o += 32;
  }
  if (flags & F_FROM) {
    env.from = buf.slice(o, o + 32);
    o += 32;
  }
  if (flags & F_NONCE) {
    const { value, read } = varBytesDecode(buf, o);
    env.nonce = value;
    o += read;
  }
  {
    const { value, read } = varBytesDecode(buf, o);
    env.body = value;
    o += read;
  }
  if (flags & F_AAD) {
    const { value, read } = varBytesDecode(buf, o);
    env.aad = value;
    o += read;
  }
  if (flags & F_SIG) {
    const { value, read } = varBytesDecode(buf, o);
    env.sig = value;
    o += read;
  }
  if (o !== buf.length) {
    // allow trailing bytes for forward-compat? For v1, be strict.
    throw new Error("decodeStyxEnvelope: trailing bytes");
  }
  return env;
}

/**
 * Memo wire format: `styx1:<b64url(encodeStyxEnvelope(...))>`
 */
export function toMemoString(envBytes: Bytes): string {
  return `styx1:${bytesToB64Url(envBytes)}`;
}

export function fromMemoString(memo: string): Bytes | null {
  if (!memo.startsWith("styx1:")) return null;
  const b64url = memo.slice("styx1:".length);
  return b64UrlToBytes(b64url);
}

/**
 * Convenience: compute message id from ciphertext bytes.
 */
export function styxMessageId(body: Bytes): Bytes {
  return sha256Bytes(body);
}

/** Debug helper */
export function styxEnvelopeToJson(env: StyxEnvelopeV1): string {
  const enc32 = (b?: Bytes) => (b ? bytesToB64Url(b) : undefined);
  return JSON.stringify(
    {
      v: env.v,
      kind: env.kind,
      algo: env.algo,
      id: enc32(env.id),
      toHash: enc32(env.toHash),
      from: enc32(env.from),
      nonce: enc32(env.nonce),
      bodyLen: env.body.length,
      aadLen: env.aad?.length,
      sigLen: env.sig?.length,
    },
    null,
    2,
  );
}

export function memoStringLooksLikeStyx(memo: string): boolean {
  return memo.startsWith("styx1:");
}

export function memoStringTryDecodeUtf8(memo: string): string {
  const bytes = fromMemoString(memo);
  if (!bytes) return memo;
  try {
    const env = decodeStyxEnvelope(bytes);
    return styxEnvelopeToJson(env);
  } catch {
    return memo;
  }
}
