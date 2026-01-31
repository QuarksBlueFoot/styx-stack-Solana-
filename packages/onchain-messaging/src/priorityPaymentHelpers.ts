import { PublicKey } from "@solana/web3.js";
import { getPriorityProfile, type PriorityProfile } from "./priorityProfiles";
import type { PriorityPayment } from "./priority";

/**
 * Opinionated helpers so apps don't bikeshed fees.
 * These are *defaults*; callers can override.
 */

export function prioritySolPayment(level: PriorityProfile["name"], to?: PublicKey): PriorityPayment {
  const p = getPriorityProfile(level);
  return { kind: "sol", lamports: p.solLamports, to };
}

/**
 * Priority payment using an SPL token (e.g., USDC).
 * Caller provides ATA routing; Styx intentionally avoids assuming an ATA program.
 *
 * NOTE: amountBaseUnits is in the token's base units (e.g., 6 decimals for USDC mint).
 */
export function prioritySplPayment(args: {
  amountBaseUnits: bigint;
  sourceAta: PublicKey;
  destAta: PublicKey;
  owner: PublicKey;
  tokenProgramId?: PublicKey; // can be Token-2022
}): PriorityPayment {
  return {
    kind: "spl",
    amountBaseUnits: args.amountBaseUnits,
    sourceAta: args.sourceAta,
    destAta: args.destAta,
    owner: args.owner,
    tokenProgramId: args.tokenProgramId,
  };
}
