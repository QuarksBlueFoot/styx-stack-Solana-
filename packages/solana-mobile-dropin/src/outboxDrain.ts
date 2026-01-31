import type { Connection, Transaction } from "@solana/web3.js";
import { Transaction as Web3Transaction } from "@solana/web3.js";
import type { OutboxStore } from "@styx/mobile-outbox";
import { drainOutbox } from "@styx/mobile-outbox";
import { mwaSendTransactions } from "./mwaTxSend";

/**
 * Drain pending outbox items by reconstituting transactions and sending via MWA wallet.
 * Tooling-only: caller provides sender + connection.
 */
export async function mwaDrainOutbox(args: {
  sender: any;
  connection: Connection;
  outbox: OutboxStore;
  limit?: number;
  concurrency?: number;
  isOnline?: () => Promise<boolean> | boolean;
}): Promise<{ attempted: number; sent: number; failed: number; confirmed: number; skippedOffline: number }> {
  const { sender, connection, outbox, limit, concurrency, isOnline } = args;

  return drainOutbox(
    outbox,
    async (payloadBytes) => {
      const tx = Web3Transaction.from(payloadBytes) as unknown as Transaction;
      const sigs = await mwaSendTransactions({ sender, connection, transactions: [tx] });
      // mwaSendTransactions confirms best-effort; we mark confirmedAt now for UX purposes
      return { signature: sigs[0], confirmedAt: Date.now() };
    },
    { limit, concurrency, isOnline }
  );
}

/**
 * Confirm sent outbox items (no wallet required). Marks confirmedAt/confirmedSlot when finalized/confirmed.
 */
export async function confirmOutboxSent(args: {
  connection: Connection;
  outbox: OutboxStore;
  commitment?: "processed" | "confirmed" | "finalized";
  limit?: number;
}): Promise<{ checked: number; updated: number }> {
  const { connection, outbox, commitment = "confirmed", limit = 50 } = args;
  const sent = (await outbox.list("sent")).filter((r) => r.meta?.signature && !r.meta?.confirmedAt).slice(0, limit);

  const sigs = sent.map((r) => r.meta!.signature!);
  if (sigs.length === 0) return { checked: 0, updated: 0 };

  const statuses = await connection.getSignatureStatuses(sigs, { searchTransactionHistory: true });
  let updated = 0;

  for (let i = 0; i < sent.length; i++) {
    const st = statuses.value[i];
    if (!st) continue;
    const ok =
      (commitment === "processed" && st.confirmationStatus) ||
      (commitment === "confirmed" && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized")) ||
      (commitment === "finalized" && st.confirmationStatus === "finalized");

    if (ok) {
      await outbox.update(sent[i].id, {
        status: "sent",
        meta: { ...(sent[i].meta ?? {}), confirmedAt: Date.now(), confirmedSlot: st.slot ?? undefined }
      });
      updated += 1;
    }
  }

  return { checked: sent.length, updated };
}
