package com.styx.whisperdrop.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun Section(title: String, content: @Composable ColumnScope.() -> Unit) {
  Column(Modifier.fillMaxWidth().padding(16.dp)) {
    Text(title, style = MaterialTheme.typography.titleMedium)
    Spacer(Modifier.height(8.dp))
    content()
  }
}

@Composable
fun ErrorText(msg: String) {
  if (msg.isNotBlank()) {
    Spacer(Modifier.height(8.dp))
    Text(msg, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
  }
}
