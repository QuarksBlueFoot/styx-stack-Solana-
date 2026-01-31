
import { ComputeBudgetProgram, Transaction, TransactionInstruction, PublicKey } from "@solana/web3.js";

/**
 * Pack many instructions into as few legacy Transactions as possible.
 *
 * Notes:
 * - This is a best-effort packer for mobile apps (Saga/Seeker/iOS).
 * - It does NOT guarantee privacy; it's purely a DX + reliability utility.
 * - It uses conservative size estimates (serializeMessage length).
 */
export type PackOptions = {
  feePayer: PublicKey;
  recentBlockhash: string;
  /** Conservative max bytes for legacy tx messages (default 1100). */
  maxMessageBytes?: number;
  /** Max instructions per tx (default 12). */
  maxInstructionsPerTx?: number;
  /** Optional compute unit limit to prepend per transaction. */
  computeUnitLimit?: number;
  /** Optional microLamports per CU to prepend per transaction. */
  computeUnitPriceMicroLamports?: number;
};

function withBudgetIxs(opts: PackOptions): TransactionInstruction[] {
  const ixs: TransactionInstruction[] = [];
  if (opts.computeUnitLimit) {
    ixs.push(ComputeBudgetProgram.setComputeUnitLimit({ units: opts.computeUnitLimit }));
  }
  if (opts.computeUnitPriceMicroLamports) {
    ixs.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: opts.computeUnitPriceMicroLamports }));
  }
  return ixs;
}

function estimateMessageBytes(tx: Transaction): number {
  try {
    return tx.serializeMessage().length;
  } catch {
    // If estimation fails (missing keys), return a large number to force a split.
    return 10_000;
  }
}

export function packInstructionsIntoTransactions(
  instructions: TransactionInstruction[],
  opts: PackOptions
): Transaction[] {
  const maxBytes = opts.maxMessageBytes ?? 1100;
  const maxIxs = opts.maxInstructionsPerTx ?? 12;

  const out: Transaction[] = [];
  let current = new Transaction({ feePayer: opts.feePayer, recentBlockhash: opts.recentBlockhash });
  const budget = withBudgetIxs(opts);
  if (budget.length) current.add(...budget);

  for (const ix of instructions) {
    const candidate = new Transaction({ feePayer: opts.feePayer, recentBlockhash: opts.recentBlockhash });
    candidate.add(...current.instructions);
    candidate.add(ix);

    const tooMany = candidate.instructions.length > maxIxs;
    const tooBig = estimateMessageBytes(candidate) > maxBytes;

    if ((tooMany || tooBig) && current.instructions.length > budget.length) {
      out.push(current);
      current = new Transaction({ feePayer: opts.feePayer, recentBlockhash: opts.recentBlockhash });
      if (budget.length) current.add(...budget);
      current.add(ix);
    } else {
      current.add(ix);
    }
  }

  if (current.instructions.length > 0) out.push(current);
  return out;
}
