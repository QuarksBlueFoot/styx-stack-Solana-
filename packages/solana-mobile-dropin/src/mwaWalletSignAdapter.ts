import { PublicKey } from "@solana/web3.js";
import type { WalletSignAdapter } from "@styx/wallet-adapters";
import type { Bytes } from "@styx/crypto-core";

export function walletAdapterToPrivacySigner(wallet: {
  publicKey: PublicKey | null;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
}): WalletSignAdapter {
  return {
    getPublicKey: () => wallet.publicKey ?? null,
    signMessage: async (message: Bytes) => {
      if (!wallet.signMessage) throw new Error("Wallet does not expose signMessage()");
      const sig = await wallet.signMessage(message);
      return new Uint8Array(sig);
    },
  };
}
