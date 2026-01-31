#!/usr/bin/env npx ts-node
/**
 * Live Terminal Test Runner for ALL STS TAGs
 * Tests every TAG on devnet with real-time output
 */

import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    TransactionInstruction,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as fs from 'fs';

// Devnet program ID
const PROGRAM_ID = new PublicKey('FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW');

// Load test wallet
const walletPath = '/workspaces/StyxStack/.devnet/test-wallet.json';
const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
const payer = Keypair.fromSecretKey(Uint8Array.from(walletData));

// Connection
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Complete TAG mapping with MIN_LEN requirements
// Based on analysis of programs/styx-private-memo-program/src/lib.rs
const TAG_CONFIG: Record<number, { name: string; minLen: number; description: string }> = {
    // Core Messaging (3-8)
    3: { name: 'PRIVATE_MESSAGE', minLen: 64, description: 'Private encrypted message' },
    4: { name: 'ROUTED_MESSAGE', minLen: 80, description: 'Multi-hop routed message' },
    5: { name: 'PRIVATE_TRANSFER', minLen: 96, description: 'Private token transfer' },
    6: { name: 'RATCHET_INIT', minLen: 64, description: 'Initialize ratchet encryption' },
    7: { name: 'RATCHET_UPDATE', minLen: 48, description: 'Update ratchet state' },
    8: { name: 'COMPLIANCE_REVEAL', minLen: 128, description: 'Reveal for compliance' },
    
    // Governance (9-13)
    9: { name: 'PROPOSAL_CREATE', minLen: 64, description: 'Create governance proposal' },
    10: { name: 'VOTE_CAST', minLen: 48, description: 'Cast vote on proposal' },
    11: { name: 'REFERENDUM_CREATE', minLen: 64, description: 'Create referendum' },
    12: { name: 'PRIVATE_VOTE', minLen: 96, description: 'Private encrypted vote' },
    13: { name: 'REFERRAL_REGISTER', minLen: 48, description: 'Register referral' },
    
    // VSL Atomic Swaps (14-19)
    14: { name: 'HASHLOCK_COMMIT', minLen: 80, description: 'Commit with hashlock' },
    15: { name: 'HASHLOCK_REVEAL', minLen: 64, description: 'Reveal hashlock secret' },
    16: { name: 'CONDITIONAL_COMMIT', minLen: 96, description: 'Conditional action commit' },
    17: { name: 'BATCH_SETTLE', minLen: 128, description: 'Batch settlement' },
    18: { name: 'STATE_CHANNEL_OPEN', minLen: 80, description: 'Open state channel' },
    19: { name: 'STATE_CHANNEL_CLOSE', minLen: 64, description: 'Close state channel' },
    
    // Novel Privacy (20-31)
    20: { name: 'TIME_CAPSULE', minLen: 80, description: 'Time-locked message' },
    21: { name: 'GHOST_PDA', minLen: 64, description: 'Ghost PDA derivation' },
    22: { name: 'CPI_INSCRIBE', minLen: 48, description: 'CPI inscription' },
    23: { name: 'VTA_DELEGATE', minLen: 64, description: 'Delegate VTA rights' },
    24: { name: 'VTA_REVOKE', minLen: 48, description: 'Revoke VTA delegation' },
    25: { name: 'STEALTH_SWAP_INIT', minLen: 96, description: 'Init stealth swap' },
    26: { name: 'STEALTH_SWAP_EXEC', minLen: 80, description: 'Execute stealth swap' },
    27: { name: 'VTA_GUARDIAN_SET', minLen: 128, description: 'Set VTA guardians' },
    28: { name: 'VTA_GUARDIAN_RECOVER', minLen: 160, description: 'Guardian recovery' },
    29: { name: 'PRIVATE_SUBSCRIPTION', minLen: 96, description: 'Private recurring payment' },
    30: { name: 'MULTIPARTY_VTA_INIT', minLen: 128, description: 'Init k-of-n VTA' },
    31: { name: 'MULTIPARTY_VTA_SIGN', minLen: 96, description: 'Sign multiparty action' },
    
    // VSL Private Transfers (32-43)
    32: { name: 'VSL_DEPOSIT', minLen: 64, description: 'Deposit to VSL' },
    33: { name: 'VSL_WITHDRAW', minLen: 64, description: 'Withdraw from VSL' },
    34: { name: 'VSL_PRIVATE_TRANSFER', minLen: 96, description: 'VSL private transfer' },
    35: { name: 'VSL_PRIVATE_SWAP', minLen: 128, description: 'VSL private swap' },
    36: { name: 'VSL_SHIELDED_SEND', minLen: 96, description: 'Stealth address payment' },
    37: { name: 'VSL_SPLIT', minLen: 80, description: 'Split balance' },
    38: { name: 'VSL_MERGE', minLen: 80, description: 'Merge notes' },
    39: { name: 'VSL_ESCROW_CREATE', minLen: 96, description: 'Create escrow' },
    40: { name: 'VSL_ESCROW_RELEASE', minLen: 64, description: 'Release escrow' },
    41: { name: 'VSL_ESCROW_REFUND', minLen: 64, description: 'Refund escrow' },
    42: { name: 'VSL_BALANCE_PROOF', minLen: 80, description: 'Prove balance' },
    43: { name: 'VSL_AUDIT_REVEAL', minLen: 128, description: 'Reveal to auditor' },
    
    // Advanced Privacy (44-64)
    44: { name: 'DECOY_STORM', minLen: 128, description: 'Generate decoy txs' },
    45: { name: 'DECOY_REVEAL', minLen: 64, description: 'Reveal real tx' },
    46: { name: 'EPHEMERAL_CREATE', minLen: 64, description: 'Create ephemeral PDA' },
    47: { name: 'EPHEMERAL_DRAIN', minLen: 64, description: 'Drain ephemeral' },
    48: { name: 'CHRONO_LOCK', minLen: 80, description: 'Time lock content' },
    49: { name: 'CHRONO_REVEAL', minLen: 64, description: 'Reveal after time' },
    50: { name: 'SHADOW_FOLLOW', minLen: 64, description: 'Encrypted follow' },
    51: { name: 'SHADOW_UNFOLLOW', minLen: 48, description: 'Remove follow' },
    52: { name: 'PHANTOM_NFT_COMMIT', minLen: 64, description: 'Commit NFT ownership' },
    53: { name: 'PHANTOM_NFT_PROVE', minLen: 80, description: 'Prove NFT ownership' },
    54: { name: 'INNOCENCE_MINT', minLen: 64, description: 'Mint innocence' },
    55: { name: 'INNOCENCE_VERIFY', minLen: 48, description: 'Verify innocence' },
    56: { name: 'INNOCENCE_REVOKE', minLen: 48, description: 'Revoke innocence' },
    57: { name: 'CLEAN_SOURCE_REGISTER', minLen: 64, description: 'Register clean source' },
    58: { name: 'CLEAN_SOURCE_PROVE', minLen: 80, description: 'Prove clean source' },
    59: { name: 'TEMPORAL_INNOCENCE', minLen: 80, description: 'Temporal innocence proof' },
    60: { name: 'COMPLIANCE_CHANNEL_OPEN', minLen: 64, description: 'Open compliance channel' },
    61: { name: 'COMPLIANCE_CHANNEL_REPORT', minLen: 128, description: 'Submit compliance report' },
    62: { name: 'PROVENANCE_COMMIT', minLen: 64, description: 'Commit provenance' },
    63: { name: 'PROVENANCE_EXTEND', minLen: 80, description: 'Extend provenance' },
    64: { name: 'PROVENANCE_VERIFY', minLen: 64, description: 'Verify provenance' },
    
    // STS Token Operations (80-95)
    80: { name: 'NOTE_MINT', minLen: 80, description: 'Mint STS note' },
    81: { name: 'NOTE_TRANSFER', minLen: 96, description: 'Transfer note' },
    82: { name: 'NOTE_MERGE', minLen: 80, description: 'Merge notes' },
    83: { name: 'NOTE_SPLIT', minLen: 80, description: 'Split note' },
    84: { name: 'NOTE_BURN', minLen: 64, description: 'Burn note' },
    85: { name: 'GPOOL_DEPOSIT', minLen: 64, description: 'Pool deposit' },
    86: { name: 'GPOOL_WITHDRAW', minLen: 64, description: 'Pool withdraw' },
    87: { name: 'GPOOL_WITHDRAW_STEALTH', minLen: 96, description: 'Stealth withdraw' },
    88: { name: 'GPOOL_WITHDRAW_SWAP', minLen: 128, description: 'Withdraw with swap' },
    89: { name: 'MERKLE_UPDATE', minLen: 80, description: 'Update merkle' },
    90: { name: 'MERKLE_EMERGENCY', minLen: 64, description: 'Emergency merkle' },
    91: { name: 'NOTE_EXTEND', minLen: 80, description: 'Extend note' },
    92: { name: 'NOTE_FREEZE', minLen: 48, description: 'Freeze note' },
    93: { name: 'NOTE_THAW', minLen: 48, description: 'Thaw note' },
    94: { name: 'PROTOCOL_PAUSE', minLen: 16, description: 'Pause protocol' },
    95: { name: 'PROTOCOL_UNPAUSE', minLen: 16, description: 'Unpause protocol' },
    
    // Token-22 Parity (96-111)
    96: { name: 'GROUP_CREATE', minLen: 64, description: 'Create group' },
    97: { name: 'GROUP_ADD_MEMBER', minLen: 64, description: 'Add group member' },
    98: { name: 'GROUP_REMOVE_MEMBER', minLen: 64, description: 'Remove group member' },
    99: { name: 'HOOK_REGISTER', minLen: 64, description: 'Register hook' },
    100: { name: 'HOOK_EXECUTE', minLen: 80, description: 'Execute hook' },
    101: { name: 'WRAP_SPL', minLen: 64, description: 'Wrap SPL token' },
    102: { name: 'UNWRAP_SPL', minLen: 64, description: 'Unwrap to SPL' },
    103: { name: 'INTEREST_ACCRUE', minLen: 48, description: 'Accrue interest' },
    104: { name: 'INTEREST_CLAIM', minLen: 48, description: 'Claim interest' },
    105: { name: 'CONFIDENTIAL_MINT', minLen: 128, description: 'Confidential mint' },
    106: { name: 'CONFIDENTIAL_TRANSFER', minLen: 160, description: 'Confidential transfer' },
    107: { name: 'NFT_MINT', minLen: 128, description: 'Mint NFT' },
    108: { name: 'COLLECTION_CREATE', minLen: 96, description: 'Create collection' },
    109: { name: 'ROYALTY_CLAIM', minLen: 64, description: 'Claim royalties' },
    110: { name: 'FAIR_LAUNCH_COMMIT', minLen: 80, description: 'Fair launch commit' },
    111: { name: 'FAIR_LAUNCH_REVEAL', minLen: 64, description: 'Fair launch reveal' },
    
    // NFT Marketplace (112-121)
    112: { name: 'NFT_LIST', minLen: 96, description: 'List NFT for sale' },
    113: { name: 'NFT_DELIST', minLen: 48, description: 'Remove listing' },
    114: { name: 'NFT_BUY', minLen: 64, description: 'Buy NFT' },
    115: { name: 'NFT_OFFER', minLen: 80, description: 'Make offer' },
    116: { name: 'NFT_ACCEPT_OFFER', minLen: 64, description: 'Accept offer' },
    117: { name: 'NFT_CANCEL_OFFER', minLen: 48, description: 'Cancel offer' },
    118: { name: 'AUCTION_CREATE', minLen: 96, description: 'Create auction' },
    119: { name: 'AUCTION_BID', minLen: 64, description: 'Place bid' },
    120: { name: 'AUCTION_SETTLE', minLen: 64, description: 'Settle auction' },
    121: { name: 'AUCTION_CANCEL', minLen: 48, description: 'Cancel auction' },
    
    // Privacy Vouchers (122-130)
    122: { name: 'PPV_CREATE', minLen: 96, description: 'Create voucher' },
    123: { name: 'PPV_VERIFY', minLen: 64, description: 'Verify voucher' },
    124: { name: 'PPV_REDEEM', minLen: 80, description: 'Redeem voucher' },
    125: { name: 'PPV_TRANSFER', minLen: 80, description: 'Transfer voucher' },
    126: { name: 'PPV_EXTEND', minLen: 64, description: 'Extend voucher' },
    127: { name: 'PPV_REVOKE', minLen: 48, description: 'Revoke voucher' },
    128: { name: 'APB_TRANSFER', minLen: 96, description: 'Atomic privacy bridge' },
    129: { name: 'APB_BATCH', minLen: 128, description: 'Batch APB' },
    130: { name: 'STEALTH_SCAN_HINT', minLen: 64, description: 'Stealth scan hint' },
    
    // DeFi Adapters (131-142)
    131: { name: 'ADAPTER_REGISTER', minLen: 64, description: 'Register adapter' },
    132: { name: 'ADAPTER_CALL', minLen: 128, description: 'Call adapter' },
    133: { name: 'ADAPTER_CALLBACK', minLen: 80, description: 'Adapter callback' },
    134: { name: 'PRIVATE_SWAP', minLen: 128, description: 'Private swap' },
    135: { name: 'PRIVATE_STAKE', minLen: 80, description: 'Private stake' },
    136: { name: 'PRIVATE_UNSTAKE', minLen: 80, description: 'Private unstake' },
    137: { name: 'PRIVATE_LP_ADD', minLen: 96, description: 'Add private LP' },
    138: { name: 'PRIVATE_LP_REMOVE', minLen: 96, description: 'Remove private LP' },
    139: { name: 'POOL_CREATE', minLen: 96, description: 'Create pool' },
    140: { name: 'POOL_DEPOSIT', minLen: 64, description: 'Pool deposit' },
    141: { name: 'POOL_WITHDRAW', minLen: 64, description: 'Pool withdraw' },
    142: { name: 'POOL_DONATE', minLen: 64, description: 'Donate to pool' },
    
    // Yield & Staking (143-150)
    143: { name: 'YIELD_VAULT_CREATE', minLen: 80, description: 'Create yield vault' },
    144: { name: 'YIELD_DEPOSIT', minLen: 64, description: 'Deposit yield' },
    145: { name: 'YIELD_CLAIM', minLen: 48, description: 'Claim yield' },
    146: { name: 'YIELD_WITHDRAW', minLen: 64, description: 'Withdraw yield' },
    147: { name: 'TOKEN_CREATE', minLen: 96, description: 'Create token' },
    148: { name: 'TOKEN_SET_AUTHORITY', minLen: 64, description: 'Set token authority' },
    149: { name: 'TOKEN_METADATA_SET', minLen: 128, description: 'Set metadata' },
    150: { name: 'TOKEN_METADATA_UPDATE', minLen: 128, description: 'Update metadata' },
    
    // Token-22 Parity Plus (151-162)
    151: { name: 'HOOK_EXECUTE_REAL', minLen: 128, description: 'Real hook execute' },
    152: { name: 'CONFIDENTIAL_TRANSFER_V2', minLen: 192, description: 'Confidential v2' },
    153: { name: 'INTEREST_CLAIM_REAL', minLen: 64, description: 'Real interest claim' },
    154: { name: 'ROYALTY_CLAIM_REAL', minLen: 64, description: 'Real royalty claim' },
    155: { name: 'BATCH_NOTE_OPS', minLen: 256, description: 'Batch note ops' },
    156: { name: 'EXCHANGE_PROOF', minLen: 96, description: 'Exchange proof' },
    157: { name: 'SELECTIVE_DISCLOSURE', minLen: 128, description: 'Selective disclosure' },
    158: { name: 'CONDITIONAL_TRANSFER', minLen: 128, description: 'Conditional transfer' },
    159: { name: 'DELEGATION_CHAIN', minLen: 128, description: 'Delegation chain' },
    160: { name: 'TIME_LOCKED_REVEAL', minLen: 80, description: 'Time locked reveal' },
    161: { name: 'CROSS_MINT_ATOMIC', minLen: 160, description: 'Cross-mint atomic' },
    162: { name: 'SOCIAL_RECOVERY', minLen: 192, description: 'Social recovery' },
    
    // DeFi Deep Integration (163-175)
    163: { name: 'JUPITER_ROUTE', minLen: 160, description: 'Jupiter route' },
    164: { name: 'MARINADE_STAKE', minLen: 80, description: 'Marinade stake' },
    165: { name: 'DRIFT_PERP', minLen: 128, description: 'Drift perp' },
    166: { name: 'PRIVATE_LENDING', minLen: 96, description: 'Private lending' },
    167: { name: 'FLASH_LOAN', minLen: 128, description: 'Flash loan' },
    168: { name: 'ORACLE_BOUND', minLen: 96, description: 'Oracle bound' },
    169: { name: 'VELOCITY_LIMIT', minLen: 64, description: 'Velocity limit' },
    170: { name: 'GOVERNANCE_LOCK', minLen: 80, description: 'Governance lock' },
    171: { name: 'REPUTATION_GATE', minLen: 64, description: 'Reputation gate' },
    172: { name: 'GEO_RESTRICTION', minLen: 48, description: 'Geo restriction' },
    173: { name: 'TIME_DECAY', minLen: 64, description: 'Time decay' },
    174: { name: 'MULTI_SIG_NOTE', minLen: 160, description: 'Multi-sig note' },
    175: { name: 'RECOVERABLE_NOTE', minLen: 128, description: 'Recoverable note' },
    
    // AMM & DEX (176-191)
    176: { name: 'AMM_POOL_CREATE', minLen: 128, description: 'Create AMM pool' },
    177: { name: 'AMM_ADD_LIQUIDITY', minLen: 96, description: 'Add liquidity' },
    178: { name: 'AMM_REMOVE_LIQUIDITY', minLen: 96, description: 'Remove liquidity' },
    179: { name: 'AMM_SWAP', minLen: 80, description: 'AMM swap' },
    180: { name: 'AMM_QUOTE', minLen: 64, description: 'Get quote' },
    181: { name: 'AMM_SYNC', minLen: 48, description: 'Sync pool' },
    182: { name: 'LP_NOTE_MINT', minLen: 80, description: 'Mint LP note' },
    183: { name: 'LP_NOTE_BURN', minLen: 80, description: 'Burn LP note' },
    184: { name: 'ROUTER_SWAP', minLen: 128, description: 'Router swap' },
    185: { name: 'ROUTER_SPLIT', minLen: 160, description: 'Router split' },
    186: { name: 'LIMIT_ORDER_PLACE', minLen: 96, description: 'Place limit order' },
    187: { name: 'LIMIT_ORDER_FILL', minLen: 80, description: 'Fill limit order' },
    188: { name: 'LIMIT_ORDER_CANCEL', minLen: 48, description: 'Cancel limit order' },
    189: { name: 'TWAP_ORDER_START', minLen: 96, description: 'Start TWAP order' },
    190: { name: 'TWAP_ORDER_FILL', minLen: 64, description: 'Fill TWAP slice' },
    191: { name: 'CONCENTRATED_LP', minLen: 128, description: 'Concentrated LP' },
    
    // Provable Superiority (192-207)
    192: { name: 'NULLIFIER_CREATE', minLen: 80, description: 'Create nullifier' },
    193: { name: 'NULLIFIER_CHECK', minLen: 48, description: 'Check nullifier' },
    194: { name: 'MERKLE_ROOT_PUBLISH', minLen: 64, description: 'Publish merkle root' },
    195: { name: 'MERKLE_PROOF_VERIFY', minLen: 128, description: 'Verify merkle proof' },
    196: { name: 'BALANCE_ATTEST', minLen: 80, description: 'Attest balance' },
    197: { name: 'BALANCE_VERIFY', minLen: 64, description: 'Verify balance' },
    198: { name: 'FREEZE_ENFORCED', minLen: 96, description: 'Enforced freeze' },
    199: { name: 'THAW_GOVERNED', minLen: 80, description: 'Governed thaw' },
    200: { name: 'WRAPPER_MINT', minLen: 80, description: 'Mint wrapper token' },
    201: { name: 'WRAPPER_BURN', minLen: 80, description: 'Burn wrapper token' },
    202: { name: 'VALIDATOR_PROOF', minLen: 64, description: 'Validator proof' },
    203: { name: 'SECURITY_AUDIT', minLen: 128, description: 'Security audit' },
    204: { name: 'COMPLIANCE_PROOF', minLen: 96, description: 'Compliance proof' },
    205: { name: 'DECENTRALIZATION_METRIC', minLen: 80, description: 'Decentralization metric' },
    206: { name: 'ATOMIC_CPI_TRANSFER', minLen: 128, description: 'Atomic CPI transfer' },
    207: { name: 'BATCH_NULLIFIER', minLen: 160, description: 'Batch nullifier' },
    
    // v21 Zero-Rent (208-210)
    208: { name: 'NULLIFIER_INSCRIBE', minLen: 64, description: 'Inscribe nullifier' },
    209: { name: 'MERKLE_AIRDROP_ROOT', minLen: 64, description: 'Merkle airdrop root' },
    210: { name: 'MERKLE_AIRDROP_CLAIM', minLen: 96, description: 'Claim merkle airdrop' },
    
    // Private Securities (211-220)
    211: { name: 'SECURITY_ISSUE', minLen: 128, description: 'Issue security' },
    212: { name: 'SECURITY_TRANSFER', minLen: 128, description: 'Transfer security' },
    213: { name: 'TRANSFER_AGENT_REGISTER', minLen: 96, description: 'Register transfer agent' },
    214: { name: 'TRANSFER_AGENT_APPROVE', minLen: 80, description: 'TA approve transfer' },
    215: { name: 'ACCREDITATION_PROOF', minLen: 96, description: 'Accreditation proof' },
    216: { name: 'SHARE_CLASS_CREATE', minLen: 96, description: 'Create share class' },
    217: { name: 'CORPORATE_ACTION', minLen: 128, description: 'Corporate action' },
    218: { name: 'REG_D_LOCKUP', minLen: 80, description: 'Reg D lockup' },
    219: { name: 'INSTITUTIONAL_REPORT', minLen: 160, description: 'Institutional report' },
    220: { name: 'SECURITY_FREEZE', minLen: 64, description: 'Freeze security' },
    
    // Options Trading (221-230)
    221: { name: 'OPTION_WRITE', minLen: 128, description: 'Write option' },
    222: { name: 'OPTION_BUY', minLen: 96, description: 'Buy option' },
    223: { name: 'OPTION_EXERCISE', minLen: 80, description: 'Exercise option' },
    224: { name: 'OPTION_EXPIRE', minLen: 64, description: 'Expire option' },
    225: { name: 'OPTION_ASSIGN', minLen: 80, description: 'Assign option' },
    226: { name: 'OPTION_CLOSE', minLen: 64, description: 'Close option position' },
    227: { name: 'OPTION_COLLATERAL_LOCK', minLen: 80, description: 'Lock collateral' },
    228: { name: 'OPTION_COLLATERAL_RELEASE', minLen: 64, description: 'Release collateral' },
    229: { name: 'OPTION_SERIES_CREATE', minLen: 128, description: 'Create option series' },
    230: { name: 'OPTION_MARKET_MAKE', minLen: 96, description: 'MM bid/ask' },
    
    // Margin & Leverage (231-240)
    231: { name: 'MARGIN_ACCOUNT_CREATE', minLen: 80, description: 'Create margin account' },
    232: { name: 'MARGIN_DEPOSIT', minLen: 64, description: 'Deposit margin' },
    233: { name: 'MARGIN_WITHDRAW', minLen: 64, description: 'Withdraw margin' },
    234: { name: 'POSITION_OPEN', minLen: 96, description: 'Open position' },
    235: { name: 'POSITION_CLOSE', minLen: 80, description: 'Close position' },
    236: { name: 'POSITION_LIQUIDATE', minLen: 80, description: 'Liquidate position' },
    237: { name: 'MARGIN_CALL_EMIT', minLen: 64, description: 'Emit margin call' },
    238: { name: 'FUNDING_RATE_APPLY', minLen: 64, description: 'Apply funding rate' },
    239: { name: 'CROSS_MARGIN_SYNC', minLen: 80, description: 'Sync cross-margin' },
    240: { name: 'INSURANCE_FUND_CONTRIBUTE', minLen: 64, description: 'Contribute to insurance' },
    
    // Cross-Chain Bridges (241-255)
    241: { name: 'BRIDGE_LOCK', minLen: 96, description: 'Lock for bridge' },
    242: { name: 'BRIDGE_RELEASE', minLen: 128, description: 'Release from bridge' },
    243: { name: 'BRIDGE_BURN', minLen: 80, description: 'Burn for bridge' },
    244: { name: 'BRIDGE_MINT', minLen: 128, description: 'Mint from bridge' },
    245: { name: 'WORMHOLE_VAA_VERIFY', minLen: 256, description: 'Verify Wormhole VAA' },
    246: { name: 'LAYERZERO_ENDPOINT', minLen: 192, description: 'LayerZero endpoint' },
    247: { name: 'IBC_PACKET_RECV', minLen: 256, description: 'IBC packet receive' },
    248: { name: 'IBC_PACKET_ACK', minLen: 128, description: 'IBC acknowledgment' },
    249: { name: 'BTC_SPV_PROOF', minLen: 512, description: 'Bitcoin SPV proof' },
    250: { name: 'BTC_RELAY_SUBMIT', minLen: 256, description: 'Submit BTC header' },
    251: { name: 'ETH_STATE_PROOF', minLen: 384, description: 'ETH state proof' },
    252: { name: 'BRIDGE_FEE_COLLECT', minLen: 64, description: 'Collect bridge fees' },
    253: { name: 'BRIDGE_GUARDIAN_ROTATE', minLen: 160, description: 'Rotate guardians' },
    254: { name: 'BRIDGE_PAUSE', minLen: 32, description: 'Pause bridge' },
    255: { name: 'BRIDGE_RESUME', minLen: 32, description: 'Resume bridge' },
};

// Results tracking
interface TestResult {
    tag: number;
    name: string;
    passed: boolean;
    signature?: string;
    error?: string;
    latency?: number;
}

const results: TestResult[] = [];
let passed = 0;
let failed = 0;

// Helper to create instruction data with correct size
function createInstructionData(tag: number, minLen: number): Buffer {
    const data = Buffer.alloc(minLen);
    data[0] = tag;
    // Fill with deterministic test data
    for (let i = 1; i < minLen; i++) {
        data[i] = (tag + i) % 256;
    }
    return data;
}

// Test a single TAG
async function testTag(tag: number, config: { name: string; minLen: number; description: string }): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
        const data = createInstructionData(tag, config.minLen);
        
        const instruction = new TransactionInstruction({
            keys: [
                { pubkey: payer.publicKey, isSigner: true, isWritable: true },
            ],
            programId: PROGRAM_ID,
            data,
        });
        
        const tx = new Transaction().add(instruction);
        tx.feePayer = payer.publicKey;
        
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        
        const signature = await sendAndConfirmTransaction(connection, tx, [payer], {
            skipPreflight: false,
            commitment: 'confirmed',
        });
        
        const latency = Date.now() - startTime;
        passed++;
        
        return {
            tag,
            name: config.name,
            passed: true,
            signature,
            latency,
        };
    } catch (err: any) {
        failed++;
        const latency = Date.now() - startTime;
        
        // Extract meaningful error message
        let errorMsg = err.message || String(err);
        if (errorMsg.includes('custom program error:')) {
            const match = errorMsg.match(/custom program error: (0x[a-fA-F0-9]+)/);
            if (match) {
                errorMsg = `Program Error: ${match[1]}`;
            }
        } else if (errorMsg.includes('insufficient')) {
            errorMsg = 'Insufficient funds';
        } else if (errorMsg.length > 50) {
            errorMsg = errorMsg.substring(0, 50) + '...';
        }
        
        return {
            tag,
            name: config.name,
            passed: false,
            error: errorMsg,
            latency,
        };
    }
}

// Print colored output
function printResult(result: TestResult) {
    const status = result.passed ? '\x1b[32m✓ PASS\x1b[0m' : '\x1b[31m✗ FAIL\x1b[0m';
    const tagStr = `[${result.tag.toString().padStart(3, '0')}]`;
    const nameStr = result.name.padEnd(28);
    const latencyStr = result.latency ? `${result.latency}ms` : '';
    
    if (result.passed) {
        console.log(`${status} ${tagStr} ${nameStr} ${latencyStr.padStart(6)} | ${result.signature?.slice(0, 20)}...`);
    } else {
        console.log(`${status} ${tagStr} ${nameStr} ${latencyStr.padStart(6)} | ${result.error}`);
    }
}

// Print summary
function printSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('\x1b[1m                        STS TAG TEST SUMMARY\x1b[0m');
    console.log('='.repeat(80));
    
    const total = passed + failed;
    const percentage = ((passed / total) * 100).toFixed(1);
    
    console.log(`\n  Total Tests:  ${total}`);
    console.log(`  \x1b[32mPassed:      ${passed}\x1b[0m`);
    console.log(`  \x1b[31mFailed:      ${failed}\x1b[0m`);
    console.log(`  Pass Rate:   ${percentage}%`);
    
    // Group by category
    const categories: Record<string, { passed: number; total: number }> = {
        'Core Messaging (3-8)': { passed: 0, total: 0 },
        'Governance (9-13)': { passed: 0, total: 0 },
        'Atomic Swaps (14-19)': { passed: 0, total: 0 },
        'Novel Privacy (20-31)': { passed: 0, total: 0 },
        'VSL Privacy (32-43)': { passed: 0, total: 0 },
        'Advanced Privacy (44-64)': { passed: 0, total: 0 },
        'Token Ops (80-95)': { passed: 0, total: 0 },
        'Token-22 Parity (96-111)': { passed: 0, total: 0 },
        'NFT Marketplace (112-121)': { passed: 0, total: 0 },
        'Privacy Vouchers (122-130)': { passed: 0, total: 0 },
        'DeFi Adapters (131-142)': { passed: 0, total: 0 },
        'Yield & Staking (143-150)': { passed: 0, total: 0 },
        'Token-22 Plus (151-162)': { passed: 0, total: 0 },
        'DeFi Deep (163-175)': { passed: 0, total: 0 },
        'AMM & DEX (176-191)': { passed: 0, total: 0 },
        'Provable (192-207)': { passed: 0, total: 0 },
        'v21 Zero-Rent (208-210)': { passed: 0, total: 0 },
        'Securities (211-220)': { passed: 0, total: 0 },
        'Options (221-230)': { passed: 0, total: 0 },
        'Margin (231-240)': { passed: 0, total: 0 },
        'Bridges (241-255)': { passed: 0, total: 0 },
    };
    
    for (const result of results) {
        const tag = result.tag;
        let cat = 'Unknown';
        
        if (tag >= 3 && tag <= 8) cat = 'Core Messaging (3-8)';
        else if (tag >= 9 && tag <= 13) cat = 'Governance (9-13)';
        else if (tag >= 14 && tag <= 19) cat = 'Atomic Swaps (14-19)';
        else if (tag >= 20 && tag <= 31) cat = 'Novel Privacy (20-31)';
        else if (tag >= 32 && tag <= 43) cat = 'VSL Privacy (32-43)';
        else if (tag >= 44 && tag <= 64) cat = 'Advanced Privacy (44-64)';
        else if (tag >= 80 && tag <= 95) cat = 'Token Ops (80-95)';
        else if (tag >= 96 && tag <= 111) cat = 'Token-22 Parity (96-111)';
        else if (tag >= 112 && tag <= 121) cat = 'NFT Marketplace (112-121)';
        else if (tag >= 122 && tag <= 130) cat = 'Privacy Vouchers (122-130)';
        else if (tag >= 131 && tag <= 142) cat = 'DeFi Adapters (131-142)';
        else if (tag >= 143 && tag <= 150) cat = 'Yield & Staking (143-150)';
        else if (tag >= 151 && tag <= 162) cat = 'Token-22 Plus (151-162)';
        else if (tag >= 163 && tag <= 175) cat = 'DeFi Deep (163-175)';
        else if (tag >= 176 && tag <= 191) cat = 'AMM & DEX (176-191)';
        else if (tag >= 192 && tag <= 207) cat = 'Provable (192-207)';
        else if (tag >= 208 && tag <= 210) cat = 'v21 Zero-Rent (208-210)';
        else if (tag >= 211 && tag <= 220) cat = 'Securities (211-220)';
        else if (tag >= 221 && tag <= 230) cat = 'Options (221-230)';
        else if (tag >= 231 && tag <= 240) cat = 'Margin (231-240)';
        else if (tag >= 241 && tag <= 255) cat = 'Bridges (241-255)';
        
        if (categories[cat]) {
            categories[cat].total++;
            if (result.passed) categories[cat].passed++;
        }
    }
    
    console.log('\n  Category Breakdown:');
    console.log('  ' + '-'.repeat(50));
    
    for (const [cat, stats] of Object.entries(categories)) {
        if (stats.total > 0) {
            const pct = ((stats.passed / stats.total) * 100).toFixed(0);
            const bar = stats.passed === stats.total ? '\x1b[32m' : stats.passed === 0 ? '\x1b[31m' : '\x1b[33m';
            console.log(`  ${bar}${cat.padEnd(28)} ${stats.passed}/${stats.total} (${pct}%)\x1b[0m`);
        }
    }
    
    console.log('\n' + '='.repeat(80));
}

// Main execution
async function main() {
    console.log('\x1b[1m');
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║              STS DEVNET TAG TEST SUITE - LIVE TERMINAL                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');
    console.log('\x1b[0m');
    
    console.log(`Program ID: ${PROGRAM_ID.toBase58()}`);
    console.log(`Wallet:     ${payer.publicKey.toBase58()}`);
    
    const balance = await connection.getBalance(payer.publicKey);
    console.log(`Balance:    ${(balance / 1e9).toFixed(4)} SOL`);
    console.log(`Tags:       ${Object.keys(TAG_CONFIG).length} to test`);
    console.log('');
    console.log('-'.repeat(80));
    console.log('');
    
    // Test all TAGs in order
    const tags = Object.keys(TAG_CONFIG).map(Number).sort((a, b) => a - b);
    
    for (const tag of tags) {
        const config = TAG_CONFIG[tag];
        const result = await testTag(tag, config);
        results.push(result);
        printResult(result);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    printSummary();
    
    // Save results to file
    const resultsFile = '/workspaces/StyxStack/test-results.json';
    fs.writeFileSync(resultsFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        programId: PROGRAM_ID.toBase58(),
        wallet: payer.publicKey.toBase58(),
        summary: { passed, failed, total: passed + failed },
        results,
    }, null, 2));
    
    console.log(`\nResults saved to: ${resultsFile}`);
}

main().catch(console.error);
