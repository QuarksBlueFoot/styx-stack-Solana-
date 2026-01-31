                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               package com.styx.appkit

import android.content.Context
import androidx.compose.runtime.*
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.styx.appkit.core.Cluster
import com.styx.appkit.core.StyxClient
import com.styx.appkit.core.StyxConfig
import com.styx.appkit.messaging.PrivateMessagingClient
import com.styx.appkit.payments.PrivatePaymentsClient
import com.styx.appkit.nft.PrivateNFTClient
import com.styx.appkit.airdrop.PrivateAirdropClient
import com.styx.appkit.compression.InscriptionCompressionAdapter
import com.styx.appkit.compression.InscriptionTokenClient
import com.styx.appkit.compression.InscriptionNFTClient
import com.styx.appkit.compression.CompressedNftService
import com.styx.appkit.swaps.ShieldedSwapsClient
import com.styx.appkit.swaps.PrivateSwapsClient
import com.styx.appkit.loans.PrivateLendingService
import com.styx.appkit.wallet.StyxMobileWallet
import com.solana.mobilewalletadapter.clientlib.RpcCluster
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX APP KIT - MAIN ENTRY POINT
 *  
 *  Unified SDK for privacy-first Solana mobile apps
 *  Compatible with Solana Seeker and Mobile Wallet Adapter
 *  
 *  Modules:
 *  - messaging: Signal-like encrypted messaging
 *  - payments: Private payments & Resolv links
 *  - nft: Private NFT/cNFT minting & trading
 *  - airdrop: WhisperDrop private airdrops
 *  - compression: Inscription compression adapter
 *  - inscriptionTokens: Inscription-based tokens (Styx-20)
 *  - inscriptionNFTs: Inscription-based NFTs (Styx-721)
 *  - swaps: Private DEX trading
 *  - shieldedSwaps: Fully shielded swaps with STS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// STYX APP KIT INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Main Styx App Kit instance
 * Provides access to all privacy modules
 */
class StyxAppKit private constructor(
    private val context: Context,
    private val config: StyxConfig
) {
    val client = StyxClient(context, config)
    val wallet = StyxMobileWallet(
        rpcCluster = when (config.cluster) {
            Cluster.MAINNET_BETA -> RpcCluster.MainnetBeta
            Cluster.DEVNET -> RpcCluster.Devnet
            Cluster.TESTNET -> RpcCluster.Testnet
            Cluster.LOCALNET -> RpcCluster.Devnet  // Fallback to devnet for local
        }
    )
    
    // Module instances (lazy init after wallet connect)
    private var _messaging: PrivateMessagingClient? = null
    private var _payments: PrivatePaymentsClient? = null
    private var _nft: PrivateNFTClient? = null
    private var _airdrop: PrivateAirdropClient? = null
    private var _compression: InscriptionCompressionAdapter? = null
    private var _inscriptionTokens: InscriptionTokenClient? = null
    private var _inscriptionNFTs: InscriptionNFTClient? = null
    private var _compressedNft: CompressedNftService? = null
    private var _swaps: PrivateSwapsClient? = null
    private var _shieldedSwaps: ShieldedSwapsClient? = null
    private var _lending: PrivateLendingService? = null
    
    val messaging: PrivateMessagingClient
        get() = _messaging ?: throw IllegalStateException("Connect wallet first")
    
    val payments: PrivatePaymentsClient
        get() = _payments ?: throw IllegalStateException("Connect wallet first")
    
    val nft: PrivateNFTClient
        get() = _nft ?: throw IllegalStateException("Connect wallet first")
    
    val airdrop: PrivateAirdropClient
        get() = _airdrop ?: throw IllegalStateException("Connect wallet first")
    
    val compression: InscriptionCompressionAdapter
        get() = _compression ?: throw IllegalStateException("Connect wallet first")
    
    /** Inscription-based tokens (Styx-20 protocol) */
    val inscriptionTokens: InscriptionTokenClient
        get() = _inscriptionTokens ?: throw IllegalStateException("Connect wallet first")
    
    /** Inscription-based NFTs (Styx-721 protocol) */
    val inscriptionNFTs: InscriptionNFTClient
        get() = _inscriptionNFTs ?: throw IllegalStateException("Connect wallet first")
    
    /** Standard Compressed NFTs (Bubblegum) */
    val compressedNft: CompressedNftService
        get() = _compressedNft ?: throw IllegalStateException("Connect wallet first")

    /** Private DEX trading with MEV protection */
    val swaps: PrivateSwapsClient
        get() = _swaps ?: throw IllegalStateException("Connect wallet first")
    
    /** Fully shielded swaps using STS (Styx Token Standard) */
    val shieldedSwaps: ShieldedSwapsClient
        get() = _shieldedSwaps ?: throw IllegalStateException("Connect wallet first")

    /** Private Lending & Borrowing */
    val lending: PrivateLendingService
        get() = _lending ?: throw IllegalStateException("Connect wallet first")
    
    /**
     * Initialize modules after wallet connection
     */
    fun initializeModules(userPubkey: String) {
        _messaging = PrivateMessagingClient(client, userPubkey)
        _payments = PrivatePaymentsClient(client, userPubkey)
        _nft = PrivateNFTClient(client, userPubkey)
        _airdrop = PrivateAirdropClient(client, userPubkey)
        _compression = InscriptionCompressionAdapter(client, userPubkey)
        _inscriptionTokens = InscriptionTokenClient(client, userPubkey)
        _inscriptionNFTs = InscriptionNFTClient(client, userPubkey)
        _compressedNft = CompressedNftService(client)
        _swaps = PrivateSwapsClient(client, userPubkey)
        _shieldedSwaps = ShieldedSwapsClient(client, userPubkey)
        _lending = PrivateLendingService(client)
    }
    
    companion object {
        @Volatile
        private var instance: StyxAppKit? = null
        
        /**
         * Initialize Styx App Kit
         */
        fun initialize(
            context: Context,
            cluster: Cluster = Cluster.DEVNET,
            rpcUrl: String? = null
        ): StyxAppKit {
            return instance ?: synchronized(this) {
                instance ?: StyxAppKit(
                    context.applicationContext,
                    StyxConfig(
                        cluster = cluster,
                        rpcUrl = rpcUrl
                    )
                ).also { instance = it }
            }
        }
        
        /**
         * Get existing instance
         */
        fun getInstance(): StyxAppKit {
            return instance ?: throw IllegalStateException("Call StyxAppKit.initialize() first")
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSE INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

val LocalStyxAppKit = compositionLocalOf<StyxAppKit> { 
    error("StyxAppKit not provided. Wrap your app with StyxProvider.") 
}

/**
 * Styx Provider - Compose wrapper
 */
@Composable
fun StyxProvider(
    appKit: StyxAppKit,
    content: @Composable () -> Unit
) {
    CompositionLocalProvider(LocalStyxAppKit provides appKit) {
        content()
    }
}

/**
 * Hook: Access Styx App Kit
 */
@Composable
fun rememberStyx(): StyxAppKit {
    return LocalStyxAppKit.current
}

/**
 * Hook: Access wallet state
 */
@Composable
fun rememberWalletState(): State<com.styx.appkit.wallet.MobileWalletState> {
    val appKit = LocalStyxAppKit.current
    return appKit.wallet.state.collectAsState()
}

/**
 * Hook: Check if connected
 */
@Composable
fun rememberConnected(): Boolean {
    val walletState by rememberWalletState()
    return walletState.connected
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEWMODEL (HILT)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Styx ViewModel for Hilt-based apps
 */
@HiltViewModel
class StyxViewModel @Inject constructor(
    @ApplicationContext private val context: Context
) : ViewModel() {
    
    private val _appKit = MutableStateFlow<StyxAppKit?>(null)
    val appKit: StateFlow<StyxAppKit?> = _appKit.asStateFlow()
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    init {
        viewModelScope.launch {
            try {
                _appKit.value = StyxAppKit.initialize(context)
            } catch (e: Exception) {
                _error.value = e.message
            }
        }
    }
    
    fun configure(cluster: Cluster, rpcUrl: String? = null) {
        _appKit.value?.client?.configure { config ->
            config.copy(cluster = cluster, rpcUrl = rpcUrl)
        }
    }
    
    fun clearError() {
        _error.value = null
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RE-EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

// Core
typealias StyxCluster = Cluster

// Modules
typealias MessagingClient = PrivateMessagingClient
typealias PaymentsClient = PrivatePaymentsClient
typealias NFTClient = PrivateNFTClient
typealias AirdropClient = PrivateAirdropClient
typealias CompressionAdapter = InscriptionCompressionAdapter
typealias TokenClient = InscriptionTokenClient
typealias InscriptionNftClient = InscriptionNFTClient
typealias CompressedNftClient = CompressedNftService
typealias SwapsClient = PrivateSwapsClient
typealias ShieldedSwapClient = ShieldedSwapsClient
typealias LendingClient = PrivateLendingService
                                                                                                                                                                