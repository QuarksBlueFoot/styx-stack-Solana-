package nexus.styx.privacy

import nexus.styx.core.*
import nexus.styx.crypto.*

/**
 * Stealth address generation using DKSAP (Dual-Key Stealth Address Protocol).
 *
 * Matches the TypeScript implementation in packages/crypto-core/stealth.ts.
 *
 * Protocol:
 * 1. Recipient publishes (spendPubkey, viewPubkey)
 * 2. Sender generates ephemeral keypair (r, R = r*G)
 * 3. Sender computes S = SHA256(r * viewPubkey || R) to derive stealth key
 * 4. Recipient scans: checks if SHA256(viewSecret * R || R) matches
 */
object StealthAddress {

    /**
     * Generate a stealth address for a recipient.
     *
     * @param recipientViewPubkey Recipient's X25519 view public key (32 bytes)
     * @param recipientSpendPubkey Recipient's spend public key (32 bytes)
     * @return Triple of (stealthPubkey, ephemeralPubkey, sharedSecret)
     */
    fun generate(
        recipientViewPubkey: ByteArray,
        recipientSpendPubkey: ByteArray
    ): StealthAddressResult {
        require(recipientViewPubkey.size == 32) { "viewPubkey must be 32 bytes" }
        require(recipientSpendPubkey.size == 32) { "spendPubkey must be 32 bytes" }

        // Generate ephemeral keypair
        val ephemeral = X25519.generateKeyPair()
        val ephemeralSecret = ephemeral.copyOfRange(0, 32)
        val ephemeralPubkey = ephemeral.copyOfRange(32, 64)

        // Shared secret = X25519(ephemeral_secret, recipient_view_pubkey)
        val dhResult = X25519.computeSharedSecret(ephemeralSecret, recipientViewPubkey)

        // Stealth scalar = SHA256(dhResult || ephemeralPubkey)
        val stealthScalar = sha256(concatBytes(dhResult, ephemeralPubkey))

        // Stealth address = stealthScalar XOR spendPubkey (simplified — real impl uses EC add)
        // For Solana's ed25519, we derive a deterministic key
        val stealthPubkey = sha256(concatBytes(stealthScalar, recipientSpendPubkey))

        return StealthAddressResult(
            stealthPubkey = stealthPubkey,
            ephemeralPubkey = ephemeralPubkey,
            sharedSecret = dhResult
        )
    }

    /**
     * Scan for stealth addresses (recipient side).
     *
     * @param viewSecretKey Recipient's X25519 view secret key
     * @param spendPubkey Recipient's spend public key
     * @param ephemeralPubkey The ephemeral public key from the transaction
     * @return The expected stealth pubkey if this is for us
     */
    fun scan(
        viewSecretKey: ByteArray,
        spendPubkey: ByteArray,
        ephemeralPubkey: ByteArray
    ): ByteArray {
        require(viewSecretKey.size == 32) { "viewSecretKey must be 32 bytes" }
        require(spendPubkey.size == 32) { "spendPubkey must be 32 bytes" }
        require(ephemeralPubkey.size == 32) { "ephemeralPubkey must be 32 bytes" }

        val dhResult = X25519.computeSharedSecret(viewSecretKey, ephemeralPubkey)
        val stealthScalar = sha256(concatBytes(dhResult, ephemeralPubkey))
        return sha256(concatBytes(stealthScalar, spendPubkey))
    }

    /**
     * Check if a stealth address belongs to us.
     */
    fun isMine(
        viewSecretKey: ByteArray,
        spendPubkey: ByteArray,
        ephemeralPubkey: ByteArray,
        candidateAddress: ByteArray
    ): Boolean {
        val expected = scan(viewSecretKey, spendPubkey, ephemeralPubkey)
        return constantTimeEquals(expected, candidateAddress)
    }
}

data class StealthAddressResult(
    val stealthPubkey: ByteArray,
    val ephemeralPubkey: ByteArray,
    val sharedSecret: ByteArray
) {
    override fun equals(other: Any?) = this === other
    override fun hashCode(): Int = stealthPubkey.contentHashCode()
}
