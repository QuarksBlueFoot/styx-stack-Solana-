import type { Bytes } from "@styx/crypto-core";
import { utf8ToBytes } from "@styx/crypto-core";

export type PrivacySignInPayload = {
  domain: string;
  nonce: string;
  issuedAt: string;
  statement?: string;
  resources?: string[];
  version?: string;
};

export function buildPrivacySignInMessage(p: PrivacySignInPayload): Bytes {
  const payload = {
    v: p.version ?? "psin1",
    domain: p.domain,
    nonce: p.nonce,
    issuedAt: p.issuedAt,
    statement: p.statement ?? undefined,
    resources: p.resources ?? undefined,
  };
  return utf8ToBytes(JSON.stringify(payload));
}
