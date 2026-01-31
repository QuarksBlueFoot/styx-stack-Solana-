import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import type { Bytes } from "@styx/crypto-core";
import { concatBytes, utf8ToBytes, bytesToB64Url, varBytesEncode, varBytesDecode } from "@styx/crypto-core";
import { encodeStyxEnvelope, decodeStyxEnvelope, styxMessageId, toMemoString, fromMemoString } from "@styx/memo";
import { MEMO_PROGRAM_ID } from "./memoEncryptedMessage";

/**
 * Reveal/Audit flows (tooling-only)
 *
 * A reveal is an on-chain friendly proof ...
 */

export type RevealType = "recipient" | "contentKey" | "app";
const RT: Record<RevealType, number> = { recipient: 1, contentKey: 2, app: 3 };
const RTI: Record<number, RevealType> = { 1: "recipient", 2: "contentKey", 3: "app" };

const RVL1 = new Uint8Array([0x52, 0x56, 0x4c, 0x31]); // "RVL1"

export type RevealPayload = {
  t: RevealType;
  /** 32-byte id of the target message */
  msgId: Bytes;
  /** arbitrary bytes (e.g. recipient pubkey, symmetric key, ... ) */
  data: Bytes;
};

export function encodeRevealPayload(p: RevealPayload): Bytes {
  if (p.msgId.length !== 32) throw new Error("encodeRevealPayload: msgId must be 32 bytes");
  const type = RT[p.t];
  if (!type) throw new Error("encodeRevealPayload: unknown type");
  return concatBytes(RVL1, new Uint8Array([1, type]), p.msgId, varBytesEncode(p.data));
}

export function decodeRevealPayload(b: Bytes): RevealPayload {
  if (b.length < 4 + 2 + 32) throw new Error("decodeRevealPayload: too short");
  if (b[0] !== RVL1[0] || b[1] !== RVL1[1] || b[2] !== RVL1[2] || b[3] !== RVL1[3]) throw new Error("decodeRevealPayload: bad magic");
  const v = b[4];
  if (v !== 1) throw new Error(`decodeRevealPayload: unsupported v ${v}`);
  const t = RTI[b[5]];
  if (!t) throw new Error("decodeRevealPayload: unknown type");
  const msgId = b.slice(6, 38);
  const { value: data } = varBytesDecode(b, 38);
  return { t, msgId, data };
}

/**
 * Prepare a reveal envelope.
 *
 * Signing:
 * - In wallets, you'll typically sign `bytesToSign` with the wallet
 * - Then call `attachSignature` to embed the signature in the envelope
 */
export function prepareRevealEnvelope(args: {
  msgId: Bytes;
  revealType: RevealType;
  data: Bytes;
  signerPubkey?: Bytes; // optional ed25519 pubkey
}): { envelopeBytesToSign: Bytes; envelopeUnsigned: any; memoString: string } {
  const payload = encodeRevealPayload({ t: args.revealType, msgId: args.msgId, data: args.data });

  const env = {
    v: 1 as const,
    kind: "reveal" as const,
    algo: "pmf1" as const,
    id: styxMessageId(payload),
    ...(args.signerPubkey ? { from: args.signerPubkey } : {}),
    body: payload,
  };

  const bytesToSign = encodeStyxEnvelope(env);
  const memoString = toMemoString(bytesToSign); // without signature: still parsable
  return { envelopeBytesToSign: bytesToSign, envelopeUnsigned: env, memoString };
}

export function attachSignature(unsignedEnv: any, signature: Bytes): { envelopeBytes: Bytes; memoString: string } {
  const env = { ...unsignedEnv, sig: signature };
  const bytes = encodeStyxEnvelope(env);
  return { envelopeBytes: bytes, memoString: toMemoString(bytes) };
}

/**
 * Build an on-chain memo instruction carrying a reveal envelope.
 * Builders can choose to also send a priority tip transfer in the same tx.
 */
export function buildRevealMemoInstruction(args: {
  signer: PublicKey;
  memoString: string;
}): TransactionInstruction {
  const data = utf8ToBytes(args.memoString);
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [{ pubkey: args.signer, isSigner: true, isWritable: false }],
    data: Buffer.from(data),
  });
}

/**
 * Decode a reveal memo if it looks like Styx.
 */
export function tryDecodeRevealMemo(memo: string): { env: any; reveal: RevealPayload } | null {
  const envBytes = fromMemoString(memo);
  if (!envBytes) return null;
  try {
    const env = decodeStyxEnvelope(envBytes);
    if (env.kind !== "reveal") return null;
    const reveal = decodeRevealPayload(env.body);
    return { env, reveal };
  } catch {
    return null;
  }
}

export function revealSummary(reveal: RevealPayload): string {
  return `reveal:${reveal.t} msg=${bytesToB64Url(reveal.msgId)} dataLen=${reveal.data.length}`;
}
