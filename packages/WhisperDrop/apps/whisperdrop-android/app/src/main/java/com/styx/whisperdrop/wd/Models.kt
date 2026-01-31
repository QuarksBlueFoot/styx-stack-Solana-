package com.styx.whisperdrop.wd

import kotlinx.serialization.Serializable

@Serializable
data class LeafInput(
  val recipient: String,
  val allocation: String
)

@Serializable
data class ClaimTicket(
  val campaignId: String,
  val recipient: String,
  val allocation: String,
  val nonceHex: String,
  val merkleRootB64Url: String,
  val proof: List<String>, // sibling hashes base64url
  val mint: String = "",
  val recipientAta: String = ""
)

