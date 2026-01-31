import { sha256Utf8, sha256Bytes, compareBytes, concatBytes, bytesToB64Url, b64UrlToBytes, hexToBytes, bytesToHex } from "./crypto";
import type { WhisperDropLeafInput, WhisperDropMerkleBuildResult, WhisperDropLeafProof } from "./types";

export function normalizeNonceHex(nonceHex?: string): string {
  if (nonceHex === undefined || nonceHex === null || nonceHex === "") {
    const buf = randomBytes(16);
    return bytesToHex(buf);
  }
  if (!/^[0-9a-fA-F]{32}$/.test(nonceHex)) throw new Error("nonceHex must be 32 hex characters (16 bytes)");
  return nonceHex.toLowerCase();
}

export function leafString(campaignId: string, recipient: string, allocation: string, nonceHex: string): string {
  if (!campaignId) throw new Error("campaignId is required");
  if (!recipient) throw new Error("recipient is required");
  if (!/^[0-9]+$/.test(allocation)) throw new Error("allocation must be a base-10 integer string");
  return `wdleaf1|${campaignId}|${recipient}|${allocation}|${nonceHex}`;
}

export function leafHash(campaignId: string, leaf: WhisperDropLeafInput): { nonceHex: string; leafHash: Uint8Array; leafStr: string } {
  const nonceHex = normalizeNonceHex(leaf.nonceHex);
  const ls = leafString(campaignId, leaf.recipient, leaf.allocation, nonceHex);
  return { nonceHex, leafHash: sha256Utf8(ls), leafStr: ls };
}

export function buildMerkleWithProofs(campaignId: string, leaves: WhisperDropLeafInput[]): WhisperDropMerkleBuildResult {
  if (!Array.isArray(leaves) || leaves.length === 0) throw new Error("leaves must be a non-empty array");

  const hashed = leaves.map(l => {
    const { nonceHex, leafHash } = leafHash(campaignId, l);
    return { recipient: l.recipient, allocation: l.allocation, nonceHex, leafHash };
  });

  const leafHashes = hashed.map(h => h.leafHash);
  const treeLevels: Uint8Array[][] = [leafHashes];
  while (treeLevels[treeLevels.length - 1].length > 1) {
    const cur = treeLevels[treeLevels.length - 1];
    const next: Uint8Array[] = [];
    for (let i = 0; i < cur.length; i += 2) {
      const left = cur[i];
      const right = (i + 1 < cur.length) ? cur[i + 1] : cur[i]; // duplicate last
      next.push(parentHash(left, right));
    }
    treeLevels.push(next);
  }
  const root = treeLevels[treeLevels.length - 1][0];

  const proofs: WhisperDropLeafProof[] = hashed.map((h, idx) => {
    const proof: string[] = [];
    let index = idx;
    for (let level = 0; level < treeLevels.length - 1; level++) {
      const layer = treeLevels[level];
      const isRight = (index % 2 === 1);
      const pairIndex = isRight ? index - 1 : index + 1;
      const sibling = (pairIndex < layer.length) ? layer[pairIndex] : layer[index];
      proof.push(bytesToB64Url(sibling));
      index = Math.floor(index / 2);
    }
    return {
      recipient: h.recipient,
      allocation: h.allocation,
      nonceHex: h.nonceHex,
      leafHashB64Url: bytesToB64Url(h.leafHash),
      proof
    };
  });

  // Defensive verification: ensure each leaf proof verifies against root
  for (const p of proofs) {
    const ok = verifyLeafProof(campaignId, p.recipient, p.allocation, p.nonceHex, p.proof, bytesToB64Url(root));
    if (!ok) throw new Error("internal error: generated proof did not verify");
  }

  return {
    campaignId,
    merkleRootB64Url: bytesToB64Url(root),
    leaves: proofs
  };
}

export function verifyLeafProof(
  campaignId: string,
  recipient: string,
  allocation: string,
  nonceHex: string,
  proofB64Url: string[],
  expectedRootB64Url: string
): boolean {
  const leaf = leafHash(campaignId, { recipient, allocation, nonceHex });
  let acc = leaf.leafHash;
  for (const sibB64 of proofB64Url) {
    const sibling = b64UrlToBytes(sibB64);
    acc = parentHash(acc, sibling);
  }
  const expected = b64UrlToBytes(expectedRootB64Url);
  return acc.length === expected.length && acc.every((v, i) => v === expected[i]);
}

export function parentHash(a: Uint8Array, b: Uint8Array): Uint8Array {
  const [x, y] = (compareBytes(a, b) <= 0) ? [a, b] : [b, a];
  return sha256Bytes(concatBytes(x, y));
}

function randomBytes(n: number): Uint8Array {
  // Prefer WebCrypto when available
  const g: any = globalThis as any;
  if (g.crypto && typeof g.crypto.getRandomValues === "function") {
    const out = new Uint8Array(n);
    g.crypto.getRandomValues(out);
    return out;
  }
  // Node.js fallback
  try {
    const nodeCrypto = require("crypto");
    return new Uint8Array(nodeCrypto.randomBytes(n));
  } catch {
    // Final fallback: hash a changing seed (still better than predictable zeros)
    const seed = `${Date.now()}|${Math.random()}|${process.pid || 0}`;
    const h = sha256Utf8(seed);
    return h.slice(0, n);
  }
}
