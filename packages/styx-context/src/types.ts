import type { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import type { InboxStore } from "@styx/inbox-store";
import type { OutboxStore } from "@styx/mobile-outbox";

export type RailPreference = "auto" | "memo" | "pmp";
export type PriorityLevel = "low" | "normal" | "high";

export interface StyxContextConfig {
  connection: Connection;
  owner: PublicKey;
  inboxStore?: InboxStore;
  outboxStore?: OutboxStore;
  preferRail?: RailPreference;
  priority?: PriorityLevel;
  pmpProgramId?: PublicKey;
  memoMaxChars?: number;
}

export interface BuiltMessagePlan {
  rail: "memo" | "pmp";
  messageId: string;
  instructions: TransactionInstruction[];
}

export interface StyxContext {
  config: Required<Pick<StyxContextConfig, "preferRail" | "priority">> & StyxContextConfig;

  buildMessage(params: {
    to: PublicKey;
    plaintext: string;
    contentType?: string;
    threadKey?: string;
    resendKey?: string;
  }): Promise<BuiltMessagePlan>;

  scanDecryptReassemble(params: {
    limit?: number;
    decryptFn: (envelopeB64Url: string) => Promise<string>;
  }): Promise<{
    assembled: Array<{
      messageId: string;
      plaintext: string;
      threadKey?: string;
      resendKey?: string;
      receivedAt: number;
      signature: string;
    }>;
    incomplete: any[];
  }>;

  enqueueTxBytes?(params: { txBytesB64: string; meta?: Record<string, any> }): Promise<string>;
}
