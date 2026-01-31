package com.styx.whisperdrop

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import com.styx.whisperdrop.wd.Crypto
import com.styx.whisperdrop.wd.DemoKeyStore

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    Crypto.ensureProvider()
    DemoKeyStore.loadOrCreate(this)
    setContent {
      MaterialTheme {
        Surface {
          WhisperDropApp()
        }
      }
    }
  }
}
