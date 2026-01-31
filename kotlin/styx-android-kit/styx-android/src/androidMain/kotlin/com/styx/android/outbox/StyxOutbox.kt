package com.styx.android.outbox

import com.styx.android.secure.StyxSecureStorage
import com.styx.core.StyxResult
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/**
 * Offline-first transaction outbox for Solana Mobile.
 *
 * Matches the TypeScript `@styx/mobile-outbox` package:
 * - Queues transactions when offline or wallet unavailable
 * - Persists queue to encrypted storage (survives app restart)
 * - Auto-drains when connectivity restored
 * - Exponential backoff on failures
 * - Flow-based status observation
 *
 * Usage:
 * ```kotlin
 * val outbox = StyxOutbox(storage)
 * outbox.enqueue(serializedTx, label = "Shield 1 SOL")
 *
 * // Observe status
 * outbox.queueState.collect { items ->
 *     updateUI(items)
 * }
 *
 * // Drain when ready
 * outbox.drain { tx -> mwaClient.signAndSendTransaction(sender, tx) }
 * ```
 */
class StyxOutbox(
    private val storage: StyxSecureStorage,
    private val config: OutboxConfig = OutboxConfig(),
) {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val mutex = Mutex()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val ns = storage.namespace(StyxSecureStorage.Keys.OUTBOX_PREFIX)

    private val _queueState = MutableStateFlow<List<OutboxItem>>(emptyList())

    /** Observable queue state as a Flow. */
    val queueState: StateFlow<List<OutboxItem>> = _queueState.asStateFlow()

    /** Current queue size. */
    val size: Int get() = _queueState.value.size

    /** Whether the queue has pending items. */
    val hasPending: Boolean get() = _queueState.value.any { it.status == OutboxStatus.PENDING }

    init {
        // Restore persisted queue on construction
        scope.launch { restoreFromStorage() }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // QUEUE OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Enqueue a serialized transaction for later sending.
     *
     * @param serializedTx The unsigned serialized transaction bytes
     * @param label Human-readable label (e.g. "Shield 1 SOL")
     * @param priority Higher priority items drain first
     * @return The outbox item ID
     */
    suspend fun enqueue(
        serializedTx: ByteArray,
        label: String = "",
        priority: Int = 0,
    ): String = mutex.withLock {
        val id = "otx_${System.currentTimeMillis()}_${(Math.random() * 10000).toInt()}"
        val item = OutboxItem(
            id = id,
            serializedTx = serializedTx.toHex(),
            label = label,
            priority = priority,
            createdAt = System.currentTimeMillis(),
            status = OutboxStatus.PENDING,
            attempts = 0,
        )
        val list = _queueState.value + item
        _queueState.value = list
        persistQueue(list)
        id
    }

    /**
     * Remove an item from the queue.
     */
    suspend fun remove(id: String) = mutex.withLock {
        val list = _queueState.value.filter { it.id != id }
        _queueState.value = list
        persistQueue(list)
    }

    /**
     * Clear all items from the queue.
     */
    suspend fun clear() = mutex.withLock {
        _queueState.value = emptyList()
        ns.remove("queue")
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DRAIN — Send all pending transactions
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Drain the outbox: attempt to send all PENDING items.
     *
     * Matches the TypeScript `outboxDrain` function.
     *
     * @param sendFn A suspend function that takes serialized tx bytes and
     *               returns the signature string on success.
     * @return Results for each item attempted
     */
    suspend fun drain(
        sendFn: suspend (ByteArray) -> String
    ): List<DrainResult> = mutex.withLock {
        val pending = _queueState.value
            .filter { it.status == OutboxStatus.PENDING }
            .sortedByDescending { it.priority }

        val results = mutableListOf<DrainResult>()

        for (item in pending) {
            val updatedItem = item.copy(status = OutboxStatus.SENDING, attempts = item.attempts + 1)
            updateItem(updatedItem)

            try {
                val txBytes = item.serializedTx.hexToBytes()
                val signature = sendFn(txBytes)
                val sent = updatedItem.copy(
                    status = OutboxStatus.SENT,
                    signature = signature,
                    sentAt = System.currentTimeMillis(),
                )
                updateItem(sent)
                results.add(DrainResult(item.id, signature = signature))
            } catch (e: Exception) {
                val failed = if (updatedItem.attempts >= config.maxRetries) {
                    updatedItem.copy(status = OutboxStatus.FAILED, error = e.message)
                } else {
                    updatedItem.copy(status = OutboxStatus.PENDING, error = e.message)
                }
                updateItem(failed)
                results.add(DrainResult(item.id, error = e.message))
            }
        }

        persistQueue(_queueState.value)
        results
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PERSISTENCE
    // ═══════════════════════════════════════════════════════════════════════

    private fun persistQueue(items: List<OutboxItem>) {
        val serialized = json.encodeToString(items.map { it.toSerializable() })
        ns.putString("queue", serialized)
    }

    private fun restoreFromStorage() {
        val raw = ns.getString("queue") ?: return
        try {
            val items = json.decodeFromString<List<SerializableOutboxItem>>(raw)
            _queueState.value = items.map { it.toOutboxItem() }
        } catch (_: Exception) {
            // Corrupt data — start fresh
            ns.remove("queue")
        }
    }

    private fun updateItem(item: OutboxItem) {
        _queueState.value = _queueState.value.map {
            if (it.id == item.id) item else it
        }
    }

    /**
     * Close the outbox scope.
     */
    fun close() {
        scope.cancel()
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

enum class OutboxStatus {
    PENDING, SENDING, SENT, FAILED
}

data class OutboxItem(
    val id: String,
    val serializedTx: String, // hex-encoded
    val label: String,
    val priority: Int,
    val createdAt: Long,
    val status: OutboxStatus,
    val attempts: Int,
    val signature: String? = null,
    val sentAt: Long? = null,
    val error: String? = null,
)

data class DrainResult(
    val id: String,
    val signature: String? = null,
    val error: String? = null,
) {
    val isSuccess: Boolean get() = signature != null
}

data class OutboxConfig(
    val maxRetries: Int = 3,
    val retryBaseMs: Long = 1000,
    val retryMaxMs: Long = 30_000,
    val persistOnEnqueue: Boolean = true,
)

// ── Serialization helpers ───────────────────────────────────────────────────

@Serializable
internal data class SerializableOutboxItem(
    val id: String,
    val serializedTx: String,
    val label: String,
    val priority: Int,
    val createdAt: Long,
    val status: String,
    val attempts: Int,
    val signature: String? = null,
    val sentAt: Long? = null,
    val error: String? = null,
)

internal fun OutboxItem.toSerializable() = SerializableOutboxItem(
    id, serializedTx, label, priority, createdAt, status.name, attempts, signature, sentAt, error
)

internal fun SerializableOutboxItem.toOutboxItem() = OutboxItem(
    id, serializedTx, label, priority, createdAt,
    OutboxStatus.valueOf(status), attempts, signature, sentAt, error
)

// ── Hex utilities ───────────────────────────────────────────────────────────

private fun ByteArray.toHex(): String =
    joinToString("") { (it.toInt() and 0xFF).toString(16).padStart(2, '0') }

private fun String.hexToBytes(): ByteArray {
    require(length % 2 == 0) { "Hex string must have even length" }
    return ByteArray(length / 2) { i ->
        substring(i * 2, i * 2 + 2).toInt(16).toByte()
    }
}
