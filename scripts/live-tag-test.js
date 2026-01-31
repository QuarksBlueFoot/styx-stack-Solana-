#!/usr/bin/env node
/**
 * STS TAG Live Devnet Test Runner
 * Tests all 167 TAGs against the deployed devnet program
 * Shows results live in terminal with color coding
 */

const { 
  Connection, 
  Keypair, 
  Transaction, 
  TransactionInstruction, 
  PublicKey, 
  sendAndConfirmTransaction 
} = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
};

// Config
const PROGRAM_ID = new PublicKey('FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW');
const RPC_URL = 'https://api.devnet.solana.com';
const WALLET_PATH = path.join(__dirname, '../.devnet/test-wallet.json');

// All 167 TAGs with their MIN_LEN requirements from lib.rs
const TAG_CONFIGS = {
  // Core Messaging (3-8)
  3: { name: 'PrivateMemo', minLen: 64, category: 'Core Messaging' },
  4: { name: 'GroupMemo', minLen: 96, category: 'Core Messaging' },
  5: { name: 'BroadcastMemo', minLen: 64, category: 'Core Messaging' },
  6: { name: 'RatchetMemo', minLen: 128, category: 'Core Messaging' },
  7: { name: 'EphemeralMemo', minLen: 64, category: 'Core Messaging' },
  8: { name: 'MultiRecipientMemo', minLen: 128, category: 'Core Messaging' },

  // Governance (9-13)
  9: { name: 'PrivateVote', minLen: 48, category: 'Governance' },
  10: { name: 'WeightedVote', minLen: 64, category: 'Governance' },
  11: { name: 'MultiChoiceVote', minLen: 64, category: 'Governance' },
  12: { name: 'QuadraticVote', minLen: 64, category: 'Governance' },
  13: { name: 'DelegatedVote', minLen: 96, category: 'Governance' },

  // VSL Atomic Swaps (14-19)
  14: { name: 'AtomicSwapOffer', minLen: 128, category: 'VSL Atomic' },
  15: { name: 'AtomicSwapAccept', minLen: 96, category: 'VSL Atomic' },
  16: { name: 'AtomicSwapCancel', minLen: 64, category: 'VSL Atomic' },
  17: { name: 'CrossChainSwap', minLen: 128, category: 'VSL Atomic' },
  18: { name: 'TimelockSwap', minLen: 96, category: 'VSL Atomic' },
  19: { name: 'MultiAssetSwap', minLen: 128, category: 'VSL Atomic' },

  // Novel Privacy (20-31)
  20: { name: 'ZkRangeProof', minLen: 128, category: 'Novel Privacy' },
  21: { name: 'ZkMembershipProof', minLen: 96, category: 'Novel Privacy' },
  22: { name: 'ZkBalanceProof', minLen: 128, category: 'Novel Privacy' },
  23: { name: 'RingSignature', minLen: 160, category: 'Novel Privacy' },
  24: { name: 'StealthTransfer', minLen: 96, category: 'Novel Privacy' },
  25: { name: 'ConfidentialNote', minLen: 64, category: 'Novel Privacy' },
  26: { name: 'BlindedCommitment', minLen: 80, category: 'Novel Privacy' },
  27: { name: 'ThresholdDecrypt', minLen: 128, category: 'Novel Privacy' },
  28: { name: 'PrivateAuction', minLen: 128, category: 'Novel Privacy' },
  29: { name: 'SealedBid', minLen: 96, category: 'Novel Privacy' },
  30: { name: 'RevealBid', minLen: 64, category: 'Novel Privacy' },
  31: { name: 'AuctionSettle', minLen: 48, category: 'Novel Privacy' },

  // VSL Privacy (32-43)
  32: { name: 'VslPrivateTransfer', minLen: 96, category: 'VSL Privacy' },
  33: { name: 'VslShieldDeposit', minLen: 96, category: 'VSL Privacy' },
  34: { name: 'VslUnshieldWithdraw', minLen: 96, category: 'VSL Privacy' },
  35: { name: 'VslSplit', minLen: 128, category: 'VSL Privacy' },
  36: { name: 'VslMerge', minLen: 128, category: 'VSL Privacy' },
  37: { name: 'VslRotateKeys', minLen: 64, category: 'VSL Privacy' },
  38: { name: 'VslDelegateView', minLen: 64, category: 'VSL Privacy' },
  39: { name: 'VslRevokeView', minLen: 48, category: 'VSL Privacy' },
  40: { name: 'VslBatchTransfer', minLen: 128, category: 'VSL Privacy' },
  41: { name: 'VslRecurringPayment', minLen: 96, category: 'VSL Privacy' },
  42: { name: 'VslScheduledTransfer', minLen: 96, category: 'VSL Privacy' },
  43: { name: 'VslConditionalTransfer', minLen: 128, category: 'VSL Privacy' },

  // Advanced Privacy (44-64)
  44: { name: 'PrivateNftMint', minLen: 128, category: 'Advanced Privacy' },
  45: { name: 'PrivateNftTransfer', minLen: 96, category: 'Advanced Privacy' },
  46: { name: 'PrivateNftBurn', minLen: 64, category: 'Advanced Privacy' },
  47: { name: 'PrivateNftReveal', minLen: 96, category: 'Advanced Privacy' },
  48: { name: 'PrivateAirdrop', minLen: 128, category: 'Advanced Privacy' },
  49: { name: 'ClaimAirdrop', minLen: 64, category: 'Advanced Privacy' },
  50: { name: 'PrivatePayroll', minLen: 128, category: 'Advanced Privacy' },
  51: { name: 'PayrollClaim', minLen: 64, category: 'Advanced Privacy' },
  52: { name: 'PrivateSubscription', minLen: 96, category: 'Advanced Privacy' },
  53: { name: 'SubscriptionRenew', minLen: 64, category: 'Advanced Privacy' },
  54: { name: 'PrivateGrant', minLen: 128, category: 'Advanced Privacy' },
  55: { name: 'GrantVesting', minLen: 96, category: 'Advanced Privacy' },
  56: { name: 'GrantClaim', minLen: 64, category: 'Advanced Privacy' },
  57: { name: 'PrivateLoan', minLen: 128, category: 'Advanced Privacy' },
  58: { name: 'LoanRepayment', minLen: 96, category: 'Advanced Privacy' },
  59: { name: 'LoanLiquidate', minLen: 96, category: 'Advanced Privacy' },
  60: { name: 'PrivateEscrow', minLen: 128, category: 'Advanced Privacy' },
  61: { name: 'EscrowRelease', minLen: 64, category: 'Advanced Privacy' },
  62: { name: 'EscrowDispute', minLen: 96, category: 'Advanced Privacy' },
  63: { name: 'PrivateMultisig', minLen: 128, category: 'Advanced Privacy' },
  64: { name: 'MultisigApprove', minLen: 48, category: 'Advanced Privacy' },

  // Token Ops (80-95)
  80: { name: 'WrapperMint', minLen: 64, category: 'Token Ops' },
  81: { name: 'WrapperBurn', minLen: 64, category: 'Token Ops' },
  82: { name: 'WrapperTransfer', minLen: 48, category: 'Token Ops' },
  83: { name: 'TokenFreeze', minLen: 32, category: 'Token Ops' },
  84: { name: 'TokenThaw', minLen: 32, category: 'Token Ops' },
  85: { name: 'TokenMint', minLen: 48, category: 'Token Ops' },
  86: { name: 'TokenBurn', minLen: 48, category: 'Token Ops' },
  87: { name: 'TokenApprove', minLen: 48, category: 'Token Ops' },
  88: { name: 'TokenRevoke', minLen: 32, category: 'Token Ops' },
  89: { name: 'TokenClose', minLen: 16, category: 'Token Ops' },
  90: { name: 'BatchMint', minLen: 128, category: 'Token Ops' },
  91: { name: 'BatchBurn', minLen: 128, category: 'Token Ops' },
  92: { name: 'BatchTransfer', minLen: 128, category: 'Token Ops' },
  93: { name: 'CreateTokenAccount', minLen: 64, category: 'Token Ops' },
  94: { name: 'InitializeMint', minLen: 96, category: 'Token Ops' },
  95: { name: 'SetAuthority', minLen: 64, category: 'Token Ops' },

  // Token-22 Parity (96-111)
  96: { name: 'TransferFeeConfig', minLen: 64, category: 'Token-22 Parity' },
  97: { name: 'TransferFeeCollect', minLen: 48, category: 'Token-22 Parity' },
  98: { name: 'InterestBearingConfig', minLen: 64, category: 'Token-22 Parity' },
  99: { name: 'InterestAccrue', minLen: 48, category: 'Token-22 Parity' },
  100: { name: 'NonTransferableConfig', minLen: 48, category: 'Token-22 Parity' },
  101: { name: 'PermanentDelegateConfig', minLen: 64, category: 'Token-22 Parity' },
  102: { name: 'MemoRequiredConfig', minLen: 48, category: 'Token-22 Parity' },
  103: { name: 'ImmutableOwnerConfig', minLen: 32, category: 'Token-22 Parity' },
  104: { name: 'CpiGuardConfig', minLen: 48, category: 'Token-22 Parity' },
  105: { name: 'DefaultAccountStateConfig', minLen: 48, category: 'Token-22 Parity' },
  106: { name: 'MetadataPointerConfig', minLen: 96, category: 'Token-22 Parity' },
  107: { name: 'TokenMetadataConfig', minLen: 160, category: 'Token-22 Parity' },
  108: { name: 'GroupPointerConfig', minLen: 64, category: 'Token-22 Parity' },
  109: { name: 'GroupMemberConfig', minLen: 64, category: 'Token-22 Parity' },
  110: { name: 'TransferHookConfig', minLen: 96, category: 'Token-22 Parity' },
  111: { name: 'ConfidentialTransferConfig', minLen: 128, category: 'Token-22 Parity' },

  // NFT Marketplace (112-121)
  112: { name: 'NftList', minLen: 96, category: 'NFT Marketplace' },
  113: { name: 'NftDelist', minLen: 48, category: 'NFT Marketplace' },
  114: { name: 'NftBuy', minLen: 64, category: 'NFT Marketplace' },
  115: { name: 'NftOffer', minLen: 80, category: 'NFT Marketplace' },
  116: { name: 'NftAcceptOffer', minLen: 64, category: 'NFT Marketplace' },
  117: { name: 'NftRejectOffer', minLen: 48, category: 'NFT Marketplace' },
  118: { name: 'NftAuction', minLen: 96, category: 'NFT Marketplace' },
  119: { name: 'NftBid', minLen: 64, category: 'NFT Marketplace' },
  120: { name: 'NftAuctionSettle', minLen: 48, category: 'NFT Marketplace' },
  121: { name: 'NftRoyaltyConfig', minLen: 80, category: 'NFT Marketplace' },

  // Privacy Vouchers (122-130)
  122: { name: 'VoucherCreate', minLen: 96, category: 'Privacy Vouchers' },
  123: { name: 'VoucherRedeem', minLen: 64, category: 'Privacy Vouchers' },
  124: { name: 'VoucherTransfer', minLen: 64, category: 'Privacy Vouchers' },
  125: { name: 'VoucherSplit', minLen: 96, category: 'Privacy Vouchers' },
  126: { name: 'VoucherMerge', minLen: 96, category: 'Privacy Vouchers' },
  127: { name: 'VoucherExpire', minLen: 48, category: 'Privacy Vouchers' },
  128: { name: 'VoucherRefund', minLen: 64, category: 'Privacy Vouchers' },
  129: { name: 'VoucherDelegate', minLen: 64, category: 'Privacy Vouchers' },
  130: { name: 'VoucherRevoke', minLen: 48, category: 'Privacy Vouchers' },

  // DeFi Adapters (131-142)
  131: { name: 'PrivateSwap', minLen: 128, category: 'DeFi Adapters' },
  132: { name: 'PrivateLiquidity', minLen: 128, category: 'DeFi Adapters' },
  133: { name: 'PrivateWithdrawLiquidity', minLen: 96, category: 'DeFi Adapters' },
  134: { name: 'PrivateFarm', minLen: 96, category: 'DeFi Adapters' },
  135: { name: 'PrivateHarvest', minLen: 64, category: 'DeFi Adapters' },
  136: { name: 'PrivateLend', minLen: 96, category: 'DeFi Adapters' },
  137: { name: 'PrivateBorrow', minLen: 128, category: 'DeFi Adapters' },
  138: { name: 'PrivateRepay', minLen: 96, category: 'DeFi Adapters' },
  139: { name: 'PrivateFlashLoan', minLen: 128, category: 'DeFi Adapters' },
  140: { name: 'PrivateLeverage', minLen: 128, category: 'DeFi Adapters' },
  141: { name: 'PrivateDeleverage', minLen: 96, category: 'DeFi Adapters' },
  142: { name: 'PrivateArbitrage', minLen: 128, category: 'DeFi Adapters' },

  // Yield & Staking (143-150)
  143: { name: 'PrivateStake', minLen: 96, category: 'Yield & Staking' },
  144: { name: 'PrivateUnstake', minLen: 64, category: 'Yield & Staking' },
  145: { name: 'PrivateClaimRewards', minLen: 64, category: 'Yield & Staking' },
  146: { name: 'PrivateCompound', minLen: 64, category: 'Yield & Staking' },
  147: { name: 'PrivateRestake', minLen: 80, category: 'Yield & Staking' },
  148: { name: 'LiquidStake', minLen: 96, category: 'Yield & Staking' },
  149: { name: 'LiquidUnstake', minLen: 64, category: 'Yield & Staking' },
  150: { name: 'StakingPoolCreate', minLen: 128, category: 'Yield & Staking' },

  // Token-22 Plus (151-162)
  151: { name: 'ConfidentialMint', minLen: 128, category: 'Token-22 Plus' },
  152: { name: 'ConfidentialBurn', minLen: 128, category: 'Token-22 Plus' },
  153: { name: 'ConfidentialApprove', minLen: 96, category: 'Token-22 Plus' },
  154: { name: 'ElGamalEncrypt', minLen: 64, category: 'Token-22 Plus' },
  155: { name: 'ElGamalDecrypt', minLen: 64, category: 'Token-22 Plus' },
  156: { name: 'PedersenCommit', minLen: 80, category: 'Token-22 Plus' },
  157: { name: 'BulletproofRange', minLen: 256, category: 'Token-22 Plus' },
  158: { name: 'SigmaProof', minLen: 128, category: 'Token-22 Plus' },
  159: { name: 'WithdrawWithheldTokens', minLen: 64, category: 'Token-22 Plus' },
  160: { name: 'HarvestWithheldTokens', minLen: 96, category: 'Token-22 Plus' },
  161: { name: 'TransferCheckedWithFee', minLen: 96, category: 'Token-22 Plus' },
  162: { name: 'ConfidentialTransferWithFee', minLen: 160, category: 'Token-22 Plus' },

  // DeFi Deep (163-175)
  163: { name: 'CreateVault', minLen: 128, category: 'DeFi Deep' },
  164: { name: 'VaultDeposit', minLen: 64, category: 'DeFi Deep' },
  165: { name: 'VaultWithdraw', minLen: 64, category: 'DeFi Deep' },
  166: { name: 'VaultRebalance', minLen: 96, category: 'DeFi Deep' },
  167: { name: 'StrategyExecute', minLen: 128, category: 'DeFi Deep' },
  168: { name: 'YieldOptimize', minLen: 96, category: 'DeFi Deep' },
  169: { name: 'AutoCompound', minLen: 64, category: 'DeFi Deep' },
  170: { name: 'DcaCreate', minLen: 96, category: 'DeFi Deep' },
  171: { name: 'DcaExecute', minLen: 48, category: 'DeFi Deep' },
  172: { name: 'DcaCancel', minLen: 48, category: 'DeFi Deep' },
  173: { name: 'LimitOrderCreate', minLen: 96, category: 'DeFi Deep' },
  174: { name: 'LimitOrderFill', minLen: 64, category: 'DeFi Deep' },
  175: { name: 'LimitOrderCancel', minLen: 48, category: 'DeFi Deep' },

  // AMM & DEX (176-191)
  176: { name: 'CreatePool', minLen: 160, category: 'AMM & DEX' },
  177: { name: 'AddLiquidity', minLen: 96, category: 'AMM & DEX' },
  178: { name: 'RemoveLiquidity', minLen: 96, category: 'AMM & DEX' },
  179: { name: 'SwapExactIn', minLen: 80, category: 'AMM & DEX' },
  180: { name: 'SwapExactOut', minLen: 80, category: 'AMM & DEX' },
  181: { name: 'MultiHopSwap', minLen: 128, category: 'AMM & DEX' },
  182: { name: 'ConcentratedLiquidity', minLen: 128, category: 'AMM & DEX' },
  183: { name: 'RangeOrder', minLen: 96, category: 'AMM & DEX' },
  184: { name: 'CollectFees', minLen: 48, category: 'AMM & DEX' },
  185: { name: 'IncreaseLiquidity', minLen: 80, category: 'AMM & DEX' },
  186: { name: 'DecreaseLiquidity', minLen: 80, category: 'AMM & DEX' },
  187: { name: 'FlashSwap', minLen: 128, category: 'AMM & DEX' },
  188: { name: 'OracleUpdate', minLen: 64, category: 'AMM & DEX' },
  189: { name: 'TwapOrder', minLen: 96, category: 'AMM & DEX' },
  190: { name: 'VwapOrder', minLen: 96, category: 'AMM & DEX' },
  191: { name: 'IcebergOrder', minLen: 128, category: 'AMM & DEX' },

  // Provable Superiority (192-207)
  192: { name: 'MembranePermeabilityConfig', minLen: 96, category: 'Provable Superiority' },
  193: { name: 'TrustSuperposition', minLen: 80, category: 'Provable Superiority' },
  194: { name: 'AsymmetricReveal', minLen: 128, category: 'Provable Superiority' },
  195: { name: 'SelectiveTransparency', minLen: 96, category: 'Provable Superiority' },
  196: { name: 'PrivacyGradient', minLen: 80, category: 'Provable Superiority' },
  197: { name: 'ComposablePrivacy', minLen: 128, category: 'Provable Superiority' },
  198: { name: 'PrivacyInheritance', minLen: 96, category: 'Provable Superiority' },
  199: { name: 'ZkBridge', minLen: 160, category: 'Provable Superiority' },
  200: { name: 'ZkOracle', minLen: 128, category: 'Provable Superiority' },
  201: { name: 'ZkIdentity', minLen: 96, category: 'Provable Superiority' },
  202: { name: 'ZkCredential', minLen: 128, category: 'Provable Superiority' },
  203: { name: 'ZkAttestation', minLen: 96, category: 'Provable Superiority' },
  204: { name: 'ZkCompliance', minLen: 128, category: 'Provable Superiority' },
  205: { name: 'ZkAudit', minLen: 160, category: 'Provable Superiority' },
  206: { name: 'ZkReport', minLen: 128, category: 'Provable Superiority' },
  207: { name: 'ZkVerify', minLen: 48, category: 'Provable Superiority' },

  // v21 Zero-Rent (208-210)
  208: { name: 'ZeroRentInit', minLen: 64, category: 'v21 Zero-Rent' },
  209: { name: 'ZeroRentTransfer', minLen: 64, category: 'v21 Zero-Rent' },
  210: { name: 'ZeroRentClose', minLen: 96, category: 'v21 Zero-Rent' },

  // Securities (211-220)
  211: { name: 'SecurityIssue', minLen: 160, category: 'Securities' },
  212: { name: 'SecurityTransfer', minLen: 128, category: 'Securities' },
  213: { name: 'SecurityRedeem', minLen: 96, category: 'Securities' },
  214: { name: 'DividendDeclare', minLen: 96, category: 'Securities' },
  215: { name: 'DividendClaim', minLen: 64, category: 'Securities' },
  216: { name: 'VotingRights', minLen: 80, category: 'Securities' },
  217: { name: 'ProxyVote', minLen: 96, category: 'Securities' },
  218: { name: 'CorporateAction', minLen: 128, category: 'Securities' },
  219: { name: 'RegDCompliance', minLen: 128, category: 'Securities' },
  220: { name: 'AccreditedInvestor', minLen: 96, category: 'Securities' },

  // Options (221-230)
  221: { name: 'OptionMint', minLen: 128, category: 'Options' },
  222: { name: 'OptionExercise', minLen: 96, category: 'Options' },
  223: { name: 'OptionExpire', minLen: 48, category: 'Options' },
  224: { name: 'OptionSettle', minLen: 80, category: 'Options' },
  225: { name: 'WriteCoveredCall', minLen: 96, category: 'Options' },
  226: { name: 'WriteSecuredPut', minLen: 96, category: 'Options' },
  227: { name: 'SpreadCreate', minLen: 128, category: 'Options' },
  228: { name: 'StraddleCreate', minLen: 128, category: 'Options' },
  229: { name: 'IronCondor', minLen: 160, category: 'Options' },
  230: { name: 'Butterfly', minLen: 128, category: 'Options' },

  // Margin (231-240)
  231: { name: 'MarginOpen', minLen: 96, category: 'Margin' },
  232: { name: 'MarginAddCollateral', minLen: 64, category: 'Margin' },
  233: { name: 'MarginRemoveCollateral', minLen: 64, category: 'Margin' },
  234: { name: 'MarginBorrow', minLen: 80, category: 'Margin' },
  235: { name: 'MarginRepay', minLen: 64, category: 'Margin' },
  236: { name: 'MarginLiquidate', minLen: 96, category: 'Margin' },
  237: { name: 'CrossMargin', minLen: 96, category: 'Margin' },
  238: { name: 'IsolatedMargin', minLen: 80, category: 'Margin' },
  239: { name: 'MarginCall', minLen: 64, category: 'Margin' },
  240: { name: 'AutoDeleverage', minLen: 80, category: 'Margin' },

  // Bridges (241-255)
  241: { name: 'BridgeLock', minLen: 96, category: 'Bridges' },
  242: { name: 'BridgeUnlock', minLen: 96, category: 'Bridges' },
  243: { name: 'BridgeMint', minLen: 80, category: 'Bridges' },
  244: { name: 'BridgeBurn', minLen: 80, category: 'Bridges' },
  245: { name: 'BridgeAttest', minLen: 128, category: 'Bridges' },
  246: { name: 'BridgeVerify', minLen: 96, category: 'Bridges' },
  247: { name: 'WormholeTransfer', minLen: 128, category: 'Bridges' },
  248: { name: 'LayerZeroSend', minLen: 128, category: 'Bridges' },
  249: { name: 'AxelarGmp', minLen: 160, category: 'Bridges' },
  250: { name: 'CcipReceive', minLen: 128, category: 'Bridges' },
  251: { name: 'IbcTransfer', minLen: 128, category: 'Bridges' },
  252: { name: 'ThunderLane', minLen: 64, category: 'Bridges' },
  253: { name: 'HyperlaneDispatch', minLen: 128, category: 'Bridges' },
  254: { name: 'DebridgeSend', minLen: 128, category: 'Bridges' },
  255: { name: 'AllbridgeCore', minLen: 512, category: 'Bridges' },
};

// Results tracking
const results = {
  passed: [],
  failed: [],
  errors: [],
  startTime: Date.now(),
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logResult(tag, name, success, txSig, error) {
  const icon = success ? '✅' : '❌';
  const color = success ? 'green' : 'red';
  const sigDisplay = txSig ? txSig.substring(0, 20) + '...' : 'N/A';
  log(`  ${icon} TAG ${tag.toString().padStart(3)}: ${name.padEnd(30)} | ${sigDisplay}`, color);
  if (error && !success) {
    log(`     └─ ${error}`, 'yellow');
  }
}

async function testTag(connection, payer, tag, config) {
  try {
    // Create instruction data: [tag, ...payload]
    const payload = Buffer.alloc(config.minLen);
    // Fill with random data for testing
    for (let i = 0; i < config.minLen; i++) {
      payload[i] = Math.floor(Math.random() * 256);
    }
    
    const data = Buffer.concat([Buffer.from([tag]), payload]);
    
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      ],
      programId: PROGRAM_ID,
      data,
    });

    const transaction = new Transaction().add(instruction);
    
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer],
      { commitment: 'confirmed', skipPreflight: true }
    );

    return { success: true, signature, error: null };
  } catch (error) {
    // Parse error message
    let errorMsg = error.message || 'Unknown error';
    if (error.logs && Array.isArray(error.logs)) {
      const logError = error.logs.find(l => l && (l.includes('Error') || l.includes('failed')));
      if (logError) errorMsg = logError;
    }
    return { success: false, signature: null, error: (errorMsg || 'Unknown').substring(0, 80) };
  }
}

async function main() {
  console.log('\n');
  log('╔═══════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║              STS TAG LIVE DEVNET TEST RUNNER                     ║', 'cyan');
  log('║                    167 TAGs • All Categories                      ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('');

  // Load wallet
  log('📁 Loading wallet...', 'yellow');
  const walletData = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(walletData));
  log(`   Wallet: ${payer.publicKey.toBase58()}`, 'white');

  // Connect to devnet
  log('🌐 Connecting to Devnet...', 'yellow');
  const connection = new Connection(RPC_URL, 'confirmed');
  
  const balance = await connection.getBalance(payer.publicKey);
  log(`   Balance: ${(balance / 1e9).toFixed(4)} SOL`, 'white');
  log(`   Program: ${PROGRAM_ID.toBase58()}`, 'white');
  console.log('');

  // Group tags by category
  const categories = {};
  for (const [tagStr, config] of Object.entries(TAG_CONFIGS)) {
    const cat = config.category;
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push({ tag: parseInt(tagStr), ...config });
  }

  const totalTags = Object.keys(TAG_CONFIGS).length;
  let processed = 0;

  // Test each category
  for (const [category, tags] of Object.entries(categories)) {
    log(`\n┌─ ${category} (${tags.length} TAGs) ─────────────────────────────────────`, 'magenta');
    
    for (const { tag, name, minLen } of tags) {
      processed++;
      const progress = `[${processed}/${totalTags}]`;
      
      process.stdout.write(`\r${colors.blue}${progress}${colors.reset} Testing TAG ${tag}: ${name}...`);
      
      const result = await testTag(connection, payer, tag, { name, minLen, category });
      
      // Clear line and print result
      process.stdout.write('\r' + ' '.repeat(80) + '\r');
      logResult(tag, name, result.success, result.signature, result.error);
      
      if (result.success) {
        results.passed.push({ tag, name, category, signature: result.signature });
      } else {
        results.failed.push({ tag, name, category, error: result.error });
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // Summary
  const elapsed = ((Date.now() - results.startTime) / 1000).toFixed(1);
  console.log('\n');
  log('╔═══════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                         TEST SUMMARY                              ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('');
  log(`  Total TAGs Tested: ${totalTags}`, 'white');
  log(`  ✅ Passed: ${results.passed.length}`, 'green');
  log(`  ❌ Failed: ${results.failed.length}`, 'red');
  log(`  ⏱️  Time: ${elapsed}s`, 'yellow');
  log(`  📊 Success Rate: ${((results.passed.length / totalTags) * 100).toFixed(1)}%`, 'cyan');
  console.log('');

  // Category breakdown
  log('┌─ Results by Category ─────────────────────────────────────────────', 'magenta');
  for (const [category, tags] of Object.entries(categories)) {
    const passed = results.passed.filter(r => r.category === category).length;
    const total = tags.length;
    const pct = ((passed / total) * 100).toFixed(0);
    const bar = '█'.repeat(Math.floor(passed / total * 20)) + '░'.repeat(20 - Math.floor(passed / total * 20));
    log(`  ${category.padEnd(25)} ${bar} ${passed}/${total} (${pct}%)`, passed === total ? 'green' : 'yellow');
  }
  console.log('');

  // Save results
  const resultsPath = path.join(__dirname, '../test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  log(`📄 Results saved to: ${resultsPath}`, 'cyan');

  // Sample transactions
  if (results.passed.length > 0) {
    log('\n┌─ Sample Successful Transactions ──────────────────────────────────', 'magenta');
    results.passed.slice(0, 5).forEach(r => {
      log(`  TAG ${r.tag}: https://explorer.solana.com/tx/${r.signature}?cluster=devnet`, 'blue');
    });
  }

  console.log('\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
