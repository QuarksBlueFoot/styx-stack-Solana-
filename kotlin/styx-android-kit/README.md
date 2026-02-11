# Styx Android Kit — Kotlin Multiplatform SDK

Modern Kotlin Multiplatform SDK for the Styx Privacy Standard (SPS) on Solana.

## Architecture

```
styx-android-kit/
├── styx-core/         # Constants, types, base58, domains
├── styx-crypto/       # X25519, AES-GCM, SHA-256, Keccak, Double Ratchet, X3DH
├── styx-messaging/    # Private messaging, chunk frames, envelope format
├── styx-privacy/      # Stealth addresses, commitments, shielded pool
├── styx-sps/          # On-chain instruction builders (all 20 domains)
├── styx-client/       # Coroutine-based RPC + indexer client
└── styx-android/      # Android: Compose UI, MWA, secure storage
```

## Tech Stack

| Component | Version |
|-----------|---------|
| Kotlin | 2.1.0 (K2 compiler) |
| Coroutines | 1.10.1 |
| Serialization | 1.8.0 |
| DateTime | 0.6.1 |
| Gradle | 8.12 |
| AGP | 8.7.3 |
| Min SDK | 26 |
| Target SDK | 34 |
| Bouncy Castle | 1.80 |
| Ktor | 3.1.1 |
| Compose | 1.7.6 + Material3 1.3.1 |
| MWA | 2.1.0 |

## Program IDs (Mainnet)

| Program | Address |
|---------|---------|
| SPS | `STYXbZeL1wcNigy1WAMFbUQ7PNzJpPYV557H7foNyY5` |
| StyxZK | `FERRYpEo4dPbJZYqUfpkWHEMQCCs33Vm3TwBLZpBovXM` |
| WhisperDrop | `dropgR8h8axS4FrQ7En1YRnevHcUmkGoNLBrJaLMPsf` |

## Quick Start

```kotlin
// Create the Styx SDK instance
val styx = StyxKit.create(
    signerPubkey = myPublicKey,
    x25519Secret = myX25519SecretKey,
    rpcUrl = "https://api.mainnet-beta.solana.com"
)

// Send an encrypted message
val (envelope, msgNum) = styx.messaging.encryptMessage(
    recipient = recipientPubkey,
    recipientX25519Key = theirX25519Public,
    content = "Hello from KMP!"
)

// Listen for incoming messages (Flow-based)
styx.messageFlow().collect { msg ->
    println("${msg.sender}: ${msg.content}")
}

// Shield tokens (build instruction data)
val ix = SpsInstructions.stsShieldWithInit(
    mint = tokenMintBytes,
    amount = 1_000_000_000L,  // 1 SOL
    commitment = CommitmentScheme.generateCommitment(amount, ownerPubkey, randomness).data
)

// Close when done
styx.close()
```

## Android Integration Guide

See [packages/styx-android-kit/ANDROID_INTEGRATION_GUIDE.md](packages/styx-android-kit/ANDROID_INTEGRATION_GUIDE.md) for full Kotlin setup instructions covering Signal-style messaging (X3DH + Double Ratchet), private transfers, and on-chain rail selection.

## Modules

### styx-core
Foundation types shared by all modules:
- `PublicKey` (inline value class with Base58)
- `StyxConstants` (all program IDs, RPC URLs)
- `SpsDomains` (20 domain constants + ACTIVE/DEAD sets)
- `StyxResult<T>` sealed class for error handling

### styx-crypto
Platform-abstracted cryptography via `expect`/`actual`:
- **X25519** key exchange (Bouncy Castle on JVM)
- **AES-256-GCM** authenticated encryption
- **SHA-256**, **HMAC-SHA256**, **Keccak-256**
- **Double Ratchet** with forward secrecy (matches TypeScript crypto-core)
- **X3DH** key agreement protocol
- **Commitment/Nullifier** generation for shielded pool

### styx-messaging
End-to-end encrypted messaging:
- `PrivateMessagingClient` — coroutine-native, thread-safe (Mutex)
- `StyxEnvelope` — versioned binary envelope format
- `ChunkFrame` — large message chunking (STYXCHUNK1 protocol)
- `RailSelect` — memo vs. PMP rail selection

### styx-privacy
Shielded pool and stealth address operations:
- `ShieldedPool` — create shielded notes, derive nullifiers
- `StealthAddress` — DKSAP stealth address generation/scanning
- `CommitmentScheme` — Merkle tree operations

### styx-sps
On-chain instruction builders for all SPS domains:
- Complete op-code mapping (STS, DAM, IC, VSL, Messaging, etc.)
- `SpsInstructions.parseInstruction()` — decode any SPS instruction
- KMP-compatible (no java.nio, uses ByteArray DSL)

### styx-client
Network client with structured concurrency:
- `StyxClient` — Solana RPC + SPS indexer
- Automatic retry with exponential backoff
- `StyxHttpClient` expect/actual (Ktor CIO on JVM)
- Flow-based event streaming

### styx-android
Android-specific integration:
- **Jetpack Compose** components (ShieldButton, PrivacyStatusCard, MessageBubble)
- **Mobile Wallet Adapter** (MWA 2.1.0) integration
- **Android Keystore** secure storage (EncryptedSharedPreferences)
- `StyxKit` — top-level SDK entry point

## Building

```bash
cd packages/styx-android-kit
./gradlew build
```

## License

BSL 1.1 — see root LICENSE
