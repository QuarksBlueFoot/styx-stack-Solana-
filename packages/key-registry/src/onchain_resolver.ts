import { Connection, PublicKey } from "@solana/web3.js";
import { b64ToBytes, type Bytes } from "@styx/crypto-core";
import { KEY_REGISTRY_PROGRAM_ID, deriveKeyRegistryPda } from "./onchain";

/**
 * Reads the on-chain key registry record.
 * Account layout (Anchor-ish but kept minimal):
 * - 8 bytes discriminator (ignored)
 * - u8 v
 * - Pubkey wallet
 * - [u8;32] x25519_pubkey
 */
export async function fetchX25519FromRegistry(
  connection: Connection,
  wallet: PublicKey
): Promise<Bytes | null> {
  const pda = deriveKeyRegistryPda(wallet);
  const ai = await connection.getAccountInfo(pda, "confirmed");
  if (!ai) return null;

  const data = ai.data;
  if (data.length < 8 + 1 + 32 + 32) return null;

  const xStart = 8 + 1 + 32;
  return new Uint8Array(data.slice(xStart, xStart + 32));
}
