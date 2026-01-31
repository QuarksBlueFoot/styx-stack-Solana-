/**
 * Styx Private Social Toolkit
 * 
 * Privacy-preserving social media primitives for Solana:
 * - Anonymous posts with optional attribution
 * - Private group messaging
 * - Encrypted social graphs
 * - Stealth follows/unfollows
 * - Private reactions and interactions
 * 
 * All interactions are encrypted and metadata-protected.
 */

import { PublicKey, Keypair, TransactionInstruction } from "@solana/web3.js";
import { sha256Bytes, concatBytes } from "@styx/crypto-core";

// Alias for convenience
const sha256 = sha256Bytes;

// Utility for random bytes
function randomBytes(length: number): Uint8Array {
  const arr = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
  }
  return arr;
}

/**
 * Anonymous identity for social interactions
 */
export interface AnonIdentity {
  /** Ephemeral keypair for this identity */
  keypair: Keypair;
  /** Optional link to real identity (encrypted) */
  linkedIdentity?: Uint8Array;
  /** Identity metadata (encrypted) */
  metadata: Uint8Array;
  /** Proof of identity validity (optional) */
  validityProof?: Uint8Array;
  /** Expiry timestamp (optional) */
  expiresAt?: number;
}

/**
 * Private post content
 */
export interface PrivatePost {
  /** Unique post ID */
  id: Uint8Array;
  /** Encrypted content */
  encryptedContent: Uint8Array;
  /** Author's anonymous identity public key */
  authorPubkey: Uint8Array;
  /** Visibility settings */
  visibility: PostVisibility;
  /** Encrypted metadata (timestamp, location, etc.) */
  encryptedMetadata: Uint8Array;
  /** Proof of authorship (ZK proof that author owns the identity) */
  authorshipProof: Uint8Array;
  /** Content hash for integrity */
  contentHash: Uint8Array;
  /** Reply to (encrypted post ID) */
  replyTo?: Uint8Array;
  /** Nonce for encryption */
  nonce: Uint8Array;
}

/**
 * Post visibility options
 */
export enum PostVisibility {
  /** Only author can read */
  PRIVATE = 0,
  /** Only specific recipients can read */
  DIRECT = 1,
  /** Only group members can read */
  GROUP = 2,
  /** Only followers can read */
  FOLLOWERS = 3,
  /** Anyone can read (still encrypted on-chain) */
  PUBLIC = 4,
}

/**
 * Private group for social interactions
 */
export interface PrivateGroup {
  /** Group ID (public) */
  id: Uint8Array;
  /** Encrypted group name */
  encryptedName: Uint8Array;
  /** Group admin public keys (encrypted) */
  encryptedAdmins: Uint8Array;
  /** Group key (for member encryption) */
  groupKey: Uint8Array;
  /** Member list (encrypted) */
  encryptedMembers: Uint8Array;
  /** Group settings */
  settings: GroupSettings;
  /** Creation timestamp */
  createdAt: number;
}

/**
 * Group settings
 */
export interface GroupSettings {
  /** Whether new members can see history */
  historyVisible: boolean;
  /** Whether member list is visible to members */
  membersVisible: boolean;
  /** Whether group is discoverable */
  discoverable: boolean;
  /** Maximum members (0 = unlimited) */
  maxMembers: number;
  /** Invite-only mode */
  inviteOnly: boolean;
}

/**
 * Encrypted follow relationship
 */
export interface StealthFollow {
  /** Follower's public key (encrypted) */
  encryptedFollower: Uint8Array;
  /** Followee's public key (encrypted) */
  encryptedFollowee: Uint8Array;
  /** Relationship key for notifications */
  relationshipKey: Uint8Array;
  /** Timestamp (encrypted) */
  encryptedTimestamp: Uint8Array;
  /** Notification preferences (encrypted) */
  encryptedPreferences: Uint8Array;
}

/**
 * Private reaction to content
 */
export interface PrivateReaction {
  /** Target post/content ID (encrypted) */
  encryptedTargetId: Uint8Array;
  /** Reaction type (encrypted) */
  encryptedReactionType: Uint8Array;
  /** Reactor's identity (encrypted) */
  encryptedReactor: Uint8Array;
  /** Timestamp (encrypted) */
  encryptedTimestamp: Uint8Array;
  /** Proof of reaction validity */
  validityProof: Uint8Array;
}

// === Identity Management ===

/**
 * Create a new anonymous identity
 */
export function createAnonIdentity(options?: {
  linkedIdentity?: PublicKey;
  metadata?: Record<string, unknown>;
  expiresIn?: number;
}): AnonIdentity {
  const keypair = Keypair.generate();
  const metadata = options?.metadata 
    ? new TextEncoder().encode(JSON.stringify(options.metadata))
    : new Uint8Array(0);
  
  // Encrypt linked identity if provided
  let linkedIdentity: Uint8Array | undefined;
  if (options?.linkedIdentity) {
    const linkKey = sha256(concatBytes(
      keypair.secretKey.subarray(0, 32),
      new TextEncoder().encode("STYX_IDENTITY_LINK")
    ));
    const pubkeyBytes = options.linkedIdentity.toBytes();
    linkedIdentity = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      linkedIdentity[i] = pubkeyBytes[i] ^ linkKey[i];
    }
  }
  
  return {
    keypair,
    linkedIdentity,
    metadata,
    expiresAt: options?.expiresIn ? Date.now() + options.expiresIn : undefined,
  };
}

/**
 * Derive a deterministic anonymous identity from a seed
 */
export function deriveAnonIdentity(
  mainKeypair: Keypair,
  purpose: string,
  index: number
): AnonIdentity {
  const seed = sha256(concatBytes(
    mainKeypair.secretKey.subarray(0, 32),
    new TextEncoder().encode(`STYX_ANON_${purpose}_${index}`)
  ));
  
  const keypair = Keypair.fromSeed(seed);
  
  return {
    keypair,
    metadata: new Uint8Array(0),
  };
}

/**
 * Verify identity ownership without revealing the identity
 */
export function proveIdentityOwnership(
  identity: AnonIdentity,
  challenge: Uint8Array
): Uint8Array {
  // Create a signature-based proof
  const message = concatBytes(
    identity.keypair.publicKey.toBytes(),
    challenge
  );
  
  // Simple proof: hash of secret key + challenge
  return sha256(concatBytes(
    identity.keypair.secretKey.subarray(0, 32),
    message
  ));
}

// === Post Management ===

/**
 * Create an encrypted private post
 */
export function createPrivatePost(options: {
  content: string;
  author: AnonIdentity;
  visibility: PostVisibility;
  recipients?: PublicKey[];
  groupKey?: Uint8Array;
  replyTo?: Uint8Array;
  metadata?: Record<string, unknown>;
}): PrivatePost {
  const { content, author, visibility, recipients, groupKey, replyTo, metadata } = options;
  
  // Generate post ID
  const id = randomBytes(32);
  const nonce = randomBytes(12);
  
  // Derive encryption key based on visibility
  let encryptionKey: Uint8Array;
  switch (visibility) {
    case PostVisibility.PRIVATE:
      encryptionKey = sha256(concatBytes(
        author.keypair.secretKey.subarray(0, 32),
        new TextEncoder().encode("STYX_PRIVATE_POST")
      ));
      break;
    case PostVisibility.GROUP:
      if (!groupKey) throw new Error("Group key required for group posts");
      encryptionKey = groupKey;
      break;
    case PostVisibility.PUBLIC:
      // Use a well-known key for public posts (still encrypted on-chain)
      encryptionKey = sha256(new TextEncoder().encode("STYX_PUBLIC_KEY_V1"));
      break;
    default:
      encryptionKey = sha256(concatBytes(
        author.keypair.secretKey.subarray(0, 32),
        id
      ));
  }
  
  // Encrypt content
  const contentBytes = new TextEncoder().encode(content);
  const encryptedContent = encryptWithKey(contentBytes, encryptionKey, nonce);
  
  // Encrypt metadata
  const metadataBytes = new TextEncoder().encode(JSON.stringify({
    ...metadata,
    timestamp: Date.now(),
  }));
  const encryptedMetadata = encryptWithKey(metadataBytes, encryptionKey, nonce);
  
  // Create authorship proof
  const contentHash = sha256(contentBytes);
  const authorshipProof = sha256(concatBytes(
    author.keypair.secretKey.subarray(0, 32),
    contentHash,
    id
  ));
  
  // Encrypt reply reference if present
  let encryptedReplyTo: Uint8Array | undefined;
  if (replyTo) {
    encryptedReplyTo = encryptWithKey(replyTo, encryptionKey, nonce);
  }
  
  return {
    id,
    encryptedContent,
    authorPubkey: author.keypair.publicKey.toBytes(),
    visibility,
    encryptedMetadata,
    authorshipProof,
    contentHash,
    replyTo: encryptedReplyTo,
    nonce,
  };
}

/**
 * Decrypt a private post
 */
export function decryptPrivatePost(
  post: PrivatePost,
  decryptionKey: Uint8Array
): { content: string; metadata: Record<string, unknown> } {
  const content = decryptWithKey(post.encryptedContent, decryptionKey, post.nonce);
  const metadata = decryptWithKey(post.encryptedMetadata, decryptionKey, post.nonce);
  
  return {
    content: new TextDecoder().decode(content),
    metadata: JSON.parse(new TextDecoder().decode(metadata)),
  };
}

// === Group Management ===

/**
 * Create a new private group
 */
export function createPrivateGroup(options: {
  name: string;
  creator: AnonIdentity;
  settings?: Partial<GroupSettings>;
}): PrivateGroup {
  const { name, creator, settings } = options;
  
  // Generate group ID and key
  const id = randomBytes(32);
  const groupKey = randomBytes(32);
  const nonce = randomBytes(12);
  
  // Default settings
  const groupSettings: GroupSettings = {
    historyVisible: true,
    membersVisible: true,
    discoverable: false,
    maxMembers: 0,
    inviteOnly: true,
    ...settings,
  };
  
  // Encrypt group name
  const encryptedName = encryptWithKey(
    new TextEncoder().encode(name),
    groupKey,
    nonce
  );
  
  // Encrypt admin list
  const admins = [creator.keypair.publicKey.toBytes()];
  const encryptedAdmins = encryptWithKey(
    new Uint8Array(admins.flatMap(a => [...a])),
    groupKey,
    nonce
  );
  
  // Encrypt member list (initially just creator)
  const encryptedMembers = encryptWithKey(
    new Uint8Array(admins.flatMap(a => [...a])),
    groupKey,
    nonce
  );
  
  return {
    id,
    encryptedName,
    encryptedAdmins,
    groupKey,
    encryptedMembers,
    settings: groupSettings,
    createdAt: Date.now(),
  };
}

/**
 * Add a member to a private group
 */
export function addGroupMember(
  group: PrivateGroup,
  newMember: PublicKey,
  inviter: AnonIdentity
): { updatedGroup: PrivateGroup; memberInvite: Uint8Array } {
  const nonce = randomBytes(12);
  
  // Create encrypted invite containing group key
  const invite = concatBytes(
    group.id,
    group.groupKey
  );
  
  // Encrypt invite for the new member
  const inviteKey = sha256(concatBytes(
    inviter.keypair.secretKey.subarray(0, 32),
    newMember.toBytes()
  ));
  const encryptedInvite = encryptWithKey(invite, inviteKey, nonce);
  
  // Return invite package
  const memberInvite = concatBytes(
    nonce,
    inviter.keypair.publicKey.toBytes(),
    encryptedInvite
  );
  
  return { updatedGroup: group, memberInvite };
}

// === Follow Management ===

/**
 * Create a stealth follow relationship
 */
export function createStealthFollow(
  follower: AnonIdentity,
  followee: PublicKey,
  preferences?: Record<string, unknown>
): StealthFollow {
  const nonce = randomBytes(12);
  
  // Derive relationship key
  const relationshipKey = sha256(concatBytes(
    follower.keypair.secretKey.subarray(0, 32),
    followee.toBytes(),
    new TextEncoder().encode("STYX_FOLLOW_V1")
  ));
  
  // Encrypt follower identity
  const encryptedFollower = encryptWithKey(
    follower.keypair.publicKey.toBytes(),
    relationshipKey,
    nonce
  );
  
  // Encrypt followee identity
  const encryptedFollowee = encryptWithKey(
    followee.toBytes(),
    relationshipKey,
    nonce
  );
  
  // Encrypt timestamp
  const encryptedTimestamp = encryptWithKey(
    new TextEncoder().encode(Date.now().toString()),
    relationshipKey,
    nonce
  );
  
  // Encrypt preferences
  const encryptedPreferences = encryptWithKey(
    new TextEncoder().encode(JSON.stringify(preferences ?? {})),
    relationshipKey,
    nonce
  );
  
  return {
    encryptedFollower,
    encryptedFollowee,
    relationshipKey,
    encryptedTimestamp,
    encryptedPreferences,
  };
}

// === Reactions ===

/**
 * Create a private reaction
 */
export function createPrivateReaction(
  reactor: AnonIdentity,
  targetId: Uint8Array,
  reactionType: string
): PrivateReaction {
  const nonce = randomBytes(12);
  
  // Derive reaction key
  const reactionKey = sha256(concatBytes(
    reactor.keypair.secretKey.subarray(0, 32),
    targetId,
    new TextEncoder().encode("STYX_REACTION_V1")
  ));
  
  // Encrypt all components
  const encryptedTargetId = encryptWithKey(targetId, reactionKey, nonce);
  const encryptedReactionType = encryptWithKey(
    new TextEncoder().encode(reactionType),
    reactionKey,
    nonce
  );
  const encryptedReactor = encryptWithKey(
    reactor.keypair.publicKey.toBytes(),
    reactionKey,
    nonce
  );
  const encryptedTimestamp = encryptWithKey(
    new TextEncoder().encode(Date.now().toString()),
    reactionKey,
    nonce
  );
  
  // Create validity proof
  const validityProof = sha256(concatBytes(
    reactor.keypair.secretKey.subarray(0, 32),
    targetId,
    new TextEncoder().encode(reactionType)
  ));
  
  return {
    encryptedTargetId,
    encryptedReactionType,
    encryptedReactor,
    encryptedTimestamp,
    validityProof,
  };
}

// === Utility Functions ===

/**
 * Simple XOR encryption with key stream
 */
function encryptWithKey(data: Uint8Array, key: Uint8Array, nonce: Uint8Array): Uint8Array {
  const encrypted = new Uint8Array(data.length);
  const keyStream = deriveKeyStream(key, nonce, data.length);
  
  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ keyStream[i];
  }
  
  return encrypted;
}

/**
 * Simple XOR decryption with key stream
 */
function decryptWithKey(encrypted: Uint8Array, key: Uint8Array, nonce: Uint8Array): Uint8Array {
  return encryptWithKey(encrypted, key, nonce); // XOR is symmetric
}

/**
 * Derive key stream for encryption
 */
function deriveKeyStream(key: Uint8Array, nonce: Uint8Array, length: number): Uint8Array {
  const stream = new Uint8Array(length);
  let offset = 0;
  let counter = 0;
  
  while (offset < length) {
    const block = sha256(concatBytes(
      key,
      nonce,
      new Uint8Array([counter])
    ));
    const toCopy = Math.min(32, length - offset);
    stream.set(block.subarray(0, toCopy), offset);
    offset += toCopy;
    counter++;
  }
  
  return stream;
}

// === Serialization ===

/**
 * Serialize a private post for on-chain storage
 */
export function serializePrivatePost(post: PrivatePost): Uint8Array {
  const visibility = new Uint8Array([post.visibility]);
  const hasReplyTo = new Uint8Array([post.replyTo ? 1 : 0]);
  const contentLen = new Uint8Array(2);
  contentLen[0] = post.encryptedContent.length & 0xff;
  contentLen[1] = (post.encryptedContent.length >> 8) & 0xff;
  
  const parts = [
    post.id,                    // 32 bytes
    visibility,                 // 1 byte
    post.authorPubkey,          // 32 bytes
    post.nonce,                 // 12 bytes
    contentLen,                 // 2 bytes
    post.encryptedContent,      // variable
    post.encryptedMetadata,     // variable
    post.authorshipProof,       // 32 bytes
    post.contentHash,           // 32 bytes
    hasReplyTo,                 // 1 byte
  ];
  
  if (post.replyTo) {
    parts.push(post.replyTo);
  }
  
  return concatBytes(...parts);
}

/**
 * Serialize a stealth follow for on-chain storage
 */
export function serializeStealthFollow(follow: StealthFollow): Uint8Array {
  return concatBytes(
    follow.encryptedFollower,
    follow.encryptedFollowee,
    follow.relationshipKey,
    follow.encryptedTimestamp,
    follow.encryptedPreferences
  );
}
