package nexus.styx.messaging

import kotlinx.serialization.Serializable

/**
 * Styx chunk-frame encoding for large messages.
 *
 * Wire format: STYXCHUNK1|{msgId}|{index}|{total}|{contentType}|{chunkB64url}
 *
 * KMP-compatible port of the TypeScript chunking + existing JVM ChunkFrame.
 */
@Serializable
data class StyxChunkFrame(
    val msgId: String,
    val index: Int,
    val total: Int,
    val contentType: String,
    val chunkBytes: ByteArray
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is StyxChunkFrame) return false
        return msgId == other.msgId && index == other.index && total == other.total &&
            contentType == other.contentType && chunkBytes.contentEquals(other.chunkBytes)
    }

    override fun hashCode(): Int = msgId.hashCode() * 31 + index
}

object ChunkFrame {
    private const val PREFIX = "STYXCHUNK1"

    fun encode(frame: StyxChunkFrame): String {
        val chunkB64 = base64UrlEncode(frame.chunkBytes)
        return listOf(PREFIX, frame.msgId, frame.index.toString(), frame.total.toString(), frame.contentType, chunkB64)
            .joinToString("|")
    }

    fun tryDecode(plaintext: String): StyxChunkFrame? {
        if (!plaintext.startsWith("$PREFIX|")) return null
        val parts = plaintext.split("|")
        if (parts.size < 6) return null
        val msgId = parts[1]
        val index = parts[2].toIntOrNull() ?: return null
        val total = parts[3].toIntOrNull() ?: return null
        val contentType = parts[4]
        val chunkB64 = parts[5]
        if (index < 0 || total <= 0 || index >= total) return null
        return try {
            StyxChunkFrame(msgId, index, total, contentType, base64UrlDecode(chunkB64))
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Reassemble a set of chunk frames into the original payload.
     * Returns null if any chunk is missing.
     */
    fun reassemble(chunks: List<StyxChunkFrame>): ByteArray? {
        if (chunks.isEmpty()) return null
        val total = chunks.first().total
        if (chunks.size != total) return null

        val sorted = chunks.sortedBy { it.index }
        for (i in sorted.indices) {
            if (sorted[i].index != i) return null
        }

        val totalSize = sorted.sumOf { it.chunkBytes.size }
        val result = ByteArray(totalSize)
        var offset = 0
        for (chunk in sorted) {
            chunk.chunkBytes.copyInto(result, offset)
            offset += chunk.chunkBytes.size
        }
        return result
    }

    /**
     * Split a payload into chunk frames.
     */
    fun split(
        msgId: String,
        payload: ByteArray,
        contentType: String = "text/plain",
        chunkSize: Int = 600
    ): List<StyxChunkFrame> {
        require(chunkSize > 0) { "chunkSize must be > 0" }
        val total = (payload.size + chunkSize - 1) / chunkSize
        return (0 until total).map { i ->
            val start = i * chunkSize
            val end = minOf(start + chunkSize, payload.size)
            StyxChunkFrame(msgId, i, total, contentType, payload.copyOfRange(start, end))
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BASE64URL (no-padding, no java.util dependency)
// ═══════════════════════════════════════════════════════════════════════════════

private val B64URL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

internal fun base64UrlEncode(data: ByteArray): String {
    val sb = StringBuilder()
    var i = 0
    while (i < data.size) {
        val b0 = data[i].toInt() and 0xFF
        val b1 = if (i + 1 < data.size) data[i + 1].toInt() and 0xFF else 0
        val b2 = if (i + 2 < data.size) data[i + 2].toInt() and 0xFF else 0
        sb.append(B64URL_CHARS[(b0 shr 2) and 0x3F])
        sb.append(B64URL_CHARS[((b0 shl 4) or (b1 shr 4)) and 0x3F])
        if (i + 1 < data.size) sb.append(B64URL_CHARS[((b1 shl 2) or (b2 shr 6)) and 0x3F])
        if (i + 2 < data.size) sb.append(B64URL_CHARS[b2 and 0x3F])
        i += 3
    }
    return sb.toString()
}

private val B64URL_DECODE = IntArray(128) { -1 }.also { arr ->
    B64URL_CHARS.forEachIndexed { idx, c -> arr[c.code] = idx }
}

internal fun base64UrlDecode(s: String): ByteArray {
    val len = s.length
    val outLen = len * 3 / 4
    val result = ByteArray(outLen)
    var out = 0
    var i = 0
    while (i < len) {
        val a = B64URL_DECODE[s[i].code]
        val b = if (i + 1 < len) B64URL_DECODE[s[i + 1].code] else 0
        val c = if (i + 2 < len) B64URL_DECODE[s[i + 2].code] else 0
        val d = if (i + 3 < len) B64URL_DECODE[s[i + 3].code] else 0
        if (out < result.size) result[out++] = ((a shl 2) or (b shr 4)).toByte()
        if (out < result.size && i + 2 < len) result[out++] = (((b shl 4) or (c shr 2)) and 0xFF).toByte()
        if (out < result.size && i + 3 < len) result[out++] = (((c shl 6) or d) and 0xFF).toByte()
        i += 4
    }
    return result.copyOf(out)
}
