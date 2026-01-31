import { bytesToB64Url, b64UrlToBytes } from "@styx/crypto-core";

export type StyxPlaintextEnvelopeV1 = {
  v: 1;
  /** Message type (e.g. "text", "json", "blob"). */
  t: string;
  /** Optional deterministic thread key (local-only derivation target). */
  thread?: string;
  /** Optional resend/collapse key (local-only derivation target). */
  resend?: string;
  /** Content type hint (e.g. "text/plain", "application/json"). */
  ct?: string;
  /** The actual message body. */
  body: string;
};

const PREFIX = "STYXP1:";

/**
 * Optional plaintext envelope wrapper.
 * This exists to give apps a consistent, versioned structure for thread/resend
 * keys without leaking anything on-chain (it is encrypted inside the Styx envelope).
 */
export function encodePlaintextEnvelopeV1(env: Omit<StyxPlaintextEnvelopeV1, "v">): string {
  const full: StyxPlaintextEnvelopeV1 = { v: 1, ...env };
  return PREFIX + bytesToB64Url(new TextEncoder().encode(JSON.stringify(full)));
}

/**
 * Attempts to decode a plaintext envelope. Returns null if the format doesn't match.
 */
export function tryDecodePlaintextEnvelopeV1(plaintext: string): StyxPlaintextEnvelopeV1 | null {
  if (!plaintext.startsWith(PREFIX)) return null;
  const b64 = plaintext.slice(PREFIX.length);
  try {
    const bytes = b64UrlToBytes(b64);
    const json = new TextDecoder().decode(bytes);
    const obj = JSON.parse(json);
    if (!obj || obj.v !== 1 || typeof obj.body !== "string" || typeof obj.t !== "string") return null;
    return obj as StyxPlaintextEnvelopeV1;
  } catch {
    return null;
  }
}
