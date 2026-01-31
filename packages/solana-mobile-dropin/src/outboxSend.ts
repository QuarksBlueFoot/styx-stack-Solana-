import type { Connection, Transaction } from "@solana/web3.js";
import { txToBytes, bytesToBase64 } from "@styx/tx-tooling";
import type { OutboxStore } from "@styx/mobile-outbox";
import { mwaSendTransactions } from "./mwaTxSend";

/**
 * Enqueue-then-send helper designed for mobile reliability:
 * - Always stores the payload locally before attempting network send.
 * - Marks status + signature on success.
 * - Leaves the record pending/failed for the app to retry later.
 *
 * Tooling-only: you provide the MWA sender + connection.
 */
export async function mwaSendTransactionsWithOutbox(args: {
  sender: any; // MWA wallet interface (capability detected in mwaSendTransactions)
  connection: Connection;
  outbox: OutboxStore;
  transactions: Transaction[];
  meta?: { kind?: string; to?: string; threadKey?: string };
}): Promise<{ signatures: string[]; outboxIds: string[] }> {
  const { sender, connection, outbox, transactions, meta } = args;

  const outboxIds: string[] = [];
  // enqueue each tx
  for (const tx of transactions) {
    const bytes = txToBytes(tx);
    const payloadB64 = bytesToBase64(bytes);
    const rec = await outbox.enqueue(payloadB64, { kind: meta?.kind ?? "tx", to: meta?.to, threadKey: meta?.threadKey });
    outboxIds.push(rec.id);
  }

  try {
    const signatures = await mwaSendTransactions({ sender, connection, transactions });
    // mark sent
    for (let i = 0; i < outboxIds.length; i++) {
      await outbox.update(outboxIds[i], { status: "sent", meta: { signature: signatures[i] } });
    }
    return { signatures, outboxIds };
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : String(e);
    for (const id of outboxIds) {
      await outbox.update(id, { status: "failed", meta: { lastError: msg } });
    }
    throw e;
  }
}
