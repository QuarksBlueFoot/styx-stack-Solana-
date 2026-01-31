import type { Connection } from "@solana/web3.js";
import type { StyxContext } from "@styx/styx-context";
import { mwaDrainOutbox, confirmOutboxSent } from "@styx/solana-mobile-dropin";

/**
 * Call this on:
 *  - app resume
 *  - connectivity regained
 *
 * This is tooling-only; you decide scheduling. It improves reliability on mobile.
 */
export async function styxBestEffortOutboxTick(params: {
  ctx: StyxContext;
  connection: Connection;
  sender: any; // MWA sender / wallet sender object used by styx mobile drop-in
}) {
  const { ctx, connection, sender } = params;
  if (!ctx.outbox) return;

  // 1) Try to send any pending txs via wallet
  await mwaDrainOutbox({
    sender,
    connection,
    outbox: ctx.outbox,
    max: 8,
  });

  // 2) Confirm sent signatures and mark confirmedAt
  await confirmOutboxSent({
    connection,
    outbox: ctx.outbox,
    max: 25,
  });
}
