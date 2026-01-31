package com.styx.whisperdrop.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalContext
import android.content.Intent
import android.net.Uri
import androidx.activity.ComponentActivity
import com.styx.whisperdrop.wd.ClaimMethod
import com.styx.whisperdrop.wd.Share
import com.styx.whisperdrop.wd.SubmissionHelpers
import com.styx.whisperdrop.wd.SolanaPay
import com.styx.whisperdrop.wd.MwaClient
import com.styx.whisperdrop.wd.AppConfig

@Composable
fun ClaimScreen(mod: Modifier, vm: WhisperDropViewModel) {
  val method by vm.claimMethod.collectAsState()
  val ticketJson by vm.claimTicketJson.collectAsState()
  val out by vm.claimOutputJson.collectAsState()
  val err by vm.claimError.collectAsState()

  Column(mod.verticalScroll(rememberScrollState())) {
    Section("Claim Builder (Step 5)") {
      Text("Choose a claim method. The app verifies the ticket proof locally before generating output.")
      Spacer(Modifier.height(8.dp))

      Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        FilterChip(
          selected = method == ClaimMethod.LITE,
          onClick = { vm.claimMethod.value = ClaimMethod.LITE },
          label = { Text("Lite (No Program)") }
        )
        FilterChip(
          selected = method == ClaimMethod.ESCROW,
          onClick = { vm.claimMethod.value = ClaimMethod.ESCROW },
          label = { Text("Escrow (Program)") }
        )
      }

      Spacer(Modifier.height(12.dp))
      OutlinedTextField(
        value = ticketJson,
        onValueChange = { vm.claimTicketJson.value = it },
        modifier = Modifier.fillMaxWidth().height(220.dp),
        label = { Text("Paste single ticket JSON (from Merkle export or Inbox decrypt)") }
      )

      Spacer(Modifier.height(8.dp))
      Button(onClick = { vm.buildClaimOutput() }) { Text("Build Claim Output") }
      ErrorText(err)

      if (out.isNotBlank()) {
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
          value = out,
          onValueChange = { vm.claimOutputJson.value = it },
          modifier = Modifier.fillMaxWidth().height(260.dp),
          label = {
            Text(if (method == ClaimMethod.LITE) "Lite Claim Packet (submit via wallet memo)" else "Escrow Claim Plan (for CLI/Anchor)")
          }
        )
      }

      Spacer(Modifier.height(12.dp))
      if (method == ClaimMethod.LITE) {
        Text(
          "Lite Claim: Submit the memo in the output via any wallet (tiny SOL transfer + memo). " +
          "Double-claim protection is best-effort by scanning for the same nullifier."
        , style = MaterialTheme.typography.bodySmall)
      } else {
        Text(
          "Escrow Claim: Strong integrity. Requires deploying the included on-chain program and wiring program ID + transaction builder. " +
          "Nullifiers are enforced on-chain."
        , style = MaterialTheme.typography.bodySmall)
      }
Spacer(Modifier.height(12.dp))

Spacer(Modifier.height(16.dp))
Text("Submission (Step 7)", style = MaterialTheme.typography.titleSmall)
val ctx = LocalContext.current
      val scope = rememberCoroutineScope()
      var lastMwaSig by remember { mutableStateOf("") }
      var mwaErr by remember { mutableStateOf("") }
val sinkHint = remember { mutableStateOf("") }
LaunchedEffect(Unit) {
  // preload sink from preferences if available
  sinkHint.value = AppConfig.getClaimSink(ctx)
}

if (method == ClaimMethod.LITE) {
  Text("Lite submission uses Solana CLI (or any wallet) to send a tiny transfer + memo. We do NOT embed private keys in-app.", style = MaterialTheme.typography.bodySmall)
  Spacer(Modifier.height(8.dp))
  OutlinedTextField(
    value = sinkHint.value,
    onValueChange = { sinkHint.value = it },
    modifier = Modifier.fillMaxWidth(),
    label = { Text("Claim sink pubkey (base58) for CLI command") }
  )
  Spacer(Modifier.height(8.dp))
  Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
    OutlinedButton(onClick = {
      val memoMatch = Regex("\\"memo\\"\\s*:\\s*\\"([^\\\"]+)\\"").find(out)
      val memo = memoMatch?.groupValues?.get(1) ?: ""
      if (memo.isNotBlank()) {
        Share.copy(ctx, "whisperdrop_memo", memo)
      }
    }) { Text("Copy Memo") }

    OutlinedButton(onClick = {
      val nulMatch = Regex("\\"nullifierB64Url\\"\\s*:\\s*\\"([^\\\"]+)\\"").find(out)
      val nul = nulMatch?.groupValues?.get(1) ?: ""
      if (nul.isNotBlank()) Share.copy(ctx, "whisperdrop_nullifier", nul)
    }) { Text("Copy Nullifier") }
  }
  Spacer(Modifier.height(8.dp))
  Button(onClick = {
    val memoMatch = Regex("\\"memo\\"\\s*:\\s*\\"([^\\\"]+)\\"").find(out)
    val memo = memoMatch?.groupValues?.get(1) ?: ""
    if (memo.isBlank()) return@Button
    val cmd = SubmissionHelpers.liteSolanaCliCommand(sinkHint.value.trim(), memo)
    Share.copy(ctx, "whisperdrop_cli", cmd)
    Share.shareText(ctx, "WhisperDrop Lite Claim Command", cmd)
  }) { Text("Share CLI Command") }
Spacer(Modifier.height(8.dp))
Button(onClick = {
  val sink = sinkHint.value.trim()
  if (sink.isBlank()) return@Button
  val memoMatch = Regex("\\"memo\\"\\s*:\\s*\\"([^\\\"]+)\\"").find(out)
  val memo = memoMatch?.groupValues?.get(1) ?: ""
  if (memo.isBlank()) return@Button
  val ref = SolanaPay.randomReferenceBase58()
  val url = SolanaPay.transferUrl(
    recipientBase58 = sink,
    amountSol = "0.000005",
    memo = memo,
    referenceBase58 = ref,
    label = "WhisperDrop",
    message = "Lite claim anchor"
  )
  Share.copy(ctx, "whisperdrop_solanapay", url)
  val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
  ctx.startActivity(intent)
}) { Text("Open Wallet (Solana Pay)") }
Spacer(Modifier.height(8.dp))
Button(onClick = {
  mwaErr = ""
  lastMwaSig = ""
  val activity = (ctx as? ComponentActivity)
  if (activity == null) {
    mwaErr = "No activity context available for MWA."
    return@Button
  }
  val sink = sinkHint.value.trim()
  if (sink.isBlank()) {
    mwaErr = "Claim sink is blank."
    return@Button
  }
  val memoMatch = Regex("\\"memo\\"\\s*:\\s*\\"([^\\\"]+)\\"").find(out)
  val memo = memoMatch?.groupValues?.get(1) ?: ""
  if (memo.isBlank()) {
    mwaErr = "Memo missing."
    return@Button
  }
  scope.launch {
    try {
      val res = MwaClient.sendLiteClaim(
        activity = activity,
        rpcUrl = AppConfig.getRpcUrl(ctx),
        sinkPubkeyBase58 = sink,
        memo = memo,
        lamports = 5_000L
      )
      lastMwaSig = res.signatureBase58
    } catch (e: Exception) {
      mwaErr = e.message ?: "MWA error"
    }
  }
}) { Text("Send In-App (MWA)") }
if (lastMwaSig.isNotBlank()) {
  Text("Sent! Signature: ${'$'}lastMwaSig", style = MaterialTheme.typography.bodySmall)
}
if (mwaErr.isNotBlank()) {
  Text(mwaErr, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
}

Text("Copies the Solana Pay URL to clipboard and opens a compatible wallet to sign/send.", style = MaterialTheme.typography.bodySmall)

  Spacer(Modifier.height(6.dp))
  Text("Tip: paste in terminal with your configured Solana CLI wallet. This is the safest production-grade submission path.", style = MaterialTheme.typography.bodySmall)
} else {
  Text("Escrow submission uses the included Anchor CLI client (Step 7). Save your plan JSON to a file and run the command.", style = MaterialTheme.typography.bodySmall)
  Spacer(Modifier.height(8.dp))
  Button(onClick = {
    val cmd = SubmissionHelpers.escrowAnchorCliCommand("plan.json")
    Share.copy(ctx, "whisperdrop_anchor_cmd", cmd)
    Share.shareText(ctx, "WhisperDrop Escrow Claim Command", cmd)
  }) { Text("Share Anchor Command (template)") }
  Spacer(Modifier.height(6.dp))
  Text("Command expects your plan JSON saved as plan.json and env configured (see tests/whisperdrop-escrow-cli/README).", style = MaterialTheme.typography.bodySmall)
}

Text("Check Claim Status (Step 6)", style = MaterialTheme.typography.titleSmall)
val status by vm.claimStatus.collectAsState()
val statusErr by vm.claimStatusError.collectAsState()

Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
  Button(onClick = {
    val outText = vm.claimOutputJson.value
    if (method == ClaimMethod.LITE) {
      val m = Regex("\\"nullifierB64Url\\"\\s*:\\s*\\"([^\\\"]+)\\"").find(outText)
      val n = m?.groupValues?.get(1) ?: ""
      if (n.isNotBlank()) vm.checkClaimStatusLite(n) else vm.claimStatusError.value = "No nullifier found in output."
    } else {
      vm.claimStatusError.value = "Enter campaignId + recipient below, then press Escrow Check."
    }
  }) { Text("Lite Check") }

  Button(onClick = { /* noop for escrow without inputs */ }) { Text("Escrow Check") }
}

if (method == ClaimMethod.ESCROW) {
  Spacer(Modifier.height(8.dp))
  val campaignIdB64 = remember { mutableStateOf("") }
  val recipient58 = remember { mutableStateOf("") }
  OutlinedTextField(value = campaignIdB64.value, onValueChange = { campaignIdB64.value = it }, modifier = Modifier.fillMaxWidth(), label = { Text("campaignId (32-byte b64url)") })
  Spacer(Modifier.height(8.dp))
  OutlinedTextField(value = recipient58.value, onValueChange = { recipient58.value = it }, modifier = Modifier.fillMaxWidth(), label = { Text("recipient pubkey (base58)") })
  Spacer(Modifier.height(8.dp))
  Button(onClick = { vm.checkClaimStatusEscrow(campaignIdB64.value.trim(), recipient58.value.trim()) }) { Text("Run Escrow Check") }
}

if (statusErr.isNotBlank()) Text(statusErr, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
if (status.isNotBlank()) Text(status, style = MaterialTheme.typography.bodySmall)

    }
  }
}
