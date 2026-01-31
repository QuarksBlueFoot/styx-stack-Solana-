
package com.styx.messaging

import org.junit.Assert.*
import org.junit.Test
import java.nio.charset.StandardCharsets
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue

data class ChunkVectors(val version: Int, val format: String, val cases: List<ChunkCase>)
data class ChunkCase(
  val name: String,
  val msgId: String,
  val index: Int,
  val total: Int,
  val contentType: String,
  val chunkB64Url: String,
  val frame: String
)

class ChunkFrameVectorsTest {
  private val mapper = jacksonObjectMapper()

  @Test
  fun `decode and encode matches vectors`() {
    val json = this::class.java.classLoader.getResource("styx-chunk-v1.json")!!.readText()
    val vectors: ChunkVectors = mapper.readValue(json)
    assertEquals(1, vectors.version)

    for (c in vectors.cases) {
      val decoded = ChunkFrame.tryDecode(c.frame)
      assertNotNull(decoded)
      assertEquals(c.msgId, decoded!!.msgId)
      assertEquals(c.index, decoded.index)
      assertEquals(c.total, decoded.total)
      assertEquals(c.contentType, decoded.contentType)

      val re = ChunkFrame.encode(decoded)
      assertEquals(c.frame, re)
    }
  }
}
