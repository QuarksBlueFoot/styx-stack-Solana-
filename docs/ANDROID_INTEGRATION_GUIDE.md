# Styx Privacy Standard — Android Integration Guide

> **Audience:** Android frontend developers integrating private token operations into mobile apps.  
> **API:** Umbra API v1.0 — `https://api.styx.nexus/v1`  
> **SDK:** `@styx-stack/sps-sdk` (TypeScript/React Native) or raw JSON-RPC (Kotlin/Java)

---

## Table of Contents

1. [Overview](#overview)  
2. [Architecture](#architecture)  
3. [Kotlin Quick Start](#kotlin-quick-start)  
4. [JSON-RPC Client Setup](#json-rpc-client-setup)  
5. [Core Operations](#core-operations)  
   - [Shield Tokens](#shield-tokens)  
   - [Unshield Tokens](#unshield-tokens)  
   - [Private Transfer](#private-transfer)  
   - [Private Swap](#private-swap)  
6. [Querying Account State](#querying-account-state)  
7. [React Native Integration](#react-native-integration)  
8. [Wallet Adapter Setup](#wallet-adapter-setup)  
9. [Error Handling](#error-handling)  
10. [Security Best Practices](#security-best-practices)  
11. [Full Example App](#full-example-app)

---

## Overview

The **Styx Privacy Standard (SPS)** enables private token operations on Solana. Users can:

- **Shield** tokens — move from public Solana accounts into the private SPS pool
- **Unshield** tokens — move from the private pool back to a public account
- **Private transfer** — send tokens between SPS addresses without revealing amounts
- **Private swap** — trade tokens in a privacy-preserving AMM

The **Umbra API** is a JSON-RPC + REST interface that provides:
- Full **Helius ZK Compression API** compatibility (25 endpoints)
- **DAS API** (Digital Asset Standard) for NFT/token queries
- **Styx Privacy Extensions** for shielded note queries, nullifier checks, pool stats

**Program ID:** `STYXbZeL1wcNigy1WAMFbUQ7PNzJpPYV557H7foNyY5`

---

## Architecture

```
┌─────────────────────────────┐
│     Android App (Kotlin)    │
│   ┌───────────────────┐     │
│   │ UmbraApiClient    │     │
│   │ (JSON-RPC / REST) │     │
│   └───────┬───────────┘     │
│           │                 │
│   ┌───────▼───────────┐     │
│   │ SolanaTransaction │     │
│   │ Builder + Signer  │     │
│   └───────┬───────────┘     │
└───────────┼─────────────────┘
            │ HTTPS
            ▼
┌───────────────────────────────────┐
│   Umbra API (api.styx.nexus/v1)  │
│   ┌─────────────────────────┐    │
│   │ ZK Compression RPC      │    │
│   │ DAS API                 │    │
│   │ Styx Privacy Extensions │    │
│   └─────────────────────────┘    │
│              │                   │
│   ┌──────────▼──────────┐        │
│   │ SPS Indexer Engine   │        │
│   │ (Mainnet Solana)     │        │
│   └─────────────────────┘        │
└───────────────────────────────────┘
```

---

## Kotlin Quick Start

### 1. Add Dependencies

```kotlin
// build.gradle.kts
dependencies {
    // Solana
    implementation("com.solana.mobile:web3-solana:0.2.6")
    
    // HTTP client
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")
}
```

### 2. Create the Umbra Client

```kotlin
import kotlinx.coroutines.*
import kotlinx.serialization.*
import kotlinx.serialization.json.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody

object UmbraApi {
    private const val BASE_URL = "https://api.styx.nexus/v1"
    private val client = OkHttpClient()
    private val json = Json { ignoreUnknownKeys = true }
    
    // ── JSON-RPC Call ─────────────────────────────────────────────────
    
    suspend fun rpc(method: String, params: JsonObject = buildJsonObject {}): JsonObject {
        return withContext(Dispatchers.IO) {
            val body = buildJsonObject {
                put("jsonrpc", "2.0")
                put("id", 1)
                put("method", method)
                put("params", params)
            }.toString()
            
            val request = Request.Builder()
                .url(BASE_URL)
                .post(body.toRequestBody("application/json".toMediaType()))
                .build()
            
            val response = client.newCall(request).execute()
            val responseBody = response.body?.string() ?: throw Exception("Empty response")
            json.parseToJsonElement(responseBody).jsonObject
        }
    }
    
    // ── REST Call ──────────────────────────────────────────────────────
    
    suspend fun rest(endpoint: String, params: JsonObject = buildJsonObject {}): JsonObject {
        return withContext(Dispatchers.IO) {
            val request = Request.Builder()
                .url("$BASE_URL/$endpoint")
                .post(params.toString().toRequestBody("application/json".toMediaType()))
                .build()
            
            val response = client.newCall(request).execute()
            json.parseToJsonElement(response.body?.string() ?: "{}").jsonObject
        }
    }
}
```

### 3. Query Shielded Notes

```kotlin
// Get all shielded notes for a wallet
suspend fun getShieldedNotes(owner: String): List<ShieldedNote> {
    val result = UmbraApi.rpc("getShieldedNotesByOwner", buildJsonObject {
        put("owner", owner)
    })
    
    val items = result["result"]
        ?.jsonObject?.get("value")
        ?.jsonObject?.get("items")
        ?.jsonArray ?: return emptyList()
    
    return items.map { item ->
        val obj = item.jsonObject
        ShieldedNote(
            id = obj["id"]?.jsonPrimitive?.content ?: "",
            mint = obj["mint"]?.jsonPrimitive?.content ?: "",
            amount = obj["amount"]?.jsonPrimitive?.content ?: "0",
            commitment = obj["commitment"]?.jsonPrimitive?.content ?: "",
            spent = obj["spent"]?.jsonPrimitive?.boolean ?: false,
        )
    }
}

@Serializable
data class ShieldedNote(
    val id: String,
    val mint: String,
    val amount: String,
    val commitment: String,
    val spent: Boolean,
)
```

---

## JSON-RPC Client Setup

All Umbra API methods use the standard JSON-RPC 2.0 protocol:

```
POST https://api.styx.nexus/v1
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "<method_name>",
  "params": { ... }
}
```

**Response format:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "context": { "slot": 123456 },
    "value": { ... }
  },
  "id": 1
}
```

All methods are also available as REST POST endpoints:
```
POST https://api.styx.nexus/v1/<method_name>
Content-Type: application/json

{ ... params ... }
```

---

## Core Operations

### Shield Tokens

Shielding moves tokens from a public Solana account into the SPS privacy pool.

```kotlin
import com.solana.publickey.SolanaPublicKey

// Build shield instruction (requires on-chain transaction)
suspend fun shieldTokens(
    payer: SolanaPublicKey,
    mint: String,
    amount: Long,
    noteCommitment: ByteArray,   // 32 bytes — sha256 of note plaintext
    encryptedNote: ByteArray      // AES-GCM encrypted note data
) {
    val programId = SolanaPublicKey.from("STYXbZeL1wcNigy1WAMFbUQ7PNzJpPYV557H7foNyY5")
    
    // Instruction discriminator: 0x07 (SHIELD)
    val data = ByteArray(1 + 32 + 32 + 8 + encryptedNote.size).apply {
        this[0] = 0x07  // SHIELD opcode
        System.arraycopy(mintToBytes(mint), 0, this, 1, 32)
        System.arraycopy(noteCommitment, 0, this, 33, 32)
        putLong(65, amount)
        System.arraycopy(encryptedNote, 0, this, 73, encryptedNote.size)
    }
    
    // Build Solana transaction with this instruction
    // Sign with the payer's wallet (Phantom, Solflare, etc.)
}
```

After shielding, verify it was indexed:

```kotlin
suspend fun verifyShield(owner: String, mint: String): Boolean {
    val notes = getShieldedNotes(owner)
    return notes.any { it.mint == mint && !it.spent }
}
```

### Unshield Tokens

Unshielding moves tokens from the SPS privacy pool back to a public account.

```kotlin
// After building and sending the unshield transaction on-chain,
// verify it was processed via the Umbra API:
suspend fun checkNullifier(nullifier: String): Boolean {
    val result = UmbraApi.rpc("getNullifierStatus", buildJsonObject {
        put("nullifier", nullifier)
    })
    return result["result"]
        ?.jsonObject?.get("value")
        ?.jsonObject?.get("spent")
        ?.jsonPrimitive?.boolean ?: false
}
```

### Private Transfer

```kotlin
// Private transfers happen entirely on-chain.
// Use the SDK to build the instruction, then query results:
suspend fun getTokenBalances(owner: String): List<TokenBalance> {
    val result = UmbraApi.rpc("getCompressedTokenBalancesByOwnerV2", buildJsonObject {
        put("owner", owner)
    })
    
    val balances = result["result"]
        ?.jsonObject?.get("value")
        ?.jsonObject?.get("tokenBalances")
        ?.jsonArray ?: return emptyList()
    
    return balances.map { b ->
        val obj = b.jsonObject
        TokenBalance(
            mint = obj["mint"]?.jsonPrimitive?.content ?: "",
            balance = obj["balance"]?.jsonPrimitive?.content ?: "0",
            symbol = obj["symbol"]?.jsonPrimitive?.content ?: "",
            decimals = obj["decimals"]?.jsonPrimitive?.int ?: 0,
        )
    }
}

data class TokenBalance(
    val mint: String,
    val balance: String,
    val symbol: String,
    val decimals: Int,
)
```

### Private Swap

```kotlin
// Query available AMM pools:
suspend fun getPoolStats(): PoolStats {
    val result = UmbraApi.rpc("getPrivacyPoolStats", buildJsonObject {})
    val value = result["result"]?.jsonObject?.get("value")?.jsonObject
    
    return PoolStats(
        totalPools = value?.get("totalPools")?.jsonPrimitive?.int ?: 0,
        totalEvents = value?.get("totalEvents")?.jsonPrimitive?.int ?: 0,
    )
}

data class PoolStats(val totalPools: Int, val totalEvents: Int)
```

---

## Querying Account State

### Compressed Account Query

```kotlin
// Get a compressed account by hash
suspend fun getCompressedAccount(hash: String): CompressedAccount? {
    val result = UmbraApi.rpc("getCompressedAccount", buildJsonObject {
        put("hash", hash)
    })
    
    val value = result["result"]?.jsonObject?.get("value") ?: return null
    if (value is JsonNull) return null
    
    val obj = value.jsonObject
    return CompressedAccount(
        hash = obj["hash"]?.jsonPrimitive?.content ?: "",
        lamports = obj["lamports"]?.jsonPrimitive?.content ?: "0",
        slotCreated = obj["slotCreated"]?.jsonPrimitive?.int ?: 0,
    )
}

data class CompressedAccount(
    val hash: String,
    val lamports: String,
    val slotCreated: Int,
)
```

### Batch Queries

```kotlin
// Get multiple accounts in one request
suspend fun getMultipleAccounts(hashes: List<String>) {
    val result = UmbraApi.rpc("getMultipleCompressedAccounts", buildJsonObject {
        putJsonArray("hashes") { hashes.forEach { add(it) } }
    })
    // result.value.items = [Account | null, ...]
}

// Batch nullifier checks
suspend fun checkNullifiers(nullifiers: List<String>) {
    val result = UmbraApi.rpc("getNullifierStatus", buildJsonObject {
        putJsonArray("nullifiers") { nullifiers.forEach { add(it) } }
    })
    // result.value = [{ nullifier, spent: bool }, ...]
}
```

### Transaction History

```kotlin
// Get recent compression signatures
suspend fun getRecentSignatures(limit: Int = 20): List<String> {
    val result = UmbraApi.rpc("getLatestCompressionSignatures", buildJsonObject {
        put("limit", limit)
    })
    
    return result["result"]
        ?.jsonObject?.get("value")
        ?.jsonObject?.get("items")
        ?.jsonArray
        ?.map { it.jsonObject["signature"]?.jsonPrimitive?.content ?: "" }
        ?: emptyList()
}

// Get transaction details with compression info
suspend fun getTransactionDetails(signature: String) {
    val result = UmbraApi.rpc("getTransactionWithCompressionInfo", buildJsonObject {
        put("signature", signature)
    })
    // result.value.compressionInfo.openedAccounts / closedAccounts
    // result.value.explorerUrl → link to Styx Explorer
}
```

---

## React Native Integration

If your Android app uses React Native, install the SDK directly:

```bash
npm install @styx-stack/sps-sdk @solana/web3.js
```

```typescript
import { SpsClient } from '@styx-stack/sps-sdk';
import { Connection, Keypair } from '@solana/web3.js';

const connection = new Connection('https://api.styx.nexus/rpc');
const wallet = Keypair.fromSecretKey(/* ... */);

const client = new SpsClient(connection, wallet);

// Shield 1000 BONK
const sig = await client.shield(
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK mint
  1000n,
);
console.log('Shield tx:', sig);
```

---

## Wallet Adapter Setup

### Phantom / Solflare Mobile Deep Links

```kotlin
// Connect to Phantom on Android
fun connectPhantom(context: Context) {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(
        "https://phantom.app/ul/v1/connect?" +
        "app_url=https://yourapp.com&" +
        "redirect_link=yourapp://callback&" +
        "cluster=mainnet-beta"
    ))
    context.startActivity(intent)
}
```

### Solana Mobile Wallet Adapter

```kotlin
// Using Solana Mobile Wallet Adapter for transaction signing
// After building the SPS instruction, submit via the wallet adapter:
val signedTx = walletAdapter.signTransaction(transaction)
val signature = connection.sendRawTransaction(signedTx.serialize())
```

---

## Error Handling

```kotlin
sealed class UmbraError(message: String) : Exception(message) {
    class MethodNotFound(method: String) : UmbraError("Method not found: $method")
    class ServerError(message: String) : UmbraError("Server error: $message")
    class NetworkError(cause: Throwable) : UmbraError("Network error: ${cause.message}")
}

suspend fun safeRpc(method: String, params: JsonObject): Result<JsonObject> {
    return try {
        val response = UmbraApi.rpc(method, params)
        
        val error = response["error"]?.jsonObject
        if (error != null) {
            val code = error["code"]?.jsonPrimitive?.int ?: -1
            val message = error["message"]?.jsonPrimitive?.content ?: "Unknown"
            when (code) {
                -32601 -> Result.failure(UmbraError.MethodNotFound(method))
                else -> Result.failure(UmbraError.ServerError(message))
            }
        } else {
            Result.success(response)
        }
    } catch (e: Exception) {
        Result.failure(UmbraError.NetworkError(e))
    }
}
```

**Common Error Codes:**

| Code | Meaning |
|------|---------|
| `-32601` | Method not found |
| `-32000` | Server/indexer error |
| `-32602` | Invalid params |

---

## Security Best Practices

1. **Never store private keys in the app.** Use Solana Mobile Wallet Adapter or deep links to Phantom/Solflare.

2. **Pin the TLS certificate** for `api.styx.nexus` in production.

3. **Validate all response data** before rendering (malformed JSON, missing fields).

4. **Use read-only queries** via Umbra API. Transaction signing must happen in the user's wallet.

5. **Rate limiting:** The API allows up to 100 requests/second per IP. Use batch endpoints (`getMultipleCompressedAccounts`, batch `getNullifierStatus`) to reduce call count.

6. **Commitment encryption:** Note commitments must be computed client-side using `sha256(owner || mint || amount || nonce)`. Never send plaintext amounts to the API.

---

## Full Example App

```kotlin
class PrivacyDashboardViewModel : ViewModel() {
    
    private val _balances = MutableStateFlow<List<TokenBalance>>(emptyList())
    val balances: StateFlow<List<TokenBalance>> = _balances.asStateFlow()
    
    private val _poolStats = MutableStateFlow<PoolStats?>(null)
    val poolStats: StateFlow<PoolStats?> = _poolStats.asStateFlow()
    
    fun loadDashboard(walletAddress: String) {
        viewModelScope.launch {
            // Load balances and pool stats in parallel
            val balancesDeferred = async { getTokenBalances(walletAddress) }
            val statsDeferred = async { getPoolStats() }
            
            _balances.value = balancesDeferred.await()
            _poolStats.value = statsDeferred.await()
        }
    }
    
    fun checkHealth() {
        viewModelScope.launch {
            val health = UmbraApi.rpc("getIndexerHealth")
            // health.result == "ok"
        }
    }
}
```

---

## API Quick Reference

| Method | Description |
|--------|-------------|
| `getShieldedNotesByOwner` | List shielded notes for a wallet |
| `getNullifierStatus` | Check if a nullifier is spent |
| `getPrivacyPoolStats` | Privacy pool statistics |
| `getCompressedAccount` | Get compressed account by hash |
| `getCompressedTokenBalancesByOwnerV2` | Token balances with metadata |
| `getLatestCompressionSignatures` | Recent transaction signatures |
| `getTransactionWithCompressionInfo` | Transaction details |
| `getIndexerHealth` | API health check |

**Full method list:** `GET https://api.styx.nexus/v1/methods`  
**Machine-readable docs:** `GET https://api.styx.nexus/v1/llms.txt`

---

*Styx Privacy Standard — Built by Bluefoot Labs (@moonmanquark)*
