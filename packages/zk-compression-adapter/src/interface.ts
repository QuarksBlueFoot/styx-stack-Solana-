import { PublicKey } from "@solana/web3.js";

/**
 * ZK Compression Adapter
 *
 * This package provides a thin abstraction layer so Styx features can optionally
 * use compressed state (e.g., for group membership, registries, and selective disclosure)
 * without hard-coding a single vendor/protocol.
 */

export type CompressedRoot = {
  root: Uint8Array;
  slot: number;
};

export type MembershipProof = {
  leaf: Uint8Array;
  path: Uint8Array[];
  indices: number[];
  root: Uint8Array;
};

export interface CompressedStateProvider {
  /** Resolve the latest root for a given namespace/program. */
  getLatestRoot(args: { namespace: PublicKey }): Promise<CompressedRoot>;

  /** Get a membership proof for (namespace, leaf). */
  getMembershipProof(args: { namespace: PublicKey; leaf: Uint8Array }): Promise<MembershipProof>;
}
