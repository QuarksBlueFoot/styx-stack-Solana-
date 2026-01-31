import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import nacl from "tweetnacl";
import type { Bytes } from "@styx/crypto-core";
import { sha256Bytes, utf8ToBytes } from "@styx/crypto-core";
import {
  encodeStyxEnvelope,
  styxMessageId,
  toMemoString,
  type StyxEnvelopeV1,
  pmf1BinaryEncrypt,
  pmf1MemoHashB64,
} from "@styx/memo";
import { fetchX25519FromRegistry } from "@styx/key-registry";

/**
 * SPL Memo Program id (stable, widely used).
 * Memo program logs UTF-8 bytes; data is public on-chain.
 */
export const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

/**
 * Build an encrypted-on-chain memo instruction using Styx Envelope v1.
 *
 * Privacy properties:
 * - Ciphertext is on-chain; metadata (sender fee payer, block time, tx graph) remains public.
 * - Use this as a *privacy tooling rail*, not as a promise of full anonymity.
 */
export async function buildEncryptedMemoInstruction(args: {
  connection: any; // Connection (typed loosely to avoid circular deps)
  fromWallet: PublicKey;
  toWallet: PublicKey;
  plaintext: string;
  contentType?: string;
  tag?: string;
}): Promise<{ instruction: TransactionInstruction; pmf1HashB64: string; envelope: StyxEnvelopeV1 }> {
  const recipientX: Bytes | null = await fetchX25519FromRegistry(args.connection, args.toWallet);
  if (!recipientX) throw new Error("STYX_E_RECIPIENT_NO_X25519");

  const senderX = nacl.box.keyPair();
  const pmf1 = pmf1BinaryEncrypt({
    senderX25519KeyPair: senderX,
    recipientX25519Pubkeys: [recipientX],
    plaintext: utf8ToBytes(args.plaintext),
    contentType: args.contentType ?? "text/plain; charset=utf-8",
    appTag: args.tag,
  });

  const env: StyxEnvelopeV1 = {
    v: 1,
    kind: "message",
    algo: "pmf1",
    id: styxMessageId(pmf1),
    toHash: sha256Bytes(args.toWallet.toBytes()),
    body: pmf1,
  };

  const memoStr = toMemoString(encodeStyxEnvelope(env));
  const utf8 = utf8ToBytes(memoStr);

  const ix = new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [{ pubkey: args.fromWallet, isSigner: true, isWritable: false }],
    data: Buffer.from(utf8),
  });

  return { instruction: ix, pmf1HashB64: pmf1MemoHashB64(pmf1), envelope: env };
}
