package com.styx.envelope

import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Styx Envelope v1 (Kotlin/JVM)
 *
 * Canonical binary format must match @styx/memo encodeStyxEnvelope.
 */
object StyxEnvelopeV1 {
    private val MAGIC = byteArrayOf(0x53, 0x54, 0x59, 0x58) // "STYX"
    private const val V: Byte = 1

    enum class Kind(val code: Int) { MESSAGE(1), REVEAL(2), KEYBUNDLE(3);
        companion object { fun from(code: Int): Kind = entries.firstOrNull { it.code == code }
            ?: throw IllegalArgumentException("unknown kind: $code") }
    }

    enum class Algo(val code: Int) { PMF1(1);
        companion object { fun from(code: Int): Algo = entries.firstOrNull { it.code == code }
            ?: throw IllegalArgumentException("unknown algo: $code") }
    }

    data class Envelope(
        val kind: Kind,
        val algo: Algo,
        val id: ByteArray,
        val body: ByteArray,
        val toHash: ByteArray? = null,
        val from: ByteArray? = null,
        val nonce: ByteArray? = null,
        val aad: ByteArray? = null,
        val sig: ByteArray? = null,
    ) {
        init {
            require(id.size == 32) { "id must be 32 bytes" }
            require(toHash == null || toHash.size == 32) { "toHash must be 32 bytes" }
            require(from == null || from.size == 32) { "from must be 32 bytes" }
        }
    }

    // flags bitset
    private const val F_TOHASH = 1 shl 0
    private const val F_FROM   = 1 shl 1
    private const val F_NONCE  = 1 shl 2
    private const val F_AAD    = 1 shl 3
    private const val F_SIG    = 1 shl 4

    fun encode(env: Envelope): ByteArray {
        var flags = 0
        if (env.toHash != null) flags = flags or F_TOHASH
        if (env.from != null) flags = flags or F_FROM
        if (env.nonce != null) flags = flags or F_NONCE
        if (env.aad != null) flags = flags or F_AAD
        if (env.sig != null) flags = flags or F_SIG

        val header = ByteArray(4 + 1 + 1 + 2 + 1 + 32)
        var o = 0
        MAGIC.copyInto(header, o); o += 4
        header[o++] = V
        header[o++] = env.kind.code.toByte()
        // u16le flags
        header[o++] = (flags and 0xff).toByte()
        header[o++] = ((flags ushr 8) and 0xff).toByte()
        header[o++] = env.algo.code.toByte()
        env.id.copyInto(header, o); o += 32

        val out = ArrayList<ByteArray>()
        out.add(header)
        env.toHash?.let { out.add(it) }
        env.from?.let { out.add(it) }
        env.nonce?.let { out.add(varBytesEncode(it)) }
        out.add(varBytesEncode(env.body))
        env.aad?.let { out.add(varBytesEncode(it)) }
        env.sig?.let { out.add(varBytesEncode(it)) }

        return concat(*out.toTypedArray())
    }

    fun decode(bytes: ByteArray): Envelope {
        val min = 4 + 1 + 1 + 2 + 1 + 32
        require(bytes.size >= min) { "too short" }
        for (i in 0 until 4) require(bytes[i] == MAGIC[i]) { "bad magic" }
        val v = bytes[4]
        require(v == V) { "unsupported version: $v" }
        val kind = Kind.from(bytes[5].toInt() and 0xff)
        val flags = (bytes[6].toInt() and 0xff) or ((bytes[7].toInt() and 0xff) shl 8)
        val algo = Algo.from(bytes[8].toInt() and 0xff)
        var o = 9
        val id = bytes.copyOfRange(o, o + 32); o += 32

        var toHash: ByteArray? = null
        var from: ByteArray? = null
        var nonce: ByteArray? = null
        var aad: ByteArray? = null
        var sig: ByteArray? = null

        if ((flags and F_TOHASH) != 0) { toHash = bytes.copyOfRange(o, o + 32); o += 32 }
        if ((flags and F_FROM) != 0) { from = bytes.copyOfRange(o, o + 32); o += 32 }
        if ((flags and F_NONCE) != 0) {
            val (vbytes, read) = varBytesDecode(bytes, o)
            nonce = vbytes; o += read
        }
        val (body, bodyRead) = varBytesDecode(bytes, o)
        o += bodyRead
        if ((flags and F_AAD) != 0) {
            val (vbytes, read) = varBytesDecode(bytes, o)
            aad = vbytes; o += read
        }
        if ((flags and F_SIG) != 0) {
            val (vbytes, read) = varBytesDecode(bytes, o)
            sig = vbytes; o += read
        }
        require(o == bytes.size) { "trailing bytes" }

        return Envelope(kind = kind, algo = algo, id = id, body = body, toHash = toHash, from = from, nonce = nonce, aad = aad, sig = sig)
    }

    private fun concat(vararg parts: ByteArray): ByteArray {
        val total = parts.sumOf { it.size }
        val out = ByteArray(total)
        var o = 0
        for (p in parts) {
            p.copyInto(out, o)
            o += p.size
        }
        return out
    }

    // Varint length prefix (unsigned LEB128) + bytes
    private fun varBytesEncode(value: ByteArray): ByteArray {
        val lenPrefix = uleb128Encode(value.size)
        return concat(lenPrefix, value)
    }

    private fun varBytesDecode(buf: ByteArray, offset: Int): Pair<ByteArray, Int> {
        val (len, readLen) = uleb128Decode(buf, offset)
        val start = offset + readLen
        val end = start + len
        require(end <= buf.size) { "varBytes out of range" }
        return Pair(buf.copyOfRange(start, end), readLen + len)
    }

    private fun uleb128Encode(n: Int): ByteArray {
        var v = n
        val out = ArrayList<Byte>()
        while (true) {
            val b = (v and 0x7f)
            v = v ushr 7
            if (v != 0) {
                out.add((b or 0x80).toByte())
            } else {
                out.add(b.toByte())
                break
            }
        }
        return out.toByteArray()
    }

    private fun uleb128Decode(buf: ByteArray, offset: Int): Pair<Int, Int> {
        var result = 0
        var shift = 0
        var o = offset
        while (true) {
            require(o < buf.size) { "varint overflow" }
            val b = buf[o++].toInt() and 0xff
            result = result or ((b and 0x7f) shl shift)
            if ((b and 0x80) == 0) break
            shift += 7
            require(shift <= 28) { "varint too large" }
        }
        return Pair(result, o - offset)
    }
}

object Base64Url {
    fun encode(bytes: ByteArray): String {
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }

    fun decode(s: String): ByteArray {
        return java.util.Base64.getUrlDecoder().decode(s)
    }
}
