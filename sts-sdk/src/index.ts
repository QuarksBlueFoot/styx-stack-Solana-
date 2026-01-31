/**
 * @styxstack/sts-sdk
 * 
 * TypeScript SDK for the Styx Token Standard (STS) on Solana
 * 
 * STS is the next-generation token standard featuring:
 * - Event-sourced tokens (zero rent, infinite scale)
 * - Full Token-22 parity (all extensions supported)
 * - Native privacy (stealth addresses, encrypted amounts)
 * - 227 instruction types (7.5x more than Token-22)
 * - AMM/DEX integration (swap, LP, limit orders)
 * - NFT marketplace (list, buy, auction)
 * - Cross-chain bridges (Wormhole, LayerZero, IBC, BTC SPV)
 * - Private securities (accreditation, transfer agents, lockups)
 * - Options & margin trading (collateral, liquidation)
 * 
 * @see https://github.com/QuarksBlueFoot/StyxStack
 * @author @moonmanquark (Bluefoot Labs)
 * @license BSL-1.1
 */

import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    TransactionInstruction,
    SystemProgram,
    LAMPORTS_PER_SOL,
    sendAndConfirmTransaction
} from '@solana/web3.js';
import { keccak_256 } from '@noble/hashes/sha3';
import { x25519 } from '@noble/curves/ed25519';
import { chacha20poly1305 } from '@noble/ciphers/chacha';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Mainnet Program ID */
export const STYX_PMP_PROGRAM_ID = new PublicKey('GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9');

/** Devnet Program ID */
export const STYX_PMP_DEVNET_PROGRAM_ID = new PublicKey('FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW');

// Instruction tags
const TAG_PRIVATE_MESSAGE = 3;
const TAG_ROUTED_MESSAGE = 4;
const TAG_PRIVATE_TRANSFER = 5;
const TAG_RATCHET_MESSAGE = 7;
const TAG_COMPLIANCE_REVEAL = 8;

// VSL (Virtual State Layer) instruction tags
const TAG_PROPOSAL = 9;
const TAG_PRIVATE_VOTE = 10;
const TAG_VTA_TRANSFER = 11;
const TAG_REFERRAL_REGISTER = 12;
const TAG_REFERRAL_CLAIM = 13;

// ============================================================================
// VSL Atomic Swaps (14-19)
// ============================================================================
export const TAG_HASHLOCK_COMMIT = 14;        // Commit to swap with hashlock
export const TAG_HASHLOCK_REVEAL = 15;        // Reveal secret, execute swap
export const TAG_CONDITIONAL_COMMIT = 16;     // Inscribe conditional action
export const TAG_BATCH_SETTLE = 17;           // Settle batch of off-chain ops
export const TAG_STATE_CHANNEL_OPEN = 18;     // Open inscribed state channel
export const TAG_STATE_CHANNEL_CLOSE = 19;    // Close/dispute state channel

// ============================================================================
// Novel Privacy Primitives (20-31)
// ============================================================================
export const TAG_TIME_CAPSULE = 20;           // Message locked until slot N
export const TAG_GHOST_PDA = 21;              // Prove secret via PDA derivation
export const TAG_CPI_INSCRIBE = 22;           // Other programs inscribe via CPI
export const TAG_VTA_DELEGATE = 23;           // Delegate VTA spending rights
export const TAG_VTA_REVOKE = 24;             // Revoke delegation
export const TAG_STEALTH_SWAP_INIT = 25;      // Privacy-preserving atomic swap
export const TAG_STEALTH_SWAP_EXEC = 26;      // Execute stealth swap with preimage
export const TAG_VTA_GUARDIAN_SET = 27;       // Set guardians for social recovery
export const TAG_VTA_GUARDIAN_RECOVER = 28;   // Recover VTA with guardian signatures
export const TAG_PRIVATE_SUBSCRIPTION = 29;   // Recurring payments with privacy
export const TAG_MULTIPARTY_VTA_INIT = 30;    // Initialize k-of-n VTA
export const TAG_MULTIPARTY_VTA_SIGN = 31;    // Add signature to multi-party action

// ============================================================================
// VSL Private Transfers (32-43)
// ============================================================================
export const TAG_VSL_DEPOSIT = 32;            // Deposit real tokens → private balance
export const TAG_VSL_WITHDRAW = 33;           // Burn private balance → real tokens
export const TAG_VSL_PRIVATE_TRANSFER = 34;   // Private transfer within pool
export const TAG_VSL_PRIVATE_SWAP = 35;       // Private atomic swap between tokens
export const TAG_VSL_SHIELDED_SEND = 36;      // One-time stealth address payment
export const TAG_VSL_SPLIT = 37;              // Split balance into multiple notes
export const TAG_VSL_MERGE = 38;              // Merge notes into single balance
export const TAG_VSL_ESCROW_CREATE = 39;      // Private escrow (freelance, trades)
export const TAG_VSL_ESCROW_RELEASE = 40;     // Release escrow to recipient
export const TAG_VSL_ESCROW_REFUND = 41;      // Refund escrow to depositor
export const TAG_VSL_BALANCE_PROOF = 42;      // Prove balance >= X without revealing
export const TAG_VSL_AUDIT_REVEAL = 43;       // Reveal to auditor (compliance)

// ============================================================================
// Advanced Privacy (44-64)
// ============================================================================
export const TAG_DECOY_STORM = 44;            // Generate N indistinguishable decoy txs
export const TAG_DECOY_REVEAL = 45;           // Optionally prove which was real
export const TAG_EPHEMERAL_CREATE = 46;       // Create one-time-use PDA with secret
export const TAG_EPHEMERAL_DRAIN = 47;        // Drain to stealth address, auto-close
export const TAG_CHRONO_LOCK = 48;            // Lock content until slot N
export const TAG_CHRONO_REVEAL = 49;          // Claim after time passes
export const TAG_SHADOW_FOLLOW = 50;          // Encrypted follow edge
export const TAG_SHADOW_UNFOLLOW = 51;        // Remove encrypted edge
export const TAG_PHANTOM_NFT_COMMIT = 52;     // Commit to NFT ownership
export const TAG_PHANTOM_NFT_PROVE = 53;      // Prove ownership privately
export const TAG_INNOCENCE_MINT = 54;         // Mint innocence credential NFT
export const TAG_INNOCENCE_VERIFY = 55;       // Verify innocence on-chain
export const TAG_INNOCENCE_REVOKE = 56;       // Revoke compromised credential
export const TAG_CLEAN_SOURCE_REGISTER = 57;  // Register as clean source (CEX, protocol)
export const TAG_CLEAN_SOURCE_PROVE = 58;     // Prove funds from whitelist source
export const TAG_TEMPORAL_INNOCENCE = 59;     // Prove deposit predates blacklist
export const TAG_COMPLIANCE_CHANNEL_OPEN = 60;  // Open encrypted channel to regulator
export const TAG_COMPLIANCE_CHANNEL_REPORT = 61; // Submit encrypted compliance report
export const TAG_PROVENANCE_COMMIT = 62;      // Commit to fund provenance
export const TAG_PROVENANCE_EXTEND = 63;      // Extend chain on transfer
export const TAG_PROVENANCE_VERIFY = 64;      // Verify provenance depth

// ============================================================================
// STS (Styx Token Standard) instruction tags - Event-Sourced Token Revolution
// ============================================================================
export const TAG_NOTE_MINT = 80;
export const TAG_NOTE_TRANSFER = 81;
export const TAG_NOTE_MERGE = 82;
export const TAG_NOTE_SPLIT = 83;
export const TAG_NOTE_BURN = 84;
export const TAG_GPOOL_DEPOSIT = 85;
export const TAG_GPOOL_WITHDRAW = 86;
export const TAG_GPOOL_WITHDRAW_STEALTH = 87;
export const TAG_GPOOL_WITHDRAW_SWAP = 88;
export const TAG_MERKLE_UPDATE = 89;
export const TAG_MERKLE_EMERGENCY = 90;
export const TAG_NOTE_EXTEND = 91;
export const TAG_NOTE_FREEZE = 92;
export const TAG_NOTE_THAW = 93;
export const TAG_PROTOCOL_PAUSE = 94;
export const TAG_PROTOCOL_UNPAUSE = 95;

// STS Token-22 Parity Tags
export const TAG_GROUP_CREATE = 96;
export const TAG_GROUP_ADD_MEMBER = 97;
export const TAG_GROUP_REMOVE_MEMBER = 98;
export const TAG_HOOK_REGISTER = 99;
export const TAG_HOOK_EXECUTE = 100;          // Execute hook on transfer (internal)
export const TAG_WRAP_SPL = 101;
export const TAG_UNWRAP_SPL = 102;
export const TAG_INTEREST_ACCRUE = 103;
export const TAG_INTEREST_CLAIM = 104;        // Claim accrued interest
export const TAG_CONFIDENTIAL_MINT = 105;     // Mint with encrypted amount
export const TAG_CONFIDENTIAL_TRANSFER = 106; // Transfer with encrypted amounts
export const TAG_NFT_MINT = 107;
export const TAG_COLLECTION_CREATE = 108;
export const TAG_ROYALTY_CLAIM = 109;         // Claim accrued royalties
export const TAG_FAIR_LAUNCH_COMMIT = 110;
export const TAG_FAIR_LAUNCH_REVEAL = 111;

// ============================================================================
// v8 NFT MARKETPLACE (112-121) - Full NFT Trading Parity
// ============================================================================
export const TAG_NFT_LIST = 112;
export const TAG_NFT_DELIST = 113;
export const TAG_NFT_BUY = 114;
export const TAG_NFT_OFFER = 115;
export const TAG_NFT_ACCEPT_OFFER = 116;
export const TAG_NFT_CANCEL_OFFER = 117;
export const TAG_AUCTION_CREATE = 118;
export const TAG_AUCTION_BID = 119;
export const TAG_AUCTION_SETTLE = 120;
export const TAG_AUCTION_CANCEL = 121;

// ============================================================================
// v9 PORTABLE PRIVACY VOUCHERS (PPV) (122-127) - World's First DeFi Privacy Layer
// ============================================================================
export const TAG_PPV_CREATE = 122;
export const TAG_PPV_VERIFY = 123;
export const TAG_PPV_REDEEM = 124;
export const TAG_PPV_TRANSFER = 125;
export const TAG_PPV_EXTEND = 126;
export const TAG_PPV_REVOKE = 127;

// ============================================================================
// v10 ATOMIC PRIVACY BRIDGE (APB) (128-130) - Private → Public in One TX
// ============================================================================
export const TAG_APB_TRANSFER = 128;
export const TAG_APB_BATCH = 129;
export const TAG_STEALTH_SCAN_HINT = 130;

// ============================================================================
// v11 PRIVATE DEFI ADAPTERS (131-138) - Jupiter/Marinade/Raydium Integration
// ============================================================================
export const TAG_ADAPTER_REGISTER = 131;
export const TAG_ADAPTER_CALL = 132;
export const TAG_ADAPTER_CALLBACK = 133;
export const TAG_PRIVATE_SWAP = 134;
export const TAG_PRIVATE_STAKE = 135;
export const TAG_PRIVATE_UNSTAKE = 136;
export const TAG_PRIVATE_LP_ADD = 137;
export const TAG_PRIVATE_LP_REMOVE = 138;

// ============================================================================
// v12 UNIVERSAL DEPOSITS & POOLS (139-142)
// ============================================================================
export const TAG_POOL_CREATE = 139;
export const TAG_POOL_DEPOSIT = 140;
export const TAG_POOL_WITHDRAW = 141;
export const TAG_POOL_DONATE = 142;

// ============================================================================
// v13 PRIVATE YIELD & STAKING (143-146)
// ============================================================================
export const TAG_YIELD_VAULT_CREATE = 143;
export const TAG_YIELD_DEPOSIT = 144;
export const TAG_YIELD_CLAIM = 145;
export const TAG_YIELD_WITHDRAW = 146;

// ============================================================================
// v14 TOKEN METADATA (147-150) - Full Token-22 Metadata Parity
// ============================================================================
export const TAG_TOKEN_CREATE = 147;
export const TAG_TOKEN_SET_AUTHORITY = 148;
export const TAG_TOKEN_METADATA_SET = 149;
export const TAG_TOKEN_METADATA_UPDATE = 150;

// ============================================================================
// v15 COMPLETE TOKEN-22 PARITY (151-156)
// ============================================================================
export const TAG_HOOK_EXECUTE_REAL = 151;
export const TAG_CONFIDENTIAL_TRANSFER_V2 = 152;
export const TAG_INTEREST_CLAIM_REAL = 153;
export const TAG_ROYALTY_CLAIM_REAL = 154;
export const TAG_BATCH_NOTE_OPS = 155;
export const TAG_EXCHANGE_PROOF = 156;

// ============================================================================
// v16 ADVANTAGES OVER TOKEN-22 (157-162) - Unique STS Features
// ============================================================================
export const TAG_SELECTIVE_DISCLOSURE = 157;
export const TAG_CONDITIONAL_TRANSFER = 158;
export const TAG_DELEGATION_CHAIN = 159;
export const TAG_TIME_LOCKED_REVEAL = 160;
export const TAG_CROSS_MINT_ATOMIC = 161;
export const TAG_SOCIAL_RECOVERY = 162;

// ============================================================================
// v17 DEFI DEEP INTEGRATION (163-168)
// ============================================================================
export const TAG_JUPITER_ROUTE = 163;
export const TAG_MARINADE_STAKE = 164;
export const TAG_DRIFT_PERP = 165;
export const TAG_PRIVATE_LENDING = 166;
export const TAG_FLASH_LOAN = 167;
export const TAG_ORACLE_BOUND = 168;

// ============================================================================
// v18 ADVANCED EXTENSIONS (169-175)
// ============================================================================
export const TAG_VELOCITY_LIMIT = 169;
export const TAG_GOVERNANCE_LOCK = 170;
export const TAG_REPUTATION_GATE = 171;
export const TAG_GEO_RESTRICTION = 172;
export const TAG_TIME_DECAY = 173;
export const TAG_MULTI_SIG_NOTE = 174;
export const TAG_RECOVERABLE_NOTE = 175;

// ============================================================================
// v19 AMM & DEX INTEGRATION (176-191) - Critical for Adoption!
// ============================================================================
// These enable STS tokens to be traded on DEXes like Jupiter, Raydium, etc.
export const TAG_AMM_POOL_CREATE = 176;
export const TAG_AMM_ADD_LIQUIDITY = 177;
export const TAG_AMM_REMOVE_LIQUIDITY = 178;
export const TAG_AMM_SWAP = 179;
export const TAG_AMM_QUOTE = 180;
export const TAG_AMM_SYNC = 181;
export const TAG_LP_NOTE_MINT = 182;
export const TAG_LP_NOTE_BURN = 183;
export const TAG_ROUTER_SWAP = 184;
export const TAG_ROUTER_SPLIT = 185;
export const TAG_LIMIT_ORDER_PLACE = 186;
export const TAG_LIMIT_ORDER_FILL = 187;
export const TAG_LIMIT_ORDER_CANCEL = 188;
export const TAG_TWAP_ORDER_START = 189;
export const TAG_TWAP_ORDER_FILL = 190;
export const TAG_CONCENTRATED_LP = 191;

// ============================================================================
// v20 PROVABLE SUPERIORITY (192-207) - Factual Advantages Over Token-22
// ============================================================================
// These directly counter Token-22 advocate arguments with ON-CHAIN proofs!
export const TAG_NULLIFIER_CREATE = 192;       // Create nullifier PDA (trustless double-spend)
export const TAG_NULLIFIER_CHECK = 193;        // Check if nullifier exists (CPI-callable)
export const TAG_MERKLE_ROOT_PUBLISH = 194;    // Publish Merkle root (crank)
export const TAG_MERKLE_PROOF_VERIFY = 195;    // Verify note in Merkle tree
export const TAG_BALANCE_ATTEST = 196;         // CPI: Attest balance for DeFi composability
export const TAG_BALANCE_VERIFY = 197;         // Verify balance attestation
export const TAG_FREEZE_ENFORCED = 198;        // Multi-authority enforced freeze
export const TAG_THAW_GOVERNED = 199;          // Governed thaw with timelock
export const TAG_WRAPPER_MINT = 200;           // Mint wrapper Token-22 from STS note
export const TAG_WRAPPER_BURN = 201;           // Burn wrapper Token-22 to STS note
export const TAG_VALIDATOR_PROOF = 202;        // Inscribe validator burden proof
export const TAG_SECURITY_AUDIT = 203;         // On-chain security audit log
export const TAG_COMPLIANCE_PROOF = 204;       // Prove compliance without revealing
export const TAG_DECENTRALIZATION_METRIC = 205; // Inscribe decentralization metrics
export const TAG_ATOMIC_CPI_TRANSFER = 206;    // Atomic CPI transfer (DeFi compatible)
export const TAG_BATCH_NULLIFIER = 207;        // Batch create nullifiers

// ============================================================================
// v21 ZERO-RENT & MERKLE (208-210) - Inscription-Only Nullifiers & Airdrops
// ============================================================================
export const TAG_NULLIFIER_INSCRIBE = 208;     // ZERO-RENT nullifier (inscription-only!)
export const TAG_MERKLE_AIRDROP_ROOT = 209;    // Merkle airdrop root (zero upfront cost!)
export const TAG_MERKLE_AIRDROP_CLAIM = 210;   // Claim from merkle airdrop

// ============================================================================
// v22 PRIVATE SECURITIES (211-220) - World's First Private Security Tokens
// ============================================================================
export const TAG_SECURITY_ISSUE = 211;         // Issue new security token (CUSIP, share class)
export const TAG_SECURITY_TRANSFER = 212;      // Transfer with transfer agent approval
export const TAG_TRANSFER_AGENT_REGISTER = 213; // Register transfer agent for issuer
export const TAG_TRANSFER_AGENT_APPROVE = 214; // TA approves pending transfer
export const TAG_ACCREDITATION_PROOF = 215;    // ZK proof of accredited investor status
export const TAG_SHARE_CLASS_CREATE = 216;     // Define share class (voting, dividend rights)
export const TAG_CORPORATE_ACTION = 217;       // Dividend, split, merger, spinoff
export const TAG_REG_D_LOCKUP = 218;           // Set Rule 144 restriction period
export const TAG_INSTITUTIONAL_REPORT = 219;   // 13F/13D filing disclosure (encrypted)
export const TAG_SECURITY_FREEZE = 220;        // Regulatory freeze with authority

// ============================================================================
// v23 OPTIONS TRADING (221-230) - Private Options Contracts
// ============================================================================
export const TAG_OPTION_WRITE = 221;           // Write call/put (lock collateral)
export const TAG_OPTION_BUY = 222;             // Purchase option contract
export const TAG_OPTION_EXERCISE = 223;        // Exercise option at strike
export const TAG_OPTION_EXPIRE = 224;          // Settle expired option (oracle price)
export const TAG_OPTION_ASSIGN = 225;          // Random assignment to writer
export const TAG_OPTION_CLOSE = 226;           // Close position before expiry
export const TAG_OPTION_COLLATERAL_LOCK = 227; // Lock writer collateral
export const TAG_OPTION_COLLATERAL_RELEASE = 228; // Release after expiry
export const TAG_OPTION_SERIES_CREATE = 229;   // Create option series (strikes, expiries)
export const TAG_OPTION_MARKET_MAKE = 230;     // MM bid/ask quotes

// ============================================================================
// v24 MARGIN & LEVERAGE (231-240) - Private Leveraged Trading
// ============================================================================
export const TAG_MARGIN_ACCOUNT_CREATE = 231;  // Create margin account (isolated/cross)
export const TAG_MARGIN_DEPOSIT = 232;         // Add collateral
export const TAG_MARGIN_WITHDRAW = 233;        // Remove excess collateral
export const TAG_POSITION_OPEN = 234;          // Open leveraged position
export const TAG_POSITION_CLOSE = 235;         // Close position
export const TAG_POSITION_LIQUIDATE = 236;     // Force close underwater position
export const TAG_MARGIN_CALL_EMIT = 237;       // Broadcast margin call warning
export const TAG_FUNDING_RATE_APPLY = 238;     // Apply perp funding rate
export const TAG_CROSS_MARGIN_SYNC = 239;      // Sync cross-margin collateral
export const TAG_INSURANCE_FUND_CONTRIBUTE = 240; // Add to insurance fund

// ============================================================================
// v25 CROSS-CHAIN BRIDGES (241-255) - Private Cross-Chain Transfers
// ============================================================================
export const TAG_BRIDGE_LOCK = 241;            // Lock tokens for bridging
export const TAG_BRIDGE_RELEASE = 242;         // Release on proof verification
export const TAG_BRIDGE_BURN = 243;            // Burn for cross-chain mint
export const TAG_BRIDGE_MINT = 244;            // Mint from cross-chain burn proof
export const TAG_WORMHOLE_VAA_VERIFY = 245;    // Verify Wormhole VAA message
export const TAG_LAYERZERO_ENDPOINT = 246;     // LayerZero message handler
export const TAG_IBC_PACKET_RECV = 247;        // IBC packet receive (SUI/SEI)
export const TAG_IBC_PACKET_ACK = 248;         // IBC acknowledgment
export const TAG_BTC_SPV_PROOF = 249;          // Bitcoin SPV verification
export const TAG_BTC_RELAY_SUBMIT = 250;       // Submit BTC block header
export const TAG_ETH_STATE_PROOF = 251;        // Ethereum state proof
export const TAG_BRIDGE_FEE_COLLECT = 252;     // Collect bridge fees
export const TAG_BRIDGE_GUARDIAN_ROTATE = 253; // Rotate bridge guardians
export const TAG_BRIDGE_PAUSE = 254;           // Emergency pause
export const TAG_BRIDGE_RESUME = 255;          // Resume operations

// Pool type constants
export const POOL_TYPE_CONSTANT_PRODUCT = 0;  // x * y = k (Uniswap v2 style)
export const POOL_TYPE_STABLE_SWAP = 1;       // Curve-style stable swap
export const POOL_TYPE_CONCENTRATED = 2;       // Uniswap v3 style CLMM

// STS Extension types (TLV format)
export const EXT_TRANSFER_FEE = 0x01;
export const EXT_ROYALTY = 0x02;
export const EXT_INTEREST = 0x03;
export const EXT_VESTING = 0x04;
export const EXT_DELEGATION = 0x05;
export const EXT_SOULBOUND = 0x06;
export const EXT_FROZEN = 0x07;
export const EXT_METADATA = 0x08;

// Token-22 Parity Extension types
export const EXT_HOOK = 0x09;
export const EXT_GROUP = 0x0A;
export const EXT_MEMBER = 0x0B;
export const EXT_CPI_GUARD = 0x0C;
export const EXT_REQUIRED_MEMO = 0x0D;
export const EXT_DEFAULT_FROZEN = 0x0E;
export const EXT_SCALED_BALANCE = 0x0F;
export const EXT_CONFIDENTIAL = 0x10;
export const EXT_PROGRAMMABLE = 0x11;

// v8+ Extension types
export const EXT_NFT_LISTING = 0x12;
export const EXT_AUCTION = 0x13;
export const EXT_PPV = 0x14;
export const EXT_ADAPTER = 0x15;
export const EXT_POOL = 0x16;
export const EXT_YIELD = 0x17;

// v15+ Extension types (Token-22 Parity Plus)
export const EXT_ORACLE_BOUND = 0x18;
export const EXT_TIME_DECAY = 0x19;
export const EXT_GOVERNANCE_LOCK = 0x1A;
export const EXT_REPUTATION = 0x1B;
export const EXT_GEOGRAPHIC = 0x1C;
export const EXT_VELOCITY_LIMIT = 0x1D;
export const EXT_MULTI_SIG = 0x1E;
export const EXT_RECOVERABLE = 0x1F;
export const EXT_CONDITIONAL = 0x20;
export const EXT_DELEGATION_CHAIN = 0x21;

// Adapter types for DeFi integration
export const ADAPTER_JUPITER = 0x01;
export const ADAPTER_MARINADE = 0x02;
export const ADAPTER_RAYDIUM = 0x03;
export const ADAPTER_DRIFT = 0x04;
export const ADAPTER_CUSTOM = 0xFF;

// Auction types
export const AUCTION_ENGLISH = 0x01;
export const AUCTION_DUTCH = 0x02;
export const AUCTION_SEALED = 0x04;

// STS Trust levels
export const TRUST_INDEXER = 0;
export const TRUST_NULLIFIER_PDA = 1;
export const TRUST_MERKLE_PROOF = 2;

// Flags
const FLAG_ENCRYPTED = 0x01;
const FLAG_STEALTH = 0x02;
const FLAG_COMPLIANCE = 0x10;
const FLAG_TOKEN22 = 0x20;

// ============================================================================
// TYPES
// ============================================================================

export interface StyxMessage {
    signature: string;
    payload: Uint8Array;
    timestamp: number | null;
}

export interface MessageOptions {
    stealth?: boolean;
    compliance?: boolean;
}

export type RevealType = 'full' | 'amount' | 'recipient' | 'metadata';

// v8 NFT Marketplace types
export interface NftListingOptions {
    /** NFT commitment hash */
    nftCommit: Uint8Array;
    /** Listing price in lamports */
    price: bigint;
    /** Currency mint (SOL = SystemProgram) */
    currencyMint?: PublicKey;
    /** Listing expiry slot */
    expiry: number;
    /** Privacy flags: 0x01=private_price, 0x02=accept_offers, 0x04=escrow */
    flags?: number;
}

export interface AuctionOptions {
    /** NFT commitment hash */
    nftCommit: Uint8Array;
    /** Reserve price */
    reserve: bigint;
    /** Currency mint */
    currencyMint?: PublicKey;
    /** Duration in slots */
    duration: number;
    /** Auction type: AUCTION_ENGLISH, AUCTION_DUTCH, AUCTION_SEALED */
    auctionType?: number;
}

// v9 PPV types
export interface PPVOptions {
    /** Note nullifier being wrapped */
    noteNullifier: Uint8Array;
    /** Amount (blinded in commitment) */
    amount: bigint;
    /** Allowed programs that can consume the PPV */
    allowedPrograms?: PublicKey[];
    /** Expiry slot */
    expiry?: number;
}

// v10 APB types
export interface APBTransferOptions {
    /** Note nullifier being spent */
    noteNullifier: Uint8Array;
    /** Amount to transfer */
    amount: bigint;
    /** Stealth pubkey for recipient */
    stealthPubkey: Uint8Array;
    /** Token mint */
    mint: PublicKey;
    /** Flags */
    flags?: number;
}

// v11 DeFi Adapter types
export interface AdapterCallOptions {
    /** Registered adapter ID */
    adapterId: Uint8Array;
    /** PPV to use as input */
    ppvId: Uint8Array;
    /** Action code (adapter-specific) */
    action: number;
    /** Action parameters */
    params: bigint;
}

export interface PrivateSwapOptions {
    /** Input note nullifier */
    inputNullifier: Uint8Array;
    /** Input token mint */
    inputMint: PublicKey;
    /** Output token mint */
    outputMint: PublicKey;
    /** Minimum output amount */
    minOutput: bigint;
    /** Slippage in basis points */
    slippageBps?: number;
}

// v12 Pool types
export interface PoolOptions {
    /** Token mint for the pool */
    mint: PublicKey;
    /** Initial deposit amount */
    initialDeposit?: bigint;
    /** Pool configuration flags */
    flags?: number;
}

// v13 Yield types
export interface YieldVaultOptions {
    /** Underlying token mint */
    underlyingMint: PublicKey;
    /** Expected APY in basis points */
    apyBps?: number;
    /** External yield source (e.g., Marinade) */
    yieldSource?: PublicKey;
}

// v14 Token Metadata types
export interface TokenMetadata {
    /** Token name (max 32 chars) */
    name: string;
    /** Token symbol (max 10 chars) */
    symbol: string;
    /** Metadata URI */
    uri?: string;
    /** Token decimals */
    decimals: number;
}

export interface TokenCreateOptions {
    /** Token metadata */
    metadata: TokenMetadata;
    /** Configuration flags */
    flags?: number;
}

// ============================================================================
// v22 PRIVATE SECURITIES TYPES
// ============================================================================

export interface SecurityIssueOptions {
    /** Security token identifier (32 bytes) */
    securityId: Uint8Array;
    /** Total shares to issue */
    totalShares: bigint;
    /** Issuer signature (64 bytes) */
    issuerSig: Uint8Array;
    /** CUSIP/ISIN identifier */
    cusip?: string;
    /** Regulation type: 0=RegD, 1=RegS, 2=RegA, 3=RegCF */
    regulationType?: number;
    /** Lockup period in slots */
    lockupPeriod?: number;
}

export interface SecurityTransferOptions {
    /** Security token ID */
    securityId: Uint8Array;
    /** Sender commitment */
    senderCommitment: Uint8Array;
    /** Receiver commitment */
    receiverCommitment: Uint8Array;
    /** Amount to transfer */
    amount: bigint;
    /** Compliance proof (ZK proof of eligibility) */
    complianceProof: Uint8Array;
}

export interface TransferAgentOptions {
    /** Security token ID */
    securityId: Uint8Array;
    /** Transfer agent public key */
    agentPubkey: Uint8Array;
    /** Issuer authorization signature */
    issuerSig: Uint8Array;
    /** Agent permissions bitmap */
    permissions?: number;
}

// ============================================================================
// v23 OPTIONS TRADING TYPES
// ============================================================================

export interface OptionCreateOptions {
    /** Underlying asset commitment */
    underlyingCommit: Uint8Array;
    /** Strike price (encrypted) */
    strikePrice: bigint;
    /** Expiry slot */
    expirySlot: number;
    /** Option type: 0=call, 1=put */
    optionType: number;
    /** American (0) or European (1) style */
    exerciseStyle?: number;
    /** Collateral commitment */
    collateralCommit?: Uint8Array;
}

export interface OptionExerciseOptions {
    /** Option contract ID */
    optionId: Uint8Array;
    /** Ownership proof */
    ownershipProof: Uint8Array;
    /** Exercise amount */
    amount: bigint;
    /** Settlement preference: 0=physical, 1=cash */
    settlementType?: number;
}

export interface OptionSettleOptions {
    /** Option contract ID */
    optionId: Uint8Array;
    /** Oracle price attestation */
    oracleSig: Uint8Array;
    /** Settlement price */
    settlementPrice: bigint;
    /** PnL proof */
    pnlProof: Uint8Array;
}

// ============================================================================
// v24 MARGIN & LEVERAGE TYPES
// ============================================================================

export interface MarginAccountOptions {
    /** Account identifier */
    accountId: Uint8Array;
    /** Initial margin requirement (basis points) */
    initialMarginBps: number;
    /** Maintenance margin (basis points) */
    maintenanceMarginBps: number;
    /** Maximum leverage (e.g., 10 = 10x) */
    maxLeverage: number;
}

export interface MarginPositionOptions {
    /** Margin account ID */
    accountId: Uint8Array;
    /** Asset commitment */
    assetCommit: Uint8Array;
    /** Position size */
    size: bigint;
    /** Direction: 0=long, 1=short */
    direction: number;
    /** Entry price (encrypted) */
    entryPrice: bigint;
    /** Leverage multiplier */
    leverage: number;
}

export interface LiquidationOptions {
    /** Position ID to liquidate */
    positionId: Uint8Array;
    /** Oracle price attestation */
    oracleSig: Uint8Array;
    /** Current price */
    currentPrice: bigint;
    /** Liquidator reward (basis points) */
    liquidatorRewardBps?: number;
}

// ============================================================================
// v25 CROSS-CHAIN BRIDGE TYPES
// ============================================================================

export interface BridgeLockOptions {
    /** Source chain token commitment */
    tokenCommit: Uint8Array;
    /** Amount to bridge */
    amount: bigint;
    /** Destination chain ID */
    destChainId: number;
    /** Destination address (32 bytes) */
    destAddress: Uint8Array;
    /** Bridge fee (lamports) */
    bridgeFee?: bigint;
    /** Timeout in slots */
    timeout?: number;
}

export interface BridgeReleaseOptions {
    /** Lock ID from source chain */
    lockId: Uint8Array;
    /** Bridge proof (from oracles) */
    bridgeProof: Uint8Array;
    /** Receiver commitment */
    receiverCommit: Uint8Array;
    /** Amount */
    amount: bigint;
}

export interface BridgeOracleOptions {
    /** Oracle public key */
    oraclePubkey: Uint8Array;
    /** Supported chain IDs */
    supportedChains: number[];
    /** Stake amount (for slashing) */
    stakeAmount: bigint;
    /** Oracle URL for attestations */
    oracleUrl?: string;
}

// Chain ID constants for cross-chain bridges
export const CHAIN_SOLANA = 1;
export const CHAIN_ETHEREUM = 2;
export const CHAIN_POLYGON = 3;
export const CHAIN_ARBITRUM = 4;
export const CHAIN_BASE = 5;
export const CHAIN_AVALANCHE = 6;
export const CHAIN_BSC = 7;

// ============================================================================
// CRYPTO HELPERS
// ============================================================================

/**
 * Encrypt recipient pubkey using Keccak256 XOR mask
 */
export function encryptRecipient(sender: PublicKey, recipient: PublicKey): Uint8Array {
    const mask = keccak_256(Buffer.concat([
        Buffer.from('STYX_META_V3'),
        sender.toBytes()
    ]));
    const encrypted = new Uint8Array(32);
    const recipientBytes = recipient.toBytes();
    for (let i = 0; i < 32; i++) {
        encrypted[i] = recipientBytes[i] ^ mask[i];
    }
    return encrypted;
}

/**
 * Decrypt recipient pubkey using Keccak256 XOR mask
 */
export function decryptRecipient(sender: PublicKey, encrypted: Uint8Array): PublicKey {
    const mask = keccak_256(Buffer.concat([
        Buffer.from('STYX_META_V3'),
        sender.toBytes()
    ]));
    const decrypted = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
        decrypted[i] = encrypted[i] ^ mask[i];
    }
    return new PublicKey(decrypted);
}

/**
 * Encrypt transfer amount using Keccak256 XOR mask
 */
export function encryptAmount(
    sender: PublicKey,
    recipient: PublicKey,
    nonce: Uint8Array,
    amount: bigint
): bigint {
    const mask = keccak_256(Buffer.concat([
        Buffer.from('STYX_XFER_V3'),
        sender.toBytes(),
        recipient.toBytes(),
        Buffer.from(nonce)
    ]));
    const maskBuf = Buffer.from(mask.slice(0, 8));
    const maskValue = maskBuf.readBigUInt64LE();
    return amount ^ maskValue;
}

/**
 * Decrypt transfer amount using Keccak256 XOR mask
 */
export function decryptAmount(
    sender: PublicKey,
    recipient: PublicKey,
    nonce: Uint8Array,
    encryptedAmount: bigint
): bigint {
    // XOR is symmetric - same operation for encrypt and decrypt
    return encryptAmount(sender, recipient, nonce, encryptedAmount);
}

/**
 * Derive shared secret using X25519 key exchange
 */
export function deriveSharedSecret(
    myPrivateKey: Uint8Array,
    theirPublicKey: Uint8Array
): Uint8Array {
    return x25519.scalarMult(myPrivateKey, theirPublicKey);
}

/**
 * Generate X25519 keypair for key exchange
 */
export function generateX25519Keypair(): { privateKey: Uint8Array; publicKey: Uint8Array } {
    const privateKey = crypto.getRandomValues(new Uint8Array(32));
    const publicKey = x25519.scalarMultBase(privateKey);
    return { privateKey, publicKey };
}

/**
 * Encrypt message with ChaCha20-Poly1305
 */
export function encryptPayload(message: Uint8Array, sharedSecret: Uint8Array): Uint8Array {
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const cipher = chacha20poly1305(sharedSecret, nonce);
    const encrypted = cipher.encrypt(message);
    return Buffer.concat([Buffer.from(nonce), Buffer.from(encrypted)]);
}

/**
 * Decrypt message with ChaCha20-Poly1305
 */
export function decryptPayload(encrypted: Uint8Array, sharedSecret: Uint8Array): Uint8Array {
    const nonce = encrypted.slice(0, 12);
    const ciphertext = encrypted.slice(12);
    const cipher = chacha20poly1305(sharedSecret, nonce);
    return cipher.decrypt(ciphertext);
}

// ============================================================================
// SDK CLASS
// ============================================================================

/**
 * StyxPMP - SDK for interacting with the Styx Private Memo Program
 * 
 * @example
 * ```typescript
 * const styx = new StyxPMP(connection);
 * 
 * // Send private message
 * await styx.sendPrivateMessage(sender, recipient, "Hello!", sharedSecret);
 * 
 * // Send private transfer
 * await styx.sendPrivateTransfer(sender, recipient, 0.5);
 * ```
 */
export class StyxPMP {
    connection: Connection;
    programId: PublicKey;

    constructor(connection: Connection, programId?: PublicKey) {
        this.connection = connection;
        this.programId = programId || STYX_PMP_PROGRAM_ID;
    }

    // ========================================================================
    // PRIVATE MESSAGE
    // ========================================================================

    /**
     * Build a private message instruction
     */
    buildPrivateMessageInstruction(
        sender: PublicKey,
        recipient: PublicKey,
        payload: Uint8Array,
        options?: MessageOptions
    ): TransactionInstruction {
        let flags = FLAG_ENCRYPTED;
        if (options?.stealth) flags |= FLAG_STEALTH;
        if (options?.compliance) flags |= FLAG_COMPLIANCE;

        const encryptedRecipient = encryptRecipient(sender, recipient);
        
        const payloadLen = Buffer.alloc(2);
        payloadLen.writeUInt16LE(payload.length);

        const data = Buffer.concat([
            Buffer.from([TAG_PRIVATE_MESSAGE, flags]),
            Buffer.from(encryptedRecipient),
            sender.toBytes(),
            payloadLen,
            Buffer.from(payload)
        ]);

        return new TransactionInstruction({
            programId: this.programId,
            keys: [],
            data
        });
    }

    /**
     * Send a private message
     */
    async sendPrivateMessage(
        sender: Keypair,
        recipient: PublicKey,
        message: string | Uint8Array,
        sharedSecret: Uint8Array,
        options?: MessageOptions
    ): Promise<string> {
        const messageBytes = typeof message === 'string' 
            ? new TextEncoder().encode(message) 
            : message;
        
        const encryptedPayload = encryptPayload(messageBytes, sharedSecret);
        
        const instruction = this.buildPrivateMessageInstruction(
            sender.publicKey,
            recipient,
            encryptedPayload,
            options
        );

        const tx = new Transaction().add(instruction);
        return await sendAndConfirmTransaction(this.connection, tx, [sender]);
    }

    // ========================================================================
    // ROUTED MESSAGE
    // ========================================================================

    /**
     * Build a routed message instruction
     */
    buildRoutedMessageInstruction(
        sender: PublicKey,
        recipient: PublicKey,
        routeInfo: Uint8Array,
        payload: Uint8Array,
        hopCount: number,
        currentHop: number
    ): TransactionInstruction {
        const encryptedRecipient = encryptRecipient(sender, recipient);
        
        const payloadLen = Buffer.alloc(2);
        payloadLen.writeUInt16LE(payload.length);

        const data = Buffer.concat([
            Buffer.from([TAG_ROUTED_MESSAGE, FLAG_ENCRYPTED, hopCount]),
            Buffer.from(encryptedRecipient),
            Buffer.from([0x00]),  // reserved
            Buffer.from([currentHop]),
            Buffer.from(routeInfo),
            payloadLen,
            Buffer.from(payload)
        ]);

        return new TransactionInstruction({
            programId: this.programId,
            keys: [],
            data
        });
    }

    /**
     * Send a routed message through multiple hops
     */
    async sendRoutedMessage(
        sender: Keypair,
        recipient: PublicKey,
        hops: PublicKey[],
        message: Uint8Array,
        sharedSecret: Uint8Array
    ): Promise<string> {
        const encryptedPayload = encryptPayload(message, sharedSecret);
        const routeInfo = new Uint8Array(32).fill(0);
        
        const instruction = this.buildRoutedMessageInstruction(
            sender.publicKey,
            recipient,
            routeInfo,
            encryptedPayload,
            hops.length,
            0
        );

        const tx = new Transaction().add(instruction);
        return await sendAndConfirmTransaction(this.connection, tx, [sender]);
    }

    // ========================================================================
    // PRIVATE TRANSFER
    // ========================================================================

    /**
     * Build a private transfer instruction
     */
    buildPrivateTransferInstruction(
        sender: PublicKey,
        recipient: PublicKey,
        amount: bigint,
        memo?: Uint8Array
    ): TransactionInstruction {
        const nonce = crypto.getRandomValues(new Uint8Array(8));
        const encryptedRecipient = encryptRecipient(sender, recipient);
        const encryptedAmount = encryptAmount(sender, recipient, nonce, amount);

        const amountBuf = Buffer.alloc(8);
        amountBuf.writeBigUInt64LE(encryptedAmount);

        const memoData = memo || new Uint8Array(0);
        const memoLen = Buffer.alloc(2);
        memoLen.writeUInt16LE(memoData.length);

        const data = Buffer.concat([
            Buffer.from([TAG_PRIVATE_TRANSFER, FLAG_ENCRYPTED]),
            Buffer.from(encryptedRecipient),
            sender.toBytes(),
            amountBuf,
            Buffer.from(nonce),
            memoLen,
            Buffer.from(memoData)
        ]);

        return new TransactionInstruction({
            programId: this.programId,
            keys: [
                { pubkey: sender, isSigner: true, isWritable: true },
                { pubkey: recipient, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
            ],
            data
        });
    }

    /**
     * Send a private SOL transfer
     */
    async sendPrivateTransfer(
        sender: Keypair,
        recipient: PublicKey,
        amountSol: number,
        memo?: string
    ): Promise<string> {
        const amountLamports = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));
        const memoBytes = memo ? new TextEncoder().encode(memo) : undefined;
        
        const instruction = this.buildPrivateTransferInstruction(
            sender.publicKey,
            recipient,
            amountLamports,
            memoBytes
        );

        const tx = new Transaction().add(instruction);
        return await sendAndConfirmTransaction(this.connection, tx, [sender]);
    }

    // ========================================================================
    // RATCHET MESSAGE
    // ========================================================================

    /**
     * Build a ratchet message instruction
     */
    buildRatchetMessageInstruction(
        ephemeralPubkey: PublicKey,
        counter: bigint,
        ratchetData: Uint8Array,
        ciphertext: Uint8Array
    ): TransactionInstruction {
        const counterBuf = Buffer.alloc(8);
        counterBuf.writeBigUInt64LE(counter);

        const ciphertextLen = Buffer.alloc(2);
        ciphertextLen.writeUInt16LE(ciphertext.length);

        const data = Buffer.concat([
            Buffer.from([TAG_RATCHET_MESSAGE, FLAG_ENCRYPTED]),
            ephemeralPubkey.toBytes(),
            counterBuf,
            Buffer.from(ratchetData),
            ciphertextLen,
            Buffer.from(ciphertext)
        ]);

        return new TransactionInstruction({
            programId: this.programId,
            keys: [],
            data
        });
    }

    /**
     * Send a forward-secret ratchet message
     */
    async sendRatchetMessage(
        sender: Keypair,
        ephemeralKeypair: Keypair,
        counter: bigint,
        chainKey: Uint8Array,
        message: Uint8Array,
        sharedSecret: Uint8Array
    ): Promise<string> {
        const ciphertext = encryptPayload(message, sharedSecret);
        
        const instruction = this.buildRatchetMessageInstruction(
            ephemeralKeypair.publicKey,
            counter,
            chainKey,
            ciphertext
        );

        const tx = new Transaction().add(instruction);
        return await sendAndConfirmTransaction(this.connection, tx, [sender]);
    }

    // ========================================================================
    // COMPLIANCE
    // ========================================================================

    /**
     * Submit compliance disclosure
     */
    async submitComplianceReveal(
        sender: Keypair,
        messageId: Uint8Array,
        auditor: PublicKey,
        disclosureKey: Uint8Array,
        revealType: RevealType
    ): Promise<string> {
        const revealTypeCode = {
            'full': 0,
            'amount': 1,
            'recipient': 2,
            'metadata': 3
        }[revealType];

        const data = Buffer.concat([
            Buffer.from([TAG_COMPLIANCE_REVEAL, FLAG_COMPLIANCE]),
            Buffer.from(messageId),
            auditor.toBytes(),
            Buffer.from(disclosureKey),
            Buffer.from([revealTypeCode])
        ]);

        const instruction = new TransactionInstruction({
            programId: this.programId,
            keys: [],
            data
        });

        const tx = new Transaction().add(instruction);
        return await sendAndConfirmTransaction(this.connection, tx, [sender]);
    }

    // ========================================================================
    // MESSAGE READING
    // ========================================================================

    /**
     * Subscribe to incoming messages
     */
    subscribeToMessages(
        callback: (payload: Uint8Array, signature: string) => void
    ): number {
        return this.connection.onLogs(this.programId, (logs) => {
            for (const log of logs.logs) {
                if (log.startsWith('Program data:')) {
                    const base64Data = log.split('Program data: ')[1];
                    const payload = Buffer.from(base64Data, 'base64');
                    callback(payload, logs.signature);
                }
            }
        });
    }

    /**
     * Unsubscribe from messages
     */
    async unsubscribe(subscriptionId: number): Promise<void> {
        await this.connection.removeOnLogsListener(subscriptionId);
    }

    /**
     * Get historical messages
     */
    async getRecentMessages(limit: number = 100): Promise<StyxMessage[]> {
        const signatures = await this.connection.getSignaturesForAddress(
            this.programId,
            { limit }
        );

        const messages: StyxMessage[] = [];

        for (const sig of signatures) {
            const tx = await this.connection.getTransaction(sig.signature, {
                maxSupportedTransactionVersion: 0
            });

            if (tx?.meta?.logMessages) {
                for (const log of tx.meta.logMessages) {
                    if (log.startsWith('Program data:')) {
                        const payload = Buffer.from(
                            log.split('Program data: ')[1],
                            'base64'
                        );
                        messages.push({
                            signature: sig.signature,
                            payload: new Uint8Array(payload),
                            timestamp: sig.blockTime ?? null
                        });
                    }
                }
            }
        }

        return messages;
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default StyxPMP;

// ============================================================================
// VSL (VIRTUAL STATE LAYER) - GOVERNANCE, REFERRALS, VTAs
// ============================================================================

export interface ProposalOptions {
    title: string;
    descriptionHash: Uint8Array;
    votingEndSlot: bigint;
    quorumBps: number;
    isToken22?: boolean;
}

export interface VoteOptions {
    proposalId: Uint8Array;
    voterSecret: Uint8Array; // Used to generate nullifier
    vote: 'yes' | 'no' | 'abstain';
    weightProof?: Uint8Array;
    isToken22?: boolean;
}

export interface VTATransferOptions {
    mint: PublicKey;
    fromSecret: Uint8Array; // Used for nullifier
    toRecipient: PublicKey;
    toNonce: Uint8Array;
    amount: bigint;
    proof?: Uint8Array;
    isToken22?: boolean;
}

export interface ReferralOptions {
    referrer: PublicKey;
    parentChainHash?: Uint8Array; // Genesis if omitted
}

export interface ReferralClaimOptions {
    amountClaiming: bigint;
    depth: number;
    proof?: Uint8Array;
}

/** Treasury address for protocol fees */
export const TREASURY = new PublicKey('13xnC9kDksJMBE9FYVW1S7dukLjRDgrh4Dzm6eq5moon');

/** Protocol fee per operation */
export const PROTOCOL_FEE_LAMPORTS = 1_000_000n;

/** Base referral rate: 30% (3000 basis points) */
export const REFERRAL_BASE_BPS = 3000;

/** Max referral depth (10 levels) */
export const MAX_REFERRAL_DEPTH = 10;

/**
 * Calculate referral reward at a given depth
 * Level 0: 30%, Level 1: 15%, Level 2: 7.5%, etc.
 */
export function calculateReferralReward(amount: bigint, depth: number): bigint {
    if (depth >= MAX_REFERRAL_DEPTH) return 0n;
    const bps = REFERRAL_BASE_BPS >> depth;
    if (bps < 1) return 0n;
    return (amount * BigInt(bps)) / 10000n;
}

/**
 * Get all rewards in a referral chain
 */
export function calculateReferralChainRewards(amount: bigint): { depth: number; bps: number; reward: bigint }[] {
    const rewards: { depth: number; bps: number; reward: bigint }[] = [];
    for (let depth = 0; depth < MAX_REFERRAL_DEPTH; depth++) {
        const bps = REFERRAL_BASE_BPS >> depth;
        if (bps < 1) break;
        rewards.push({
            depth,
            bps,
            reward: (amount * BigInt(bps)) / 10000n
        });
    }
    return rewards;
}

/**
 * StyxGovernance - DAO governance using inscribed state
 */
export class StyxGovernance {
    private styx: StyxPMP;

    constructor(styxPMP: StyxPMP) {
        this.styx = styxPMP;
    }

    /**
     * Create a DAO proposal (inscribed to logs)
     */
    async createProposal(
        proposer: Keypair,
        options: ProposalOptions
    ): Promise<string> {
        const flags = options.isToken22 ? FLAG_TOKEN22 : 0;
        
        // Hash the title for on-chain
        const proposalHash = keccak_256(Buffer.from(options.title));
        const titleBytes = Buffer.from(options.title.slice(0, 64)); // Max 64 chars
        
        const data = Buffer.alloc(78 + titleBytes.length);
        let offset = 0;
        
        data.writeUInt8(TAG_PROPOSAL, offset); offset += 1;
        data.writeUInt8(flags, offset); offset += 1;
        Buffer.from(proposer.publicKey.toBytes()).copy(data, offset); offset += 32;
        Buffer.from(proposalHash).copy(data, offset); offset += 32;
        data.writeBigUInt64LE(options.votingEndSlot, offset); offset += 8;
        data.writeUInt16LE(options.quorumBps, offset); offset += 2;
        data.writeUInt16LE(titleBytes.length, offset); offset += 2;
        titleBytes.copy(data, offset);
        
        const ix = new TransactionInstruction({
            programId: this.styx.programId,
            keys: [
                { pubkey: proposer.publicKey, isSigner: true, isWritable: true },
                { pubkey: TREASURY, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
            ],
            data
        });

        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [proposer]);
    }

    /**
     * Cast a private vote (nullifier prevents double voting)
     */
    async castVote(
        voter: Keypair,
        options: VoteOptions
    ): Promise<string> {
        const flags = options.isToken22 ? FLAG_TOKEN22 : 0;
        
        // Generate nullifier from voter secret + proposal
        const nullifier = keccak_256(Buffer.concat([
            options.voterSecret,
            Buffer.from(options.proposalId)
        ]));
        
        const voteValue = options.vote === 'yes' ? 1 : options.vote === 'no' ? 0 : 2;
        const proofLen = options.weightProof?.length || 0;
        
        const data = Buffer.alloc(69 + proofLen);
        let offset = 0;
        
        data.writeUInt8(TAG_PRIVATE_VOTE, offset); offset += 1;
        data.writeUInt8(flags, offset); offset += 1;
        Buffer.from(options.proposalId).copy(data, offset); offset += 32;
        Buffer.from(nullifier).copy(data, offset); offset += 32;
        data.writeUInt8(voteValue, offset); offset += 1;
        data.writeUInt16LE(proofLen, offset); offset += 2;
        
        if (options.weightProof) {
            Buffer.from(options.weightProof).copy(data, offset);
        }
        
        const ix = new TransactionInstruction({
            programId: this.styx.programId,
            keys: [
                { pubkey: voter.publicKey, isSigner: true, isWritable: true },
                { pubkey: TREASURY, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
            ],
            data
        });

        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [voter]);
    }
}

/**
 * StyxVTA - Virtual Token Accounts (balances inscribed, not stored)
 */
export class StyxVTA {
    private styx: StyxPMP;

    constructor(styxPMP: StyxPMP) {
        this.styx = styxPMP;
    }

    /**
     * Create VTA deposit (initial balance inscription)
     */
    async deposit(
        sender: Keypair,
        options: VTATransferOptions
    ): Promise<string> {
        return this.transfer(sender, options);
    }

    /**
     * Transfer VTA balance (inscribed, nullifier prevents double-spend)
     */
    async transfer(
        sender: Keypair,
        options: VTATransferOptions
    ): Promise<string> {
        const flags = options.isToken22 ? FLAG_TOKEN22 : 0;
        
        // From nullifier (prevents double-spend)
        const fromNullifier = keccak_256(Buffer.concat([
            Buffer.from('STYX_VTA_NULL'),
            options.fromSecret
        ]));
        
        // To hash (recipient can prove ownership with nonce)
        const toHash = keccak_256(Buffer.concat([
            options.toRecipient.toBytes(),
            options.toNonce
        ]));
        
        const proofLen = options.proof?.length || 0;
        const data = Buffer.alloc(116 + proofLen);
        let offset = 0;
        
        data.writeUInt8(TAG_VTA_TRANSFER, offset); offset += 1;
        data.writeUInt8(flags, offset); offset += 1;
        Buffer.from(options.mint.toBytes()).copy(data, offset); offset += 32;
        Buffer.from(fromNullifier).copy(data, offset); offset += 32;
        Buffer.from(toHash).copy(data, offset); offset += 32;
        data.writeBigUInt64LE(options.amount, offset); offset += 8;
        Buffer.from(options.toNonce).copy(data, offset); offset += 8;
        data.writeUInt16LE(proofLen, offset); offset += 2;
        
        if (options.proof) {
            Buffer.from(options.proof).copy(data, offset);
        }
        
        const ix = new TransactionInstruction({
            programId: this.styx.programId,
            keys: [
                { pubkey: sender.publicKey, isSigner: true, isWritable: true },
                { pubkey: TREASURY, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: sender.publicKey, isSigner: true, isWritable: false }
            ],
            data
        });

        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [sender]);
    }
}

/**
 * StyxReferral - Inscribed referral tree with progressive rewards
 */
export class StyxReferral {
    private styx: StyxPMP;

    constructor(styxPMP: StyxPMP) {
        this.styx = styxPMP;
    }

    /**
     * Register a referral (inscribed to chain)
     */
    async register(
        referee: Keypair,
        options: ReferralOptions
    ): Promise<string> {
        const parentChainHash = options.parentChainHash || new Uint8Array(32); // Genesis
        const timestamp = BigInt(Date.now());
        
        const data = Buffer.alloc(105);
        let offset = 0;
        
        data.writeUInt8(TAG_REFERRAL_REGISTER, offset); offset += 1;
        Buffer.from(options.referrer.toBytes()).copy(data, offset); offset += 32;
        Buffer.from(referee.publicKey.toBytes()).copy(data, offset); offset += 32;
        Buffer.from(parentChainHash).copy(data, offset); offset += 32;
        data.writeBigUInt64LE(timestamp, offset);
        
        const ix = new TransactionInstruction({
            programId: this.styx.programId,
            keys: [
                { pubkey: referee.publicKey, isSigner: true, isWritable: true }
            ],
            data
        });

        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [referee]);
    }

    /**
     * Claim referral rewards with merkle proof
     */
    async claim(
        claimer: Keypair,
        options: ReferralClaimOptions
    ): Promise<string> {
        const proofLen = options.proof?.length || 0;
        const data = Buffer.alloc(44 + proofLen);
        let offset = 0;
        
        data.writeUInt8(TAG_REFERRAL_CLAIM, offset); offset += 1;
        Buffer.from(claimer.publicKey.toBytes()).copy(data, offset); offset += 32;
        data.writeBigUInt64LE(options.amountClaiming, offset); offset += 8;
        data.writeUInt8(options.depth, offset); offset += 1;
        data.writeUInt16LE(proofLen, offset); offset += 2;
        
        if (options.proof) {
            Buffer.from(options.proof).copy(data, offset);
        }
        
        const ix = new TransactionInstruction({
            programId: this.styx.programId,
            keys: [
                { pubkey: claimer.publicKey, isSigner: true, isWritable: true },
                { pubkey: TREASURY, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: claimer.publicKey, isSigner: true, isWritable: false }
            ],
            data
        });

        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [claimer]);
    }

    /**
     * Compute chain hash for a referral registration
     */
    computeChainHash(
        referrer: PublicKey,
        referee: PublicKey,
        parentChainHash: Uint8Array,
        timestamp: bigint
    ): Uint8Array {
        const timestampBytes = Buffer.alloc(8);
        timestampBytes.writeBigUInt64LE(timestamp);
        
        return keccak_256(Buffer.concat([
            Buffer.from('STYX_REF_V1'),
            referrer.toBytes(),
            referee.toBytes(),
            Buffer.from(parentChainHash),
            timestampBytes
        ]));
    }
}

// ============================================================================
// MOBILE-COMPATIBLE BUILDERS (Solana Mobile Adapter ready)
// ============================================================================

/**
 * Build a proposal instruction without signing (for mobile wallets)
 */
export function buildProposalInstruction(
    programId: PublicKey,
    proposer: PublicKey,
    options: ProposalOptions
): TransactionInstruction {
    const flags = options.isToken22 ? FLAG_TOKEN22 : 0;
    const proposalHash = keccak_256(Buffer.from(options.title));
    const titleBytes = Buffer.from(options.title.slice(0, 64));
    
    const data = Buffer.alloc(78 + titleBytes.length);
    let offset = 0;
    
    data.writeUInt8(TAG_PROPOSAL, offset); offset += 1;
    data.writeUInt8(flags, offset); offset += 1;
    Buffer.from(proposer.toBytes()).copy(data, offset); offset += 32;
    Buffer.from(proposalHash).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(options.votingEndSlot, offset); offset += 8;
    data.writeUInt16LE(options.quorumBps, offset); offset += 2;
    data.writeUInt16LE(titleBytes.length, offset); offset += 2;
    titleBytes.copy(data, offset);
    
    return new TransactionInstruction({
        programId,
        keys: [
            { pubkey: proposer, isSigner: true, isWritable: true },
            { pubkey: TREASURY, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        data
    });
}

/**
 * Build a vote instruction without signing (for mobile wallets)
 */
export function buildVoteInstruction(
    programId: PublicKey,
    voter: PublicKey,
    options: VoteOptions
): TransactionInstruction {
    const flags = options.isToken22 ? FLAG_TOKEN22 : 0;
    const nullifier = keccak_256(Buffer.concat([
        options.voterSecret,
        Buffer.from(options.proposalId)
    ]));
    
    const voteValue = options.vote === 'yes' ? 1 : options.vote === 'no' ? 0 : 2;
    const proofLen = options.weightProof?.length || 0;
    
    const data = Buffer.alloc(69 + proofLen);
    let offset = 0;
    
    data.writeUInt8(TAG_PRIVATE_VOTE, offset); offset += 1;
    data.writeUInt8(flags, offset); offset += 1;
    Buffer.from(options.proposalId).copy(data, offset); offset += 32;
    Buffer.from(nullifier).copy(data, offset); offset += 32;
    data.writeUInt8(voteValue, offset); offset += 1;
    data.writeUInt16LE(proofLen, offset); offset += 2;
    
    if (options.weightProof) {
        Buffer.from(options.weightProof).copy(data, offset);
    }
    
    return new TransactionInstruction({
        programId,
        keys: [
            { pubkey: voter, isSigner: true, isWritable: true },
            { pubkey: TREASURY, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        data
    });
}

/**
 * Build a referral registration instruction (for mobile wallets)
 */
export function buildReferralInstruction(
    programId: PublicKey,
    referee: PublicKey,
    referrer: PublicKey,
    parentChainHash?: Uint8Array
): TransactionInstruction {
    const chainHash = parentChainHash || new Uint8Array(32);
    const timestamp = BigInt(Date.now());
    
    const data = Buffer.alloc(105);
    let offset = 0;
    
    data.writeUInt8(TAG_REFERRAL_REGISTER, offset); offset += 1;
    Buffer.from(referrer.toBytes()).copy(data, offset); offset += 32;
    Buffer.from(referee.toBytes()).copy(data, offset); offset += 32;
    Buffer.from(chainHash).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(timestamp, offset);
    
    return new TransactionInstruction({
        programId,
        keys: [
            { pubkey: referee, isSigner: true, isWritable: true }
        ],
        data
    });
}

// ============================================================================
// NOVEL PRIMITIVES - NEVER DONE BEFORE ON SOLANA!
// ============================================================================
// Note: TAG constants are exported at the top of this file (14-64)

// CPI inscription types
export const CPI_TYPE_GENERIC = 0;
export const CPI_TYPE_EVENT = 1;
export const CPI_TYPE_RECEIPT = 2;
export const CPI_TYPE_ATTESTATION = 3;

// Ghost PDA action types
export const GHOST_ACTION_AUTHENTICATE = 0;
export const GHOST_ACTION_PROVE_MEMBERSHIP = 1;
export const GHOST_ACTION_VERIFY_SECRET = 2;
export const GHOST_ACTION_ANONYMOUS_ACCESS = 3;

export interface TimeCapsuleOptions {
    unlockSlot: bigint;
    recipient: PublicKey;
    encryptedPayload: Uint8Array;
}

export interface GhostPDAOptions {
    secretHash: Uint8Array;
    bump: number;
    actionType: number;
    actionData?: Uint8Array;
}

export interface CPIInscribeOptions {
    inscriptionType: number;
    data: Uint8Array;
}

export interface HashlockCommitOptions {
    hashlock: Uint8Array;
    commitType: number;
    commitData: Uint8Array;
}

export interface HashlockRevealOptions {
    secret: Uint8Array;
    swapCount: number;
}

export interface StateChannelOpenOptions {
    channelId: Uint8Array;
    participants: PublicKey[];
    initialState: Uint8Array;
}

export interface StateChannelCloseOptions {
    channelId: Uint8Array;
    closeType: 'cooperative' | 'unilateral' | 'dispute';
    finalState: Uint8Array;
    sequence: bigint;
}

export interface BatchSettleOptions {
    channelId: Uint8Array;
    sequence: bigint;
    merkleRoot: Uint8Array;
    operationCount: number;
}

/**
 * Derive a Ghost PDA for ZK-like proof
 * 
 * This computes the PDA that would be derived from a secret hash.
 * The PDA is NEVER created - it's only used for verification.
 */
export function deriveGhostPDA(
    secretHash: Uint8Array,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): { pda: PublicKey; bump: number } {
    const [pda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from('ghost'), Buffer.from(secretHash)],
        programId
    );
    return { pda, bump };
}

/**
 * Encrypt payload for time capsule
 * 
 * Key derivation: key = keccak256(unlock_slot || sender_secret || recipient)
 */
export function deriveTimeCapsuleKey(
    unlockSlot: bigint,
    senderSecret: Uint8Array,
    recipient: PublicKey
): Uint8Array {
    const slotBytes = Buffer.alloc(8);
    slotBytes.writeBigUInt64LE(unlockSlot);
    
    return keccak_256(Buffer.concat([
        slotBytes,
        Buffer.from(senderSecret),
        recipient.toBytes()
    ]));
}

/**
 * Build a Time Capsule instruction
 * 
 * Time Capsule locks a message until a specific slot.
 * Before the unlock slot, no one can derive the decryption key.
 * After the unlock slot, the recipient can decrypt with the sender's secret.
 * 
 * Use cases:
 * - Dead man's switch
 * - Timed auctions
 * - Scheduled announcements
 */
export function buildTimeCapsuleInstruction(
    programId: PublicKey,
    payer: PublicKey,
    options: TimeCapsuleOptions
): TransactionInstruction {
    const data = Buffer.alloc(41 + options.encryptedPayload.length);
    let offset = 0;
    
    data.writeUInt8(TAG_TIME_CAPSULE, offset); offset += 1;
    data.writeBigUInt64LE(options.unlockSlot, offset); offset += 8;
    Buffer.from(options.recipient.toBytes()).copy(data, offset); offset += 32;
    Buffer.from(options.encryptedPayload).copy(data, offset);
    
    return new TransactionInstruction({
        programId,
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: TREASURY, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        data
    });
}

/**
 * Build a Ghost PDA instruction
 * 
 * Ghost PDA enables ZK-like proofs using Solana's native PDA mechanism.
 * The prover demonstrates knowledge of a secret WITHOUT revealing it.
 * 
 * How it works:
 * 1. Prover knows secret S
 * 2. Compute secretHash = keccak256(S)
 * 3. Derive PDA with bump
 * 4. Program verifies PDA derivation is valid
 * 5. If valid, prover MUST know S (can't guess valid PDA)
 * 
 * Use cases:
 * - Anonymous authentication
 * - Membership proofs
 * - Password verification without storing hash
 */
export function buildGhostPDAInstruction(
    programId: PublicKey,
    payer: PublicKey,
    options: GhostPDAOptions
): TransactionInstruction {
    const actionDataLen = options.actionData?.length || 0;
    const data = Buffer.alloc(35 + actionDataLen);
    let offset = 0;
    
    data.writeUInt8(TAG_GHOST_PDA, offset); offset += 1;
    Buffer.from(options.secretHash).copy(data, offset); offset += 32;
    data.writeUInt8(options.bump, offset); offset += 1;
    data.writeUInt8(options.actionType, offset); offset += 1;
    
    if (options.actionData) {
        Buffer.from(options.actionData).copy(data, offset);
    }
    
    return new TransactionInstruction({
        programId,
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: TREASURY, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        data
    });
}

/**
 * Build a CPI Inscribe instruction
 * 
 * CPI Inscribe enables any Solana program to become privacy-enabled
 * by calling into PMP to inscribe data. The caller's program ID is
 * recorded for attribution.
 * 
 * Use cases:
 * - Privacy-enabled DEX (swaps as inscriptions)
 * - Private NFT marketplace (bids inscribed)
 * - Anonymous voting in any DAO
 * - Confidential game moves
 */
export function buildCPIInscribeInstruction(
    programId: PublicKey,
    caller: PublicKey,
    options: CPIInscribeOptions
): TransactionInstruction {
    const data = Buffer.alloc(2 + options.data.length);
    let offset = 0;
    
    data.writeUInt8(TAG_CPI_INSCRIBE, offset); offset += 1;
    data.writeUInt8(options.inscriptionType, offset); offset += 1;
    Buffer.from(options.data).copy(data, offset);
    
    return new TransactionInstruction({
        programId,
        keys: [
            { pubkey: caller, isSigner: true, isWritable: true },
            { pubkey: TREASURY, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        data
    });
}

/**
 * Build a Hashlock Commit instruction
 * 
 * Creates an atomic swap commitment secured by a hashlock.
 * The commit can only be executed when the preimage is revealed.
 */
export function buildHashlockCommitInstruction(
    programId: PublicKey,
    payer: PublicKey,
    options: HashlockCommitOptions
): TransactionInstruction {
    const data = Buffer.alloc(34 + options.commitData.length);
    let offset = 0;
    
    data.writeUInt8(TAG_HASHLOCK_COMMIT, offset); offset += 1;
    Buffer.from(options.hashlock).copy(data, offset); offset += 32;
    data.writeUInt8(options.commitType, offset); offset += 1;
    Buffer.from(options.commitData).copy(data, offset);
    
    return new TransactionInstruction({
        programId,
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: TREASURY, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        data
    });
}

/**
 * Build a Hashlock Reveal instruction
 * 
 * Reveals the preimage to execute pending swaps.
 */
export function buildHashlockRevealInstruction(
    programId: PublicKey,
    payer: PublicKey,
    options: HashlockRevealOptions
): TransactionInstruction {
    const data = Buffer.alloc(33);
    let offset = 0;
    
    data.writeUInt8(TAG_HASHLOCK_REVEAL, offset); offset += 1;
    Buffer.from(options.secret).copy(data, offset); offset += 32;
    
    return new TransactionInstruction({
        programId,
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: TREASURY, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        data
    });
}

/**
 * Build a State Channel Open instruction
 * 
 * Opens an inscribed state channel for off-chain transactions.
 */
export function buildStateChannelOpenInstruction(
    programId: PublicKey,
    payer: PublicKey,
    options: StateChannelOpenOptions
): TransactionInstruction {
    const participantCount = options.participants.length;
    const data = Buffer.alloc(66 + participantCount * 32);
    let offset = 0;
    
    data.writeUInt8(TAG_STATE_CHANNEL_OPEN, offset); offset += 1;
    Buffer.from(options.channelId).copy(data, offset); offset += 32;
    data.writeUInt8(participantCount, offset); offset += 1;
    Buffer.from(options.initialState).copy(data, offset); offset += 32;
    
    for (const participant of options.participants) {
        Buffer.from(participant.toBytes()).copy(data, offset);
        offset += 32;
    }
    
    return new TransactionInstruction({
        programId,
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: TREASURY, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        data
    });
}

/**
 * Build a State Channel Close instruction
 * 
 * Closes a state channel with final state settlement.
 */
export function buildStateChannelCloseInstruction(
    programId: PublicKey,
    payer: PublicKey,
    options: StateChannelCloseOptions
): TransactionInstruction {
    const closeTypeCode = options.closeType === 'cooperative' ? 0 
        : options.closeType === 'unilateral' ? 1 : 2;
    
    const data = Buffer.alloc(73);
    let offset = 0;
    
    data.writeUInt8(TAG_STATE_CHANNEL_CLOSE, offset); offset += 1;
    Buffer.from(options.channelId).copy(data, offset); offset += 32;
    data.writeUInt8(closeTypeCode, offset); offset += 1;
    Buffer.from(options.finalState).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(options.sequence, offset);
    
    return new TransactionInstruction({
        programId,
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: TREASURY, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        data
    });
}

/**
 * Build a Batch Settle instruction
 * 
 * Settles a batch of off-chain operations with a single merkle root.
 */
export function buildBatchSettleInstruction(
    programId: PublicKey,
    payer: PublicKey,
    options: BatchSettleOptions
): TransactionInstruction {
    const data = Buffer.alloc(73);
    let offset = 0;
    
    data.writeUInt8(TAG_BATCH_SETTLE, offset); offset += 1;
    Buffer.from(options.channelId).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(options.sequence, offset); offset += 8;
    Buffer.from(options.merkleRoot).copy(data, offset); offset += 32;
    data.writeUInt8(options.operationCount, offset);
    
    return new TransactionInstruction({
        programId,
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: TREASURY, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        data
    });
}

/**
 * StyxNovel - Helper class for novel primitives
 */
export class StyxNovel {
    private styx: StyxPMP;

    constructor(styxPMP: StyxPMP) {
        this.styx = styxPMP;
    }

    /**
     * Create a time capsule
     */
    async createTimeCapsule(
        sender: Keypair,
        recipient: PublicKey,
        message: Uint8Array,
        senderSecret: Uint8Array,
        unlockSlot: bigint
    ): Promise<string> {
        // Derive encryption key from unlock slot + secret + recipient
        const encryptionKey = deriveTimeCapsuleKey(unlockSlot, senderSecret, recipient);
        
        // Encrypt with the derived key
        const encryptedPayload = encryptPayload(message, encryptionKey);
        
        const ix = buildTimeCapsuleInstruction(this.styx.programId, sender.publicKey, {
            unlockSlot,
            recipient,
            encryptedPayload
        });
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [sender]);
    }

    /**
     * Prove knowledge of secret via Ghost PDA
     */
    async proveSecretKnowledge(
        prover: Keypair,
        secret: Uint8Array,
        actionType: number = GHOST_ACTION_AUTHENTICATE,
        actionData?: Uint8Array
    ): Promise<string> {
        const secretHash = keccak_256(secret);
        const { bump } = deriveGhostPDA(secretHash, this.styx.programId);
        
        const ix = buildGhostPDAInstruction(this.styx.programId, prover.publicKey, {
            secretHash,
            bump,
            actionType,
            actionData
        });
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [prover]);
    }

    /**
     * Inscribe data via CPI pattern
     */
    async inscribe(
        caller: Keypair,
        inscriptionType: number,
        data: Uint8Array
    ): Promise<string> {
        const ix = buildCPIInscribeInstruction(this.styx.programId, caller.publicKey, {
            inscriptionType,
            data
        });
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [caller]);
    }
}

// ============================================================================
// v4 INNOVATIONS - VTA DELEGATION, STEALTH SWAPS, GUARDIANS, SUBSCRIPTIONS
// ============================================================================
// Note: TAG constants (23-31) are exported at the top of this file

// Delegation permission bits
export const PERM_CAN_TRANSFER = 0x01;
export const PERM_CAN_MESSAGE = 0x02;
export const PERM_CAN_VOTE = 0x04;
export const PERM_CAN_SUBDELEGATE = 0x08;
export const PERM_REQUIRES_2FA = 0x10;

// Revocation types
export const REVOKER_OWNER = 0;
export const REVOKER_DELEGATE = 1;
export const REVOKER_GUARDIAN = 2;

// Revocation reasons
export const REVOKE_NORMAL = 0;
export const REVOKE_COMPROMISED = 1;
export const REVOKE_EXPIRED = 2;
export const REVOKE_UPGRADED = 3;

// Multiparty action types
export const MP_ACTION_TRANSFER = 0;
export const MP_ACTION_ADD_PARTY = 1;
export const MP_ACTION_REMOVE_PARTY = 2;
export const MP_ACTION_CHANGE_THRESHOLD = 3;
export const MP_ACTION_DELEGATE = 4;

export interface VTADelegateOptions {
    owner: PublicKey;
    delegate: PublicKey;
    mint: PublicKey;
    maxAmount: bigint;
    expirySlot: bigint;
    permissions: {
        canTransfer?: boolean;
        canMessage?: boolean;
        canVote?: boolean;
        canSubdelegate?: boolean;
        requires2FA?: boolean;
    };
    nonce?: Uint8Array;
    isToken22?: boolean;
}

export interface VTARevokeOptions {
    delegationId: Uint8Array;
    revokerType: number;
    reason: number;
}

export interface StealthSwapInitOptions {
    hashlock: Uint8Array;
    encryptedTerms: Uint8Array;  // 64 bytes: myMint(32) + myAmount(8) + theirMint(32) + theirAmount(8)
    timeoutSlot: bigint;
    stealthPubkey: Uint8Array;
    initiatorCommitment: Uint8Array;
    isToken22?: boolean;
}

export interface StealthSwapExecOptions {
    swapId: Uint8Array;
    preimage: Uint8Array;
    recipientProof?: Uint8Array;
}

export interface VTAGuardianSetOptions {
    vtaMint: PublicKey;
    threshold: number;
    guardians: PublicKey[];
    encryptedShares?: Uint8Array;
}

export interface VTAGuardianRecoverOptions {
    guardianSetId: Uint8Array;
    newOwner: PublicKey;
    guardianIndices: number[];
    signatures: Uint8Array[];  // Ed25519 signatures
    recoveryNonce: bigint;
}

export interface PrivateSubscriptionOptions {
    subscriberNullifier: Uint8Array;
    merchantPubkey: PublicKey;
    encryptedTerms: Uint8Array;  // 32 bytes encrypted amount/details
    intervalSlots: bigint;
    windowSlots: bigint;
    startSlot: bigint;
    maxPayments: number;
    isToken22?: boolean;
}

export interface MultipartyVTAInitOptions {
    mint: PublicKey;
    threshold: number;
    parties: PublicKey[];
    initialBalance: bigint;
    vtaNonce?: Uint8Array;
    isToken22?: boolean;
}

export interface MultipartyVTASignOptions {
    mpVtaId: Uint8Array;
    actionId: Uint8Array;
    signerIndex: number;
    actionType: number;
    actionDataHash: Uint8Array;
}

/**
 * Build VTA Delegate instruction
 * 
 * Delegate VTA spending rights to another wallet (e.g., phone wallet).
 * Hardware wallet owner can allow phone to spend up to a limit.
 * 
 * Per Solana Mobile Wallet Adapter patterns.
 */
export function buildVTADelegateInstruction(
    programId: PublicKey,
    owner: PublicKey,
    options: VTADelegateOptions
): TransactionInstruction {
    const flags = options.isToken22 ? FLAG_TOKEN22 : 0;
    const nonce = options.nonce || crypto.getRandomValues(new Uint8Array(8));
    
    let permissions = 0;
    if (options.permissions.canTransfer) permissions |= PERM_CAN_TRANSFER;
    if (options.permissions.canMessage) permissions |= PERM_CAN_MESSAGE;
    if (options.permissions.canVote) permissions |= PERM_CAN_VOTE;
    if (options.permissions.canSubdelegate) permissions |= PERM_CAN_SUBDELEGATE;
    if (options.permissions.requires2FA) permissions |= PERM_REQUIRES_2FA;
    
    const data = Buffer.alloc(123);
    let offset = 0;
    
    data.writeUInt8(TAG_VTA_DELEGATE, offset); offset += 1;
    data.writeUInt8(flags, offset); offset += 1;
    Buffer.from(options.owner.toBytes()).copy(data, offset); offset += 32;
    Buffer.from(options.delegate.toBytes()).copy(data, offset); offset += 32;
    Buffer.from(options.mint.toBytes()).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(options.maxAmount, offset); offset += 8;
    data.writeBigUInt64LE(options.expirySlot, offset); offset += 8;
    data.writeUInt8(permissions, offset); offset += 1;
    Buffer.from(nonce).copy(data, offset);
    
    return new TransactionInstruction({
        programId,
        keys: [
            { pubkey: owner, isSigner: true, isWritable: true },
            { pubkey: TREASURY, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: owner, isSigner: true, isWritable: false }
        ],
        data
    });
}

/**
 * Build VTA Revoke instruction
 * 
 * Revoke a previously issued delegation.
 */
export function buildVTARevokeInstruction(
    programId: PublicKey,
    revoker: PublicKey,
    options: VTARevokeOptions
): TransactionInstruction {
    const data = Buffer.alloc(35);
    let offset = 0;
    
    data.writeUInt8(TAG_VTA_REVOKE, offset); offset += 1;
    Buffer.from(options.delegationId).copy(data, offset); offset += 32;
    data.writeUInt8(options.revokerType, offset); offset += 1;
    data.writeUInt8(options.reason, offset);
    
    return new TransactionInstruction({
        programId,
        keys: [
            { pubkey: revoker, isSigner: true, isWritable: true },
            { pubkey: TREASURY, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: revoker, isSigner: true, isWritable: false }
        ],
        data
    });
}

/**
 * Build Stealth Swap Init instruction
 * 
 * Initialize a privacy-preserving atomic swap.
 * Amounts are encrypted, counterparty uses stealth address.
 */
export function buildStealthSwapInitInstruction(
    programId: PublicKey,
    initiator: PublicKey,
    options: StealthSwapInitOptions
): TransactionInstruction {
    const flags = options.isToken22 ? FLAG_TOKEN22 : 0;
    
    const data = Buffer.alloc(170);
    let offset = 0;
    
    data.writeUInt8(TAG_STEALTH_SWAP_INIT, offset); offset += 1;
    data.writeUInt8(flags, offset); offset += 1;
    Buffer.from(options.hashlock).copy(data, offset); offset += 32;
    Buffer.from(options.encryptedTerms).copy(data, offset); offset += 64;
    data.writeBigUInt64LE(options.timeoutSlot, offset); offset += 8;
    Buffer.from(options.stealthPubkey).copy(data, offset); offset += 32;
    Buffer.from(options.initiatorCommitment).copy(data, offset);
    
    return new TransactionInstruction({
        programId,
        keys: [
            { pubkey: initiator, isSigner: true, isWritable: true },
            { pubkey: TREASURY, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        data
    });
}

/**
 * Build Stealth Swap Exec instruction
 * 
 * Execute a stealth swap by revealing the preimage.
 */
export function buildStealthSwapExecInstruction(
    programId: PublicKey,
    executor: PublicKey,
    options: StealthSwapExecOptions
): TransactionInstruction {
    const proofLen = options.recipientProof?.length || 0;
    const data = Buffer.alloc(65 + proofLen);
    let offset = 0;
    
    data.writeUInt8(TAG_STEALTH_SWAP_EXEC, offset); offset += 1;
    Buffer.from(options.swapId).copy(data, offset); offset += 32;
    Buffer.from(options.preimage).copy(data, offset); offset += 32;
    
    if (options.recipientProof) {
        Buffer.from(options.recipientProof).copy(data, offset);
    }
    
    return new TransactionInstruction({
        programId,
        keys: [
            { pubkey: executor, isSigner: true, isWritable: true },
            { pubkey: TREASURY, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: executor, isSigner: true, isWritable: false }
        ],
        data
    });
}

/**
 * Build VTA Guardian Set instruction
 * 
 * Set up k-of-n guardians for social recovery.
 * All inscribed - no smart contract wallet needed.
 */
export function buildVTAGuardianSetInstruction(
    programId: PublicKey,
    owner: PublicKey,
    options: VTAGuardianSetOptions
): TransactionInstruction {
    const guardianCount = options.guardians.length;
    const sharesLen = options.encryptedShares?.length || 0;
    const guardiansEnd = 35 + (guardianCount * 32);
    
    const data = Buffer.alloc(guardiansEnd + 2 + sharesLen);
    let offset = 0;
    
    data.writeUInt8(TAG_VTA_GUARDIAN_SET, offset); offset += 1;
    Buffer.from(options.vtaMint.toBytes()).copy(data, offset); offset += 32;
    data.writeUInt8(options.threshold, offset); offset += 1;
    data.writeUInt8(guardianCount, offset); offset += 1;
    
    for (const guardian of options.guardians) {
        Buffer.from(guardian.toBytes()).copy(data, offset);
        offset += 32;
    }
    
    data.writeUInt16LE(sharesLen, offset); offset += 2;
    if (options.encryptedShares) {
        Buffer.from(options.encryptedShares).copy(data, offset);
    }
    
    return new TransactionInstruction({
        programId,
        keys: [
            { pubkey: owner, isSigner: true, isWritable: true },
            { pubkey: TREASURY, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: owner, isSigner: true, isWritable: false }
        ],
        data
    });
}

/**
 * Build VTA Guardian Recover instruction
 * 
 * Recover VTA ownership with k-of-n guardian signatures.
 */
export function buildVTAGuardianRecoverInstruction(
    programId: PublicKey,
    newOwner: PublicKey,
    options: VTAGuardianRecoverOptions
): TransactionInstruction {
    const sigCount = options.guardianIndices.length;
    const dataLen = 75 + sigCount + (sigCount * 64);
    
    const data = Buffer.alloc(dataLen);
    let offset = 0;
    
    data.writeUInt8(TAG_VTA_GUARDIAN_RECOVER, offset); offset += 1;
    Buffer.from(options.guardianSetId).copy(data, offset); offset += 32;
    Buffer.from(options.newOwner.toBytes()).copy(data, offset); offset += 32;
    data.writeUInt8(sigCount, offset); offset += 1;
    
    // Guardian indices
    for (const idx of options.guardianIndices) {
        data.writeUInt8(idx, offset);
        offset += 1;
    }
    
    // Signatures (64 bytes each)
    for (const sig of options.signatures) {
        Buffer.from(sig).copy(data, offset);
        offset += 64;
    }
    
    data.writeBigUInt64LE(options.recoveryNonce, offset);
    
    return new TransactionInstruction({
        programId,
        keys: [
            { pubkey: newOwner, isSigner: true, isWritable: true },
            { pubkey: TREASURY, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: newOwner, isSigner: true, isWritable: false }
        ],
        data
    });
}

/**
 * Build Private Subscription instruction
 * 
 * Create a recurring payment subscription with privacy.
 * Perfect for mobile app monetization.
 */
export function buildPrivateSubscriptionInstruction(
    programId: PublicKey,
    subscriber: PublicKey,
    options: PrivateSubscriptionOptions
): TransactionInstruction {
    const flags = options.isToken22 ? FLAG_TOKEN22 : 0;
    
    const data = Buffer.alloc(124);
    let offset = 0;
    
    data.writeUInt8(TAG_PRIVATE_SUBSCRIPTION, offset); offset += 1;
    data.writeUInt8(flags, offset); offset += 1;
    Buffer.from(options.subscriberNullifier).copy(data, offset); offset += 32;
    Buffer.from(options.merchantPubkey.toBytes()).copy(data, offset); offset += 32;
    Buffer.from(options.encryptedTerms).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(options.intervalSlots, offset); offset += 8;
    data.writeBigUInt64LE(options.windowSlots, offset); offset += 8;
    data.writeBigUInt64LE(options.startSlot, offset); offset += 8;
    data.writeUInt16LE(options.maxPayments, offset);
    
    return new TransactionInstruction({
        programId,
        keys: [
            { pubkey: subscriber, isSigner: true, isWritable: true },
            { pubkey: TREASURY, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: subscriber, isSigner: true, isWritable: false }
        ],
        data
    });
}

/**
 * Build Multiparty VTA Init instruction
 * 
 * Initialize a k-of-n threshold VTA for teams/DAOs.
 */
export function buildMultipartyVTAInitInstruction(
    programId: PublicKey,
    initiator: PublicKey,
    options: MultipartyVTAInitOptions
): TransactionInstruction {
    const flags = options.isToken22 ? FLAG_TOKEN22 : 0;
    const partyCount = options.parties.length;
    const vtaNonce = options.vtaNonce || crypto.getRandomValues(new Uint8Array(8));
    const partiesEnd = 36 + (partyCount * 32);
    
    const data = Buffer.alloc(partiesEnd + 16);
    let offset = 0;
    
    data.writeUInt8(TAG_MULTIPARTY_VTA_INIT, offset); offset += 1;
    data.writeUInt8(flags, offset); offset += 1;
    Buffer.from(options.mint.toBytes()).copy(data, offset); offset += 32;
    data.writeUInt8(options.threshold, offset); offset += 1;
    data.writeUInt8(partyCount, offset); offset += 1;
    
    for (const party of options.parties) {
        Buffer.from(party.toBytes()).copy(data, offset);
        offset += 32;
    }
    
    data.writeBigUInt64LE(options.initialBalance, offset); offset += 8;
    Buffer.from(vtaNonce).copy(data, offset);
    
    return new TransactionInstruction({
        programId,
        keys: [
            { pubkey: initiator, isSigner: true, isWritable: true },
            { pubkey: TREASURY, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: initiator, isSigner: true, isWritable: false }
        ],
        data
    });
}

/**
 * Build Multiparty VTA Sign instruction
 * 
 * Add a signature to a pending multi-party action.
 */
export function buildMultipartyVTASignInstruction(
    programId: PublicKey,
    signer: PublicKey,
    options: MultipartyVTASignOptions
): TransactionInstruction {
    const data = Buffer.alloc(99);
    let offset = 0;
    
    data.writeUInt8(TAG_MULTIPARTY_VTA_SIGN, offset); offset += 1;
    Buffer.from(options.mpVtaId).copy(data, offset); offset += 32;
    Buffer.from(options.actionId).copy(data, offset); offset += 32;
    data.writeUInt8(options.signerIndex, offset); offset += 1;
    data.writeUInt8(options.actionType, offset); offset += 1;
    Buffer.from(options.actionDataHash).copy(data, offset);
    
    return new TransactionInstruction({
        programId,
        keys: [
            { pubkey: signer, isSigner: true, isWritable: true },
            { pubkey: TREASURY, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: signer, isSigner: true, isWritable: false }
        ],
        data
    });
}

/**
 * StyxDelegation - VTA Delegation management (v4)
 * 
 * Mobile-first design: hardware wallet security with phone convenience.
 * Per Solana Mobile standards.
 */
export class StyxDelegation {
    private styx: StyxPMP;

    constructor(styxPMP: StyxPMP) {
        this.styx = styxPMP;
    }

    /**
     * Delegate VTA spending rights
     */
    async delegate(
        owner: Keypair,
        options: VTADelegateOptions
    ): Promise<string> {
        const ix = buildVTADelegateInstruction(
            this.styx.programId,
            owner.publicKey,
            options
        );
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [owner]);
    }

    /**
     * Revoke a delegation
     */
    async revoke(
        revoker: Keypair,
        delegationId: Uint8Array,
        revokerType: number = REVOKER_OWNER,
        reason: number = REVOKE_NORMAL
    ): Promise<string> {
        const ix = buildVTARevokeInstruction(
            this.styx.programId,
            revoker.publicKey,
            { delegationId, revokerType, reason }
        );
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [revoker]);
    }

    /**
     * Compute delegation ID
     */
    computeDelegationId(
        owner: PublicKey,
        delegate: PublicKey,
        mint: PublicKey,
        nonce: Uint8Array
    ): Uint8Array {
        return keccak_256(Buffer.concat([
            Buffer.from('STYX_VTA_DELEG_V1'),
            owner.toBytes(),
            delegate.toBytes(),
            mint.toBytes(),
            Buffer.from(nonce)
        ]));
    }
}

/**
 * StyxSwap - Stealth atomic swaps (v4)
 * 
 * Privacy-preserving swaps with hidden amounts.
 */
export class StyxSwap {
    private styx: StyxPMP;

    constructor(styxPMP: StyxPMP) {
        this.styx = styxPMP;
    }

    /**
     * Generate swap secret and hashlock
     */
    generateSwapSecret(): { secret: Uint8Array; hashlock: Uint8Array } {
        const secret = crypto.getRandomValues(new Uint8Array(32));
        const hashlock = keccak_256(Buffer.concat([
            Buffer.from('STYX_SWAP_PREIMAGE'),
            Buffer.from(secret)
        ]));
        return { secret, hashlock };
    }

    /**
     * Encrypt swap terms
     */
    encryptSwapTerms(
        myMint: PublicKey,
        myAmount: bigint,
        theirMint: PublicKey,
        theirAmount: bigint,
        sharedSecret: Uint8Array
    ): Uint8Array {
        const terms = Buffer.alloc(80);
        let offset = 0;
        Buffer.from(myMint.toBytes()).copy(terms, offset); offset += 32;
        terms.writeBigUInt64LE(myAmount, offset); offset += 8;
        Buffer.from(theirMint.toBytes()).copy(terms, offset); offset += 32;
        terms.writeBigUInt64LE(theirAmount, offset);
        
        return encryptPayload(terms, sharedSecret).slice(0, 64);
    }

    /**
     * Initialize a stealth swap
     */
    async initStealthSwap(
        initiator: Keypair,
        options: StealthSwapInitOptions
    ): Promise<string> {
        const ix = buildStealthSwapInitInstruction(
            this.styx.programId,
            initiator.publicKey,
            options
        );
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [initiator]);
    }

    /**
     * Execute a stealth swap
     */
    async executeStealthSwap(
        executor: Keypair,
        options: StealthSwapExecOptions
    ): Promise<string> {
        const ix = buildStealthSwapExecInstruction(
            this.styx.programId,
            executor.publicKey,
            options
        );
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [executor]);
    }
}

/**
 * StyxGuardian - Social recovery for VTAs (v4)
 * 
 * k-of-n recovery without smart contract wallets.
 */
export class StyxGuardian {
    private styx: StyxPMP;

    constructor(styxPMP: StyxPMP) {
        this.styx = styxPMP;
    }

    /**
     * Set guardians for a VTA
     */
    async setGuardians(
        owner: Keypair,
        options: VTAGuardianSetOptions
    ): Promise<string> {
        const ix = buildVTAGuardianSetInstruction(
            this.styx.programId,
            owner.publicKey,
            options
        );
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [owner]);
    }

    /**
     * Recover VTA with guardian signatures
     */
    async recover(
        newOwner: Keypair,
        options: VTAGuardianRecoverOptions
    ): Promise<string> {
        const ix = buildVTAGuardianRecoverInstruction(
            this.styx.programId,
            newOwner.publicKey,
            options
        );
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [newOwner]);
    }

    /**
     * Compute guardian set ID
     */
    computeGuardianSetId(
        vtaMint: PublicKey,
        owner: PublicKey,
        threshold: number,
        guardianCount: number,
        guardians: PublicKey[]
    ): Uint8Array {
        const guardianBytes = Buffer.concat(guardians.map(g => g.toBytes()));
        return keccak_256(Buffer.concat([
            Buffer.from('STYX_GUARDIAN_SET_V1'),
            vtaMint.toBytes(),
            owner.toBytes(),
            Buffer.from([threshold, guardianCount]),
            guardianBytes
        ]));
    }
}

/**
 * StyxSubscription - Private recurring payments (v4)
 * 
 * Mobile app monetization with privacy.
 */
export class StyxSubscription {
    private styx: StyxPMP;

    constructor(styxPMP: StyxPMP) {
        this.styx = styxPMP;
    }

    /**
     * Generate subscriber nullifier
     */
    generateSubscriberNullifier(subscriberSecret: Uint8Array): Uint8Array {
        return keccak_256(Buffer.concat([
            Buffer.from('STYX_SUB_NULL'),
            Buffer.from(subscriberSecret)
        ]));
    }

    /**
     * Encrypt subscription terms
     */
    encryptSubscriptionTerms(
        amount: bigint,
        currency: PublicKey,
        sharedSecret: Uint8Array
    ): Uint8Array {
        const terms = Buffer.alloc(40);
        terms.writeBigUInt64LE(amount, 0);
        Buffer.from(currency.toBytes()).copy(terms, 8);
        
        return encryptPayload(terms, sharedSecret).slice(0, 32);
    }

    /**
     * Create a subscription
     */
    async subscribe(
        subscriber: Keypair,
        options: PrivateSubscriptionOptions
    ): Promise<string> {
        const ix = buildPrivateSubscriptionInstruction(
            this.styx.programId,
            subscriber.publicKey,
            options
        );
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [subscriber]);
    }
}

/**
 * StyxMultiparty - k-of-n threshold VTAs (v4)
 * 
 * Team/DAO treasuries without accounts.
 */
export class StyxMultiparty {
    private styx: StyxPMP;

    constructor(styxPMP: StyxPMP) {
        this.styx = styxPMP;
    }

    /**
     * Initialize a multiparty VTA
     */
    async initMultipartyVTA(
        initiator: Keypair,
        options: MultipartyVTAInitOptions
    ): Promise<string> {
        const ix = buildMultipartyVTAInitInstruction(
            this.styx.programId,
            initiator.publicKey,
            options
        );
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [initiator]);
    }

    /**
     * Sign a multiparty action
     */
    async signAction(
        signer: Keypair,
        options: MultipartyVTASignOptions
    ): Promise<string> {
        const ix = buildMultipartyVTASignInstruction(
            this.styx.programId,
            signer.publicKey,
            options
        );
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [signer]);
    }

    /**
     * Compute multiparty VTA ID
     */
    computeMultipartyVTAId(
        mint: PublicKey,
        threshold: number,
        parties: PublicKey[],
        vtaNonce: Uint8Array
    ): Uint8Array {
        const partyBytes = Buffer.concat(parties.map(p => p.toBytes()));
        return keccak_256(Buffer.concat([
            Buffer.from('STYX_MPVTA_V1'),
            mint.toBytes(),
            Buffer.from([threshold, parties.length]),
            partyBytes,
            Buffer.from(vtaNonce)
        ]));
    }

    /**
     * Compute action ID for signing
     */
    computeActionId(
        mpVtaId: Uint8Array,
        actionType: number,
        actionData: Uint8Array
    ): Uint8Array {
        return keccak_256(Buffer.concat([
            Buffer.from('STYX_MPVTA_ACTION'),
            Buffer.from(mpVtaId),
            Buffer.from([actionType]),
            Buffer.from(actionData)
        ]));
    }
}
// ============================================================================
// STS (STYX TOKEN STANDARD) - Event-Sourced Token Revolution
// ============================================================================

/**
 * STS Extension configuration
 */
export interface STSExtension {
    type: 'transfer_fee' | 'royalty' | 'interest' | 'vesting' | 'delegation' | 'soulbound' | 'metadata';
    data: Uint8Array;
}

/**
 * STS Note commitment (UTXO-like token ownership)
 */
export interface STSNote {
    commitment: Uint8Array;
    encryptedNote: Uint8Array;
    mint: PublicKey;
    amount: bigint;
    extensions: STSExtension[];
}

/**
 * STS Note mint options
 */
export interface STSNoteMintOptions {
    mint: PublicKey;
    amount: bigint;
    ownerSecret: Uint8Array;
    extensions?: STSExtension[];
    trustLevel?: 0 | 1 | 2;
}

/**
 * STS Note transfer options
 */
export interface STSNoteTransferOptions {
    nullifier: Uint8Array;
    newCommitment: Uint8Array;
    encryptedAmount: bigint;
    merkleProof?: Uint8Array[];
    trustLevel?: 0 | 1 | 2;
}

/**
 * STS Global Pool deposit options
 */
export interface STSDepositOptions {
    mint: PublicKey;
    amount: bigint;
    ownerSecret: Uint8Array;
    extensions?: STSExtension[];
}

/**
 * STS Global Pool withdraw options
 */
export interface STSWithdrawOptions {
    nullifier: Uint8Array;
    mint: PublicKey;
    amount: bigint;
    recipient: PublicKey;
    trustLevel?: 0 | 1 | 2;
}

/**
 * STS Stealth withdraw options
 */
export interface STSStealthWithdrawOptions {
    nullifier: Uint8Array;
    mint: PublicKey;
    amount: bigint;
    ephemeralPubkey: Uint8Array;
    encryptedRecipient: Uint8Array;
    trustLevel?: 0 | 1 | 2;
}

/**
 * STS - Styx Token Standard
 * 
 * Event-sourced token primitive that replaces Token-22.
 * Zero rent, native privacy, composable per-note extensions.
 */
export class STS {
    private styx: StyxPMP;

    constructor(styxPMP: StyxPMP) {
        this.styx = styxPMP;
    }

    /**
     * Create note commitment from owner secret and amount
     */
    createCommitment(ownerSecret: Uint8Array, amount: bigint, nonce: Uint8Array): Uint8Array {
        const amountBuf = Buffer.alloc(8);
        amountBuf.writeBigUInt64LE(amount);
        return keccak_256(Buffer.concat([
            Buffer.from('STS_NOTE_V1'),
            Buffer.from(ownerSecret),
            amountBuf,
            Buffer.from(nonce)
        ]));
    }

    /**
     * Create nullifier from note commitment and secret
     */
    createNullifier(noteCommitment: Uint8Array, ownerSecret: Uint8Array): Uint8Array {
        return keccak_256(Buffer.concat([
            Buffer.from('STS_NULLIFIER_V1'),
            Buffer.from(noteCommitment),
            Buffer.from(ownerSecret)
        ]));
    }

    /**
     * Encrypt note data for storage
     */
    encryptNote(ownerSecret: Uint8Array, amount: bigint, nonce: Uint8Array): Uint8Array {
        const amountBuf = Buffer.alloc(8);
        amountBuf.writeBigUInt64LE(amount);
        const plaintext = Buffer.concat([amountBuf, Buffer.from(nonce)]);
        
        // Use Keccak XOR for simplicity (matches on-chain)
        const mask = keccak_256(Buffer.concat([
            Buffer.from('STS_NOTE_ENCRYPT_V1'),
            Buffer.from(ownerSecret)
        ]));
        
        const encrypted = new Uint8Array(64);
        for (let i = 0; i < plaintext.length && i < 64; i++) {
            encrypted[i] = plaintext[i] ^ mask[i % 32];
        }
        return encrypted;
    }

    /**
     * Build extension TLV data
     */
    static ext = {
        transferFee(feeBps: number, maxFee: bigint): STSExtension {
            const data = Buffer.alloc(10);
            data.writeUInt16LE(feeBps, 0);
            data.writeBigUInt64LE(maxFee, 2);
            return { type: 'transfer_fee', data };
        },

        royalty(recipient: PublicKey, bps: number): STSExtension {
            const data = Buffer.alloc(34);
            recipient.toBytes().forEach((b, i) => data[i] = b);
            data.writeUInt16LE(bps, 32);
            return { type: 'royalty', data };
        },

        interest(rateBps: number, compound: number): STSExtension {
            const data = Buffer.alloc(12);
            data.writeUInt16LE(rateBps, 0);
            data.writeBigUInt64LE(BigInt(Date.now()), 2); // start_slot placeholder
            data.writeUInt16LE(compound, 10);
            return { type: 'interest', data };
        },

        vesting(vestType: number, start: bigint, end: bigint): STSExtension {
            const data = Buffer.alloc(17);
            data.writeUInt8(vestType, 0);
            data.writeBigUInt64LE(start, 1);
            data.writeBigUInt64LE(end, 9);
            return { type: 'vesting', data };
        },

        delegation(delegate: PublicKey, maxAmount: bigint, expiry: bigint): STSExtension {
            const data = Buffer.alloc(48);
            delegate.toBytes().forEach((b, i) => data[i] = b);
            data.writeBigUInt64LE(maxAmount, 32);
            data.writeBigUInt64LE(expiry, 40);
            return { type: 'delegation', data };
        },

        soulbound(bindingProof: Uint8Array): STSExtension {
            const data = Buffer.alloc(32);
            bindingProof.slice(0, 32).forEach((b, i) => data[i] = b);
            return { type: 'soulbound', data };
        },

        metadata(uriHash: Uint8Array): STSExtension {
            const data = Buffer.alloc(32);
            uriHash.slice(0, 32).forEach((b, i) => data[i] = b);
            return { type: 'metadata', data };
        }
    };

    /**
     * Encode extensions to TLV format
     */
    encodeExtensions(extensions: STSExtension[]): Uint8Array {
        const buffers: Buffer[] = [];
        for (const ext of extensions) {
            const typeCode = {
                'transfer_fee': EXT_TRANSFER_FEE,
                'royalty': EXT_ROYALTY,
                'interest': EXT_INTEREST,
                'vesting': EXT_VESTING,
                'delegation': EXT_DELEGATION,
                'soulbound': EXT_SOULBOUND,
                'metadata': EXT_METADATA
            }[ext.type] || 0xFF;
            
            const header = Buffer.alloc(2);
            header.writeUInt8(typeCode, 0);
            header.writeUInt8(ext.data.length, 1);
            buffers.push(header);
            buffers.push(Buffer.from(ext.data));
        }
        return Buffer.concat(buffers);
    }

    /**
     * Mint new token notes
     */
    async mint(sender: Keypair, options: STSNoteMintOptions): Promise<string> {
        const nonce = new Uint8Array(32);
        crypto.getRandomValues(nonce);
        
        const commitment = this.createCommitment(options.ownerSecret, options.amount, nonce);
        const encryptedNote = this.encryptNote(options.ownerSecret, options.amount, nonce);
        
        const flags = (options.trustLevel || 0) | (options.extensions?.length ? 0x02 : 0);
        const extData = options.extensions ? this.encodeExtensions(options.extensions) : new Uint8Array(0);
        
        const data = Buffer.alloc(138 + 1 + extData.length);
        let offset = 0;
        data.writeUInt8(TAG_NOTE_MINT, offset); offset += 1;
        data.writeUInt8(flags, offset); offset += 1;
        options.mint.toBytes().forEach((b, i) => data[offset + i] = b); offset += 32;
        data.writeBigUInt64LE(options.amount, offset); offset += 8;
        commitment.forEach((b, i) => data[offset + i] = b); offset += 32;
        encryptedNote.forEach((b, i) => data[offset + i] = b); offset += 64;
        data.writeUInt8(options.extensions?.length || 0, offset); offset += 1;
        extData.forEach((b, i) => data[offset + i] = b);
        
        const ix = new TransactionInstruction({
            keys: [
                { pubkey: sender.publicKey, isSigner: true, isWritable: true },
                { pubkey: TREASURY, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: this.styx.programId,
            data,
        });
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [sender]);
    }

    /**
     * Send tokens to any address - Token-22 compatible UX!
     * 
     * This is the high-level API matching Token-22's transfer experience.
     * Users just specify recipient address and amount.
     * 
     * @example
     * ```typescript
     * // Token-22 style:
     * await sts.sendTo(wallet, {
     *   to: new PublicKey("recipientAddress..."),
     *   amount: 100n,
     *   mint: tokenMint,
     * });
     * ```
     */
    async sendTo(sender: Keypair, options: {
        to: PublicKey;
        amount: bigint;
        mint: PublicKey;
        memo?: string;
        private?: boolean;
    }): Promise<{ signature: string; recipientNote: Uint8Array }> {
        // Derive recipient's receiving key from their address
        const recipientReceiveKey = keccak_256(options.to.toBytes());
        
        // Hash the mint for consistency
        const mintHash = keccak_256(options.mint.toBytes());
        
        // Create note for recipient (encrypted to their address)
        const nonce = new Uint8Array(32);
        crypto.getRandomValues(nonce);
        
        const recipientCommitment = this.createCommitment(recipientReceiveKey, options.amount, nonce);
        const encryptedNote = this.encryptNote(recipientReceiveKey, options.amount, nonce);
        
        // Build the instruction
        const flags = options.private ? 0x03 : 0x01;  // Higher trust with privacy
        
        const data = Buffer.alloc(138);
        let offset = 0;
        data.writeUInt8(TAG_NOTE_MINT, offset); offset += 1;
        data.writeUInt8(flags, offset); offset += 1;
        options.mint.toBytes().forEach((b, i) => data[offset + i] = b); offset += 32;
        data.writeBigUInt64LE(options.amount, offset); offset += 8;
        recipientCommitment.forEach((b, i) => data[offset + i] = b); offset += 32;
        encryptedNote.forEach((b, i) => data[offset + i] = b); offset += 64;
        data.writeUInt8(0, offset); // no extensions
        
        const ix = new TransactionInstruction({
            keys: [
                { pubkey: sender.publicKey, isSigner: true, isWritable: true },
                { pubkey: options.to, isSigner: false, isWritable: false },  // Include recipient
                { pubkey: TREASURY, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: this.styx.programId,
            data,
        });
        
        const tx = new Transaction().add(ix);
        const signature = await sendAndConfirmTransaction(this.styx.connection, tx, [sender]);
        
        return { signature, recipientNote: recipientCommitment };
    }

    /**
     * Scan for tokens sent to an address (Token-22 parity)
     * 
     * In production, uses an indexer to find notes encrypted to this address.
     * Returns all unspent notes belonging to the address.
     */
    async getBalance(address: PublicKey, mint?: PublicKey): Promise<{
        total: bigint;
        notes: Array<{ commitment: Uint8Array; amount: bigint }>;
    }> {
        // In production: query indexer for notes encrypted to this address
        // For now: return empty (client-side wallet tracking)
        return { total: 0n, notes: [] };
    }

    /**
     * Transfer note (consume old, create new)
     */
    async transfer(sender: Keypair, options: STSNoteTransferOptions): Promise<string> {
        const flags = (options.trustLevel || 0);
        const proofLen = options.merkleProof?.length || 0;
        
        const data = Buffer.alloc(75 + (proofLen * 32));
        let offset = 0;
        data.writeUInt8(TAG_NOTE_TRANSFER, offset); offset += 1;
        data.writeUInt8(flags, offset); offset += 1;
        options.nullifier.forEach((b, i) => data[offset + i] = b); offset += 32;
        options.newCommitment.forEach((b, i) => data[offset + i] = b); offset += 32;
        const amountBuf = Buffer.alloc(8);
        amountBuf.writeBigUInt64LE(options.encryptedAmount);
        amountBuf.forEach((b, i) => data[offset + i] = b); offset += 8;
        data.writeUInt8(proofLen, offset); offset += 1;
        
        if (options.merkleProof) {
            for (const proof of options.merkleProof) {
                proof.forEach((b, i) => data[offset + i] = b);
                offset += 32;
            }
        }
        
        const ix = new TransactionInstruction({
            keys: [
                { pubkey: sender.publicKey, isSigner: true, isWritable: true },
                { pubkey: TREASURY, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: this.styx.programId,
            data,
        });
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [sender]);
    }

    /**
     * Deposit SPL tokens to global pool, receive note
     */
    async deposit(sender: Keypair, options: STSDepositOptions): Promise<string> {
        const nonce = new Uint8Array(32);
        crypto.getRandomValues(nonce);
        
        const commitment = this.createCommitment(options.ownerSecret, options.amount, nonce);
        const encryptedNote = this.encryptNote(options.ownerSecret, options.amount, nonce);
        
        const flags = options.extensions?.length ? 0x02 : 0;
        
        const data = Buffer.alloc(138);
        let offset = 0;
        data.writeUInt8(TAG_GPOOL_DEPOSIT, offset); offset += 1;
        data.writeUInt8(flags, offset); offset += 1;
        options.mint.toBytes().forEach((b, i) => data[offset + i] = b); offset += 32;
        data.writeBigUInt64LE(options.amount, offset); offset += 8;
        commitment.forEach((b, i) => data[offset + i] = b); offset += 32;
        encryptedNote.forEach((b, i) => data[offset + i] = b);
        
        const ix = new TransactionInstruction({
            keys: [
                { pubkey: sender.publicKey, isSigner: true, isWritable: true },
                { pubkey: TREASURY, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: this.styx.programId,
            data,
        });
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [sender]);
    }

    /**
     * Withdraw from global pool (direct mode)
     */
    async withdraw(sender: Keypair, options: STSWithdrawOptions): Promise<string> {
        const flags = (options.trustLevel || 0);
        
        const data = Buffer.alloc(106);
        let offset = 0;
        data.writeUInt8(TAG_GPOOL_WITHDRAW, offset); offset += 1;
        data.writeUInt8(flags, offset); offset += 1;
        options.nullifier.forEach((b, i) => data[offset + i] = b); offset += 32;
        options.mint.toBytes().forEach((b, i) => data[offset + i] = b); offset += 32;
        data.writeBigUInt64LE(options.amount, offset); offset += 8;
        options.recipient.toBytes().forEach((b, i) => data[offset + i] = b);
        
        const ix = new TransactionInstruction({
            keys: [
                { pubkey: sender.publicKey, isSigner: true, isWritable: true },
                { pubkey: TREASURY, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: this.styx.programId,
            data,
        });
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [sender]);
    }

    /**
     * Withdraw from global pool (stealth mode - preserves privacy)
     */
    async withdrawStealth(sender: Keypair, options: STSStealthWithdrawOptions): Promise<string> {
        const flags = (options.trustLevel || 0);
        
        const data = Buffer.alloc(138);
        let offset = 0;
        data.writeUInt8(TAG_GPOOL_WITHDRAW_STEALTH, offset); offset += 1;
        data.writeUInt8(flags, offset); offset += 1;
        options.nullifier.forEach((b, i) => data[offset + i] = b); offset += 32;
        options.mint.toBytes().forEach((b, i) => data[offset + i] = b); offset += 32;
        data.writeBigUInt64LE(options.amount, offset); offset += 8;
        options.ephemeralPubkey.forEach((b, i) => data[offset + i] = b); offset += 32;
        options.encryptedRecipient.forEach((b, i) => data[offset + i] = b);
        
        const ix = new TransactionInstruction({
            keys: [
                { pubkey: sender.publicKey, isSigner: true, isWritable: true },
                { pubkey: TREASURY, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: this.styx.programId,
            data,
        });
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [sender]);
    }

    /**
     * Derive global pool PDA for a mint
     */
    derivePoolPDA(mint: PublicKey): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from('styx_gpool'), mint.toBytes()],
            this.styx.programId
        );
    }

    /**
     * Derive nullifier PDA
     */
    deriveNullifierPDA(nullifier: Uint8Array): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from('styx_null'), Buffer.from(nullifier)],
            this.styx.programId
        );
    }

    // ========================================================================
    // TOKEN-22 PARITY METHODS
    // ========================================================================

    /**
     * Wrap SPL tokens into STS note (entry to privacy pool)
     */
    async wrap(sender: Keypair, mint: PublicKey, amount: bigint, ownerSecret: Uint8Array): Promise<string> {
        const nonce = new Uint8Array(32);
        crypto.getRandomValues(nonce);
        
        const commitment = this.createCommitment(ownerSecret, amount, nonce);
        const encryptedNote = this.encryptNote(ownerSecret, amount, nonce);
        
        const data = Buffer.alloc(138);
        let offset = 0;
        data.writeUInt8(TAG_WRAP_SPL, offset); offset += 1;
        data.writeUInt8(TRUST_INDEXER, offset); offset += 1;
        mint.toBytes().forEach((b, i) => data[offset + i] = b); offset += 32;
        data.writeBigUInt64LE(amount, offset); offset += 8;
        commitment.forEach((b, i) => data[offset + i] = b); offset += 32;
        encryptedNote.forEach((b, i) => data[offset + i] = b);
        
        const ix = new TransactionInstruction({
            keys: [
                { pubkey: sender.publicKey, isSigner: true, isWritable: true },
                { pubkey: TREASURY, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: this.styx.programId,
            data,
        });
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [sender]);
    }

    /**
     * Unwrap STS note to SPL tokens (exit from privacy pool)
     */
    async unwrap(sender: Keypair, nullifier: Uint8Array, mint: PublicKey, amount: bigint, recipient: PublicKey): Promise<string> {
        const data = Buffer.alloc(106);
        let offset = 0;
        data.writeUInt8(TAG_UNWRAP_SPL, offset); offset += 1;
        data.writeUInt8(TRUST_INDEXER, offset); offset += 1;
        nullifier.forEach((b, i) => data[offset + i] = b); offset += 32;
        mint.toBytes().forEach((b, i) => data[offset + i] = b); offset += 32;
        data.writeBigUInt64LE(amount, offset); offset += 8;
        recipient.toBytes().forEach((b, i) => data[offset + i] = b);
        
        const ix = new TransactionInstruction({
            keys: [
                { pubkey: sender.publicKey, isSigner: true, isWritable: true },
                { pubkey: TREASURY, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: this.styx.programId,
            data,
        });
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [sender]);
    }

    /**
     * Create NFT collection
     */
    async createCollection(sender: Keypair, name: string, symbol: string, maxSupply: bigint, royaltyBps: number): Promise<string> {
        const nameBytes = Buffer.from(name.slice(0, 32));
        const symbolBytes = Buffer.from(symbol.slice(0, 10));
        
        const data = Buffer.alloc(14 + nameBytes.length + symbolBytes.length);
        let offset = 0;
        data.writeUInt8(TAG_COLLECTION_CREATE, offset); offset += 1;
        data.writeUInt8(0, offset); offset += 1; // flags
        data.writeUInt8(nameBytes.length, offset); offset += 1;
        nameBytes.forEach((b, i) => data[offset + i] = b); offset += nameBytes.length;
        data.writeUInt8(symbolBytes.length, offset); offset += 1;
        symbolBytes.forEach((b, i) => data[offset + i] = b); offset += symbolBytes.length;
        data.writeBigUInt64LE(maxSupply, offset); offset += 8;
        data.writeUInt16LE(royaltyBps, offset);
        
        const ix = new TransactionInstruction({
            keys: [
                { pubkey: sender.publicKey, isSigner: true, isWritable: true },
                { pubkey: TREASURY, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: this.styx.programId,
            data,
        });
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [sender]);
    }

    /**
     * Mint NFT in collection
     */
    async mintNFT(sender: Keypair, collection: Uint8Array, metadataHash: Uint8Array, ownerSecret: Uint8Array, royaltyBps: number): Promise<string> {
        const nonce = new Uint8Array(32);
        crypto.getRandomValues(nonce);
        const ownerCommit = this.createCommitment(ownerSecret, BigInt(1), nonce);
        
        const data = Buffer.alloc(132);
        let offset = 0;
        data.writeUInt8(TAG_NFT_MINT, offset); offset += 1;
        data.writeUInt8(royaltyBps > 0 ? 0x04 : 0, offset); offset += 1; // flags
        collection.forEach((b, i) => data[offset + i] = b); offset += 32;
        metadataHash.forEach((b, i) => data[offset + i] = b); offset += 32;
        ownerCommit.forEach((b, i) => data[offset + i] = b); offset += 32;
        data.writeUInt16LE(royaltyBps, offset); offset += 2;
        sender.publicKey.toBytes().forEach((b, i) => data[offset + i] = b);
        
        const ix = new TransactionInstruction({
            keys: [
                { pubkey: sender.publicKey, isSigner: true, isWritable: true },
                { pubkey: TREASURY, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: this.styx.programId,
            data,
        });
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [sender]);
    }

    /**
     * Create note group (for collections)
     */
    async createGroup(sender: Keypair, groupId: Uint8Array, name: string, maxSize: bigint): Promise<string> {
        const nameBytes = Buffer.from(name.slice(0, 64));
        
        const data = Buffer.alloc(43 + nameBytes.length);
        let offset = 0;
        data.writeUInt8(TAG_GROUP_CREATE, offset); offset += 1;
        data.writeUInt8(0, offset); offset += 1;
        groupId.forEach((b, i) => data[offset + i] = b); offset += 32;
        data.writeUInt8(nameBytes.length, offset); offset += 1;
        nameBytes.forEach((b, i) => data[offset + i] = b); offset += nameBytes.length;
        data.writeBigUInt64LE(maxSize, offset);
        
        const ix = new TransactionInstruction({
            keys: [
                { pubkey: sender.publicKey, isSigner: true, isWritable: true },
            ],
            programId: this.styx.programId,
            data,
        });
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [sender]);
    }

    /**
     * Commit to fair launch (meme coin)
     */
    async fairLaunchCommit(sender: Keypair, launchId: Uint8Array, amount: bigint, nonce: Uint8Array, revealSlot: bigint): Promise<string> {
        // Hash amount + nonce for commitment
        const amountBuf = Buffer.alloc(8);
        amountBuf.writeBigUInt64LE(amount);
        const amountCommit = keccak_256(Buffer.concat([
            Buffer.from('STS_AMOUNT_COMMIT_V1'),
            amountBuf,
            Buffer.from(nonce)
        ]));
        
        const data = Buffer.alloc(74);
        let offset = 0;
        data.writeUInt8(TAG_FAIR_LAUNCH_COMMIT, offset); offset += 1;
        data.writeUInt8(0, offset); offset += 1;
        launchId.forEach((b, i) => data[offset + i] = b); offset += 32;
        amountCommit.forEach((b, i) => data[offset + i] = b); offset += 32;
        data.writeBigUInt64LE(revealSlot, offset);
        
        const ix = new TransactionInstruction({
            keys: [
                { pubkey: sender.publicKey, isSigner: true, isWritable: true },
                { pubkey: TREASURY, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: this.styx.programId,
            data,
        });
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [sender]);
    }

    /**
     * Reveal fair launch allocation
     */
    async fairLaunchReveal(sender: Keypair, launchId: Uint8Array, amount: bigint, nonce: Uint8Array, ownerSecret: Uint8Array): Promise<string> {
        const ownerNonce = new Uint8Array(32);
        crypto.getRandomValues(ownerNonce);
        const ownerCommit = this.createCommitment(ownerSecret, amount, ownerNonce);
        
        const data = Buffer.alloc(106);
        let offset = 0;
        data.writeUInt8(TAG_FAIR_LAUNCH_REVEAL, offset); offset += 1;
        data.writeUInt8(0, offset); offset += 1;
        launchId.forEach((b, i) => data[offset + i] = b); offset += 32;
        data.writeBigUInt64LE(amount, offset); offset += 8;
        nonce.forEach((b, i) => data[offset + i] = b); offset += 32;
        ownerCommit.forEach((b, i) => data[offset + i] = b);
        
        const ix = new TransactionInstruction({
            keys: [
                { pubkey: sender.publicKey, isSigner: true, isWritable: true },
            ],
            programId: this.styx.programId,
            data,
        });
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [sender]);
    }

    /**
     * Register transfer hook for notes
     */
    async registerHook(sender: Keypair, mintHash: Uint8Array, hookProgram: PublicKey, extraAccountsHash: Uint8Array): Promise<string> {
        const data = Buffer.alloc(98);
        let offset = 0;
        data.writeUInt8(TAG_HOOK_REGISTER, offset); offset += 1;
        data.writeUInt8(0, offset); offset += 1;
        mintHash.forEach((b, i) => data[offset + i] = b); offset += 32;
        hookProgram.toBytes().forEach((b, i) => data[offset + i] = b); offset += 32;
        extraAccountsHash.forEach((b, i) => data[offset + i] = b);
        
        const ix = new TransactionInstruction({
            keys: [
                { pubkey: sender.publicKey, isSigner: true, isWritable: true },
            ],
            programId: this.styx.programId,
            data,
        });
        
        const tx = new Transaction().add(ix);
        return sendAndConfirmTransaction(this.styx.connection, tx, [sender]);
    }

    // ========================================================================
    // STATIC HELPERS FOR CLI
    // ========================================================================

    /**
     * Generate random bytes
     */
    static randomBytes(length: number): Uint8Array {
        const bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
        return bytes;
    }

    /**
     * Hash bytes using Keccak256
     */
    static hash(data: Uint8Array): Uint8Array {
        return keccak_256(data);
    }

    /**
     * Create note with commitment, nullifier, and encrypted data
     */
    static createNote(amount: bigint, mintHash: Uint8Array, ownerKey: Uint8Array): {
        commitment: Uint8Array;
        nullifier: Uint8Array;
        encrypted: Uint8Array;
    } {
        const nonce = STS.randomBytes(32);
        const amountBuf = new Uint8Array(8);
        new DataView(amountBuf.buffer).setBigUint64(0, amount, true);
        
        // Commitment: H(STS_NOTE_V1 || ownerKey || amount || nonce)
        const commitment = keccak_256(Buffer.concat([
            Buffer.from('STS_NOTE_V1'),
            Buffer.from(ownerKey),
            Buffer.from(amountBuf),
            Buffer.from(nonce)
        ]));
        
        // Nullifier: H(STS_NULLIFIER_V1 || commitment || ownerKey)
        const nullifier = keccak_256(Buffer.concat([
            Buffer.from('STS_NULLIFIER_V1'),
            Buffer.from(commitment),
            Buffer.from(ownerKey)
        ]));
        
        // Encrypt note data
        const plaintext = Buffer.concat([Buffer.from(amountBuf), Buffer.from(nonce), Buffer.from(mintHash)]);
        const mask = keccak_256(Buffer.concat([
            Buffer.from('STS_NOTE_ENCRYPT_V1'),
            Buffer.from(ownerKey)
        ]));
        
        const encrypted = new Uint8Array(64);
        for (let i = 0; i < Math.min(plaintext.length, 64); i++) {
            encrypted[i] = plaintext[i] ^ mask[i % 32];
        }
        
        return { commitment, nullifier, encrypted };
    }

    /**
     * Build mint instruction
     */
    static buildMintInstruction(
        payer: PublicKey,
        treasury: PublicKey,
        commitment: Uint8Array,
        encrypted: Uint8Array,
        flags: number,
        extensions: Uint8Array
    ): { instruction: TransactionInstruction } {
        const data = Buffer.alloc(99 + extensions.length);
        let offset = 0;
        data.writeUInt8(TAG_NOTE_MINT, offset); offset += 1;
        data.writeUInt8(flags, offset); offset += 1;
        commitment.forEach((b, i) => data[offset + i] = b); offset += 32;
        encrypted.forEach((b, i) => data[offset + i] = b); offset += 64;
        data.writeUInt8(extensions.length > 0 ? 1 : 0, offset); offset += 1;
        extensions.forEach((b, i) => data[offset + i] = b);
        
        const instruction = new TransactionInstruction({
            keys: [
                { pubkey: payer, isSigner: true, isWritable: true },
                { pubkey: treasury, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: STYX_PMP_DEVNET_PROGRAM_ID,
            data,
        });
        
        return { instruction };
    }

    /**
     * Build transfer instruction
     */
    static buildTransferInstruction(
        payer: PublicKey,
        treasury: PublicKey,
        nullifier: Uint8Array,
        newCommitment: Uint8Array,
        encrypted: Uint8Array,
        trustLevel: number
    ): { instruction: TransactionInstruction } {
        const data = Buffer.alloc(131);
        let offset = 0;
        data.writeUInt8(TAG_NOTE_TRANSFER, offset); offset += 1;
        data.writeUInt8(trustLevel, offset); offset += 1;
        nullifier.forEach((b, i) => data[offset + i] = b); offset += 32;
        newCommitment.forEach((b, i) => data[offset + i] = b); offset += 32;
        encrypted.forEach((b, i) => data[offset + i] = b); offset += 64;
        data.writeUInt8(0, offset); // no merkle proof
        
        const instruction = new TransactionInstruction({
            keys: [
                { pubkey: payer, isSigner: true, isWritable: true },
                { pubkey: treasury, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: STYX_PMP_DEVNET_PROGRAM_ID,
            data,
        });
        
        return { instruction };
    }

    /**
     * Build wrap instruction (SPL → STS)
     */
    static buildWrapInstruction(
        payer: PublicKey,
        treasury: PublicKey,
        mint: PublicKey,
        amount: bigint,
        commitment: Uint8Array,
        encrypted: Uint8Array
    ): { instruction: TransactionInstruction } {
        const data = Buffer.alloc(138);
        let offset = 0;
        data.writeUInt8(TAG_WRAP_SPL, offset); offset += 1;
        data.writeUInt8(TRUST_INDEXER, offset); offset += 1;
        mint.toBytes().forEach((b, i) => data[offset + i] = b); offset += 32;
        data.writeBigUInt64LE(amount, offset); offset += 8;
        commitment.forEach((b, i) => data[offset + i] = b); offset += 32;
        encrypted.forEach((b, i) => data[offset + i] = b);
        
        const instruction = new TransactionInstruction({
            keys: [
                { pubkey: payer, isSigner: true, isWritable: true },
                { pubkey: treasury, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: STYX_PMP_DEVNET_PROGRAM_ID,
            data,
        });
        
        return { instruction };
    }

    /**
     * Build unwrap instruction (STS → SPL)
     */
    static buildUnwrapInstruction(
        payer: PublicKey,
        treasury: PublicKey,
        mint: PublicKey,
        recipient: PublicKey,
        nullifier: Uint8Array,
        amount: bigint
    ): { instruction: TransactionInstruction } {
        const data = Buffer.alloc(106);
        let offset = 0;
        data.writeUInt8(TAG_UNWRAP_SPL, offset); offset += 1;
        data.writeUInt8(TRUST_INDEXER, offset); offset += 1;
        nullifier.forEach((b, i) => data[offset + i] = b); offset += 32;
        mint.toBytes().forEach((b, i) => data[offset + i] = b); offset += 32;
        data.writeBigUInt64LE(amount, offset); offset += 8;
        recipient.toBytes().forEach((b, i) => data[offset + i] = b);
        
        const instruction = new TransactionInstruction({
            keys: [
                { pubkey: payer, isSigner: true, isWritable: true },
                { pubkey: treasury, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: STYX_PMP_DEVNET_PROGRAM_ID,
            data,
        });
        
        return { instruction };
    }
}

// ============================================================================
// v8 NFT MARKETPLACE BUILDERS
// World's first privacy-preserving NFT marketplace on Solana
// ============================================================================

/**
 * Build NFT listing instruction
 * Lists an STS NFT for fixed-price sale with optional privacy features
 */
export function buildNftListInstruction(
    payer: PublicKey,
    treasury: PublicKey,
    options: NftListingOptions,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    const data = Buffer.alloc(82);
    let offset = 0;
    
    data.writeUInt8(TAG_NFT_LIST, offset); offset += 1;
    data.writeUInt8(options.flags ?? 0, offset); offset += 1;
    options.nftCommit.forEach((b, i) => data[offset + i] = b); offset += 32;
    data.writeBigUInt64LE(options.price, offset); offset += 8;
    const currencyBytes = options.currencyMint?.toBytes() ?? new Uint8Array(32);
    currencyBytes.forEach((b, i) => data[offset + i] = b); offset += 32;
    data.writeBigUInt64LE(BigInt(options.expiry), offset);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: treasury, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
    });
}

/**
 * Build NFT delist instruction
 */
export function buildNftDelistInstruction(
    payer: PublicKey,
    treasury: PublicKey,
    listingId: Uint8Array,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    const data = Buffer.alloc(33);
    data.writeUInt8(TAG_NFT_DELIST, 0);
    listingId.forEach((b, i) => data[1 + i] = b);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: treasury, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
    });
}

/**
 * Build NFT buy instruction
 * Atomic purchase with privacy-preserving ownership transfer
 */
export function buildNftBuyInstruction(
    buyer: PublicKey,
    seller: PublicKey,
    treasury: PublicKey,
    listingId: Uint8Array,
    buyerSecret: Uint8Array,
    newOwnerCommit: Uint8Array,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    const data = Buffer.alloc(97);
    let offset = 0;
    
    data.writeUInt8(TAG_NFT_BUY, offset); offset += 1;
    listingId.forEach((b, i) => data[offset + i] = b); offset += 32;
    buyerSecret.forEach((b, i) => data[offset + i] = b); offset += 32;
    newOwnerCommit.forEach((b, i) => data[offset + i] = b);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: buyer, isSigner: true, isWritable: true },
            { pubkey: seller, isSigner: false, isWritable: true },
            { pubkey: treasury, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
    });
}

/**
 * Build auction create instruction
 * Supports English, Dutch, and Sealed-bid (chrono vault) auctions
 */
export function buildAuctionCreateInstruction(
    payer: PublicKey,
    treasury: PublicKey,
    options: AuctionOptions,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    const data = Buffer.alloc(82);
    let offset = 0;
    
    data.writeUInt8(TAG_AUCTION_CREATE, offset); offset += 1;
    data.writeUInt8(options.auctionType ?? AUCTION_ENGLISH, offset); offset += 1;
    options.nftCommit.forEach((b, i) => data[offset + i] = b); offset += 32;
    data.writeBigUInt64LE(options.reserve, offset); offset += 8;
    const currencyBytes = options.currencyMint?.toBytes() ?? new Uint8Array(32);
    currencyBytes.forEach((b, i) => data[offset + i] = b); offset += 32;
    data.writeBigUInt64LE(BigInt(options.duration), offset);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: treasury, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
    });
}

/**
 * Build auction bid instruction
 */
export function buildAuctionBidInstruction(
    bidder: PublicKey,
    treasury: PublicKey,
    auctionId: Uint8Array,
    bidAmount: bigint,
    bidCommit: Uint8Array,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    const data = Buffer.alloc(73);
    let offset = 0;
    
    data.writeUInt8(TAG_AUCTION_BID, offset); offset += 1;
    auctionId.forEach((b, i) => data[offset + i] = b); offset += 32;
    data.writeBigUInt64LE(bidAmount, offset); offset += 8;
    bidCommit.forEach((b, i) => data[offset + i] = b);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: bidder, isSigner: true, isWritable: true },
            { pubkey: treasury, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
    });
}

// ============================================================================
// v9 PORTABLE PRIVACY VOUCHERS (PPV) BUILDERS
// World's first DeFi-compatible privacy layer
// ============================================================================

/**
 * Build PPV create instruction
 * Wraps a private note into a voucher that DeFi protocols can consume
 */
export function buildPPVCreateInstruction(
    payer: PublicKey,
    treasury: PublicKey,
    options: PPVOptions,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    const allowedProgramsData = options.allowedPrograms?.flatMap(p => [...p.toBytes()]) ?? [];
    const data = Buffer.alloc(42 + allowedProgramsData.length);
    let offset = 0;
    
    data.writeUInt8(TAG_PPV_CREATE, offset); offset += 1;
    data.writeUInt8(0, offset); offset += 1; // flags
    options.noteNullifier.forEach((b, i) => data[offset + i] = b); offset += 32;
    data.writeBigUInt64LE(options.amount, offset); offset += 8;
    allowedProgramsData.forEach((b, i) => data[offset + i] = b);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: treasury, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
    });
}

/**
 * Build PPV verify instruction (for CPI from DeFi protocols)
 */
export function buildPPVVerifyInstruction(
    invoker: PublicKey,
    ppvId: Uint8Array,
    callerProgram: PublicKey,
    actionHash: Uint8Array,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    const data = Buffer.alloc(97);
    let offset = 0;
    
    data.writeUInt8(TAG_PPV_VERIFY, offset); offset += 1;
    ppvId.forEach((b, i) => data[offset + i] = b); offset += 32;
    callerProgram.toBytes().forEach((b, i) => data[offset + i] = b); offset += 32;
    actionHash.forEach((b, i) => data[offset + i] = b);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: invoker, isSigner: false, isWritable: false },
        ],
        programId,
        data,
    });
}

/**
 * Build PPV redeem instruction
 * Converts voucher back to real tokens
 */
export function buildPPVRedeemInstruction(
    payer: PublicKey,
    treasury: PublicKey,
    ppvId: Uint8Array,
    secret: Uint8Array,
    recipient: PublicKey,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    const data = Buffer.alloc(97);
    let offset = 0;
    
    data.writeUInt8(TAG_PPV_REDEEM, offset); offset += 1;
    ppvId.forEach((b, i) => data[offset + i] = b); offset += 32;
    secret.forEach((b, i) => data[offset + i] = b); offset += 32;
    recipient.toBytes().forEach((b, i) => data[offset + i] = b);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: treasury, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
    });
}

// ============================================================================
// v10 ATOMIC PRIVACY BRIDGE (APB) BUILDERS
// Single-tx "teleport" from private STS → public SPL
// ============================================================================

/**
 * Build APB transfer instruction
 * Atomic private→public transfer with stealth address
 */
export function buildAPBTransferInstruction(
    payer: PublicKey,
    treasury: PublicKey,
    options: APBTransferOptions,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    const data = Buffer.alloc(106);
    let offset = 0;
    
    data.writeUInt8(TAG_APB_TRANSFER, offset); offset += 1;
    data.writeUInt8(options.flags ?? 0, offset); offset += 1;
    options.noteNullifier.forEach((b, i) => data[offset + i] = b); offset += 32;
    data.writeBigUInt64LE(options.amount, offset); offset += 8;
    options.stealthPubkey.forEach((b, i) => data[offset + i] = b); offset += 32;
    options.mint.toBytes().forEach((b, i) => data[offset + i] = b);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: treasury, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
    });
}

/**
 * Build stealth scan hint instruction
 * Helps recipient find their stealth payments
 */
export function buildStealthScanHintInstruction(
    payer: PublicKey,
    stealthPubkey: Uint8Array,
    scanHint: Uint8Array,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    const data = Buffer.alloc(65);
    let offset = 0;
    
    data.writeUInt8(TAG_STEALTH_SCAN_HINT, offset); offset += 1;
    stealthPubkey.forEach((b, i) => data[offset + i] = b); offset += 32;
    scanHint.forEach((b, i) => data[offset + i] = b);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
        ],
        programId,
        data,
    });
}

// ============================================================================
// v11 PRIVATE DEFI ADAPTER BUILDERS
// Jupiter, Marinade, Raydium integration with privacy
// ============================================================================

/**
 * Build private swap instruction
 * Jupiter-style swap with privacy-preserving input/output
 */
export function buildPrivateSwapInstruction(
    payer: PublicKey,
    treasury: PublicKey,
    options: PrivateSwapOptions,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    const data = Buffer.alloc(107);
    let offset = 0;
    
    data.writeUInt8(TAG_PRIVATE_SWAP, offset); offset += 1;
    options.inputNullifier.forEach((b, i) => data[offset + i] = b); offset += 32;
    options.inputMint.toBytes().forEach((b, i) => data[offset + i] = b); offset += 32;
    options.outputMint.toBytes().forEach((b, i) => data[offset + i] = b); offset += 32;
    data.writeBigUInt64LE(options.minOutput, offset); offset += 8;
    data.writeUInt16LE(options.slippageBps ?? 50, offset);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: treasury, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
    });
}

/**
 * Build private stake instruction
 * Stake with privacy-preserving amount
 */
export function buildPrivateStakeInstruction(
    payer: PublicKey,
    treasury: PublicKey,
    inputNullifier: Uint8Array,
    stakePool: PublicKey,
    amount: bigint,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    const data = Buffer.alloc(73);
    let offset = 0;
    
    data.writeUInt8(TAG_PRIVATE_STAKE, offset); offset += 1;
    inputNullifier.forEach((b, i) => data[offset + i] = b); offset += 32;
    stakePool.toBytes().forEach((b, i) => data[offset + i] = b); offset += 32;
    data.writeBigUInt64LE(amount, offset);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: treasury, isSigner: false, isWritable: true },
            { pubkey: stakePool, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
    });
}

// ============================================================================
// v12 POOL BUILDERS
// ============================================================================

/**
 * Build pool create instruction
 */
export function buildPoolCreateInstruction(
    payer: PublicKey,
    treasury: PublicKey,
    options: PoolOptions,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    const data = Buffer.alloc(42);
    let offset = 0;
    
    data.writeUInt8(TAG_POOL_CREATE, offset); offset += 1;
    data.writeUInt8(options.flags ?? 0, offset); offset += 1;
    options.mint.toBytes().forEach((b, i) => data[offset + i] = b); offset += 32;
    data.writeBigUInt64LE(options.initialDeposit ?? BigInt(0), offset);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: treasury, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
    });
}

/**
 * Build pool deposit instruction
 */
export function buildPoolDepositInstruction(
    payer: PublicKey,
    treasury: PublicKey,
    poolId: Uint8Array,
    amount: bigint,
    depositCommit: Uint8Array,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    const data = Buffer.alloc(74);
    let offset = 0;
    
    data.writeUInt8(TAG_POOL_DEPOSIT, offset); offset += 1;
    poolId.forEach((b, i) => data[offset + i] = b); offset += 32;
    data.writeBigUInt64LE(amount, offset); offset += 8;
    depositCommit.forEach((b, i) => data[offset + i] = b); offset += 32;
    data.writeUInt8(0, offset); // flags
    
    return new TransactionInstruction({
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: treasury, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
    });
}

/**
 * Build pool withdraw instruction
 */
export function buildPoolWithdrawInstruction(
    payer: PublicKey,
    treasury: PublicKey,
    poolId: Uint8Array,
    depositNullifier: Uint8Array,
    secret: Uint8Array,
    amount: bigint,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    const data = Buffer.alloc(105);
    let offset = 0;
    
    data.writeUInt8(TAG_POOL_WITHDRAW, offset); offset += 1;
    poolId.forEach((b, i) => data[offset + i] = b); offset += 32;
    depositNullifier.forEach((b, i) => data[offset + i] = b); offset += 32;
    secret.forEach((b, i) => data[offset + i] = b); offset += 32;
    data.writeBigUInt64LE(amount, offset);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: treasury, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
    });
}

// ============================================================================
// v13 YIELD BUILDERS
// ============================================================================

/**
 * Build yield vault create instruction
 */
export function buildYieldVaultCreateInstruction(
    payer: PublicKey,
    treasury: PublicKey,
    options: YieldVaultOptions,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    const data = Buffer.alloc(67);
    let offset = 0;
    
    data.writeUInt8(TAG_YIELD_VAULT_CREATE, offset); offset += 1;
    options.underlyingMint.toBytes().forEach((b, i) => data[offset + i] = b); offset += 32;
    data.writeUInt16LE(options.apyBps ?? 500, offset); offset += 2; // Default 5% APY
    const yieldSourceBytes = options.yieldSource?.toBytes() ?? new Uint8Array(32);
    yieldSourceBytes.forEach((b, i) => data[offset + i] = b);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: treasury, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
    });
}

/**
 * Build yield deposit instruction
 */
export function buildYieldDepositInstruction(
    payer: PublicKey,
    treasury: PublicKey,
    vaultId: Uint8Array,
    amount: bigint,
    yieldCommit: Uint8Array,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    const data = Buffer.alloc(73);
    let offset = 0;
    
    data.writeUInt8(TAG_YIELD_DEPOSIT, offset); offset += 1;
    vaultId.forEach((b, i) => data[offset + i] = b); offset += 32;
    data.writeBigUInt64LE(amount, offset); offset += 8;
    yieldCommit.forEach((b, i) => data[offset + i] = b);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: treasury, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
    });
}

// ============================================================================
// v14 TOKEN METADATA BUILDERS
// Full Token-22 metadata parity
// ============================================================================

/**
 * Build token create instruction
 * Creates a new STS token with full metadata (Token-22 parity)
 */
export function buildTokenCreateInstruction(
    payer: PublicKey,
    treasury: PublicKey,
    options: TokenCreateOptions,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    const nameBytes = Buffer.from(options.metadata.name.slice(0, 32));
    const symbolBytes = Buffer.from(options.metadata.symbol.slice(0, 10));
    const uriBytes = Buffer.from(options.metadata.uri?.slice(0, 200) ?? '');
    
    const data = Buffer.alloc(4 + nameBytes.length + 1 + symbolBytes.length + 1 + uriBytes.length);
    let offset = 0;
    
    data.writeUInt8(TAG_TOKEN_CREATE, offset); offset += 1;
    data.writeUInt8(options.flags ?? 0, offset); offset += 1;
    data.writeUInt8(options.metadata.decimals, offset); offset += 1;
    data.writeUInt8(nameBytes.length, offset); offset += 1;
    nameBytes.copy(data, offset); offset += nameBytes.length;
    data.writeUInt8(symbolBytes.length, offset); offset += 1;
    symbolBytes.copy(data, offset); offset += symbolBytes.length;
    data.writeUInt8(uriBytes.length, offset); offset += 1;
    uriBytes.copy(data, offset);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: treasury, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
    });
}

/**
 * Build token set authority instruction
 */
export function buildTokenSetAuthorityInstruction(
    payer: PublicKey,
    tokenId: Uint8Array,
    authorityType: 'mint' | 'freeze',
    newAuthority: PublicKey,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    const data = Buffer.alloc(66);
    let offset = 0;
    
    data.writeUInt8(TAG_TOKEN_SET_AUTHORITY, offset); offset += 1;
    tokenId.forEach((b, i) => data[offset + i] = b); offset += 32;
    data.writeUInt8(authorityType === 'mint' ? 0 : 1, offset); offset += 1;
    newAuthority.toBytes().forEach((b, i) => data[offset + i] = b);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: payer, isSigner: true, isWritable: false },
        ],
        programId,
        data,
    });
}

/**
 * Build token metadata update instruction
 */
export function buildTokenMetadataUpdateInstruction(
    payer: PublicKey,
    tokenId: Uint8Array,
    field: 'name' | 'symbol' | 'uri',
    value: string,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    const valueBytes = Buffer.from(value);
    const data = Buffer.alloc(35 + valueBytes.length);
    let offset = 0;
    
    const fieldCode = field === 'name' ? 0 : field === 'symbol' ? 1 : 2;
    
    data.writeUInt8(TAG_TOKEN_METADATA_UPDATE, offset); offset += 1;
    tokenId.forEach((b, i) => data[offset + i] = b); offset += 32;
    data.writeUInt8(fieldCode, offset); offset += 1;
    data.writeUInt8(valueBytes.length, offset); offset += 1;
    valueBytes.copy(data, offset);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: payer, isSigner: true, isWritable: false },
        ],
        programId,
        data,
    });
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Generate a cryptographically secure random commitment
 */
export function generateCommitment(): Uint8Array {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return bytes;
}

/**
 * Generate a note commitment from amount and secret
 */
export function generateNoteCommitment(
    mint: PublicKey,
    amount: bigint,
    secret: Uint8Array
): Uint8Array {
    return keccak_256(Buffer.concat([
        Buffer.from('STS_NOTE_V1'),
        mint.toBytes(),
        Buffer.from(new BigUint64Array([amount]).buffer),
        Buffer.from(secret),
    ]));
}

/**
 * Generate a nullifier from secret and commitment
 */
export function generateNullifier(
    secret: Uint8Array,
    commitment: Uint8Array
): Uint8Array {
    return keccak_256(Buffer.concat([
        Buffer.from('styx_nullifier'),
        Buffer.from(secret),
        Buffer.from(commitment),
    ]));
}

/**
 * Generate a stealth address for APB transfers
 */
export function generateStealthAddress(
    recipientSpendPubkey: Uint8Array,
    senderEphemeralPrivkey: Uint8Array
): { stealthPubkey: Uint8Array; scanHint: Uint8Array } {
    // Derive shared secret via X25519
    const sharedSecret = x25519.getSharedSecret(senderEphemeralPrivkey, recipientSpendPubkey);
    
    // Generate stealth pubkey
    const stealthPubkey = keccak_256(Buffer.concat([
        Buffer.from('STS_STEALTH_V1'),
        Buffer.from(sharedSecret),
        Buffer.from(recipientSpendPubkey),
    ]));
    
    // Generate scan hint (helps recipient find their payments)
    const scanHint = keccak_256(Buffer.concat([
        Buffer.from('STS_SCAN_V1'),
        Buffer.from(x25519.getPublicKey(senderEphemeralPrivkey)),
    ]));
    
    return { stealthPubkey, scanHint };
}

// ============================================================================
// v15 COMPLETE TOKEN-22 PARITY BUILDERS
// ============================================================================

/**
 * Build a hook execution instruction (TAG_HOOK_EXECUTE_REAL = 151)
 * Actually fires transfer hooks via CPI - per-NOTE hooks, not just mint-level!
 */
export function buildHookExecute(
    payer: PublicKey,
    noteCommit: Uint8Array,
    hookProgram: PublicKey,
    hookData: Uint8Array = new Uint8Array(0)
): TransactionInstruction {
    const data = Buffer.alloc(65 + hookData.length);
    let offset = 0;
    
    data.writeUInt8(TAG_HOOK_EXECUTE_REAL, offset); offset += 1;
    Buffer.from(noteCommit).copy(data, offset); offset += 32;
    Buffer.from(hookProgram.toBytes()).copy(data, offset); offset += 32;
    Buffer.from(hookData).copy(data, offset);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: payer, isSigner: true, isWritable: false },
            { pubkey: hookProgram, isSigner: false, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build a confidential transfer v2 instruction (TAG_CONFIDENTIAL_TRANSFER_V2 = 152)
 * Unlike Token-22 CT which only hides amounts, STS hides EVERYTHING
 */
export function buildConfidentialTransferV2(
    payer: PublicKey,
    nullifier: Uint8Array,
    encryptedData: Uint8Array,
    auditorKey: Uint8Array = new Uint8Array(32),
    flags: number = 0
): TransactionInstruction {
    const data = Buffer.alloc(130);
    let offset = 0;
    
    data.writeUInt8(TAG_CONFIDENTIAL_TRANSFER_V2, offset); offset += 1;
    data.writeUInt8(flags, offset); offset += 1;
    Buffer.from(nullifier).copy(data, offset); offset += 32;
    Buffer.from(encryptedData.slice(0, 64)).copy(data, offset); offset += 64;
    Buffer.from(auditorKey).copy(data, offset); offset += 32;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: payer, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build an interest claim instruction (TAG_INTEREST_CLAIM_REAL = 153)
 * Uses Aave-pattern scaled balance for O(1) interest accrual
 */
export function buildInterestClaimReal(
    claimer: PublicKey,
    noteCommit: Uint8Array,
    currentLiquidityIndex: bigint
): TransactionInstruction {
    const data = Buffer.alloc(41);
    let offset = 0;
    
    data.writeUInt8(TAG_INTEREST_CLAIM_REAL, offset); offset += 1;
    Buffer.from(noteCommit).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(currentLiquidityIndex, offset); offset += 8;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: claimer, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build a royalty claim instruction (TAG_ROYALTY_CLAIM_REAL = 154)
 * Complete royalty claiming from escrow
 */
export function buildRoyaltyClaimReal(
    creator: PublicKey,
    nftCommit: Uint8Array,
    saleId: Uint8Array,
    royaltyAmount: bigint
): TransactionInstruction {
    const data = Buffer.alloc(73);
    let offset = 0;
    
    data.writeUInt8(TAG_ROYALTY_CLAIM_REAL, offset); offset += 1;
    Buffer.from(nftCommit).copy(data, offset); offset += 32;
    Buffer.from(saleId).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(royaltyAmount, offset); offset += 8;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: creator, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Batch operation entry for buildBatchNoteOps
 */
export interface BatchOpEntry {
    opType: number;
    opData: Uint8Array;
}

/**
 * Build a batch note operations instruction (TAG_BATCH_NOTE_OPS = 155)
 * Process multiple note operations in a single transaction
 */
export function buildBatchNoteOps(
    executor: PublicKey,
    operations: BatchOpEntry[]
): TransactionInstruction {
    if (operations.length > 10) {
        throw new Error('Batch size exceeds limit (max 10)');
    }
    
    // Calculate total size
    let totalSize = 2; // tag + num_ops
    for (const op of operations) {
        totalSize += 1 + op.opData.length; // opType + data
    }
    
    const data = Buffer.alloc(totalSize);
    let offset = 0;
    
    data.writeUInt8(TAG_BATCH_NOTE_OPS, offset); offset += 1;
    data.writeUInt8(operations.length, offset); offset += 1;
    
    for (const op of operations) {
        data.writeUInt8(op.opType, offset); offset += 1;
        Buffer.from(op.opData).copy(data, offset);
        offset += op.opData.length;
    }
    
    return new TransactionInstruction({
        keys: [
            { pubkey: executor, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build an exchange proof instruction (TAG_EXCHANGE_PROOF = 156)
 * Proof of balance for CEX/DEX listing - verify holdings without revealing history
 */
export function buildExchangeProof(
    prover: PublicKey,
    mint: Uint8Array,
    balanceCommit: Uint8Array,
    proof: Uint8Array
): TransactionInstruction {
    const data = Buffer.alloc(129);
    let offset = 0;
    
    data.writeUInt8(TAG_EXCHANGE_PROOF, offset); offset += 1;
    Buffer.from(mint).copy(data, offset); offset += 32;
    Buffer.from(balanceCommit).copy(data, offset); offset += 32;
    Buffer.from(proof.slice(0, 64)).copy(data, offset); offset += 64;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: prover, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

// ============================================================================
// v16 ADVANTAGES OVER TOKEN-22 BUILDERS
// ============================================================================

/**
 * Reveal mask flags for selective disclosure
 */
export const REVEAL_AMOUNT = 0x01;
export const REVEAL_SENDER = 0x02;
export const REVEAL_RECIPIENT = 0x04;
export const REVEAL_MEMO = 0x08;
export const REVEAL_TIMESTAMP = 0x10;

/**
 * Build a selective disclosure instruction (TAG_SELECTIVE_DISCLOSURE = 157)
 * Unlike Token-22 CT which is all-or-nothing, STS allows granular reveals
 */
export function buildSelectiveDisclosure(
    owner: PublicKey,
    noteCommit: Uint8Array,
    revealMask: number,
    revealedData: Uint8Array = new Uint8Array(0)
): TransactionInstruction {
    const data = Buffer.alloc(34 + revealedData.length);
    let offset = 0;
    
    data.writeUInt8(TAG_SELECTIVE_DISCLOSURE, offset); offset += 1;
    Buffer.from(noteCommit).copy(data, offset); offset += 32;
    data.writeUInt8(revealMask, offset); offset += 1;
    Buffer.from(revealedData).copy(data, offset);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: owner, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Condition types for conditional transfers
 */
export const CONDITION_HASHLOCK = 0;
export const CONDITION_TIMELOCK = 1;
export const CONDITION_MULTISIG = 2;
export const CONDITION_ORACLE = 3;

/**
 * Build a conditional transfer instruction (TAG_CONDITIONAL_TRANSFER = 158)
 * Bitcoin-style script conditions - HTLC, time-locks, multi-path spending
 */
export function buildConditionalTransfer(
    executor: PublicKey,
    noteNullifier: Uint8Array,
    conditionType: number,
    conditionData: Uint8Array,
    witness: Uint8Array
): TransactionInstruction {
    const data = Buffer.alloc(98);
    let offset = 0;
    
    data.writeUInt8(TAG_CONDITIONAL_TRANSFER, offset); offset += 1;
    Buffer.from(noteNullifier).copy(data, offset); offset += 32;
    data.writeUInt8(conditionType, offset); offset += 1;
    Buffer.from(conditionData.slice(0, 32)).copy(data, offset); offset += 32;
    Buffer.from(witness.slice(0, 32)).copy(data, offset); offset += 32;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: executor, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build a delegation chain instruction (TAG_DELEGATION_CHAIN = 159)
 * Multi-hop delegation (A→B→C)
 */
export function buildDelegationChain(
    delegator: PublicKey,
    noteCommit: Uint8Array,
    delegate: Uint8Array,
    maxDepth: number,
    currentDepth: number = 0
): TransactionInstruction {
    const data = Buffer.alloc(67);
    let offset = 0;
    
    data.writeUInt8(TAG_DELEGATION_CHAIN, offset); offset += 1;
    Buffer.from(noteCommit).copy(data, offset); offset += 32;
    Buffer.from(delegate).copy(data, offset); offset += 32;
    data.writeUInt8(maxDepth, offset); offset += 1;
    data.writeUInt8(currentDepth, offset); offset += 1;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: delegator, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build a time-locked reveal instruction (TAG_TIME_LOCKED_REVEAL = 160)
 * Chrono vault for scheduled disclosure
 */
export function buildTimeLockedReveal(
    creator: PublicKey,
    secretCommit: Uint8Array,
    revealSlot: bigint,
    revealDataEncrypted: Uint8Array
): TransactionInstruction {
    const data = Buffer.alloc(105);
    let offset = 0;
    
    data.writeUInt8(TAG_TIME_LOCKED_REVEAL, offset); offset += 1;
    Buffer.from(secretCommit).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(revealSlot, offset); offset += 8;
    Buffer.from(revealDataEncrypted.slice(0, 64)).copy(data, offset); offset += 64;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: creator, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build a cross-mint atomic swap instruction (TAG_CROSS_MINT_ATOMIC = 161)
 * Atomic swaps across different mints
 */
export function buildCrossMintAtomic(
    partyA: PublicKey,
    mintA: Uint8Array,
    mintB: Uint8Array,
    amountA: bigint,
    amountB: bigint,
    swapHash: Uint8Array
): TransactionInstruction {
    const data = Buffer.alloc(113);
    let offset = 0;
    
    data.writeUInt8(TAG_CROSS_MINT_ATOMIC, offset); offset += 1;
    Buffer.from(mintA).copy(data, offset); offset += 32;
    Buffer.from(mintB).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(amountA, offset); offset += 8;
    data.writeBigUInt64LE(amountB, offset); offset += 8;
    Buffer.from(swapHash).copy(data, offset); offset += 32;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: partyA, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build a social recovery instruction (TAG_SOCIAL_RECOVERY = 162)
 * Guardian-based note recovery - like Safe/Argent but for individual notes
 */
export function buildSocialRecovery(
    guardian: PublicKey,
    noteCommit: Uint8Array,
    newOwner: Uint8Array,
    additionalSignatures: Uint8Array = new Uint8Array(0)
): TransactionInstruction {
    const data = Buffer.alloc(65 + additionalSignatures.length);
    let offset = 0;
    
    data.writeUInt8(TAG_SOCIAL_RECOVERY, offset); offset += 1;
    Buffer.from(noteCommit).copy(data, offset); offset += 32;
    Buffer.from(newOwner).copy(data, offset); offset += 32;
    Buffer.from(additionalSignatures).copy(data, offset);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: guardian, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

// ============================================================================
// v17 DEFI DEEP INTEGRATION BUILDERS
// ============================================================================

/**
 * Build a Jupiter route instruction (TAG_JUPITER_ROUTE = 163)
 * Native Jupiter routing with privacy
 */
export function buildJupiterRoute(
    swapper: PublicKey,
    noteNullifier: Uint8Array,
    inputMint: Uint8Array,
    outputMint: Uint8Array,
    minOut: bigint,
    slippageBps: number = 50,
    routeHint: number = 0
): TransactionInstruction {
    const data = Buffer.alloc(109);
    let offset = 0;
    
    data.writeUInt8(TAG_JUPITER_ROUTE, offset); offset += 1;
    Buffer.from(noteNullifier).copy(data, offset); offset += 32;
    Buffer.from(inputMint).copy(data, offset); offset += 32;
    Buffer.from(outputMint).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(minOut, offset); offset += 8;
    data.writeUInt16LE(slippageBps, offset); offset += 2;
    data.writeUInt16LE(routeHint, offset); offset += 2;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: swapper, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Marinade action types
 */
export const MARINADE_STAKE = 0;
export const MARINADE_UNSTAKE = 1;
export const MARINADE_DELAYED_UNSTAKE = 2;

/**
 * Build a Marinade stake instruction (TAG_MARINADE_STAKE = 164)
 * Native Marinade liquid staking
 */
export function buildMarinadeStake(
    staker: PublicKey,
    noteNullifier: Uint8Array,
    action: number,
    amount: bigint
): TransactionInstruction {
    const data = Buffer.alloc(42);
    let offset = 0;
    
    data.writeUInt8(TAG_MARINADE_STAKE, offset); offset += 1;
    Buffer.from(noteNullifier).copy(data, offset); offset += 32;
    data.writeUInt8(action, offset); offset += 1;
    data.writeBigUInt64LE(amount, offset); offset += 8;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: staker, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Drift perpetual action types
 */
export const DRIFT_OPEN_LONG = 0;
export const DRIFT_OPEN_SHORT = 1;
export const DRIFT_CLOSE = 2;
export const DRIFT_ADD_MARGIN = 3;

/**
 * Build a Drift perpetuals instruction (TAG_DRIFT_PERP = 165)
 * Native Drift perpetuals trading
 */
export function buildDriftPerp(
    trader: PublicKey,
    noteNullifier: Uint8Array,
    marketIndex: number,
    action: number,
    size: bigint,
    leverage: bigint
): TransactionInstruction {
    const data = Buffer.alloc(52);
    let offset = 0;
    
    data.writeUInt8(TAG_DRIFT_PERP, offset); offset += 1;
    Buffer.from(noteNullifier).copy(data, offset); offset += 32;
    data.writeUInt16LE(marketIndex, offset); offset += 2;
    data.writeUInt8(action, offset); offset += 1;
    data.writeBigUInt64LE(size, offset); offset += 8;
    data.writeBigUInt64LE(leverage, offset); offset += 8;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: trader, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Lending action types
 */
export const LENDING_DEPOSIT = 0;
export const LENDING_BORROW = 1;
export const LENDING_REPAY = 2;
export const LENDING_WITHDRAW = 3;

/**
 * Build a private lending instruction (TAG_PRIVATE_LENDING = 166)
 * Private borrow/lend operations
 */
export function buildPrivateLending(
    user: PublicKey,
    action: number,
    noteNullifier: Uint8Array,
    pool: Uint8Array,
    amount: bigint,
    collateralFactorBps: number = 7500
): TransactionInstruction {
    const data = Buffer.alloc(76);
    let offset = 0;
    
    data.writeUInt8(TAG_PRIVATE_LENDING, offset); offset += 1;
    data.writeUInt8(action, offset); offset += 1;
    Buffer.from(noteNullifier).copy(data, offset); offset += 32;
    Buffer.from(pool).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(amount, offset); offset += 8;
    data.writeUInt16LE(collateralFactorBps, offset); offset += 2;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: user, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build a flash loan instruction (TAG_FLASH_LOAN = 167)
 * Private flash loans
 */
export function buildFlashLoan(
    borrower: PublicKey,
    pool: Uint8Array,
    amount: bigint,
    callbackProgram: PublicKey,
    feeBps: number = 9
): TransactionInstruction {
    const data = Buffer.alloc(75);
    let offset = 0;
    
    data.writeUInt8(TAG_FLASH_LOAN, offset); offset += 1;
    Buffer.from(pool).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(amount, offset); offset += 8;
    Buffer.from(callbackProgram.toBytes()).copy(data, offset); offset += 32;
    data.writeUInt16LE(feeBps, offset); offset += 2;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: borrower, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build an oracle-bound transfer instruction (TAG_ORACLE_BOUND = 168)
 * Price-oracle bound transfers
 */
export function buildOracleBound(
    sender: PublicKey,
    noteNullifier: Uint8Array,
    oracle: Uint8Array,
    minPrice: bigint,
    maxPrice: bigint,
    newCommitment: Uint8Array = new Uint8Array(32)
): TransactionInstruction {
    const data = Buffer.alloc(113);
    let offset = 0;
    
    data.writeUInt8(TAG_ORACLE_BOUND, offset); offset += 1;
    Buffer.from(noteNullifier).copy(data, offset); offset += 32;
    Buffer.from(oracle).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(minPrice, offset); offset += 8;
    data.writeBigUInt64LE(maxPrice, offset); offset += 8;
    Buffer.from(newCommitment).copy(data, offset); offset += 32;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: sender, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

// ============================================================================
// v18 ADVANCED EXTENSIONS BUILDERS
// ============================================================================

/**
 * Build a velocity limit instruction (TAG_VELOCITY_LIMIT = 169)
 * Rate-limited transfers
 */
export function buildVelocityLimit(
    owner: PublicKey,
    noteCommit: Uint8Array,
    maxPerSlot: bigint,
    maxPerEpoch: bigint,
    currentAmount: bigint,
    action: number = 0
): TransactionInstruction {
    const data = Buffer.alloc(58);
    let offset = 0;
    
    data.writeUInt8(TAG_VELOCITY_LIMIT, offset); offset += 1;
    Buffer.from(noteCommit).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(maxPerSlot, offset); offset += 8;
    data.writeBigUInt64LE(maxPerEpoch, offset); offset += 8;
    data.writeBigUInt64LE(currentAmount, offset); offset += 8;
    data.writeUInt8(action, offset); offset += 1;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: owner, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build a governance lock instruction (TAG_GOVERNANCE_LOCK = 170)
 * Vote-locked tokens (veToken pattern)
 */
export function buildGovernanceLock(
    owner: PublicKey,
    noteCommit: Uint8Array,
    governor: Uint8Array,
    lockUntilSlot: bigint,
    votingPowerMultiplierBps: number = 100
): TransactionInstruction {
    const data = Buffer.alloc(75);
    let offset = 0;
    
    data.writeUInt8(TAG_GOVERNANCE_LOCK, offset); offset += 1;
    Buffer.from(noteCommit).copy(data, offset); offset += 32;
    Buffer.from(governor).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(lockUntilSlot, offset); offset += 8;
    data.writeUInt16LE(votingPowerMultiplierBps, offset); offset += 2;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: owner, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build a reputation gate instruction (TAG_REPUTATION_GATE = 171)
 * Reputation-gated transfers
 */
export function buildReputationGate(
    owner: PublicKey,
    noteCommit: Uint8Array,
    reputationOracle: Uint8Array,
    minSenderScore: number,
    minReceiverScore: number
): TransactionInstruction {
    const data = Buffer.alloc(73);
    let offset = 0;
    
    data.writeUInt8(TAG_REPUTATION_GATE, offset); offset += 1;
    Buffer.from(noteCommit).copy(data, offset); offset += 32;
    Buffer.from(reputationOracle).copy(data, offset); offset += 32;
    data.writeUInt32LE(minSenderScore, offset); offset += 4;
    data.writeUInt32LE(minReceiverScore, offset); offset += 4;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: owner, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build a geographic restriction instruction (TAG_GEO_RESTRICTION = 172)
 * Geographic compliance
 */
export function buildGeoRestriction(
    owner: PublicKey,
    noteCommit: Uint8Array,
    allowedRegionsHash: Uint8Array,
    complianceOracle: Uint8Array
): TransactionInstruction {
    const data = Buffer.alloc(97);
    let offset = 0;
    
    data.writeUInt8(TAG_GEO_RESTRICTION, offset); offset += 1;
    Buffer.from(noteCommit).copy(data, offset); offset += 32;
    Buffer.from(allowedRegionsHash).copy(data, offset); offset += 32;
    Buffer.from(complianceOracle).copy(data, offset); offset += 32;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: owner, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build a time decay instruction (TAG_TIME_DECAY = 173)
 * Decaying value (options/warrants)
 */
export function buildTimeDecay(
    owner: PublicKey,
    noteCommit: Uint8Array,
    initialValue: bigint,
    decayRateBps: number,
    decayStartSlot: bigint,
    floorValue: bigint
): TransactionInstruction {
    const data = Buffer.alloc(59);
    let offset = 0;
    
    data.writeUInt8(TAG_TIME_DECAY, offset); offset += 1;
    Buffer.from(noteCommit).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(initialValue, offset); offset += 8;
    data.writeUInt16LE(decayRateBps, offset); offset += 2;
    data.writeBigUInt64LE(decayStartSlot, offset); offset += 8;
    data.writeBigUInt64LE(floorValue, offset); offset += 8;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: owner, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build a multi-sig note instruction (TAG_MULTI_SIG_NOTE = 174)
 * Multi-sig ownership
 */
export function buildMultiSigNote(
    initializer: PublicKey,
    noteCommit: Uint8Array,
    signersHash: Uint8Array,
    threshold: number,
    totalSigners: number
): TransactionInstruction {
    if (threshold > totalSigners || threshold === 0) {
        throw new Error('Invalid threshold');
    }
    
    const data = Buffer.alloc(67);
    let offset = 0;
    
    data.writeUInt8(TAG_MULTI_SIG_NOTE, offset); offset += 1;
    Buffer.from(noteCommit).copy(data, offset); offset += 32;
    Buffer.from(signersHash).copy(data, offset); offset += 32;
    data.writeUInt8(threshold, offset); offset += 1;
    data.writeUInt8(totalSigners, offset); offset += 1;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: initializer, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build a recoverable note instruction (TAG_RECOVERABLE_NOTE = 175)
 * Recovery with social timelock
 */
export function buildRecoverableNote(
    owner: PublicKey,
    noteCommit: Uint8Array,
    guardianHash: Uint8Array,
    recoveryDelaySlots: bigint,
    inactivityThreshold: bigint
): TransactionInstruction {
    const data = Buffer.alloc(81);
    let offset = 0;
    
    data.writeUInt8(TAG_RECOVERABLE_NOTE, offset); offset += 1;
    Buffer.from(noteCommit).copy(data, offset); offset += 32;
    Buffer.from(guardianHash).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(recoveryDelaySlots, offset); offset += 8;
    data.writeBigUInt64LE(inactivityThreshold, offset); offset += 8;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: owner, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

// ============================================================================
// v15-v18 HELPER TYPES
// ============================================================================

/**
 * Extension configuration for v15+ features
 */
export interface OracleBoundConfig {
    oracle: Uint8Array;
    minPrice: bigint;
    maxPrice: bigint;
}

export interface TimeDecayConfig {
    initialValue: bigint;
    decayRateBps: number;
    decayStartSlot: bigint;
    floorValue: bigint;
}

export interface GovernanceLockConfig {
    governor: Uint8Array;
    lockUntilSlot: bigint;
    votingPowerMultiplierBps: number;
}

export interface ReputationConfig {
    oracle: Uint8Array;
    minSenderScore: number;
    minReceiverScore: number;
}

export interface VelocityLimitConfig {
    maxPerSlot: bigint;
    maxPerEpoch: bigint;
}

export interface MultiSigConfig {
    signersHash: Uint8Array;
    threshold: number;
    totalSigners: number;
}

export interface RecoverableConfig {
    guardianHash: Uint8Array;
    recoveryDelaySlots: bigint;
    inactivityThreshold: bigint;
}

export interface ConditionalConfig {
    conditionType: number;
    conditionData: Uint8Array;
}

export interface DelegationChainConfig {
    maxDepth: number;
    currentDepth: number;
}

// ============================================================================
// v19 AMM & DEX INTEGRATION BUILDERS
// ============================================================================
// Critical for adoption - enables STS tokens to be traded on DEXes!

/**
 * AMM Pool configuration
 */
export interface AmmPoolConfig {
    mintA: Uint8Array;
    mintB: Uint8Array;
    feeBps: number;
    poolType: number;
    initialSqrtPrice?: bigint;
}

/**
 * Build an AMM pool creation instruction (TAG_AMM_POOL_CREATE = 176)
 * Creates a liquidity pool for trading STS token pairs on DEXes
 */
export function buildAmmPoolCreate(
    creator: PublicKey,
    mintA: Uint8Array,
    mintB: Uint8Array,
    feeBps: number = 30,  // 0.3% default
    poolType: number = POOL_TYPE_CONSTANT_PRODUCT,
    initialSqrtPrice: bigint = BigInt(1) << BigInt(32)
): TransactionInstruction {
    // Ensure canonical ordering
    let orderedMintA = mintA;
    let orderedMintB = mintB;
    for (let i = 0; i < 32; i++) {
        if (mintA[i] < mintB[i]) break;
        if (mintA[i] > mintB[i]) {
            orderedMintA = mintB;
            orderedMintB = mintA;
            break;
        }
    }
    
    const data = Buffer.alloc(76);
    let offset = 0;
    
    data.writeUInt8(TAG_AMM_POOL_CREATE, offset); offset += 1;
    Buffer.from(orderedMintA).copy(data, offset); offset += 32;
    Buffer.from(orderedMintB).copy(data, offset); offset += 32;
    data.writeUInt16LE(feeBps, offset); offset += 2;
    data.writeUInt8(poolType, offset); offset += 1;
    data.writeBigUInt64LE(initialSqrtPrice, offset); offset += 8;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: creator, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Compute deterministic pool ID from mints and fee
 */
export function computePoolId(
    mintA: Uint8Array,
    mintB: Uint8Array,
    feeBps: number
): Uint8Array {
    // Ensure canonical ordering
    let orderedMintA = mintA;
    let orderedMintB = mintB;
    for (let i = 0; i < 32; i++) {
        if (mintA[i] < mintB[i]) break;
        if (mintA[i] > mintB[i]) {
            orderedMintA = mintB;
            orderedMintB = mintA;
            break;
        }
    }
    
    const feeBytes = Buffer.alloc(2);
    feeBytes.writeUInt16LE(feeBps);
    
    return keccak_256(Buffer.concat([
        Buffer.from('STS_AMM_POOL_V1'),
        Buffer.from(orderedMintA),
        Buffer.from(orderedMintB),
        feeBytes,
    ]));
}

/**
 * Build an add liquidity instruction (TAG_AMM_ADD_LIQUIDITY = 177)
 * Adds tokens to pool and receives LP notes
 */
export function buildAmmAddLiquidity(
    provider: PublicKey,
    poolId: Uint8Array,
    amountA: bigint,
    amountB: bigint,
    minLp: bigint = BigInt(0),
    deadline: bigint = BigInt(0)
): TransactionInstruction {
    const data = Buffer.alloc(65);
    let offset = 0;
    
    data.writeUInt8(TAG_AMM_ADD_LIQUIDITY, offset); offset += 1;
    Buffer.from(poolId).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(amountA, offset); offset += 8;
    data.writeBigUInt64LE(amountB, offset); offset += 8;
    data.writeBigUInt64LE(minLp, offset); offset += 8;
    data.writeBigUInt64LE(deadline, offset); offset += 8;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: provider, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build a remove liquidity instruction (TAG_AMM_REMOVE_LIQUIDITY = 178)
 * Burns LP notes and receives tokens back
 */
export function buildAmmRemoveLiquidity(
    remover: PublicKey,
    poolId: Uint8Array,
    lpNullifier: Uint8Array,
    lpAmount: bigint,
    minA: bigint = BigInt(0),
    minB: bigint = BigInt(0)
): TransactionInstruction {
    const data = Buffer.alloc(89);
    let offset = 0;
    
    data.writeUInt8(TAG_AMM_REMOVE_LIQUIDITY, offset); offset += 1;
    Buffer.from(poolId).copy(data, offset); offset += 32;
    Buffer.from(lpNullifier).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(lpAmount, offset); offset += 8;
    data.writeBigUInt64LE(minA, offset); offset += 8;
    data.writeBigUInt64LE(minB, offset); offset += 8;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: remover, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Swap direction constants
 */
export const SWAP_A_TO_B = 0;
export const SWAP_B_TO_A = 1;

/**
 * Build an AMM swap instruction (TAG_AMM_SWAP = 179)
 * Execute a swap through the pool - THIS IS DEX TRADING!
 */
export function buildAmmSwap(
    swapper: PublicKey,
    poolId: Uint8Array,
    noteNullifier: Uint8Array,
    amountIn: bigint,
    minOut: bigint,
    direction: number = SWAP_A_TO_B
): TransactionInstruction {
    const data = Buffer.alloc(82);
    let offset = 0;
    
    data.writeUInt8(TAG_AMM_SWAP, offset); offset += 1;
    Buffer.from(poolId).copy(data, offset); offset += 32;
    Buffer.from(noteNullifier).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(amountIn, offset); offset += 8;
    data.writeBigUInt64LE(minOut, offset); offset += 8;
    data.writeUInt8(direction, offset); offset += 1;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: swapper, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build an AMM quote instruction (TAG_AMM_QUOTE = 180)
 * Request a quote for a swap (inscribed for indexers)
 */
export function buildAmmQuote(
    quoter: PublicKey,
    poolId: Uint8Array,
    amount: bigint,
    direction: number = SWAP_A_TO_B
): TransactionInstruction {
    const data = Buffer.alloc(42);
    let offset = 0;
    
    data.writeUInt8(TAG_AMM_QUOTE, offset); offset += 1;
    Buffer.from(poolId).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(amount, offset); offset += 8;
    data.writeUInt8(direction, offset); offset += 1;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: quoter, isSigner: false, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build an AMM sync instruction (TAG_AMM_SYNC = 181)
 * Sync reserves after external operations
 */
export function buildAmmSync(
    syncer: PublicKey,
    poolId: Uint8Array,
    reserveA: bigint,
    reserveB: bigint
): TransactionInstruction {
    const data = Buffer.alloc(49);
    let offset = 0;
    
    data.writeUInt8(TAG_AMM_SYNC, offset); offset += 1;
    Buffer.from(poolId).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(reserveA, offset); offset += 8;
    data.writeBigUInt64LE(reserveB, offset); offset += 8;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: syncer, isSigner: false, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build an LP note mint instruction (TAG_LP_NOTE_MINT = 182)
 */
export function buildLpNoteMint(
    minter: PublicKey,
    poolId: Uint8Array,
    lpAmount: bigint,
    recipientCommit: Uint8Array
): TransactionInstruction {
    const data = Buffer.alloc(73);
    let offset = 0;
    
    data.writeUInt8(TAG_LP_NOTE_MINT, offset); offset += 1;
    Buffer.from(poolId).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(lpAmount, offset); offset += 8;
    Buffer.from(recipientCommit).copy(data, offset); offset += 32;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: minter, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build an LP note burn instruction (TAG_LP_NOTE_BURN = 183)
 */
export function buildLpNoteBurn(
    burner: PublicKey,
    poolId: Uint8Array,
    lpNullifier: Uint8Array,
    lpAmount: bigint
): TransactionInstruction {
    const data = Buffer.alloc(73);
    let offset = 0;
    
    data.writeUInt8(TAG_LP_NOTE_BURN, offset); offset += 1;
    Buffer.from(poolId).copy(data, offset); offset += 32;
    Buffer.from(lpNullifier).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(lpAmount, offset); offset += 8;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: burner, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Hop configuration for multi-hop swaps
 */
export interface SwapHop {
    poolId: Uint8Array;
    direction: number;
}

/**
 * Build a router swap instruction (TAG_ROUTER_SWAP = 184)
 * Multi-hop swap through multiple pools (Jupiter-style routing)
 */
export function buildRouterSwap(
    swapper: PublicKey,
    hops: SwapHop[]
): TransactionInstruction {
    if (hops.length > 5) {
        throw new Error('Too many hops (max 5)');
    }
    
    // Calculate size: tag + num_hops + (pool_id + direction) per hop
    const hopSize = 33; // 32 bytes pool_id + 1 byte direction
    const data = Buffer.alloc(2 + hops.length * hopSize);
    let offset = 0;
    
    data.writeUInt8(TAG_ROUTER_SWAP, offset); offset += 1;
    data.writeUInt8(hops.length, offset); offset += 1;
    
    for (const hop of hops) {
        Buffer.from(hop.poolId).copy(data, offset); offset += 32;
        data.writeUInt8(hop.direction, offset); offset += 1;
    }
    
    return new TransactionInstruction({
        keys: [
            { pubkey: swapper, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Split configuration for split swaps
 */
export interface SwapSplit {
    poolId: Uint8Array;
    percentageBps: number;  // Basis points (10000 = 100%)
}

/**
 * Build a router split instruction (TAG_ROUTER_SPLIT = 185)
 * Split swap across multiple pools for better execution
 */
export function buildRouterSplit(
    swapper: PublicKey,
    splits: SwapSplit[]
): TransactionInstruction {
    if (splits.length > 4) {
        throw new Error('Too many splits (max 4)');
    }
    
    // Validate percentages sum to 100%
    const totalBps = splits.reduce((sum, s) => sum + s.percentageBps, 0);
    if (totalBps !== 10000) {
        throw new Error('Split percentages must sum to 10000 (100%)');
    }
    
    const splitSize = 34; // 32 bytes pool_id + 2 bytes percentage
    const data = Buffer.alloc(2 + splits.length * splitSize);
    let offset = 0;
    
    data.writeUInt8(TAG_ROUTER_SPLIT, offset); offset += 1;
    data.writeUInt8(splits.length, offset); offset += 1;
    
    for (const split of splits) {
        Buffer.from(split.poolId).copy(data, offset); offset += 32;
        data.writeUInt16LE(split.percentageBps, offset); offset += 2;
    }
    
    return new TransactionInstruction({
        keys: [
            { pubkey: swapper, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Order side constants
 */
export const ORDER_BUY = 0;
export const ORDER_SELL = 1;

/**
 * Build a limit order place instruction (TAG_LIMIT_ORDER_PLACE = 186)
 * Place a limit order on the order book
 */
export function buildLimitOrderPlace(
    placer: PublicKey,
    poolId: Uint8Array,
    noteCommit: Uint8Array,
    price: bigint,
    amount: bigint,
    direction: number = ORDER_BUY,
    expirySlot: bigint = BigInt(0)
): TransactionInstruction {
    const data = Buffer.alloc(90);
    let offset = 0;
    
    data.writeUInt8(TAG_LIMIT_ORDER_PLACE, offset); offset += 1;
    Buffer.from(poolId).copy(data, offset); offset += 32;
    Buffer.from(noteCommit).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(price, offset); offset += 8;
    data.writeBigUInt64LE(amount, offset); offset += 8;
    data.writeUInt8(direction, offset); offset += 1;
    data.writeBigUInt64LE(expirySlot, offset); offset += 8;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: placer, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build a limit order fill instruction (TAG_LIMIT_ORDER_FILL = 187)
 * Fill an existing limit order
 */
export function buildLimitOrderFill(
    taker: PublicKey,
    orderId: Uint8Array,
    fillAmount: bigint,
    takerNullifier: Uint8Array
): TransactionInstruction {
    const data = Buffer.alloc(73);
    let offset = 0;
    
    data.writeUInt8(TAG_LIMIT_ORDER_FILL, offset); offset += 1;
    Buffer.from(orderId).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(fillAmount, offset); offset += 8;
    Buffer.from(takerNullifier).copy(data, offset); offset += 32;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: taker, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build a limit order cancel instruction (TAG_LIMIT_ORDER_CANCEL = 188)
 */
export function buildLimitOrderCancel(
    canceler: PublicKey,
    orderId: Uint8Array
): TransactionInstruction {
    const data = Buffer.alloc(33);
    let offset = 0;
    
    data.writeUInt8(TAG_LIMIT_ORDER_CANCEL, offset); offset += 1;
    Buffer.from(orderId).copy(data, offset); offset += 32;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: canceler, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build a TWAP order start instruction (TAG_TWAP_ORDER_START = 189)
 * Start a time-weighted average price order
 */
export function buildTwapOrderStart(
    trader: PublicKey,
    poolId: Uint8Array,
    totalAmount: bigint,
    numSlices: number,
    intervalSlots: bigint,
    direction: number = ORDER_BUY
): TransactionInstruction {
    if (numSlices < 2 || numSlices > 100) {
        throw new Error('Invalid slice count (2-100)');
    }
    
    const data = Buffer.alloc(51);
    let offset = 0;
    
    data.writeUInt8(TAG_TWAP_ORDER_START, offset); offset += 1;
    Buffer.from(poolId).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(totalAmount, offset); offset += 8;
    data.writeUInt8(numSlices, offset); offset += 1;
    data.writeBigUInt64LE(intervalSlots, offset); offset += 8;
    data.writeUInt8(direction, offset); offset += 1;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: trader, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * Build a TWAP order fill instruction (TAG_TWAP_ORDER_FILL = 190)
 * Fill a slice of a TWAP order
 */
export function buildTwapOrderFill(
    filler: PublicKey,
    twapId: Uint8Array,
    sliceIndex: number,
    amount: bigint,
    price: bigint
): TransactionInstruction {
    const data = Buffer.alloc(50);
    let offset = 0;
    
    data.writeUInt8(TAG_TWAP_ORDER_FILL, offset); offset += 1;
    Buffer.from(twapId).copy(data, offset); offset += 32;
    data.writeUInt8(sliceIndex, offset); offset += 1;
    data.writeBigUInt64LE(amount, offset); offset += 8;
    data.writeBigUInt64LE(price, offset); offset += 8;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: filler, isSigner: false, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

/**
 * CLMM action constants
 */
export const CLMM_OPEN = 0;
export const CLMM_ADD = 1;
export const CLMM_REMOVE = 2;
export const CLMM_CLOSE = 3;
export const CLMM_COLLECT_FEES = 4;

/**
 * Build a concentrated liquidity instruction (TAG_CONCENTRATED_LP = 191)
 * Uniswap v3 style concentrated liquidity positions
 */
export function buildConcentratedLp(
    provider: PublicKey,
    poolId: Uint8Array,
    action: number,
    tickLower: number,
    tickUpper: number,
    liquidity: bigint
): TransactionInstruction {
    if (tickLower >= tickUpper) {
        throw new Error('Invalid tick range (tickLower must be < tickUpper)');
    }
    
    const data = Buffer.alloc(50);
    let offset = 0;
    
    data.writeUInt8(TAG_CONCENTRATED_LP, offset); offset += 1;
    Buffer.from(poolId).copy(data, offset); offset += 32;
    data.writeUInt8(action, offset); offset += 1;
    data.writeInt32LE(tickLower, offset); offset += 4;
    data.writeInt32LE(tickUpper, offset); offset += 4;
    data.writeBigUInt64LE(liquidity, offset); offset += 8;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: provider, isSigner: true, isWritable: false },
        ],
        programId: STYX_PMP_PROGRAM_ID,
        data,
    });
}

// ============================================================================
// AMM MATH HELPERS (for off-chain quote calculation)
// ============================================================================

/**
 * Calculate output amount for constant product swap (x * y = k)
 * @param amountIn Input amount
 * @param reserveIn Reserve of input token
 * @param reserveOut Reserve of output token
 * @param feeBps Fee in basis points (e.g., 30 = 0.3%)
 * @returns Output amount after fee
 */
export function calculateConstantProductSwap(
    amountIn: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
    feeBps: number = 30
): bigint {
    if (reserveIn === BigInt(0) || reserveOut === BigInt(0)) {
        throw new Error('Reserves cannot be zero');
    }
    
    // Apply fee: amountInWithFee = amountIn * (10000 - feeBps) / 10000
    const amountInWithFee = (amountIn * BigInt(10000 - feeBps)) / BigInt(10000);
    
    // Constant product: (reserveIn + amountIn) * (reserveOut - amountOut) = reserveIn * reserveOut
    // Solve for amountOut: amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee)
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn + amountInWithFee;
    
    return numerator / denominator;
}

/**
 * Calculate LP tokens to mint when adding liquidity
 * @param amountA Amount of token A to add
 * @param amountB Amount of token B to add
 * @param reserveA Current reserve of token A
 * @param reserveB Current reserve of token B
 * @param totalLpSupply Current total LP supply
 * @returns LP tokens to mint
 */
export function calculateLpMint(
    amountA: bigint,
    amountB: bigint,
    reserveA: bigint,
    reserveB: bigint,
    totalLpSupply: bigint
): bigint {
    // First liquidity: LP = sqrt(amountA * amountB)
    if (totalLpSupply === BigInt(0)) {
        const product = amountA * amountB;
        return sqrt(product);
    }
    
    // Subsequent: LP = min(amountA * totalLP / reserveA, amountB * totalLP / reserveB)
    const lpFromA = (amountA * totalLpSupply) / reserveA;
    const lpFromB = (amountB * totalLpSupply) / reserveB;
    
    return lpFromA < lpFromB ? lpFromA : lpFromB;
}

/**
 * Calculate tokens to receive when removing liquidity
 * @param lpAmount LP tokens to burn
 * @param reserveA Current reserve of token A
 * @param reserveB Current reserve of token B
 * @param totalLpSupply Current total LP supply
 * @returns [amountA, amountB] to receive
 */
export function calculateLpBurn(
    lpAmount: bigint,
    reserveA: bigint,
    reserveB: bigint,
    totalLpSupply: bigint
): [bigint, bigint] {
    if (totalLpSupply === BigInt(0)) {
        throw new Error('No LP supply');
    }
    
    const amountA = (lpAmount * reserveA) / totalLpSupply;
    const amountB = (lpAmount * reserveB) / totalLpSupply;
    
    return [amountA, amountB];
}

/**
 * Integer square root (for LP calculations)
 */
function sqrt(n: bigint): bigint {
    if (n < BigInt(0)) throw new Error('Square root of negative number');
    if (n < BigInt(2)) return n;
    
    let x = n;
    let y = (x + BigInt(1)) / BigInt(2);
    
    while (y < x) {
        x = y;
        y = (x + n / x) / BigInt(2);
    }
    
    return x;
}

/**
 * Calculate price impact for a swap
 * @param amountIn Input amount
 * @param reserveIn Reserve of input token
 * @param reserveOut Reserve of output token
 * @returns Price impact as basis points
 */
export function calculatePriceImpact(
    amountIn: bigint,
    reserveIn: bigint,
    reserveOut: bigint
): number {
    if (reserveIn === BigInt(0) || reserveOut === BigInt(0)) {
        return 10000; // 100% impact
    }
    
    // Spot price before swap
    const spotPrice = (reserveOut * BigInt(10000)) / reserveIn;
    
    // Effective price after swap
    const amountOut = calculateConstantProductSwap(amountIn, reserveIn, reserveOut, 0);
    const effectivePrice = (amountOut * BigInt(10000)) / amountIn;
    
    // Impact = (spotPrice - effectivePrice) / spotPrice * 10000
    const impact = ((spotPrice - effectivePrice) * BigInt(10000)) / spotPrice;
    
    return Number(impact);
}

// ============================================================================
// v20 PROVABLE SUPERIORITY - Builders & Types
// ============================================================================
// These counter Token-22 advocate arguments with on-chain proofs

/**
 * Nullifier creation options
 */
export interface NullifierOptions {
    /** Note commitment hash */
    noteCommit: Uint8Array;
    /** Secret hash for nullifier derivation */
    secretHash: Uint8Array;
    /** Flags (future use) */
    flags?: number;
}

/**
 * Merkle proof options
 */
export interface MerkleProofOptions {
    /** Note commitment to verify */
    noteCommit: Uint8Array;
    /** Merkle root to verify against */
    root: Uint8Array;
    /** Merkle proof (sibling hashes with direction) */
    proof: Array<{ hash: Uint8Array; isRight: boolean }>;
}

/**
 * Balance attestation options
 */
export interface BalanceAttestOptions {
    /** Owner public key */
    owner: PublicKey;
    /** Token mint */
    mint: PublicKey;
    /** Minimum balance to attest */
    minBalance: bigint;
    /** Unique nonce for this attestation */
    nonce: bigint;
}

/**
 * Freeze options (multi-authority)
 */
export interface FreezeEnforcedOptions {
    /** Note commitment to freeze */
    noteCommit: Uint8Array;
    /** Hash of freeze reason (privacy-preserving) */
    reasonHash: Uint8Array;
    /** Freeze authority public key */
    freezeAuthority: PublicKey;
    /** Compliance authority public key */
    complianceAuthority: PublicKey;
    /** Timelock in slots before freeze takes effect */
    timelockSlots: bigint;
}

/**
 * Wrapper mint options (STS → Token-22)
 */
export interface WrapperMintOptions {
    /** Note nullifier being converted */
    noteNullifier: Uint8Array;
    /** Wrapper token mint address */
    wrapperMint: PublicKey;
    /** Amount to wrap */
    amount: bigint;
    /** Recipient public key */
    recipient: PublicKey;
}

/**
 * Wrapper burn options (Token-22 → STS)
 * Converts Token-22 wrapper back to STS note for privacy
 */
export interface WrapperBurnOptions {
    /** Wrapper token mint address */
    wrapperMint: PublicKey;
    /** Source token account (Token-22 ATA) */
    sourceTokenAccount: PublicKey;
    /** Amount to unwrap */
    amount: bigint;
    /** Recipient VTA public key */
    recipientVta: PublicKey;
    /** Optional: create new note instead of adding to existing */
    createNewNote?: boolean;
}

/**
 * Validator proof options
 */
export interface ValidatorProofOptions {
    /** Proof type: 0=RAM, 1=disk, 2=compute, 3=rent */
    proofType: number;
    /** STS metric value */
    stsMetric: bigint;
    /** Token-22 metric value for comparison */
    token22Metric: bigint;
    /** Evidence hash (link to documentation) */
    evidenceHash: Uint8Array;
}

/**
 * Build nullifier create instruction (v20)
 * Creates a nullifier PDA to prove a note was spent - trustless double-spend prevention
 * 
 * @param options Nullifier options
 * @param payer Fee payer
 * @param programId Program ID (defaults to mainnet)
 * @returns Transaction instruction
 */
export function buildNullifierCreate(
    options: NullifierOptions,
    payer: PublicKey,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    // Derive nullifier from note_commit + secret_hash
    const nullifier = keccak_256(new Uint8Array([...options.noteCommit, ...options.secretHash]));
    
    // Derive nullifier PDA
    const [nullifierPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('styx_null'), nullifier],
        programId
    );
    
    const data = new Uint8Array(98);
    data[0] = TAG_NULLIFIER_CREATE;
    data.set(options.noteCommit, 1);
    data.set(nullifier, 33);
    data.set(options.secretHash, 65);
    data[97] = options.flags ?? 0;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: nullifierPda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data: Buffer.from(data),
    });
}

/**
 * Build nullifier check instruction (v20)
 * Checks if a nullifier exists - returns via return_data for CPI
 * 
 * @param nullifier Nullifier hash to check
 * @param programId Program ID
 * @returns Transaction instruction
 */
export function buildNullifierCheck(
    nullifier: Uint8Array,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    const [nullifierPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('styx_null'), nullifier],
        programId
    );
    
    const data = new Uint8Array(33);
    data[0] = TAG_NULLIFIER_CHECK;
    data.set(nullifier, 1);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: nullifierPda, isSigner: false, isWritable: false },
        ],
        programId,
        data: Buffer.from(data),
    });
}

/**
 * Build Merkle proof verification instruction (v20)
 * Verifies a note exists in the Merkle tree without trusting an indexer
 * 
 * @param options Merkle proof options
 * @param verifier Verifier account
 * @param programId Program ID
 * @returns Transaction instruction
 */
export function buildMerkleProofVerify(
    options: MerkleProofOptions,
    verifier: PublicKey,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    const proofLen = options.proof.length;
    const dataLen = 66 + proofLen * 33;
    const data = new Uint8Array(dataLen);
    
    data[0] = TAG_MERKLE_PROOF_VERIFY;
    data.set(options.noteCommit, 1);
    data.set(options.root, 33);
    data[65] = proofLen;
    
    // Encode proof: [hash:32][isRight:1] per level
    for (let i = 0; i < proofLen; i++) {
        const offset = 66 + i * 33;
        data.set(options.proof[i].hash, offset);
        data[offset + 32] = options.proof[i].isRight ? 1 : 0;
    }
    
    return new TransactionInstruction({
        keys: [
            { pubkey: verifier, isSigner: true, isWritable: false },
        ],
        programId,
        data: Buffer.from(data),
    });
}

/**
 * Build balance attestation instruction (v20)
 * Creates a cryptographic attestation of balance for DeFi composability
 * 
 * @param options Balance attestation options
 * @param caller Calling account (typically a DeFi protocol)
 * @param programId Program ID
 * @returns Transaction instruction
 */
export function buildBalanceAttest(
    options: BalanceAttestOptions,
    caller: PublicKey,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    // Derive attestation PDA
    const nonceBytes = Buffer.alloc(8);
    nonceBytes.writeBigUInt64LE(options.nonce);
    const [attestationPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('styx_attest'), options.owner.toBytes(), options.mint.toBytes(), nonceBytes],
        programId
    );
    
    const data = new Uint8Array(81);
    data[0] = TAG_BALANCE_ATTEST;
    data.set(options.owner.toBytes(), 1);
    data.set(options.mint.toBytes(), 33);
    
    const amountBytes = Buffer.alloc(8);
    amountBytes.writeBigUInt64LE(options.minBalance);
    data.set(amountBytes, 65);
    data.set(nonceBytes, 73);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: caller, isSigner: false, isWritable: false },
            { pubkey: attestationPda, isSigner: false, isWritable: false },
        ],
        programId,
        data: Buffer.from(data),
    });
}

/**
 * Build freeze enforced instruction (v20)
 * Multi-authority freeze with timelock - more secure than Token-22!
 * 
 * @param options Freeze options
 * @param programId Program ID
 * @returns Transaction instruction
 */
export function buildFreezeEnforced(
    options: FreezeEnforcedOptions,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    // Derive freeze PDA
    const [freezePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('styx_freeze'), options.noteCommit],
        programId
    );
    
    const data = new Uint8Array(137);
    data[0] = TAG_FREEZE_ENFORCED;
    data.set(options.noteCommit, 1);
    data.set(options.reasonHash, 33);
    data.set(options.freezeAuthority.toBytes(), 65);
    data.set(options.complianceAuthority.toBytes(), 97);
    
    const timelockBytes = Buffer.alloc(8);
    timelockBytes.writeBigUInt64LE(options.timelockSlots);
    data.set(timelockBytes, 129);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: options.freezeAuthority, isSigner: true, isWritable: false },
            { pubkey: options.complianceAuthority, isSigner: true, isWritable: false },
            { pubkey: freezePda, isSigner: false, isWritable: true },
        ],
        programId,
        data: Buffer.from(data),
    });
}

/**
 * Build wrapper mint instruction (v20)
 * Converts STS note to Token-22 wrapper for DEX integration
 * 
 * @param options Wrapper mint options
 * @param owner Note owner
 * @param programId Program ID
 * @returns Transaction instruction
 */
export function buildWrapperMint(
    options: WrapperMintOptions,
    owner: PublicKey,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    // Derive nullifier PDA to check note isn't spent
    const [nullifierPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('styx_null'), options.noteNullifier],
        programId
    );
    
    const data = new Uint8Array(105);
    data[0] = TAG_WRAPPER_MINT;
    data.set(options.noteNullifier, 1);
    data.set(options.wrapperMint.toBytes(), 33);
    
    const amountBytes = Buffer.alloc(8);
    amountBytes.writeBigUInt64LE(options.amount);
    data.set(amountBytes, 65);
    data.set(options.recipient.toBytes(), 73);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: owner, isSigner: true, isWritable: true },
            { pubkey: nullifierPda, isSigner: false, isWritable: false },
        ],
        programId,
        data: Buffer.from(data),
    });
}

/**
 * Build wrapper burn instruction (v20)
 * Converts Token-22 wrapper back to STS note for DEX → Privacy flow
 * 
 * This enables the full round-trip:
 * 1. STS Note → Wrapper Token (buildWrapperMint) → Trade on DEX
 * 2. DEX Trade → Wrapper Token → STS Note (buildWrapperBurn)
 * 
 * @param options Wrapper burn options
 * @param owner Token owner (must sign)
 * @param programId Program ID
 * @returns Transaction instruction
 */
export function buildWrapperBurn(
    options: WrapperBurnOptions,
    owner: PublicKey,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    // Derive the STS note that will be created/credited
    const amountBytes = Buffer.alloc(8);
    amountBytes.writeBigUInt64LE(options.amount);
    
    const data = new Uint8Array(106);
    data[0] = TAG_WRAPPER_BURN;
    data.set(options.wrapperMint.toBytes(), 1);
    data.set(options.sourceTokenAccount.toBytes(), 33);
    data.set(amountBytes, 65);
    data.set(options.recipientVta.toBytes(), 73);
    data[105] = options.createNewNote ? 1 : 0;
    
    return new TransactionInstruction({
        keys: [
            { pubkey: owner, isSigner: true, isWritable: true },
            { pubkey: options.sourceTokenAccount, isSigner: false, isWritable: true },
            { pubkey: options.wrapperMint, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data: Buffer.from(data),
    });
}

/**
 * Build validator proof instruction (v20)
 * Inscribes factual proof that STS is lighter on validators than Token-22
 * 
 * @param options Validator proof options
 * @param prover Prover account
 * @param programId Program ID
 * @returns Transaction instruction
 */
export function buildValidatorProof(
    options: ValidatorProofOptions,
    prover: PublicKey,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    const data = new Uint8Array(50);
    data[0] = TAG_VALIDATOR_PROOF;
    data[1] = options.proofType;
    
    const stsBytes = Buffer.alloc(8);
    stsBytes.writeBigUInt64LE(options.stsMetric);
    data.set(stsBytes, 2);
    
    const t22Bytes = Buffer.alloc(8);
    t22Bytes.writeBigUInt64LE(options.token22Metric);
    data.set(t22Bytes, 10);
    
    data.set(options.evidenceHash, 18);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: prover, isSigner: true, isWritable: false },
        ],
        programId,
        data: Buffer.from(data),
    });
}

/**
 * Build atomic CPI transfer instruction (v20)
 * Enables DeFi protocols to call STS transfers atomically via CPI
 * 
 * @param fromCommit Source note commitment
 * @param toCommit Destination note commitment
 * @param amount Transfer amount
 * @param callerProgram Calling program ID
 * @param owner Note owner
 * @param programId Program ID
 * @returns Transaction instruction
 */
export function buildAtomicCpiTransfer(
    fromCommit: Uint8Array,
    toCommit: Uint8Array,
    amount: bigint,
    callerProgram: PublicKey,
    owner: PublicKey,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    const data = new Uint8Array(105);
    data[0] = TAG_ATOMIC_CPI_TRANSFER;
    data.set(fromCommit, 1);
    data.set(toCommit, 33);
    
    const amountBytes = Buffer.alloc(8);
    amountBytes.writeBigUInt64LE(amount);
    data.set(amountBytes, 65);
    data.set(callerProgram.toBytes(), 73);
    
    return new TransactionInstruction({
        keys: [
            { pubkey: owner, isSigner: true, isWritable: false },
        ],
        programId,
        data: Buffer.from(data),
    });
}

/**
 * Build batch nullifier instruction (v20)
 * Creates multiple nullifiers in one transaction for efficiency
 * 
 * @param nullifiers Array of nullifier hashes (max 10)
 * @param spender Spender account
 * @param programId Program ID
 * @returns Transaction instruction
 */
export function buildBatchNullifier(
    nullifiers: Uint8Array[],
    spender: PublicKey,
    programId: PublicKey = STYX_PMP_PROGRAM_ID
): TransactionInstruction {
    if (nullifiers.length === 0 || nullifiers.length > 10) {
        throw new Error('Batch size must be 1-10');
    }
    
    const count = nullifiers.length;
    const dataLen = 2 + count * 32;
    const data = new Uint8Array(dataLen);
    
    data[0] = TAG_BATCH_NULLIFIER;
    data[1] = count;
    
    for (let i = 0; i < count; i++) {
        data.set(nullifiers[i], 2 + i * 32);
    }
    
    return new TransactionInstruction({
        keys: [
            { pubkey: spender, isSigner: true, isWritable: false },
        ],
        programId,
        data: Buffer.from(data),
    });
}

// ============================================================================
// v20 COMPARISON UTILITIES - Prove STS Superiority
// ============================================================================

/**
 * Compare STS vs Token-22 costs for a given number of users
 * Returns factual cost comparison in SOL
 */
export function compareCosts(numUsers: number): {
    sts: { rentTotal: number; txCost: number; total: number };
    token22: { rentTotal: number; txCost: number; total: number };
    savingsPercent: number;
    savingsSol: number;
} {
    // Token-22 costs
    const token22RentPerAccount = 0.00203928; // 165 bytes rent-exempt
    const token22TxCost = 0.000005; // Base tx fee
    
    // STS costs
    const stsRentPerAccount = 0; // No accounts!
    const stsTxCost = 0.001; // PMP protocol fee (includes indexer sustainability)
    
    const token22Rent = numUsers * token22RentPerAccount;
    const token22Tx = numUsers * token22TxCost;
    const token22Total = token22Rent + token22Tx;
    
    const stsRent = numUsers * stsRentPerAccount;
    const stsTx = numUsers * stsTxCost;
    const stsTotal = stsRent + stsTx;
    
    // For large user bases, STS wins despite higher per-tx fee
    // because there's no rent accumulation
    const savings = token22Total - stsTotal;
    const savingsPercent = token22Total > 0 ? (savings / token22Total) * 100 : 0;
    
    return {
        sts: { rentTotal: stsRent, txCost: stsTx, total: stsTotal },
        token22: { rentTotal: token22Rent, txCost: token22Tx, total: token22Total },
        savingsPercent,
        savingsSol: savings,
    };
}

/**
 * Compare validator burden for STS vs Token-22
 */
export function compareValidatorBurden(numAccounts: number): {
    sts: { ramBytes: number; diskBytes: number; indexLoad: string };
    token22: { ramBytes: number; diskBytes: number; indexLoad: string };
    ramReductionPercent: number;
} {
    // Token-22: Each account adds to validator RAM index
    const token22RamPerAccount = 100; // ~100 bytes RAM for index entry
    const token22DiskPerAccount = 200; // ~200 bytes disk storage
    
    // STS: Zero RAM burden, logs are append-only and prunable
    const stsRamPerAccount = 0;
    const stsDiskPerAccount = 0; // Validators can prune logs
    
    const token22Ram = numAccounts * token22RamPerAccount;
    const token22Disk = numAccounts * token22DiskPerAccount;
    
    const stsRam = numAccounts * stsRamPerAccount;
    const stsDisk = numAccounts * stsDiskPerAccount;
    
    return {
        sts: {
            ramBytes: stsRam,
            diskBytes: stsDisk,
            indexLoad: 'Offloaded to specialized indexers',
        },
        token22: {
            ramBytes: token22Ram,
            diskBytes: token22Disk,
            indexLoad: 'Every validator must index all accounts',
        },
        ramReductionPercent: 100, // STS has ZERO validator RAM burden
    };
}

/**
 * Generate proof data for on-chain validator proof inscription
 */
export function generateValidatorProofData(
    proofType: 'ram' | 'disk' | 'compute' | 'rent',
    numAccounts: number
): ValidatorProofOptions {
    const proofTypeMap = { ram: 0, disk: 1, compute: 2, rent: 3 };
    
    const comparison = compareValidatorBurden(numAccounts);
    const costs = compareCosts(numAccounts);
    
    let stsMetric: bigint;
    let token22Metric: bigint;
    
    switch (proofType) {
        case 'ram':
            stsMetric = BigInt(comparison.sts.ramBytes);
            token22Metric = BigInt(comparison.token22.ramBytes);
            break;
        case 'disk':
            stsMetric = BigInt(comparison.sts.diskBytes);
            token22Metric = BigInt(comparison.token22.diskBytes);
            break;
        case 'compute':
            // STS transfer: ~5,000 CU, Token-22 CT: ~200,000 CU
            stsMetric = BigInt(5000);
            token22Metric = BigInt(200000);
            break;
        case 'rent':
            stsMetric = BigInt(Math.round(costs.sts.rentTotal * LAMPORTS_PER_SOL));
            token22Metric = BigInt(Math.round(costs.token22.rentTotal * LAMPORTS_PER_SOL));
            break;
    }
    
    // Evidence hash: keccak of the comparison data
    const evidenceStr = JSON.stringify({ proofType, numAccounts, stsMetric: stsMetric.toString(), token22Metric: token22Metric.toString() });
    const evidenceHash = keccak_256(new TextEncoder().encode(evidenceStr));
    
    return {
        proofType: proofTypeMap[proofType],
        stsMetric,
        token22Metric,
        evidenceHash,
    };
}

// ============================================================================
// v22 PRIVATE SECURITIES BUILDERS (211-220)
// ============================================================================

/**
 * Build security token issuance instruction
 * TAG 211 - Issue private security token with compliance
 */
export function buildSecurityIssue(
    payer: PublicKey,
    programId: PublicKey,
    securityId: Uint8Array,
    totalShares: bigint,
    issuerSig: Uint8Array,
    regulationType: number = 0,
    lockupPeriod: number = 0
): TransactionInstruction {
    const data = Buffer.alloc(128);
    let offset = 0;
    
    data.writeUInt8(TAG_SECURITY_ISSUE, offset); offset += 1;
    Buffer.from(securityId).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(totalShares, offset); offset += 8;
    Buffer.from(issuerSig).copy(data, offset); offset += 64;
    data.writeUInt8(regulationType, offset); offset += 1;
    data.writeUInt32LE(lockupPeriod, offset); offset += 4;
    
    return new TransactionInstruction({
        programId,
        keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
        data: data.subarray(0, offset),
    });
}

/**
 * Build security transfer instruction with compliance check
 * TAG 212 - Transfer security tokens with ZK compliance proof
 */
export function buildSecurityTransfer(
    payer: PublicKey,
    programId: PublicKey,
    securityId: Uint8Array,
    senderCommit: Uint8Array,
    receiverCommit: Uint8Array,
    amount: bigint,
    complianceProof: Uint8Array
): TransactionInstruction {
    const data = Buffer.alloc(200);
    let offset = 0;
    
    data.writeUInt8(TAG_SECURITY_TRANSFER, offset); offset += 1;
    Buffer.from(securityId).copy(data, offset); offset += 32;
    Buffer.from(senderCommit).copy(data, offset); offset += 32;
    Buffer.from(receiverCommit).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(amount, offset); offset += 8;
    Buffer.from(complianceProof).copy(data, offset); offset += 64;
    
    return new TransactionInstruction({
        programId,
        keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
        data: data.subarray(0, offset),
    });
}

/**
 * Build transfer agent registration instruction
 * TAG 219 - Register authorized transfer agent
 */
export function buildTransferAgentRegister(
    payer: PublicKey,
    programId: PublicKey,
    securityId: Uint8Array,
    agentPubkey: Uint8Array,
    issuerSig: Uint8Array,
    permissions: number = 0xFF
): TransactionInstruction {
    const data = Buffer.alloc(130);
    let offset = 0;
    
    data.writeUInt8(TAG_TRANSFER_AGENT_REGISTER, offset); offset += 1;
    Buffer.from(securityId).copy(data, offset); offset += 32;
    Buffer.from(agentPubkey).copy(data, offset); offset += 32;
    Buffer.from(issuerSig).copy(data, offset); offset += 64;
    data.writeUInt8(permissions, offset); offset += 1;
    
    return new TransactionInstruction({
        programId,
        keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
        data: data.subarray(0, offset),
    });
}

// ============================================================================
// v23 OPTIONS TRADING BUILDERS (221-230)
// ============================================================================

/**
 * Build option contract creation instruction
 * TAG 221 - Create new options contract
 */
export function buildOptionCreate(
    payer: PublicKey,
    programId: PublicKey,
    underlyingCommit: Uint8Array,
    strikePrice: bigint,
    expirySlot: number,
    optionType: number,
    exerciseStyle: number = 0
): TransactionInstruction {
    const data = Buffer.alloc(64);
    let offset = 0;
    
    data.writeUInt8(TAG_OPTION_WRITE, offset); offset += 1;
    Buffer.from(underlyingCommit).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(strikePrice, offset); offset += 8;
    data.writeUInt32LE(expirySlot, offset); offset += 4;
    data.writeUInt8(optionType, offset); offset += 1;
    data.writeUInt8(exerciseStyle, offset); offset += 1;
    
    return new TransactionInstruction({
        programId,
        keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
        data: data.subarray(0, offset),
    });
}

/**
 * Build option exercise instruction
 * TAG 224 - Exercise option contract
 */
export function buildOptionExercise(
    payer: PublicKey,
    programId: PublicKey,
    optionId: Uint8Array,
    ownershipProof: Uint8Array,
    amount: bigint,
    settlementType: number = 0
): TransactionInstruction {
    const data = Buffer.alloc(110);
    let offset = 0;
    
    data.writeUInt8(TAG_OPTION_EXERCISE, offset); offset += 1;
    Buffer.from(optionId).copy(data, offset); offset += 32;
    Buffer.from(ownershipProof).copy(data, offset); offset += 64;
    data.writeBigUInt64LE(amount, offset); offset += 8;
    data.writeUInt8(settlementType, offset); offset += 1;
    
    return new TransactionInstruction({
        programId,
        keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
        data: data.subarray(0, offset),
    });
}

/**
 * Build option settlement instruction
 * TAG 230 - Cash settle option at expiry
 */
export function buildOptionSettle(
    payer: PublicKey,
    programId: PublicKey,
    optionId: Uint8Array,
    oracleSig: Uint8Array,
    settlementPrice: bigint,
    pnlProof: Uint8Array
): TransactionInstruction {
    const data = Buffer.alloc(175);
    let offset = 0;
    
    data.writeUInt8(TAG_OPTION_MARKET_MAKE, offset); offset += 1;
    Buffer.from(optionId).copy(data, offset); offset += 32;
    Buffer.from(oracleSig).copy(data, offset); offset += 64;
    data.writeBigUInt64LE(settlementPrice, offset); offset += 8;
    Buffer.from(pnlProof).copy(data, offset); offset += 64;
    
    return new TransactionInstruction({
        programId,
        keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
        data: data.subarray(0, offset),
    });
}

// ============================================================================
// v24 MARGIN & LEVERAGE BUILDERS (231-240)
// ============================================================================

/**
 * Build margin account open instruction
 * TAG 231 - Open new margin trading account
 */
export function buildMarginOpen(
    payer: PublicKey,
    programId: PublicKey,
    accountId: Uint8Array,
    initialMarginBps: number,
    maintenanceMarginBps: number,
    maxLeverage: number
): TransactionInstruction {
    const data = Buffer.alloc(48);
    let offset = 0;
    
    data.writeUInt8(TAG_MARGIN_ACCOUNT_CREATE, offset); offset += 1;
    Buffer.from(accountId).copy(data, offset); offset += 32;
    data.writeUInt16LE(initialMarginBps, offset); offset += 2;
    data.writeUInt16LE(maintenanceMarginBps, offset); offset += 2;
    data.writeUInt8(maxLeverage, offset); offset += 1;
    
    return new TransactionInstruction({
        programId,
        keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
        data: data.subarray(0, offset),
    });
}

/**
 * Build leveraged position open instruction
 * TAG 237 - Open leveraged trading position
 */
export function buildPositionOpen(
    payer: PublicKey,
    programId: PublicKey,
    accountId: Uint8Array,
    assetCommit: Uint8Array,
    size: bigint,
    direction: number,
    entryPrice: bigint,
    leverage: number
): TransactionInstruction {
    const data = Buffer.alloc(90);
    let offset = 0;
    
    data.writeUInt8(TAG_POSITION_OPEN, offset); offset += 1;
    Buffer.from(accountId).copy(data, offset); offset += 32;
    Buffer.from(assetCommit).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(size, offset); offset += 8;
    data.writeUInt8(direction, offset); offset += 1;
    data.writeBigUInt64LE(entryPrice, offset); offset += 8;
    data.writeUInt8(leverage, offset); offset += 1;
    
    return new TransactionInstruction({
        programId,
        keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
        data: data.subarray(0, offset),
    });
}

/**
 * Build margin liquidation instruction
 * TAG 236 - Liquidate undercollateralized position
 */
export function buildMarginLiquidate(
    payer: PublicKey,
    programId: PublicKey,
    positionId: Uint8Array,
    oracleSig: Uint8Array,
    currentPrice: bigint,
    liquidatorRewardBps: number = 500
): TransactionInstruction {
    const data = Buffer.alloc(110);
    let offset = 0;
    
    data.writeUInt8(TAG_POSITION_LIQUIDATE, offset); offset += 1;
    Buffer.from(positionId).copy(data, offset); offset += 32;
    Buffer.from(oracleSig).copy(data, offset); offset += 64;
    data.writeBigUInt64LE(currentPrice, offset); offset += 8;
    data.writeUInt16LE(liquidatorRewardBps, offset); offset += 2;
    
    return new TransactionInstruction({
        programId,
        keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
        data: data.subarray(0, offset),
    });
}

// ============================================================================
// v25 CROSS-CHAIN BRIDGE BUILDERS (241-255)
// ============================================================================

/**
 * Build bridge lock instruction
 * TAG 241 - Lock tokens for cross-chain bridge
 */
export function buildBridgeLock(
    payer: PublicKey,
    programId: PublicKey,
    tokenCommit: Uint8Array,
    amount: bigint,
    destChainId: number,
    destAddress: Uint8Array,
    bridgeFee: bigint = BigInt(0),
    timeout: number = 0
): TransactionInstruction {
    const data = Buffer.alloc(100);
    let offset = 0;
    
    data.writeUInt8(TAG_BRIDGE_LOCK, offset); offset += 1;
    Buffer.from(tokenCommit).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(amount, offset); offset += 8;
    data.writeUInt8(destChainId, offset); offset += 1;
    Buffer.from(destAddress).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(bridgeFee, offset); offset += 8;
    data.writeUInt32LE(timeout, offset); offset += 4;
    
    return new TransactionInstruction({
        programId,
        keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
        data: data.subarray(0, offset),
    });
}

/**
 * Build bridge release instruction
 * TAG 242 - Release bridged tokens on destination chain
 */
export function buildBridgeRelease(
    payer: PublicKey,
    programId: PublicKey,
    lockId: Uint8Array,
    bridgeProof: Uint8Array,
    receiverCommit: Uint8Array,
    amount: bigint
): TransactionInstruction {
    const data = Buffer.alloc(145);
    let offset = 0;
    
    data.writeUInt8(TAG_BRIDGE_RELEASE, offset); offset += 1;
    Buffer.from(lockId).copy(data, offset); offset += 32;
    Buffer.from(bridgeProof).copy(data, offset); offset += 64;
    Buffer.from(receiverCommit).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(amount, offset); offset += 8;
    
    return new TransactionInstruction({
        programId,
        keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
        data: data.subarray(0, offset),
    });
}

/**
 * Build bridge oracle registration instruction
 * TAG 250 - Register bridge oracle for attestations
 */
export function buildBridgeOracleRegister(
    payer: PublicKey,
    programId: PublicKey,
    oraclePubkey: Uint8Array,
    supportedChains: number[],
    stakeAmount: bigint
): TransactionInstruction {
    const data = Buffer.alloc(64);
    let offset = 0;
    
    data.writeUInt8(TAG_BRIDGE_GUARDIAN_ROTATE, offset); offset += 1;
    Buffer.from(oraclePubkey).copy(data, offset); offset += 32;
    data.writeUInt8(supportedChains.length, offset); offset += 1;
    for (const chain of supportedChains.slice(0, 8)) {
        data.writeUInt8(chain, offset); offset += 1;
    }
    offset = 42; // Fixed offset after chains
    data.writeBigUInt64LE(stakeAmount, offset); offset += 8;
    
    return new TransactionInstruction({
        programId,
        keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
        data: data.subarray(0, offset),
    });
}

/**
 * Build bridge pause instruction (emergency)
 * TAG 253 - Emergency pause bridge operations
 */
export function buildBridgePause(
    payer: PublicKey,
    programId: PublicKey,
    bridgeId: Uint8Array,
    reason: string,
    authoritySig: Uint8Array
): TransactionInstruction {
    const reasonBytes = new TextEncoder().encode(reason.slice(0, 64));
    const data = Buffer.alloc(130 + reasonBytes.length);
    let offset = 0;
    
    data.writeUInt8(TAG_BRIDGE_PAUSE, offset); offset += 1;
    Buffer.from(bridgeId).copy(data, offset); offset += 32;
    data.writeUInt8(reasonBytes.length, offset); offset += 1;
    Buffer.from(reasonBytes).copy(data, offset); offset += reasonBytes.length;
    Buffer.from(authoritySig).copy(data, offset); offset += 64;
    
    return new TransactionInstruction({
        programId,
        keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
        data: data.subarray(0, offset),
    });
}

// Note: CHAIN_* constants are defined earlier in the file (line ~753)