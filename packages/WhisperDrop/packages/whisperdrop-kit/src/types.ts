export type B64UrlString = string;

/**
 * WhisperDrop Campaign Manifest v1
 * Canonical JSON (stable key ordering) is hashed with SHA-256 to produce manifestHash.
 */
export interface WhisperDropManifestV1 {
  version: "whisperdrop.manifest.v1";
  campaignId: string;

  // Human-readable campaign metadata
  name: string;
  description?: string;

  // Time window, ISO-8601
  startTimeIso: string;
  endTimeIso: string;

  // Snapshot reference (must be fixed before Merkle commitment)
  snapshot: {
    type: "slot" | "timestamp";
    value: number;
    network: "solana-mainnet-beta" | "solana-devnet";
  };

  // Allocation rules (human readable). The fairness property comes from committing to this manifest.
  rules: {
    description: string;
    scoring?: string;
    caps?: {
      perWalletMax?: string;
      minEligibleScore?: string;
    };
  };

  // Token / asset details
  asset: {
    mint: string;
    decimals: number;
    totalAmount: string;
  };

  // Claim mechanics
  claim: {
    expiresTimeIso: string;
    // optional on-chain claim program or memo-only claim
    mode: "memo-claim" | "program-claim";
  };

  // Optional metadata
  tags?: string[];
}

/**
 * Leaf input used to build Merkle commitments.
 * allocation is a base-10 string representing the smallest unit amount (like lamports).
 */
export interface WhisperDropLeafInput {
  recipient: string; // typically a Solana public key (base58), but treated as opaque string for hashing
  allocation: string; // decimal string
  nonceHex?: string; // 32 hex chars (16 bytes). If omitted, you must generate one and store it with the leaf.
}

/**
 * Leaf content and its proof.
 * proof is an array of sibling hashes (raw bytes), represented as b64url strings.
 */
export interface WhisperDropLeafProof {
  recipient: string;
  allocation: string;
  nonceHex: string;
  leafHashB64Url: B64UrlString;
  proof: B64UrlString[];
}

export interface WhisperDropMerkleBuildResult {
  campaignId: string;
  merkleRootB64Url: B64UrlString;
  leaves: WhisperDropLeafProof[];
}

/**
 * Commitment memo v1 is public and anchors fairness:
 * - manifestHash commits to the eligibility rules and snapshot definition.
 * - merkleRoot commits to the computed eligible set + allocations.
 */
export interface WhisperDropCommitmentV1 {
  version: "whisperdrop.commitment.v1";
  manifestHashB64Url: B64UrlString;
  merkleRootB64Url: B64UrlString;
}
