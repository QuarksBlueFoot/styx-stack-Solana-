/**
 * Golden path: PER (Private Ephemeral Rollup) rail selection.
 *
 * Styx treats PER as a modular rail behind a unified interface.
 * The actual operator runtime is optional and lives outside the SDK.
 *
 * This template shows the *shape* of integration; you supply the operator URL.
 */
import { createDefaultRailAdapters, selectRail, type PrivacyRailContext } from "@styx/tx-tooling";
import { PerOperatorClient } from "@styx/ephemeral-rollup-client";

export async function pickRailExample() {
  const per = new PerOperatorClient({ baseUrl: "https://YOUR_PER_OPERATOR" });

  const adapters = createDefaultRailAdapters({ per });

  const ctx: PrivacyRailContext = {
    network: "devnet",
    mobile: true,
    ctAvailable: false,
  };

  const chosen = selectRail(adapters, ctx, ["ephemeral-rollup", "encrypted-memo", "public"]);
  return chosen.rail;
}
