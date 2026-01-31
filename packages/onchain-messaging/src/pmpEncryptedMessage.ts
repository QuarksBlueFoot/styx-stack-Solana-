import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import nacl from "tweetnacl";
import type { Bytes } from "@styx/crypto-core";
import { sha256Bytes, utf8ToBytes, bytesToB64Url } from "@styx/crypto-core";
import { encodeStyxEnvelope, styxMessageId, type StyxEnvelopeV1, pmf1BinaryEncrypt } from "@styx/memo";
import { fetchX25519FromRegistry } from "@styx/key-registry";
import { buildPmpPostMessageIx } from "@styx/private-memo-program-client";

/**
 * Build a PMP (Styx Private Memo Program) instruction that posts an encrypted Styx Envelope v1 payload.
 *
 * PMP advantages vs Memo:
 * - avoids base64url expansion (raw bytes), so larger envelopes fit better
 * - consistent, versioned binary post format (PMP1)
 *
 * Note: On-chain privacy is still bounded by Solana's public ledger properties.
 */
export async function buildPmpEncryptedEnvelopeIx(args: {
  connection: any; // Connection typed loosely
  sender: PublicKey;
  /** Optional intended recipient pubkey for inbox filtering (metadata is public). */
  recipient?: PublicKey;
  /** Recipient X25519 key lookup owner (often equals recipient wallet). */
  recipientKeyOwner: PublicKey;
  /** Plaintext bytes to encrypt (UTF-8 message, JSON blob, attachment pointer, etc.) */
  plaintext: Bytes;
  /** Optional app-defined context label */
  context?: string;
}): Promise<{ ix: TransactionInstruction; envelope: StyxEnvelopeV1; messageId: string }> {
  const recipientX: Bytes | null = await fetchX25519FromRegistry(args.connection, args.recipientKeyOwner);
  if (!recipientX) throw new Error("STYX_E_RECIPIENT_NO_X25519");

  const senderX = nacl.box.keyPair();
  const pmf1 = pmf1BinaryEncrypt({
    senderX25519KeyPair: senderX,
    recipientX25519Pubkeys: [recipientX],
    plaintext: new Uint8Array(args.plaintext),
    contentType: "application/octet-stream",
    appTag: args.context,
  });

  const envelope: StyxEnvelopeV1 = {
    v: 1,
    kind: "message",
    algo: "pmf1",
    id: styxMessageId(pmf1),
    toHash: sha256Bytes(args.recipientKeyOwner.toBytes()),
    body: pmf1,
  };

  const payloadBytes = encodeStyxEnvelope(envelope);
  const ix = buildPmpPostMessageIx({
    sender: args.sender,
    recipient: args.recipient,
    payload: payloadBytes,
  });

  return { ix, envelope, messageId: bytesToB64Url(envelope.id) };
}

/**
 * Convenience for plaintext string messages.
 */
export async function buildPmpEncryptedTextIx(args: {
  connection: any;
  sender: PublicKey;
  recipient?: PublicKey;
  recipientKeyOwner: PublicKey;
  text: string;
  context?: string;
}) {
  return buildPmpEncryptedEnvelopeIx({
    connection: args.connection,
    sender: args.sender,
    recipient: args.recipient,
    recipientKeyOwner: args.recipientKeyOwner,
    plaintext: utf8ToBytes(args.text),
    context: args.context,
  });
}
