import { type PublicKey } from "@solana/web3.js";
import { createStyxMessagingClient, scanInboxWithPayload, reassembleInbox, type BuiltMessage, type InboxPayloadItem } from "@styx/onchain-messaging";
import { styxMessagingDefaults } from "@styx/presets";
import type { StyxContext, StyxContextConfig, BuiltMessagePlan } from "./types";

/**
 * Tiny wiring harness: helps apps adopt Styx without custom glue.
 * Tooling-only: you still own keys, wallet flows, UI, and infra choices.
 */
export function createStyxContext(cfg: StyxContextConfig): StyxContext {
  const preferRail = cfg.preferRail ?? styxMessagingDefaults.preferRail;
  // Note: priority is not used by createStyxMessagingClient, kept for config reference
  const priority = cfg.priority ?? styxMessagingDefaults.priority;

  const messaging = createStyxMessagingClient({
    connection: cfg.connection,
    preferRail,
    // priority: removed from client config
    pmpProgramId: cfg.pmpProgramId,
    memoMaxChars: cfg.memoMaxChars ?? styxMessagingDefaults.memoMaxChars,
  });

  // Local helper for app-level JSON envelope
  function encodePlaintextEnvelopeV1(args: { body: string; ct: string; thread?: string; resend?: string }) {
    return JSON.stringify({
      t: "msg",
      v: 1,
      b: args.body,
      c: args.ct,
      th: args.thread,
      re: args.resend
    });
  }

  function parsePlaintextEnvelope(str: string): { body: string, thread?: string, resend?: string } {
    try {
      if (!str.startsWith("{")) return { body: str };
      const p = JSON.parse(str);
      if (p.t === "msg" && p.v === 1 && typeof p.b === "string") {
        return { body: p.b, thread: p.th, resend: p.re };
      }
    } catch {}
    return { body: str };
  }

  async function buildMessage(params: {
    to: PublicKey;
    plaintext: string;
    contentType?: string;
    threadKey?: string;
    resendKey?: string;
  }): Promise<BuiltMessagePlan> {
    const wrapped = encodePlaintextEnvelopeV1({
      body: params.plaintext,
      ct: params.contentType ?? "text/plain",
      thread: params.threadKey,
      resend: params.resendKey,
    });

    // Chunk size default handled by client if undefined?
    const built = await messaging.buildChunked({
      fromWallet: cfg.owner, // assuming context owner is sender
      toWallet: params.to,
      plaintext: wrapped,
      contentType: params.contentType ?? "text/plain",
    });

    return { 
      rail: built.instructions[0].rail, // Assume homogenous rail
      messageId: built.messageId, 
      instructions: built.instructions.map(m => m.instruction) 
    };
  }

  async function scanDecryptReassemble(params: { limit?: number; decryptFn: (envelopeB64Url: string) => Promise<string> }) {
    // 1. Scan
    const limit = params.limit ?? 50;
    const items = await scanInboxWithPayload({
      connection: cfg.connection,
      owner: cfg.owner,
      limit,
      pmpProgramId: cfg.pmpProgramId
    });

    // 2. Reassemble (which also handles decryption via callback)
    const res = await reassembleInbox(items, async (item) => {
      // reassembleInbox asks for DecryptFn: (item) -> { plaintext, meta? }
      const payloadItem = item as InboxPayloadItem;
      if (!payloadItem.envelopeB64Url) return null;
      try {
        const pt = await params.decryptFn(payloadItem.envelopeB64Url);
        return { plaintext: pt };
      } catch {
        return null; // Decryption failed or item not for us
      }
    });

    // 3. Map to output format and unwrap app envelope
    const assembled = res.messages.map((m) => {
      const parsed = parsePlaintextEnvelope(m.plaintext);
      const lastSource = m.sources[m.sources.length - 1]; // Use last chunk's sig
      return {
        messageId: m.messageId,
        plaintext: parsed.body,
        threadKey: parsed.thread,
        resendKey: parsed.resend,
        receivedAt: Date.now(), // Timestamp when message was processed
        signature: lastSource.signature,
      };
    });
    
    return {
      assembled,
      incomplete: Object.values(res.incompleteChunkGroups),
    };
  }

  async function enqueueTxBytes(params: { txBytesB64: string; meta?: Record<string, any> }) {
    if (!cfg.outboxStore) throw new Error("STYX_OUTBOX_MISSING: outboxStore not configured");
    const rec = await cfg.outboxStore.enqueue(params.txBytesB64, params.meta);
    return rec.id;
  }

  return { config: { ...cfg, preferRail, priority }, buildMessage, scanDecryptReassemble, enqueueTxBytes };
}
