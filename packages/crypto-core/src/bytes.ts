export type Bytes = Uint8Array;

export function concatBytes(...parts: Bytes[]): Bytes {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export function utf8ToBytes(s: string): Bytes {
  return new TextEncoder().encode(s);
}

export function bytesToUtf8(b: Bytes): string {
  return new TextDecoder().decode(b);
}
