/**
 * WhisperDrop Module - Private Airdrops
 */

// Re-export from whisperdrop-sdk
export * from '../../whisperdrop-sdk/src/index';

// Explicit re-exports
export {
  WhisperDropClient,
  WHISPERDROP_PROGRAM_ID,
  WHISPERDROP_DEVNET_PROGRAM_ID,
  GateType,
  computeLeafHash,
  computeNodeHash,
  buildMerkleTree,
  type Allocation,
  type CampaignConfig,
  type MerkleProof,
  type Campaign,
} from '../../whisperdrop-sdk/src/index';

// Private launch
export * from '../../whisperdrop-sdk/src/private-launch';

import { Connection, PublicKey } from '@solana/web3.js';

/**
 * Create a WhisperDrop client
 */
export function createWhisperDropClient(
  connection: Connection,
  programId?: PublicKey
): import('../../whisperdrop-sdk/src/index').WhisperDropClient {
  const { WhisperDropClient, WHISPERDROP_PROGRAM_ID } = require('../../whisperdrop-sdk/src/index');
  return new WhisperDropClient(connection, programId || WHISPERDROP_PROGRAM_ID);
}

// Merkle helpers
export { buildMerkleTree as generateMerkleTree } from '../../whisperdrop-sdk/src/index';

/**
 * Generate a Merkle proof for a specific allocation
 */
export function generateMerkleProof(
  tree: { root: Uint8Array; leaves: Uint8Array[]; proofs: Map<string, Uint8Array[]> },
  leafIndex: number
): Uint8Array[] {
  const leaf = tree.leaves[leafIndex];
  const leafKey = Buffer.from(leaf).toString('hex');
  return tree.proofs.get(leafKey) || [];
}

/**
 * Verify a Merkle proof
 */
export function verifyMerkleProof(
  root: Uint8Array,
  leaf: Uint8Array,
  proof: Uint8Array[]
): boolean {
  const { sha256 } = require('@noble/hashes/sha256');
  const NODE_DOMAIN = Buffer.from('whisperdrop:node:v1');
  
  let current = leaf;
  for (const sibling of proof) {
    const combined = current < sibling
      ? Buffer.concat([NODE_DOMAIN, Buffer.from(current), Buffer.from(sibling)])
      : Buffer.concat([NODE_DOMAIN, Buffer.from(sibling), Buffer.from(current)]);
    current = sha256(combined);
  }
  
  return Buffer.from(current).equals(Buffer.from(root));
}
