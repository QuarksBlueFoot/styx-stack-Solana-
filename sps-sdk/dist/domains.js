var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/domains.ts
var domains_exports = {};
__export(domains_exports, {
  DOMAIN_ACCOUNT: () => DOMAIN_ACCOUNT,
  DOMAIN_BRIDGE: () => DOMAIN_BRIDGE,
  DOMAIN_COMPLIANCE: () => DOMAIN_COMPLIANCE,
  DOMAIN_DAM: () => DOMAIN_DAM,
  DOMAIN_DEFI: () => DOMAIN_DEFI,
  DOMAIN_DERIVATIVES: () => DOMAIN_DERIVATIVES,
  DOMAIN_EASYPAY: () => DOMAIN_EASYPAY,
  DOMAIN_EXTENDED: () => DOMAIN_EXTENDED,
  DOMAIN_GOVERNANCE: () => DOMAIN_GOVERNANCE,
  DOMAIN_IC: () => DOMAIN_IC,
  DOMAIN_MESSAGING: () => DOMAIN_MESSAGING,
  DOMAIN_NFT: () => DOMAIN_NFT,
  DOMAIN_NOTES: () => DOMAIN_NOTES,
  DOMAIN_PRIVACY: () => DOMAIN_PRIVACY,
  DOMAIN_SCHEMA: () => DOMAIN_SCHEMA,
  DOMAIN_SECURITIES: () => DOMAIN_SECURITIES,
  DOMAIN_STS: () => DOMAIN_STS,
  DOMAIN_SWAP: () => DOMAIN_SWAP,
  DOMAIN_TLV: () => DOMAIN_TLV,
  DOMAIN_VSL: () => DOMAIN_VSL,
  account: () => account,
  bridge: () => bridge,
  buildInstructionPrefix: () => buildInstructionPrefix,
  compliance: () => compliance,
  dam: () => dam,
  defi: () => defi,
  derivatives: () => derivatives,
  easypay: () => easypay,
  extensions: () => extensions,
  getDomainName: () => getDomainName,
  governance: () => governance,
  ic: () => ic,
  messaging: () => messaging,
  nft: () => nft,
  notes: () => notes,
  poolTypes: () => poolTypes,
  privacy: () => privacy,
  securities: () => securities,
  sts: () => sts,
  swap: () => swap,
  vsl: () => vsl
});
module.exports = __toCommonJS(domains_exports);
var DOMAIN_EXTENDED = 0;
var DOMAIN_TLV = 254;
var DOMAIN_SCHEMA = 255;
var DOMAIN_STS = 1;
var DOMAIN_MESSAGING = 2;
var DOMAIN_ACCOUNT = 3;
var DOMAIN_VSL = 4;
var DOMAIN_NOTES = 5;
var DOMAIN_COMPLIANCE = 6;
var DOMAIN_PRIVACY = 7;
var DOMAIN_DEFI = 8;
var DOMAIN_NFT = 9;
var DOMAIN_DERIVATIVES = 10;
var DOMAIN_BRIDGE = 11;
var DOMAIN_SECURITIES = 12;
var DOMAIN_GOVERNANCE = 13;
var DOMAIN_DAM = 14;
var DOMAIN_IC = 15;
var DOMAIN_SWAP = 16;
var DOMAIN_EASYPAY = 17;
var sts = {
  OP_CREATE_MINT: 1,
  OP_UPDATE_MINT: 2,
  OP_FREEZE_MINT: 3,
  OP_MINT_TO: 4,
  OP_BURN: 5,
  OP_TRANSFER: 6,
  OP_SHIELD: 7,
  OP_UNSHIELD: 8,
  OP_CREATE_RULESET: 9,
  OP_UPDATE_RULESET: 10,
  OP_FREEZE_RULESET: 11,
  OP_REVEAL_TO_AUDITOR: 12,
  OP_ATTACH_POI: 13,
  OP_BATCH_TRANSFER: 14,
  OP_DECOY_STORM: 15,
  OP_CHRONO_VAULT: 16,
  OP_CREATE_NFT: 17,
  OP_TRANSFER_NFT: 18,
  OP_REVEAL_NFT: 19,
  OP_CREATE_POOL: 20,
  OP_CREATE_RECEIPT_MINT: 21,
  OP_STEALTH_UNSHIELD: 22,
  OP_PRIVATE_SWAP: 23,
  OP_CREATE_AMM_POOL: 24,
  OP_ADD_LIQUIDITY: 25,
  OP_REMOVE_LIQUIDITY: 26,
  OP_GENERATE_STEALTH: 27,
  // IAP - Inscription-Anchored Privacy
  OP_IAP_TRANSFER: 28,
  OP_IAP_BURN: 29,
  OP_IAP_TRANSFER_NFT: 30
};
var messaging = {
  OP_PRIVATE_MESSAGE: 1,
  OP_ROUTED_MESSAGE: 2,
  OP_PRIVATE_TRANSFER: 3,
  OP_RATCHET_MESSAGE: 4,
  OP_COMPLIANCE_REVEAL: 5,
  OP_PREKEY_BUNDLE_PUBLISH: 6,
  OP_PREKEY_BUNDLE_REFRESH: 7,
  OP_REFERRAL_REGISTER: 8,
  OP_REFERRAL_CLAIM: 9
};
var account = {
  OP_VTA_TRANSFER: 1,
  OP_VTA_DELEGATE: 2,
  OP_VTA_REVOKE: 3,
  OP_VTA_GUARDIAN_SET: 4,
  OP_VTA_GUARDIAN_RECOVER: 5,
  OP_MULTIPARTY_VTA_INIT: 6,
  OP_MULTIPARTY_VTA_SIGN: 7,
  OP_STEALTH_SWAP_INIT: 8,
  OP_STEALTH_SWAP_EXEC: 9,
  OP_PRIVATE_SUBSCRIPTION: 10,
  OP_DELEGATION_CHAIN: 11,
  OP_SOCIAL_RECOVERY: 12,
  OP_MULTI_SIG_NOTE: 13,
  OP_RECOVERABLE_NOTE: 14,
  OP_SELECTIVE_DISCLOSURE: 15
};
var vsl = {
  OP_DEPOSIT: 1,
  OP_WITHDRAW: 2,
  OP_PRIVATE_TRANSFER: 3,
  OP_PRIVATE_SWAP: 4,
  OP_SHIELDED_SEND: 5,
  OP_SPLIT: 6,
  OP_MERGE: 7,
  OP_ESCROW_CREATE: 8,
  OP_ESCROW_RELEASE: 9,
  OP_ESCROW_REFUND: 10,
  OP_BALANCE_PROOF: 11,
  OP_AUDIT_REVEAL: 12
};
var notes = {
  // Core note operations
  OP_MINT: 1,
  OP_TRANSFER: 2,
  OP_MERGE: 3,
  OP_SPLIT: 4,
  OP_BURN: 5,
  OP_EXTEND: 6,
  OP_FREEZE: 7,
  OP_THAW: 8,
  // Pool operations
  OP_GPOOL_DEPOSIT: 16,
  OP_GPOOL_WITHDRAW: 17,
  OP_GPOOL_WITHDRAW_STEALTH: 18,
  OP_GPOOL_WITHDRAW_SWAP: 19,
  // Merkle operations
  OP_MERKLE_UPDATE: 20,
  OP_MERKLE_EMERGENCY: 21,
  // Token metadata
  OP_TOKEN_CREATE: 32,
  OP_TOKEN_SET_AUTHORITY: 33,
  OP_METADATA_SET: 34,
  OP_METADATA_UPDATE: 35,
  // Groups & hooks (Token-22 parity)
  OP_GROUP_CREATE: 48,
  OP_GROUP_ADD_MEMBER: 49,
  OP_GROUP_REMOVE_MEMBER: 50,
  OP_HOOK_REGISTER: 51,
  OP_HOOK_EXECUTE: 52,
  OP_HOOK_EXECUTE_REAL: 53,
  // Wrapping (SPL bridge)
  OP_WRAP_SPL: 64,
  OP_UNWRAP_SPL: 65,
  OP_WRAPPER_MINT: 66,
  OP_WRAPPER_BURN: 67,
  // Confidential (Token-22 CT parity)
  OP_CONFIDENTIAL_MINT: 80,
  OP_CONFIDENTIAL_TRANSFER: 81,
  OP_CONFIDENTIAL_TRANSFER_V2: 82,
  // Batch & nullifiers
  OP_BATCH_OPS: 96,
  OP_BATCH_NULLIFIER: 97,
  OP_NULLIFIER_CREATE: 98,
  OP_NULLIFIER_CHECK: 99,
  OP_NULLIFIER_INSCRIBE: 100,
  // Interest (Token-22 parity)
  OP_INTEREST_ACCRUE: 112,
  OP_INTEREST_CLAIM: 113,
  OP_INTEREST_CLAIM_REAL: 114,
  // Royalty
  OP_ROYALTY_CLAIM: 128,
  OP_ROYALTY_CLAIM_REAL: 129,
  // Exchange
  OP_EXCHANGE_PROOF: 144
};
var compliance = {
  OP_INNOCENCE_MINT: 1,
  OP_INNOCENCE_VERIFY: 2,
  OP_INNOCENCE_REVOKE: 3,
  OP_CLEAN_SOURCE_REGISTER: 16,
  OP_CLEAN_SOURCE_PROVE: 17,
  OP_TEMPORAL_INNOCENCE: 18,
  OP_CHANNEL_OPEN: 32,
  OP_CHANNEL_REPORT: 33,
  OP_PROVENANCE_COMMIT: 48,
  OP_PROVENANCE_EXTEND: 49,
  OP_PROVENANCE_VERIFY: 50,
  OP_BALANCE_ATTEST: 64,
  OP_BALANCE_VERIFY: 65,
  OP_COMPLIANCE_PROOF: 66,
  OP_MERKLE_ROOT_PUBLISH: 80,
  OP_MERKLE_PROOF_VERIFY: 81,
  OP_VALIDATOR_PROOF: 82,
  OP_SECURITY_AUDIT: 83,
  OP_DECENTRALIZATION_METRIC: 84,
  OP_EXCHANGE_PROOF: 96
};
var privacy = {
  OP_DECOY_STORM: 1,
  OP_DECOY_REVEAL: 2,
  OP_EPHEMERAL_CREATE: 16,
  OP_EPHEMERAL_DRAIN: 17,
  OP_CHRONO_LOCK: 32,
  OP_CHRONO_REVEAL: 33,
  OP_TIME_CAPSULE: 34,
  OP_TIME_LOCKED_REVEAL: 35,
  OP_SHADOW_FOLLOW: 48,
  OP_SHADOW_UNFOLLOW: 49,
  OP_PHANTOM_NFT_COMMIT: 64,
  OP_PHANTOM_NFT_PROVE: 65,
  OP_STATE_CHANNEL_OPEN: 80,
  OP_STATE_CHANNEL_CLOSE: 81,
  OP_HASHLOCK_COMMIT: 96,
  OP_HASHLOCK_REVEAL: 97,
  OP_CONDITIONAL_COMMIT: 98,
  OP_BATCH_SETTLE: 99,
  OP_GHOST_PDA: 112,
  OP_CPI_INSCRIBE: 113,
  OP_CONDITIONAL_TRANSFER: 114
};
var defi = {
  // AMM
  OP_AMM_POOL_CREATE: 1,
  OP_AMM_ADD_LIQUIDITY: 2,
  OP_AMM_REMOVE_LIQUIDITY: 3,
  OP_AMM_SWAP: 4,
  OP_AMM_QUOTE: 5,
  OP_AMM_SYNC: 6,
  // LP Notes
  OP_LP_NOTE_MINT: 16,
  OP_LP_NOTE_BURN: 17,
  OP_CONCENTRATED_LP: 18,
  // Router
  OP_ROUTER_SWAP: 32,
  OP_ROUTER_SPLIT: 33,
  // Orders
  OP_LIMIT_ORDER_PLACE: 48,
  OP_LIMIT_ORDER_FILL: 49,
  OP_LIMIT_ORDER_CANCEL: 50,
  OP_TWAP_ORDER_START: 51,
  OP_TWAP_ORDER_FILL: 52,
  // Pools
  OP_POOL_CREATE: 64,
  OP_POOL_DEPOSIT: 65,
  OP_POOL_WITHDRAW: 66,
  OP_POOL_DONATE: 67,
  // Yield
  OP_YIELD_VAULT_CREATE: 80,
  OP_YIELD_DEPOSIT: 81,
  OP_YIELD_CLAIM: 82,
  OP_YIELD_WITHDRAW: 83,
  // Adapters
  OP_ADAPTER_REGISTER: 96,
  OP_ADAPTER_CALL: 97,
  OP_ADAPTER_CALLBACK: 98,
  // Private DeFi
  OP_PRIVATE_SWAP: 112,
  OP_PRIVATE_STAKE: 113,
  OP_PRIVATE_UNSTAKE: 114,
  OP_PRIVATE_LP_ADD: 115,
  OP_PRIVATE_LP_REMOVE: 116,
  // Native integrations
  OP_JUPITER_ROUTE: 128,
  OP_MARINADE_STAKE: 129,
  OP_DRIFT_PERP: 130,
  OP_PRIVATE_LENDING: 131,
  OP_FLASH_LOAN: 132,
  OP_ORACLE_BOUND: 133,
  OP_CROSS_MINT_ATOMIC: 134,
  OP_ATOMIC_CPI_TRANSFER: 135,
  // PPV
  OP_PPV_CREATE: 160,
  OP_PPV_VERIFY: 161,
  OP_PPV_REDEEM: 162,
  OP_PPV_TRANSFER: 163,
  OP_PPV_EXTEND: 164,
  OP_PPV_REVOKE: 165,
  // APB
  OP_APB_TRANSFER: 176,
  OP_APB_BATCH: 177,
  OP_STEALTH_SCAN_HINT: 178
};
var nft = {
  OP_MINT: 1,
  OP_LIST: 2,
  OP_DELIST: 3,
  OP_BUY: 4,
  OP_OFFER: 5,
  OP_ACCEPT_OFFER: 6,
  OP_CANCEL_OFFER: 7,
  OP_COLLECTION_CREATE: 16,
  OP_AUCTION_CREATE: 32,
  OP_AUCTION_BID: 33,
  OP_AUCTION_SETTLE: 34,
  OP_AUCTION_CANCEL: 35,
  OP_FAIR_LAUNCH_COMMIT: 48,
  OP_FAIR_LAUNCH_REVEAL: 49,
  OP_MERKLE_AIRDROP_ROOT: 64,
  OP_MERKLE_AIRDROP_CLAIM: 65,
  OP_ROYALTY_CLAIM: 80,
  OP_ROYALTY_CLAIM_REAL: 81
};
var derivatives = {
  OP_OPTION_WRITE: 1,
  OP_OPTION_BUY: 2,
  OP_OPTION_EXERCISE: 3,
  OP_OPTION_EXPIRE: 4,
  OP_OPTION_ASSIGN: 5,
  OP_OPTION_CLOSE: 6,
  OP_OPTION_COLLATERAL_LOCK: 7,
  OP_OPTION_COLLATERAL_RELEASE: 8,
  OP_OPTION_SERIES_CREATE: 9,
  OP_OPTION_MARKET_MAKE: 10,
  OP_MARGIN_ACCOUNT_CREATE: 16,
  OP_MARGIN_DEPOSIT: 17,
  OP_MARGIN_WITHDRAW: 18,
  OP_POSITION_OPEN: 19,
  OP_POSITION_CLOSE: 20,
  OP_POSITION_LIQUIDATE: 21,
  OP_MARGIN_CALL_EMIT: 22,
  OP_FUNDING_RATE_APPLY: 23,
  OP_CROSS_MARGIN_SYNC: 24,
  OP_INSURANCE_FUND_CONTRIBUTE: 25
};
var bridge = {
  OP_LOCK: 1,
  OP_RELEASE: 2,
  OP_BURN: 3,
  OP_MINT: 4,
  OP_WORMHOLE_VAA_VERIFY: 16,
  OP_LAYERZERO_ENDPOINT: 17,
  OP_IBC_PACKET_RECV: 32,
  OP_IBC_PACKET_ACK: 33,
  OP_BTC_SPV_PROOF: 48,
  OP_BTC_RELAY_SUBMIT: 49,
  OP_ETH_STATE_PROOF: 50,
  OP_FEE_COLLECT: 64,
  OP_GUARDIAN_ROTATE: 65,
  OP_PAUSE: 66,
  OP_RESUME: 67,
  OP_APB_TRANSFER: 80,
  OP_APB_BATCH: 81,
  OP_STEALTH_SCAN_HINT: 82
};
var securities = {
  OP_ISSUE: 1,
  OP_TRANSFER: 2,
  OP_FREEZE: 3,
  OP_TRANSFER_AGENT_REGISTER: 16,
  OP_TRANSFER_AGENT_APPROVE: 17,
  OP_ACCREDITATION_PROOF: 32,
  OP_SHARE_CLASS_CREATE: 48,
  OP_CORPORATE_ACTION: 49,
  OP_REG_D_LOCKUP: 50,
  OP_INSTITUTIONAL_REPORT: 51
};
var governance = {
  OP_PROPOSAL_CREATE: 1,
  OP_PROPOSAL_CANCEL: 2,
  OP_PROPOSAL_EXECUTE: 3,
  OP_PRIVATE_VOTE: 4,
  OP_VOTE_REVEAL: 5,
  OP_PROTOCOL_PAUSE: 16,
  OP_PROTOCOL_UNPAUSE: 17,
  OP_EMERGENCY_HALT: 18,
  OP_AUTHORITY_TRANSFER: 32,
  OP_MULTISIG_PROPOSE: 33,
  OP_MULTISIG_APPROVE: 34,
  OP_MULTISIG_EXECUTE: 35
};
var dam = {
  // Pool Management - Token-2022 pool with Permanent Delegate
  /** Create DAM pool for a token mint (~0.002 SOL once, shared by ALL holders!) */
  OP_POOL_CREATE: 1,
  /** Initialize pool with initial token supply */
  OP_POOL_FUND: 2,
  /** Update pool parameters (fee tier, etc.) */
  OP_POOL_UPDATE: 3,
  // Virtual Balance - Zero rent, commitment-based
  /** Mint tokens to virtual balance (inscription-based, ZERO rent!) */
  OP_VIRTUAL_MINT: 16,
  /** Transfer between virtual balances (private, free) */
  OP_VIRTUAL_TRANSFER: 17,
  /** Burn from virtual balance */
  OP_VIRTUAL_BURN: 18,
  /** Commit Merkle root for virtual balance verification */
  OP_ROOT_COMMIT: 19,
  // Materialization - Convert virtual to real SPL account
  /** Materialize virtual balance to real SPL token account (~0.002 SOL) */
  OP_MATERIALIZE: 32,
  /** Batch materialize for multiple users (airdrop optimization) */
  OP_MATERIALIZE_BATCH: 33,
  /** Materialize with immediate DEX swap (atomic) */
  OP_MATERIALIZE_AND_SWAP: 34,
  // De-Materialization - Return to virtual, RECLAIM RENT!
  /** Return tokens to pool, close account, reclaim ~0.002 SOL rent! */
  OP_DEMATERIALIZE: 48,
  /** Batch de-materialize (consolidate accounts) */
  OP_DEMATERIALIZE_BATCH: 49,
  /** De-materialize after swap (swap → return to private) */
  OP_SWAP_AND_DEMATERIALIZE: 50,
  // Privacy Features - Commitment-based virtual balances
  /** Private virtual transfer (hides amounts in commitments) */
  OP_PRIVATE_VIRTUAL_TRANSFER: 64,
  /** Split virtual balance (like UTXO split) */
  OP_VIRTUAL_SPLIT: 65,
  /** Merge virtual balances (like UTXO merge) */
  OP_VIRTUAL_MERGE: 66,
  /** Generate decoy virtual transfers (privacy enhancement) */
  OP_VIRTUAL_DECOY: 67,
  // Verification - Trustless proofs
  /** Verify Merkle proof of virtual balance */
  OP_VERIFY_BALANCE_PROOF: 80,
  /** Verify materialization eligibility */
  OP_VERIFY_MATERIALIZE_ELIGIBLE: 81,
  /** Query pool state (CPI-friendly) */
  OP_POOL_QUERY: 82
};
var ic = {
  // Compression operations - store tokens as inscriptions
  /** Compress tokens into inscription format */
  OP_COMPRESS: 1,
  /** Decompress inscription back to tokens */
  OP_DECOMPRESS: 2,
  /** Transfer compressed tokens */
  OP_COMPRESSED_TRANSFER: 3,
  /** Batch compress multiple accounts */
  OP_COMPRESS_BATCH: 4,
  // Merkle operations - efficient proofs
  /** Commit compression Merkle root */
  OP_ROOT_COMMIT: 16,
  /** Verify compression proof */
  OP_PROOF_VERIFY: 17,
  /** Update Merkle tree (append) */
  OP_TREE_APPEND: 18,
  // Privacy-enhanced compression
  /** Compress with commitment (private balance) */
  OP_PRIVATE_COMPRESS: 32,
  /** Transfer with privacy */
  OP_PRIVATE_COMPRESSED_TRANSFER: 33,
  /** Decompress with nullifier */
  OP_PRIVATE_DECOMPRESS: 34
};
var swap = {
  // Pool management
  /** Create shielded swap pool */
  OP_POOL_CREATE: 1,
  /** Deposit into shielded pool */
  OP_POOL_DEPOSIT: 2,
  /** Withdraw from shielded pool (with proof) */
  OP_POOL_WITHDRAW: 3,
  /** Update pool parameters */
  OP_POOL_UPDATE: 4,
  // Private swaps - sender/receiver/amount all hidden
  /** Execute private swap */
  OP_PRIVATE_SWAP: 16,
  /** Private swap with limit order */
  OP_PRIVATE_LIMIT_SWAP: 17,
  /** Private multi-hop swap */
  OP_PRIVATE_ROUTE_SWAP: 18,
  /** Private atomic swap */
  OP_PRIVATE_ATOMIC_SWAP: 19,
  // Liquidity provision
  /** Add liquidity privately */
  OP_PRIVATE_ADD_LP: 32,
  /** Remove liquidity privately */
  OP_PRIVATE_REMOVE_LP: 33,
  /** Claim LP rewards privately */
  OP_PRIVATE_CLAIM_REWARDS: 34,
  // Order book (dark pool)
  /** Place dark pool order */
  OP_DARK_ORDER_PLACE: 48,
  /** Match dark pool orders */
  OP_DARK_ORDER_MATCH: 49,
  /** Cancel dark pool order */
  OP_DARK_ORDER_CANCEL: 50,
  // Verification
  /** Verify swap proof */
  OP_VERIFY_SWAP_PROOF: 64,
  /** Query shielded pool state */
  OP_POOL_QUERY: 65
};
var easypay = {
  // Payment link creation
  /** Create claimable payment link */
  OP_LINK_CREATE: 1,
  /** Create multi-claim link (tip jar) */
  OP_LINK_CREATE_MULTI: 2,
  /** Cancel payment link */
  OP_LINK_CANCEL: 3,
  /** Update link expiry */
  OP_LINK_EXTEND: 4,
  // Claiming - no wallet needed!
  /** Claim payment (creates account if needed) */
  OP_CLAIM: 16,
  /** Claim with gasless relay (meta-tx) */
  OP_CLAIM_GASLESS: 17,
  /** Claim to email-derived address */
  OP_CLAIM_EMAIL: 18,
  /** Claim to phone-derived address */
  OP_CLAIM_PHONE: 19,
  /** Claim with social auth */
  OP_CLAIM_SOCIAL: 20,
  // Stealth payments
  /** Create stealth payment (hidden recipient) */
  OP_STEALTH_SEND: 32,
  /** Scan for stealth payments */
  OP_STEALTH_SCAN: 33,
  /** Claim stealth payment */
  OP_STEALTH_CLAIM: 34,
  // Batch operations
  /** Batch create links */
  OP_BATCH_CREATE: 48,
  /** Batch send to contacts */
  OP_BATCH_SEND: 49,
  // Relayer operations
  /** Register as relayer */
  OP_RELAYER_REGISTER: 64,
  /** Submit gasless claim (relayer) */
  OP_RELAYER_SUBMIT: 65,
  /** Claim relayer fee */
  OP_RELAYER_CLAIM_FEE: 66
};
var extensions = {
  EXT_TRANSFER_FEE: 1,
  EXT_ROYALTY: 2,
  EXT_INTEREST: 3,
  EXT_VESTING: 4,
  EXT_DELEGATION: 5,
  EXT_SOULBOUND: 6,
  EXT_FROZEN: 7,
  EXT_METADATA: 8,
  EXT_HOOK: 9,
  EXT_GROUP: 10,
  EXT_PERMANENT_DELEGATE: 11,
  EXT_NON_TRANSFERABLE: 12,
  EXT_DEFAULT_ACCOUNT_STATE: 13,
  EXT_MEMO_TRANSFER: 14,
  EXT_CIPHERTEXT_TRANSFER: 15
};
var poolTypes = {
  CONSTANT_PRODUCT: 0,
  // x * y = k (Uniswap v2 style)
  STABLE_SWAP: 1,
  // Curve-style stable swap
  CONCENTRATED: 2
  // Uniswap v3 style CLMM
};
function buildInstructionPrefix(domain, op) {
  return Buffer.from([domain, op]);
}
function getDomainName(domain) {
  const names = {
    [DOMAIN_EXTENDED]: "EXTENDED",
    [DOMAIN_TLV]: "TLV",
    [DOMAIN_SCHEMA]: "SCHEMA",
    [DOMAIN_STS]: "STS",
    [DOMAIN_MESSAGING]: "MESSAGING",
    [DOMAIN_ACCOUNT]: "ACCOUNT",
    [DOMAIN_VSL]: "VSL",
    [DOMAIN_NOTES]: "NOTES",
    [DOMAIN_COMPLIANCE]: "COMPLIANCE",
    [DOMAIN_PRIVACY]: "PRIVACY",
    [DOMAIN_DEFI]: "DEFI",
    [DOMAIN_NFT]: "NFT",
    [DOMAIN_DERIVATIVES]: "DERIVATIVES",
    [DOMAIN_BRIDGE]: "BRIDGE",
    [DOMAIN_SECURITIES]: "SECURITIES",
    [DOMAIN_GOVERNANCE]: "GOVERNANCE",
    [DOMAIN_DAM]: "DAM",
    [DOMAIN_IC]: "IC",
    [DOMAIN_SWAP]: "SWAP",
    [DOMAIN_EASYPAY]: "EASYPAY"
  };
  return names[domain] || "UNKNOWN";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DOMAIN_ACCOUNT,
  DOMAIN_BRIDGE,
  DOMAIN_COMPLIANCE,
  DOMAIN_DAM,
  DOMAIN_DEFI,
  DOMAIN_DERIVATIVES,
  DOMAIN_EASYPAY,
  DOMAIN_EXTENDED,
  DOMAIN_GOVERNANCE,
  DOMAIN_IC,
  DOMAIN_MESSAGING,
  DOMAIN_NFT,
  DOMAIN_NOTES,
  DOMAIN_PRIVACY,
  DOMAIN_SCHEMA,
  DOMAIN_SECURITIES,
  DOMAIN_STS,
  DOMAIN_SWAP,
  DOMAIN_TLV,
  DOMAIN_VSL,
  account,
  bridge,
  buildInstructionPrefix,
  compliance,
  dam,
  defi,
  derivatives,
  easypay,
  extensions,
  getDomainName,
  governance,
  ic,
  messaging,
  nft,
  notes,
  poolTypes,
  privacy,
  securities,
  sts,
  swap,
  vsl
});
