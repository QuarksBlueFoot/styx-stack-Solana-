/**
 * @styx-stack/whisperdrop-sdk - Private Token Launch Module
 * 
 * Adds private SPL token launch and drop capabilities to WhisperDrop:
 * - Fair launch with commitment/reveal (prevents sniping)
 * - Private drops to stealth addresses
 * - Token-gated private claiming
 * - SPS integration for fully private tokens
 * 
 * @author Bluefoot Labs
 * @license Apache-2.0
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from '@noble/ciphers/webcrypto';

// Re-export main SDK
export * from './index';

// SPS Program ID
const SPS_PROGRAM_ID = new PublicKey('GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9');

// Domain and opcodes from SPS
const DOMAIN_STS = 0x01;
const DOMAIN_NFT = 0x09;
const OP_CREATE_MINT = 0x01;
const OP_MINT_TO = 0x04;
const OP_FAIR_LAUNCH_COMMIT = 0x30;
const OP_FAIR_LAUNCH_REVEAL = 0x31;
const OP_MERKLE_AIRDROP_ROOT = 0x40;
const OP_MERKLE_AIRDROP_CLAIM = 0x41;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Token launch configuration */
export interface TokenLaunchConfig {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  /** Private launch (SPS) or public (SPL) */
  isPrivate: boolean;
  /** Fair launch with commit/reveal phase */
  fairLaunch?: {
    commitDuration: number; // slots
    revealDuration: number; // slots
    minCommitment: bigint;
    maxCommitment: bigint;
  };
  /** Vesting schedule */
  vesting?: {
    cliffSlots: number;
    vestingSlots: number;
    vestingPercent: number; // 0-100
  };
}

/** Private drop configuration */
export interface PrivateDropConfig {
  /** Campaign ID */
  campaignId: Uint8Array;
  /** Merkle root of allocations */
  merkleRoot: Uint8Array;
  /** Expiry timestamp */
  expiryUnix: bigint;
  /** Token mint (SPS or SPL) */
  mint: Uint8Array;
  /** Is this an SPS private token */
  isPrivate: boolean;
  /** Gate requirements */
  gate?: {
    type: 'none' | 'nft' | 'token' | 'collection';
    mint?: PublicKey;
    amount?: bigint;
  };
}

/** Fair launch commitment */
export interface FairLaunchCommit {
  /** Commitment hash */
  commitment: Uint8Array;
  /** Amount (hidden) */
  amount: bigint;
  /** Salt for commitment */
  salt: Uint8Array;
}

/** Private allocation (for drops) */
export interface PrivateAllocation {
  /** Recipient's stealth address commitment */
  recipientCommitment: Uint8Array;
  /** Amount */
  amount: bigint;
  /** Nonce */
  nonce: Uint8Array;
  /** Ephemeral key for recipient scanning */
  ephemeralKey: Uint8Array;
}

/** Launch result */
export interface LaunchResult {
  signature: string;
  mintId: Uint8Array;
  campaignId?: Uint8Array;
}

/** Drop claim result */
export interface ClaimResult {
  signature: string;
  noteCommitment?: Uint8Array;
}

// ═══════════════════════════════════════════════════════════════════════════
// MERKLE TREE FOR PRIVATE DROPS
// ═══════════════════════════════════════════════════════════════════════════

const LEAF_DOMAIN = Buffer.from('whisperdrop:private:v1');
const NODE_DOMAIN = Buffer.from('whisperdrop:node:v1');

/**
 * Compute leaf hash for private allocation
 */
export function computePrivateLeafHash(
  campaignId: Uint8Array,
  recipientCommitment: Uint8Array,
  amount: bigint,
  nonce: Uint8Array
): Uint8Array {
  const amountBytes = Buffer.alloc(8);
  amountBytes.writeBigUInt64LE(amount);
  
  return sha256(Buffer.concat([
    LEAF_DOMAIN,
    Buffer.from(campaignId),
    Buffer.from(recipientCommitment),
    amountBytes,
    Buffer.from(nonce),
  ]));
}

/**
 * Compute node hash (sorted pair)
 */
function computeNodeHash(left: Uint8Array, right: Uint8Array): Uint8Array {
  const [first, second] = Buffer.compare(Buffer.from(left), Buffer.from(right)) <= 0
    ? [left, right]
    : [right, left];
  
  return sha256(Buffer.concat([
    NODE_DOMAIN,
    Buffer.from(first),
    Buffer.from(second),
  ]));
}

/**
 * Build Merkle tree for private allocations
 */
export function buildPrivateMerkleTree(
  campaignId: Uint8Array,
  allocations: PrivateAllocation[]
): { root: Uint8Array; proofs: Map<string, Uint8Array[]> } {
  if (allocations.length === 0) {
    throw new Error('Cannot build tree with no allocations');
  }
  
  const leaves = allocations.map(a => 
    computePrivateLeafHash(campaignId, a.recipientCommitment, a.amount, a.nonce)
  );
  
  let currentLevel = leaves;
  const tree: Uint8Array[][] = [currentLevel];
  
  while (currentLevel.length > 1) {
    const nextLevel: Uint8Array[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1] || left;
      nextLevel.push(computeNodeHash(left, right));
    }
    tree.push(nextLevel);
    currentLevel = nextLevel;
  }
  
  const root = tree[tree.length - 1][0];
  const proofs = new Map<string, Uint8Array[]>();
  
  for (let leafIndex = 0; leafIndex < allocations.length; leafIndex++) {
    const proof: Uint8Array[] = [];
    let index = leafIndex;
    
    for (let level = 0; level < tree.length - 1; level++) {
      const isLeft = index % 2 === 0;
      const siblingIndex = isLeft ? index + 1 : index - 1;
      
      if (siblingIndex < tree[level].length) {
        proof.push(tree[level][siblingIndex]);
      } else {
        proof.push(tree[level][index]);
      }
      
      index = Math.floor(index / 2);
    }
    
    const key = Buffer.from(allocations[leafIndex].recipientCommitment).toString('hex');
    proofs.set(key, proof);
  }
  
  return { root, proofs };
}

// ═══════════════════════════════════════════════════════════════════════════
// PRIVATE TOKEN LAUNCHER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Private Token Launcher - Creates private tokens with fair launch + drops
 */
export class PrivateTokenLauncher {
  private connection: Connection;
  private spsProgram: PublicKey;

  constructor(connection: Connection, spsProgram: PublicKey = SPS_PROGRAM_ID) {
    this.connection = connection;
    this.spsProgram = spsProgram;
  }

  /**
   * Create a new private token
   */
  async createToken(
    authority: Keypair,
    config: TokenLaunchConfig
  ): Promise<LaunchResult> {
    const nonce = randomBytes(32);
    
    // Encode token metadata
    const nameBytes = Buffer.alloc(32);
    Buffer.from(config.name, 'utf8').copy(nameBytes);
    const symbolBytes = Buffer.alloc(8);
    Buffer.from(config.symbol, 'utf8').copy(symbolBytes);
    
    // Build CREATE_MINT instruction
    const data = Buffer.alloc(122);
    let offset = 0;
    data.writeUInt8(DOMAIN_STS, offset++);
    data.writeUInt8(OP_CREATE_MINT, offset++);
    Buffer.from(nonce).copy(data, offset); offset += 32;
    nameBytes.copy(data, offset); offset += 32;
    symbolBytes.copy(data, offset); offset += 8;
    data.writeUInt8(config.decimals, offset++);
    data.writeBigUInt64LE(config.totalSupply, offset); offset += 8;
    data.writeUInt8(0, offset++); // fungible
    data.writeUInt8(config.isPrivate ? 0 : 1, offset++); // backing type
    Buffer.alloc(32).copy(data, offset); offset += 32; // no SPL backing
    data.writeUInt8(config.isPrivate ? 0 : 1, offset++); // privacy mode
    data.writeUInt32LE(0, offset); // no extensions
    
    const ix = new TransactionInstruction({
      programId: this.spsProgram,
      keys: [{ pubkey: authority.publicKey, isSigner: true, isWritable: true }],
      data,
    });
    
    const signature = await this.sendTx(authority, [ix]);
    
    // Compute mint ID
    const mintId = sha256(Buffer.concat([
      Buffer.from('SPS_MINT_V1'),
      authority.publicKey.toBuffer(),
      Buffer.from(nonce),
    ]));
    
    return { signature, mintId };
  }

  /**
   * Initialize fair launch (commit phase)
   */
  async initFairLaunch(
    authority: Keypair,
    mintId: Uint8Array,
    config: NonNullable<TokenLaunchConfig['fairLaunch']>
  ): Promise<{ signature: string; launchId: Uint8Array }> {
    const launchId = randomBytes(32);
    
    // Get current slot for deadline calculation
    const slot = await this.connection.getSlot();
    const commitDeadline = BigInt(slot + config.commitDuration);
    const revealDeadline = BigInt(slot + config.commitDuration + config.revealDuration);
    
    // Build FAIR_LAUNCH_COMMIT setup instruction
    const data = Buffer.alloc(98);
    let offset = 0;
    data.writeUInt8(DOMAIN_NFT, offset++);
    data.writeUInt8(OP_FAIR_LAUNCH_COMMIT, offset++);
    Buffer.from(launchId).copy(data, offset); offset += 32;
    Buffer.from(mintId).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(commitDeadline, offset); offset += 8;
    data.writeBigUInt64LE(revealDeadline, offset); offset += 8;
    data.writeBigUInt64LE(config.minCommitment, offset); offset += 8;
    data.writeBigUInt64LE(config.maxCommitment, offset);
    
    const ix = new TransactionInstruction({
      programId: this.spsProgram,
      keys: [{ pubkey: authority.publicKey, isSigner: true, isWritable: true }],
      data,
    });
    
    const signature = await this.sendTx(authority, [ix]);
    return { signature, launchId };
  }

  /**
   * Commit to fair launch (hidden amount)
   */
  async commitToFairLaunch(
    participant: Keypair,
    launchId: Uint8Array,
    amount: bigint
  ): Promise<{ signature: string; commit: FairLaunchCommit }> {
    const salt = randomBytes(32);
    
    // commitment = hash(amount || salt || participant)
    const amountBytes = Buffer.alloc(8);
    amountBytes.writeBigUInt64LE(amount);
    const commitment = sha256(Buffer.concat([
      amountBytes,
      Buffer.from(salt),
      participant.publicKey.toBuffer(),
    ]));
    
    // Build commit instruction
    const data = Buffer.alloc(66);
    let offset = 0;
    data.writeUInt8(DOMAIN_NFT, offset++);
    data.writeUInt8(OP_FAIR_LAUNCH_COMMIT, offset++);
    Buffer.from(launchId).copy(data, offset); offset += 32;
    Buffer.from(commitment).copy(data, offset);
    
    const ix = new TransactionInstruction({
      programId: this.spsProgram,
      keys: [{ pubkey: participant.publicKey, isSigner: true, isWritable: true }],
      data,
    });
    
    const signature = await this.sendTx(participant, [ix]);
    
    return {
      signature,
      commit: { commitment, amount, salt },
    };
  }

  /**
   * Reveal fair launch commitment
   */
  async revealFairLaunch(
    participant: Keypair,
    launchId: Uint8Array,
    commit: FairLaunchCommit,
    noteCommitment: Uint8Array
  ): Promise<string> {
    // Build reveal instruction
    const data = Buffer.alloc(106);
    let offset = 0;
    data.writeUInt8(DOMAIN_NFT, offset++);
    data.writeUInt8(OP_FAIR_LAUNCH_REVEAL, offset++);
    Buffer.from(launchId).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(commit.amount, offset); offset += 8;
    Buffer.from(commit.salt).copy(data, offset); offset += 32;
    Buffer.from(noteCommitment).copy(data, offset);
    
    const ix = new TransactionInstruction({
      programId: this.spsProgram,
      keys: [{ pubkey: participant.publicKey, isSigner: true, isWritable: true }],
      data,
    });
    
    return this.sendTx(participant, [ix]);
  }

  /**
   * Create a private drop campaign
   */
  async createPrivateDrop(
    authority: Keypair,
    config: PrivateDropConfig,
    allocations: PrivateAllocation[]
  ): Promise<{ signature: string; campaignId: Uint8Array; proofs: Map<string, Uint8Array[]> }> {
    const { root, proofs } = buildPrivateMerkleTree(config.campaignId, allocations);
    
    // Build Merkle airdrop root instruction
    const data = Buffer.alloc(114);
    let offset = 0;
    data.writeUInt8(DOMAIN_NFT, offset++);
    data.writeUInt8(OP_MERKLE_AIRDROP_ROOT, offset++);
    Buffer.from(config.campaignId).copy(data, offset); offset += 32;
    Buffer.from(root).copy(data, offset); offset += 32;
    Buffer.from(config.mint).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(config.expiryUnix, offset); offset += 8;
    data.writeUInt8(config.isPrivate ? 1 : 0, offset++);
    
    // Gate configuration
    const gateType = config.gate?.type === 'nft' ? 1 : 
                     config.gate?.type === 'token' ? 2 :
                     config.gate?.type === 'collection' ? 3 : 0;
    data.writeUInt8(gateType, offset);
    
    const ix = new TransactionInstruction({
      programId: this.spsProgram,
      keys: [{ pubkey: authority.publicKey, isSigner: true, isWritable: true }],
      data,
    });
    
    const signature = await this.sendTx(authority, [ix]);
    
    return { signature, campaignId: config.campaignId, proofs };
  }

  /**
   * Claim from private drop (to stealth address)
   */
  async claimPrivateDrop(
    claimer: Keypair,
    campaignId: Uint8Array,
    allocation: PrivateAllocation,
    proof: Uint8Array[],
    newNoteCommitment: Uint8Array
  ): Promise<ClaimResult> {
    const proofData = Buffer.concat(proof.map(p => Buffer.from(p)));
    
    // Build claim instruction
    const data = Buffer.alloc(114 + proofData.length);
    let offset = 0;
    data.writeUInt8(DOMAIN_NFT, offset++);
    data.writeUInt8(OP_MERKLE_AIRDROP_CLAIM, offset++);
    Buffer.from(campaignId).copy(data, offset); offset += 32;
    Buffer.from(allocation.recipientCommitment).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(allocation.amount, offset); offset += 8;
    Buffer.from(allocation.nonce).copy(data, offset); offset += 16;
    Buffer.from(newNoteCommitment).copy(data, offset); offset += 32;
    data.writeUInt8(proof.length, offset++);
    proofData.copy(data, offset);
    
    const ix = new TransactionInstruction({
      programId: this.spsProgram,
      keys: [{ pubkey: claimer.publicKey, isSigner: true, isWritable: true }],
      data,
    });
    
    const signature = await this.sendTx(claimer, [ix]);
    
    return { signature, noteCommitment: newNoteCommitment };
  }

  /**
   * Mint tokens directly to commitments (batch)
   */
  async batchMintTo(
    authority: Keypair,
    mintId: Uint8Array,
    recipients: Array<{ commitment: Uint8Array; amount: bigint }>
  ): Promise<string[]> {
    const signatures: string[] = [];
    
    // Process in batches of 5 (to fit in single tx)
    for (let i = 0; i < recipients.length; i += 5) {
      const batch = recipients.slice(i, i + 5);
      const instructions: TransactionInstruction[] = [];
      
      for (const recipient of batch) {
        const encryptedNote = randomBytes(64);
        
        const data = Buffer.alloc(78 + encryptedNote.length);
        let offset = 0;
        data.writeUInt8(DOMAIN_STS, offset++);
        data.writeUInt8(OP_MINT_TO, offset++);
        Buffer.from(mintId).copy(data, offset); offset += 32;
        data.writeBigUInt64LE(recipient.amount, offset); offset += 8;
        Buffer.from(recipient.commitment).copy(data, offset); offset += 32;
        data.writeUInt32LE(encryptedNote.length, offset); offset += 4;
        encryptedNote.copy(data, offset);
        
        instructions.push(new TransactionInstruction({
          programId: this.spsProgram,
          keys: [{ pubkey: authority.publicKey, isSigner: true, isWritable: true }],
          data,
        }));
      }
      
      const sig = await this.sendTx(authority, instructions);
      signatures.push(sig);
    }
    
    return signatures;
  }

  /**
   * Helper to send versioned transaction
   */
  private async sendTx(signer: Keypair, instructions: TransactionInstruction[]): Promise<string> {
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
    
    const message = new TransactionMessage({
      payerKey: signer.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();
    
    const tx = new VersionedTransaction(message);
    tx.sign([signer]);
    
    const signature = await this.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
    });
    
    await this.connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    }, 'confirmed');
    
    return signature;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STEALTH ADDRESS HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate stealth address commitment for a recipient
 */
export function generateStealthCommitment(
  recipientViewKey: Uint8Array
): { commitment: Uint8Array; ephemeralKey: Uint8Array } {
  const ephemeralKey = randomBytes(32);
  
  // commitment = hash(ephemeralKey || viewKey)
  const commitment = sha256(Buffer.concat([
    Buffer.from(ephemeralKey),
    Buffer.from(recipientViewKey),
  ]));
  
  return { commitment, ephemeralKey };
}

/**
 * Scan ephemeral keys to find matching commitments
 */
export function scanForCommitments(
  viewKey: Uint8Array,
  ephemeralKeys: Uint8Array[]
): Uint8Array[] {
  return ephemeralKeys.map(ek => 
    sha256(Buffer.concat([Buffer.from(ek), Buffer.from(viewKey)]))
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export { PrivateTokenLauncher as default };
