import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { applyPaddingPlan, getDefaultPaddingPlan } from "@styx/tx-tooling";

/**
 * Golden path: add light-weight transaction padding.
 *
 * This is NOT cryptographic privacy. It's an opt-in "noise layer" that can
 * reduce obvious pattern matching in simple situations.
 */
export async function buildPaddedTransfer(args: {
  connection: Connection;
  payer: Keypair;
  to: PublicKey;
  lamports: number;
  padding: "off" | "low" | "medium";
}): Promise<Transaction> {
  const tx = new Transaction();
  tx.add(
    // core instruction
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("@solana/web3.js").SystemProgram.transfer({
      fromPubkey: args.payer.publicKey,
      toPubkey: args.to,
      lamports: args.lamports,
    })
  );

  const plan = getDefaultPaddingPlan(args.padding);
  const padded = applyPaddingPlan({
    tx,
    payer: args.payer.publicKey,
    plan,
    position: "interleave",
  });

  const { blockhash } = await args.connection.getLatestBlockhash("finalized");
  padded.feePayer = args.payer.publicKey;
  padded.recentBlockhash = blockhash;

  padded.sign(args.payer);
  return padded;
}
