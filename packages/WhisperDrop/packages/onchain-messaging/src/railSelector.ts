import { PublicKey, Connection } from "@solana/web3.js";
import { toMemoString } from "@styx/memo";

export type OnchainMessageRail = "memo" | "pmp";
export type OnchainMessageRailPreference = "auto" | OnchainMessageRail;

export interface SelectRailArgs {
  connection: Connection;
  envelopeBytes: Uint8Array;
  prefer?: OnchainMessageRailPreference;
  /** Program id of the Styx Private Memo Program (PMP). Required for PMP rail. */
  pmpProgramId?: PublicKey;
  /** Conservative max memo character length to keep tx size sane on mobile. Default: 900. */
  memoMaxChars?: number;
  /** If true and prefer==="pmp", throw if PMP isn't available. Default: false. */
  requirePmp?: boolean;
}

export async function detectPmpAvailability(args: {
  connection: Connection;
  pmpProgramId: PublicKey;
}): Promise<boolean> {
  const info = await args.connection.getAccountInfo(args.pmpProgramId, { commitment: "confirmed" });
  return !!info && info.executable === true;
}

/**
 * Select which on-chain "message rail" to use for an already-encoded Styx Envelope.
 *
 * - memo rail: stores a base64url envelope string as a Memo instruction (simple + universal)
 * - pmp rail: posts raw bytes to Styx PMP program (better for larger payloads + avoids base64 bloat)
 *
 * Note: This is a UX/tooling decision, not a cryptographic privacy guarantee.
 */
export async function selectOnchainMessageRail(args: SelectRailArgs): Promise<OnchainMessageRail> {
  const prefer = args.prefer ?? "auto";
  const memoMaxChars = args.memoMaxChars ?? 900;

  if (prefer === "memo") return "memo";

  if (prefer === "pmp") {
    if (!args.pmpProgramId) {
      if (args.requirePmp) throw new Error("STYX_E_PMP_NO_PROGRAM_ID");
      return "memo";
    }
    const ok = await detectPmpAvailability({ connection: args.connection, pmpProgramId: args.pmpProgramId });
    if (!ok) {
      if (args.requirePmp) throw new Error("STYX_E_PMP_UNAVAILABLE");
      return "memo";
    }
    return "pmp";
  }

  // auto: decide by memo string size (base64url expansion) + PMP availability.
  const memoStr = toMemoString(args.envelopeBytes);
  if (memoStr.length <= memoMaxChars) return "memo";

  if (!args.pmpProgramId) return "memo";
  const ok = await detectPmpAvailability({ connection: args.connection, pmpProgramId: args.pmpProgramId });
  return ok ? "pmp" : "memo";
}
