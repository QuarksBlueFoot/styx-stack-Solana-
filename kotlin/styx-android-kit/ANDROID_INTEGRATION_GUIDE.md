# Android Kotlin Integration Guide — Mainnet

This guide covers **mainnet-only** usage of the Styx KMP SDK:
1) Forward-secret Signal-style messaging (X3DH + Double Ratchet) via `styx-messaging`.
2) Private SOL & SPL transfers (IAP-enforced) via `styx-privacy` + `styx-sps`.
3) Private swaps (e.g. SOL → BONK without unshielding) via STS AMM.
4) Token compression (IC) — ZK-free compressed tokens.
5) Virtual balances (DAM) — deferred account materialization.
6) Shielded pools (VSL) — deposit, withdraw, escrow.
7) Stealth addresses — unlinkable payments.
8) Active vs dead domain reference (verified against on-chain `lib.rs`).
9) Migration checklist — removing old program IDs, deprecated APIs, and devnet artifacts.

Applies to the Kotlin Multiplatform SDK in [packages/styx-android-kit](packages/styx-android-kit).  
Mainnet program: `STYXbZeL1wcNigy1WAMFbUQ7PNzJpPYV557H7foNyY5`

> **First release?** Skip straight to Sections 1–9. Section 12 (Migration) is only
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

## 4) Private SOL Transfers (Shielded Pool)

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
    amount = 1_000_000L,        // 0.001 SOL in lamports
    ownerPubkey = ownerPubkeyBytes  // your 32-byte Ed25519 pubkey
)
// note.commitment = Pedersen commitment (published on-chain)
// note.randomness = blinding factor (keep secret!)
```

### 4.2 Shield (deposit into private pool)

```kotlin
import nexus.styx.sps.SpsInstructions

// Build the shield instruction data
val shieldData = SpsInstructions.stsShield(
    mint = solMintBytes,                    // 32-byte mint address
    amount = 1_000_000L,
    commitment = note.commitment.hexToBytes()
)
// Wire: [0x01][0x07][mint:32][amount:8][commitment:32]
// Wrap in a Solana TransactionInstruction and send
```

For first-time users without an existing pool account, use `stsShieldWithInit`:
```kotlin
val shieldData = SpsInstructions.stsShieldWithInit(
    mint = solMintBytes,
    amount = 1_000_000L,
    commitment = note.commitment.hexToBytes()
)
// Wire: [0x01][0x1F][mint:32][amount:8][commitment:32]
```

### 4.3 Private transfer (shield → shield, no unshield)

Mainnet requires **IAP** proofs for private transfers.  
The on-chain program enforces `STS_OP_IAP_TRANSFER` (0x1C); plain `TRANSFER` (0x06) is **not routed on mainnet**.

```kotlin
import nexus.styx.sps.SpsInstructions
import nexus.styx.sps.StsOps
import nexus.styx.core.SpsDomains

// 1. Derive nullifier from your note (proves ownership + prevents double-spend)
val spentNote = ShieldedPool.deriveNullifier(note, ownerSecretKeyBytes)

// 2. Build IAP transfer payload manually (PayloadBuilder is internal)
val payload = ByteArray(168)
spentNote.nullifier!!.hexToBytes().copyInto(payload, 0)       // nullifier: 32 bytes
amount.toLEBytes().copyInto(payload, 32)                       // amount: 8 bytes LE
newCommitmentBytes.copyInto(payload, 40)                       // new_commitment: 32 bytes
schnorrProof96.copyInto(payload, 72)                           // schnorr proof: 96 bytes

val data = SpsInstructions.buildCompact(
    SpsDomains.STS, StsOps.IAP_TRANSFER, payload
)
// Wire: [0x01][0x1C][nullifier:32][amount:8][new_commitment:32][schnorr:96]
```

### 4.4 Unshield (withdraw from private pool)

```kotlin
val unshieldData = SpsInstructions.stsUnshield(
    nullifier = spentNote.nullifier!!.hexToBytes(),
    recipient = recipientPubkeyBytes,   // 32-byte destination
    amount = 1_000_000L,
    proof = schnorrProof                // variable-length proof
)
// Wire: [0x01][0x08][nullifier:32][recipient:32][amount:8][proof:var]
```

### 4.5 Stealth unshield (withdraw to a stealth address)

```kotlin
val data = SpsInstructions.buildCompact(
    SpsDomains.STS, StsOps.STEALTH_UNSHIELD,
    // [nullifier:32][ephemeral_pubkey:32][encrypted_amount:32][proof:96]
    payload
)
// The recipient scans for their stealth address and claims
```

---

## 5) Private SPL Token Transfers

The same shield/transfer/unshield flow works for **any SPL token** — not just SOL.
Pass the SPL token's mint address instead of the native SOL mint.

```kotlin
// Example: shield 100 BONK into the private pool
val bonkMint = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
    .toBase58Bytes()

val shieldData = SpsInstructions.stsShield(
    mint = bonkMint,
    amount = 100_00000L,  // 100 BONK (5 decimals)
    commitment = note.commitment.hexToBytes()
)
```

After shielding, the private transfer and unshield instructions are identical —
the mint is bound to the commitment, so the pool tracks which token you deposited.

---

## 6) Private Swaps (SOL → BONK without unshielding)

This is the **key privacy innovation** — swap tokens without ever leaving the shielded pool.
Both input and output remain private. Uses constant-product AMM pools.

On-chain handlers (all live on mainnet):
- `process_sts_create_amm_pool` (L10976) — `StsOps.CREATE_AMM_POOL` (0x18)
- `process_sts_add_liquidity` (L11180) — `StsOps.ADD_LIQUIDITY` (0x19)
- `process_sts_private_swap` (L11059) — `StsOps.PRIVATE_SWAP` (0x17)

### 6.1 Create an AMM pool

```kotlin
import nexus.styx.sps.SpsInstructions
import nexus.styx.sps.StsOps
import nexus.styx.core.SpsDomains

// Create a SOL/BONK private AMM pool
val solMint = ByteArray(32) // native SOL mint
val bonkMint = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
    .toBase58Bytes()

val createPoolData = SpsInstructions.buildCompact(
    SpsDomains.STS, StsOps.CREATE_AMM_POOL,
    buildPayload(66) {
        putBytes(solMint)           // mint_a: 32 bytes
        putBytes(bonkMint)          // mint_b: 32 bytes
        putShortLE(30)              // fee: 30 bps (0.3%)
    }
)
// Wire: [0x01][0x18][mint_a:32][mint_b:32][fee_bps:2]
// Account metas: [signer, amm_pool_pda, system_program]
```

### 6.2 Add liquidity (deposit both sides)

```kotlin
val addLiqData = SpsInstructions.buildCompact(
    SpsDomains.STS, StsOps.ADD_LIQUIDITY,
    buildPayload(146) {
        putBytes(poolId)             // pool_id: 32 bytes
        putBytes(nullifierA)         // SOL note nullifier: 32 bytes
        putBytes(nullifierB)         // BONK note nullifier: 32 bytes
        putLongLE(amountSol)         // SOL amount: 8 bytes
        putLongLE(amountBonk)        // BONK amount: 8 bytes
        putBytes(lpCommitment)       // LP commitment: 32 bytes
    }
)
// Wire: [0x01][0x19][pool:32][null_a:32][null_b:32][amt_a:8][amt_b:8][lp_commit:32]
// Account metas: [signer, nullifier_a_pda, nullifier_b_pda, system_program]
```

### 6.3 Private swap (e.g. SOL → BONK)

```kotlin
val swapData = SpsInstructions.buildCompact(
    SpsDomains.STS, StsOps.PRIVATE_SWAP,
    buildPayload(150 + encryptedNote.size) {
        putBytes(poolId)             // pool_id: 32 bytes
        putBytes(inputMint)          // input mint (SOL): 32 bytes
        putBytes(inputNullifier)     // spending SOL note: 32 bytes
        putLongLE(inputAmount)       // SOL amount: 8 bytes
        putBytes(outputCommitment)   // new BONK commitment: 32 bytes
        putLongLE(minOutput)         // minimum BONK out (slippage): 8 bytes
        putIntLE(encryptedNote.size) // encrypted note length: 4 bytes
        putBytes(encryptedNote)      // encrypted output note: var
    }
)
// Wire: [0x01][0x17][pool:32][in_mint:32][nullifier:32][amount:8]
//       [out_commit:32][min_out:8][enc_len:4][enc_note:var]
// Account metas: [signer, amm_pool_pda, nullifier_pda, system_program]
```

**Flow summary:**
1. You have a shielded SOL note (from a previous `stsShield`)
2. `PRIVATE_SWAP` spends it (nullifier → double-spend prevention)
3. AMM applies constant-product formula, creates a new BONK commitment
4. You now have a private BONK note — never unshielded, never visible on-chain

> **Slippage:** Set `minOutput` to protect against front-running. If the pool
> can't satisfy `minOutput`, the transaction fails.

---

## 7) Token Compression (IC Domain)

Inscription Compression provides **ZK-free** compressed tokens — cheaper storage
via Merkle trees with privacy-preserving transfers.

On-chain handlers (all live):
- `process_ic_compress` (L13752) — `IcOps.COMPRESS` (0x11)
- `process_ic_decompress` (L13863) — `IcOps.DECOMPRESS` (0x12)
- `process_ic_transfer` (L14012) — `IcOps.TRANSFER` (0x13)
- `process_ic_private_transfer` (L14266) — `IcOps.PRIVATE_TRANSFER` (0x21)

### 7.1 Initialize a compression tree

```kotlin
import nexus.styx.sps.SpsInstructions

val treeData = SpsInstructions.icTreeInit(
    mint = mintBytes,         // which token to compress
    height = 20,              // tree height (max ~1M leaves)
    config = 0L               // config flags
)
// Wire: [0x0F][0x01][mint:32][height:1][config:8]
```

### 7.2 Compress tokens (SPL → compressed)

```kotlin
val compressData = SpsInstructions.icCompress(
    tree = treeBytes,          // 32-byte tree address
    amount = 1_000_000L,
    commitment = commitmentBytes
)
// Wire: [0x0F][0x11][tree:32][amount:8][commitment:32]
```

### 7.3 Transfer compressed tokens (private)

```kotlin
val transferData = SpsInstructions.icTransfer(
    tree = treeBytes,
    nullifier = nullifierBytes,      // proves ownership
    amount = 1_000_000L,
    newCommitment = recipientCommitment,
    proof = schnorrProof96
)
// Wire: [0x0F][0x13][tree:32][nullifier:32][amount:8][new_commit:32][proof:96]
```

### 7.4 Decompress tokens (compressed → SPL)

```kotlin
val decompressData = SpsInstructions.icDecompress(
    tree = treeBytes,
    nullifier = nullifierBytes,
    recipient = recipientPubkeyBytes,
    amount = 1_000_000L,
    schnorr = schnorrProof96
)
// Wire: [0x0F][0x12][tree:32][nullifier:32][recipient:32][amount:8][schnorr:96]
```

### 7.5 Private compressed transfer (never decompresses)

```kotlin
val privateData = SpsInstructions.buildCompact(
    SpsDomains.IC, IcOps.PRIVATE_TRANSFER,
    // [tree:32][nullifier:32][amount:8][new_commitment:32][proof:96]
    payload
)
```

---

## 8) DAM — Deferred Account Materialization

DAM enables **virtual token balances** that only create real SPL accounts when needed.
Users trade, transfer, and hold tokens without paying rent for token accounts.

On-chain: 21 live handlers at L11478–L12928.

### 8.1 Create a virtual balance

```kotlin
import nexus.styx.sps.SpsInstructions

// Mint virtual tokens into a commitment
val mintData = SpsInstructions.damVirtualMint(
    amount = 50_000_000L,
    commitment = commitmentBytes
)
// Wire: [0x0E][0x10][amount:8][commitment:32]
```

### 8.2 Transfer virtual tokens (private)

```kotlin
val transferData = SpsInstructions.damVirtualTransfer(
    nullifier = nullifierBytes,
    amount = 50_000_000L,
    newCommitment = recipientCommitment,
    proof = schnorrProof96
)
// Wire: [0x0E][0x11][nullifier:32][amount:8][new_commit:32][proof:96]
```

### 8.3 Materialize (virtual → real SPL token account)

When you need the tokens on-chain (e.g., to interact with DeFi protocols):

```kotlin
val materializeData = SpsInstructions.damMaterialize(
    nullifier = nullifierBytes,
    merkleProof = proofHashes,         // List<ByteArray> — Merkle path
    recipient = recipientPubkeyBytes,
    amount = 50_000_000L,
    schnorr = schnorrProof96
)
// Wire: [0x0E][0x20][nullifier:32][proof_len:1][proof:32*n][recipient:32][amount:8][schnorr:96]
```

### 8.4 Dematerialize (real → virtual, reclaim rent)

```kotlin
val dematerializeData = SpsInstructions.damDematerialize(
    pool = poolBytes,
    amount = 50_000_000L,
    newCommitment = commitmentBytes
)
// Wire: [0x0E][0x30][pool:32][amount:8][new_commitment:32]
```

---

## 9) Shielded Pools (VSL), Stealth Addresses & More

### 9.1 VSL — Virtual Shielded Ledger

VSL provides deposit/withdraw/escrow with 15 live handlers (L3538–L4361):

```kotlin
import nexus.styx.sps.SpsInstructions
import nexus.styx.sps.VslOps
import nexus.styx.core.SpsDomains

// Deposit into VSL
val depositData = SpsInstructions.buildCompact(
    SpsDomains.VSL, VslOps.DEPOSIT, payload
)

// Withdraw from VSL
val withdrawData = SpsInstructions.buildCompact(
    SpsDomains.VSL, VslOps.WITHDRAW, payload
)

// Create escrow
val escrowData = SpsInstructions.buildCompact(
    SpsDomains.VSL, VslOps.ESCROW_CREATE, payload
)

// Release escrow to recipient
val releaseData = SpsInstructions.buildCompact(
    SpsDomains.VSL, VslOps.ESCROW_RELEASE, payload
)

// Refund escrow to sender
val refundData = SpsInstructions.buildCompact(
    SpsDomains.VSL, VslOps.ESCROW_REFUND, payload
)
```

VSL also supports: `PRIVATE_TRANSFER`, `PRIVATE_SWAP`, `SHIELDED_SEND`,
`SPLIT`, `MERGE`, `BALANCE_PROOF`, `AUDIT_REVEAL`, `ZK_PRIVATE_TRANSFER`.

### 9.2 Stealth Addresses

Generate unlinkable payment addresses using DKSAP (Dual-Key Stealth Address Protocol):

```kotlin
import nexus.styx.privacy.StealthAddress

// Sender generates a stealth address for the recipient
val result = StealthAddress.generate(
    recipientViewPubkey = recipientViewKey,   // X25519 view key
    recipientSpendPubkey = recipientSpendKey  // Ed25519 spend key
)
// result.stealthPubkey    — one-time address to send to
// result.ephemeralPubkey  — publish on-chain for recipient scanning
// result.sharedSecret     — used internally

// Announce on-chain via GENERATE_STEALTH (0x1B in STS domain)
val announceData = SpsInstructions.buildCompact(
    SpsDomains.STS, StsOps.GENERATE_STEALTH,
    buildPayload(96) {
        putBytes(result.ephemeralPubkey)   // 32 bytes
        putBytes(recipientScanKey)         // 32 bytes
        putBytes(encryptedAmount)          // 32 bytes (encrypted for recipient)
    }
)
```

**Recipient scanning:**
```kotlin
// Recipient scans transaction logs for their stealth payments
val expectedAddress = StealthAddress.scan(
    viewSecretKey = myViewSecret,
    spendPubkey = mySpendPubkey,
    ephemeralPubkey = txEphemeralPubkey  // from on-chain log
)

// Check if a specific transaction is for us
val isMine = StealthAddress.isMine(
    viewSecretKey = myViewSecret,
    spendPubkey = mySpendPubkey,
    ephemeralPubkey = txEphemeralPubkey,
    candidateAddress = txStealthAddress
)
```

### 9.3 Verifying commitments

```kotlin
import nexus.styx.privacy.ShieldedPool

val valid = ShieldedPool.verifyCommitment(
    commitment = commitmentBytes,
    amount = 1_000_000L,
    ownerPubkey = ownerPubkeyBytes,
    randomness = randomnessBytes
)
```

---

## 10) Mainnet Domain Reference

### Fully Active Domains (all ops routed to live handlers)

| Byte | Domain | Notes |
|------|--------|-------|
| 0x01 | **STS** | Token standard core — shield, unshield, IAP transfers, AMM, private swap |
| 0x02 | **MESSAGING** | Private messages, ratchet, prekey bundles |
| 0x03 | **ACCOUNT** | VTA, delegation, guardians, stealth scan hints |
| 0x04 | **VSL** | Virtual Shielded Ledger — deposit, withdraw, escrow, 15 handlers |
| 0x05 | **NOTES** | On-chain encrypted notes |
| 0x06 | **COMPLIANCE** | Auditor reveals, proof-of-innocence |
| 0x0E | **DAM** | Deferred Account Materialization — virtual ↔ real tokens, 21 handlers |
| 0x0F | **IC** | Inscription Compression — ZK-free compressed tokens, 22 handlers |

### Partially Active Domains (routed, but most ops archived)

These domains dispatch to live handlers, but **most individual operations have been archived**
for program size optimization. Only the specific ops listed below are live on mainnet.

| Byte | Domain | Live Ops | Archived Ops |
|------|--------|----------|-------------|
| 0x07 | **PRIVACY** | `PHANTOM_NFT_COMMIT`, `PHANTOM_NFT_PROVE`, `STATE_CHANNEL_OPEN/CLOSE`, `CPI_INSCRIBE` | Decoys, ephemeral, chrono, shadow — all commented out |
| 0x08 | **DEFI** | `CROSS_MINT_ATOMIC`, `ATOMIC_CPI_TRANSFER` | Private swap/stake/LP are `#[cfg(feature = "devnet")]` only; rest moved to StyxFi |
| 0x09 | **NFT** | `MINT`, `COLLECTION_CREATE`, `FAIR_LAUNCH_COMMIT/REVEAL`, `MERKLE_AIRDROP_ROOT/CLAIM` | Marketplace, auctions, royalties — archived |

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

## 11) Production Defaults

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

## 12) Migration Checklist — Removing Old / Devnet Artifacts

If this is your **first integration**, you can skip this section. For anyone upgrading
from a pre-1.1.0 SDK or a devnet prototype, **complete every item below** before shipping.

### 12.1 Remove the old program ID

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

### 12.2 Remove the old Maven group

```diff
- implementation("com.styx.sdk:styx-core:1.0.0")
- implementation("com.styx.sdk:styx-sps:1.0.0")

+ implementation("nexus.styx:styx-core:1.1.0")
+ implementation("nexus.styx:styx-sps:1.1.0")
```

Also remove any `maven { url = "..." }` repository entries pointing to the old
`com.styx.sdk` staging repo or GitHub Packages snapshots.

### 12.3 Replace old `com.styx.*` package imports

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

### 12.4 Remove deprecated API references

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

### 12.5 Remove dead domain instruction builders

If you wrote custom builders for any dead domain, remove them entirely:

- **Governance** (0x0D) — all 6 ops return `Err`
- **EasyPay** (0x11) — all 19 ops return `Err`, moved to WhisperDrop
- **Swap** (0x10) — archived, use STS AMM ops (`CREATE_AMM_POOL`, `ADD_LIQUIDITY`, etc.)
- **Derivatives** (0x0A), **Bridge** (0x0B), **Securities** (0x0C) — deprecated

### 12.6 Grep audit

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
