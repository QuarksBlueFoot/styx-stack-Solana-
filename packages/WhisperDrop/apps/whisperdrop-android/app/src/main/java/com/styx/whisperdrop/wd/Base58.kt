package com.styx.whisperdrop.wd

object Base58 {
  private const val ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
  private val INDEXES = IntArray(128) { -1 }.also { arr ->
    for (i in ALPHABET.indices) arr[ALPHABET[i].code] = i
  }

  fun decode(input: String): ByteArray {
    require(input.isNotBlank()) { "base58 empty" }
    val digits = input.map { c ->
      val idx = if (c.code < 128) INDEXES[c.code] else -1
      require(idx >= 0) { "Invalid base58 char: $c" }
      idx
    }.toIntArray()

    var zeros = 0
    while (zeros < digits.size && digits[zeros] == 0) zeros++

    val decoded = ByteArray(input.length)
    var outLen = 0
    var startAt = zeros
    while (startAt < digits.size) {
      var carry = 0
      for (i in startAt until digits.size) {
        val v = digits[i]
        val x = carry * 58 + v
        digits[i] = x / 256
        carry = x % 256
      }
      decoded[outLen++] = carry.toByte()
      while (startAt < digits.size && digits[startAt] == 0) startAt++
    }

    val result = ByteArray(zeros + outLen)
    for (i in 0 until zeros) result[i] = 0
    for (i in 0 until outLen) result[zeros + i] = decoded[outLen - 1 - i]
    return result
  }

  fun encode(input: ByteArray): String {
    if (input.isEmpty()) return ""
    var zeros = 0
    while (zeros < input.size && input[zeros].toInt() == 0) zeros++
    val temp = input.copyOf()
    val encoded = CharArray(input.size * 2)
    var outLen = 0
    var startAt = zeros
    while (startAt < temp.size) {
      var carry = 0
      for (i in startAt until temp.size) {
        val v = temp[i].toInt() and 0xff
        val x = carry * 256 + v
        temp[i] = (x / 58).toByte()
        carry = x % 58
      }
      encoded[outLen++] = ALPHABET[carry]
      while (startAt < temp.size && temp[startAt].toInt() == 0) startAt++
    }
    val sb = StringBuilder()
    repeat(zeros) { sb.append('1') }
    for (i in outLen - 1 downTo 0) sb.append(encoded[i])
    return sb.toString()
  }
}
