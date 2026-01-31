package com.styx.mobile

/**
 * A minimal receipt model for UI.
 * Local-only; do not serialize decrypted payloads into logs.
 */
data class StyxReceipt(
  val id: String,
  val createdAt: Long,
  val state: State,
  val signature: String? = null,
  val confirmedAt: Long? = null,
  val confirmedSlot: Long? = null,
  val lastError: String? = null
) {
  enum class State { PENDING, SENT, CONFIRMED, FAILED }
}
