/**
 * @styx-stack/sps-sdk - Domain Constants
 * 
 * SPS v3.0 Domain-Based Instruction Encoding
 * Matches the on-chain program in programs/styx-private-memo-program/src/domains.rs
 * 
 * Encoding Format:
 * COMPACT:   [DOMAIN:u8][OP:u8][...payload...]           (2 bytes, hot path)
 * EXTENDED:  [0x00][SIGHASH:8][...payload...]            (9 bytes, ∞ ops)
 * TLV:       [0xFE][TYPE:u8][LEN:u16][...extensions...]  (4+ bytes, ∞ extensions)
 * SCHEMA:    [0xFF][SCHEMA_HASH:32][...payload...]       (33 bytes, ∞ schemas)
 */

// ═══════════════════════════════════════════════════════════════════════════
// SPECIAL DOMAINS - Extension Mechanisms
// ═══════════════════════════════════════════════════════════════════════════

/** Extended mode - 8-byte sighash discriminator (like Anchor) */
export const DOMAIN_EXTENDED = 0x00;

/** TLV Extension mode - Token-22 compatible extensions */
export const DOMAIN_TLV = 0xfe;

/** Inscription Schema mode - On-chain extensibility (SPS UNIQUE!) */
export const DOMAIN_SCHEMA = 0xff;

// ═══════════════════════════════════════════════════════════════════════════
// COMPACT DOMAINS (0x01-0x0D) - Optimized Hot Paths
// ═══════════════════════════════════════════════════════════════════════════

/** STS Token Standard domain - core token operations */
export const DOMAIN_STS = 0x01;

/** Messaging domain - private messages, X3DH key exchange, ratchet */
export const DOMAIN_MESSAGING = 0x02;

/** Account domain - VTA, delegation, guardians, multi-sig */
export const DOMAIN_ACCOUNT = 0x03;

/** VSL domain - Virtual Shielded Ledger operations */
export const DOMAIN_VSL = 0x04;

/** Notes domain - UTXO primitives, pools, merkle trees */
export const DOMAIN_NOTES = 0x05;

/** Compliance domain - POI, innocence, provenance */
export const DOMAIN_COMPLIANCE = 0x06;

/** Privacy domain - decoys, ephemeral, chrono, shadow */
export const DOMAIN_PRIVACY = 0x07;

/** DeFi domain - AMM, swaps, staking, lending, yield */
export const DOMAIN_DEFI = 0x08;

/** NFT domain - marketplace, auctions, collections */
export const DOMAIN_NFT = 0x09;

/** Derivatives domain - options, margin, perpetuals */
export const DOMAIN_DERIVATIVES = 0x0a;

/** Bridge domain - cross-chain (Wormhole, LayerZero, IBC, BTC) */
export const DOMAIN_BRIDGE = 0x0b;

/** Securities domain - Reg D, transfer agents, corporate actions */
export const DOMAIN_SECURITIES = 0x0c;

/** Governance domain - proposals, voting, protocol admin */
export const DOMAIN_GOVERNANCE = 0x0d;

/** 
 * DAM domain - Deferred Account Materialization (SPS UNIQUE!)
 * Virtual tokens with on-demand real SPL account creation.
 * World's first bidirectional Virtual ↔ Real token architecture.
 * 
 * Key innovations:
 * - Token-2022 pool with Permanent Delegate
 * - Virtual balances (zero rent, commitment-based)
 * - Materialize on-demand (creates real SPL account)
 * - De-materialize to reclaim rent (UNIQUE to SPS!)
 */
export const DOMAIN_DAM = 0x0e;

/**
 * IC domain - Inscription Compression (SPS UNIQUE!)
 * ZK-free compressed tokens using Merkle proofs + inscriptions.
 * 20x cheaper verification than Groth16, with privacy!
 */
export const DOMAIN_IC = 0x0f;

/**
 * SWAP domain - Private Shielded Pool DEX (SPS UNIQUE!)
 * Tornado Cash-style shielded pools with DEX functionality.
 * Sender, receiver, and amounts all hidden.
 */
export const DOMAIN_SWAP = 0x10;

/**
 * EasyPay domain - Private Payments (SPS UNIQUE!)
 * Venmo/Cash App UX with crypto privacy + on-chain settlement.
 * No wallet needed for recipients, gasless claims!
 */
export const DOMAIN_EASYPAY = 0x11;

// ═══════════════════════════════════════════════════════════════════════════
// STS DOMAIN (0x01) - Token Standard Core
// ═══════════════════════════════════════════════════════════════════════════

export const sts = {
  OP_CREATE_MINT: 0x01,
  OP_UPDATE_MINT: 0x02,
  OP_FREEZE_MINT: 0x03,
  OP_MINT_TO: 0x04,
  OP_BURN: 0x05,
  OP_TRANSFER: 0x06,
  OP_SHIELD: 0x07,
  OP_UNSHIELD: 0x08,
  OP_CREATE_RULESET: 0x09,
  OP_UPDATE_RULESET: 0x0a,
  OP_FREEZE_RULESET: 0x0b,
  OP_REVEAL_TO_AUDITOR: 0x0c,
  OP_ATTACH_POI: 0x0d,
  OP_BATCH_TRANSFER: 0x0e,
  OP_DECOY_STORM: 0x0f,
  OP_CHRONO_VAULT: 0x10,
  OP_CREATE_NFT: 0x11,
  OP_TRANSFER_NFT: 0x12,
  OP_REVEAL_NFT: 0x13,
  OP_CREATE_POOL: 0x14,
  OP_CREATE_RECEIPT_MINT: 0x15,
  OP_STEALTH_UNSHIELD: 0x16,
  OP_PRIVATE_SWAP: 0x17,
  OP_CREATE_AMM_POOL: 0x18,
  OP_ADD_LIQUIDITY: 0x19,
  OP_REMOVE_LIQUIDITY: 0x1a,
  OP_GENERATE_STEALTH: 0x1b,
  // IAP - Inscription-Anchored Privacy
  OP_IAP_TRANSFER: 0x1c,
  OP_IAP_BURN: 0x1d,
  OP_IAP_TRANSFER_NFT: 0x1e,
  // v6.1 Permissionless Pool Ops (auto-init pool on first use)
  OP_SHIELD_WITH_INIT: 0x1f,
  OP_UNSHIELD_WITH_CLOSE: 0x20,
  OP_SWAP_WITH_INIT: 0x21,
  OP_ADD_LIQUIDITY_WITH_INIT: 0x22,
  OP_STEALTH_UNSHIELD_WITH_INIT: 0x23,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGING DOMAIN (0x02) - Private Messaging & Key Exchange
// ═══════════════════════════════════════════════════════════════════════════

export const messaging = {
  OP_PRIVATE_MESSAGE: 0x01,
  OP_ROUTED_MESSAGE: 0x02,
  OP_PRIVATE_TRANSFER: 0x03,
  OP_RATCHET_MESSAGE: 0x04,
  OP_COMPLIANCE_REVEAL: 0x05,
  OP_PREKEY_BUNDLE_PUBLISH: 0x06,
  OP_PREKEY_BUNDLE_REFRESH: 0x07,
  OP_REFERRAL_REGISTER: 0x08,
  OP_REFERRAL_CLAIM: 0x09,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// ACCOUNT DOMAIN (0x03) - VTA, Delegation, Guardians
// ═══════════════════════════════════════════════════════════════════════════

export const account = {
  OP_VTA_TRANSFER: 0x01,
  OP_VTA_DELEGATE: 0x02,
  OP_VTA_REVOKE: 0x03,
  OP_VTA_GUARDIAN_SET: 0x04,
  OP_VTA_GUARDIAN_RECOVER: 0x05,
  OP_MULTIPARTY_VTA_INIT: 0x06,
  OP_MULTIPARTY_VTA_SIGN: 0x07,
  OP_STEALTH_SWAP_INIT: 0x08,
  OP_STEALTH_SWAP_EXEC: 0x09,
  OP_PRIVATE_SUBSCRIPTION: 0x0a,
  OP_DELEGATION_CHAIN: 0x0b,
  OP_SOCIAL_RECOVERY: 0x0c,
  OP_MULTI_SIG_NOTE: 0x0d,
  OP_RECOVERABLE_NOTE: 0x0e,
  OP_SELECTIVE_DISCLOSURE: 0x0f,
  // Registry — VTA bitset pages
  OP_VTA_REGISTRY_INIT: 0x10,
  OP_VTA_REGISTRY_INIT_V2: 0x11,     // v7.1 — paged bitset with u64 page index
  // APB (Atomic Privacy Batch)
  OP_APB_TRANSFER: 0x20,
  OP_APB_BATCH: 0x21,
  OP_STEALTH_SCAN_HINT: 0x22,
  // Defined but NOT routed (in domains.rs, no match arm)
  OP_APPROVE_DELEGATE: 0x24,
  OP_REVOKE_DELEGATE: 0x25,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// VSL DOMAIN (0x04) - Virtual Shielded Ledger
// ═══════════════════════════════════════════════════════════════════════════

export const vsl = {
  OP_DEPOSIT: 0x01,
  OP_WITHDRAW: 0x02,
  OP_PRIVATE_TRANSFER: 0x03,
  OP_PRIVATE_SWAP: 0x04,
  OP_SHIELDED_SEND: 0x05,
  OP_SPLIT: 0x06,
  OP_MERGE: 0x07,
  OP_ESCROW_CREATE: 0x08,
  OP_ESCROW_RELEASE: 0x09,
  OP_ESCROW_REFUND: 0x0a,
  OP_BALANCE_PROOF: 0x0b,
  OP_AUDIT_REVEAL: 0x0c,
  // ZK-verified private transfer via Groth16 CPI to styxzk_verifier
  OP_ZK_PRIVATE_TRANSFER: 0x0d,
  // Fee configuration (admin)
  OP_SET_FEE_CONFIG: 0x0e,
  OP_INIT_FEE_CONFIG: 0x0f,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// NOTES DOMAIN (0x05) - UTXO Primitives, Pools, Merkle
// ═══════════════════════════════════════════════════════════════════════════

export const notes = {
  // Core note operations
  OP_MINT: 0x01,
  OP_TRANSFER: 0x02,
  OP_MERGE: 0x03,
  OP_SPLIT: 0x04,
  OP_BURN: 0x05,
  OP_EXTEND: 0x06,
  OP_FREEZE: 0x07,
  OP_THAW: 0x08,
  // Pool operations
  OP_GPOOL_DEPOSIT: 0x10,
  OP_GPOOL_WITHDRAW: 0x11,
  OP_GPOOL_WITHDRAW_STEALTH: 0x12,
  OP_GPOOL_WITHDRAW_SWAP: 0x13,
  // Merkle operations
  OP_MERKLE_UPDATE: 0x14,
  OP_MERKLE_EMERGENCY: 0x15,
  // Token metadata
  OP_TOKEN_CREATE: 0x20,
  OP_TOKEN_SET_AUTHORITY: 0x21,
  OP_METADATA_SET: 0x22,
  OP_METADATA_UPDATE: 0x23,
  // Groups & hooks (Token-22 parity)
  OP_GROUP_CREATE: 0x30,
  OP_GROUP_ADD_MEMBER: 0x31,
  OP_GROUP_REMOVE_MEMBER: 0x32,
  OP_HOOK_REGISTER: 0x33,
  OP_HOOK_EXECUTE: 0x34,
  OP_HOOK_EXECUTE_REAL: 0x35,
  // Wrapping (SPL bridge)
  OP_WRAP_SPL: 0x40,
  OP_UNWRAP_SPL: 0x41,
  OP_WRAPPER_MINT: 0x42,
  OP_WRAPPER_BURN: 0x43,
  // Confidential (Token-22 CT parity)
  OP_CONFIDENTIAL_MINT: 0x50,
  OP_CONFIDENTIAL_TRANSFER: 0x51,
  OP_CONFIDENTIAL_TRANSFER_V2: 0x52,
  // Batch & nullifiers
  OP_BATCH_OPS: 0x60,
  OP_BATCH_NULLIFIER: 0x61,
  OP_NULLIFIER_CREATE: 0x62,
  OP_NULLIFIER_CHECK: 0x63,
  OP_NULLIFIER_INSCRIBE: 0x64,
  // Interest (Token-22 parity)
  OP_INTEREST_ACCRUE: 0x70,
  OP_INTEREST_CLAIM: 0x71,
  OP_INTEREST_CLAIM_REAL: 0x72,
  // Royalty
  OP_ROYALTY_CLAIM: 0x80,
  OP_ROYALTY_CLAIM_REAL: 0x81,
  // Exchange
  OP_EXCHANGE_PROOF: 0x90,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// COMPLIANCE DOMAIN (0x06) - POI, Innocence, Provenance
// ═══════════════════════════════════════════════════════════════════════════

export const compliance = {
  OP_INNOCENCE_MINT: 0x01,
  OP_INNOCENCE_VERIFY: 0x02,
  OP_INNOCENCE_REVOKE: 0x03,
  OP_CLEAN_SOURCE_REGISTER: 0x10,
  OP_CLEAN_SOURCE_PROVE: 0x11,
  OP_TEMPORAL_INNOCENCE: 0x12,
  OP_CHANNEL_OPEN: 0x20,
  OP_CHANNEL_REPORT: 0x21,
  OP_PROVENANCE_COMMIT: 0x30,
  OP_PROVENANCE_EXTEND: 0x31,
  OP_PROVENANCE_VERIFY: 0x32,
  OP_BALANCE_ATTEST: 0x40,
  OP_BALANCE_VERIFY: 0x41,
  OP_COMPLIANCE_PROOF: 0x42,
  OP_MERKLE_ROOT_PUBLISH: 0x50,
  OP_MERKLE_PROOF_VERIFY: 0x51,
  OP_VALIDATOR_PROOF: 0x52,
  OP_SECURITY_AUDIT: 0x53,
  OP_DECENTRALIZATION_METRIC: 0x54,
  OP_EXCHANGE_PROOF: 0x60,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// PRIVACY DOMAIN (0x07) - Decoys, Ephemeral, Chrono, Shadow
// ═══════════════════════════════════════════════════════════════════════════

export const privacy = {
  OP_DECOY_STORM: 0x01,
  OP_DECOY_REVEAL: 0x02,
  OP_EPHEMERAL_CREATE: 0x10,
  OP_EPHEMERAL_DRAIN: 0x11,
  OP_CHRONO_LOCK: 0x20,
  OP_CHRONO_REVEAL: 0x21,
  OP_TIME_CAPSULE: 0x22,
  OP_TIME_LOCKED_REVEAL: 0x23,
  OP_SHADOW_FOLLOW: 0x30,
  OP_SHADOW_UNFOLLOW: 0x31,
  OP_PHANTOM_NFT_COMMIT: 0x40,
  OP_PHANTOM_NFT_PROVE: 0x41,
  OP_STATE_CHANNEL_OPEN: 0x50,
  OP_STATE_CHANNEL_CLOSE: 0x51,
  OP_HASHLOCK_COMMIT: 0x60,
  OP_HASHLOCK_REVEAL: 0x61,
  OP_CONDITIONAL_COMMIT: 0x62,
  OP_BATCH_SETTLE: 0x63,
  OP_GHOST_PDA: 0x70,
  OP_CPI_INSCRIBE: 0x71,
  OP_CONDITIONAL_TRANSFER: 0x72,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// DEFI DOMAIN (0x08) - AMM, Swaps, Staking, Lending, Yield
// ═══════════════════════════════════════════════════════════════════════════

export const defi = {
  // AMM
  OP_AMM_POOL_CREATE: 0x01,
  OP_AMM_ADD_LIQUIDITY: 0x02,
  OP_AMM_REMOVE_LIQUIDITY: 0x03,
  OP_AMM_SWAP: 0x04,
  OP_AMM_QUOTE: 0x05,
  OP_AMM_SYNC: 0x06,
  // LP Notes
  OP_LP_NOTE_MINT: 0x10,
  OP_LP_NOTE_BURN: 0x11,
  OP_CONCENTRATED_LP: 0x12,
  // Router
  OP_ROUTER_SWAP: 0x20,
  OP_ROUTER_SPLIT: 0x21,
  // Orders
  OP_LIMIT_ORDER_PLACE: 0x30,
  OP_LIMIT_ORDER_FILL: 0x31,
  OP_LIMIT_ORDER_CANCEL: 0x32,
  OP_TWAP_ORDER_START: 0x33,
  OP_TWAP_ORDER_FILL: 0x34,
  // Pools
  OP_POOL_CREATE: 0x40,
  OP_POOL_DEPOSIT: 0x41,
  OP_POOL_WITHDRAW: 0x42,
  OP_POOL_DONATE: 0x43,
  // Yield
  OP_YIELD_VAULT_CREATE: 0x50,
  OP_YIELD_DEPOSIT: 0x51,
  OP_YIELD_CLAIM: 0x52,
  OP_YIELD_WITHDRAW: 0x53,
  // Adapters
  OP_ADAPTER_REGISTER: 0x60,
  OP_ADAPTER_CALL: 0x61,
  OP_ADAPTER_CALLBACK: 0x62,
  // Private DeFi
  OP_PRIVATE_SWAP: 0x70,
  OP_PRIVATE_STAKE: 0x71,
  OP_PRIVATE_UNSTAKE: 0x72,
  OP_PRIVATE_LP_ADD: 0x73,
  OP_PRIVATE_LP_REMOVE: 0x74,
  // Native integrations
  OP_JUPITER_ROUTE: 0x80,
  OP_MARINADE_STAKE: 0x81,
  OP_DRIFT_PERP: 0x82,
  OP_PRIVATE_LENDING: 0x83,
  OP_FLASH_LOAN: 0x84,
  OP_ORACLE_BOUND: 0x85,
  OP_CROSS_MINT_ATOMIC: 0x86,
  OP_ATOMIC_CPI_TRANSFER: 0x87,
  // PPV
  OP_PPV_CREATE: 0xa0,
  OP_PPV_VERIFY: 0xa1,
  OP_PPV_REDEEM: 0xa2,
  OP_PPV_TRANSFER: 0xa3,
  OP_PPV_EXTEND: 0xa4,
  OP_PPV_REVOKE: 0xa5,
  // APB
  OP_APB_TRANSFER: 0xb0,
  OP_APB_BATCH: 0xb1,
  OP_STEALTH_SCAN_HINT: 0xb2,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// NFT DOMAIN (0x09) - Marketplace, Auctions, Collections
// ═══════════════════════════════════════════════════════════════════════════

export const nft = {
  OP_MINT: 0x01,
  OP_LIST: 0x02,
  OP_DELIST: 0x03,
  OP_BUY: 0x04,
  OP_OFFER: 0x05,
  OP_ACCEPT_OFFER: 0x06,
  OP_CANCEL_OFFER: 0x07,
  OP_COLLECTION_CREATE: 0x10,
  OP_AUCTION_CREATE: 0x20,
  OP_AUCTION_BID: 0x21,
  OP_AUCTION_SETTLE: 0x22,
  OP_AUCTION_CANCEL: 0x23,
  OP_FAIR_LAUNCH_COMMIT: 0x30,   // ✅ ACTIVE
  OP_FAIR_LAUNCH_REVEAL: 0x31,   // ✅ ACTIVE
  OP_MERKLE_AIRDROP_ROOT: 0x40,  // ✅ ACTIVE
  OP_MERKLE_AIRDROP_CLAIM: 0x41, // ✅ ACTIVE
  OP_ROYALTY_CLAIM: 0x50,        // ⚠️ ARCHIVED
  OP_ROYALTY_CLAIM_REAL: 0x51,   // ⚠️ ARCHIVED
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// DERIVATIVES DOMAIN (0x0A) - Options, Margin, Perpetuals
// ⚠️  DEPRECATED: Entire domain moved to StyxFi program. Rejected on mainnet.
// ═══════════════════════════════════════════════════════════════════════════

export const derivatives = {
  OP_OPTION_WRITE: 0x01,
  OP_OPTION_BUY: 0x02,
  OP_OPTION_EXERCISE: 0x03,
  OP_OPTION_EXPIRE: 0x04,
  OP_OPTION_ASSIGN: 0x05,
  OP_OPTION_CLOSE: 0x06,
  OP_OPTION_COLLATERAL_LOCK: 0x07,
  OP_OPTION_COLLATERAL_RELEASE: 0x08,
  OP_OPTION_SERIES_CREATE: 0x09,
  OP_OPTION_MARKET_MAKE: 0x0a,
  OP_MARGIN_ACCOUNT_CREATE: 0x10,
  OP_MARGIN_DEPOSIT: 0x11,
  OP_MARGIN_WITHDRAW: 0x12,
  OP_POSITION_OPEN: 0x13,
  OP_POSITION_CLOSE: 0x14,
  OP_POSITION_LIQUIDATE: 0x15,
  OP_MARGIN_CALL_EMIT: 0x16,
  OP_FUNDING_RATE_APPLY: 0x17,
  OP_CROSS_MARGIN_SYNC: 0x18,
  OP_INSURANCE_FUND_CONTRIBUTE: 0x19,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// BRIDGE DOMAIN (0x0B) - Cross-Chain Bridges
// ⚠️  DEPRECATED: Entire domain rejected on mainnet.
// ═══════════════════════════════════════════════════════════════════════════

export const bridge = {
  OP_LOCK: 0x01,
  OP_RELEASE: 0x02,
  OP_BURN: 0x03,
  OP_MINT: 0x04,
  OP_WORMHOLE_VAA_VERIFY: 0x10,
  OP_LAYERZERO_ENDPOINT: 0x11,
  OP_IBC_PACKET_RECV: 0x20,
  OP_IBC_PACKET_ACK: 0x21,
  OP_BTC_SPV_PROOF: 0x30,
  OP_BTC_RELAY_SUBMIT: 0x31,
  OP_ETH_STATE_PROOF: 0x32,
  OP_FEE_COLLECT: 0x40,
  OP_GUARDIAN_ROTATE: 0x41,
  OP_PAUSE: 0x42,
  OP_RESUME: 0x43,
  OP_APB_TRANSFER: 0x50,
  OP_APB_BATCH: 0x51,
  OP_STEALTH_SCAN_HINT: 0x52,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// SECURITIES DOMAIN (0x0C) - Reg D, Transfer Agents
// ⚠️  DEPRECATED: Entire domain rejected on mainnet.
// ═══════════════════════════════════════════════════════════════════════════

export const securities = {
  OP_ISSUE: 0x01,
  OP_TRANSFER: 0x02,
  OP_FREEZE: 0x03,
  OP_TRANSFER_AGENT_REGISTER: 0x10,
  OP_TRANSFER_AGENT_APPROVE: 0x11,
  OP_ACCREDITATION_PROOF: 0x20,
  OP_SHARE_CLASS_CREATE: 0x30,
  OP_CORPORATE_ACTION: 0x31,
  OP_REG_D_LOCKUP: 0x32,
  OP_INSTITUTIONAL_REPORT: 0x33,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// GOVERNANCE DOMAIN (0x0D) - Proposals, Voting, Protocol Admin
// ⚠️  ARCHIVED: Requires `archived-governance` feature flag. Rejected on mainnet.
//   Even with feature flag, handler returns Err. Moving to StyxFi v24.
// ═══════════════════════════════════════════════════════════════════════════

export const governance = {
  /** Create/submit proposal */
  OP_PROPOSAL: 0x01,
  /** Private vote on proposal */
  OP_PRIVATE_VOTE: 0x02,
  /** Protocol pause (emergency, requires 7-of-9 multi-sig) */
  OP_PROTOCOL_PAUSE: 0x03,
  /** Protocol unpause */
  OP_PROTOCOL_UNPAUSE: 0x04,
  /** Freeze enforced (governance-mandated) */
  OP_FREEZE_ENFORCED: 0x05,
  /** Thaw governed (governance-mandated) */
  OP_THAW_GOVERNED: 0x06,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// DAM DOMAIN (0x0E) - Deferred Account Materialization
// WORLD'S FIRST: Bidirectional Virtual ↔ Real Token Architecture
// ═══════════════════════════════════════════════════════════════════════════

export const dam = {
  // Pool Management - Token-2022 pool with Permanent Delegate
  /** Create DAM pool for a token mint (~0.002 SOL once, shared by ALL holders!) */
  OP_POOL_CREATE: 0x01,
  /** Initialize pool with initial token supply */
  OP_POOL_FUND: 0x02,
  /** Update pool parameters (fee tier, etc.) */
  OP_POOL_UPDATE: 0x03,

  // Virtual Balance - Zero rent, commitment-based
  /** Mint tokens to virtual balance (inscription-based, ZERO rent!) */
  OP_VIRTUAL_MINT: 0x10,
  /** Transfer between virtual balances (private, free) */
  OP_VIRTUAL_TRANSFER: 0x11,
  /** Burn from virtual balance */
  OP_VIRTUAL_BURN: 0x12,
  /** Commit Merkle root for virtual balance verification */
  OP_ROOT_COMMIT: 0x13,

  // Materialization - Convert virtual to real SPL account
  /** Materialize virtual balance to real SPL token account (~0.002 SOL) */
  OP_MATERIALIZE: 0x20,
  /** Batch materialize for multiple users (airdrop optimization) */
  OP_MATERIALIZE_BATCH: 0x21,
  /** Materialize with immediate DEX swap (atomic) */
  OP_MATERIALIZE_AND_SWAP: 0x22,
  /** Materialize with auto-init pool (permissionless, v6.1) */
  OP_MATERIALIZE_WITH_INIT: 0x23,

  // De-Materialization - Return to virtual, RECLAIM RENT!
  /** Return tokens to pool, close account, reclaim ~0.002 SOL rent! */
  OP_DEMATERIALIZE: 0x30,
  /** Batch de-materialize (consolidate accounts) */
  OP_DEMATERIALIZE_BATCH: 0x31,
  /** De-materialize after swap (swap → return to private) */
  OP_SWAP_AND_DEMATERIALIZE: 0x32,

  // Privacy Features - Commitment-based virtual balances
  /** Private virtual transfer (hides amounts in commitments) */
  OP_PRIVATE_VIRTUAL_TRANSFER: 0x40,
  /** Split virtual balance (like UTXO split) */
  OP_VIRTUAL_SPLIT: 0x41,
  /** Merge virtual balances (like UTXO merge) */
  OP_VIRTUAL_MERGE: 0x42,
  /** Generate decoy virtual transfers (privacy enhancement) */
  OP_VIRTUAL_DECOY: 0x43,

  // Verification - Trustless proofs
  /** Verify Merkle proof of virtual balance */
  OP_VERIFY_BALANCE_PROOF: 0x50,
  /** Verify materialization eligibility */
  OP_VERIFY_MATERIALIZE_ELIGIBLE: 0x51,
  /** Query pool state (CPI-friendly) */
  OP_POOL_QUERY: 0x52,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// IC DOMAIN (0x0F) - Inscription Compression (SPS UNIQUE!)
// ZK-free compressed tokens using Merkle proofs + inscriptions
// ═══════════════════════════════════════════════════════════════════════════

export const ic = {
  // ═══════════════════════════════════════════════════════════════════════
  // TREE MANAGEMENT - Shared state tree accounts
  // ═══════════════════════════════════════════════════════════════════════
  /** Initialize state tree for a token mint */
  OP_TREE_INIT: 0x01,
  /** Append leaves to tree (batch insert) */
  OP_TREE_APPEND: 0x02,
  /** Update Merkle root (crank) */
  OP_TREE_UPDATE_ROOT: 0x03,
  /** Close tree and reclaim rent */
  OP_TREE_CLOSE: 0x04,

  // ═══════════════════════════════════════════════════════════════════════
  // TOKEN OPERATIONS - Compressed SPL operations
  // ═══════════════════════════════════════════════════════════════════════
  /** Mint tokens directly into compressed state */
  OP_MINT_COMPRESSED: 0x10,
  /** Compress SPL tokens into tree (burn + create leaf) */
  OP_COMPRESS: 0x11,
  /** Decompress from tree to SPL account */
  OP_DECOMPRESS: 0x12,
  /** Transfer between compressed accounts */
  OP_TRANSFER: 0x13,
  /** Batch compressed transfers */
  OP_TRANSFER_BATCH: 0x14,

  // ═══════════════════════════════════════════════════════════════════════
  // PRIVACY OPERATIONS - Encrypted commitments
  // ═══════════════════════════════════════════════════════════════════════
  /** Private mint (encrypted commitment) */
  OP_PRIVATE_MINT: 0x20,
  /** Private transfer (sender/recipient/amount all hidden) */
  OP_PRIVATE_TRANSFER: 0x21,
  /** Reveal balance to auditor (compliance channel) */
  OP_REVEAL_BALANCE: 0x22,
  /** Split compressed account (like UTXO split) */
  OP_SPLIT: 0x23,
  /** Merge compressed accounts (like UTXO merge) */
  OP_MERGE: 0x24,

  // ═══════════════════════════════════════════════════════════════════════
  // INSCRIPTION OPERATIONS - Permanent root anchoring (UNIQUE to SPS!)
  // ═══════════════════════════════════════════════════════════════════════
  /** Inscribe Merkle root to transaction logs */
  OP_INSCRIBE_ROOT: 0x30,
  /** Verify Merkle inclusion proof (on-chain, ~5K CU) */
  OP_VERIFY_PROOF: 0x31,
  /** Batch verify multiple proofs in one tx */
  OP_BATCH_VERIFY: 0x32,
  /** Verify proof against inscribed root (historical) */
  OP_VERIFY_INSCRIPTION: 0x33,

  // ═══════════════════════════════════════════════════════════════════════
  // RE-COMPRESSION - Rent recovery (UNIQUE vs Light!)
  // ═══════════════════════════════════════════════════════════════════════
  /** Re-compress SPL account back to tree (reclaim rent!) */
  OP_RECOMPRESS: 0x40,
  /** ⚠️ DEVNET ONLY — DEX trade → return to compressed */
  OP_SWAP_AND_RECOMPRESS: 0x41,

  // ═══════════════════════════════════════════════════════════════════════
  // POI INTEGRATION - Compliance channels
  // ═══════════════════════════════════════════════════════════════════════
  /** Attach POI to compressed account */
  OP_ATTACH_POI: 0x50,
  /** Verify POI for compressed transfer */
  OP_VERIFY_POI: 0x51,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// SWAP DOMAIN (0x10) - Private Shielded Pool DEX (SPS UNIQUE!)
// Tornado Cash-style shielded pools with DEX functionality
//
// ⚠️  ARCHIVED: Entire domain disabled on mainnet for size optimization.
// All instructions rejected. Use STS private swap or AMM ops instead.
// Coming back in v5.0 as a standalone program.
// ═══════════════════════════════════════════════════════════════════════════

export const swap = {
  // Pool management
  /** Create shielded swap pool */
  OP_POOL_CREATE: 0x01,
  /** Deposit into shielded pool */
  OP_POOL_DEPOSIT: 0x02,
  /** Withdraw from shielded pool (with proof) */
  OP_POOL_WITHDRAW: 0x03,
  /** Update pool parameters */
  OP_POOL_UPDATE: 0x04,

  // Private swaps - sender/receiver/amount all hidden
  /** Execute private swap */
  OP_PRIVATE_SWAP: 0x10,
  /** Private swap with limit order */
  OP_PRIVATE_LIMIT_SWAP: 0x11,
  /** Private multi-hop swap */
  OP_PRIVATE_ROUTE_SWAP: 0x12,
  /** Private atomic swap */
  OP_PRIVATE_ATOMIC_SWAP: 0x13,

  // Liquidity provision
  /** Add liquidity privately */
  OP_PRIVATE_ADD_LP: 0x20,
  /** Remove liquidity privately */
  OP_PRIVATE_REMOVE_LP: 0x21,
  /** Claim LP rewards privately */
  OP_PRIVATE_CLAIM_REWARDS: 0x22,

  // Order book (dark pool)
  /** Place dark pool order */
  OP_DARK_ORDER_PLACE: 0x30,
  /** Match dark pool orders */
  OP_DARK_ORDER_MATCH: 0x31,
  /** Cancel dark pool order */
  OP_DARK_ORDER_CANCEL: 0x32,

  // Verification
  /** Verify swap proof */
  OP_VERIFY_SWAP_PROOF: 0x40,
  /** Query shielded pool state */
  OP_POOL_QUERY: 0x41,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// EASYPAY DOMAIN (0x11) - Private No-Wallet Payments (SPS UNIQUE!)
// Venmo/Cash App UX with crypto privacy + on-chain settlement
//
// ⚠️  MOVED: Entire domain moved to WhisperDrop program as RESOLV.
// All instructions rejected on SPS mainnet. Use @styxstack/whisperdrop-sdk.
// ═══════════════════════════════════════════════════════════════════════════

export const easypay = {
  // Payment Creation
  /** Create single claimable payment */
  OP_CREATE_PAYMENT: 0x01,
  /** Create batch of payments (airdrop/payroll) */
  OP_CREATE_BATCH_PAYMENT: 0x02,
  /** Create recurring payment (subscription) */
  OP_CREATE_RECURRING: 0x03,

  // Claim Operations - no wallet needed!
  /** Claim to new stealth address (auto-create wallet) */
  OP_CLAIM_PAYMENT: 0x10,
  /** Claim to stealth address (one-time address) */
  OP_CLAIM_TO_STEALTH: 0x11,
  /** Claim to existing wallet address */
  OP_CLAIM_TO_EXISTING: 0x12,

  // Payment Management
  /** Cancel payment (return to sender) */
  OP_CANCEL_PAYMENT: 0x20,
  /** Extend payment expiry */
  OP_EXTEND_EXPIRY: 0x21,
  /** Refund expired payment */
  OP_REFUND_EXPIRED: 0x22,

  // Gasless Relayer Operations
  /** Register as gasless relayer */
  OP_REGISTER_RELAYER: 0x30,
  /** Submit meta-transaction (gasless claim) */
  OP_SUBMIT_META_TX: 0x31,
  /** Claim relayer fee */
  OP_CLAIM_RELAYER_FEE: 0x32,

  // Stealth Address Management
  /** Generate stealth keypair (spending + viewing) */
  OP_GENERATE_STEALTH_KEYS: 0x40,
  /** Publish stealth meta-address (shareable receiving address) */
  OP_PUBLISH_STEALTH_META: 0x41,
  /** Announce stealth payment (for recipient scanning) */
  OP_ANNOUNCE_STEALTH: 0x42,

  // Private Payments
  /** Create private payment (amount hidden) */
  OP_PRIVATE_PAYMENT: 0x50,
  /** Reveal payment to auditor (compliance) */
  OP_REVEAL_TO_AUDITOR: 0x51,
  /** Batch reveal (auditor requests) */
  OP_BATCH_REVEAL: 0x52,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// EXTENSION TYPES (TLV format)
// ═══════════════════════════════════════════════════════════════════════════

export const extensions = {
  EXT_TRANSFER_FEE: 0x01,
  EXT_ROYALTY: 0x02,
  EXT_INTEREST: 0x03,
  EXT_VESTING: 0x04,
  EXT_DELEGATION: 0x05,
  EXT_SOULBOUND: 0x06,
  EXT_FROZEN: 0x07,
  EXT_METADATA: 0x08,
  EXT_HOOK: 0x09,
  EXT_GROUP: 0x0a,
  EXT_PERMANENT_DELEGATE: 0x0b,
  EXT_NON_TRANSFERABLE: 0x0c,
  EXT_DEFAULT_ACCOUNT_STATE: 0x0d,
  EXT_MEMO_TRANSFER: 0x0e,
  EXT_CIPHERTEXT_TRANSFER: 0x0f,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// POOL TYPES
// ═══════════════════════════════════════════════════════════════════════════

export const poolTypes = {
  CONSTANT_PRODUCT: 0, // x * y = k (Uniswap v2 style)
  STABLE_SWAP: 1,      // Curve-style stable swap
  CONCENTRATED: 2,     // Uniswap v3 style CLMM
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Build instruction prefix
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build a 2-byte domain instruction prefix
 */
export function buildInstructionPrefix(domain: number, op: number): Buffer {
  return Buffer.from([domain, op]);
}

/**
 * Get domain name from byte
 */
export function getDomainName(domain: number): string {
  const names: Record<number, string> = {
    [DOMAIN_EXTENDED]: 'EXTENDED',
    [DOMAIN_TLV]: 'TLV',
    [DOMAIN_SCHEMA]: 'SCHEMA',
    [DOMAIN_STS]: 'STS',
    [DOMAIN_MESSAGING]: 'MESSAGING',
    [DOMAIN_ACCOUNT]: 'ACCOUNT',
    [DOMAIN_VSL]: 'VSL',
    [DOMAIN_NOTES]: 'NOTES',
    [DOMAIN_COMPLIANCE]: 'COMPLIANCE',
    [DOMAIN_PRIVACY]: 'PRIVACY',
    [DOMAIN_DEFI]: 'DEFI',
    [DOMAIN_NFT]: 'NFT',
    [DOMAIN_DERIVATIVES]: 'DERIVATIVES',
    [DOMAIN_BRIDGE]: 'BRIDGE',
    [DOMAIN_SECURITIES]: 'SECURITIES',
    [DOMAIN_GOVERNANCE]: 'GOVERNANCE',
    [DOMAIN_DAM]: 'DAM',
    [DOMAIN_IC]: 'IC',
    [DOMAIN_SWAP]: 'SWAP',
    [DOMAIN_EASYPAY]: 'EASYPAY',
  };
  return names[domain] || 'UNKNOWN';
}
