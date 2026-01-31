import { sha256Bytes, concatBytes, bytesToB64, b64ToBytes } from "@styx/crypto-core";
import nacl from "tweetnacl";

/**
 * Private game state management.
 * 
 * Allows games to maintain hidden state that is only revealed
 * to specific players or at specific times.
 */

export type HiddenStateCommitment = {
  /** Commitment hash (SHA-256 of state + nonce) */
  commitment: Uint8Array;
  /** Nonce used for commitment */
  nonce: Uint8Array;
  /** Timestamp when committed */
  committedAt: number;
};

export type RevealedState<T> = {
  /** The revealed state value */
  value: T;
  /** Proof that this matches the commitment */
  proof: {
    nonce: Uint8Array;
    commitment: Uint8Array;
  };
};

/**
 * Create a commitment to hidden game state.
 * The state is hashed with a random nonce to prevent rainbow table attacks.
 */
export function commitToState<T>(state: T): HiddenStateCommitment {
  const stateBytes = new TextEncoder().encode(JSON.stringify(state));
  const nonce = nacl.randomBytes(32);
  
  const input = concatBytes(nonce, stateBytes);
  const commitment = sha256Bytes(input);
  
  return {
    commitment,
    nonce,
    committedAt: Date.now()
  };
}

/**
 * Reveal previously committed state.
 * Returns the state along with proof that it matches the commitment.
 */
export function revealState<T>(
  state: T,
  commitment: HiddenStateCommitment
): RevealedState<T> {
  // Verify the commitment matches
  const stateBytes = new TextEncoder().encode(JSON.stringify(state));
  const input = concatBytes(commitment.nonce, stateBytes);
  const computed = sha256Bytes(input);
  
  const matches = computed.every((b, i) => b === commitment.commitment[i]);
  if (!matches) {
    throw new Error("State does not match commitment");
  }
  
  return {
    value: state,
    proof: {
      nonce: commitment.nonce,
      commitment: commitment.commitment
    }
  };
}

/**
 * Verify a revealed state matches a commitment.
 */
export function verifyReveal<T>(
  revealed: RevealedState<T>,
  expectedCommitment: Uint8Array
): boolean {
  const stateBytes = new TextEncoder().encode(JSON.stringify(revealed.value));
  const input = concatBytes(revealed.proof.nonce, stateBytes);
  const computed = sha256Bytes(input);
  
  return computed.every((b, i) => b === expectedCommitment[i]);
}

/**
 * Mental poker style card shuffling with commitment.
 * Each player commits to their shuffle, then reveals in sequence.
 */
export type ShuffleCommitment = {
  playerId: string;
  commitment: Uint8Array;
  /** Encrypted shuffle permutation */
  encryptedPermutation: Uint8Array;
};

export type ShuffleReveal = {
  playerId: string;
  permutation: number[];
  nonce: Uint8Array;
};

/**
 * Create a shuffle commitment for mental poker.
 */
export function createShuffleCommitment(args: {
  playerId: string;
  deckSize: number;
  /** Other players' public keys to encrypt shuffle to */
  recipientPubkeys: Uint8Array[];
}): { commitment: ShuffleCommitment; secret: { permutation: number[]; nonce: Uint8Array } } {
  // Generate random permutation
  const permutation: number[] = [];
  for (let i = 0; i < args.deckSize; i++) {
    permutation.push(i);
  }
  
  // Fisher-Yates shuffle
  for (let i = permutation.length - 1; i > 0; i--) {
    const randomBytes = nacl.randomBytes(4);
    const j = (randomBytes[0] | (randomBytes[1] << 8) | (randomBytes[2] << 16) | (randomBytes[3] << 24)) % (i + 1);
    [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
  }
  
  const nonce = nacl.randomBytes(32);
  const permBytes = new TextEncoder().encode(JSON.stringify(permutation));
  const input = concatBytes(nonce, permBytes);
  const commitment = sha256Bytes(input);
  
  // Encrypt permutation (simplified - in production use threshold encryption)
  const encryptedPermutation = nacl.secretbox(
    permBytes,
    nonce.slice(0, 24),
    nonce
  );
  
  return {
    commitment: {
      playerId: args.playerId,
      commitment,
      encryptedPermutation
    },
    secret: {
      permutation,
      nonce
    }
  };
}

/**
 * Reveal a shuffle and verify it matches commitment.
 */
export function verifyShuffleReveal(
  reveal: ShuffleReveal,
  commitment: ShuffleCommitment
): boolean {
  if (reveal.playerId !== commitment.playerId) {
    return false;
  }
  
  const permBytes = new TextEncoder().encode(JSON.stringify(reveal.permutation));
  const input = concatBytes(reveal.nonce, permBytes);
  const computed = sha256Bytes(input);
  
  return computed.every((b, i) => b === commitment.commitment[i]);
}

/**
 * Compose multiple shuffles into final deck order.
 * Each player's shuffle is applied in sequence.
 */
export function compositeShuffles(
  reveals: ShuffleReveal[],
  deckSize: number
): number[] {
  // Start with identity permutation
  let deck: number[] = [];
  for (let i = 0; i < deckSize; i++) {
    deck.push(i);
  }
  
  // Apply each shuffle in order
  for (const reveal of reveals) {
    const newDeck: number[] = new Array(deckSize);
    for (let i = 0; i < deckSize; i++) {
      newDeck[i] = deck[reveal.permutation[i]];
    }
    deck = newDeck;
  }
  
  return deck;
}

/**
 * Private random number generation with commitment.
 * Useful for dice rolls, random events, etc.
 */
export type RandomCommitment = {
  commitment: Uint8Array;
  range: { min: number; max: number };
  purpose: string;
};

export type RandomReveal = {
  value: number;
  seed: Uint8Array;
  salt: Uint8Array;
};

/**
 * Commit to a random value that will be revealed later.
 */
export function commitToRandom(args: {
  min: number;
  max: number;
  purpose: string;
}): { commitment: RandomCommitment; secret: RandomReveal } {
  const seed = nacl.randomBytes(32);
  const salt = nacl.randomBytes(16);
  
  // Derive value from seed
  const range = args.max - args.min + 1;
  const seedInt = (seed[0] | (seed[1] << 8) | (seed[2] << 16) | (seed[3] << 24)) >>> 0;
  const value = args.min + (seedInt % range);
  
  // Create commitment
  const input = concatBytes(
    seed,
    salt,
    new TextEncoder().encode(`${args.purpose}:${args.min}:${args.max}`)
  );
  const commitment = sha256Bytes(input);
  
  return {
    commitment: {
      commitment,
      range: { min: args.min, max: args.max },
      purpose: args.purpose
    },
    secret: {
      value,
      seed,
      salt
    }
  };
}

/**
 * Verify a revealed random value matches its commitment.
 */
export function verifyRandomReveal(
  reveal: RandomReveal,
  commitment: RandomCommitment
): boolean {
  // Verify commitment
  const input = concatBytes(
    reveal.seed,
    reveal.salt,
    new TextEncoder().encode(`${commitment.purpose}:${commitment.range.min}:${commitment.range.max}`)
  );
  const computed = sha256Bytes(input);
  
  if (!computed.every((b, i) => b === commitment.commitment[i])) {
    return false;
  }
  
  // Verify value derivation
  const range = commitment.range.max - commitment.range.min + 1;
  const seedInt = (reveal.seed[0] | (reveal.seed[1] << 8) | (reveal.seed[2] << 16) | (reveal.seed[3] << 24)) >>> 0;
  const expectedValue = commitment.range.min + (seedInt % range);
  
  return reveal.value === expectedValue;
}
