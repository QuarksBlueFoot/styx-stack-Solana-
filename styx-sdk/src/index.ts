/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  @styx-stack/sdk
 *  
 *  THE COMPLETE PRIVACY SDK FOR SOLANA
 *  Build private apps in minutes, not months.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * WHAT'S INCLUDED:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ MODULE              │ DESCRIPTION                                          │
 * ├─────────────────────┼─────────────────────────────────────────────────────-┤
 * │ SPS (Token Standard)│ Privacy tokens, NFTs, DeFi - Token-22 parity + more │
 * │ EasyPay             │ No-wallet payments, gasless, text/email settlement   │
 * │ EasyPay Standalone  │ Same as above but NO custom programs needed!         │
 * │ Inscriptions        │ Lamport inscription tokens - unique on-chain tokens  │
 * │ Messaging           │ E2E encrypted messaging, group chat, file sharing    │
 * │ WhisperDrop         │ Private airdrops with merkle proofs + token gates    │
 * │ Privacy Utils       │ Stealth addresses, encryption, ZK helpers            │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * QUICK START:
 * ```typescript
 * import { StyxClient, EasyPayStandalone } from '@styx-stack/sdk';
 * 
 * // Option 1: Full featured (uses Styx Program)
 * const styx = new StyxClient(connection);
 * await styx.sendPrivateMessage(sender, recipient, "Hello!");
 * 
 * // Option 2: Standalone (no custom programs!)
 * const easypay = new EasyPayStandalone(connection);
 * const { link } = await easypay.createPayment({ sender, amount: 0.1 * LAMPORTS_PER_SOL });
 * // Send link.url via SMS/email - recipient claims without a wallet!
 * ```
 *
 * CHOOSE YOUR INTEGRATION:
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  STANDALONE MODE (No custom programs)                                      │
 * │  ────────────────────────────────────                                      │
 * │  • EasyPay Standalone - Claimable payments                                 │
 * │  • Native encryption using Memo program                                    │
 * │  • Works on ANY Solana cluster                                             │
 * │  • Install → Build → Ship 🚀                                               │
 * │                                                                             │
 * │  import { EasyPayStandalone } from '@styx-stack/sdk';                      │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  FULL STYX MODE (Uses Styx Program)                                        │
 * │  ──────────────────────────────────                                        │
 * │  • SPS Token Standard (200+ operations)                                    │
 * │  • Private messaging with Double Ratchet                                   │
 * │  • WhisperDrop airdrops                                                    │
 * │  • DAM (Deferred Account Materialization)                                  │
 * │  • Private DEX/Swaps                                                       │
 * │  • Compliance & audit trails                                               │
 * │                                                                             │
 * │  Program ID: GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9                  │
 * │                                                                             │
 * │  import { StyxClient, SpsClient } from '@styx-stack/sdk';                  │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * @see https://styxprivacy.app/docs for full documentation
 * @see https://github.com/QuarksBlueFoot/StyxStack
 * @author Bluefoot Labs (@moonmanquark)
 * @license Apache-2.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CORE EXPORTS - Always available
// ═══════════════════════════════════════════════════════════════════════════════

export {
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

import { PublicKey } from '@solana/web3.js';

/** Styx Private Memo Program - Mainnet */
export const STYX_PROGRAM_ID = new PublicKey('GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9');

/** Styx Private Memo Program - Devnet */
export const STYX_DEVNET_PROGRAM_ID = new PublicKey('FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW');

/** WhisperDrop Program - Mainnet */
export const WHISPERDROP_PROGRAM_ID = new PublicKey('GhstFNnEbixAGQgLnWg1nWetJQgGfSUMhnxdBA6hWu5e');

/** WhisperDrop Program - Devnet */
export const WHISPERDROP_DEVNET_PROGRAM_ID = new PublicKey('BPM5VuX9YrG7CgueWGxtqQZBQwMTacc315ppWCtTCJ5q');

/** Memo Program (native Solana) */
export const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

// ═══════════════════════════════════════════════════════════════════════════════
// STANDALONE EASYPAY (RESOLV) - No custom programs needed!
// ═══════════════════════════════════════════════════════════════════════════════

export {
  EasyPayStandalone,
  EasyPayStandalone as Resolv,
  createEasyPayStandalone,
  createEasyPayStandalone as createResolv,
  quickSendStandalone,
  quickSendStandalone as resolvQuickSend,
  generatePaymentId,
  generateClaimCredentials,
  verifyClaimSecret,
  encryptPaymentMetadata,
  decryptPaymentMetadata,
  generateStealthReceiver,
  DEFAULT_RELAYER_URL,
  DEFAULT_EXPIRY_SECONDS,
  type StandalonePaymentConfig,
  type StandalonePaymentConfig as ResolvPaymentConfig,
  type StandalonePayment,
  type StandalonePayment as ResolvPayment,
  type StandalonePaymentLink,
  type StandalonePaymentLink as ResolvPaymentLink,
  type StandaloneClaimResult,
  type StandaloneClaimResult as ResolvClaimResult,
} from './easypay-standalone';

// ═══════════════════════════════════════════════════════════════════════════════
// SPS - STYX PRIVACY STANDARD (Requires Styx Program)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Main client
  SpsClient,
  createSpsClient,
  
  // EasyPay (with program)
  EasyPayClient,
  createEasyPayClient,
  
  // DAM - Deferred Account Materialization
  DAMClient,
  createDAMClient,
  
  // Private Swap
  PrivateSwapClient,
  createPrivateSwapClient,
  
  // Domain operations
  DOMAIN_STS,
  DOMAIN_MESSAGING,
  DOMAIN_PRIVACY,
  DOMAIN_NFT,
  DOMAIN_DEFI,
  DOMAIN_DAM,
  DOMAIN_IC,
  DOMAIN_SWAP,
  DOMAIN_EASYPAY,
  
  // Types
  type SpsClientConfig,
  type ClaimablePayment,
  type StealthKeys,
  type PaymentLink,
} from './sps';

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGING - Private E2E Encrypted Messaging
// ═══════════════════════════════════════════════════════════════════════════════

export {
  StyxMessaging,
  createMessagingClient,
  
  // Crypto helpers
  encryptMessage,
  decryptMessage,
  deriveSharedSecret,
  generateX25519Keypair,
  
  // Types
  type EncryptedMessage,
  type MessageThread,
} from './messaging';

// ═══════════════════════════════════════════════════════════════════════════════
// WHISPERDROP - Private Airdrops
// ═══════════════════════════════════════════════════════════════════════════════

export {
  WhisperDropClient,
  createWhisperDropClient,
  
  // Merkle tree
  buildMerkleTree,
  generateMerkleProof,
  verifyMerkleProof,
  
  // Gate types
  GateType,
  
  // Types
  type Allocation,
  type CampaignConfig,
  type MerkleProof,
} from './whisperdrop';

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVACY UTILS - Stealth addresses, encryption, etc.
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Stealth addresses
  generateStealthKeys,
  generateStealthAddress,
  parseStealthMetaAddress,
  scanStealthPayments,
  
  // Encryption
  encryptPayload,
  decryptPayload,
  encryptRecipient,
  decryptRecipient,
  encryptAmount,
  decryptAmount,
  
  // Commitment schemes
  generateCommitment,
  verifyCommitment,
  
  // Nullifiers
  generateNullifier,
  
  // Types
  type StealthAddressInfo,
  type Commitment,
  type Nullifier,
} from './privacy';

// ═══════════════════════════════════════════════════════════════════════════════
// INSCRIPTIONS - Lamport Inscription Tokens
// ═══════════════════════════════════════════════════════════════════════════════

export {
  StyxInscriptions,
  createStyxInscriptions,
  quickInscribe,
  InscriptionType,
  InscriptionMode,
  type Inscription,
  type CreateInscriptionParams,
  type TransferInscriptionParams,
  type InscriptionCreateResult,
} from './inscriptions';

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE LENDING - P2P NFT & Token Loans
// ═══════════════════════════════════════════════════════════════════════════════

export {
  PrivateLending,
  createPrivateLending,
  
  // Constants
  DOMAIN_LENDING,
  LENDING_OPS,
  LENDING_SEEDS,
  PROTOCOL_FEE_BPS,
  PERPETUAL_GRACE_SECONDS,
  
  // Enums
  NftType,
  LoanType,
  LoanState,
  PrivacyLevel,
  
  // Crypto helpers
  generateAmountCommitment,
  verifyCommitment as verifyLendingCommitment,
  generateNftCommitment,
  generateLoanNullifier,
  
  // Types
  type PedersenCommitment,
  type PrivateOffer,
  type PrivateLoan,
  type CreatePrivateOfferParams,
  type AcceptPrivateOfferParams,
  type RepayPrivateLoanParams,
} from './lending';

// ═══════════════════════════════════════════════════════════════════════════════
// STANDALONE LENDING - No Custom Programs Required!
// ═══════════════════════════════════════════════════════════════════════════════

export {
  LendingStandalone,
  LendingStandalone as PrivateLendingStandalone,
  createLendingStandalone,
  createLendingStandalone as createPrivateLendingStandalone,
  quickCreateOffer as quickCreateOfferStandalone,
  generateId as generateLendingId,
  generateStealthKeypair,
  encryptLoanTerms,
  decryptLoanTerms,
  calculateInterest as calculateLoanInterest,
  calculateRepayment as calculateLoanRepayment,
  calculateProtocolFee as calculateLendingFee,
  PERPETUAL_GRACE_SECONDS as STANDALONE_GRACE_SECONDS,
  DEFAULT_OFFER_EXPIRY_SECONDS,
  LoanType as StandaloneLoanType,
  LoanState as StandaloneLoanState,
  PrivacyLevel as StandalonePrivacyLevel,
  type StandaloneLendingConfig,
  type StandaloneOffer,
  type StandaloneLoan,
  type OfferLink,
  type StandaloneCreateOfferParams,
  type StandaloneAcceptOfferParams,
  type StandaloneRepayParams,
} from './lending-standalone';

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVACY STANDALONE - No Custom Programs Required!
// Complete privacy toolkit: stealth addresses, sealed boxes, view tag scanning
// ═══════════════════════════════════════════════════════════════════════════════

export {
  PrivacyStandalone,
  
  // Key derivation
  deriveStealthKeyPairs,
  deriveViewingKey,
  generateStealthMetaAddress,
  parseMetaAddress,
  
  // Stealth addresses
  generateStealthPayment,
  scanStealthAnnouncements,
  checkStealthOwnership,
  computeViewTag,
  
  // Encryption
  sealedBoxEncrypt,
  sealedBoxDecrypt,
  cryptoBoxEncrypt,
  cryptoBoxDecrypt,
  encryptMemo as encryptMemoStandalone,
  decryptMemo as decryptMemoStandalone,
  
  // Commitments
  createAmountCommitment,
  openAmountCommitment,
  
  // Utilities
  generateX25519KeyPair,
  deriveSharedSecretStandalone,
  
  // Types
  type StealthMetaAddress,
  type StealthPayment,
  type StealthAnnouncement,
  type DetectedPayment,
  type SealedBox,
  type CryptoBox,
  type ScanStats,
} from './privacy-standalone';

// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED CLIENT - All-in-one access
// ═══════════════════════════════════════════════════════════════════════════════

import { Connection, Keypair } from '@solana/web3.js';

/**
 * Unified Styx Client configuration
 */
export interface StyxClientConfig {
  /** Solana connection or RPC endpoint */
  connection: Connection | string;
  /** Default wallet for signing (optional) */
  wallet?: Keypair;
  /** Use mainnet program IDs (default: true) */
  mainnet?: boolean;
  /** Custom relayer URL for gasless operations */
  relayerUrl?: string;
}

/**
 * StyxClient - The unified entry point for all Styx features
 * 
 * @example
 * ```typescript
 * const styx = new StyxClient({ connection });
 * 
 * // Private messaging
 * await styx.messaging.send(sender, recipient, "Hello!");
 * 
 * // EasyPay (standalone - no custom programs)
 * const { link } = await styx.easypay.createPayment({ sender, amount });
 * 
 * // SPS tokens (requires Styx Program)
 * await styx.sps.createMint({ name: 'MyToken', symbol: 'MTK' });
 * 
 * // WhisperDrop airdrops
 * await styx.whisperdrop.createCampaign({ merkleRoot, expiryUnix });
 * ```
 */
export class StyxClient {
  public readonly connection: Connection;
  public readonly programId: PublicKey;
  public readonly whisperdropProgramId: PublicKey;
  
  // Sub-clients (lazy loaded)
  private _easypay?: EasyPayStandalone;
  private _sps?: SpsClient;
  private _messaging?: StyxMessaging;
  private _whisperdrop?: WhisperDropClient;
  private _lending?: PrivateLending;

  constructor(config: StyxClientConfig) {
    this.connection = typeof config.connection === 'string'
      ? new Connection(config.connection)
      : config.connection;
    
    const isMainnet = config.mainnet !== false;
    this.programId = isMainnet ? STYX_PROGRAM_ID : STYX_DEVNET_PROGRAM_ID;
    this.whisperdropProgramId = isMainnet ? WHISPERDROP_PROGRAM_ID : WHISPERDROP_DEVNET_PROGRAM_ID;
  }

  /**
   * EasyPay Standalone (Resolv) - No custom programs needed!
   * Perfect for quick integration with gasless, no-wallet payments.
   */
  get easypay(): EasyPayStandalone {
    if (!this._easypay) {
      this._easypay = new EasyPayStandalone(this.connection);
    }
    return this._easypay;
  }

  /** Alias for easypay - modern branding */
  get resolv(): EasyPayStandalone {
    return this.easypay;
  }

  /**
   * SPS Client - Full Styx Privacy Standard access
   * Requires Styx Program on mainnet/devnet.
   */
  get sps(): SpsClient {
    if (!this._sps) {
      this._sps = new SpsClient({ connection: this.connection });
    }
    return this._sps;
  }

  /**
   * Messaging Client - Private encrypted messaging
   */
  get messaging(): StyxMessaging {
    if (!this._messaging) {
      this._messaging = new StyxMessaging(this.connection, this.programId);
    }
    return this._messaging;
  }

  /**
   * WhisperDrop Client - Private airdrops
   */
  get whisperdrop(): WhisperDropClient {
    if (!this._whisperdrop) {
      this._whisperdrop = new WhisperDropClient(this.connection, this.whisperdropProgramId);
    }
    return this._whisperdrop;
  }

  /**
   * Private Lending - P2P NFT & token loans with privacy
   */
  get lending(): PrivateLending {
    if (!this._lending) {
      this._lending = new PrivateLending(this.connection, this.programId);
    }
    return this._lending;
  }

  /**
   * Quick send - Send SOL/tokens via payment link (standalone mode)
   */
  async quickSend(sender: Keypair, amount: bigint, mint?: PublicKey | null) {
    return this.easypay.createPayment({ sender, amount, mint });
  }

  /**
   * Quick message - Send encrypted message (requires Styx Program)
   */
  async quickMessage(
    sender: Keypair,
    recipient: PublicKey,
    message: string,
    sharedSecret: Uint8Array
  ) {
    return this.messaging.sendPrivateMessage(sender, recipient, message, sharedSecret);
  }
}

/**
 * Create a new Styx client
 * 
 * @example
 * ```typescript
 * // Mainnet
 * const styx = createStyxClient('https://api.mainnet-beta.solana.com');
 * 
 * // Devnet with custom relayer
 * const styx = createStyxClient({
 *   connection: 'https://api.devnet.solana.com',
 *   mainnet: false,
 *   relayerUrl: 'https://my-relayer.com',
 * });
 * ```
 */
export function createStyxClient(
  configOrEndpoint: StyxClientConfig | string
): StyxClient {
  if (typeof configOrEndpoint === 'string') {
    return new StyxClient({ connection: configOrEndpoint });
  }
  return new StyxClient(configOrEndpoint);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE RE-EXPORTS (for convenience)
// ═══════════════════════════════════════════════════════════════════════════════

// These are already exported above - just providing type annotations
import type { SpsClient as SpsClientType, EasyPayClient, DAMClient, PrivateSwapClient } from './sps';
import type { StyxMessaging as StyxMessagingType } from './messaging';
import type { WhisperDropClient as WhisperDropClientType, GateType, Allocation, CampaignConfig, MerkleProof } from './whisperdrop';
import type { PrivateLending as PrivateLendingType } from './lending';
import type { EasyPayStandalone as EasyPayStandaloneType } from './easypay-standalone';

// Re-import classes for instantiation in StyxClient
import { SpsClient } from './sps';
import { StyxMessaging } from './messaging';
import { WhisperDropClient } from './whisperdrop';
import { PrivateLending } from './lending';
import { EasyPayStandalone } from './easypay-standalone';
