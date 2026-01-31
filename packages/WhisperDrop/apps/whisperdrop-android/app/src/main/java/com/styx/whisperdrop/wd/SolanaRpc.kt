package com.styx.whisperdrop.wd

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement

object SolanaRpc {
  private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }

  @Serializable data class RpcResp(val jsonrpc: String = "2.0", val id: Int = 1, val result: JsonElement? = null, val error: JsonElement? = null)

  fun call(rpcUrl: String, method: String, paramsJson: String = "[]"): JsonElement {
    val body = "{"jsonrpc":"2.0","id":1,"method":"$method","params":$paramsJson}"
    val raw = Http.postJson(rpcUrl, body)
    val resp = json.decodeFromString(RpcResp.serializer(), raw)
    if (resp.error != null) throw IllegalStateException("RPC error: ${resp.error}")
    return resp.result ?: throw IllegalStateException("RPC missing result")
  }

  fun getAccountInfo(rpcUrl: String, pubkey: String): JsonElement =
    call(rpcUrl, "getAccountInfo", "["$pubkey", {"encoding":"base64"}]")

  fun getSignaturesForAddress(rpcUrl: String, address: String, limit: Int = 50): JsonElement =
    call(rpcUrl, "getSignaturesForAddress", "["$address", {"limit":$limit}]")

  fun getTransaction(rpcUrl: String, signature: String): JsonElement =
    call(rpcUrl, "getTransaction", "["$signature", {"encoding":"jsonParsed","maxSupportedTransactionVersion":0}]")
}
