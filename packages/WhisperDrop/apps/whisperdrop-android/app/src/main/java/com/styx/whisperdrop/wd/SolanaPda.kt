package com.styx.whisperdrop.wd

import org.bouncycastle.math.ec.rfc8032.Ed25519

object SolanaPda {
  private val PDA_MARKER = "ProgramDerivedAddress".toByteArray(Charsets.UTF_8)

  fun isOnCurve(pubkey32: ByteArray): Boolean {
    if (pubkey32.size != 32) return false
    return Ed25519.validatePublicKeyFull(pubkey32, 0)
  }

  fun findProgramAddress(seeds: List<ByteArray>, programId32: ByteArray): Pair<ByteArray, Int> {
    require(programId32.size == 32) { "programId must be 32 bytes" }
    for (bump in 255 downTo 0) {
      val addr = createProgramAddress(seeds + listOf(byteArrayOf(bump.toByte())), programId32)
      if (!isOnCurve(addr)) return addr to bump
    }
    throw IllegalStateException("No valid PDA bump found")
  }

  fun createProgramAddress(seeds: List<ByteArray>, programId32: ByteArray): ByteArray {
    val total = seeds.sumOf { it.size } + programId32.size + PDA_MARKER.size
    val buf = ByteArray(total)
    var off = 0
    for (s in seeds) {
      require(s.size <= 32) { "seed too long" }
      System.arraycopy(s, 0, buf, off, s.size)
      off += s.size
    }
    System.arraycopy(programId32, 0, buf, off, programId32.size); off += programId32.size
    System.arraycopy(PDA_MARKER, 0, buf, off, PDA_MARKER.size)
    return Sha256.hash(buf)
  }
}
