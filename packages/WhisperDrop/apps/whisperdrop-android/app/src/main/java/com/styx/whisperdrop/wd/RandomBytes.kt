package com.styx.whisperdrop.wd

import java.security.SecureRandom

object RandomBytes {
  private val rng = SecureRandom()
  fun bytes(n: Int): ByteArray = ByteArray(n).also { rng.nextBytes(it) }
}
