import { Bytes } from "./types";

export type StoredEnvelopeV1 = {
  v: 1;
  alg: "AES-256-GCM";
  nonce_b64: string;
  ct_b64: string;
  aad_b64?: string;
  created_at: number;
};

export function utf8ToBytes(s: string): Bytes {
  return new TextEncoder().encode(s);
}
export function bytesToUtf8(b: Bytes): string {
  return new TextDecoder().decode(b);
}

// RN-safe base64 helpers (no Buffer assumptions)
export function bytesToB64(bytes: Bytes): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  // eslint-disable-next-line no-undef
  return btoa(bin);
}
export function b64ToBytes(b64: string): Bytes {
  // eslint-disable-next-line no-undef
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
