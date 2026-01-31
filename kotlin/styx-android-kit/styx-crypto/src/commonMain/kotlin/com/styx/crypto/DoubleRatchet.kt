package com.styx.crypto

import kotlinx.serialization.Serializable

/**
 * Styx Double Ratchet — Kotlin Multiplatform
 *
 * Signal Protocol Double Ratchet providing forward secrecy for messaging.
 * Each message uses a unique derived key. Compromising the current key
 * cannot reveal past messages (SHA-256 one-way chain).
 *
 * This implementation matches packages/crypto-core/src/ratchet.ts exactly:
 * - Root key: SHA256(ROOT_KEY_DOMAIN || sharedSecret) — NO role byte
 * - Chain keys: SHA256(rootKey || 0x01) and SHA256(rootKey || 0x02)
 * - Initiator sends on 0x01 chain, receives on 0x02 chain
 * - Responder sends on 0x02 chain, receives on 0x01 chain
 */

private val ROOT_KEY_DOMAIN = "STYX_ROOT_KEY_V1".encodeToByteArray()
private val CHAIN_KEY_DOMAIN = "STYX_CHAIN_KEY_V1".encodeToByteArray()
private val MESSAGE_KEY_DOMAIN = "STYX_MESSAGE_KEY_V1".encodeToByteArray()

/**
 * Mutable ratchet state — persisted between messages.
 */
@Serializable
data class RatchetState(
    var rootKey: ByteArray,
    var sendChainKey: ByteArray,
    var recvChainKey: ByteArray,
    var ourEphemeralPublic: ByteArray,
    var theirEphemeralPublic: ByteArray,
    var sendCounter: Int = 0,
    var recvCounter: Int = 0,
    var previousChainLength: Int = 0,
    var sessionId: ByteArray = ByteArray(32),
) {
    /** Serialize to fixed 212-byte wire format */
    fun serialize(): ByteArray {
        val data = ByteArray(32 + 32 + 32 + 32 + 32 + 8 + 8 + 4 + 32) // 212 bytes
        var offset = 0
        rootKey.copyInto(data, offset); offset += 32
        sendChainKey.copyInto(data, offset); offset += 32
        recvChainKey.copyInto(data, offset); offset += 32
        ourEphemeralPublic.copyInto(data, offset); offset += 32
        theirEphemeralPublic.copyInto(data, offset); offset += 32
        putLongLE(data, offset, sendCounter.toLong()); offset += 8
        putLongLE(data, offset, recvCounter.toLong()); offset += 8
        putIntLE(data, offset, previousChainLength); offset += 4
        sessionId.copyInto(data, offset)
        return data
    }

    companion object {
        fun deserialize(data: ByteArray): RatchetState {
            require(data.size == 212) { "RatchetState must be 212 bytes, got ${data.size}" }
            var offset = 0
            val rootKey = data.copyOfRange(offset, offset + 32); offset += 32
            val sendChainKey = data.copyOfRange(offset, offset + 32); offset += 32
            val recvChainKey = data.copyOfRange(offset, offset + 32); offset += 32
            val ourEphPub = data.copyOfRange(offset, offset + 32); offset += 32
            val theirEphPub = data.copyOfRange(offset, offset + 32); offset += 32
            val sendCounter = getLongLE(data, offset).toInt(); offset += 8
            val recvCounter = getLongLE(data, offset).toInt(); offset += 8
            val prevChainLen = getIntLE(data, offset); offset += 4
            val sessionId = data.copyOfRange(offset, offset + 32)
            return RatchetState(
                rootKey, sendChainKey, recvChainKey,
                ourEphPub, theirEphPub,
                sendCounter, recvCounter, prevChainLen, sessionId,
            )
        }

        private fun getLongLE(data: ByteArray, offset: Int): Long {
            var v = 0L
            for (i in 0..7) v = v or ((data[offset + i].toLong() and 0xFF) shl (i * 8))
            return v
        }

        private fun getIntLE(data: ByteArray, offset: Int): Int {
            var v = 0
            for (i in 0..3) v = v or ((data[offset + i].toInt() and 0xFF) shl (i * 8))
            return v
        }
    }
}

private fun putLongLE(data: ByteArray, offset: Int, value: Long) {
    for (i in 0..7) data[offset + i] = ((value ushr (i * 8)) and 0xFF).toByte()
}

private fun putIntLE(data: ByteArray, offset: Int, value: Int) {
    for (i in 0..3) data[offset + i] = ((value ushr (i * 8)) and 0xFF).toByte()
}

/** Result of a chain step — next chain key + message key */
data class ChainStep(val nextChainKey: ByteArray, val messageKey: ByteArray)

/**
 * Styx Double Ratchet operations.
 */
object DoubleRatchet {

    /**
     * Derive the next chain key and message key from current chain key.
     */
    fun deriveChainStep(chainKey: ByteArray, counter: Int): ChainStep {
        val counterBytes = ByteArray(8)
        putLongLE(counterBytes, 0, counter.toLong())

        val nextChainKey = sha256(concatBytes(CHAIN_KEY_DOMAIN, chainKey, counterBytes, byteArrayOf(0x01)))
        val messageKey = sha256(concatBytes(MESSAGE_KEY_DOMAIN, chainKey, counterBytes, byteArrayOf(0x02)))
        return ChainStep(nextChainKey, messageKey)
    }

    /**
     * Derive new root key and chain key from DH output.
     */
    fun deriveRootStep(rootKey: ByteArray, dhOutput: ByteArray): Pair<ByteArray, ByteArray> {
        val combined = sha256(concatBytes(ROOT_KEY_DOMAIN, rootKey, dhOutput))
        val newRootKey = sha256(concatBytes(combined, byteArrayOf(0x01)))
        val newChainKey = sha256(concatBytes(combined, byteArrayOf(0x02)))
        return Pair(newRootKey, newChainKey)
    }

    /**
     * Initialize a new ratchet session from a shared secret (e.g., from X3DH).
     *
     * CRITICAL: Root key derivation does NOT include role byte.
     * Both parties derive the SAME root key from the shared secret.
     * Role differentiation happens only in chain key assignment (swap).
     */
    fun initSession(
        sharedSecret: ByteArray,
        ourEphemeralPublic: ByteArray,
        theirEphemeralPublic: ByteArray,
        isInitiator: Boolean,
    ): RatchetState {
        // Root key — SAME for both parties (no role byte!)
        val rootKey = sha256(concatBytes(ROOT_KEY_DOMAIN, sharedSecret))

        // Chain keys
        val chainKey01 = sha256(concatBytes(rootKey, byteArrayOf(0x01)))
        val chainKey02 = sha256(concatBytes(rootKey, byteArrayOf(0x02)))

        // Session ID
        val sessionId = sha256(concatBytes(ourEphemeralPublic, theirEphemeralPublic, sharedSecret))

        return RatchetState(
            rootKey = rootKey,
            sendChainKey = if (isInitiator) chainKey01 else chainKey02,
            recvChainKey = if (isInitiator) chainKey02 else chainKey01,
            ourEphemeralPublic = ourEphemeralPublic,
            theirEphemeralPublic = theirEphemeralPublic,
            sessionId = sessionId,
        )
    }

    /**
     * Advance the sending ratchet. Returns message key for encrypting.
     * Mutates state in-place.
     */
    fun ratchetSend(state: RatchetState): ByteArray {
        val step = deriveChainStep(state.sendChainKey, state.sendCounter)
        state.sendChainKey = step.nextChainKey
        state.sendCounter++
        return step.messageKey
    }

    /**
     * Advance the receiving ratchet. Returns message key for decrypting.
     * Handles skipped messages (derives up to messageCounter).
     * Mutates state in-place.
     */
    fun ratchetReceive(state: RatchetState, messageCounter: Int): ByteArray {
        var currentKey = state.recvChainKey
        var messageKey: ByteArray? = null

        for (i in state.recvCounter..messageCounter) {
            val step = deriveChainStep(currentKey, i)
            currentKey = step.nextChainKey
            if (i == messageCounter) messageKey = step.messageKey
        }

        requireNotNull(messageKey) { "Failed to derive message key" }
        state.recvChainKey = currentKey
        state.recvCounter = messageCounter + 1
        return messageKey
    }

    /**
     * Perform a DH ratchet step when receiving a new ephemeral key.
     * Mutates state in-place.
     */
    fun dhRatchetStep(state: RatchetState, theirNewEphemeral: ByteArray, dhOutput: ByteArray) {
        // Derive new root and receive chain
        val (newRootKey, newRecvChain) = deriveRootStep(state.rootKey, dhOutput)

        // Generate our new ephemeral
        val newKp = X25519.generateKeyPair()

        // Derive new send chain
        val sendDh = X25519.computeSharedSecret(newKp.privateKey, theirNewEphemeral)
        val (finalRootKey, newSendChain) = deriveRootStep(newRootKey, sendDh)

        state.previousChainLength = state.sendCounter
        state.rootKey = finalRootKey
        state.sendChainKey = newSendChain
        state.recvChainKey = newRecvChain
        state.ourEphemeralPublic = newKp.publicKey
        state.theirEphemeralPublic = theirNewEphemeral
        state.sendCounter = 0
        state.recvCounter = 0
    }
}
