package com.styx.crypto

import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.Mac
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec
import org.bouncycastle.crypto.agreement.X25519Agreement
import org.bouncycastle.crypto.generators.X25519KeyPairGenerator
import org.bouncycastle.crypto.params.X25519KeyGenerationParameters
import org.bouncycastle.crypto.params.X25519PrivateKeyParameters
import org.bouncycastle.crypto.params.X25519PublicKeyParameters
import org.bouncycastle.jce.provider.BouncyCastleProvider
import java.security.Security

// Register Bouncy Castle provider
private val bcRegistered = run {
    if (Security.getProvider("BC") == null) {
        Security.addProvider(BouncyCastleProvider())
    }
    true
}

actual fun sha256(input: ByteArray): ByteArray {
    return MessageDigest.getInstance("SHA-256").digest(input)
}

actual fun hmacSha256(key: ByteArray, data: ByteArray): ByteArray {
    val mac = Mac.getInstance("HmacSHA256")
    mac.init(SecretKeySpec(key, "HmacSHA256"))
    return mac.doFinal(data)
}

actual fun keccak256(input: ByteArray): ByteArray {
    return MessageDigest.getInstance("KECCAK-256", "BC").digest(input)
}

private val rng = SecureRandom()

actual fun secureRandom(size: Int): ByteArray {
    val bytes = ByteArray(size)
    rng.nextBytes(bytes)
    return bytes
}

actual object X25519 {
    actual fun generateKeyPair(): X25519KeyPair {
        val gen = X25519KeyPairGenerator()
        gen.init(X25519KeyGenerationParameters(rng))
        val pair = gen.generateKeyPair()
        val priv = (pair.private as X25519PrivateKeyParameters).encoded
        val pub = (pair.public as X25519PublicKeyParameters).encoded
        return X25519KeyPair(privateKey = priv, publicKey = pub)
    }

    actual fun computeSharedSecret(privateKey: ByteArray, publicKey: ByteArray): ByteArray {
        val privParams = X25519PrivateKeyParameters(privateKey, 0)
        val pubParams = X25519PublicKeyParameters(publicKey, 0)
        val agreement = X25519Agreement()
        agreement.init(privParams)
        val shared = ByteArray(32)
        agreement.calculateAgreement(pubParams, shared, 0)
        return shared
    }
}

actual object Aes256Gcm {
    private const val NONCE_SIZE = 12
    private const val TAG_BITS = 128

    actual fun encrypt(plaintext: ByteArray, key: ByteArray, aad: ByteArray): ByteArray {
        require(key.size == 32) { "AES-256-GCM key must be 32 bytes" }
        val nonce = secureRandom(NONCE_SIZE)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(TAG_BITS, nonce))
        if (aad.isNotEmpty()) cipher.updateAAD(aad)
        val ciphertext = cipher.doFinal(plaintext)
        return concatBytes(nonce, ciphertext) // nonce || ciphertext+tag
    }

    actual fun decrypt(sealed: ByteArray, key: ByteArray, aad: ByteArray): ByteArray {
        require(key.size == 32) { "AES-256-GCM key must be 32 bytes" }
        require(sealed.size > NONCE_SIZE) { "Sealed data too short" }
        val nonce = sealed.copyOfRange(0, NONCE_SIZE)
        val ciphertext = sealed.copyOfRange(NONCE_SIZE, sealed.size)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(TAG_BITS, nonce))
        if (aad.isNotEmpty()) cipher.updateAAD(aad)
        return cipher.doFinal(ciphertext)
    }
}
