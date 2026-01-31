package com.styx.envelope

import java.util.Base64

/**
 * Base64url helpers (RFC 4648 §5).
 */
object Base64Url {
    fun encode(bytes: ByteArray): String {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }

    fun decode(s: String): ByteArray {
        // Add padding if missing
        val padded = when (s.length % 4) {
            0 -> s
            2 -> s + "=="
            3 -> s + "="
            else -> throw IllegalArgumentException("B64URL_BAD_LEN")
        }
        return Base64.getUrlDecoder().decode(padded)
    }
}
