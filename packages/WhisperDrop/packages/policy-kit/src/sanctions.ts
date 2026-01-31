/**
 * Optional sanctions / risk screening hook.
 *
 * This is NOT a list and not a legal opinion.
 * Apps can wire their chosen provider (self-hosted, third-party, or none).
 */
export type SanctionsDecision = {
  allow: boolean;
  reason?: string;
  provider?: string;
  checkedAtMs: number;
};

export interface SanctionsProvider {
  /**
   * Check an address (base58 public key) or domain identifier.
   *
   * Implementations should be deterministic and cacheable.
   */
  checkSubject(subject: { kind: "address" | "domain"; value: string }): Promise<SanctionsDecision>;
}

export class AllowAllProvider implements SanctionsProvider {
  async checkSubject(): Promise<SanctionsDecision> {
    return { allow: true, provider: "allow-all", checkedAtMs: Date.now() };
  }
}
