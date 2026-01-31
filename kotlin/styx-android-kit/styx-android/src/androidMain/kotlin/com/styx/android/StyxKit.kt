package com.styx.android

import android.content.Context
import com.solana.mobilewalletadapter.clientlib.ActivityResultSender
import com.styx.android.compose.TransactionState
import com.styx.android.mwa.StyxMwaClient
import com.styx.android.outbox.StyxOutbox
import com.styx.android.secure.StyxSecureStorage
import com.styx.client.StyxClient
import com.styx.client.StyxClientConfig
import com.styx.core.PublicKey
import com.styx.core.StyxResult
import com.styx.crypto.StyxCrypto
import com.styx.messaging.PrivateMessagingClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * StyxKit — Single entry point for the Styx Android SDK.
 *
 * Provides a unified API surface analogous to the TypeScript
 * `@styx/presets` + `@styx/styx-context` packages.
 *
 * Usage:
 * ```kotlin
 * val styx = StyxKit.create(context)
 *
 * // Connect wallet (MWA 2.1)
 * styx.connect(activityResultSender)
 *
 * // Send a shielded transaction
 * styx.shieldAndSend(sender, mint, amount)
 *
 * // Send an encrypted message
 * styx.sendMessage(recipientPubkey, "Hello, private world!")
 * ```
 */
class StyxKit private constructor(
    val storage: StyxSecureStorage,
    val mwa: StyxMwaClient,
    val client: StyxClient,
    val crypto: StyxCrypto,
    val outbox: StyxOutbox,
) {
    private val _connectionState = MutableStateFlow(ConnectionState.DISCONNECTED)
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private val _txState = MutableStateFlow(TransactionState.BUILDING)
    val transactionState: StateFlow<TransactionState> = _txState.asStateFlow()

    /** Currently connected wallet address (null if disconnected). */
    val walletAddress: String? get() = mwa.walletPubkey?.toBase58()

    /** Whether a wallet is connected. */
    val isConnected: Boolean get() = mwa.isAuthorized

    // ═══════════════════════════════════════════════════════════════════════
    // WALLET CONNECTION
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Connect to a Solana wallet via MWA 2.1.
     */
    suspend fun connect(sender: ActivityResultSender): StyxResult<PublicKey> {
        _connectionState.value = ConnectionState.CONNECTING
        val result = mwa.authorize(sender)
        return result.map { auth ->
            // Persist auth token
            storage.putString(StyxSecureStorage.Keys.AUTH_TOKEN, auth.authToken)
            storage.putString(StyxSecureStorage.Keys.WALLET_PUBKEY, auth.pubkey.toBase58())
            _connectionState.value = ConnectionState.CONNECTED
            auth.pubkey
        }.also {
            if (it.isError) _connectionState.value = ConnectionState.DISCONNECTED
        }
    }

    /**
     * Resume a previous session (reauthorize).
     */
    suspend fun reconnect(sender: ActivityResultSender): StyxResult<PublicKey> {
        _connectionState.value = ConnectionState.CONNECTING
        val result = mwa.reauthorize(sender)
        return result.map { auth ->
            _connectionState.value = ConnectionState.CONNECTED
            auth.pubkey
        }.also {
            if (it.isError) _connectionState.value = ConnectionState.DISCONNECTED
        }
    }

    /**
     * Disconnect from the wallet.
     */
    suspend fun disconnect(sender: ActivityResultSender) {
        mwa.deauthorize(sender)
        storage.remove(StyxSecureStorage.Keys.AUTH_TOKEN)
        storage.remove(StyxSecureStorage.Keys.WALLET_PUBKEY)
        _connectionState.value = ConnectionState.DISCONNECTED
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TRANSACTION SENDING
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Sign and send a transaction via MWA (wallet submits).
     */
    suspend fun signAndSend(
        sender: ActivityResultSender,
        serializedTx: ByteArray,
    ): StyxResult<String> {
        _txState.value = TransactionState.SIGNING
        val result = mwa.signAndSendTransaction(sender, serializedTx)
        result.onSuccess { _txState.value = TransactionState.CONFIRMED }
        result.onError { _, _ -> _txState.value = TransactionState.FAILED }
        return result
    }

    /**
     * Enqueue a transaction for offline sending.
     * Will be sent when [drainOutbox] is called.
     */
    suspend fun enqueueTransaction(serializedTx: ByteArray, label: String = ""): String {
        return outbox.enqueue(serializedTx, label)
    }

    /**
     * Drain all queued offline transactions.
     */
    suspend fun drainOutbox(sender: ActivityResultSender) = outbox.drain { txBytes ->
        val result = mwa.signAndSendTransaction(sender, txBytes)
        result.getOrThrow()
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVACY SIGN-IN (PSIN1)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Privacy Sign-In — PSIN1 attestation flow.
     */
    suspend fun privacySignIn(
        sender: ActivityResultSender,
        domain: String,
        nonce: String,
    ): StyxResult<StyxMwaClient.SignMessageResult> {
        return mwa.privacySignIn(sender, domain, nonce)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Release resources. Call in `onDestroy` or `DisposableEffect`.
     */
    fun close() {
        client.close()
        outbox.close()
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FACTORY
    // ═══════════════════════════════════════════════════════════════════════

    companion object {
        /**
         * Create a StyxKit instance with default configuration.
         */
        fun create(
            context: Context,
            config: StyxClientConfig = StyxClientConfig(),
            cluster: String = "mainnet-beta",
        ): StyxKit {
            val storage = StyxSecureStorage(context)
            val mwaClient = StyxMwaClient(cluster = cluster)
            val client = StyxClient(config)
            val crypto = StyxCrypto
            val outbox = StyxOutbox(storage)

            return StyxKit(
                storage = storage,
                mwa = mwaClient,
                client = client,
                crypto = crypto,
                outbox = outbox,
            )
        }
    }
}

enum class ConnectionState {
    DISCONNECTED, CONNECTING, CONNECTED
}
