import { PublicKey, Transaction } from "@solana/web3.js";
import { buildPriorityMessageTx, type PriorityPayment } from "@styx/onchain-messaging";

export async function buildPriorityPrivateMessageTx(args: {
  connection: any;
  senderWallet: PublicKey;
  recipientWallet: PublicKey;
  plaintext: string;
  tag?: string;
  payment?: PriorityPayment;
  channel: "memo" | "pmp";
}): Promise<{ tx: Transaction; envelopeType: "mem1" | "pmp1"; details: any }> {
  return buildPriorityMessageTx(args);
}
