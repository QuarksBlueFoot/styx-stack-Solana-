import { sha256Bytes, bytesToB64, utf8ToBytes } from "@styx/crypto-core";
import type { AE1, RC1 } from "./types";
import type { Bytes } from "@styx/crypto-core";

export function ae1CanonicalBytes(ae1: AE1): Bytes {
  const stable = { v: ae1.v, ciphertext_b64: ae1.ciphertext_b64, tag: ae1.tag ?? undefined, createdAt: ae1.createdAt };
  return utf8ToBytes(JSON.stringify(stable));
}

export function ae1HashB64(ae1: AE1): string {
  return bytesToB64(sha256Bytes(ae1CanonicalBytes(ae1)));
}

export function rc1FromAction(ae1: AE1, epoch_id: string, index: number): RC1 {
  return { v: "rc1", action_hash_b64: ae1HashB64(ae1), epoch_id, index };
}
