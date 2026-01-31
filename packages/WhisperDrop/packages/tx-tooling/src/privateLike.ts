import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import type { PrivacyRail, PrivacyRailContext } from "./privacyRails";
import { createDefaultRailAdapters } from "./railAdapters";
import { buildWithRailSelection } from "./railCapabilities";
import { applyPaddingPlan, getDefaultPaddingPlan, type PaddingLevel } from "./padding";
import { addComputeBudgetIxs, estimateTxMessageSize } from "./budget";
import { buildDecoyPack, type DecoyLevel } from "./decoys";
import { StyxError } from "./errors";
import type { PriorityPayment } from "@styx/onchain-messaging";
import type { PerOperatorClient } from "@styx/ephemeral-rollup-client";

/**
 * Build a "private-like" transaction in one call.
 *
 * This is the DX wedge: builders shouldn't have to understand rails, memo formats,
 * priority payments, or padding decisions on day 1.
 *
 * IMPORTANT:
 * - "encrypted-memo" and "private-memo-program" protect *content* by encryption, not metadata.
 * - "padding" is NOT cryptographic privacy (see padding.ts).
 * - CT and PER are optional rails and may be feature-gated/out-of-band.
 */
export async function buildPrivateLikeTransaction(args: {
  connection: Connection;
  ctx: PrivacyRailContext;

  senderWallet: PublicKey;
  recipientWallet: PublicKey;

  message: string;
  tag?: string;

  // prefer order; if not provided, use a sensible default
  preferredRails?: PrivacyRail[];

  // optional: send a "priority" payment before the memo/message
  payment?: PriorityPayment;

  // optional: add non-cryptographic padding (NOT cryptographic privacy)
  paddingLevel?: PaddingLevel;

  // optional: bounded, deterministic decoy pack (NOT cryptographic privacy)
  decoys?: DecoyLevel;

  // optional: compute budget hints for congested periods
  compute?: { units?: number; microLamports?: number };

  // optional: guardrail for message size (legacy message ~1232 bytes)
  maxMessageSize?: number;

  // optional infra: PER operator client
  per?: PerOperatorClient;

  // optional PMP custom program id
  pmpProgramId?: PublicKey;
}): Promise<{
  railUsed: PrivacyRail;
  tx?: Transaction;                // for memo/PMP/public paths
  perResult?: any;                 // for PER path (session/exec/settle)
  details: any;                    // rail-specific details (envelope, hashes, etc.)
  paddingApplied: boolean;
  decoysApplied: boolean;
  messageSize: number;
}> {
  const preferred: PrivacyRail[] = args.preferredRails ?? [
    "private-memo-program",
    "encrypted-memo",
    "confidential-tokens",
    "ephemeral-rollup",
    "public",
  ];

  const adapters = createDefaultRailAdapters({ per: args.per });

  // Build with chosen rail.
  const res = await buildWithRailSelection({
    adapters,
    ctx: args.ctx,
    preferred,
    buildArgs: (() => {
      // For messaging rails, buildArgs are uniform.
      return {
        connection: args.connection,
        senderWallet: args.senderWallet,
        recipientWallet: args.recipientWallet,
        plaintext: args.message,
        tag: args.tag,
        payment: args.payment,
        pmpProgramId: args.pmpProgramId,
      };
    })(),
  });

  // res is rail-specific; for our default messaging adapters it's { tx, envelopeType, details }
  const railUsed: PrivacyRail = (res?.envelopeType === "pmp1") ? "private-memo-program"
    : (res?.envelopeType === "mem1") ? "encrypted-memo"
    : (res?.session && res?.exec) ? "ephemeral-rollup"
    : "public";

  let tx: Transaction | undefined = res?.tx;
  let perResult: any | undefined = undefined;

  if (!tx && res?.session && res?.exec) {
    perResult = res;
  }

  // Optionally add compute budget ixs early.
  if (tx && (args.compute?.units || args.compute?.microLamports)) {
    addComputeBudgetIxs(tx, {
      units: args.compute?.units,
      microLamports: args.compute?.microLamports,
    });
  }

  // Apply bounded, deterministic decoys (if requested) BEFORE padding.
  let decoysApplied = false;
  if (tx && args.decoys && args.decoys !== "off") {
    const pack = buildDecoyPack({
      payer: args.senderWallet,
      level: args.decoys,
      seed: args.tag ?? "styx",
    });
    if (pack.instructions.length > 0) {
      // prepend decoys so the "real" message isn't always last
      tx.instructions = [...pack.instructions, ...tx.instructions];
      decoysApplied = true;
    }
  }

  // Apply padding if requested and we have a Transaction.
  let paddingApplied = false;
  if (tx && args.paddingLevel && args.paddingLevel !== "off") {
    const plan = getDefaultPaddingPlan(args.paddingLevel);
    tx = applyPaddingPlan({ tx, payer: args.senderWallet, plan, position: "interleave" });
    paddingApplied = true;
  }

  const messageSize = tx ? estimateTxMessageSize(tx) : 0;
  const maxSize = args.maxMessageSize ?? 1232;
  if (tx && messageSize > maxSize) {
    throw new StyxError(
      "STYX_TX_SIZE_EXCEEDED",
      `Transaction message too large (${messageSize} bytes > ${maxSize} bytes).`,
      { details: { messageSize, maxSize, paddingLevel: args.paddingLevel, decoys: args.decoys } }
    );
  }

  return {
    railUsed,
    tx,
    perResult,
    details: res?.details ?? res,
    paddingApplied,
    decoysApplied,
    messageSize
  };
}
