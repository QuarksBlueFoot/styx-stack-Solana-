import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

/**
 * IMPORTANT: "padding" is NOT cryptographic privacy.
 * It is a UX-oriented obfuscation technique that can make simple heuristics harder
 * (e.g., casual observers scanning a single tx), but it does not provide strong privacy.
 *
 * Styx includes this as a pragmatic, opt-in tool for apps that want "a little noise"
 * without any additional infrastructure.
 */

export type TxPaddingMode = "memo-noop" | "sol-dust";

/**
 * PaddingLevel is the DX-friendly knob used by higher-level helpers.
 *
 * - off: no padding
 * - low/medium: memo-noop padding (safe by default)
 *
 * If you want sol-dust, use buildPaddingInstructions/applyPaddingPlan directly.
 */
export type PaddingLevel = "off" | "low" | "medium";

export type TxPaddingPlan = {
  mode: TxPaddingMode;
  instructionCount: number; // number of padding instructions to add
  /**
   * For sol-dust:
   * - dustLamportsMin/max are used for each transfer.
   * - destination strategy is described by `destinations`.
   */
  dustLamportsMin?: number;
  dustLamportsMax?: number;
  destinations?: PublicKey[];
};

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n | 0));
}

function randInt(min: number, max: number) {
  const a = Math.min(min, max);
  const b = Math.max(min, max);
  return a + Math.floor(Math.random() * (b - a + 1));
}

function memoNoopIx(label: string): TransactionInstruction {
  // Memo program id (SPL Memo)
  const memoPid = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
  return new TransactionInstruction({
    keys: [],
    programId: memoPid,
    data: Buffer.from(label, "utf8"),
  });
}

/**
 * Creates padding instructions that can be inserted anywhere.
 * You must still ensure the transaction has enough compute/size budget.
 */
export function buildPaddingInstructions(args: {
  payer: PublicKey;
  mode: TxPaddingMode;
  instructionCount: number;
  destinations?: PublicKey[]; // for sol-dust
  dustLamportsMin?: number;
  dustLamportsMax?: number;
}): TransactionInstruction[] {
  const count = clampInt(args.instructionCount, 0, 8); // keep small to avoid tx bloat
  const out: TransactionInstruction[] = [];

  if (count === 0) return out;

  if (args.mode === "memo-noop") {
    for (let i = 0; i < count; i++) {
      // short, deterministic-ish label (no PII, no payload)
      out.push(memoNoopIx(`styx:pad:v1:${i}`));
    }
    return out;
  }

  // sol-dust mode
  const minLamports = clampInt(args.dustLamportsMin ?? 1, 1, 10_000);
  const maxLamports = clampInt(args.dustLamportsMax ?? 500, 1, 100_000);
  const dests = args.destinations ?? [];

  if (dests.length === 0) {
    throw new Error("sol-dust padding requires at least one destination public key");
  }

  for (let i = 0; i < count; i++) {
    const lamports = randInt(minLamports, maxLamports);
    const toPubkey = dests[i % dests.length];
    out.push(SystemProgram.transfer({ fromPubkey: args.payer, toPubkey, lamports }));
  }

  return out;
}

/**
 * Inserts padding instructions around a "core" set of instructions.
 * Default strategy: interleave (pads between core ixs).
 */
export function applyPaddingPlan(args: {
  tx: Transaction;
  payer: PublicKey;
  plan: TxPaddingPlan;
  position?: "prepend" | "append" | "interleave";
}): Transaction {
  const pos = args.position ?? "interleave";
  const pads = buildPaddingInstructions({
    payer: args.payer,
    mode: args.plan.mode,
    instructionCount: args.plan.instructionCount,
    destinations: args.plan.destinations,
    dustLamportsMin: args.plan.dustLamportsMin,
    dustLamportsMax: args.plan.dustLamportsMax,
  });

  if (pads.length === 0) return args.tx;

  const core = args.tx.instructions.slice();
  const out = new Transaction();

  // preserve recentBlockhash/feePayer from original if present
  out.feePayer = args.tx.feePayer ?? args.payer;
  out.recentBlockhash = args.tx.recentBlockhash;

  if (pos === "prepend") {
    out.add(...pads, ...core);
  } else if (pos === "append") {
    out.add(...core, ...pads);
  } else {
    // interleave
    const maxLen = Math.max(core.length, pads.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < core.length) out.add(core[i]);
      if (i < pads.length) out.add(pads[i]);
    }
  }
  return out;
}

/**
 * Convenience: create a plan with sane defaults.
 * - memo-noop is free-ish (size only)
 * - sol-dust sends tiny transfers to a set of "decoy" pubkeys you control (or community sinks)
 */
export function getDefaultPaddingPlan(level: PaddingLevel): TxPaddingPlan {
  if (level === "off") return { mode: "memo-noop", instructionCount: 0 };
  if (level === "low") return { mode: "memo-noop", instructionCount: 2 };
  return { mode: "memo-noop", instructionCount: 5 };
}

/**
 * (Optional) Validate that a padded tx can be simulated.
 * Note: simulation can fail if payer doesn't have lamports for sol-dust mode.
 */
export async function simulatePaddedTx(args: {
  connection: Connection;
  tx: Transaction;
  signers?: Keypair[];
}): Promise<{ ok: boolean; err?: any }> {
  const sim = await args.connection.simulateTransaction(args.tx, args.signers ?? []);
  if (sim.value.err) return { ok: false, err: sim.value.err };
  return { ok: true };
}
