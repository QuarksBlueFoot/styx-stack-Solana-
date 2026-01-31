package com.styx.appkit.wallet

import android.net.Uri
import com.styx.appkit.core.Base58
import com.solana.mobilewalletadapter.clientlib.ActivityResultSender
import com.solana.mobilewalletadapter.clientlib.ConnectionIdentity
import com.solana.mobilewalletadapter.clientlib.MobileWalletAdapter
import com.solana.mobilewalletadapter.clientlib.RpcCluster
import com.solana.mobilewalletadapter.clientlib.TransactionResult
import com.solana.mobilewalletadapter.clientlib.successPayload
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX MOBILE WALLET ADAPTER
 *  
 *  Wrapper around Solana Mobile Wallet Adapter 2.0 for Seeker compatibility
 *  Handles authorization, signing, and transaction submission
 *  
 *  Built to 2026 Solana Mobile standards with:
 *  - Full MWA 2.0 API support
 *  - Suspend function patterns
 *  - StateFlow for reactive state
 *  - Proper error handling
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// WALLET STATE
// ═══════════════════════════════════════════════════════════════════════════════

@Serializable
data class WalletAccount(
    val publicKey: ByteArray,
    val publicKeyBase58: String,
    val label: String? = null,
    val icon: String? = null
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is WalletAccount) return false
        return publicKeyBase58 == other.publicKeyBase58
    }
    
    override fun hashCode() = publicKeyBase58.hashCode()
}

data class MobileWalletState(
    val connected: Boolean = false,
    val connecting: Boolean = false,
    val account: WalletAccount? = null,
    val authToken: String? = null,
    val walletName: String? = null,
    val error: String? = null
)

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE WALLET ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════

class StyxMobileWallet(
    private val identityUri: Uri = Uri.parse("https://styxprivacy.app"),
    private val iconUri: Uri = Uri.parse("favicon.ico"),
    private val identityName: String = "Styx App",
    rpcCluster: RpcCluster = RpcCluster.Devnet
) {
    private val _state = MutableStateFlow(MobileWalletState())
    val state: StateFlow<MobileWalletState> = _state.asStateFlow()
    
    private val connectionIdentity = ConnectionIdentity(
        identityUri = identityUri,
        iconUri = iconUri,
        identityName = identityName
    )
    
    private val walletAdapter = MobileWalletAdapter(
        connectionIdentity = connectionIdentity
    ).apply {
        this.rpcCluster = rpcCluster
    }
    
    val publicKey: String?
        get() = _state.value.account?.publicKeyBase58
    
    val connected: Boolean
        get() = _state.value.connected
    
    /**
     * Connect to mobile wallet via MWA 2.0
     */
    suspend fun connect(sender: ActivityResultSender): Result<WalletAccount> {
        _state.value = _state.value.copy(connecting = true, error = null)
        
        return try {
            val result = walletAdapter.connect(sender)
            
            when (result) {
                is TransactionResult.Success -> {
                    val authResult = result.authResult
                    val firstAccount = authResult.accounts.firstOrNull()
                    
                    if (firstAccount != null) {
                        val publicKeyBase58 = Base58.encode(firstAccount.publicKey)
                        val account = WalletAccount(
                            publicKey = firstAccount.publicKey,
                            publicKeyBase58 = publicKeyBase58,
                            label = firstAccount.accountLabel,
                            icon = authResult.walletUriBase?.toString()
                        )
                        
                        _state.value = MobileWalletState(
                            connected = true,
                            connecting = false,
                            account = account,
                            authToken = authResult.authToken,
                            walletName = authResult.walletUriBase?.host
                        )
                        
                        Result.success(account)
                    } else {
                        _state.value = _state.value.copy(
                            connecting = false,
                            error = "No accounts returned"
                        )
                        Result.failure(Exception("No accounts returned"))
                    }
                }
                is TransactionResult.Failure -> {
                    _state.value = _state.value.copy(
                        connecting = false,
                        error = result.message
                    )
                    Result.failure(result.e)
                }
                is TransactionResult.NoWalletFound -> {
                    _state.value = _state.value.copy(
                        connecting = false,
                        error = "No wallet found"
                    )
                    Result.failure(Exception("No wallet found"))
                }
            }
        } catch (e: Exception) {
            _state.value = _state.value.copy(
                connecting = false,
                error = e.message
            )
            Result.failure(e)
        }
    }
    
    /**
     * Disconnect from wallet
     */
    suspend fun disconnect(sender: ActivityResultSender) {
        try {
            walletAdapter.disconnect(sender)
        } catch (_: Exception) {
            // Ignore disconnect errors
        }
        _state.value = MobileWalletState()
    }
    
    /**
     * Sign and send transaction via MWA 2.0
     */
    suspend fun signAndSendTransaction(
        sender: ActivityResultSender,
        transaction: ByteArray,
        options: SendOptions = SendOptions()
    ): Result<String> {
        if (!_state.value.connected) {
            return Result.failure(Exception("Not connected"))
        }
        
        return try {
            val result = walletAdapter.transact(sender) { authResult ->
                signAndSendTransactions(arrayOf(transaction))
            }
            
            when (result) {
                is TransactionResult.Success -> {
                    val signaturesResult = result.payload
                    val signatures = signaturesResult.signatures
                    if (signatures.isNotEmpty()) {
                        Result.success(Base58.encode(signatures.first()))
                    } else {
                        Result.failure(Exception("No signature returned"))
                    }
                }
                is TransactionResult.Failure -> Result.failure(result.e)
                is TransactionResult.NoWalletFound -> Result.failure(Exception("No wallet found"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Sign transaction without sending
     */
    suspend fun signTransaction(
        sender: ActivityResultSender,
        transaction: ByteArray
    ): Result<ByteArray> {
        if (!_state.value.connected) {
            return Result.failure(Exception("Not connected"))
        }
        
        return try {
            val result = walletAdapter.transact(sender) { authResult ->
                signTransactions(arrayOf(transaction))
            }
            
            when (result) {
                is TransactionResult.Success -> {
                    val signed = result.payload
                    if (signed.signedPayloads.isNotEmpty()) {
                        Result.success(signed.signedPayloads.first())
                    } else {
                        Result.failure(Exception("No signed transaction returned"))
                    }
                }
                is TransactionResult.Failure -> Result.failure(result.e)
                is TransactionResult.NoWalletFound -> Result.failure(Exception("No wallet found"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Sign multiple transactions
     */
    suspend fun signAllTransactions(
        sender: ActivityResultSender,
        transactions: Array<ByteArray>
    ): Result<List<ByteArray>> {
        if (!_state.value.connected) {
            return Result.failure(Exception("Not connected"))
        }
        
        return try {
            val result = walletAdapter.transact(sender) { authResult ->
                signTransactions(transactions)
            }
            
            when (result) {
                is TransactionResult.Success -> {
                    val signed = result.payload
                    if (signed.signedPayloads.isNotEmpty()) {
                        Result.success(signed.signedPayloads.toList())
                    } else {
                        Result.failure(Exception("No signed transactions returned"))
                    }
                }
                is TransactionResult.Failure -> Result.failure(result.e)
                is TransactionResult.NoWalletFound -> Result.failure(Exception("No wallet found"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Sign message (off-chain signature)
     */
    suspend fun signMessage(
        sender: ActivityResultSender,
        message: ByteArray
    ): Result<ByteArray> {
        if (!_state.value.connected) {
            return Result.failure(Exception("Not connected"))
        }
        
        val account = _state.value.account
            ?: return Result.failure(Exception("No account"))
        
        return try {
            val result = walletAdapter.transact(sender) { authResult ->
                signMessagesDetached(
                    messages = arrayOf(message),
                    addresses = arrayOf(account.publicKey)
                )
            }
            
            when (result) {
                is TransactionResult.Success -> {
                    val signResult = result.payload
                    val messages = signResult.messages
                    if (messages.isNotEmpty() && messages.first().signatures.isNotEmpty()) {
                        Result.success(messages.first().signatures.first())
                    } else {
                        Result.failure(Exception("No signature returned"))
                    }
                }
                is TransactionResult.Failure -> Result.failure(result.e)
                is TransactionResult.NoWalletFound -> Result.failure(Exception("No wallet found"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

data class SendOptions(
    val minContextSlot: Long? = null,
    val skipPreflight: Boolean = false,
    val preflightCommitment: String = "confirmed",
    val maxRetries: Int? = null
)
