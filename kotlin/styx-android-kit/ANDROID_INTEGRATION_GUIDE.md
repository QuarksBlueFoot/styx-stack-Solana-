# Android Kotlin Integration Guide — Mainnet

This guide covers **mainnet-only** usage of the Styx KMP SDK:
1) Forward-secret Signal-style messaging (X3DH + Double Ratchet) via `styx-messaging`.
2) Private transfers (IAP-enforced) via `styx-privacy` + `styx-sps`.
3) Active vs dead domain reference.
4) Migration checklist — removing old program IDs, deprecated APIs, and devnet artifacts.

Applies to the Kotlin Multiplatform SDK in [packages/styx-android-kit](packages/styx-android-kit).  
Mainnet program: `STYXbZeL1wcNigy1WAMFbUQ7PNzJpPYV557H7foNyY5`

> **First release?** Skip straight to Sections 1–5. Section 7 (Migration) is only
> relevant if you previously integrated an older SDK version or devnet builds.

---

## 1) Dependencies (Gradle)

Add the kit modules you need:

```kotlin
// app/build.gradle.kts
repositories {
    mavenCentral() // nexus.styx artifacts
}

dependencies {
    // From Maven Central (nexus.styx group, v1.1.0+)
    implementation("nexus.styx:styx-core:1.1.0")
    implementation("nexus.styx:styx-crypto:1.1.0")
    implementation("nexus.styx:styx-messaging:1.1.0")
    implementation("nexus.styx:styx-privacy:1.1.0")
    implementation("nexus.styx:styx-sps:1.1.0")
    implementation("nexus.styx:styx-client:1.1.0")
    // Android-specific (Compose + MWA)
    implementation("nexus.styx:styx-android:1.1.0")
}
```

Or if building from source:

```kotlin
dependencies {
    implementation(project(":styx-core"))
    implementation(project(":styx-crypto"))
    implementation(project(":styx-messaging"))
    implementation(project(":styx-privacy"))
    implementation(project(":styx-sps"))
    implementation(project(":styx-client"))
}
```

> ⚠️ **Do NOT use the old `com.styx.sdk` Maven group or `com.styx.*` package imports.**
> Both are retired. Maven group and Kotlin packages are now both `nexus.styx`.

### Import Reference

| Gradle dependency | Kotlin import path | Key classes |
|-------------------|--------------------|-------------|
| `nexus.styx:styx-core` | `nexus.styx.core` | `PublicKey`, `SpsDomains`, `StyxConstants` |
| `nexus.styx:styx-crypto` | `nexus.styx.crypto` | `DoubleRatchet`, `X3dh`, `CommitmentScheme` |
| `nexus.styx:styx-messaging` | `nexus.styx.messaging` | `PrivateMessagingClient`, `MessagingConfig`, `ChunkFrame`, `RailSelect` |
| `nexus.styx:styx-privacy` | `nexus.styx.privacy` | `ShieldedPool`, `StealthAddress` |
| `nexus.styx:styx-sps` | `nexus.styx.sps` | `SpsInstructions`, `StsOps`, `DamOps`, `IcOps` |
| `nexus.styx:styx-client` | `nexus.styx.client` | `StyxHttpClient` |
| `nexus.styx:styx-android` | `nexus.styx.android` | `StyxKit`, `StyxMwaClient`, `StyxSecureStorage` |

The Maven group and Kotlin package namespace are both `nexus.styx` — no mismatch to worry about.

---

## 2) Key Material

You need two keypairs:
- **Signer** (Solana Ed25519) for transaction signing.
- **X25519** for messaging encryption.

`PrivateMessagingClient` expects:
- `x25519SecretKey: ByteArray` (32 bytes)
- `x25519PublicKey: ByteArray` (32 bytes)
- `signerPubkey: PublicKey`

---

## 3) Signal-Style Messaging (X3DH + Double Ratchet)

### 3.1 Initialize the client

```kotlin
import nexus.styx.core.PublicKey
import nexus.styx.messaging.MessagingConfig
import nexus.styx.messaging.PrivateMessagingClient

val messaging = PrivateMessagingClient(
    MessagingConfig(
        x25519SecretKey = myX25519Secret,
        x25519PublicKey = myX25519Public,
        signerPubkey = PublicKey(myEd25519PubkeyBytes)
    )
)
```

### 3.2 Encrypt a message (forward secrecy)

```kotlin
val (envelopeBytes, messageNumber) = messaging.encryptMessage(
    recipient = recipientPubkeyBase58,
    recipientX25519Key = recipientX25519Pubkey,
    content = "Hello from Android!"
)
```

### 3.3 Decrypt a message

```kotlin
val msg = messaging.decryptMessage(
    senderPubkey = senderPubkeyBase58,
    senderX25519Key = senderX25519Pubkey,
    envelopeData = incomingEnvelopeBytes
)
```

### 3.4 Persist Double Ratchet sessions

Persist session state per peer to avoid broken threads after app restart.

```kotlin
val snapshot = messaging.exportSession(peerPubkeyBase58)
// store snapshot (encrypted) in keystore/DB

// later
if (snapshot != null) messaging.importSession(peerPubkeyBase58, snapshot)
```

### 3.5 Chunking for large messages

```kotlin
import nexus.styx.messaging.ChunkFrame

val chunks = ChunkFrame.split(
    msgId = "${peerPubkeyBase58}:${messageNumber}",
    payload = envelopeBytes,
    contentType = "application/styx-envelope"
)

// send each chunk as a separate message payload
```

### 3.6 On-chain rail selection (Memo vs PMP)

```kotlin
import nexus.styx.messaging.RailSelect
import nexus.styx.messaging.RailPreference
import nexus.styx.messaging.RailSelectArgs

val rail = RailSelect.selectRail(
    RailSelectArgs(
        envelopeBytes = envelopeBytes.size,
        prefer = RailPreference.AUTO,
        pmpAvailable = true
    )
)
```

- **MEMO** rail: base64url envelope in a memo string.
- **PMP** rail: larger payloads via the Private Memo Program.

---

## 4) Private Transfers (Shielded Pool)

All transfer instructions target the **mainnet program only**:

```kotlin
import nexus.styx.core.StyxConstants

// Use ONLY the mainnet program ID
val programId = StyxConstants.SPS_PROGRAM_ID
// "STYXbZeL1wcNigy1WAMFbUQ7PNzJpPYV557H7foNyY5"
```

Do **not** use `StyxConstants.SPS_DEVNET_PROGRAM_ID` or `SolanaCluster.DEVNET.programId`
in production. The devnet program (`FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW`)
is a separate deployment with different state and should never appear in mainnet transactions.

### 4.1 Create a shielded note

```kotlin
import nexus.styx.privacy.ShieldedPool

val note = ShieldedPool.createShieldedNote(
    amount = 1_000_000L,
    ownerPubkey = ownerPubkeyBytes
)
```

### 4.2 Derive nullifier for spend

```kotlin
val spent = ShieldedPool.deriveNullifier(note, ownerSecretKeyBytes)
```

### 4.3 Build instruction data (mainnet — IAP enforced)

Mainnet requires **IAP** proofs for private transfers.  
The on-chain program enforces `STS_OP_IAP_TRANSFER` (0x1C); plain `TRANSFER` (0x06) is **not routed on mainnet**.

```kotlin
import nexus.styx.sps.SpsInstructions
import nexus.styx.sps.StsOps
import nexus.styx.core.SpsDomains

// Build the IAP transfer payload
val payload = buildPayload(168) {
    putBytes(nullifier)       // 32 bytes
    putLongLE(amount)         // 8 bytes LE
    putBytes(newCommitment)   // 32 bytes
    putBytes(schnorrProof96)  // 96 bytes
}
val data = SpsInstructions.buildCompact(
    SpsDomains.STS, StsOps.IAP_TRANSFER, payload
)
```

Wire format: `[0x01][0x1C][nullifier:32][amount:8][new_commitment:32][schnorr:96]`

Wrap the resulting `ByteArray` in your Solana instruction with the correct account metas.

> **Note:** `SpsInstructions.buildCompact()` is public. The `PayloadBuilder` is internal to
> `styx-sps`, so construct the payload `ByteArray` in your app code as shown above.

---

## 5) Mainnet Domain Reference

### Active Domains (routed to live handlers)

| Byte | Domain | Notes |
|------|--------|-------|
| 0x01 | **STS** | Token standard core — shield, unshield, IAP transfers, AMM |
| 0x02 | **MESSAGING** | Private messages, ratchet, prekey bundles |
| 0x03 | **ACCOUNT** | VTA, delegation, guardians, stealth |
| 0x04 | **VSL** | Virtual Shielded Ledger — deposit, withdraw, escrow |
| 0x05 | **NOTES** | On-chain encrypted notes |
| 0x06 | **COMPLIANCE** | Auditor reveals, proof-of-innocence |
| 0x07 | **PRIVACY** | Stealth addresses, decoy storms |
| 0x08 | **DEFI** | Private DeFi primitives |
| 0x09 | **NFT** | Private NFT mint/transfer/reveal |
| 0x0E | **DAM** | Deferred Account Materialization — virtual ↔ real tokens |
| 0x0F | **IC** | Inscription Compression — ZK-free compressed tokens |

Programmatic check: `SpsDomains.ACTIVE`

### Dead Domains (routed but ALL ops return `Err`)

| Byte | Domain | Reason |
|------|--------|--------|
| 0x0A | **DERIVATIVES** | Moved to StyxFi |
| 0x0B | **BRIDGE** | Deprecated |
| 0x0C | **SECURITIES** | Deprecated |
| 0x0D | **GOVERNANCE** | Moved to StyxFi v24 |
| 0x10 | **SWAP** | Archived — use STS AMM ops instead |
| 0x11 | **EASYPAY** | Moved to WhisperDrop as RESOLV |

Programmatic check: `SpsDomains.DEAD`

### Fail-Closed (not implemented)

| Byte | Mode | Notes |
|------|------|-------|
| 0x00 | **EXTENDED** | 8-byte sighash — reserved, always `Err` |
| 0xFE | **TLV** | Token-22 extension mode — reserved, always `Err` |
| 0xFF | **SCHEMA** | Inscription schema — reserved, always `Err` |

> **Guard your calls:** Always check `SpsDomains.DEAD.contains(domain)` before building
> instructions. Dead domains cost compute budget and always fail.

See [SPS_DOMAIN_ROUTER_AUDIT.md](../../SPS_DOMAIN_ROUTER_AUDIT.md) for the authoritative on-chain routing map.

---

## 6) Production Defaults

| Setting | Value |
|---------|-------|
| Maven group | `nexus.styx` (NOT `com.styx.sdk`) |
| Maven version | `1.1.0` |
| Program ID | `StyxConstants.SPS_PROGRAM_ID` — never the devnet ID |
| RPC endpoint | `https://api.mainnet-beta.solana.com` (or your dedicated RPC) |
| Transfer mode | **IAP only** (`StsOps.IAP_TRANSFER`, 0x1C) |
| Messaging rail | `RailSelect.AUTO` (MEMO < 566 bytes, PMP otherwise) |
| Session persistence | Export/import Double Ratchet per peer |
| Domain guard | Check `SpsDomains.DEAD` before every instruction build |

```kotlin
import nexus.styx.core.SpsDomains
import nexus.styx.core.StyxConstants

// 1. Always use mainnet program
val programId = StyxConstants.SPS_PROGRAM_ID

// 2. Defensive domain check before building any instruction
fun requireActiveDomain(domain: Byte) {
    require(!SpsDomains.DEAD.contains(domain)) {
        "Domain 0x${domain.toUByte().toString(16)} is dead on mainnet"
    }
}
```

---

## 7) Migration Checklist — Removing Old / Devnet Artifacts

If this is your **first integration**, you can skip this section. For anyone upgrading
from a pre-1.1.0 SDK or a devnet prototype, **complete every item below** before shipping.

### 7.1 Remove the old program ID

The devnet program is a **completely separate deployment** with its own state.
It must never appear in mainnet transaction builders, PDA derivations, or config files.

```diff
- import nexus.styx.core.SolanaCluster
- val programId = SolanaCluster.DEVNET.programId
- // "FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW"

+ import nexus.styx.core.StyxConstants
+ val programId = StyxConstants.SPS_PROGRAM_ID
+ // "STYXbZeL1wcNigy1WAMFbUQ7PNzJpPYV557H7foNyY5"
```

Search your codebase for these strings and **delete every occurrence**:

| Remove | Why |
|--------|-----|
| `FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW` | Devnet program ID |
| `SPS_DEVNET_PROGRAM_ID` | Devnet constant reference |
| `SolanaCluster.DEVNET.programId` | Devnet cluster helper |
| Any hardcoded `api.devnet.solana.com` RPC URLs | Devnet endpoint |

### 7.2 Remove the old Maven group

```diff
- implementation("com.styx.sdk:styx-core:1.0.0")
- implementation("com.styx.sdk:styx-sps:1.0.0")

+ implementation("nexus.styx:styx-core:1.1.0")
+ implementation("nexus.styx:styx-sps:1.1.0")
```

Also remove any `maven { url = "..." }` repository entries pointing to the old
`com.styx.sdk` staging repo or GitHub Packages snapshots.

### 7.3 Replace old `com.styx.*` package imports

The SDK package namespace was renamed from `com.styx.*` to `nexus.styx.*` in v1.1.0.
Using `com.styx.*` implied ownership of `styx.com`, which is not ours — the correct
reverse-domain for our `styx.nexus` domain is `nexus.styx`.

```diff
- import com.styx.core.PublicKey
- import com.styx.core.StyxConstants
- import com.styx.sps.SpsInstructions
- import com.styx.messaging.PrivateMessagingClient

+ import nexus.styx.core.PublicKey
+ import nexus.styx.core.StyxConstants
+ import nexus.styx.sps.SpsInstructions
+ import nexus.styx.messaging.PrivateMessagingClient
```

Every `com.styx.` import in your code must become `nexus.styx.` — a simple find-and-replace
handles it. The class names themselves are unchanged.

### 7.4 Remove deprecated API references

| Old (remove) | New (use instead) |
|--------------|--------------------|
| `SpsDomains.DOMAIN_STS` | `SpsDomains.STS` |
| `SpsDomains.DOMAIN_DAM` | `SpsDomains.DAM` |
| `SpsDomains.DOMAIN_IC` | `SpsDomains.IC` |
| `SpsDomains.DOMAIN_EXTENDED` | `SpsDomains.EXTENDED` |
| `SpsDomains.DOMAIN_TLV` | `SpsDomains.TLV` |
| `SpsDomains.DOMAIN_SCHEMA` | `SpsDomains.SCHEMA` |
| All `DOMAIN_*` prefixed constants | Plain name (e.g., `SpsDomains.MESSAGING`) |
| `SpsDomains.INACTIVE` | `SpsDomains.DEAD` |
| `AccountOps.VTA_REGISTRY_INIT_V2` at `0x30` | Now at `0x11` (paged bitset v7.1) |
| `StsOps.TRANSFER` (0x06) for private xfer | `StsOps.IAP_TRANSFER` (0x1C) — IAP enforced on mainnet |

### 7.5 Remove dead domain instruction builders

If you wrote custom builders for any dead domain, remove them entirely:

- **Governance** (0x0D) — all 6 ops return `Err`
- **EasyPay** (0x11) — all 19 ops return `Err`, moved to WhisperDrop
- **Swap** (0x10) — archived, use STS AMM ops (`CREATE_AMM_POOL`, `ADD_LIQUIDITY`, etc.)
- **Derivatives** (0x0A), **Bridge** (0x0B), **Securities** (0x0C) — deprecated

### 7.6 Grep audit

Run this across your codebase to catch any remaining devnet or old-SDK references:

```bash
# Find old program IDs
grep -rn "FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW" .
grep -rn "SPS_DEVNET_PROGRAM_ID" .
grep -rn "DEVNET" . --include="*.kt"

# Find old Maven group
grep -rn "com\.styx\.sdk" . --include="*.kts" --include="*.gradle"

# Find old package namespace
grep -rn "com\.styx\." . --include="*.kt"
grep -rn "com\.styx\." . --include="*.kts"

# Find old DOMAIN_ prefixed constants
grep -rn "DOMAIN_STS\|DOMAIN_DAM\|DOMAIN_IC\|DOMAIN_EXTENDED" . --include="*.kt"

# Find old INACTIVE set
grep -rn "SpsDomains\.INACTIVE" . --include="*.kt"
```

All of these should return **zero results** before you ship.
