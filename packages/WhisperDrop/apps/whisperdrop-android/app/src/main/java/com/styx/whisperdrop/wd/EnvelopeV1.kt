package com.styx.whisperdrop.wd

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.security.KeyFactory
import java.security.PrivateKey
import java.security.PublicKey
import java.security.spec.X509EncodedKeySpec
import java.security.spec.PKCS8EncodedKeySpec

@Serializable
data class EnvelopeV1(
  val v: Int = 1,
  val alg: String = "x25519-hkdf-sha256-aesgcm",
  @SerialName("senderPubB64Url") val senderPubB64Url: String,
  @SerialName("saltB64Url") val saltB64Url: String,
  @SerialName("nonceB64Url") val nonceB64Url: String,
  @SerialName("ciphertextB64Url") val ciphertextB64Url: String
)

object EnvelopeCodec {
  private val json = Json { prettyPrint = false; encodeDefaults = true; explicitNulls = false }

  private fun keyFactory(): KeyFactory {
    Crypto.ensureProvider()
    return KeyFactory.getInstance("X25519", "BC")
  }

  fun decodePublicKey(b64Url: String): PublicKey {
    val bytes = Base64Url.decode(b64Url)
    return keyFactory().generatePublic(X509EncodedKeySpec(bytes))
  }

  fun decodePrivateKey(b64Url: String): PrivateKey {
    val bytes = Base64Url.decode(b64Url)
    return keyFactory().generatePrivate(PKCS8EncodedKeySpec(bytes))
  }

  fun encodePublicKey(pub: PublicKey): String = Base64Url.encode(Crypto.publicKeyRaw(pub))
  fun encodePrivateKey(priv: PrivateKey): String = Base64Url.encode(Crypto.privateKeyRaw(priv))

  fun encryptTicketJson(ticketJson: String, recipientPubB64Url: String): String {
    val recipientPub = decodePublicKey(recipientPubB64Url)
    val senderKp = Crypto.x25519Keypair()
    val shared = Crypto.sharedSecret(senderKp.private, recipientPub)

    val salt = RandomBytes.bytes(32)
    val info = "whisperdrop-envelope-v1".toByteArray(Charsets.UTF_8)
    val key = Crypto.hkdfSha256(shared, salt, info, 32)

    val aad = recipientPubB64Url.toByteArray(Charsets.UTF_8)
    val enc = Crypto.aesGcmEncrypt(key, ticketJson.toByteArray(Charsets.UTF_8), aad)

    val env = EnvelopeV1(
      senderPubB64Url = encodePublicKey(senderKp.public),
      saltB64Url = Base64Url.encode(salt),
      nonceB64Url = Base64Url.encode(enc.nonce),
      ciphertextB64Url = Base64Url.encode(enc.ciphertext)
    )
    return json.encodeToString(env)
  }

  fun decryptEnvelopeToTicketJson(envelopeJson: String, recipientPrivB64Url: String, recipientPubB64Url: String): String {
    val env = json.decodeFromString(EnvelopeV1.serializer(), envelopeJson)
    require(env.v == 1) { "Unsupported envelope version: ${env.v}" }
    require(env.alg == "x25519-hkdf-sha256-aesgcm") { "Unsupported alg: ${env.alg}" }

    val senderPub = decodePublicKey(env.senderPubB64Url)
    val recipientPriv = decodePrivateKey(recipientPrivB64Url)

    val shared = Crypto.sharedSecret(recipientPriv, senderPub)
    val salt = Base64Url.decode(env.saltB64Url)
    val info = "whisperdrop-envelope-v1".toByteArray(Charsets.UTF_8)
    val key = Crypto.hkdfSha256(shared, salt, info, 32)

    val nonce = Base64Url.decode(env.nonceB64Url)
    val ct = Base64Url.decode(env.ciphertextB64Url)

    val aad = recipientPubB64Url.toByteArray(Charsets.UTF_8)
    val pt = Crypto.aesGcmDecrypt(key, nonce, ct, aad)
    return pt.toString(Charsets.UTF_8)
  }
}
