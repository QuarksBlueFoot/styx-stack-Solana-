import nacl from "tweetnacl";
import { concatBytes, utf8ToBytes, bytesToUtf8, type Bytes } from "@styx/crypto-core";
import { b64ToBytes, bytesToB64 } from "@styx/crypto-core";
import { sha256Bytes } from "@styx/crypto-core";

/**
 * PMF1 Binary (Private Memo Format v1 - compact binary)
 *
 * Goals:
 * - versioned + future-proof
 * - stable across languages (TS/Kotlin/Rust)
 * - compact for on-chain memo/program data
 *
 * Cipher suite v1:
 * - Content: secretbox (XSalsa20-Poly1305) with 24-byte nonce
 * - Key wrap: box(contentKey) with 24-byte nonce per recipient
 *
 * Layout (all little-endian):
 *  0..3   magic = "PMF1" (0x50 0x4D 0x46 0x31)
 *  4      version = 1
 *  5      flags (bit0: has_aad, bit1: has_content_type, bit2: has_app_tag)
 *  6..37  sender_x25519_pubkey (32)
 *  38..39 recipient_count u16
 *  Repeated recipient entries:
 *    - recipient_x25519_pubkey (32)
 *    - wrap_nonce (24)
 *    - wrapped_key_len u16
 *    - wrapped_key bytes (len)   // nacl.box output length = 32 + 16 = 48
 *  Then:
 *    - content_nonce (24)
 *    - ciphertext_len u32
 *    - ciphertext bytes (len)
 *  Optional:
 *    - aad_len u16 + aad bytes
 *    - content_type_len u16 + utf8 bytes
 *    - app_tag_len u16 + utf8 bytes
 *
 * Notes:
 * - createdAt not stored on-chain by default; keep that off-chain or in app_tag/aad if needed.
 * - For indexing/audit, compute memo_hash = sha256(binary_bytes).
 */

const MAGIC = utf8ToBytes("PMF1");

const FLAG_AAD = 1 << 0;
const FLAG_CT  = 1 << 1;
const FLAG_TAG = 1 << 2;

function u16le(n: number): Bytes {
  const out = new Uint8Array(2);
  out[0] = n & 0xff;
  out[1] = (n >> 8) & 0xff;
  return out;
}
function u32le(n: number): Bytes {
  const out = new Uint8Array(4);
  out[0] = n & 0xff;
  out[1] = (n >> 8) & 0xff;
  out[2] = (n >> 16) & 0xff;
  out[3] = (n >> 24) & 0xff;
  return out;
}
function readU16le(b: Bytes, o: number): number {
  return b[o] | (b[o+1] << 8);
}
function readU32le(b: Bytes, o: number): number {
  return (b[o]) | (b[o+1] << 8) | (b[o+2] << 16) | (b[o+3] << 24);
}

export type PMF1BinaryEncryptArgs = {
  senderX25519KeyPair: nacl.BoxKeyPair;
  recipientX25519Pubkeys: Bytes[];
  plaintext: Bytes;               // already bytes
  aad?: Bytes;
  contentType?: string;
  appTag?: string;
};

export type PMF1BinaryParsed = {
  version: 1;
  flags: number;
  senderX25519Pubkey: Bytes;
  recipients: Array<{
    recipientX25519Pubkey: Bytes;
    wrapNonce: Bytes;
    wrappedKey: Bytes;
  }>;
  contentNonce: Bytes;
  ciphertext: Bytes;
  aad?: Bytes;
  contentType?: string;
  appTag?: string;
};

export function pmf1BinaryEncrypt(args: PMF1BinaryEncryptArgs): Bytes {
  const contentKey = nacl.randomBytes(32);
  const contentNonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const ciphertext = nacl.secretbox(args.plaintext, contentNonce, contentKey);

  const recEntries: Bytes[] = [];
  for (const rpk of args.recipientX25519Pubkeys) {
    if (rpk.length !== 32) throw new Error("recipientX25519Pubkey must be 32 bytes");
    const wrapNonce = nacl.randomBytes(nacl.box.nonceLength);
    const wrappedKey = nacl.box(contentKey, wrapNonce, rpk, args.senderX25519KeyPair.secretKey);
    recEntries.push(
      rpk,
      wrapNonce,
      u16le(wrappedKey.length),
      wrappedKey
    );
  }

  let flags = 0;
  if (args.aad && args.aad.length) flags |= FLAG_AAD;
  if (args.contentType && args.contentType.length) flags |= FLAG_CT;
  if (args.appTag && args.appTag.length) flags |= FLAG_TAG;

  const tail: Bytes[] = [
    contentNonce,
    u32le(ciphertext.length),
    ciphertext
  ];

  if (flags & FLAG_AAD) {
    tail.push(u16le(args.aad!.length), args.aad!);
  }
  if (flags & FLAG_CT) {
    const ctBytes = utf8ToBytes(args.contentType!);
    tail.push(u16le(ctBytes.length), ctBytes);
  }
  if (flags & FLAG_TAG) {
    const tagBytes = utf8ToBytes(args.appTag!);
    tail.push(u16le(tagBytes.length), tagBytes);
  }

  return concatBytes(
    MAGIC,
    new Uint8Array([1]),
    new Uint8Array([flags]),
    args.senderX25519KeyPair.publicKey,
    u16le(args.recipientX25519Pubkeys.length),
    ...recEntries,
    ...tail
  );
}

export function pmf1BinaryParse(data: Bytes): PMF1BinaryParsed {
  if (data.length < 4 + 1 + 1 + 32 + 2) throw new Error("PMF1 too short");
  for (let i = 0; i < 4; i++) if (data[i] !== MAGIC[i]) throw new Error("Bad PMF1 magic");
  const version = data[4];
  if (version !== 1) throw new Error(`Unsupported PMF1 version: ${version}`);
  const flags = data[5];

  let o = 6;
  const sender = data.slice(o, o+32); o += 32;
  const rc = readU16le(data, o); o += 2;

  const recipients: PMF1BinaryParsed["recipients"] = [];
  for (let i = 0; i < rc; i++) {
    const rpk = data.slice(o, o+32); o += 32;
    const wrapNonce = data.slice(o, o+24); o += 24;
    const wlen = readU16le(data, o); o += 2;
    const wrappedKey = data.slice(o, o+wlen); o += wlen;
    recipients.push({ recipientX25519Pubkey: rpk, wrapNonce, wrappedKey });
  }

  const contentNonce = data.slice(o, o+24); o += 24;
  const clen = readU32le(data, o); o += 4;
  const ciphertext = data.slice(o, o+clen); o += clen;

  let aad: Bytes | undefined;
  let contentType: string | undefined;
  let appTag: string | undefined;

  if (flags & FLAG_AAD) {
    const alen = readU16le(data, o); o += 2;
    aad = data.slice(o, o+alen); o += alen;
  }
  if (flags & FLAG_CT) {
    const len = readU16le(data, o); o += 2;
    contentType = bytesToUtf8(data.slice(o, o+len)); o += len;
  }
  if (flags & FLAG_TAG) {
    const len = readU16le(data, o); o += 2;
    appTag = bytesToUtf8(data.slice(o, o+len)); o += len;
  }

  if (o !== data.length) {
    // forward-compat: allow trailing bytes for future extensions by ignoring, but only if we add a length-delimited extension section.
    // For v1 we require exact match to avoid ambiguous parsing.
    throw new Error("PMF1 trailing bytes (invalid encoding)");
  }

  return {
    version: 1,
    flags,
    senderX25519Pubkey: sender,
    recipients,
    contentNonce,
    ciphertext,
    aad,
    contentType,
    appTag
  };
}

export function pmf1BinaryDecrypt(args: { recipientX25519SecretKey: Bytes; pmf1: Bytes }): Bytes {
  const parsed = pmf1BinaryParse(args.pmf1);

  for (const r of parsed.recipients) {
    const opened = nacl.box.open(
      r.wrappedKey,
      r.wrapNonce,
      parsed.senderX25519Pubkey,
      args.recipientX25519SecretKey
    );
    if (opened) {
      const pt = nacl.secretbox.open(parsed.ciphertext, parsed.contentNonce, opened);
      if (!pt) throw new Error("PMF1 decrypt failed (bad ciphertext/tag)");
      return pt;
    }
  }
  throw new Error("PMF1 decrypt failed (no matching recipient)");
}

export function pmf1MemoHash(pmf1: Bytes): Bytes {
  return sha256Bytes(pmf1);
}

export function pmf1MemoHashB64(pmf1: Bytes): string {
  return bytesToB64(pmf1MemoHash(pmf1));
}
