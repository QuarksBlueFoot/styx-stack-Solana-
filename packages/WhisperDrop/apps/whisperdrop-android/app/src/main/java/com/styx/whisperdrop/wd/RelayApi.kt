package com.styx.whisperdrop.wd

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

object RelayApi {
  private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }

  @Serializable data class PostEnvelopeReq(val recipientPubB64Url: String, val envelopeJson: String)
  @Serializable data class PostEnvelopeResp(val ok: Boolean, val id: String)

  @Serializable data class EnvelopeItem(val id: String, val createdAt: String, val envelopeJson: String, val cursor: Int = 0)
  @Serializable data class GetEnvelopesResp(val ok: Boolean, val items: List<EnvelopeItem> = emptyList(), val nextAfter: Int = 0)

  @Serializable data class AckReq(val recipientPubB64Url: String, val ids: List<String>)
  @Serializable data class AckResp(val ok: Boolean, val acked: Int)

  fun getEnvelopes(baseUrl: String, recipientPubB64Url: String, after: Int, limit: Int = 50): GetEnvelopesResp {
    val url = baseUrl.trimEnd('/') + "/v1/envelopes?recipientPubB64Url=$recipientPubB64Url&after=$after&limit=$limit"
    val raw = Http.get(url)
    return json.decodeFromString(GetEnvelopesResp.serializer(), raw)
  }

  fun ack(baseUrl: String, req: AckReq): AckResp {
    val body = json.encodeToString(AckReq.serializer(), req)
    val raw = Http.postJson(baseUrl.trimEnd('/') + "/v1/envelopes/ack", body)
    return json.decodeFromString(AckResp.serializer(), raw)
  }
}
