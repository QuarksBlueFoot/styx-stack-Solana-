package nexus.styx.messaging

import nexus.styx.crypto.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/**
 * Styx Envelope — versioned binary message format.
 *
 * Wire format: [STYX magic:4][version:1][kind:1][header_len:2_LE][header:N][body:rest]
 *
 * KMP port of the TypeScript/JVM envelope implementation.
 */
object StyxEnvelope {

    val MAGIC = byteArrayOf(0x53, 0x54, 0x59, 0x58) // "STYX"
    const val VERSION: Byte = 1

    /** Envelope kinds */
    object Kind {
        const val MESSAGE: Byte = 0x01
        const val KEY_EXCHANGE: Byte = 0x02
        const val RECEIPT: Byte = 0x03
        const val FILE: Byte = 0x04
        const val TYPING: Byte = 0x05
    }

    @Serializable
    data class Envelope(
        val version: Byte = VERSION,
        val kind: Byte,
        val header: ByteArray,
        val body: ByteArray
    ) {
        override fun equals(other: Any?) = this === other
        override fun hashCode(): Int = kind.toInt() * 31 + body.contentHashCode()
    }

    /**
     * Encode an envelope into wire format.
     */
    fun encode(envelope: Envelope): ByteArray {
        val headerLen = envelope.header.size
        val result = ByteArray(4 + 1 + 1 + 2 + headerLen + envelope.body.size)
        MAGIC.copyInto(result, 0)
        result[4] = envelope.version
        result[5] = envelope.kind
        result[6] = (headerLen and 0xFF).toByte()
        result[7] = ((headerLen shr 8) and 0xFF).toByte()
        envelope.header.copyInto(result, 8)
        envelope.body.copyInto(result, 8 + headerLen)
        return result
    }

    /**
     * Decode wire-format bytes into an Envelope.
     * Returns null if the data is malformed.
     */
    fun decode(data: ByteArray): Envelope? {
        if (data.size < 8) return null
        if (data[0] != MAGIC[0] || data[1] != MAGIC[1] || data[2] != MAGIC[2] || data[3] != MAGIC[3]) return null

        val version = data[4]
        val kind = data[5]
        val headerLen = (data[6].toInt() and 0xFF) or ((data[7].toInt() and 0xFF) shl 8)

        if (data.size < 8 + headerLen) return null

        val header = data.copyOfRange(8, 8 + headerLen)
        val body = data.copyOfRange(8 + headerLen, data.size)

        return Envelope(version, kind, header, body)
    }

    /**
     * Encode a message envelope with JSON header and encrypted body.
     *
     * @param sender Sender pubkey base58
     * @param recipient Recipient pubkey base58
     * @param ephemeralKey Sender's ephemeral X25519 public key
     * @param nonce 12-byte AES-GCM nonce
     * @param ciphertext Encrypted message body
     */
    fun encodeMessage(
        sender: String,
        recipient: String,
        ephemeralKey: ByteArray,
        nonce: ByteArray,
        ciphertext: ByteArray
    ): ByteArray {
        val headerJson = Json.encodeToString(
            EnvelopeHeader(sender, recipient, ephemeralKey.toList())
        )
        return encode(Envelope(
            kind = Kind.MESSAGE,
            header = headerJson.encodeToByteArray(),
            body = concatBytes(nonce, ciphertext)
        ))
    }

    @Serializable
    private data class EnvelopeHeader(
        val sender: String,
        val recipient: String,
        val ephemeralKey: List<Byte>
    )
}
