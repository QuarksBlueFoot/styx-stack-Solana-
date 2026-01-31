package com.styx.whisperdrop.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.styx.whisperdrop.wd.AppConfig

@Composable
fun SettingsScreen(mod: Modifier, vm: WhisperDropViewModel) {
  val ctx = LocalContext.current

  LaunchedEffect(Unit) {
    vm.loadConfig(
      relay = AppConfig.getRelayUrl(ctx),
      rpc = AppConfig.getRpcUrl(ctx),
      sink = AppConfig.getClaimSink(ctx),
      programId = AppConfig.getEscrowProgramId(ctx)
    )
  }

  val relay by vm.relayUrl.collectAsState()
  val rpc by vm.rpcUrl.collectAsState()
  val sink by vm.claimSinkPubkey.collectAsState()
  val programId by vm.escrowProgramId.collectAsState()

  Column(mod.verticalScroll(rememberScrollState())) {
    Section("Settings (Step 6)") {
      OutlinedTextField(value = relay, onValueChange = { vm.relayUrl.value = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Relay URL") })
      Spacer(Modifier.height(8.dp))
      OutlinedTextField(value = rpc, onValueChange = { vm.rpcUrl.value = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Solana RPC URL") })
      Spacer(Modifier.height(8.dp))
      OutlinedTextField(value = sink, onValueChange = { vm.claimSinkPubkey.value = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Lite Claim Sink Pubkey (base58)") })
      Spacer(Modifier.height(8.dp))
      OutlinedTextField(value = programId, onValueChange = { vm.escrowProgramId.value = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Escrow Program ID (base58)") })
      Spacer(Modifier.height(12.dp))
      Button(onClick = {
        AppConfig.setRelayUrl(ctx, vm.relayUrl.value.trim())
        AppConfig.setRpcUrl(ctx, vm.rpcUrl.value.trim())
        AppConfig.setClaimSink(ctx, vm.claimSinkPubkey.value.trim())
        AppConfig.setEscrowProgramId(ctx, vm.escrowProgramId.value.trim())
      }) { Text("Save") }
    }
  }
}
