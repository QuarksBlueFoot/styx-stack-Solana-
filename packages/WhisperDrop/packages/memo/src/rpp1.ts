import nacl from "tweetnacl";
import { concatBytes, utf8ToBytes, type Bytes } from "@styx/crypto-core";
import { sha256Bytes } from "@styx/crypto-core";
import { bytesToB64, b64ToBytes } from "@styx/crypto-core";
import { pmf1BinaryParse, pmf1BinaryDecrypt, type PMF1BinaryParsed } from "./pmf1_binary";

/**
 * RPP1 (Reveal Proof Package v1)
 *
 * A reveal package lets a holder disclose memo plaintext to an auditor *without* changing on-chain data.
 * It contains:
 * - the original PMF1 bytes (or its hash + retrieval pointer)
 * - a proof of authority to reveal (Ed25519 signature by the revealer wallet)
 * - the decrypted plaintext (optional, can be included or delivered out-of-band)
 *
 * v0.1.1: We use a simple, deterministic signed payload:
 *   message = sha256("RPP1" || pmf1_hash || auditor_id_len||auditor_id || context_len||context || revealed_at_u64le)
 *
 * The auditor verifies:
 * - pmf1_hash matches the on-chain memo bytes they received
 * - signature verifies with revealer wallet pubkey
 *
 * This is deliberately minimal; we can add ZK membership proofs or registry checks later.
 */

const MAGIC = utf8ToBytes("RPP1");

function u64le(n: bigint): Bytes {
  const out = new Uint8Array(8);
  let x = n;
  for (let i = 0; i < 8; i++) { out[i] = Number(x & 0xffn); x >>= 8n; }
  return out;
}
function u16le(n: number): Bytes {
  const out = new Uint8Array(2);
  out[0] = n & 0xff;
  out[1] = (n >> 8) & 0xff;
  return out;
}

export type RPP1Package = {
  v: 1;
  pmf1_b64: string;          // original PMF1 bytes (base64)
  pmf1_hash_b64: string;     // sha256(pmf1)
  auditorId: string;         // "org:case:..." or pubkey etc
  context: string;           // freeform label (e.g., "KYC audit", "tax")
  revealedAt: number;        // unix ms
  revealerWalletPubkey_b64: string; // 32 bytes (ed25519)
  signature_b64: string;     // 64 bytes ed25519 signature over message hash
  plaintext_b64?: string;    // optional
  contentType?: string;
  appTag?: string;
};

export function rpp1Build(args: {
  pmf1: Bytes;
  plaintext?: Bytes;
  auditorId: string;
  context: string;
  revealerWalletEd25519: nacl.SignKeyPair;
  contentType?: string;
  appTag?: string;
}): RPP1Package {
  const pmf1Hash = sha256Bytes(args.pmf1);
  const revealedAt = Date.now();

  const auditorBytes = utf8ToBytes(args.auditorId);
  const ctxBytes = utf8ToBytes(args.context);

  const msg = concatBytes(
    MAGIC,
    pmf1Hash,
    u16le(auditorBytes.length), auditorBytes,
    u16le(ctxBytes.length), ctxBytes,
    u64le(BigInt(revealedAt))
  );

  const sig = nacl.sign.detached(sha256Bytes(msg), args.revealerWalletEd25519.secretKey);

  return {
    v: 1,
    pmf1_b64: bytesToB64(args.pmf1),
    pmf1_hash_b64: bytesToB64(pmf1Hash),
    auditorId: args.auditorId,
    context: args.context,
    revealedAt,
    revealerWalletPubkey_b64: bytesToB64(args.revealerWalletEd25519.publicKey),
    signature_b64: bytesToB64(sig),
    plaintext_b64: args.plaintext ? bytesToB64(args.plaintext) : undefined,
    contentType: args.contentType,
    appTag: args.appTag,
  };
}

export function rpp1Verify(args: { pkg: RPP1Package; expectedPmf1Hash?: Bytes }): boolean {
  try {
    if (args.pkg.v !== 1) return false;

    const pmf1 = b64ToBytes(args.pkg.pmf1_b64);
    const pmf1Hash = sha256Bytes(pmf1);
    const claimed = b64ToBytes(args.pkg.pmf1_hash_b64);
    if (bytesToB64(pmf1Hash) !== bytesToB64(claimed)) return false;

    if (args.expectedPmf1Hash) {
      if (bytesToB64(args.expectedPmf1Hash) !== bytesToB64(pmf1Hash)) return false;
    }

    const auditorBytes = utf8ToBytes(args.pkg.auditorId);
    const ctxBytes = utf8ToBytes(args.pkg.context);

    const msg = concatBytes(
      MAGIC,
      pmf1Hash,
      u16le(auditorBytes.length), auditorBytes,
      u16le(ctxBytes.length), ctxBytes,
      u64le(BigInt(args.pkg.revealedAt))
    );

    const sig = b64ToBytes(args.pkg.signature_b64);
    const pk = b64ToBytes(args.pkg.revealerWalletPubkey_b64);

    return nacl.sign.detached.verify(sha256Bytes(msg), sig, pk);
  } catch {
    return false;
  }
}

/**
 * Convenience: decrypt pmf1 using recipient secret key (x25519), and build a reveal package.
 */
export function rpp1BuildFromRecipient(args: {
  pmf1: Bytes;
  recipientX25519SecretKey: Bytes;
  auditorId: string;
  context: string;
  revealerWalletEd25519: nacl.SignKeyPair;
}): RPP1Package {
  const parsed = pmf1BinaryParse(args.pmf1);
  const pt = pmf1BinaryDecrypt({ recipientX25519SecretKey: args.recipientX25519SecretKey, pmf1: args.pmf1 });

  return rpp1Build({
    pmf1: args.pmf1,
    plaintext: pt,
    auditorId: args.auditorId,
    context: args.context,
    revealerWalletEd25519: args.revealerWalletEd25519,
    contentType: parsed.contentType,
    appTag: parsed.appTag
  });
}
