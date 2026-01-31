package com.styx.core

import kotlinx.serialization.Serializable

/**
 * Core types used across the Styx SDK.
 */

/** 32-byte public key (Solana address) */
@JvmInline
value class PublicKey(val bytes: ByteArray) {
    init { require(bytes.size == 32) { "PublicKey must be 32 bytes, got ${bytes.size}" } }

    fun toBase58(): String = Base58.encode(bytes)

    companion object {
        fun fromBase58(s: String): PublicKey = PublicKey(Base58.decode(s))
    }

    override fun toString(): String = toBase58()
}

/** 64-byte keypair (32 secret + 32 public) */
data class Keypair(
    val secretKey: ByteArray,
    val publicKey: PublicKey,
) {
    init { require(secretKey.size == 32 || secretKey.size == 64) }
}

/** A commitment in the shielded pool */
@JvmInline
value class Commitment(val bytes: ByteArray) {
    init { require(bytes.size == 32) { "Commitment must be 32 bytes" } }
    fun toHex(): String = bytes.toHex()
}

/** A nullifier (spend proof) */
@JvmInline
value class Nullifier(val bytes: ByteArray) {
    init { require(bytes.size == 32) { "Nullifier must be 32 bytes" } }
    fun toHex(): String = bytes.toHex()
}

/** A shielded note in the pool */
@Serializable
data class ShieldedNote(
    val commitment: String,
    val mint: String,
    val amount: Long,
    val blinding: String,
    val nonce: Long = 0,
    val spent: Boolean = false,
)

/** Transaction instruction data */
data class InstructionData(
    val programId: PublicKey,
    val data: ByteArray,
    val accounts: List<AccountMeta> = emptyList(),
)

/** Account metadata for instructions */
data class AccountMeta(
    val pubkey: PublicKey,
    val isSigner: Boolean,
    val isWritable: Boolean,
)

/** Parsed SPS instruction info */
data class SpsInstructionInfo(
    val mode: String,
    val domain: String,
    val domainByte: Byte,
    val opByte: Byte,
    val opName: String,
    val payloadSize: Int,
)

/** Result wrapper for SDK operations */
sealed class StyxResult<out T> {
    data class Success<T>(val value: T) : StyxResult<T>()
    data class Error(val message: String, val cause: Throwable? = null) : StyxResult<Nothing>()

    val isSuccess: Boolean get() = this is Success
    val isError: Boolean get() = this is Error

    fun getOrNull(): T? = (this as? Success)?.value
    fun getOrThrow(): T = when (this) {
        is Success -> value
        is Error -> throw cause ?: RuntimeException(message)
    }

    inline fun <R> map(transform: (T) -> R): StyxResult<R> = when (this) {
        is Success -> Success(transform(value))
        is Error -> this
    }

    inline fun onSuccess(action: (T) -> Unit): StyxResult<T> {
        if (this is Success) action(value)
        return this
    }

    inline fun onError(action: (String, Throwable?) -> Unit): StyxResult<T> {
        if (this is Error) action(message, cause)
        return this
    }
}

// ── Utility Extensions ──

fun ByteArray.toHex(): String = joinToString("") { (it.toInt() and 0xFF).toString(16).padStart(2, '0') }

fun String.hexToBytes(): ByteArray {
    require(length % 2 == 0) { "Hex string must have even length" }
    return ByteArray(length / 2) { i ->
        ((Character.digit(this[i * 2], 16) shl 4) + Character.digit(this[i * 2 + 1], 16)).toByte()
    }
}
