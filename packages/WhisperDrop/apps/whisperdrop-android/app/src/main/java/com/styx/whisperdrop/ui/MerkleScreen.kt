package com.styx.whisperdrop.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun MerkleScreen(mod: Modifier, vm: WhisperDropViewModel) {
  val leaves by vm.leavesJson.collectAsState()
  val mint by vm.merkleMint.collectAsState()
  val root by vm.merkleRoot.collectAsState()
  val tickets by vm.ticketsJson.collectAsState()
  val err by vm.merkleError.collectAsState()

  Column(mod.verticalScroll(rememberScrollState())) {
    Section("Recipients + Allocations") {
      OutlinedTextField(
        value = leaves,
        onValueChange = { vm.leavesJson.value = it },
        modifier = Modifier.fillMaxWidth().height(220.dp),
        label = { Text("Leaves JSON (recipient, allocation)") }
      )
      Spacer(Modifier.height(8.dp))
      OutlinedTextField(
        value = mint,
        onValueChange = { vm.merkleMint.value = it },
        modifier = Modifier.fillMaxWidth(),
        label = { Text("Mint (base58) — required for Escrow tickets") }
      )
      Spacer(Modifier.height(8.dp))
      Button(onClick = { vm.buildMerkleAndTickets() }) { Text("Generate Nonces & Build Merkle") }
      ErrorText(err)
      if (root.isNotBlank()) {
        Spacer(Modifier.height(12.dp))
        Text("merkleRoot (base64url):")
        Text(root, style = MaterialTheme.typography.bodySmall)
      }
    }

    if (tickets.isNotBlank()) {
      Section("Export Tickets JSON") {
        OutlinedTextField(
          value = tickets,
          onValueChange = { vm.ticketsJson.value = it },
          modifier = Modifier.fillMaxWidth().height(260.dp),
          label = { Text("Tickets JSON (copy one into Verify)") }
        )
      }
    }
  }
}
