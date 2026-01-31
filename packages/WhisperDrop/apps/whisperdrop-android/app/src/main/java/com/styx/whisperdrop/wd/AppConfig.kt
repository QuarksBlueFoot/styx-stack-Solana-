package com.styx.whisperdrop.wd

import android.content.Context
import androidx.core.content.edit

object AppConfig {
  private const val PREF = "whisperdrop_config"
  private const val K_RELAY = "relay_url"
  private const val K_RPC = "rpc_url"
  private const val K_CLAIM_SINK = "claim_sink_pubkey"
  private const val K_ESCROW_PROGRAM = "escrow_program_id"

  fun getRelayUrl(ctx: Context): String =
    ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE).getString(K_RELAY, "http://10.0.2.2:8787") ?: "http://10.0.2.2:8787"
  fun setRelayUrl(ctx: Context, v: String) = ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE).edit { putString(K_RELAY, v) }

  fun getRpcUrl(ctx: Context): String =
    ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE).getString(K_RPC, "https://api.mainnet-beta.solana.com") ?: "https://api.mainnet-beta.solana.com"
  fun setRpcUrl(ctx: Context, v: String) = ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE).edit { putString(K_RPC, v) }

  fun getClaimSink(ctx: Context): String =
    ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE).getString(K_CLAIM_SINK, "") ?: ""
  fun setClaimSink(ctx: Context, v: String) = ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE).edit { putString(K_CLAIM_SINK, v) }

  fun getEscrowProgramId(ctx: Context): String =
    ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE).getString(K_ESCROW_PROGRAM, "WDEscrow111111111111111111111111111111111") ?: "WDEscrow111111111111111111111111111111111"
  fun setEscrowProgramId(ctx: Context, v: String) = ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE).edit { putString(K_ESCROW_PROGRAM, v) }
}
