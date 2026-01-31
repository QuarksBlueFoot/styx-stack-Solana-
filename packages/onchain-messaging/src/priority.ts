import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import type { Bytes } from "@styx/crypto-core";
import { concatBytes } from "@styx/crypto-core";
import { buildEncryptedMemoInstruction } from "./memoEncryptedMessage";
import { buildPmpPostMessageIx, PRIVATE_MEMO_PROGRAM_ID as PMP_PROGRAM_ID } from "@styx/private-memo-program-client";

/**
 * Minimal SPL Token transfer instruction builder (Token Program v1).
 * This avoids depending on @solana/spl-token.
 *
 * Layout for Transfer (instruction=3):
 * - u8   3
 * - u64  amount (LE)
 */
export const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

function u8(n: number): Uint8Array { return new Uint8Array([n & 0xff]); }
function u64le(n: bigint): Uint8Array {
  const out = new Uint8Array(8);
  let x = n;
  for (let i = 0; i < 8; i++) { out[i] = Number(x & 0xffn); x >>= 8n; }
  return out;
}

/**
 * Build SOL transfer for "priority" visibility.
 */
export function buildPrioritySolTransferIx(args: {
  from: PublicKey;
  to: PublicKey;
  lamports: number;
}): TransactionInstruction {
  if (!Number.isFinite(args.lamports) || args.lamports <= 0) throw new Error("lamports must be > 0");
  return SystemProgram.transfer({ fromPubkey: args.from, toPubkey: args.to, lamports: Math.floor(args.lamports) });
}

/**
 * Build SPL token transfer (classic Token Program).
 *
 * You must provide:
 * - sourceAta
 * - destAta
 * - owner (signer)
 */
export function buildPrioritySplTransferIx(
  args: {
    sourceAta: PublicKey;
    destAta: PublicKey;
    owner: PublicKey;
    amountBaseUnits: bigint;
    /**
     * Defaults to classic SPL Token Program.
     * Pass Token-2022 program id if you want Token-2022 transfers.
     */
    tokenProgramId?: PublicKey;
  }
): TransactionInstruction {
  if (args.amountBaseUnits <= 0n) throw new Error("amountBaseUnits must be > 0");
  const data = concatBytes(u8(3), u64le(args.amountBaseUnits));
  return new TransactionInstruction({
    programId: args.tokenProgramId ?? TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: args.sourceAta, isSigner: false, isWritable: true },
      { pubkey: args.destAta, isSigner: false, isWritable: true },
      { pubkey: args.owner, isSigner: true, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

export type PriorityPayment =
  | { kind: "none" }
  | { kind: "sol"; lamports: number; to?: PublicKey }
  | { kind: "spl"; amountBaseUnits: bigint; sourceAta: PublicKey; destAta: PublicKey; owner: PublicKey; tokenProgramId?: PublicKey };

/**
 * Build a "priority message" transaction:
 * - Optional payment (SOL or SPL transfer) FIRST (so explorers show value transfer)
 * - Then message payload:
 *   - Option A: SPL Memo envelope (MEM1)
 *   - Option B: PMP binary payload (PMP1 via client builder)
 *
 * This stays tooling-only: caller signs+sends.
 */
export async function buildPriorityMessageTx(args: {
  connection: any; // Connection
  senderWallet: PublicKey;
  recipientWallet: PublicKey;
  plaintext: string;
  tag?: string;

  payment?: PriorityPayment;

  channel: "memo" | "pmp";
}): Promise<{ tx: Transaction; envelopeType: "mem1" | "pmp1"; details: any }> {
  const tx = new Transaction();

  const payment = args.payment ?? { kind: "none" as const };
  if (payment.kind === "sol") {
    tx.add(buildPrioritySolTransferIx({
      from: args.senderWallet,
      to: payment.to ?? args.recipientWallet,
      lamports: payment.lamports
    }));
  } else if (payment.kind === "spl") {
    tx.add(buildPrioritySplTransferIx({
      sourceAta: payment.sourceAta,
      destAta: payment.destAta,
      owner: payment.owner,
      amountBaseUnits: payment.amountBaseUnits
    }));
  }

  if (args.channel === "memo") {
    const { instruction, envelope, pmf1HashB64 } = await buildEncryptedMemoInstruction({
      connection: args.connection,
      fromWallet: args.senderWallet,
      toWallet: args.recipientWallet,
      plaintext: args.plaintext,
      tag: args.tag
    });
    tx.add(instruction);
    const { blockhash } = await args.connection.getLatestBlockhash("finalized");
    tx.feePayer = args.senderWallet;
    tx.recentBlockhash = blockhash;
    return { tx, envelopeType: "mem1", details: { envelope, pmf1HashB64 } };
  }

  // PMP path:
  // We reuse PMF1 bytes (binary) and post via PMP.
  // For now, we wrap PMF1 as the payload directly.
  const { instruction, envelope, pmf1HashB64 } = await buildEncryptedMemoInstruction({
    connection: args.connection,
    fromWallet: args.senderWallet,
    toWallet: args.recipientWallet,
    plaintext: args.plaintext,
    tag: args.tag
  });

  // Extract PMF1 bytes from MEM1 envelope to avoid re-deriving encryption here.
  const pmf1 = Buffer.from(envelope.body);
  const pmpIx = buildPmpPostMessageIx({
    sender: args.senderWallet,
    recipient: args.recipientWallet,
    flags: 0,
    payload: new Uint8Array(pmf1)
  });

  tx.add(pmpIx);

  const { blockhash } = await args.connection.getLatestBlockhash("finalized");
  tx.feePayer = args.senderWallet;
  tx.recentBlockhash = blockhash;

  return { tx, envelopeType: "pmp1", details: { pmf1HashB64, pmpProgramId: PMP_PROGRAM_ID.toBase58() } };
}
