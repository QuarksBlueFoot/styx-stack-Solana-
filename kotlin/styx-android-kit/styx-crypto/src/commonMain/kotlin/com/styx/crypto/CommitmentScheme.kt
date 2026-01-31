package com.styx.crypto

import com.styx.core.Commitment
import com.styx.core.Nullifier

/**
 * Commitment and Nullifier generation for the Styx shielded pool.
 *
 * Matches the TypeScript implementation in packages/crypto-core.
 *
 * Commitment = SHA256(amount_le64 || owner_pubkey_32 || randomness_32)
 * Nullifier = SHA256(commitment_32 || owner_secret_32 || "styx-nullifier-v1")
 */
object CommitmentScheme {

    private val NULLIFIER_DOMAIN = "styx-nullifier-v1".encodeToByteArray()
    private val NODE_PREFIX = "styx-node-v1".encodeToByteArray()
    private val LEAF_PREFIX = "styx-leaf-v1".encodeToByteArray()

    /**
     * Generate a commitment for shielding tokens into the pool.
     *
     * @param amount Token amount (lamports / smallest unit)
     * @param ownerPubkey 32-byte owner public key
     * @param randomness 32-byte random blinding factor
     */
    fun generateCommitment(amount: Long, ownerPubkey: ByteArray, randomness: ByteArray): Commitment {
        require(ownerPubkey.size == 32) { "ownerPubkey must be 32 bytes" }
        require(randomness.size == 32) { "randomness must be 32 bytes" }

        val amountBytes = ByteArray(8)
        putLongLE(amountBytes, 0, amount)

        val preimage = ByteArray(8 + 32 + 32)
        amountBytes.copyInto(preimage, 0)
        ownerPubkey.copyInto(preimage, 8)
        randomness.copyInto(preimage, 40)

        return Commitment(sha256(preimage))
    }

    /**
     * Generate a nullifier to prove a commitment is spent.
     * Only the owner (with their secret key) can produce this.
     *
     * @param commitment The 32-byte commitment being spent
     * @param ownerSecret The owner's 32-byte secret key
     */
    fun generateNullifier(commitment: ByteArray, ownerSecret: ByteArray): Nullifier {
        require(commitment.size == 32) { "commitment must be 32 bytes" }
        require(ownerSecret.size >= 32) { "ownerSecret must be at least 32 bytes" }

        val secret = if (ownerSecret.size > 32) ownerSecret.copyOfRange(0, 32) else ownerSecret
        return Nullifier(sha256(concatBytes(commitment, secret, NULLIFIER_DOMAIN)))
    }

    /**
     * Hash two Merkle tree nodes together.
     */
    fun hashNodes(left: ByteArray, right: ByteArray): ByteArray {
        require(left.size == 32) { "left must be 32 bytes" }
        require(right.size == 32) { "right must be 32 bytes" }
        return sha256(concatBytes(NODE_PREFIX, left, right))
    }

    /**
     * Compute a leaf hash for Merkle tree insertion.
     */
    fun computeLeafHash(namespace: ByteArray, key: ByteArray, value: ByteArray): ByteArray {
        return sha256(concatBytes(LEAF_PREFIX, namespace, key, value))
    }

    /**
     * Verify a Merkle inclusion proof.
     *
     * @param leaf The leaf hash to verify
     * @param proof Array of 32-byte sibling hashes
     * @param path Bit path (0 = left, 1 = right for each level)
     * @param root Expected Merkle root
     */
    fun verifyMerkleProof(leaf: ByteArray, proof: List<ByteArray>, path: Int, root: ByteArray): Boolean {
        var current = leaf
        var pathBits = path
        for (sibling in proof) {
            current = if (pathBits and 1 == 0) {
                hashNodes(current, sibling)
            } else {
                hashNodes(sibling, current)
            }
            pathBits = pathBits shr 1
        }
        return constantTimeEquals(current, root)
    }

    /**
     * Encrypt recipient pubkey with XOR mask (for private transfers).
     */
    fun encryptRecipient(senderPubkey: ByteArray, recipientPubkey: ByteArray): ByteArray {
        require(senderPubkey.size == 32)
        require(recipientPubkey.size == 32)
        val maskInput = concatBytes("STYX_META_V3".encodeToByteArray(), senderPubkey)
        val mask = keccak256(maskInput)
        return ByteArray(32) { i -> (recipientPubkey[i].toInt() xor mask[i].toInt()).toByte() }
    }

    /**
     * Decrypt recipient pubkey from XOR mask.
     */
    fun decryptRecipient(senderPubkey: ByteArray, encrypted: ByteArray): ByteArray {
        // XOR is symmetric — same operation
        return encryptRecipient(senderPubkey, encrypted)
    }

    private fun putLongLE(data: ByteArray, offset: Int, value: Long) {
        for (i in 0..7) data[offset + i] = ((value ushr (i * 8)) and 0xFF).toByte()
    }
}
