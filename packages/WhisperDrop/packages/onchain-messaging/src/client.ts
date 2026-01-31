import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { buildEncryptedOnchainMessageIx, type BuildEncryptedOnchainMessageArgs } from "./autoEncryptedMessage";
import { splitUtf8ToChunks, encodeChunkFrame, assembleFromPlaintexts } from "./chunking";
import type { OnchainMessageRailPreference } from "./railSelector";
import { bytesToB64Url } from "@styx/crypto-core";
import { scanInboxWithPayload, type InboxItem } from "./inboxIndexer";
import { reassembleInbox } from "./inboxReassembly";

export type StyxMessagingClientConfig = {
  connection: Connection;
  /** Defaults for message building */
  preferRail?: OnchainMessageRailPreference;
  pmpProgramId?: PublicKey;
  memoMaxChars?: number;
  /** Default chunk size for large plaintext. Default: 600 bytes UTF-8. */
  chunkBytes?: number;
};

export type BuiltMessage = {
  rail: "memo" | "pmp";
  instruction: TransactionInstruction;
  messageId: string;
};

export type BuiltMessageBatch = {
  messageId: string;
  total: number;
  instructions: BuiltMessage[];
  contentType: string;
};

export type ReassembledChunkMessage = {
  msgId: string;
  contentType: string;
  bytes: Uint8Array;
  /** If the contentType looks like text/*, this will be populated. */
  text?: string;
};

/**
 * Drop-in, opinionated client wrapper.
 * This is tooling-only (no storage, no network services) and mobile-friendly.
 */
export function createStyxMessagingClient(cfg: StyxMessagingClientConfig) {
  return {
    async build(args: Omit<BuildEncryptedOnchainMessageArgs, "connection" | "preferRail" | "pmpProgramId" | "memoMaxChars">): Promise<BuiltMessage> {
      const built = await buildEncryptedOnchainMessageIx({
        connection: cfg.connection,
        preferRail: cfg.preferRail,
        pmpProgramId: cfg.pmpProgramId,
        memoMaxChars: cfg.memoMaxChars,
        ...args,
      });

      return {
        rail: built.rail,
        instruction: built.instruction,
        messageId: built.messageId,
      };
    },

    /**
     * Builds a chunked message batch (multiple instructions) when plaintext is large.
     * Chunk frames are encrypted inside the Styx envelope plaintext.
     */
    async buildChunked(args: {
      fromWallet: PublicKey;
      toWallet: PublicKey;
      plaintext: string;
      contentType?: string;
      tag?: string;
      chunkBytes?: number;
    }): Promise<BuiltMessageBatch> {
      const contentType = args.contentType ?? "text/plain";
      const chunkBytes = args.chunkBytes ?? cfg.chunkBytes ?? 600;
      const chunks = splitUtf8ToChunks(args.plaintext, chunkBytes);

      // Generate a batch id locally (no network) so all chunks share the same reassembly key.
      const rnd = new Uint8Array(16);
      if (globalThis.crypto?.getRandomValues) {
        globalThis.crypto.getRandomValues(rnd);
      } else {
        // Non-crypto fallback (primarily for older node environments). Still unique-enough for chunk ids.
        for (let i = 0; i < rnd.length; i++) rnd[i] = Math.floor(Math.random() * 256);
      }
      const batchId = bytesToB64Url(rnd);

      const firstFrameText = encodeChunkFrame({
        msgId: batchId,
        index: 0,
        total: chunks.length,
        contentType,
        chunkBytes: chunks[0],
      });

      const firstBuilt = await buildEncryptedOnchainMessageIx({
        connection: cfg.connection,
        fromWallet: args.fromWallet,
        toWallet: args.toWallet,
        plaintext: firstFrameText,
        contentType: "application/styx-chunk+text",
        tag: args.tag,
        preferRail: cfg.preferRail,
        pmpProgramId: cfg.pmpProgramId,
        memoMaxChars: cfg.memoMaxChars,
      });

      const instructions: BuiltMessage[] = [
        { rail: firstBuilt.rail, instruction: firstBuilt.instruction, messageId: firstBuilt.messageId },
      ];

      for (let i = 1; i < chunks.length; i++) {
        const frameText = encodeChunkFrame({ msgId: batchId, index: i, total: chunks.length, contentType, chunkBytes: chunks[i] });
        const built = await buildEncryptedOnchainMessageIx({
          connection: cfg.connection,
          fromWallet: args.fromWallet,
          toWallet: args.toWallet,
          plaintext: frameText,
          contentType: "application/styx-chunk+text",
          tag: args.tag,
          preferRail: cfg.preferRail,
          pmpProgramId: cfg.pmpProgramId,
          memoMaxChars: cfg.memoMaxChars,
        });
        instructions.push({ rail: built.rail, instruction: built.instruction, messageId: built.messageId });
      }

      return { messageId: batchId, total: chunks.length, instructions, contentType };
    },

    /**
     * Helper for apps: after you decrypt multiple envelopes, pass their plaintexts here
     * to reassemble any complete chunked messages.
     *
     * Note: chunk metadata is inside encrypted plaintext by design, so this works only
     * on already-decrypted content.
     */
    reassembleChunkedPlaintexts(plaintexts: string[]): ReassembledChunkMessage[] {
      const assembled = assembleFromPlaintexts(plaintexts);
      const out: ReassembledChunkMessage[] = [];
      for (const a of assembled) {
        let text: string | undefined;
        if (a.contentType.startsWith("text/")) {
          try {
            text = new TextDecoder().decode(a.bytes);
          } catch {
            // ignore
          }
        }
        out.push({ msgId: a.msgId, contentType: a.contentType, bytes: a.bytes, text });
      }
      return out;
    },
  };
}
