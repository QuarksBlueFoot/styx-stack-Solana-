package com.styx.whisperdrop.wd

import kotlinx.serialization.json.*

object CanonicalJson {
  private val json = Json { prettyPrint = false; encodeDefaults = false; explicitNulls = false }

  fun canonicalize(input: String): String {
    val el = json.parseToJsonElement(input)
    val canon = canonicalizeElement(el)
    return json.encodeToString(JsonElement.serializer(), canon)
  }

  private fun canonicalizeElement(el: JsonElement): JsonElement = when (el) {
    is JsonObject -> {
      val sorted = el.entries.sortedBy { it.key }.associate { (k, v) -> k to canonicalizeElement(v) }
      JsonObject(sorted)
    }
    is JsonArray -> JsonArray(el.map { canonicalizeElement(it) })
    else -> el
  }
}
