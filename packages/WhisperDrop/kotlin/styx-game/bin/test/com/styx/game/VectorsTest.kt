package com.styx.game

import kotlin.test.Test
import kotlin.test.assertEquals
import com.fasterxml.jackson.databind.ObjectMapper
import java.io.File

class VectorsTest {
  private val mapper = ObjectMapper()

  @Test fun vectors() {
    val root = File("vectors/styx-game-v1.json")
    val file = if (root.exists()) root else File("../../vectors/styx-game-v1.json")
    val json = mapper.readTree(file)
    val cases = json.get("cases")
    for (c in cases) {
      when (c.get("name").asText()) {
        "session-seed-basic" -> {
          val sigHex = c.get("signature_hex").asText()
          val sig = sigHex.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
          val seed = SessionDerivation.deriveSessionSeed(sig, c.get("context").asText())
          val seedHex = seed.joinToString("") { "%02x".format(it) }
          assertEquals(c.get("seed_hex").asText(), seedHex)
        }
        "room-id-basic" -> {
          val parts = c.get("participants").map { it.asText() }
          val rid = SessionDerivation.deriveRoomId(parts, c.get("salt").asText())
          assertEquals(c.get("room_id").asText(), rid)
        }
      }
    }
  }
}
