package nexus.styx.client

import nexus.styx.core.*
import nexus.styx.sps.SpsInstructions
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.*

/**
 * Coroutine-native Styx client for Solana RPC + SPS indexer.
 *
 * Architecture:
 * - Uses structured concurrency (SupervisorScope)
 * - Flow-based event streaming for real-time updates
 * - Automatic retry with exponential backoff
 * - Thread-safe state management
 *
 * Platform HTTP is injected via [StyxHttpClient] expect/actual.
 */
class StyxClient(
    private val config: StyxClientConfig = StyxClientConfig()
) {
    private val json = Json { ignoreUnknownKeys = true; isLenient = true; encodeDefaults = false }
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    // ═══════════════════════════════════════════════════════════════════════
    // SOLANA RPC
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Get account info from Solana RPC.
     */
    suspend fun getAccountInfo(pubkey: PublicKey): StyxResult<AccountInfo?> = withRetry {
        val body = buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", 1)
            put("method", "getAccountInfo")
            putJsonArray("params") {
                add(pubkey.toBase58())
                addJsonObject {
                    put("encoding", "base64")
                    put("commitment", config.commitment)
                }
            }
        }
        val response = httpPost(config.rpcUrl, body.toString())
        val result = json.parseToJsonElement(response)
        val value = result.jsonObject["result"]?.jsonObject?.get("value")
        if (value == null || value is JsonNull) {
            StyxResult.Success(null)
        } else {
            val data = value.jsonObject["data"]?.jsonArray?.get(0)?.jsonPrimitive?.content ?: ""
            val owner = value.jsonObject["owner"]?.jsonPrimitive?.content ?: ""
            val lamports = value.jsonObject["lamports"]?.jsonPrimitive?.long ?: 0
            StyxResult.Success(AccountInfo(
                data = data,
                owner = owner,
                lamports = lamports,
                executable = value.jsonObject["executable"]?.jsonPrimitive?.boolean ?: false
            ))
        }
    }

    /**
     * Get latest blockhash for transaction building.
     */
    suspend fun getLatestBlockhash(): StyxResult<String> = withRetry {
        val body = buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", 1)
            put("method", "getLatestBlockhash")
            putJsonArray("params") {
                addJsonObject { put("commitment", config.commitment) }
            }
        }
        val response = httpPost(config.rpcUrl, body.toString())
        val result = json.parseToJsonElement(response)
        val blockhash = result.jsonObject["result"]?.jsonObject?.get("value")
            ?.jsonObject?.get("blockhash")?.jsonPrimitive?.content
            ?: throw Exception("Failed to get blockhash")
        StyxResult.Success(blockhash)
    }

    /**
     * Send a raw serialized transaction.
     */
    suspend fun sendTransaction(serializedTx: ByteArray): StyxResult<String> = withRetry {
        val txBase64 = serializedTx.toBase64()
        val body = buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", 1)
            put("method", "sendTransaction")
            putJsonArray("params") {
                add(txBase64)
                addJsonObject {
                    put("encoding", "base64")
                    put("skipPreflight", config.skipPreflight)
                    put("preflightCommitment", config.commitment)
                }
            }
        }
        val response = httpPost(config.rpcUrl, body.toString())
        val result = json.parseToJsonElement(response)
        val error = result.jsonObject["error"]
        if (error != null && error !is JsonNull) {
            val msg = error.jsonObject["message"]?.jsonPrimitive?.content ?: "RPC error"
            StyxResult.Error(Exception(msg))
        } else {
            val sig = result.jsonObject["result"]?.jsonPrimitive?.content
                ?: throw Exception("No signature returned")
            StyxResult.Success(sig)
        }
    }

    /**
     * Get transaction details by signature.
     */
    suspend fun getTransaction(signature: String): StyxResult<JsonElement> = withRetry {
        val body = buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", 1)
            put("method", "getTransaction")
            putJsonArray("params") {
                add(signature)
                addJsonObject {
                    put("encoding", "json")
                    put("commitment", config.commitment)
                    put("maxSupportedTransactionVersion", 0)
                }
            }
        }
        val response = httpPost(config.rpcUrl, body.toString())
        StyxResult.Success(json.parseToJsonElement(response).jsonObject["result"]!!)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SPS INDEXER
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Query shielded notes from the SPS indexer.
     */
    suspend fun queryShieldedNotes(
        owner: PublicKey? = null,
        mint: String? = null,
        limit: Int = 50
    ): StyxResult<List<ShieldedNote>> = withRetry {
        val params = buildString {
            append("?limit=$limit")
            owner?.let { append("&owner=${it.toBase58()}") }
            mint?.let { append("&mint=$it") }
        }
        val response = httpGet("${config.indexerUrl}/api/notes$params")
        val notes = json.decodeFromString<List<ShieldedNote>>(response)
        StyxResult.Success(notes)
    }

    /**
     * Get pool info from the indexer.
     */
    suspend fun getPoolInfo(mint: String): StyxResult<JsonElement> = withRetry {
        val response = httpGet("${config.indexerUrl}/api/pools/$mint")
        StyxResult.Success(json.parseToJsonElement(response))
    }

    /**
     * Check indexer health.
     */
    suspend fun indexerHealth(): StyxResult<Boolean> = withRetry {
        val response = httpGet("${config.indexerUrl}/healthz")
        StyxResult.Success(response.contains("ok", ignoreCase = true))
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INSTRUCTION HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Parse an SPS instruction from transaction data.
     */
    fun parseInstruction(data: ByteArray): SpsInstructionInfo? =
        SpsInstructions.parseInstruction(data)

    // ═══════════════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Close the client and cancel all coroutines.
     */
    fun close() {
        scope.cancel()
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INTERNAL HTTP + RETRY
    // ═══════════════════════════════════════════════════════════════════════

    private suspend fun <T> withRetry(
        maxRetries: Int = config.maxRetries,
        block: suspend () -> StyxResult<T>
    ): StyxResult<T> {
        var lastError: Exception? = null
        repeat(maxRetries + 1) { attempt ->
            try {
                return block()
            } catch (e: Exception) {
                lastError = e
                if (attempt < maxRetries) {
                    val delayMs = config.retryBaseMs * (1L shl attempt)
                    delay(delayMs.coerceAtMost(config.retryMaxMs))
                }
            }
        }
        return StyxResult.Error(lastError ?: Exception("Unknown error after retries"))
    }

    private suspend fun httpPost(url: String, body: String): String =
        StyxHttpClient.post(url, body, mapOf("Content-Type" to "application/json"))

    private suspend fun httpGet(url: String): String =
        StyxHttpClient.get(url, emptyMap())
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

data class StyxClientConfig(
    val rpcUrl: String = StyxConstants.DEFAULT_RPC_URL,
    val indexerUrl: String = StyxConstants.DEFAULT_INDEXER_URL,
    val commitment: String = "confirmed",
    val skipPreflight: Boolean = false,
    val maxRetries: Int = 3,
    val retryBaseMs: Long = 500,
    val retryMaxMs: Long = 10_000
)

@Serializable
data class AccountInfo(
    val data: String,
    val owner: String,
    val lamports: Long,
    val executable: Boolean
)

// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM HTTP (expect/actual)
// ═══════════════════════════════════════════════════════════════════════════════

expect object StyxHttpClient {
    suspend fun get(url: String, headers: Map<String, String>): String
    suspend fun post(url: String, body: String, headers: Map<String, String>): String
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

private val BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

internal fun ByteArray.toBase64(): String {
    val sb = StringBuilder()
    var i = 0
    while (i < size) {
        val b0 = this[i].toInt() and 0xFF
        val b1 = if (i + 1 < size) this[i + 1].toInt() and 0xFF else 0
        val b2 = if (i + 2 < size) this[i + 2].toInt() and 0xFF else 0
        sb.append(BASE64_CHARS[(b0 shr 2) and 0x3F])
        sb.append(BASE64_CHARS[((b0 shl 4) or (b1 shr 4)) and 0x3F])
        if (i + 1 < size) sb.append(BASE64_CHARS[((b1 shl 2) or (b2 shr 6)) and 0x3F]) else sb.append('=')
        if (i + 2 < size) sb.append(BASE64_CHARS[b2 and 0x3F]) else sb.append('=')
        i += 3
    }
    return sb.toString()
}
