/**
 * Canonical JSON serializer:
 * - Object keys are sorted lexicographically.
 * - Arrays preserve order.
 * - Undefined values are omitted (like JSON.stringify).
 * This must be stable across platforms to keep manifestHash deterministic.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: any): any {
  if (value === null) return null;
  const t = typeof value;
  if (t === "number" || t === "string" || t === "boolean") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  if (t === "object") {
    const out: Record<string, any> = {};
    const keys = Object.keys(value).filter(k => value[k] !== undefined).sort();
    for (const k of keys) out[k] = canonicalize(value[k]);
    return out;
  }
  // JSON.stringify omits functions/symbols/undefined; we omit by returning undefined
  return undefined;
}
