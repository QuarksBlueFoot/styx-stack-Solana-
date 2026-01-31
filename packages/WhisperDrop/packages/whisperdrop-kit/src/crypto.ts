import { sha256 } from "@noble/hashes/sha256";
import { bytesToUtf8, utf8ToBytes } from "./utf8";

export function sha256Bytes(data: Uint8Array): Uint8Array {
  return sha256(data);
}

export function sha256Utf8(text: string): Uint8Array {
  return sha256(utf8ToBytes(text));
}

export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ^ b[i]);
  return diff === 0;
}

export function compareBytes(a: Uint8Array, b: Uint8Array): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return a.length - b.length;
}

export function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

export function bytesToB64Url(bytes: Uint8Array): string {
  const b64 = Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function b64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64url.length + 3) % 4);
  return new Uint8Array(Buffer.from(b64, "base64"));
}

export function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

export function hexToBytes(hex: string): Uint8Array {
  if (!/^[0-9a-fA-F]*$/.test(hex)) throw new Error("hex contains non-hex characters");
  if (hex.length % 2 !== 0) throw new Error("hex must have even length");
  return new Uint8Array(Buffer.from(hex, "hex"));
}

export function bytesToUtf8String(bytes: Uint8Array): string {
  return bytesToUtf8(bytes);
}
