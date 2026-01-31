import { PublicKey, Connection, TransactionInstruction } from "@solana/web3.js";
import { encodeStyxEnvelope, type StyxEnvelopeV1 } from "@styx/memo";
import { bytesToB64Url } from "@styx/crypto-core";
import { buildEncryptedMemoInstruction } from "./memoEncryptedMessage";
import { buildPmpEncryptedTextIx } from "./pmpEncryptedMessage";
import { selectOnchainMessageRail, type OnchainMessageRailPreference, type OnchainMessageRail } from "./railSelector";

export interface BuildEncryptedOnchainMessageArgs {
  connection: Connection;
  fromWallet: PublicKey;
  toWallet: PublicKey;
  plaintext: string;
  contentType?: string;
  tag?: string;

  /** "auto" (default), "memo", or "pmp" */
  preferRail?: OnchainMessageRailPreference;
  /** Styx PMP program id (used only for availability detection in auto mode) */
  pmpProgramId?: PublicKey;
  /** Conservative max memo char length for auto selection. Default: 900. */
  memoMaxChars?: number;
}

export type BuildEncryptedOnchainMessageResult = {
  rail: OnchainMessageRail;
  instruction: TransactionInstruction;
  envelope: StyxEnvelopeV1;
  messageId: string;
  pmf1HashB64?: string;
};

export async function buildEncryptedOnchainMessageIx(
  args: BuildEncryptedOnchainMessageArgs
): Promise<BuildEncryptedOnchainMessageResult> {
  // Build memo first to get the exact envelope bytes for selection (small cost, big correctness).
  const memoBuilt = await buildEncryptedMemoInstruction({
    connection: args.connection,
    fromWallet: args.fromWallet,
    toWallet: args.toWallet,
    plaintext: args.plaintext,
    contentType: args.contentType,
    tag: args.tag,
  });

  const envBytes = encodeStyxEnvelope(memoBuilt.envelope);
  const rail = await selectOnchainMessageRail({
    connection: args.connection,
    envelopeBytes: envBytes,
    prefer: args.preferRail ?? "auto",
    pmpProgramId: args.pmpProgramId,
    memoMaxChars: args.memoMaxChars,
  });

  if (rail === "memo") {
    return {
      rail,
      instruction: memoBuilt.instruction,
      envelope: memoBuilt.envelope,
      messageId: bytesToB64Url(memoBuilt.envelope.id),
      pmf1HashB64: memoBuilt.pmf1HashB64,
    };
  }

  const pmp = await buildPmpEncryptedTextIx({
    connection: args.connection,
    sender: args.fromWallet,
    recipient: args.toWallet,
    recipientKeyOwner: args.toWallet,
    text: args.plaintext,
    context: args.tag,
  });

  return {
    rail,
    instruction: pmp.ix,
    envelope: pmp.envelope,
    messageId: pmp.messageId,
  };
}
