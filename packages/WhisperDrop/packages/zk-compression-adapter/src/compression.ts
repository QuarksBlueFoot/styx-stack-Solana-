import { PublicKey, Connection } from "@solana/web3.js";
import type { CompressedStateProvider, CompressedRoot, MembershipProof } from "./interface";

/**
 * Compression utilities for privacy-aware state management.
 * 
 * Compressed state can reduce costs and improve privacy for large state trees
 * like group membership, access control lists, or private registries.
 */

/**
 * Compute a leaf hash for membership proofs.
 */
export function computeLeafHash(args: {
  namespace: PublicKey;
  key: Uint8Array;
  value: Uint8Array;
}): Uint8Array {
  // Use a simple concatenation + hash approach
  // Real implementation would use Poseidon or similar ZK-friendly hash
  const encoder = new TextEncoder();
  const prefix = encoder.encode("styx-leaf-v1");
  const namespaceBytes = args.namespace.toBytes();
  
  const combined = new Uint8Array(
    prefix.length + namespaceBytes.length + args.key.length + args.value.length
  );
  let offset = 0;
  combined.set(prefix, offset); offset += prefix.length;
  combined.set(namespaceBytes, offset); offset += namespaceBytes.length;
  combined.set(args.key, offset); offset += args.key.length;
  combined.set(args.value, offset);
  
  // Simple hash (would use crypto.subtle.digest in browser)
  return simpleHash(combined);
}

/**
 * Simple hash function for demos (replace with proper crypto in production).
 */
function simpleHash(data: Uint8Array): Uint8Array {
  // FNV-1a based expansion to 32 bytes
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  
  for (let i = 0; i < data.length; i++) {
    h1 ^= data[i];
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= data[i];
    h2 = Math.imul(h2, 0x1b873593);
  }
  
  const result = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    result[i] = (h1 >> (i * 4)) & 0xff;
    result[i + 8] = (h2 >> (i * 4)) & 0xff;
    result[i + 16] = ((h1 + h2) >> (i * 4)) & 0xff;
    result[i + 24] = ((h1 ^ h2) >> (i * 4)) & 0xff;
  }
  
  return result;
}

/**
 * Verify a membership proof against a root.
 */
export function verifyMembershipProof(
  proof: MembershipProof,
  expectedRoot: Uint8Array
): boolean {
  let current = proof.leaf;
  
  for (let i = 0; i < proof.path.length; i++) {
    const sibling = proof.path[i];
    const isLeft = (proof.indices[i] & 1) === 0;
    
    // Combine current node with sibling
    const combined = new Uint8Array(64);
    if (isLeft) {
      combined.set(current, 0);
      combined.set(sibling, 32);
    } else {
      combined.set(sibling, 0);
      combined.set(current, 32);
    }
    
    current = simpleHash(combined);
  }
  
  return current.every((b, i) => b === expectedRoot[i]);
}

/**
 * Privacy-aware group membership manager.
 * Uses compressed state for efficient membership proofs.
 */
export class PrivateGroupMembership {
  private members = new Map<string, Uint8Array>();
  private root: Uint8Array | null = null;
  
  constructor(
    private readonly namespace: PublicKey,
    private readonly provider?: CompressedStateProvider
  ) {}
  
  /**
   * Add a member to the group.
   */
  addMember(memberPubkey: PublicKey, metadata?: Uint8Array): void {
    const key = memberPubkey.toBase58();
    const value = metadata ?? new Uint8Array(0);
    this.members.set(key, value);
    this.root = null; // Invalidate cached root
  }
  
  /**
   * Remove a member from the group.
   */
  removeMember(memberPubkey: PublicKey): boolean {
    const deleted = this.members.delete(memberPubkey.toBase58());
    if (deleted) {
      this.root = null;
    }
    return deleted;
  }
  
  /**
   * Check if a pubkey is a member.
   */
  isMember(memberPubkey: PublicKey): boolean {
    return this.members.has(memberPubkey.toBase58());
  }
  
  /**
   * Get the current root hash.
   */
  getRoot(): Uint8Array {
    if (this.root) {
      return this.root;
    }
    
    // Build Merkle tree from members
    const leaves: Uint8Array[] = [];
    for (const [keyStr, value] of this.members) {
      const key = new PublicKey(keyStr).toBytes();
      leaves.push(computeLeafHash({
        namespace: this.namespace,
        key,
        value
      }));
    }
    
    if (leaves.length === 0) {
      this.root = new Uint8Array(32);
      return this.root;
    }
    
    // Build tree bottom-up
    let level = leaves;
    while (level.length > 1) {
      const nextLevel: Uint8Array[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] ?? level[i]; // Duplicate if odd
        
        const combined = new Uint8Array(64);
        combined.set(left, 0);
        combined.set(right, 32);
        nextLevel.push(simpleHash(combined));
      }
      level = nextLevel;
    }
    
    this.root = level[0];
    return this.root;
  }
  
  /**
   * Generate a membership proof for a specific member.
   */
  generateProof(memberPubkey: PublicKey): MembershipProof | null {
    if (!this.isMember(memberPubkey)) {
      return null;
    }
    
    const memberData = this.members.get(memberPubkey.toBase58())!;
    const leaf = computeLeafHash({
      namespace: this.namespace,
      key: memberPubkey.toBytes(),
      value: memberData
    });
    
    // Build full tree and extract path
    const leaves: Uint8Array[] = [];
    const memberIndex = [...this.members.keys()].indexOf(memberPubkey.toBase58());
    
    for (const [keyStr, value] of this.members) {
      const key = new PublicKey(keyStr).toBytes();
      leaves.push(computeLeafHash({
        namespace: this.namespace,
        key,
        value
      }));
    }
    
    const path: Uint8Array[] = [];
    const indices: number[] = [];
    
    let level = leaves;
    let idx = memberIndex;
    
    while (level.length > 1) {
      const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
      if (siblingIdx < level.length) {
        path.push(level[siblingIdx]);
      } else {
        path.push(level[idx]); // Self-sibling for odd trees
      }
      indices.push(idx);
      
      // Move to next level
      const nextLevel: Uint8Array[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] ?? level[i];
        const combined = new Uint8Array(64);
        combined.set(left, 0);
        combined.set(right, 32);
        nextLevel.push(simpleHash(combined));
      }
      level = nextLevel;
      idx = Math.floor(idx / 2);
    }
    
    return {
      leaf,
      path,
      indices,
      root: this.getRoot()
    };
  }
  
  /**
   * Get member count.
   */
  get size(): number {
    return this.members.size;
  }
}

/**
 * Privacy-preserving access control list.
 */
export type AccessLevel = "none" | "read" | "write" | "admin";

export class PrivateAccessControl {
  private acl = new Map<string, AccessLevel>();
  private membership: PrivateGroupMembership;
  
  constructor(namespace: PublicKey) {
    this.membership = new PrivateGroupMembership(namespace);
  }
  
  /**
   * Grant access to a user.
   */
  grant(user: PublicKey, level: AccessLevel): void {
    const key = user.toBase58();
    this.acl.set(key, level);
    
    const levelByte = ["none", "read", "write", "admin"].indexOf(level);
    this.membership.addMember(user, new Uint8Array([levelByte]));
  }
  
  /**
   * Revoke access from a user.
   */
  revoke(user: PublicKey): void {
    this.acl.delete(user.toBase58());
    this.membership.removeMember(user);
  }
  
  /**
   * Check if user has at least the specified access level.
   */
  hasAccess(user: PublicKey, requiredLevel: AccessLevel): boolean {
    const current = this.acl.get(user.toBase58()) ?? "none";
    const levels = ["none", "read", "write", "admin"];
    return levels.indexOf(current) >= levels.indexOf(requiredLevel);
  }
  
  /**
   * Get the root hash for on-chain verification.
   */
  getRoot(): Uint8Array {
    return this.membership.getRoot();
  }
  
  /**
   * Generate access proof for a user.
   */
  generateAccessProof(user: PublicKey): MembershipProof | null {
    return this.membership.generateProof(user);
  }
}
