package com.styx.whisperdrop

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import com.styx.whisperdrop.ui.*

@Composable
fun WhisperDropApp(vm: WhisperDropViewModel = viewModel()) {
  val tabs = listOf(
    "Campaign" to TabRoute.CAMPAIGN,
    "Merkle" to TabRoute.MERKLE,
    "Verify" to TabRoute.VERIFY,
    "Memo" to TabRoute.MEMO,
    "Inbox" to TabRoute.INBOX,
    "Claim" to TabRoute.CLAIM,
    "Settings" to TabRoute.SETTINGS
  )

  Scaffold(
    topBar = { TopAppBar(title = { Text("WhisperDrop") }) },
    bottomBar = {
      NavigationBar {
        val current = vm.currentTab.collectAsState().value
        tabs.forEach { (label, route) ->
          NavigationBarItem(
            selected = current == route,
            onClick = { vm.setTab(route) },
            label = { Text(label) },
            icon = {}
          )
        }
      }
    }
  ) { padding ->
    val current = vm.currentTab.collectAsState().value
    when (current) {
      TabRoute.CAMPAIGN -> CampaignScreen(Modifier.padding(padding), vm)
      TabRoute.MERKLE -> MerkleScreen(Modifier.padding(padding), vm)
      TabRoute.VERIFY -> VerifyScreen(Modifier.padding(padding), vm)
      TabRoute.MEMO -> MemoScreen(Modifier.padding(padding), vm)
      TabRoute.INBOX -> InboxScreen(Modifier.padding(padding), vm)
      TabRoute.CLAIM -> ClaimScreen(Modifier.padding(padding), vm)
      TabRoute.SETTINGS -> SettingsScreen(Modifier.padding(padding), vm)
    }
  }
}
