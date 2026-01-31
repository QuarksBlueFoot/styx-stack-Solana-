import nacl from "tweetnacl";
import { bytesToB64, b64ToBytes } from "@styx/crypto-core";
import type { SecureStorage } from "@styx/secure-storage";

/**
 * Stores an X25519 keypair in SecureStorage.
 * - secret key never leaves device storage unless caller explicitly exports.
 */
const STORAGE_KEY = "privacy.x25519.keypair.v1";

export type StoredX25519Keypair = {
  v: 1;
  public_b64: string;
  secret_b64: string;
  createdAt: number;
};

export async function getOrCreateX25519(storage: SecureStorage): Promise<{
  publicKey: Uint8Array;
  secretKey: Uint8Array;
  createdAt: number;
}> {
  const existing = await storage.getString(STORAGE_KEY);
  if (existing) {
    const parsed = JSON.parse(existing) as StoredX25519Keypair;
    return {
      publicKey: b64ToBytes(parsed.public_b64),
      secretKey: b64ToBytes(parsed.secret_b64),
      createdAt: parsed.createdAt,
    };
  }

  const kp = nacl.box.keyPair(); // X25519
  const rec: StoredX25519Keypair = {
    v: 1,
    public_b64: bytesToB64(kp.publicKey),
    secret_b64: bytesToB64(kp.secretKey),
    createdAt: Date.now(),
  };
  await storage.setString(STORAGE_KEY, JSON.stringify(rec));
  return { publicKey: kp.publicKey, secretKey: kp.secretKey, createdAt: rec.createdAt };
}
