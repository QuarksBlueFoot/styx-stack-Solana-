export type StyxErrorCode =
  | "STYX_RPC_TRANSIENT"
  | "STYX_RPC_REJECTED"
  | "STYX_WALLET_REJECTED"
  | "STYX_TX_TOO_LARGE"
  | "STYX_ENVELOPE_INVALID"
  | "STYX_DECRYPT_FAILED"
  | "STYX_UNKNOWN";

export type StyxError = {
  code: StyxErrorCode;
  message: string;
  details?: Record<string, any>;
};

export function toStyxError(err: unknown): StyxError {
  const msg = typeof err === "object" && err && "message" in err ? String((err as any).message) : String(err);

  if (/User rejected|rejected|declined/i.test(msg)) {
    return { code: "STYX_WALLET_REJECTED", message: msg };
  }
  if (/too large|exceeds|message size/i.test(msg)) {
    return { code: "STYX_TX_TOO_LARGE", message: msg };
  }
  if (/429|rate|timeout|timed out|503|502|network|fetch failed/i.test(msg)) {
    return { code: "STYX_RPC_TRANSIENT", message: msg };
  }
  if (/invalid envelope|envelope/i.test(msg)) {
    return { code: "STYX_ENVELOPE_INVALID", message: msg };
  }
  if (/decrypt|decryption/i.test(msg)) {
    return { code: "STYX_DECRYPT_FAILED", message: msg };
  }
  return { code: "STYX_UNKNOWN", message: msg };
}
