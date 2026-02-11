package nexus.styx.crypto

/**
 * Platform-agnostic cryptographic primitives.
 *
 * Uses expect/actual pattern so JVM uses java.security / Bouncy Castle
 * and future iOS target can use CryptoKit.
 */

/** SHA-256 hash */
expect fun sha256(input: ByteArray): ByteArray

/** HMAC-SHA256 */
expect fun hmacSha256(key: ByteArray, data: ByteArray): ByteArray

/** Keccak-256 hash */
expect fun keccak256(input: ByteArray): ByteArray

/** Generate cryptographically secure random bytes */
expect fun secureRandom(size: Int): ByteArray

/** X25519 Diffie-Hellman key exchange */
expect object X25519 {
    /** Generate a new X25519 keypair */
    fun generateKeyPair(): X25519KeyPair

    /** Compute shared secret: myPrivate × theirPublic */
    fun computeSharedSecret(privateKey: ByteArray, publicKey: ByteArray): ByteArray
}

/** X25519 key pair */
data class X25519KeyPair(
    val privateKey: ByteArray,
    val publicKey: ByteArray,
) {
    init {
        require(privateKey.size == 32) { "X25519 private key must be 32 bytes" }
        require(publicKey.size == 32) { "X25519 public key must be 32 bytes" }
    }
}

/** AES-256-GCM authenticated encryption */
expect object Aes256Gcm {
    /** Encrypt with AES-256-GCM. Returns nonce || ciphertext || tag. */
    fun encrypt(plaintext: ByteArray, key: ByteArray, aad: ByteArray = ByteArray(0)): ByteArray

    /** Decrypt AES-256-GCM. Input is nonce || ciphertext || tag. */
    fun decrypt(sealed: ByteArray, key: ByteArray, aad: ByteArray = ByteArray(0)): ByteArray
}

// ── Utility ──

/** Concatenate multiple byte arrays */
fun concatBytes(vararg arrays: ByteArray): ByteArray {
    val total = arrays.sumOf { it.size }
    val result = ByteArray(total)
    var offset = 0
    for (arr in arrays) {
        arr.copyInto(result, offset)
        offset += arr.size
    }
    return result
}

/** Constant-time byte array comparison */
fun constantTimeEquals(a: ByteArray, b: ByteArray): Boolean {
    if (a.size != b.size) return false
    var diff = 0
    for (i in a.indices) {
        diff = diff or (a[i].toInt() xor b[i].toInt())
    }
    return diff == 0
}
