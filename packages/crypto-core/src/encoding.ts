import bs58 from "bs58";
import type { Bytes } from "./bytes";

export const b58 = {
  encode: (b: Bytes) => bs58.encode(b),
  decode: (s: string) => new Uint8Array(bs58.decode(s)),
};

export function bytesToB64(bytes: Bytes): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  // eslint-disable-next-line no-undef
  return btoa(bin);
}

/**
 * URL-safe base64 (no padding). Useful for memo payloads and filenames.
 */
export function bytesToB64Url(bytes: Bytes): string {
  return bytesToB64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function b64ToBytes(b64: string): Bytes {
  // eslint-disable-next-line no-undef
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function b64UrlToBytes(b64url: string): Bytes {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "===".slice((b64.length + 3) % 4);
  return b64ToBytes(padded);
}

export function bytesToHex(bytes: Bytes): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex: string): Bytes {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex string");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export const b64 = {
  encode: bytesToB64,
  decode: b64ToBytes,
};
