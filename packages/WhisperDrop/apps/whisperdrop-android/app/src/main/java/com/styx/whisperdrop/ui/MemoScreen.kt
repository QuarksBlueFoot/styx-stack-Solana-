package com.styx.whisperdrop.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun MemoScreen(mod: Modifier, vm: WhisperDropViewModel) {
  val memo by vm.memoOut.collectAsState()
  val err by vm.memoError.collectAsState()
  Column(mod.verticalScroll(rememberScrollState())) {
    Section("Commitment Memo") {
      Text("Build the public commitment memo string from the current manifestHash + merkleRoot.")
      Spacer(Modifier.height(8.dp))
      Button(onClick = { vm.buildCommitmentMemo() }) { Text("Build Memo String") }
      ErrorText(err)
      if (memo.isNotBlank()) {
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
          value = memo,
          onValueChange = { vm.memoOut.value = it },
          modifier = Modifier.fillMaxWidth().height(120.dp),
          label = { Text("Memo String") }
        )
      }
    }
  }
}
