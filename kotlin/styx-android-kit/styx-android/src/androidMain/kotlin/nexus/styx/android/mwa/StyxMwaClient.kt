package nexus.styx.android.mwa

import android.net.Uri
import nexus.styx.core.PublicKey
import nexus.styx.core.Base58
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Mobile Wallet Adapter (MWA) integration for Styx.
 *
 * Provides a coroutine-friendly wrapper around Solana Mobile's MWA protocol.
 * This handles authorization, signing, and transaction submission through
 * any MWA-compatible wallet (Phantom, Solflare, etc.).
 *
 * Note: Actual MWA calls require an Activity context and the
 * com.solanamobile:mobile-wallet-adapter-clientlib-ktx dependency.
 * This class provides the Styx-specific wrapping.
 */
class StyxMwaClient(
    private val identityUri: Uri = Uri.parse("https://styxstack.com"),
    private val identityName: String = "Styx Privacy SDK",
    private val iconUri: Uri = Uri.parse("https://styxstack.com/favicon.ico"),
    private val cluster: String = "mainnet-beta"
) {
    private var authorizedPubkey: PublicKey? = null
    private var authToken: String? = null

    /**
     * Check if we have an authorized session.
     */
    val isAuthorized: Boolean get() = authorizedPubkey != null

    /**
     * Get the authorized wallet public key.
     */
    val walletPubkey: PublicKey? get() = authorizedPubkey

    /**
     * MWA authorization result.
     */
    data class AuthResult(
        val pubkey: PublicKey,
        val authToken: String,
        val walletName: String?
    )

    /**
     * Result of signing + sending a transaction.
     */
    data class SendResult(
        val signature: String
    )

    /**
     * Authorize with a wallet.
     * Call this from an Activity/Fragment context that can handle the MWA intent.
     *
     * @param pubkeyBytes The 32-byte ed25519 public key from MWA auth response
     * @param token The auth token from MWA auth response
     * @param walletName Optional wallet name
     */
    fun onAuthorized(pubkeyBytes: ByteArray, token: String, walletName: String? = null): AuthResult {
        require(pubkeyBytes.size == 32) { "pubkey must be 32 bytes" }
        authorizedPubkey = PublicKey(pubkeyBytes)
        authToken = token
        return AuthResult(
            pubkey = authorizedPubkey!!,
            authToken = token,
            walletName = walletName
        )
    }

    /**
     * Disconnect and clear authorization.
     */
    fun disconnect() {
        authorizedPubkey = null
        authToken = null
    }

    /**
     * Build MWA transaction params for a shield operation.
     *
     * @param serializedTx The fully-built unsigned transaction bytes
     * @return Transaction bytes ready for MWA signAndSendTransactions
     */
    suspend fun prepareForSigning(serializedTx: ByteArray): ByteArray = withContext(Dispatchers.Default) {
        check(isAuthorized) { "Not authorized — call authorize() first" }
        // Transaction is already serialized, just pass through
        // MWA will handle signing with the wallet's private key
        serializedTx
    }

    /**
     * After MWA returns a signed transaction, record the signature.
     */
    fun onTransactionSent(signatureBytes: ByteArray): SendResult {
        return SendResult(signature = Base58.encode(signatureBytes))
    }
}
