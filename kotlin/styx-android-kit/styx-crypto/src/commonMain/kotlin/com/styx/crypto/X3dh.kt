package com.styx.crypto

/**
 * X3DH (Extended Triple Diffie-Hellman) Key Agreement — Kotlin Multiplatform
 *
 * Matches packages/crypto-core/src/x3dh.ts implementation.
 *
 * Protocol:
 *   1. Bob publishes prekey bundle: (IK_B, SPK_B, OPK_B)
 *   2. Alice initiates with 4 DH rounds:
 *      DH1 = IK_A × SPK_B
 *      DH2 = EK_A × IK_B
 *      DH3 = EK_A × SPK_B
 *      DH4 = EK_A × OPK_B
 *   3. Both parties derive: sharedSecret = SHA256(DH1 || DH2 || DH3 || DH4)
 *   4. Feed into DoubleRatchet.initSession() for forward-secret messaging.
 */

/** Published prekey bundle (stored on-chain or relay) */
data class PrekeyBundle(
    val identityKey: ByteArray,     // 32 bytes — Bob's X25519 identity public key
    val signedPrekey: ByteArray,    // 32 bytes — Bob's signed ephemeral prekey
    val prekeySignature: ByteArray, // 64 bytes — Ed25519 signature over signedPrekey
    val oneTimePrekey: ByteArray?,  // 32 bytes — Optional one-time prekey (consumed on use)
)

/** Local prekey state (Alice's keys for initiating) */
data class X3dhInitiatorKeys(
    val identityKeyPair: X25519KeyPair,
    val ephemeralKeyPair: X25519KeyPair,
)

/** Local prekey state (Bob's keys for responding) */
data class X3dhResponderKeys(
    val identityKeyPair: X25519KeyPair,
    val signedPrekeyPair: X25519KeyPair,
    val oneTimePrekeyPair: X25519KeyPair?,
)

/** Result of X3DH key agreement */
data class X3dhResult(
    val sharedSecret: ByteArray,    // 32 bytes — Feed into DoubleRatchet
    val ephemeralPublic: ByteArray,  // Alice's ephemeral public (sent to Bob)
)

object X3dh {

    /**
     * Alice initiates X3DH with Bob's prekey bundle.
     *
     * Returns shared secret that both parties can derive independently.
     */
    fun initiate(
        ourKeys: X3dhInitiatorKeys,
        theirBundle: PrekeyBundle,
    ): X3dhResult {
        // DH1 = IK_A × SPK_B — Alice's identity × Bob's signed prekey
        val dh1 = X25519.computeSharedSecret(ourKeys.identityKeyPair.privateKey, theirBundle.signedPrekey)

        // DH2 = EK_A × IK_B — Alice's ephemeral × Bob's identity
        val dh2 = X25519.computeSharedSecret(ourKeys.ephemeralKeyPair.privateKey, theirBundle.identityKey)

        // DH3 = EK_A × SPK_B — Alice's ephemeral × Bob's signed prekey
        val dh3 = X25519.computeSharedSecret(ourKeys.ephemeralKeyPair.privateKey, theirBundle.signedPrekey)

        // DH4 = EK_A × OPK_B — Alice's ephemeral × Bob's one-time prekey (if present)
        val dh4 = if (theirBundle.oneTimePrekey != null) {
            X25519.computeSharedSecret(ourKeys.ephemeralKeyPair.privateKey, theirBundle.oneTimePrekey)
        } else {
            ByteArray(32) // Zero-fill if no OPK
        }

        // Combine all DH outputs
        val sharedSecret = sha256(concatBytes(dh1, dh2, dh3, dh4))

        return X3dhResult(
            sharedSecret = sharedSecret,
            ephemeralPublic = ourKeys.ephemeralKeyPair.publicKey,
        )
    }

    /**
     * Bob responds to X3DH — computes the same shared secret.
     *
     * @param aliceIdentityPublic Alice's X25519 identity public key
     * @param aliceEphemeralPublic Alice's ephemeral public key (from initial message)
     */
    fun respond(
        ourKeys: X3dhResponderKeys,
        aliceIdentityPublic: ByteArray,
        aliceEphemeralPublic: ByteArray,
    ): X3dhResult {
        // DH1 = SPK_B × IK_A — Bob's signed prekey × Alice's identity
        val dh1 = X25519.computeSharedSecret(ourKeys.signedPrekeyPair.privateKey, aliceIdentityPublic)

        // DH2 = IK_B × EK_A — Bob's identity × Alice's ephemeral
        val dh2 = X25519.computeSharedSecret(ourKeys.identityKeyPair.privateKey, aliceEphemeralPublic)

        // DH3 = SPK_B × EK_A — Bob's signed prekey × Alice's ephemeral
        val dh3 = X25519.computeSharedSecret(ourKeys.signedPrekeyPair.privateKey, aliceEphemeralPublic)

        // DH4 = OPK_B × EK_A — Bob's one-time prekey × Alice's ephemeral
        val dh4 = if (ourKeys.oneTimePrekeyPair != null) {
            X25519.computeSharedSecret(ourKeys.oneTimePrekeyPair.privateKey, aliceEphemeralPublic)
        } else {
            ByteArray(32)
        }

        val sharedSecret = sha256(concatBytes(dh1, dh2, dh3, dh4))

        return X3dhResult(
            sharedSecret = sharedSecret,
            ephemeralPublic = ourKeys.signedPrekeyPair.publicKey,
        )
    }

    /**
     * Full X3DH → Double Ratchet bridge.
     *
     * After X3DH completes, initialize a Double Ratchet session.
     */
    fun initRatchetFromX3dh(
        sharedSecret: ByteArray,
        ourEphemeralPublic: ByteArray,
        theirPublic: ByteArray,
        isInitiator: Boolean,
    ): RatchetState = DoubleRatchet.initSession(
        sharedSecret = sharedSecret,
        ourEphemeralPublic = ourEphemeralPublic,
        theirEphemeralPublic = theirPublic,
        isInitiator = isInitiator,
    )
}
