import * as ed from "@noble/ed25519";
import type { Bytes } from "./bytes";

export async function signEd25519(message: Bytes, privateKey: Bytes): Promise<Bytes> {
  return await ed.sign(message, privateKey);
}

export async function verifyEd25519(signature: Bytes, message: Bytes, publicKey: Bytes): Promise<boolean> {
  try {
    return await ed.verify(signature, message, publicKey);
  } catch {
    return false;
  }
}
