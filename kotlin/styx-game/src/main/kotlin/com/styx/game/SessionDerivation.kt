package com.styx.game

import java.security.MessageDigest

object SessionDerivation {
  fun deriveSessionSeed(signature: ByteArray, context: String = "styx-game-session-v1"): ByteArray {
    val md = MessageDigest.getInstance("SHA-256")
    md.update((context + "|").toByteArray(Charsets.UTF_8))
    md.update(signature)
    val h = md.digest()
    return h.copyOfRange(0, 32)
  }

  fun deriveRoomId(participants: List<String>, salt: String = "styx-room-v1"): String {
    val norm = participants.map { it.trim() }.filter { it.isNotEmpty() }.sorted()
    val joined = salt + "|" + norm.joinToString(",")
    val md = MessageDigest.getInstance("SHA-256")
    val h = md.digest(joined.toByteArray(Charsets.UTF_8))
    return Base58.encode(h.copyOfRange(0, 16))
  }
}
