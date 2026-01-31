import { type RetryPolicy, exponentialBackoff } from "@styx/mobile-toolkit";

export type StyxMobileDefaults = {
  retry: RetryPolicy;
  autoLockMs: number;
};

export const styxMobileDefaults: StyxMobileDefaults = {
  // conservative mobile retry: short bursts, then back off hard
  retry: {
    maxAttempts: 5,
    backoff: exponentialBackoff({
      baseMs: 250,
      maxMs: 5_000,
      jitter: "full",
    }),
  },
  autoLockMs: 60_000,
};

export type StyxMessagingDefaults = {
  preferRail: "auto" | "memo" | "pmp";
  memoMaxChars: number;
  priority: "low" | "normal" | "high";
};

export const styxMessagingDefaults: StyxMessagingDefaults = {
  preferRail: "auto",
  memoMaxChars: 900,
  priority: "normal",
};

export type StyxTxDefaults = {
  paddingLevel: "off" | "low" | "medium";
  decoys: "off" | "light";
};

export const styxTxDefaults: StyxTxDefaults = {
  paddingLevel: "low",
  decoys: "light",
};
