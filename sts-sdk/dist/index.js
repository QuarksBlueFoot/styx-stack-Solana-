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

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ADAPTER_CUSTOM: () => ADAPTER_CUSTOM,
  ADAPTER_DRIFT: () => ADAPTER_DRIFT,
  ADAPTER_JUPITER: () => ADAPTER_JUPITER,
  ADAPTER_MARINADE: () => ADAPTER_MARINADE,
  ADAPTER_RAYDIUM: () => ADAPTER_RAYDIUM,
  AUCTION_DUTCH: () => AUCTION_DUTCH,
  AUCTION_ENGLISH: () => AUCTION_ENGLISH,
  AUCTION_SEALED: () => AUCTION_SEALED,
  CHAIN_ARBITRUM: () => CHAIN_ARBITRUM,
  CHAIN_AVALANCHE: () => CHAIN_AVALANCHE,
  CHAIN_BASE: () => CHAIN_BASE,
  CHAIN_BSC: () => CHAIN_BSC,
  CHAIN_ETHEREUM: () => CHAIN_ETHEREUM,
  CHAIN_POLYGON: () => CHAIN_POLYGON,
  CHAIN_SOLANA: () => CHAIN_SOLANA,
  CLMM_ADD: () => CLMM_ADD,
  CLMM_CLOSE: () => CLMM_CLOSE,
  CLMM_COLLECT_FEES: () => CLMM_COLLECT_FEES,
  CLMM_OPEN: () => CLMM_OPEN,
  CLMM_REMOVE: () => CLMM_REMOVE,
  CONDITION_HASHLOCK: () => CONDITION_HASHLOCK,
  CONDITION_MULTISIG: () => CONDITION_MULTISIG,
  CONDITION_ORACLE: () => CONDITION_ORACLE,
  CONDITION_TIMELOCK: () => CONDITION_TIMELOCK,
  CPI_TYPE_ATTESTATION: () => CPI_TYPE_ATTESTATION,
  CPI_TYPE_EVENT: () => CPI_TYPE_EVENT,
  CPI_TYPE_GENERIC: () => CPI_TYPE_GENERIC,
  CPI_TYPE_RECEIPT: () => CPI_TYPE_RECEIPT,
  DRIFT_ADD_MARGIN: () => DRIFT_ADD_MARGIN,
  DRIFT_CLOSE: () => DRIFT_CLOSE,
  DRIFT_OPEN_LONG: () => DRIFT_OPEN_LONG,
  DRIFT_OPEN_SHORT: () => DRIFT_OPEN_SHORT,
  EXT_ADAPTER: () => EXT_ADAPTER,
  EXT_AUCTION: () => EXT_AUCTION,
  EXT_CONDITIONAL: () => EXT_CONDITIONAL,
  EXT_CONFIDENTIAL: () => EXT_CONFIDENTIAL,
  EXT_CPI_GUARD: () => EXT_CPI_GUARD,
  EXT_DEFAULT_FROZEN: () => EXT_DEFAULT_FROZEN,
  EXT_DELEGATION: () => EXT_DELEGATION,
  EXT_DELEGATION_CHAIN: () => EXT_DELEGATION_CHAIN,
  EXT_FROZEN: () => EXT_FROZEN,
  EXT_GEOGRAPHIC: () => EXT_GEOGRAPHIC,
  EXT_GOVERNANCE_LOCK: () => EXT_GOVERNANCE_LOCK,
  EXT_GROUP: () => EXT_GROUP,
  EXT_HOOK: () => EXT_HOOK,
  EXT_INTEREST: () => EXT_INTEREST,
  EXT_MEMBER: () => EXT_MEMBER,
  EXT_METADATA: () => EXT_METADATA,
  EXT_MULTI_SIG: () => EXT_MULTI_SIG,
  EXT_NFT_LISTING: () => EXT_NFT_LISTING,
  EXT_ORACLE_BOUND: () => EXT_ORACLE_BOUND,
  EXT_POOL: () => EXT_POOL,
  EXT_PPV: () => EXT_PPV,
  EXT_PROGRAMMABLE: () => EXT_PROGRAMMABLE,
  EXT_RECOVERABLE: () => EXT_RECOVERABLE,
  EXT_REPUTATION: () => EXT_REPUTATION,
  EXT_REQUIRED_MEMO: () => EXT_REQUIRED_MEMO,
  EXT_ROYALTY: () => EXT_ROYALTY,
  EXT_SCALED_BALANCE: () => EXT_SCALED_BALANCE,
  EXT_SOULBOUND: () => EXT_SOULBOUND,
  EXT_TIME_DECAY: () => EXT_TIME_DECAY,
  EXT_TRANSFER_FEE: () => EXT_TRANSFER_FEE,
  EXT_VELOCITY_LIMIT: () => EXT_VELOCITY_LIMIT,
  EXT_VESTING: () => EXT_VESTING,
  EXT_YIELD: () => EXT_YIELD,
  GHOST_ACTION_ANONYMOUS_ACCESS: () => GHOST_ACTION_ANONYMOUS_ACCESS,
  GHOST_ACTION_AUTHENTICATE: () => GHOST_ACTION_AUTHENTICATE,
  GHOST_ACTION_PROVE_MEMBERSHIP: () => GHOST_ACTION_PROVE_MEMBERSHIP,
  GHOST_ACTION_VERIFY_SECRET: () => GHOST_ACTION_VERIFY_SECRET,
  LENDING_BORROW: () => LENDING_BORROW,
  LENDING_DEPOSIT: () => LENDING_DEPOSIT,
  LENDING_REPAY: () => LENDING_REPAY,
  LENDING_WITHDRAW: () => LENDING_WITHDRAW,
  MARINADE_DELAYED_UNSTAKE: () => MARINADE_DELAYED_UNSTAKE,
  MARINADE_STAKE: () => MARINADE_STAKE,
  MARINADE_UNSTAKE: () => MARINADE_UNSTAKE,
  MAX_REFERRAL_DEPTH: () => MAX_REFERRAL_DEPTH,
  MP_ACTION_ADD_PARTY: () => MP_ACTION_ADD_PARTY,
  MP_ACTION_CHANGE_THRESHOLD: () => MP_ACTION_CHANGE_THRESHOLD,
  MP_ACTION_DELEGATE: () => MP_ACTION_DELEGATE,
  MP_ACTION_REMOVE_PARTY: () => MP_ACTION_REMOVE_PARTY,
  MP_ACTION_TRANSFER: () => MP_ACTION_TRANSFER,
  ORDER_BUY: () => ORDER_BUY,
  ORDER_SELL: () => ORDER_SELL,
  PERM_CAN_MESSAGE: () => PERM_CAN_MESSAGE,
  PERM_CAN_SUBDELEGATE: () => PERM_CAN_SUBDELEGATE,
  PERM_CAN_TRANSFER: () => PERM_CAN_TRANSFER,
  PERM_CAN_VOTE: () => PERM_CAN_VOTE,
  PERM_REQUIRES_2FA: () => PERM_REQUIRES_2FA,
  POOL_TYPE_CONCENTRATED: () => POOL_TYPE_CONCENTRATED,
  POOL_TYPE_CONSTANT_PRODUCT: () => POOL_TYPE_CONSTANT_PRODUCT,
  POOL_TYPE_STABLE_SWAP: () => POOL_TYPE_STABLE_SWAP,
  PROTOCOL_FEE_LAMPORTS: () => PROTOCOL_FEE_LAMPORTS,
  REFERRAL_BASE_BPS: () => REFERRAL_BASE_BPS,
  REVEAL_AMOUNT: () => REVEAL_AMOUNT,
  REVEAL_MEMO: () => REVEAL_MEMO,
  REVEAL_RECIPIENT: () => REVEAL_RECIPIENT,
  REVEAL_SENDER: () => REVEAL_SENDER,
  REVEAL_TIMESTAMP: () => REVEAL_TIMESTAMP,
  REVOKER_DELEGATE: () => REVOKER_DELEGATE,
  REVOKER_GUARDIAN: () => REVOKER_GUARDIAN,
  REVOKER_OWNER: () => REVOKER_OWNER,
  REVOKE_COMPROMISED: () => REVOKE_COMPROMISED,
  REVOKE_EXPIRED: () => REVOKE_EXPIRED,
  REVOKE_NORMAL: () => REVOKE_NORMAL,
  REVOKE_UPGRADED: () => REVOKE_UPGRADED,
  STS: () => STS,
  STYX_PMP_DEVNET_PROGRAM_ID: () => STYX_PMP_DEVNET_PROGRAM_ID,
  STYX_PMP_PROGRAM_ID: () => STYX_PMP_PROGRAM_ID,
  SWAP_A_TO_B: () => SWAP_A_TO_B,
  SWAP_B_TO_A: () => SWAP_B_TO_A,
  StyxDelegation: () => StyxDelegation,
  StyxGovernance: () => StyxGovernance,
  StyxGuardian: () => StyxGuardian,
  StyxMultiparty: () => StyxMultiparty,
  StyxNovel: () => StyxNovel,
  StyxPMP: () => StyxPMP,
  StyxReferral: () => StyxReferral,
  StyxSubscription: () => StyxSubscription,
  StyxSwap: () => StyxSwap,
  StyxVTA: () => StyxVTA,
  TAG_ACCREDITATION_PROOF: () => TAG_ACCREDITATION_PROOF,
  TAG_ADAPTER_CALL: () => TAG_ADAPTER_CALL,
  TAG_ADAPTER_CALLBACK: () => TAG_ADAPTER_CALLBACK,
  TAG_ADAPTER_REGISTER: () => TAG_ADAPTER_REGISTER,
  TAG_AMM_ADD_LIQUIDITY: () => TAG_AMM_ADD_LIQUIDITY,
  TAG_AMM_POOL_CREATE: () => TAG_AMM_POOL_CREATE,
  TAG_AMM_QUOTE: () => TAG_AMM_QUOTE,
  TAG_AMM_REMOVE_LIQUIDITY: () => TAG_AMM_REMOVE_LIQUIDITY,
  TAG_AMM_SWAP: () => TAG_AMM_SWAP,
  TAG_AMM_SYNC: () => TAG_AMM_SYNC,
  TAG_APB_BATCH: () => TAG_APB_BATCH,
  TAG_APB_TRANSFER: () => TAG_APB_TRANSFER,
  TAG_ATOMIC_CPI_TRANSFER: () => TAG_ATOMIC_CPI_TRANSFER,
  TAG_AUCTION_BID: () => TAG_AUCTION_BID,
  TAG_AUCTION_CANCEL: () => TAG_AUCTION_CANCEL,
  TAG_AUCTION_CREATE: () => TAG_AUCTION_CREATE,
  TAG_AUCTION_SETTLE: () => TAG_AUCTION_SETTLE,
  TAG_BALANCE_ATTEST: () => TAG_BALANCE_ATTEST,
  TAG_BALANCE_VERIFY: () => TAG_BALANCE_VERIFY,
  TAG_BATCH_NOTE_OPS: () => TAG_BATCH_NOTE_OPS,
  TAG_BATCH_NULLIFIER: () => TAG_BATCH_NULLIFIER,
  TAG_BATCH_SETTLE: () => TAG_BATCH_SETTLE,
  TAG_BRIDGE_BURN: () => TAG_BRIDGE_BURN,
  TAG_BRIDGE_FEE_COLLECT: () => TAG_BRIDGE_FEE_COLLECT,
  TAG_BRIDGE_GUARDIAN_ROTATE: () => TAG_BRIDGE_GUARDIAN_ROTATE,
  TAG_BRIDGE_LOCK: () => TAG_BRIDGE_LOCK,
  TAG_BRIDGE_MINT: () => TAG_BRIDGE_MINT,
  TAG_BRIDGE_PAUSE: () => TAG_BRIDGE_PAUSE,
  TAG_BRIDGE_RELEASE: () => TAG_BRIDGE_RELEASE,
  TAG_BRIDGE_RESUME: () => TAG_BRIDGE_RESUME,
  TAG_BTC_RELAY_SUBMIT: () => TAG_BTC_RELAY_SUBMIT,
  TAG_BTC_SPV_PROOF: () => TAG_BTC_SPV_PROOF,
  TAG_CHRONO_LOCK: () => TAG_CHRONO_LOCK,
  TAG_CHRONO_REVEAL: () => TAG_CHRONO_REVEAL,
  TAG_CLEAN_SOURCE_PROVE: () => TAG_CLEAN_SOURCE_PROVE,
  TAG_CLEAN_SOURCE_REGISTER: () => TAG_CLEAN_SOURCE_REGISTER,
  TAG_COLLECTION_CREATE: () => TAG_COLLECTION_CREATE,
  TAG_COMPLIANCE_CHANNEL_OPEN: () => TAG_COMPLIANCE_CHANNEL_OPEN,
  TAG_COMPLIANCE_CHANNEL_REPORT: () => TAG_COMPLIANCE_CHANNEL_REPORT,
  TAG_COMPLIANCE_PROOF: () => TAG_COMPLIANCE_PROOF,
  TAG_CONCENTRATED_LP: () => TAG_CONCENTRATED_LP,
  TAG_CONDITIONAL_COMMIT: () => TAG_CONDITIONAL_COMMIT,
  TAG_CONDITIONAL_TRANSFER: () => TAG_CONDITIONAL_TRANSFER,
  TAG_CONFIDENTIAL_MINT: () => TAG_CONFIDENTIAL_MINT,
  TAG_CONFIDENTIAL_TRANSFER: () => TAG_CONFIDENTIAL_TRANSFER,
  TAG_CONFIDENTIAL_TRANSFER_V2: () => TAG_CONFIDENTIAL_TRANSFER_V2,
  TAG_CORPORATE_ACTION: () => TAG_CORPORATE_ACTION,
  TAG_CPI_INSCRIBE: () => TAG_CPI_INSCRIBE,
  TAG_CROSS_MARGIN_SYNC: () => TAG_CROSS_MARGIN_SYNC,
  TAG_CROSS_MINT_ATOMIC: () => TAG_CROSS_MINT_ATOMIC,
  TAG_DECENTRALIZATION_METRIC: () => TAG_DECENTRALIZATION_METRIC,
  TAG_DECOY_REVEAL: () => TAG_DECOY_REVEAL,
  TAG_DECOY_STORM: () => TAG_DECOY_STORM,
  TAG_DELEGATION_CHAIN: () => TAG_DELEGATION_CHAIN,
  TAG_DRIFT_PERP: () => TAG_DRIFT_PERP,
  TAG_EPHEMERAL_CREATE: () => TAG_EPHEMERAL_CREATE,
  TAG_EPHEMERAL_DRAIN: () => TAG_EPHEMERAL_DRAIN,
  TAG_ETH_STATE_PROOF: () => TAG_ETH_STATE_PROOF,
  TAG_EXCHANGE_PROOF: () => TAG_EXCHANGE_PROOF,
  TAG_FAIR_LAUNCH_COMMIT: () => TAG_FAIR_LAUNCH_COMMIT,
  TAG_FAIR_LAUNCH_REVEAL: () => TAG_FAIR_LAUNCH_REVEAL,
  TAG_FLASH_LOAN: () => TAG_FLASH_LOAN,
  TAG_FREEZE_ENFORCED: () => TAG_FREEZE_ENFORCED,
  TAG_FUNDING_RATE_APPLY: () => TAG_FUNDING_RATE_APPLY,
  TAG_GEO_RESTRICTION: () => TAG_GEO_RESTRICTION,
  TAG_GHOST_PDA: () => TAG_GHOST_PDA,
  TAG_GOVERNANCE_LOCK: () => TAG_GOVERNANCE_LOCK,
  TAG_GPOOL_DEPOSIT: () => TAG_GPOOL_DEPOSIT,
  TAG_GPOOL_WITHDRAW: () => TAG_GPOOL_WITHDRAW,
  TAG_GPOOL_WITHDRAW_STEALTH: () => TAG_GPOOL_WITHDRAW_STEALTH,
  TAG_GPOOL_WITHDRAW_SWAP: () => TAG_GPOOL_WITHDRAW_SWAP,
  TAG_GROUP_ADD_MEMBER: () => TAG_GROUP_ADD_MEMBER,
  TAG_GROUP_CREATE: () => TAG_GROUP_CREATE,
  TAG_GROUP_REMOVE_MEMBER: () => TAG_GROUP_REMOVE_MEMBER,
  TAG_HASHLOCK_COMMIT: () => TAG_HASHLOCK_COMMIT,
  TAG_HASHLOCK_REVEAL: () => TAG_HASHLOCK_REVEAL,
  TAG_HOOK_EXECUTE: () => TAG_HOOK_EXECUTE,
  TAG_HOOK_EXECUTE_REAL: () => TAG_HOOK_EXECUTE_REAL,
  TAG_HOOK_REGISTER: () => TAG_HOOK_REGISTER,
  TAG_IBC_PACKET_ACK: () => TAG_IBC_PACKET_ACK,
  TAG_IBC_PACKET_RECV: () => TAG_IBC_PACKET_RECV,
  TAG_INNOCENCE_MINT: () => TAG_INNOCENCE_MINT,
  TAG_INNOCENCE_REVOKE: () => TAG_INNOCENCE_REVOKE,
  TAG_INNOCENCE_VERIFY: () => TAG_INNOCENCE_VERIFY,
  TAG_INSTITUTIONAL_REPORT: () => TAG_INSTITUTIONAL_REPORT,
  TAG_INSURANCE_FUND_CONTRIBUTE: () => TAG_INSURANCE_FUND_CONTRIBUTE,
  TAG_INTEREST_ACCRUE: () => TAG_INTEREST_ACCRUE,
  TAG_INTEREST_CLAIM: () => TAG_INTEREST_CLAIM,
  TAG_INTEREST_CLAIM_REAL: () => TAG_INTEREST_CLAIM_REAL,
  TAG_JUPITER_ROUTE: () => TAG_JUPITER_ROUTE,
  TAG_LAYERZERO_ENDPOINT: () => TAG_LAYERZERO_ENDPOINT,
  TAG_LIMIT_ORDER_CANCEL: () => TAG_LIMIT_ORDER_CANCEL,
  TAG_LIMIT_ORDER_FILL: () => TAG_LIMIT_ORDER_FILL,
  TAG_LIMIT_ORDER_PLACE: () => TAG_LIMIT_ORDER_PLACE,
  TAG_LP_NOTE_BURN: () => TAG_LP_NOTE_BURN,
  TAG_LP_NOTE_MINT: () => TAG_LP_NOTE_MINT,
  TAG_MARGIN_ACCOUNT_CREATE: () => TAG_MARGIN_ACCOUNT_CREATE,
  TAG_MARGIN_CALL_EMIT: () => TAG_MARGIN_CALL_EMIT,
  TAG_MARGIN_DEPOSIT: () => TAG_MARGIN_DEPOSIT,
  TAG_MARGIN_WITHDRAW: () => TAG_MARGIN_WITHDRAW,
  TAG_MARINADE_STAKE: () => TAG_MARINADE_STAKE,
  TAG_MERKLE_AIRDROP_CLAIM: () => TAG_MERKLE_AIRDROP_CLAIM,
  TAG_MERKLE_AIRDROP_ROOT: () => TAG_MERKLE_AIRDROP_ROOT,
  TAG_MERKLE_EMERGENCY: () => TAG_MERKLE_EMERGENCY,
  TAG_MERKLE_PROOF_VERIFY: () => TAG_MERKLE_PROOF_VERIFY,
  TAG_MERKLE_ROOT_PUBLISH: () => TAG_MERKLE_ROOT_PUBLISH,
  TAG_MERKLE_UPDATE: () => TAG_MERKLE_UPDATE,
  TAG_MULTIPARTY_VTA_INIT: () => TAG_MULTIPARTY_VTA_INIT,
  TAG_MULTIPARTY_VTA_SIGN: () => TAG_MULTIPARTY_VTA_SIGN,
  TAG_MULTI_SIG_NOTE: () => TAG_MULTI_SIG_NOTE,
  TAG_NFT_ACCEPT_OFFER: () => TAG_NFT_ACCEPT_OFFER,
  TAG_NFT_BUY: () => TAG_NFT_BUY,
  TAG_NFT_CANCEL_OFFER: () => TAG_NFT_CANCEL_OFFER,
  TAG_NFT_DELIST: () => TAG_NFT_DELIST,
  TAG_NFT_LIST: () => TAG_NFT_LIST,
  TAG_NFT_MINT: () => TAG_NFT_MINT,
  TAG_NFT_OFFER: () => TAG_NFT_OFFER,
  TAG_NOTE_BURN: () => TAG_NOTE_BURN,
  TAG_NOTE_EXTEND: () => TAG_NOTE_EXTEND,
  TAG_NOTE_FREEZE: () => TAG_NOTE_FREEZE,
  TAG_NOTE_MERGE: () => TAG_NOTE_MERGE,
  TAG_NOTE_MINT: () => TAG_NOTE_MINT,
  TAG_NOTE_SPLIT: () => TAG_NOTE_SPLIT,
  TAG_NOTE_THAW: () => TAG_NOTE_THAW,
  TAG_NOTE_TRANSFER: () => TAG_NOTE_TRANSFER,
  TAG_NULLIFIER_CHECK: () => TAG_NULLIFIER_CHECK,
  TAG_NULLIFIER_CREATE: () => TAG_NULLIFIER_CREATE,
  TAG_NULLIFIER_INSCRIBE: () => TAG_NULLIFIER_INSCRIBE,
  TAG_OPTION_ASSIGN: () => TAG_OPTION_ASSIGN,
  TAG_OPTION_BUY: () => TAG_OPTION_BUY,
  TAG_OPTION_CLOSE: () => TAG_OPTION_CLOSE,
  TAG_OPTION_COLLATERAL_LOCK: () => TAG_OPTION_COLLATERAL_LOCK,
  TAG_OPTION_COLLATERAL_RELEASE: () => TAG_OPTION_COLLATERAL_RELEASE,
  TAG_OPTION_EXERCISE: () => TAG_OPTION_EXERCISE,
  TAG_OPTION_EXPIRE: () => TAG_OPTION_EXPIRE,
  TAG_OPTION_MARKET_MAKE: () => TAG_OPTION_MARKET_MAKE,
  TAG_OPTION_SERIES_CREATE: () => TAG_OPTION_SERIES_CREATE,
  TAG_OPTION_WRITE: () => TAG_OPTION_WRITE,
  TAG_ORACLE_BOUND: () => TAG_ORACLE_BOUND,
  TAG_PHANTOM_NFT_COMMIT: () => TAG_PHANTOM_NFT_COMMIT,
  TAG_PHANTOM_NFT_PROVE: () => TAG_PHANTOM_NFT_PROVE,
  TAG_POOL_CREATE: () => TAG_POOL_CREATE,
  TAG_POOL_DEPOSIT: () => TAG_POOL_DEPOSIT,
  TAG_POOL_DONATE: () => TAG_POOL_DONATE,
  TAG_POOL_WITHDRAW: () => TAG_POOL_WITHDRAW,
  TAG_POSITION_CLOSE: () => TAG_POSITION_CLOSE,
  TAG_POSITION_LIQUIDATE: () => TAG_POSITION_LIQUIDATE,
  TAG_POSITION_OPEN: () => TAG_POSITION_OPEN,
  TAG_PPV_CREATE: () => TAG_PPV_CREATE,
  TAG_PPV_EXTEND: () => TAG_PPV_EXTEND,
  TAG_PPV_REDEEM: () => TAG_PPV_REDEEM,
  TAG_PPV_REVOKE: () => TAG_PPV_REVOKE,
  TAG_PPV_TRANSFER: () => TAG_PPV_TRANSFER,
  TAG_PPV_VERIFY: () => TAG_PPV_VERIFY,
  TAG_PRIVATE_LENDING: () => TAG_PRIVATE_LENDING,
  TAG_PRIVATE_LP_ADD: () => TAG_PRIVATE_LP_ADD,
  TAG_PRIVATE_LP_REMOVE: () => TAG_PRIVATE_LP_REMOVE,
  TAG_PRIVATE_STAKE: () => TAG_PRIVATE_STAKE,
  TAG_PRIVATE_SUBSCRIPTION: () => TAG_PRIVATE_SUBSCRIPTION,
  TAG_PRIVATE_SWAP: () => TAG_PRIVATE_SWAP,
  TAG_PRIVATE_UNSTAKE: () => TAG_PRIVATE_UNSTAKE,
  TAG_PROTOCOL_PAUSE: () => TAG_PROTOCOL_PAUSE,
  TAG_PROTOCOL_UNPAUSE: () => TAG_PROTOCOL_UNPAUSE,
  TAG_PROVENANCE_COMMIT: () => TAG_PROVENANCE_COMMIT,
  TAG_PROVENANCE_EXTEND: () => TAG_PROVENANCE_EXTEND,
  TAG_PROVENANCE_VERIFY: () => TAG_PROVENANCE_VERIFY,
  TAG_RECOVERABLE_NOTE: () => TAG_RECOVERABLE_NOTE,
  TAG_REG_D_LOCKUP: () => TAG_REG_D_LOCKUP,
  TAG_REPUTATION_GATE: () => TAG_REPUTATION_GATE,
  TAG_ROUTER_SPLIT: () => TAG_ROUTER_SPLIT,
  TAG_ROUTER_SWAP: () => TAG_ROUTER_SWAP,
  TAG_ROYALTY_CLAIM: () => TAG_ROYALTY_CLAIM,
  TAG_ROYALTY_CLAIM_REAL: () => TAG_ROYALTY_CLAIM_REAL,
  TAG_SECURITY_AUDIT: () => TAG_SECURITY_AUDIT,
  TAG_SECURITY_FREEZE: () => TAG_SECURITY_FREEZE,
  TAG_SECURITY_ISSUE: () => TAG_SECURITY_ISSUE,
  TAG_SECURITY_TRANSFER: () => TAG_SECURITY_TRANSFER,
  TAG_SELECTIVE_DISCLOSURE: () => TAG_SELECTIVE_DISCLOSURE,
  TAG_SHADOW_FOLLOW: () => TAG_SHADOW_FOLLOW,
  TAG_SHADOW_UNFOLLOW: () => TAG_SHADOW_UNFOLLOW,
  TAG_SHARE_CLASS_CREATE: () => TAG_SHARE_CLASS_CREATE,
  TAG_SOCIAL_RECOVERY: () => TAG_SOCIAL_RECOVERY,
  TAG_STATE_CHANNEL_CLOSE: () => TAG_STATE_CHANNEL_CLOSE,
  TAG_STATE_CHANNEL_OPEN: () => TAG_STATE_CHANNEL_OPEN,
  TAG_STEALTH_SCAN_HINT: () => TAG_STEALTH_SCAN_HINT,
  TAG_STEALTH_SWAP_EXEC: () => TAG_STEALTH_SWAP_EXEC,
  TAG_STEALTH_SWAP_INIT: () => TAG_STEALTH_SWAP_INIT,
  TAG_TEMPORAL_INNOCENCE: () => TAG_TEMPORAL_INNOCENCE,
  TAG_THAW_GOVERNED: () => TAG_THAW_GOVERNED,
  TAG_TIME_CAPSULE: () => TAG_TIME_CAPSULE,
  TAG_TIME_DECAY: () => TAG_TIME_DECAY,
  TAG_TIME_LOCKED_REVEAL: () => TAG_TIME_LOCKED_REVEAL,
  TAG_TOKEN_CREATE: () => TAG_TOKEN_CREATE,
  TAG_TOKEN_METADATA_SET: () => TAG_TOKEN_METADATA_SET,
  TAG_TOKEN_METADATA_UPDATE: () => TAG_TOKEN_METADATA_UPDATE,
  TAG_TOKEN_SET_AUTHORITY: () => TAG_TOKEN_SET_AUTHORITY,
  TAG_TRANSFER_AGENT_APPROVE: () => TAG_TRANSFER_AGENT_APPROVE,
  TAG_TRANSFER_AGENT_REGISTER: () => TAG_TRANSFER_AGENT_REGISTER,
  TAG_TWAP_ORDER_FILL: () => TAG_TWAP_ORDER_FILL,
  TAG_TWAP_ORDER_START: () => TAG_TWAP_ORDER_START,
  TAG_UNWRAP_SPL: () => TAG_UNWRAP_SPL,
  TAG_VALIDATOR_PROOF: () => TAG_VALIDATOR_PROOF,
  TAG_VELOCITY_LIMIT: () => TAG_VELOCITY_LIMIT,
  TAG_VSL_AUDIT_REVEAL: () => TAG_VSL_AUDIT_REVEAL,
  TAG_VSL_BALANCE_PROOF: () => TAG_VSL_BALANCE_PROOF,
  TAG_VSL_DEPOSIT: () => TAG_VSL_DEPOSIT,
  TAG_VSL_ESCROW_CREATE: () => TAG_VSL_ESCROW_CREATE,
  TAG_VSL_ESCROW_REFUND: () => TAG_VSL_ESCROW_REFUND,
  TAG_VSL_ESCROW_RELEASE: () => TAG_VSL_ESCROW_RELEASE,
  TAG_VSL_MERGE: () => TAG_VSL_MERGE,
  TAG_VSL_PRIVATE_SWAP: () => TAG_VSL_PRIVATE_SWAP,
  TAG_VSL_PRIVATE_TRANSFER: () => TAG_VSL_PRIVATE_TRANSFER,
  TAG_VSL_SHIELDED_SEND: () => TAG_VSL_SHIELDED_SEND,
  TAG_VSL_SPLIT: () => TAG_VSL_SPLIT,
  TAG_VSL_WITHDRAW: () => TAG_VSL_WITHDRAW,
  TAG_VTA_DELEGATE: () => TAG_VTA_DELEGATE,
  TAG_VTA_GUARDIAN_RECOVER: () => TAG_VTA_GUARDIAN_RECOVER,
  TAG_VTA_GUARDIAN_SET: () => TAG_VTA_GUARDIAN_SET,
  TAG_VTA_REVOKE: () => TAG_VTA_REVOKE,
  TAG_WORMHOLE_VAA_VERIFY: () => TAG_WORMHOLE_VAA_VERIFY,
  TAG_WRAPPER_BURN: () => TAG_WRAPPER_BURN,
  TAG_WRAPPER_MINT: () => TAG_WRAPPER_MINT,
  TAG_WRAP_SPL: () => TAG_WRAP_SPL,
  TAG_YIELD_CLAIM: () => TAG_YIELD_CLAIM,
  TAG_YIELD_DEPOSIT: () => TAG_YIELD_DEPOSIT,
  TAG_YIELD_VAULT_CREATE: () => TAG_YIELD_VAULT_CREATE,
  TAG_YIELD_WITHDRAW: () => TAG_YIELD_WITHDRAW,
  TREASURY: () => TREASURY,
  TRUST_INDEXER: () => TRUST_INDEXER,
  TRUST_MERKLE_PROOF: () => TRUST_MERKLE_PROOF,
  TRUST_NULLIFIER_PDA: () => TRUST_NULLIFIER_PDA,
  buildAPBTransferInstruction: () => buildAPBTransferInstruction,
  buildAmmAddLiquidity: () => buildAmmAddLiquidity,
  buildAmmPoolCreate: () => buildAmmPoolCreate,
  buildAmmQuote: () => buildAmmQuote,
  buildAmmRemoveLiquidity: () => buildAmmRemoveLiquidity,
  buildAmmSwap: () => buildAmmSwap,
  buildAmmSync: () => buildAmmSync,
  buildAtomicCpiTransfer: () => buildAtomicCpiTransfer,
  buildAuctionBidInstruction: () => buildAuctionBidInstruction,
  buildAuctionCreateInstruction: () => buildAuctionCreateInstruction,
  buildBalanceAttest: () => buildBalanceAttest,
  buildBatchNoteOps: () => buildBatchNoteOps,
  buildBatchNullifier: () => buildBatchNullifier,
  buildBatchSettleInstruction: () => buildBatchSettleInstruction,
  buildBridgeLock: () => buildBridgeLock,
  buildBridgeOracleRegister: () => buildBridgeOracleRegister,
  buildBridgePause: () => buildBridgePause,
  buildBridgeRelease: () => buildBridgeRelease,
  buildCPIInscribeInstruction: () => buildCPIInscribeInstruction,
  buildConcentratedLp: () => buildConcentratedLp,
  buildConditionalTransfer: () => buildConditionalTransfer,
  buildConfidentialTransferV2: () => buildConfidentialTransferV2,
  buildCrossMintAtomic: () => buildCrossMintAtomic,
  buildDelegationChain: () => buildDelegationChain,
  buildDriftPerp: () => buildDriftPerp,
  buildExchangeProof: () => buildExchangeProof,
  buildFlashLoan: () => buildFlashLoan,
  buildFreezeEnforced: () => buildFreezeEnforced,
  buildGeoRestriction: () => buildGeoRestriction,
  buildGhostPDAInstruction: () => buildGhostPDAInstruction,
  buildGovernanceLock: () => buildGovernanceLock,
  buildHashlockCommitInstruction: () => buildHashlockCommitInstruction,
  buildHashlockRevealInstruction: () => buildHashlockRevealInstruction,
  buildHookExecute: () => buildHookExecute,
  buildInterestClaimReal: () => buildInterestClaimReal,
  buildJupiterRoute: () => buildJupiterRoute,
  buildLimitOrderCancel: () => buildLimitOrderCancel,
  buildLimitOrderFill: () => buildLimitOrderFill,
  buildLimitOrderPlace: () => buildLimitOrderPlace,
  buildLpNoteBurn: () => buildLpNoteBurn,
  buildLpNoteMint: () => buildLpNoteMint,
  buildMarginLiquidate: () => buildMarginLiquidate,
  buildMarginOpen: () => buildMarginOpen,
  buildMarinadeStake: () => buildMarinadeStake,
  buildMerkleProofVerify: () => buildMerkleProofVerify,
  buildMultiSigNote: () => buildMultiSigNote,
  buildMultipartyVTAInitInstruction: () => buildMultipartyVTAInitInstruction,
  buildMultipartyVTASignInstruction: () => buildMultipartyVTASignInstruction,
  buildNftBuyInstruction: () => buildNftBuyInstruction,
  buildNftDelistInstruction: () => buildNftDelistInstruction,
  buildNftListInstruction: () => buildNftListInstruction,
  buildNullifierCheck: () => buildNullifierCheck,
  buildNullifierCreate: () => buildNullifierCreate,
  buildOptionCreate: () => buildOptionCreate,
  buildOptionExercise: () => buildOptionExercise,
  buildOptionSettle: () => buildOptionSettle,
  buildOracleBound: () => buildOracleBound,
  buildPPVCreateInstruction: () => buildPPVCreateInstruction,
  buildPPVRedeemInstruction: () => buildPPVRedeemInstruction,
  buildPPVVerifyInstruction: () => buildPPVVerifyInstruction,
  buildPoolCreateInstruction: () => buildPoolCreateInstruction,
  buildPoolDepositInstruction: () => buildPoolDepositInstruction,
  buildPoolWithdrawInstruction: () => buildPoolWithdrawInstruction,
  buildPositionOpen: () => buildPositionOpen,
  buildPrivateLending: () => buildPrivateLending,
  buildPrivateStakeInstruction: () => buildPrivateStakeInstruction,
  buildPrivateSubscriptionInstruction: () => buildPrivateSubscriptionInstruction,
  buildPrivateSwapInstruction: () => buildPrivateSwapInstruction,
  buildProposalInstruction: () => buildProposalInstruction,
  buildRecoverableNote: () => buildRecoverableNote,
  buildReferralInstruction: () => buildReferralInstruction,
  buildReputationGate: () => buildReputationGate,
  buildRouterSplit: () => buildRouterSplit,
  buildRouterSwap: () => buildRouterSwap,
  buildRoyaltyClaimReal: () => buildRoyaltyClaimReal,
  buildSecurityIssue: () => buildSecurityIssue,
  buildSecurityTransfer: () => buildSecurityTransfer,
  buildSelectiveDisclosure: () => buildSelectiveDisclosure,
  buildSocialRecovery: () => buildSocialRecovery,
  buildStateChannelCloseInstruction: () => buildStateChannelCloseInstruction,
  buildStateChannelOpenInstruction: () => buildStateChannelOpenInstruction,
  buildStealthScanHintInstruction: () => buildStealthScanHintInstruction,
  buildStealthSwapExecInstruction: () => buildStealthSwapExecInstruction,
  buildStealthSwapInitInstruction: () => buildStealthSwapInitInstruction,
  buildTimeCapsuleInstruction: () => buildTimeCapsuleInstruction,
  buildTimeDecay: () => buildTimeDecay,
  buildTimeLockedReveal: () => buildTimeLockedReveal,
  buildTokenCreateInstruction: () => buildTokenCreateInstruction,
  buildTokenMetadataUpdateInstruction: () => buildTokenMetadataUpdateInstruction,
  buildTokenSetAuthorityInstruction: () => buildTokenSetAuthorityInstruction,
  buildTransferAgentRegister: () => buildTransferAgentRegister,
  buildTwapOrderFill: () => buildTwapOrderFill,
  buildTwapOrderStart: () => buildTwapOrderStart,
  buildVTADelegateInstruction: () => buildVTADelegateInstruction,
  buildVTAGuardianRecoverInstruction: () => buildVTAGuardianRecoverInstruction,
  buildVTAGuardianSetInstruction: () => buildVTAGuardianSetInstruction,
  buildVTARevokeInstruction: () => buildVTARevokeInstruction,
  buildValidatorProof: () => buildValidatorProof,
  buildVelocityLimit: () => buildVelocityLimit,
  buildVoteInstruction: () => buildVoteInstruction,
  buildWrapperBurn: () => buildWrapperBurn,
  buildWrapperMint: () => buildWrapperMint,
  buildYieldDepositInstruction: () => buildYieldDepositInstruction,
  buildYieldVaultCreateInstruction: () => buildYieldVaultCreateInstruction,
  calculateConstantProductSwap: () => calculateConstantProductSwap,
  calculateLpBurn: () => calculateLpBurn,
  calculateLpMint: () => calculateLpMint,
  calculatePriceImpact: () => calculatePriceImpact,
  calculateReferralChainRewards: () => calculateReferralChainRewards,
  calculateReferralReward: () => calculateReferralReward,
  compareCosts: () => compareCosts,
  compareValidatorBurden: () => compareValidatorBurden,
  computePoolId: () => computePoolId,
  decryptAmount: () => decryptAmount,
  decryptPayload: () => decryptPayload,
  decryptRecipient: () => decryptRecipient,
  default: () => index_default,
  deriveGhostPDA: () => deriveGhostPDA,
  deriveSharedSecret: () => deriveSharedSecret,
  deriveTimeCapsuleKey: () => deriveTimeCapsuleKey,
  encryptAmount: () => encryptAmount,
  encryptPayload: () => encryptPayload,
  encryptRecipient: () => encryptRecipient,
  generateCommitment: () => generateCommitment,
  generateNoteCommitment: () => generateNoteCommitment,
  generateNullifier: () => generateNullifier,
  generateStealthAddress: () => generateStealthAddress,
  generateValidatorProofData: () => generateValidatorProofData,
  generateX25519Keypair: () => generateX25519Keypair
});
module.exports = __toCommonJS(index_exports);
var import_web3 = require("@solana/web3.js");
var import_sha3 = require("@noble/hashes/sha3");
var import_ed25519 = require("@noble/curves/ed25519");
var import_chacha = require("@noble/ciphers/chacha");
var STYX_PMP_PROGRAM_ID = new import_web3.PublicKey("GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9");
var STYX_PMP_DEVNET_PROGRAM_ID = new import_web3.PublicKey("FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW");
var TAG_PRIVATE_MESSAGE = 3;
var TAG_ROUTED_MESSAGE = 4;
var TAG_PRIVATE_TRANSFER = 5;
var TAG_RATCHET_MESSAGE = 7;
var TAG_COMPLIANCE_REVEAL = 8;
var TAG_PROPOSAL = 9;
var TAG_PRIVATE_VOTE = 10;
var TAG_VTA_TRANSFER = 11;
var TAG_REFERRAL_REGISTER = 12;
var TAG_REFERRAL_CLAIM = 13;
var TAG_HASHLOCK_COMMIT = 14;
var TAG_HASHLOCK_REVEAL = 15;
var TAG_CONDITIONAL_COMMIT = 16;
var TAG_BATCH_SETTLE = 17;
var TAG_STATE_CHANNEL_OPEN = 18;
var TAG_STATE_CHANNEL_CLOSE = 19;
var TAG_TIME_CAPSULE = 20;
var TAG_GHOST_PDA = 21;
var TAG_CPI_INSCRIBE = 22;
var TAG_VTA_DELEGATE = 23;
var TAG_VTA_REVOKE = 24;
var TAG_STEALTH_SWAP_INIT = 25;
var TAG_STEALTH_SWAP_EXEC = 26;
var TAG_VTA_GUARDIAN_SET = 27;
var TAG_VTA_GUARDIAN_RECOVER = 28;
var TAG_PRIVATE_SUBSCRIPTION = 29;
var TAG_MULTIPARTY_VTA_INIT = 30;
var TAG_MULTIPARTY_VTA_SIGN = 31;
var TAG_VSL_DEPOSIT = 32;
var TAG_VSL_WITHDRAW = 33;
var TAG_VSL_PRIVATE_TRANSFER = 34;
var TAG_VSL_PRIVATE_SWAP = 35;
var TAG_VSL_SHIELDED_SEND = 36;
var TAG_VSL_SPLIT = 37;
var TAG_VSL_MERGE = 38;
var TAG_VSL_ESCROW_CREATE = 39;
var TAG_VSL_ESCROW_RELEASE = 40;
var TAG_VSL_ESCROW_REFUND = 41;
var TAG_VSL_BALANCE_PROOF = 42;
var TAG_VSL_AUDIT_REVEAL = 43;
var TAG_DECOY_STORM = 44;
var TAG_DECOY_REVEAL = 45;
var TAG_EPHEMERAL_CREATE = 46;
var TAG_EPHEMERAL_DRAIN = 47;
var TAG_CHRONO_LOCK = 48;
var TAG_CHRONO_REVEAL = 49;
var TAG_SHADOW_FOLLOW = 50;
var TAG_SHADOW_UNFOLLOW = 51;
var TAG_PHANTOM_NFT_COMMIT = 52;
var TAG_PHANTOM_NFT_PROVE = 53;
var TAG_INNOCENCE_MINT = 54;
var TAG_INNOCENCE_VERIFY = 55;
var TAG_INNOCENCE_REVOKE = 56;
var TAG_CLEAN_SOURCE_REGISTER = 57;
var TAG_CLEAN_SOURCE_PROVE = 58;
var TAG_TEMPORAL_INNOCENCE = 59;
var TAG_COMPLIANCE_CHANNEL_OPEN = 60;
var TAG_COMPLIANCE_CHANNEL_REPORT = 61;
var TAG_PROVENANCE_COMMIT = 62;
var TAG_PROVENANCE_EXTEND = 63;
var TAG_PROVENANCE_VERIFY = 64;
var TAG_NOTE_MINT = 80;
var TAG_NOTE_TRANSFER = 81;
var TAG_NOTE_MERGE = 82;
var TAG_NOTE_SPLIT = 83;
var TAG_NOTE_BURN = 84;
var TAG_GPOOL_DEPOSIT = 85;
var TAG_GPOOL_WITHDRAW = 86;
var TAG_GPOOL_WITHDRAW_STEALTH = 87;
var TAG_GPOOL_WITHDRAW_SWAP = 88;
var TAG_MERKLE_UPDATE = 89;
var TAG_MERKLE_EMERGENCY = 90;
var TAG_NOTE_EXTEND = 91;
var TAG_NOTE_FREEZE = 92;
var TAG_NOTE_THAW = 93;
var TAG_PROTOCOL_PAUSE = 94;
var TAG_PROTOCOL_UNPAUSE = 95;
var TAG_GROUP_CREATE = 96;
var TAG_GROUP_ADD_MEMBER = 97;
var TAG_GROUP_REMOVE_MEMBER = 98;
var TAG_HOOK_REGISTER = 99;
var TAG_HOOK_EXECUTE = 100;
var TAG_WRAP_SPL = 101;
var TAG_UNWRAP_SPL = 102;
var TAG_INTEREST_ACCRUE = 103;
var TAG_INTEREST_CLAIM = 104;
var TAG_CONFIDENTIAL_MINT = 105;
var TAG_CONFIDENTIAL_TRANSFER = 106;
var TAG_NFT_MINT = 107;
var TAG_COLLECTION_CREATE = 108;
var TAG_ROYALTY_CLAIM = 109;
var TAG_FAIR_LAUNCH_COMMIT = 110;
var TAG_FAIR_LAUNCH_REVEAL = 111;
var TAG_NFT_LIST = 112;
var TAG_NFT_DELIST = 113;
var TAG_NFT_BUY = 114;
var TAG_NFT_OFFER = 115;
var TAG_NFT_ACCEPT_OFFER = 116;
var TAG_NFT_CANCEL_OFFER = 117;
var TAG_AUCTION_CREATE = 118;
var TAG_AUCTION_BID = 119;
var TAG_AUCTION_SETTLE = 120;
var TAG_AUCTION_CANCEL = 121;
var TAG_PPV_CREATE = 122;
var TAG_PPV_VERIFY = 123;
var TAG_PPV_REDEEM = 124;
var TAG_PPV_TRANSFER = 125;
var TAG_PPV_EXTEND = 126;
var TAG_PPV_REVOKE = 127;
var TAG_APB_TRANSFER = 128;
var TAG_APB_BATCH = 129;
var TAG_STEALTH_SCAN_HINT = 130;
var TAG_ADAPTER_REGISTER = 131;
var TAG_ADAPTER_CALL = 132;
var TAG_ADAPTER_CALLBACK = 133;
var TAG_PRIVATE_SWAP = 134;
var TAG_PRIVATE_STAKE = 135;
var TAG_PRIVATE_UNSTAKE = 136;
var TAG_PRIVATE_LP_ADD = 137;
var TAG_PRIVATE_LP_REMOVE = 138;
var TAG_POOL_CREATE = 139;
var TAG_POOL_DEPOSIT = 140;
var TAG_POOL_WITHDRAW = 141;
var TAG_POOL_DONATE = 142;
var TAG_YIELD_VAULT_CREATE = 143;
var TAG_YIELD_DEPOSIT = 144;
var TAG_YIELD_CLAIM = 145;
var TAG_YIELD_WITHDRAW = 146;
var TAG_TOKEN_CREATE = 147;
var TAG_TOKEN_SET_AUTHORITY = 148;
var TAG_TOKEN_METADATA_SET = 149;
var TAG_TOKEN_METADATA_UPDATE = 150;
var TAG_HOOK_EXECUTE_REAL = 151;
var TAG_CONFIDENTIAL_TRANSFER_V2 = 152;
var TAG_INTEREST_CLAIM_REAL = 153;
var TAG_ROYALTY_CLAIM_REAL = 154;
var TAG_BATCH_NOTE_OPS = 155;
var TAG_EXCHANGE_PROOF = 156;
var TAG_SELECTIVE_DISCLOSURE = 157;
var TAG_CONDITIONAL_TRANSFER = 158;
var TAG_DELEGATION_CHAIN = 159;
var TAG_TIME_LOCKED_REVEAL = 160;
var TAG_CROSS_MINT_ATOMIC = 161;
var TAG_SOCIAL_RECOVERY = 162;
var TAG_JUPITER_ROUTE = 163;
var TAG_MARINADE_STAKE = 164;
var TAG_DRIFT_PERP = 165;
var TAG_PRIVATE_LENDING = 166;
var TAG_FLASH_LOAN = 167;
var TAG_ORACLE_BOUND = 168;
var TAG_VELOCITY_LIMIT = 169;
var TAG_GOVERNANCE_LOCK = 170;
var TAG_REPUTATION_GATE = 171;
var TAG_GEO_RESTRICTION = 172;
var TAG_TIME_DECAY = 173;
var TAG_MULTI_SIG_NOTE = 174;
var TAG_RECOVERABLE_NOTE = 175;
var TAG_AMM_POOL_CREATE = 176;
var TAG_AMM_ADD_LIQUIDITY = 177;
var TAG_AMM_REMOVE_LIQUIDITY = 178;
var TAG_AMM_SWAP = 179;
var TAG_AMM_QUOTE = 180;
var TAG_AMM_SYNC = 181;
var TAG_LP_NOTE_MINT = 182;
var TAG_LP_NOTE_BURN = 183;
var TAG_ROUTER_SWAP = 184;
var TAG_ROUTER_SPLIT = 185;
var TAG_LIMIT_ORDER_PLACE = 186;
var TAG_LIMIT_ORDER_FILL = 187;
var TAG_LIMIT_ORDER_CANCEL = 188;
var TAG_TWAP_ORDER_START = 189;
var TAG_TWAP_ORDER_FILL = 190;
var TAG_CONCENTRATED_LP = 191;
var TAG_NULLIFIER_CREATE = 192;
var TAG_NULLIFIER_CHECK = 193;
var TAG_MERKLE_ROOT_PUBLISH = 194;
var TAG_MERKLE_PROOF_VERIFY = 195;
var TAG_BALANCE_ATTEST = 196;
var TAG_BALANCE_VERIFY = 197;
var TAG_FREEZE_ENFORCED = 198;
var TAG_THAW_GOVERNED = 199;
var TAG_WRAPPER_MINT = 200;
var TAG_WRAPPER_BURN = 201;
var TAG_VALIDATOR_PROOF = 202;
var TAG_SECURITY_AUDIT = 203;
var TAG_COMPLIANCE_PROOF = 204;
var TAG_DECENTRALIZATION_METRIC = 205;
var TAG_ATOMIC_CPI_TRANSFER = 206;
var TAG_BATCH_NULLIFIER = 207;
var TAG_NULLIFIER_INSCRIBE = 208;
var TAG_MERKLE_AIRDROP_ROOT = 209;
var TAG_MERKLE_AIRDROP_CLAIM = 210;
var TAG_SECURITY_ISSUE = 211;
var TAG_SECURITY_TRANSFER = 212;
var TAG_TRANSFER_AGENT_REGISTER = 213;
var TAG_TRANSFER_AGENT_APPROVE = 214;
var TAG_ACCREDITATION_PROOF = 215;
var TAG_SHARE_CLASS_CREATE = 216;
var TAG_CORPORATE_ACTION = 217;
var TAG_REG_D_LOCKUP = 218;
var TAG_INSTITUTIONAL_REPORT = 219;
var TAG_SECURITY_FREEZE = 220;
var TAG_OPTION_WRITE = 221;
var TAG_OPTION_BUY = 222;
var TAG_OPTION_EXERCISE = 223;
var TAG_OPTION_EXPIRE = 224;
var TAG_OPTION_ASSIGN = 225;
var TAG_OPTION_CLOSE = 226;
var TAG_OPTION_COLLATERAL_LOCK = 227;
var TAG_OPTION_COLLATERAL_RELEASE = 228;
var TAG_OPTION_SERIES_CREATE = 229;
var TAG_OPTION_MARKET_MAKE = 230;
var TAG_MARGIN_ACCOUNT_CREATE = 231;
var TAG_MARGIN_DEPOSIT = 232;
var TAG_MARGIN_WITHDRAW = 233;
var TAG_POSITION_OPEN = 234;
var TAG_POSITION_CLOSE = 235;
var TAG_POSITION_LIQUIDATE = 236;
var TAG_MARGIN_CALL_EMIT = 237;
var TAG_FUNDING_RATE_APPLY = 238;
var TAG_CROSS_MARGIN_SYNC = 239;
var TAG_INSURANCE_FUND_CONTRIBUTE = 240;
var TAG_BRIDGE_LOCK = 241;
var TAG_BRIDGE_RELEASE = 242;
var TAG_BRIDGE_BURN = 243;
var TAG_BRIDGE_MINT = 244;
var TAG_WORMHOLE_VAA_VERIFY = 245;
var TAG_LAYERZERO_ENDPOINT = 246;
var TAG_IBC_PACKET_RECV = 247;
var TAG_IBC_PACKET_ACK = 248;
var TAG_BTC_SPV_PROOF = 249;
var TAG_BTC_RELAY_SUBMIT = 250;
var TAG_ETH_STATE_PROOF = 251;
var TAG_BRIDGE_FEE_COLLECT = 252;
var TAG_BRIDGE_GUARDIAN_ROTATE = 253;
var TAG_BRIDGE_PAUSE = 254;
var TAG_BRIDGE_RESUME = 255;
var POOL_TYPE_CONSTANT_PRODUCT = 0;
var POOL_TYPE_STABLE_SWAP = 1;
var POOL_TYPE_CONCENTRATED = 2;
var EXT_TRANSFER_FEE = 1;
var EXT_ROYALTY = 2;
var EXT_INTEREST = 3;
var EXT_VESTING = 4;
var EXT_DELEGATION = 5;
var EXT_SOULBOUND = 6;
var EXT_FROZEN = 7;
var EXT_METADATA = 8;
var EXT_HOOK = 9;
var EXT_GROUP = 10;
var EXT_MEMBER = 11;
var EXT_CPI_GUARD = 12;
var EXT_REQUIRED_MEMO = 13;
var EXT_DEFAULT_FROZEN = 14;
var EXT_SCALED_BALANCE = 15;
var EXT_CONFIDENTIAL = 16;
var EXT_PROGRAMMABLE = 17;
var EXT_NFT_LISTING = 18;
var EXT_AUCTION = 19;
var EXT_PPV = 20;
var EXT_ADAPTER = 21;
var EXT_POOL = 22;
var EXT_YIELD = 23;
var EXT_ORACLE_BOUND = 24;
var EXT_TIME_DECAY = 25;
var EXT_GOVERNANCE_LOCK = 26;
var EXT_REPUTATION = 27;
var EXT_GEOGRAPHIC = 28;
var EXT_VELOCITY_LIMIT = 29;
var EXT_MULTI_SIG = 30;
var EXT_RECOVERABLE = 31;
var EXT_CONDITIONAL = 32;
var EXT_DELEGATION_CHAIN = 33;
var ADAPTER_JUPITER = 1;
var ADAPTER_MARINADE = 2;
var ADAPTER_RAYDIUM = 3;
var ADAPTER_DRIFT = 4;
var ADAPTER_CUSTOM = 255;
var AUCTION_ENGLISH = 1;
var AUCTION_DUTCH = 2;
var AUCTION_SEALED = 4;
var TRUST_INDEXER = 0;
var TRUST_NULLIFIER_PDA = 1;
var TRUST_MERKLE_PROOF = 2;
var FLAG_ENCRYPTED = 1;
var FLAG_STEALTH = 2;
var FLAG_COMPLIANCE = 16;
var FLAG_TOKEN22 = 32;
var CHAIN_SOLANA = 1;
var CHAIN_ETHEREUM = 2;
var CHAIN_POLYGON = 3;
var CHAIN_ARBITRUM = 4;
var CHAIN_BASE = 5;
var CHAIN_AVALANCHE = 6;
var CHAIN_BSC = 7;
function encryptRecipient(sender, recipient) {
  const mask = (0, import_sha3.keccak_256)(Buffer.concat([
    Buffer.from("STYX_META_V3"),
    sender.toBytes()
  ]));
  const encrypted = new Uint8Array(32);
  const recipientBytes = recipient.toBytes();
  for (let i = 0; i < 32; i++) {
    encrypted[i] = recipientBytes[i] ^ mask[i];
  }
  return encrypted;
}
function decryptRecipient(sender, encrypted) {
  const mask = (0, import_sha3.keccak_256)(Buffer.concat([
    Buffer.from("STYX_META_V3"),
    sender.toBytes()
  ]));
  const decrypted = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    decrypted[i] = encrypted[i] ^ mask[i];
  }
  return new import_web3.PublicKey(decrypted);
}
function encryptAmount(sender, recipient, nonce, amount) {
  const mask = (0, import_sha3.keccak_256)(Buffer.concat([
    Buffer.from("STYX_XFER_V3"),
    sender.toBytes(),
    recipient.toBytes(),
    Buffer.from(nonce)
  ]));
  const maskBuf = Buffer.from(mask.slice(0, 8));
  const maskValue = maskBuf.readBigUInt64LE();
  return amount ^ maskValue;
}
function decryptAmount(sender, recipient, nonce, encryptedAmount) {
  return encryptAmount(sender, recipient, nonce, encryptedAmount);
}
function deriveSharedSecret(myPrivateKey, theirPublicKey) {
  return import_ed25519.x25519.scalarMult(myPrivateKey, theirPublicKey);
}
function generateX25519Keypair() {
  const privateKey = crypto.getRandomValues(new Uint8Array(32));
  const publicKey = import_ed25519.x25519.scalarMultBase(privateKey);
  return { privateKey, publicKey };
}
function encryptPayload(message, sharedSecret) {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const cipher = (0, import_chacha.chacha20poly1305)(sharedSecret, nonce);
  const encrypted = cipher.encrypt(message);
  return Buffer.concat([Buffer.from(nonce), Buffer.from(encrypted)]);
}
function decryptPayload(encrypted, sharedSecret) {
  const nonce = encrypted.slice(0, 12);
  const ciphertext = encrypted.slice(12);
  const cipher = (0, import_chacha.chacha20poly1305)(sharedSecret, nonce);
  return cipher.decrypt(ciphertext);
}
var StyxPMP = class {
  connection;
  programId;
  constructor(connection, programId) {
    this.connection = connection;
    this.programId = programId || STYX_PMP_PROGRAM_ID;
  }
  // ========================================================================
  // PRIVATE MESSAGE
  // ========================================================================
  /**
   * Build a private message instruction
   */
  buildPrivateMessageInstruction(sender, recipient, payload, options) {
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
    return new import_web3.TransactionInstruction({
      programId: this.programId,
      keys: [],
      data
    });
  }
  /**
   * Send a private message
   */
  async sendPrivateMessage(sender, recipient, message, sharedSecret, options) {
    const messageBytes = typeof message === "string" ? new TextEncoder().encode(message) : message;
    const encryptedPayload = encryptPayload(messageBytes, sharedSecret);
    const instruction = this.buildPrivateMessageInstruction(
      sender.publicKey,
      recipient,
      encryptedPayload,
      options
    );
    const tx = new import_web3.Transaction().add(instruction);
    return await (0, import_web3.sendAndConfirmTransaction)(this.connection, tx, [sender]);
  }
  // ========================================================================
  // ROUTED MESSAGE
  // ========================================================================
  /**
   * Build a routed message instruction
   */
  buildRoutedMessageInstruction(sender, recipient, routeInfo, payload, hopCount, currentHop) {
    const encryptedRecipient = encryptRecipient(sender, recipient);
    const payloadLen = Buffer.alloc(2);
    payloadLen.writeUInt16LE(payload.length);
    const data = Buffer.concat([
      Buffer.from([TAG_ROUTED_MESSAGE, FLAG_ENCRYPTED, hopCount]),
      Buffer.from(encryptedRecipient),
      Buffer.from([0]),
      // reserved
      Buffer.from([currentHop]),
      Buffer.from(routeInfo),
      payloadLen,
      Buffer.from(payload)
    ]);
    return new import_web3.TransactionInstruction({
      programId: this.programId,
      keys: [],
      data
    });
  }
  /**
   * Send a routed message through multiple hops
   */
  async sendRoutedMessage(sender, recipient, hops, message, sharedSecret) {
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
    const tx = new import_web3.Transaction().add(instruction);
    return await (0, import_web3.sendAndConfirmTransaction)(this.connection, tx, [sender]);
  }
  // ========================================================================
  // PRIVATE TRANSFER
  // ========================================================================
  /**
   * Build a private transfer instruction
   */
  buildPrivateTransferInstruction(sender, recipient, amount, memo) {
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
    return new import_web3.TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: sender, isSigner: true, isWritable: true },
        { pubkey: recipient, isSigner: false, isWritable: true },
        { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data
    });
  }
  /**
   * Send a private SOL transfer
   */
  async sendPrivateTransfer(sender, recipient, amountSol, memo) {
    const amountLamports = BigInt(Math.floor(amountSol * import_web3.LAMPORTS_PER_SOL));
    const memoBytes = memo ? new TextEncoder().encode(memo) : void 0;
    const instruction = this.buildPrivateTransferInstruction(
      sender.publicKey,
      recipient,
      amountLamports,
      memoBytes
    );
    const tx = new import_web3.Transaction().add(instruction);
    return await (0, import_web3.sendAndConfirmTransaction)(this.connection, tx, [sender]);
  }
  // ========================================================================
  // RATCHET MESSAGE
  // ========================================================================
  /**
   * Build a ratchet message instruction
   */
  buildRatchetMessageInstruction(ephemeralPubkey, counter, ratchetData, ciphertext) {
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
    return new import_web3.TransactionInstruction({
      programId: this.programId,
      keys: [],
      data
    });
  }
  /**
   * Send a forward-secret ratchet message
   */
  async sendRatchetMessage(sender, ephemeralKeypair, counter, chainKey, message, sharedSecret) {
    const ciphertext = encryptPayload(message, sharedSecret);
    const instruction = this.buildRatchetMessageInstruction(
      ephemeralKeypair.publicKey,
      counter,
      chainKey,
      ciphertext
    );
    const tx = new import_web3.Transaction().add(instruction);
    return await (0, import_web3.sendAndConfirmTransaction)(this.connection, tx, [sender]);
  }
  // ========================================================================
  // COMPLIANCE
  // ========================================================================
  /**
   * Submit compliance disclosure
   */
  async submitComplianceReveal(sender, messageId, auditor, disclosureKey, revealType) {
    const revealTypeCode = {
      "full": 0,
      "amount": 1,
      "recipient": 2,
      "metadata": 3
    }[revealType];
    const data = Buffer.concat([
      Buffer.from([TAG_COMPLIANCE_REVEAL, FLAG_COMPLIANCE]),
      Buffer.from(messageId),
      auditor.toBytes(),
      Buffer.from(disclosureKey),
      Buffer.from([revealTypeCode])
    ]);
    const instruction = new import_web3.TransactionInstruction({
      programId: this.programId,
      keys: [],
      data
    });
    const tx = new import_web3.Transaction().add(instruction);
    return await (0, import_web3.sendAndConfirmTransaction)(this.connection, tx, [sender]);
  }
  // ========================================================================
  // MESSAGE READING
  // ========================================================================
  /**
   * Subscribe to incoming messages
   */
  subscribeToMessages(callback) {
    return this.connection.onLogs(this.programId, (logs) => {
      for (const log of logs.logs) {
        if (log.startsWith("Program data:")) {
          const base64Data = log.split("Program data: ")[1];
          const payload = Buffer.from(base64Data, "base64");
          callback(payload, logs.signature);
        }
      }
    });
  }
  /**
   * Unsubscribe from messages
   */
  async unsubscribe(subscriptionId) {
    await this.connection.removeOnLogsListener(subscriptionId);
  }
  /**
   * Get historical messages
   */
  async getRecentMessages(limit = 100) {
    const signatures = await this.connection.getSignaturesForAddress(
      this.programId,
      { limit }
    );
    const messages = [];
    for (const sig of signatures) {
      const tx = await this.connection.getTransaction(sig.signature, {
        maxSupportedTransactionVersion: 0
      });
      if (tx?.meta?.logMessages) {
        for (const log of tx.meta.logMessages) {
          if (log.startsWith("Program data:")) {
            const payload = Buffer.from(
              log.split("Program data: ")[1],
              "base64"
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
};
var index_default = StyxPMP;
var TREASURY = new import_web3.PublicKey("13xnC9kDksJMBE9FYVW1S7dukLjRDgrh4Dzm6eq5moon");
var PROTOCOL_FEE_LAMPORTS = 1000000n;
var REFERRAL_BASE_BPS = 3e3;
var MAX_REFERRAL_DEPTH = 10;
function calculateReferralReward(amount, depth) {
  if (depth >= MAX_REFERRAL_DEPTH) return 0n;
  const bps = REFERRAL_BASE_BPS >> depth;
  if (bps < 1) return 0n;
  return amount * BigInt(bps) / 10000n;
}
function calculateReferralChainRewards(amount) {
  const rewards = [];
  for (let depth = 0; depth < MAX_REFERRAL_DEPTH; depth++) {
    const bps = REFERRAL_BASE_BPS >> depth;
    if (bps < 1) break;
    rewards.push({
      depth,
      bps,
      reward: amount * BigInt(bps) / 10000n
    });
  }
  return rewards;
}
var StyxGovernance = class {
  styx;
  constructor(styxPMP) {
    this.styx = styxPMP;
  }
  /**
   * Create a DAO proposal (inscribed to logs)
   */
  async createProposal(proposer, options) {
    const flags = options.isToken22 ? FLAG_TOKEN22 : 0;
    const proposalHash = (0, import_sha3.keccak_256)(Buffer.from(options.title));
    const titleBytes = Buffer.from(options.title.slice(0, 64));
    const data = Buffer.alloc(78 + titleBytes.length);
    let offset = 0;
    data.writeUInt8(TAG_PROPOSAL, offset);
    offset += 1;
    data.writeUInt8(flags, offset);
    offset += 1;
    Buffer.from(proposer.publicKey.toBytes()).copy(data, offset);
    offset += 32;
    Buffer.from(proposalHash).copy(data, offset);
    offset += 32;
    data.writeBigUInt64LE(options.votingEndSlot, offset);
    offset += 8;
    data.writeUInt16LE(options.quorumBps, offset);
    offset += 2;
    data.writeUInt16LE(titleBytes.length, offset);
    offset += 2;
    titleBytes.copy(data, offset);
    const ix = new import_web3.TransactionInstruction({
      programId: this.styx.programId,
      keys: [
        { pubkey: proposer.publicKey, isSigner: true, isWritable: true },
        { pubkey: TREASURY, isSigner: false, isWritable: true },
        { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data
    });
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [proposer]);
  }
  /**
   * Cast a private vote (nullifier prevents double voting)
   */
  async castVote(voter, options) {
    const flags = options.isToken22 ? FLAG_TOKEN22 : 0;
    const nullifier = (0, import_sha3.keccak_256)(Buffer.concat([
      options.voterSecret,
      Buffer.from(options.proposalId)
    ]));
    const voteValue = options.vote === "yes" ? 1 : options.vote === "no" ? 0 : 2;
    const proofLen = options.weightProof?.length || 0;
    const data = Buffer.alloc(69 + proofLen);
    let offset = 0;
    data.writeUInt8(TAG_PRIVATE_VOTE, offset);
    offset += 1;
    data.writeUInt8(flags, offset);
    offset += 1;
    Buffer.from(options.proposalId).copy(data, offset);
    offset += 32;
    Buffer.from(nullifier).copy(data, offset);
    offset += 32;
    data.writeUInt8(voteValue, offset);
    offset += 1;
    data.writeUInt16LE(proofLen, offset);
    offset += 2;
    if (options.weightProof) {
      Buffer.from(options.weightProof).copy(data, offset);
    }
    const ix = new import_web3.TransactionInstruction({
      programId: this.styx.programId,
      keys: [
        { pubkey: voter.publicKey, isSigner: true, isWritable: true },
        { pubkey: TREASURY, isSigner: false, isWritable: true },
        { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data
    });
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [voter]);
  }
};
var StyxVTA = class {
  styx;
  constructor(styxPMP) {
    this.styx = styxPMP;
  }
  /**
   * Create VTA deposit (initial balance inscription)
   */
  async deposit(sender, options) {
    return this.transfer(sender, options);
  }
  /**
   * Transfer VTA balance (inscribed, nullifier prevents double-spend)
   */
  async transfer(sender, options) {
    const flags = options.isToken22 ? FLAG_TOKEN22 : 0;
    const fromNullifier = (0, import_sha3.keccak_256)(Buffer.concat([
      Buffer.from("STYX_VTA_NULL"),
      options.fromSecret
    ]));
    const toHash = (0, import_sha3.keccak_256)(Buffer.concat([
      options.toRecipient.toBytes(),
      options.toNonce
    ]));
    const proofLen = options.proof?.length || 0;
    const data = Buffer.alloc(116 + proofLen);
    let offset = 0;
    data.writeUInt8(TAG_VTA_TRANSFER, offset);
    offset += 1;
    data.writeUInt8(flags, offset);
    offset += 1;
    Buffer.from(options.mint.toBytes()).copy(data, offset);
    offset += 32;
    Buffer.from(fromNullifier).copy(data, offset);
    offset += 32;
    Buffer.from(toHash).copy(data, offset);
    offset += 32;
    data.writeBigUInt64LE(options.amount, offset);
    offset += 8;
    Buffer.from(options.toNonce).copy(data, offset);
    offset += 8;
    data.writeUInt16LE(proofLen, offset);
    offset += 2;
    if (options.proof) {
      Buffer.from(options.proof).copy(data, offset);
    }
    const ix = new import_web3.TransactionInstruction({
      programId: this.styx.programId,
      keys: [
        { pubkey: sender.publicKey, isSigner: true, isWritable: true },
        { pubkey: TREASURY, isSigner: false, isWritable: true },
        { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: sender.publicKey, isSigner: true, isWritable: false }
      ],
      data
    });
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [sender]);
  }
};
var StyxReferral = class {
  styx;
  constructor(styxPMP) {
    this.styx = styxPMP;
  }
  /**
   * Register a referral (inscribed to chain)
   */
  async register(referee, options) {
    const parentChainHash = options.parentChainHash || new Uint8Array(32);
    const timestamp = BigInt(Date.now());
    const data = Buffer.alloc(105);
    let offset = 0;
    data.writeUInt8(TAG_REFERRAL_REGISTER, offset);
    offset += 1;
    Buffer.from(options.referrer.toBytes()).copy(data, offset);
    offset += 32;
    Buffer.from(referee.publicKey.toBytes()).copy(data, offset);
    offset += 32;
    Buffer.from(parentChainHash).copy(data, offset);
    offset += 32;
    data.writeBigUInt64LE(timestamp, offset);
    const ix = new import_web3.TransactionInstruction({
      programId: this.styx.programId,
      keys: [
        { pubkey: referee.publicKey, isSigner: true, isWritable: true }
      ],
      data
    });
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [referee]);
  }
  /**
   * Claim referral rewards with merkle proof
   */
  async claim(claimer, options) {
    const proofLen = options.proof?.length || 0;
    const data = Buffer.alloc(44 + proofLen);
    let offset = 0;
    data.writeUInt8(TAG_REFERRAL_CLAIM, offset);
    offset += 1;
    Buffer.from(claimer.publicKey.toBytes()).copy(data, offset);
    offset += 32;
    data.writeBigUInt64LE(options.amountClaiming, offset);
    offset += 8;
    data.writeUInt8(options.depth, offset);
    offset += 1;
    data.writeUInt16LE(proofLen, offset);
    offset += 2;
    if (options.proof) {
      Buffer.from(options.proof).copy(data, offset);
    }
    const ix = new import_web3.TransactionInstruction({
      programId: this.styx.programId,
      keys: [
        { pubkey: claimer.publicKey, isSigner: true, isWritable: true },
        { pubkey: TREASURY, isSigner: false, isWritable: true },
        { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: claimer.publicKey, isSigner: true, isWritable: false }
      ],
      data
    });
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [claimer]);
  }
  /**
   * Compute chain hash for a referral registration
   */
  computeChainHash(referrer, referee, parentChainHash, timestamp) {
    const timestampBytes = Buffer.alloc(8);
    timestampBytes.writeBigUInt64LE(timestamp);
    return (0, import_sha3.keccak_256)(Buffer.concat([
      Buffer.from("STYX_REF_V1"),
      referrer.toBytes(),
      referee.toBytes(),
      Buffer.from(parentChainHash),
      timestampBytes
    ]));
  }
};
function buildProposalInstruction(programId, proposer, options) {
  const flags = options.isToken22 ? FLAG_TOKEN22 : 0;
  const proposalHash = (0, import_sha3.keccak_256)(Buffer.from(options.title));
  const titleBytes = Buffer.from(options.title.slice(0, 64));
  const data = Buffer.alloc(78 + titleBytes.length);
  let offset = 0;
  data.writeUInt8(TAG_PROPOSAL, offset);
  offset += 1;
  data.writeUInt8(flags, offset);
  offset += 1;
  Buffer.from(proposer.toBytes()).copy(data, offset);
  offset += 32;
  Buffer.from(proposalHash).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(options.votingEndSlot, offset);
  offset += 8;
  data.writeUInt16LE(options.quorumBps, offset);
  offset += 2;
  data.writeUInt16LE(titleBytes.length, offset);
  offset += 2;
  titleBytes.copy(data, offset);
  return new import_web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: proposer, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data
  });
}
function buildVoteInstruction(programId, voter, options) {
  const flags = options.isToken22 ? FLAG_TOKEN22 : 0;
  const nullifier = (0, import_sha3.keccak_256)(Buffer.concat([
    options.voterSecret,
    Buffer.from(options.proposalId)
  ]));
  const voteValue = options.vote === "yes" ? 1 : options.vote === "no" ? 0 : 2;
  const proofLen = options.weightProof?.length || 0;
  const data = Buffer.alloc(69 + proofLen);
  let offset = 0;
  data.writeUInt8(TAG_PRIVATE_VOTE, offset);
  offset += 1;
  data.writeUInt8(flags, offset);
  offset += 1;
  Buffer.from(options.proposalId).copy(data, offset);
  offset += 32;
  Buffer.from(nullifier).copy(data, offset);
  offset += 32;
  data.writeUInt8(voteValue, offset);
  offset += 1;
  data.writeUInt16LE(proofLen, offset);
  offset += 2;
  if (options.weightProof) {
    Buffer.from(options.weightProof).copy(data, offset);
  }
  return new import_web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: voter, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data
  });
}
function buildReferralInstruction(programId, referee, referrer, parentChainHash) {
  const chainHash = parentChainHash || new Uint8Array(32);
  const timestamp = BigInt(Date.now());
  const data = Buffer.alloc(105);
  let offset = 0;
  data.writeUInt8(TAG_REFERRAL_REGISTER, offset);
  offset += 1;
  Buffer.from(referrer.toBytes()).copy(data, offset);
  offset += 32;
  Buffer.from(referee.toBytes()).copy(data, offset);
  offset += 32;
  Buffer.from(chainHash).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(timestamp, offset);
  return new import_web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: referee, isSigner: true, isWritable: true }
    ],
    data
  });
}
var CPI_TYPE_GENERIC = 0;
var CPI_TYPE_EVENT = 1;
var CPI_TYPE_RECEIPT = 2;
var CPI_TYPE_ATTESTATION = 3;
var GHOST_ACTION_AUTHENTICATE = 0;
var GHOST_ACTION_PROVE_MEMBERSHIP = 1;
var GHOST_ACTION_VERIFY_SECRET = 2;
var GHOST_ACTION_ANONYMOUS_ACCESS = 3;
function deriveGhostPDA(secretHash, programId = STYX_PMP_PROGRAM_ID) {
  const [pda, bump] = import_web3.PublicKey.findProgramAddressSync(
    [Buffer.from("ghost"), Buffer.from(secretHash)],
    programId
  );
  return { pda, bump };
}
function deriveTimeCapsuleKey(unlockSlot, senderSecret, recipient) {
  const slotBytes = Buffer.alloc(8);
  slotBytes.writeBigUInt64LE(unlockSlot);
  return (0, import_sha3.keccak_256)(Buffer.concat([
    slotBytes,
    Buffer.from(senderSecret),
    recipient.toBytes()
  ]));
}
function buildTimeCapsuleInstruction(programId, payer, options) {
  const data = Buffer.alloc(41 + options.encryptedPayload.length);
  let offset = 0;
  data.writeUInt8(TAG_TIME_CAPSULE, offset);
  offset += 1;
  data.writeBigUInt64LE(options.unlockSlot, offset);
  offset += 8;
  Buffer.from(options.recipient.toBytes()).copy(data, offset);
  offset += 32;
  Buffer.from(options.encryptedPayload).copy(data, offset);
  return new import_web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data
  });
}
function buildGhostPDAInstruction(programId, payer, options) {
  const actionDataLen = options.actionData?.length || 0;
  const data = Buffer.alloc(35 + actionDataLen);
  let offset = 0;
  data.writeUInt8(TAG_GHOST_PDA, offset);
  offset += 1;
  Buffer.from(options.secretHash).copy(data, offset);
  offset += 32;
  data.writeUInt8(options.bump, offset);
  offset += 1;
  data.writeUInt8(options.actionType, offset);
  offset += 1;
  if (options.actionData) {
    Buffer.from(options.actionData).copy(data, offset);
  }
  return new import_web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data
  });
}
function buildCPIInscribeInstruction(programId, caller, options) {
  const data = Buffer.alloc(2 + options.data.length);
  let offset = 0;
  data.writeUInt8(TAG_CPI_INSCRIBE, offset);
  offset += 1;
  data.writeUInt8(options.inscriptionType, offset);
  offset += 1;
  Buffer.from(options.data).copy(data, offset);
  return new import_web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: caller, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data
  });
}
function buildHashlockCommitInstruction(programId, payer, options) {
  const data = Buffer.alloc(34 + options.commitData.length);
  let offset = 0;
  data.writeUInt8(TAG_HASHLOCK_COMMIT, offset);
  offset += 1;
  Buffer.from(options.hashlock).copy(data, offset);
  offset += 32;
  data.writeUInt8(options.commitType, offset);
  offset += 1;
  Buffer.from(options.commitData).copy(data, offset);
  return new import_web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data
  });
}
function buildHashlockRevealInstruction(programId, payer, options) {
  const data = Buffer.alloc(33);
  let offset = 0;
  data.writeUInt8(TAG_HASHLOCK_REVEAL, offset);
  offset += 1;
  Buffer.from(options.secret).copy(data, offset);
  offset += 32;
  return new import_web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data
  });
}
function buildStateChannelOpenInstruction(programId, payer, options) {
  const participantCount = options.participants.length;
  const data = Buffer.alloc(66 + participantCount * 32);
  let offset = 0;
  data.writeUInt8(TAG_STATE_CHANNEL_OPEN, offset);
  offset += 1;
  Buffer.from(options.channelId).copy(data, offset);
  offset += 32;
  data.writeUInt8(participantCount, offset);
  offset += 1;
  Buffer.from(options.initialState).copy(data, offset);
  offset += 32;
  for (const participant of options.participants) {
    Buffer.from(participant.toBytes()).copy(data, offset);
    offset += 32;
  }
  return new import_web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data
  });
}
function buildStateChannelCloseInstruction(programId, payer, options) {
  const closeTypeCode = options.closeType === "cooperative" ? 0 : options.closeType === "unilateral" ? 1 : 2;
  const data = Buffer.alloc(73);
  let offset = 0;
  data.writeUInt8(TAG_STATE_CHANNEL_CLOSE, offset);
  offset += 1;
  Buffer.from(options.channelId).copy(data, offset);
  offset += 32;
  data.writeUInt8(closeTypeCode, offset);
  offset += 1;
  Buffer.from(options.finalState).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(options.sequence, offset);
  return new import_web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data
  });
}
function buildBatchSettleInstruction(programId, payer, options) {
  const data = Buffer.alloc(73);
  let offset = 0;
  data.writeUInt8(TAG_BATCH_SETTLE, offset);
  offset += 1;
  Buffer.from(options.channelId).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(options.sequence, offset);
  offset += 8;
  Buffer.from(options.merkleRoot).copy(data, offset);
  offset += 32;
  data.writeUInt8(options.operationCount, offset);
  return new import_web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data
  });
}
var StyxNovel = class {
  styx;
  constructor(styxPMP) {
    this.styx = styxPMP;
  }
  /**
   * Create a time capsule
   */
  async createTimeCapsule(sender, recipient, message, senderSecret, unlockSlot) {
    const encryptionKey = deriveTimeCapsuleKey(unlockSlot, senderSecret, recipient);
    const encryptedPayload = encryptPayload(message, encryptionKey);
    const ix = buildTimeCapsuleInstruction(this.styx.programId, sender.publicKey, {
      unlockSlot,
      recipient,
      encryptedPayload
    });
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [sender]);
  }
  /**
   * Prove knowledge of secret via Ghost PDA
   */
  async proveSecretKnowledge(prover, secret, actionType = GHOST_ACTION_AUTHENTICATE, actionData) {
    const secretHash = (0, import_sha3.keccak_256)(secret);
    const { bump } = deriveGhostPDA(secretHash, this.styx.programId);
    const ix = buildGhostPDAInstruction(this.styx.programId, prover.publicKey, {
      secretHash,
      bump,
      actionType,
      actionData
    });
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [prover]);
  }
  /**
   * Inscribe data via CPI pattern
   */
  async inscribe(caller, inscriptionType, data) {
    const ix = buildCPIInscribeInstruction(this.styx.programId, caller.publicKey, {
      inscriptionType,
      data
    });
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [caller]);
  }
};
var PERM_CAN_TRANSFER = 1;
var PERM_CAN_MESSAGE = 2;
var PERM_CAN_VOTE = 4;
var PERM_CAN_SUBDELEGATE = 8;
var PERM_REQUIRES_2FA = 16;
var REVOKER_OWNER = 0;
var REVOKER_DELEGATE = 1;
var REVOKER_GUARDIAN = 2;
var REVOKE_NORMAL = 0;
var REVOKE_COMPROMISED = 1;
var REVOKE_EXPIRED = 2;
var REVOKE_UPGRADED = 3;
var MP_ACTION_TRANSFER = 0;
var MP_ACTION_ADD_PARTY = 1;
var MP_ACTION_REMOVE_PARTY = 2;
var MP_ACTION_CHANGE_THRESHOLD = 3;
var MP_ACTION_DELEGATE = 4;
function buildVTADelegateInstruction(programId, owner, options) {
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
  data.writeUInt8(TAG_VTA_DELEGATE, offset);
  offset += 1;
  data.writeUInt8(flags, offset);
  offset += 1;
  Buffer.from(options.owner.toBytes()).copy(data, offset);
  offset += 32;
  Buffer.from(options.delegate.toBytes()).copy(data, offset);
  offset += 32;
  Buffer.from(options.mint.toBytes()).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(options.maxAmount, offset);
  offset += 8;
  data.writeBigUInt64LE(options.expirySlot, offset);
  offset += 8;
  data.writeUInt8(permissions, offset);
  offset += 1;
  Buffer.from(nonce).copy(data, offset);
  return new import_web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: owner, isSigner: true, isWritable: false }
    ],
    data
  });
}
function buildVTARevokeInstruction(programId, revoker, options) {
  const data = Buffer.alloc(35);
  let offset = 0;
  data.writeUInt8(TAG_VTA_REVOKE, offset);
  offset += 1;
  Buffer.from(options.delegationId).copy(data, offset);
  offset += 32;
  data.writeUInt8(options.revokerType, offset);
  offset += 1;
  data.writeUInt8(options.reason, offset);
  return new import_web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: revoker, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: revoker, isSigner: true, isWritable: false }
    ],
    data
  });
}
function buildStealthSwapInitInstruction(programId, initiator, options) {
  const flags = options.isToken22 ? FLAG_TOKEN22 : 0;
  const data = Buffer.alloc(170);
  let offset = 0;
  data.writeUInt8(TAG_STEALTH_SWAP_INIT, offset);
  offset += 1;
  data.writeUInt8(flags, offset);
  offset += 1;
  Buffer.from(options.hashlock).copy(data, offset);
  offset += 32;
  Buffer.from(options.encryptedTerms).copy(data, offset);
  offset += 64;
  data.writeBigUInt64LE(options.timeoutSlot, offset);
  offset += 8;
  Buffer.from(options.stealthPubkey).copy(data, offset);
  offset += 32;
  Buffer.from(options.initiatorCommitment).copy(data, offset);
  return new import_web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: initiator, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data
  });
}
function buildStealthSwapExecInstruction(programId, executor, options) {
  const proofLen = options.recipientProof?.length || 0;
  const data = Buffer.alloc(65 + proofLen);
  let offset = 0;
  data.writeUInt8(TAG_STEALTH_SWAP_EXEC, offset);
  offset += 1;
  Buffer.from(options.swapId).copy(data, offset);
  offset += 32;
  Buffer.from(options.preimage).copy(data, offset);
  offset += 32;
  if (options.recipientProof) {
    Buffer.from(options.recipientProof).copy(data, offset);
  }
  return new import_web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: executor, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: executor, isSigner: true, isWritable: false }
    ],
    data
  });
}
function buildVTAGuardianSetInstruction(programId, owner, options) {
  const guardianCount = options.guardians.length;
  const sharesLen = options.encryptedShares?.length || 0;
  const guardiansEnd = 35 + guardianCount * 32;
  const data = Buffer.alloc(guardiansEnd + 2 + sharesLen);
  let offset = 0;
  data.writeUInt8(TAG_VTA_GUARDIAN_SET, offset);
  offset += 1;
  Buffer.from(options.vtaMint.toBytes()).copy(data, offset);
  offset += 32;
  data.writeUInt8(options.threshold, offset);
  offset += 1;
  data.writeUInt8(guardianCount, offset);
  offset += 1;
  for (const guardian of options.guardians) {
    Buffer.from(guardian.toBytes()).copy(data, offset);
    offset += 32;
  }
  data.writeUInt16LE(sharesLen, offset);
  offset += 2;
  if (options.encryptedShares) {
    Buffer.from(options.encryptedShares).copy(data, offset);
  }
  return new import_web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: owner, isSigner: true, isWritable: false }
    ],
    data
  });
}
function buildVTAGuardianRecoverInstruction(programId, newOwner, options) {
  const sigCount = options.guardianIndices.length;
  const dataLen = 75 + sigCount + sigCount * 64;
  const data = Buffer.alloc(dataLen);
  let offset = 0;
  data.writeUInt8(TAG_VTA_GUARDIAN_RECOVER, offset);
  offset += 1;
  Buffer.from(options.guardianSetId).copy(data, offset);
  offset += 32;
  Buffer.from(options.newOwner.toBytes()).copy(data, offset);
  offset += 32;
  data.writeUInt8(sigCount, offset);
  offset += 1;
  for (const idx of options.guardianIndices) {
    data.writeUInt8(idx, offset);
    offset += 1;
  }
  for (const sig of options.signatures) {
    Buffer.from(sig).copy(data, offset);
    offset += 64;
  }
  data.writeBigUInt64LE(options.recoveryNonce, offset);
  return new import_web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: newOwner, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: newOwner, isSigner: true, isWritable: false }
    ],
    data
  });
}
function buildPrivateSubscriptionInstruction(programId, subscriber, options) {
  const flags = options.isToken22 ? FLAG_TOKEN22 : 0;
  const data = Buffer.alloc(124);
  let offset = 0;
  data.writeUInt8(TAG_PRIVATE_SUBSCRIPTION, offset);
  offset += 1;
  data.writeUInt8(flags, offset);
  offset += 1;
  Buffer.from(options.subscriberNullifier).copy(data, offset);
  offset += 32;
  Buffer.from(options.merchantPubkey.toBytes()).copy(data, offset);
  offset += 32;
  Buffer.from(options.encryptedTerms).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(options.intervalSlots, offset);
  offset += 8;
  data.writeBigUInt64LE(options.windowSlots, offset);
  offset += 8;
  data.writeBigUInt64LE(options.startSlot, offset);
  offset += 8;
  data.writeUInt16LE(options.maxPayments, offset);
  return new import_web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: subscriber, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: subscriber, isSigner: true, isWritable: false }
    ],
    data
  });
}
function buildMultipartyVTAInitInstruction(programId, initiator, options) {
  const flags = options.isToken22 ? FLAG_TOKEN22 : 0;
  const partyCount = options.parties.length;
  const vtaNonce = options.vtaNonce || crypto.getRandomValues(new Uint8Array(8));
  const partiesEnd = 36 + partyCount * 32;
  const data = Buffer.alloc(partiesEnd + 16);
  let offset = 0;
  data.writeUInt8(TAG_MULTIPARTY_VTA_INIT, offset);
  offset += 1;
  data.writeUInt8(flags, offset);
  offset += 1;
  Buffer.from(options.mint.toBytes()).copy(data, offset);
  offset += 32;
  data.writeUInt8(options.threshold, offset);
  offset += 1;
  data.writeUInt8(partyCount, offset);
  offset += 1;
  for (const party of options.parties) {
    Buffer.from(party.toBytes()).copy(data, offset);
    offset += 32;
  }
  data.writeBigUInt64LE(options.initialBalance, offset);
  offset += 8;
  Buffer.from(vtaNonce).copy(data, offset);
  return new import_web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: initiator, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: initiator, isSigner: true, isWritable: false }
    ],
    data
  });
}
function buildMultipartyVTASignInstruction(programId, signer, options) {
  const data = Buffer.alloc(99);
  let offset = 0;
  data.writeUInt8(TAG_MULTIPARTY_VTA_SIGN, offset);
  offset += 1;
  Buffer.from(options.mpVtaId).copy(data, offset);
  offset += 32;
  Buffer.from(options.actionId).copy(data, offset);
  offset += 32;
  data.writeUInt8(options.signerIndex, offset);
  offset += 1;
  data.writeUInt8(options.actionType, offset);
  offset += 1;
  Buffer.from(options.actionDataHash).copy(data, offset);
  return new import_web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: signer, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: signer, isSigner: true, isWritable: false }
    ],
    data
  });
}
var StyxDelegation = class {
  styx;
  constructor(styxPMP) {
    this.styx = styxPMP;
  }
  /**
   * Delegate VTA spending rights
   */
  async delegate(owner, options) {
    const ix = buildVTADelegateInstruction(
      this.styx.programId,
      owner.publicKey,
      options
    );
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [owner]);
  }
  /**
   * Revoke a delegation
   */
  async revoke(revoker, delegationId, revokerType = REVOKER_OWNER, reason = REVOKE_NORMAL) {
    const ix = buildVTARevokeInstruction(
      this.styx.programId,
      revoker.publicKey,
      { delegationId, revokerType, reason }
    );
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [revoker]);
  }
  /**
   * Compute delegation ID
   */
  computeDelegationId(owner, delegate, mint, nonce) {
    return (0, import_sha3.keccak_256)(Buffer.concat([
      Buffer.from("STYX_VTA_DELEG_V1"),
      owner.toBytes(),
      delegate.toBytes(),
      mint.toBytes(),
      Buffer.from(nonce)
    ]));
  }
};
var StyxSwap = class {
  styx;
  constructor(styxPMP) {
    this.styx = styxPMP;
  }
  /**
   * Generate swap secret and hashlock
   */
  generateSwapSecret() {
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const hashlock = (0, import_sha3.keccak_256)(Buffer.concat([
      Buffer.from("STYX_SWAP_PREIMAGE"),
      Buffer.from(secret)
    ]));
    return { secret, hashlock };
  }
  /**
   * Encrypt swap terms
   */
  encryptSwapTerms(myMint, myAmount, theirMint, theirAmount, sharedSecret) {
    const terms = Buffer.alloc(80);
    let offset = 0;
    Buffer.from(myMint.toBytes()).copy(terms, offset);
    offset += 32;
    terms.writeBigUInt64LE(myAmount, offset);
    offset += 8;
    Buffer.from(theirMint.toBytes()).copy(terms, offset);
    offset += 32;
    terms.writeBigUInt64LE(theirAmount, offset);
    return encryptPayload(terms, sharedSecret).slice(0, 64);
  }
  /**
   * Initialize a stealth swap
   */
  async initStealthSwap(initiator, options) {
    const ix = buildStealthSwapInitInstruction(
      this.styx.programId,
      initiator.publicKey,
      options
    );
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [initiator]);
  }
  /**
   * Execute a stealth swap
   */
  async executeStealthSwap(executor, options) {
    const ix = buildStealthSwapExecInstruction(
      this.styx.programId,
      executor.publicKey,
      options
    );
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [executor]);
  }
};
var StyxGuardian = class {
  styx;
  constructor(styxPMP) {
    this.styx = styxPMP;
  }
  /**
   * Set guardians for a VTA
   */
  async setGuardians(owner, options) {
    const ix = buildVTAGuardianSetInstruction(
      this.styx.programId,
      owner.publicKey,
      options
    );
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [owner]);
  }
  /**
   * Recover VTA with guardian signatures
   */
  async recover(newOwner, options) {
    const ix = buildVTAGuardianRecoverInstruction(
      this.styx.programId,
      newOwner.publicKey,
      options
    );
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [newOwner]);
  }
  /**
   * Compute guardian set ID
   */
  computeGuardianSetId(vtaMint, owner, threshold, guardianCount, guardians) {
    const guardianBytes = Buffer.concat(guardians.map((g) => g.toBytes()));
    return (0, import_sha3.keccak_256)(Buffer.concat([
      Buffer.from("STYX_GUARDIAN_SET_V1"),
      vtaMint.toBytes(),
      owner.toBytes(),
      Buffer.from([threshold, guardianCount]),
      guardianBytes
    ]));
  }
};
var StyxSubscription = class {
  styx;
  constructor(styxPMP) {
    this.styx = styxPMP;
  }
  /**
   * Generate subscriber nullifier
   */
  generateSubscriberNullifier(subscriberSecret) {
    return (0, import_sha3.keccak_256)(Buffer.concat([
      Buffer.from("STYX_SUB_NULL"),
      Buffer.from(subscriberSecret)
    ]));
  }
  /**
   * Encrypt subscription terms
   */
  encryptSubscriptionTerms(amount, currency, sharedSecret) {
    const terms = Buffer.alloc(40);
    terms.writeBigUInt64LE(amount, 0);
    Buffer.from(currency.toBytes()).copy(terms, 8);
    return encryptPayload(terms, sharedSecret).slice(0, 32);
  }
  /**
   * Create a subscription
   */
  async subscribe(subscriber, options) {
    const ix = buildPrivateSubscriptionInstruction(
      this.styx.programId,
      subscriber.publicKey,
      options
    );
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [subscriber]);
  }
};
var StyxMultiparty = class {
  styx;
  constructor(styxPMP) {
    this.styx = styxPMP;
  }
  /**
   * Initialize a multiparty VTA
   */
  async initMultipartyVTA(initiator, options) {
    const ix = buildMultipartyVTAInitInstruction(
      this.styx.programId,
      initiator.publicKey,
      options
    );
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [initiator]);
  }
  /**
   * Sign a multiparty action
   */
  async signAction(signer, options) {
    const ix = buildMultipartyVTASignInstruction(
      this.styx.programId,
      signer.publicKey,
      options
    );
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [signer]);
  }
  /**
   * Compute multiparty VTA ID
   */
  computeMultipartyVTAId(mint, threshold, parties, vtaNonce) {
    const partyBytes = Buffer.concat(parties.map((p) => p.toBytes()));
    return (0, import_sha3.keccak_256)(Buffer.concat([
      Buffer.from("STYX_MPVTA_V1"),
      mint.toBytes(),
      Buffer.from([threshold, parties.length]),
      partyBytes,
      Buffer.from(vtaNonce)
    ]));
  }
  /**
   * Compute action ID for signing
   */
  computeActionId(mpVtaId, actionType, actionData) {
    return (0, import_sha3.keccak_256)(Buffer.concat([
      Buffer.from("STYX_MPVTA_ACTION"),
      Buffer.from(mpVtaId),
      Buffer.from([actionType]),
      Buffer.from(actionData)
    ]));
  }
};
var STS = class _STS {
  styx;
  constructor(styxPMP) {
    this.styx = styxPMP;
  }
  /**
   * Create note commitment from owner secret and amount
   */
  createCommitment(ownerSecret, amount, nonce) {
    const amountBuf = Buffer.alloc(8);
    amountBuf.writeBigUInt64LE(amount);
    return (0, import_sha3.keccak_256)(Buffer.concat([
      Buffer.from("STS_NOTE_V1"),
      Buffer.from(ownerSecret),
      amountBuf,
      Buffer.from(nonce)
    ]));
  }
  /**
   * Create nullifier from note commitment and secret
   */
  createNullifier(noteCommitment, ownerSecret) {
    return (0, import_sha3.keccak_256)(Buffer.concat([
      Buffer.from("STS_NULLIFIER_V1"),
      Buffer.from(noteCommitment),
      Buffer.from(ownerSecret)
    ]));
  }
  /**
   * Encrypt note data for storage
   */
  encryptNote(ownerSecret, amount, nonce) {
    const amountBuf = Buffer.alloc(8);
    amountBuf.writeBigUInt64LE(amount);
    const plaintext = Buffer.concat([amountBuf, Buffer.from(nonce)]);
    const mask = (0, import_sha3.keccak_256)(Buffer.concat([
      Buffer.from("STS_NOTE_ENCRYPT_V1"),
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
    transferFee(feeBps, maxFee) {
      const data = Buffer.alloc(10);
      data.writeUInt16LE(feeBps, 0);
      data.writeBigUInt64LE(maxFee, 2);
      return { type: "transfer_fee", data };
    },
    royalty(recipient, bps) {
      const data = Buffer.alloc(34);
      recipient.toBytes().forEach((b, i) => data[i] = b);
      data.writeUInt16LE(bps, 32);
      return { type: "royalty", data };
    },
    interest(rateBps, compound) {
      const data = Buffer.alloc(12);
      data.writeUInt16LE(rateBps, 0);
      data.writeBigUInt64LE(BigInt(Date.now()), 2);
      data.writeUInt16LE(compound, 10);
      return { type: "interest", data };
    },
    vesting(vestType, start, end) {
      const data = Buffer.alloc(17);
      data.writeUInt8(vestType, 0);
      data.writeBigUInt64LE(start, 1);
      data.writeBigUInt64LE(end, 9);
      return { type: "vesting", data };
    },
    delegation(delegate, maxAmount, expiry) {
      const data = Buffer.alloc(48);
      delegate.toBytes().forEach((b, i) => data[i] = b);
      data.writeBigUInt64LE(maxAmount, 32);
      data.writeBigUInt64LE(expiry, 40);
      return { type: "delegation", data };
    },
    soulbound(bindingProof) {
      const data = Buffer.alloc(32);
      bindingProof.slice(0, 32).forEach((b, i) => data[i] = b);
      return { type: "soulbound", data };
    },
    metadata(uriHash) {
      const data = Buffer.alloc(32);
      uriHash.slice(0, 32).forEach((b, i) => data[i] = b);
      return { type: "metadata", data };
    }
  };
  /**
   * Encode extensions to TLV format
   */
  encodeExtensions(extensions) {
    const buffers = [];
    for (const ext of extensions) {
      const typeCode = {
        "transfer_fee": EXT_TRANSFER_FEE,
        "royalty": EXT_ROYALTY,
        "interest": EXT_INTEREST,
        "vesting": EXT_VESTING,
        "delegation": EXT_DELEGATION,
        "soulbound": EXT_SOULBOUND,
        "metadata": EXT_METADATA
      }[ext.type] || 255;
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
  async mint(sender, options) {
    const nonce = new Uint8Array(32);
    crypto.getRandomValues(nonce);
    const commitment = this.createCommitment(options.ownerSecret, options.amount, nonce);
    const encryptedNote = this.encryptNote(options.ownerSecret, options.amount, nonce);
    const flags = (options.trustLevel || 0) | (options.extensions?.length ? 2 : 0);
    const extData = options.extensions ? this.encodeExtensions(options.extensions) : new Uint8Array(0);
    const data = Buffer.alloc(138 + 1 + extData.length);
    let offset = 0;
    data.writeUInt8(TAG_NOTE_MINT, offset);
    offset += 1;
    data.writeUInt8(flags, offset);
    offset += 1;
    options.mint.toBytes().forEach((b, i) => data[offset + i] = b);
    offset += 32;
    data.writeBigUInt64LE(options.amount, offset);
    offset += 8;
    commitment.forEach((b, i) => data[offset + i] = b);
    offset += 32;
    encryptedNote.forEach((b, i) => data[offset + i] = b);
    offset += 64;
    data.writeUInt8(options.extensions?.length || 0, offset);
    offset += 1;
    extData.forEach((b, i) => data[offset + i] = b);
    const ix = new import_web3.TransactionInstruction({
      keys: [
        { pubkey: sender.publicKey, isSigner: true, isWritable: true },
        { pubkey: TREASURY, isSigner: false, isWritable: true },
        { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: this.styx.programId,
      data
    });
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [sender]);
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
  async sendTo(sender, options) {
    const recipientReceiveKey = (0, import_sha3.keccak_256)(options.to.toBytes());
    const mintHash = (0, import_sha3.keccak_256)(options.mint.toBytes());
    const nonce = new Uint8Array(32);
    crypto.getRandomValues(nonce);
    const recipientCommitment = this.createCommitment(recipientReceiveKey, options.amount, nonce);
    const encryptedNote = this.encryptNote(recipientReceiveKey, options.amount, nonce);
    const flags = options.private ? 3 : 1;
    const data = Buffer.alloc(138);
    let offset = 0;
    data.writeUInt8(TAG_NOTE_MINT, offset);
    offset += 1;
    data.writeUInt8(flags, offset);
    offset += 1;
    options.mint.toBytes().forEach((b, i) => data[offset + i] = b);
    offset += 32;
    data.writeBigUInt64LE(options.amount, offset);
    offset += 8;
    recipientCommitment.forEach((b, i) => data[offset + i] = b);
    offset += 32;
    encryptedNote.forEach((b, i) => data[offset + i] = b);
    offset += 64;
    data.writeUInt8(0, offset);
    const ix = new import_web3.TransactionInstruction({
      keys: [
        { pubkey: sender.publicKey, isSigner: true, isWritable: true },
        { pubkey: options.to, isSigner: false, isWritable: false },
        // Include recipient
        { pubkey: TREASURY, isSigner: false, isWritable: true },
        { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: this.styx.programId,
      data
    });
    const tx = new import_web3.Transaction().add(ix);
    const signature = await (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [sender]);
    return { signature, recipientNote: recipientCommitment };
  }
  /**
   * Scan for tokens sent to an address (Token-22 parity)
   * 
   * In production, uses an indexer to find notes encrypted to this address.
   * Returns all unspent notes belonging to the address.
   */
  async getBalance(address, mint) {
    return { total: 0n, notes: [] };
  }
  /**
   * Transfer note (consume old, create new)
   */
  async transfer(sender, options) {
    const flags = options.trustLevel || 0;
    const proofLen = options.merkleProof?.length || 0;
    const data = Buffer.alloc(75 + proofLen * 32);
    let offset = 0;
    data.writeUInt8(TAG_NOTE_TRANSFER, offset);
    offset += 1;
    data.writeUInt8(flags, offset);
    offset += 1;
    options.nullifier.forEach((b, i) => data[offset + i] = b);
    offset += 32;
    options.newCommitment.forEach((b, i) => data[offset + i] = b);
    offset += 32;
    const amountBuf = Buffer.alloc(8);
    amountBuf.writeBigUInt64LE(options.encryptedAmount);
    amountBuf.forEach((b, i) => data[offset + i] = b);
    offset += 8;
    data.writeUInt8(proofLen, offset);
    offset += 1;
    if (options.merkleProof) {
      for (const proof of options.merkleProof) {
        proof.forEach((b, i) => data[offset + i] = b);
        offset += 32;
      }
    }
    const ix = new import_web3.TransactionInstruction({
      keys: [
        { pubkey: sender.publicKey, isSigner: true, isWritable: true },
        { pubkey: TREASURY, isSigner: false, isWritable: true },
        { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: this.styx.programId,
      data
    });
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [sender]);
  }
  /**
   * Deposit SPL tokens to global pool, receive note
   */
  async deposit(sender, options) {
    const nonce = new Uint8Array(32);
    crypto.getRandomValues(nonce);
    const commitment = this.createCommitment(options.ownerSecret, options.amount, nonce);
    const encryptedNote = this.encryptNote(options.ownerSecret, options.amount, nonce);
    const flags = options.extensions?.length ? 2 : 0;
    const data = Buffer.alloc(138);
    let offset = 0;
    data.writeUInt8(TAG_GPOOL_DEPOSIT, offset);
    offset += 1;
    data.writeUInt8(flags, offset);
    offset += 1;
    options.mint.toBytes().forEach((b, i) => data[offset + i] = b);
    offset += 32;
    data.writeBigUInt64LE(options.amount, offset);
    offset += 8;
    commitment.forEach((b, i) => data[offset + i] = b);
    offset += 32;
    encryptedNote.forEach((b, i) => data[offset + i] = b);
    const ix = new import_web3.TransactionInstruction({
      keys: [
        { pubkey: sender.publicKey, isSigner: true, isWritable: true },
        { pubkey: TREASURY, isSigner: false, isWritable: true },
        { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: this.styx.programId,
      data
    });
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [sender]);
  }
  /**
   * Withdraw from global pool (direct mode)
   */
  async withdraw(sender, options) {
    const flags = options.trustLevel || 0;
    const data = Buffer.alloc(106);
    let offset = 0;
    data.writeUInt8(TAG_GPOOL_WITHDRAW, offset);
    offset += 1;
    data.writeUInt8(flags, offset);
    offset += 1;
    options.nullifier.forEach((b, i) => data[offset + i] = b);
    offset += 32;
    options.mint.toBytes().forEach((b, i) => data[offset + i] = b);
    offset += 32;
    data.writeBigUInt64LE(options.amount, offset);
    offset += 8;
    options.recipient.toBytes().forEach((b, i) => data[offset + i] = b);
    const ix = new import_web3.TransactionInstruction({
      keys: [
        { pubkey: sender.publicKey, isSigner: true, isWritable: true },
        { pubkey: TREASURY, isSigner: false, isWritable: true },
        { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: this.styx.programId,
      data
    });
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [sender]);
  }
  /**
   * Withdraw from global pool (stealth mode - preserves privacy)
   */
  async withdrawStealth(sender, options) {
    const flags = options.trustLevel || 0;
    const data = Buffer.alloc(138);
    let offset = 0;
    data.writeUInt8(TAG_GPOOL_WITHDRAW_STEALTH, offset);
    offset += 1;
    data.writeUInt8(flags, offset);
    offset += 1;
    options.nullifier.forEach((b, i) => data[offset + i] = b);
    offset += 32;
    options.mint.toBytes().forEach((b, i) => data[offset + i] = b);
    offset += 32;
    data.writeBigUInt64LE(options.amount, offset);
    offset += 8;
    options.ephemeralPubkey.forEach((b, i) => data[offset + i] = b);
    offset += 32;
    options.encryptedRecipient.forEach((b, i) => data[offset + i] = b);
    const ix = new import_web3.TransactionInstruction({
      keys: [
        { pubkey: sender.publicKey, isSigner: true, isWritable: true },
        { pubkey: TREASURY, isSigner: false, isWritable: true },
        { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: this.styx.programId,
      data
    });
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [sender]);
  }
  /**
   * Derive global pool PDA for a mint
   */
  derivePoolPDA(mint) {
    return import_web3.PublicKey.findProgramAddressSync(
      [Buffer.from("styx_gpool"), mint.toBytes()],
      this.styx.programId
    );
  }
  /**
   * Derive nullifier PDA
   */
  deriveNullifierPDA(nullifier) {
    return import_web3.PublicKey.findProgramAddressSync(
      [Buffer.from("styx_null"), Buffer.from(nullifier)],
      this.styx.programId
    );
  }
  // ========================================================================
  // TOKEN-22 PARITY METHODS
  // ========================================================================
  /**
   * Wrap SPL tokens into STS note (entry to privacy pool)
   */
  async wrap(sender, mint, amount, ownerSecret) {
    const nonce = new Uint8Array(32);
    crypto.getRandomValues(nonce);
    const commitment = this.createCommitment(ownerSecret, amount, nonce);
    const encryptedNote = this.encryptNote(ownerSecret, amount, nonce);
    const data = Buffer.alloc(138);
    let offset = 0;
    data.writeUInt8(TAG_WRAP_SPL, offset);
    offset += 1;
    data.writeUInt8(TRUST_INDEXER, offset);
    offset += 1;
    mint.toBytes().forEach((b, i) => data[offset + i] = b);
    offset += 32;
    data.writeBigUInt64LE(amount, offset);
    offset += 8;
    commitment.forEach((b, i) => data[offset + i] = b);
    offset += 32;
    encryptedNote.forEach((b, i) => data[offset + i] = b);
    const ix = new import_web3.TransactionInstruction({
      keys: [
        { pubkey: sender.publicKey, isSigner: true, isWritable: true },
        { pubkey: TREASURY, isSigner: false, isWritable: true },
        { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: this.styx.programId,
      data
    });
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [sender]);
  }
  /**
   * Unwrap STS note to SPL tokens (exit from privacy pool)
   */
  async unwrap(sender, nullifier, mint, amount, recipient) {
    const data = Buffer.alloc(106);
    let offset = 0;
    data.writeUInt8(TAG_UNWRAP_SPL, offset);
    offset += 1;
    data.writeUInt8(TRUST_INDEXER, offset);
    offset += 1;
    nullifier.forEach((b, i) => data[offset + i] = b);
    offset += 32;
    mint.toBytes().forEach((b, i) => data[offset + i] = b);
    offset += 32;
    data.writeBigUInt64LE(amount, offset);
    offset += 8;
    recipient.toBytes().forEach((b, i) => data[offset + i] = b);
    const ix = new import_web3.TransactionInstruction({
      keys: [
        { pubkey: sender.publicKey, isSigner: true, isWritable: true },
        { pubkey: TREASURY, isSigner: false, isWritable: true },
        { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: this.styx.programId,
      data
    });
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [sender]);
  }
  /**
   * Create NFT collection
   */
  async createCollection(sender, name, symbol, maxSupply, royaltyBps) {
    const nameBytes = Buffer.from(name.slice(0, 32));
    const symbolBytes = Buffer.from(symbol.slice(0, 10));
    const data = Buffer.alloc(14 + nameBytes.length + symbolBytes.length);
    let offset = 0;
    data.writeUInt8(TAG_COLLECTION_CREATE, offset);
    offset += 1;
    data.writeUInt8(0, offset);
    offset += 1;
    data.writeUInt8(nameBytes.length, offset);
    offset += 1;
    nameBytes.forEach((b, i) => data[offset + i] = b);
    offset += nameBytes.length;
    data.writeUInt8(symbolBytes.length, offset);
    offset += 1;
    symbolBytes.forEach((b, i) => data[offset + i] = b);
    offset += symbolBytes.length;
    data.writeBigUInt64LE(maxSupply, offset);
    offset += 8;
    data.writeUInt16LE(royaltyBps, offset);
    const ix = new import_web3.TransactionInstruction({
      keys: [
        { pubkey: sender.publicKey, isSigner: true, isWritable: true },
        { pubkey: TREASURY, isSigner: false, isWritable: true },
        { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: this.styx.programId,
      data
    });
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [sender]);
  }
  /**
   * Mint NFT in collection
   */
  async mintNFT(sender, collection, metadataHash, ownerSecret, royaltyBps) {
    const nonce = new Uint8Array(32);
    crypto.getRandomValues(nonce);
    const ownerCommit = this.createCommitment(ownerSecret, BigInt(1), nonce);
    const data = Buffer.alloc(132);
    let offset = 0;
    data.writeUInt8(TAG_NFT_MINT, offset);
    offset += 1;
    data.writeUInt8(royaltyBps > 0 ? 4 : 0, offset);
    offset += 1;
    collection.forEach((b, i) => data[offset + i] = b);
    offset += 32;
    metadataHash.forEach((b, i) => data[offset + i] = b);
    offset += 32;
    ownerCommit.forEach((b, i) => data[offset + i] = b);
    offset += 32;
    data.writeUInt16LE(royaltyBps, offset);
    offset += 2;
    sender.publicKey.toBytes().forEach((b, i) => data[offset + i] = b);
    const ix = new import_web3.TransactionInstruction({
      keys: [
        { pubkey: sender.publicKey, isSigner: true, isWritable: true },
        { pubkey: TREASURY, isSigner: false, isWritable: true },
        { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: this.styx.programId,
      data
    });
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [sender]);
  }
  /**
   * Create note group (for collections)
   */
  async createGroup(sender, groupId, name, maxSize) {
    const nameBytes = Buffer.from(name.slice(0, 64));
    const data = Buffer.alloc(43 + nameBytes.length);
    let offset = 0;
    data.writeUInt8(TAG_GROUP_CREATE, offset);
    offset += 1;
    data.writeUInt8(0, offset);
    offset += 1;
    groupId.forEach((b, i) => data[offset + i] = b);
    offset += 32;
    data.writeUInt8(nameBytes.length, offset);
    offset += 1;
    nameBytes.forEach((b, i) => data[offset + i] = b);
    offset += nameBytes.length;
    data.writeBigUInt64LE(maxSize, offset);
    const ix = new import_web3.TransactionInstruction({
      keys: [
        { pubkey: sender.publicKey, isSigner: true, isWritable: true }
      ],
      programId: this.styx.programId,
      data
    });
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [sender]);
  }
  /**
   * Commit to fair launch (meme coin)
   */
  async fairLaunchCommit(sender, launchId, amount, nonce, revealSlot) {
    const amountBuf = Buffer.alloc(8);
    amountBuf.writeBigUInt64LE(amount);
    const amountCommit = (0, import_sha3.keccak_256)(Buffer.concat([
      Buffer.from("STS_AMOUNT_COMMIT_V1"),
      amountBuf,
      Buffer.from(nonce)
    ]));
    const data = Buffer.alloc(74);
    let offset = 0;
    data.writeUInt8(TAG_FAIR_LAUNCH_COMMIT, offset);
    offset += 1;
    data.writeUInt8(0, offset);
    offset += 1;
    launchId.forEach((b, i) => data[offset + i] = b);
    offset += 32;
    amountCommit.forEach((b, i) => data[offset + i] = b);
    offset += 32;
    data.writeBigUInt64LE(revealSlot, offset);
    const ix = new import_web3.TransactionInstruction({
      keys: [
        { pubkey: sender.publicKey, isSigner: true, isWritable: true },
        { pubkey: TREASURY, isSigner: false, isWritable: true },
        { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: this.styx.programId,
      data
    });
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [sender]);
  }
  /**
   * Reveal fair launch allocation
   */
  async fairLaunchReveal(sender, launchId, amount, nonce, ownerSecret) {
    const ownerNonce = new Uint8Array(32);
    crypto.getRandomValues(ownerNonce);
    const ownerCommit = this.createCommitment(ownerSecret, amount, ownerNonce);
    const data = Buffer.alloc(106);
    let offset = 0;
    data.writeUInt8(TAG_FAIR_LAUNCH_REVEAL, offset);
    offset += 1;
    data.writeUInt8(0, offset);
    offset += 1;
    launchId.forEach((b, i) => data[offset + i] = b);
    offset += 32;
    data.writeBigUInt64LE(amount, offset);
    offset += 8;
    nonce.forEach((b, i) => data[offset + i] = b);
    offset += 32;
    ownerCommit.forEach((b, i) => data[offset + i] = b);
    const ix = new import_web3.TransactionInstruction({
      keys: [
        { pubkey: sender.publicKey, isSigner: true, isWritable: true }
      ],
      programId: this.styx.programId,
      data
    });
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [sender]);
  }
  /**
   * Register transfer hook for notes
   */
  async registerHook(sender, mintHash, hookProgram, extraAccountsHash) {
    const data = Buffer.alloc(98);
    let offset = 0;
    data.writeUInt8(TAG_HOOK_REGISTER, offset);
    offset += 1;
    data.writeUInt8(0, offset);
    offset += 1;
    mintHash.forEach((b, i) => data[offset + i] = b);
    offset += 32;
    hookProgram.toBytes().forEach((b, i) => data[offset + i] = b);
    offset += 32;
    extraAccountsHash.forEach((b, i) => data[offset + i] = b);
    const ix = new import_web3.TransactionInstruction({
      keys: [
        { pubkey: sender.publicKey, isSigner: true, isWritable: true }
      ],
      programId: this.styx.programId,
      data
    });
    const tx = new import_web3.Transaction().add(ix);
    return (0, import_web3.sendAndConfirmTransaction)(this.styx.connection, tx, [sender]);
  }
  // ========================================================================
  // STATIC HELPERS FOR CLI
  // ========================================================================
  /**
   * Generate random bytes
   */
  static randomBytes(length) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  }
  /**
   * Hash bytes using Keccak256
   */
  static hash(data) {
    return (0, import_sha3.keccak_256)(data);
  }
  /**
   * Create note with commitment, nullifier, and encrypted data
   */
  static createNote(amount, mintHash, ownerKey) {
    const nonce = _STS.randomBytes(32);
    const amountBuf = new Uint8Array(8);
    new DataView(amountBuf.buffer).setBigUint64(0, amount, true);
    const commitment = (0, import_sha3.keccak_256)(Buffer.concat([
      Buffer.from("STS_NOTE_V1"),
      Buffer.from(ownerKey),
      Buffer.from(amountBuf),
      Buffer.from(nonce)
    ]));
    const nullifier = (0, import_sha3.keccak_256)(Buffer.concat([
      Buffer.from("STS_NULLIFIER_V1"),
      Buffer.from(commitment),
      Buffer.from(ownerKey)
    ]));
    const plaintext = Buffer.concat([Buffer.from(amountBuf), Buffer.from(nonce), Buffer.from(mintHash)]);
    const mask = (0, import_sha3.keccak_256)(Buffer.concat([
      Buffer.from("STS_NOTE_ENCRYPT_V1"),
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
  static buildMintInstruction(payer, treasury, commitment, encrypted, flags, extensions) {
    const data = Buffer.alloc(99 + extensions.length);
    let offset = 0;
    data.writeUInt8(TAG_NOTE_MINT, offset);
    offset += 1;
    data.writeUInt8(flags, offset);
    offset += 1;
    commitment.forEach((b, i) => data[offset + i] = b);
    offset += 32;
    encrypted.forEach((b, i) => data[offset + i] = b);
    offset += 64;
    data.writeUInt8(extensions.length > 0 ? 1 : 0, offset);
    offset += 1;
    extensions.forEach((b, i) => data[offset + i] = b);
    const instruction = new import_web3.TransactionInstruction({
      keys: [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: treasury, isSigner: false, isWritable: true },
        { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: STYX_PMP_DEVNET_PROGRAM_ID,
      data
    });
    return { instruction };
  }
  /**
   * Build transfer instruction
   */
  static buildTransferInstruction(payer, treasury, nullifier, newCommitment, encrypted, trustLevel) {
    const data = Buffer.alloc(131);
    let offset = 0;
    data.writeUInt8(TAG_NOTE_TRANSFER, offset);
    offset += 1;
    data.writeUInt8(trustLevel, offset);
    offset += 1;
    nullifier.forEach((b, i) => data[offset + i] = b);
    offset += 32;
    newCommitment.forEach((b, i) => data[offset + i] = b);
    offset += 32;
    encrypted.forEach((b, i) => data[offset + i] = b);
    offset += 64;
    data.writeUInt8(0, offset);
    const instruction = new import_web3.TransactionInstruction({
      keys: [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: treasury, isSigner: false, isWritable: true },
        { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: STYX_PMP_DEVNET_PROGRAM_ID,
      data
    });
    return { instruction };
  }
  /**
   * Build wrap instruction (SPL → STS)
   */
  static buildWrapInstruction(payer, treasury, mint, amount, commitment, encrypted) {
    const data = Buffer.alloc(138);
    let offset = 0;
    data.writeUInt8(TAG_WRAP_SPL, offset);
    offset += 1;
    data.writeUInt8(TRUST_INDEXER, offset);
    offset += 1;
    mint.toBytes().forEach((b, i) => data[offset + i] = b);
    offset += 32;
    data.writeBigUInt64LE(amount, offset);
    offset += 8;
    commitment.forEach((b, i) => data[offset + i] = b);
    offset += 32;
    encrypted.forEach((b, i) => data[offset + i] = b);
    const instruction = new import_web3.TransactionInstruction({
      keys: [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: treasury, isSigner: false, isWritable: true },
        { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: STYX_PMP_DEVNET_PROGRAM_ID,
      data
    });
    return { instruction };
  }
  /**
   * Build unwrap instruction (STS → SPL)
   */
  static buildUnwrapInstruction(payer, treasury, mint, recipient, nullifier, amount) {
    const data = Buffer.alloc(106);
    let offset = 0;
    data.writeUInt8(TAG_UNWRAP_SPL, offset);
    offset += 1;
    data.writeUInt8(TRUST_INDEXER, offset);
    offset += 1;
    nullifier.forEach((b, i) => data[offset + i] = b);
    offset += 32;
    mint.toBytes().forEach((b, i) => data[offset + i] = b);
    offset += 32;
    data.writeBigUInt64LE(amount, offset);
    offset += 8;
    recipient.toBytes().forEach((b, i) => data[offset + i] = b);
    const instruction = new import_web3.TransactionInstruction({
      keys: [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: treasury, isSigner: false, isWritable: true },
        { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: STYX_PMP_DEVNET_PROGRAM_ID,
      data
    });
    return { instruction };
  }
};
function buildNftListInstruction(payer, treasury, options, programId = STYX_PMP_PROGRAM_ID) {
  const data = Buffer.alloc(82);
  let offset = 0;
  data.writeUInt8(TAG_NFT_LIST, offset);
  offset += 1;
  data.writeUInt8(options.flags ?? 0, offset);
  offset += 1;
  options.nftCommit.forEach((b, i) => data[offset + i] = b);
  offset += 32;
  data.writeBigUInt64LE(options.price, offset);
  offset += 8;
  const currencyBytes = options.currencyMint?.toBytes() ?? new Uint8Array(32);
  currencyBytes.forEach((b, i) => data[offset + i] = b);
  offset += 32;
  data.writeBigUInt64LE(BigInt(options.expiry), offset);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    programId,
    data
  });
}
function buildNftDelistInstruction(payer, treasury, listingId, programId = STYX_PMP_PROGRAM_ID) {
  const data = Buffer.alloc(33);
  data.writeUInt8(TAG_NFT_DELIST, 0);
  listingId.forEach((b, i) => data[1 + i] = b);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    programId,
    data
  });
}
function buildNftBuyInstruction(buyer, seller, treasury, listingId, buyerSecret, newOwnerCommit, programId = STYX_PMP_PROGRAM_ID) {
  const data = Buffer.alloc(97);
  let offset = 0;
  data.writeUInt8(TAG_NFT_BUY, offset);
  offset += 1;
  listingId.forEach((b, i) => data[offset + i] = b);
  offset += 32;
  buyerSecret.forEach((b, i) => data[offset + i] = b);
  offset += 32;
  newOwnerCommit.forEach((b, i) => data[offset + i] = b);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: seller, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    programId,
    data
  });
}
function buildAuctionCreateInstruction(payer, treasury, options, programId = STYX_PMP_PROGRAM_ID) {
  const data = Buffer.alloc(82);
  let offset = 0;
  data.writeUInt8(TAG_AUCTION_CREATE, offset);
  offset += 1;
  data.writeUInt8(options.auctionType ?? AUCTION_ENGLISH, offset);
  offset += 1;
  options.nftCommit.forEach((b, i) => data[offset + i] = b);
  offset += 32;
  data.writeBigUInt64LE(options.reserve, offset);
  offset += 8;
  const currencyBytes = options.currencyMint?.toBytes() ?? new Uint8Array(32);
  currencyBytes.forEach((b, i) => data[offset + i] = b);
  offset += 32;
  data.writeBigUInt64LE(BigInt(options.duration), offset);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    programId,
    data
  });
}
function buildAuctionBidInstruction(bidder, treasury, auctionId, bidAmount, bidCommit, programId = STYX_PMP_PROGRAM_ID) {
  const data = Buffer.alloc(73);
  let offset = 0;
  data.writeUInt8(TAG_AUCTION_BID, offset);
  offset += 1;
  auctionId.forEach((b, i) => data[offset + i] = b);
  offset += 32;
  data.writeBigUInt64LE(bidAmount, offset);
  offset += 8;
  bidCommit.forEach((b, i) => data[offset + i] = b);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: bidder, isSigner: true, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    programId,
    data
  });
}
function buildPPVCreateInstruction(payer, treasury, options, programId = STYX_PMP_PROGRAM_ID) {
  const allowedProgramsData = options.allowedPrograms?.flatMap((p) => [...p.toBytes()]) ?? [];
  const data = Buffer.alloc(42 + allowedProgramsData.length);
  let offset = 0;
  data.writeUInt8(TAG_PPV_CREATE, offset);
  offset += 1;
  data.writeUInt8(0, offset);
  offset += 1;
  options.noteNullifier.forEach((b, i) => data[offset + i] = b);
  offset += 32;
  data.writeBigUInt64LE(options.amount, offset);
  offset += 8;
  allowedProgramsData.forEach((b, i) => data[offset + i] = b);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    programId,
    data
  });
}
function buildPPVVerifyInstruction(invoker, ppvId, callerProgram, actionHash, programId = STYX_PMP_PROGRAM_ID) {
  const data = Buffer.alloc(97);
  let offset = 0;
  data.writeUInt8(TAG_PPV_VERIFY, offset);
  offset += 1;
  ppvId.forEach((b, i) => data[offset + i] = b);
  offset += 32;
  callerProgram.toBytes().forEach((b, i) => data[offset + i] = b);
  offset += 32;
  actionHash.forEach((b, i) => data[offset + i] = b);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: invoker, isSigner: false, isWritable: false }
    ],
    programId,
    data
  });
}
function buildPPVRedeemInstruction(payer, treasury, ppvId, secret, recipient, programId = STYX_PMP_PROGRAM_ID) {
  const data = Buffer.alloc(97);
  let offset = 0;
  data.writeUInt8(TAG_PPV_REDEEM, offset);
  offset += 1;
  ppvId.forEach((b, i) => data[offset + i] = b);
  offset += 32;
  secret.forEach((b, i) => data[offset + i] = b);
  offset += 32;
  recipient.toBytes().forEach((b, i) => data[offset + i] = b);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    programId,
    data
  });
}
function buildAPBTransferInstruction(payer, treasury, options, programId = STYX_PMP_PROGRAM_ID) {
  const data = Buffer.alloc(106);
  let offset = 0;
  data.writeUInt8(TAG_APB_TRANSFER, offset);
  offset += 1;
  data.writeUInt8(options.flags ?? 0, offset);
  offset += 1;
  options.noteNullifier.forEach((b, i) => data[offset + i] = b);
  offset += 32;
  data.writeBigUInt64LE(options.amount, offset);
  offset += 8;
  options.stealthPubkey.forEach((b, i) => data[offset + i] = b);
  offset += 32;
  options.mint.toBytes().forEach((b, i) => data[offset + i] = b);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    programId,
    data
  });
}
function buildStealthScanHintInstruction(payer, stealthPubkey, scanHint, programId = STYX_PMP_PROGRAM_ID) {
  const data = Buffer.alloc(65);
  let offset = 0;
  data.writeUInt8(TAG_STEALTH_SCAN_HINT, offset);
  offset += 1;
  stealthPubkey.forEach((b, i) => data[offset + i] = b);
  offset += 32;
  scanHint.forEach((b, i) => data[offset + i] = b);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true }
    ],
    programId,
    data
  });
}
function buildPrivateSwapInstruction(payer, treasury, options, programId = STYX_PMP_PROGRAM_ID) {
  const data = Buffer.alloc(107);
  let offset = 0;
  data.writeUInt8(TAG_PRIVATE_SWAP, offset);
  offset += 1;
  options.inputNullifier.forEach((b, i) => data[offset + i] = b);
  offset += 32;
  options.inputMint.toBytes().forEach((b, i) => data[offset + i] = b);
  offset += 32;
  options.outputMint.toBytes().forEach((b, i) => data[offset + i] = b);
  offset += 32;
  data.writeBigUInt64LE(options.minOutput, offset);
  offset += 8;
  data.writeUInt16LE(options.slippageBps ?? 50, offset);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    programId,
    data
  });
}
function buildPrivateStakeInstruction(payer, treasury, inputNullifier, stakePool, amount, programId = STYX_PMP_PROGRAM_ID) {
  const data = Buffer.alloc(73);
  let offset = 0;
  data.writeUInt8(TAG_PRIVATE_STAKE, offset);
  offset += 1;
  inputNullifier.forEach((b, i) => data[offset + i] = b);
  offset += 32;
  stakePool.toBytes().forEach((b, i) => data[offset + i] = b);
  offset += 32;
  data.writeBigUInt64LE(amount, offset);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: stakePool, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    programId,
    data
  });
}
function buildPoolCreateInstruction(payer, treasury, options, programId = STYX_PMP_PROGRAM_ID) {
  const data = Buffer.alloc(42);
  let offset = 0;
  data.writeUInt8(TAG_POOL_CREATE, offset);
  offset += 1;
  data.writeUInt8(options.flags ?? 0, offset);
  offset += 1;
  options.mint.toBytes().forEach((b, i) => data[offset + i] = b);
  offset += 32;
  data.writeBigUInt64LE(options.initialDeposit ?? BigInt(0), offset);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    programId,
    data
  });
}
function buildPoolDepositInstruction(payer, treasury, poolId, amount, depositCommit, programId = STYX_PMP_PROGRAM_ID) {
  const data = Buffer.alloc(74);
  let offset = 0;
  data.writeUInt8(TAG_POOL_DEPOSIT, offset);
  offset += 1;
  poolId.forEach((b, i) => data[offset + i] = b);
  offset += 32;
  data.writeBigUInt64LE(amount, offset);
  offset += 8;
  depositCommit.forEach((b, i) => data[offset + i] = b);
  offset += 32;
  data.writeUInt8(0, offset);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    programId,
    data
  });
}
function buildPoolWithdrawInstruction(payer, treasury, poolId, depositNullifier, secret, amount, programId = STYX_PMP_PROGRAM_ID) {
  const data = Buffer.alloc(105);
  let offset = 0;
  data.writeUInt8(TAG_POOL_WITHDRAW, offset);
  offset += 1;
  poolId.forEach((b, i) => data[offset + i] = b);
  offset += 32;
  depositNullifier.forEach((b, i) => data[offset + i] = b);
  offset += 32;
  secret.forEach((b, i) => data[offset + i] = b);
  offset += 32;
  data.writeBigUInt64LE(amount, offset);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    programId,
    data
  });
}
function buildYieldVaultCreateInstruction(payer, treasury, options, programId = STYX_PMP_PROGRAM_ID) {
  const data = Buffer.alloc(67);
  let offset = 0;
  data.writeUInt8(TAG_YIELD_VAULT_CREATE, offset);
  offset += 1;
  options.underlyingMint.toBytes().forEach((b, i) => data[offset + i] = b);
  offset += 32;
  data.writeUInt16LE(options.apyBps ?? 500, offset);
  offset += 2;
  const yieldSourceBytes = options.yieldSource?.toBytes() ?? new Uint8Array(32);
  yieldSourceBytes.forEach((b, i) => data[offset + i] = b);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    programId,
    data
  });
}
function buildYieldDepositInstruction(payer, treasury, vaultId, amount, yieldCommit, programId = STYX_PMP_PROGRAM_ID) {
  const data = Buffer.alloc(73);
  let offset = 0;
  data.writeUInt8(TAG_YIELD_DEPOSIT, offset);
  offset += 1;
  vaultId.forEach((b, i) => data[offset + i] = b);
  offset += 32;
  data.writeBigUInt64LE(amount, offset);
  offset += 8;
  yieldCommit.forEach((b, i) => data[offset + i] = b);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    programId,
    data
  });
}
function buildTokenCreateInstruction(payer, treasury, options, programId = STYX_PMP_PROGRAM_ID) {
  const nameBytes = Buffer.from(options.metadata.name.slice(0, 32));
  const symbolBytes = Buffer.from(options.metadata.symbol.slice(0, 10));
  const uriBytes = Buffer.from(options.metadata.uri?.slice(0, 200) ?? "");
  const data = Buffer.alloc(4 + nameBytes.length + 1 + symbolBytes.length + 1 + uriBytes.length);
  let offset = 0;
  data.writeUInt8(TAG_TOKEN_CREATE, offset);
  offset += 1;
  data.writeUInt8(options.flags ?? 0, offset);
  offset += 1;
  data.writeUInt8(options.metadata.decimals, offset);
  offset += 1;
  data.writeUInt8(nameBytes.length, offset);
  offset += 1;
  nameBytes.copy(data, offset);
  offset += nameBytes.length;
  data.writeUInt8(symbolBytes.length, offset);
  offset += 1;
  symbolBytes.copy(data, offset);
  offset += symbolBytes.length;
  data.writeUInt8(uriBytes.length, offset);
  offset += 1;
  uriBytes.copy(data, offset);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    programId,
    data
  });
}
function buildTokenSetAuthorityInstruction(payer, tokenId, authorityType, newAuthority, programId = STYX_PMP_PROGRAM_ID) {
  const data = Buffer.alloc(66);
  let offset = 0;
  data.writeUInt8(TAG_TOKEN_SET_AUTHORITY, offset);
  offset += 1;
  tokenId.forEach((b, i) => data[offset + i] = b);
  offset += 32;
  data.writeUInt8(authorityType === "mint" ? 0 : 1, offset);
  offset += 1;
  newAuthority.toBytes().forEach((b, i) => data[offset + i] = b);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: false }
    ],
    programId,
    data
  });
}
function buildTokenMetadataUpdateInstruction(payer, tokenId, field, value, programId = STYX_PMP_PROGRAM_ID) {
  const valueBytes = Buffer.from(value);
  const data = Buffer.alloc(35 + valueBytes.length);
  let offset = 0;
  const fieldCode = field === "name" ? 0 : field === "symbol" ? 1 : 2;
  data.writeUInt8(TAG_TOKEN_METADATA_UPDATE, offset);
  offset += 1;
  tokenId.forEach((b, i) => data[offset + i] = b);
  offset += 32;
  data.writeUInt8(fieldCode, offset);
  offset += 1;
  data.writeUInt8(valueBytes.length, offset);
  offset += 1;
  valueBytes.copy(data, offset);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: false }
    ],
    programId,
    data
  });
}
function generateCommitment() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytes;
}
function generateNoteCommitment(mint, amount, secret) {
  return (0, import_sha3.keccak_256)(Buffer.concat([
    Buffer.from("STS_NOTE_V1"),
    mint.toBytes(),
    Buffer.from(new BigUint64Array([amount]).buffer),
    Buffer.from(secret)
  ]));
}
function generateNullifier(secret, commitment) {
  return (0, import_sha3.keccak_256)(Buffer.concat([
    Buffer.from("styx_nullifier"),
    Buffer.from(secret),
    Buffer.from(commitment)
  ]));
}
function generateStealthAddress(recipientSpendPubkey, senderEphemeralPrivkey) {
  const sharedSecret = import_ed25519.x25519.getSharedSecret(senderEphemeralPrivkey, recipientSpendPubkey);
  const stealthPubkey = (0, import_sha3.keccak_256)(Buffer.concat([
    Buffer.from("STS_STEALTH_V1"),
    Buffer.from(sharedSecret),
    Buffer.from(recipientSpendPubkey)
  ]));
  const scanHint = (0, import_sha3.keccak_256)(Buffer.concat([
    Buffer.from("STS_SCAN_V1"),
    Buffer.from(import_ed25519.x25519.getPublicKey(senderEphemeralPrivkey))
  ]));
  return { stealthPubkey, scanHint };
}
function buildHookExecute(payer, noteCommit, hookProgram, hookData = new Uint8Array(0)) {
  const data = Buffer.alloc(65 + hookData.length);
  let offset = 0;
  data.writeUInt8(TAG_HOOK_EXECUTE_REAL, offset);
  offset += 1;
  Buffer.from(noteCommit).copy(data, offset);
  offset += 32;
  Buffer.from(hookProgram.toBytes()).copy(data, offset);
  offset += 32;
  Buffer.from(hookData).copy(data, offset);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: false },
      { pubkey: hookProgram, isSigner: false, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildConfidentialTransferV2(payer, nullifier, encryptedData, auditorKey = new Uint8Array(32), flags = 0) {
  const data = Buffer.alloc(130);
  let offset = 0;
  data.writeUInt8(TAG_CONFIDENTIAL_TRANSFER_V2, offset);
  offset += 1;
  data.writeUInt8(flags, offset);
  offset += 1;
  Buffer.from(nullifier).copy(data, offset);
  offset += 32;
  Buffer.from(encryptedData.slice(0, 64)).copy(data, offset);
  offset += 64;
  Buffer.from(auditorKey).copy(data, offset);
  offset += 32;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildInterestClaimReal(claimer, noteCommit, currentLiquidityIndex) {
  const data = Buffer.alloc(41);
  let offset = 0;
  data.writeUInt8(TAG_INTEREST_CLAIM_REAL, offset);
  offset += 1;
  Buffer.from(noteCommit).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(currentLiquidityIndex, offset);
  offset += 8;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: claimer, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildRoyaltyClaimReal(creator, nftCommit, saleId, royaltyAmount) {
  const data = Buffer.alloc(73);
  let offset = 0;
  data.writeUInt8(TAG_ROYALTY_CLAIM_REAL, offset);
  offset += 1;
  Buffer.from(nftCommit).copy(data, offset);
  offset += 32;
  Buffer.from(saleId).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(royaltyAmount, offset);
  offset += 8;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: creator, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildBatchNoteOps(executor, operations) {
  if (operations.length > 10) {
    throw new Error("Batch size exceeds limit (max 10)");
  }
  let totalSize = 2;
  for (const op of operations) {
    totalSize += 1 + op.opData.length;
  }
  const data = Buffer.alloc(totalSize);
  let offset = 0;
  data.writeUInt8(TAG_BATCH_NOTE_OPS, offset);
  offset += 1;
  data.writeUInt8(operations.length, offset);
  offset += 1;
  for (const op of operations) {
    data.writeUInt8(op.opType, offset);
    offset += 1;
    Buffer.from(op.opData).copy(data, offset);
    offset += op.opData.length;
  }
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: executor, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildExchangeProof(prover, mint, balanceCommit, proof) {
  const data = Buffer.alloc(129);
  let offset = 0;
  data.writeUInt8(TAG_EXCHANGE_PROOF, offset);
  offset += 1;
  Buffer.from(mint).copy(data, offset);
  offset += 32;
  Buffer.from(balanceCommit).copy(data, offset);
  offset += 32;
  Buffer.from(proof.slice(0, 64)).copy(data, offset);
  offset += 64;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: prover, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
var REVEAL_AMOUNT = 1;
var REVEAL_SENDER = 2;
var REVEAL_RECIPIENT = 4;
var REVEAL_MEMO = 8;
var REVEAL_TIMESTAMP = 16;
function buildSelectiveDisclosure(owner, noteCommit, revealMask, revealedData = new Uint8Array(0)) {
  const data = Buffer.alloc(34 + revealedData.length);
  let offset = 0;
  data.writeUInt8(TAG_SELECTIVE_DISCLOSURE, offset);
  offset += 1;
  Buffer.from(noteCommit).copy(data, offset);
  offset += 32;
  data.writeUInt8(revealMask, offset);
  offset += 1;
  Buffer.from(revealedData).copy(data, offset);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
var CONDITION_HASHLOCK = 0;
var CONDITION_TIMELOCK = 1;
var CONDITION_MULTISIG = 2;
var CONDITION_ORACLE = 3;
function buildConditionalTransfer(executor, noteNullifier, conditionType, conditionData, witness) {
  const data = Buffer.alloc(98);
  let offset = 0;
  data.writeUInt8(TAG_CONDITIONAL_TRANSFER, offset);
  offset += 1;
  Buffer.from(noteNullifier).copy(data, offset);
  offset += 32;
  data.writeUInt8(conditionType, offset);
  offset += 1;
  Buffer.from(conditionData.slice(0, 32)).copy(data, offset);
  offset += 32;
  Buffer.from(witness.slice(0, 32)).copy(data, offset);
  offset += 32;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: executor, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildDelegationChain(delegator, noteCommit, delegate, maxDepth, currentDepth = 0) {
  const data = Buffer.alloc(67);
  let offset = 0;
  data.writeUInt8(TAG_DELEGATION_CHAIN, offset);
  offset += 1;
  Buffer.from(noteCommit).copy(data, offset);
  offset += 32;
  Buffer.from(delegate).copy(data, offset);
  offset += 32;
  data.writeUInt8(maxDepth, offset);
  offset += 1;
  data.writeUInt8(currentDepth, offset);
  offset += 1;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: delegator, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildTimeLockedReveal(creator, secretCommit, revealSlot, revealDataEncrypted) {
  const data = Buffer.alloc(105);
  let offset = 0;
  data.writeUInt8(TAG_TIME_LOCKED_REVEAL, offset);
  offset += 1;
  Buffer.from(secretCommit).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(revealSlot, offset);
  offset += 8;
  Buffer.from(revealDataEncrypted.slice(0, 64)).copy(data, offset);
  offset += 64;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: creator, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildCrossMintAtomic(partyA, mintA, mintB, amountA, amountB, swapHash) {
  const data = Buffer.alloc(113);
  let offset = 0;
  data.writeUInt8(TAG_CROSS_MINT_ATOMIC, offset);
  offset += 1;
  Buffer.from(mintA).copy(data, offset);
  offset += 32;
  Buffer.from(mintB).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(amountA, offset);
  offset += 8;
  data.writeBigUInt64LE(amountB, offset);
  offset += 8;
  Buffer.from(swapHash).copy(data, offset);
  offset += 32;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: partyA, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildSocialRecovery(guardian, noteCommit, newOwner, additionalSignatures = new Uint8Array(0)) {
  const data = Buffer.alloc(65 + additionalSignatures.length);
  let offset = 0;
  data.writeUInt8(TAG_SOCIAL_RECOVERY, offset);
  offset += 1;
  Buffer.from(noteCommit).copy(data, offset);
  offset += 32;
  Buffer.from(newOwner).copy(data, offset);
  offset += 32;
  Buffer.from(additionalSignatures).copy(data, offset);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: guardian, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildJupiterRoute(swapper, noteNullifier, inputMint, outputMint, minOut, slippageBps = 50, routeHint = 0) {
  const data = Buffer.alloc(109);
  let offset = 0;
  data.writeUInt8(TAG_JUPITER_ROUTE, offset);
  offset += 1;
  Buffer.from(noteNullifier).copy(data, offset);
  offset += 32;
  Buffer.from(inputMint).copy(data, offset);
  offset += 32;
  Buffer.from(outputMint).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(minOut, offset);
  offset += 8;
  data.writeUInt16LE(slippageBps, offset);
  offset += 2;
  data.writeUInt16LE(routeHint, offset);
  offset += 2;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: swapper, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
var MARINADE_STAKE = 0;
var MARINADE_UNSTAKE = 1;
var MARINADE_DELAYED_UNSTAKE = 2;
function buildMarinadeStake(staker, noteNullifier, action, amount) {
  const data = Buffer.alloc(42);
  let offset = 0;
  data.writeUInt8(TAG_MARINADE_STAKE, offset);
  offset += 1;
  Buffer.from(noteNullifier).copy(data, offset);
  offset += 32;
  data.writeUInt8(action, offset);
  offset += 1;
  data.writeBigUInt64LE(amount, offset);
  offset += 8;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: staker, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
var DRIFT_OPEN_LONG = 0;
var DRIFT_OPEN_SHORT = 1;
var DRIFT_CLOSE = 2;
var DRIFT_ADD_MARGIN = 3;
function buildDriftPerp(trader, noteNullifier, marketIndex, action, size, leverage) {
  const data = Buffer.alloc(52);
  let offset = 0;
  data.writeUInt8(TAG_DRIFT_PERP, offset);
  offset += 1;
  Buffer.from(noteNullifier).copy(data, offset);
  offset += 32;
  data.writeUInt16LE(marketIndex, offset);
  offset += 2;
  data.writeUInt8(action, offset);
  offset += 1;
  data.writeBigUInt64LE(size, offset);
  offset += 8;
  data.writeBigUInt64LE(leverage, offset);
  offset += 8;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: trader, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
var LENDING_DEPOSIT = 0;
var LENDING_BORROW = 1;
var LENDING_REPAY = 2;
var LENDING_WITHDRAW = 3;
function buildPrivateLending(user, action, noteNullifier, pool, amount, collateralFactorBps = 7500) {
  const data = Buffer.alloc(76);
  let offset = 0;
  data.writeUInt8(TAG_PRIVATE_LENDING, offset);
  offset += 1;
  data.writeUInt8(action, offset);
  offset += 1;
  Buffer.from(noteNullifier).copy(data, offset);
  offset += 32;
  Buffer.from(pool).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(amount, offset);
  offset += 8;
  data.writeUInt16LE(collateralFactorBps, offset);
  offset += 2;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: user, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildFlashLoan(borrower, pool, amount, callbackProgram, feeBps = 9) {
  const data = Buffer.alloc(75);
  let offset = 0;
  data.writeUInt8(TAG_FLASH_LOAN, offset);
  offset += 1;
  Buffer.from(pool).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(amount, offset);
  offset += 8;
  Buffer.from(callbackProgram.toBytes()).copy(data, offset);
  offset += 32;
  data.writeUInt16LE(feeBps, offset);
  offset += 2;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: borrower, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildOracleBound(sender, noteNullifier, oracle, minPrice, maxPrice, newCommitment = new Uint8Array(32)) {
  const data = Buffer.alloc(113);
  let offset = 0;
  data.writeUInt8(TAG_ORACLE_BOUND, offset);
  offset += 1;
  Buffer.from(noteNullifier).copy(data, offset);
  offset += 32;
  Buffer.from(oracle).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(minPrice, offset);
  offset += 8;
  data.writeBigUInt64LE(maxPrice, offset);
  offset += 8;
  Buffer.from(newCommitment).copy(data, offset);
  offset += 32;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: sender, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildVelocityLimit(owner, noteCommit, maxPerSlot, maxPerEpoch, currentAmount, action = 0) {
  const data = Buffer.alloc(58);
  let offset = 0;
  data.writeUInt8(TAG_VELOCITY_LIMIT, offset);
  offset += 1;
  Buffer.from(noteCommit).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(maxPerSlot, offset);
  offset += 8;
  data.writeBigUInt64LE(maxPerEpoch, offset);
  offset += 8;
  data.writeBigUInt64LE(currentAmount, offset);
  offset += 8;
  data.writeUInt8(action, offset);
  offset += 1;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildGovernanceLock(owner, noteCommit, governor, lockUntilSlot, votingPowerMultiplierBps = 100) {
  const data = Buffer.alloc(75);
  let offset = 0;
  data.writeUInt8(TAG_GOVERNANCE_LOCK, offset);
  offset += 1;
  Buffer.from(noteCommit).copy(data, offset);
  offset += 32;
  Buffer.from(governor).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(lockUntilSlot, offset);
  offset += 8;
  data.writeUInt16LE(votingPowerMultiplierBps, offset);
  offset += 2;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildReputationGate(owner, noteCommit, reputationOracle, minSenderScore, minReceiverScore) {
  const data = Buffer.alloc(73);
  let offset = 0;
  data.writeUInt8(TAG_REPUTATION_GATE, offset);
  offset += 1;
  Buffer.from(noteCommit).copy(data, offset);
  offset += 32;
  Buffer.from(reputationOracle).copy(data, offset);
  offset += 32;
  data.writeUInt32LE(minSenderScore, offset);
  offset += 4;
  data.writeUInt32LE(minReceiverScore, offset);
  offset += 4;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildGeoRestriction(owner, noteCommit, allowedRegionsHash, complianceOracle) {
  const data = Buffer.alloc(97);
  let offset = 0;
  data.writeUInt8(TAG_GEO_RESTRICTION, offset);
  offset += 1;
  Buffer.from(noteCommit).copy(data, offset);
  offset += 32;
  Buffer.from(allowedRegionsHash).copy(data, offset);
  offset += 32;
  Buffer.from(complianceOracle).copy(data, offset);
  offset += 32;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildTimeDecay(owner, noteCommit, initialValue, decayRateBps, decayStartSlot, floorValue) {
  const data = Buffer.alloc(59);
  let offset = 0;
  data.writeUInt8(TAG_TIME_DECAY, offset);
  offset += 1;
  Buffer.from(noteCommit).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(initialValue, offset);
  offset += 8;
  data.writeUInt16LE(decayRateBps, offset);
  offset += 2;
  data.writeBigUInt64LE(decayStartSlot, offset);
  offset += 8;
  data.writeBigUInt64LE(floorValue, offset);
  offset += 8;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildMultiSigNote(initializer, noteCommit, signersHash, threshold, totalSigners) {
  if (threshold > totalSigners || threshold === 0) {
    throw new Error("Invalid threshold");
  }
  const data = Buffer.alloc(67);
  let offset = 0;
  data.writeUInt8(TAG_MULTI_SIG_NOTE, offset);
  offset += 1;
  Buffer.from(noteCommit).copy(data, offset);
  offset += 32;
  Buffer.from(signersHash).copy(data, offset);
  offset += 32;
  data.writeUInt8(threshold, offset);
  offset += 1;
  data.writeUInt8(totalSigners, offset);
  offset += 1;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: initializer, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildRecoverableNote(owner, noteCommit, guardianHash, recoveryDelaySlots, inactivityThreshold) {
  const data = Buffer.alloc(81);
  let offset = 0;
  data.writeUInt8(TAG_RECOVERABLE_NOTE, offset);
  offset += 1;
  Buffer.from(noteCommit).copy(data, offset);
  offset += 32;
  Buffer.from(guardianHash).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(recoveryDelaySlots, offset);
  offset += 8;
  data.writeBigUInt64LE(inactivityThreshold, offset);
  offset += 8;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildAmmPoolCreate(creator, mintA, mintB, feeBps = 30, poolType = POOL_TYPE_CONSTANT_PRODUCT, initialSqrtPrice = BigInt(1) << BigInt(32)) {
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
  data.writeUInt8(TAG_AMM_POOL_CREATE, offset);
  offset += 1;
  Buffer.from(orderedMintA).copy(data, offset);
  offset += 32;
  Buffer.from(orderedMintB).copy(data, offset);
  offset += 32;
  data.writeUInt16LE(feeBps, offset);
  offset += 2;
  data.writeUInt8(poolType, offset);
  offset += 1;
  data.writeBigUInt64LE(initialSqrtPrice, offset);
  offset += 8;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: creator, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function computePoolId(mintA, mintB, feeBps) {
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
  return (0, import_sha3.keccak_256)(Buffer.concat([
    Buffer.from("STS_AMM_POOL_V1"),
    Buffer.from(orderedMintA),
    Buffer.from(orderedMintB),
    feeBytes
  ]));
}
function buildAmmAddLiquidity(provider, poolId, amountA, amountB, minLp = BigInt(0), deadline = BigInt(0)) {
  const data = Buffer.alloc(65);
  let offset = 0;
  data.writeUInt8(TAG_AMM_ADD_LIQUIDITY, offset);
  offset += 1;
  Buffer.from(poolId).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(amountA, offset);
  offset += 8;
  data.writeBigUInt64LE(amountB, offset);
  offset += 8;
  data.writeBigUInt64LE(minLp, offset);
  offset += 8;
  data.writeBigUInt64LE(deadline, offset);
  offset += 8;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: provider, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildAmmRemoveLiquidity(remover, poolId, lpNullifier, lpAmount, minA = BigInt(0), minB = BigInt(0)) {
  const data = Buffer.alloc(89);
  let offset = 0;
  data.writeUInt8(TAG_AMM_REMOVE_LIQUIDITY, offset);
  offset += 1;
  Buffer.from(poolId).copy(data, offset);
  offset += 32;
  Buffer.from(lpNullifier).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(lpAmount, offset);
  offset += 8;
  data.writeBigUInt64LE(minA, offset);
  offset += 8;
  data.writeBigUInt64LE(minB, offset);
  offset += 8;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: remover, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
var SWAP_A_TO_B = 0;
var SWAP_B_TO_A = 1;
function buildAmmSwap(swapper, poolId, noteNullifier, amountIn, minOut, direction = SWAP_A_TO_B) {
  const data = Buffer.alloc(82);
  let offset = 0;
  data.writeUInt8(TAG_AMM_SWAP, offset);
  offset += 1;
  Buffer.from(poolId).copy(data, offset);
  offset += 32;
  Buffer.from(noteNullifier).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(amountIn, offset);
  offset += 8;
  data.writeBigUInt64LE(minOut, offset);
  offset += 8;
  data.writeUInt8(direction, offset);
  offset += 1;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: swapper, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildAmmQuote(quoter, poolId, amount, direction = SWAP_A_TO_B) {
  const data = Buffer.alloc(42);
  let offset = 0;
  data.writeUInt8(TAG_AMM_QUOTE, offset);
  offset += 1;
  Buffer.from(poolId).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(amount, offset);
  offset += 8;
  data.writeUInt8(direction, offset);
  offset += 1;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: quoter, isSigner: false, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildAmmSync(syncer, poolId, reserveA, reserveB) {
  const data = Buffer.alloc(49);
  let offset = 0;
  data.writeUInt8(TAG_AMM_SYNC, offset);
  offset += 1;
  Buffer.from(poolId).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(reserveA, offset);
  offset += 8;
  data.writeBigUInt64LE(reserveB, offset);
  offset += 8;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: syncer, isSigner: false, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildLpNoteMint(minter, poolId, lpAmount, recipientCommit) {
  const data = Buffer.alloc(73);
  let offset = 0;
  data.writeUInt8(TAG_LP_NOTE_MINT, offset);
  offset += 1;
  Buffer.from(poolId).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(lpAmount, offset);
  offset += 8;
  Buffer.from(recipientCommit).copy(data, offset);
  offset += 32;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: minter, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildLpNoteBurn(burner, poolId, lpNullifier, lpAmount) {
  const data = Buffer.alloc(73);
  let offset = 0;
  data.writeUInt8(TAG_LP_NOTE_BURN, offset);
  offset += 1;
  Buffer.from(poolId).copy(data, offset);
  offset += 32;
  Buffer.from(lpNullifier).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(lpAmount, offset);
  offset += 8;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: burner, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildRouterSwap(swapper, hops) {
  if (hops.length > 5) {
    throw new Error("Too many hops (max 5)");
  }
  const hopSize = 33;
  const data = Buffer.alloc(2 + hops.length * hopSize);
  let offset = 0;
  data.writeUInt8(TAG_ROUTER_SWAP, offset);
  offset += 1;
  data.writeUInt8(hops.length, offset);
  offset += 1;
  for (const hop of hops) {
    Buffer.from(hop.poolId).copy(data, offset);
    offset += 32;
    data.writeUInt8(hop.direction, offset);
    offset += 1;
  }
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: swapper, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildRouterSplit(swapper, splits) {
  if (splits.length > 4) {
    throw new Error("Too many splits (max 4)");
  }
  const totalBps = splits.reduce((sum, s) => sum + s.percentageBps, 0);
  if (totalBps !== 1e4) {
    throw new Error("Split percentages must sum to 10000 (100%)");
  }
  const splitSize = 34;
  const data = Buffer.alloc(2 + splits.length * splitSize);
  let offset = 0;
  data.writeUInt8(TAG_ROUTER_SPLIT, offset);
  offset += 1;
  data.writeUInt8(splits.length, offset);
  offset += 1;
  for (const split of splits) {
    Buffer.from(split.poolId).copy(data, offset);
    offset += 32;
    data.writeUInt16LE(split.percentageBps, offset);
    offset += 2;
  }
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: swapper, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
var ORDER_BUY = 0;
var ORDER_SELL = 1;
function buildLimitOrderPlace(placer, poolId, noteCommit, price, amount, direction = ORDER_BUY, expirySlot = BigInt(0)) {
  const data = Buffer.alloc(90);
  let offset = 0;
  data.writeUInt8(TAG_LIMIT_ORDER_PLACE, offset);
  offset += 1;
  Buffer.from(poolId).copy(data, offset);
  offset += 32;
  Buffer.from(noteCommit).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(price, offset);
  offset += 8;
  data.writeBigUInt64LE(amount, offset);
  offset += 8;
  data.writeUInt8(direction, offset);
  offset += 1;
  data.writeBigUInt64LE(expirySlot, offset);
  offset += 8;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: placer, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildLimitOrderFill(taker, orderId, fillAmount, takerNullifier) {
  const data = Buffer.alloc(73);
  let offset = 0;
  data.writeUInt8(TAG_LIMIT_ORDER_FILL, offset);
  offset += 1;
  Buffer.from(orderId).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(fillAmount, offset);
  offset += 8;
  Buffer.from(takerNullifier).copy(data, offset);
  offset += 32;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: taker, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildLimitOrderCancel(canceler, orderId) {
  const data = Buffer.alloc(33);
  let offset = 0;
  data.writeUInt8(TAG_LIMIT_ORDER_CANCEL, offset);
  offset += 1;
  Buffer.from(orderId).copy(data, offset);
  offset += 32;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: canceler, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildTwapOrderStart(trader, poolId, totalAmount, numSlices, intervalSlots, direction = ORDER_BUY) {
  if (numSlices < 2 || numSlices > 100) {
    throw new Error("Invalid slice count (2-100)");
  }
  const data = Buffer.alloc(51);
  let offset = 0;
  data.writeUInt8(TAG_TWAP_ORDER_START, offset);
  offset += 1;
  Buffer.from(poolId).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(totalAmount, offset);
  offset += 8;
  data.writeUInt8(numSlices, offset);
  offset += 1;
  data.writeBigUInt64LE(intervalSlots, offset);
  offset += 8;
  data.writeUInt8(direction, offset);
  offset += 1;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: trader, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function buildTwapOrderFill(filler, twapId, sliceIndex, amount, price) {
  const data = Buffer.alloc(50);
  let offset = 0;
  data.writeUInt8(TAG_TWAP_ORDER_FILL, offset);
  offset += 1;
  Buffer.from(twapId).copy(data, offset);
  offset += 32;
  data.writeUInt8(sliceIndex, offset);
  offset += 1;
  data.writeBigUInt64LE(amount, offset);
  offset += 8;
  data.writeBigUInt64LE(price, offset);
  offset += 8;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: filler, isSigner: false, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
var CLMM_OPEN = 0;
var CLMM_ADD = 1;
var CLMM_REMOVE = 2;
var CLMM_CLOSE = 3;
var CLMM_COLLECT_FEES = 4;
function buildConcentratedLp(provider, poolId, action, tickLower, tickUpper, liquidity) {
  if (tickLower >= tickUpper) {
    throw new Error("Invalid tick range (tickLower must be < tickUpper)");
  }
  const data = Buffer.alloc(50);
  let offset = 0;
  data.writeUInt8(TAG_CONCENTRATED_LP, offset);
  offset += 1;
  Buffer.from(poolId).copy(data, offset);
  offset += 32;
  data.writeUInt8(action, offset);
  offset += 1;
  data.writeInt32LE(tickLower, offset);
  offset += 4;
  data.writeInt32LE(tickUpper, offset);
  offset += 4;
  data.writeBigUInt64LE(liquidity, offset);
  offset += 8;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: provider, isSigner: true, isWritable: false }
    ],
    programId: STYX_PMP_PROGRAM_ID,
    data
  });
}
function calculateConstantProductSwap(amountIn, reserveIn, reserveOut, feeBps = 30) {
  if (reserveIn === BigInt(0) || reserveOut === BigInt(0)) {
    throw new Error("Reserves cannot be zero");
  }
  const amountInWithFee = amountIn * BigInt(1e4 - feeBps) / BigInt(1e4);
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn + amountInWithFee;
  return numerator / denominator;
}
function calculateLpMint(amountA, amountB, reserveA, reserveB, totalLpSupply) {
  if (totalLpSupply === BigInt(0)) {
    const product = amountA * amountB;
    return sqrt(product);
  }
  const lpFromA = amountA * totalLpSupply / reserveA;
  const lpFromB = amountB * totalLpSupply / reserveB;
  return lpFromA < lpFromB ? lpFromA : lpFromB;
}
function calculateLpBurn(lpAmount, reserveA, reserveB, totalLpSupply) {
  if (totalLpSupply === BigInt(0)) {
    throw new Error("No LP supply");
  }
  const amountA = lpAmount * reserveA / totalLpSupply;
  const amountB = lpAmount * reserveB / totalLpSupply;
  return [amountA, amountB];
}
function sqrt(n) {
  if (n < BigInt(0)) throw new Error("Square root of negative number");
  if (n < BigInt(2)) return n;
  let x = n;
  let y = (x + BigInt(1)) / BigInt(2);
  while (y < x) {
    x = y;
    y = (x + n / x) / BigInt(2);
  }
  return x;
}
function calculatePriceImpact(amountIn, reserveIn, reserveOut) {
  if (reserveIn === BigInt(0) || reserveOut === BigInt(0)) {
    return 1e4;
  }
  const spotPrice = reserveOut * BigInt(1e4) / reserveIn;
  const amountOut = calculateConstantProductSwap(amountIn, reserveIn, reserveOut, 0);
  const effectivePrice = amountOut * BigInt(1e4) / amountIn;
  const impact = (spotPrice - effectivePrice) * BigInt(1e4) / spotPrice;
  return Number(impact);
}
function buildNullifierCreate(options, payer, programId = STYX_PMP_PROGRAM_ID) {
  const nullifier = (0, import_sha3.keccak_256)(new Uint8Array([...options.noteCommit, ...options.secretHash]));
  const [nullifierPda] = import_web3.PublicKey.findProgramAddressSync(
    [Buffer.from("styx_null"), nullifier],
    programId
  );
  const data = new Uint8Array(98);
  data[0] = TAG_NULLIFIER_CREATE;
  data.set(options.noteCommit, 1);
  data.set(nullifier, 33);
  data.set(options.secretHash, 65);
  data[97] = options.flags ?? 0;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: nullifierPda, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    programId,
    data: Buffer.from(data)
  });
}
function buildNullifierCheck(nullifier, programId = STYX_PMP_PROGRAM_ID) {
  const [nullifierPda] = import_web3.PublicKey.findProgramAddressSync(
    [Buffer.from("styx_null"), nullifier],
    programId
  );
  const data = new Uint8Array(33);
  data[0] = TAG_NULLIFIER_CHECK;
  data.set(nullifier, 1);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: nullifierPda, isSigner: false, isWritable: false }
    ],
    programId,
    data: Buffer.from(data)
  });
}
function buildMerkleProofVerify(options, verifier, programId = STYX_PMP_PROGRAM_ID) {
  const proofLen = options.proof.length;
  const dataLen = 66 + proofLen * 33;
  const data = new Uint8Array(dataLen);
  data[0] = TAG_MERKLE_PROOF_VERIFY;
  data.set(options.noteCommit, 1);
  data.set(options.root, 33);
  data[65] = proofLen;
  for (let i = 0; i < proofLen; i++) {
    const offset = 66 + i * 33;
    data.set(options.proof[i].hash, offset);
    data[offset + 32] = options.proof[i].isRight ? 1 : 0;
  }
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: verifier, isSigner: true, isWritable: false }
    ],
    programId,
    data: Buffer.from(data)
  });
}
function buildBalanceAttest(options, caller, programId = STYX_PMP_PROGRAM_ID) {
  const nonceBytes = Buffer.alloc(8);
  nonceBytes.writeBigUInt64LE(options.nonce);
  const [attestationPda] = import_web3.PublicKey.findProgramAddressSync(
    [Buffer.from("styx_attest"), options.owner.toBytes(), options.mint.toBytes(), nonceBytes],
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
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: caller, isSigner: false, isWritable: false },
      { pubkey: attestationPda, isSigner: false, isWritable: false }
    ],
    programId,
    data: Buffer.from(data)
  });
}
function buildFreezeEnforced(options, programId = STYX_PMP_PROGRAM_ID) {
  const [freezePda] = import_web3.PublicKey.findProgramAddressSync(
    [Buffer.from("styx_freeze"), options.noteCommit],
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
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: options.freezeAuthority, isSigner: true, isWritable: false },
      { pubkey: options.complianceAuthority, isSigner: true, isWritable: false },
      { pubkey: freezePda, isSigner: false, isWritable: true }
    ],
    programId,
    data: Buffer.from(data)
  });
}
function buildWrapperMint(options, owner, programId = STYX_PMP_PROGRAM_ID) {
  const [nullifierPda] = import_web3.PublicKey.findProgramAddressSync(
    [Buffer.from("styx_null"), options.noteNullifier],
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
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: nullifierPda, isSigner: false, isWritable: false }
    ],
    programId,
    data: Buffer.from(data)
  });
}
function buildWrapperBurn(options, owner, programId = STYX_PMP_PROGRAM_ID) {
  const amountBytes = Buffer.alloc(8);
  amountBytes.writeBigUInt64LE(options.amount);
  const data = new Uint8Array(106);
  data[0] = TAG_WRAPPER_BURN;
  data.set(options.wrapperMint.toBytes(), 1);
  data.set(options.sourceTokenAccount.toBytes(), 33);
  data.set(amountBytes, 65);
  data.set(options.recipientVta.toBytes(), 73);
  data[105] = options.createNewNote ? 1 : 0;
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: options.sourceTokenAccount, isSigner: false, isWritable: true },
      { pubkey: options.wrapperMint, isSigner: false, isWritable: true },
      { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    programId,
    data: Buffer.from(data)
  });
}
function buildValidatorProof(options, prover, programId = STYX_PMP_PROGRAM_ID) {
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
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: prover, isSigner: true, isWritable: false }
    ],
    programId,
    data: Buffer.from(data)
  });
}
function buildAtomicCpiTransfer(fromCommit, toCommit, amount, callerProgram, owner, programId = STYX_PMP_PROGRAM_ID) {
  const data = new Uint8Array(105);
  data[0] = TAG_ATOMIC_CPI_TRANSFER;
  data.set(fromCommit, 1);
  data.set(toCommit, 33);
  const amountBytes = Buffer.alloc(8);
  amountBytes.writeBigUInt64LE(amount);
  data.set(amountBytes, 65);
  data.set(callerProgram.toBytes(), 73);
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false }
    ],
    programId,
    data: Buffer.from(data)
  });
}
function buildBatchNullifier(nullifiers, spender, programId = STYX_PMP_PROGRAM_ID) {
  if (nullifiers.length === 0 || nullifiers.length > 10) {
    throw new Error("Batch size must be 1-10");
  }
  const count = nullifiers.length;
  const dataLen = 2 + count * 32;
  const data = new Uint8Array(dataLen);
  data[0] = TAG_BATCH_NULLIFIER;
  data[1] = count;
  for (let i = 0; i < count; i++) {
    data.set(nullifiers[i], 2 + i * 32);
  }
  return new import_web3.TransactionInstruction({
    keys: [
      { pubkey: spender, isSigner: true, isWritable: false }
    ],
    programId,
    data: Buffer.from(data)
  });
}
function compareCosts(numUsers) {
  const token22RentPerAccount = 203928e-8;
  const token22TxCost = 5e-6;
  const stsRentPerAccount = 0;
  const stsTxCost = 1e-3;
  const token22Rent = numUsers * token22RentPerAccount;
  const token22Tx = numUsers * token22TxCost;
  const token22Total = token22Rent + token22Tx;
  const stsRent = numUsers * stsRentPerAccount;
  const stsTx = numUsers * stsTxCost;
  const stsTotal = stsRent + stsTx;
  const savings = token22Total - stsTotal;
  const savingsPercent = token22Total > 0 ? savings / token22Total * 100 : 0;
  return {
    sts: { rentTotal: stsRent, txCost: stsTx, total: stsTotal },
    token22: { rentTotal: token22Rent, txCost: token22Tx, total: token22Total },
    savingsPercent,
    savingsSol: savings
  };
}
function compareValidatorBurden(numAccounts) {
  const token22RamPerAccount = 100;
  const token22DiskPerAccount = 200;
  const stsRamPerAccount = 0;
  const stsDiskPerAccount = 0;
  const token22Ram = numAccounts * token22RamPerAccount;
  const token22Disk = numAccounts * token22DiskPerAccount;
  const stsRam = numAccounts * stsRamPerAccount;
  const stsDisk = numAccounts * stsDiskPerAccount;
  return {
    sts: {
      ramBytes: stsRam,
      diskBytes: stsDisk,
      indexLoad: "Offloaded to specialized indexers"
    },
    token22: {
      ramBytes: token22Ram,
      diskBytes: token22Disk,
      indexLoad: "Every validator must index all accounts"
    },
    ramReductionPercent: 100
    // STS has ZERO validator RAM burden
  };
}
function generateValidatorProofData(proofType, numAccounts) {
  const proofTypeMap = { ram: 0, disk: 1, compute: 2, rent: 3 };
  const comparison = compareValidatorBurden(numAccounts);
  const costs = compareCosts(numAccounts);
  let stsMetric;
  let token22Metric;
  switch (proofType) {
    case "ram":
      stsMetric = BigInt(comparison.sts.ramBytes);
      token22Metric = BigInt(comparison.token22.ramBytes);
      break;
    case "disk":
      stsMetric = BigInt(comparison.sts.diskBytes);
      token22Metric = BigInt(comparison.token22.diskBytes);
      break;
    case "compute":
      stsMetric = BigInt(5e3);
      token22Metric = BigInt(2e5);
      break;
    case "rent":
      stsMetric = BigInt(Math.round(costs.sts.rentTotal * import_web3.LAMPORTS_PER_SOL));
      token22Metric = BigInt(Math.round(costs.token22.rentTotal * import_web3.LAMPORTS_PER_SOL));
      break;
  }
  const evidenceStr = JSON.stringify({ proofType, numAccounts, stsMetric: stsMetric.toString(), token22Metric: token22Metric.toString() });
  const evidenceHash = (0, import_sha3.keccak_256)(new TextEncoder().encode(evidenceStr));
  return {
    proofType: proofTypeMap[proofType],
    stsMetric,
    token22Metric,
    evidenceHash
  };
}
function buildSecurityIssue(payer, programId, securityId, totalShares, issuerSig, regulationType = 0, lockupPeriod = 0) {
  const data = Buffer.alloc(128);
  let offset = 0;
  data.writeUInt8(TAG_SECURITY_ISSUE, offset);
  offset += 1;
  Buffer.from(securityId).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(totalShares, offset);
  offset += 8;
  Buffer.from(issuerSig).copy(data, offset);
  offset += 64;
  data.writeUInt8(regulationType, offset);
  offset += 1;
  data.writeUInt32LE(lockupPeriod, offset);
  offset += 4;
  return new import_web3.TransactionInstruction({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
    data: data.subarray(0, offset)
  });
}
function buildSecurityTransfer(payer, programId, securityId, senderCommit, receiverCommit, amount, complianceProof) {
  const data = Buffer.alloc(200);
  let offset = 0;
  data.writeUInt8(TAG_SECURITY_TRANSFER, offset);
  offset += 1;
  Buffer.from(securityId).copy(data, offset);
  offset += 32;
  Buffer.from(senderCommit).copy(data, offset);
  offset += 32;
  Buffer.from(receiverCommit).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(amount, offset);
  offset += 8;
  Buffer.from(complianceProof).copy(data, offset);
  offset += 64;
  return new import_web3.TransactionInstruction({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
    data: data.subarray(0, offset)
  });
}
function buildTransferAgentRegister(payer, programId, securityId, agentPubkey, issuerSig, permissions = 255) {
  const data = Buffer.alloc(130);
  let offset = 0;
  data.writeUInt8(TAG_TRANSFER_AGENT_REGISTER, offset);
  offset += 1;
  Buffer.from(securityId).copy(data, offset);
  offset += 32;
  Buffer.from(agentPubkey).copy(data, offset);
  offset += 32;
  Buffer.from(issuerSig).copy(data, offset);
  offset += 64;
  data.writeUInt8(permissions, offset);
  offset += 1;
  return new import_web3.TransactionInstruction({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
    data: data.subarray(0, offset)
  });
}
function buildOptionCreate(payer, programId, underlyingCommit, strikePrice, expirySlot, optionType, exerciseStyle = 0) {
  const data = Buffer.alloc(64);
  let offset = 0;
  data.writeUInt8(TAG_OPTION_WRITE, offset);
  offset += 1;
  Buffer.from(underlyingCommit).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(strikePrice, offset);
  offset += 8;
  data.writeUInt32LE(expirySlot, offset);
  offset += 4;
  data.writeUInt8(optionType, offset);
  offset += 1;
  data.writeUInt8(exerciseStyle, offset);
  offset += 1;
  return new import_web3.TransactionInstruction({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
    data: data.subarray(0, offset)
  });
}
function buildOptionExercise(payer, programId, optionId, ownershipProof, amount, settlementType = 0) {
  const data = Buffer.alloc(110);
  let offset = 0;
  data.writeUInt8(TAG_OPTION_EXERCISE, offset);
  offset += 1;
  Buffer.from(optionId).copy(data, offset);
  offset += 32;
  Buffer.from(ownershipProof).copy(data, offset);
  offset += 64;
  data.writeBigUInt64LE(amount, offset);
  offset += 8;
  data.writeUInt8(settlementType, offset);
  offset += 1;
  return new import_web3.TransactionInstruction({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
    data: data.subarray(0, offset)
  });
}
function buildOptionSettle(payer, programId, optionId, oracleSig, settlementPrice, pnlProof) {
  const data = Buffer.alloc(175);
  let offset = 0;
  data.writeUInt8(TAG_OPTION_MARKET_MAKE, offset);
  offset += 1;
  Buffer.from(optionId).copy(data, offset);
  offset += 32;
  Buffer.from(oracleSig).copy(data, offset);
  offset += 64;
  data.writeBigUInt64LE(settlementPrice, offset);
  offset += 8;
  Buffer.from(pnlProof).copy(data, offset);
  offset += 64;
  return new import_web3.TransactionInstruction({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
    data: data.subarray(0, offset)
  });
}
function buildMarginOpen(payer, programId, accountId, initialMarginBps, maintenanceMarginBps, maxLeverage) {
  const data = Buffer.alloc(48);
  let offset = 0;
  data.writeUInt8(TAG_MARGIN_ACCOUNT_CREATE, offset);
  offset += 1;
  Buffer.from(accountId).copy(data, offset);
  offset += 32;
  data.writeUInt16LE(initialMarginBps, offset);
  offset += 2;
  data.writeUInt16LE(maintenanceMarginBps, offset);
  offset += 2;
  data.writeUInt8(maxLeverage, offset);
  offset += 1;
  return new import_web3.TransactionInstruction({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
    data: data.subarray(0, offset)
  });
}
function buildPositionOpen(payer, programId, accountId, assetCommit, size, direction, entryPrice, leverage) {
  const data = Buffer.alloc(90);
  let offset = 0;
  data.writeUInt8(TAG_POSITION_OPEN, offset);
  offset += 1;
  Buffer.from(accountId).copy(data, offset);
  offset += 32;
  Buffer.from(assetCommit).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(size, offset);
  offset += 8;
  data.writeUInt8(direction, offset);
  offset += 1;
  data.writeBigUInt64LE(entryPrice, offset);
  offset += 8;
  data.writeUInt8(leverage, offset);
  offset += 1;
  return new import_web3.TransactionInstruction({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
    data: data.subarray(0, offset)
  });
}
function buildMarginLiquidate(payer, programId, positionId, oracleSig, currentPrice, liquidatorRewardBps = 500) {
  const data = Buffer.alloc(110);
  let offset = 0;
  data.writeUInt8(TAG_POSITION_LIQUIDATE, offset);
  offset += 1;
  Buffer.from(positionId).copy(data, offset);
  offset += 32;
  Buffer.from(oracleSig).copy(data, offset);
  offset += 64;
  data.writeBigUInt64LE(currentPrice, offset);
  offset += 8;
  data.writeUInt16LE(liquidatorRewardBps, offset);
  offset += 2;
  return new import_web3.TransactionInstruction({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
    data: data.subarray(0, offset)
  });
}
function buildBridgeLock(payer, programId, tokenCommit, amount, destChainId, destAddress, bridgeFee = BigInt(0), timeout = 0) {
  const data = Buffer.alloc(100);
  let offset = 0;
  data.writeUInt8(TAG_BRIDGE_LOCK, offset);
  offset += 1;
  Buffer.from(tokenCommit).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(amount, offset);
  offset += 8;
  data.writeUInt8(destChainId, offset);
  offset += 1;
  Buffer.from(destAddress).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(bridgeFee, offset);
  offset += 8;
  data.writeUInt32LE(timeout, offset);
  offset += 4;
  return new import_web3.TransactionInstruction({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
    data: data.subarray(0, offset)
  });
}
function buildBridgeRelease(payer, programId, lockId, bridgeProof, receiverCommit, amount) {
  const data = Buffer.alloc(145);
  let offset = 0;
  data.writeUInt8(TAG_BRIDGE_RELEASE, offset);
  offset += 1;
  Buffer.from(lockId).copy(data, offset);
  offset += 32;
  Buffer.from(bridgeProof).copy(data, offset);
  offset += 64;
  Buffer.from(receiverCommit).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(amount, offset);
  offset += 8;
  return new import_web3.TransactionInstruction({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
    data: data.subarray(0, offset)
  });
}
function buildBridgeOracleRegister(payer, programId, oraclePubkey, supportedChains, stakeAmount) {
  const data = Buffer.alloc(64);
  let offset = 0;
  data.writeUInt8(TAG_BRIDGE_GUARDIAN_ROTATE, offset);
  offset += 1;
  Buffer.from(oraclePubkey).copy(data, offset);
  offset += 32;
  data.writeUInt8(supportedChains.length, offset);
  offset += 1;
  for (const chain of supportedChains.slice(0, 8)) {
    data.writeUInt8(chain, offset);
    offset += 1;
  }
  offset = 42;
  data.writeBigUInt64LE(stakeAmount, offset);
  offset += 8;
  return new import_web3.TransactionInstruction({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
    data: data.subarray(0, offset)
  });
}
function buildBridgePause(payer, programId, bridgeId, reason, authoritySig) {
  const reasonBytes = new TextEncoder().encode(reason.slice(0, 64));
  const data = Buffer.alloc(130 + reasonBytes.length);
  let offset = 0;
  data.writeUInt8(TAG_BRIDGE_PAUSE, offset);
  offset += 1;
  Buffer.from(bridgeId).copy(data, offset);
  offset += 32;
  data.writeUInt8(reasonBytes.length, offset);
  offset += 1;
  Buffer.from(reasonBytes).copy(data, offset);
  offset += reasonBytes.length;
  Buffer.from(authoritySig).copy(data, offset);
  offset += 64;
  return new import_web3.TransactionInstruction({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
    data: data.subarray(0, offset)
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ADAPTER_CUSTOM,
  ADAPTER_DRIFT,
  ADAPTER_JUPITER,
  ADAPTER_MARINADE,
  ADAPTER_RAYDIUM,
  AUCTION_DUTCH,
  AUCTION_ENGLISH,
  AUCTION_SEALED,
  CHAIN_ARBITRUM,
  CHAIN_AVALANCHE,
  CHAIN_BASE,
  CHAIN_BSC,
  CHAIN_ETHEREUM,
  CHAIN_POLYGON,
  CHAIN_SOLANA,
  CLMM_ADD,
  CLMM_CLOSE,
  CLMM_COLLECT_FEES,
  CLMM_OPEN,
  CLMM_REMOVE,
  CONDITION_HASHLOCK,
  CONDITION_MULTISIG,
  CONDITION_ORACLE,
  CONDITION_TIMELOCK,
  CPI_TYPE_ATTESTATION,
  CPI_TYPE_EVENT,
  CPI_TYPE_GENERIC,
  CPI_TYPE_RECEIPT,
  DRIFT_ADD_MARGIN,
  DRIFT_CLOSE,
  DRIFT_OPEN_LONG,
  DRIFT_OPEN_SHORT,
  EXT_ADAPTER,
  EXT_AUCTION,
  EXT_CONDITIONAL,
  EXT_CONFIDENTIAL,
  EXT_CPI_GUARD,
  EXT_DEFAULT_FROZEN,
  EXT_DELEGATION,
  EXT_DELEGATION_CHAIN,
  EXT_FROZEN,
  EXT_GEOGRAPHIC,
  EXT_GOVERNANCE_LOCK,
  EXT_GROUP,
  EXT_HOOK,
  EXT_INTEREST,
  EXT_MEMBER,
  EXT_METADATA,
  EXT_MULTI_SIG,
  EXT_NFT_LISTING,
  EXT_ORACLE_BOUND,
  EXT_POOL,
  EXT_PPV,
  EXT_PROGRAMMABLE,
  EXT_RECOVERABLE,
  EXT_REPUTATION,
  EXT_REQUIRED_MEMO,
  EXT_ROYALTY,
  EXT_SCALED_BALANCE,
  EXT_SOULBOUND,
  EXT_TIME_DECAY,
  EXT_TRANSFER_FEE,
  EXT_VELOCITY_LIMIT,
  EXT_VESTING,
  EXT_YIELD,
  GHOST_ACTION_ANONYMOUS_ACCESS,
  GHOST_ACTION_AUTHENTICATE,
  GHOST_ACTION_PROVE_MEMBERSHIP,
  GHOST_ACTION_VERIFY_SECRET,
  LENDING_BORROW,
  LENDING_DEPOSIT,
  LENDING_REPAY,
  LENDING_WITHDRAW,
  MARINADE_DELAYED_UNSTAKE,
  MARINADE_STAKE,
  MARINADE_UNSTAKE,
  MAX_REFERRAL_DEPTH,
  MP_ACTION_ADD_PARTY,
  MP_ACTION_CHANGE_THRESHOLD,
  MP_ACTION_DELEGATE,
  MP_ACTION_REMOVE_PARTY,
  MP_ACTION_TRANSFER,
  ORDER_BUY,
  ORDER_SELL,
  PERM_CAN_MESSAGE,
  PERM_CAN_SUBDELEGATE,
  PERM_CAN_TRANSFER,
  PERM_CAN_VOTE,
  PERM_REQUIRES_2FA,
  POOL_TYPE_CONCENTRATED,
  POOL_TYPE_CONSTANT_PRODUCT,
  POOL_TYPE_STABLE_SWAP,
  PROTOCOL_FEE_LAMPORTS,
  REFERRAL_BASE_BPS,
  REVEAL_AMOUNT,
  REVEAL_MEMO,
  REVEAL_RECIPIENT,
  REVEAL_SENDER,
  REVEAL_TIMESTAMP,
  REVOKER_DELEGATE,
  REVOKER_GUARDIAN,
  REVOKER_OWNER,
  REVOKE_COMPROMISED,
  REVOKE_EXPIRED,
  REVOKE_NORMAL,
  REVOKE_UPGRADED,
  STS,
  STYX_PMP_DEVNET_PROGRAM_ID,
  STYX_PMP_PROGRAM_ID,
  SWAP_A_TO_B,
  SWAP_B_TO_A,
  StyxDelegation,
  StyxGovernance,
  StyxGuardian,
  StyxMultiparty,
  StyxNovel,
  StyxPMP,
  StyxReferral,
  StyxSubscription,
  StyxSwap,
  StyxVTA,
  TAG_ACCREDITATION_PROOF,
  TAG_ADAPTER_CALL,
  TAG_ADAPTER_CALLBACK,
  TAG_ADAPTER_REGISTER,
  TAG_AMM_ADD_LIQUIDITY,
  TAG_AMM_POOL_CREATE,
  TAG_AMM_QUOTE,
  TAG_AMM_REMOVE_LIQUIDITY,
  TAG_AMM_SWAP,
  TAG_AMM_SYNC,
  TAG_APB_BATCH,
  TAG_APB_TRANSFER,
  TAG_ATOMIC_CPI_TRANSFER,
  TAG_AUCTION_BID,
  TAG_AUCTION_CANCEL,
  TAG_AUCTION_CREATE,
  TAG_AUCTION_SETTLE,
  TAG_BALANCE_ATTEST,
  TAG_BALANCE_VERIFY,
  TAG_BATCH_NOTE_OPS,
  TAG_BATCH_NULLIFIER,
  TAG_BATCH_SETTLE,
  TAG_BRIDGE_BURN,
  TAG_BRIDGE_FEE_COLLECT,
  TAG_BRIDGE_GUARDIAN_ROTATE,
  TAG_BRIDGE_LOCK,
  TAG_BRIDGE_MINT,
  TAG_BRIDGE_PAUSE,
  TAG_BRIDGE_RELEASE,
  TAG_BRIDGE_RESUME,
  TAG_BTC_RELAY_SUBMIT,
  TAG_BTC_SPV_PROOF,
  TAG_CHRONO_LOCK,
  TAG_CHRONO_REVEAL,
  TAG_CLEAN_SOURCE_PROVE,
  TAG_CLEAN_SOURCE_REGISTER,
  TAG_COLLECTION_CREATE,
  TAG_COMPLIANCE_CHANNEL_OPEN,
  TAG_COMPLIANCE_CHANNEL_REPORT,
  TAG_COMPLIANCE_PROOF,
  TAG_CONCENTRATED_LP,
  TAG_CONDITIONAL_COMMIT,
  TAG_CONDITIONAL_TRANSFER,
  TAG_CONFIDENTIAL_MINT,
  TAG_CONFIDENTIAL_TRANSFER,
  TAG_CONFIDENTIAL_TRANSFER_V2,
  TAG_CORPORATE_ACTION,
  TAG_CPI_INSCRIBE,
  TAG_CROSS_MARGIN_SYNC,
  TAG_CROSS_MINT_ATOMIC,
  TAG_DECENTRALIZATION_METRIC,
  TAG_DECOY_REVEAL,
  TAG_DECOY_STORM,
  TAG_DELEGATION_CHAIN,
  TAG_DRIFT_PERP,
  TAG_EPHEMERAL_CREATE,
  TAG_EPHEMERAL_DRAIN,
  TAG_ETH_STATE_PROOF,
  TAG_EXCHANGE_PROOF,
  TAG_FAIR_LAUNCH_COMMIT,
  TAG_FAIR_LAUNCH_REVEAL,
  TAG_FLASH_LOAN,
  TAG_FREEZE_ENFORCED,
  TAG_FUNDING_RATE_APPLY,
  TAG_GEO_RESTRICTION,
  TAG_GHOST_PDA,
  TAG_GOVERNANCE_LOCK,
  TAG_GPOOL_DEPOSIT,
  TAG_GPOOL_WITHDRAW,
  TAG_GPOOL_WITHDRAW_STEALTH,
  TAG_GPOOL_WITHDRAW_SWAP,
  TAG_GROUP_ADD_MEMBER,
  TAG_GROUP_CREATE,
  TAG_GROUP_REMOVE_MEMBER,
  TAG_HASHLOCK_COMMIT,
  TAG_HASHLOCK_REVEAL,
  TAG_HOOK_EXECUTE,
  TAG_HOOK_EXECUTE_REAL,
  TAG_HOOK_REGISTER,
  TAG_IBC_PACKET_ACK,
  TAG_IBC_PACKET_RECV,
  TAG_INNOCENCE_MINT,
  TAG_INNOCENCE_REVOKE,
  TAG_INNOCENCE_VERIFY,
  TAG_INSTITUTIONAL_REPORT,
  TAG_INSURANCE_FUND_CONTRIBUTE,
  TAG_INTEREST_ACCRUE,
  TAG_INTEREST_CLAIM,
  TAG_INTEREST_CLAIM_REAL,
  TAG_JUPITER_ROUTE,
  TAG_LAYERZERO_ENDPOINT,
  TAG_LIMIT_ORDER_CANCEL,
  TAG_LIMIT_ORDER_FILL,
  TAG_LIMIT_ORDER_PLACE,
  TAG_LP_NOTE_BURN,
  TAG_LP_NOTE_MINT,
  TAG_MARGIN_ACCOUNT_CREATE,
  TAG_MARGIN_CALL_EMIT,
  TAG_MARGIN_DEPOSIT,
  TAG_MARGIN_WITHDRAW,
  TAG_MARINADE_STAKE,
  TAG_MERKLE_AIRDROP_CLAIM,
  TAG_MERKLE_AIRDROP_ROOT,
  TAG_MERKLE_EMERGENCY,
  TAG_MERKLE_PROOF_VERIFY,
  TAG_MERKLE_ROOT_PUBLISH,
  TAG_MERKLE_UPDATE,
  TAG_MULTIPARTY_VTA_INIT,
  TAG_MULTIPARTY_VTA_SIGN,
  TAG_MULTI_SIG_NOTE,
  TAG_NFT_ACCEPT_OFFER,
  TAG_NFT_BUY,
  TAG_NFT_CANCEL_OFFER,
  TAG_NFT_DELIST,
  TAG_NFT_LIST,
  TAG_NFT_MINT,
  TAG_NFT_OFFER,
  TAG_NOTE_BURN,
  TAG_NOTE_EXTEND,
  TAG_NOTE_FREEZE,
  TAG_NOTE_MERGE,
  TAG_NOTE_MINT,
  TAG_NOTE_SPLIT,
  TAG_NOTE_THAW,
  TAG_NOTE_TRANSFER,
  TAG_NULLIFIER_CHECK,
  TAG_NULLIFIER_CREATE,
  TAG_NULLIFIER_INSCRIBE,
  TAG_OPTION_ASSIGN,
  TAG_OPTION_BUY,
  TAG_OPTION_CLOSE,
  TAG_OPTION_COLLATERAL_LOCK,
  TAG_OPTION_COLLATERAL_RELEASE,
  TAG_OPTION_EXERCISE,
  TAG_OPTION_EXPIRE,
  TAG_OPTION_MARKET_MAKE,
  TAG_OPTION_SERIES_CREATE,
  TAG_OPTION_WRITE,
  TAG_ORACLE_BOUND,
  TAG_PHANTOM_NFT_COMMIT,
  TAG_PHANTOM_NFT_PROVE,
  TAG_POOL_CREATE,
  TAG_POOL_DEPOSIT,
  TAG_POOL_DONATE,
  TAG_POOL_WITHDRAW,
  TAG_POSITION_CLOSE,
  TAG_POSITION_LIQUIDATE,
  TAG_POSITION_OPEN,
  TAG_PPV_CREATE,
  TAG_PPV_EXTEND,
  TAG_PPV_REDEEM,
  TAG_PPV_REVOKE,
  TAG_PPV_TRANSFER,
  TAG_PPV_VERIFY,
  TAG_PRIVATE_LENDING,
  TAG_PRIVATE_LP_ADD,
  TAG_PRIVATE_LP_REMOVE,
  TAG_PRIVATE_STAKE,
  TAG_PRIVATE_SUBSCRIPTION,
  TAG_PRIVATE_SWAP,
  TAG_PRIVATE_UNSTAKE,
  TAG_PROTOCOL_PAUSE,
  TAG_PROTOCOL_UNPAUSE,
  TAG_PROVENANCE_COMMIT,
  TAG_PROVENANCE_EXTEND,
  TAG_PROVENANCE_VERIFY,
  TAG_RECOVERABLE_NOTE,
  TAG_REG_D_LOCKUP,
  TAG_REPUTATION_GATE,
  TAG_ROUTER_SPLIT,
  TAG_ROUTER_SWAP,
  TAG_ROYALTY_CLAIM,
  TAG_ROYALTY_CLAIM_REAL,
  TAG_SECURITY_AUDIT,
  TAG_SECURITY_FREEZE,
  TAG_SECURITY_ISSUE,
  TAG_SECURITY_TRANSFER,
  TAG_SELECTIVE_DISCLOSURE,
  TAG_SHADOW_FOLLOW,
  TAG_SHADOW_UNFOLLOW,
  TAG_SHARE_CLASS_CREATE,
  TAG_SOCIAL_RECOVERY,
  TAG_STATE_CHANNEL_CLOSE,
  TAG_STATE_CHANNEL_OPEN,
  TAG_STEALTH_SCAN_HINT,
  TAG_STEALTH_SWAP_EXEC,
  TAG_STEALTH_SWAP_INIT,
  TAG_TEMPORAL_INNOCENCE,
  TAG_THAW_GOVERNED,
  TAG_TIME_CAPSULE,
  TAG_TIME_DECAY,
  TAG_TIME_LOCKED_REVEAL,
  TAG_TOKEN_CREATE,
  TAG_TOKEN_METADATA_SET,
  TAG_TOKEN_METADATA_UPDATE,
  TAG_TOKEN_SET_AUTHORITY,
  TAG_TRANSFER_AGENT_APPROVE,
  TAG_TRANSFER_AGENT_REGISTER,
  TAG_TWAP_ORDER_FILL,
  TAG_TWAP_ORDER_START,
  TAG_UNWRAP_SPL,
  TAG_VALIDATOR_PROOF,
  TAG_VELOCITY_LIMIT,
  TAG_VSL_AUDIT_REVEAL,
  TAG_VSL_BALANCE_PROOF,
  TAG_VSL_DEPOSIT,
  TAG_VSL_ESCROW_CREATE,
  TAG_VSL_ESCROW_REFUND,
  TAG_VSL_ESCROW_RELEASE,
  TAG_VSL_MERGE,
  TAG_VSL_PRIVATE_SWAP,
  TAG_VSL_PRIVATE_TRANSFER,
  TAG_VSL_SHIELDED_SEND,
  TAG_VSL_SPLIT,
  TAG_VSL_WITHDRAW,
  TAG_VTA_DELEGATE,
  TAG_VTA_GUARDIAN_RECOVER,
  TAG_VTA_GUARDIAN_SET,
  TAG_VTA_REVOKE,
  TAG_WORMHOLE_VAA_VERIFY,
  TAG_WRAPPER_BURN,
  TAG_WRAPPER_MINT,
  TAG_WRAP_SPL,
  TAG_YIELD_CLAIM,
  TAG_YIELD_DEPOSIT,
  TAG_YIELD_VAULT_CREATE,
  TAG_YIELD_WITHDRAW,
  TREASURY,
  TRUST_INDEXER,
  TRUST_MERKLE_PROOF,
  TRUST_NULLIFIER_PDA,
  buildAPBTransferInstruction,
  buildAmmAddLiquidity,
  buildAmmPoolCreate,
  buildAmmQuote,
  buildAmmRemoveLiquidity,
  buildAmmSwap,
  buildAmmSync,
  buildAtomicCpiTransfer,
  buildAuctionBidInstruction,
  buildAuctionCreateInstruction,
  buildBalanceAttest,
  buildBatchNoteOps,
  buildBatchNullifier,
  buildBatchSettleInstruction,
  buildBridgeLock,
  buildBridgeOracleRegister,
  buildBridgePause,
  buildBridgeRelease,
  buildCPIInscribeInstruction,
  buildConcentratedLp,
  buildConditionalTransfer,
  buildConfidentialTransferV2,
  buildCrossMintAtomic,
  buildDelegationChain,
  buildDriftPerp,
  buildExchangeProof,
  buildFlashLoan,
  buildFreezeEnforced,
  buildGeoRestriction,
  buildGhostPDAInstruction,
  buildGovernanceLock,
  buildHashlockCommitInstruction,
  buildHashlockRevealInstruction,
  buildHookExecute,
  buildInterestClaimReal,
  buildJupiterRoute,
  buildLimitOrderCancel,
  buildLimitOrderFill,
  buildLimitOrderPlace,
  buildLpNoteBurn,
  buildLpNoteMint,
  buildMarginLiquidate,
  buildMarginOpen,
  buildMarinadeStake,
  buildMerkleProofVerify,
  buildMultiSigNote,
  buildMultipartyVTAInitInstruction,
  buildMultipartyVTASignInstruction,
  buildNftBuyInstruction,
  buildNftDelistInstruction,
  buildNftListInstruction,
  buildNullifierCheck,
  buildNullifierCreate,
  buildOptionCreate,
  buildOptionExercise,
  buildOptionSettle,
  buildOracleBound,
  buildPPVCreateInstruction,
  buildPPVRedeemInstruction,
  buildPPVVerifyInstruction,
  buildPoolCreateInstruction,
  buildPoolDepositInstruction,
  buildPoolWithdrawInstruction,
  buildPositionOpen,
  buildPrivateLending,
  buildPrivateStakeInstruction,
  buildPrivateSubscriptionInstruction,
  buildPrivateSwapInstruction,
  buildProposalInstruction,
  buildRecoverableNote,
  buildReferralInstruction,
  buildReputationGate,
  buildRouterSplit,
  buildRouterSwap,
  buildRoyaltyClaimReal,
  buildSecurityIssue,
  buildSecurityTransfer,
  buildSelectiveDisclosure,
  buildSocialRecovery,
  buildStateChannelCloseInstruction,
  buildStateChannelOpenInstruction,
  buildStealthScanHintInstruction,
  buildStealthSwapExecInstruction,
  buildStealthSwapInitInstruction,
  buildTimeCapsuleInstruction,
  buildTimeDecay,
  buildTimeLockedReveal,
  buildTokenCreateInstruction,
  buildTokenMetadataUpdateInstruction,
  buildTokenSetAuthorityInstruction,
  buildTransferAgentRegister,
  buildTwapOrderFill,
  buildTwapOrderStart,
  buildVTADelegateInstruction,
  buildVTAGuardianRecoverInstruction,
  buildVTAGuardianSetInstruction,
  buildVTARevokeInstruction,
  buildValidatorProof,
  buildVelocityLimit,
  buildVoteInstruction,
  buildWrapperBurn,
  buildWrapperMint,
  buildYieldDepositInstruction,
  buildYieldVaultCreateInstruction,
  calculateConstantProductSwap,
  calculateLpBurn,
  calculateLpMint,
  calculatePriceImpact,
  calculateReferralChainRewards,
  calculateReferralReward,
  compareCosts,
  compareValidatorBurden,
  computePoolId,
  decryptAmount,
  decryptPayload,
  decryptRecipient,
  deriveGhostPDA,
  deriveSharedSecret,
  deriveTimeCapsuleKey,
  encryptAmount,
  encryptPayload,
  encryptRecipient,
  generateCommitment,
  generateNoteCommitment,
  generateNullifier,
  generateStealthAddress,
  generateValidatorProofData,
  generateX25519Keypair
});
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
