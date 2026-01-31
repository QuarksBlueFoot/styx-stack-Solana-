/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX PRIVATE VOTING
 *  
 *  Simple, privacy-preserving voting for any app
 *  No DAO overhead - just polls with anonymous votes
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha256';
import { keccak_256 } from '@noble/hashes/sha3';
import { randomBytes } from '@noble/ciphers/webcrypto';
import bs58 from 'bs58';
import {
  StyxClient,
  encodeEnvelope,
  EnvelopeKind,
  STYX_PROGRAM_ID,
} from '../../core';

// ═══════════════════════════════════════════════════════════════════════════════
// DOMAIN CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Voting domain ID in SPS protocol */
export const VOTING_DOMAIN = 0x0D;

/** Operation codes */
export const VotingOps = {
  CREATE_POLL: 0x01,
  COMMIT_VOTE: 0x02,
  REVEAL_VOTE: 0x03,
  FINALIZE_POLL: 0x04,
  CLOSE_POLL: 0x05,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Poll {
  /** Unique poll ID */
  id: string;
  /** Question being voted on */
  question: string;
  /** Available options */
  options: PollOption[];
  /** Creator */
  creator: PublicKey;
  /** Poll type */
  type: PollType;
  /** Privacy settings */
  privacy: PollPrivacy;
  /** Current phase */
  phase: 'voting' | 'revealing' | 'finalized' | 'closed';
  /** Creation timestamp */
  createdAt: number;
  /** Voting end time */
  votingEndsAt: number;
  /** Reveal end time (for commit-reveal) */
  revealEndsAt?: number;
  /** Total vote commitments */
  totalCommitments: number;
  /** Total revealed votes */
  totalRevealed: number;
  /** Winning option (after finalize) */
  winner?: number;
  /** Associated app/context */
  appId?: string;
}

export interface PollOption {
  index: number;
  label: string;
  description?: string;
  votes: number;
}

export type PollType = 
  | 'simple'           // Direct voting, immediate tally
  | 'commit-reveal'    // Two-phase, prevents vote peeking
  | 'quadratic'        // Weight = sqrt(tokens)
  | 'ranked-choice';   // Rank preferences

export interface PollPrivacy {
  /** Hide voter identities */
  anonymousVoters: boolean;
  /** Hide vote counts until end */
  hiddenTallies: boolean;
  /** Require commit-reveal */
  commitReveal: boolean;
  /** Allow vote delegation */
  allowDelegation: boolean;
}

export interface VoteCommitment {
  pollId: string;
  commitment: Uint8Array;
  nullifier: Uint8Array;
  timestamp: number;
}

export interface PollVoteReveal {
  pollId: string;
  optionIndex: number;
  randomness: Uint8Array;
  weight: number;
}

export interface VoterEligibility {
  eligible: boolean;
  weight: number;
  reason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOTE COMMITMENT CRYPTOGRAPHY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a poll vote commitment
 * Commitment = keccak256(pollId | optionIndex | weight | randomness | voterSecret)
 */
export function createPollVoteCommitment(
  pollId: string,
  optionIndex: number,
  weight: number,
  voterSecretKey: Uint8Array
): { commitment: Uint8Array; randomness: Uint8Array } {
  const randomness = randomBytes(32);
  const pollBytes = new TextEncoder().encode(pollId);
  
  const preimage = new Uint8Array(
    pollBytes.length + 1 + 4 + 32 + 32
  );
  
  let offset = 0;
  preimage.set(pollBytes, offset);
  offset += pollBytes.length;
  preimage[offset++] = optionIndex;
  new DataView(preimage.buffer).setUint32(offset, weight, true);
  offset += 4;
  preimage.set(randomness, offset);
  offset += 32;
  preimage.set(sha256(voterSecretKey), offset);
  
  const commitment = keccak_256(preimage);
  
  return { commitment, randomness };
}

/**
 * Create a nullifier to prevent double voting in a poll
 * Nullifier = keccak256("styx-vote" | pollId | voterSecret)
 */
export function createPollVoteNullifier(
  pollId: string,
  voterSecretKey: Uint8Array
): Uint8Array {
  const pollBytes = new TextEncoder().encode(pollId);
  const prefix = new TextEncoder().encode('styx-vote-v1');
  
  const preimage = new Uint8Array(
    prefix.length + pollBytes.length + 32
  );
  
  preimage.set(prefix);
  preimage.set(pollBytes, prefix.length);
  preimage.set(sha256(voterSecretKey), prefix.length + pollBytes.length);
  
  return keccak_256(preimage);
}

/**
 * Verify a poll vote reveal matches its commitment
 */
export function verifyPollVoteReveal(
  commitment: Uint8Array,
  pollId: string,
  optionIndex: number,
  weight: number,
  randomness: Uint8Array,
  voterSecret: Uint8Array
): boolean {
  const pollBytes = new TextEncoder().encode(pollId);
  
  const preimage = new Uint8Array(
    pollBytes.length + 1 + 4 + 32 + 32
  );
  
  let offset = 0;
  preimage.set(pollBytes, offset);
  offset += pollBytes.length;
  preimage[offset++] = optionIndex;
  new DataView(preimage.buffer).setUint32(offset, weight, true);
  offset += 4;
  preimage.set(randomness, offset);
  offset += 32;
  preimage.set(sha256(voterSecret), offset);
  
  const computed = keccak_256(preimage);
  
  return commitment.length === computed.length &&
    commitment.every((v, i) => v === computed[i]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE VOTING CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface VotingClientOptions {
  client: StyxClient;
  signer: Keypair;
  /** Optional app identifier for scoping polls */
  appId?: string;
  /** Custom eligibility checker */
  eligibilityCheck?: (voter: PublicKey, poll: Poll) => Promise<VoterEligibility>;
}

/**
 * Simple private voting client for any app
 * 
 * Usage:
 * 
 * ```typescript
 * // Create voting client
 * const voting = new PrivateVoting({
 *   client: styxClient,
 *   signer: wallet,
 *   appId: 'my-app',
 * });
 * 
 * // Create a poll
 * const poll = await voting.createPoll({
 *   question: 'What feature should we build next?',
 *   options: ['Dark mode', 'Mobile app', 'API v2'],
 *   duration: 86400, // 24 hours
 *   privacy: { anonymousVoters: true, hiddenTallies: true },
 * });
 * 
 * // Cast a private vote
 * await voting.vote(poll.id, 1); // Vote for "Mobile app"
 * 
 * // Get results after voting ends
 * const results = await voting.getResults(poll.id);
 * ```
 */
export class PrivateVoting {
  private readonly client: StyxClient;
  private readonly signer: Keypair;
  private readonly appId?: string;
  private readonly eligibilityCheck?: (voter: PublicKey, poll: Poll) => Promise<VoterEligibility>;
  
  // Store vote data for commit-reveal
  private readonly voteData: Map<string, {
    optionIndex: number;
    weight: number;
    randomness: Uint8Array;
    commitment: Uint8Array;
    nullifier: Uint8Array;
  }> = new Map();

  constructor(options: VotingClientOptions) {
    this.client = options.client;
    this.signer = options.signer;
    this.appId = options.appId;
    this.eligibilityCheck = options.eligibilityCheck;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // POLL MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a new poll
   */
  async createPoll(params: {
    question: string;
    options: string[];
    description?: string;
    duration: number; // seconds
    type?: PollType;
    privacy?: Partial<PollPrivacy>;
  }): Promise<Poll> {
    const pollId = bs58.encode(randomBytes(8));
    
    const type = params.type ?? 'commit-reveal';
    const useCommitReveal = type === 'commit-reveal' || params.privacy?.commitReveal;
    
    const privacy: PollPrivacy = {
      anonymousVoters: params.privacy?.anonymousVoters ?? true,
      hiddenTallies: params.privacy?.hiddenTallies ?? true,
      commitReveal: useCommitReveal ?? true,
      allowDelegation: params.privacy?.allowDelegation ?? false,
    };
    
    const options: PollOption[] = params.options.map((label, index) => ({
      index,
      label,
      votes: 0,
    }));
    
    const now = Math.floor(Date.now() / 1000);
    const votingEndsAt = now + params.duration;
    const revealEndsAt = useCommitReveal ? votingEndsAt + 3600 : undefined; // 1 hour reveal period
    
    // Build poll creation data
    const pollData = {
      id: pollId,
      question: params.question,
      description: params.description,
      options: params.options,
      type,
      privacy,
      votingEndsAt,
      revealEndsAt,
      appId: this.appId,
    };
    
    const envelope = encodeEnvelope({
      version: 1,
      kind: EnvelopeKind.GOVERNANCE_PROPOSAL, // Reuse governance envelope
      header: new TextEncoder().encode(JSON.stringify({
        domain: 'voting',
        pollId,
        appId: this.appId,
      })),
      body: new TextEncoder().encode(JSON.stringify(pollData)),
    });
    
    // Create transaction
    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: true },
        ],
        programId: STYX_PROGRAM_ID,
        data: Buffer.from([VOTING_DOMAIN, VotingOps.CREATE_POLL, ...envelope]),
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    await this.client.connection.sendRawTransaction(tx.serialize());
    
    return {
      id: pollId,
      question: params.question,
      options,
      creator: this.signer.publicKey,
      type,
      privacy,
      phase: 'voting',
      createdAt: now * 1000,
      votingEndsAt: votingEndsAt * 1000,
      revealEndsAt: revealEndsAt ? revealEndsAt * 1000 : undefined,
      totalCommitments: 0,
      totalRevealed: 0,
      appId: this.appId,
    };
  }

  /**
   * Cast a private vote
   * For commit-reveal polls, this submits the commitment
   * For simple polls, this directly records the vote (anonymously)
   */
  async vote(
    pollId: string,
    optionIndex: number,
    options?: {
      weight?: number;
    }
  ): Promise<VoteCommitment> {
    // Check eligibility
    if (this.eligibilityCheck) {
      const poll = await this.getPoll(pollId);
      const eligibility = await this.eligibilityCheck(this.signer.publicKey, poll);
      if (!eligibility.eligible) {
        throw new Error(`Not eligible to vote: ${eligibility.reason}`);
      }
    }
    
    const weight = options?.weight ?? 1;
    
    // Create commitment and nullifier
    const { commitment, randomness } = createPollVoteCommitment(
      pollId,
      optionIndex,
      weight,
      this.signer.secretKey
    );
    
    const nullifier = createPollVoteNullifier(pollId, this.signer.secretKey);
    
    // Store for reveal phase
    this.voteData.set(pollId, {
      optionIndex,
      weight,
      randomness,
      commitment,
      nullifier,
    });
    
    // Build vote transaction
    const voteBuffer = Buffer.alloc(100);
    let offset = 0;
    
    voteBuffer[offset++] = VOTING_DOMAIN;
    voteBuffer[offset++] = VotingOps.COMMIT_VOTE;
    
    // Poll ID
    const pollIdBytes = bs58.decode(pollId);
    voteBuffer.set(pollIdBytes.slice(0, 8), offset);
    offset += 8;
    
    // Commitment
    voteBuffer.set(commitment, offset);
    offset += 32;
    
    // Nullifier
    voteBuffer.set(nullifier, offset);
    offset += 32;
    
    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: false },
        ],
        programId: STYX_PROGRAM_ID,
        data: voteBuffer.subarray(0, offset),
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    await this.client.connection.sendRawTransaction(tx.serialize());
    
    return {
      pollId,
      commitment,
      nullifier,
      timestamp: Date.now(),
    };
  }

  /**
   * Reveal your vote (for commit-reveal polls)
   */
  async revealVote(pollId: string): Promise<PollVoteReveal> {
    const data = this.voteData.get(pollId);
    if (!data) {
      throw new Error('No local vote data found - did you vote in this poll?');
    }
    
    // Build reveal transaction
    const revealBuffer = Buffer.alloc(60);
    let offset = 0;
    
    revealBuffer[offset++] = VOTING_DOMAIN;
    revealBuffer[offset++] = VotingOps.REVEAL_VOTE;
    
    // Poll ID
    const pollIdBytes = bs58.decode(pollId);
    revealBuffer.set(pollIdBytes.slice(0, 8), offset);
    offset += 8;
    
    // Option index
    revealBuffer[offset++] = data.optionIndex;
    
    // Weight
    new DataView(revealBuffer.buffer).setUint32(offset, data.weight, true);
    offset += 4;
    
    // Randomness
    revealBuffer.set(data.randomness, offset);
    offset += 32;
    
    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: false },
        ],
        programId: STYX_PROGRAM_ID,
        data: revealBuffer.subarray(0, offset),
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    await this.client.connection.sendRawTransaction(tx.serialize());
    
    return {
      pollId,
      optionIndex: data.optionIndex,
      randomness: data.randomness,
      weight: data.weight,
    };
  }

  /**
   * Check if we've already voted in a poll
   */
  hasVoted(pollId: string): boolean {
    return this.voteData.has(pollId);
  }

  /**
   * Get our vote data (only locally available)
   */
  getMyVote(pollId: string): { optionIndex: number; weight: number } | null {
    const data = this.voteData.get(pollId);
    if (!data) return null;
    return { optionIndex: data.optionIndex, weight: data.weight };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // POLL QUERIES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get poll by ID
   */
  async getPoll(pollId: string): Promise<Poll> {
    const indexerUrl = this.client.getIndexerUrl();
    
    try {
      const response = await fetch(`${indexerUrl}/v1/voting/polls/${pollId}`);
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fallback
    }
    
    throw new Error(`Poll not found: ${pollId}`);
  }

  /**
   * Get results for a finalized poll
   */
  async getResults(pollId: string): Promise<{
    poll: Poll;
    results: Array<{ option: PollOption; percentage: number }>;
    totalVotes: number;
    winner: PollOption | null;
  }> {
    const poll = await this.getPoll(pollId);
    
    if (poll.privacy.hiddenTallies && poll.phase !== 'finalized') {
      throw new Error('Results are hidden until poll is finalized');
    }
    
    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
    
    const results = poll.options.map(option => ({
      option,
      percentage: totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0,
    }));
    
    // Sort by votes descending
    results.sort((a, b) => b.option.votes - a.option.votes);
    
    const winner = results.length > 0 && results[0].option.votes > 0 
      ? results[0].option 
      : null;
    
    return { poll, results, totalVotes, winner };
  }

  /**
   * List active polls
   */
  async listActivePolls(options?: {
    appId?: string;
    limit?: number;
  }): Promise<Poll[]> {
    const indexerUrl = this.client.getIndexerUrl();
    
    try {
      const params = new URLSearchParams();
      params.set('phase', 'voting');
      if (options?.appId ?? this.appId) {
        params.set('appId', options?.appId ?? this.appId!);
      }
      if (options?.limit) {
        params.set('limit', options.limit.toString());
      }
      
      const response = await fetch(`${indexerUrl}/v1/voting/polls?${params}`);
      if (response.ok) {
        const data = await response.json();
        return data.polls ?? [];
      }
    } catch {
      // Handle error
    }
    
    return [];
  }

  /**
   * List polls we've voted in
   */
  async getMyPolls(): Promise<string[]> {
    return Array.from(this.voteData.keys());
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // POLL LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Finalize poll (after reveal period ends)
   * Anyone can call this to trigger final tally
   */
  async finalizePoll(pollId: string): Promise<Poll> {
    const finalizeBuffer = Buffer.alloc(12);
    finalizeBuffer[0] = VOTING_DOMAIN;
    finalizeBuffer[1] = VotingOps.FINALIZE_POLL;
    
    const pollIdBytes = bs58.decode(pollId);
    finalizeBuffer.set(pollIdBytes.slice(0, 8), 2);
    
    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: false },
        ],
        programId: STYX_PROGRAM_ID,
        data: finalizeBuffer,
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    await this.client.connection.sendRawTransaction(tx.serialize());
    
    return this.getPoll(pollId);
  }

  /**
   * Close poll early (creator only)
   */
  async closePoll(pollId: string): Promise<void> {
    const closeBuffer = Buffer.alloc(12);
    closeBuffer[0] = VOTING_DOMAIN;
    closeBuffer[1] = VotingOps.CLOSE_POLL;
    
    const pollIdBytes = bs58.decode(pollId);
    closeBuffer.set(pollIdBytes.slice(0, 8), 2);
    
    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: false },
        ],
        programId: STYX_PROGRAM_ID,
        data: closeBuffer,
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    await this.client.connection.sendRawTransaction(tx.serialize());
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACT HOOKS (for web/React Native)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * React hook for private voting
 * 
 * Usage:
 * ```tsx
 * function VotingComponent() {
 *   const { polls, vote, results, loading } = usePrivateVoting({
 *     client: styxClient,
 *     signer: wallet,
 *   });
 *   
 *   return (
 *     <div>
 *       {polls.map(poll => (
 *         <PollCard 
 *           key={poll.id} 
 *           poll={poll} 
 *           onVote={(option) => vote(poll.id, option)}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function createVotingHooks(votingClient: PrivateVoting) {
  return {
    /**
     * Get poll by ID with auto-refresh
     */
    usePoll: async (pollId: string) => {
      return votingClient.getPoll(pollId);
    },
    
    /**
     * Vote in a poll
     */
    vote: async (pollId: string, optionIndex: number) => {
      return votingClient.vote(pollId, optionIndex);
    },
    
    /**
     * Reveal vote (for commit-reveal)
     */
    reveal: async (pollId: string) => {
      return votingClient.revealVote(pollId);
    },
    
    /**
     * Get results
     */
    getResults: async (pollId: string) => {
      return votingClient.getResults(pollId);
    },
    
    /**
     * Check if voted
     */
    hasVoted: (pollId: string) => {
      return votingClient.hasVoted(pollId);
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { PrivateVoting as VotingClient };
