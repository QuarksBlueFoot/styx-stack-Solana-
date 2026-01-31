package com.styx.android.mwa

import android.net.Uri
import com.solana.mobilewalletadapter.clientlib.ActivityResultSender
import com.solana.mobilewalletadapter.clientlib.MobileWalletAdapter
import com.solana.mobilewalletadapter.clientlib.TransactionResult
import com.styx.core.PublicKey
import com.styx.core.Base58
import com.styx.core.StyxResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/**
 * Mobile Wallet Adapter (MWA) 2.1 integration for Styx.
 *
 * Full implementation of the Solana Mobile MWA protocol with support for:
 * - Authorization / Reauthorization via transact{} block
 * - signAndSendTransactions (preferred path, wallet submits)
 * - signTransactions (app submits via RPC)
 * - signMessages (arbitrary message signing for PSIN1)
 * - Sign-In-With-Solana (SIWS) / Privacy Sign-In (PSIN1)
 *
 * Compatible with Phantom, Solflare, and any MWA 2.x wallet.
 *
 * @see <a href="https://docs.solanamobile.com/react-native/quickstart">Solana Mobile Docs</a>
 */
class StyxMwaClient(
    private val identityUri: Uri = Uri.parse("https://styxstack.com"),
    private val identityName: String = "Styx Privacy SDK",
    private val iconUri: Uri = Uri.parse("https://styxstack.com/favicon.ico"),
    private val cluster: String = "mainnet-beta"
) {
    private var authorizedPubkey: PublicKey? = null
    private var authToken: String? = null
    private var walletUriBase: Uri? = null

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = false }

    /** Check if we have an authorized session. */
    val isAuthorized: Boolean get() = authorizedPubkey != null

    /** Get the authorized wallet public key. */
    val walletPubkey: PublicKey? get() = authorizedPubkey

    // ═══════════════════════════════════════════════════════════════════════
    // RESULT TYPES
    // ═══════════════════════════════════════════════════════════════════════

    data class AuthResult(
        val pubkey: PublicKey,
        val authToken: String,
        val walletName: String?,
        val walletUriBase: Uri? = null,
    )

    data class SendResult(
        val signatures: List<String>
    )

    data class SignResult(
        val signedTransactions: List<ByteArray>
    )

    data class SignMessageResult(
        val signedPayloads: List<ByteArray>
    )

    // ═══════════════════════════════════════════════════════════════════════
    // PSIN1 — Privacy Sign-In (parity with @styx/solana-mobile-dropin)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * PSIN1 payload matching the TypeScript `PrivacySignInPayload`.
     */
    @Serializable
    data class PrivacySignInPayload(
        val v: String = "psin1",
        val domain: String,
        val nonce: String,
        val issuedAt: String,
        val statement: String? = null,
        val resources: List<String>? = null,
    )

    /**
     * Build a Privacy Sign-In message (PSIN1) for MWA signMessages.
     * Wire-compatible with `buildPrivacySignInMessage` in the TypeScript SDK.
     */
    fun buildPrivacySignInMessage(payload: PrivacySignInPayload): ByteArray {
        return json.encodeToString(payload).toByteArray(Charsets.UTF_8)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MWA TRANSACT — Full MWA 2.1 protocol
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Authorize with a wallet using the MWA 2.1 transact{} block.
     *
     * This is the canonical Solana Mobile authorization flow. The wallet
     * app opens, user approves, and we receive a pubkey + auth token.
     *
     * @param sender ActivityResultSender from the hosting Activity/Fragment
     * @return AuthResult on success
     */
    suspend fun authorize(sender: ActivityResultSender): StyxResult<AuthResult> =
        withContext(Dispatchers.IO) {
            try {
                val adapter = MobileWalletAdapter()
                val result = adapter.transact(sender) { caller ->
                    caller.authorize(identityUri, iconUri, identityName, cluster)
                }
                val pubkeyBytes = result.accounts.firstOrNull()?.publicKey
                    ?: return@withContext StyxResult.Error("No account returned from wallet")
                val token = result.authToken

                authorizedPubkey = PublicKey(pubkeyBytes)
                authToken = token
                walletUriBase = result.walletUriBase

                StyxResult.Success(AuthResult(
                    pubkey = authorizedPubkey!!,
                    authToken = token,
                    walletName = null,
                    walletUriBase = walletUriBase,
                ))
            } catch (e: Exception) {
                StyxResult.Error("MWA authorize failed: ${e.message}", e)
            }
        }

    /**
     * Reauthorize with an existing auth token (session resume).
     */
    suspend fun reauthorize(sender: ActivityResultSender): StyxResult<AuthResult> =
        withContext(Dispatchers.IO) {
            val token = authToken ?: return@withContext StyxResult.Error("No auth token — call authorize() first")
            try {
                val adapter = MobileWalletAdapter()
                val result = adapter.transact(sender) { caller ->
                    caller.reauthorize(identityUri, iconUri, identityName, token)
                }
                val pubkeyBytes = result.accounts.firstOrNull()?.publicKey
                    ?: return@withContext StyxResult.Error("No account returned from wallet")
                val newToken = result.authToken

                authorizedPubkey = PublicKey(pubkeyBytes)
                authToken = newToken

                StyxResult.Success(AuthResult(
                    pubkey = authorizedPubkey!!,
                    authToken = newToken,
                    walletName = null,
                    walletUriBase = walletUriBase,
                ))
            } catch (e: Exception) {
                StyxResult.Error("MWA reauthorize failed: ${e.message}", e)
            }
        }

    // ═══════════════════════════════════════════════════════════════════════
    // SIGN AND SEND TRANSACTIONS (wallet submits — preferred)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Sign and send one or more transactions via the wallet.
     *
     * This is the preferred sending path — the wallet app signs and
     * submits to the network, providing the best UX (single approval).
     *
     * Matches TypeScript `mwaSendTransactions` with `signAndSendTransactions`.
     *
     * @param sender ActivityResultSender
     * @param serializedTransactions List of serialized unsigned transactions
     * @return List of transaction signatures (base58)
     */
    suspend fun signAndSendTransactions(
        sender: ActivityResultSender,
        serializedTransactions: List<ByteArray>,
    ): StyxResult<SendResult> = withContext(Dispatchers.IO) {
        val token = authToken ?: return@withContext StyxResult.Error("Not authorized")
        try {
            val adapter = MobileWalletAdapter()
            val result = adapter.transact(sender) { caller ->
                caller.reauthorize(identityUri, iconUri, identityName, token)
                caller.signAndSendTransactions(
                    serializedTransactions.toTypedArray()
                )
            }
            val sigs = result.signatures.map { Base58.encode(it) }
            // Update auth token if refreshed
            authToken = result.authToken ?: authToken
            StyxResult.Success(SendResult(signatures = sigs))
        } catch (e: Exception) {
            StyxResult.Error("MWA signAndSend failed: ${e.message}", e)
        }
    }

    /**
     * Convenience: sign and send a single transaction.
     */
    suspend fun signAndSendTransaction(
        sender: ActivityResultSender,
        serializedTx: ByteArray,
    ): StyxResult<String> {
        return signAndSendTransactions(sender, listOf(serializedTx)).map { it.signatures.first() }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SIGN TRANSACTIONS (app submits via RPC)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Sign transactions without sending. The app is responsible for
     * submitting signed transactions to the network via RPC.
     *
     * Use this for advanced flows: inspect before submit, batching, etc.
     */
    suspend fun signTransactions(
        sender: ActivityResultSender,
        serializedTransactions: List<ByteArray>,
    ): StyxResult<SignResult> = withContext(Dispatchers.IO) {
        val token = authToken ?: return@withContext StyxResult.Error("Not authorized")
        try {
            val adapter = MobileWalletAdapter()
            val result = adapter.transact(sender) { caller ->
                caller.reauthorize(identityUri, iconUri, identityName, token)
                caller.signTransactions(
                    serializedTransactions.toTypedArray()
                )
            }
            authToken = result.authToken ?: authToken
            StyxResult.Success(SignResult(signedTransactions = result.signedPayloads.toList()))
        } catch (e: Exception) {
            StyxResult.Error("MWA signTransactions failed: ${e.message}", e)
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SIGN MESSAGES (PSIN1, arbitrary payloads)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Sign arbitrary messages (e.g. PSIN1 Privacy Sign-In payloads).
     *
     * Matches TypeScript `signMessages` MWA capability.
     */
    suspend fun signMessages(
        sender: ActivityResultSender,
        messages: List<ByteArray>,
    ): StyxResult<SignMessageResult> = withContext(Dispatchers.IO) {
        val token = authToken ?: return@withContext StyxResult.Error("Not authorized")
        try {
            val adapter = MobileWalletAdapter()
            val addresses = authorizedPubkey?.bytes?.let { arrayOf(it) }
                ?: return@withContext StyxResult.Error("No authorized address")
            val result = adapter.transact(sender) { caller ->
                caller.reauthorize(identityUri, iconUri, identityName, token)
                caller.signMessages(messages.toTypedArray(), addresses)
            }
            authToken = result.authToken ?: authToken
            StyxResult.Success(SignMessageResult(signedPayloads = result.signedPayloads.toList()))
        } catch (e: Exception) {
            StyxResult.Error("MWA signMessages failed: ${e.message}", e)
        }
    }

    /**
     * Privacy Sign-In (PSIN1): build + sign a privacy attestation message.
     *
     * Full parity with `@styx/solana-mobile-dropin/mwaSignIn`.
     *
     * @param sender ActivityResultSender
     * @param domain The dApp domain (e.g. "styxstack.com")
     * @param nonce A unique nonce string
     * @return The signed PSIN1 payload
     */
    suspend fun privacySignIn(
        sender: ActivityResultSender,
        domain: String,
        nonce: String,
        statement: String? = "Sign in with Styx Privacy",
    ): StyxResult<SignMessageResult> {
        val payload = PrivacySignInPayload(
            domain = domain,
            nonce = nonce,
            issuedAt = java.time.Instant.now().toString(),
            statement = statement,
        )
        val message = buildPrivacySignInMessage(payload)
        return signMessages(sender, listOf(message))
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LEGACY CALLBACKS (backward compatibility)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Manual authorization callback for non-transact{} flows.
     * Use [authorize] with ActivityResultSender for the full MWA flow.
     */
    fun onAuthorized(pubkeyBytes: ByteArray, token: String, walletName: String? = null): AuthResult {
        require(pubkeyBytes.size == 32) { "pubkey must be 32 bytes" }
        authorizedPubkey = PublicKey(pubkeyBytes)
        authToken = token
        return AuthResult(
            pubkey = authorizedPubkey!!,
            authToken = token,
            walletName = walletName,
        )
    }

    /**
     * Disconnect and clear authorization state.
     */
    fun disconnect() {
        authorizedPubkey = null
        authToken = null
        walletUriBase = null
    }

    /**
     * Deauthorize the current session via MWA.
     */
    suspend fun deauthorize(sender: ActivityResultSender): StyxResult<Unit> =
        withContext(Dispatchers.IO) {
            val token = authToken ?: return@withContext StyxResult.Error("No auth token")
            try {
                val adapter = MobileWalletAdapter()
                adapter.transact(sender) { caller ->
                    caller.deauthorize(token)
                }
                disconnect()
                StyxResult.Success(Unit)
            } catch (e: Exception) {
                StyxResult.Error("MWA deauthorize failed: ${e.message}", e)
            }
        }

    /**
     * After MWA returns a signed transaction, record the signature.
     */
    fun onTransactionSent(signatureBytes: ByteArray): SendResult {
        return SendResult(signatures = listOf(Base58.encode(signatureBytes)))
    }
}
