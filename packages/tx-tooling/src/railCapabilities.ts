import { PublicKey } from "@solana/web3.js";
import { selectRail, type PrivacyRail, type PrivacyRailAdapter, type PrivacyRailContext } from "./privacyRails";
import { buildPriorityMessageTx, type PriorityPayment } from "@styx/onchain-messaging";
import { buildPmpPostMessageIx, PRIVATE_MEMO_PROGRAM_ID as DEFAULT_PMP_PROGRAM_ID } from "@styx/private-memo-program-client";

/**
 * Capability probe for privacy rails.
 *
 * Tooling-only: no backend assumptions. Meant to run in mobile wallets and web apps.
 * Note: "availability" here is best-effort; some rails require out-of-band infra (PER).
 */
export type RailCapability = {
  rail: PrivacyRail;
  available: boolean;
  reason?: string;
};

export async function railCapabilities(args: {
  connection: any; // web3.Connection (kept as any to avoid hard dep cycles)
  ctx: PrivacyRailContext;
  pmpProgramId?: PublicKey;
}): Promise<RailCapability[]> {
  const out: RailCapability[] = [];

  // public rail always available
  out.push({ rail: "public", available: true });

  // encrypted memo rail: Memo program is stable on Solana; if you can send txs, it's usable
  out.push({ rail: "encrypted-memo", available: true });

  // private memo program: check program account exists (or allow caller to skip this)
  try {
    const pid = args.pmpProgramId ?? DEFAULT_PMP_PROGRAM_ID;
    const info = await args.connection.getAccountInfo(pid);
    out.push({
      rail: "private-memo-program",
      available: !!info,
      reason: info ? undefined : "PMP program not deployed on this cluster"
    });
  } catch (_e) {
    out.push({ rail: "private-memo-program", available: false, reason: "RPC error checking PMP" });
  }

  // confidential tokens: feature-gated; caller supplies ctx.ctAvailable
  out.push({
    rail: "confidential-tokens",
    available: !!args.ctx.ctAvailable,
    reason: args.ctx.ctAvailable ? undefined : "CT not available / feature-gated"
  });

  // ephemeral rollup: requires operator (out-of-band); SDK treats this as optional rail
  out.push({
    rail: "ephemeral-rollup",
    available: false,
    reason: "Requires Styx PER operator (out-of-band)"
  });

  return out;
}

/**
 * Concrete rail adapters for messaging use-cases.
 * Keeps adapter surface tiny and composable.
 *
 * NOTE: availability checks for PMP are done via railCapabilities(). Adapters are kept pure.
 */
export function createMessagingRailAdapters(): PrivacyRailAdapter[] {
  const memoAdapter: PrivacyRailAdapter = {
    rail: "encrypted-memo",
    isAvailable: (_ctx) => true,
    build: async (args: {
      connection: any;
      senderWallet: PublicKey;
      recipientWallet: PublicKey;
      plaintext: string;
      tag?: string;
      payment?: PriorityPayment;
    }) => {
      return buildPriorityMessageTx({
        connection: args.connection,
        senderWallet: args.senderWallet,
        recipientWallet: args.recipientWallet,
        plaintext: args.plaintext,
        tag: args.tag,
        payment: args.payment,
        channel: "memo"
      });
    }
  };

  const pmpAdapter: PrivacyRailAdapter = {
    rail: "private-memo-program",
    isAvailable: (_ctx) => true,
    build: async (args: {
      connection: any;
      senderWallet: PublicKey;
      recipientWallet: PublicKey;
      plaintext: string;
      tag?: string;
      payment?: PriorityPayment;
      pmpProgramId?: PublicKey;
    }) => {
      // build base message tx using the same helper (it already supports PMP)
      const res = await buildPriorityMessageTx({
        connection: args.connection,
        senderWallet: args.senderWallet,
        recipientWallet: args.recipientWallet,
        plaintext: args.plaintext,
        tag: args.tag,
        payment: args.payment,
        channel: "pmp"
      });

      // ensure PMP uses correct programId if caller wants a custom deployment
      // (buildPriorityMessageTx defaults to SDK constant; this path allows overriding)
      if (args.pmpProgramId && args.pmpProgramId.toBase58() !== DEFAULT_PMP_PROGRAM_ID.toBase58()) {
        // Replace the PMP instruction with one targeting the provided program id.
        // We keep this simple: locate the PMP instruction by programId match, then rebuild.
        const rebuilt = await buildPmpPostMessageIx({
          sender: args.senderWallet,
          programId: args.pmpProgramId,
          payload: res.details?.pmf1Bytes ?? res.details?.payloadBytes ?? new Uint8Array(0),
        });

        // naive replace: append rebuilt instruction (callers who need exact ordering can build manually)
        res.tx.add(rebuilt);
      }

      return res;
    }
  };

  return [pmpAdapter, memoAdapter];
}

export async function buildWithRailSelection(args: {
  adapters: PrivacyRailAdapter[];
  ctx: PrivacyRailContext;
  preferred: PrivacyRail[];
  buildArgs: any;
}): Promise<any> {
  const adapter = selectRail(args.adapters, args.ctx, args.preferred);
  return adapter.build(args.buildArgs);
}
