package nexus.styx.android

import nexus.styx.client.StyxClient
import nexus.styx.client.StyxClientConfig
import nexus.styx.crypto.*
import nexus.styx.messaging.PrivateMessagingClient
import nexus.styx.messaging.MessagingConfig
import nexus.styx.core.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

/**
 * Top-level Styx SDK entry point for Android / KMP consumers.
 *
 * Provides:
 * - StyxClient for RPC + indexer
 * - PrivateMessagingClient for E2E encrypted messaging
 * - Convenience methods for shield/unshield/transfer
 *
 * Usage:
 * ```kotlin
 * val styx = StyxKit.create(
 *     signerPubkey = myPublicKey,
 *     x25519Secret = myX25519SecretKey,
 *     rpcUrl = "https://api.mainnet-beta.solana.com"
 * )
 * styx.messaging.incomingMessages.collect { msg -> ... }
 * val result = styx.client.getAccountInfo(pubkey)
 * styx.close()
 * ```
 */
class StyxKit private constructor(
    val client: StyxClient,
    val messaging: PrivateMessagingClient,
    private val scope: CoroutineScope
) {
    companion object {
        /**
         * Create a new StyxKit instance.
         *
         * @param signerPubkey Your ed25519 public key (as bytes or base58)
         * @param x25519Secret Your X25519 secret key (32 bytes)
         * @param rpcUrl Solana RPC endpoint
         * @param indexerUrl SPS indexer endpoint
         * @param onMessage Callback for incoming messages
         */
        fun create(
            signerPubkey: PublicKey,
            x25519Secret: ByteArray,
            rpcUrl: String = StyxConstants.DEFAULT_RPC_URL,
            indexerUrl: String = StyxConstants.DEFAULT_INDEXER_URL,
            onMessage: ((nexus.styx.messaging.PrivateMessage) -> Unit)? = null
        ): StyxKit {
            val x25519Public = X25519.computePublicKey(x25519Secret)

            val client = StyxClient(StyxClientConfig(
                rpcUrl = rpcUrl,
                indexerUrl = indexerUrl
            ))

            val messaging = PrivateMessagingClient(MessagingConfig(
                x25519SecretKey = x25519Secret,
                x25519PublicKey = x25519Public,
                signerPubkey = signerPubkey,
                onMessage = onMessage
            ))

            val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

            return StyxKit(client, messaging, scope)
        }
    }

    /**
     * Get a Flow of all incoming messages across all sessions.
     */
    fun messageFlow(): SharedFlow<nexus.styx.messaging.PrivateMessage> =
        messaging.incomingMessages

    /**
     * Close all resources.
     */
    fun close() {
        client.close()
        scope.cancel()
    }
}
