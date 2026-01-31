package com.styx.whisperdrop.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun VerifyScreen(mod: Modifier, vm: WhisperDropViewModel) {
  val input by vm.ticketInput.collectAsState()
  val result by vm.verifyResult.collectAsState()
  val err by vm.verifyError.collectAsState()

  Column(mod.verticalScroll(rememberScrollState())) {
    Section("Verify Ticket") {
      OutlinedTextField(
        value = input,
        onValueChange = { vm.ticketInput.value = it },
        modifier = Modifier.fillMaxWidth().height(260.dp),
        label = { Text("Paste single ticket JSON") }
      )
      Spacer(Modifier.height(8.dp))
      Button(onClick = { vm.verifyTicket() }) { Text("Verify") }
      ErrorText(err)
      if (result.isNotBlank()) {
        Spacer(Modifier.height(12.dp))
        Text("Result: $result", style = MaterialTheme.typography.titleMedium)
      }
    }
  }
}
