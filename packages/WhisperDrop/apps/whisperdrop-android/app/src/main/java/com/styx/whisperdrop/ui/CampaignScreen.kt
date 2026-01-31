package com.styx.whisperdrop.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.styx.whisperdrop.wd.MwaClient
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.launch

@Composable
fun CampaignScreen(mod: Modifier, vm: WhisperDropViewModel) {
  val manifest by vm.manifestJson.collectAsState()
  val campaignId by vm.initCampaignId.collectAsState()
  val mint by vm.initMint.collectAsState()
  val expiry by vm.initExpiryUnix.collectAsState()
  val merkleRoot by vm.initMerkleRoot.collectAsState()
  val initSig by vm.initTxSig.collectAsState()
  val initErr by vm.initError.collectAsState()

  val depAmt by vm.depositAmount.collectAsState()
  val depSig by vm.depositTxSig.collectAsState()
  val depErr by vm.depositError.collectAsState()
  val hash by vm.manifestHash.collectAsState()
  val err by vm.manifestError.collectAsState()
  Column(mod.verticalScroll(rememberScrollState())) {
    Section("Campaign Manifest") {
      OutlinedTextField(
        value = manifest,
        onValueChange = { vm.manifestJson.value = it },
        modifier = Modifier.fillMaxWidth().height(240.dp),
        label = { Text("Manifest JSON") }
      )
      Spacer(Modifier.height(8.dp))
      Button(onClick = { vm.computeManifestHash() }) { Text("Compute Hash (Canonical)") }
      ErrorText(err)
      if (hash.isNotBlank()) {
        Spacer(Modifier.height(12.dp))
        Text("manifestHash (base64url):")
        Text(hash, style = MaterialTheme.typography.bodySmall)
      }
    }


Section("On-Chain Setup (Step 11)") {
  val ctx = LocalContext.current
  val scope = rememberCoroutineScope()

  OutlinedTextField(value = campaignId, onValueChange = { vm.initCampaignId.value = it }, modifier = Modifier.fillMaxWidth(), label = { Text("campaignId (32-byte b64url)") })
  Spacer(Modifier.height(8.dp))
  OutlinedTextField(value = mint, onValueChange = { vm.initMint.value = it }, modifier = Modifier.fillMaxWidth(), label = { Text("mint (base58)") })
  Spacer(Modifier.height(8.dp))
  OutlinedTextField(value = merkleRoot, onValueChange = { vm.initMerkleRoot.value = it }, modifier = Modifier.fillMaxWidth(), label = { Text("merkleRoot (32-byte b64url)") })
  Spacer(Modifier.height(8.dp))
  OutlinedTextField(value = expiry, onValueChange = { vm.initExpiryUnix.value = it }, modifier = Modifier.fillMaxWidth(), label = { Text("expiryUnix (seconds)") })

  Spacer(Modifier.height(10.dp))
  Button(onClick = {
    vm.initError.value = ""
    vm.initTxSig.value = ""
    scope.launch {
      try {
        val act = ctx as android.app.Activity
        val res = MwaClient.sendInitCampaign(
          activity = act,
          rpcUrl = vm.rpcUrl.value.trim(),
          programIdBase58 = vm.escrowProgramId.value.trim(),
          campaignIdB64Url = vm.initCampaignId.value.trim(),
          manifestHashB64Url = vm.manifestHash.value.trim(),
          merkleRootB64Url = vm.initMerkleRoot.value.trim(),
          mintBase58 = vm.initMint.value.trim(),
          expiryUnix = vm.initExpiryUnix.value.trim().toLong()
        )
        vm.initTxSig.value = res.signatureBase58
      } catch (e: Exception) {
        vm.initError.value = e.message ?: "Unknown error"
      }
    }
  }) { Text("Init Campaign (MWA)") }

  if (initErr.isNotBlank()) Text(initErr, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
  if (initSig.isNotBlank()) Text("Init signature: $initSig", style = MaterialTheme.typography.bodySmall)

  Divider(Modifier.padding(vertical = 12.dp))

  Text("Deposit tokens into escrow ATA (wallet transfer)", style = MaterialTheme.typography.titleSmall)
  OutlinedTextField(value = depAmt, onValueChange = { vm.depositAmount.value = it }, modifier = Modifier.fillMaxWidth(), label = { Text("amount (raw token units, u64)") })
  Spacer(Modifier.height(8.dp))
  Button(onClick = {
    vm.depositError.value = ""
    vm.depositTxSig.value = ""
    scope.launch {
      try {
        val act = ctx as android.app.Activity
        val res = MwaClient.sendDepositToEscrowAta(
          activity = act,
          rpcUrl = vm.rpcUrl.value.trim(),
          campaignIdB64Url = vm.initCampaignId.value.trim(),
          programIdBase58 = vm.escrowProgramId.value.trim(),
          mintBase58 = vm.initMint.value.trim(),
          amount = vm.depositAmount.value.trim().toLong()
        )
        vm.depositTxSig.value = res.signatureBase58
      } catch (e: Exception) {
        vm.depositError.value = e.message ?: "Unknown error"
      }
    }
  }) { Text("Deposit (MWA)") }

  if (depErr.isNotBlank()) Text(depErr, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
  if (depSig.isNotBlank()) Text("Deposit signature: $depSig", style = MaterialTheme.typography.bodySmall)

  Spacer(Modifier.height(6.dp))
  Text("Note: this deposits to escrow ATA derived from (campaign PDA, mint). This is compatible with the new rust-lite program and usable for demos.", style = MaterialTheme.typography.bodySmall)
}
  }
}
