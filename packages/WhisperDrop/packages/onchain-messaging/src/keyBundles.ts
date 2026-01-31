import nacl from "tweetnacl";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { bytesToB64, b64ToBytes, utf8ToBytes } from "@styx/crypto-core";
import type { SecureStorage } from "@styx/secure-storage";
import { MEMO_PROGRAM_ID } from "./memoEncryptedMessage";

const STORAGE_KEY = "privacy.x25519.keypair.v1";

export type KEY1Bundle = {
  v: "key1";
  wallet: string;         // base58
  x25519_pub_b64: string; // 32 bytes
  createdAt: number;      // ms
  tag?: string;
};

async function getOrCreateX25519(storage: SecureStorage): Promise<{ publicKey: Uint8Array; createdAt: number }> {
  const existing = await storage.getString(STORAGE_KEY);
  if (existing) {
    const parsed = JSON.parse(existing) as any;
    return { publicKey: b64ToBytes(parsed.public_b64), createdAt: parsed.createdAt };
  }
  const kp = nacl.box.keyPair();
  const rec = { v: 1, public_b64: bytesToB64(kp.publicKey), secret_b64: bytesToB64(kp.secretKey), createdAt: Date.now() };
  await storage.setString(STORAGE_KEY, JSON.stringify(rec));
  return { publicKey: kp.publicKey, createdAt: rec.createdAt };
}

export async function buildPublishKeyBundleMemo(args: {
  storage: SecureStorage;
  wallet: PublicKey;
  tag?: string;
}): Promise<{ instruction: TransactionInstruction; bundle: KEY1Bundle }> {
  const { publicKey, createdAt } = await getOrCreateX25519(args.storage);

  const bundle: KEY1Bundle = {
    v: "key1",
    wallet: args.wallet.toBase58(),
    x25519_pub_b64: bytesToB64(publicKey),
    createdAt,
    tag: args.tag
  };

  const ix = new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [{ pubkey: args.wallet, isSigner: true, isWritable: false }],
    data: Buffer.from(utf8ToBytes(JSON.stringify(bundle))),
  });

  return { instruction: ix, bundle };
}
