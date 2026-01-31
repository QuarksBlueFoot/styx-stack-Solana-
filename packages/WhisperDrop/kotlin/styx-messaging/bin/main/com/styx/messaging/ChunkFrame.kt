
package com.styx.messaging

import java.util.Base64

data class StyxChunkFrame(
  val msgId: String,
  val index: Int,
  val total: Int,
  val contentType: String,
  val chunkBytes: ByteArray
)

object ChunkFrame {
  private const val PREFIX = "STYXCHUNK1"

  fun encode(frame: StyxChunkFrame): String {
    val chunkB64Url = b64UrlEncode(frame.chunkBytes)
    return listOf(PREFIX, frame.msgId, frame.index.toString(), frame.total.toString(), frame.contentType, chunkB64Url).joinToString("|")
  }

  fun tryDecode(plaintext: String): StyxChunkFrame? {
    if (!plaintext.startsWith("$PREFIX|")) return null
    val parts = plaintext.split("|")
    if (parts.size < 6) return null
    val msgId = parts[1]
    val index = parts[2].toIntOrNull() ?: return null
    val total = parts[3].toIntOrNull() ?: return null
    val contentType = parts[4]
    val chunkB64Url = parts[5]
    if (index < 0 || total <= 0 || index >= total) return null
    return try {
      val chunk = b64UrlDecode(chunkB64Url)
      StyxChunkFrame(msgId, index, total, contentType, chunk)
    } catch (e: Exception) {
      null
    }
  }

  private fun b64UrlEncode(bytes: ByteArray): String {
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
  }

  private fun b64UrlDecode(s: String): ByteArray {
    return Base64.getUrlDecoder().decode(s)
  }
}
