import type { PublicKey } from "@solana/web3.js";
import type { Bytes } from "@styx/crypto-core";
import { verifyEd25519 } from "@styx/crypto-core";

/**
 * Minimal signer shape used by privacy tooling.
 * Compatible with Solana Mobile wallet-adapter via @styx/solana-mobile-dropin.
 */
export interface WalletSignAdapter {
  getPublicKey(): PublicKey | null;
  signMessage(message: Bytes): Promise<Bytes>;
}

/**
 * Minimal transaction signer/sender interface used by Styx mobile + app-kit tooling.
 *
 * This is intentionally small and "shape compatible" with:
 * - Solana Mobile Wallet Adapter (MWA)
 * - Wallet Adapter style wallets (web)
 * - Custom in-app signers
 */
export interface WalletTxAdapter {
  getPublicKey(): PublicKey | null;

  /** Sign one or more transactions (legacy or v0). */
  signTransactions(transactions: import("@solana/web3.js").Transaction[]): Promise<
    import("@solana/web3.js").Transaction[]
  >;

  /**
   * Optional: some wallets can sign+send in one call.
   * If not provided, Styx will fall back to `signTransactions` + RPC send.
   */
  signAndSendTransactions?: (args: {
    transactions: import("@solana/web3.js").Transaction[];
    minContextSlot?: number;
  }) => Promise<{ signatures: string[] }>;
}

/**
 * Create a WalletTxAdapter from a "sender" object (MWA or wallet-adapter-like).
 *
 * Clean-room note: this is a generic adapter based on public method shapes, not copied from any SDK.
 */
export function createWalletTxAdapter(sender: any): WalletTxAdapter {
  if (!sender) throw new Error("STYX_WALLET_ADAPTER_MISSING: sender is required");

  const getPublicKey = () => {
    // MWA often exposes `publicKey`, wallet-adapter exposes `publicKey`, some expose `getPublicKey()`.
    if (typeof sender.getPublicKey === "function") return sender.getPublicKey();
    return sender.publicKey ?? null;
  };

  const signTransactions = async (transactions: import("@solana/web3.js").Transaction[]) => {
    if (typeof sender.signTransactions === "function") {
      return await sender.signTransactions(transactions);
    }
    if (typeof sender.signTransaction === "function") {
      const out: import("@solana/web3.js").Transaction[] = [];
      for (const tx of transactions) out.push(await sender.signTransaction(tx));
      return out;
    }
    throw new Error("STYX_WALLET_SIGN_TX_UNSUPPORTED: wallet cannot sign transactions");
  };

  const signAndSendTransactions =
    typeof sender.signAndSendTransactions === "function"
      ? async (args: { transactions: import("@solana/web3.js").Transaction[]; minContextSlot?: number }) => {
          const res = await sender.signAndSendTransactions(args);
          // Normalize return shapes.
          if (Array.isArray(res)) return { signatures: res };
          if (res?.signatures) return { signatures: res.signatures };
          if (res?.signature) return { signatures: [res.signature] };
          throw new Error("STYX_WALLET_SIGN_SEND_BAD_SHAPE: unexpected return");
        }
      : undefined;

  return {
    getPublicKey,
    signTransactions,
    signAndSendTransactions,
  };
}

/** Verify signature for a wallet public key. */
export async function verifyWalletSignature(args: {
  walletPubkeyBytes: Bytes;
  message: Bytes;
  signature: Bytes;
}): Promise<boolean> {
  return await verifyEd25519(
    args.signature,
    args.message,
    args.walletPubkeyBytes
  );
}
