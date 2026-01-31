package com.styx.whisperdrop.wd

import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/**
 * Step 5A: Lite Claim (no on-chain program).
 *
 * Output is a "claim packet" that can be submitted by ANY wallet:
 * - send a tiny SOL transfer to the campaign's claim sink (or treasury)
 * - include `memo` exactly
 *
 * Double-claim prevention is best-effort by checking for the same `nullifier`
 * appearing on-chain (campaign-defined).
 */
object LiteClaim {
  private val json = Json { prettyPrint = true; encodeDefaults = true; explicitNulls = false }

  @Serializable
  data class ClaimPacket(
    val v: Int = 1,
    val method: String = "lite",
    val campaignId: String,
    val recipientPubkeyHint: String,
    val memo: String,
    val nullifierB64Url: String,
    val recommendation: Recommendation
  )

  @Serializable
  data class Recommendation(
    val suggestedLamports: Long = 5000L,
    val note: String = "Send a tiny SOL transfer with this memo to anchor the claim."
  )

  /**
   * Compute a stable nullifier for a ticket:
   * nullifier = sha256("wdnull1|campaignId|leafHashB64Url|nonceHex")
   */
  fun nullifier(ticket: ClaimTicket): String {
    val leafStr = "wdleaf1|${ticket.campaignId}|${ticket.recipient}|${ticket.allocation}|${ticket.nonceHex}"
    val leafHash = Base64Url.encode(Sha256.hashUtf8(leafStr))
    val preimage = "wdnull1|${ticket.campaignId}|$leafHash|${ticket.nonceHex}"
    return Base64Url.encode(Sha256.hashUtf8(preimage))
  }

  /**
   * Memo format for lite claims:
   * whisperdrop:claim:lite:v1:<campaignId>:<nullifierB64Url>
   */
  fun memo(campaignId: String, nullifierB64Url: String): String =
    "whisperdrop:claim:lite:v1:$campaignId:$nullifierB64Url"

  fun buildClaimPacket(ticket: ClaimTicket, recipientPubkeyHint: String = ticket.recipient): String {
    val n = nullifier(ticket)
    val m = memo(ticket.campaignId, n)
    val pkt = ClaimPacket(
      campaignId = ticket.campaignId,
      recipientPubkeyHint = recipientPubkeyHint,
      memo = m,
      nullifierB64Url = n,
      recommendation = Recommendation()
    )
    return json.encodeToString(pkt)
  }
}
