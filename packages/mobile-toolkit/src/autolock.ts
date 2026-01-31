/**
 * Pure helper for auto-lock timers (biometric/key unlock flows).
 * Styx does not manage UI; this is state + timing only.
 */
export class AutoLockTimer {
  private timeoutId: any = null;
  private timeoutMs: number;
  private onLock: () => void;

  constructor(opts: { timeoutMs: number; onLock: () => void }) {
    this.timeoutMs = opts.timeoutMs;
    this.onLock = opts.onLock;
  }

  touch(): void {
    this.clear();
    this.timeoutId = setTimeout(() => this.onLock(), this.timeoutMs);
  }

  clear(): void {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = null;
  }

  setTimeoutMs(ms: number): void {
    this.timeoutMs = ms;
    // do not auto-touch here; caller decides
  }
}
