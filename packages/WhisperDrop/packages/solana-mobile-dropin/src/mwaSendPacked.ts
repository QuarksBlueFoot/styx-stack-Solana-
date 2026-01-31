import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { packInstructionsIntoTransactions } from "@styx/tx-tooling";
import { mwaSendTransactions } from "./mwaTxSend";

/**
 * Mobile-first helper: pack many instructions into as few transactions as possible,
 * then send via MWA-compatible flows.
 */
export async function mwaSendPackedInstructions(args: {
  connection: any;
  sender: any; // MWA sender / wallet adapter
  feePayer: PublicKey | string;
  instructions: TransactionInstruction[];
  /** Conservative max message bytes (legacy). */
  maxMessageBytes?: number;
  /** Max instructions per tx (excluding compute budget ixs). */
  maxInstructions?: number;
}): Promise<{ signatures: string[]; txCount: number }> {
  const feePayer = typeof args.feePayer === "string" ? new PublicKey(args.feePayer) : args.feePayer;
  const { blockhash } = await args.connection.getLatestBlockhash("finalized");

  const txs = packInstructionsIntoTransactions(args.instructions, {
    feePayer,
    recentBlockhash: blockhash,
    maxMessageBytes: args.maxMessageBytes,
    maxInstructionsPerTx: args.maxInstructions,
  });

  const sigs: string[] = [];
  for (const tx of txs) {
    const res = await mwaSendTransactions({ connection: args.connection, sender: args.sender, transactions: [tx] });
    sigs.push(...res);
  }

  return { signatures: sigs, txCount: txs.length };
}
