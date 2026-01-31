import { Connection, PublicKey } from "@solana/web3.js";
import { buildPrivateLikeTransaction, getDefaultPaddingPlan } from "@styx/tx-tooling";
import { mwaSendTransactions, TxSender } from "@styx/solana-mobile-dropin";
import { scanInbox, prioritySolPayment } from "@styx/onchain-messaging";

/**
 * Example: send an encrypted on-chain message using MWA-style signing.
 * This is tooling-only. Your app provides the wallet sender implementation.
 */
export async function sendStyxMessage(args: {
  connection: Connection;
  sender: TxSender;         // from your MWA wallet adapter
  owner: PublicKey;         // wallet pubkey
  to: PublicKey;            // recipient wallet
  memoPlaintext: string;
}) {
  const { connection, sender, owner, to, memoPlaintext } = args;

  const built = await buildPrivateLikeTransaction({
    connection,
    ctx: { connection }, // minimal context (rail adapters use connection)
    senderWallet: owner,
    recipientWallet: to,
    message: memoPlaintext,
    preferredRails: ["pmp", "encrypted-memo", "public"],
    payment: prioritySolPayment("low", owner), // optional: "dust" attention
    padding: getDefaultPaddingPlan("low"),                // optional: heuristic noise
  });

  if (built.kind !== "transaction") {
    throw new Error(`Unsupported rail result for this template: ${built.kind}`);
  }

  const sigs = await mwaSendTransactions({
    sender,
    connection,
    transactions: [built.transaction],
  });

  return sigs[0];
}

export async function getInboxPreview(connection: Connection, owner: PublicKey) {
  const items = await scanInbox({ connection, owner, limit: 50 });
  return items.slice(0, 10);
}
import { createStyxMessagingClient } from "@styx/onchain-messaging";
import { mwaSendPackedInstructions } from "@styx/solana-mobile-dropin";

/**
 * Example: send a large encrypted message (chunked) and pack instructions into minimal txs.
 */
export async function sendLargeStyxMessage(args: {
  connection: Connection;
  sender: TxSender;
  owner: PublicKey;
  to: PublicKey;
  plaintext: string;
}) {
  const client = createStyxMessagingClient({
    connection: args.connection as any,
    preferRail: "auto",
    priority: "normal",
  });

  const built = await client.buildChunked({
    sender: args.owner,
    recipient: args.to,
    plaintext: args.plaintext,
    contentType: "text/plain",
  });

  // Pack into as few txs as possible before sending via MWA.
  const res = await mwaSendPackedInstructions({
    connection: args.connection,
    sender: args.sender,
    feePayer: args.owner,
    instructions: built.instructions,
  });

  return { messageId: built.messageId, signatures: res.signatures, txCount: res.txCount };
}
