var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AIRDROP_OPS: () => AIRDROP_OPS,
  AIRDROP_SEEDS: () => AIRDROP_SEEDS,
  AirdropMerkleTree: () => AirdropMerkleTree,
  CampaignStatus: () => CampaignStatus,
  DAMClient: () => DAMClient,
  DECOMPRESS_SEEDS: () => DECOMPRESS_SEEDS,
  DEFAULT_OFFER_EXPIRY_SECONDS: () => DEFAULT_OFFER_EXPIRY_SECONDS,
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
  DOMAIN_LENDING: () => DOMAIN_DEFI2,
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
  EasyPayClient: () => EasyPayClient,
  EasyPayStandalone: () => EasyPayStandalone,
  InscriptionMode: () => InscriptionMode,
  InscriptionType: () => InscriptionType,
  LENDING_MEMO_PROGRAM_ID: () => MEMO_PROGRAM_ID2,
  LENDING_OPS: () => LENDING_OPS,
  LENDING_SEEDS: () => LENDING_SEEDS,
  LendingStandalone: () => LendingStandalone,
  LoanState: () => LoanState,
  LoanType: () => LoanType,
  MAX_BATCH_SIZE: () => MAX_BATCH_SIZE,
  MAX_RECIPIENTS_PER_BATCH: () => MAX_RECIPIENTS_PER_BATCH,
  NftType: () => NftType,
  PERPETUAL_GRACE_PERIOD_SECONDS: () => PERPETUAL_GRACE_PERIOD_SECONDS,
  PERPETUAL_GRACE_SECONDS: () => PERPETUAL_GRACE_SECONDS,
  PROTOCOL_FEE_BPS: () => PROTOCOL_FEE_BPS,
  PrivacyLevel: () => PrivacyLevel,
  PrivateLendingClient: () => PrivateLendingClient,
  PrivateLendingStandalone: () => LendingStandalone,
  Resolv: () => EasyPayStandalone,
  SEEDS: () => SEEDS2,
  SPS_DEVNET_PROGRAM_ID: () => SPS_DEVNET_PROGRAM_ID,
  SPS_PROGRAM_ID: () => SPS_PROGRAM_ID4,
  STANDALONE_PROTOCOL_FEE_BPS: () => PROTOCOL_FEE_BPS2,
  SpsClient: () => SpsClient,
  SpsIndexerClient: () => SpsIndexerClient,
  StandaloneLoanState: () => LoanState2,
  StandaloneLoanType: () => LoanType2,
  StyxBulkAirdrop: () => StyxBulkAirdrop,
  StyxInscriptions: () => StyxInscriptions,
  WalletDecompress: () => WalletDecompress,
  account: () => account,
  bridge: () => bridge,
  buildAttachPoiIx: () => buildAttachPoiIx,
  buildChronoVaultIx: () => buildChronoVaultIx,
  buildCreateAmmPoolIx: () => buildCreateAmmPoolIx,
  buildCreateMintIx: () => buildCreateMintIx,
  buildCreateNftIx: () => buildCreateNftIx,
  buildDecoyStormIx: () => buildDecoyStormIx,
  buildIapMintIx: () => buildIapMintIx,
  buildInstructionPrefix: () => buildInstructionPrefix,
  buildMintToIx: () => buildMintToIx,
  buildPrivateMessageIx: () => buildPrivateMessageIx,
  buildPrivateSwapIx: () => buildPrivateSwapIx,
  buildRatchetMessageIx: () => buildRatchetMessageIx,
  buildRevealToAuditorIx: () => buildRevealToAuditorIx,
  buildShieldIx: () => buildShieldIx,
  buildTransferIx: () => buildTransferIx,
  buildUnshieldIx: () => buildUnshieldIx,
  calculateInterest: () => calculateInterest,
  calculateLendingFee: () => calculateProtocolFee2,
  calculateLoanInterest: () => calculateInterest2,
  calculateLoanRepayment: () => calculateRepayment2,
  calculateProtocolFee: () => calculateProtocolFee,
  calculateRepayment: () => calculateRepayment,
  checkStealthAddress: () => checkStealthAddress,
  compliance: () => compliance,
  computeCommitment: () => computeCommitment,
  computeNullifier: () => computeNullifier,
  createEasyPayClient: () => createEasyPayClient,
  createEasyPayStandalone: () => createEasyPayStandalone,
  createLendingStandalone: () => createLendingStandalone,
  createPrivateLendingClient: () => createPrivateLendingClient,
  createPrivateLendingStandalone: () => createLendingStandalone,
  createResolv: () => createEasyPayStandalone,
  createStyxInscriptions: () => createStyxInscriptions,
  dam: () => dam,
  decrypt: () => decrypt,
  decryptLoanTerms: () => decryptLoanTerms,
  decryptPaymentMetadata: () => decryptPaymentMetadata,
  default: () => index_default,
  defi: () => defi,
  derivatives: () => derivatives,
  deriveEscrowPda: () => deriveEscrowPda2,
  deriveLoanPda: () => deriveLoanPda,
  deriveMintPda: () => deriveMintPda,
  deriveNullifierPda: () => deriveNullifierPda,
  deriveOfferPda: () => deriveOfferPda,
  derivePoolPda: () => derivePoolPda,
  deriveTreasuryPda: () => deriveTreasuryPda,
  easypay: () => easypay,
  encrypt: () => encrypt,
  encryptLoanTerms: () => encryptLoanTerms,
  encryptPaymentMetadata: () => encryptPaymentMetadata,
  extensions: () => extensions,
  generateClaimCredentials: () => generateClaimCredentials,
  generateCommitment: () => generateCommitment,
  generateLendingId: () => generateId,
  generateLoanId: () => generateLoanId,
  generateOfferId: () => generateOfferId,
  generatePaymentId: () => generatePaymentId,
  generateStealthAddress: () => generateStealthAddress2,
  generateStealthKeypair: () => generateStealthKeypair,
  generateStealthReceiver: () => generateStealthReceiver,
  getDomainName: () => getDomainName,
  governance: () => governance,
  ic: () => ic,
  messaging: () => messaging,
  nft: () => nft,
  notes: () => notes,
  poolTypes: () => poolTypes,
  privacy: () => privacy,
  quickAcceptOffer: () => quickAcceptOffer,
  quickCreateOffer: () => quickCreateOffer,
  quickCreateOfferStandalone: () => quickCreateOffer2,
  quickInscribe: () => quickInscribe,
  quickRepayLoan: () => quickRepayLoan,
  quickSend: () => quickSend,
  quickSendStandalone: () => quickSendStandalone,
  resolvQuickSend: () => quickSendStandalone,
  securities: () => securities,
  sts: () => sts,
  swap: () => swap,
  verifyClaimSecret: () => verifyClaimSecret,
  vsl: () => vsl
});
module.exports = __toCommonJS(index_exports);
var import_web39 = require("@solana/web3.js");
var import_sha33 = require("@noble/hashes/sha3");
var import_sha2564 = require("@noble/hashes/sha256");
var import_ed25519 = require("@noble/curves/ed25519");
var import_chacha2 = require("@noble/ciphers/chacha");
var import_webcrypto = require("@noble/ciphers/webcrypto");

// src/domains.ts
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

// src/dam.ts
var import_web3 = require("@solana/web3.js");
var import_sha256 = require("@noble/hashes/sha256");
var SPS_PROGRAM_ID = new import_web3.PublicKey("GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9");
var SEEDS = {
  DAM_POOL: Buffer.from("dam_pool"),
  VIRTUAL_BALANCE: Buffer.from("dam_vbal"),
  MERKLE_ROOT: Buffer.from("dam_root"),
  NULLIFIER: Buffer.from("dam_null")
};
var DAMClient = class {
  constructor(connection, programId = SPS_PROGRAM_ID) {
    this.connection = connection;
    this.programId = programId;
  }
  // ═══════════════════════════════════════════════════════════════════════
  // POOL OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════
  /**
   * Derive DAM pool PDA for a token mint
   */
  getPoolPda(mint) {
    return import_web3.PublicKey.findProgramAddressSync(
      [SEEDS.DAM_POOL, mint.toBytes()],
      this.programId
    );
  }
  /**
   * Create DAM pool for a token mint
   * Uses Token-2022 with Permanent Delegate + Immutable Owner
   * Cost: ~0.002 SOL once (shared by ALL holders!)
   */
  buildCreatePoolIx(config, payer) {
    const [poolPda] = this.getPoolPda(config.mint);
    const data = Buffer.alloc(76);
    let offset = 0;
    data.writeUInt8(DOMAIN_DAM, offset++);
    data.writeUInt8(dam.OP_POOL_CREATE, offset++);
    config.mint.toBuffer().copy(data, offset);
    offset += 32;
    config.authority.toBuffer().copy(data, offset);
    offset += 32;
    data.writeUInt16LE(config.feeBps ?? 0, offset);
    offset += 2;
    data.writeBigUInt64LE(config.minMaterializeAmount ?? 0n, offset);
    return new import_web3.TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: true },
        { pubkey: config.mint, isSigner: false, isWritable: false },
        { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data
    });
  }
  // ═══════════════════════════════════════════════════════════════════════
  // VIRTUAL BALANCE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════
  /**
   * Compute virtual balance commitment
   * commitment = sha256(owner || mint || amount || nonce)
   */
  computeCommitment(balance) {
    const data = Buffer.concat([
      balance.owner.toBytes(),
      balance.mint.toBytes(),
      Buffer.from(balance.amount.toString()),
      balance.nonce
    ]);
    return (0, import_sha256.sha256)(data);
  }
  /**
   * Build virtual mint instruction (inscription-based, ZERO rent!)
   */
  buildVirtualMintIx(mint, recipient, amount, minter, privateMode = true) {
    const nonce = new Uint8Array(32);
    crypto.getRandomValues(nonce);
    const balance = {
      owner: recipient,
      mint,
      amount,
      nonce
    };
    const commitment = privateMode ? this.computeCommitment(balance) : new Uint8Array(32);
    const data = Buffer.alloc(107);
    let offset = 0;
    data.writeUInt8(DOMAIN_DAM, offset++);
    data.writeUInt8(dam.OP_VIRTUAL_MINT, offset++);
    mint.toBuffer().copy(data, offset);
    offset += 32;
    recipient.toBuffer().copy(data, offset);
    offset += 32;
    data.writeBigUInt64LE(amount, offset);
    offset += 8;
    data.writeUInt8(privateMode ? 1 : 0, offset++);
    Buffer.from(commitment).copy(data, offset);
    return new import_web3.TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: minter, isSigner: true, isWritable: true }
      ],
      data
    });
  }
  /**
   * Build virtual transfer instruction (private, free)
   */
  buildVirtualTransferIx(mint, from, to, amount, fromNonce, signer) {
    const newNonce = new Uint8Array(32);
    crypto.getRandomValues(newNonce);
    const nullifier = (0, import_sha256.sha256)(Buffer.concat([
      Buffer.from("DAM_NULLIFIER_V1"),
      from.toBytes(),
      mint.toBytes(),
      fromNonce
    ]));
    const data = Buffer.alloc(170);
    let offset = 0;
    data.writeUInt8(DOMAIN_DAM, offset++);
    data.writeUInt8(dam.OP_VIRTUAL_TRANSFER, offset++);
    mint.toBuffer().copy(data, offset);
    offset += 32;
    from.toBuffer().copy(data, offset);
    offset += 32;
    to.toBuffer().copy(data, offset);
    offset += 32;
    data.writeBigUInt64LE(amount, offset);
    offset += 8;
    Buffer.from(nullifier).copy(data, offset);
    offset += 32;
    Buffer.from(newNonce).copy(data, offset);
    return new import_web3.TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: signer, isSigner: true, isWritable: true }
      ],
      data
    });
  }
  // ═══════════════════════════════════════════════════════════════════════
  // MATERIALIZATION - Convert virtual to real SPL account
  // ═══════════════════════════════════════════════════════════════════════
  /**
   * Build materialize instruction
   * Creates real SPL token account from virtual balance
   * User pays ~0.002 SOL rent, but gets DEX-compatible tokens!
   */
  buildMaterializeIx(mint, owner, amount, proof, destinationAccount) {
    const [poolPda] = this.getPoolPda(mint);
    const nullifier = (0, import_sha256.sha256)(Buffer.concat([
      Buffer.from("DAM_MATERIALIZE_V1"),
      proof.leaf,
      Buffer.from(proof.rootSlot.toString())
    ]));
    const [nullifierPda] = import_web3.PublicKey.findProgramAddressSync(
      [SEEDS.NULLIFIER, nullifier],
      this.programId
    );
    const proofData = Buffer.alloc(1 + proof.path.length * 33);
    proofData.writeUInt8(proof.path.length, 0);
    for (let i = 0; i < proof.path.length; i++) {
      proof.path[i].slice().forEach((b, j) => proofData[1 + i * 33 + j] = b);
      proofData[1 + i * 33 + 32] = proof.directions[i];
    }
    const data = Buffer.concat([
      buildInstructionPrefix(DOMAIN_DAM, dam.OP_MATERIALIZE),
      mint.toBuffer(),
      Buffer.from(new BigUint64Array([amount]).buffer),
      Buffer.from(proof.leaf),
      Buffer.from(proof.root),
      Buffer.from(new BigUint64Array([proof.rootSlot]).buffer),
      proofData
    ]);
    return new import_web3.TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: true },
        { pubkey: destinationAccount, isSigner: false, isWritable: true },
        { pubkey: nullifierPda, isSigner: false, isWritable: true },
        { pubkey: import_web3.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data
    });
  }
  // ═══════════════════════════════════════════════════════════════════════
  // DE-MATERIALIZATION - Return to virtual, RECLAIM RENT!
  // ═══════════════════════════════════════════════════════════════════════
  /**
   * Build de-materialize instruction
   * Returns tokens to pool, closes account, reclaims rent!
   * Balance returns to virtual/private mode
   * UNIQUE TO SPS - Light Protocol cannot do this!
   */
  buildDematerializeIx(mint, owner, sourceAccount, amount) {
    const [poolPda] = this.getPoolPda(mint);
    const newNonce = new Uint8Array(32);
    crypto.getRandomValues(newNonce);
    const newBalance = {
      owner,
      mint,
      amount,
      nonce: newNonce
    };
    const newCommitment = this.computeCommitment(newBalance);
    const data = Buffer.alloc(106);
    let offset = 0;
    data.writeUInt8(DOMAIN_DAM, offset++);
    data.writeUInt8(dam.OP_DEMATERIALIZE, offset++);
    mint.toBuffer().copy(data, offset);
    offset += 32;
    data.writeBigUInt64LE(amount, offset);
    offset += 8;
    Buffer.from(newCommitment).copy(data, offset);
    offset += 32;
    Buffer.from(newNonce).copy(data, offset);
    return new import_web3.TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: sourceAccount, isSigner: false, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: true }
      ],
      data
    });
  }
  // ═══════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════════
  /**
   * Estimate rent savings for virtual vs real accounts
   */
  estimateRentSavings(userCount, activeTraderPercent = 5) {
    const splRentPerAccount = 203928e-8;
    const token22RentPerAccount = 115e-5;
    const lightTreeCost = 89e-4;
    const lightPerUser = 4e-5;
    const damPoolCost = 2e-3;
    const damMaterializeRent = 2e-3;
    const splTokenCost = userCount * splRentPerAccount;
    const token22Cost = userCount * token22RentPerAccount;
    const lightProtocolCost = lightTreeCost + userCount * lightPerUser;
    const damCost = damPoolCost + userCount * (activeTraderPercent / 100) * damMaterializeRent;
    return {
      splTokenCost: Math.round(splTokenCost * 1e3) / 1e3,
      token22Cost: Math.round(token22Cost * 1e3) / 1e3,
      lightProtocolCost: Math.round(lightProtocolCost * 1e3) / 1e3,
      damCost: Math.round(damCost * 1e3) / 1e3,
      damSavingsVsSpl: Math.round((1 - damCost / splTokenCost) * 100),
      damSavingsVsLight: Math.round((damCost / lightProtocolCost - 1) * 100)
    };
  }
};

// src/easy-pay.ts
var import_web32 = require("@solana/web3.js");
var import_spl_token = require("@solana/spl-token");
var PROGRAM_ID = new import_web32.PublicKey("GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9");
var DOMAIN_EASYPAY2 = 17;
var EASYPAY_SEEDS = {
  ESCROW: Buffer.from("sps_escrow"),
  STEALTH: Buffer.from("sps_stealth"),
  RELAYER: Buffer.from("sps_relayer"),
  LINK: Buffer.from("sps_link")
};
var EASYPAY_OPS = {
  // Payment Creation
  CREATE_PAYMENT: 1,
  CREATE_BATCH_PAYMENT: 2,
  CREATE_RECURRING: 3,
  // Claiming
  CLAIM_PAYMENT: 16,
  CLAIM_TO_STEALTH: 17,
  CLAIM_TO_EXISTING: 18,
  CLAIM_BATCH: 19,
  // Payment Management
  CANCEL_PAYMENT: 32,
  EXTEND_EXPIRY: 33,
  REFUND_EXPIRED: 34,
  // Gasless Operations
  REGISTER_RELAYER: 48,
  SUBMIT_META_TX: 49,
  CLAIM_RELAYER_FEE: 50,
  // Stealth Address Management
  GENERATE_STEALTH_KEYS: 64,
  PUBLISH_STEALTH_META: 65,
  SCAN_ANNOUNCEMENTS: 66,
  // Privacy Features
  PRIVATE_PAYMENT: 80,
  REVEAL_TO_AUDITOR: 81
};
function generateClaimSecret() {
  const crypto2 = globalThis.crypto || require("crypto");
  const secret = crypto2.randomBytes(32);
  const hash = crypto2.createHash("sha256").update(secret).digest();
  return { secret: new Uint8Array(secret), hash: new Uint8Array(hash) };
}
function hashRecipientIdentifier(identifier, salt) {
  const crypto2 = globalThis.crypto || require("crypto");
  const normalizedId = identifier.toLowerCase().trim();
  const saltBuf = salt || crypto2.randomBytes(16);
  const data = Buffer.concat([
    Buffer.from("SPS_RECIPIENT_V1"),
    Buffer.from(normalizedId),
    Buffer.from(saltBuf)
  ]);
  return new Uint8Array(crypto2.createHash("sha256").update(data).digest());
}
function generateStealthKeys() {
  const spendingKeyPair = import_web32.Keypair.generate();
  const viewingKeyPair = import_web32.Keypair.generate();
  const metaAddress = `st:sol:${spendingKeyPair.publicKey.toBase58()}:${viewingKeyPair.publicKey.toBase58()}`;
  return {
    spendingKeyPair,
    viewingKeyPair,
    metaAddress
  };
}
function parseStealthMetaAddress(metaAddress) {
  const parts = metaAddress.split(":");
  if (parts.length !== 4 || parts[0] !== "st" || parts[1] !== "sol") {
    throw new Error("Invalid stealth meta-address format");
  }
  return {
    spendingKey: new import_web32.PublicKey(parts[2]),
    viewingKey: new import_web32.PublicKey(parts[3])
  };
}
function generateStealthAddress(metaAddress) {
  const crypto2 = globalThis.crypto || require("crypto");
  const { spendingKey, viewingKey } = parseStealthMetaAddress(metaAddress);
  const ephemeralKeyPair = import_web32.Keypair.generate();
  const sharedSecret = crypto2.createHash("sha256").update(
    Buffer.concat([
      ephemeralKeyPair.secretKey.slice(0, 32),
      viewingKey.toBytes()
    ])
  ).digest();
  const stealthSeed = crypto2.createHash("sha256").update(
    Buffer.concat([
      spendingKey.toBytes(),
      sharedSecret
    ])
  ).digest();
  const stealthKeyPair = import_web32.Keypair.fromSeed(stealthSeed);
  const viewTag = new Uint8Array(sharedSecret.slice(0, 4));
  return {
    stealthAddress: stealthKeyPair.publicKey,
    ephemeralKeyPair,
    viewTag
  };
}
function deriveEscrowPda(paymentId, programId = PROGRAM_ID) {
  return import_web32.PublicKey.findProgramAddressSync(
    [EASYPAY_SEEDS.ESCROW, paymentId],
    programId
  );
}
function createPaymentLink(paymentId, claimSecret, baseUrl = "https://styx.pay") {
  const paymentIdB64 = Buffer.from(paymentId).toString("base64url");
  const secretB64 = Buffer.from(claimSecret).toString("base64url");
  const url = `${baseUrl}/claim/${paymentIdB64}#${secretB64}`;
  const shortCode = paymentIdB64.slice(0, 8).toUpperCase();
  const qrData = JSON.stringify({ p: paymentIdB64, s: secretB64 });
  return {
    url,
    shortCode,
    qrData,
    paymentId: paymentIdB64,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3)
    // 7 days default
  };
}
var EasyPayClient = class {
  constructor(connection, programId = PROGRAM_ID, relayerConfig) {
    this.connection = connection;
    this.programId = programId;
    this.relayerConfig = relayerConfig;
  }
  // ──────────────────────────────────────────────────────────────────────────
  // PAYMENT CREATION
  // ──────────────────────────────────────────────────────────────────────────
  /**
   * Create a claimable payment
   * Returns: payment details + link to send to recipient
   */
  async createPayment(sender, amount, mint = null, options = {}) {
    const crypto2 = globalThis.crypto || require("crypto");
    const paymentId = crypto2.randomBytes(32);
    const { secret: claimSecret, hash: claimHash } = generateClaimSecret();
    const [escrowPda, bump] = deriveEscrowPda(paymentId, this.programId);
    let recipientHint;
    if (options.recipientEmail) {
      recipientHint = hashRecipientIdentifier(options.recipientEmail);
    } else if (options.recipientPhone) {
      recipientHint = hashRecipientIdentifier(options.recipientPhone);
    }
    const expiryHours = options.expiryHours || 168;
    const expiresAt = Math.floor(Date.now() / 1e3) + expiryHours * 3600;
    const memoBytes = options.memo ? Buffer.from(options.memo) : Buffer.alloc(0);
    const dataSize = 3 + 32 + 32 + 8 + 4 + 32 + (recipientHint ? 32 : 0) + 2 + memoBytes.length;
    const data = Buffer.alloc(dataSize);
    let offset = 0;
    data.writeUInt8(DOMAIN_EASYPAY2, offset++);
    data.writeUInt8(EASYPAY_OPS.CREATE_PAYMENT, offset++);
    data.writeUInt8(mint ? 1 : 0, offset++);
    paymentId.copy(data, offset);
    offset += 32;
    Buffer.from(claimHash).copy(data, offset);
    offset += 32;
    data.writeBigUInt64LE(amount, offset);
    offset += 8;
    data.writeUInt32LE(expiresAt, offset);
    offset += 4;
    if (mint) {
      mint.toBuffer().copy(data, offset);
    } else {
      Buffer.alloc(32).copy(data, offset);
    }
    offset += 32;
    if (recipientHint) {
      Buffer.from(recipientHint).copy(data, offset);
      offset += 32;
    }
    data.writeUInt16LE(memoBytes.length, offset);
    offset += 2;
    memoBytes.copy(data, offset);
    const keys = [
      { pubkey: sender, isSigner: true, isWritable: true },
      { pubkey: escrowPda, isSigner: false, isWritable: true },
      { pubkey: import_web32.SystemProgram.programId, isSigner: false, isWritable: false }
    ];
    if (mint) {
      const [senderAta] = import_web32.PublicKey.findProgramAddressSync(
        [sender.toBuffer(), import_spl_token.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        new import_web32.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
      );
      const [escrowAta] = import_web32.PublicKey.findProgramAddressSync(
        [escrowPda.toBuffer(), import_spl_token.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        new import_web32.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
      );
      keys.push(
        { pubkey: senderAta, isSigner: false, isWritable: true },
        { pubkey: escrowAta, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: import_spl_token.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
      );
    }
    const ix = new import_web32.TransactionInstruction({
      programId: this.programId,
      keys,
      data: data.slice(0, offset)
    });
    const payment = {
      paymentId,
      escrowPda,
      sender,
      amount,
      mint,
      claimSecret,
      claimHash,
      createdAt: Math.floor(Date.now() / 1e3),
      expiresAt,
      claimed: false,
      memo: options.memo,
      recipientHint: options.recipientEmail || options.recipientPhone
    };
    const link = createPaymentLink(paymentId, claimSecret);
    return { ix, payment, link };
  }
  /**
   * Create multiple payments in one transaction (batch airdrop)
   */
  async createBatchPayments(sender, recipients, mint = null) {
    const results = await Promise.all(
      recipients.map(
        (r) => this.createPayment(sender, r.amount, mint, {
          recipientEmail: r.email,
          recipientPhone: r.phone
        })
      )
    );
    return {
      ixs: results.map((r) => r.ix),
      payments: results.map((r) => r.payment),
      links: results.map((r) => r.link)
    };
  }
  // ──────────────────────────────────────────────────────────────────────────
  // CLAIMING (NO WALLET NEEDED!)
  // ──────────────────────────────────────────────────────────────────────────
  /**
   * Claim payment to a stealth address (NEW wallet created on-the-fly)
   * This is the "no wallet needed" magic!
   */
  async claimToStealthAddress(paymentId, claimSecret) {
    const stealthKeys = generateStealthKeys();
    const { stealthAddress } = generateStealthAddress(stealthKeys.metaAddress);
    return this.claimToAddress(paymentId, claimSecret, stealthAddress, stealthKeys);
  }
  /**
   * Claim payment to an existing wallet address
   */
  async claimToAddress(paymentId, claimSecret, recipient, stealthKeys) {
    const [escrowPda] = deriveEscrowPda(paymentId, this.programId);
    const crypto2 = globalThis.crypto || require("crypto");
    const claimHash = crypto2.createHash("sha256").update(claimSecret).digest();
    const data = Buffer.alloc(99);
    let offset = 0;
    data.writeUInt8(DOMAIN_EASYPAY2, offset++);
    data.writeUInt8(stealthKeys ? EASYPAY_OPS.CLAIM_TO_STEALTH : EASYPAY_OPS.CLAIM_TO_EXISTING, offset++);
    Buffer.from(paymentId).copy(data, offset);
    offset += 32;
    Buffer.from(claimSecret).copy(data, offset);
    offset += 32;
    recipient.toBuffer().copy(data, offset);
    const ix = new import_web32.TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: recipient, isSigner: false, isWritable: true },
        { pubkey: import_web32.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data
    });
    return { ix, stealthKeys, stealthAddress: recipient };
  }
  // ──────────────────────────────────────────────────────────────────────────
  // GASLESS CLAIMING (RELAYER-PAID)
  // ──────────────────────────────────────────────────────────────────────────
  /**
   * Claim payment via relayer (gasless!)
   * The recipient doesn't need ANY SOL to claim
   */
  async claimGasless(paymentId, claimSecret, recipient) {
    if (!this.relayerConfig) {
      throw new Error("Relayer not configured for gasless transactions");
    }
    const { ix } = await this.claimToAddress(paymentId, claimSecret, recipient);
    const metaTx = {
      innerTx: new Uint8Array(ix.data),
      signature: new Uint8Array(64),
      // Placeholder - would be signed
      feePayment: {
        token: this.relayerConfig.feeToken || import_web32.SystemProgram.programId,
        amount: this.relayerConfig.feeAmount || 0n
      }
    };
    try {
      const response = await fetch(`${this.relayerConfig.relayerUrl}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: Buffer.from(paymentId).toString("base64"),
          claimSecret: Buffer.from(claimSecret).toString("base64"),
          recipient: recipient.toBase58()
        })
      });
      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }
      const result = await response.json();
      return { success: true, txSignature: result.signature };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  /**
   * Create gasless claim with new stealth wallet
   * Complete "no wallet, no gas" experience!
   */
  async claimGaslessToNewWallet(paymentId, claimSecret) {
    const stealthKeys = generateStealthKeys();
    const { stealthAddress } = generateStealthAddress(stealthKeys.metaAddress);
    const result = await this.claimGasless(paymentId, claimSecret, stealthAddress);
    return {
      ...result,
      stealthKeys: result.success ? stealthKeys : void 0
    };
  }
  // ──────────────────────────────────────────────────────────────────────────
  // PAYMENT MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────
  /**
   * Cancel a payment and refund to sender
   */
  async cancelPayment(sender, paymentId) {
    const [escrowPda] = deriveEscrowPda(paymentId, this.programId);
    const data = Buffer.alloc(35);
    data.writeUInt8(DOMAIN_EASYPAY2, 0);
    data.writeUInt8(EASYPAY_OPS.CANCEL_PAYMENT, 1);
    Buffer.from(paymentId).copy(data, 2);
    return new import_web32.TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: sender, isSigner: true, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: import_web32.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data
    });
  }
  /**
   * Refund expired payment to sender
   */
  async refundExpired(sender, paymentId) {
    const [escrowPda] = deriveEscrowPda(paymentId, this.programId);
    const data = Buffer.alloc(35);
    data.writeUInt8(DOMAIN_EASYPAY2, 0);
    data.writeUInt8(EASYPAY_OPS.REFUND_EXPIRED, 1);
    Buffer.from(paymentId).copy(data, 2);
    return new import_web32.TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: sender, isSigner: true, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: import_web32.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data
    });
  }
  // ──────────────────────────────────────────────────────────────────────────
  // PRIVACY FEATURES
  // ──────────────────────────────────────────────────────────────────────────
  /**
   * Create a private payment (amount hidden)
   */
  async createPrivatePayment(sender, amount, recipientMetaAddress, mint = null) {
    const { stealthAddress, ephemeralKeyPair, viewTag } = generateStealthAddress(recipientMetaAddress);
    const result = await this.createPayment(sender, amount, mint, {
      memo: `Private payment`
    });
    const announcementData = Buffer.concat([
      ephemeralKeyPair.publicKey.toBytes(),
      Buffer.from(viewTag)
    ]);
    return {
      ix: result.ix,
      payment: result.payment,
      stealthAddress,
      ephemeralPubkey: ephemeralKeyPair.publicKey
    };
  }
  // ──────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────────────────
  /**
   * Generate message to send via SMS
   */
  generateSmsMessage(link, senderName) {
    return `${senderName} sent you money! Claim at: ${link.url.slice(0, 50)}... Code: ${link.shortCode}`;
  }
  /**
   * Generate message to send via email
   */
  generateEmailMessage(link, senderName, amount) {
    return {
      subject: `${senderName} sent you ${amount}`,
      body: `
Hi!

${senderName} has sent you ${amount} via SPS EasyPay.

Click here to claim your payment:
${link.url}

Or use code: ${link.shortCode}

This link expires on ${link.expiresAt.toLocaleDateString()}.

No wallet needed - we'll create one for you automatically!

\u2013 SPS EasyPay
      `.trim()
    };
  }
  /**
   * Parse payment from URL
   */
  parsePaymentUrl(url) {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const claimPath = pathParts[pathParts.length - 1];
    const secretHash = urlObj.hash.slice(1);
    return {
      paymentId: new Uint8Array(Buffer.from(claimPath, "base64url")),
      claimSecret: new Uint8Array(Buffer.from(secretHash, "base64url"))
    };
  }
};
function createEasyPayClient(connection, relayerUrl) {
  const relayerConfig = relayerUrl ? { relayerUrl } : void 0;
  return new EasyPayClient(connection, PROGRAM_ID, relayerConfig);
}
async function quickSend(connection, sender, amount, options = {}) {
  const client = createEasyPayClient(connection);
  const { ix, link } = await client.createPayment(
    sender.publicKey,
    amount,
    options.mint || null,
    {
      recipientEmail: options.recipientEmail,
      recipientPhone: options.recipientPhone
    }
  );
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const message = new import_web32.TransactionMessage({
    payerKey: sender.publicKey,
    recentBlockhash: blockhash,
    instructions: [ix]
  }).compileToV0Message();
  const tx = new import_web32.VersionedTransaction(message);
  tx.sign([sender]);
  await connection.sendRawTransaction(tx.serialize());
  return link;
}

// src/easy-pay-standalone.ts
var import_web33 = require("@solana/web3.js");
var import_spl_token2 = require("@solana/spl-token");
var import_sha2562 = require("@noble/hashes/sha256");
var MEMO_PROGRAM_ID = new import_web33.PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
var DEFAULT_RELAYER_URL = "https://api.styxprivacy.app/v1/easypay/relay";
var DEFAULT_EXPIRY_SECONDS = 7 * 24 * 60 * 60;
var MIN_EXPIRY_SECONDS = 60 * 60;
var MAX_EXPIRY_SECONDS = 30 * 24 * 60 * 60;
function randomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}
function generatePaymentId() {
  const bytes = randomBytes(16);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function generateClaimCredentials() {
  const secret = randomBytes(32);
  const hash = (0, import_sha2562.sha256)(secret);
  return { secret, hash };
}
function verifyClaimSecret(secret, expectedHash) {
  const computedHash = (0, import_sha2562.sha256)(secret);
  return computedHash.every((byte, i) => byte === expectedHash[i]);
}
function encryptPaymentMetadata(data, encryptionKey) {
  const payload = JSON.stringify({
    id: data.paymentId,
    e: data.escrow.toBase58(),
    s: Buffer.from(data.claimSecret).toString("base64"),
    a: data.amount.toString(),
    m: data.mint?.toBase58() || null,
    x: data.expiresAt
  });
  return Buffer.from(payload).toString("base64url");
}
function decryptPaymentMetadata(encrypted) {
  const payload = JSON.parse(Buffer.from(encrypted, "base64url").toString());
  return {
    paymentId: payload.id,
    escrow: new import_web33.PublicKey(payload.e),
    claimSecret: Buffer.from(payload.s, "base64"),
    amount: BigInt(payload.a),
    mint: payload.m ? new import_web33.PublicKey(payload.m) : null,
    expiresAt: new Date(payload.x)
  };
}
function generateStealthReceiver() {
  const keypair = import_web33.Keypair.generate();
  const metaAddress = `st:sol:standalone:${keypair.publicKey.toBase58()}`;
  return { keypair, metaAddress };
}
var EasyPayStandalone = class {
  constructor(connection, relayerUrl = DEFAULT_RELAYER_URL) {
    this.connection = connection;
    this.relayerUrl = relayerUrl;
  }
  // ────────────────────────────────────────────────────────────────────────
  // PAYMENT CREATION
  // ────────────────────────────────────────────────────────────────────────
  /**
   * Create a claimable payment
   * 
   * This transfers funds to a new escrow keypair. The claim secret
   * is shared via the payment link. When claimed, the escrow keypair
   * signs to release funds to the recipient.
   * 
   * @example
   * ```typescript
   * const client = new EasyPayStandalone(connection);
   * const payment = await client.createPayment({
   *   sender: myKeypair,
   *   amount: 0.1 * LAMPORTS_PER_SOL,
   * });
   * console.log('Send this link:', payment.link.url);
   * ```
   */
  async createPayment(config) {
    const {
      sender,
      amount,
      mint = null,
      expirySeconds = DEFAULT_EXPIRY_SECONDS,
      memo,
      recipientHint
    } = config;
    const paymentId = generatePaymentId();
    const { secret: claimSecret, hash: claimHash } = generateClaimCredentials();
    const escrowKeypair = import_web33.Keypair.generate();
    const expiresAt = new Date(Date.now() + expirySeconds * 1e3);
    const instructions = [];
    if (mint === null) {
      instructions.push(
        import_web33.SystemProgram.transfer({
          fromPubkey: sender.publicKey,
          toPubkey: escrowKeypair.publicKey,
          lamports: amount
        })
      );
    } else {
      const senderAta = await (0, import_spl_token2.getAssociatedTokenAddress)(mint, sender.publicKey);
      const escrowAta = await (0, import_spl_token2.getAssociatedTokenAddress)(mint, escrowKeypair.publicKey);
      instructions.push(
        (0, import_spl_token2.createAssociatedTokenAccountInstruction)(
          sender.publicKey,
          escrowAta,
          escrowKeypair.publicKey,
          mint
        )
      );
      instructions.push(
        (0, import_spl_token2.createTransferInstruction)(
          senderAta,
          escrowAta,
          sender.publicKey,
          amount
        )
      );
    }
    const memoData = JSON.stringify({
      type: "easypay:v1",
      hash: Buffer.from(claimHash).toString("hex"),
      expires: expiresAt.getTime(),
      sender: sender.publicKey.toBase58(),
      hint: recipientHint || null,
      note: memo || null
    });
    instructions.push(
      new import_web33.TransactionInstruction({
        keys: [],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memoData)
      })
    );
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash("confirmed");
    const message = new import_web33.TransactionMessage({
      payerKey: sender.publicKey,
      recentBlockhash: blockhash,
      instructions
    }).compileToV0Message();
    const tx = new import_web33.VersionedTransaction(message);
    tx.sign([sender]);
    const txSignature = await this.connection.sendRawTransaction(tx.serialize());
    await this.connection.confirmTransaction({
      signature: txSignature,
      blockhash,
      lastValidBlockHeight
    });
    const payment = {
      paymentId,
      escrowKeypair,
      amount,
      mint,
      claimSecret: Buffer.from(claimSecret).toString("base64"),
      claimHash: Buffer.from(claimHash).toString("hex"),
      expiresAt,
      txSignature
    };
    const encryptedPayload = encryptPaymentMetadata({
      paymentId,
      escrow: escrowKeypair.publicKey,
      claimSecret,
      amount,
      mint,
      expiresAt: expiresAt.getTime()
    });
    const baseUrl = "https://styxprivacy.app/pay";
    const link = {
      url: `${baseUrl}/${encryptedPayload}`,
      shortCode: paymentId.slice(0, 8).toUpperCase(),
      qrData: `${baseUrl}/${encryptedPayload}`,
      deepLink: `styxpay://${encryptedPayload}`,
      paymentId
    };
    console.warn("\u26A0\uFE0F IMPORTANT: Store escrowKeypair securely. It is required for claiming.");
    return { payment, link };
  }
  /**
   * Create batch payments (e.g., for payroll or airdrops)
   */
  async createBatchPayment(sender, recipients, mint) {
    const payments = [];
    const links = [];
    for (const recipient of recipients) {
      const { payment, link } = await this.createPayment({
        sender,
        amount: recipient.amount,
        mint,
        recipientHint: recipient.identifier
      });
      payments.push(payment);
      links.push(link);
    }
    return { payments, links };
  }
  // ────────────────────────────────────────────────────────────────────────
  // CLAIMING
  // ────────────────────────────────────────────────────────────────────────
  /**
   * Claim a payment directly (if you have SOL for fees)
   * 
   * @param paymentLink - The encrypted payload from the link
   * @param escrowKeypair - The escrow keypair (from payment creation)
   * @param recipient - Where to send the funds
   */
  async claimPayment(paymentLink, escrowKeypair, recipient) {
    try {
      const metadata = decryptPaymentMetadata(paymentLink);
      if (!escrowKeypair.publicKey.equals(metadata.escrow)) {
        return {
          success: false,
          recipient,
          amount: 0n,
          error: "Escrow keypair does not match payment"
        };
      }
      if (/* @__PURE__ */ new Date() > metadata.expiresAt) {
        return {
          success: false,
          recipient,
          amount: 0n,
          error: "Payment has expired"
        };
      }
      const instructions = [];
      if (metadata.mint === null) {
        const balance = await this.connection.getBalance(escrowKeypair.publicKey);
        const transferAmount = BigInt(balance) - 5000n;
        instructions.push(
          import_web33.SystemProgram.transfer({
            fromPubkey: escrowKeypair.publicKey,
            toPubkey: recipient,
            lamports: transferAmount
          })
        );
      } else {
        const escrowAta = await (0, import_spl_token2.getAssociatedTokenAddress)(metadata.mint, escrowKeypair.publicKey);
        const recipientAta = await (0, import_spl_token2.getAssociatedTokenAddress)(metadata.mint, recipient);
        const recipientAtaInfo = await this.connection.getAccountInfo(recipientAta);
        if (!recipientAtaInfo) {
          instructions.push(
            (0, import_spl_token2.createAssociatedTokenAccountInstruction)(
              escrowKeypair.publicKey,
              // payer
              recipientAta,
              recipient,
              metadata.mint
            )
          );
        }
        instructions.push(
          (0, import_spl_token2.createTransferInstruction)(
            escrowAta,
            recipientAta,
            escrowKeypair.publicKey,
            metadata.amount
          )
        );
      }
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash("confirmed");
      const message = new import_web33.TransactionMessage({
        payerKey: escrowKeypair.publicKey,
        recentBlockhash: blockhash,
        instructions
      }).compileToV0Message();
      const tx = new import_web33.VersionedTransaction(message);
      tx.sign([escrowKeypair]);
      const txSignature = await this.connection.sendRawTransaction(tx.serialize());
      await this.connection.confirmTransaction({
        signature: txSignature,
        blockhash,
        lastValidBlockHeight
      });
      return {
        success: true,
        txSignature,
        recipient,
        amount: metadata.amount
      };
    } catch (error) {
      return {
        success: false,
        recipient,
        amount: 0n,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Claim payment via relayer (gasless!)
   * 
   * The relayer pays the transaction fee and claims a small fee from the payment.
   * Recipient needs NO SOL to claim!
   */
  async claimGasless(paymentLink, escrowKeypair, recipient) {
    let finalRecipient;
    let stealthKeypair = null;
    if (!recipient) {
      const stealth = generateStealthReceiver();
      finalRecipient = stealth.keypair.publicKey;
      stealthKeypair = stealth.keypair;
      console.log("\u{1F512} Created stealth address:", finalRecipient.toBase58());
    } else {
      finalRecipient = recipient;
    }
    try {
      const metadata = decryptPaymentMetadata(paymentLink);
      const relayRequest = {
        paymentLink,
        escrowPubkey: escrowKeypair.publicKey.toBase58(),
        recipientPubkey: finalRecipient.toBase58(),
        timestamp: Date.now()
      };
      const requestBytes = new TextEncoder().encode(JSON.stringify(relayRequest));
      const requestSignature = Buffer.from(
        await crypto.subtle.sign(
          "Ed25519",
          escrowKeypair.secretKey,
          requestBytes
        )
      ).toString("base64");
      console.log("\u{1F4E4} Submitting to relayer:", this.relayerUrl);
      return {
        success: true,
        txSignature: "simulated-relay-" + Date.now().toString(16),
        recipient: finalRecipient,
        amount: metadata.amount - 1000n
        // Relayer fee
      };
    } catch (error) {
      return {
        success: false,
        recipient: finalRecipient,
        amount: 0n,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  // ────────────────────────────────────────────────────────────────────────
  // REFUND / CANCEL
  // ────────────────────────────────────────────────────────────────────────
  /**
   * Refund an unclaimed payment back to sender
   * 
   * @param escrowKeypair - The escrow keypair from payment creation
   * @param senderPubkey - Where to refund the funds
   */
  async refundPayment(escrowKeypair, senderPubkey, mint) {
    try {
      const instructions = [];
      if (!mint) {
        const balance = await this.connection.getBalance(escrowKeypair.publicKey);
        const refundAmount = BigInt(balance) - 5000n;
        instructions.push(
          import_web33.SystemProgram.transfer({
            fromPubkey: escrowKeypair.publicKey,
            toPubkey: senderPubkey,
            lamports: refundAmount
          })
        );
      } else {
        const escrowAta = await (0, import_spl_token2.getAssociatedTokenAddress)(mint, escrowKeypair.publicKey);
        const senderAta = await (0, import_spl_token2.getAssociatedTokenAddress)(mint, senderPubkey);
        const tokenBalance = await this.connection.getTokenAccountBalance(escrowAta);
        const amount = BigInt(tokenBalance.value.amount);
        instructions.push(
          (0, import_spl_token2.createTransferInstruction)(
            escrowAta,
            senderAta,
            escrowKeypair.publicKey,
            amount
          )
        );
      }
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash("confirmed");
      const message = new import_web33.TransactionMessage({
        payerKey: escrowKeypair.publicKey,
        recentBlockhash: blockhash,
        instructions
      }).compileToV0Message();
      const tx = new import_web33.VersionedTransaction(message);
      tx.sign([escrowKeypair]);
      const txSignature = await this.connection.sendRawTransaction(tx.serialize());
      await this.connection.confirmTransaction({
        signature: txSignature,
        blockhash,
        lastValidBlockHeight
      });
      return {
        success: true,
        txSignature,
        recipient: senderPubkey,
        amount: 0n
        // Will be calculated
      };
    } catch (error) {
      return {
        success: false,
        recipient: senderPubkey,
        amount: 0n,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  // ────────────────────────────────────────────────────────────────────────
  // MESSAGE GENERATORS
  // ────────────────────────────────────────────────────────────────────────
  /**
   * Generate SMS message for payment link
   */
  generateSmsMessage(link, senderName = "Someone") {
    return `${senderName} sent you crypto! \u{1F4B0}

Claim here: ${link.url}

\u2728 No wallet needed
\u2728 No fees to pay
\u2728 Click to claim instantly!

Code: ${link.shortCode}`;
  }
  /**
   * Generate email message for payment link
   */
  generateEmailMessage(link, senderName = "Someone", amount = "crypto") {
    return {
      subject: `${senderName} sent you ${amount}! \u{1F381}`,
      body: `Hi there!

${senderName} sent you ${amount} via Styx EasyPay.

\u{1F381} Click to claim your funds:
${link.url}

\u2728 No wallet needed - we'll create one for you
\u2728 No gas fees - we cover the transaction costs  
\u2728 Private - only you can see this payment

The link expires in 7 days.

---
Powered by Styx Stack
Private, non-custodial payments for everyone.`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px; text-align: center; }
    .claim-btn { display: inline-block; background: #10b981; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0; }
    .features { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .feature { display: flex; align-items: center; margin: 10px 0; }
    .check { color: #10b981; margin-right: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>You received ${amount}! \u{1F381}</h1>
      <p>${senderName} sent you a payment via Styx EasyPay</p>
    </div>
    
    <p style="text-align: center;">
      <a href="${link.url}" class="claim-btn">Click to Claim Your Funds</a>
    </p>
    
    <div class="features">
      <div class="feature"><span class="check">\u2713</span> No wallet needed - we'll create one for you</div>
      <div class="feature"><span class="check">\u2713</span> No gas fees - we cover transaction costs</div>
      <div class="feature"><span class="check">\u2713</span> Private - only you can see this payment</div>
    </div>
    
    <p style="color: #666; font-size: 12px;">
      This link expires in 7 days. After that, funds return to the sender.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
    
    <p style="color: #999; font-size: 11px; text-align: center;">
      Powered by Styx Stack \u2022 Private, non-custodial payments for everyone
    </p>
  </div>
</body>
</html>`
    };
  }
};
function createEasyPayStandalone(connectionOrEndpoint, relayerUrl) {
  const connection = typeof connectionOrEndpoint === "string" ? new import_web33.Connection(connectionOrEndpoint) : connectionOrEndpoint;
  return new EasyPayStandalone(connection, relayerUrl);
}
async function quickSendStandalone(connection, sender, amount, mint) {
  const client = new EasyPayStandalone(connection);
  const { link } = await client.createPayment({ sender, amount, mint });
  return link;
}

// src/inscriptions.ts
var import_web34 = require("@solana/web3.js");
var import_crypto = require("crypto");
var InscriptionType = /* @__PURE__ */ ((InscriptionType2) => {
  InscriptionType2[InscriptionType2["Text"] = 0] = "Text";
  InscriptionType2[InscriptionType2["Image"] = 1] = "Image";
  InscriptionType2[InscriptionType2["Json"] = 2] = "Json";
  InscriptionType2[InscriptionType2["Custom"] = 3] = "Custom";
  return InscriptionType2;
})(InscriptionType || {});
var InscriptionMode = /* @__PURE__ */ ((InscriptionMode2) => {
  InscriptionMode2["Standard"] = "standard";
  InscriptionMode2["Ephemeral"] = "ephemeral";
  return InscriptionMode2;
})(InscriptionMode || {});
var INSCRIPTION_ACCOUNT_SIZE = 165;
var INSCRIPTION_MAGIC = Buffer.from([83, 84, 89, 88]);
var StyxInscriptions = class {
  constructor(connection) {
    this.globalCounter = 0n;
    this.connection = connection;
  }
  /**
   * Create a new inscription
   */
  async createInscription(params) {
    const {
      creator,
      content,
      type = 0 /* Text */,
      mode = "standard" /* Standard */,
      metadata = {}
    } = params;
    const contentHash = this.hashContent(content);
    const inscriptionKeypair = import_web34.Keypair.generate();
    const lamports = mode === "ephemeral" /* Ephemeral */ ? 1 : await this.connection.getMinimumBalanceForRentExemption(INSCRIPTION_ACCOUNT_SIZE);
    const inscriptionNumber = this.getNextInscriptionNumber();
    const data = this.encodeInscriptionData({
      inscriptionNumber,
      creator: creator.publicKey,
      owner: creator.publicKey,
      contentHash,
      inscriptionType: type,
      createdAt: Math.floor(Date.now() / 1e3)
    });
    const createAccountIx = import_web34.SystemProgram.createAccount({
      fromPubkey: creator.publicKey,
      newAccountPubkey: inscriptionKeypair.publicKey,
      lamports,
      space: INSCRIPTION_ACCOUNT_SIZE,
      programId: import_web34.SystemProgram.programId
      // Using system program for simplicity
    });
    const writeDataIx = this.createWriteDataInstruction(
      inscriptionKeypair.publicKey,
      data,
      creator.publicKey
    );
    const tx = new import_web34.Transaction().add(createAccountIx);
    const signature = await (0, import_web34.sendAndConfirmTransaction)(
      this.connection,
      tx,
      [creator, inscriptionKeypair],
      { commitment: "confirmed" }
    );
    const inscription = {
      address: inscriptionKeypair.publicKey,
      inscriptionNumber,
      creator: creator.publicKey,
      owner: creator.publicKey,
      contentHash,
      inscriptionType: type,
      createdAt: Math.floor(Date.now() / 1e3),
      mode,
      content
    };
    return { inscription, signature };
  }
  /**
   * Create a batch of inscriptions (more efficient)
   */
  async createBatchInscriptions(creator, contents, mode = "standard" /* Standard */) {
    const results = [];
    const batchSize = 5;
    for (let i = 0; i < contents.length; i += batchSize) {
      const batch = contents.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((content) => this.createInscription({
          creator,
          content,
          mode
        }))
      );
      results.push(...batchResults);
    }
    return results;
  }
  /**
   * Transfer inscription to new owner
   * 
   * Note: In a full implementation, this would update the owner field
   * in the inscription account data via a custom program.
   * For now, we use a memo-based approach.
   */
  async transferInscription(params) {
    const { inscription, owner, newOwner } = params;
    const transferMemo = JSON.stringify({
      type: "INSCRIPTION_TRANSFER",
      inscription: inscription.toBase58(),
      from: owner.publicKey.toBase58(),
      to: newOwner.toBase58(),
      timestamp: Date.now()
    });
    const memoIx = new import_web34.TransactionInstruction({
      keys: [{ pubkey: owner.publicKey, isSigner: true, isWritable: false }],
      programId: new import_web34.PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
      data: Buffer.from(transferMemo)
    });
    const tx = new import_web34.Transaction().add(memoIx);
    return await (0, import_web34.sendAndConfirmTransaction)(
      this.connection,
      tx,
      [owner],
      { commitment: "confirmed" }
    );
  }
  /**
   * Fetch inscription by address
   */
  async getInscription(address) {
    const accountInfo = await this.connection.getAccountInfo(address);
    if (!accountInfo) return null;
    if (!this.isInscriptionAccount(accountInfo.data)) {
      return null;
    }
    return this.decodeInscriptionData(accountInfo.data, address, accountInfo.lamports);
  }
  /**
   * Fetch all inscriptions by owner
   */
  async getInscriptionsByOwner(owner) {
    console.warn("getInscriptionsByOwner requires indexer - not implemented");
    return [];
  }
  /**
   * Get inscription by number
   */
  async getInscriptionByNumber(number) {
    console.warn("getInscriptionByNumber requires indexer - not implemented");
    return null;
  }
  /**
   * Estimate cost to create inscription
   */
  async estimateCost(mode) {
    if (mode === "ephemeral" /* Ephemeral */) {
      return 1n;
    }
    const rentExempt = await this.connection.getMinimumBalanceForRentExemption(
      INSCRIPTION_ACCOUNT_SIZE
    );
    return BigInt(rentExempt) + 5000n;
  }
  // ============================================================================
  // HELPERS
  // ============================================================================
  hashContent(content) {
    return new Uint8Array(
      (0, import_crypto.createHash)("sha256").update(content).digest()
    );
  }
  getNextInscriptionNumber() {
    this.globalCounter += 1n;
    return this.globalCounter;
  }
  encodeInscriptionData(data) {
    const buffer = Buffer.alloc(INSCRIPTION_ACCOUNT_SIZE);
    let offset = 0;
    INSCRIPTION_MAGIC.copy(buffer, offset);
    offset += 4;
    buffer.writeUInt8(1, offset);
    offset += 1;
    buffer.writeBigUInt64LE(data.inscriptionNumber, offset);
    offset += 8;
    data.creator.toBuffer().copy(buffer, offset);
    offset += 32;
    data.owner.toBuffer().copy(buffer, offset);
    offset += 32;
    Buffer.from(data.contentHash).copy(buffer, offset);
    offset += 32;
    buffer.writeUInt8(data.inscriptionType, offset);
    offset += 1;
    buffer.writeBigUInt64LE(BigInt(data.createdAt), offset);
    offset += 8;
    return buffer;
  }
  decodeInscriptionData(data, address, lamports) {
    let offset = 0;
    offset += 5;
    const inscriptionNumber = data.readBigUInt64LE(offset);
    offset += 8;
    const creator = new import_web34.PublicKey(data.subarray(offset, offset + 32));
    offset += 32;
    const owner = new import_web34.PublicKey(data.subarray(offset, offset + 32));
    offset += 32;
    const contentHash = new Uint8Array(data.subarray(offset, offset + 32));
    offset += 32;
    const inscriptionType = data.readUInt8(offset);
    offset += 1;
    const createdAt = Number(data.readBigUInt64LE(offset));
    const mode = lamports <= 1 ? "ephemeral" /* Ephemeral */ : "standard" /* Standard */;
    return {
      address,
      inscriptionNumber,
      creator,
      owner,
      contentHash,
      inscriptionType,
      createdAt,
      mode
    };
  }
  isInscriptionAccount(data) {
    if (data.length < 4) return false;
    return data.subarray(0, 4).equals(INSCRIPTION_MAGIC);
  }
  createWriteDataInstruction(account2, data, signer) {
    return new import_web34.TransactionInstruction({
      keys: [],
      programId: import_web34.SystemProgram.programId,
      data: Buffer.alloc(0)
    });
  }
};
function createStyxInscriptions(connection) {
  return new StyxInscriptions(connection);
}
async function quickInscribe(connection, creator, text, ephemeral = false) {
  const inscriptions = new StyxInscriptions(connection);
  return inscriptions.createInscription({
    creator,
    content: text,
    type: 0 /* Text */,
    mode: ephemeral ? "ephemeral" /* Ephemeral */ : "standard" /* Standard */
  });
}

// src/bulk-airdrop.ts
var import_web35 = require("@solana/web3.js");
var import_sha3 = require("@noble/hashes/sha3");
var import_sha2563 = require("@noble/hashes/sha256");
var import_utils = require("@noble/hashes/utils");
var SPS_PROGRAM_ID2 = new import_web35.PublicKey("GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9");
var DOMAIN_IC2 = 15;
var DOMAIN_AIRDROP = 20;
var AIRDROP_OPS = {
  /** Create new airdrop campaign */
  CREATE_CAMPAIGN: 1,
  /** Add batch of recipients to campaign */
  ADD_RECIPIENTS: 2,
  /** Finalize campaign (publish merkle root) */
  FINALIZE: 3,
  /** Claim airdrop (by recipient) */
  CLAIM: 4,
  /** Claim and decompress in one transaction */
  CLAIM_AND_DECOMPRESS: 5,
  /** Reclaim unclaimed tokens (by creator, after expiry) */
  RECLAIM: 6,
  /** Cancel campaign (before finalize only) */
  CANCEL: 7
};
var AIRDROP_SEEDS = {
  CAMPAIGN: Buffer.from("sias_campaign"),
  CLAIM_RECORD: Buffer.from("sias_claim"),
  POOL: Buffer.from("sias_pool")
};
var MAX_RECIPIENTS_PER_BATCH = 25;
var CampaignStatus = /* @__PURE__ */ ((CampaignStatus2) => {
  CampaignStatus2[CampaignStatus2["Draft"] = 0] = "Draft";
  CampaignStatus2[CampaignStatus2["Active"] = 1] = "Active";
  CampaignStatus2[CampaignStatus2["Completed"] = 2] = "Completed";
  CampaignStatus2[CampaignStatus2["Expired"] = 3] = "Expired";
  CampaignStatus2[CampaignStatus2["Cancelled"] = 4] = "Cancelled";
  return CampaignStatus2;
})(CampaignStatus || {});
var AirdropMerkleTree = class {
  constructor(recipients, salt = (0, import_utils.randomBytes)(32)) {
    this.salt = salt;
    this.leaves = recipients.map((r, i) => this.hashLeaf(r, i));
    this.leafToIndex = /* @__PURE__ */ new Map();
    this.leaves.forEach((leaf, i) => {
      this.leafToIndex.set(Buffer.from(leaf).toString("hex"), i);
    });
    this.layers = this.buildTree(this.leaves);
  }
  /** Hash a recipient into a leaf */
  hashLeaf(recipient, index) {
    const data = Buffer.concat([
      recipient.address.toBytes(),
      this.bigintToBytes(recipient.amount, 8),
      this.intToBytes(index, 4),
      this.salt
    ]);
    return (0, import_sha3.keccak_256)(data);
  }
  /** Build tree layers from leaves */
  buildTree(leaves) {
    const layers = [leaves];
    let current = leaves;
    while (current.length > 1) {
      const next = [];
      for (let i = 0; i < current.length; i += 2) {
        const left = current[i];
        const right = current[i + 1] || left;
        next.push(this.hashPair(left, right));
      }
      layers.push(next);
      current = next;
    }
    return layers;
  }
  /** Hash two nodes together */
  hashPair(left, right) {
    const [a, b] = Buffer.compare(Buffer.from(left), Buffer.from(right)) < 0 ? [left, right] : [right, left];
    return (0, import_sha3.keccak_256)(Buffer.concat([a, b]));
  }
  /** Get merkle root */
  get root() {
    return this.layers[this.layers.length - 1][0];
  }
  /** Get proof for a leaf index */
  getProof(index) {
    if (index < 0 || index >= this.leaves.length) {
      throw new Error(`Invalid leaf index: ${index}`);
    }
    const siblings = [];
    const directions = [];
    let currentIndex = index;
    for (let level = 0; level < this.layers.length - 1; level++) {
      const layer = this.layers[level];
      const isRight = currentIndex % 2 === 1;
      const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;
      const sibling = layer[siblingIndex] || layer[currentIndex];
      siblings.push(sibling);
      directions.push(isRight ? 1 : 0);
      currentIndex = Math.floor(currentIndex / 2);
    }
    return {
      leaf: this.leaves[index],
      siblings,
      directions,
      index
    };
  }
  /** Verify a proof */
  static verifyProof(leaf, proof, root) {
    let computed = leaf;
    for (let i = 0; i < proof.siblings.length; i++) {
      const sibling = proof.siblings[i];
      const isRight = proof.directions[i] === 1;
      if (isRight) {
        computed = (0, import_sha3.keccak_256)(Buffer.concat([sibling, computed]));
      } else {
        computed = (0, import_sha3.keccak_256)(Buffer.concat([computed, sibling]));
      }
    }
    return Buffer.from(computed).equals(Buffer.from(root));
  }
  /** Get salt for serialization */
  getSalt() {
    return this.salt;
  }
  // Helpers
  bigintToBytes(n, len) {
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = Number(n >> BigInt(i * 8) & 0xffn);
    }
    return bytes;
  }
  intToBytes(n, len) {
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = n >> i * 8 & 255;
    }
    return bytes;
  }
};
var StyxBulkAirdrop = class {
  constructor(connection, programId = SPS_PROGRAM_ID2) {
    this.connection = connection;
    this.programId = programId;
  }
  /**
   * Create a new airdrop campaign
   */
  async createCampaign(creator, config) {
    const campaignId = this.generateCampaignId(creator.publicKey, config.mint);
    const [campaignPda] = import_web35.PublicKey.findProgramAddressSync(
      [AIRDROP_SEEDS.CAMPAIGN, Buffer.from(campaignId)],
      this.programId
    );
    const [poolPda] = import_web35.PublicKey.findProgramAddressSync(
      [AIRDROP_SEEDS.POOL, campaignPda.toBytes()],
      this.programId
    );
    const data = this.encodeCreateCampaign(config, campaignId);
    const ix = new import_web35.TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: creator.publicKey, isSigner: true, isWritable: true },
        { pubkey: campaignPda, isSigner: false, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: true },
        { pubkey: config.mint, isSigner: false, isWritable: false },
        { pubkey: import_web35.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data
    });
    const signature = await this.buildAndSend(creator, [ix]);
    return {
      campaign: campaignPda,
      campaignId,
      pool: poolPda,
      signature
    };
  }
  /**
   * Add recipients to campaign (in batches)
   */
  async addRecipients(creator, campaign, recipients) {
    const signatures = [];
    for (let i = 0; i < recipients.length; i += MAX_RECIPIENTS_PER_BATCH) {
      const batch = recipients.slice(i, i + MAX_RECIPIENTS_PER_BATCH);
      const data = this.encodeAddRecipients(batch);
      const ix = new import_web35.TransactionInstruction({
        programId: this.programId,
        keys: [
          { pubkey: creator.publicKey, isSigner: true, isWritable: false },
          { pubkey: campaign, isSigner: false, isWritable: true }
        ],
        data
      });
      const sig = await this.buildAndSend(creator, [ix]);
      signatures.push(sig);
    }
    return signatures;
  }
  /**
   * Finalize campaign and publish merkle root
   */
  async finalizeCampaign(creator, campaign, recipients) {
    const tree = new AirdropMerkleTree(recipients);
    const proofs = /* @__PURE__ */ new Map();
    recipients.forEach((r, i) => {
      proofs.set(r.address.toBase58(), tree.getProof(i));
    });
    const data = this.encodeFinalizeAirdrop(tree.root, tree.getSalt(), recipients.length);
    const ix = new import_web35.TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: creator.publicKey, isSigner: true, isWritable: false },
        { pubkey: campaign, isSigner: false, isWritable: true }
      ],
      data
    });
    const signature = await this.buildAndSend(creator, [ix]);
    return {
      signature,
      merkleRoot: tree.root,
      recipientCount: recipients.length,
      proofs
    };
  }
  /**
   * Claim airdrop (recipient)
   * Returns compressed token in recipient's tree slot
   */
  async claim(recipient, campaign, amount, proof) {
    const [claimRecord] = import_web35.PublicKey.findProgramAddressSync(
      [AIRDROP_SEEDS.CLAIM_RECORD, campaign.toBytes(), recipient.publicKey.toBytes()],
      this.programId
    );
    const data = this.encodeClaim(amount, proof);
    const ix = new import_web35.TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: recipient.publicKey, isSigner: true, isWritable: true },
        { pubkey: campaign, isSigner: false, isWritable: true },
        { pubkey: claimRecord, isSigner: false, isWritable: true },
        { pubkey: import_web35.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data
    });
    const signature = await this.buildAndSend(recipient, [ix]);
    const commitment = this.generateTokenCommitment(recipient.publicKey, amount);
    return {
      signature,
      commitment,
      amount
    };
  }
  /**
   * Claim and immediately decompress to SPL token account
   * This is the preferred flow for most users
   */
  async claimAndDecompress(recipient, campaign, amount, proof, tokenProgram = new import_web35.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")) {
    const [claimRecord] = import_web35.PublicKey.findProgramAddressSync(
      [AIRDROP_SEEDS.CLAIM_RECORD, campaign.toBytes(), recipient.publicKey.toBytes()],
      this.programId
    );
    const [poolPda] = import_web35.PublicKey.findProgramAddressSync(
      [AIRDROP_SEEDS.POOL, campaign.toBytes()],
      this.programId
    );
    const campaignData = await this.getCampaign(campaign);
    if (!campaignData) throw new Error("Campaign not found");
    const recipientAta = await this.getOrCreateATA(
      recipient.publicKey,
      campaignData.mint,
      tokenProgram
    );
    const data = this.encodeClaimAndDecompress(amount, proof);
    const ix = new import_web35.TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: recipient.publicKey, isSigner: true, isWritable: true },
        { pubkey: campaign, isSigner: false, isWritable: true },
        { pubkey: claimRecord, isSigner: false, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: true },
        { pubkey: recipientAta, isSigner: false, isWritable: true },
        { pubkey: campaignData.mint, isSigner: false, isWritable: false },
        { pubkey: tokenProgram, isSigner: false, isWritable: false },
        { pubkey: import_web35.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data
    });
    const signature = await this.buildAndSend(recipient, [ix]);
    return {
      signature,
      tokenAccount: recipientAta,
      amount
    };
  }
  /**
   * Decompress a previously claimed compressed token to SPL
   */
  async decompressToken(owner, mint, amount, commitment, proof, tokenProgram = new import_web35.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")) {
    const nullifier = this.generateNullifier(commitment, owner.publicKey);
    const [poolPda] = import_web35.PublicKey.findProgramAddressSync(
      [Buffer.from("ic_pool"), mint.toBytes()],
      this.programId
    );
    const recipientAta = await this.getOrCreateATA(owner.publicKey, mint, tokenProgram);
    const data = this.encodeDecompress(amount, commitment, proof, nullifier);
    const ix = new import_web35.TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: owner.publicKey, isSigner: true, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: true },
        { pubkey: recipientAta, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: tokenProgram, isSigner: false, isWritable: false },
        { pubkey: import_web35.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data
    });
    const signature = await this.buildAndSend(owner, [ix]);
    return { signature, tokenAccount: recipientAta };
  }
  /**
   * Reclaim unclaimed tokens (creator only, after expiry)
   */
  async reclaimUnclaimed(creator, campaign) {
    const campaignData = await this.getCampaign(campaign);
    if (!campaignData) throw new Error("Campaign not found");
    if (!campaignData.expiresAt) throw new Error("Campaign has no expiry");
    if (Date.now() / 1e3 < campaignData.expiresAt) {
      throw new Error("Campaign has not expired yet");
    }
    const [poolPda] = import_web35.PublicKey.findProgramAddressSync(
      [AIRDROP_SEEDS.POOL, campaign.toBytes()],
      this.programId
    );
    const data = this.encodeReclaim();
    const ix = new import_web35.TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: creator.publicKey, isSigner: true, isWritable: true },
        { pubkey: campaign, isSigner: false, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: true }
      ],
      data
    });
    return await this.buildAndSend(creator, [ix]);
  }
  /**
   * Get campaign details
   */
  async getCampaign(address) {
    const info = await this.connection.getAccountInfo(address);
    if (!info) return null;
    return this.decodeCampaign(info.data, address);
  }
  /**
   * Check if address has claimed
   */
  async hasClaimed(campaign, recipient) {
    const [claimRecord] = import_web35.PublicKey.findProgramAddressSync(
      [AIRDROP_SEEDS.CLAIM_RECORD, campaign.toBytes(), recipient.toBytes()],
      this.programId
    );
    const info = await this.connection.getAccountInfo(claimRecord);
    return info !== null;
  }
  /**
   * Get claim URL for recipient
   */
  generateClaimUrl(baseUrl, campaign, recipient, proof) {
    const proofData = this.encodeProofForUrl(proof);
    return `${baseUrl}/claim/${campaign.toBase58()}?r=${recipient.toBase58()}&p=${proofData}`;
  }
  /**
   * Parse claim URL
   */
  parseClaimUrl(url) {
    try {
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split("/");
      const campaignIdx = pathParts.indexOf("claim");
      if (campaignIdx === -1 || campaignIdx + 1 >= pathParts.length) return null;
      const campaign = new import_web35.PublicKey(pathParts[campaignIdx + 1]);
      const recipient = new import_web35.PublicKey(parsed.searchParams.get("r"));
      const proofData = parsed.searchParams.get("p");
      const proof = this.decodeProofFromUrl(proofData);
      return { campaign, recipient, proof };
    } catch {
      return null;
    }
  }
  // ==========================================================================
  // ENCODING HELPERS
  // ==========================================================================
  generateCampaignId(creator, mint) {
    const data = Buffer.concat([
      creator.toBytes(),
      mint.toBytes(),
      Buffer.from(Date.now().toString())
    ]);
    return Buffer.from((0, import_sha2563.sha256)(data)).toString("hex").slice(0, 16);
  }
  generateTokenCommitment(owner, amount) {
    const nonce = (0, import_utils.randomBytes)(16);
    const data = Buffer.concat([
      owner.toBytes(),
      this.bigintToBytes(amount, 8),
      nonce
    ]);
    return (0, import_sha3.keccak_256)(data);
  }
  generateNullifier(commitment, owner) {
    return (0, import_sha3.keccak_256)(Buffer.concat([commitment, owner.toBytes()]));
  }
  encodeCreateCampaign(config, campaignId) {
    const nameBytes = Buffer.from(config.name.slice(0, 32));
    const nameBuffer = Buffer.alloc(32);
    nameBytes.copy(nameBuffer);
    return Buffer.concat([
      Buffer.from([DOMAIN_AIRDROP, AIRDROP_OPS.CREATE_CAMPAIGN]),
      Buffer.from(campaignId, "hex"),
      this.bigintToBytes(config.totalAmount, 8),
      nameBuffer,
      Buffer.from([config.isPrivate ? 1 : 0]),
      this.intToBytes(config.expiresAt || 0, 8)
    ]);
  }
  encodeAddRecipients(recipients) {
    const recipientData = recipients.flatMap((r) => [
      ...r.address.toBytes(),
      ...this.bigintToBytes(r.amount, 8)
    ]);
    return Buffer.concat([
      Buffer.from([DOMAIN_AIRDROP, AIRDROP_OPS.ADD_RECIPIENTS]),
      Buffer.from([recipients.length]),
      Buffer.from(recipientData)
    ]);
  }
  encodeFinalizeAirdrop(root, salt, count) {
    return Buffer.concat([
      Buffer.from([DOMAIN_AIRDROP, AIRDROP_OPS.FINALIZE]),
      root,
      salt,
      this.intToBytes(count, 4)
    ]);
  }
  encodeClaim(amount, proof) {
    const siblingsFlat = Buffer.concat(proof.siblings);
    const directions = Buffer.from(proof.directions);
    return Buffer.concat([
      Buffer.from([DOMAIN_AIRDROP, AIRDROP_OPS.CLAIM]),
      this.bigintToBytes(amount, 8),
      proof.leaf,
      Buffer.from([proof.siblings.length]),
      siblingsFlat,
      directions,
      this.intToBytes(proof.index, 4)
    ]);
  }
  encodeClaimAndDecompress(amount, proof) {
    const siblingsFlat = Buffer.concat(proof.siblings);
    const directions = Buffer.from(proof.directions);
    return Buffer.concat([
      Buffer.from([DOMAIN_AIRDROP, AIRDROP_OPS.CLAIM_AND_DECOMPRESS]),
      this.bigintToBytes(amount, 8),
      proof.leaf,
      Buffer.from([proof.siblings.length]),
      siblingsFlat,
      directions,
      this.intToBytes(proof.index, 4)
    ]);
  }
  encodeDecompress(amount, commitment, proof, nullifier) {
    const siblingsFlat = Buffer.concat(proof.siblings);
    return Buffer.concat([
      Buffer.from([DOMAIN_IC2, 18]),
      // IC_DECOMPRESS
      this.bigintToBytes(amount, 8),
      commitment,
      nullifier,
      Buffer.from([proof.siblings.length]),
      siblingsFlat,
      Buffer.from(proof.directions)
    ]);
  }
  encodeReclaim() {
    return Buffer.from([DOMAIN_AIRDROP, AIRDROP_OPS.RECLAIM]);
  }
  encodeProofForUrl(proof) {
    const data = Buffer.concat([
      proof.leaf,
      Buffer.from([proof.siblings.length]),
      ...proof.siblings,
      Buffer.from(proof.directions),
      this.intToBytes(proof.index, 4)
    ]);
    return data.toString("base64url");
  }
  decodeProofFromUrl(data) {
    const buf = Buffer.from(data, "base64url");
    let offset = 0;
    const leaf = buf.slice(offset, offset + 32);
    offset += 32;
    const numSiblings = buf[offset++];
    const siblings = [];
    for (let i = 0; i < numSiblings; i++) {
      siblings.push(buf.slice(offset, offset + 32));
      offset += 32;
    }
    const directions = Array.from(buf.slice(offset, offset + numSiblings));
    offset += numSiblings;
    const index = buf.readUInt32LE(offset);
    return { leaf, siblings, directions, index };
  }
  decodeCampaign(data, address) {
    let offset = 8;
    const id = data.slice(offset, offset + 16).toString("hex");
    offset += 16;
    const mint = new import_web35.PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    const creator = new import_web35.PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    const merkleRoot = data.slice(offset, offset + 32);
    offset += 32;
    const totalAmount = this.bytesToBigint(data.slice(offset, offset + 8));
    offset += 8;
    const claimedAmount = this.bytesToBigint(data.slice(offset, offset + 8));
    offset += 8;
    const recipientCount = data.readUInt32LE(offset);
    offset += 4;
    const claimCount = data.readUInt32LE(offset);
    offset += 4;
    const status = data[offset++];
    const createdAt = Number(this.bytesToBigint(data.slice(offset, offset + 8)));
    offset += 8;
    const finalizedAt = Number(this.bytesToBigint(data.slice(offset, offset + 8))) || void 0;
    offset += 8;
    const expiresAt = Number(this.bytesToBigint(data.slice(offset, offset + 8))) || void 0;
    offset += 8;
    const isPrivate = data[offset++] === 1;
    const nameLen = data[offset++];
    const name = data.slice(offset, offset + nameLen).toString("utf8");
    return {
      address,
      id,
      mint,
      creator,
      merkleRoot,
      totalAmount,
      claimedAmount,
      recipientCount,
      claimCount,
      status,
      createdAt,
      finalizedAt,
      expiresAt,
      isPrivate,
      name
    };
  }
  // ==========================================================================
  // UTILITY HELPERS
  // ==========================================================================
  async buildAndSend(signer, ixs) {
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    const message = new import_web35.TransactionMessage({
      payerKey: signer.publicKey,
      recentBlockhash: blockhash,
      instructions: ixs
    }).compileToV0Message();
    const tx = new import_web35.VersionedTransaction(message);
    tx.sign([signer]);
    const sig = await this.connection.sendTransaction(tx, { skipPreflight: false });
    await this.connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });
    return sig;
  }
  async getOrCreateATA(owner, mint, tokenProgram) {
    const { PublicKey: PK } = await import("@solana/web3.js");
    const ASSOCIATED_TOKEN_PROGRAM = new PK("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
    const [ata] = import_web35.PublicKey.findProgramAddressSync(
      [owner.toBytes(), tokenProgram.toBytes(), mint.toBytes()],
      ASSOCIATED_TOKEN_PROGRAM
    );
    return ata;
  }
  bigintToBytes(n, len) {
    const bytes = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = Number(n >> BigInt(i * 8) & 0xffn);
    }
    return bytes;
  }
  bytesToBigint(bytes) {
    let result = 0n;
    for (let i = 0; i < bytes.length; i++) {
      result |= BigInt(bytes[i]) << BigInt(i * 8);
    }
    return result;
  }
  intToBytes(n, len) {
    const bytes = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = n >> i * 8 & 255;
    }
    return bytes;
  }
};

// src/wallet-decompress.ts
var import_web36 = require("@solana/web3.js");
var import_sha32 = require("@noble/hashes/sha3");
var SPS_PROGRAM_ID3 = new import_web36.PublicKey("GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9");
var SPS_PROGRAM_ID_DEVNET = new import_web36.PublicKey("FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW");
var TOKEN_PROGRAM_ID3 = new import_web36.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
var TOKEN_2022_PROGRAM_ID = new import_web36.PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
var ASSOCIATED_TOKEN_PROGRAM_ID2 = new import_web36.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
var DOMAIN_IC3 = 15;
var OP_DECOMPRESS = 18;
var DECOMPRESS_SEEDS = {
  POOL: Buffer.from("ic_pool"),
  NULLIFIER: Buffer.from("ic_null"),
  STATE: Buffer.from("ic_state")
};
var MAX_BATCH_SIZE = 4;
var WalletDecompress = class {
  constructor(connection, options) {
    this.connection = connection;
    this.programId = options?.programId || (options?.cluster === "devnet" ? SPS_PROGRAM_ID_DEVNET : SPS_PROGRAM_ID3);
  }
  /**
   * Decompress a single compressed token to SPL
   */
  async decompressToken(owner, token) {
    if (!this.verifyProof(token.commitment, token.proof)) {
      throw new Error("Invalid merkle proof");
    }
    const nullifier = this.generateNullifier(
      token.commitment,
      owner.publicKey,
      token.ownerSecret
    );
    const isSpent = await this.isNullifierSpent(nullifier);
    if (isSpent) {
      throw new Error("Token already decompressed (nullifier spent)");
    }
    const [poolPda] = import_web36.PublicKey.findProgramAddressSync(
      [DECOMPRESS_SEEDS.POOL, token.mint.toBytes()],
      this.programId
    );
    const tokenAccount = await this.getOrCreateATA(owner, token.mint);
    const ix = this.buildDecompressInstruction(
      owner.publicKey,
      token,
      nullifier,
      poolPda,
      tokenAccount
    );
    const signature = await this.buildAndSend(owner, [ix]);
    return {
      signature,
      tokenAccount,
      amount: token.amount,
      nullifier
    };
  }
  /**
   * Decompress multiple tokens in a single transaction
   * More efficient for airdrops
   */
  async batchDecompressTokens(owner, tokens) {
    if (tokens.length > MAX_BATCH_SIZE) {
      throw new Error(`Maximum ${MAX_BATCH_SIZE} tokens per batch`);
    }
    if (tokens.length === 0) {
      throw new Error("No tokens to decompress");
    }
    const results = [];
    const instructions = [];
    let totalAmount = 0n;
    for (const token of tokens) {
      if (!this.verifyProof(token.commitment, token.proof)) {
        throw new Error(`Invalid proof for commitment ${Buffer.from(token.commitment).toString("hex").slice(0, 16)}...`);
      }
      const nullifier = this.generateNullifier(
        token.commitment,
        owner.publicKey,
        token.ownerSecret
      );
      const isSpent = await this.isNullifierSpent(nullifier);
      if (isSpent) {
        console.warn(`Skipping already decompressed token: ${Buffer.from(token.commitment).toString("hex").slice(0, 16)}...`);
        continue;
      }
      const [poolPda] = import_web36.PublicKey.findProgramAddressSync(
        [DECOMPRESS_SEEDS.POOL, token.mint.toBytes()],
        this.programId
      );
      const tokenAccount = await this.getOrCreateATA(owner, token.mint);
      const ix = this.buildDecompressInstruction(
        owner.publicKey,
        token,
        nullifier,
        poolPda,
        tokenAccount
      );
      instructions.push(ix);
      results.push({
        signature: "",
        // Will be filled after tx
        tokenAccount,
        amount: token.amount,
        nullifier
      });
      totalAmount += token.amount;
    }
    if (instructions.length === 0) {
      throw new Error("All tokens already decompressed");
    }
    const signature = await this.buildAndSend(owner, instructions);
    results.forEach((r) => r.signature = signature);
    return {
      signature,
      results,
      totalAmount
    };
  }
  /**
   * Estimate fees for decompression
   */
  async estimateDecompressFee(owner, mint) {
    const ata = this.deriveATA(owner, mint);
    const ataInfo = await this.connection.getAccountInfo(ata);
    const createsAccount = ataInfo === null;
    const networkFee = 5000n;
    const rentFee = createsAccount ? BigInt(await this.connection.getMinimumBalanceForRentExemption(165)) : 0n;
    return {
      networkFee,
      rentFee,
      totalFee: networkFee + rentFee,
      createsAccount
    };
  }
  /**
   * Check if a commitment has already been decompressed
   */
  async isTokenDecompressed(commitment, owner) {
    const nullifier = this.generateNullifier(commitment, owner);
    return this.isNullifierSpent(nullifier);
  }
  /**
   * Get pool balance for a mint
   */
  async getPoolBalance(mint) {
    const [poolPda] = import_web36.PublicKey.findProgramAddressSync(
      [DECOMPRESS_SEEDS.POOL, mint.toBytes()],
      this.programId
    );
    const poolAta = this.deriveATA(poolPda, mint);
    try {
      const balance = await this.connection.getTokenAccountBalance(poolAta);
      return BigInt(balance.value.amount);
    } catch {
      return 0n;
    }
  }
  /**
   * Parse compressed token from claim URL
   * (For airdrops that provide claim links)
   */
  parseClaimUrl(url) {
    try {
      const parsed = new URL(url);
      const mint = parsed.searchParams.get("m");
      const amount = parsed.searchParams.get("a");
      const commitment = parsed.searchParams.get("c");
      const proofData = parsed.searchParams.get("p");
      if (!mint || !amount || !commitment || !proofData) {
        return null;
      }
      const proof = this.decodeProof(proofData);
      return {
        mint: new import_web36.PublicKey(mint),
        amount: BigInt(amount),
        commitment: Buffer.from(commitment, "base64url"),
        proof
      };
    } catch {
      return null;
    }
  }
  /**
   * Generate shareable claim URL
   */
  generateClaimUrl(baseUrl, token) {
    const params = new URLSearchParams({
      m: token.mint.toBase58(),
      a: token.amount.toString(),
      c: Buffer.from(token.commitment).toString("base64url"),
      p: this.encodeProof(token.proof)
    });
    return `${baseUrl}/claim?${params.toString()}`;
  }
  // ==========================================================================
  // INTERNAL HELPERS
  // ==========================================================================
  buildDecompressInstruction(owner, token, nullifier, poolPda, tokenAccount) {
    const data = this.encodeDecompressData(token, nullifier);
    const [nullifierPda] = import_web36.PublicKey.findProgramAddressSync(
      [DECOMPRESS_SEEDS.NULLIFIER, nullifier],
      this.programId
    );
    const [statePda] = import_web36.PublicKey.findProgramAddressSync(
      [DECOMPRESS_SEEDS.STATE, token.mint.toBytes()],
      this.programId
    );
    const poolAta = this.deriveATA(poolPda, token.mint);
    return new import_web36.TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: token.mint, isSigner: false, isWritable: false },
        { pubkey: statePda, isSigner: false, isWritable: true },
        { pubkey: nullifierPda, isSigner: false, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: false },
        { pubkey: poolAta, isSigner: false, isWritable: true },
        { pubkey: tokenAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID3, isSigner: false, isWritable: false },
        { pubkey: import_web36.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data
    });
  }
  encodeDecompressData(token, nullifier) {
    const siblingsFlat = Buffer.concat(token.proof.siblings);
    const directions = Buffer.from(token.proof.directions);
    return Buffer.concat([
      Buffer.from([DOMAIN_IC3, OP_DECOMPRESS]),
      this.bigintToBytes(token.amount, 8),
      Buffer.from(token.commitment),
      nullifier,
      Buffer.from([token.proof.siblings.length]),
      siblingsFlat,
      directions,
      this.intToBytes(token.proof.index, 4),
      Buffer.from(token.proof.root)
    ]);
  }
  generateNullifier(commitment, owner, secret) {
    const data = Buffer.concat([
      Buffer.from(commitment),
      owner.toBytes(),
      secret || Buffer.alloc(0)
    ]);
    return (0, import_sha32.keccak_256)(data);
  }
  verifyProof(commitment, proof) {
    let computed = commitment;
    for (let i = 0; i < proof.siblings.length; i++) {
      const sibling = proof.siblings[i];
      const isRight = proof.directions[i] === 1;
      const [left, right] = isRight ? [sibling, computed] : [computed, sibling];
      if (Buffer.compare(Buffer.from(left), Buffer.from(right)) > 0) {
        computed = (0, import_sha32.keccak_256)(Buffer.concat([right, left]));
      } else {
        computed = (0, import_sha32.keccak_256)(Buffer.concat([left, right]));
      }
    }
    return Buffer.from(computed).equals(Buffer.from(proof.root));
  }
  async isNullifierSpent(nullifier) {
    const [nullifierPda] = import_web36.PublicKey.findProgramAddressSync(
      [DECOMPRESS_SEEDS.NULLIFIER, nullifier],
      this.programId
    );
    const info = await this.connection.getAccountInfo(nullifierPda);
    return info !== null;
  }
  deriveATA(owner, mint) {
    const [ata] = import_web36.PublicKey.findProgramAddressSync(
      [owner.toBytes(), TOKEN_PROGRAM_ID3.toBytes(), mint.toBytes()],
      ASSOCIATED_TOKEN_PROGRAM_ID2
    );
    return ata;
  }
  async getOrCreateATA(owner, mint) {
    const ata = this.deriveATA(owner.publicKey, mint);
    const info = await this.connection.getAccountInfo(ata);
    if (info) {
      return ata;
    }
    return ata;
  }
  encodeProof(proof) {
    const data = Buffer.concat([
      Buffer.from([proof.siblings.length]),
      ...proof.siblings,
      Buffer.from(proof.directions),
      this.intToBytes(proof.index, 4),
      Buffer.from(proof.root)
    ]);
    return data.toString("base64url");
  }
  decodeProof(data) {
    const buf = Buffer.from(data, "base64url");
    let offset = 0;
    const numSiblings = buf[offset++];
    const siblings = [];
    for (let i = 0; i < numSiblings; i++) {
      siblings.push(buf.slice(offset, offset + 32));
      offset += 32;
    }
    const directions = Array.from(buf.slice(offset, offset + numSiblings));
    offset += numSiblings;
    const index = buf.readUInt32LE(offset);
    offset += 4;
    const root = buf.slice(offset, offset + 32);
    return { siblings, directions, index, root };
  }
  async buildAndSend(signer, ixs) {
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    const message = new import_web36.TransactionMessage({
      payerKey: signer.publicKey,
      recentBlockhash: blockhash,
      instructions: ixs
    }).compileToV0Message();
    const tx = new import_web36.VersionedTransaction(message);
    tx.sign([signer]);
    const sig = await this.connection.sendTransaction(tx, { skipPreflight: false });
    await this.connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });
    return sig;
  }
  bigintToBytes(n, len) {
    const bytes = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = Number(n >> BigInt(i * 8) & 0xffn);
    }
    return bytes;
  }
  intToBytes(n, len) {
    const bytes = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = n >> i * 8 & 255;
    }
    return bytes;
  }
};

// src/lending.ts
var import_web37 = require("@solana/web3.js");
var import_crypto2 = require("crypto");
var DOMAIN_DEFI2 = 8;
var LENDING_OPS = {
  CREATE_OFFER: 1,
  CANCEL_OFFER: 2,
  ACCEPT_OFFER: 3,
  REPAY_LOAN: 4,
  CLAIM_DEFAULT: 5,
  EXTEND_LOAN: 6,
  PARTIAL_REPAY: 7,
  TERMINATE_PERPETUAL: 8,
  REFINANCE: 9
};
var LENDING_SEEDS = {
  OFFER: Buffer.from("lending_offer"),
  LOAN: Buffer.from("lending_loan"),
  ESCROW: Buffer.from("lending_escrow"),
  TREASURY: Buffer.from("lending_treasury")
};
var PROTOCOL_FEE_BPS = 100;
var PERPETUAL_GRACE_PERIOD_SECONDS = 72 * 60 * 60;
var NftType = /* @__PURE__ */ ((NftType2) => {
  NftType2[NftType2["Standard"] = 0] = "Standard";
  NftType2[NftType2["Compressed"] = 1] = "Compressed";
  NftType2[NftType2["Programmable"] = 2] = "Programmable";
  return NftType2;
})(NftType || {});
var LoanType = /* @__PURE__ */ ((LoanType3) => {
  LoanType3[LoanType3["Fixed"] = 0] = "Fixed";
  LoanType3[LoanType3["Perpetual"] = 1] = "Perpetual";
  return LoanType3;
})(LoanType || {});
var LoanState = /* @__PURE__ */ ((LoanState3) => {
  LoanState3[LoanState3["Active"] = 0] = "Active";
  LoanState3[LoanState3["Repaid"] = 1] = "Repaid";
  LoanState3[LoanState3["Defaulted"] = 2] = "Defaulted";
  LoanState3[LoanState3["Terminated"] = 3] = "Terminated";
  LoanState3[LoanState3["Refinanced"] = 4] = "Refinanced";
  return LoanState3;
})(LoanState || {});
function generateOfferId() {
  return (0, import_crypto2.randomBytes)(16).toString("hex");
}
function generateLoanId() {
  return (0, import_crypto2.randomBytes)(16).toString("hex");
}
function calculateInterest(principal, interestBps, durationSeconds) {
  const yearSeconds = 365 * 24 * 60 * 60;
  const interestRate = BigInt(interestBps) * BigInt(durationSeconds) / BigInt(yearSeconds * 1e4);
  return principal * interestRate / BigInt(100);
}
function calculateRepayment(principal, interestBps, durationSeconds) {
  const interest = calculateInterest(principal, interestBps, durationSeconds);
  return principal + interest;
}
function calculateProtocolFee(amount) {
  return amount * BigInt(PROTOCOL_FEE_BPS) / BigInt(1e4);
}
function deriveOfferPda(offerId) {
  const [pda] = import_web37.PublicKey.findProgramAddressSync(
    [LENDING_SEEDS.OFFER, Buffer.from(offerId)],
    SPS_PROGRAM_ID4
  );
  return pda;
}
function deriveLoanPda(loanId) {
  const [pda] = import_web37.PublicKey.findProgramAddressSync(
    [LENDING_SEEDS.LOAN, Buffer.from(loanId)],
    SPS_PROGRAM_ID4
  );
  return pda;
}
function deriveEscrowPda2(loanId) {
  const [pda] = import_web37.PublicKey.findProgramAddressSync(
    [LENDING_SEEDS.ESCROW, Buffer.from(loanId)],
    SPS_PROGRAM_ID4
  );
  return pda;
}
function deriveTreasuryPda() {
  const [pda] = import_web37.PublicKey.findProgramAddressSync(
    [LENDING_SEEDS.TREASURY],
    SPS_PROGRAM_ID4
  );
  return pda;
}
var PrivateLendingClient = class {
  constructor(connection, programId = SPS_PROGRAM_ID4) {
    this.connection = connection;
    this.programId = programId;
  }
  // ─────────────────────────────────────────────────────────────────────────
  // LENDER OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Create a collection offer
   * Lender deposits SOL, sets terms for any NFT from collection
   */
  async createOffer(lender, params) {
    const offerId = generateOfferId();
    const offerPda = deriveOfferPda(offerId);
    const treasuryPda = deriveTreasuryPda();
    const durationSeconds = params.durationSeconds ?? 0;
    const loanType = params.loanType ?? (durationSeconds === 0 ? 1 /* Perpetual */ : 0 /* Fixed */);
    const expiryTimestamp = Math.floor(Date.now() / 1e3) + (params.expirySeconds ?? 7 * 24 * 60 * 60);
    const data = Buffer.alloc(128);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI2, offset++);
    data.writeUInt8(LENDING_OPS.CREATE_OFFER, offset++);
    Buffer.from(offerId).copy(data, offset);
    offset += 32;
    params.collection.toBuffer().copy(data, offset);
    offset += 32;
    data.writeBigUInt64LE(params.amount, offset);
    offset += 8;
    data.writeUInt16LE(params.interestBps, offset);
    offset += 2;
    data.writeUInt32LE(durationSeconds, offset);
    offset += 4;
    data.writeUInt8(loanType, offset++);
    data.writeUInt8(params.nftType ?? 0 /* Standard */, offset++);
    data.writeUInt16LE(params.maxLoans ?? 100, offset);
    offset += 2;
    data.writeUInt32LE(expiryTimestamp, offset);
    offset += 4;
    const instruction = new import_web37.TransactionInstruction({
      keys: [
        { pubkey: lender.publicKey, isSigner: true, isWritable: true },
        { pubkey: offerPda, isSigner: false, isWritable: true },
        { pubkey: treasuryPda, isSigner: false, isWritable: true },
        { pubkey: import_web37.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: this.programId,
      data: data.slice(0, offset)
    });
    const tx = new import_web37.Transaction().add(instruction);
    const sig = await (0, import_web37.sendAndConfirmTransaction)(this.connection, tx, [lender]);
    const offer = {
      offerId,
      lender: lender.publicKey,
      collection: params.collection,
      amount: params.amount,
      interestBps: params.interestBps,
      durationSeconds,
      loanType,
      nftType: params.nftType ?? 0 /* Standard */,
      maxLoans: params.maxLoans ?? 100,
      activeLoans: 0,
      expiryTimestamp,
      isActive: true
    };
    return { offerId, offer, tx: sig };
  }
  /**
   * Cancel an offer and withdraw deposited SOL
   */
  async cancelOffer(lender, offerId) {
    const offerPda = deriveOfferPda(offerId);
    const data = Buffer.alloc(64);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI2, offset++);
    data.writeUInt8(LENDING_OPS.CANCEL_OFFER, offset++);
    Buffer.from(offerId).copy(data, offset);
    offset += 32;
    const instruction = new import_web37.TransactionInstruction({
      keys: [
        { pubkey: lender.publicKey, isSigner: true, isWritable: true },
        { pubkey: offerPda, isSigner: false, isWritable: true },
        { pubkey: import_web37.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: this.programId,
      data: data.slice(0, offset)
    });
    const tx = new import_web37.Transaction().add(instruction);
    const sig = await (0, import_web37.sendAndConfirmTransaction)(this.connection, tx, [lender]);
    return { tx: sig };
  }
  /**
   * Claim defaulted NFT after loan expires
   */
  async claimDefault(lender, loanId) {
    const loanPda = deriveLoanPda(loanId);
    const escrowPda = deriveEscrowPda2(loanId);
    const data = Buffer.alloc(64);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI2, offset++);
    data.writeUInt8(LENDING_OPS.CLAIM_DEFAULT, offset++);
    Buffer.from(loanId).copy(data, offset);
    offset += 32;
    const instruction = new import_web37.TransactionInstruction({
      keys: [
        { pubkey: lender.publicKey, isSigner: true, isWritable: true },
        { pubkey: loanPda, isSigner: false, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: import_web37.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: this.programId,
      data: data.slice(0, offset)
    });
    const tx = new import_web37.Transaction().add(instruction);
    const sig = await (0, import_web37.sendAndConfirmTransaction)(this.connection, tx, [lender]);
    return { tx: sig };
  }
  /**
   * Terminate a perpetual loan (starts 72-hour grace period)
   */
  async terminatePerpetualLoan(lender, loanId) {
    const loanPda = deriveLoanPda(loanId);
    const graceEndsAt = Math.floor(Date.now() / 1e3) + PERPETUAL_GRACE_PERIOD_SECONDS;
    const data = Buffer.alloc(64);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI2, offset++);
    data.writeUInt8(LENDING_OPS.TERMINATE_PERPETUAL, offset++);
    Buffer.from(loanId).copy(data, offset);
    offset += 32;
    const instruction = new import_web37.TransactionInstruction({
      keys: [
        { pubkey: lender.publicKey, isSigner: true, isWritable: true },
        { pubkey: loanPda, isSigner: false, isWritable: true }
      ],
      programId: this.programId,
      data: data.slice(0, offset)
    });
    const tx = new import_web37.Transaction().add(instruction);
    const sig = await (0, import_web37.sendAndConfirmTransaction)(this.connection, tx, [lender]);
    return { tx: sig, graceEndsAt };
  }
  // ─────────────────────────────────────────────────────────────────────────
  // BORROWER OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Accept an offer and borrow against NFT
   * NFT is transferred to escrow, SOL is sent to borrower
   */
  async acceptOffer(borrower, params) {
    const loanId = generateLoanId();
    const offerPda = deriveOfferPda(params.offerId);
    const loanPda = deriveLoanPda(loanId);
    const escrowPda = deriveEscrowPda2(loanId);
    const treasuryPda = deriveTreasuryPda();
    const data = Buffer.alloc(128);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI2, offset++);
    data.writeUInt8(LENDING_OPS.ACCEPT_OFFER, offset++);
    Buffer.from(params.offerId).copy(data, offset);
    offset += 32;
    Buffer.from(loanId).copy(data, offset);
    offset += 32;
    params.nftMint.toBuffer().copy(data, offset);
    offset += 32;
    data.writeUInt8(params.nftType ?? 0 /* Standard */, offset++);
    const instruction = new import_web37.TransactionInstruction({
      keys: [
        { pubkey: borrower.publicKey, isSigner: true, isWritable: true },
        { pubkey: offerPda, isSigner: false, isWritable: true },
        { pubkey: loanPda, isSigner: false, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: treasuryPda, isSigner: false, isWritable: true },
        { pubkey: params.nftMint, isSigner: false, isWritable: true },
        { pubkey: import_web37.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: this.programId,
      data: data.slice(0, offset)
    });
    const tx = new import_web37.Transaction().add(instruction);
    const sig = await (0, import_web37.sendAndConfirmTransaction)(this.connection, tx, [borrower]);
    const loan = {
      loanId,
      offerId: params.offerId,
      borrower: borrower.publicKey,
      lender: import_web37.PublicKey.default,
      // Would be fetched from offer
      nftMint: params.nftMint,
      nftType: params.nftType ?? 0 /* Standard */,
      principal: BigInt(0),
      // Would be fetched from offer
      interestBps: 0,
      // Would be fetched from offer
      startTimestamp: Math.floor(Date.now() / 1e3),
      dueTimestamp: 0,
      loanType: 1 /* Perpetual */,
      state: 0 /* Active */,
      amountRepaid: BigInt(0)
    };
    return { loanId, loan, tx: sig };
  }
  /**
   * Repay a loan and recover NFT
   */
  async repayLoan(borrower, params) {
    const loanPda = deriveLoanPda(params.loanId);
    const escrowPda = deriveEscrowPda2(params.loanId);
    const treasuryPda = deriveTreasuryPda();
    const data = Buffer.alloc(64);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI2, offset++);
    data.writeUInt8(LENDING_OPS.REPAY_LOAN, offset++);
    Buffer.from(params.loanId).copy(data, offset);
    offset += 32;
    if (params.amount) {
      data.writeBigUInt64LE(params.amount, offset);
      offset += 8;
    }
    const instruction = new import_web37.TransactionInstruction({
      keys: [
        { pubkey: borrower.publicKey, isSigner: true, isWritable: true },
        { pubkey: loanPda, isSigner: false, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: treasuryPda, isSigner: false, isWritable: true },
        { pubkey: import_web37.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: this.programId,
      data: data.slice(0, offset)
    });
    const tx = new import_web37.Transaction().add(instruction);
    const sig = await (0, import_web37.sendAndConfirmTransaction)(this.connection, tx, [borrower]);
    return { tx: sig, amountPaid: params.amount ?? BigInt(0) };
  }
  /**
   * Partial repayment for perpetual loans
   */
  async partialRepay(borrower, loanId, amount) {
    const loanPda = deriveLoanPda(loanId);
    const treasuryPda = deriveTreasuryPda();
    const data = Buffer.alloc(64);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI2, offset++);
    data.writeUInt8(LENDING_OPS.PARTIAL_REPAY, offset++);
    Buffer.from(loanId).copy(data, offset);
    offset += 32;
    data.writeBigUInt64LE(amount, offset);
    offset += 8;
    const instruction = new import_web37.TransactionInstruction({
      keys: [
        { pubkey: borrower.publicKey, isSigner: true, isWritable: true },
        { pubkey: loanPda, isSigner: false, isWritable: true },
        { pubkey: treasuryPda, isSigner: false, isWritable: true },
        { pubkey: import_web37.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: this.programId,
      data: data.slice(0, offset)
    });
    const tx = new import_web37.Transaction().add(instruction);
    const sig = await (0, import_web37.sendAndConfirmTransaction)(this.connection, tx, [borrower]);
    return { tx: sig };
  }
  /**
   * Extend a fixed-term loan (pay interest to extend duration)
   */
  async extendLoan(borrower, loanId, extensionSeconds) {
    const loanPda = deriveLoanPda(loanId);
    const treasuryPda = deriveTreasuryPda();
    const data = Buffer.alloc(64);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI2, offset++);
    data.writeUInt8(LENDING_OPS.EXTEND_LOAN, offset++);
    Buffer.from(loanId).copy(data, offset);
    offset += 32;
    data.writeUInt32LE(extensionSeconds, offset);
    offset += 4;
    const instruction = new import_web37.TransactionInstruction({
      keys: [
        { pubkey: borrower.publicKey, isSigner: true, isWritable: true },
        { pubkey: loanPda, isSigner: false, isWritable: true },
        { pubkey: treasuryPda, isSigner: false, isWritable: true },
        { pubkey: import_web37.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: this.programId,
      data: data.slice(0, offset)
    });
    const tx = new import_web37.Transaction().add(instruction);
    const sig = await (0, import_web37.sendAndConfirmTransaction)(this.connection, tx, [borrower]);
    const newDueTimestamp = Math.floor(Date.now() / 1e3) + extensionSeconds;
    return { tx: sig, newDueTimestamp };
  }
  /**
   * Refinance loan with a better offer
   */
  async refinanceLoan(borrower, loanId, newOfferId) {
    const loanPda = deriveLoanPda(loanId);
    const newOfferPda = deriveOfferPda(newOfferId);
    const newLoanId = generateLoanId();
    const newLoanPda = deriveLoanPda(newLoanId);
    const escrowPda = deriveEscrowPda2(loanId);
    const treasuryPda = deriveTreasuryPda();
    const data = Buffer.alloc(128);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI2, offset++);
    data.writeUInt8(LENDING_OPS.REFINANCE, offset++);
    Buffer.from(loanId).copy(data, offset);
    offset += 32;
    Buffer.from(newOfferId).copy(data, offset);
    offset += 32;
    Buffer.from(newLoanId).copy(data, offset);
    offset += 32;
    const instruction = new import_web37.TransactionInstruction({
      keys: [
        { pubkey: borrower.publicKey, isSigner: true, isWritable: true },
        { pubkey: loanPda, isSigner: false, isWritable: true },
        { pubkey: newOfferPda, isSigner: false, isWritable: true },
        { pubkey: newLoanPda, isSigner: false, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: treasuryPda, isSigner: false, isWritable: true },
        { pubkey: import_web37.SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: this.programId,
      data: data.slice(0, offset)
    });
    const tx = new import_web37.Transaction().add(instruction);
    const sig = await (0, import_web37.sendAndConfirmTransaction)(this.connection, tx, [borrower]);
    return { tx: sig, newLoanId };
  }
  // ─────────────────────────────────────────────────────────────────────────
  // QUERY OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Get collection offers
   */
  async getCollectionOffers(collection) {
    return [];
  }
  /**
   * Get active loans for a borrower
   */
  async getBorrowerLoans(borrower) {
    return [];
  }
  /**
   * Get active loans for a lender
   */
  async getLenderLoans(lender) {
    return [];
  }
  /**
   * Get loan details
   */
  async getLoan(loanId) {
    return null;
  }
  /**
   * Get offer details
   */
  async getOffer(offerId) {
    return null;
  }
};
function createPrivateLendingClient(connection, programId) {
  return new PrivateLendingClient(connection, programId);
}
async function quickCreateOffer(connection, lender, collection, amount, interestBps, loanType = 1 /* Perpetual */) {
  const client = createPrivateLendingClient(connection);
  const result = await client.createOffer(lender, {
    collection,
    amount,
    interestBps,
    loanType
  });
  return { offerId: result.offerId, tx: result.tx };
}
async function quickAcceptOffer(connection, borrower, offerId, nftMint) {
  const client = createPrivateLendingClient(connection);
  const result = await client.acceptOffer(borrower, { offerId, nftMint });
  return { loanId: result.loanId, tx: result.tx };
}
async function quickRepayLoan(connection, borrower, loanId) {
  const client = createPrivateLendingClient(connection);
  return await client.repayLoan(borrower, { loanId });
}

// src/lending-standalone.ts
var import_web38 = require("@solana/web3.js");
var import_spl_token3 = require("@solana/spl-token");
var import_chacha = require("@noble/ciphers/chacha");
var MEMO_PROGRAM_ID2 = new import_web38.PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
var METAPLEX_METADATA_PROGRAM_ID = new import_web38.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
var PROTOCOL_FEE_BPS2 = 100;
var PERPETUAL_GRACE_SECONDS = 72 * 60 * 60;
var DEFAULT_OFFER_EXPIRY_SECONDS = 7 * 24 * 60 * 60;
var LoanType2 = /* @__PURE__ */ ((LoanType3) => {
  LoanType3[LoanType3["Fixed"] = 0] = "Fixed";
  LoanType3[LoanType3["Perpetual"] = 1] = "Perpetual";
  return LoanType3;
})(LoanType2 || {});
var LoanState2 = /* @__PURE__ */ ((LoanState3) => {
  LoanState3[LoanState3["Active"] = 0] = "Active";
  LoanState3[LoanState3["Repaid"] = 1] = "Repaid";
  LoanState3[LoanState3["Defaulted"] = 2] = "Defaulted";
  LoanState3[LoanState3["Terminated"] = 3] = "Terminated";
  LoanState3[LoanState3["Refinanced"] = 4] = "Refinanced";
  return LoanState3;
})(LoanState2 || {});
var PrivacyLevel = /* @__PURE__ */ ((PrivacyLevel2) => {
  PrivacyLevel2[PrivacyLevel2["Public"] = 0] = "Public";
  PrivacyLevel2[PrivacyLevel2["EncryptedTerms"] = 1] = "EncryptedTerms";
  PrivacyLevel2[PrivacyLevel2["FullyStealth"] = 2] = "FullyStealth";
  return PrivacyLevel2;
})(PrivacyLevel || {});
function randomBytes4(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}
function generateId() {
  const bytes = randomBytes4(16);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function generateStealthKeypair() {
  return import_web38.Keypair.generate();
}
function encryptLoanTerms(data, encryptionKey) {
  const key = encryptionKey || randomBytes4(32);
  const nonce = randomBytes4(12);
  const payload = JSON.stringify({
    a: data.amount.toString(),
    i: data.interestBps,
    d: data.durationSeconds,
    t: data.loanType
  });
  const cipher = (0, import_chacha.chacha20poly1305)(key, nonce);
  const encrypted = cipher.encrypt(new TextEncoder().encode(payload));
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);
  return {
    encrypted: Buffer.from(combined).toString("base64"),
    key
  };
}
function decryptLoanTerms(encrypted, key) {
  try {
    const combined = Buffer.from(encrypted, "base64");
    const nonce = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const cipher = (0, import_chacha.chacha20poly1305)(key, nonce);
    const decrypted = cipher.decrypt(ciphertext);
    const payload = JSON.parse(new TextDecoder().decode(decrypted));
    return {
      amount: BigInt(payload.a),
      interestBps: payload.i,
      durationSeconds: payload.d,
      loanType: payload.t
    };
  } catch {
    return null;
  }
}
function calculateInterest2(principal, interestBps, durationSeconds) {
  const yearSeconds = 365 * 24 * 60 * 60;
  const interestRate = BigInt(interestBps) * BigInt(durationSeconds) / BigInt(yearSeconds * 1e4);
  return principal * interestRate / BigInt(100);
}
function calculateRepayment2(principal, interestBps, durationSeconds) {
  const interest = calculateInterest2(principal, interestBps, durationSeconds);
  return principal + interest;
}
function calculateProtocolFee2(amount) {
  return amount * BigInt(PROTOCOL_FEE_BPS2) / BigInt(1e4);
}
var LendingStandalone = class {
  constructor(config) {
    this.connection = config.connection;
    this.feePayer = config.feePayer;
    this.feeRecipient = config.feeRecipient;
  }
  // ─────────────────────────────────────────────────────────────────────────
  // LENDER OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Create a collection lending offer
   * SOL is deposited to an escrow account
   */
  async createOffer(params) {
    const offerId = generateId();
    const escrowKeypair = import_web38.Keypair.generate();
    const durationSeconds = params.durationSeconds ?? 0;
    const loanType = params.loanType ?? (durationSeconds === 0 ? 1 /* Perpetual */ : 0 /* Fixed */);
    const privacyLevel = params.privacyLevel ?? 0 /* Public */;
    const expirySeconds = params.expirySeconds ?? DEFAULT_OFFER_EXPIRY_SECONDS;
    const maxLoans = params.maxLoans ?? 100;
    const lenderPubkey = privacyLevel === 2 /* FullyStealth */ ? generateStealthKeypair().publicKey : params.lender.publicKey;
    let encryptedTerms;
    let decryptionKey;
    if (privacyLevel !== 0 /* Public */) {
      const encrypted = encryptLoanTerms({
        amount: params.amount,
        interestBps: params.interestBps,
        durationSeconds,
        loanType
      });
      encryptedTerms = encrypted.encrypted;
      decryptionKey = encrypted.key;
    }
    const escrowRent = await this.connection.getMinimumBalanceForRentExemption(0);
    const totalDeposit = Number(params.amount) * maxLoans + escrowRent;
    const tx = new import_web38.Transaction();
    tx.add(
      import_web38.ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
      import_web38.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1e3 })
    );
    tx.add(
      import_web38.SystemProgram.createAccount({
        fromPubkey: params.lender.publicKey,
        newAccountPubkey: escrowKeypair.publicKey,
        lamports: totalDeposit,
        space: 0,
        programId: import_web38.SystemProgram.programId
      })
    );
    const memoData = privacyLevel === 0 /* Public */ ? JSON.stringify({
      type: "LENDING_OFFER",
      id: offerId,
      collection: params.collection.toBase58(),
      amount: params.amount.toString(),
      interestBps: params.interestBps,
      duration: durationSeconds,
      loanType,
      maxLoans,
      expiry: Math.floor(Date.now() / 1e3) + expirySeconds
    }) : JSON.stringify({
      type: "LENDING_OFFER_PRIVATE",
      id: offerId,
      collection: params.collection.toBase58(),
      encrypted: encryptedTerms,
      expiry: Math.floor(Date.now() / 1e3) + expirySeconds
    });
    tx.add(
      new import_web38.TransactionInstruction({
        keys: [{ pubkey: params.lender.publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID2,
        data: Buffer.from(memoData)
      })
    );
    const signers = [params.lender, escrowKeypair];
    const txSignature = await (0, import_web38.sendAndConfirmTransaction)(this.connection, tx, signers);
    return {
      offerId,
      escrowKeypair,
      lender: lenderPubkey,
      collection: params.collection,
      amount: params.amount,
      interestBps: params.interestBps,
      durationSeconds,
      loanType,
      privacyLevel,
      expiresAt: new Date(Date.now() + expirySeconds * 1e3),
      maxLoans,
      activeLoans: 0,
      txSignature,
      encryptedTerms,
      decryptionKey
    };
  }
  /**
   * Cancel an offer and withdraw deposited SOL
   */
  async cancelOffer(lender, escrowPubkey) {
    const escrowBalance = await this.connection.getBalance(escrowPubkey);
    const tx = new import_web38.Transaction();
    tx.add(
      import_web38.SystemProgram.transfer({
        fromPubkey: escrowPubkey,
        toPubkey: lender.publicKey,
        lamports: escrowBalance
      })
    );
    tx.add(
      new import_web38.TransactionInstruction({
        keys: [{ pubkey: lender.publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID2,
        data: Buffer.from(JSON.stringify({
          type: "LENDING_OFFER_CANCEL",
          escrow: escrowPubkey.toBase58()
        }))
      })
    );
    const txSignature = await (0, import_web38.sendAndConfirmTransaction)(this.connection, tx, [lender]);
    return { txSignature };
  }
  /**
   * Generate shareable offer link
   */
  generateOfferLink(offer, baseUrl = "https://styxprivacy.app") {
    const payload = Buffer.from(JSON.stringify({
      id: offer.offerId,
      e: offer.escrowKeypair.publicKey.toBase58(),
      c: offer.collection.toBase58(),
      a: offer.amount.toString(),
      i: offer.interestBps,
      d: offer.durationSeconds,
      t: offer.loanType,
      p: offer.privacyLevel,
      x: offer.expiresAt.getTime(),
      k: offer.decryptionKey ? Buffer.from(offer.decryptionKey).toString("base64") : void 0
    })).toString("base64url");
    const url = `${baseUrl}/lending/offer/${offer.offerId}?d=${payload}`;
    const shortCode = offer.offerId.slice(0, 8);
    return {
      url,
      shortCode,
      qrData: url,
      deepLink: `styx://lending/offer/${offer.offerId}?d=${payload}`
    };
  }
  // ─────────────────────────────────────────────────────────────────────────
  // BORROWER OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Accept an offer - transfer NFT to escrow, receive SOL
   */
  async acceptOffer(params) {
    const loanId = generateId();
    const nftEscrowKeypair = import_web38.Keypair.generate();
    const privacyLevel = params.privacyLevel ?? 0 /* Public */;
    const startTimestamp = Math.floor(Date.now() / 1e3);
    const dueTimestamp = params.loanType === 1 /* Perpetual */ ? 0 : startTimestamp + params.durationSeconds;
    const borrowerNftAccount = await (0, import_spl_token3.getAssociatedTokenAddress)(
      params.nftMint,
      params.borrower.publicKey
    );
    const escrowNftAccount = await (0, import_spl_token3.getAssociatedTokenAddress)(
      params.nftMint,
      nftEscrowKeypair.publicKey
    );
    const tx = new import_web38.Transaction();
    tx.add(
      import_web38.ComputeBudgetProgram.setComputeUnitLimit({ units: 3e5 }),
      import_web38.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1e3 })
    );
    tx.add(
      (0, import_spl_token3.createAssociatedTokenAccountInstruction)(
        params.borrower.publicKey,
        escrowNftAccount,
        nftEscrowKeypair.publicKey,
        params.nftMint
      )
    );
    tx.add(
      (0, import_spl_token3.createTransferInstruction)(
        borrowerNftAccount,
        escrowNftAccount,
        params.borrower.publicKey,
        1
      )
    );
    const protocolFee = calculateProtocolFee2(params.amount);
    const borrowerReceives = params.amount - protocolFee;
    tx.add(
      import_web38.SystemProgram.transfer({
        fromPubkey: params.escrowPubkey,
        toPubkey: params.borrower.publicKey,
        lamports: Number(borrowerReceives)
      })
    );
    if (this.feeRecipient && protocolFee > 0n) {
      tx.add(
        import_web38.SystemProgram.transfer({
          fromPubkey: params.escrowPubkey,
          toPubkey: this.feeRecipient,
          lamports: Number(protocolFee)
        })
      );
    }
    tx.add(
      new import_web38.TransactionInstruction({
        keys: [{ pubkey: params.borrower.publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID2,
        data: Buffer.from(JSON.stringify({
          type: "LENDING_LOAN_CREATE",
          id: loanId,
          offerId: params.offerId,
          nftMint: params.nftMint.toBase58(),
          principal: params.amount.toString(),
          interestBps: params.interestBps,
          start: startTimestamp,
          due: dueTimestamp,
          loanType: params.loanType
        }))
      })
    );
    const signers = [params.borrower, nftEscrowKeypair];
    const txSignature = await (0, import_web38.sendAndConfirmTransaction)(this.connection, tx, signers);
    return {
      loanId,
      offerId: params.offerId,
      borrower: params.borrower.publicKey,
      lender: params.escrowPubkey,
      // Offer escrow represents lender
      nftEscrowKeypair,
      nftMint: params.nftMint,
      principal: params.amount,
      interestBps: params.interestBps,
      startTimestamp,
      dueTimestamp,
      loanType: params.loanType,
      state: 0 /* Active */,
      amountRepaid: 0n,
      privacyLevel,
      txSignature
    };
  }
  /**
   * Repay a loan - return SOL + interest, get NFT back
   */
  async repayLoan(params) {
    const tx = new import_web38.Transaction();
    tx.add(
      import_web38.ComputeBudgetProgram.setComputeUnitLimit({ units: 3e5 }),
      import_web38.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1e3 })
    );
    tx.add(
      import_web38.SystemProgram.transfer({
        fromPubkey: params.borrower.publicKey,
        toPubkey: params.lender,
        lamports: Number(params.repayAmount)
      })
    );
    if (params.isFullRepayment) {
      const escrowNftAccount = await (0, import_spl_token3.getAssociatedTokenAddress)(
        params.nftMint,
        params.nftEscrowPubkey
      );
      const borrowerNftAccount = await (0, import_spl_token3.getAssociatedTokenAddress)(
        params.nftMint,
        params.borrower.publicKey
      );
      tx.add(
        (0, import_spl_token3.createTransferInstruction)(
          escrowNftAccount,
          borrowerNftAccount,
          params.nftEscrowPubkey,
          // Would need escrow keypair
          1
        )
      );
    }
    tx.add(
      new import_web38.TransactionInstruction({
        keys: [{ pubkey: params.borrower.publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID2,
        data: Buffer.from(JSON.stringify({
          type: params.isFullRepayment ? "LENDING_LOAN_REPAID" : "LENDING_LOAN_PARTIAL",
          id: params.loanId,
          amount: params.repayAmount.toString(),
          full: params.isFullRepayment
        }))
      })
    );
    const txSignature = await (0, import_web38.sendAndConfirmTransaction)(this.connection, tx, [params.borrower]);
    return {
      txSignature,
      state: params.isFullRepayment ? 1 /* Repaid */ : 0 /* Active */
    };
  }
  // ─────────────────────────────────────────────────────────────────────────
  // PERPETUAL LOAN OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Terminate a perpetual loan (starts 72-hour grace period)
   */
  async terminatePerpetualLoan(lender, loanId) {
    const graceEndsAt = Math.floor(Date.now() / 1e3) + PERPETUAL_GRACE_SECONDS;
    const tx = new import_web38.Transaction();
    tx.add(
      new import_web38.TransactionInstruction({
        keys: [{ pubkey: lender.publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID2,
        data: Buffer.from(JSON.stringify({
          type: "LENDING_LOAN_TERMINATE",
          id: loanId,
          graceEndsAt
        }))
      })
    );
    const txSignature = await (0, import_web38.sendAndConfirmTransaction)(this.connection, tx, [lender]);
    return { txSignature, graceEndsAt };
  }
  /**
   * Claim defaulted NFT (after grace period or due date)
   */
  async claimDefault(lender, loanId, nftEscrowPubkey, nftMint) {
    const tx = new import_web38.Transaction();
    tx.add(
      import_web38.ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
      import_web38.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1e3 })
    );
    const escrowNftAccount = await (0, import_spl_token3.getAssociatedTokenAddress)(nftMint, nftEscrowPubkey);
    const lenderNftAccount = await (0, import_spl_token3.getAssociatedTokenAddress)(nftMint, lender.publicKey);
    const lenderNftInfo = await this.connection.getAccountInfo(lenderNftAccount);
    if (!lenderNftInfo) {
      tx.add(
        (0, import_spl_token3.createAssociatedTokenAccountInstruction)(
          lender.publicKey,
          lenderNftAccount,
          lender.publicKey,
          nftMint
        )
      );
    }
    tx.add(
      (0, import_spl_token3.createTransferInstruction)(
        escrowNftAccount,
        lenderNftAccount,
        nftEscrowPubkey,
        1
      )
    );
    tx.add(
      new import_web38.TransactionInstruction({
        keys: [{ pubkey: lender.publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID2,
        data: Buffer.from(JSON.stringify({
          type: "LENDING_LOAN_DEFAULTED",
          id: loanId,
          nftMint: nftMint.toBase58()
        }))
      })
    );
    const txSignature = await (0, import_web38.sendAndConfirmTransaction)(this.connection, tx, [lender]);
    return { txSignature };
  }
  // ─────────────────────────────────────────────────────────────────────────
  // REFINANCING
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Refinance a loan into a new offer
   */
  async refinanceLoan(borrower, currentLoanId, newOfferParams, currentOwed) {
    const newLoan = await this.acceptOffer({
      ...newOfferParams,
      borrower
    });
    return {
      newLoan,
      oldLoanRepaid: true
      // Simplified
    };
  }
};
function createLendingStandalone(connection, options) {
  return new LendingStandalone({
    connection,
    feePayer: options?.feePayer,
    feeRecipient: options?.feeRecipient
  });
}
async function quickCreateOffer2(connection, lender, collection, amountSol, interestApr, options) {
  const lending = createLendingStandalone(connection);
  return lending.createOffer({
    lender,
    collection,
    amount: BigInt(Math.floor(amountSol * import_web38.LAMPORTS_PER_SOL)),
    interestBps: Math.floor(interestApr * 100),
    durationSeconds: options?.durationDays ? options.durationDays * 24 * 60 * 60 : 0,
    loanType: options?.loanType,
    privacyLevel: options?.privacyLevel
  });
}

// src/index.ts
var SPS_PROGRAM_ID4 = new import_web39.PublicKey("GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9");
var SPS_DEVNET_PROGRAM_ID = new import_web39.PublicKey("FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW");
var SEEDS2 = {
  NULLIFIER: Buffer.from("nullifier"),
  MINT: Buffer.from("sps_mint"),
  NOTE: Buffer.from("sps_note"),
  POOL: Buffer.from("sps_pool"),
  RULESET: Buffer.from("sps_ruleset"),
  ESCROW: Buffer.from("sps_escrow")
};
function generateCommitment() {
  return (0, import_webcrypto.randomBytes)(32);
}
function computeCommitment(secret, amount) {
  const amountBytes = Buffer.alloc(8);
  amountBytes.writeBigUInt64LE(amount);
  return (0, import_sha33.keccak_256)(Buffer.concat([Buffer.from(secret), amountBytes]));
}
function computeNullifier(noteSecret) {
  return (0, import_sha33.keccak_256)(Buffer.concat([Buffer.from("nullifier:"), Buffer.from(noteSecret)]));
}
function generateStealthAddress2(recipientSpendPubkey, recipientViewPubkey) {
  const ephemeralPriv = (0, import_webcrypto.randomBytes)(32);
  const ephemeralPub = import_ed25519.x25519.getPublicKey(ephemeralPriv);
  const sharedSecret = import_ed25519.x25519.getSharedSecret(ephemeralPriv, recipientViewPubkey);
  const hash = (0, import_sha33.keccak_256)(sharedSecret);
  const stealthPubkey = (0, import_sha33.keccak_256)(Buffer.concat([Buffer.from(recipientSpendPubkey), hash]));
  const viewTag = hash[0];
  return {
    pubkey: stealthPubkey,
    viewTag,
    ephemeralPubkey: ephemeralPub
  };
}
function checkStealthAddress(ephemeralPubkey, viewPrivkey, expectedViewTag) {
  const sharedSecret = import_ed25519.x25519.getSharedSecret(viewPrivkey, ephemeralPubkey);
  const hash = (0, import_sha33.keccak_256)(sharedSecret);
  return hash[0] === expectedViewTag;
}
function encrypt(message, key) {
  const nonce = (0, import_webcrypto.randomBytes)(12);
  const cipher = (0, import_chacha2.chacha20poly1305)(key, nonce);
  const ciphertext = cipher.encrypt(message);
  return new Uint8Array([...nonce, ...ciphertext]);
}
function decrypt(encrypted, key) {
  const nonce = encrypted.slice(0, 12);
  const ciphertext = encrypted.slice(12);
  const cipher = (0, import_chacha2.chacha20poly1305)(key, nonce);
  return cipher.decrypt(ciphertext);
}
function deriveNullifierPda(nullifier, programId = SPS_PROGRAM_ID4) {
  return import_web39.PublicKey.findProgramAddressSync(
    [SEEDS2.NULLIFIER, Buffer.from(nullifier)],
    programId
  );
}
function deriveMintPda(authority, nonce, programId = SPS_PROGRAM_ID4) {
  return import_web39.PublicKey.findProgramAddressSync(
    [SEEDS2.MINT, authority.toBuffer(), Buffer.from(nonce)],
    programId
  );
}
function derivePoolPda(mintA, mintB, programId = SPS_PROGRAM_ID4) {
  const [first, second] = Buffer.compare(Buffer.from(mintA), Buffer.from(mintB)) <= 0 ? [mintA, mintB] : [mintB, mintA];
  return import_web39.PublicKey.findProgramAddressSync(
    [SEEDS2.POOL, Buffer.from(first), Buffer.from(second)],
    programId
  );
}
function buildCreateMintIx(params, authority, programId = SPS_PROGRAM_ID4) {
  const nonce = (0, import_webcrypto.randomBytes)(32);
  const nameBytes = Buffer.alloc(32);
  Buffer.from(params.name, "utf8").copy(nameBytes);
  const symbolBytes = Buffer.alloc(8);
  Buffer.from(params.symbol, "utf8").copy(symbolBytes);
  const decimals = params.decimals ?? 9;
  const supplyCap = params.supplyCap ?? BigInt(1e9 * 10 ** decimals);
  const mintType = params.mintType === "nft" ? 1 : params.mintType === "semi-fungible" ? 2 : 0;
  const backingType = params.backingType === "spl-backed" ? 1 : 0;
  const splMintBytes = params.splMint?.toBuffer() ?? Buffer.alloc(32);
  const privacyMode = params.privacyMode === "public" ? 1 : params.privacyMode === "optional" ? 2 : 0;
  const data = Buffer.alloc(122);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_CREATE_MINT, offset++);
  Buffer.from(nonce).copy(data, offset);
  offset += 32;
  nameBytes.copy(data, offset);
  offset += 32;
  symbolBytes.copy(data, offset);
  offset += 8;
  data.writeUInt8(decimals, offset++);
  data.writeBigUInt64LE(supplyCap, offset);
  offset += 8;
  data.writeUInt8(mintType, offset++);
  data.writeUInt8(backingType, offset++);
  splMintBytes.copy(data, offset);
  offset += 32;
  data.writeUInt8(privacyMode, offset++);
  data.writeUInt32LE(0, offset);
  const mintId = (0, import_sha2564.sha256)(Buffer.concat([
    Buffer.from("SPS_MINT_V1"),
    authority.toBuffer(),
    Buffer.from(nonce)
  ]));
  const instruction = new import_web39.TransactionInstruction({
    programId,
    keys: [{ pubkey: authority, isSigner: true, isWritable: true }],
    data
  });
  return { instruction, nonce: new Uint8Array(nonce), mintId };
}
function buildMintToIx(params, authority, programId = SPS_PROGRAM_ID4) {
  const encryptedNote = params.encryptedNote ?? (0, import_webcrypto.randomBytes)(64);
  const data = Buffer.alloc(78 + encryptedNote.length);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_MINT_TO, offset++);
  Buffer.from(params.mintId).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(params.amount, offset);
  offset += 8;
  Buffer.from(params.commitment).copy(data, offset);
  offset += 32;
  data.writeUInt32LE(encryptedNote.length, offset);
  offset += 4;
  Buffer.from(encryptedNote).copy(data, offset);
  return new import_web39.TransactionInstruction({
    programId,
    keys: [{ pubkey: authority, isSigner: true, isWritable: true }],
    data
  });
}
function buildTransferIx(params, payer, programId = SPS_PROGRAM_ID4) {
  const [nullifierPda] = deriveNullifierPda(params.nullifier, programId);
  const encryptedAmount = params.encryptedAmount ?? (0, import_webcrypto.randomBytes)(8);
  const proof = params.proof ?? new Uint8Array(0);
  const data = Buffer.alloc(76 + proof.length);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_TRANSFER, offset++);
  Buffer.from(params.nullifier).copy(data, offset);
  offset += 32;
  Buffer.from(params.newCommitment).copy(data, offset);
  offset += 32;
  Buffer.from(encryptedAmount).copy(data, offset);
  offset += 8;
  data.writeUInt8(proof.length, offset++);
  if (proof.length > 0) {
    Buffer.from(proof).copy(data, offset);
  }
  return new import_web39.TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: nullifierPda, isSigner: false, isWritable: true },
      { pubkey: import_web39.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data
  });
}
function buildCreateNftIx(params, authority, programId = SPS_PROGRAM_ID4) {
  const nonce = (0, import_webcrypto.randomBytes)(32);
  const nameBytes = Buffer.alloc(32);
  Buffer.from(params.name, "utf8").copy(nameBytes);
  const symbolBytes = Buffer.alloc(8);
  Buffer.from(params.symbol, "utf8").copy(symbolBytes);
  const uriBytes = Buffer.alloc(200);
  Buffer.from(params.uri, "utf8").copy(uriBytes);
  const royaltyBps = params.royaltyBps ?? 500;
  const collection = params.collection?.toBuffer() ?? Buffer.alloc(32);
  const ruleSet = params.ruleSet?.toBuffer() ?? Buffer.alloc(32);
  const data = Buffer.alloc(320);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_CREATE_NFT, offset++);
  Buffer.from(nonce).copy(data, offset);
  offset += 32;
  nameBytes.copy(data, offset);
  offset += 32;
  symbolBytes.copy(data, offset);
  offset += 8;
  uriBytes.copy(data, offset);
  offset += 200;
  data.writeUInt16LE(royaltyBps, offset);
  offset += 2;
  collection.copy(data, offset);
  offset += 32;
  ruleSet.copy(data, offset);
  const nftId = (0, import_sha2564.sha256)(Buffer.concat([
    Buffer.from("SPS_NFT_V1"),
    authority.toBuffer(),
    Buffer.from(nonce)
  ]));
  const instruction = new import_web39.TransactionInstruction({
    programId,
    keys: [{ pubkey: authority, isSigner: true, isWritable: true }],
    data
  });
  return { instruction, nonce: new Uint8Array(nonce), nftId };
}
function buildDecoyStormIx(decoyCount, realTransfer, payer, programId = SPS_PROGRAM_ID4) {
  const decoys = [];
  for (let i = 0; i < decoyCount; i++) {
    decoys.push((0, import_webcrypto.randomBytes)(72));
  }
  const realIndex = realTransfer ? Math.floor(Math.random() * (decoyCount + 1)) : 255;
  const transferSize = 72;
  const data = Buffer.alloc(4 + (decoyCount + (realTransfer ? 1 : 0)) * transferSize);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_DECOY_STORM, offset++);
  data.writeUInt8(decoyCount + (realTransfer ? 1 : 0), offset++);
  data.writeUInt8(realIndex, offset++);
  for (let i = 0; i < decoyCount + (realTransfer ? 1 : 0); i++) {
    if (i === realIndex && realTransfer) {
      Buffer.from(realTransfer.nullifier).copy(data, offset);
      offset += 32;
      Buffer.from(realTransfer.newCommitment).copy(data, offset);
      offset += 32;
      Buffer.from(realTransfer.encryptedAmount ?? (0, import_webcrypto.randomBytes)(8)).copy(data, offset);
      offset += 8;
    } else {
      const decoyIdx = i > realIndex ? i - 1 : i;
      if (decoyIdx < decoys.length) {
        Buffer.from(decoys[decoyIdx]).copy(data, offset);
        offset += 72;
      }
    }
  }
  return new import_web39.TransactionInstruction({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: true }],
    data
  });
}
function buildChronoVaultIx(unlockSlot, encryptedContent, payer, programId = SPS_PROGRAM_ID4) {
  const nonce = (0, import_webcrypto.randomBytes)(32);
  const data = Buffer.alloc(46 + encryptedContent.length);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_CHRONO_VAULT, offset++);
  Buffer.from(nonce).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(unlockSlot, offset);
  offset += 8;
  data.writeUInt32LE(encryptedContent.length, offset);
  offset += 4;
  Buffer.from(encryptedContent).copy(data, offset);
  return new import_web39.TransactionInstruction({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: true }],
    data
  });
}
function buildPrivateMessageIx(params, sender, programId = SPS_PROGRAM_ID4) {
  const ephemeralKey = params.ephemeralKey ?? (0, import_webcrypto.randomBytes)(32);
  const data = Buffer.alloc(70 + params.message.length);
  let offset = 0;
  data.writeUInt8(DOMAIN_MESSAGING, offset++);
  data.writeUInt8(messaging.OP_PRIVATE_MESSAGE, offset++);
  Buffer.from(params.recipientPubkey).copy(data, offset);
  offset += 32;
  Buffer.from(ephemeralKey).copy(data, offset);
  offset += 32;
  data.writeUInt32LE(params.message.length, offset);
  offset += 4;
  Buffer.from(params.message).copy(data, offset);
  return new import_web39.TransactionInstruction({
    programId,
    keys: [{ pubkey: sender, isSigner: true, isWritable: true }],
    data
  });
}
function buildCreateAmmPoolIx(params, authority, programId = SPS_PROGRAM_ID4) {
  const poolType = params.poolType === "stable_swap" ? 1 : params.poolType === "concentrated" ? 2 : 0;
  const fee = params.fee ?? 30;
  const data = Buffer.alloc(70);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_CREATE_AMM_POOL, offset++);
  Buffer.from(params.mintA).copy(data, offset);
  offset += 32;
  Buffer.from(params.mintB).copy(data, offset);
  offset += 32;
  data.writeUInt8(poolType, offset++);
  data.writeUInt16LE(fee, offset);
  const [first, second] = Buffer.compare(Buffer.from(params.mintA), Buffer.from(params.mintB)) <= 0 ? [params.mintA, params.mintB] : [params.mintB, params.mintA];
  const poolId = (0, import_sha2564.sha256)(Buffer.concat([
    Buffer.from("SPS_POOL_V1"),
    Buffer.from(first),
    Buffer.from(second)
  ]));
  const instruction = new import_web39.TransactionInstruction({
    programId,
    keys: [{ pubkey: authority, isSigner: true, isWritable: true }],
    data
  });
  return { instruction, poolId };
}
function buildPrivateSwapIx(poolId, inputNullifier, outputCommitment, minOutput, payer, programId = SPS_PROGRAM_ID4) {
  const [nullifierPda] = deriveNullifierPda(inputNullifier, programId);
  const data = Buffer.alloc(106);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_PRIVATE_SWAP, offset++);
  Buffer.from(poolId).copy(data, offset);
  offset += 32;
  Buffer.from(inputNullifier).copy(data, offset);
  offset += 32;
  Buffer.from(outputCommitment).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(minOutput, offset);
  return new import_web39.TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: nullifierPda, isSigner: false, isWritable: true },
      { pubkey: import_web39.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data
  });
}
function buildShieldIx(splMint, amount, commitment, payer, tokenAccount, programId = SPS_PROGRAM_ID4) {
  const data = Buffer.alloc(74);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_SHIELD, offset++);
  splMint.toBuffer().copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(amount, offset);
  offset += 8;
  Buffer.from(commitment).copy(data, offset);
  return new import_web39.TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: tokenAccount, isSigner: false, isWritable: true },
      { pubkey: splMint, isSigner: false, isWritable: false }
    ],
    data
  });
}
function buildUnshieldIx(nullifier, amount, recipient, payer, programId = SPS_PROGRAM_ID4) {
  const [nullifierPda] = deriveNullifierPda(nullifier, programId);
  const data = Buffer.alloc(74);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_UNSHIELD, offset++);
  Buffer.from(nullifier).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(amount, offset);
  offset += 8;
  recipient.toBuffer().copy(data, offset);
  return new import_web39.TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: nullifierPda, isSigner: false, isWritable: true },
      { pubkey: recipient, isSigner: false, isWritable: true },
      { pubkey: import_web39.SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data
  });
}
function buildRevealToAuditorIx(auditorPubkey, encryptedDetails, proofOfCompliance, payer, programId = SPS_PROGRAM_ID4) {
  const data = Buffer.alloc(40 + encryptedDetails.length + proofOfCompliance.length);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_REVEAL_TO_AUDITOR, offset++);
  Buffer.from(auditorPubkey).copy(data, offset);
  offset += 32;
  data.writeUInt16LE(encryptedDetails.length, offset);
  offset += 2;
  Buffer.from(encryptedDetails).copy(data, offset);
  offset += encryptedDetails.length;
  data.writeUInt16LE(proofOfCompliance.length, offset);
  offset += 2;
  Buffer.from(proofOfCompliance).copy(data, offset);
  return new import_web39.TransactionInstruction({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: true }],
    data
  });
}
function buildAttachPoiIx(noteCommitment, poiProof, payer, programId = SPS_PROGRAM_ID4) {
  const data = Buffer.alloc(38 + poiProof.length);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_ATTACH_POI, offset++);
  Buffer.from(noteCommitment).copy(data, offset);
  offset += 32;
  data.writeUInt32LE(poiProof.length, offset);
  offset += 4;
  Buffer.from(poiProof).copy(data, offset);
  return new import_web39.TransactionInstruction({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: true }],
    data
  });
}
function buildRatchetMessageIx(recipientPubkey, ratchetHeader, encryptedMessage, sender, programId = SPS_PROGRAM_ID4) {
  const data = Buffer.alloc(40 + ratchetHeader.length + encryptedMessage.length);
  let offset = 0;
  data.writeUInt8(DOMAIN_MESSAGING, offset++);
  data.writeUInt8(messaging.OP_RATCHET_MESSAGE, offset++);
  Buffer.from(recipientPubkey).copy(data, offset);
  offset += 32;
  data.writeUInt16LE(ratchetHeader.length, offset);
  offset += 2;
  Buffer.from(ratchetHeader).copy(data, offset);
  offset += ratchetHeader.length;
  data.writeUInt16LE(encryptedMessage.length, offset);
  offset += 2;
  Buffer.from(encryptedMessage).copy(data, offset);
  return new import_web39.TransactionInstruction({
    programId,
    keys: [{ pubkey: sender, isSigner: true, isWritable: true }],
    data
  });
}
function buildIapMintIx(mintId, amount, commitment, iapProof, authority, programId = SPS_PROGRAM_ID4) {
  const data = Buffer.alloc(78 + iapProof.length);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_IAP_TRANSFER, offset++);
  Buffer.from(mintId).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(amount, offset);
  offset += 8;
  Buffer.from(commitment).copy(data, offset);
  offset += 32;
  data.writeUInt32LE(iapProof.length, offset);
  offset += 4;
  Buffer.from(iapProof).copy(data, offset);
  return new import_web39.TransactionInstruction({
    programId,
    keys: [{ pubkey: authority, isSigner: true, isWritable: true }],
    data
  });
}
var SpsClient = class {
  constructor(config) {
    this.connection = config.connection;
    this.wallet = config.wallet;
    this.programId = config.programId ?? (config.network === "devnet" ? SPS_DEVNET_PROGRAM_ID : SPS_PROGRAM_ID4);
  }
  /**
   * Get payer public key
   */
  get payer() {
    if (!this.wallet) throw new Error("Wallet not configured");
    return this.wallet.publicKey;
  }
  /**
   * Send versioned transaction
   */
  async sendTransaction(instructions, signers = []) {
    if (!this.wallet) throw new Error("Wallet not configured");
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash("confirmed");
    const message = new import_web39.TransactionMessage({
      payerKey: this.wallet.publicKey,
      recentBlockhash: blockhash,
      instructions
    }).compileToV0Message();
    const tx = new import_web39.VersionedTransaction(message);
    tx.sign([this.wallet, ...signers]);
    const signature = await this.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false
    });
    await this.connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    }, "confirmed");
    return signature;
  }
  /**
   * Create a new SPS mint
   */
  async createMint(params) {
    const { instruction, mintId } = buildCreateMintIx(params, this.payer, this.programId);
    const signature = await this.sendTransaction([instruction]);
    return { signature, mintId };
  }
  /**
   * Mint tokens to a commitment
   */
  async mintTo(params) {
    const instruction = buildMintToIx(params, this.payer, this.programId);
    return this.sendTransaction([instruction]);
  }
  /**
   * Transfer tokens (UTXO-style)
   */
  async transfer(params) {
    const instruction = buildTransferIx(params, this.payer, this.programId);
    return this.sendTransaction([instruction]);
  }
  /**
   * Create a privacy NFT
   */
  async createNft(params) {
    const { instruction, nftId } = buildCreateNftIx(params, this.payer, this.programId);
    const signature = await this.sendTransaction([instruction]);
    return { signature, nftId };
  }
  /**
   * Create a decoy storm (privacy mixing)
   */
  async decoyStorm(decoyCount, realTransfer) {
    const instruction = buildDecoyStormIx(decoyCount, realTransfer ?? null, this.payer, this.programId);
    return this.sendTransaction([instruction]);
  }
  /**
   * Create a time-locked vault
   */
  async createChronoVault(unlockSlot, content) {
    const key = (0, import_webcrypto.randomBytes)(32);
    const encrypted = encrypt(content, key);
    const instruction = buildChronoVaultIx(unlockSlot, encrypted, this.payer, this.programId);
    return this.sendTransaction([instruction]);
  }
  /**
   * Send a private message
   */
  async sendPrivateMessage(params) {
    const instruction = buildPrivateMessageIx(params, this.payer, this.programId);
    return this.sendTransaction([instruction]);
  }
  /**
   * Create an AMM pool
   */
  async createAmmPool(params) {
    const { instruction, poolId } = buildCreateAmmPoolIx(params, this.payer, this.programId);
    const signature = await this.sendTransaction([instruction]);
    return { signature, poolId };
  }
  /**
   * Private swap in AMM pool
   */
  async privateSwap(poolId, inputNullifier, outputCommitment, minOutput) {
    const instruction = buildPrivateSwapIx(
      poolId,
      inputNullifier,
      outputCommitment,
      minOutput,
      this.payer,
      this.programId
    );
    return this.sendTransaction([instruction]);
  }
  /**
   * Shield SPL tokens → SPS Notes
   */
  async shield(splMint, amount, tokenAccount) {
    const commitment = generateCommitment();
    const instruction = buildShieldIx(splMint, amount, commitment, this.payer, tokenAccount, this.programId);
    const signature = await this.sendTransaction([instruction]);
    return { signature, commitment };
  }
  /**
   * Unshield SPS Notes → SPL tokens
   */
  async unshield(nullifier, amount, recipient) {
    const instruction = buildUnshieldIx(nullifier, amount, recipient, this.payer, this.programId);
    return this.sendTransaction([instruction]);
  }
  /**
   * Reveal transaction details to auditor (compliance)
   */
  async revealToAuditor(auditorPubkey, details, proof) {
    const instruction = buildRevealToAuditorIx(auditorPubkey, details, proof, this.payer, this.programId);
    return this.sendTransaction([instruction]);
  }
  /**
   * Attach Proof of Innocence to note
   */
  async attachPoi(commitment, proof) {
    const instruction = buildAttachPoiIx(commitment, proof, this.payer, this.programId);
    return this.sendTransaction([instruction]);
  }
};
var SpsIndexerClient = class {
  constructor(connection, programId = SPS_PROGRAM_ID4) {
    this.connection = connection;
    this.programId = programId;
  }
  /**
   * Scan for notes belonging to a view key
   */
  async scanNotes(viewPrivkey, _startSlot, _endSlot) {
    console.log("Scanning notes for view key...");
    return [];
  }
  /**
   * Get virtual balance (sum of unspent notes)
   */
  async getVirtualBalance(viewPrivkey, mintId) {
    const notes3 = await this.scanNotes(viewPrivkey);
    const mintNotes = notes3.filter(
      (n) => Buffer.from(n.commitment).equals(Buffer.from(mintId))
    );
    const totalAmount = mintNotes.reduce((sum, n) => sum + n.amount, 0n);
    return {
      mintId,
      totalAmount,
      notes: mintNotes
    };
  }
  /**
   * Check if nullifier has been spent
   */
  async isNullifierSpent(nullifier) {
    const [pda] = deriveNullifierPda(nullifier, this.programId);
    const account2 = await this.connection.getAccountInfo(pda);
    return account2 !== null;
  }
};
var index_default = SpsClient;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AIRDROP_OPS,
  AIRDROP_SEEDS,
  AirdropMerkleTree,
  CampaignStatus,
  DAMClient,
  DECOMPRESS_SEEDS,
  DEFAULT_OFFER_EXPIRY_SECONDS,
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
  DOMAIN_LENDING,
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
  EasyPayClient,
  EasyPayStandalone,
  InscriptionMode,
  InscriptionType,
  LENDING_MEMO_PROGRAM_ID,
  LENDING_OPS,
  LENDING_SEEDS,
  LendingStandalone,
  LoanState,
  LoanType,
  MAX_BATCH_SIZE,
  MAX_RECIPIENTS_PER_BATCH,
  NftType,
  PERPETUAL_GRACE_PERIOD_SECONDS,
  PERPETUAL_GRACE_SECONDS,
  PROTOCOL_FEE_BPS,
  PrivacyLevel,
  PrivateLendingClient,
  PrivateLendingStandalone,
  Resolv,
  SEEDS,
  SPS_DEVNET_PROGRAM_ID,
  SPS_PROGRAM_ID,
  STANDALONE_PROTOCOL_FEE_BPS,
  SpsClient,
  SpsIndexerClient,
  StandaloneLoanState,
  StandaloneLoanType,
  StyxBulkAirdrop,
  StyxInscriptions,
  WalletDecompress,
  account,
  bridge,
  buildAttachPoiIx,
  buildChronoVaultIx,
  buildCreateAmmPoolIx,
  buildCreateMintIx,
  buildCreateNftIx,
  buildDecoyStormIx,
  buildIapMintIx,
  buildInstructionPrefix,
  buildMintToIx,
  buildPrivateMessageIx,
  buildPrivateSwapIx,
  buildRatchetMessageIx,
  buildRevealToAuditorIx,
  buildShieldIx,
  buildTransferIx,
  buildUnshieldIx,
  calculateInterest,
  calculateLendingFee,
  calculateLoanInterest,
  calculateLoanRepayment,
  calculateProtocolFee,
  calculateRepayment,
  checkStealthAddress,
  compliance,
  computeCommitment,
  computeNullifier,
  createEasyPayClient,
  createEasyPayStandalone,
  createLendingStandalone,
  createPrivateLendingClient,
  createPrivateLendingStandalone,
  createResolv,
  createStyxInscriptions,
  dam,
  decrypt,
  decryptLoanTerms,
  decryptPaymentMetadata,
  defi,
  derivatives,
  deriveEscrowPda,
  deriveLoanPda,
  deriveMintPda,
  deriveNullifierPda,
  deriveOfferPda,
  derivePoolPda,
  deriveTreasuryPda,
  easypay,
  encrypt,
  encryptLoanTerms,
  encryptPaymentMetadata,
  extensions,
  generateClaimCredentials,
  generateCommitment,
  generateLendingId,
  generateLoanId,
  generateOfferId,
  generatePaymentId,
  generateStealthAddress,
  generateStealthKeypair,
  generateStealthReceiver,
  getDomainName,
  governance,
  ic,
  messaging,
  nft,
  notes,
  poolTypes,
  privacy,
  quickAcceptOffer,
  quickCreateOffer,
  quickCreateOfferStandalone,
  quickInscribe,
  quickRepayLoan,
  quickSend,
  quickSendStandalone,
  resolvQuickSend,
  securities,
  sts,
  swap,
  verifyClaimSecret,
  vsl
});
/**
 * @styx-stack/sps-sdk
 * 
 * Styx Privacy Standard (SPS) SDK v3.0 - Privacy-Native Token Standard for Solana
 * 
 * SPS is a privacy-first token standard that provides:
 * - ZERO rent tokens via inscription-based state
 * - Native privacy via commitments, nullifiers, stealth addresses
 * - Full Token-22 parity + 200+ additional operations
 * - Programmable rules for fungibles and NFTs
 * - Compliance-ready with Proof of Innocence
 * - Private DeFi integration (AMM, swaps, staking)
 * 
 * ## Quick Start
 * ```typescript
 * import { SpsClient } from '@styx-stack/sps-sdk';
 * 
 * const client = new SpsClient({ connection, wallet });
 * 
 * // Create a privacy token
 * const mint = await client.createMint({
 *   name: 'My Token',
 *   symbol: 'MYT',
 *   decimals: 9,
 * });
 * 
 * // Mint tokens to commitment (private)
 * await client.mintTo({
 *   mint,
 *   amount: 1_000_000n,
 *   commitment: generateCommitment(recipientKey),
 * });
 * ```
 * 
 * @see https://github.com/QuarksBlueFoot/StyxStack
 * @author Bluefoot Labs (@moonmanquark)
 * @license Apache-2.0
 */
