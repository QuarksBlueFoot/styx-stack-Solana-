package com.styx.envelope

import java.nio.ByteBuffer

/**
 * Unsigned LEB128 varint.
 * Clean-room implementation.
 */
object Varint {
    fun encode(value: Long): ByteArray {
        require(value >= 0) { "varint must be >= 0" }
        var v = value
        val out = ArrayList<Byte>(10)
        do {
            var b = (v and 0x7F).toInt()
            v = v ushr 7
            if (v != 0L) b = b or 0x80
            out.add(b.toByte())
        } while (v != 0L)
        return out.toByteArray()
    }

    fun decode(buf: ByteBuffer): Long {
        var shift = 0
        var result = 0L
        while (true) {
            if (!buf.hasRemaining()) throw IllegalArgumentException("VARINT_EOF")
            val b = buf.get().toInt() and 0xFF
            result = result or ((b and 0x7F).toLong() shl shift)
            if ((b and 0x80) == 0) return result
            shift += 7
            if (shift > 63) throw IllegalArgumentException("VARINT_OVERFLOW")
        }
    }
}
