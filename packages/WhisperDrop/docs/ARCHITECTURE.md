# Styx Stack - Architecture

## Core Tenets

### 1. Mobile-First
Every API is designed for mobile constraints:
- Minimal network calls
- Background-safe operations
- Small bundle sizes
- Offline-capable with queue/retry

### 2. Privacy by Default
Strong privacy guarantees out of the box:
- End-to-end encryption for all messaging
- Automatic key management
- Rail selection for best privacy option

### 3. Compliance Ready
Optional audit and disclosure features:
- Selective reveal of specific fields
- Audit key support for third-party visibility
- Policy hooks for app-level rules

### 4. Graceful Degradation
Handle feature-gated or unavailable rails:
- Automatic fallback to available rails
- Clear error codes for unsupported features
- Runtime capability detection

## Privacy Rails

Styx supports multiple "rails" for privacy:

| Rail | Privacy Level | Availability | Use Case |
|------|---------------|--------------|----------|
| Encrypted Memo | Medium | Always | Simple encrypted messages |
| Private Memo Program | High | Mainnet | Private transactions |
| Confidential Tokens | High | Gated | Private token transfers |
| Ephemeral Rollup | Very High | Operators | Gaming, high-frequency |
| ZK Compression | Medium | Indexer | Large state, cost savings |

## Package Layers

### Layer 1: Cryptographic Foundation
- `@styx/crypto-core` - Primitives (nacl, hashing, encoding)
- `@styx/secure-storage` - Mobile key storage

### Layer 2: Protocol Implementation
- `@styx/memo` - PMF1 binary format, Styx Envelope
- `@styx/private-memo-program-client` - PMP instruction builders
- `@styx/key-registry` - On-chain X25519 key registry

### Layer 3: Transaction Tooling
- `@styx/tx-tooling` - Rail adapters, batching, padding
- `@styx/onchain-messaging` - Inbox/outbox, chunking
- `@styx/confidential-tokens` - Token-2022 CT adapter

### Layer 4: Mobile Integration
- `@styx/mobile-toolkit` - Retry, connectivity, auto-lock
- `@styx/mobile-outbox` - Transaction queue
- `@styx/solana-mobile-dropin` - MWA helpers
- `@styx/rn-kit` - React Native components

### Layer 5: Application Harness
- `@styx/styx-context` - Unified context object
- `@styx/presets` - Opinionated defaults
- `@styx/policy-kit` - Compliance rules

## Wire Formats

### Styx Envelope v1
Binary envelope for all encrypted payloads:
```
[MAGIC:4][VERSION:1][KIND:1][FLAGS:2][ALGO:1][ID:32]
[OPTIONAL: toHash:32, from:32, nonce:var, body:var, aad:var, sig:var]
```

### PMF1 Binary
Private Memo Format for encrypted messages:
```
[MAGIC:4][VERSION:1][FLAGS:1][SENDER_PK:32][RECIPIENT_COUNT:2]
[RECIPIENTS...][CONTENT_NONCE:24][CIPHERTEXT:var][OPTIONAL...]
```

## Security Model

### Key Derivation
- Ed25519 wallet keys → X25519 encryption keys via standard conversion
- Per-message ephemeral keys for forward secrecy
- Deterministic key registry PDAs

### Encryption
- XSalsa20-Poly1305 (NaCl secretbox) for content
- X25519 (NaCl box) for key wrapping
- SHA-256 for message IDs and hashing

### Threat Model
- Protects message content from on-chain observers
- Does not hide: sender, recipient (unless stealth), timing, tx size
- Metadata minimization via padding and decoys (optional)
