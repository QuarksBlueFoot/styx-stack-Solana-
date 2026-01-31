import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import type { Bytes } from "@styx/crypto-core";

/**
 * PMP: Private Memo Program (reference)
 *
 * Program is stateless. It stores the PMF1 bytes in instruction data, and emits an event/log containing:
 * - memo_hash = sha256(pmf1_bytes)
 * - optional flags
 *
 * Program ID Configuration:
 * - Devnet: Fke7EgU2SrZ3tx6yaUv2kdq45pdwYpVjbxjfRipkPjSE (deployed)
 * - For mainnet: Set STYX_PMP_PROGRAM_ID environment variable or deploy and update
 */
const DEVNET_PROGRAM_ID = "Fke7EgU2SrZ3tx6yaUv2kdq45pdwYpVjbxjfRipkPjSE";
export const PRIVATE_MEMO_PROGRAM_ID = new PublicKey(
  process.env.STYX_PMP_PROGRAM_ID || DEVNET_PROGRAM_ID
);

export function buildPrivateMemoIx(args: { pmf1Bytes: Bytes }): TransactionInstruction {
  return new TransactionInstruction({
    keys: [],
    programId: PRIVATE_MEMO_PROGRAM_ID,
    data: Buffer.from(args.pmf1Bytes),
  });
}
