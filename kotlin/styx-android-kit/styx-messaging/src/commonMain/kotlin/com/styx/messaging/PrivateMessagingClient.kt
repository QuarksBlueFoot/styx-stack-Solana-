package com.styx.messaging

import com.styx.core.PublicKey
import com.styx.crypto.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.datetime.Clock
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

@Serializable
data class PrivateMessage(
    val id: String,
    val sender: String,
    val recipient: String,
    val content: String,
    val timestamp: Long,
    val replyTo: String? = null,
    val ratchetKey: ByteArray? = null,
    val messageNumber: Int = 0
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is PrivateMessage) return false
        return id == other.id
    }
    override fun hashCode(): Int = id.hashCode()
}

@Serializable
data class MessageEnvelope(
    val version: Int = 1,
    val sender: String,
    val recipient: String,
    val ephemeralKey: ByteArray,
    val nonce: ByteArray,
    val ciphertext: ByteArray
) {
    override fun equals(other: Any?) = this === other
    override fun hashCode(): Int = sender.hashCode() * 31 + recipient.hashCode()
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGING CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for the Private Messaging Client.
 */
data class MessagingConfig(
    val x25519SecretKey: ByteArray,
    val x25519PublicKey: ByteArray,
    val signerPubkey: PublicKey,
    val onMessage: ((PrivateMessage) -> Unit)? = null,
    val onDelivered: ((String) -> Unit)? = null,
    val onRead: ((String) -> Unit)? = null,
)

/**
 * Coroutine-native private messaging client for Styx.
 *
 * Uses Double Ratchet for forward secrecy and X3DH for key agreement.
 * All session state is held in-memory with optional persistence callbacks.
 *
 * Thread-safe: all session mutations are locked via Mutex.
 */
class PrivateMessagingClient(private val config: MessagingConfig) {

    private val sessions = mutableMapOf<String, DoubleRatchet.RatchetState>()
    private val sessionMutex = Mutex()

    private val _incomingMessages = MutableSharedFlow<PrivateMessage>(extraBufferCapacity = 64)
    /** Flow of incoming decrypted messages */
    val incomingMessages: SharedFlow<PrivateMessage> = _incomingMessages.asSharedFlow()

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = false }

    /**
     * Get our X25519 public key for key exchange.
     */
    fun getPublicEncryptionKey(): ByteArray = config.x25519PublicKey

    /**
     * Initialize or retrieve a Double Ratchet session with a peer.
     *
     * @param theirPubkeyBase58 Base58 public key of the peer
     * @param theirX25519Key The peer's 32-byte X25519 public key
     * @return The ratchet state for this session
     */
    suspend fun getOrCreateSession(
        theirPubkeyBase58: String,
        theirX25519Key: ByteArray
    ): DoubleRatchet.RatchetState = sessionMutex.withLock {
        sessions.getOrPut(theirPubkeyBase58) {
            val sharedSecret = X25519.computeSharedSecret(config.x25519SecretKey, theirX25519Key)
            val isInitiator = config.signerPubkey.toBase58() < theirPubkeyBase58

            val ourKeys = X25519.generateKeyPair()
            DoubleRatchet.initSession(sharedSecret, ourKeys, theirX25519Key, isInitiator)
        }
    }

    /**
     * Encrypt a message payload for a recipient.
     *
     * @return Pair of (encrypted envelope bytes, updated message number)
     */
    suspend fun encryptMessage(
        recipient: String,
        recipientX25519Key: ByteArray,
        content: String,
        replyTo: String? = null
    ): Pair<ByteArray, Int> = sessionMutex.withLock {
        val state = sessions.getOrPut(recipient) {
            val sharedSecret = X25519.computeSharedSecret(config.x25519SecretKey, recipientX25519Key)
            val isInitiator = config.signerPubkey.toBase58() < recipient
            val ourKeys = X25519.generateKeyPair()
            DoubleRatchet.initSession(sharedSecret, ourKeys, recipientX25519Key, isInitiator)
        }

        val (msgKey, msgNum) = DoubleRatchet.ratchetSend(state)

        val payload = json.encodeToString(
            MessagePayload(
                content = content,
                timestamp = Clock.System.now().toEpochMilliseconds(),
                replyTo = replyTo,
                ratchetKey = state.ourRatchetKey.copyOfRange(32, 64), // public key portion
                messageNumber = msgNum
            )
        )

        val plaintext = payload.encodeToByteArray()
        val encrypted = Aes256Gcm.encrypt(plaintext, msgKey)
        val envelope = concatBytes(encrypted.second, encrypted.first) // nonce + ciphertext

        // Update stored state
        sessions[recipient] = state

        Pair(envelope, msgNum)
    }

    /**
     * Decrypt an incoming message envelope.
     */
    suspend fun decryptMessage(
        senderPubkey: String,
        senderX25519Key: ByteArray,
        envelopeData: ByteArray
    ): PrivateMessage? = sessionMutex.withLock {
        val state = sessions.getOrPut(senderPubkey) {
            val sharedSecret = X25519.computeSharedSecret(config.x25519SecretKey, senderX25519Key)
            val isInitiator = config.signerPubkey.toBase58() < senderPubkey
            val ourKeys = X25519.generateKeyPair()
            DoubleRatchet.initSession(sharedSecret, ourKeys, senderX25519Key, isInitiator)
        }

        try {
            // envelope = nonce(12) + ciphertext(rest)
            if (envelopeData.size < 12) return@withLock null
            val nonce = envelopeData.copyOfRange(0, 12)
            val ciphertext = envelopeData.copyOfRange(12, envelopeData.size)

            val (msgKey, _) = DoubleRatchet.ratchetReceive(state)
            val plaintext = Aes256Gcm.decrypt(ciphertext, msgKey, nonce)

            val payload = json.decodeFromString<MessagePayload>(plaintext.decodeToString())

            // Perform DH ratchet step if sender included new ratchet key
            if (payload.ratchetKey != null && payload.ratchetKey.size == 32) {
                DoubleRatchet.dhRatchetStep(state, payload.ratchetKey)
            }

            sessions[senderPubkey] = state

            val msg = PrivateMessage(
                id = generateMessageId(),
                sender = senderPubkey,
                recipient = config.signerPubkey.toBase58(),
                content = payload.content,
                timestamp = payload.timestamp,
                replyTo = payload.replyTo,
                ratchetKey = payload.ratchetKey,
                messageNumber = payload.messageNumber
            )

            _incomingMessages.tryEmit(msg)
            config.onMessage?.invoke(msg)

            msg
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Check if a session exists for a given peer.
     */
    suspend fun hasSession(peerPubkey: String): Boolean = sessionMutex.withLock {
        sessions.containsKey(peerPubkey)
    }

    /**
     * Export serialized session state for persistence.
     */
    suspend fun exportSession(peerPubkey: String): ByteArray? = sessionMutex.withLock {
        sessions[peerPubkey]?.let { DoubleRatchet.RatchetState.serialize(it) }
    }

    /**
     * Import a previously serialized session.
     */
    suspend fun importSession(peerPubkey: String, data: ByteArray) = sessionMutex.withLock {
        sessions[peerPubkey] = DoubleRatchet.RatchetState.deserialize(data)
    }

    /**
     * Close and remove a session.
     */
    suspend fun closeSession(peerPubkey: String) = sessionMutex.withLock {
        sessions.remove(peerPubkey)
    }

    /**
     * Number of active sessions.
     */
    suspend fun sessionCount(): Int = sessionMutex.withLock { sessions.size }

    private fun generateMessageId(): String {
        val bytes = secureRandom(16)
        return bytes.joinToString("") { b -> (b.toInt() and 0xFF).toString(16).padStart(2, '0') }
    }
}

@Serializable
private data class MessagePayload(
    val content: String,
    val timestamp: Long,
    val replyTo: String? = null,
    val ratchetKey: ByteArray? = null,
    val messageNumber: Int = 0
) {
    override fun equals(other: Any?) = this === other
    override fun hashCode(): Int = content.hashCode()
}
