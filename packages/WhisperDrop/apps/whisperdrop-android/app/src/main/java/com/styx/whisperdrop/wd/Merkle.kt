package com.styx.whisperdrop.wd

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.security.SecureRandom

object Merkle {
  private val json = Json { prettyPrint = true; encodeDefaults = false; explicitNulls = false }
  private val rng = SecureRandom()

  data class BuiltCampaign(
    val rootB64Url: String,
    val ticketsJson: String
  )

  fun buildCampaign(leaves: List<LeafInput>, campaignId: String = "demo-campaign-001", mintBase58: String = ""): BuiltCampaign {
    require(leaves.isNotEmpty()) { "No leaves provided." }
    require(campaignId.isNotBlank()) { "campaignId is blank." }

    val tickets = leaves.map { li ->
      val nonce = ByteArray(16).also { rng.nextBytes(it) }
      val nonceHex = Hex.encode(nonce)
      val leafStr = leafString(campaignId, li.recipient, li.allocation, nonceHex)
      LeafRecord(li.recipient, li.allocation, nonceHex, Sha256.hashUtf8(leafStr))
    }

    val (root, proofs) = buildRootAndProofs(tickets.map { it.hash })
    val rootB64 = Base64Url.encode(root)

    val outTickets = tickets.mapIndexed { idx, rec ->
      ClaimTicket(
        campaignId = campaignId,
        recipient = rec.recipient,
        allocation = rec.allocation,
        nonceHex = rec.nonceHex,
        merkleRootB64Url = rootB64,
        proof = proofs[idx].map { Base64Url.encode(it) },
        mint = mintBase58,
        recipientAta = if (mintBase58.isNotBlank()) AssociatedToken.deriveAtaBase58(rec.recipient, mintBase58) else ""
      )
    }

    return BuiltCampaign(rootB64, json.encodeToString(outTickets))
  }

  fun verifyTicket(ticket: ClaimTicket): Boolean {
    require(ticket.campaignId.isNotBlank()) { "campaignId blank" }
    require(ticket.recipient.isNotBlank()) { "recipient blank" }
    require(ticket.allocation.isNotBlank()) { "allocation blank" }
    require(ticket.nonceHex.length == 32 && Hex.isHex(ticket.nonceHex)) { "nonceHex must be 16-byte hex (32 chars)" }
    val leafStr = leafString(ticket.campaignId, ticket.recipient, ticket.allocation, ticket.nonceHex)
    var acc = Sha256.hashUtf8(leafStr)
    for (sibB64 in ticket.proof) {
      val sib = Base64Url.decode(sibB64)
      acc = parent(acc, sib)
    }
    return Base64Url.encode(acc) == ticket.merkleRootB64Url
  }

  private data class LeafRecord(
    val recipient: String,
    val allocation: String,
    val nonceHex: String,
    val hash: ByteArray
  )

  private fun leafString(campaignId: String, recipient: String, allocation: String, nonceHex: String): String {
    // Keep this consistent with Step 3a spec
    return "wdleaf1|$campaignId|$recipient|$allocation|$nonceHex"
  }

  private fun parent(a: ByteArray, b: ByteArray): ByteArray {
    val (x, y) = if (lexLe(a, b)) a to b else b to a
    val combined = ByteArray(x.size + y.size)
    System.arraycopy(x, 0, combined, 0, x.size)
    System.arraycopy(y, 0, combined, x.size, y.size)
    return Sha256.hash(combined)
  }

  private fun lexLe(a: ByteArray, b: ByteArray): Boolean {
    val n = minOf(a.size, b.size)
    for (i in 0 until n) {
      val ai = a[i].toInt() and 0xff
      val bi = b[i].toInt() and 0xff
      if (ai != bi) return ai < bi
    }
    return a.size <= b.size
  }

  private fun buildRootAndProofs(leafHashes: List<ByteArray>): Pair<ByteArray, List<List<ByteArray>>> {
    // Build per-leaf proofs (directionless) for order-independent parent hashing.
    val proofs = MutableList(leafHashes.size) { mutableListOf<ByteArray>() }
    var level = leafHashes.map { it.copyOf() }

    // Track indices through levels
    var indexMap = leafHashes.indices.toList()

    while (level.size > 1) {
      val nextLevel = mutableListOf<ByteArray>()
      val nextIndexMap = mutableListOf<Int>()

      var i = 0
      while (i < level.size) {
        val left = level[i]
        val leftIdx = indexMap[i]
        val right: ByteArray
        val rightIdx: Int

        if (i + 1 < level.size) {
          right = level[i + 1]
          rightIdx = indexMap[i + 1]
        } else {
          // odd count: duplicate last
          right = level[i]
          rightIdx = indexMap[i]
        }

        // Add siblings to proofs
        proofs[leftIdx].add(right.copyOf())
        proofs[rightIdx].add(left.copyOf())

        nextLevel.add(parent(left, right))
        // carry forward one representative index (left)
        nextIndexMap.add(leftIdx)

        i += 2
      }

      level = nextLevel
      indexMap = nextIndexMap
    }

    return level[0] to proofs.map { it.toList() }
  }
}
