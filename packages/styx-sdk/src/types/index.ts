/**
 * Styx SDK Types
 * 
 * Centralized type definitions for the Styx SDK.
 * Re-exports all public types from individual modules.
 */

// ═══════════════════════════════════════════════════════════════════════════
// COMMON TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Network type */
export type Network = 'mainnet' | 'devnet';

/** Privacy levels available across modules */
export enum PrivacyLevel {
  /** All details visible on-chain */
  Public = 0,
  /** Amounts/terms hidden, parties visible */
  ShieldedAmounts = 1,
  /** Full privacy with stealth addresses */
  FullyPrivate = 2,
}

/** Transaction result */
export interface TransactionResult {
  success: boolean;
  txSignature?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// RESOLV / EASYPAY TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type {
  StandalonePaymentConfig,
  StandalonePaymentConfig as ResolvPaymentConfig,
  StandalonePayment,
  StandalonePayment as ResolvPayment,
  StandalonePaymentLink,
  StandalonePaymentLink as ResolvPaymentLink,
  StandaloneClaimResult,
  StandaloneClaimResult as ResolvClaimResult,
} from '../easypay-standalone';

// ═══════════════════════════════════════════════════════════════════════════
// LENDING TYPES
// ═══════════════════════════════════════════════════════════════════════════

// Standalone lending (no program)
export type {
  StandaloneLendingConfig,
  StandaloneOffer,
  StandaloneLoan,
  OfferLink,
  StandaloneCreateOfferParams,
  StandaloneAcceptOfferParams,
  StandaloneRepayParams,
} from '../lending-standalone';

export {
  LoanType as StandaloneLoanType,
  LoanState as StandaloneLoanState,
  PrivacyLevel as StandalonePrivacyLevel,
} from '../lending-standalone';

// Private lending (with program)
export type {
  PedersenCommitment,
  PrivateOffer,
  PrivateLoan,
  CreatePrivateOfferParams,
  AcceptPrivateOfferParams,
  RepayPrivateLoanParams,
} from '../lending';

export {
  NftType,
  LoanType,
  LoanState,
  PrivacyLevel as LendingPrivacyLevel,
} from '../lending';

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGING TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type {
  EncryptedMessage,
  MessageThread,
} from '../messaging';

// ═══════════════════════════════════════════════════════════════════════════
// PRIVACY TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type {
  StealthAddressInfo,
  Commitment,
  Nullifier,
} from '../privacy';

// ═══════════════════════════════════════════════════════════════════════════
// WHISPERDROP TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type {
  Allocation,
  CampaignConfig,
  MerkleProof,
} from '../whisperdrop';

export { GateType } from '../whisperdrop';

// ═══════════════════════════════════════════════════════════════════════════
// INSCRIPTIONS TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type {
  Inscription,
  CreateInscriptionParams,
  TransferInscriptionParams,
  InscriptionCreateResult,
} from '../inscriptions';

export { InscriptionType, InscriptionMode } from '../inscriptions';

// ═══════════════════════════════════════════════════════════════════════════
// SPS TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type {
  SpsClientConfig,
  ClaimablePayment,
  StealthKeys,
  PaymentLink,
} from '../sps';
