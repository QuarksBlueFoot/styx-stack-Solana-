export type StyxErrorCode =
  | "STYX_TX_SIZE_EXCEEDED"
  | "STYX_INSUFFICIENT_FUNDS"
  | "STYX_BLOCKHASH_NOT_FOUND"
  | "STYX_RPC_FAILURE"
  | "STYX_SIMULATION_FAILED"
  | "STYX_SIGNING_FAILED"
  | "STYX_RAIL_UNAVAILABLE"
  | "STYX_UNKNOWN";

export class StyxError extends Error {
  public readonly code: StyxErrorCode;
  public readonly details?: Record<string, any>;
  public readonly cause?: unknown;

  constructor(code: StyxErrorCode, message: string, opts?: { details?: Record<string, any>; cause?: unknown }) {
    super(message);
    this.name = "StyxError";
    this.code = code;
    this.details = opts?.details;
    this.cause = opts?.cause;
  }
}

export function toStyxError(err: unknown, fallback: StyxErrorCode = "STYX_UNKNOWN"): StyxError {
  if (err instanceof StyxError) return err;
  const msg = (err as any)?.message ? String((err as any).message) : "Unknown error";
  return new StyxError(fallback, msg, { cause: err });
}
