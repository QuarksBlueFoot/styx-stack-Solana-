import { StyxError, type StyxErrorCode, toStyxError } from "./errors";

export type TxErrorExplanation = {
  code: StyxErrorCode;
  title: string;
  message: string;
  hint?: string;
};

/**
 * Turn low-level RPC / web3.js errors into a stable, UX-friendly shape.
 *
 * This is intentionally conservative: we only claim what we can infer.
 */
export function explainTxError(err: unknown): TxErrorExplanation {
  const e = toStyxError(err);
  const msg = (e.message ?? "").toLowerCase();

  if (msg.includes("blockhash not found") || msg.includes("blockhash")) {
    return {
      code: "STYX_BLOCKHASH_NOT_FOUND",
      title: "Blockhash expired",
      message: "Your transaction's blockhash is no longer valid.",
      hint: "Fetch a fresh blockhash and re-sign. On mobile, this usually means retrying the send flow.",
    };
  }

  if (msg.includes("insufficient funds") || msg.includes("insufficient lamports") || msg.includes("0x1")) {
    return {
      code: "STYX_INSUFFICIENT_FUNDS",
      title: "Insufficient balance",
      message: "The fee payer doesn't have enough SOL for fees or transfers.",
      hint: "Top up SOL or lower priority fees / disable dust decoys.",
    };
  }

  if (msg.includes("simulation") || msg.includes("custom program error") || msg.includes("program failed")) {
    return {
      code: "STYX_SIMULATION_FAILED",
      title: "Simulation failed",
      message: "The transaction failed during simulation (or a program returned an error).",
      hint: "Run simulateTransaction and surface logs to the user. If using PMP/PER/CT, verify the rail is available.",
    };
  }

  if (msg.includes("429") || msg.includes("rate limit") || msg.includes("timeout") || msg.includes("network")) {
    return {
      code: "STYX_RPC_FAILURE",
      title: "Network/RPC issue",
      message: "The RPC endpoint failed or rate-limited the request.",
      hint: "Retry with backoff, rotate endpoints, or route through your proxy. Mobile networks are chaotic by default.",
    };
  }

  return {
    code: e.code ?? "STYX_UNKNOWN",
    title: "Transaction error",
    message: e.message || "Unknown error",
  };
}

export function throwWithExplanation(err: unknown): never {
  const ex = explainTxError(err);
  throw new StyxError(ex.code, ex.message, { details: { title: ex.title, hint: ex.hint }, cause: err });
}
