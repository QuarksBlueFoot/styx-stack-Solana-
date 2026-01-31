package com.styx.whisperdrop.wd

import java.security.MessageDigest

object Sha256 {
  fun hash(data: ByteArray): ByteArray = MessageDigest.getInstance("SHA-256").digest(data)
  fun hashUtf8(s: String): ByteArray = hash(s.toByteArray(Charsets.UTF_8))
}
