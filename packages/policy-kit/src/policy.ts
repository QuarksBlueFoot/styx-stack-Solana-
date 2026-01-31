/**
 * Styx Policy Kit
 *
 * Goal: let applications adopt privacy features while still enforcing
 * product, legal, and abuse-prevention constraints.
 *
 * This package is intentionally small and interface-based.
 * It does not ship any jurisdiction-specific lists or rules.
 */

export type PolicyDecision =
  | { allow: true }
  | { allow: false; reason: string; code?: string; hint?: string };

export type PolicyContext = {
  /** The action being attempted (e.g. "send_message", "reveal_bundle"). */
  action: string;
  /** Optional human-readable tags the app can set (e.g. "dm", "support"). */
  tags?: string[];
  /** Optional metadata the app wants evaluated (keep PII out of here). */
  meta?: Record<string, unknown>;
};

export interface PolicyEngine {
  /**
   * Evaluate whether an action is permitted.
   *
   * This is where apps can plug in:
   * - rate limits
   * - allow/deny lists
   * - sanctions screening
   * - paid-tier gating
   */
  evaluate(ctx: PolicyContext): Promise<PolicyDecision>;
}

export class AllowAllPolicy implements PolicyEngine {
  async evaluate(_ctx: PolicyContext): Promise<PolicyDecision> {
    return { allow: true };
  }
}

export class ComposePolicy implements PolicyEngine {
  constructor(private readonly policies: PolicyEngine[]) {}

  async evaluate(ctx: PolicyContext): Promise<PolicyDecision> {
    for (const p of this.policies) {
      const d = await p.evaluate(ctx);
      if (!d.allow) return d;
    }
    return { allow: true };
  }
}
