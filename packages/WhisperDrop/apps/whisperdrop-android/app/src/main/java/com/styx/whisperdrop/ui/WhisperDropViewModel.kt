package com.styx.whisperdrop.ui

import androidx.lifecycle.ViewModel
import com.styx.whisperdrop.wd.*
import com.styx.whisperdrop.wd.EnvelopeCodec
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.serialization.json.Json
import com.styx.whisperdrop.wd.JsonParsing

class WhisperDropViewModel : ViewModel() {
  private val _currentTab = MutableStateFlow(TabRoute.CAMPAIGN)
  val currentTab: StateFlow<TabRoute> = _currentTab

  fun setTab(t: TabRoute) { _currentTab.value = t }

  // Campaign
  val manifestJson = MutableStateFlow(DEFAULT_MANIFEST)
  val manifestHash = MutableStateFlow("")
  val manifestError = MutableStateFlow("")

  // Merkle
  val merkleMint = MutableStateFlow("")
      val leavesJson = MutableStateFlow(DEFAULT_LEAVES)
  val merkleRoot = MutableStateFlow("")
  val ticketsJson = MutableStateFlow("")
  val merkleError = MutableStateFlow("")

  // Verify
  val ticketInput = MutableStateFlow("")
  val verifyResult = MutableStateFlow("")
  val verifyError = MutableStateFlow("")

  
// Settings / config (Step 6)
val relayUrl = MutableStateFlow("")
val rpcUrl = MutableStateFlow("")
val claimSinkPubkey = MutableStateFlow("")
val escrowProgramId = MutableStateFlow("WDEscrow111111111111111111111111111111111")

// Inbox (Step 4): encrypted delivery + decryption
val myPrivKeyB64Url = MutableStateFlow("")
val myPubKeyB64Url = MutableStateFlow("")
val inboxRecipientPub = MutableStateFlow("")
val inboxPlainTicket = MutableStateFlow("")
val inboxEncryptedEnvelope = MutableStateFlow("")
val inboxDecryptedTicket = MutableStateFlow("")
val inboxError = MutableStateFlow("")
      val inboxCursor = MutableStateFlow(0)
      val inboxFetched = MutableStateFlow("")
      val inboxAutoDecryptTicket = MutableStateFlow("")
      val inboxLastFetchCount = MutableStateFlow(0)


      val claimStatus = MutableStateFlow("")
      val claimStatusError = MutableStateFlow("")

// Claim (Step 5): Lite vs Escrow
val claimMethod = MutableStateFlow(ClaimMethod.LITE)
val claimTicketJson = MutableStateFlow("")
val claimOutputJson = MutableStateFlow("")
val claimError = MutableStateFlow("")

// Memo
  val memoOut = MutableStateFlow("")
  val memoError = MutableStateFlow("")

  private val json = Json { ignoreUnknownKeys = true }

  fun computeManifestHash() {
    manifestError.value = ""
    try {
      val (canonical, hash) = ManifestHasher.computeCanonicalAndHash(manifestJson.value)
      manifestHash.value = hash
      // normalize manifest in UI to canonical to show deterministic output
      manifestJson.value = canonical
    } catch (e: Exception) {
      manifestError.value = e.message ?: "Unknown error"
    }
  }

  fun buildMerkleAndTickets() {
    merkleError.value = ""
    try {
      val leaves = JsonParsing.parseLeaves(leavesJson.value)
      if (leaves.isEmpty()) throw IllegalArgumentException("No leaves provided.")
      val built = Merkle.buildCampaign(leaves = leaves)
      merkleRoot.value = built.rootB64Url
      ticketsJson.value = built.ticketsJson
    } catch (e: Exception) {
      merkleError.value = e.message ?: "Unknown error"
    }
  }

  fun verifyTicket() {
    verifyError.value = ""
    verifyResult.value = ""
    try {
      val ticket = json.decodeFromString(ClaimTicket.serializer(), ticketInput.value)
      val ok = Merkle.verifyTicket(ticket)
      verifyResult.value = if (ok) "VALID" else "INVALID"
    } catch (e: Exception) {
      verifyError.value = e.message ?: "Unknown error"
    }
  }

  fun buildCommitmentMemo() {
    memoError.value = ""
    memoOut.value = ""
    try {
      val mh = manifestHash.value.ifBlank {
        // compute if not computed yet
        computeManifestHash()
        manifestHash.value
      }
      val root = merkleRoot.value
      if (mh.isBlank()) throw IllegalStateException("manifestHash is empty.")
      if (root.isBlank()) throw IllegalStateException("merkleRoot is empty.")
      memoOut.value = CommitmentMemo.format(mh, root)
    } catch (e: Exception) {
      memoError.value = e.message ?: "Unknown error"
    }
  }

  
fun setMyKeys(privB64Url: String, pubB64Url: String) {
  myPrivKeyB64Url.value = privB64Url
  myPubKeyB64Url.value = pubB64Url
}

fun encryptTicketToEnvelope() {
  inboxError.value = ""
  inboxEncryptedEnvelope.value = ""
  try {
    val recip = inboxRecipientPub.value.trim()
    if (recip.isBlank()) throw IllegalStateException("Recipient public key is blank.")
    val ticket = inboxPlainTicket.value.trim()
    if (ticket.isBlank()) throw IllegalStateException("Ticket JSON is blank.")
    inboxEncryptedEnvelope.value = EnvelopeCodec.encryptTicketJson(ticket, recip)
  } catch (e: Exception) {
    inboxError.value = e.message ?: "Unknown error"
  }
}

fun decryptEnvelopeToTicket() {
  inboxError.value = ""
  inboxDecryptedTicket.value = ""
  try {
    val priv = myPrivKeyB64Url.value.trim()
    val pub = myPubKeyB64Url.value.trim()
    if (priv.isBlank() || pub.isBlank()) throw IllegalStateException("My keys not set.")
    val env = inboxEncryptedEnvelope.value.trim()
    if (env.isBlank()) throw IllegalStateException("Envelope JSON is blank.")
    inboxDecryptedTicket.value = EnvelopeCodec.decryptEnvelopeToTicketJson(env, priv, pub)
  } catch (e: Exception) {
    inboxError.value = e.message ?: "Unknown error"
  }
}


fun buildClaimOutput() {
  claimError.value = ""
  claimOutputJson.value = ""
  try {
    val raw = claimTicketJson.value.trim()
    if (raw.isBlank()) throw IllegalStateException("Paste a ticket JSON first.")
    val ticket = json.decodeFromString(ClaimTicket.serializer(), raw)
    // Always verify locally before producing claim output
    if (!Merkle.verifyTicket(ticket)) throw IllegalStateException("Ticket proof invalid; cannot build claim.")

    claimOutputJson.value = when (claimMethod.value) {
      ClaimMethod.LITE -> LiteClaim.buildClaimPacket(ticket)
      ClaimMethod.ESCROW -> EscrowClaim.buildPlan(ticket)
    }
  } catch (e: Exception) {
    claimError.value = e.message ?: "Unknown error"
  }
}


fun loadConfig(relay: String, rpc: String, sink: String, programId: String) {
  relayUrl.value = relay
  rpcUrl.value = rpc
  claimSinkPubkey.value = sink
  escrowProgramId.value = programId
}

fun pollRelayAndDecrypt() {
  inboxError.value = ""
  inboxLastFetchCount.value = 0
  try {
    val base = relayUrl.value.trim()
    if (base.isBlank()) throw IllegalStateException("Relay URL not set.")
    val pub = myPubKeyB64Url.value.trim()
    val priv = myPrivKeyB64Url.value.trim()
    if (pub.isBlank() || priv.isBlank()) throw IllegalStateException("My keys not set.")
    val after = inboxCursor.value
    val resp = RelayApi.getEnvelopes(base, pub, after, 50)
    inboxCursor.value = resp.nextAfter
    inboxLastFetchCount.value = resp.items.size

    if (resp.items.isNotEmpty()) {
      val first = resp.items.first()
      inboxFetched.value = first.envelopeJson
      val dec = EnvelopeCodec.decryptEnvelopeToTicketJson(first.envelopeJson, priv, pub)
      inboxAutoDecryptTicket.value = dec
      RelayApi.ack(base, RelayApi.AckReq(pub, resp.items.map { it.id }))
    }
  } catch (e: Exception) {
    inboxError.value = e.message ?: "Unknown error"
  }
}

fun checkClaimStatusLite(nullifierB64Url: String) {
  claimStatusError.value = ""
  claimStatus.value = ""
  try {
    val rpc = rpcUrl.value.trim()
    if (rpc.isBlank()) throw IllegalStateException("RPC URL not set.")
    val sink = claimSinkPubkey.value.trim()
    if (sink.isBlank()) throw IllegalStateException("Claim sink pubkey not set (Settings).")

    val sigs = SolanaRpc.getSignaturesForAddress(rpc, sink, 50).toString()
    val sigList = Regex("\\"signature\\"\\s*:\\s*\\"([^\\\"]+)\\"").findAll(sigs).map { it.groupValues[1] }.take(20).toList()
    var found = false
    for (s in sigList) {
      val tx = SolanaRpc.getTransaction(rpc, s).toString()
      if (tx.contains(nullifierB64Url)) { found = true; break }
    }
    claimStatus.value = if (found) "CLAIMED (lite) — nullifier seen on-chain" else "NOT FOUND (lite) — nullifier not seen in recent sink txs"
  } catch (e: Exception) {
    claimStatusError.value = e.message ?: "Unknown error"
  }
}

fun checkClaimStatusEscrow(campaignIdB64Url: String, recipientBase58: String) {
  claimStatusError.value = ""
  claimStatus.value = ""
  try {
    val rpc = rpcUrl.value.trim()
    if (rpc.isBlank()) throw IllegalStateException("RPC URL not set.")
    val programId58 = escrowProgramId.value.trim()
    val programId32 = Base58.decode(programId58).also { require(it.size == 32) { "ProgramId must decode to 32 bytes" } }

    val campaignId32 = Base64Url.decode(campaignIdB64Url).also { require(it.size == 32) { "campaignId must be 32 bytes (b64url)" } }
    val (campaignPda32, _) = SolanaPda.findProgramAddress(listOf("campaign".toByteArray(), campaignId32), programId32)

    val recipient32 = Base58.decode(recipientBase58).also { require(it.size == 32) { "Recipient must decode to 32 bytes" } }
    val (nullifierPda32, _) = SolanaPda.findProgramAddress(listOf("nullifier".toByteArray(), campaignPda32, recipient32), programId32)
    val nullifierPda58 = Base58.encode(nullifierPda32)

    val info = SolanaRpc.getAccountInfo(rpc, nullifierPda58).toString()
    val exists = info.contains("\"value\":") && !info.contains("\"value\":null")
    claimStatus.value = if (exists) "CLAIMED (escrow) — nullifier PDA exists" else "NOT CLAIMED (escrow) — nullifier PDA missing"
  } catch (e: Exception) {
    claimStatusError.value = e.message ?: "Unknown error"
  }
}

companion object {
    private val DEFAULT_MANIFEST = """
{
  "campaignId": "demo-campaign-001",
  "name": "WhisperDrop Demo",
  "snapshot": {
    "slot": 123456789,
    "timestamp": "2026-01-21T00:00:00Z"
  },
  "rules": {
    "type": "activity-based",
    "description": "Credited for verifiable activity, not identity/status.",
    "window": {
      "from": "2026-01-01T00:00:00Z",
      "to": "2026-01-15T23:59:59Z"
    },
    "criteria": [
      {
        "kind": "swap_count",
        "min": 3,
        "program": "jupiter"
      }
    ]
  },
  "allocation": {
    "pool": "1000000",
    "unit": "TOKEN",
    "perUserCap": "5000"
  },
  "claim": {
    "expiry": "2026-02-21T00:00:00Z"
  }
}
"""

    private val DEFAULT_LEAVES = """
[
  {
    "recipient": "F42ZovBoRJZU4av5g8j4qJt7G7k4QzBf8TqV7mXy7pYp",
    "allocation": "250"
  },
  {
    "recipient": "7sQ1u7tq2n9dNqvK6w2wKJ9VtRrjv6qg5bQm8v8k9QvS",
    "allocation": "125"
  },
  {
    "recipient": "9mN2w2a7s4Zp5b7w3p2q1r8t6y5x4c3v2b1n0m9l8k7j",
    "allocation": "300"
  }
]
"""
  }
}
