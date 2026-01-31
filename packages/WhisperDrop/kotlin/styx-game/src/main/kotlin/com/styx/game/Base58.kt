package com.styx.game

object Base58 {
  private const val ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

  fun encode(input: ByteArray): String {
    if (input.isEmpty()) return ""
    var zeros = 0
    while (zeros < input.size && input[zeros].toInt() == 0) zeros++

    val copy = input.copyOf()
    val encoded = CharArray(copy.size * 2)
    var outStart = encoded.size

    var startAt = zeros
    while (startAt < copy.size) {
      var mod = 0
      for (i in startAt until copy.size) {
        val num = copy[i].toInt() and 0xFF
        val temp = mod * 256 + num
        copy[i] = (temp / 58).toByte()
        mod = temp % 58
      }
      encoded[--outStart] = ALPHABET[mod]
      while (startAt < copy.size && copy[startAt].toInt() == 0) startAt++
    }
    while (outStart < encoded.size && encoded[outStart] == ALPHABET[0]) outStart++
    while (zeros-- > 0) encoded[--outStart] = ALPHABET[0]
    return String(encoded, outStart, encoded.size - outStart)
  }
}
