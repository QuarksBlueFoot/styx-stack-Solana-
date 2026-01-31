/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX UNIFIED SDK
 *  
 *  Integrates all Styx Stack SDKs into one unified interface
 *  Provides access to: SPS, STS, Messaging, WhisperDrop, DAM, NFT, and more
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRAM IDS
// ═══════════════════════════════════════════════════════════════════════════════

/** Styx Private Memo Program - Mainnet */
export const STYX_PROGRAM_ID = new PublicKey('GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9');

/** Styx Private Memo Program - Devnet */
export const STYX_DEVNET_PROGRAM_ID = new PublicKey('FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW');

/** WhisperDrop Program - Mainnet */
export const WHISPERDROP_PROGRAM_ID = new PublicKey('GhstFNnEbixAGQgLnWg1nWetJQgGfSUMhnxdBA6hWu5e');

/** WhisperDrop Program - Devnet */
export const WHISPERDROP_DEVNET_PROGRAM_ID = new PublicKey('BPM5VuX9YrG7CgueWGxtqQZBQwMTacc315ppWCtTCJ5q');

/** SPL Token Program */
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

/** Token-2022 Program */
export const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

/** Metaplex Token Metadata */
export const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

/** Bubblegum (cNFT) */
export const BUBBLEGUM_PROGRAM_ID = new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY');

// ═══════════════════════════════════════════════════════════════════════════════
// INSTRUCTION DOMAINS
// ═══════════════════════════════════════════════════════════════════════════════

export const Domains = {
  /** Styx Token Standard operations */
  STS: 0x00,
  /** Messaging & communication */
  MESSAGING: 0x01,
  /** Privacy operations */
  PRIVACY: 0x02,
  /** NFT operations */
  NFT: 0x03,
  /** DeFi operations */
  DEFI: 0x04,
  /** Notes & inscriptions */
  NOTES: 0x05,
  /** Compliance & audit */
  COMPLIANCE: 0x06,
  /** DAM (Deferred Account Materialization) */
  DAM: 0x07,
  /** WhisperDrop airdrops */
  AIRDROP: 0x08,
  /** Governance */
  GOVERNANCE: 0x09,
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ClusterType = 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet';

export interface StyxConfig {
  cluster: ClusterType;
  rpcUrl?: string;
  relayUrl?: string;
  indexerUrl?: string;
  commitment?: 'processed' | 'confirmed' | 'finalized';
}

export interface WalletAdapter {
  publicKey: PublicKey | null;
  connected: boolean;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
  signMessage?(message: Uint8Array): Promise<Uint8Array>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPS (STYX PRIVACY STANDARD) CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface SpsTokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  uri?: string;
  sellerFeeBasisPoints?: number;
  creators?: Array<{ address: PublicKey; share: number }>;
  isMutable?: boolean;
}

export interface SpsToken {
  mint: PublicKey;
  name: string;
  symbol: string;
  decimals: number;
  supply: bigint;
  authority: PublicKey | null;
}

/**
 * SPS Client - Styx Privacy Standard tokens
 */
export class SpsClient {
  private connection: Connection;
  private wallet: WalletAdapter | Keypair | null;
  private programId: PublicKey;
  
  constructor(
    connection: Connection,
    wallet?: WalletAdapter | Keypair,
    cluster: ClusterType = 'mainnet-beta'
  ) {
    this.connection = connection;
    this.wallet = wallet || null;
    this.programId = cluster === 'devnet' ? STYX_DEVNET_PROGRAM_ID : STYX_PROGRAM_ID;
  }
  
  /**
   * Create a privacy-native token
   */
  async createMint(config: SpsTokenConfig): Promise<{ mint: PublicKey; signature: string }> {
    // Implementation would create SPS token mint
    // For now, return placeholder
    const mint = Keypair.generate().publicKey;
    return { mint, signature: '' };
  }
  
  /**
   * Mint tokens to a commitment (private)
   */
  async mintToCommitment(args: {
    mint: PublicKey;
    amount: bigint;
    commitment: Uint8Array;
  }): Promise<string> {
    // Implementation would mint to shielded pool
    return '';
  }
  
  /**
   * Private transfer
   */
  async privateTransfer(args: {
    mint: PublicKey;
    amount: bigint;
    fromNullifier: Uint8Array;
    toCommitment: Uint8Array;
    proof: Uint8Array;
  }): Promise<string> {
    return '';
  }
  
  /**
   * Get token info
   */
  async getToken(mint: PublicKey): Promise<SpsToken | null> {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAM (DEFERRED ACCOUNT MATERIALIZATION) CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface DamPoolConfig {
  tokenMint: PublicKey;
  authority: PublicKey;
  maxVirtualAccounts: number;
  materializationThreshold: bigint;
}

export interface VirtualBalance {
  owner: PublicKey;
  amount: bigint;
  nonce: number;
  lastUpdated: number;
}

/**
 * DAM Client - Deferred Account Materialization
 * Zero-rent token accounts that only materialize when needed
 */
export class DamClient {
  private connection: Connection;
  private wallet: WalletAdapter | Keypair | null;
  private programId: PublicKey;
  
  constructor(
    connection: Connection,
    wallet?: WalletAdapter | Keypair,
    cluster: ClusterType = 'mainnet-beta'
  ) {
    this.connection = connection;
    this.wallet = wallet || null;
    this.programId = cluster === 'devnet' ? STYX_DEVNET_PROGRAM_ID : STYX_PROGRAM_ID;
  }
  
  /**
   * Initialize a DAM pool
   */
  async initPool(config: DamPoolConfig): Promise<{ pool: PublicKey; signature: string }> {
    const pool = Keypair.generate().publicKey;
    return { pool, signature: '' };
  }
  
  /**
   * Deposit to virtual balance
   */
  async deposit(args: {
    pool: PublicKey;
    amount: bigint;
    recipient?: PublicKey;
  }): Promise<string> {
    return '';
  }
  
  /**
   * Get virtual balance
   */
  async getVirtualBalance(pool: PublicKey, owner: PublicKey): Promise<VirtualBalance | null> {
    return null;
  }
  
  /**
   * Transfer virtual balance (no on-chain account needed)
   */
  async virtualTransfer(args: {
    pool: PublicKey;
    amount: bigint;
    to: PublicKey;
  }): Promise<string> {
    return '';
  }
  
  /**
   * Materialize virtual balance to real token account
   */
  async materialize(args: {
    pool: PublicKey;
    amount: bigint;
  }): Promise<{ tokenAccount: PublicKey; signature: string }> {
    const tokenAccount = Keypair.generate().publicKey;
    return { tokenAccount, signature: '' };
  }
  
  /**
   * Dematerialize real tokens back to virtual
   */
  async dematerialize(args: {
    pool: PublicKey;
    tokenAccount: PublicKey;
    amount: bigint;
  }): Promise<string> {
    return '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WHISPERDROP CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

export enum GateType {
  None = 0,
  SplTokenHolder = 1,
  SplMinBalance = 2,
  Token22Holder = 3,
  Token22MinBalance = 4,
  NftHolder = 5,
  NftCollection = 6,
  CNftHolder = 7,
  CNftCollection = 8,
}

export interface AirdropCampaign {
  id: PublicKey;
  creator: PublicKey;
  merkleRoot: Uint8Array;
  tokenMint: PublicKey;
  totalAmount: bigint;
  claimedAmount: bigint;
  claimCount: number;
  maxClaims: number;
  gateType: GateType;
  gateMint: PublicKey | null;
  gateMinBalance: bigint;
  startTime: number;
  endTime: number | null;
  isActive: boolean;
}

/**
 * WhisperDrop Client - Privacy-preserving airdrops
 */
export class WhisperDropClient {
  private connection: Connection;
  private wallet: WalletAdapter | Keypair | null;
  private programId: PublicKey;
  
  constructor(
    connection: Connection,
    wallet?: WalletAdapter | Keypair,
    cluster: ClusterType = 'mainnet-beta'
  ) {
    this.connection = connection;
    this.wallet = wallet || null;
    this.programId = cluster === 'devnet' ? WHISPERDROP_DEVNET_PROGRAM_ID : WHISPERDROP_PROGRAM_ID;
  }
  
  /**
   * Create airdrop campaign
   */
  async createCampaign(args: {
    recipients: Array<{ address: PublicKey; amount: bigint }>;
    tokenMint: PublicKey;
    gateType?: GateType;
    gateMint?: PublicKey;
    gateMinBalance?: bigint;
    startTime?: number;
    endTime?: number;
  }): Promise<{ campaign: PublicKey; merkleRoot: Uint8Array; signature: string }> {
    const campaign = Keypair.generate().publicKey;
    return { campaign, merkleRoot: new Uint8Array(32), signature: '' };
  }
  
  /**
   * Claim from campaign
   */
  async claim(args: {
    campaign: PublicKey;
    proof: Uint8Array[];
    amount: bigint;
    leafIndex: number;
  }): Promise<string> {
    return '';
  }
  
  /**
   * Check claim eligibility
   */
  async checkEligibility(
    campaign: PublicKey,
    claimer: PublicKey
  ): Promise<{ eligible: boolean; amount: bigint; proof: Uint8Array[] | null }> {
    return { eligible: false, amount: 0n, proof: null };
  }
  
  /**
   * Get campaign info
   */
  async getCampaign(campaign: PublicKey): Promise<AirdropCampaign | null> {
    return null;
  }
  
  /**
   * Reclaim unclaimed tokens
   */
  async reclaim(campaign: PublicKey): Promise<string> {
    return '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED STYX CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Unified Styx Client - Access all Styx Stack features
 */
export class UnifiedStyxClient {
  public readonly connection: Connection;
  public readonly config: StyxConfig;
  
  private _sps?: SpsClient;
  private _dam?: DamClient;
  private _whisperdrop?: WhisperDropClient;
  
  constructor(config: StyxConfig, wallet?: WalletAdapter | Keypair) {
    this.config = config;
    
    const rpcUrl = config.rpcUrl || this.getDefaultRpcUrl(config.cluster);
    this.connection = new Connection(rpcUrl, config.commitment || 'confirmed');
    
    // Initialize sub-clients lazily
    if (wallet) {
      this._sps = new SpsClient(this.connection, wallet, config.cluster);
      this._dam = new DamClient(this.connection, wallet, config.cluster);
      this._whisperdrop = new WhisperDropClient(this.connection, wallet, config.cluster);
    }
  }
  
  private getDefaultRpcUrl(cluster: ClusterType): string {
    switch (cluster) {
      case 'mainnet-beta':
        return 'https://api.mainnet-beta.solana.com';
      case 'devnet':
        return 'https://api.devnet.solana.com';
      case 'testnet':
        return 'https://api.testnet.solana.com';
      case 'localnet':
        return 'http://localhost:8899';
    }
  }
  
  get programId(): PublicKey {
    return this.config.cluster === 'devnet' ? STYX_DEVNET_PROGRAM_ID : STYX_PROGRAM_ID;
  }
  
  get whisperdropProgramId(): PublicKey {
    return this.config.cluster === 'devnet' ? WHISPERDROP_DEVNET_PROGRAM_ID : WHISPERDROP_PROGRAM_ID;
  }
  
  /** SPS - Styx Privacy Standard tokens */
  get sps(): SpsClient {
    if (!this._sps) {
      this._sps = new SpsClient(this.connection, undefined, this.config.cluster);
    }
    return this._sps;
  }
  
  /** DAM - Deferred Account Materialization */
  get dam(): DamClient {
    if (!this._dam) {
      this._dam = new DamClient(this.connection, undefined, this.config.cluster);
    }
    return this._dam;
  }
  
  /** WhisperDrop - Privacy airdrops */
  get whisperdrop(): WhisperDropClient {
    if (!this._whisperdrop) {
      this._whisperdrop = new WhisperDropClient(this.connection, undefined, this.config.cluster);
    }
    return this._whisperdrop;
  }
  
  /**
   * Build instruction with domain prefix
   */
  buildInstruction(
    domain: number,
    opcode: number,
    data: Uint8Array
  ): TransactionInstruction {
    const prefix = new Uint8Array(2);
    prefix[0] = domain;
    prefix[1] = opcode;
    
    const fullData = new Uint8Array(prefix.length + data.length);
    fullData.set(prefix, 0);
    fullData.set(data, prefix.length);
    
    return new TransactionInstruction({
      programId: this.programId,
      keys: [],
      data: Buffer.from(fullData),
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a unified Styx client
 */
export function createStyxClient(
  config: StyxConfig,
  wallet?: WalletAdapter | Keypair
): UnifiedStyxClient {
  return new UnifiedStyxClient(config, wallet);
}

/**
 * Quick setup for common configurations
 */
export const Styx = {
  /** Create mainnet client */
  mainnet: (wallet?: WalletAdapter | Keypair) => 
    createStyxClient({ cluster: 'mainnet-beta' }, wallet),
  
  /** Create devnet client */
  devnet: (wallet?: WalletAdapter | Keypair) => 
    createStyxClient({ cluster: 'devnet' }, wallet),
  
  /** Create with custom config */
  create: createStyxClient,
  
  /** Program IDs */
  PROGRAM_ID: STYX_PROGRAM_ID,
  DEVNET_PROGRAM_ID: STYX_DEVNET_PROGRAM_ID,
  WHISPERDROP_PROGRAM_ID,
  WHISPERDROP_DEVNET_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  METADATA_PROGRAM_ID,
  BUBBLEGUM_PROGRAM_ID,
  
  /** Domains */
  Domains,
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  UnifiedStyxClient as StyxClient,
};

