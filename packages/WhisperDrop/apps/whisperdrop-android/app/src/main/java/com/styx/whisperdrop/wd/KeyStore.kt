package com.styx.whisperdrop.wd

import android.content.Context
import androidx.core.content.edit
import java.security.KeyPair

object DemoKeyStore {
  private const val PREF = "whisperdrop_keys"
  private const val K_PRIV = "x25519_priv_b64url"
  private const val K_PUB = "x25519_pub_b64url"

  fun loadOrCreate(context: Context): Pair<String, String> {
    val p = context.getSharedPreferences(PREF, Context.MODE_PRIVATE)
    val priv = p.getString(K_PRIV, null)
    val pub = p.getString(K_PUB, null)
    if (priv != null && pub != null) return priv to pub

    val kp: KeyPair = Crypto.x25519Keypair()
    val pubB64 = EnvelopeCodec.encodePublicKey(kp.public)
    val privB64 = EnvelopeCodec.encodePrivateKey(kp.private)
    p.edit {
      putString(K_PRIV, privB64)
      putString(K_PUB, pubB64)
    }
    return privB64 to pubB64
  }

  fun reset(context: Context): Pair<String, String> {
    val p = context.getSharedPreferences(PREF, Context.MODE_PRIVATE)
    p.edit { clear() }
    return loadOrCreate(context)
  }
}
