package com.styx.whisperdrop.wd

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

object Http {
  private val JSON = "application/json; charset=utf-8".toMediaType()

  val client: OkHttpClient = OkHttpClient.Builder()
    .callTimeout(20, TimeUnit.SECONDS)
    .connectTimeout(10, TimeUnit.SECONDS)
    .readTimeout(20, TimeUnit.SECONDS)
    .build()

  fun get(url: String): String {
    val req = Request.Builder().url(url).get().build()
    client.newCall(req).execute().use { resp ->
      val body = resp.body?.string() ?: ""
      if (!resp.isSuccessful) throw IllegalStateException("HTTP ${resp.code}: $body")
      return body
    }
  }

  fun postJson(url: String, json: String): String {
    val req = Request.Builder().url(url).post(json.toRequestBody(JSON)).build()
    client.newCall(req).execute().use { resp ->
      val body = resp.body?.string() ?: ""
      if (!resp.isSuccessful) throw IllegalStateException("HTTP ${resp.code}: $body")
      return body
    }
  }
}
