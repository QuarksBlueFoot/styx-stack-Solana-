import { PolicyEngine, PolicyContext, PolicyDecision } from "./policy";

/**
 * Rate limiting policy for privacy operations.
 * Prevents abuse while maintaining privacy guarantees.
 */
export type RateLimitConfig = {
  /** Maximum operations per window */
  maxOps: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Key function to identify the rate limit bucket */
  keyFn?: (ctx: PolicyContext) => string;
};

export class RateLimitPolicy implements PolicyEngine {
  private buckets = new Map<string, { count: number; resetAt: number }>();
  
  constructor(private readonly config: RateLimitConfig) {}
  
  async evaluate(ctx: PolicyContext): Promise<PolicyDecision> {
    const key = this.config.keyFn?.(ctx) ?? ctx.action;
    const now = Date.now();
    
    let bucket = this.buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + this.config.windowMs };
      this.buckets.set(key, bucket);
    }
    
    bucket.count++;
    
    if (bucket.count > this.config.maxOps) {
      const retryAfterMs = bucket.resetAt - now;
      return {
        allow: false,
        reason: `Rate limit exceeded for ${ctx.action}`,
        code: "RATE_LIMIT_EXCEEDED",
        hint: `Retry after ${Math.ceil(retryAfterMs / 1000)} seconds`
      };
    }
    
    return { allow: true };
  }
  
  /** Clear all rate limit buckets */
  reset(): void {
    this.buckets.clear();
  }
}

/**
 * Amount-based policy for transaction limits.
 */
export type AmountLimitConfig = {
  /** Maximum amount per transaction (in base units) */
  maxPerTx?: bigint;
  /** Maximum amount per day (in base units) */
  maxPerDay?: bigint;
  /** Require audit for amounts above this threshold */
  auditThreshold?: bigint;
};

export class AmountLimitPolicy implements PolicyEngine {
  private dailyTotals = new Map<string, { total: bigint; date: string }>();
  
  constructor(private readonly config: AmountLimitConfig) {}
  
  async evaluate(ctx: PolicyContext): Promise<PolicyDecision> {
    const amount = ctx.meta?.amount as bigint | undefined;
    if (amount === undefined) {
      return { allow: true };
    }
    
    // Per-transaction limit
    if (this.config.maxPerTx !== undefined && amount > this.config.maxPerTx) {
      return {
        allow: false,
        reason: `Amount ${amount} exceeds per-transaction limit of ${this.config.maxPerTx}`,
        code: "AMOUNT_LIMIT_EXCEEDED"
      };
    }
    
    // Daily limit tracking
    if (this.config.maxPerDay !== undefined) {
      const userId = (ctx.meta?.userId as string) ?? "default";
      const today = new Date().toISOString().split("T")[0];
      
      let daily = this.dailyTotals.get(userId);
      if (!daily || daily.date !== today) {
        daily = { total: 0n, date: today };
        this.dailyTotals.set(userId, daily);
      }
      
      if (daily.total + amount > this.config.maxPerDay) {
        return {
          allow: false,
          reason: `Daily limit of ${this.config.maxPerDay} exceeded`,
          code: "DAILY_LIMIT_EXCEEDED"
        };
      }
      
      daily.total += amount;
    }
    
    // Audit requirement
    if (this.config.auditThreshold !== undefined && amount > this.config.auditThreshold) {
      const hasAuditKey = ctx.meta?.hasAuditKey as boolean | undefined;
      if (!hasAuditKey) {
        return {
          allow: false,
          reason: `Amounts above ${this.config.auditThreshold} require an audit key`,
          code: "AUDIT_REQUIRED",
          hint: "Configure an auditor ElGamal public key for this transfer"
        };
      }
    }
    
    return { allow: true };
  }
}

/**
 * Allowlist/Denylist policy for addresses.
 */
export type ListPolicyConfig = {
  /** Addresses that are always allowed */
  allowlist?: Set<string>;
  /** Addresses that are always denied */
  denylist?: Set<string>;
  /** Default behavior when address is not in either list */
  defaultAllow?: boolean;
};

export class ListPolicy implements PolicyEngine {
  constructor(private readonly config: ListPolicyConfig) {}
  
  async evaluate(ctx: PolicyContext): Promise<PolicyDecision> {
    const recipient = ctx.meta?.recipient as string | undefined;
    if (!recipient) {
      return { allow: true };
    }
    
    // Check denylist first
    if (this.config.denylist?.has(recipient)) {
      return {
        allow: false,
        reason: "Recipient is on the deny list",
        code: "RECIPIENT_DENIED"
      };
    }
    
    // Check allowlist
    if (this.config.allowlist?.has(recipient)) {
      return { allow: true };
    }
    
    // Default behavior
    if (this.config.defaultAllow === false) {
      return {
        allow: false,
        reason: "Recipient is not on the allow list",
        code: "RECIPIENT_NOT_ALLOWED"
      };
    }
    
    return { allow: true };
  }
}

/**
 * Time-based policy for operation scheduling.
 */
export type TimeWindowConfig = {
  /** Allowed hours (0-23) in UTC */
  allowedHoursUtc?: { start: number; end: number };
  /** Allowed days of week (0=Sunday, 6=Saturday) */
  allowedDays?: number[];
  /** Block during these date ranges */
  blackoutPeriods?: Array<{ start: Date; end: Date }>;
};

export class TimeWindowPolicy implements PolicyEngine {
  constructor(private readonly config: TimeWindowConfig) {}
  
  async evaluate(_ctx: PolicyContext): Promise<PolicyDecision> {
    const now = new Date();
    const hour = now.getUTCHours();
    const day = now.getUTCDay();
    
    // Check allowed hours
    if (this.config.allowedHoursUtc) {
      const { start, end } = this.config.allowedHoursUtc;
      const inWindow = start <= end 
        ? (hour >= start && hour < end)
        : (hour >= start || hour < end);
      
      if (!inWindow) {
        return {
          allow: false,
          reason: `Operations only allowed between ${start}:00 and ${end}:00 UTC`,
          code: "OUTSIDE_TIME_WINDOW"
        };
      }
    }
    
    // Check allowed days
    if (this.config.allowedDays && !this.config.allowedDays.includes(day)) {
      return {
        allow: false,
        reason: "Operations not allowed on this day",
        code: "OUTSIDE_ALLOWED_DAYS"
      };
    }
    
    // Check blackout periods
    if (this.config.blackoutPeriods) {
      for (const period of this.config.blackoutPeriods) {
        if (now >= period.start && now <= period.end) {
          return {
            allow: false,
            reason: "Operations paused during blackout period",
            code: "BLACKOUT_PERIOD"
          };
        }
      }
    }
    
    return { allow: true };
  }
}

/**
 * Privacy level requirement policy.
 */
export type PrivacyRequirementConfig = {
  /** Minimum privacy level required */
  minLevel: "low" | "medium" | "high" | "maximum";
  /** Actions that require this level */
  actions?: string[];
};

export class PrivacyRequirementPolicy implements PolicyEngine {
  private levelOrder = ["none", "low", "medium", "high", "maximum"];
  
  constructor(private readonly config: PrivacyRequirementConfig) {}
  
  async evaluate(ctx: PolicyContext): Promise<PolicyDecision> {
    // Check if this action requires privacy enforcement
    if (this.config.actions && !this.config.actions.includes(ctx.action)) {
      return { allow: true };
    }
    
    const currentLevel = (ctx.meta?.privacyLevel as string) ?? "none";
    const currentIndex = this.levelOrder.indexOf(currentLevel);
    const requiredIndex = this.levelOrder.indexOf(this.config.minLevel);
    
    if (currentIndex < requiredIndex) {
      return {
        allow: false,
        reason: `This action requires ${this.config.minLevel} privacy level, but only ${currentLevel} is configured`,
        code: "INSUFFICIENT_PRIVACY",
        hint: `Enable features like encryption, stealth addresses, or confidential transfers`
      };
    }
    
    return { allow: true };
  }
}

/**
 * Audit logging hook for compliance.
 */
export type AuditLogEntry = {
  timestamp: number;
  action: string;
  decision: "allow" | "deny";
  reason?: string;
  context: Record<string, unknown>;
};

export interface AuditLogger {
  log(entry: AuditLogEntry): Promise<void>;
}

export class AuditingPolicy implements PolicyEngine {
  constructor(
    private readonly inner: PolicyEngine,
    private readonly logger: AuditLogger
  ) {}
  
  async evaluate(ctx: PolicyContext): Promise<PolicyDecision> {
    const decision = await this.inner.evaluate(ctx);
    
    await this.logger.log({
      timestamp: Date.now(),
      action: ctx.action,
      decision: decision.allow ? "allow" : "deny",
      reason: decision.allow ? undefined : decision.reason,
      context: {
        tags: ctx.tags,
        ...ctx.meta
      }
    });
    
    return decision;
  }
}

/**
 * In-memory audit logger for development/testing.
 */
export class MemoryAuditLogger implements AuditLogger {
  public entries: AuditLogEntry[] = [];
  
  async log(entry: AuditLogEntry): Promise<void> {
    this.entries.push(entry);
  }
  
  clear(): void {
    this.entries = [];
  }
  
  getEntries(filter?: { action?: string; decision?: "allow" | "deny" }): AuditLogEntry[] {
    return this.entries.filter(e => {
      if (filter?.action && e.action !== filter.action) return false;
      if (filter?.decision && e.decision !== filter.decision) return false;
      return true;
    });
  }
}
