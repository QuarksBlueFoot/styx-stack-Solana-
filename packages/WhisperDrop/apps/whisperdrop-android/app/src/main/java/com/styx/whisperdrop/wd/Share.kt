package com.styx.whisperdrop.wd

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent

object Share {
  fun copy(ctx: Context, label: String, text: String) {
    val cm = ctx.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    cm.setPrimaryClip(ClipData.newPlainText(label, text))
  }

  fun shareText(ctx: Context, subject: String, text: String) {
    val intent = Intent(Intent.ACTION_SEND).apply {
      type = "text/plain"
      putExtra(Intent.EXTRA_SUBJECT, subject)
      putExtra(Intent.EXTRA_TEXT, text)
    }
    ctx.startActivity(Intent.createChooser(intent, "Share"))
  }
}
