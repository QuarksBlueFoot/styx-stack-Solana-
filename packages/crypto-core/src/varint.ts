import type { Bytes } from "./bytes";

/**
 * Unsigned LEB128 varint utilities.
 * - Compact
 * - Deterministic
 * - Future-proof for envelope formats
 */

export function uvarintEncode(n: number): Bytes {
  if (!Number.isFinite(n) || n < 0) throw new Error("uvarintEncode: n must be >= 0");
  let x = Math.floor(n);
  const out: number[] = [];
  while (x >= 0x80) {
    out.push((x & 0x7f) | 0x80);
    x = Math.floor(x / 128);
  }
  out.push(x & 0x7f);
  return new Uint8Array(out);
}

export function uvarintDecode(buf: Bytes, offset: number = 0): { value: number; read: number } {
  let x = 0;
  let s = 0;
  let i = 0;
  while (offset + i < buf.length) {
    const b = buf[offset + i];
    x |= (b & 0x7f) << s;
    i++;
    if ((b & 0x80) === 0) return { value: x >>> 0, read: i };
    s += 7;
    if (s > 35) throw new Error("uvarintDecode: varint too large");
  }
  throw new Error("uvarintDecode: unexpected EOF");
}

export function varBytesEncode(bytes: Bytes): Bytes {
  const len = uvarintEncode(bytes.length);
  const out = new Uint8Array(len.length + bytes.length);
  out.set(len, 0);
  out.set(bytes, len.length);
  return out;
}

export function varBytesDecode(buf: Bytes, offset: number = 0): { value: Bytes; read: number } {
  const { value: len, read: r1 } = uvarintDecode(buf, offset);
  const start = offset + r1;
  const end = start + len;
  if (end > buf.length) throw new Error("varBytesDecode: length out of bounds");
  return { value: buf.slice(start, end), read: r1 + len };
}
