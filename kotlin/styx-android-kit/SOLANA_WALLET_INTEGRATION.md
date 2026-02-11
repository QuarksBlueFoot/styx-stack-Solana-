# Solana Wallet Integration Guide — Android

## Privacy-Enabled Wallet Development with Styx KMP SDK

This guide is for **Solana wallet developers** integrating privacy features into Android wallet apps. It covers the complete wallet integration flow from MWA connection to private transactions.

> **Maven:** `nexus.styx:styx-android:1.2.0`  
> **Program ID:** `STYXbZeL1wcNigy1WAMFbUQ7PNzJpPYV557H7foNyY5`  
> **Network:** Mainnet-Beta  
> **Min SDK:** 24 (Android 7.0)

---

## Table of Contents

### Part I — Wallet Setup
1. [Dependencies](#1-dependencies)
2. [Wallet Initialization](#2-wallet-initialization)
3. [MWA Connection (Solana Mobile)](#3-mwa-connection)
4. [Key Management](#4-key-management)
5. [Secure Storage](#5-secure-storage)

### Part II — Core Wallet Features
6. [Send SOL Privately](#6-send-sol-privately)
7. [Send SPL Tokens Privately](#7-send-spl-tokens-privately)
8. [Private Swaps (DEX)](#8-private-swaps)
9. [Receive with Stealth Addresses](#9-stealth-addresses)

### Part III — Advanced Features
10. [Token Compression (IC)](#10-token-compression)
11. [Virtual Balances (DAM)](#11-virtual-balances-dam)
12. [Encrypted Messaging](#12-encrypted-messaging)
13. [Shielded Pools (VSL)](#13-shielded-pools-vsl)

### Part IV — Reference
14. [Active Mainnet Domains](#14-active-mainnet-domains)
15. [Production Checklist](#15-production-checklist)
16. [Migration Guide](#16-migration-guide)

---

# Part I — Wallet Setup

## 1) Dependencies

```kotlin
// app/build.gradle.kts
plugins {
    id("com.android.application")
    kotlin("android")
    kotlin("plugin.serialization") version "2.1.0"
}

android {
    compileSdk = 35
    defaultConfig { minSdk = 24 }
}

repositories {
    mavenCentral()
    google()
}

dependencies {
    // ═══════════════════════════════════════════════════════════════════
    // STYX PRIVACY SDK (nexus.styx namespace)
    // ═══════════════════════════════════════════════════════════════════
    
    // All-in-one Android SDK (includes MWA, Compose UI, Secure Storage)
    implementation("nexus.styx:styx-android:1.2.0")
    
    // Optional: Individual modules for fine-grained control
    // implementation("nexus.styx:styx-core:1.2.0")      // PublicKey, constants
    // implementation("nexus.styx:styx-crypto:1.2.0")    // X25519, Ed25519, ratchet
    // implementation("nexus.styx:styx-messaging:1.2.0") // Encrypted messaging
    // implementation("nexus.styx:styx-privacy:1.2.0")   // Shielded pool, stealth
    // implementation("nexus.styx:styx-sps:1.2.0")       // Instruction builders
    // implementation("nexus.styx:styx-client:1.2.0")    // RPC client
    
    // ═══════════════════════════════════════════════════════════════════
    // SOLANA MOBILE (MWA 2.1)
    // ═══════════════════════════════════════════════════════════════════
    implementation("com.solanamobile:mobile-wallet-adapter-clientlib-ktx:2.1.0")
    
    // ═══════════════════════════════════════════════════════════════════
    // COMPOSE UI (optional, for UI components)
    // ═══════════════════════════════════════════════════════════════════
    implementation("androidx.compose.material3:material3:1.3.1")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
}
```

> ⚠️ **Important:** Use `nexus.styx` (NOT `com.styx.sdk`). The old namespace is retired.

### Module Reference

| Module | Import | Key Classes |
|--------|--------|-------------|
| `styx-android` | `nexus.styx.android` | `StyxKit`, `StyxMwaClient`, `StyxSecureStorage` |
| `styx-core` | `nexus.styx.core` | `PublicKey`, `SpsDomains`, `StyxConstants` |
| `styx-crypto` | `nexus.styx.crypto` | `X3dh`, `DoubleRatchet`, `CommitmentScheme` |
| `styx-messaging` | `nexus.styx.messaging` | `PrivateMessagingClient`, `ChunkFrame` |
| `styx-privacy` | `nexus.styx.privacy` | `ShieldedPool`, `StealthAddress` |
| `styx-sps` | `nexus.styx.sps` | `SpsInstructions`, `StsOps`, `DamOps`, `IcOps` |
| `styx-client` | `nexus.styx.client` | `StyxHttpClient` |

---

## 2) Wallet Initialization

```kotlin
import nexus.styx.android.StyxKit
import nexus.styx.core.StyxConstants

class WalletApplication : Application() {
    lateinit var styx: StyxKit
        private set
    
    override fun onCreate() {
        super.onCreate()
        
        styx = StyxKit.Builder(this)
            .programId(StyxConstants.SPS_PROGRAM_ID)  // Mainnet ONLY
            .rpcUrl("https://api.mainnet-beta.solana.com")
            .cluster("mainnet-beta")
            .build()
    }
}

// Access from anywhere
val styx: StyxKit
    get() = (context.applicationContext as WalletApplication).styx
```

---

## 3) MWA Connection

Full Solana Mobile Wallet Adapter 2.1 integration:

### 3.1 Setup ActivityResultSender

```kotlin
import com.solana.mobilewalletadapter.clientlib.ActivityResultSender
import nexus.styx.android.mwa.StyxMwaClient

class WalletActivity : ComponentActivity() {
    private lateinit var activityResultSender: ActivityResultSender
    private val styx by lazy { (application as WalletApplication).styx }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        activityResultSender = ActivityResultSender(this)
    }
}
```

### 3.2 Connect to Wallet

```kotlin
// Connect and get wallet public key
suspend fun connectWallet(): Result<PublicKey> {
    return styx.mwa.connect(
        sender = activityResultSender,
        identityUri = Uri.parse("https://mywalletapp.com"),
        identityName = "My Privacy Wallet",
        iconUri = Uri.parse("favicon.ico"),
        cluster = "mainnet-beta",
    )
}

// In Compose
@Composable
fun ConnectButton() {
    val scope = rememberCoroutineScope()
    var walletAddress by remember { mutableStateOf<String?>(null) }
    
    Button(onClick = {
        scope.launch {
            connectWallet().onSuccess { pubkey ->
                walletAddress = pubkey.toBase58()
            }
        }
    }) {
        Text(walletAddress ?: "Connect Wallet")
    }
}
```

### 3.3 Sign and Send Transactions

```kotlin
// Sign + send in one step (preferred — single user approval)
suspend fun sendTransaction(txBytes: ByteArray): Result<String> {
    return styx.mwa.signAndSendTransaction(
        sender = activityResultSender,
        transaction = txBytes,
    )
}

// Sign only (for inspection before sending)
suspend fun signTransaction(txBytes: ByteArray): Result<ByteArray> {
    return styx.mwa.signTransaction(
        sender = activityResultSender,
        transaction = txBytes,
    )
}

// Batch sign + send multiple transactions
suspend fun sendTransactions(txList: List<ByteArray>): Result<List<String>> {
    return styx.mwa.signAndSendTransactions(
        sender = activityResultSender,
        transactions = txList,
    )
}
```

### 3.4 Reauthorization (Session Resume)

```kotlin
// Resume previous session without full auth prompt
suspend fun reconnect(): Result<PublicKey> {
    return styx.mwa.reauthorize(activityResultSender)
}

// Disconnect
suspend fun disconnect() {
    styx.mwa.disconnect(activityResultSender)
}
```

---

## 4) Key Management

Wallets need two keypair types:

| Key Type | Algorithm | Purpose |
|----------|-----------|---------|
| **Signer** | Ed25519 | Transaction signing (via MWA) |
| **Encryption** | X25519 | Encrypted messaging, stealth addresses |

### 4.1 Generate Encryption Keys

```kotlin
import nexus.styx.crypto.X25519

// Generate X25519 keypair for encrypted messaging
val encryptionKeypair = X25519.generateKeyPair()
// encryptionKeypair.secretKey — 32 bytes, store securely!
// encryptionKeypair.publicKey — 32 bytes, can be shared

// Derive X25519 from Ed25519 seed (for deterministic key)
val x25519FromEd = X25519.fromEd25519Seed(ed25519SeedBytes)
```

### 4.2 Store Keys Securely

```kotlin
import nexus.styx.android.StyxSecureStorage

val storage = styx.secureStorage

// Store encryption keys
storage.putBytes("x25519_secret", encryptionKeypair.secretKey)
storage.putBytes("x25519_public", encryptionKeypair.publicKey)

// Retrieve later
val secretKey = storage.getBytes("x25519_secret")
val publicKey = storage.getBytes("x25519_public")
```

---

## 5) Secure Storage

All sensitive data uses Android Keystore-backed `EncryptedSharedPreferences`:

```kotlin
val storage = styx.secureStorage

// Key-value storage
storage.putString("wallet_address", walletAddress)
storage.putBytes("commitment_seed", seedBytes)
storage.putLong("last_sync_slot", slotNumber)

// Namespaced storage (isolate per-feature data)
val ratchetStore = storage.namespace("ratchet")
ratchetStore.putBytes("session_${peerPubkey}", sessionState)

// Clear sensitive data on logout
fun logout() {
    storage.clear()  // Wipes all stored data
}
```

---

# Part II — Core Wallet Features

## 6) Send SOL Privately

### 6.1 Shield SOL (Public → Private)

Convert public SOL into a private shielded note:

```kotlin
import nexus.styx.privacy.ShieldedPool
import nexus.styx.sps.SpsInstructions
import nexus.styx.core.StyxConstants

// 1. Create a shielded note (off-chain)
val note = ShieldedPool.createShieldedNote(
    amount = 1_000_000_000L,  // 1 SOL in lamports
    ownerPubkey = walletPubkeyBytes,
)
// note.commitment — publish on-chain (public)
// note.randomness — keep secret! Needed to spend later

// 2. Build shield instruction
val shieldIx = SpsInstructions.stsShield(
    mint = StyxConstants.NATIVE_SOL_MINT,  // SOL
    amount = 1_000_000_000L,
    commitment = note.commitment.hexToBytes(),
)
// Wire format: [0x01][0x07][mint:32][amount:8][commitment:32]

// 3. For first-time users, use shield-with-init (creates pool account)
val shieldWithInitIx = SpsInstructions.stsShieldWithInit(
    mint = StyxConstants.NATIVE_SOL_MINT,
    amount = 1_000_000_000L,
    commitment = note.commitment.hexToBytes(),
)
// Wire format: [0x01][0x1F][mint:32][amount:8][commitment:32]

// 4. Build and send transaction
val tx = styx.buildTransaction(listOf(shieldIx), walletPubkey)
val sig = styx.mwa.signAndSendTransaction(activityResultSender, tx).getOrThrow()

// 5. Store note data for later spending
storage.putBytes("note_${note.commitment}", 
    note.serialize()  // commitment + randomness + amount
)
```

### 6.2 Private Transfer (Shielded → Shielded)

Transfer between private balances without revealing amounts:

```kotlin
import nexus.styx.sps.StsOps
import nexus.styx.core.SpsDomains

// ⚠️ Mainnet requires IAP_TRANSFER (0x1C), NOT plain TRANSFER (0x06)

// 1. Derive nullifier from your note (proves ownership)
val spentNote = ShieldedPool.deriveNullifier(note, ownerSecretKeyBytes)
// spentNote.nullifier — prevents double-spend

// 2. Create new commitment for recipient
val recipientNote = ShieldedPool.createShieldedNote(
    amount = 1_000_000_000L,
    ownerPubkey = recipientPubkeyBytes,
)

// 3. Build IAP transfer payload
val payload = ByteArray(168)
spentNote.nullifier!!.hexToBytes().copyInto(payload, 0)        // nullifier: 32 bytes
amount.toLEBytes().copyInto(payload, 32)                        // amount: 8 bytes LE
recipientNote.commitment.hexToBytes().copyInto(payload, 40)     // new_commitment: 32 bytes
schnorrProof96.copyInto(payload, 72)                            // schnorr proof: 96 bytes

val transferIx = SpsInstructions.buildCompact(
    SpsDomains.STS, StsOps.IAP_TRANSFER, payload
)
// Wire: [0x01][0x1C][nullifier:32][amount:8][new_commitment:32][schnorr:96]

// 4. Send via MWA
val tx = styx.buildTransaction(listOf(transferIx), walletPubkey)
styx.mwa.signAndSendTransaction(activityResultSender, tx)
```

### 6.3 Unshield SOL (Private → Public)

Withdraw from private pool back to a public address:

```kotlin
// Unshield to any recipient address
val unshieldIx = SpsInstructions.stsUnshield(
    nullifier = spentNote.nullifier!!.hexToBytes(),
    recipient = recipientPubkeyBytes,  // 32-byte destination
    amount = 1_000_000_000L,
    proof = schnorrProof,
)
// Wire: [0x01][0x08][nullifier:32][recipient:32][amount:8][proof:var]

val tx = styx.buildTransaction(listOf(unshieldIx), walletPubkey)
styx.mwa.signAndSendTransaction(activityResultSender, tx)
```

### 6.4 Stealth Unshield (To Fresh Address)

Unshield to a one-time stealth address for maximum privacy:

```kotlin
import nexus.styx.privacy.StealthAddress

// Generate stealth address for recipient
val stealth = StealthAddress.generate(
    recipientViewPubkey = recipientViewKey,
    recipientSpendPubkey = recipientSpendKey,
)

val stealthUnshieldIx = SpsInstructions.buildCompact(
    SpsDomains.STS, StsOps.STEALTH_UNSHIELD,
    buildPayload(192) {
        putBytes(spentNote.nullifier!!.hexToBytes())  // 32 bytes
        putBytes(stealth.ephemeralPubkey)              // 32 bytes
        putBytes(encryptedAmount)                      // 32 bytes
        putBytes(schnorrProof96)                       // 96 bytes
    }
)

val tx = styx.buildTransaction(listOf(stealthUnshieldIx), walletPubkey)
styx.mwa.signAndSendTransaction(activityResultSender, tx)
```

---

## 7) Send SPL Tokens Privately

The same shield/transfer/unshield flow works for **any SPL token**:

```kotlin
// Example: Shield 100 USDC
val USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v".toBase58Bytes()

val note = ShieldedPool.createShieldedNote(
    amount = 100_000_000L,  // 100 USDC (6 decimals)
    ownerPubkey = walletPubkeyBytes,
)

val shieldIx = SpsInstructions.stsShield(
    mint = USDC_MINT,  // Just change the mint!
    amount = 100_000_000L,
    commitment = note.commitment.hexToBytes(),
)

// Transfer and unshield work identically — mint is bound to commitment
```

### Popular Token Mints

| Token | Mint Address | Decimals |
|-------|--------------|----------|
| SOL | `So11111111111111111111111111111111111111112` | 9 |
| USDC | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | 6 |
| USDT | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` | 6 |
| BONK | `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263` | 5 |
| JUP | `JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN` | 6 |

---

## 8) Private Swaps

Swap tokens **without leaving the shielded pool**. Both input and output remain private.

### 8.1 Execute Private Swap (e.g., SOL → BONK)

```kotlin
import nexus.styx.sps.StsOps

// You have a shielded SOL note, want to swap for BONK
val swapIx = SpsInstructions.buildCompact(
    SpsDomains.STS, StsOps.PRIVATE_SWAP,
    buildPayload(150 + encryptedNote.size) {
        putBytes(poolId)              // AMM pool: 32 bytes
        putBytes(solMint)             // input mint: 32 bytes
        putBytes(inputNullifier)      // your SOL note: 32 bytes
        putLongLE(inputAmount)        // SOL amount: 8 bytes
        putBytes(outputCommitment)    // new BONK commitment: 32 bytes
        putLongLE(minOutput)          // slippage protection: 8 bytes
        putIntLE(encryptedNote.size)  // encrypted note len: 4 bytes
        putBytes(encryptedNote)       // encrypted output: var
    }
)

val tx = styx.buildTransaction(listOf(swapIx), walletPubkey)
styx.mwa.signAndSendTransaction(activityResultSender, tx)
```

### 8.2 Create AMM Pool (if needed)

```kotlin
val createPoolIx = SpsInstructions.buildCompact(
    SpsDomains.STS, StsOps.CREATE_AMM_POOL,
    buildPayload(66) {
        putBytes(solMint)    // mint_a: 32 bytes
        putBytes(bonkMint)   // mint_b: 32 bytes
        putShortLE(30)       // fee: 30 bps (0.3%)
    }
)
```

### 8.3 Add Liquidity

```kotlin
val addLiqIx = SpsInstructions.buildCompact(
    SpsDomains.STS, StsOps.ADD_LIQUIDITY,
    buildPayload(146) {
        putBytes(poolId)         // 32 bytes
        putBytes(nullifierA)     // SOL note: 32 bytes
        putBytes(nullifierB)     // BONK note: 32 bytes
        putLongLE(amountSol)     // 8 bytes
        putLongLE(amountBonk)    // 8 bytes
        putBytes(lpCommitment)   // LP token commitment: 32 bytes
    }
)
```

---

## 9) Stealth Addresses

Generate **unlinkable payment addresses** using DKSAP (Dual-Key Stealth Address Protocol):

### 9.1 Generate Stealth Meta-Address (Receiving)

```kotlin
import nexus.styx.privacy.StealthAddress
import nexus.styx.crypto.X25519

// Generate view + spend keypairs
val viewKey = X25519.generateKeyPair()
val spendKey = Ed25519.generateKeyPair()

// Store keys securely
storage.putBytes("stealth_view_secret", viewKey.secretKey)
storage.putBytes("stealth_spend_secret", spendKey.secretKey)

// Share meta-address (view + spend public keys) publicly
data class StealthMetaAddress(
    val viewPublic: ByteArray,   // For sender to derive shared secret
    val spendPublic: ByteArray,  // Combined with shared secret = stealth address
)
```

### 9.2 Generate One-Time Address (Sending)

```kotlin
// Sender generates a unique stealth address for recipient
val result = StealthAddress.generate(
    recipientViewPubkey = recipientMeta.viewPublic,
    recipientSpendPubkey = recipientMeta.spendPublic,
)
// result.stealthPubkey    — send funds HERE
// result.ephemeralPubkey  — publish on-chain for recipient scanning
// result.sharedSecret     — internal

// Announce on-chain
val announceIx = SpsInstructions.buildCompact(
    SpsDomains.STS, StsOps.GENERATE_STEALTH,
    buildPayload(96) {
        putBytes(result.ephemeralPubkey)  // 32 bytes
        putBytes(recipientScanKey)         // 32 bytes
        putBytes(encryptedAmount)          // 32 bytes
    }
)
```

### 9.3 Scan for Incoming Payments (Receiving)

```kotlin
// Recipient scans transactions for payments to their stealth addresses
suspend fun scanStealthPayments(fromSlot: Long): List<StealthPayment> {
    val myViewSecret = storage.getBytes("stealth_view_secret")!!
    val mySpendPublic = storage.getBytes("stealth_spend_public")!!
    
    return styx.client.getTransactionLogs(fromSlot)
        .filter { log -> log.hasStealthAnnouncement() }
        .mapNotNull { log ->
            val expectedAddress = StealthAddress.scan(
                viewSecretKey = myViewSecret,
                spendPubkey = mySpendPublic,
                ephemeralPubkey = log.ephemeralPubkey,
            )
            
            if (StealthAddress.isMine(myViewSecret, mySpendPublic, 
                    log.ephemeralPubkey, log.stealthAddress)) {
                StealthPayment(
                    address = expectedAddress,
                    amount = decryptAmount(log.encryptedAmount, myViewSecret),
                    txSignature = log.signature,
                )
            } else null
        }
}
```

---

# Part III — Advanced Features

## 10) Token Compression

**Inscription Compression (IC)** — ZK-free compressed tokens using Merkle trees.
20x cheaper than Groth16 verification!

### 10.1 Compress Tokens (SPL → Compressed)

```kotlin
import nexus.styx.sps.IcOps

// Initialize a state tree for the token
val treeInitIx = SpsInstructions.icTreeInit(
    mint = mintBytes,
    height = 20,  // ~1M leaves
    config = 0L,
)
// Wire: [0x0F][0x01][mint:32][height:1][config:8]

// Compress SPL tokens into the tree
val compressIx = SpsInstructions.icCompress(
    tree = treeBytes,
    amount = 1_000_000L,
    commitment = commitmentBytes,
)
// Wire: [0x0F][0x11][tree:32][amount:8][commitment:32]
```

### 10.2 Transfer Compressed Tokens

```kotlin
val transferIx = SpsInstructions.icTransfer(
    tree = treeBytes,
    nullifier = nullifierBytes,
    amount = 1_000_000L,
    newCommitment = recipientCommitment,
    proof = schnorrProof96,
)
// Wire: [0x0F][0x13][tree:32][nullifier:32][amount:8][new_commit:32][proof:96]
```

### 10.3 Decompress (Compressed → SPL)

```kotlin
val decompressIx = SpsInstructions.icDecompress(
    tree = treeBytes,
    nullifier = nullifierBytes,
    recipient = recipientPubkeyBytes,
    amount = 1_000_000L,
    schnorr = schnorrProof96,
)
// Wire: [0x0F][0x12][tree:32][nullifier:32][recipient:32][amount:8][schnorr:96]
```

### 10.4 Private Compressed Transfer

```kotlin
val privateIx = SpsInstructions.buildCompact(
    SpsDomains.IC, IcOps.PRIVATE_TRANSFER,
    buildPayload(200) {
        putBytes(treeBytes)              // 32 bytes
        putBytes(nullifierBytes)         // 32 bytes
        putLongLE(amount)                // 8 bytes
        putBytes(newCommitment)          // 32 bytes
        putBytes(proof96)                // 96 bytes
    }
)
```

---

## 11) Virtual Balances (DAM)

**Deferred Account Materialization** — hold tokens without paying rent. Only create SPL accounts when needed!

### 11.1 Virtual Mint

```kotlin
import nexus.styx.sps.DamOps

val mintIx = SpsInstructions.damVirtualMint(
    amount = 50_000_000L,
    commitment = commitmentBytes,
)
// Wire: [0x0E][0x10][amount:8][commitment:32]
```

### 11.2 Virtual Transfer

```kotlin
val transferIx = SpsInstructions.damVirtualTransfer(
    nullifier = nullifierBytes,
    amount = 50_000_000L,
    newCommitment = recipientCommitment,
    proof = schnorrProof96,
)
// Wire: [0x0E][0x11][nullifier:32][amount:8][new_commit:32][proof:96]
```

### 11.3 Materialize (Virtual → Real SPL)

```kotlin
// When you need real tokens (e.g., for DeFi)
val materializeIx = SpsInstructions.damMaterialize(
    nullifier = nullifierBytes,
    merkleProof = proofHashes,
    recipient = recipientPubkeyBytes,
    amount = 50_000_000L,
    schnorr = schnorrProof96,
)
// Wire: [0x0E][0x20][nullifier:32][proof_len:1][proof:32*n][recipient:32][amount:8][schnorr:96]
```

### 11.4 Dematerialize (Real → Virtual, Reclaim Rent!)

```kotlin
// Return tokens to virtual, close account, get rent back!
val dematerializeIx = SpsInstructions.damDematerialize(
    pool = poolBytes,
    amount = 50_000_000L,
    newCommitment = commitmentBytes,
)
// Wire: [0x0E][0x30][pool:32][amount:8][new_commitment:32]
```

---

## 12) Encrypted Messaging

Signal Protocol (X3DH + Double Ratchet) for end-to-end encrypted messaging:

### 12.1 Initialize Messaging Client

```kotlin
import nexus.styx.messaging.PrivateMessagingClient
import nexus.styx.messaging.MessagingConfig

val messaging = PrivateMessagingClient(
    MessagingConfig(
        x25519SecretKey = myX25519Secret,
        x25519PublicKey = myX25519Public,
        signerPubkey = PublicKey(walletPubkeyBytes),
    )
)
```

### 12.2 Encrypt Message

```kotlin
val (envelopeBytes, messageNumber) = messaging.encryptMessage(
    recipient = recipientPubkeyBase58,
    recipientX25519Key = recipientX25519Pubkey,
    content = "Hello, private world!",
)
```

### 12.3 Decrypt Message

```kotlin
val plaintext = messaging.decryptMessage(
    senderPubkey = senderPubkeyBase58,
    senderX25519Key = senderX25519Pubkey,
    envelopeData = incomingEnvelopeBytes,
)
```

### 12.4 Persist Sessions

```kotlin
// Export session state (encrypt before storing!)
val snapshot = messaging.exportSession(peerPubkeyBase58)
storage.putBytes("session_${peerPubkeyBase58}", snapshot)

// Import on app restart
val saved = storage.getBytes("session_${peerPubkeyBase58}")
if (saved != null) messaging.importSession(peerPubkeyBase58, saved)
```

### 12.5 Rail Selection (Memo vs PMP)

```kotlin
import nexus.styx.messaging.RailSelect
import nexus.styx.messaging.RailPreference

val rail = RailSelect.selectRail(
    RailSelectArgs(
        envelopeBytes = envelopeBytes.size,
        prefer = RailPreference.AUTO,
        pmpAvailable = true,
    )
)
// MEMO: < 566 bytes (fits in memo instruction)
// PMP: larger payloads via Private Memo Program
```

### 12.6 Chunking Large Messages

```kotlin
import nexus.styx.messaging.ChunkFrame

val chunks = ChunkFrame.split(
    msgId = "${peerPubkeyBase58}:${messageNumber}",
    payload = envelopeBytes,
    contentType = "application/styx-envelope",
)

// Send each chunk as separate transaction
chunks.forEach { chunk ->
    // Build and send chunk transaction
}
```

---

## 13) Shielded Pools (VSL)

Virtual Shielded Ledger — deposit, withdraw, escrow with 15 live handlers:

### 13.1 Deposit

```kotlin
import nexus.styx.sps.VslOps

val depositIx = SpsInstructions.buildCompact(
    SpsDomains.VSL, VslOps.DEPOSIT,
    buildPayload(72) {
        putLongLE(amount)
        putBytes(commitment)
    }
)
```

### 13.2 Withdraw

```kotlin
val withdrawIx = SpsInstructions.buildCompact(
    SpsDomains.VSL, VslOps.WITHDRAW,
    buildPayload(168) {
        putBytes(nullifier)
        putBytes(recipient)
        putLongLE(amount)
        putBytes(proof)
    }
)
```

### 13.3 Escrow

```kotlin
// Create escrow
val createEscrowIx = SpsInstructions.buildCompact(
    SpsDomains.VSL, VslOps.ESCROW_CREATE,
    buildPayload(104) {
        putBytes(depositor)
        putBytes(recipient)
        putLongLE(amount)
        putLongLE(releaseTime)
        putBytes(conditionHash)
    }
)

// Release escrow to recipient
val releaseIx = SpsInstructions.buildCompact(
    SpsDomains.VSL, VslOps.ESCROW_RELEASE, payload
)

// Refund escrow to sender
val refundIx = SpsInstructions.buildCompact(
    SpsDomains.VSL, VslOps.ESCROW_REFUND, payload
)
```

---

# Part IV — Reference

## 14) Active Mainnet Domains

### ✅ Fully Active (all ops live)

| Byte | Domain | Description |
|------|--------|-------------|
| `0x01` | **STS** | Token standard — shield, unshield, IAP transfers, AMM, private swap |
| `0x02` | **MESSAGING** | Private messages, ratchet, prekey bundles |
| `0x03` | **ACCOUNT** | VTA, delegation, guardians, stealth scan hints |
| `0x04` | **VSL** | Virtual Shielded Ledger — 15 handlers |
| `0x05` | **NOTES** | On-chain encrypted notes |
| `0x06` | **COMPLIANCE** | Auditor reveals, proof-of-innocence |
| `0x0E` | **DAM** | Deferred Account Materialization — 21 handlers |
| `0x0F` | **IC** | Inscription Compression — 22 handlers |

### ⚠️ Partially Active (some ops archived)

| Byte | Domain | Live Ops | Archived |
|------|--------|----------|----------|
| `0x07` | **PRIVACY** | `PHANTOM_NFT_*`, `STATE_CHANNEL_*`, `CPI_INSCRIBE` | Decoys, ephemeral, chrono |
| `0x08` | **DEFI** | `CROSS_MINT_ATOMIC`, `ATOMIC_CPI_TRANSFER` | Private swap/stake/LP moved to StyxFi |
| `0x09` | **NFT** | `MINT`, `COLLECTION_CREATE`, `FAIR_LAUNCH_*`, `MERKLE_AIRDROP_*` | Marketplace, auctions |

### ❌ Dead Domains (always return `Err`)

| Byte | Domain | Reason |
|------|--------|--------|
| `0x0A` | DERIVATIVES | Moved to StyxFi |
| `0x0B` | BRIDGE | Deprecated |
| `0x0C` | SECURITIES | Deprecated |
| `0x0D` | GOVERNANCE | Moved to StyxFi v24 |
| `0x10` | SWAP | Archived — use STS AMM |
| `0x11` | EASYPAY | Moved to WhisperDrop |

### Domain Guard

```kotlin
import nexus.styx.core.SpsDomains

// Always check before building instructions!
fun requireActiveDomain(domain: Byte) {
    require(!SpsDomains.DEAD.contains(domain)) {
        "Domain 0x${domain.toUByte().toString(16)} is dead on mainnet"
    }
}
```

---

## 15) Production Checklist

| Item | Required Value |
|------|----------------|
| Maven group | `nexus.styx` |
| Version | `1.2.0` |
| Program ID | `STYXbZeL1wcNigy1WAMFbUQ7PNzJpPYV557H7foNyY5` |
| RPC | `https://api.mainnet-beta.solana.com` (or dedicated) |
| Transfer mode | `StsOps.IAP_TRANSFER` (0x1C) — NOT plain TRANSFER |
| Messaging rail | `RailPreference.AUTO` |
| Domain guard | Check `SpsDomains.DEAD` before every instruction |

```kotlin
import nexus.styx.core.StyxConstants
import nexus.styx.core.SpsDomains

// ✅ Correct
val programId = StyxConstants.SPS_PROGRAM_ID

// ❌ NEVER use devnet program
// val programId = StyxConstants.SPS_DEVNET_PROGRAM_ID
```

---

## 16) Migration Guide

> **New integration?** Skip this section.

### From `com.styx.sdk` → `nexus.styx`

```diff
// Gradle
- implementation("com.styx.sdk:styx-core:1.0.0")
+ implementation("nexus.styx:styx-android:1.2.0")

// Imports
- import com.styx.core.PublicKey
- import com.styx.sps.SpsInstructions
+ import nexus.styx.core.PublicKey
+ import nexus.styx.sps.SpsInstructions
```

### Renamed Constants

| Old | New |
|-----|-----|
| `SpsDomains.DOMAIN_STS` | `SpsDomains.STS` |
| `SpsDomains.DOMAIN_DAM` | `SpsDomains.DAM` |
| `SpsDomains.DOMAIN_IC` | `SpsDomains.IC` |
| `SpsDomains.INACTIVE` | `SpsDomains.DEAD` |
| `StsOps.TRANSFER` (0x06) | `StsOps.IAP_TRANSFER` (0x1C) |

### Audit Commands

```bash
# Find old program IDs
grep -rn "FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW" .

# Find old Maven group
grep -rn "com\.styx\.sdk" . --include="*.kts"

# Find old package namespace
grep -rn "com\.styx\." . --include="*.kt"

# All should return ZERO results before shipping
```

---

## Version Matrix

| Component | Version |
|-----------|---------|
| Styx SDK | 1.2.0 |
| Kotlin | 2.1.0 (K2) |
| MWA clientlib-ktx | 2.1.0 |
| Compose UI | 1.7.6 |
| Material 3 | 1.3.1 |
| Coroutines | 1.10.1 |
| compileSdk | 35 |
| minSdk | 24 |
| targetSdk | 35 |

---

*Last updated: February 2026 · Styx Privacy SDK v1.2.0 · Bluefoot Labs*
