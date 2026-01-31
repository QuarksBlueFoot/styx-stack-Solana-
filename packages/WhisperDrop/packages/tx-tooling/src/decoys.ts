import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";

/**
 * Decoy packs (bounded, deterministic).
 *
 * Purpose:
 * - Give builders a "one knob" option to add harmless noise around a message TX.
 * - Remain testable and predictable (important for SDK stability).
 *
 * Important:
 * - NOT cryptographic privacy.
 * - Do not promise anonymity or unlinkability.
 */

export type DecoyLevel = "off" | "low" | "medium";

export type DecoyPack = {
  level: DecoyLevel;
  instructions: TransactionInstruction[];
  notes: string;
};

// Small, deterministic hash + PRNG that works in RN/JS without extra deps.
function fnv1a32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function xorshift32(seed: number) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return x >>> 0;
  };
}

function memoNoopIx(label: string): TransactionInstruction {
  const memoPid = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
  return new TransactionInstruction({
    keys: [],
    programId: memoPid,
    data: Buffer.from(label, "utf8"),
  });
}

/**
 * Build a bounded, deterministic decoy instruction pack.
 *
 * This is *not* privacy in the cryptographic sense. It's a UX/deployment primitive:
 * - deterministic: same inputs => same pack (good for tests)
 * - bounded: won't accidentally bloat txs
 */
export function buildDecoyPack(args: {
  payer: PublicKey;
  level: DecoyLevel;
  seed?: string;
  /** If provided, add a single dust transfer in medium mode. */
  dustDestinations?: PublicKey[];
}): DecoyPack {
  if (args.level === "off") {
    return { level: "off", instructions: [], notes: "decoys disabled" };
  }

  const seedStr = `${args.seed ?? "styx"}:${args.payer.toBase58()}`;
  const rand = xorshift32(fnv1a32(seedStr));

  const count = args.level === "low" ? 2 : 4;
  const ixs: TransactionInstruction[] = [];

  for (let i = 0; i < count; i++) {
    // short deterministic-ish labels that don't leak payload
    const r = rand().toString(16).padStart(8, "0");
    ixs.push(memoNoopIx(`styx:decoy:v1:${args.level}:${i}:${r}`));
  }

  // In medium mode, optionally add one tiny transfer to a known decoy sink.
  // This is OFF by default unless destinations are provided.
  if (args.level === "medium" && args.dustDestinations && args.dustDestinations.length > 0) {
    const idx = rand() % args.dustDestinations.length;
    const toPubkey = args.dustDestinations[idx];
    const lamports = 1 + (rand() % 25); // 1..25 lamports (tiny)
    ixs.push(SystemProgram.transfer({ fromPubkey: args.payer, toPubkey, lamports }));
  }

  return {
    level: args.level,
    instructions: ixs,
    notes: "Decoys are heuristic noise only; they do not provide strong privacy.",
  };
}
