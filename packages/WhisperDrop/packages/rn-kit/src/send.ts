import { Connection, Transaction } from "@solana/web3.js";
import { mwaSendTransactions, type TxSender } from "@styx/solana-mobile-dropin";

export async function sendLegacyTxViaMwa(args: {
  sender: TxSender;
  connection: Connection;
  tx: Transaction;
}): Promise<string> {
  const sigs = await mwaSendTransactions({
    sender: args.sender,
    connection: args.connection,
    transactions: [args.tx],
  });
  return sigs[0];
}
