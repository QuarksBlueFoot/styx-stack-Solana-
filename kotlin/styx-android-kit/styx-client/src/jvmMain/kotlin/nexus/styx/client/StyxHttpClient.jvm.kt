package nexus.styx.client

import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*

/**
 * JVM HTTP client implementation using Ktor CIO engine.
 */
actual object StyxHttpClient {
    private val client = HttpClient(CIO) {
        engine {
            requestTimeout = 30_000
            endpoint {
                connectTimeout = 10_000
                keepAliveTime = 5_000
            }
        }
    }

    actual suspend fun get(url: String, headers: Map<String, String>): String {
        val response = client.get(url) {
            headers.forEach { (k, v) -> header(k, v) }
        }
        return response.bodyAsText()
    }

    actual suspend fun post(url: String, body: String, headers: Map<String, String>): String {
        val response = client.post(url) {
            headers.forEach { (k, v) -> header(k, v) }
            contentType(ContentType.Application.Json)
            setBody(body)
        }
        return response.bodyAsText()
    }
}
