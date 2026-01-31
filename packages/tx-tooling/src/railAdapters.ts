import { PublicKey } from "@solana/web3.js";
import type { PrivacyRailAdapter, PrivacyRailContext } from "./privacyRails";
import { createMessagingRailAdapters } from "./railCapabilities";
import { planConfidentialTransfer } from "@styx/confidential-tokens";
import type { PerOperatorClient } from "@styx/ephemeral-rollup-client";

/**
 * Creates a default set of rail adapters.
 * Tooling-first: apps can pass only the adapters they want.
 */
export function createDefaultRailAdapters(args?: { per?: PerOperatorClient }): PrivacyRailAdapter[] {
  const adapters: PrivacyRailAdapter[] = [];

  // Messaging rails (memo + PMP)
  adapters.push(...createMessagingRailAdapters());

  // Confidential tokens rail (Token-2022 CT)
  adapters.push({
    rail: "confidential-tokens",
    isAvailable: (ctx: PrivacyRailContext) => !!ctx.ctAvailable,
    build: async (buildArgs: any) => {
      // buildArgs is intentionally flexible; this helper returns a plan
      return planConfidentialTransfer(buildArgs);
    }
  });

  // Ephemeral rollup rail (PER operator required)
  adapters.push({
    rail: "ephemeral-rollup",
    isAvailable: (_ctx: PrivacyRailContext) => !!args?.per,
    build: async (buildArgs: { perRequestB64: string; payer: PublicKey; accounts: PublicKey[] }) => {
      if (!args?.per) throw new Error("PER operator client not configured");
      const session = await args.per.createSession({ payer: buildArgs.payer, accounts: buildArgs.accounts });
      const exec = await args.per.executePrivate({
        sessionId: session.sessionId,
        encryptedRequestB64: buildArgs.perRequestB64
      });
      const settle = await args.per.settle({ sessionId: session.sessionId });
      return { session, exec, settle };
    }
  });

  return adapters;
}
