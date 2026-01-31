package com.styx.whisperdrop.wd

import java.net.URLEncoder
import kotlin.text.Charsets.UTF_8

/**
 * Step 8: Solana Pay deep-links (wallet-driven send).
 *
 * This is the lowest-friction "in-app send" path that works across wallets without key custody.
 * It opens a compatible wallet to build/sign/send the transaction.
 */
object SolanaPay {

  /**
   * Build a Solana Pay transfer request URL.
   *
   * Format: solana:<recipient>?amount=<sol>&memo=<memo>&reference=<pubkey>
   */
  fun transferUrl(
    recipientBase58: String,
    amountSol: String,
    memo: String? = null,
    referenceBase58: String? = null,
    label: String? = "WhisperDrop",
    message: String? = null
  ): String {
    val qp = mutableListOf<String>()
    qp += "amount=${enc(amountSol)}"
    if (!memo.isNullOrBlank()) qp += "memo=${enc(memo)}"
    if (!referenceBase58.isNullOrBlank()) qp += "reference=${enc(referenceBase58)}"
    if (!label.isNullOrBlank()) qp += "label=${enc(label)}"
    if (!message.isNullOrBlank()) qp += "message=${enc(message)}"
    return "solana:$recipientBase58?${qp.joinToString("&")}"
  }

  fun randomReferenceBase58(): String {
    val b = ByteArray(32)
    java.security.SecureRandom().nextBytes(b)
    return Base58.encode(b)
  }

  private fun enc(s: String): String = URLEncoder.encode(s, UTF_8.name())
}
