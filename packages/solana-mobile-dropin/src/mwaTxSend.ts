import {
  Connection,
  VersionedTransaction,
  Transaction,
  TransactionMessage,
} from "@solana/web3.js";

import type { WalletTxAdapter } from "@styx/wallet-adapters";
import { createWalletTxAdapter } from "@styx/wallet-adapters";

/**
 * Structural types matching Solana Mobile Wallet Adapter (MWA) style calls.
 * This package stays tooling-only: no hard dependency on a specific wallet adapter.
 */
export type MwaSignAndSend = (args: { transactions: Uint8Array[] }) => Promise<{ signatures: string[] }>;
export type MwaSignTransactions = (args: { transactions: Uint8Array[] }) => Promise<{ signedTransactions: Uint8Array[] }>;

export type TxSender = {
  signAndSendTransactions?: MwaSignAndSend;
  signTransactions?: MwaSignTransactions;
};

export type AnyTx = Transaction | VersionedTransaction;

export function serializeLegacyTx(tx: Transaction): Uint8Array {
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false });
}

export function serializeV0FromLegacy(args: {
  payer: Transaction["feePayer"];
  recentBlockhash: string;
  instructions: Transaction["instructions"];
}): Uint8Array {
  if (!args.payer) throw new Error("payer required");
  const msg = new TransactionMessage({
    payerKey: args.payer,
    recentBlockhash: args.recentBlockhash,
    instructions: args.instructions,
  }).compileToV0Message();
  const v0 = new VersionedTransaction(msg);
  return v0.serialize();
}

export function serializeAnyTx(tx: AnyTx): Uint8Array {
  return tx instanceof VersionedTransaction ? tx.serialize() : serializeLegacyTx(tx);
}

export function serializeMany(txs: AnyTx[]): Uint8Array[] {
  return txs.map(serializeAnyTx);
}

/**
 * Send one-or-many transactions.
 * Prefers wallet sign+send (best UX). Falls back to sign-only + app RPC send.
 */
export async function mwaSendTransactions(args: {
  sender: TxSender;
  connection: Connection;
  transactions: AnyTx[];
  commitment?: "processed" | "confirmed" | "finalized";
}): Promise<string[]> {
  const { sender, connection, transactions } = args;
  const commitment = args.commitment ?? "confirmed";
  const raw = serializeMany(transactions);

  if (sender.signAndSendTransactions) {
    const res = await sender.signAndSendTransactions({ transactions: raw });
    const sigs = res.signatures ?? [];
    // best-effort confirm
    await Promise.all(
      sigs.map((s) => connection.confirmTransaction(s, commitment).catch(() => {})),
    );
    return sigs;
  }

  if (!sender.signTransactions) {
    throw new Error("MWA wallet does not expose signAndSendTransactions or signTransactions");
  }

  const signed = await sender.signTransactions({ transactions: raw });
  const signedBytes = signed.signedTransactions ?? [];
  const sigs: string[] = [];

  for (const bytes of signedBytes) {
    const sig = await connection.sendRawTransaction(bytes, { skipPreflight: false });
    sigs.push(sig);
  }
  await Promise.all(sigs.map((s) => connection.confirmTransaction(s, commitment).catch(() => {})));
  return sigs;
}

/**
 * Higher-level sender that works with *wallet-adapter style* wallets (including @solana/wallet-adapter-mobile).
 *
 * Use this when you already have a wallet object that signs Transaction objects
 * (not the raw-bytes MWA protocol methods).
 */
export async function styxSendTransactions(args: {
  wallet: WalletTxAdapter | any;
  connection: Connection;
  transactions: AnyTx[];
  commitment?: "processed" | "confirmed" | "finalized";
  minContextSlot?: number;
}): Promise<string[]> {
  const { connection, transactions } = args;
  const commitment = args.commitment ?? "confirmed";

  // Normalize wallet shape.
  const adapter: WalletTxAdapter =
    args.wallet && typeof args.wallet.getPublicKey === "function" && typeof args.wallet.signTransactions === "function"
      ? (args.wallet as WalletTxAdapter)
      : createWalletTxAdapter(args.wallet);

  if (adapter.signAndSendTransactions) {
    const res = await adapter.signAndSendTransactions({
      transactions: transactions as any,
      minContextSlot: args.minContextSlot,
    });
    const sigs = res.signatures ?? [];
    await Promise.all(sigs.map((s) => connection.confirmTransaction(s, commitment).catch(() => {})));
    return sigs;
  }

  // sign-only + app send
  const signed = await adapter.signTransactions(transactions as any);
  const sigs: string[] = [];
  for (const tx of signed as any[]) {
    const bytes = serializeAnyTx(tx as AnyTx);
    const sig = await connection.sendRawTransaction(bytes, { skipPreflight: false });
    sigs.push(sig);
  }
  await Promise.all(sigs.map((s) => connection.confirmTransaction(s, commitment).catch(() => {})));
  return sigs;
}

/**
 * Sign one-or-many transactions (does not send).
 */
export async function mwaSignTransactions(args: {
  sender: TxSender;
  transactions: AnyTx[];
}): Promise<Uint8Array[]> {
  const { sender, transactions } = args;
  if (!sender.signTransactions) throw new Error("MWA signTransactions not available");
  const raw = serializeMany(transactions);
  const res = await sender.signTransactions({ transactions: raw });
  return res.signedTransactions ?? [];
}
