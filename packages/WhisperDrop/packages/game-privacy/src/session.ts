import { sha256Bytes } from "@styx/crypto-core";
import type { Bytes } from "@styx/crypto-core";
import { getPublicKey } from "@noble/ed25519";

export function deriveSessionSeed(params: { signature: Bytes; context?: string }): Uint8Array {
  const ctx = params.context ?? "styx-game-session-v1";
  const prefix = new TextEncoder().encode(ctx + "|");
  const input = new Uint8Array(prefix.length + params.signature.length);
  input.set(prefix, 0);
  input.set(params.signature, prefix.length);
  const h = sha256Bytes(input);
  return new Uint8Array(h.slice(0, 32));
}

export async function deriveSessionKeypairFromSeed(seed32: Uint8Array): Promise<{ secretKey: Uint8Array; publicKey: Uint8Array }> {
  if (seed32.length !== 32) throw new Error("STYX_GAME_SEED_LEN: expected 32 bytes");
  const pk = await getPublicKey(seed32);
  return { secretKey: seed32, publicKey: new Uint8Array(pk) };
}
