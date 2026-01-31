/**
 * @styx-stack/whisperdrop-kit - DAM Token Launch
 * 
 * Private SPL Token Launches with Deferred Account Materialization
 * 
 * Features:
 * - Fair launch with Merkle commitment (sybil resistant)
 * - ZERO rent airdrops (virtual balances)
 * - Recipients materialize on-demand (pays own rent)
 * - De-materialize to reclaim rent (unique to SPS!)
 * - Private claim proofs (commitment-based)
 */

import { PublicKey, Connection, Keypair, TransactionInstruction } from "@solana/web3.js";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import type {
  WhisperDropManifestV1,
  WhisperDropLeafInput,
  WhisperDropLeafProof,
  WhisperDropMerkleBuildResult,
  WhisperDropCommitmentV1,
  B64UrlString,
} from "./types";
import { buildMerkleTree, computeMerkleProof } from "./merkle";
import { canonicalizeManifest, hashManifest } from "./manifest";

// ============================================================================
// CONSTANTS
// ============================================================================

/** SPS Program ID - Mainnet */
export const SPS_PROGRAM_ID = new PublicKey("GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9");

/** DAM Domain ID */
export const DOMAIN_DAM = 0x0e;

/** DAM Operations */
export const DAM_OPS = {
  OP_POOL_CREATE: 0x01,
  OP_VIRTUAL_MINT: 0x10,
  OP_BATCH_VIRTUAL_MINT: 0x14,
  OP_MATERIALIZE: 0x20,
  OP_DEMATERIALIZE: 0x30,
  OP_ROOT_COMMIT: 0x13,
} as const;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Token launch configuration
 */
export interface TokenLaunchConfig {
  /** Token name */
  name: string;
  /** Token symbol */
  symbol: string;
  /** Token decimals */
  decimals: number;
  /** Total supply (smallest unit) */
  totalSupply: bigint;
  /** Token URI (metadata) */
  uri?: string;
  /** Royalty basis points (for NFT-like tokens) */
  royaltyBps?: number;
  /** Launch creator */
  creator: PublicKey;
}

/**
 * Airdrop allocation
 */
export interface AirdropAllocation {
  /** Recipient public key */
  recipient: PublicKey;
  /** Amount to airdrop */
  amount: bigint;
  /** Optional private nonce */
  nonce?: Uint8Array;
}

/**
 * Token launch result
 */
export interface TokenLaunchResult {
  /** Token mint address */
  mint: PublicKey;
  /** DAM pool address */
  pool: PublicKey;
  /** Merkle root for airdrop */
  merkleRoot: Uint8Array;
  /** Campaign manifest */
  manifest: WhisperDropManifestV1;
  /** Commitment for on-chain anchoring */
  commitment: WhisperDropCommitmentV1;
  /** Leaf proofs for each recipient */
  leafProofs: WhisperDropLeafProof[];
  /** Total rent cost */
  totalRentCost: number;
}

/**
 * Claim proof for materialization
 */
export interface ClaimProof {
  /** Merkle proof */
  merkleProof: Uint8Array[];
  /** Proof directions */
  directions: number[];
  /** Leaf hash */
  leafHash: Uint8Array;
  /** Root slot */
  rootSlot: bigint;
  /** Amount */
  amount: bigint;
  /** Nonce */
  nonce: Uint8Array;
}

// ============================================================================
// HELPERS
// ============================================================================

function toB64Url(bytes: Uint8Array): B64UrlString {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function fromB64Url(str: B64UrlString): Uint8Array {
  return Buffer.from(
    str.replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  );
}

function generateNonce(): Uint8Array {
  const nonce = new Uint8Array(16);
  crypto.getRandomValues(nonce);
  return nonce;
}

// ============================================================================
// DAM TOKEN LAUNCH
// ============================================================================

/**
 * Build a private token launch with DAM
 * 
 * This creates:
 * 1. Token mint (Token-2022)
 * 2. DAM pool (shared, ~0.002 SOL)
 * 3. Virtual balance allocations (ZERO rent!)
 * 4. Merkle commitment for fair claim
 */
export function buildTokenLaunch(
  config: TokenLaunchConfig,
  allocations: AirdropAllocation[],
  campaignId: string,
): TokenLaunchResult {
  // Generate mint keypair (deterministic from campaign + creator)
  const mintSeed = sha256(
    Buffer.concat([
      Buffer.from("SPS_DAM_MINT_V1"),
      Buffer.from(campaignId),
      config.creator.toBytes(),
    ])
  );
  
  // Derive mint PDA
  const [mint] = PublicKey.findProgramAddressSync(
    [Buffer.from("dam_mint"), mintSeed],
    SPS_PROGRAM_ID
  );
  
  // Derive pool PDA
  const [pool] = PublicKey.findProgramAddressSync(
    [Buffer.from("dam_pool"), mint.toBytes()],
    SPS_PROGRAM_ID
  );
  
  // Build leaf inputs with nonces
  const leafInputs: WhisperDropLeafInput[] = allocations.map((alloc) => {
    const nonce = alloc.nonce ?? generateNonce();
    return {
      recipient: alloc.recipient.toBase58(),
      allocation: alloc.amount.toString(),
      nonceHex: bytesToHex(nonce),
    };
  });
  
  // Build Merkle tree
  const merkleResult = buildMerkleTree(campaignId, leafInputs);
  const merkleRoot = fromB64Url(merkleResult.merkleRootB64Url);
  
  // Build manifest
  const now = new Date();
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const expiryDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days
  
  const manifest: WhisperDropManifestV1 = {
    version: "whisperdrop.manifest.v1",
    campaignId,
    name: config.name,
    description: `Fair launch of ${config.symbol} using SPS DAM`,
    startTimeIso: now.toISOString(),
    endTimeIso: endDate.toISOString(),
    snapshot: {
      type: "slot",
      value: 0, // Will be set at launch time
      network: "solana-mainnet-beta",
    },
    rules: {
      description: "Fair launch with Merkle commitment",
      scoring: "Equal allocation per eligible wallet",
    },
    asset: {
      mint: mint.toBase58(),
      decimals: config.decimals,
      totalAmount: config.totalSupply.toString(),
    },
    claim: {
      expiresTimeIso: expiryDate.toISOString(),
      mode: "program-claim",
    },
    tags: ["sps", "dam", "fair-launch", config.symbol.toLowerCase()],
  };
  
  // Build commitment
  const manifestHash = hashManifest(manifest);
  const commitment: WhisperDropCommitmentV1 = {
    version: "whisperdrop.commitment.v1",
    manifestHashB64Url: toB64Url(manifestHash),
    merkleRootB64Url: merkleResult.merkleRootB64Url,
  };
  
  // Calculate cost: only pool creation (~0.002 SOL)
  const poolRent = 0.002;
  
  return {
    mint,
    pool,
    merkleRoot,
    manifest,
    commitment,
    leafProofs: merkleResult.leaves,
    totalRentCost: poolRent, // ZERO per-user rent!
  };
}

/**
 * Build claim instruction with Merkle proof
 * User provides proof to materialize their allocation
 */
export function buildClaimInstruction(
  mint: PublicKey,
  recipient: PublicKey,
  proof: ClaimProof,
  destinationAccount: PublicKey,
): TransactionInstruction {
  const [pool] = PublicKey.findProgramAddressSync(
    [Buffer.from("dam_pool"), mint.toBytes()],
    SPS_PROGRAM_ID
  );
  
  // Derive nullifier PDA
  const nullifierSeed = sha256(
    Buffer.concat([
      Buffer.from("DAM_CLAIM_NULLIFIER_V1"),
      proof.leafHash,
      Buffer.from(proof.rootSlot.toString()),
    ])
  );
  const [nullifierPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("dam_null"), nullifierSeed],
    SPS_PROGRAM_ID
  );
  
  // Build proof data
  const proofData = Buffer.alloc(1 + proof.merkleProof.length * 33);
  proofData.writeUInt8(proof.merkleProof.length, 0);
  for (let i = 0; i < proof.merkleProof.length; i++) {
    Buffer.from(proof.merkleProof[i]).copy(proofData, 1 + i * 33);
    proofData[1 + i * 33 + 32] = proof.directions[i];
  }
  
  // Build instruction data
  const data = Buffer.concat([
    Buffer.from([DOMAIN_DAM, DAM_OPS.OP_MATERIALIZE]),
    mint.toBuffer(),
    Buffer.from(new BigUint64Array([proof.amount]).buffer),
    Buffer.from(proof.leafHash),
    Buffer.from(proof.nonce),
    proofData,
  ]);
  
  return new TransactionInstruction({
    programId: SPS_PROGRAM_ID,
    keys: [
      { pubkey: recipient, isSigner: true, isWritable: true },
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: destinationAccount, isSigner: false, isWritable: true },
      { pubkey: nullifierPda, isSigner: false, isWritable: true },
    ],
    data,
  });
}

/**
 * Build virtual mint instruction for batch allocations
 * Mints to virtual balances (ZERO rent, commitment-based)
 */
export function buildBatchVirtualMintInstruction(
  mint: PublicKey,
  minter: PublicKey,
  merkleRoot: Uint8Array,
  leafCount: number,
  totalAmount: bigint,
): TransactionInstruction {
  const data = Buffer.alloc(84);
  let offset = 0;
  
  data.writeUInt8(DOMAIN_DAM, offset++);
  data.writeUInt8(DAM_OPS.OP_BATCH_VIRTUAL_MINT, offset++);
  mint.toBuffer().copy(data, offset); offset += 32;
  Buffer.from(merkleRoot).copy(data, offset); offset += 32;
  data.writeUInt32LE(leafCount, offset); offset += 4;
  data.writeBigUInt64LE(totalAmount, offset);
  
  return new TransactionInstruction({
    programId: SPS_PROGRAM_ID,
    keys: [
      { pubkey: minter, isSigner: true, isWritable: true },
    ],
    data,
  });
}

/**
 * Estimate cost comparison for different launch methods
 */
export function estimateLaunchCosts(recipientCount: number, activeClaimPercent: number = 30): {
  traditionalAirdrop: { rent: number; method: string };
  compressedAirdrop: { rent: number; method: string };
  damLaunch: { rent: number; method: string };
  savings: { vsSpl: string; vsCompressed: string };
} {
  const splRentPerAccount = 0.00203928;
  const treeRent = 0.0089;
  const compressedPerUser = 0.00004;
  const damPoolRent = 0.002;
  const damMaterializeRent = 0.002;
  
  const traditionalRent = recipientCount * splRentPerAccount;
  const compressedRent = treeRent + (recipientCount * compressedPerUser);
  const damRent = damPoolRent + (recipientCount * (activeClaimPercent / 100) * damMaterializeRent);
  
  return {
    traditionalAirdrop: {
      rent: Math.round(traditionalRent * 1000) / 1000,
      method: "SPL Token airdrop (one account per recipient)",
    },
    compressedAirdrop: {
      rent: Math.round(compressedRent * 1000) / 1000,
      method: "Compressed tokens (Light Protocol style)",
    },
    damLaunch: {
      rent: Math.round(damRent * 1000) / 1000,
      method: `DAM Fair Launch (${activeClaimPercent}% materialize)`,
    },
    savings: {
      vsSpl: `${Math.round((1 - damRent / traditionalRent) * 100)}% less than SPL`,
      vsCompressed: damRent < compressedRent 
        ? `${Math.round((1 - damRent / compressedRent) * 100)}% less than compressed`
        : `${Math.round((damRent / compressedRent - 1) * 100)}% more (but with privacy + rent recovery!)`,
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  buildTokenLaunch,
  buildClaimInstruction,
  buildBatchVirtualMintInstruction,
  estimateLaunchCosts,
};
