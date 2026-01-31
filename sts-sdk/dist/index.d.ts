import { PublicKey, Connection, TransactionInstruction, Keypair } from '@solana/web3.js';

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

/** Mainnet Program ID */
declare const STYX_PMP_PROGRAM_ID: PublicKey;
/** Devnet Program ID */
declare const STYX_PMP_DEVNET_PROGRAM_ID: PublicKey;
declare const TAG_HASHLOCK_COMMIT = 14;
declare const TAG_HASHLOCK_REVEAL = 15;
declare const TAG_CONDITIONAL_COMMIT = 16;
declare const TAG_BATCH_SETTLE = 17;
declare const TAG_STATE_CHANNEL_OPEN = 18;
declare const TAG_STATE_CHANNEL_CLOSE = 19;
declare const TAG_TIME_CAPSULE = 20;
declare const TAG_GHOST_PDA = 21;
declare const TAG_CPI_INSCRIBE = 22;
declare const TAG_VTA_DELEGATE = 23;
declare const TAG_VTA_REVOKE = 24;
declare const TAG_STEALTH_SWAP_INIT = 25;
declare const TAG_STEALTH_SWAP_EXEC = 26;
declare const TAG_VTA_GUARDIAN_SET = 27;
declare const TAG_VTA_GUARDIAN_RECOVER = 28;
declare const TAG_PRIVATE_SUBSCRIPTION = 29;
declare const TAG_MULTIPARTY_VTA_INIT = 30;
declare const TAG_MULTIPARTY_VTA_SIGN = 31;
declare const TAG_VSL_DEPOSIT = 32;
declare const TAG_VSL_WITHDRAW = 33;
declare const TAG_VSL_PRIVATE_TRANSFER = 34;
declare const TAG_VSL_PRIVATE_SWAP = 35;
declare const TAG_VSL_SHIELDED_SEND = 36;
declare const TAG_VSL_SPLIT = 37;
declare const TAG_VSL_MERGE = 38;
declare const TAG_VSL_ESCROW_CREATE = 39;
declare const TAG_VSL_ESCROW_RELEASE = 40;
declare const TAG_VSL_ESCROW_REFUND = 41;
declare const TAG_VSL_BALANCE_PROOF = 42;
declare const TAG_VSL_AUDIT_REVEAL = 43;
declare const TAG_DECOY_STORM = 44;
declare const TAG_DECOY_REVEAL = 45;
declare const TAG_EPHEMERAL_CREATE = 46;
declare const TAG_EPHEMERAL_DRAIN = 47;
declare const TAG_CHRONO_LOCK = 48;
declare const TAG_CHRONO_REVEAL = 49;
declare const TAG_SHADOW_FOLLOW = 50;
declare const TAG_SHADOW_UNFOLLOW = 51;
declare const TAG_PHANTOM_NFT_COMMIT = 52;
declare const TAG_PHANTOM_NFT_PROVE = 53;
declare const TAG_INNOCENCE_MINT = 54;
declare const TAG_INNOCENCE_VERIFY = 55;
declare const TAG_INNOCENCE_REVOKE = 56;
declare const TAG_CLEAN_SOURCE_REGISTER = 57;
declare const TAG_CLEAN_SOURCE_PROVE = 58;
declare const TAG_TEMPORAL_INNOCENCE = 59;
declare const TAG_COMPLIANCE_CHANNEL_OPEN = 60;
declare const TAG_COMPLIANCE_CHANNEL_REPORT = 61;
declare const TAG_PROVENANCE_COMMIT = 62;
declare const TAG_PROVENANCE_EXTEND = 63;
declare const TAG_PROVENANCE_VERIFY = 64;
declare const TAG_NOTE_MINT = 80;
declare const TAG_NOTE_TRANSFER = 81;
declare const TAG_NOTE_MERGE = 82;
declare const TAG_NOTE_SPLIT = 83;
declare const TAG_NOTE_BURN = 84;
declare const TAG_GPOOL_DEPOSIT = 85;
declare const TAG_GPOOL_WITHDRAW = 86;
declare const TAG_GPOOL_WITHDRAW_STEALTH = 87;
declare const TAG_GPOOL_WITHDRAW_SWAP = 88;
declare const TAG_MERKLE_UPDATE = 89;
declare const TAG_MERKLE_EMERGENCY = 90;
declare const TAG_NOTE_EXTEND = 91;
declare const TAG_NOTE_FREEZE = 92;
declare const TAG_NOTE_THAW = 93;
declare const TAG_PROTOCOL_PAUSE = 94;
declare const TAG_PROTOCOL_UNPAUSE = 95;
declare const TAG_GROUP_CREATE = 96;
declare const TAG_GROUP_ADD_MEMBER = 97;
declare const TAG_GROUP_REMOVE_MEMBER = 98;
declare const TAG_HOOK_REGISTER = 99;
declare const TAG_HOOK_EXECUTE = 100;
declare const TAG_WRAP_SPL = 101;
declare const TAG_UNWRAP_SPL = 102;
declare const TAG_INTEREST_ACCRUE = 103;
declare const TAG_INTEREST_CLAIM = 104;
declare const TAG_CONFIDENTIAL_MINT = 105;
declare const TAG_CONFIDENTIAL_TRANSFER = 106;
declare const TAG_NFT_MINT = 107;
declare const TAG_COLLECTION_CREATE = 108;
declare const TAG_ROYALTY_CLAIM = 109;
declare const TAG_FAIR_LAUNCH_COMMIT = 110;
declare const TAG_FAIR_LAUNCH_REVEAL = 111;
declare const TAG_NFT_LIST = 112;
declare const TAG_NFT_DELIST = 113;
declare const TAG_NFT_BUY = 114;
declare const TAG_NFT_OFFER = 115;
declare const TAG_NFT_ACCEPT_OFFER = 116;
declare const TAG_NFT_CANCEL_OFFER = 117;
declare const TAG_AUCTION_CREATE = 118;
declare const TAG_AUCTION_BID = 119;
declare const TAG_AUCTION_SETTLE = 120;
declare const TAG_AUCTION_CANCEL = 121;
declare const TAG_PPV_CREATE = 122;
declare const TAG_PPV_VERIFY = 123;
declare const TAG_PPV_REDEEM = 124;
declare const TAG_PPV_TRANSFER = 125;
declare const TAG_PPV_EXTEND = 126;
declare const TAG_PPV_REVOKE = 127;
declare const TAG_APB_TRANSFER = 128;
declare const TAG_APB_BATCH = 129;
declare const TAG_STEALTH_SCAN_HINT = 130;
declare const TAG_ADAPTER_REGISTER = 131;
declare const TAG_ADAPTER_CALL = 132;
declare const TAG_ADAPTER_CALLBACK = 133;
declare const TAG_PRIVATE_SWAP = 134;
declare const TAG_PRIVATE_STAKE = 135;
declare const TAG_PRIVATE_UNSTAKE = 136;
declare const TAG_PRIVATE_LP_ADD = 137;
declare const TAG_PRIVATE_LP_REMOVE = 138;
declare const TAG_POOL_CREATE = 139;
declare const TAG_POOL_DEPOSIT = 140;
declare const TAG_POOL_WITHDRAW = 141;
declare const TAG_POOL_DONATE = 142;
declare const TAG_YIELD_VAULT_CREATE = 143;
declare const TAG_YIELD_DEPOSIT = 144;
declare const TAG_YIELD_CLAIM = 145;
declare const TAG_YIELD_WITHDRAW = 146;
declare const TAG_TOKEN_CREATE = 147;
declare const TAG_TOKEN_SET_AUTHORITY = 148;
declare const TAG_TOKEN_METADATA_SET = 149;
declare const TAG_TOKEN_METADATA_UPDATE = 150;
declare const TAG_HOOK_EXECUTE_REAL = 151;
declare const TAG_CONFIDENTIAL_TRANSFER_V2 = 152;
declare const TAG_INTEREST_CLAIM_REAL = 153;
declare const TAG_ROYALTY_CLAIM_REAL = 154;
declare const TAG_BATCH_NOTE_OPS = 155;
declare const TAG_EXCHANGE_PROOF = 156;
declare const TAG_SELECTIVE_DISCLOSURE = 157;
declare const TAG_CONDITIONAL_TRANSFER = 158;
declare const TAG_DELEGATION_CHAIN = 159;
declare const TAG_TIME_LOCKED_REVEAL = 160;
declare const TAG_CROSS_MINT_ATOMIC = 161;
declare const TAG_SOCIAL_RECOVERY = 162;
declare const TAG_JUPITER_ROUTE = 163;
declare const TAG_MARINADE_STAKE = 164;
declare const TAG_DRIFT_PERP = 165;
declare const TAG_PRIVATE_LENDING = 166;
declare const TAG_FLASH_LOAN = 167;
declare const TAG_ORACLE_BOUND = 168;
declare const TAG_VELOCITY_LIMIT = 169;
declare const TAG_GOVERNANCE_LOCK = 170;
declare const TAG_REPUTATION_GATE = 171;
declare const TAG_GEO_RESTRICTION = 172;
declare const TAG_TIME_DECAY = 173;
declare const TAG_MULTI_SIG_NOTE = 174;
declare const TAG_RECOVERABLE_NOTE = 175;
declare const TAG_AMM_POOL_CREATE = 176;
declare const TAG_AMM_ADD_LIQUIDITY = 177;
declare const TAG_AMM_REMOVE_LIQUIDITY = 178;
declare const TAG_AMM_SWAP = 179;
declare const TAG_AMM_QUOTE = 180;
declare const TAG_AMM_SYNC = 181;
declare const TAG_LP_NOTE_MINT = 182;
declare const TAG_LP_NOTE_BURN = 183;
declare const TAG_ROUTER_SWAP = 184;
declare const TAG_ROUTER_SPLIT = 185;
declare const TAG_LIMIT_ORDER_PLACE = 186;
declare const TAG_LIMIT_ORDER_FILL = 187;
declare const TAG_LIMIT_ORDER_CANCEL = 188;
declare const TAG_TWAP_ORDER_START = 189;
declare const TAG_TWAP_ORDER_FILL = 190;
declare const TAG_CONCENTRATED_LP = 191;
declare const TAG_NULLIFIER_CREATE = 192;
declare const TAG_NULLIFIER_CHECK = 193;
declare const TAG_MERKLE_ROOT_PUBLISH = 194;
declare const TAG_MERKLE_PROOF_VERIFY = 195;
declare const TAG_BALANCE_ATTEST = 196;
declare const TAG_BALANCE_VERIFY = 197;
declare const TAG_FREEZE_ENFORCED = 198;
declare const TAG_THAW_GOVERNED = 199;
declare const TAG_WRAPPER_MINT = 200;
declare const TAG_WRAPPER_BURN = 201;
declare const TAG_VALIDATOR_PROOF = 202;
declare const TAG_SECURITY_AUDIT = 203;
declare const TAG_COMPLIANCE_PROOF = 204;
declare const TAG_DECENTRALIZATION_METRIC = 205;
declare const TAG_ATOMIC_CPI_TRANSFER = 206;
declare const TAG_BATCH_NULLIFIER = 207;
declare const TAG_NULLIFIER_INSCRIBE = 208;
declare const TAG_MERKLE_AIRDROP_ROOT = 209;
declare const TAG_MERKLE_AIRDROP_CLAIM = 210;
declare const TAG_SECURITY_ISSUE = 211;
declare const TAG_SECURITY_TRANSFER = 212;
declare const TAG_TRANSFER_AGENT_REGISTER = 213;
declare const TAG_TRANSFER_AGENT_APPROVE = 214;
declare const TAG_ACCREDITATION_PROOF = 215;
declare const TAG_SHARE_CLASS_CREATE = 216;
declare const TAG_CORPORATE_ACTION = 217;
declare const TAG_REG_D_LOCKUP = 218;
declare const TAG_INSTITUTIONAL_REPORT = 219;
declare const TAG_SECURITY_FREEZE = 220;
declare const TAG_OPTION_WRITE = 221;
declare const TAG_OPTION_BUY = 222;
declare const TAG_OPTION_EXERCISE = 223;
declare const TAG_OPTION_EXPIRE = 224;
declare const TAG_OPTION_ASSIGN = 225;
declare const TAG_OPTION_CLOSE = 226;
declare const TAG_OPTION_COLLATERAL_LOCK = 227;
declare const TAG_OPTION_COLLATERAL_RELEASE = 228;
declare const TAG_OPTION_SERIES_CREATE = 229;
declare const TAG_OPTION_MARKET_MAKE = 230;
declare const TAG_MARGIN_ACCOUNT_CREATE = 231;
declare const TAG_MARGIN_DEPOSIT = 232;
declare const TAG_MARGIN_WITHDRAW = 233;
declare const TAG_POSITION_OPEN = 234;
declare const TAG_POSITION_CLOSE = 235;
declare const TAG_POSITION_LIQUIDATE = 236;
declare const TAG_MARGIN_CALL_EMIT = 237;
declare const TAG_FUNDING_RATE_APPLY = 238;
declare const TAG_CROSS_MARGIN_SYNC = 239;
declare const TAG_INSURANCE_FUND_CONTRIBUTE = 240;
declare const TAG_BRIDGE_LOCK = 241;
declare const TAG_BRIDGE_RELEASE = 242;
declare const TAG_BRIDGE_BURN = 243;
declare const TAG_BRIDGE_MINT = 244;
declare const TAG_WORMHOLE_VAA_VERIFY = 245;
declare const TAG_LAYERZERO_ENDPOINT = 246;
declare const TAG_IBC_PACKET_RECV = 247;
declare const TAG_IBC_PACKET_ACK = 248;
declare const TAG_BTC_SPV_PROOF = 249;
declare const TAG_BTC_RELAY_SUBMIT = 250;
declare const TAG_ETH_STATE_PROOF = 251;
declare const TAG_BRIDGE_FEE_COLLECT = 252;
declare const TAG_BRIDGE_GUARDIAN_ROTATE = 253;
declare const TAG_BRIDGE_PAUSE = 254;
declare const TAG_BRIDGE_RESUME = 255;
declare const POOL_TYPE_CONSTANT_PRODUCT = 0;
declare const POOL_TYPE_STABLE_SWAP = 1;
declare const POOL_TYPE_CONCENTRATED = 2;
declare const EXT_TRANSFER_FEE = 1;
declare const EXT_ROYALTY = 2;
declare const EXT_INTEREST = 3;
declare const EXT_VESTING = 4;
declare const EXT_DELEGATION = 5;
declare const EXT_SOULBOUND = 6;
declare const EXT_FROZEN = 7;
declare const EXT_METADATA = 8;
declare const EXT_HOOK = 9;
declare const EXT_GROUP = 10;
declare const EXT_MEMBER = 11;
declare const EXT_CPI_GUARD = 12;
declare const EXT_REQUIRED_MEMO = 13;
declare const EXT_DEFAULT_FROZEN = 14;
declare const EXT_SCALED_BALANCE = 15;
declare const EXT_CONFIDENTIAL = 16;
declare const EXT_PROGRAMMABLE = 17;
declare const EXT_NFT_LISTING = 18;
declare const EXT_AUCTION = 19;
declare const EXT_PPV = 20;
declare const EXT_ADAPTER = 21;
declare const EXT_POOL = 22;
declare const EXT_YIELD = 23;
declare const EXT_ORACLE_BOUND = 24;
declare const EXT_TIME_DECAY = 25;
declare const EXT_GOVERNANCE_LOCK = 26;
declare const EXT_REPUTATION = 27;
declare const EXT_GEOGRAPHIC = 28;
declare const EXT_VELOCITY_LIMIT = 29;
declare const EXT_MULTI_SIG = 30;
declare const EXT_RECOVERABLE = 31;
declare const EXT_CONDITIONAL = 32;
declare const EXT_DELEGATION_CHAIN = 33;
declare const ADAPTER_JUPITER = 1;
declare const ADAPTER_MARINADE = 2;
declare const ADAPTER_RAYDIUM = 3;
declare const ADAPTER_DRIFT = 4;
declare const ADAPTER_CUSTOM = 255;
declare const AUCTION_ENGLISH = 1;
declare const AUCTION_DUTCH = 2;
declare const AUCTION_SEALED = 4;
declare const TRUST_INDEXER = 0;
declare const TRUST_NULLIFIER_PDA = 1;
declare const TRUST_MERKLE_PROOF = 2;
interface StyxMessage {
    signature: string;
    payload: Uint8Array;
    timestamp: number | null;
}
interface MessageOptions {
    stealth?: boolean;
    compliance?: boolean;
}
type RevealType = 'full' | 'amount' | 'recipient' | 'metadata';
interface NftListingOptions {
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
interface AuctionOptions {
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
interface PPVOptions {
    /** Note nullifier being wrapped */
    noteNullifier: Uint8Array;
    /** Amount (blinded in commitment) */
    amount: bigint;
    /** Allowed programs that can consume the PPV */
    allowedPrograms?: PublicKey[];
    /** Expiry slot */
    expiry?: number;
}
interface APBTransferOptions {
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
interface AdapterCallOptions {
    /** Registered adapter ID */
    adapterId: Uint8Array;
    /** PPV to use as input */
    ppvId: Uint8Array;
    /** Action code (adapter-specific) */
    action: number;
    /** Action parameters */
    params: bigint;
}
interface PrivateSwapOptions {
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
interface PoolOptions {
    /** Token mint for the pool */
    mint: PublicKey;
    /** Initial deposit amount */
    initialDeposit?: bigint;
    /** Pool configuration flags */
    flags?: number;
}
interface YieldVaultOptions {
    /** Underlying token mint */
    underlyingMint: PublicKey;
    /** Expected APY in basis points */
    apyBps?: number;
    /** External yield source (e.g., Marinade) */
    yieldSource?: PublicKey;
}
interface TokenMetadata {
    /** Token name (max 32 chars) */
    name: string;
    /** Token symbol (max 10 chars) */
    symbol: string;
    /** Metadata URI */
    uri?: string;
    /** Token decimals */
    decimals: number;
}
interface TokenCreateOptions {
    /** Token metadata */
    metadata: TokenMetadata;
    /** Configuration flags */
    flags?: number;
}
interface SecurityIssueOptions {
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
interface SecurityTransferOptions {
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
interface TransferAgentOptions {
    /** Security token ID */
    securityId: Uint8Array;
    /** Transfer agent public key */
    agentPubkey: Uint8Array;
    /** Issuer authorization signature */
    issuerSig: Uint8Array;
    /** Agent permissions bitmap */
    permissions?: number;
}
interface OptionCreateOptions {
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
interface OptionExerciseOptions {
    /** Option contract ID */
    optionId: Uint8Array;
    /** Ownership proof */
    ownershipProof: Uint8Array;
    /** Exercise amount */
    amount: bigint;
    /** Settlement preference: 0=physical, 1=cash */
    settlementType?: number;
}
interface OptionSettleOptions {
    /** Option contract ID */
    optionId: Uint8Array;
    /** Oracle price attestation */
    oracleSig: Uint8Array;
    /** Settlement price */
    settlementPrice: bigint;
    /** PnL proof */
    pnlProof: Uint8Array;
}
interface MarginAccountOptions {
    /** Account identifier */
    accountId: Uint8Array;
    /** Initial margin requirement (basis points) */
    initialMarginBps: number;
    /** Maintenance margin (basis points) */
    maintenanceMarginBps: number;
    /** Maximum leverage (e.g., 10 = 10x) */
    maxLeverage: number;
}
interface MarginPositionOptions {
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
interface LiquidationOptions {
    /** Position ID to liquidate */
    positionId: Uint8Array;
    /** Oracle price attestation */
    oracleSig: Uint8Array;
    /** Current price */
    currentPrice: bigint;
    /** Liquidator reward (basis points) */
    liquidatorRewardBps?: number;
}
interface BridgeLockOptions {
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
interface BridgeReleaseOptions {
    /** Lock ID from source chain */
    lockId: Uint8Array;
    /** Bridge proof (from oracles) */
    bridgeProof: Uint8Array;
    /** Receiver commitment */
    receiverCommit: Uint8Array;
    /** Amount */
    amount: bigint;
}
interface BridgeOracleOptions {
    /** Oracle public key */
    oraclePubkey: Uint8Array;
    /** Supported chain IDs */
    supportedChains: number[];
    /** Stake amount (for slashing) */
    stakeAmount: bigint;
    /** Oracle URL for attestations */
    oracleUrl?: string;
}
declare const CHAIN_SOLANA = 1;
declare const CHAIN_ETHEREUM = 2;
declare const CHAIN_POLYGON = 3;
declare const CHAIN_ARBITRUM = 4;
declare const CHAIN_BASE = 5;
declare const CHAIN_AVALANCHE = 6;
declare const CHAIN_BSC = 7;
/**
 * Encrypt recipient pubkey using Keccak256 XOR mask
 */
declare function encryptRecipient(sender: PublicKey, recipient: PublicKey): Uint8Array;
/**
 * Decrypt recipient pubkey using Keccak256 XOR mask
 */
declare function decryptRecipient(sender: PublicKey, encrypted: Uint8Array): PublicKey;
/**
 * Encrypt transfer amount using Keccak256 XOR mask
 */
declare function encryptAmount(sender: PublicKey, recipient: PublicKey, nonce: Uint8Array, amount: bigint): bigint;
/**
 * Decrypt transfer amount using Keccak256 XOR mask
 */
declare function decryptAmount(sender: PublicKey, recipient: PublicKey, nonce: Uint8Array, encryptedAmount: bigint): bigint;
/**
 * Derive shared secret using X25519 key exchange
 */
declare function deriveSharedSecret(myPrivateKey: Uint8Array, theirPublicKey: Uint8Array): Uint8Array;
/**
 * Generate X25519 keypair for key exchange
 */
declare function generateX25519Keypair(): {
    privateKey: Uint8Array;
    publicKey: Uint8Array;
};
/**
 * Encrypt message with ChaCha20-Poly1305
 */
declare function encryptPayload(message: Uint8Array, sharedSecret: Uint8Array): Uint8Array;
/**
 * Decrypt message with ChaCha20-Poly1305
 */
declare function decryptPayload(encrypted: Uint8Array, sharedSecret: Uint8Array): Uint8Array;
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
declare class StyxPMP {
    connection: Connection;
    programId: PublicKey;
    constructor(connection: Connection, programId?: PublicKey);
    /**
     * Build a private message instruction
     */
    buildPrivateMessageInstruction(sender: PublicKey, recipient: PublicKey, payload: Uint8Array, options?: MessageOptions): TransactionInstruction;
    /**
     * Send a private message
     */
    sendPrivateMessage(sender: Keypair, recipient: PublicKey, message: string | Uint8Array, sharedSecret: Uint8Array, options?: MessageOptions): Promise<string>;
    /**
     * Build a routed message instruction
     */
    buildRoutedMessageInstruction(sender: PublicKey, recipient: PublicKey, routeInfo: Uint8Array, payload: Uint8Array, hopCount: number, currentHop: number): TransactionInstruction;
    /**
     * Send a routed message through multiple hops
     */
    sendRoutedMessage(sender: Keypair, recipient: PublicKey, hops: PublicKey[], message: Uint8Array, sharedSecret: Uint8Array): Promise<string>;
    /**
     * Build a private transfer instruction
     */
    buildPrivateTransferInstruction(sender: PublicKey, recipient: PublicKey, amount: bigint, memo?: Uint8Array): TransactionInstruction;
    /**
     * Send a private SOL transfer
     */
    sendPrivateTransfer(sender: Keypair, recipient: PublicKey, amountSol: number, memo?: string): Promise<string>;
    /**
     * Build a ratchet message instruction
     */
    buildRatchetMessageInstruction(ephemeralPubkey: PublicKey, counter: bigint, ratchetData: Uint8Array, ciphertext: Uint8Array): TransactionInstruction;
    /**
     * Send a forward-secret ratchet message
     */
    sendRatchetMessage(sender: Keypair, ephemeralKeypair: Keypair, counter: bigint, chainKey: Uint8Array, message: Uint8Array, sharedSecret: Uint8Array): Promise<string>;
    /**
     * Submit compliance disclosure
     */
    submitComplianceReveal(sender: Keypair, messageId: Uint8Array, auditor: PublicKey, disclosureKey: Uint8Array, revealType: RevealType): Promise<string>;
    /**
     * Subscribe to incoming messages
     */
    subscribeToMessages(callback: (payload: Uint8Array, signature: string) => void): number;
    /**
     * Unsubscribe from messages
     */
    unsubscribe(subscriptionId: number): Promise<void>;
    /**
     * Get historical messages
     */
    getRecentMessages(limit?: number): Promise<StyxMessage[]>;
}

interface ProposalOptions {
    title: string;
    descriptionHash: Uint8Array;
    votingEndSlot: bigint;
    quorumBps: number;
    isToken22?: boolean;
}
interface VoteOptions {
    proposalId: Uint8Array;
    voterSecret: Uint8Array;
    vote: 'yes' | 'no' | 'abstain';
    weightProof?: Uint8Array;
    isToken22?: boolean;
}
interface VTATransferOptions {
    mint: PublicKey;
    fromSecret: Uint8Array;
    toRecipient: PublicKey;
    toNonce: Uint8Array;
    amount: bigint;
    proof?: Uint8Array;
    isToken22?: boolean;
}
interface ReferralOptions {
    referrer: PublicKey;
    parentChainHash?: Uint8Array;
}
interface ReferralClaimOptions {
    amountClaiming: bigint;
    depth: number;
    proof?: Uint8Array;
}
/** Treasury address for protocol fees */
declare const TREASURY: PublicKey;
/** Protocol fee per operation */
declare const PROTOCOL_FEE_LAMPORTS = 1000000n;
/** Base referral rate: 30% (3000 basis points) */
declare const REFERRAL_BASE_BPS = 3000;
/** Max referral depth (10 levels) */
declare const MAX_REFERRAL_DEPTH = 10;
/**
 * Calculate referral reward at a given depth
 * Level 0: 30%, Level 1: 15%, Level 2: 7.5%, etc.
 */
declare function calculateReferralReward(amount: bigint, depth: number): bigint;
/**
 * Get all rewards in a referral chain
 */
declare function calculateReferralChainRewards(amount: bigint): {
    depth: number;
    bps: number;
    reward: bigint;
}[];
/**
 * StyxGovernance - DAO governance using inscribed state
 */
declare class StyxGovernance {
    private styx;
    constructor(styxPMP: StyxPMP);
    /**
     * Create a DAO proposal (inscribed to logs)
     */
    createProposal(proposer: Keypair, options: ProposalOptions): Promise<string>;
    /**
     * Cast a private vote (nullifier prevents double voting)
     */
    castVote(voter: Keypair, options: VoteOptions): Promise<string>;
}
/**
 * StyxVTA - Virtual Token Accounts (balances inscribed, not stored)
 */
declare class StyxVTA {
    private styx;
    constructor(styxPMP: StyxPMP);
    /**
     * Create VTA deposit (initial balance inscription)
     */
    deposit(sender: Keypair, options: VTATransferOptions): Promise<string>;
    /**
     * Transfer VTA balance (inscribed, nullifier prevents double-spend)
     */
    transfer(sender: Keypair, options: VTATransferOptions): Promise<string>;
}
/**
 * StyxReferral - Inscribed referral tree with progressive rewards
 */
declare class StyxReferral {
    private styx;
    constructor(styxPMP: StyxPMP);
    /**
     * Register a referral (inscribed to chain)
     */
    register(referee: Keypair, options: ReferralOptions): Promise<string>;
    /**
     * Claim referral rewards with merkle proof
     */
    claim(claimer: Keypair, options: ReferralClaimOptions): Promise<string>;
    /**
     * Compute chain hash for a referral registration
     */
    computeChainHash(referrer: PublicKey, referee: PublicKey, parentChainHash: Uint8Array, timestamp: bigint): Uint8Array;
}
/**
 * Build a proposal instruction without signing (for mobile wallets)
 */
declare function buildProposalInstruction(programId: PublicKey, proposer: PublicKey, options: ProposalOptions): TransactionInstruction;
/**
 * Build a vote instruction without signing (for mobile wallets)
 */
declare function buildVoteInstruction(programId: PublicKey, voter: PublicKey, options: VoteOptions): TransactionInstruction;
/**
 * Build a referral registration instruction (for mobile wallets)
 */
declare function buildReferralInstruction(programId: PublicKey, referee: PublicKey, referrer: PublicKey, parentChainHash?: Uint8Array): TransactionInstruction;
declare const CPI_TYPE_GENERIC = 0;
declare const CPI_TYPE_EVENT = 1;
declare const CPI_TYPE_RECEIPT = 2;
declare const CPI_TYPE_ATTESTATION = 3;
declare const GHOST_ACTION_AUTHENTICATE = 0;
declare const GHOST_ACTION_PROVE_MEMBERSHIP = 1;
declare const GHOST_ACTION_VERIFY_SECRET = 2;
declare const GHOST_ACTION_ANONYMOUS_ACCESS = 3;
interface TimeCapsuleOptions {
    unlockSlot: bigint;
    recipient: PublicKey;
    encryptedPayload: Uint8Array;
}
interface GhostPDAOptions {
    secretHash: Uint8Array;
    bump: number;
    actionType: number;
    actionData?: Uint8Array;
}
interface CPIInscribeOptions {
    inscriptionType: number;
    data: Uint8Array;
}
interface HashlockCommitOptions {
    hashlock: Uint8Array;
    commitType: number;
    commitData: Uint8Array;
}
interface HashlockRevealOptions {
    secret: Uint8Array;
    swapCount: number;
}
interface StateChannelOpenOptions {
    channelId: Uint8Array;
    participants: PublicKey[];
    initialState: Uint8Array;
}
interface StateChannelCloseOptions {
    channelId: Uint8Array;
    closeType: 'cooperative' | 'unilateral' | 'dispute';
    finalState: Uint8Array;
    sequence: bigint;
}
interface BatchSettleOptions {
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
declare function deriveGhostPDA(secretHash: Uint8Array, programId?: PublicKey): {
    pda: PublicKey;
    bump: number;
};
/**
 * Encrypt payload for time capsule
 *
 * Key derivation: key = keccak256(unlock_slot || sender_secret || recipient)
 */
declare function deriveTimeCapsuleKey(unlockSlot: bigint, senderSecret: Uint8Array, recipient: PublicKey): Uint8Array;
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
declare function buildTimeCapsuleInstruction(programId: PublicKey, payer: PublicKey, options: TimeCapsuleOptions): TransactionInstruction;
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
declare function buildGhostPDAInstruction(programId: PublicKey, payer: PublicKey, options: GhostPDAOptions): TransactionInstruction;
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
declare function buildCPIInscribeInstruction(programId: PublicKey, caller: PublicKey, options: CPIInscribeOptions): TransactionInstruction;
/**
 * Build a Hashlock Commit instruction
 *
 * Creates an atomic swap commitment secured by a hashlock.
 * The commit can only be executed when the preimage is revealed.
 */
declare function buildHashlockCommitInstruction(programId: PublicKey, payer: PublicKey, options: HashlockCommitOptions): TransactionInstruction;
/**
 * Build a Hashlock Reveal instruction
 *
 * Reveals the preimage to execute pending swaps.
 */
declare function buildHashlockRevealInstruction(programId: PublicKey, payer: PublicKey, options: HashlockRevealOptions): TransactionInstruction;
/**
 * Build a State Channel Open instruction
 *
 * Opens an inscribed state channel for off-chain transactions.
 */
declare function buildStateChannelOpenInstruction(programId: PublicKey, payer: PublicKey, options: StateChannelOpenOptions): TransactionInstruction;
/**
 * Build a State Channel Close instruction
 *
 * Closes a state channel with final state settlement.
 */
declare function buildStateChannelCloseInstruction(programId: PublicKey, payer: PublicKey, options: StateChannelCloseOptions): TransactionInstruction;
/**
 * Build a Batch Settle instruction
 *
 * Settles a batch of off-chain operations with a single merkle root.
 */
declare function buildBatchSettleInstruction(programId: PublicKey, payer: PublicKey, options: BatchSettleOptions): TransactionInstruction;
/**
 * StyxNovel - Helper class for novel primitives
 */
declare class StyxNovel {
    private styx;
    constructor(styxPMP: StyxPMP);
    /**
     * Create a time capsule
     */
    createTimeCapsule(sender: Keypair, recipient: PublicKey, message: Uint8Array, senderSecret: Uint8Array, unlockSlot: bigint): Promise<string>;
    /**
     * Prove knowledge of secret via Ghost PDA
     */
    proveSecretKnowledge(prover: Keypair, secret: Uint8Array, actionType?: number, actionData?: Uint8Array): Promise<string>;
    /**
     * Inscribe data via CPI pattern
     */
    inscribe(caller: Keypair, inscriptionType: number, data: Uint8Array): Promise<string>;
}
declare const PERM_CAN_TRANSFER = 1;
declare const PERM_CAN_MESSAGE = 2;
declare const PERM_CAN_VOTE = 4;
declare const PERM_CAN_SUBDELEGATE = 8;
declare const PERM_REQUIRES_2FA = 16;
declare const REVOKER_OWNER = 0;
declare const REVOKER_DELEGATE = 1;
declare const REVOKER_GUARDIAN = 2;
declare const REVOKE_NORMAL = 0;
declare const REVOKE_COMPROMISED = 1;
declare const REVOKE_EXPIRED = 2;
declare const REVOKE_UPGRADED = 3;
declare const MP_ACTION_TRANSFER = 0;
declare const MP_ACTION_ADD_PARTY = 1;
declare const MP_ACTION_REMOVE_PARTY = 2;
declare const MP_ACTION_CHANGE_THRESHOLD = 3;
declare const MP_ACTION_DELEGATE = 4;
interface VTADelegateOptions {
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
interface VTARevokeOptions {
    delegationId: Uint8Array;
    revokerType: number;
    reason: number;
}
interface StealthSwapInitOptions {
    hashlock: Uint8Array;
    encryptedTerms: Uint8Array;
    timeoutSlot: bigint;
    stealthPubkey: Uint8Array;
    initiatorCommitment: Uint8Array;
    isToken22?: boolean;
}
interface StealthSwapExecOptions {
    swapId: Uint8Array;
    preimage: Uint8Array;
    recipientProof?: Uint8Array;
}
interface VTAGuardianSetOptions {
    vtaMint: PublicKey;
    threshold: number;
    guardians: PublicKey[];
    encryptedShares?: Uint8Array;
}
interface VTAGuardianRecoverOptions {
    guardianSetId: Uint8Array;
    newOwner: PublicKey;
    guardianIndices: number[];
    signatures: Uint8Array[];
    recoveryNonce: bigint;
}
interface PrivateSubscriptionOptions {
    subscriberNullifier: Uint8Array;
    merchantPubkey: PublicKey;
    encryptedTerms: Uint8Array;
    intervalSlots: bigint;
    windowSlots: bigint;
    startSlot: bigint;
    maxPayments: number;
    isToken22?: boolean;
}
interface MultipartyVTAInitOptions {
    mint: PublicKey;
    threshold: number;
    parties: PublicKey[];
    initialBalance: bigint;
    vtaNonce?: Uint8Array;
    isToken22?: boolean;
}
interface MultipartyVTASignOptions {
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
declare function buildVTADelegateInstruction(programId: PublicKey, owner: PublicKey, options: VTADelegateOptions): TransactionInstruction;
/**
 * Build VTA Revoke instruction
 *
 * Revoke a previously issued delegation.
 */
declare function buildVTARevokeInstruction(programId: PublicKey, revoker: PublicKey, options: VTARevokeOptions): TransactionInstruction;
/**
 * Build Stealth Swap Init instruction
 *
 * Initialize a privacy-preserving atomic swap.
 * Amounts are encrypted, counterparty uses stealth address.
 */
declare function buildStealthSwapInitInstruction(programId: PublicKey, initiator: PublicKey, options: StealthSwapInitOptions): TransactionInstruction;
/**
 * Build Stealth Swap Exec instruction
 *
 * Execute a stealth swap by revealing the preimage.
 */
declare function buildStealthSwapExecInstruction(programId: PublicKey, executor: PublicKey, options: StealthSwapExecOptions): TransactionInstruction;
/**
 * Build VTA Guardian Set instruction
 *
 * Set up k-of-n guardians for social recovery.
 * All inscribed - no smart contract wallet needed.
 */
declare function buildVTAGuardianSetInstruction(programId: PublicKey, owner: PublicKey, options: VTAGuardianSetOptions): TransactionInstruction;
/**
 * Build VTA Guardian Recover instruction
 *
 * Recover VTA ownership with k-of-n guardian signatures.
 */
declare function buildVTAGuardianRecoverInstruction(programId: PublicKey, newOwner: PublicKey, options: VTAGuardianRecoverOptions): TransactionInstruction;
/**
 * Build Private Subscription instruction
 *
 * Create a recurring payment subscription with privacy.
 * Perfect for mobile app monetization.
 */
declare function buildPrivateSubscriptionInstruction(programId: PublicKey, subscriber: PublicKey, options: PrivateSubscriptionOptions): TransactionInstruction;
/**
 * Build Multiparty VTA Init instruction
 *
 * Initialize a k-of-n threshold VTA for teams/DAOs.
 */
declare function buildMultipartyVTAInitInstruction(programId: PublicKey, initiator: PublicKey, options: MultipartyVTAInitOptions): TransactionInstruction;
/**
 * Build Multiparty VTA Sign instruction
 *
 * Add a signature to a pending multi-party action.
 */
declare function buildMultipartyVTASignInstruction(programId: PublicKey, signer: PublicKey, options: MultipartyVTASignOptions): TransactionInstruction;
/**
 * StyxDelegation - VTA Delegation management (v4)
 *
 * Mobile-first design: hardware wallet security with phone convenience.
 * Per Solana Mobile standards.
 */
declare class StyxDelegation {
    private styx;
    constructor(styxPMP: StyxPMP);
    /**
     * Delegate VTA spending rights
     */
    delegate(owner: Keypair, options: VTADelegateOptions): Promise<string>;
    /**
     * Revoke a delegation
     */
    revoke(revoker: Keypair, delegationId: Uint8Array, revokerType?: number, reason?: number): Promise<string>;
    /**
     * Compute delegation ID
     */
    computeDelegationId(owner: PublicKey, delegate: PublicKey, mint: PublicKey, nonce: Uint8Array): Uint8Array;
}
/**
 * StyxSwap - Stealth atomic swaps (v4)
 *
 * Privacy-preserving swaps with hidden amounts.
 */
declare class StyxSwap {
    private styx;
    constructor(styxPMP: StyxPMP);
    /**
     * Generate swap secret and hashlock
     */
    generateSwapSecret(): {
        secret: Uint8Array;
        hashlock: Uint8Array;
    };
    /**
     * Encrypt swap terms
     */
    encryptSwapTerms(myMint: PublicKey, myAmount: bigint, theirMint: PublicKey, theirAmount: bigint, sharedSecret: Uint8Array): Uint8Array;
    /**
     * Initialize a stealth swap
     */
    initStealthSwap(initiator: Keypair, options: StealthSwapInitOptions): Promise<string>;
    /**
     * Execute a stealth swap
     */
    executeStealthSwap(executor: Keypair, options: StealthSwapExecOptions): Promise<string>;
}
/**
 * StyxGuardian - Social recovery for VTAs (v4)
 *
 * k-of-n recovery without smart contract wallets.
 */
declare class StyxGuardian {
    private styx;
    constructor(styxPMP: StyxPMP);
    /**
     * Set guardians for a VTA
     */
    setGuardians(owner: Keypair, options: VTAGuardianSetOptions): Promise<string>;
    /**
     * Recover VTA with guardian signatures
     */
    recover(newOwner: Keypair, options: VTAGuardianRecoverOptions): Promise<string>;
    /**
     * Compute guardian set ID
     */
    computeGuardianSetId(vtaMint: PublicKey, owner: PublicKey, threshold: number, guardianCount: number, guardians: PublicKey[]): Uint8Array;
}
/**
 * StyxSubscription - Private recurring payments (v4)
 *
 * Mobile app monetization with privacy.
 */
declare class StyxSubscription {
    private styx;
    constructor(styxPMP: StyxPMP);
    /**
     * Generate subscriber nullifier
     */
    generateSubscriberNullifier(subscriberSecret: Uint8Array): Uint8Array;
    /**
     * Encrypt subscription terms
     */
    encryptSubscriptionTerms(amount: bigint, currency: PublicKey, sharedSecret: Uint8Array): Uint8Array;
    /**
     * Create a subscription
     */
    subscribe(subscriber: Keypair, options: PrivateSubscriptionOptions): Promise<string>;
}
/**
 * StyxMultiparty - k-of-n threshold VTAs (v4)
 *
 * Team/DAO treasuries without accounts.
 */
declare class StyxMultiparty {
    private styx;
    constructor(styxPMP: StyxPMP);
    /**
     * Initialize a multiparty VTA
     */
    initMultipartyVTA(initiator: Keypair, options: MultipartyVTAInitOptions): Promise<string>;
    /**
     * Sign a multiparty action
     */
    signAction(signer: Keypair, options: MultipartyVTASignOptions): Promise<string>;
    /**
     * Compute multiparty VTA ID
     */
    computeMultipartyVTAId(mint: PublicKey, threshold: number, parties: PublicKey[], vtaNonce: Uint8Array): Uint8Array;
    /**
     * Compute action ID for signing
     */
    computeActionId(mpVtaId: Uint8Array, actionType: number, actionData: Uint8Array): Uint8Array;
}
/**
 * STS Extension configuration
 */
interface STSExtension {
    type: 'transfer_fee' | 'royalty' | 'interest' | 'vesting' | 'delegation' | 'soulbound' | 'metadata';
    data: Uint8Array;
}
/**
 * STS Note commitment (UTXO-like token ownership)
 */
interface STSNote {
    commitment: Uint8Array;
    encryptedNote: Uint8Array;
    mint: PublicKey;
    amount: bigint;
    extensions: STSExtension[];
}
/**
 * STS Note mint options
 */
interface STSNoteMintOptions {
    mint: PublicKey;
    amount: bigint;
    ownerSecret: Uint8Array;
    extensions?: STSExtension[];
    trustLevel?: 0 | 1 | 2;
}
/**
 * STS Note transfer options
 */
interface STSNoteTransferOptions {
    nullifier: Uint8Array;
    newCommitment: Uint8Array;
    encryptedAmount: bigint;
    merkleProof?: Uint8Array[];
    trustLevel?: 0 | 1 | 2;
}
/**
 * STS Global Pool deposit options
 */
interface STSDepositOptions {
    mint: PublicKey;
    amount: bigint;
    ownerSecret: Uint8Array;
    extensions?: STSExtension[];
}
/**
 * STS Global Pool withdraw options
 */
interface STSWithdrawOptions {
    nullifier: Uint8Array;
    mint: PublicKey;
    amount: bigint;
    recipient: PublicKey;
    trustLevel?: 0 | 1 | 2;
}
/**
 * STS Stealth withdraw options
 */
interface STSStealthWithdrawOptions {
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
declare class STS {
    private styx;
    constructor(styxPMP: StyxPMP);
    /**
     * Create note commitment from owner secret and amount
     */
    createCommitment(ownerSecret: Uint8Array, amount: bigint, nonce: Uint8Array): Uint8Array;
    /**
     * Create nullifier from note commitment and secret
     */
    createNullifier(noteCommitment: Uint8Array, ownerSecret: Uint8Array): Uint8Array;
    /**
     * Encrypt note data for storage
     */
    encryptNote(ownerSecret: Uint8Array, amount: bigint, nonce: Uint8Array): Uint8Array;
    /**
     * Build extension TLV data
     */
    static ext: {
        transferFee(feeBps: number, maxFee: bigint): STSExtension;
        royalty(recipient: PublicKey, bps: number): STSExtension;
        interest(rateBps: number, compound: number): STSExtension;
        vesting(vestType: number, start: bigint, end: bigint): STSExtension;
        delegation(delegate: PublicKey, maxAmount: bigint, expiry: bigint): STSExtension;
        soulbound(bindingProof: Uint8Array): STSExtension;
        metadata(uriHash: Uint8Array): STSExtension;
    };
    /**
     * Encode extensions to TLV format
     */
    encodeExtensions(extensions: STSExtension[]): Uint8Array;
    /**
     * Mint new token notes
     */
    mint(sender: Keypair, options: STSNoteMintOptions): Promise<string>;
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
    sendTo(sender: Keypair, options: {
        to: PublicKey;
        amount: bigint;
        mint: PublicKey;
        memo?: string;
        private?: boolean;
    }): Promise<{
        signature: string;
        recipientNote: Uint8Array;
    }>;
    /**
     * Scan for tokens sent to an address (Token-22 parity)
     *
     * In production, uses an indexer to find notes encrypted to this address.
     * Returns all unspent notes belonging to the address.
     */
    getBalance(address: PublicKey, mint?: PublicKey): Promise<{
        total: bigint;
        notes: Array<{
            commitment: Uint8Array;
            amount: bigint;
        }>;
    }>;
    /**
     * Transfer note (consume old, create new)
     */
    transfer(sender: Keypair, options: STSNoteTransferOptions): Promise<string>;
    /**
     * Deposit SPL tokens to global pool, receive note
     */
    deposit(sender: Keypair, options: STSDepositOptions): Promise<string>;
    /**
     * Withdraw from global pool (direct mode)
     */
    withdraw(sender: Keypair, options: STSWithdrawOptions): Promise<string>;
    /**
     * Withdraw from global pool (stealth mode - preserves privacy)
     */
    withdrawStealth(sender: Keypair, options: STSStealthWithdrawOptions): Promise<string>;
    /**
     * Derive global pool PDA for a mint
     */
    derivePoolPDA(mint: PublicKey): [PublicKey, number];
    /**
     * Derive nullifier PDA
     */
    deriveNullifierPDA(nullifier: Uint8Array): [PublicKey, number];
    /**
     * Wrap SPL tokens into STS note (entry to privacy pool)
     */
    wrap(sender: Keypair, mint: PublicKey, amount: bigint, ownerSecret: Uint8Array): Promise<string>;
    /**
     * Unwrap STS note to SPL tokens (exit from privacy pool)
     */
    unwrap(sender: Keypair, nullifier: Uint8Array, mint: PublicKey, amount: bigint, recipient: PublicKey): Promise<string>;
    /**
     * Create NFT collection
     */
    createCollection(sender: Keypair, name: string, symbol: string, maxSupply: bigint, royaltyBps: number): Promise<string>;
    /**
     * Mint NFT in collection
     */
    mintNFT(sender: Keypair, collection: Uint8Array, metadataHash: Uint8Array, ownerSecret: Uint8Array, royaltyBps: number): Promise<string>;
    /**
     * Create note group (for collections)
     */
    createGroup(sender: Keypair, groupId: Uint8Array, name: string, maxSize: bigint): Promise<string>;
    /**
     * Commit to fair launch (meme coin)
     */
    fairLaunchCommit(sender: Keypair, launchId: Uint8Array, amount: bigint, nonce: Uint8Array, revealSlot: bigint): Promise<string>;
    /**
     * Reveal fair launch allocation
     */
    fairLaunchReveal(sender: Keypair, launchId: Uint8Array, amount: bigint, nonce: Uint8Array, ownerSecret: Uint8Array): Promise<string>;
    /**
     * Register transfer hook for notes
     */
    registerHook(sender: Keypair, mintHash: Uint8Array, hookProgram: PublicKey, extraAccountsHash: Uint8Array): Promise<string>;
    /**
     * Generate random bytes
     */
    static randomBytes(length: number): Uint8Array;
    /**
     * Hash bytes using Keccak256
     */
    static hash(data: Uint8Array): Uint8Array;
    /**
     * Create note with commitment, nullifier, and encrypted data
     */
    static createNote(amount: bigint, mintHash: Uint8Array, ownerKey: Uint8Array): {
        commitment: Uint8Array;
        nullifier: Uint8Array;
        encrypted: Uint8Array;
    };
    /**
     * Build mint instruction
     */
    static buildMintInstruction(payer: PublicKey, treasury: PublicKey, commitment: Uint8Array, encrypted: Uint8Array, flags: number, extensions: Uint8Array): {
        instruction: TransactionInstruction;
    };
    /**
     * Build transfer instruction
     */
    static buildTransferInstruction(payer: PublicKey, treasury: PublicKey, nullifier: Uint8Array, newCommitment: Uint8Array, encrypted: Uint8Array, trustLevel: number): {
        instruction: TransactionInstruction;
    };
    /**
     * Build wrap instruction (SPL → STS)
     */
    static buildWrapInstruction(payer: PublicKey, treasury: PublicKey, mint: PublicKey, amount: bigint, commitment: Uint8Array, encrypted: Uint8Array): {
        instruction: TransactionInstruction;
    };
    /**
     * Build unwrap instruction (STS → SPL)
     */
    static buildUnwrapInstruction(payer: PublicKey, treasury: PublicKey, mint: PublicKey, recipient: PublicKey, nullifier: Uint8Array, amount: bigint): {
        instruction: TransactionInstruction;
    };
}
/**
 * Build NFT listing instruction
 * Lists an STS NFT for fixed-price sale with optional privacy features
 */
declare function buildNftListInstruction(payer: PublicKey, treasury: PublicKey, options: NftListingOptions, programId?: PublicKey): TransactionInstruction;
/**
 * Build NFT delist instruction
 */
declare function buildNftDelistInstruction(payer: PublicKey, treasury: PublicKey, listingId: Uint8Array, programId?: PublicKey): TransactionInstruction;
/**
 * Build NFT buy instruction
 * Atomic purchase with privacy-preserving ownership transfer
 */
declare function buildNftBuyInstruction(buyer: PublicKey, seller: PublicKey, treasury: PublicKey, listingId: Uint8Array, buyerSecret: Uint8Array, newOwnerCommit: Uint8Array, programId?: PublicKey): TransactionInstruction;
/**
 * Build auction create instruction
 * Supports English, Dutch, and Sealed-bid (chrono vault) auctions
 */
declare function buildAuctionCreateInstruction(payer: PublicKey, treasury: PublicKey, options: AuctionOptions, programId?: PublicKey): TransactionInstruction;
/**
 * Build auction bid instruction
 */
declare function buildAuctionBidInstruction(bidder: PublicKey, treasury: PublicKey, auctionId: Uint8Array, bidAmount: bigint, bidCommit: Uint8Array, programId?: PublicKey): TransactionInstruction;
/**
 * Build PPV create instruction
 * Wraps a private note into a voucher that DeFi protocols can consume
 */
declare function buildPPVCreateInstruction(payer: PublicKey, treasury: PublicKey, options: PPVOptions, programId?: PublicKey): TransactionInstruction;
/**
 * Build PPV verify instruction (for CPI from DeFi protocols)
 */
declare function buildPPVVerifyInstruction(invoker: PublicKey, ppvId: Uint8Array, callerProgram: PublicKey, actionHash: Uint8Array, programId?: PublicKey): TransactionInstruction;
/**
 * Build PPV redeem instruction
 * Converts voucher back to real tokens
 */
declare function buildPPVRedeemInstruction(payer: PublicKey, treasury: PublicKey, ppvId: Uint8Array, secret: Uint8Array, recipient: PublicKey, programId?: PublicKey): TransactionInstruction;
/**
 * Build APB transfer instruction
 * Atomic private→public transfer with stealth address
 */
declare function buildAPBTransferInstruction(payer: PublicKey, treasury: PublicKey, options: APBTransferOptions, programId?: PublicKey): TransactionInstruction;
/**
 * Build stealth scan hint instruction
 * Helps recipient find their stealth payments
 */
declare function buildStealthScanHintInstruction(payer: PublicKey, stealthPubkey: Uint8Array, scanHint: Uint8Array, programId?: PublicKey): TransactionInstruction;
/**
 * Build private swap instruction
 * Jupiter-style swap with privacy-preserving input/output
 */
declare function buildPrivateSwapInstruction(payer: PublicKey, treasury: PublicKey, options: PrivateSwapOptions, programId?: PublicKey): TransactionInstruction;
/**
 * Build private stake instruction
 * Stake with privacy-preserving amount
 */
declare function buildPrivateStakeInstruction(payer: PublicKey, treasury: PublicKey, inputNullifier: Uint8Array, stakePool: PublicKey, amount: bigint, programId?: PublicKey): TransactionInstruction;
/**
 * Build pool create instruction
 */
declare function buildPoolCreateInstruction(payer: PublicKey, treasury: PublicKey, options: PoolOptions, programId?: PublicKey): TransactionInstruction;
/**
 * Build pool deposit instruction
 */
declare function buildPoolDepositInstruction(payer: PublicKey, treasury: PublicKey, poolId: Uint8Array, amount: bigint, depositCommit: Uint8Array, programId?: PublicKey): TransactionInstruction;
/**
 * Build pool withdraw instruction
 */
declare function buildPoolWithdrawInstruction(payer: PublicKey, treasury: PublicKey, poolId: Uint8Array, depositNullifier: Uint8Array, secret: Uint8Array, amount: bigint, programId?: PublicKey): TransactionInstruction;
/**
 * Build yield vault create instruction
 */
declare function buildYieldVaultCreateInstruction(payer: PublicKey, treasury: PublicKey, options: YieldVaultOptions, programId?: PublicKey): TransactionInstruction;
/**
 * Build yield deposit instruction
 */
declare function buildYieldDepositInstruction(payer: PublicKey, treasury: PublicKey, vaultId: Uint8Array, amount: bigint, yieldCommit: Uint8Array, programId?: PublicKey): TransactionInstruction;
/**
 * Build token create instruction
 * Creates a new STS token with full metadata (Token-22 parity)
 */
declare function buildTokenCreateInstruction(payer: PublicKey, treasury: PublicKey, options: TokenCreateOptions, programId?: PublicKey): TransactionInstruction;
/**
 * Build token set authority instruction
 */
declare function buildTokenSetAuthorityInstruction(payer: PublicKey, tokenId: Uint8Array, authorityType: 'mint' | 'freeze', newAuthority: PublicKey, programId?: PublicKey): TransactionInstruction;
/**
 * Build token metadata update instruction
 */
declare function buildTokenMetadataUpdateInstruction(payer: PublicKey, tokenId: Uint8Array, field: 'name' | 'symbol' | 'uri', value: string, programId?: PublicKey): TransactionInstruction;
/**
 * Generate a cryptographically secure random commitment
 */
declare function generateCommitment(): Uint8Array;
/**
 * Generate a note commitment from amount and secret
 */
declare function generateNoteCommitment(mint: PublicKey, amount: bigint, secret: Uint8Array): Uint8Array;
/**
 * Generate a nullifier from secret and commitment
 */
declare function generateNullifier(secret: Uint8Array, commitment: Uint8Array): Uint8Array;
/**
 * Generate a stealth address for APB transfers
 */
declare function generateStealthAddress(recipientSpendPubkey: Uint8Array, senderEphemeralPrivkey: Uint8Array): {
    stealthPubkey: Uint8Array;
    scanHint: Uint8Array;
};
/**
 * Build a hook execution instruction (TAG_HOOK_EXECUTE_REAL = 151)
 * Actually fires transfer hooks via CPI - per-NOTE hooks, not just mint-level!
 */
declare function buildHookExecute(payer: PublicKey, noteCommit: Uint8Array, hookProgram: PublicKey, hookData?: Uint8Array): TransactionInstruction;
/**
 * Build a confidential transfer v2 instruction (TAG_CONFIDENTIAL_TRANSFER_V2 = 152)
 * Unlike Token-22 CT which only hides amounts, STS hides EVERYTHING
 */
declare function buildConfidentialTransferV2(payer: PublicKey, nullifier: Uint8Array, encryptedData: Uint8Array, auditorKey?: Uint8Array, flags?: number): TransactionInstruction;
/**
 * Build an interest claim instruction (TAG_INTEREST_CLAIM_REAL = 153)
 * Uses Aave-pattern scaled balance for O(1) interest accrual
 */
declare function buildInterestClaimReal(claimer: PublicKey, noteCommit: Uint8Array, currentLiquidityIndex: bigint): TransactionInstruction;
/**
 * Build a royalty claim instruction (TAG_ROYALTY_CLAIM_REAL = 154)
 * Complete royalty claiming from escrow
 */
declare function buildRoyaltyClaimReal(creator: PublicKey, nftCommit: Uint8Array, saleId: Uint8Array, royaltyAmount: bigint): TransactionInstruction;
/**
 * Batch operation entry for buildBatchNoteOps
 */
interface BatchOpEntry {
    opType: number;
    opData: Uint8Array;
}
/**
 * Build a batch note operations instruction (TAG_BATCH_NOTE_OPS = 155)
 * Process multiple note operations in a single transaction
 */
declare function buildBatchNoteOps(executor: PublicKey, operations: BatchOpEntry[]): TransactionInstruction;
/**
 * Build an exchange proof instruction (TAG_EXCHANGE_PROOF = 156)
 * Proof of balance for CEX/DEX listing - verify holdings without revealing history
 */
declare function buildExchangeProof(prover: PublicKey, mint: Uint8Array, balanceCommit: Uint8Array, proof: Uint8Array): TransactionInstruction;
/**
 * Reveal mask flags for selective disclosure
 */
declare const REVEAL_AMOUNT = 1;
declare const REVEAL_SENDER = 2;
declare const REVEAL_RECIPIENT = 4;
declare const REVEAL_MEMO = 8;
declare const REVEAL_TIMESTAMP = 16;
/**
 * Build a selective disclosure instruction (TAG_SELECTIVE_DISCLOSURE = 157)
 * Unlike Token-22 CT which is all-or-nothing, STS allows granular reveals
 */
declare function buildSelectiveDisclosure(owner: PublicKey, noteCommit: Uint8Array, revealMask: number, revealedData?: Uint8Array): TransactionInstruction;
/**
 * Condition types for conditional transfers
 */
declare const CONDITION_HASHLOCK = 0;
declare const CONDITION_TIMELOCK = 1;
declare const CONDITION_MULTISIG = 2;
declare const CONDITION_ORACLE = 3;
/**
 * Build a conditional transfer instruction (TAG_CONDITIONAL_TRANSFER = 158)
 * Bitcoin-style script conditions - HTLC, time-locks, multi-path spending
 */
declare function buildConditionalTransfer(executor: PublicKey, noteNullifier: Uint8Array, conditionType: number, conditionData: Uint8Array, witness: Uint8Array): TransactionInstruction;
/**
 * Build a delegation chain instruction (TAG_DELEGATION_CHAIN = 159)
 * Multi-hop delegation (A→B→C)
 */
declare function buildDelegationChain(delegator: PublicKey, noteCommit: Uint8Array, delegate: Uint8Array, maxDepth: number, currentDepth?: number): TransactionInstruction;
/**
 * Build a time-locked reveal instruction (TAG_TIME_LOCKED_REVEAL = 160)
 * Chrono vault for scheduled disclosure
 */
declare function buildTimeLockedReveal(creator: PublicKey, secretCommit: Uint8Array, revealSlot: bigint, revealDataEncrypted: Uint8Array): TransactionInstruction;
/**
 * Build a cross-mint atomic swap instruction (TAG_CROSS_MINT_ATOMIC = 161)
 * Atomic swaps across different mints
 */
declare function buildCrossMintAtomic(partyA: PublicKey, mintA: Uint8Array, mintB: Uint8Array, amountA: bigint, amountB: bigint, swapHash: Uint8Array): TransactionInstruction;
/**
 * Build a social recovery instruction (TAG_SOCIAL_RECOVERY = 162)
 * Guardian-based note recovery - like Safe/Argent but for individual notes
 */
declare function buildSocialRecovery(guardian: PublicKey, noteCommit: Uint8Array, newOwner: Uint8Array, additionalSignatures?: Uint8Array): TransactionInstruction;
/**
 * Build a Jupiter route instruction (TAG_JUPITER_ROUTE = 163)
 * Native Jupiter routing with privacy
 */
declare function buildJupiterRoute(swapper: PublicKey, noteNullifier: Uint8Array, inputMint: Uint8Array, outputMint: Uint8Array, minOut: bigint, slippageBps?: number, routeHint?: number): TransactionInstruction;
/**
 * Marinade action types
 */
declare const MARINADE_STAKE = 0;
declare const MARINADE_UNSTAKE = 1;
declare const MARINADE_DELAYED_UNSTAKE = 2;
/**
 * Build a Marinade stake instruction (TAG_MARINADE_STAKE = 164)
 * Native Marinade liquid staking
 */
declare function buildMarinadeStake(staker: PublicKey, noteNullifier: Uint8Array, action: number, amount: bigint): TransactionInstruction;
/**
 * Drift perpetual action types
 */
declare const DRIFT_OPEN_LONG = 0;
declare const DRIFT_OPEN_SHORT = 1;
declare const DRIFT_CLOSE = 2;
declare const DRIFT_ADD_MARGIN = 3;
/**
 * Build a Drift perpetuals instruction (TAG_DRIFT_PERP = 165)
 * Native Drift perpetuals trading
 */
declare function buildDriftPerp(trader: PublicKey, noteNullifier: Uint8Array, marketIndex: number, action: number, size: bigint, leverage: bigint): TransactionInstruction;
/**
 * Lending action types
 */
declare const LENDING_DEPOSIT = 0;
declare const LENDING_BORROW = 1;
declare const LENDING_REPAY = 2;
declare const LENDING_WITHDRAW = 3;
/**
 * Build a private lending instruction (TAG_PRIVATE_LENDING = 166)
 * Private borrow/lend operations
 */
declare function buildPrivateLending(user: PublicKey, action: number, noteNullifier: Uint8Array, pool: Uint8Array, amount: bigint, collateralFactorBps?: number): TransactionInstruction;
/**
 * Build a flash loan instruction (TAG_FLASH_LOAN = 167)
 * Private flash loans
 */
declare function buildFlashLoan(borrower: PublicKey, pool: Uint8Array, amount: bigint, callbackProgram: PublicKey, feeBps?: number): TransactionInstruction;
/**
 * Build an oracle-bound transfer instruction (TAG_ORACLE_BOUND = 168)
 * Price-oracle bound transfers
 */
declare function buildOracleBound(sender: PublicKey, noteNullifier: Uint8Array, oracle: Uint8Array, minPrice: bigint, maxPrice: bigint, newCommitment?: Uint8Array): TransactionInstruction;
/**
 * Build a velocity limit instruction (TAG_VELOCITY_LIMIT = 169)
 * Rate-limited transfers
 */
declare function buildVelocityLimit(owner: PublicKey, noteCommit: Uint8Array, maxPerSlot: bigint, maxPerEpoch: bigint, currentAmount: bigint, action?: number): TransactionInstruction;
/**
 * Build a governance lock instruction (TAG_GOVERNANCE_LOCK = 170)
 * Vote-locked tokens (veToken pattern)
 */
declare function buildGovernanceLock(owner: PublicKey, noteCommit: Uint8Array, governor: Uint8Array, lockUntilSlot: bigint, votingPowerMultiplierBps?: number): TransactionInstruction;
/**
 * Build a reputation gate instruction (TAG_REPUTATION_GATE = 171)
 * Reputation-gated transfers
 */
declare function buildReputationGate(owner: PublicKey, noteCommit: Uint8Array, reputationOracle: Uint8Array, minSenderScore: number, minReceiverScore: number): TransactionInstruction;
/**
 * Build a geographic restriction instruction (TAG_GEO_RESTRICTION = 172)
 * Geographic compliance
 */
declare function buildGeoRestriction(owner: PublicKey, noteCommit: Uint8Array, allowedRegionsHash: Uint8Array, complianceOracle: Uint8Array): TransactionInstruction;
/**
 * Build a time decay instruction (TAG_TIME_DECAY = 173)
 * Decaying value (options/warrants)
 */
declare function buildTimeDecay(owner: PublicKey, noteCommit: Uint8Array, initialValue: bigint, decayRateBps: number, decayStartSlot: bigint, floorValue: bigint): TransactionInstruction;
/**
 * Build a multi-sig note instruction (TAG_MULTI_SIG_NOTE = 174)
 * Multi-sig ownership
 */
declare function buildMultiSigNote(initializer: PublicKey, noteCommit: Uint8Array, signersHash: Uint8Array, threshold: number, totalSigners: number): TransactionInstruction;
/**
 * Build a recoverable note instruction (TAG_RECOVERABLE_NOTE = 175)
 * Recovery with social timelock
 */
declare function buildRecoverableNote(owner: PublicKey, noteCommit: Uint8Array, guardianHash: Uint8Array, recoveryDelaySlots: bigint, inactivityThreshold: bigint): TransactionInstruction;
/**
 * Extension configuration for v15+ features
 */
interface OracleBoundConfig {
    oracle: Uint8Array;
    minPrice: bigint;
    maxPrice: bigint;
}
interface TimeDecayConfig {
    initialValue: bigint;
    decayRateBps: number;
    decayStartSlot: bigint;
    floorValue: bigint;
}
interface GovernanceLockConfig {
    governor: Uint8Array;
    lockUntilSlot: bigint;
    votingPowerMultiplierBps: number;
}
interface ReputationConfig {
    oracle: Uint8Array;
    minSenderScore: number;
    minReceiverScore: number;
}
interface VelocityLimitConfig {
    maxPerSlot: bigint;
    maxPerEpoch: bigint;
}
interface MultiSigConfig {
    signersHash: Uint8Array;
    threshold: number;
    totalSigners: number;
}
interface RecoverableConfig {
    guardianHash: Uint8Array;
    recoveryDelaySlots: bigint;
    inactivityThreshold: bigint;
}
interface ConditionalConfig {
    conditionType: number;
    conditionData: Uint8Array;
}
interface DelegationChainConfig {
    maxDepth: number;
    currentDepth: number;
}
/**
 * AMM Pool configuration
 */
interface AmmPoolConfig {
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
declare function buildAmmPoolCreate(creator: PublicKey, mintA: Uint8Array, mintB: Uint8Array, feeBps?: number, // 0.3% default
poolType?: number, initialSqrtPrice?: bigint): TransactionInstruction;
/**
 * Compute deterministic pool ID from mints and fee
 */
declare function computePoolId(mintA: Uint8Array, mintB: Uint8Array, feeBps: number): Uint8Array;
/**
 * Build an add liquidity instruction (TAG_AMM_ADD_LIQUIDITY = 177)
 * Adds tokens to pool and receives LP notes
 */
declare function buildAmmAddLiquidity(provider: PublicKey, poolId: Uint8Array, amountA: bigint, amountB: bigint, minLp?: bigint, deadline?: bigint): TransactionInstruction;
/**
 * Build a remove liquidity instruction (TAG_AMM_REMOVE_LIQUIDITY = 178)
 * Burns LP notes and receives tokens back
 */
declare function buildAmmRemoveLiquidity(remover: PublicKey, poolId: Uint8Array, lpNullifier: Uint8Array, lpAmount: bigint, minA?: bigint, minB?: bigint): TransactionInstruction;
/**
 * Swap direction constants
 */
declare const SWAP_A_TO_B = 0;
declare const SWAP_B_TO_A = 1;
/**
 * Build an AMM swap instruction (TAG_AMM_SWAP = 179)
 * Execute a swap through the pool - THIS IS DEX TRADING!
 */
declare function buildAmmSwap(swapper: PublicKey, poolId: Uint8Array, noteNullifier: Uint8Array, amountIn: bigint, minOut: bigint, direction?: number): TransactionInstruction;
/**
 * Build an AMM quote instruction (TAG_AMM_QUOTE = 180)
 * Request a quote for a swap (inscribed for indexers)
 */
declare function buildAmmQuote(quoter: PublicKey, poolId: Uint8Array, amount: bigint, direction?: number): TransactionInstruction;
/**
 * Build an AMM sync instruction (TAG_AMM_SYNC = 181)
 * Sync reserves after external operations
 */
declare function buildAmmSync(syncer: PublicKey, poolId: Uint8Array, reserveA: bigint, reserveB: bigint): TransactionInstruction;
/**
 * Build an LP note mint instruction (TAG_LP_NOTE_MINT = 182)
 */
declare function buildLpNoteMint(minter: PublicKey, poolId: Uint8Array, lpAmount: bigint, recipientCommit: Uint8Array): TransactionInstruction;
/**
 * Build an LP note burn instruction (TAG_LP_NOTE_BURN = 183)
 */
declare function buildLpNoteBurn(burner: PublicKey, poolId: Uint8Array, lpNullifier: Uint8Array, lpAmount: bigint): TransactionInstruction;
/**
 * Hop configuration for multi-hop swaps
 */
interface SwapHop {
    poolId: Uint8Array;
    direction: number;
}
/**
 * Build a router swap instruction (TAG_ROUTER_SWAP = 184)
 * Multi-hop swap through multiple pools (Jupiter-style routing)
 */
declare function buildRouterSwap(swapper: PublicKey, hops: SwapHop[]): TransactionInstruction;
/**
 * Split configuration for split swaps
 */
interface SwapSplit {
    poolId: Uint8Array;
    percentageBps: number;
}
/**
 * Build a router split instruction (TAG_ROUTER_SPLIT = 185)
 * Split swap across multiple pools for better execution
 */
declare function buildRouterSplit(swapper: PublicKey, splits: SwapSplit[]): TransactionInstruction;
/**
 * Order side constants
 */
declare const ORDER_BUY = 0;
declare const ORDER_SELL = 1;
/**
 * Build a limit order place instruction (TAG_LIMIT_ORDER_PLACE = 186)
 * Place a limit order on the order book
 */
declare function buildLimitOrderPlace(placer: PublicKey, poolId: Uint8Array, noteCommit: Uint8Array, price: bigint, amount: bigint, direction?: number, expirySlot?: bigint): TransactionInstruction;
/**
 * Build a limit order fill instruction (TAG_LIMIT_ORDER_FILL = 187)
 * Fill an existing limit order
 */
declare function buildLimitOrderFill(taker: PublicKey, orderId: Uint8Array, fillAmount: bigint, takerNullifier: Uint8Array): TransactionInstruction;
/**
 * Build a limit order cancel instruction (TAG_LIMIT_ORDER_CANCEL = 188)
 */
declare function buildLimitOrderCancel(canceler: PublicKey, orderId: Uint8Array): TransactionInstruction;
/**
 * Build a TWAP order start instruction (TAG_TWAP_ORDER_START = 189)
 * Start a time-weighted average price order
 */
declare function buildTwapOrderStart(trader: PublicKey, poolId: Uint8Array, totalAmount: bigint, numSlices: number, intervalSlots: bigint, direction?: number): TransactionInstruction;
/**
 * Build a TWAP order fill instruction (TAG_TWAP_ORDER_FILL = 190)
 * Fill a slice of a TWAP order
 */
declare function buildTwapOrderFill(filler: PublicKey, twapId: Uint8Array, sliceIndex: number, amount: bigint, price: bigint): TransactionInstruction;
/**
 * CLMM action constants
 */
declare const CLMM_OPEN = 0;
declare const CLMM_ADD = 1;
declare const CLMM_REMOVE = 2;
declare const CLMM_CLOSE = 3;
declare const CLMM_COLLECT_FEES = 4;
/**
 * Build a concentrated liquidity instruction (TAG_CONCENTRATED_LP = 191)
 * Uniswap v3 style concentrated liquidity positions
 */
declare function buildConcentratedLp(provider: PublicKey, poolId: Uint8Array, action: number, tickLower: number, tickUpper: number, liquidity: bigint): TransactionInstruction;
/**
 * Calculate output amount for constant product swap (x * y = k)
 * @param amountIn Input amount
 * @param reserveIn Reserve of input token
 * @param reserveOut Reserve of output token
 * @param feeBps Fee in basis points (e.g., 30 = 0.3%)
 * @returns Output amount after fee
 */
declare function calculateConstantProductSwap(amountIn: bigint, reserveIn: bigint, reserveOut: bigint, feeBps?: number): bigint;
/**
 * Calculate LP tokens to mint when adding liquidity
 * @param amountA Amount of token A to add
 * @param amountB Amount of token B to add
 * @param reserveA Current reserve of token A
 * @param reserveB Current reserve of token B
 * @param totalLpSupply Current total LP supply
 * @returns LP tokens to mint
 */
declare function calculateLpMint(amountA: bigint, amountB: bigint, reserveA: bigint, reserveB: bigint, totalLpSupply: bigint): bigint;
/**
 * Calculate tokens to receive when removing liquidity
 * @param lpAmount LP tokens to burn
 * @param reserveA Current reserve of token A
 * @param reserveB Current reserve of token B
 * @param totalLpSupply Current total LP supply
 * @returns [amountA, amountB] to receive
 */
declare function calculateLpBurn(lpAmount: bigint, reserveA: bigint, reserveB: bigint, totalLpSupply: bigint): [bigint, bigint];
/**
 * Calculate price impact for a swap
 * @param amountIn Input amount
 * @param reserveIn Reserve of input token
 * @param reserveOut Reserve of output token
 * @returns Price impact as basis points
 */
declare function calculatePriceImpact(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): number;
/**
 * Nullifier creation options
 */
interface NullifierOptions {
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
interface MerkleProofOptions {
    /** Note commitment to verify */
    noteCommit: Uint8Array;
    /** Merkle root to verify against */
    root: Uint8Array;
    /** Merkle proof (sibling hashes with direction) */
    proof: Array<{
        hash: Uint8Array;
        isRight: boolean;
    }>;
}
/**
 * Balance attestation options
 */
interface BalanceAttestOptions {
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
interface FreezeEnforcedOptions {
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
interface WrapperMintOptions {
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
interface WrapperBurnOptions {
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
interface ValidatorProofOptions {
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
declare function buildNullifierCreate(options: NullifierOptions, payer: PublicKey, programId?: PublicKey): TransactionInstruction;
/**
 * Build nullifier check instruction (v20)
 * Checks if a nullifier exists - returns via return_data for CPI
 *
 * @param nullifier Nullifier hash to check
 * @param programId Program ID
 * @returns Transaction instruction
 */
declare function buildNullifierCheck(nullifier: Uint8Array, programId?: PublicKey): TransactionInstruction;
/**
 * Build Merkle proof verification instruction (v20)
 * Verifies a note exists in the Merkle tree without trusting an indexer
 *
 * @param options Merkle proof options
 * @param verifier Verifier account
 * @param programId Program ID
 * @returns Transaction instruction
 */
declare function buildMerkleProofVerify(options: MerkleProofOptions, verifier: PublicKey, programId?: PublicKey): TransactionInstruction;
/**
 * Build balance attestation instruction (v20)
 * Creates a cryptographic attestation of balance for DeFi composability
 *
 * @param options Balance attestation options
 * @param caller Calling account (typically a DeFi protocol)
 * @param programId Program ID
 * @returns Transaction instruction
 */
declare function buildBalanceAttest(options: BalanceAttestOptions, caller: PublicKey, programId?: PublicKey): TransactionInstruction;
/**
 * Build freeze enforced instruction (v20)
 * Multi-authority freeze with timelock - more secure than Token-22!
 *
 * @param options Freeze options
 * @param programId Program ID
 * @returns Transaction instruction
 */
declare function buildFreezeEnforced(options: FreezeEnforcedOptions, programId?: PublicKey): TransactionInstruction;
/**
 * Build wrapper mint instruction (v20)
 * Converts STS note to Token-22 wrapper for DEX integration
 *
 * @param options Wrapper mint options
 * @param owner Note owner
 * @param programId Program ID
 * @returns Transaction instruction
 */
declare function buildWrapperMint(options: WrapperMintOptions, owner: PublicKey, programId?: PublicKey): TransactionInstruction;
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
declare function buildWrapperBurn(options: WrapperBurnOptions, owner: PublicKey, programId?: PublicKey): TransactionInstruction;
/**
 * Build validator proof instruction (v20)
 * Inscribes factual proof that STS is lighter on validators than Token-22
 *
 * @param options Validator proof options
 * @param prover Prover account
 * @param programId Program ID
 * @returns Transaction instruction
 */
declare function buildValidatorProof(options: ValidatorProofOptions, prover: PublicKey, programId?: PublicKey): TransactionInstruction;
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
declare function buildAtomicCpiTransfer(fromCommit: Uint8Array, toCommit: Uint8Array, amount: bigint, callerProgram: PublicKey, owner: PublicKey, programId?: PublicKey): TransactionInstruction;
/**
 * Build batch nullifier instruction (v20)
 * Creates multiple nullifiers in one transaction for efficiency
 *
 * @param nullifiers Array of nullifier hashes (max 10)
 * @param spender Spender account
 * @param programId Program ID
 * @returns Transaction instruction
 */
declare function buildBatchNullifier(nullifiers: Uint8Array[], spender: PublicKey, programId?: PublicKey): TransactionInstruction;
/**
 * Compare STS vs Token-22 costs for a given number of users
 * Returns factual cost comparison in SOL
 */
declare function compareCosts(numUsers: number): {
    sts: {
        rentTotal: number;
        txCost: number;
        total: number;
    };
    token22: {
        rentTotal: number;
        txCost: number;
        total: number;
    };
    savingsPercent: number;
    savingsSol: number;
};
/**
 * Compare validator burden for STS vs Token-22
 */
declare function compareValidatorBurden(numAccounts: number): {
    sts: {
        ramBytes: number;
        diskBytes: number;
        indexLoad: string;
    };
    token22: {
        ramBytes: number;
        diskBytes: number;
        indexLoad: string;
    };
    ramReductionPercent: number;
};
/**
 * Generate proof data for on-chain validator proof inscription
 */
declare function generateValidatorProofData(proofType: 'ram' | 'disk' | 'compute' | 'rent', numAccounts: number): ValidatorProofOptions;
/**
 * Build security token issuance instruction
 * TAG 211 - Issue private security token with compliance
 */
declare function buildSecurityIssue(payer: PublicKey, programId: PublicKey, securityId: Uint8Array, totalShares: bigint, issuerSig: Uint8Array, regulationType?: number, lockupPeriod?: number): TransactionInstruction;
/**
 * Build security transfer instruction with compliance check
 * TAG 212 - Transfer security tokens with ZK compliance proof
 */
declare function buildSecurityTransfer(payer: PublicKey, programId: PublicKey, securityId: Uint8Array, senderCommit: Uint8Array, receiverCommit: Uint8Array, amount: bigint, complianceProof: Uint8Array): TransactionInstruction;
/**
 * Build transfer agent registration instruction
 * TAG 219 - Register authorized transfer agent
 */
declare function buildTransferAgentRegister(payer: PublicKey, programId: PublicKey, securityId: Uint8Array, agentPubkey: Uint8Array, issuerSig: Uint8Array, permissions?: number): TransactionInstruction;
/**
 * Build option contract creation instruction
 * TAG 221 - Create new options contract
 */
declare function buildOptionCreate(payer: PublicKey, programId: PublicKey, underlyingCommit: Uint8Array, strikePrice: bigint, expirySlot: number, optionType: number, exerciseStyle?: number): TransactionInstruction;
/**
 * Build option exercise instruction
 * TAG 224 - Exercise option contract
 */
declare function buildOptionExercise(payer: PublicKey, programId: PublicKey, optionId: Uint8Array, ownershipProof: Uint8Array, amount: bigint, settlementType?: number): TransactionInstruction;
/**
 * Build option settlement instruction
 * TAG 230 - Cash settle option at expiry
 */
declare function buildOptionSettle(payer: PublicKey, programId: PublicKey, optionId: Uint8Array, oracleSig: Uint8Array, settlementPrice: bigint, pnlProof: Uint8Array): TransactionInstruction;
/**
 * Build margin account open instruction
 * TAG 231 - Open new margin trading account
 */
declare function buildMarginOpen(payer: PublicKey, programId: PublicKey, accountId: Uint8Array, initialMarginBps: number, maintenanceMarginBps: number, maxLeverage: number): TransactionInstruction;
/**
 * Build leveraged position open instruction
 * TAG 237 - Open leveraged trading position
 */
declare function buildPositionOpen(payer: PublicKey, programId: PublicKey, accountId: Uint8Array, assetCommit: Uint8Array, size: bigint, direction: number, entryPrice: bigint, leverage: number): TransactionInstruction;
/**
 * Build margin liquidation instruction
 * TAG 236 - Liquidate undercollateralized position
 */
declare function buildMarginLiquidate(payer: PublicKey, programId: PublicKey, positionId: Uint8Array, oracleSig: Uint8Array, currentPrice: bigint, liquidatorRewardBps?: number): TransactionInstruction;
/**
 * Build bridge lock instruction
 * TAG 241 - Lock tokens for cross-chain bridge
 */
declare function buildBridgeLock(payer: PublicKey, programId: PublicKey, tokenCommit: Uint8Array, amount: bigint, destChainId: number, destAddress: Uint8Array, bridgeFee?: bigint, timeout?: number): TransactionInstruction;
/**
 * Build bridge release instruction
 * TAG 242 - Release bridged tokens on destination chain
 */
declare function buildBridgeRelease(payer: PublicKey, programId: PublicKey, lockId: Uint8Array, bridgeProof: Uint8Array, receiverCommit: Uint8Array, amount: bigint): TransactionInstruction;
/**
 * Build bridge oracle registration instruction
 * TAG 250 - Register bridge oracle for attestations
 */
declare function buildBridgeOracleRegister(payer: PublicKey, programId: PublicKey, oraclePubkey: Uint8Array, supportedChains: number[], stakeAmount: bigint): TransactionInstruction;
/**
 * Build bridge pause instruction (emergency)
 * TAG 253 - Emergency pause bridge operations
 */
declare function buildBridgePause(payer: PublicKey, programId: PublicKey, bridgeId: Uint8Array, reason: string, authoritySig: Uint8Array): TransactionInstruction;

export { ADAPTER_CUSTOM, ADAPTER_DRIFT, ADAPTER_JUPITER, ADAPTER_MARINADE, ADAPTER_RAYDIUM, type APBTransferOptions, AUCTION_DUTCH, AUCTION_ENGLISH, AUCTION_SEALED, type AdapterCallOptions, type AmmPoolConfig, type AuctionOptions, type BalanceAttestOptions, type BatchOpEntry, type BatchSettleOptions, type BridgeLockOptions, type BridgeOracleOptions, type BridgeReleaseOptions, CHAIN_ARBITRUM, CHAIN_AVALANCHE, CHAIN_BASE, CHAIN_BSC, CHAIN_ETHEREUM, CHAIN_POLYGON, CHAIN_SOLANA, CLMM_ADD, CLMM_CLOSE, CLMM_COLLECT_FEES, CLMM_OPEN, CLMM_REMOVE, CONDITION_HASHLOCK, CONDITION_MULTISIG, CONDITION_ORACLE, CONDITION_TIMELOCK, type CPIInscribeOptions, CPI_TYPE_ATTESTATION, CPI_TYPE_EVENT, CPI_TYPE_GENERIC, CPI_TYPE_RECEIPT, type ConditionalConfig, DRIFT_ADD_MARGIN, DRIFT_CLOSE, DRIFT_OPEN_LONG, DRIFT_OPEN_SHORT, type DelegationChainConfig, EXT_ADAPTER, EXT_AUCTION, EXT_CONDITIONAL, EXT_CONFIDENTIAL, EXT_CPI_GUARD, EXT_DEFAULT_FROZEN, EXT_DELEGATION, EXT_DELEGATION_CHAIN, EXT_FROZEN, EXT_GEOGRAPHIC, EXT_GOVERNANCE_LOCK, EXT_GROUP, EXT_HOOK, EXT_INTEREST, EXT_MEMBER, EXT_METADATA, EXT_MULTI_SIG, EXT_NFT_LISTING, EXT_ORACLE_BOUND, EXT_POOL, EXT_PPV, EXT_PROGRAMMABLE, EXT_RECOVERABLE, EXT_REPUTATION, EXT_REQUIRED_MEMO, EXT_ROYALTY, EXT_SCALED_BALANCE, EXT_SOULBOUND, EXT_TIME_DECAY, EXT_TRANSFER_FEE, EXT_VELOCITY_LIMIT, EXT_VESTING, EXT_YIELD, type FreezeEnforcedOptions, GHOST_ACTION_ANONYMOUS_ACCESS, GHOST_ACTION_AUTHENTICATE, GHOST_ACTION_PROVE_MEMBERSHIP, GHOST_ACTION_VERIFY_SECRET, type GhostPDAOptions, type GovernanceLockConfig, type HashlockCommitOptions, type HashlockRevealOptions, LENDING_BORROW, LENDING_DEPOSIT, LENDING_REPAY, LENDING_WITHDRAW, type LiquidationOptions, MARINADE_DELAYED_UNSTAKE, MARINADE_STAKE, MARINADE_UNSTAKE, MAX_REFERRAL_DEPTH, MP_ACTION_ADD_PARTY, MP_ACTION_CHANGE_THRESHOLD, MP_ACTION_DELEGATE, MP_ACTION_REMOVE_PARTY, MP_ACTION_TRANSFER, type MarginAccountOptions, type MarginPositionOptions, type MerkleProofOptions, type MessageOptions, type MultiSigConfig, type MultipartyVTAInitOptions, type MultipartyVTASignOptions, type NftListingOptions, type NullifierOptions, ORDER_BUY, ORDER_SELL, type OptionCreateOptions, type OptionExerciseOptions, type OptionSettleOptions, type OracleBoundConfig, PERM_CAN_MESSAGE, PERM_CAN_SUBDELEGATE, PERM_CAN_TRANSFER, PERM_CAN_VOTE, PERM_REQUIRES_2FA, POOL_TYPE_CONCENTRATED, POOL_TYPE_CONSTANT_PRODUCT, POOL_TYPE_STABLE_SWAP, type PPVOptions, PROTOCOL_FEE_LAMPORTS, type PoolOptions, type PrivateSubscriptionOptions, type PrivateSwapOptions, type ProposalOptions, REFERRAL_BASE_BPS, REVEAL_AMOUNT, REVEAL_MEMO, REVEAL_RECIPIENT, REVEAL_SENDER, REVEAL_TIMESTAMP, REVOKER_DELEGATE, REVOKER_GUARDIAN, REVOKER_OWNER, REVOKE_COMPROMISED, REVOKE_EXPIRED, REVOKE_NORMAL, REVOKE_UPGRADED, type RecoverableConfig, type ReferralClaimOptions, type ReferralOptions, type ReputationConfig, type RevealType, STS, type STSDepositOptions, type STSExtension, type STSNote, type STSNoteMintOptions, type STSNoteTransferOptions, type STSStealthWithdrawOptions, type STSWithdrawOptions, STYX_PMP_DEVNET_PROGRAM_ID, STYX_PMP_PROGRAM_ID, SWAP_A_TO_B, SWAP_B_TO_A, type SecurityIssueOptions, type SecurityTransferOptions, type StateChannelCloseOptions, type StateChannelOpenOptions, type StealthSwapExecOptions, type StealthSwapInitOptions, StyxDelegation, StyxGovernance, StyxGuardian, type StyxMessage, StyxMultiparty, StyxNovel, StyxPMP, StyxReferral, StyxSubscription, StyxSwap, StyxVTA, type SwapHop, type SwapSplit, TAG_ACCREDITATION_PROOF, TAG_ADAPTER_CALL, TAG_ADAPTER_CALLBACK, TAG_ADAPTER_REGISTER, TAG_AMM_ADD_LIQUIDITY, TAG_AMM_POOL_CREATE, TAG_AMM_QUOTE, TAG_AMM_REMOVE_LIQUIDITY, TAG_AMM_SWAP, TAG_AMM_SYNC, TAG_APB_BATCH, TAG_APB_TRANSFER, TAG_ATOMIC_CPI_TRANSFER, TAG_AUCTION_BID, TAG_AUCTION_CANCEL, TAG_AUCTION_CREATE, TAG_AUCTION_SETTLE, TAG_BALANCE_ATTEST, TAG_BALANCE_VERIFY, TAG_BATCH_NOTE_OPS, TAG_BATCH_NULLIFIER, TAG_BATCH_SETTLE, TAG_BRIDGE_BURN, TAG_BRIDGE_FEE_COLLECT, TAG_BRIDGE_GUARDIAN_ROTATE, TAG_BRIDGE_LOCK, TAG_BRIDGE_MINT, TAG_BRIDGE_PAUSE, TAG_BRIDGE_RELEASE, TAG_BRIDGE_RESUME, TAG_BTC_RELAY_SUBMIT, TAG_BTC_SPV_PROOF, TAG_CHRONO_LOCK, TAG_CHRONO_REVEAL, TAG_CLEAN_SOURCE_PROVE, TAG_CLEAN_SOURCE_REGISTER, TAG_COLLECTION_CREATE, TAG_COMPLIANCE_CHANNEL_OPEN, TAG_COMPLIANCE_CHANNEL_REPORT, TAG_COMPLIANCE_PROOF, TAG_CONCENTRATED_LP, TAG_CONDITIONAL_COMMIT, TAG_CONDITIONAL_TRANSFER, TAG_CONFIDENTIAL_MINT, TAG_CONFIDENTIAL_TRANSFER, TAG_CONFIDENTIAL_TRANSFER_V2, TAG_CORPORATE_ACTION, TAG_CPI_INSCRIBE, TAG_CROSS_MARGIN_SYNC, TAG_CROSS_MINT_ATOMIC, TAG_DECENTRALIZATION_METRIC, TAG_DECOY_REVEAL, TAG_DECOY_STORM, TAG_DELEGATION_CHAIN, TAG_DRIFT_PERP, TAG_EPHEMERAL_CREATE, TAG_EPHEMERAL_DRAIN, TAG_ETH_STATE_PROOF, TAG_EXCHANGE_PROOF, TAG_FAIR_LAUNCH_COMMIT, TAG_FAIR_LAUNCH_REVEAL, TAG_FLASH_LOAN, TAG_FREEZE_ENFORCED, TAG_FUNDING_RATE_APPLY, TAG_GEO_RESTRICTION, TAG_GHOST_PDA, TAG_GOVERNANCE_LOCK, TAG_GPOOL_DEPOSIT, TAG_GPOOL_WITHDRAW, TAG_GPOOL_WITHDRAW_STEALTH, TAG_GPOOL_WITHDRAW_SWAP, TAG_GROUP_ADD_MEMBER, TAG_GROUP_CREATE, TAG_GROUP_REMOVE_MEMBER, TAG_HASHLOCK_COMMIT, TAG_HASHLOCK_REVEAL, TAG_HOOK_EXECUTE, TAG_HOOK_EXECUTE_REAL, TAG_HOOK_REGISTER, TAG_IBC_PACKET_ACK, TAG_IBC_PACKET_RECV, TAG_INNOCENCE_MINT, TAG_INNOCENCE_REVOKE, TAG_INNOCENCE_VERIFY, TAG_INSTITUTIONAL_REPORT, TAG_INSURANCE_FUND_CONTRIBUTE, TAG_INTEREST_ACCRUE, TAG_INTEREST_CLAIM, TAG_INTEREST_CLAIM_REAL, TAG_JUPITER_ROUTE, TAG_LAYERZERO_ENDPOINT, TAG_LIMIT_ORDER_CANCEL, TAG_LIMIT_ORDER_FILL, TAG_LIMIT_ORDER_PLACE, TAG_LP_NOTE_BURN, TAG_LP_NOTE_MINT, TAG_MARGIN_ACCOUNT_CREATE, TAG_MARGIN_CALL_EMIT, TAG_MARGIN_DEPOSIT, TAG_MARGIN_WITHDRAW, TAG_MARINADE_STAKE, TAG_MERKLE_AIRDROP_CLAIM, TAG_MERKLE_AIRDROP_ROOT, TAG_MERKLE_EMERGENCY, TAG_MERKLE_PROOF_VERIFY, TAG_MERKLE_ROOT_PUBLISH, TAG_MERKLE_UPDATE, TAG_MULTIPARTY_VTA_INIT, TAG_MULTIPARTY_VTA_SIGN, TAG_MULTI_SIG_NOTE, TAG_NFT_ACCEPT_OFFER, TAG_NFT_BUY, TAG_NFT_CANCEL_OFFER, TAG_NFT_DELIST, TAG_NFT_LIST, TAG_NFT_MINT, TAG_NFT_OFFER, TAG_NOTE_BURN, TAG_NOTE_EXTEND, TAG_NOTE_FREEZE, TAG_NOTE_MERGE, TAG_NOTE_MINT, TAG_NOTE_SPLIT, TAG_NOTE_THAW, TAG_NOTE_TRANSFER, TAG_NULLIFIER_CHECK, TAG_NULLIFIER_CREATE, TAG_NULLIFIER_INSCRIBE, TAG_OPTION_ASSIGN, TAG_OPTION_BUY, TAG_OPTION_CLOSE, TAG_OPTION_COLLATERAL_LOCK, TAG_OPTION_COLLATERAL_RELEASE, TAG_OPTION_EXERCISE, TAG_OPTION_EXPIRE, TAG_OPTION_MARKET_MAKE, TAG_OPTION_SERIES_CREATE, TAG_OPTION_WRITE, TAG_ORACLE_BOUND, TAG_PHANTOM_NFT_COMMIT, TAG_PHANTOM_NFT_PROVE, TAG_POOL_CREATE, TAG_POOL_DEPOSIT, TAG_POOL_DONATE, TAG_POOL_WITHDRAW, TAG_POSITION_CLOSE, TAG_POSITION_LIQUIDATE, TAG_POSITION_OPEN, TAG_PPV_CREATE, TAG_PPV_EXTEND, TAG_PPV_REDEEM, TAG_PPV_REVOKE, TAG_PPV_TRANSFER, TAG_PPV_VERIFY, TAG_PRIVATE_LENDING, TAG_PRIVATE_LP_ADD, TAG_PRIVATE_LP_REMOVE, TAG_PRIVATE_STAKE, TAG_PRIVATE_SUBSCRIPTION, TAG_PRIVATE_SWAP, TAG_PRIVATE_UNSTAKE, TAG_PROTOCOL_PAUSE, TAG_PROTOCOL_UNPAUSE, TAG_PROVENANCE_COMMIT, TAG_PROVENANCE_EXTEND, TAG_PROVENANCE_VERIFY, TAG_RECOVERABLE_NOTE, TAG_REG_D_LOCKUP, TAG_REPUTATION_GATE, TAG_ROUTER_SPLIT, TAG_ROUTER_SWAP, TAG_ROYALTY_CLAIM, TAG_ROYALTY_CLAIM_REAL, TAG_SECURITY_AUDIT, TAG_SECURITY_FREEZE, TAG_SECURITY_ISSUE, TAG_SECURITY_TRANSFER, TAG_SELECTIVE_DISCLOSURE, TAG_SHADOW_FOLLOW, TAG_SHADOW_UNFOLLOW, TAG_SHARE_CLASS_CREATE, TAG_SOCIAL_RECOVERY, TAG_STATE_CHANNEL_CLOSE, TAG_STATE_CHANNEL_OPEN, TAG_STEALTH_SCAN_HINT, TAG_STEALTH_SWAP_EXEC, TAG_STEALTH_SWAP_INIT, TAG_TEMPORAL_INNOCENCE, TAG_THAW_GOVERNED, TAG_TIME_CAPSULE, TAG_TIME_DECAY, TAG_TIME_LOCKED_REVEAL, TAG_TOKEN_CREATE, TAG_TOKEN_METADATA_SET, TAG_TOKEN_METADATA_UPDATE, TAG_TOKEN_SET_AUTHORITY, TAG_TRANSFER_AGENT_APPROVE, TAG_TRANSFER_AGENT_REGISTER, TAG_TWAP_ORDER_FILL, TAG_TWAP_ORDER_START, TAG_UNWRAP_SPL, TAG_VALIDATOR_PROOF, TAG_VELOCITY_LIMIT, TAG_VSL_AUDIT_REVEAL, TAG_VSL_BALANCE_PROOF, TAG_VSL_DEPOSIT, TAG_VSL_ESCROW_CREATE, TAG_VSL_ESCROW_REFUND, TAG_VSL_ESCROW_RELEASE, TAG_VSL_MERGE, TAG_VSL_PRIVATE_SWAP, TAG_VSL_PRIVATE_TRANSFER, TAG_VSL_SHIELDED_SEND, TAG_VSL_SPLIT, TAG_VSL_WITHDRAW, TAG_VTA_DELEGATE, TAG_VTA_GUARDIAN_RECOVER, TAG_VTA_GUARDIAN_SET, TAG_VTA_REVOKE, TAG_WORMHOLE_VAA_VERIFY, TAG_WRAPPER_BURN, TAG_WRAPPER_MINT, TAG_WRAP_SPL, TAG_YIELD_CLAIM, TAG_YIELD_DEPOSIT, TAG_YIELD_VAULT_CREATE, TAG_YIELD_WITHDRAW, TREASURY, TRUST_INDEXER, TRUST_MERKLE_PROOF, TRUST_NULLIFIER_PDA, type TimeCapsuleOptions, type TimeDecayConfig, type TokenCreateOptions, type TokenMetadata, type TransferAgentOptions, type VTADelegateOptions, type VTAGuardianRecoverOptions, type VTAGuardianSetOptions, type VTARevokeOptions, type VTATransferOptions, type ValidatorProofOptions, type VelocityLimitConfig, type VoteOptions, type WrapperBurnOptions, type WrapperMintOptions, type YieldVaultOptions, buildAPBTransferInstruction, buildAmmAddLiquidity, buildAmmPoolCreate, buildAmmQuote, buildAmmRemoveLiquidity, buildAmmSwap, buildAmmSync, buildAtomicCpiTransfer, buildAuctionBidInstruction, buildAuctionCreateInstruction, buildBalanceAttest, buildBatchNoteOps, buildBatchNullifier, buildBatchSettleInstruction, buildBridgeLock, buildBridgeOracleRegister, buildBridgePause, buildBridgeRelease, buildCPIInscribeInstruction, buildConcentratedLp, buildConditionalTransfer, buildConfidentialTransferV2, buildCrossMintAtomic, buildDelegationChain, buildDriftPerp, buildExchangeProof, buildFlashLoan, buildFreezeEnforced, buildGeoRestriction, buildGhostPDAInstruction, buildGovernanceLock, buildHashlockCommitInstruction, buildHashlockRevealInstruction, buildHookExecute, buildInterestClaimReal, buildJupiterRoute, buildLimitOrderCancel, buildLimitOrderFill, buildLimitOrderPlace, buildLpNoteBurn, buildLpNoteMint, buildMarginLiquidate, buildMarginOpen, buildMarinadeStake, buildMerkleProofVerify, buildMultiSigNote, buildMultipartyVTAInitInstruction, buildMultipartyVTASignInstruction, buildNftBuyInstruction, buildNftDelistInstruction, buildNftListInstruction, buildNullifierCheck, buildNullifierCreate, buildOptionCreate, buildOptionExercise, buildOptionSettle, buildOracleBound, buildPPVCreateInstruction, buildPPVRedeemInstruction, buildPPVVerifyInstruction, buildPoolCreateInstruction, buildPoolDepositInstruction, buildPoolWithdrawInstruction, buildPositionOpen, buildPrivateLending, buildPrivateStakeInstruction, buildPrivateSubscriptionInstruction, buildPrivateSwapInstruction, buildProposalInstruction, buildRecoverableNote, buildReferralInstruction, buildReputationGate, buildRouterSplit, buildRouterSwap, buildRoyaltyClaimReal, buildSecurityIssue, buildSecurityTransfer, buildSelectiveDisclosure, buildSocialRecovery, buildStateChannelCloseInstruction, buildStateChannelOpenInstruction, buildStealthScanHintInstruction, buildStealthSwapExecInstruction, buildStealthSwapInitInstruction, buildTimeCapsuleInstruction, buildTimeDecay, buildTimeLockedReveal, buildTokenCreateInstruction, buildTokenMetadataUpdateInstruction, buildTokenSetAuthorityInstruction, buildTransferAgentRegister, buildTwapOrderFill, buildTwapOrderStart, buildVTADelegateInstruction, buildVTAGuardianRecoverInstruction, buildVTAGuardianSetInstruction, buildVTARevokeInstruction, buildValidatorProof, buildVelocityLimit, buildVoteInstruction, buildWrapperBurn, buildWrapperMint, buildYieldDepositInstruction, buildYieldVaultCreateInstruction, calculateConstantProductSwap, calculateLpBurn, calculateLpMint, calculatePriceImpact, calculateReferralChainRewards, calculateReferralReward, compareCosts, compareValidatorBurden, computePoolId, decryptAmount, decryptPayload, decryptRecipient, StyxPMP as default, deriveGhostPDA, deriveSharedSecret, deriveTimeCapsuleKey, encryptAmount, encryptPayload, encryptRecipient, generateCommitment, generateNoteCommitment, generateNullifier, generateStealthAddress, generateValidatorProofData, generateX25519Keypair };
