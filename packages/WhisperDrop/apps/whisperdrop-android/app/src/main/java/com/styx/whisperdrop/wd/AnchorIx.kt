package com.styx.whisperdrop.wd

/**
 * Anchor instruction discriminator: first 8 bytes of sha256("global:<name>")
 */
object AnchorIx {
  fun discriminator(name: String): ByteArray {
    val preimage = "global:$name"
    val h = Sha256.hashUtf8(preimage)
    return h.copyOfRange(0, 8)
  }
}
