/**
 * @styx/artemis-dropin
 *
 * Clean-room utilities/spec for Kotlin/Artemis teams integrating Styx.
 * This package is intentionally small: it provides shared shapes and
 * "do the obvious thing" helpers, but does not attempt to wrap Artemis.
 */

export type StyxReceiptState = "pending" | "sent" | "confirmed" | "failed";

export interface StyxReceipt {
  id: string;
  createdAt: number;
  state: StyxReceiptState;
  signature?: string;
  confirmedAt?: number;
  confirmedSlot?: number;
  lastError?: string;
}

export interface ArtemisCompatibleTxBytes {
  /** base64 encoded transaction bytes */
  b64: string;
  /** optional, for apps that want to show what they're sending */
  label?: string;
}

export interface StyxOutboxAdapter {
  enqueue(tx: ArtemisCompatibleTxBytes): Promise<{ id: string }>;
  drain(): Promise<void>;
  confirm(): Promise<void>;
  list(limit?: number): Promise<StyxReceipt[]>;
}

/**
 * A minimal "adapter contract" doc to keep teams consistent.
 * Kotlin teams can implement this interface around their preferred stores.
 */
export const STYX_ARTEMIS_ADAPTER_CONTRACT = {
  version: 1,
  notes: [
    "Outbox is required for mobile reliability.",
    "Never log plaintext envelopes or decrypted memo bodies.",
    "Threading/resend collapse is local-only; do not put keys on-chain."
  ]
} as const;
