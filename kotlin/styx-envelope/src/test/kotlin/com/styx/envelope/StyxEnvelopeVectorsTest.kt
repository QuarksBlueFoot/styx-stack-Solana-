package com.styx.envelope

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import org.json.JSONArray

class StyxEnvelopeVectorsTest {

    private data class Vector(
        val name: String,
        val env: org.json.JSONObject,
        val encodedB64Url: String,
        val memo: String
    )

    private fun loadVectors(): List<Vector> {
        val stream = this::class.java.classLoader.getResourceAsStream("styx-envelope-v1.json")
            ?: error("missing test resource styx-envelope-v1.json")
        val text = stream.bufferedReader().readText()
        val arr = JSONArray(text)
        val out = ArrayList<Vector>()
        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i)
            out.add(
                Vector(
                    name = o.getString("name"),
                    env = o.getJSONObject("env"),
                    encodedB64Url = o.getString("encoded_b64url"),
                    memo = o.getString("memo")
                )
            )
        }
        return out
    }

    @Test
    fun vectors_match_spec() {
        val vectors = loadVectors()
        for (v in vectors) {
            val envJson = v.env
            val env = StyxEnvelopeV1.Env(
                v = 1,
                kind = StyxEnvelopeV1.Kind.valueOf(envJson.getString("kind")),
                algo = StyxEnvelopeV1.Algo.valueOf(envJson.getString("algo")),
                id = Base64Url.decode(envJson.getString("id")),
                toHash = envJson.optString("toHash").takeIf { it.isNotEmpty() }?.let { Base64Url.decode(it) },
                from = envJson.optString("from").takeIf { it.isNotEmpty() }?.let { Base64Url.decode(it) },
                nonce = envJson.optString("nonce").takeIf { it.isNotEmpty() }?.let { Base64Url.decode(it) },
                body = Base64Url.decode(envJson.getString("body")),
                aad = envJson.optString("aad").takeIf { it.isNotEmpty() }?.let { Base64Url.decode(it) },
                sig = envJson.optString("sig").takeIf { it.isNotEmpty() }?.let { Base64Url.decode(it) },
            )

            val encoded = StyxEnvelopeV1.encode(env)
            val encB64 = Base64Url.encode(encoded)
            assertEquals(v.encodedB64Url, encB64, "${v.name}: encoded mismatch")
            assertEquals("styx1:${v.encodedB64Url}", v.memo, "${v.name}: memo mismatch")

            val decoded = StyxEnvelopeV1.decode(encoded)
            assertEquals(env.kind, decoded.kind, "${v.name}: kind mismatch")
            assertEquals(env.algo, decoded.algo, "${v.name}: algo mismatch")
            assertTrue(decoded.id.contentEquals(env.id), "${v.name}: id mismatch")
            assertTrue(decoded.body.contentEquals(env.body), "${v.name}: body mismatch")
        }
    }
}
