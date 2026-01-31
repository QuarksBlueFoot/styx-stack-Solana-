package com.styx.whisperdrop.wd

import org.bouncycastle.crypto.digests.SHA256Digest
import org.bouncycastle.crypto.generators.HKDFBytesGenerator
import org.bouncycastle.crypto.params.HKDFParameters
import org.bouncycastle.jce.provider.BouncyCastleProvider
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.PrivateKey
import java.security.PublicKey
import java.security.Security
import javax.crypto.Cipher
import javax.crypto.KeyAgreement
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

object Crypto {
  private const val BC = "BC"
  private const val AES_KEY_BYTES = 32
  private const val GCM_NONCE_BYTES = 12
  private const val GCM_TAG_BITS = 128

  fun ensureProvider() {
    if (Security.getProvider(BC) == null) {
      Security.addProvider(BouncyCastleProvider())
    }
  }

  fun x25519Keypair(): KeyPair {
    ensureProvider()
    val kpg = KeyPairGenerator.getInstance("X25519", BC)
    return kpg.generateKeyPair()
  }

  fun publicKeyRaw(pub: PublicKey): ByteArray = pub.encoded
  fun privateKeyRaw(priv: PrivateKey): ByteArray = priv.encoded

  fun sharedSecret(myPriv: PrivateKey, theirPub: PublicKey): ByteArray {
    ensureProvider()
    val ka = KeyAgreement.getInstance("X25519", BC)
    ka.init(myPriv)
    ka.doPhase(theirPub, true)
    return ka.generateSecret()
  }

  fun hkdfSha256(ikm: ByteArray, salt: ByteArray, info: ByteArray, outLen: Int): ByteArray {
    val gen = HKDFBytesGenerator(SHA256Digest())
    gen.init(HKDFParameters(ikm, salt, info))
    return ByteArray(outLen).also { gen.generateBytes(it, 0, outLen) }
  }

  data class AeadResult(val nonce: ByteArray, val ciphertext: ByteArray)

  fun aesGcmEncrypt(key: ByteArray, plaintext: ByteArray, aad: ByteArray? = null): AeadResult {
    require(key.size == AES_KEY_BYTES) { "AES key must be 32 bytes" }
    val nonce = RandomBytes.bytes(GCM_NONCE_BYTES)
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    val spec = GCMParameterSpec(GCM_TAG_BITS, nonce)
    cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "AES"), spec)
    if (aad != null) cipher.updateAAD(aad)
    val ct = cipher.doFinal(plaintext)
    return AeadResult(nonce, ct)
  }

  fun aesGcmDecrypt(key: ByteArray, nonce: ByteArray, ciphertext: ByteArray, aad: ByteArray? = null): ByteArray {
    require(key.size == AES_KEY_BYTES) { "AES key must be 32 bytes" }
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    val spec = GCMParameterSpec(GCM_TAG_BITS, nonce)
    cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(key, "AES"), spec)
    if (aad != null) cipher.updateAAD(aad)
    return cipher.doFinal(ciphertext)
  }
}
