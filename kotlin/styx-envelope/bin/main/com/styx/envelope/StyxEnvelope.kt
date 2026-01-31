package com.styx.envelope

import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Styx Envelope (SE) — clean-room, versioned binary wrapper intended for:
 * - encrypted memos
 * - on-chain messaging payloads
 * - audit/reveal bundles
 *
 * Format v1 (little-endian):
 *  - magic: 4 bytes ASCII 'STYX'
 *  - ver:   u8 (1)
 *  - kind:  u8 (application-defined)
 *  - flags: u16 (bitset)
 *  - headerLen: varint (bytes of header map)
 *  - header: headerLen bytes (CBOR/JSON/etc by convention; here treated opaque)
 *  - bodyLen: varint
 *  - body: bodyLen bytes
 *
 * Notes:
 * - This wrapper provides forward-compat via version + lengths.
 * - The crypto scheme is intentionally *outside* the envelope (pluggable).
 */

data class StyxEnvelopeV1(
    val kind: Int,
    val flags: Int = 0,
    val header: ByteArray = ByteArray(0),
    val body: ByteArray = ByteArray(0),
) {
    fun encode(): ByteArray {
        require(kind in 0..255) { "kind must be 0..255" }
        require(flags in 0..0xFFFF) { "flags must be 0..65535" }

        val headerLen = Varint.encode(header.size.toLong())
        val bodyLen = Varint.encode(body.size.toLong())

        val fixed = 4 + 1 + 1 + 2
        val total = fixed + headerLen.size + header.size + bodyLen.size + body.size

        val buf = ByteBuffer.allocate(total).order(ByteOrder.LITTLE_ENDIAN)
        buf.put(byteArrayOf('S'.code.toByte(), 'T'.code.toByte(), 'Y'.code.toByte(), 'X'.code.toByte()))
        buf.put(1) // version
        buf.put(kind.toByte())
        buf.putShort(flags.toShort())
        buf.put(headerLen)
        buf.put(header)
        buf.put(bodyLen)
        buf.put(body)
        return buf.array()
    }

    companion object {
        fun decode(bytes: ByteArray): StyxEnvelopeV1 {
            if (bytes.size < 8) throw IllegalArgumentException("SE_DECODE_TOO_SHORT")
            val buf = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)

            val m0 = buf.get(); val m1 = buf.get(); val m2 = buf.get(); val m3 = buf.get()
            if (m0 != 'S'.code.toByte() || m1 != 'T'.code.toByte() || m2 != 'Y'.code.toByte() || m3 != 'X'.code.toByte()) {
                throw IllegalArgumentException("SE_BAD_MAGIC")
            }

            val ver = buf.get().toInt() and 0xFF
            if (ver != 1) throw IllegalArgumentException("SE_UNSUPPORTED_VERSION:$ver")

            val kind = buf.get().toInt() and 0xFF
            val flags = buf.short.toInt() and 0xFFFF

            val headerLen = Varint.decode(buf)
            if (headerLen < 0 || headerLen > buf.remaining()) throw IllegalArgumentException("SE_BAD_HEADER_LEN")
            val header = ByteArray(headerLen.toInt())
            buf.get(header)

            val bodyLen = Varint.decode(buf)
            if (bodyLen < 0 || bodyLen > buf.remaining()) throw IllegalArgumentException("SE_BAD_BODY_LEN")
            val body = ByteArray(bodyLen.toInt())
            buf.get(body)

            return StyxEnvelopeV1(kind = kind, flags = flags, header = header, body = body)
        }
    }
}
