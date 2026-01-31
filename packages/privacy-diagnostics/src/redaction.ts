const DEFAULT_SENSITIVE_PATTERNS: RegExp[] = [
  // common secrets
  /(mnemonic|seed phrase|private key|secret key|ed25519)/ig,
  // base58-ish long keys (best-effort)
  /\b[1-9A-HJ-NP-Za-km-z]{40,}\b/g,
  // base64-ish long blobs
  /\b[A-Za-z0-9+/_-]{80,}={0,2}\b/g
];

export function redactString(input: string, patterns: RegExp[] = DEFAULT_SENSITIVE_PATTERNS): string {
  let out = input;
  for (const p of patterns) {
    out = out.replace(p, (m) => {
      // keep tiny hint but remove content
      const keep = Math.min(6, m.length);
      return m.slice(0, keep) + "…[REDACTED]";
    });
  }
  return out;
}

export function redactUnknown(err: unknown): string {
  try {
    if (typeof err === "string") return redactString(err);
    if (err && typeof err === "object") {
      const msg = "message" in err ? String((err as any).message) : JSON.stringify(err);
      return redactString(msg);
    }
    return redactString(String(err));
  } catch {
    return "[REDACTED_ERROR]";
  }
}
