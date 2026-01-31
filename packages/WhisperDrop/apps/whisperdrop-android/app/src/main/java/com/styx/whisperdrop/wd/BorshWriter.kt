package com.styx.whisperdrop.wd

import java.io.ByteArrayOutputStream

/**
 * Minimal Borsh encoder (enough for our instruction args).
 */
class BorshWriter {
  private val out = ByteArrayOutputStream()

  fun u8(v: Int): BorshWriter { out.write(v and 0xff); return this }
  fun bytes(b: ByteArray): BorshWriter { out.write(b); return this }

  fun u64(v: Long): BorshWriter {
    // little-endian
    var x = v
    repeat(8) {
      out.write((x and 0xff).toInt())
      x = x ushr 8
    }
    return this
  }

  fun fixed16(b: ByteArray): BorshWriter {
    require(b.size == 16) { "expected 16 bytes" }
    return bytes(b)
  }

  fun vecBytes32(items: List<ByteArray>): BorshWriter {
    // u32 length LE
    val n = items.size
    u32(n)
    for (it in items) {
      require(it.size == 32) { "expected 32 bytes" }
      bytes(it)
    }
    return this
  }

  fun u32(v: Int): BorshWriter {
    var x = v
    repeat(4) {
      out.write(x and 0xff)
      x = x ushr 8
    }
    return this
  }

  fun toByteArray(): ByteArray = out.toByteArray()
}
