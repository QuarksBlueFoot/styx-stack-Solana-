# Android Native Integration â€” Styx KMP SDK

## Kotlin Multiplatform SDK for Solana Privacy on Android

This guide covers integrating the **Styx Android Kit** â€” a Kotlin Multiplatform SDK targeting Android (Jetpack Compose) and JVM. It provides full Solana Mobile MWA 2.1 integration, privacy-preserving transactions, encrypted messaging, and an offline-first transaction outbox.

> **SDK Group:** `nexus.styx`  
> **Kotlin:** 2.1.0 (K2 compiler)  
> **MWA:** 2.1.0  
> **Minimum Android:** API 24 (Android 7.0)  
> **Compile SDK:** 35 (Android 15)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Module Architecture](#module-architecture)
3. [Wallet Connection (MWA 2.1)](#wallet-connection-mwa-21)
4. [Privacy Sign-In (PSIN1)](#privacy-sign-in-psin1)
5. [Sending Transactions](#sending-transactions)
6. [Offline Outbox](#offline-outbox)
7. [Encrypted Messaging](#encrypted-messaging)
8. [Compose UI Components](#compose-ui-components)
9. [Secure Storage](#secure-storage)
10. [Migration from nexus.styx](#migration-from-nexusstyx)
11. [TypeScript SDK Parity](#typescript-sdk-parity)

---

## Quick Start

### 1. Add Dependencies

```kotlin
// build.gradle.kts (app)
plugins {
    id("com.android.application")
    kotlin("android")
    kotlin("plugin.serialization") version "2.1.0"
}

android {
    compileSdk = 35
    defaultConfig { minSdk = 26 }
}

dependencies {
    // Styx KMP SDK â€” single dependency pulls in all modules
    implementation("nexus.styx:styx-android:1.3.0")
    
    // App Kit â€” UI components and presets
    implementation("nexus.styx:styx-app-kit:1.3.0")
    
    // Envelope â€” encrypted message format
    implementation("nexus.styx:styx-envelope:1.3.0")
}
```

### 2. Initialize StyxKit

```kotlin
import nexus.styx.mobile.StyxKit
import nexus.styx.mobile.StyxClientConfig

class MyApp : Application() {
    lateinit var styx: StyxKit
    
    override fun onCreate() {
        super.onCreate()
        styx = StyxKit.create(
            context = this,
            config = StyxClientConfig(
                rpcUrl = "https://api.mainnet-beta.solana.com",
                indexerUrl = "https://api.styx.nexus",
            ),
            cluster = "mainnet-beta",
        )
    }
}
```

---

## Module Architecture

The SDK is organized as 7 Kotlin Multiplatform modules:

```
styx-android-kit/
â”œâ”€â”€ styx-core        â€” PublicKey, Keypair, StyxResult, Base58, type system
â”œâ”€â”€ styx-crypto      â€” X25519, Ed25519, XChaCha20, SHA-256, X3DH, Double Ratchet
â”œâ”€â”€ styx-messaging   â€” PrivateMessagingClient, encrypted messaging protocol
â”œâ”€â”€ styx-privacy     â€” ShieldedPool, StealthAddress, commitment/nullifier math
â”œâ”€â”€ styx-sps         â€” SPS instruction codec, 16 compact domains + 3 special modes
â”œâ”€â”€ styx-client      â€” Solana RPC + SPS indexer client with retry/backoff
â””â”€â”€ styx-android     â€” Android-specific: MWA 2.1, Compose UI, Secure Storage, Outbox
```

| Module | Target | Description |
|--------|--------|-------------|
| `styx-core` | common | Core types, PublicKey, Keypair, StyxResult, Base58 |
| `styx-crypto` | common | All cryptography: X25519, Ed25519, XChaCha20-Poly1305, X3DH, Double Ratchet |
| `styx-messaging` | common | Encrypted messaging client, prekey bundles, ratchet sessions |
| `styx-privacy` | common | Shielded pool operations, stealth addresses, commitment math |
| `styx-sps` | common | SPS instruction parser/builder for all 16 compact domains + 3 special modes |
| `styx-client` | common | Coroutine-native RPC/indexer client with `Flow`-based events |
| `styx-android` | Android | MWA 2.1, Compose components, EncryptedSharedPreferences, Outbox |

**Program ID:** `STYXbZeL1wcNigy1WAMFbUQ7PNzJpPYV557H7foNyY5`

---

## Wallet Connection (MWA 2.1)

Full Solana Mobile Wallet Adapter 2.1 integration using the `transact{}` block pattern:

```kotlin
import com.styx.android.mwa.StyxMwaClient
import com.solana.mobilewalletadapter.clientlib.ActivityResultSender

// In your Activity/Fragment
val mwa = StyxMwaClient(cluster = "mainnet-beta")

// Or use StyxKit (recommended)
val styx = (application as MyApp).styx

// Connect
val sender: ActivityResultSender = /* from your Activity */
val result = styx.connect(sender)
result.onSuccess { pubkey ->
    Log.d("Styx", "Connected: ${pubkey.toBase58()}")
}
result.onError { msg, _ ->
    Log.e("Styx", "Connection failed: $msg")
}

// Disconnect
styx.disconnect(sender)
```

### Reauthorization (Session Resume)

```kotlin
// Resume a previous session without full auth prompt
styx.reconnect(sender).onSuccess { pubkey ->
    Log.d("Styx", "Reconnected: ${pubkey.toBase58()}")
}
```

### Direct MWA Access

For advanced flows, access the MWA client directly:

```kotlin
val mwa = styx.mwa

// Sign and send multiple transactions
val txs = listOf(shieldTxBytes, messageTxBytes)
mwa.signAndSendTransactions(sender, txs).onSuccess { result ->
    result.signatures.forEach { sig ->
        Log.d("Styx", "Sent: $sig")
    }
}

// Sign without sending (for inspection)
mwa.signTransactions(sender, txs).onSuccess { result ->
    // Submit manually via RPC
    result.signedTransactions.forEach { signedTx ->
        styx.client.sendTransaction(signedTx)
    }
}
```

---

## Privacy Sign-In (PSIN1)

PSIN1 is the Styx privacy attestation protocol â€” wire-compatible with the TypeScript `@styx/solana-mobile-dropin/mwaSignIn`:

```kotlin
// One-liner via StyxKit
styx.privacySignIn(
    sender = sender,
    domain = "mydapp.com",
    nonce = UUID.randomUUID().toString(),
).onSuccess { result ->
    val signedPayload = result.signedPayloads.first()
    // Send to your backend for verification
}

// Manual PSIN1 payload construction
val payload = StyxMwaClient.PrivacySignInPayload(
    domain = "mydapp.com",
    nonce = "random-nonce-123",
    issuedAt = Instant.now().toString(),
    statement = "Sign in with Styx Privacy",
    resources = listOf("https://mydapp.com/api"),
)
val message = styx.mwa.buildPrivacySignInMessage(payload)
styx.mwa.signMessages(sender, listOf(message))
```

---

## Sending Transactions

### Direct Send (Online)

```kotlin
// Build your transaction (shield, message, transfer, etc.)
val serializedTx: ByteArray = buildShieldTransaction(...)

// Sign + send via wallet (preferred â€” single approval)
styx.signAndSend(sender, serializedTx).onSuccess { sig ->
    Log.d("Styx", "Confirmed: $sig")
}
```

### Observe Transaction State

```kotlin
// In Compose
val txState by styx.transactionState.collectAsState()

TransactionStatusCard(
    state = txState,
    signature = lastSignature,
    onRetry = { /* retry logic */ },
)
```

---

## Offline Outbox

Offline-first transaction queue matching `@styx/mobile-outbox`:

```kotlin
// Queue transactions while offline
styx.enqueueTransaction(serializedTx, label = "Shield 1 SOL")
styx.enqueueTransaction(messageTx, label = "Send encrypted message")

// Observe queue state in Compose
val queue by styx.outbox.queueState.collectAsState()
Text("${queue.size} transactions pending")

// Drain when online
styx.drainOutbox(sender)

// Direct outbox access for advanced control
styx.outbox.drain { txBytes ->
    // Custom send logic
    styx.mwa.signAndSendTransaction(sender, txBytes).getOrThrow()
}
```

---

## Encrypted Messaging

Uses the Signal Protocol (X3DH + Double Ratchet) from the `styx-messaging` module:

```kotlin
import com.styx.messaging.PrivateMessagingClient

// The messaging client is available via styx-messaging module
// See ANDROID_MESSAGING_GUIDE.md for the complete protocol walkthrough
```

---

## Compose UI Components

The SDK ships Material 3 Compose components following the Solana App Kit scaffold pattern:

### WalletConnectButton

```kotlin
val connectionState by styx.connectionState.collectAsState()

WalletConnectButton(
    connected = connectionState == ConnectionState.CONNECTED,
    walletAddress = styx.walletAddress,
    onConnect = { scope.launch { styx.connect(sender) } },
    onDisconnect = { scope.launch { styx.disconnect(sender) } },
    walletName = "Phantom",
)
```

### AddressDisplay

```kotlin
AddressDisplay(
    address = styx.walletAddress ?: "",
    label = "Wallet",
    copyable = true,
)
```

### TransactionStatusCard

```kotlin
val txState by styx.transactionState.collectAsState()

TransactionStatusCard(
    state = txState,
    signature = "5xY...",
    errorMessage = if (txState == TransactionState.FAILED) "Network error" else null,
    onRetry = { /* retry */ },
)
```

### ShieldButton / UnshieldButton / PrivacyStatusCard / EncryptedMessageBubble

```kotlin
ShieldButton(
    mint = myMintPubkey,
    amount = 1_000_000_000L, // 1 SOL
    onShield = { mint, amount -> scope.launch { shieldTokens(mint, amount) } },
    loading = isShielding,
)

PrivacyStatusCard(
    shieldedBalance = 5_000_000_000L,
    publicBalance = 2_000_000_000L,
    poolCount = 3,
)

EncryptedMessageBubble(
    content = "Hello, private world!",
    isSentByMe = true,
    timestamp = System.currentTimeMillis(),
)
```

---

## Secure Storage

All secrets are stored in Android Keystore-backed `EncryptedSharedPreferences`:

```kotlin
val storage = styx.storage

// Store/retrieve keys
storage.putBytes(StyxSecureStorage.Keys.X25519_SECRET, secretKeyBytes)
val secretKey = storage.getBytes(StyxSecureStorage.Keys.X25519_SECRET)

// Namespaced storage (per-feature isolation)
val ratchetStore = storage.namespace("ratchet")
ratchetStore.putBytes("session_alice", ratchetState)
```

Uses `MasterKey.Builder` with `AES256_GCM` key scheme (non-deprecated API).

---

## Migration Notes

The SDK uses Maven group ID `nexus.styx` (the namespace we own on Maven Central):

| Artifact | Maven Coordinates |
| styx-android | `nexus.styx:styx-android:1.3.0` |
| styx-app-kit | `nexus.styx:styx-app-kit:1.3.0` |
| styx-envelope | `nexus.styx:styx-envelope:1.3.0` |

### Version History
| Version | Changes |
|---------|--------|
| 1.3.0 | Current release, full mainnet support |
| 1.1.0 | Initial Maven Central release |

### Code Changes

```diff
- import com.styx.android.StyxMobileWallet
+ import nexus.styx.mobile.StyxMwaClient

- val wallet = StyxMobileWallet(activity)
- wallet.connect()
+ val styx = StyxKit.create(context)
+ styx.connect(activityResultSender)

- wallet.signAndSend(tx)
+ styx.signAndSend(sender, serializedTx)
```

> **See also:** [ANDROID_WALLET_INTEGRATION.md](./ANDROID_WALLET_INTEGRATION.md) for a complete guide covering compression, private transfers, encrypted messaging, and all LIVE mainnet features.

---

## TypeScript SDK Parity

The Kotlin KMP SDK maintains feature parity with the TypeScript monorepo:

| TypeScript Package | Kotlin Module | Status |
|--------------------|---------------|--------|
| `@styx/crypto-core` | `styx-crypto` | âœ… Full parity |
| `@styx/onchain-messaging` | `styx-messaging` + `styx-sps` | âœ… Full parity |
| `@styx/solana-mobile-dropin` | `styx-android` (StyxMwaClient) | âœ… Full parity |
| `@styx/wallet-adapters` | `styx-android` (StyxKit) | âœ… Full parity |
| `@styx/mobile-outbox` | `styx-android` (StyxOutbox) | âœ… Full parity |
| `@styx/styx-context` | `styx-android` (StyxKit) | âœ… Full parity |
| `@styx/presets` | `styx-android` (StyxKit) | âœ… Full parity |
| `@styx/styx-pmp-sdk` | `styx-sps` | âœ… Full parity |
| `@styx/key-registry` | `styx-messaging` | âœ… Full parity |
| `@styx/tx-tooling` | `styx-client` | âœ… Full parity |
| `@styx/privacy-diagnostics` | â€” | ðŸ”œ Planned |
| `@styx/policy-kit` | â€” | ðŸ”œ Planned |
| `@styx/game-privacy` | â€” | ðŸ”œ Planned |
| `@styx/confidential-tokens` | â€” | ðŸ”œ Planned |
| `@styx/social-privacy` | â€” | ðŸ”œ Planned |

---

## Version Matrix

| Component | Version |
|-----------|---------|
| Kotlin | 2.1.0 (K2) |
| AGP | 8.7.3 |
| Compose UI | 1.7.6 |
| Material 3 | 1.3.1 |
| Coroutines | 1.10.1 |
| Ktor | 3.1.1 |
| MWA clientlib-ktx | 2.1.0 |
| Security Crypto | 1.1.0-alpha06 |
| BouncyCastle | 1.80 |
| compileSdk | 35 |
| minSdk | 26 |
| targetSdk | 35 |

---

*Last updated: 2025 Â· Styx Privacy SDK Â· Bluefoot Labs*
