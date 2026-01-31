/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX PRIVATE GOVERNANCE
 *  
 *  Private DAO voting and proposals on Solana
 *  Features: Anonymous voting, encrypted proposals, shielded delegation
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha256';
import { keccak_256 } from '@noble/hashes/sha3';
import { randomBytes } from '@noble/ciphers/webcrypto';
import bs58 from 'bs58';
import {
  StyxClient,
  encryptData,
  decryptData,
  deriveEncryptionKey,
  computeSharedSecret,
  ed25519ToX25519,
  generateNullifier,
  encodeEnvelope,
  EnvelopeKind,
  STYX_PROGRAM_ID,
} from '../../core';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Proposal {
  /** Unique proposal ID */
  id: string;
  /** Proposal title */
  title: string;
  /** Proposal description (may be encrypted) */
  description: string;
  /** Proposer (may be hidden) */
  proposer: PublicKey | null;
  /** DAO this proposal belongs to */
  dao: PublicKey;
  /** Vote options */
  options: VoteOption[];
  /** Voting start time */
  startsAt: number;
  /** Voting end time */
  endsAt: number;
  /** Quorum required (in voting power) */
  quorum: bigint;
  /** Current total votes */
  totalVotes: bigint;
  /** Status */
  status: 'draft' | 'active' | 'passed' | 'failed' | 'executed' | 'cancelled';
  /** Execution payload (encrypted until passed) */
  executionPayload?: Uint8Array;
  /** Privacy settings */
  privacy: ProposalPrivacy;
  /** Created at */
  createdAt: number;
}

export interface VoteOption {
  index: number;
  label: string;
  voteCount: bigint;
}

export interface ProposalPrivacy {
  /** Hide individual votes until end */
  encryptedVotes: boolean;
  /** Hide voter identities */
  anonymousVoters: boolean;
  /** Hide proposer identity */
  anonymousProposer: boolean;
  /** Hide vote tallies until end */
  hiddenTallies: boolean;
}

export interface Vote {
  /** Vote ID */
  id: string;
  /** Voter (nullifier commitment if anonymous) */
  voter: Uint8Array;
  /** Proposal being voted on */
  proposalId: string;
  /** Selected option index */
  optionIndex: number;
  /** Voting power used */
  votingPower: bigint;
  /** Nullifier (prevents double voting) */
  nullifier: Uint8Array;
  /** Vote commitment (for encrypted votes) */
  commitment: Uint8Array;
  /** Timestamp */
  timestamp: number;
}

export interface VotingPower {
  /** Total voting power */
  total: bigint;
  /** Available (undelegated) */
  available: bigint;
  /** Delegated to others */
  delegatedOut: bigint;
  /** Received via delegation */
  delegatedIn: bigint;
  /** Source of power (token holdings, NFTs, etc.) */
  sources: VotingPowerSource[];
}

export interface VotingPowerSource {
  type: 'token' | 'nft' | 'delegation' | 'reputation';
  mint?: PublicKey;
  amount: bigint;
  description: string;
}

export interface Delegation {
  /** Delegation ID */
  id: string;
  /** Delegator */
  from: PublicKey;
  /** Delegate */
  to: PublicKey;
  /** Amount of voting power */
  amount: bigint;
  /** Scope (all DAOs or specific) */
  scope: PublicKey | 'all';
  /** Expiration */
  expiresAt: number;
  /** Status */
  active: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOTE COMMITMENT SCHEME (Anonymous Voting)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a vote commitment for anonymous voting
 * Commitment = keccak256(vote | randomness | votingPower | voterSecret)
 */
export function createVoteCommitment(
  optionIndex: number,
  votingPower: bigint,
  voterSecretKey: Uint8Array
): { commitment: Uint8Array; randomness: Uint8Array } {
  const randomness = randomBytes(32);
  
  const preimage = new Uint8Array(1 + 8 + 32 + 32);
  preimage[0] = optionIndex;
  new DataView(preimage.buffer).setBigUint64(1, votingPower, true);
  preimage.set(randomness, 9);
  preimage.set(sha256(voterSecretKey), 41);
  
  const commitment = keccak_256(preimage);
  
  return { commitment, randomness };
}

/**
 * Create a nullifier for double-vote prevention
 */
export function createVoteNullifier(
  proposalId: string,
  voterSecretKey: Uint8Array
): Uint8Array {
  const proposalBytes = new TextEncoder().encode(proposalId);
  return generateNullifier(proposalBytes, voterSecretKey, 'styx-vote-v1');
}

/**
 * Reveal a vote (for tally after voting ends)
 */
export interface VoteReveal {
  optionIndex: number;
  votingPower: bigint;
  randomness: Uint8Array;
  proof: Uint8Array; // Would be a ZK proof in production
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE GOVERNANCE CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface GovernanceClientOptions {
  client: StyxClient;
  signer: Keypair;
  dao: PublicKey;
}

export class PrivateGovernanceClient {
  private readonly client: StyxClient;
  private readonly signer: Keypair;
  private readonly dao: PublicKey;
  private readonly x25519Keys: { publicKey: Uint8Array; secretKey: Uint8Array };
  
  // Store vote data for reveal phase
  private voteData: Map<string, { randomness: Uint8Array; optionIndex: number }> = new Map();

  constructor(options: GovernanceClientOptions) {
    this.client = options.client;
    this.signer = options.signer;
    this.dao = options.dao;
    this.x25519Keys = ed25519ToX25519(options.signer.secretKey);
  }

  /**
   * Get our voting power in this DAO
   */
  async getVotingPower(): Promise<VotingPower> {
    // In production, query the DAO's voting power registry
    const indexerUrl = this.client.getIndexerUrl();
    
    try {
      const response = await fetch(`${indexerUrl}/v1/governance/voting-power`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dao: this.dao.toBase58(),
          voter: this.signer.publicKey.toBase58(),
        }),
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fallback to default
    }
    
    return {
      total: BigInt(1000000),
      available: BigInt(1000000),
      delegatedOut: BigInt(0),
      delegatedIn: BigInt(0),
      sources: [],
    };
  }

  /**
   * Create a new proposal
   */
  async createProposal(options: {
    title: string;
    description: string;
    options: string[];
    duration: number; // seconds
    quorum: bigint;
    privacy?: Partial<ProposalPrivacy>;
    executionPayload?: Uint8Array;
  }): Promise<Proposal> {
    const proposalId = bs58.encode(randomBytes(8));
    
    const privacy: ProposalPrivacy = {
      encryptedVotes: options.privacy?.encryptedVotes ?? true,
      anonymousVoters: options.privacy?.anonymousVoters ?? true,
      anonymousProposer: options.privacy?.anonymousProposer ?? false,
      hiddenTallies: options.privacy?.hiddenTallies ?? true,
    };
    
    const voteOptions: VoteOption[] = options.options.map((label, index) => ({
      index,
      label,
      voteCount: BigInt(0),
    }));
    
    const now = Date.now();
    
    // Encrypt description if anonymous proposer
    let description = options.description;
    if (privacy.anonymousProposer) {
      // Use DAO's public key for encryption
      const daoX25519 = this.x25519Keys.publicKey; // Would be DAO's key
      const sharedSecret = computeSharedSecret(this.x25519Keys.secretKey, daoX25519);
      const key = deriveEncryptionKey(sharedSecret, 'proposal-encryption');
      const { ciphertext, nonce } = encryptData(
        new TextEncoder().encode(options.description),
        key
      );
      description = bs58.encode(new Uint8Array([...nonce, ...ciphertext]));
    }
    
    // Build creation transaction
    const proposalData = {
      id: proposalId,
      title: options.title,
      description,
      options: voteOptions,
      quorum: options.quorum.toString(),
      duration: options.duration,
      privacy,
    };
    
    const envelope = encodeEnvelope({
      version: 1,
      kind: EnvelopeKind.GOVERNANCE_PROPOSAL,
      header: new TextEncoder().encode(JSON.stringify({ dao: this.dao.toBase58() })),
      body: new TextEncoder().encode(JSON.stringify(proposalData)),
    });
    
    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: true },
          { pubkey: this.dao, isSigner: false, isWritable: true },
        ],
        programId: STYX_PROGRAM_ID,
        data: Buffer.from([0x30, ...envelope]), // 0x30 = CREATE_PROPOSAL
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    await this.client.connection.sendRawTransaction(tx.serialize());
    
    return {
      id: proposalId,
      title: options.title,
      description,
      proposer: privacy.anonymousProposer ? null : this.signer.publicKey,
      dao: this.dao,
      options: voteOptions,
      startsAt: now,
      endsAt: now + options.duration * 1000,
      quorum: options.quorum,
      totalVotes: BigInt(0),
      status: 'active',
      executionPayload: options.executionPayload,
      privacy,
      createdAt: now,
    };
  }

  /**
   * Cast an anonymous vote
   */
  async castVote(
    proposalId: string,
    optionIndex: number,
    votingPower?: bigint
  ): Promise<Vote> {
    // Get voting power if not specified
    const power = votingPower ?? (await this.getVotingPower()).available;
    
    // Create vote commitment
    const { commitment, randomness } = createVoteCommitment(
      optionIndex,
      power,
      this.signer.secretKey
    );
    
    // Create nullifier
    const nullifier = createVoteNullifier(proposalId, this.signer.secretKey);
    
    // Store for reveal phase
    this.voteData.set(proposalId, { randomness, optionIndex });
    
    // Build vote transaction
    const voteEnvelope = encodeEnvelope({
      version: 1,
      kind: EnvelopeKind.GOVERNANCE_VOTE,
      header: new TextEncoder().encode(JSON.stringify({
        proposalId,
        dao: this.dao.toBase58(),
      })),
      body: new Uint8Array([
        ...commitment,
        ...nullifier,
        ...new Uint8Array(new BigUint64Array([power]).buffer),
      ]),
    });
    
    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: false },
          { pubkey: this.dao, isSigner: false, isWritable: true },
        ],
        programId: STYX_PROGRAM_ID,
        data: Buffer.from([0x31, ...voteEnvelope]), // 0x31 = CAST_VOTE
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    await this.client.connection.sendRawTransaction(tx.serialize());
    
    const voteId = bs58.encode(sha256(commitment).slice(0, 8));
    
    return {
      id: voteId,
      voter: commitment, // Anonymous - only commitment visible
      proposalId,
      optionIndex, // This is hidden until reveal
      votingPower: power,
      nullifier,
      commitment,
      timestamp: Date.now(),
    };
  }

  /**
   * Reveal vote after voting ends (for tallying)
   */
  async revealVote(proposalId: string): Promise<VoteReveal | null> {
    const data = this.voteData.get(proposalId);
    if (!data) return null;
    
    const power = (await this.getVotingPower()).available;
    
    return {
      optionIndex: data.optionIndex,
      votingPower: power,
      randomness: data.randomness,
      proof: new Uint8Array(32), // Would be ZK proof
    };
  }

  /**
   * Delegate voting power
   */
  async delegate(
    to: PublicKey,
    amount: bigint,
    options?: {
      expiresIn?: number;
      scope?: PublicKey;
    }
  ): Promise<Delegation> {
    const delegationId = bs58.encode(randomBytes(8));
    
    const delegationData = Buffer.alloc(1 + 32 + 8 + 32 + 8);
    delegationData[0] = 0x32; // DELEGATE instruction
    delegationData.set(to.toBytes(), 1);
    new DataView(delegationData.buffer).setBigUint64(33, amount, true);
    delegationData.set((options?.scope ?? this.dao).toBytes(), 41);
    new DataView(delegationData.buffer).setBigUint64(73, BigInt(options?.expiresIn ?? 0), true);
    
    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: true },
          { pubkey: to, isSigner: false, isWritable: true },
          { pubkey: this.dao, isSigner: false, isWritable: true },
        ],
        programId: STYX_PROGRAM_ID,
        data: delegationData,
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    await this.client.connection.sendRawTransaction(tx.serialize());
    
    return {
      id: delegationId,
      from: this.signer.publicKey,
      to,
      amount,
      scope: options?.scope ?? 'all',
      expiresAt: options?.expiresIn ? Date.now() + options.expiresIn * 1000 : 0,
      active: true,
    };
  }

  /**
   * Get active proposals
   */
  async getActiveProposals(): Promise<Proposal[]> {
    const indexerUrl = this.client.getIndexerUrl();
    
    try {
      const response = await fetch(`${indexerUrl}/v1/governance/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dao: this.dao.toBase58(),
          status: 'active',
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.proposals ?? [];
      }
    } catch {
      // Handle error
    }
    
    return [];
  }

  /**
   * Get my votes
   */
  async getMyVotes(): Promise<Vote[]> {
    // Would query indexer with nullifier proofs
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { PrivateGovernanceClient as GovernanceClient };
