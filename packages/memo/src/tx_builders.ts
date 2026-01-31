import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import type { Bytes } from "@styx/crypto-core";
import { concatBytes, utf8ToBytes } from "@styx/crypto-core";

const PRIVATE_MEMO_PROGRAM_ID = new PublicKey("PrvMmo1111111111111111111111111111111111111");

function u8(n: number): Bytes {
  return new Uint8Array([n & 0xff]);
}

/**
 * Build a Private Memo Program instruction.
 * Data layout (original, stable, versioned):
 * - u8 variant = 1
 * - u16 pmf1_len_le
 * - pmf1 bytes
 */
export function buildPrivateMemoInstruction(args: {
  senderWallet: PublicKey;
  recipientWallet: PublicKey;
  pmf1: Bytes;
}): TransactionInstruction {
  const pmf1 = new Uint8Array(args.pmf1);
  const len = pmf1.length;
  if (len > 65535) throw new Error("pmf1 too large");

  const lenLe = new Uint8Array([len & 0xff, (len >> 8) & 0xff]);

  const data = concatBytes(u8(1), lenLe, pmf1);

  return new TransactionInstruction({
    programId: PRIVATE_MEMO_PROGRAM_ID,
    keys: [
      { pubkey: args.senderWallet, isSigner: true, isWritable: false },
      { pubkey: args.recipientWallet, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}
