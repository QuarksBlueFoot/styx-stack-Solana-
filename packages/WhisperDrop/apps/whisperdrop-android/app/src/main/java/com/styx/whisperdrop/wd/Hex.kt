package com.styx.whisperdrop.wd

object Hex {
  private val HEX = "0123456789abcdef".toCharArray()

  fun encode(bytes: ByteArray): String {
    val out = CharArray(bytes.size * 2)
    var j = 0
    for (b in bytes) {
      val v = b.toInt() and 0xff
      out[j++] = HEX[v ushr 4]
      out[j++] = HEX[v and 0x0f]
    }
    return String(out)
  }

  fun isHex(s: String): Boolean = s.all { it.lowercaseChar() in '0'..'9' || it.lowercaseChar() in 'a'..'f' }

  fun decode(hex: String): ByteArray {
    val s = hex.lowercase()
    require(s.length % 2 == 0) { "hex length must be even" }
    val out = ByteArray(s.length / 2)
    var j = 0
    var i = 0
    while (i < s.length) {
      val hi = s[i].digitToInt(16)
      val lo = s[i + 1].digitToInt(16)
      out[j++] = ((hi shl 4) or lo).toByte()
      i += 2
    }
    return out
  }
}
