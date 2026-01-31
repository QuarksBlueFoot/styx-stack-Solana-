/**
 * @styxstack/ecosystem-bridge
 * 
 * Bridge STS tokens and Ghost NFTs (ANONFTs) to existing DeFi ecosystems.
 * 
 * Problem: DEXes and NFT marketplaces don't natively support STS (yet).
 * Solution: Wrapper tokens and wrapped cNFTs that are 100% compatible.
 * 
 * Key Features:
 * 
 * 1. WRAPPER TOKENS (Token-22)
 *    - STS Note → Lock → Mint wrapper token (Token-22)
 *    - Trade on Jupiter, Raydium, Orca, any DEX
 *    - Create liquidity pools
 *    - Burn wrapper → Unlock STS Note (privacy restored)
 * 
 * 2. ANONFTs (Ghost NFTs)
 *    - Ghost NFT → Wrap → Mint cNFT (Bubblegum/Metaplex)
 *    - List/trade on Magic Eden, Tensor
 *    - Burn cNFT → Restore Ghost NFT (privacy restored)
 * 
 * 3. DEX INTEGRATION
 *    - Jupiter aggregator routing
 *    - Raydium AMM/CLMM pools
 *    - Orca Whirlpools
 *    - Private swaps (STS Note → DEX → STS Note)
 * 
 * 4. SOLANA MOBILE (MWA v2)
 *    - Session-based authorization
 *    - Offline transaction queue
 *    - Solana Pay QR codes
 *    - Push notifications
 * 
 * Philosophy: "Privacy on demand"
 * - Trade publicly when needed (wrapped)
 * - Unwrap to restore privacy anytime
 * - Your choice, your control
 * 
 * @module @styxstack/ecosystem-bridge
 */

// ============================================================================
// CORE EXPORTS
// ============================================================================

// Wrapper tokens
export {
    // Types
    WrapperConfig,
    WrapResult,
    UnwrapResult,
    JupiterRoute,
    
    // Core functions
    initializeWrapper,
    wrapNotes,
    unwrapTokens,
    syncWrapperMetadata,
    deriveWrapperMint,
    deriveWrapperVault,
    
    // Jupiter integration
    getJupiterQuote,
    executeJupiterSwap,
    
    // Raydium integration
    createRaydiumPool,
    addRaydiumLiquidity,
    removeRaydiumLiquidity,
    
    // Constants
    TOKEN_2022_PROGRAM_ID,
    STYX_PROGRAM_ID as STYX_PROGRAM_ID_WRAPPER,
    WRAPPER_VAULT_SEED,
    WRAPPER_MINT_SEED,
    TAG_WRAPPER_MINT,
    TAG_WRAPPER_BURN,
    TAG_WRAPPER_SYNC,
    TAG_WRAPPER_CONFIGURE,
    
    // Default export
    default as wrapper,
} from './wrapper.js';

// ANONFT (Ghost NFTs)
export {
    // Types
    GhostNft,
    AnonftMetadata,
    WrappedCnft,
    MagicEdenListing,
    TensorBid,
    
    // Core functions
    createGhostNft,
    batchCreateGhostNfts,
    
    // Wrapping
    wrapToCompressedNft,
    unwrapFromCompressedNft,
    
    // Magic Eden
    listOnMagicEden,
    buyOnMagicEden,
    cancelMagicEdenListing,
    
    // Tensor
    listOnTensor,
    placeCollectionBid,
    acceptTensorBid,
    
    // Collections
    createCollection,
    getCollectionStats,
    
    // Constants
    BUBBLEGUM_PROGRAM_ID,
    SPL_COMPRESSION_PROGRAM_ID,
    SPL_NOOP_PROGRAM_ID,
    ANONFT_TREE_SEED,
    ANONFT_VAULT_SEED,
    TAG_ANONFT_CREATE,
    TAG_ANONFT_WRAP,
    TAG_ANONFT_UNWRAP,
    TAG_ANONFT_TRANSFER,
    TAG_ANONFT_LIST,
    TAG_ANONFT_BUY,
    TAG_ANONFT_BID,
    TAG_ANONFT_REVEAL,
    
    // Default export
    default as anonft,
} from './anonft.js';

// DEX integration
export {
    // Types
    DexType,
    RouteHop,
    SwapRoute,
    PrivateSwapOptions,
    LimitOrder,
    PoolInfo,
    
    // Jupiter
    getJupiterQuote as getJupiterQuoteDirect,
    executeJupiterSwap as executeJupiterSwapDirect,
    getJupiterRoutes,
    
    // Raydium
    getRaydiumPool,
    createRaydiumPool as createRaydiumPoolDirect,
    createRaydiumClmmPool,
    addRaydiumLiquidity as addRaydiumLiquidityDirect,
    removeRaydiumLiquidity as removeRaydiumLiquidityDirect,
    
    // Private swaps
    executePrivateSwap,
    
    // Limit orders
    placeLimitOrder,
    cancelLimitOrder,
    getUserLimitOrders,
    
    // Orca
    getOrcaWhirlpool,
    
    // Styx native
    createStyxPool,
    registerWithJupiter,
    
    // Constants
    JUPITER_PROGRAM_ID,
    RAYDIUM_CLMM_PROGRAM_ID,
    RAYDIUM_AMM_V4_PROGRAM_ID,
    ORCA_WHIRLPOOL_PROGRAM_ID,
    STYX_PROGRAM_ID,
    
    // Default export
    default as dex,
} from './dex.js';

// Mobile integration
export {
    // Types
    MwaSession,
    AppIdentity,
    TransactionToSign,
    OfflineQueue,
    SolanaPayRequest,
    PushNotificationConfig,
    TradeEventType,
    
    // Session management
    createMwaSession,
    refreshMwaSession,
    endMwaSession,
    isTypeAuthorized,
    
    // Transaction signing
    signTransaction,
    signTransactionsBatch,
    signAndSendTransaction,
    
    // Offline queue
    createOfflineQueue,
    addToOfflineQueue,
    processOfflineQueue,
    getExpiredTransactions,
    clearProcessedTransactions,
    
    // Solana Pay
    generateSolanaPayUrl,
    parseSolanaPayUrl,
    generateSolanaPayQr,
    createTransactionRequestUrl,
    
    // Push notifications
    registerPushNotifications,
    updatePushPreferences,
    unregisterPushNotifications,
    
    // Mobile optimization
    prepareMobileTransaction,
    estimatePriorityFee,
    
    // Constants
    MWA_PROTOCOL_VERSION,
    MAX_SESSION_DURATION_MS,
    MAX_OFFLINE_QUEUE_SIZE,
    SOLANA_PAY_SCHEME,
    TX_TYPE_WRAP,
    TX_TYPE_UNWRAP,
    TX_TYPE_SWAP,
    TX_TYPE_LP_ADD,
    TX_TYPE_LP_REMOVE,
    TX_TYPE_NFT_LIST,
    TX_TYPE_NFT_BUY,
    TX_TYPE_ANONFT_WRAP,
    TX_TYPE_ANONFT_UNWRAP,
    
    // Default export
    default as mobile,
} from './mobile.js';

// ============================================================================
// HIGH-LEVEL CONVENIENCE FUNCTIONS
// ============================================================================

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { wrapNotes, unwrapTokens, getJupiterQuote, executeJupiterSwap, type WrapResult, type JupiterRoute } from './wrapper.js';
import { createGhostNft, wrapToCompressedNft, unwrapFromCompressedNft, listOnMagicEden, listOnTensor, type GhostNft, type AnonftMetadata, type WrappedCnft, type MagicEdenListing } from './anonft.js';
import { createMwaSession, signAndSendTransaction, createOfflineQueue, type MwaSession, type OfflineQueue } from './mobile.js';

/**
 * Quick start: Create a wrapped token and get it ready for DEX trading.
 */
export async function quickWrapForDex(args: {
    connection: Connection;
    payer: Keypair;
    noteMint: PublicKey;
    noteNullifier: Uint8Array;
    amount: bigint;
    name: string;
    symbol: string;
}): Promise<{
    wrapperMint: PublicKey;
    wrappedAmount: bigint;
    signature: string;
}> {
    console.log(`⚡ Quick wrap for DEX...`);
    
    const result = await wrapNotes({
        connection: args.connection,
        payer: args.payer,
        wrapperMint: Keypair.generate().publicKey, // Will create new
        noteNullifier: args.noteNullifier,
        amount: args.amount,
    });
    
    return {
        wrapperMint: result.mint,
        wrappedAmount: result.amount,
        signature: result.signature,
    };
}

/**
 * Quick start: Create an ANONFT and list on Magic Eden.
 */
export async function quickCreateAndListNft(args: {
    connection: Connection;
    payer: Keypair;
    name: string;
    symbol: string;
    uri: string;
    collectionMint?: PublicKey;
    price: bigint;
    proof?: Uint8Array[];
}): Promise<{
    ghostNft: GhostNft;
    listing: MagicEdenListing;
}> {
    console.log(`🎨 Quick create and list NFT...`);
    
    // Create Ghost NFT metadata
    const metadata: AnonftMetadata = {
        name: args.name,
        symbol: args.symbol,
        uri: args.uri,
        sellerFeeBasisPoints: 500, // 5% royalty
        creators: [{ address: args.payer.publicKey, verified: true, share: 100 }],
    };
    
    // Create Ghost NFT
    const ghostNft = await createGhostNft({
        connection: args.connection,
        payer: args.payer,
        metadata,
    });
    
    // Wrap to cNFT
    const merkleTree = Keypair.generate().publicKey; // Simulated
    const wrapped = await wrapToCompressedNft({
        connection: args.connection,
        payer: args.payer,
        ghost: ghostNft,
        merkleTree,
    });
    
    // List on Magic Eden
    const listing = await listOnMagicEden({
        connection: args.connection,
        payer: args.payer,
        cnft: wrapped,
        price: args.price,
        proof: args.proof ?? [],
    });
    
    return { ghostNft, listing };
}

/**
 * Quick start: Swap STS tokens via DEX with privacy.
 */
export async function quickPrivateSwap(args: {
    connection: Connection;
    payer: Keypair;
    inputNullifier: Uint8Array;
    inputMint: PublicKey;
    outputMint: PublicKey;
    amount: bigint;
    slippageBps?: number;
}): Promise<{
    signature: string;
    outputAmount: bigint;
}> {
    console.log(`🔒 Quick private swap...`);
    
    // Wrap input
    const wrapResult = await wrapNotes({
        connection: args.connection,
        payer: args.payer,
        wrapperMint: args.inputMint,
        noteNullifier: args.inputNullifier,
        amount: args.amount,
    });
    
    // Get quote
    const quote = await getJupiterQuote({
        connection: args.connection,
        inputMint: args.inputMint,
        outputMint: args.outputMint,
        amount: args.amount,
        slippageBps: args.slippageBps,
    });
    
    // Execute swap
    const swapResult = await executeJupiterSwap({
        connection: args.connection,
        payer: args.payer,
        route: quote,
    });
    
    // Unwrap output (converts back to STS note)
    await unwrapTokens({
        connection: args.connection,
        payer: args.payer,
        wrapperMint: args.outputMint,
        amount: swapResult.outputAmount,
        stealthPubkey: args.payer.publicKey.toBytes(),
    });
    
    return {
        signature: swapResult.signature,
        outputAmount: swapResult.outputAmount,
    };
}

/**
 * Quick start: Setup mobile session for trading.
 */
export async function quickMobileSetup(args: {
    appName: string;
    appUri: string;
    cluster?: 'mainnet-beta' | 'devnet' | 'testnet';
}): Promise<{
    session: Awaited<ReturnType<typeof createMwaSession>>;
    offlineQueue: ReturnType<typeof createOfflineQueue>;
}> {
    console.log(`📱 Quick mobile setup...`);
    
    const session = await createMwaSession({
        appIdentity: {
            name: args.appName,
            uri: args.appUri,
        },
        cluster: args.cluster,
    });
    
    const offlineQueue = createOfflineQueue();
    
    return { session, offlineQueue };
}

// ============================================================================
// VERSION & FEATURE FLAGS
// ============================================================================

/** Package version */
export const VERSION = '0.1.0';

/** Feature flags */
export const FEATURES = {
    /** Token-22 wrapper tokens */
    WRAPPER_TOKENS: true,
    /** ANONFT/Ghost NFTs */
    ANONFT: true,
    /** Jupiter DEX integration */
    JUPITER: true,
    /** Raydium AMM/CLMM */
    RAYDIUM: true,
    /** Orca Whirlpools */
    ORCA: true,
    /** Private swaps */
    PRIVATE_SWAPS: true,
    /** Limit orders */
    LIMIT_ORDERS: true,
    /** Solana Mobile MWA v2 */
    MWA_V2: true,
    /** Offline transaction queue */
    OFFLINE_QUEUE: true,
    /** Solana Pay */
    SOLANA_PAY: true,
    /** Push notifications */
    PUSH_NOTIFICATIONS: true,
};

/** Print bridge status */
export function printStatus(): void {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                  🌉 ECOSYSTEM BRIDGE v${VERSION}                  ║
╠══════════════════════════════════════════════════════════════╣
║  WRAPPER TOKENS     │ Token-22 compatible DEX trading       ║
║  ANONFT             │ Ghost NFTs for ME/Tensor              ║
║  DEX INTEGRATION    │ Jupiter • Raydium • Orca              ║
║  MOBILE             │ MWA v2 • Offline • Solana Pay         ║
╠══════════════════════════════════════════════════════════════╣
║  Philosophy: "Privacy on demand"                             ║
║  Wrap to trade → Unwrap to restore privacy                   ║
╚══════════════════════════════════════════════════════════════╝
    `);
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
    // Quick start
    quickWrapForDex,
    quickCreateAndListNft,
    quickPrivateSwap,
    quickMobileSetup,
    
    // Status
    printStatus,
    VERSION,
    FEATURES,
};
