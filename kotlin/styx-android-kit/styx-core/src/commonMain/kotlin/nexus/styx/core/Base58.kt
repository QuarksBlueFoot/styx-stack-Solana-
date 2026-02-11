package nexus.styx.core

/**
 * Base58 encoding/decoding (Bitcoin alphabet).
 * Clean-room implementation for Solana address encoding.
 */
object Base58 {
    private const val ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    private val INDEXES = IntArray(128) { -1 }.also { arr ->
        ALPHABET.forEachIndexed { i, c -> arr[c.code] = i }
    }

    fun encode(input: ByteArray): String {
        if (input.isEmpty()) return ""

        // Count leading zeros
        var zeros = 0
        while (zeros < input.size && input[zeros] == 0.toByte()) zeros++

        // Convert to base58
        val encoded = CharArray(input.size * 2)
        var outputStart = encoded.size
        var inputStart = zeros

        while (inputStart < input.size) {
            outputStart--
            encoded[outputStart] = ALPHABET[divmod(input, inputStart, 256, 58)]
            if (input[inputStart] == 0.toByte()) inputStart++
        }

        // Preserve leading zeros as '1'
        while (outputStart < encoded.size && encoded[outputStart] == '1') outputStart++
        repeat(zeros) { outputStart--; encoded[outputStart] = '1' }

        return String(encoded, outputStart, encoded.size - outputStart)
    }

    fun decode(input: String): ByteArray {
        if (input.isEmpty()) return ByteArray(0)

        val input58 = ByteArray(input.length)
        for (i in input.indices) {
            val c = input[i]
            val digit = if (c.code < 128) INDEXES[c.code] else -1
            require(digit >= 0) { "Invalid Base58 character: $c" }
            input58[i] = digit.toByte()
        }

        // Count leading zeros (encoded as '1')
        var zeros = 0
        while (zeros < input58.size && input58[zeros] == 0.toByte()) zeros++

        // Convert from base58
        val decoded = ByteArray(input.length)
        var outputStart = decoded.size
        var inputStart = zeros

        while (inputStart < input58.size) {
            outputStart--
            decoded[outputStart] = divmod(input58, inputStart, 58, 256).toByte()
            if (input58[inputStart] == 0.toByte()) inputStart++
        }

        // Remove extra leading zeros from output
        while (outputStart < decoded.size && decoded[outputStart] == 0.toByte()) outputStart++

        return ByteArray(zeros + decoded.size - outputStart).also { result ->
            // result[0..zeros-1] are already 0
            System.arraycopy(decoded, outputStart, result, zeros, decoded.size - outputStart)
        }
    }

    private fun divmod(number: ByteArray, firstDigit: Int, base: Int, divisor: Int): Int {
        var remainder = 0
        for (i in firstDigit until number.size) {
            val digit = number[i].toInt() and 0xFF
            val temp = remainder * base + digit
            number[i] = (temp / divisor).toByte()
            remainder = temp % divisor
        }
        return remainder
    }
}
