import nacl from "tweetnacl";
import { concatBytes, utf8ToBytes, type Bytes } from "@styx/crypto-core";
import { bytesToB64, b64ToBytes } from "@styx/crypto-core";

export type PMF1Envelope = {
  v: 1;
  senderX25519Pubkey: Bytes; // 32
  recipients: Array<{
    recipientX25519Pubkey: Bytes; // 32
    wrappedKeyB64: string;        // nonce(24) || box(contentKey)
  }>;
  nonceB64: string;        // secretbox nonce
  ciphertextB64: string;   // secretbox ciphertext
  aadB64?: string;         // optional AAD
  contentType?: string;
  appTag?: string;
  createdAt: number;
};

export function pmf1EncryptString(args: {
  senderX25519KeyPair: nacl.BoxKeyPair;
  recipientX25519Pubkeys: Bytes[];
  plaintext: string;
  aad?: Bytes;
  contentType?: string;
  appTag?: string;
}): PMF1Envelope {
  const contentKey = nacl.randomBytes(32);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);

  const pt = utf8ToBytes(args.plaintext);
  const ct = nacl.secretbox(pt, nonce, contentKey);

  const recipients = args.recipientX25519Pubkeys.map((rpk) => {
    const wrapNonce = nacl.randomBytes(nacl.box.nonceLength);
    const wrapped = nacl.box(contentKey, wrapNonce, rpk, args.senderX25519KeyPair.secretKey);
    const full = concatBytes(wrapNonce, wrapped);
    return { recipientX25519Pubkey: rpk, wrappedKeyB64: bytesToB64(full) };
  });

  return {
    v: 1,
    senderX25519Pubkey: args.senderX25519KeyPair.publicKey,
    recipients,
    nonceB64: bytesToB64(nonce),
    ciphertextB64: bytesToB64(ct),
    aadB64: args.aad ? bytesToB64(args.aad) : undefined,
    contentType: args.contentType,
    appTag: args.appTag,
    createdAt: Date.now(),
  };
}

export function pmf1DecryptToString(args: { recipientX25519SecretKey: Bytes; envelope: PMF1Envelope }): string {
  const nonce = b64ToBytes(args.envelope.nonceB64);
  const ct = b64ToBytes(args.envelope.ciphertextB64);

  for (const r of args.envelope.recipients) {
    const wrappedFull = b64ToBytes(r.wrappedKeyB64);
    const wrapNonce = wrappedFull.slice(0, nacl.box.nonceLength);
    const wrapped = wrappedFull.slice(nacl.box.nonceLength);

    const opened = nacl.box.open(
      wrapped,
      wrapNonce,
      args.envelope.senderX25519Pubkey,
      args.recipientX25519SecretKey
    );
    if (opened) {
      const pt = nacl.secretbox.open(ct, nonce, opened);
      if (!pt) throw new Error("PMF1 decrypt failed (bad ciphertext/tag)");
      return new TextDecoder().decode(pt);
    }
  }
  throw new Error("PMF1 decrypt failed (no matching recipient)");
}
