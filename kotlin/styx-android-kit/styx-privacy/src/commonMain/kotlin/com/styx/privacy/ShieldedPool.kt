package com.styx.privacy

import com.styx.core.*
import com.styx.crypto.*
import kotlinx.serialization.Serializable

/**
 * SPS Shielded Pool operations — shield, unshield, private transfer.
 *
 * Uses the commitment/nullifier scheme from styx-crypto and builds
 * the privacy-layer transaction payloads.
 */
object ShieldedPool {

    /**
     * Create a shielded note for depositing into the pool.
     *
     * @param amount Token amount in lamports
     * @param ownerPubkey Owner's 32-byte public key
     * @return ShieldedNote with commitment and randomness
     */
    fun createShieldedNote(amount: Long, ownerPubkey: ByteArray): ShieldedNote {
        require(ownerPubkey.size == 32) { "ownerPubkey must be 32 bytes" }
        require(amount > 0) { "amount must be positive" }

        val randomness = secureRandom(32)
        val commitment = CommitmentScheme.generateCommitment(amount, ownerPubkey, randomness)

        return ShieldedNote(
            commitment = commitment.data.toHex(),
            amount = amount,
            randomness = randomness.toHex(),
            ownerPubkey = PublicKey(ownerPubkey).toBase58(),
            nullifier = null,
            spent = false
        )
    }

    /**
     * Derive the nullifier for a shielded note (used when spending).
     *
     * @param note The shielded note to spend
     * @param ownerSecret Owner's 32-byte secret key
     * @return Updated note with nullifier
     */
    fun deriveNullifier(note: ShieldedNote, ownerSecret: ByteArray): ShieldedNote {
        val commitmentBytes = note.commitment.hexToBytes()
        val nullifier = CommitmentScheme.generateNullifier(commitmentBytes, ownerSecret)
        return note.copy(nullifier = nullifier.data.toHex())
    }

    /**
     * Verify that a commitment matches the given parameters.
     */
    fun verifyCommitment(
        commitment: ByteArray,
        amount: Long,
        ownerPubkey: ByteArray,
        randomness: ByteArray
    ): Boolean {
        val expected = CommitmentScheme.generateCommitment(amount, ownerPubkey, randomness)
        return constantTimeEquals(commitment, expected.data)
    }

    /**
     * Data needed to build a shield transaction.
     */
    @Serializable
    data class ShieldRequest(
        val mint: String,
        val amount: Long,
        val commitment: String,
        val ownerPubkey: String
    )

    /**
     * Data needed to build an unshield transaction.
     */
    @Serializable
    data class UnshieldRequest(
        val mint: String,
        val nullifier: String,
        val recipient: String,
        val amount: Long,
        val proof: ByteArray
    ) {
        override fun equals(other: Any?) = this === other
        override fun hashCode(): Int = nullifier.hashCode()
    }

    /**
     * Data needed for a private transfer (shield→shield, no unshield).
     */
    @Serializable
    data class PrivateTransferRequest(
        val nullifier: String,
        val newCommitment: String,
        val amount: Long,
        val proof: ByteArray,
        val recipientEncrypted: ByteArray? = null
    ) {
        override fun equals(other: Any?) = this === other
        override fun hashCode(): Int = nullifier.hashCode()
    }
}
