# Styx ↔ Artemis drop-in (Kotlin / Solana Mobile)

This document is intentionally **practical**: the goal is that an Android team using
Artemis + Solana Mobile Wallet Adapter can add Styx privacy tooling in < 30 minutes.

## Upstream reference (for compatibility, not code)

Selenus/Artemis Kotlin Solana SDK:
- Repo: https://github.com/QuarksBlueFoot/Selenus-Artemis-Solana-SDK-
- Notable modules: `artemis-wallet-mwa-android`, `artemis-rpc`, `artemis-ws`, `artemis-vtx` citeturn1view0

---

## 1) Add the Styx Kotlin helper module (optional)

`kotlin/styx-android` is a minimal Kotlin module that:
- wraps Styx concepts (Outbox, receipts) into Kotlin-friendly APIs
- expects you already have MWA wiring through Artemis (or Solana Mobile SDK)
- never stores secrets outside the platform keystore / your choice

### Gradle (example)

```kotlin
dependencies {
  implementation("xyz.selenus:artemis-wallet-mwa-android:<latest>")
  implementation("xyz.selenus:artemis-rpc:<latest>")
  implementation(project(":styx-android"))
}
```

---

## 2) Outbox-first sending (Saga/Seeker reality)

Use Outbox always for:
- multi-instruction memo sends (chunked messages)
- user-prompted wallet sends (MWA)
- retry-able background sends

Flow:
1. build tx bytes (or v0 tx) in your app
2. `enqueue(...)`
3. `drain(...)` on a safe cadence (foreground resume, connectivity regained)

---

## 3) Inbox indexing (no infra)

Styx can scan confirmed transactions and find:
- memo program payloads
- private memo program payloads (if used)
- then decrypt + reassemble chunked messages locally

This is designed to work with:
- `Connection.getSignaturesForAddress`
- `getTransaction`
- and is compatible with typical Artemis RPC clients.

---

## 4) “Drop-in” philosophy

Styx is the privacy layer that plugs into:
- message envelopes
- local stores (secure storage)
- outbox + receipts
- policy hooks (selective reveal / audit keys)

If a team later wants a hosted relay, it remains in a separate folder/project.

