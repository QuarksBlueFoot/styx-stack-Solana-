import { Transaction, VersionedTransaction } from "@solana/web3.js";

export type WalletPayloadEncoding = "base64" | "base64url" | "bytes";

/**
 * Create stable payloads for wallet signing APIs without leaking keys.
 * These helpers are intentionally simple and deterministic.
 */
export function txToBytes(tx: Transaction | VersionedTransaction): Uint8Array {
  if (tx instanceof VersionedTransaction) return tx.serialize();
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false });
}

export function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function txToWalletPayload(tx: Transaction | VersionedTransaction, encoding: WalletPayloadEncoding = "bytes"): Uint8Array | string {
  const bytes = txToBytes(tx);
  switch (encoding) {
    case "bytes":
      return bytes;
    case "base64":
      return bytesToBase64(bytes);
    case "base64url":
      return bytesToBase64Url(bytes);
  }
}
