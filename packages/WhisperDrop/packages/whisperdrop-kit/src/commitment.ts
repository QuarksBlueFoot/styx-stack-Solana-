import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import type { WhisperDropCommitmentV1 } from "./types";

/**
 * Public memo format:
 * whisperdrop:commitment:v1:<manifestHashB64Url>:<merkleRootB64Url>
 */
export function buildCommitmentMemoString(manifestHashB64Url: string, merkleRootB64Url: string): string {
  if (!manifestHashB64Url) throw new Error("manifestHashB64Url is required");
  if (!merkleRootB64Url) throw new Error("merkleRootB64Url is required");
  return `whisperdrop:commitment:v1:${manifestHashB64Url}:${merkleRootB64Url}`;
}

export function commitmentObject(manifestHashB64Url: string, merkleRootB64Url: string): WhisperDropCommitmentV1 {
  return {
    version: "whisperdrop.commitment.v1",
    manifestHashB64Url,
    merkleRootB64Url
  };
}

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export function buildCommitmentMemoIx(
  manifestHashB64Url: string,
  merkleRootB64Url: string,
  signer?: PublicKey
): TransactionInstruction {
  const memo = buildCommitmentMemoString(manifestHashB64Url, merkleRootB64Url);
  const keys = signer ? [{ pubkey: signer, isSigner: true, isWritable: false }] : [];
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys,
    data: Buffer.from(memo, "utf8")
  });
}
