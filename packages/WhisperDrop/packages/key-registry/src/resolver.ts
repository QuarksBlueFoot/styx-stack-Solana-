import type { Bytes } from "@styx/crypto-core";

export interface KeyResolver {
  resolveX25519(walletPubkey: Bytes): Promise<Bytes | null>;
}
