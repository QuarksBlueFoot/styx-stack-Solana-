package com.styx.whisperdrop.wd

import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/**
 * Step 5B: Escrow Claim (on-chain program path).
 *
 * In Step 5, we ship the full on-chain program under `programs/whisperdrop-escrow/`.
 * Here we output a deterministic "instruction plan" that the wallet/integration can
 * translate into an actual transaction.
 */
object EscrowClaim {
  private val json = Json { prettyPrint = true; encodeDefaults = true; explicitNulls = false }

  @Serializable
  data class EscrowClaimPlan(
    val v: Int = 1,
    val method: String = "escrow",
    val program: ProgramRef,
    val campaignId: String,
    val merkleRootB64Url: String,
    val recipient: String,
    val mint: String,
    val recipientAta: String,
    val allocation: String,
    val nonceHex: String,
    val proof: List<String>,
    val nullifierB64Url: String
  )

  @Serializable
  data class ProgramRef(
    val name: String = "whisperdrop-escrow",
    val note: String = "Deploy and set PROGRAM_ID in your app config to build a signed transaction."
  )

  fun nullifier(ticket: ClaimTicket): String = LiteClaim.nullifier(ticket)

  fun buildPlan(ticket: ClaimTicket): String {
    val plan = EscrowClaimPlan(
      campaignId = ticket.campaignId,
      merkleRootB64Url = ticket.merkleRootB64Url,
      recipient = ticket.recipient,
      mint = ticket.mint,
      recipientAta = ticket.recipientAta,
      allocation = ticket.allocation,
      nonceHex = ticket.nonceHex,
      proof = ticket.proof,
      nullifierB64Url = nullifier(ticket)
    )
    return json.encodeToString(plan)
  }
}
