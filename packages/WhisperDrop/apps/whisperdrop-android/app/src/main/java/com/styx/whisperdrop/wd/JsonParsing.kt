package com.styx.whisperdrop.wd

import kotlinx.serialization.KSerializer
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json

object JsonParsing {
  private val json = Json { ignoreUnknownKeys = true }
  val leafListSerializer: KSerializer<List<LeafInput>> = ListSerializer(LeafInput.serializer())
  fun parseLeaves(rawJson: String): List<LeafInput> = json.decodeFromString(leafListSerializer, rawJson)
}
