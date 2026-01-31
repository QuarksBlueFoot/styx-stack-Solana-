/**
 * Styx Game Privacy - Advanced Features
 * 
 * Enhanced gaming privacy primitives:
 * - Verifiable Random Functions (VRF) for fair randomness
 * - Mental Poker for trustless card games
 * - Private matchmaking
 * - Hidden action commitment
 * - Anti-cheat with privacy preservation
 */

import { sha256Bytes, concatBytes } from "@styx/crypto-core";
import nacl from "tweetnacl";

// Utility for random bytes
function randomBytes(length: number): Uint8Array {
  return nacl.randomBytes(length);
}

// === Verifiable Random Functions ===

export interface VRFProof {
  /** VRF output (deterministic random value) */
  output: Uint8Array;
  /** Proof that output was correctly computed */
  proof: Uint8Array;
  /** Public key used for VRF */
  publicKey: Uint8Array;
  /** Input that was used */
  input: Uint8Array;
}

/**
 * Generate a verifiable random value.
 * The value is deterministic for a given input and secret key,
 * but unpredictable without the secret key.
 */
export function vrfGenerate(
  secretKey: Uint8Array,
  input: Uint8Array
): VRFProof {
  // Derive public key
  const publicKey = nacl.sign.keyPair.fromSecretKey(
    concatBytes(secretKey, new Uint8Array(32))
  ).publicKey;
  
  // Generate VRF output: H(H(sk || input))
  const inner = sha256Bytes(concatBytes(secretKey, input));
  const output = sha256Bytes(inner);
  
  // Create proof: signature of (input || output)
  const message = concatBytes(input, output);
  const proof = nacl.sign.detached(
    message,
    concatBytes(secretKey, publicKey)
  );
  
  return { output, proof, publicKey, input };
}

/**
 * Verify a VRF proof
 */
export function vrfVerify(vrfProof: VRFProof): boolean {
  const message = concatBytes(vrfProof.input, vrfProof.output);
  return nacl.sign.detached.verify(message, vrfProof.proof, vrfProof.publicKey);
}

// === Mental Poker ===

export interface Deck {
  /** Encrypted cards */
  cards: Uint8Array[];
  /** Number of cards in deck */
  size: number;
  /** Shuffle commitments from all players */
  shuffleCommitments: Map<string, Uint8Array>;
}

export interface PlayerHand {
  /** Player's card indices (encrypted) */
  encryptedIndices: Uint8Array;
  /** Decryption shares needed from other players */
  decryptionShares: Map<string, Uint8Array>;
}

/**
 * Create an encrypted deck of cards
 */
export function createEncryptedDeck(
  numCards: number,
  sessionKey: Uint8Array
): Deck {
  const cards: Uint8Array[] = [];
  
  for (let i = 0; i < numCards; i++) {
    // Each card is encrypted with position and session key
    const cardData = new Uint8Array(4);
    cardData[0] = i & 0xff;
    cardData[1] = (i >> 8) & 0xff;
    cardData[2] = (i >> 16) & 0xff;
    cardData[3] = (i >> 24) & 0xff;
    
    const encrypted = sha256Bytes(concatBytes(
      sessionKey,
      cardData,
      new TextEncoder().encode("STYX_CARD_ENCRYPT_V1")
    ));
    
    cards.push(encrypted);
  }
  
  return {
    cards,
    size: numCards,
    shuffleCommitments: new Map(),
  };
}

/**
 * Shuffle and re-encrypt a deck (player's contribution to shuffle)
 */
export function shuffleAndReencrypt(
  deck: Deck,
  playerKey: Uint8Array,
  playerId: string
): { deck: Deck; shuffleProof: Uint8Array } {
  // Generate random permutation
  const permutation = generatePermutation(deck.size);
  
  // Apply permutation and re-encrypt
  const shuffledCards: Uint8Array[] = [];
  for (let i = 0; i < deck.size; i++) {
    const originalCard = deck.cards[permutation[i]];
    
    // Re-encrypt with player's key layer
    const reencrypted = sha256Bytes(concatBytes(
      playerKey,
      originalCard,
      new Uint8Array([i])
    ));
    
    shuffledCards.push(reencrypted);
  }
  
  // Create shuffle commitment
  const permutationBytes = new Uint8Array(permutation);
  const shuffleProof = sha256Bytes(concatBytes(
    playerKey,
    permutationBytes
  ));
  
  deck.shuffleCommitments.set(playerId, shuffleProof);
  
  return {
    deck: { ...deck, cards: shuffledCards },
    shuffleProof,
  };
}

/**
 * Generate a random permutation (Fisher-Yates)
 */
function generatePermutation(n: number): number[] {
  const perm = Array.from({ length: n }, (_, i) => i);
  
  for (let i = n - 1; i > 0; i--) {
    const randomBytes = nacl.randomBytes(4);
    const j = (randomBytes[0] | (randomBytes[1] << 8) | 
               (randomBytes[2] << 16) | (randomBytes[3] << 24)) >>> 0;
    const k = j % (i + 1);
    [perm[i], perm[k]] = [perm[k], perm[i]];
  }
  
  return perm;
}

// === Private Matchmaking ===

export interface MatchmakingRequest {
  /** Player's anonymous ID */
  anonId: Uint8Array;
  /** Encrypted skill rating */
  encryptedRating: Uint8Array;
  /** Encrypted preferences */
  encryptedPreferences: Uint8Array;
  /** Commitment to player identity */
  identityCommitment: Uint8Array;
  /** Time of request */
  timestamp: number;
}

export interface MatchResult {
  /** Match ID */
  matchId: Uint8Array;
  /** Encrypted list of matched players */
  encryptedPlayers: Uint8Array;
  /** Session key for the match */
  sessionKey: Uint8Array;
  /** Match configuration */
  config: MatchConfig;
}

export interface MatchConfig {
  /** Number of players */
  playerCount: number;
  /** Game type */
  gameType: string;
  /** Match duration (seconds) */
  duration: number;
  /** Whether match is ranked */
  ranked: boolean;
}

/**
 * Create an anonymous matchmaking request
 */
export function createMatchmakingRequest(
  playerKeypair: nacl.SignKeyPair,
  rating: number,
  preferences: Record<string, unknown>
): MatchmakingRequest {
  // Generate anonymous ID
  const anonId = sha256Bytes(concatBytes(
    playerKeypair.secretKey.subarray(0, 32),
    new TextEncoder().encode("STYX_ANON_MM_V1"),
    randomBytes(16)
  ));
  
  // Encrypt rating
  const ratingKey = sha256Bytes(concatBytes(
    playerKeypair.secretKey.subarray(0, 32),
    new TextEncoder().encode("STYX_RATING_KEY_V1")
  ));
  const ratingBytes = new Uint8Array(4);
  ratingBytes[0] = rating & 0xff;
  ratingBytes[1] = (rating >> 8) & 0xff;
  ratingBytes[2] = (rating >> 16) & 0xff;
  ratingBytes[3] = (rating >> 24) & 0xff;
  const encryptedRating = xorEncrypt(ratingBytes, ratingKey);
  
  // Encrypt preferences
  const prefBytes = new TextEncoder().encode(JSON.stringify(preferences));
  const encryptedPreferences = xorEncrypt(prefBytes, ratingKey);
  
  // Create identity commitment
  const identityCommitment = sha256Bytes(concatBytes(
    playerKeypair.publicKey,
    randomBytes(32)
  ));
  
  return {
    anonId,
    encryptedRating,
    encryptedPreferences,
    identityCommitment,
    timestamp: Date.now(),
  };
}

// === Hidden Action Commitment ===

export interface ActionCommitment {
  /** Hash of the action */
  hash: Uint8Array;
  /** Nonce for the commitment */
  nonce: Uint8Array;
  /** When the action was committed */
  committedAt: number;
  /** Deadline for reveal */
  revealDeadline: number;
}

export interface ActionReveal {
  /** The action data */
  action: Uint8Array;
  /** Nonce used in commitment */
  nonce: Uint8Array;
  /** Original commitment hash */
  commitment: Uint8Array;
}

/**
 * Commit to an action without revealing it
 */
export function commitToAction(
  action: Uint8Array,
  revealDeadlineMs: number = 30000
): ActionCommitment {
  const nonce = randomBytes(32);
  const hash = sha256Bytes(concatBytes(nonce, action));
  
  return {
    hash,
    nonce,
    committedAt: Date.now(),
    revealDeadline: Date.now() + revealDeadlineMs,
  };
}

/**
 * Reveal a committed action
 */
export function revealAction(
  action: Uint8Array,
  commitment: ActionCommitment
): ActionReveal {
  // Verify commitment matches
  const computed = sha256Bytes(concatBytes(commitment.nonce, action));
  const matches = computed.every((b, i) => b === commitment.hash[i]);
  
  if (!matches) {
    throw new Error("Action does not match commitment");
  }
  
  return {
    action,
    nonce: commitment.nonce,
    commitment: commitment.hash,
  };
}

/**
 * Verify an action reveal
 */
export function verifyActionReveal(reveal: ActionReveal): boolean {
  const computed = sha256Bytes(concatBytes(reveal.nonce, reveal.action));
  return computed.every((b, i) => b === reveal.commitment[i]);
}

// === Anti-Cheat with Privacy ===

export interface CheatProof {
  /** Proof type */
  type: 'speed_hack' | 'aimbot' | 'wall_hack' | 'position_teleport' | 'custom';
  /** Evidence hash */
  evidenceHash: Uint8Array;
  /** Timestamp */
  timestamp: number;
  /** Reporter's anonymous ID */
  reporterAnonId: Uint8Array;
  /** Accused player's anonymous ID */
  accusedAnonId: Uint8Array;
  /** ZK proof that evidence is valid (simplified) */
  validityProof: Uint8Array;
}

export interface AntiCheatConfig {
  /** Maximum speed (units per second) */
  maxSpeed: number;
  /** Minimum reaction time (ms) */
  minReactionTime: number;
  /** Maximum position delta per tick */
  maxPositionDelta: number;
  /** Report threshold before action */
  reportThreshold: number;
}

/**
 * Create a cheat report with privacy preservation
 */
export function createCheatReport(
  reporterKey: Uint8Array,
  accusedAnonId: Uint8Array,
  evidence: Uint8Array,
  type: CheatProof['type']
): CheatProof {
  // Generate anonymous reporter ID
  const reporterAnonId = sha256Bytes(concatBytes(
    reporterKey,
    new TextEncoder().encode("STYX_CHEAT_REPORT_V1")
  ));
  
  // Hash evidence
  const evidenceHash = sha256Bytes(evidence);
  
  // Create validity proof (simplified - would be ZK proof in production)
  const validityProof = sha256Bytes(concatBytes(
    reporterKey,
    evidence,
    accusedAnonId
  ));
  
  return {
    type,
    evidenceHash,
    timestamp: Date.now(),
    reporterAnonId,
    accusedAnonId,
    validityProof,
  };
}

// === Utility Functions ===

function xorEncrypt(data: Uint8Array, key: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ key[i % key.length];
  }
  return result;
}

export { randomBytes };
