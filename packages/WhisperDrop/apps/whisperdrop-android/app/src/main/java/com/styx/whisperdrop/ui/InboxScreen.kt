package com.styx.whisperdrop.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.styx.whisperdrop.wd.DemoKeyStore

@Composable
fun InboxScreen(mod: Modifier, vm: WhisperDropViewModel) {
  val ctx = LocalContext.current

  LaunchedEffect(Unit) {
    val (priv, pub) = DemoKeyStore.loadOrCreate(ctx)
    vm.setMyKeys(priv, pub)
  }

  val myPub by vm.myPubKeyB64Url.collectAsState()
  val myPriv by vm.myPrivKeyB64Url.collectAsState()
  val recipPub by vm.inboxRecipientPub.collectAsState()
  val plainTicket by vm.inboxPlainTicket.collectAsState()
  val env by vm.inboxEncryptedEnvelope.collectAsState()
  val dec by vm.inboxDecryptedTicket.collectAsState()
  val err by vm.inboxError.collectAsState()

  Column(mod.verticalScroll(rememberScrollState())) {
    Section("My Inbox Keys (X25519)") {
      Text("Public key (share to receive private tickets):")
      OutlinedTextField(
        value = myPub,
        onValueChange = { },
        modifier = Modifier.fillMaxWidth(),
        label = { Text("My Public Key (b64url)") },
        readOnly = true
      )

      Spacer(Modifier.height(8.dp))
      Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Button(onClick = {
          val (privNew, pubNew) = DemoKeyStore.reset(ctx)
          vm.setMyKeys(privNew, pubNew)
        }) { Text("Rotate Keys") }

        OutlinedButton(onClick = { /* keep private visible for demo */ }) { Text("Private Stored (Demo)") }
      }

      Spacer(Modifier.height(8.dp))
      OutlinedTextField(
        value = myPriv,
        onValueChange = { },
        modifier = Modifier.fillMaxWidth(),
        label = { Text("My Private Key (b64url) — demo only") },
        readOnly = true
      )
    }

    Section("Encrypt Ticket for Recipient") {
      OutlinedTextField(
        value = recipPub,
        onValueChange = { vm.inboxRecipientPub.value = it },
        modifier = Modifier.fillMaxWidth(),
        label = { Text("Recipient Public Key (b64url)") }
      )
      Spacer(Modifier.height(8.dp))
      OutlinedTextField(
        value = plainTicket,
        onValueChange = { vm.inboxPlainTicket.value = it },
        modifier = Modifier.fillMaxWidth().height(180.dp),
        label = { Text("Ticket JSON (paste one ticket from Merkle export)") }
      )
      Spacer(Modifier.height(8.dp))
      Button(onClick = { vm.encryptTicketToEnvelope() }) { Text("Encrypt → Envelope JSON") }
      ErrorText(err)

      if (env.isNotBlank()) {
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
          value = env,
          onValueChange = { vm.inboxEncryptedEnvelope.value = it },
          modifier = Modifier.fillMaxWidth().height(180.dp),
          label = { Text("Envelope JSON (send privately)") }
        )
      }
    }

    Section("Relay Inbox (Step 6)") {
  Text("Fetch encrypted envelopes from the relay using your public key.")
  Spacer(Modifier.height(8.dp))
  Button(onClick = { vm.pollRelayAndDecrypt() }) { Text("Poll Relay") }
  ErrorText(err)

  val cnt by vm.inboxLastFetchCount.collectAsState()
  val fetched by vm.inboxFetched.collectAsState()
  val decAuto by vm.inboxAutoDecryptTicket.collectAsState()

  if (cnt > 0) {
    Spacer(Modifier.height(8.dp))
    Text("Fetched $cnt message(s). Showing newest.", style = MaterialTheme.typography.bodySmall)
  }
  if (fetched.isNotBlank()) {
    Spacer(Modifier.height(8.dp))
    OutlinedTextField(
      value = fetched,
      onValueChange = { vm.inboxFetched.value = it },
      modifier = Modifier.fillMaxWidth().height(160.dp),
      label = { Text("Newest Envelope (from relay)") }
    )
  }
  if (decAuto.isNotBlank()) {
    Spacer(Modifier.height(8.dp))
    OutlinedTextField(
      value = decAuto,
      onValueChange = { vm.inboxAutoDecryptTicket.value = it },
      modifier = Modifier.fillMaxWidth().height(200.dp),
      label = { Text("Auto-decrypted Ticket JSON") }
    )
  }
}

    Section("Decrypt Received Envelope") {
      Text("Paste an envelope JSON sent to your public key. Decryption happens locally.")
      Spacer(Modifier.height(8.dp))
      Button(onClick = { vm.decryptEnvelopeToTicket() }) { Text("Decrypt Envelope → Ticket JSON") }
      ErrorText(err)

      if (dec.isNotBlank()) {
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
          value = dec,
          onValueChange = { vm.inboxDecryptedTicket.value = it },
          modifier = Modifier.fillMaxWidth().height(220.dp),
          label = { Text("Decrypted Ticket JSON") }
        )
      }
    }
  }
}
