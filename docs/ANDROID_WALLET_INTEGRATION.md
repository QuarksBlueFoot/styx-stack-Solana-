# Android Wallet Integration Guide â€” Styx Privacy SDK

## Complete Guide for Building Privacy-Enabled Solana Wallets on Android

This is the **definitive integration guide** for Android wallet developers who want to add Solana privacy features. It covers all **LIVE mainnet capabilities** including private transfers, encrypted messaging, token compression, and shielded pools.

> **Maven Coordinates:** `nexus.styx:styx-android:1.3.0`  
> **Program ID:** `STYXbZeL1wcNigy1WAMFbUQ7PNzJpPYV557H7foNyY5`  
> **Network:** Solana Mainnet-Beta  
> **Minimum Android:** API 24 (Android 7.0)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Active Mainnet Domains](#active-mainnet-domains)
3. [Wallet Connection (MWA 2.1)](#wallet-connection-mwa-21)
4. [Private SOL Transfers](#private-sol-transfers)
5. [Private SPL Token Transfers](#private-spl-token-transfers)
6. [Token Compression (IC Domain)](#token-compression-ic-domain)
7. [Deferred Account Materialization (DAM)](#deferred-account-materialization-dam)
8. [Encrypted Messaging](#encrypted-messaging)
9. [Shielded Pools & VSL](#shielded-pools--vsl)
10. [Stealth Addresses](#stealth-addresses)
11. [Viewing Compressed Token Metadata](#viewing-compressed-token-metadata)
12. [Complete Wallet Example](#complete-wallet-example)
13. [Security Best Practices](#security-best-practices)

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
    defaultConfig { minSdk = 24 }
}

dependencies {
    // Styx Privacy SDK â€” single import for all privacy features
    implementation("nexus.styx:styx-android:1.3.0")
    
    // Styx App Kit â€” UI components for privacy features
    implementation("nexus.styx:styx-app-kit:1.3.0")
    
    // Styx Envelope â€” encrypted message format
    implementation("nexus.styx:styx-envelope:1.3.0")
    
    // Solana Mobile Wallet Adapter
    implementation("com.solanamobile:mobile-wallet-adapter-clientlib-ktx:2.1.0")
}

// Add Maven Central repository
repositories {
    mavenCentral()
    google()
}
```

### 2. Initialize Styx Client

```kotlin
import nexus.styx.mobile.StyxClient
import nexus.styx.mobile.StyxConfig

class WalletApp : Application() {
    lateinit var styx: StyxClient
    
    override fun onCreate() {
        super.onCreate()
        styx = StyxClient.create(
            context = this,
            config = StyxConfig(
                rpcUrl = "https://api.mainnet-beta.solana.com",
                programId = "STYXbZeL1wcNigy1WAMFbUQ7PNzJpPYV557H7foNyY5",
                cluster = StyxCluster.MAINNET,
            ),
        )
    }
}
```

---

## Active Mainnet Domains

The Styx Protocol uses a **domain-based instruction encoding** system. Here are the domains that are **LIVE on mainnet**:

| Domain | Code | Description | Status |
|--------|------|-------------|--------|
| **STS** | `0x01` | Token Standard â€” shield, unshield, private swap, AMM | âœ… LIVE |
| **MESSAGING** | `0x02` | Private messages, X3DH key exchange, ratchet | âœ… LIVE |
| **ACCOUNT** | `0x03` | VTA, delegation, guardians, APB transfers | âœ… LIVE |
| **VSL** | `0x04` | Virtual Shielded Ledger â€” deposits, withdrawals, escrow | âœ… LIVE |
| **NOTES** | `0x05` | UTXO primitives, pools, Merkle trees, confidential mint | âœ… LIVE |
| **COMPLIANCE** | `0x06` | POI, innocence proofs, provenance | âœ… LIVE |
| **PRIVACY** | `0x07` | Decoys, ephemeral accounts, chrono-locks, hashlock | âœ… LIVE |
| **DEFI** | `0x08` | Private AMM, staking, lending, Jupiter routes | âœ… LIVE |
| **NFT** | `0x09` | Private NFT marketplace, auctions, fair launch | âœ… LIVE |
| **DAM** | `0x0E` | Deferred Account Materialization â€” zero-rent tokens | âœ… LIVE |
| **IC** | `0x0F` | Inscription Compression â€” compressed SPL tokens | âœ… LIVE |

### Deprecated/Archived Domains (NOT on Mainnet)

| Domain | Code | Status |
|--------|------|--------|
| DERIVATIVES | `0x0A` | âš ï¸ Moved to StyxFi program |
| BRIDGE | `0x0B` | âš ï¸ Rejected on mainnet |
| SECURITIES | `0x0C` | âš ï¸ Rejected on mainnet |
| GOVERNANCE | `0x0D` | âš ï¸ Archived, needs feature flag |
| SWAP | `0x10` | âš ï¸ Archived, coming back in v5.0 |
| EASYPAY | `0x11` | âš ï¸ Moved to WhisperDrop program |

---

## Wallet Connection (MWA 2.1)

Full Solana Mobile Wallet Adapter 2.1 integration:

```kotlin
import nexus.styx.mobile.mwa.StyxMwa
import com.solana.mobilewalletadapter.clientlib.ActivityResultSender

class WalletActivity : ComponentActivity() {
    private lateinit var activityResultSender: ActivityResultSender
    private val styx by lazy { (application as WalletApp).styx }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        activityResultSender = ActivityResultSender(this)
    }
    
    // Connect to wallet
    suspend fun connectWallet(): Result<PublicKey> {
        return styx.mwa.connect(
            sender = activityResultSender,
            identityUri = Uri.parse("https://myapp.com"),
            identityName = "My Privacy Wallet",
            cluster = "mainnet-beta",
        )
    }
    
    // Disconnect
    suspend fun disconnectWallet() {
        styx.mwa.disconnect(activityResultSender)
    }
    
    // Sign and send privacy transaction
    suspend fun sendPrivacyTx(txBytes: ByteArray): Result<String> {
        return styx.mwa.signAndSendTransaction(
            sender = activityResultSender,
            transaction = txBytes,
        )
    }
}
```

---

## Private SOL Transfers

Send SOL privately using the **STS Domain** (shield â†’ transfer â†’ unshield):

### Shield SOL (Public â†’ Private)

```kotlin
import nexus.styx.mobile.instructions.StsInstructions
import nexus.styx.mobile.privacy.ShieldedPool

// Shield 1 SOL into the privacy pool
suspend fun shieldSol(
    amount: Long, // lamports (1 SOL = 1_000_000_000)
    wallet: PublicKey,
): Result<String> {
    // Build shield instruction
    val shieldIx = StsInstructions.shield(
        payer = wallet,
        mint = PublicKey.NATIVE_MINT, // SOL
        amount = amount,
        commitmentSeed = generateCommitmentSeed(),
    )
    
    // Build and sign transaction
    val tx = styx.buildTransaction(listOf(shieldIx), wallet)
    return styx.mwa.signAndSendTransaction(activityResultSender, tx)
}

// Generate cryptographically secure commitment seed
private fun generateCommitmentSeed(): ByteArray {
    return SecureRandom().generateSeed(32)
}
```

### Private Transfer (Shielded â†’ Shielded)

```kotlin
import nexus.styx.mobile.instructions.VslInstructions
import nexus.styx.mobile.privacy.NoteCommitment

// Transfer privately within the shielded pool
suspend fun privateTransfer(
    amount: Long,
    recipientCommitment: ByteArray,
    senderNullifier: ByteArray,
): Result<String> {
    // Build private transfer instruction (VSL domain)
    val transferIx = VslInstructions.privateTransfer(
        amount = amount,
        inputNullifier = senderNullifier,
        outputCommitment = recipientCommitment,
        merkleProof = fetchMerkleProof(senderNullifier),
    )
    
    val tx = styx.buildTransaction(listOf(transferIx), wallet)
    return styx.mwa.signAndSendTransaction(activityResultSender, tx)
}
```

### Unshield SOL (Private â†’ Public)

```kotlin
// Unshield from privacy pool back to public wallet
suspend fun unshieldSol(
    amount: Long,
    recipient: PublicKey,
    nullifier: ByteArray,
    merkleProof: List<ByteArray>,
): Result<String> {
    val unshieldIx = StsInstructions.unshield(
        recipient = recipient,
        mint = PublicKey.NATIVE_MINT,
        amount = amount,
        nullifier = nullifier,
        merkleProof = merkleProof,
    )
    
    val tx = styx.buildTransaction(listOf(unshieldIx), wallet)
    return styx.mwa.signAndSendTransaction(activityResultSender, tx)
}
```

### Stealth Unshield (To Fresh Address)

```kotlin
// Unshield to a stealth address (one-time use, unlinkable)
suspend fun stealthUnshield(
    amount: Long,
    stealthAddress: PublicKey, // Generated via ECDH
    nullifier: ByteArray,
): Result<String> {
    val ix = StsInstructions.stealthUnshield(
        stealthRecipient = stealthAddress,
        mint = PublicKey.NATIVE_MINT,
        amount = amount,
        nullifier = nullifier,
        merkleProof = fetchMerkleProof(nullifier),
    )
    
    val tx = styx.buildTransaction(listOf(ix), wallet)
    return styx.mwa.signAndSendTransaction(activityResultSender, tx)
}
```

---

## Private SPL Token Transfers

Same pattern as SOL, but with any SPL token mint:

```kotlin
// Shield USDC
suspend fun shieldUsdc(amount: Long, wallet: PublicKey): Result<String> {
    val USDC_MINT = PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
    
    val ix = StsInstructions.shield(
        payer = wallet,
        mint = USDC_MINT,
        amount = amount, // USDC has 6 decimals
        commitmentSeed = generateCommitmentSeed(),
    )
    
    val tx = styx.buildTransaction(listOf(ix), wallet)
    return styx.mwa.signAndSendTransaction(activityResultSender, tx)
}

// Shield with auto-init pool (permissionless, v6.1+)
suspend fun shieldWithInit(
    mint: PublicKey,
    amount: Long,
    wallet: PublicKey,
): Result<String> {
    // Automatically creates the shielded pool if it doesn't exist
    val ix = StsInstructions.shieldWithInit(
        payer = wallet,
        mint = mint,
        amount = amount,
        commitmentSeed = generateCommitmentSeed(),
    )
    
    val tx = styx.buildTransaction(listOf(ix), wallet)
    return styx.mwa.signAndSendTransaction(activityResultSender, tx)
}
```

### Private Swap (Shielded AMM)

```kotlin
import nexus.styx.mobile.instructions.DefiInstructions

// Swap USDC â†’ SOL privately (amounts hidden)
suspend fun privateSwap(
    inputMint: PublicKey,
    outputMint: PublicKey,
    inputAmount: Long,
    minOutputAmount: Long,
    inputNullifier: ByteArray,
): Result<String> {
    val ix = DefiInstructions.privateSwap(
        inputMint = inputMint,
        outputMint = outputMint,
        inputAmount = inputAmount,
        minOutput = minOutputAmount,
        inputNullifier = inputNullifier,
        outputCommitmentSeed = generateCommitmentSeed(),
        merkleProof = fetchMerkleProof(inputNullifier),
    )
    
    val tx = styx.buildTransaction(listOf(ix), wallet)
    return styx.mwa.signAndSendTransaction(activityResultSender, tx)
}
```

---

## Token Compression (IC Domain)

**Inscription Compression (IC)** provides ZK-free compressed tokens using Merkle proofs and inscriptions. This is **20x cheaper than Groth16** and provides privacy!

### Compress SPL Tokens

```kotlin
import nexus.styx.mobile.instructions.IcInstructions
import nexus.styx.mobile.compression.StateTree

// Compress existing SPL tokens into a state tree (saves rent!)
suspend fun compressTokens(
    mint: PublicKey,
    amount: Long,
    wallet: PublicKey,
): Result<String> {
    // 1. Get or initialize the state tree for this mint
    val stateTree = styx.getOrCreateStateTree(mint)
    
    // 2. Compress SPL tokens â†’ tree leaf (burns SPL, creates commitment)
    val ix = IcInstructions.compress(
        mint = mint,
        owner = wallet,
        amount = amount,
        stateTree = stateTree.address,
        commitment = generateCommitment(amount, wallet),
    )
    
    val tx = styx.buildTransaction(listOf(ix), wallet)
    return styx.mwa.signAndSendTransaction(activityResultSender, tx)
}

// Initialize a new state tree for a token
suspend fun initStateTree(mint: PublicKey): StateTree {
    val ix = IcInstructions.treeInit(
        mint = mint,
        maxDepth = 20, // Supports 2^20 = ~1M leaves
        maxBufferSize = 64,
    )
    
    val tx = styx.buildTransaction(listOf(ix), wallet)
    styx.mwa.signAndSendTransaction(activityResultSender, tx)
    
    return styx.getStateTree(mint)
}
```

### Decompress Tokens

```kotlin
// Decompress from tree back to SPL token account
suspend fun decompressTokens(
    mint: PublicKey,
    amount: Long,
    leafIndex: Int,
    merkleProof: List<ByteArray>,
    wallet: PublicKey,
): Result<String> {
    val ix = IcInstructions.decompress(
        mint = mint,
        recipient = wallet,
        amount = amount,
        leafIndex = leafIndex,
        merkleProof = merkleProof,
        stateTree = styx.getStateTree(mint).address,
    )
    
    val tx = styx.buildTransaction(listOf(ix), wallet)
    return styx.mwa.signAndSendTransaction(activityResultSender, tx)
}
```

### Transfer Compressed Tokens

```kotlin
// Transfer between compressed accounts (no SPL account needed!)
suspend fun transferCompressed(
    mint: PublicKey,
    amount: Long,
    recipientCommitment: ByteArray,
    senderLeafIndex: Int,
    senderProof: List<ByteArray>,
): Result<String> {
    val ix = IcInstructions.transfer(
        mint = mint,
        amount = amount,
        inputLeafIndex = senderLeafIndex,
        inputProof = senderProof,
        outputCommitment = recipientCommitment,
        stateTree = styx.getStateTree(mint).address,
    )
    
    val tx = styx.buildTransaction(listOf(ix), wallet)
    return styx.mwa.signAndSendTransaction(activityResultSender, tx)
}
```

### Private Compressed Transfer (Amounts Hidden)

```kotlin
// Private compressed transfer â€” sender, recipient, and amount all hidden!
suspend fun privateCompressedTransfer(
    mint: PublicKey,
    encryptedAmount: ByteArray,
    recipientCommitment: ByteArray,
    senderLeafIndex: Int,
    senderProof: List<ByteArray>,
): Result<String> {
    val ix = IcInstructions.privateTransfer(
        mint = mint,
        encryptedAmount = encryptedAmount, // ElGamal encrypted
        inputLeafIndex = senderLeafIndex,
        inputProof = senderProof,
        outputCommitment = recipientCommitment,
    )
    
    val tx = styx.buildTransaction(listOf(ix), wallet)
    return styx.mwa.signAndSendTransaction(activityResultSender, tx)
}
```

### Re-compress After DEX Trade

```kotlin
// Swap on DEX â†’ immediately re-compress to save rent
suspend fun swapAndRecompress(
    inputMint: PublicKey,
    outputMint: PublicKey,
    inputAmount: Long,
    inputLeafIndex: Int,
    inputProof: List<ByteArray>,
): Result<String> {
    // âš ï¸ DEVNET ONLY â€” Mainnet uses 2-step process
    val ix = IcInstructions.swapAndRecompress(
        inputMint = inputMint,
        outputMint = outputMint,
        inputAmount = inputAmount,
        inputLeafIndex = inputLeafIndex,
        inputProof = inputProof,
        outputCommitmentSeed = generateCommitmentSeed(),
    )
    
    val tx = styx.buildTransaction(listOf(ix), wallet)
    return styx.mwa.signAndSendTransaction(activityResultSender, tx)
}
```

---

## Deferred Account Materialization (DAM)

**DAM** is the world's first bidirectional Virtual â†” Real token architecture. Users hold tokens virtually (zero rent!) and only materialize when needed for DeFi.

### Virtual Balance Operations

```kotlin
import nexus.styx.mobile.instructions.DamInstructions
import nexus.styx.mobile.dam.DamPool

// Get user's virtual balance (off-chain query)
suspend fun getVirtualBalance(
    mint: PublicKey,
    wallet: PublicKey,
): Long {
    val pool = styx.getDamPool(mint)
    return pool.getVirtualBalance(wallet)
}

// Transfer between virtual balances (free, no rent!)
suspend fun virtualTransfer(
    mint: PublicKey,
    recipient: PublicKey,
    amount: Long,
): Result<String> {
    val ix = DamInstructions.virtualTransfer(
        mint = mint,
        sender = wallet,
        recipient = recipient,
        amount = amount,
        senderProof = fetchVirtualBalanceProof(wallet),
    )
    
    val tx = styx.buildTransaction(listOf(ix), wallet)
    return styx.mwa.signAndSendTransaction(activityResultSender, tx)
}
```

### Materialize (Virtual â†’ Real SPL)

```kotlin
// Materialize virtual balance to real SPL token account
// Costs ~0.002 SOL rent (refundable via de-materialize!)
suspend fun materialize(
    mint: PublicKey,
    amount: Long,
): Result<String> {
    val ix = DamInstructions.materialize(
        mint = mint,
        owner = wallet,
        amount = amount,
        balanceProof = fetchVirtualBalanceProof(wallet),
    )
    
    val tx = styx.buildTransaction(listOf(ix), wallet)
    return styx.mwa.signAndSendTransaction(activityResultSender, tx)
}

// Materialize with auto-init pool (permissionless)
suspend fun materializeWithInit(mint: PublicKey, amount: Long): Result<String> {
    val ix = DamInstructions.materializeWithInit(
        mint = mint,
        owner = wallet,
        amount = amount,
        balanceProof = fetchVirtualBalanceProof(wallet),
    )
    
    val tx = styx.buildTransaction(listOf(ix), wallet)
    return styx.mwa.signAndSendTransaction(activityResultSender, tx)
}
```

### De-Materialize (Real SPL â†’ Virtual, Reclaim Rent!)

```kotlin
// Return tokens to pool, close account, RECLAIM ~0.002 SOL rent!
// This is UNIQUE to SPS â€” no other protocol supports this!
suspend fun dematerialize(
    mint: PublicKey,
    amount: Long,
): Result<String> {
    val ix = DamInstructions.dematerialize(
        mint = mint,
        owner = wallet,
        amount = amount,
    )
    
    val tx = styx.buildTransaction(listOf(ix), wallet)
    return styx.mwa.signAndSendTransaction(activityResultSender, tx)
}
```

### Swap and De-Materialize

```kotlin
// DEX swap â†’ immediately return to virtual (reclaim rent)
suspend fun swapAndDematerialize(
    inputMint: PublicKey,
    outputMint: PublicKey,
    inputAmount: Long,
    minOutputAmount: Long,
): Result<String> {
    val ix = DamInstructions.swapAndDematerialize(
        inputMint = inputMint,
        outputMint = outputMint,
        inputAmount = inputAmount,
        minOutput = minOutputAmount,
    )
    
    val tx = styx.buildTransaction(listOf(ix), wallet)
    return styx.mwa.signAndSendTransaction(activityResultSender, tx)
}
```

---

## Encrypted Messaging

End-to-end encrypted messaging using **Signal Protocol** (X3DH + Double Ratchet):

### Publish Prekey Bundle

```kotlin
import nexus.styx.mobile.instructions.MessagingInstructions
import nexus.styx.mobile.crypto.X3dhKeys

// Generate and publish prekey bundle (one-time setup)
suspend fun publishPrekeyBundle(): Result<String> {
    // Generate X25519 keys for key exchange
    val identityKey = styx.crypto.generateX25519KeyPair()
    val signedPrekey = styx.crypto.generateX25519KeyPair()
    val oneTimePrekeys = (1..10).map { styx.crypto.generateX25519KeyPair() }
    
    // Store private keys securely
    styx.secureStorage.storeIdentityKey(identityKey.privateKey)
    styx.secureStorage.storeSignedPrekey(signedPrekey.privateKey)
    oneTimePrekeys.forEachIndexed { i, kp ->
        styx.secureStorage.storeOneTimePrekey(i, kp.privateKey)
    }
    
    // Publish public keys on-chain
    val ix = MessagingInstructions.prekeyBundlePublish(
        owner = wallet,
        identityKey = identityKey.publicKey,
        signedPrekey = signedPrekey.publicKey,
        signedPrekeySignature = styx.crypto.sign(signedPrekey.publicKey, identityKey.privateKey),
        oneTimePrekeys = oneTimePrekeys.map { it.publicKey },
    )
    
    val tx = styx.buildTransaction(listOf(ix), wallet)
    return styx.mwa.signAndSendTransaction(activityResultSender, tx)
}
```

### Send Encrypted Message

```kotlin
import nexus.styx.mobile.messaging.StyxMessaging
import nexus.styx.envelope.StyxEnvelope

// Send encrypted private message
suspend fun sendEncryptedMessage(
    recipient: PublicKey,
    plaintext: String,
): Result<String> {
    // 1. Fetch recipient's prekey bundle
    val bundle = styx.messaging.fetchPrekeyBundle(recipient)
    
    // 2. Perform X3DH key exchange (or use existing ratchet session)
    val session = styx.messaging.getOrCreateSession(recipient, bundle)
    
    // 3. Encrypt message using Double Ratchet
    val envelope = session.encrypt(plaintext.toByteArray(Charsets.UTF_8))
    
    // 4. Build and send on-chain message
    val ix = MessagingInstructions.privateMessage(
        sender = wallet,
        recipient = recipient,
        envelope = envelope.serialize(),
    )
    
    val tx = styx.buildTransaction(listOf(ix), wallet)
    return styx.mwa.signAndSendTransaction(activityResultSender, tx)
}
```

### Receive and Decrypt Messages

```kotlin
// Listen for incoming encrypted messages
fun observeMessages(): Flow<DecryptedMessage> {
    return styx.messaging.observeIncomingMessages(wallet)
        .map { envelope ->
            // Get or create session with sender
            val session = styx.messaging.getOrCreateSession(envelope.sender)
            
            // Decrypt using Double Ratchet
            val plaintext = session.decrypt(envelope)
            
            DecryptedMessage(
                sender = envelope.sender,
                content = String(plaintext, Charsets.UTF_8),
                timestamp = envelope.timestamp,
            )
        }
}

// In Compose
@Composable
fun MessageList() {
    val messages by styx.messaging.observeIncomingMessages(wallet)
        .collectAsState(initial = emptyList())
    
    LazyColumn {
        items(messages) { msg ->
            EncryptedMessageBubble(
                content = msg.decryptedContent,
                isSentByMe = msg.sender == wallet,
                timestamp = msg.timestamp,
            )
        }
    }
}
```

### Ratchet Message (Forward Secrecy)

```kotlin
// Send message with ratchet (provides forward secrecy)
suspend fun sendRatchetMessage(
    recipient: PublicKey,
    plaintext: String,
): Result<String> {
    val session = styx.messaging.getSession(recipient)
        ?: throw IllegalStateException("No session with recipient")
    
    // Ratchet advances the key chain (forward secrecy)
    val envelope = session.ratchetAndEncrypt(plaintext.toByteArray())
    
    val ix = MessagingInstructions.ratchetMessage(
        sender = wallet,
        recipient = recipient,
        envelope = envelope.serialize(),
        ratchetPublicKey = session.currentRatchetPublic,
    )
    
    val tx = styx.buildTransaction(listOf(ix), wallet)
    return styx.mwa.signAndSendTransaction(activityResultSender, tx)
}
```

---

## Shielded Pools & VSL

The **Virtual Shielded Ledger (VSL)** provides Tornado Cash-style privacy pools:

### Deposit to Shielded Pool

```kotlin
import nexus.styx.mobile.instructions.VslInstructions

// Deposit SOL into shielded pool
suspend fun depositToPool(
    amount: Long,
    commitmentSeed: ByteArray,
): Result<String> {
    val commitment = styx.crypto.computeCommitment(
        amount = amount,
        seed = commitmentSeed,
        owner = wallet,
    )
    
    val ix = VslInstructions.deposit(
        depositor = wallet,
        amount = amount,
        commitment = commitment,
    )
    
    // Store commitment locally for later withdrawal
    styx.secureStorage.storeCommitment(commitment, commitmentSeed, amount)
    
    val tx = styx.buildTransaction(listOf(ix), wallet)
    return styx.mwa.signAndSendTransaction(activityResultSender, tx)
}
```

### Withdraw from Shielded Pool

```kotlin
// Withdraw from shielded pool with nullifier
suspend fun withdrawFromPool(
    amount: Long,
    recipient: PublicKey,
    commitmentSeed: ByteArray,
    merkleProof: List<ByteArray>,
): Result<String> {
    // Compute nullifier (prevents double-spend)
    val nullifier = styx.crypto.computeNullifier(
        commitment = styx.crypto.computeCommitment(amount, commitmentSeed, wallet),
        secretKey = styx.secureStorage.getIdentityKey(),
    )
    
    val ix = VslInstructions.withdraw(
        recipient = recipient,
        amount = amount,
        nullifier = nullifier,
        merkleProof = merkleProof,
    )
    
    val tx = styx.buildTransaction(listOf(ix), wallet)
    return styx.mwa.signAndSendTransaction(activityResultSender, tx)
}
```

### Create Escrow

```kotlin
// Create escrow (time-locked or conditional release)
suspend fun createEscrow(
    amount: Long,
    recipient: PublicKey,
    releaseTime: Long, // Unix timestamp
    conditionHash: ByteArray?, // Optional hashlock condition
): Result<String> {
    val ix = VslInstructions.escrowCreate(
        depositor = wallet,
        recipient = recipient,
        amount = amount,
        releaseTime = releaseTime,
        conditionHash = conditionHash,
    )
    
    val tx = styx.buildTransaction(listOf(ix), wallet)
    return styx.mwa.signAndSendTransaction(activityResultSender, tx)
}
```

---

## Stealth Addresses

Generate one-time addresses for unlinkable payments:

```kotlin
import nexus.styx.mobile.stealth.StealthAddress

// Generate stealth meta-address (public receiving address)
fun generateStealthMeta(): StealthMetaAddress {
    val spendingKey = styx.crypto.generateX25519KeyPair()
    val viewingKey = styx.crypto.generateX25519KeyPair()
    
    styx.secureStorage.storeSpendingKey(spendingKey.privateKey)
    styx.secureStorage.storeViewingKey(viewingKey.privateKey)
    
    return StealthMetaAddress(
        spendingPublic = spendingKey.publicKey,
        viewingPublic = viewingKey.publicKey,
    )
}

// Generate one-time stealth address for payment
fun generateStealthAddress(
    recipientMeta: StealthMetaAddress,
): Pair<PublicKey, ByteArray> {
    val ephemeral = styx.crypto.generateX25519KeyPair()
    
    // ECDH: ephemeralPrivate Ã— recipientViewingPublic
    val sharedSecret = styx.crypto.x25519(
        ephemeral.privateKey,
        recipientMeta.viewingPublic,
    )
    
    // Derive stealth address
    val stealthAddress = styx.crypto.deriveStealthAddress(
        sharedSecret = sharedSecret,
        spendingPublic = recipientMeta.spendingPublic,
    )
    
    return Pair(stealthAddress, ephemeral.publicKey)
}

// Scan for payments to your stealth addresses
suspend fun scanStealthPayments(): List<StealthPayment> {
    val viewingKey = styx.secureStorage.getViewingKey()
    val spendingPublic = styx.secureStorage.getSpendingKey().publicKey
    
    return styx.stealth.scanPayments(
        viewingKey = viewingKey,
        spendingPublic = spendingPublic,
        fromSlot = lastScannedSlot,
    )
}
```

---

## Viewing Compressed Token Metadata

Query and display compressed token information:

### Get Compressed Token Balance

```kotlin
import nexus.styx.mobile.compression.CompressedToken

// Get all compressed token balances for a wallet
suspend fun getCompressedBalances(wallet: PublicKey): List<CompressedTokenBalance> {
    return styx.compression.getCompressedBalances(wallet)
}

// Get specific compressed token balance
suspend fun getCompressedBalance(
    mint: PublicKey,
    wallet: PublicKey,
): CompressedTokenBalance? {
    val stateTree = styx.getStateTree(mint)
    return stateTree.getBalance(wallet)
}

data class CompressedTokenBalance(
    val mint: PublicKey,
    val amount: Long,
    val leafIndex: Int,
    val commitment: ByteArray,
    val metadata: TokenMetadata?,
)
```

### Get Token Metadata

```kotlin
import nexus.styx.mobile.metadata.TokenMetadata

// Fetch metadata for a compressed token
suspend fun getTokenMetadata(mint: PublicKey): TokenMetadata? {
    return styx.metadata.getTokenMetadata(mint)
}

data class TokenMetadata(
    val name: String,
    val symbol: String,
    val decimals: Int,
    val uri: String?,
    val image: String?,
    val description: String?,
)

// In Compose UI
@Composable
fun CompressedTokenCard(balance: CompressedTokenBalance) {
    val metadata by produceState<TokenMetadata?>(null, balance.mint) {
        value = styx.metadata.getTokenMetadata(balance.mint)
    }
    
    Card {
        Row(verticalAlignment = Alignment.CenterVertically) {
            // Token icon
            AsyncImage(
                model = metadata?.image,
                contentDescription = metadata?.name,
                modifier = Modifier.size(40.dp),
            )
            
            Spacer(Modifier.width(12.dp))
            
            Column {
                Text(
                    text = metadata?.name ?: "Unknown Token",
                    style = MaterialTheme.typography.titleMedium,
                )
                Text(
                    text = formatBalance(balance.amount, metadata?.decimals ?: 9),
                    style = MaterialTheme.typography.bodyLarge,
                )
            }
            
            Spacer(Modifier.weight(1f))
            
            // Compression indicator
            Icon(
                imageVector = Icons.Default.Compress,
                contentDescription = "Compressed",
                tint = MaterialTheme.colorScheme.primary,
            )
        }
    }
}
```

### List State Trees

```kotlin
// Get all state trees (compressed token registries)
suspend fun listStateTrees(): List<StateTreeInfo> {
    return styx.compression.listStateTrees()
}

data class StateTreeInfo(
    val address: PublicKey,
    val mint: PublicKey,
    val leafCount: Int,
    val maxDepth: Int,
    val rootHash: ByteArray,
)
```

### Verify Merkle Proof

```kotlin
// Verify a compressed token's inclusion proof
suspend fun verifyCompressedToken(
    mint: PublicKey,
    leafIndex: Int,
    commitment: ByteArray,
): Boolean {
    val stateTree = styx.getStateTree(mint)
    val proof = stateTree.getProof(leafIndex)
    
    return styx.compression.verifyProof(
        root = stateTree.root,
        leafIndex = leafIndex,
        leaf = commitment,
        proof = proof,
    )
}
```

---

## Complete Wallet Example

Here's a complete Compose-based privacy wallet screen:

```kotlin
@Composable
fun PrivacyWalletScreen(styx: StyxClient) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val activityResultSender = remember { ActivityResultSender(context as Activity) }
    
    // State
    var walletAddress by remember { mutableStateOf<PublicKey?>(null) }
    var publicBalance by remember { mutableStateOf(0L) }
    var shieldedBalance by remember { mutableStateOf(0L) }
    var compressedBalances by remember { mutableStateOf<List<CompressedTokenBalance>>(emptyList()) }
    var virtualBalances by remember { mutableStateOf<List<VirtualBalance>>(emptyList()) }
    var messages by remember { mutableStateOf<List<DecryptedMessage>>(emptyList()) }
    
    // Load balances when wallet connects
    LaunchedEffect(walletAddress) {
        walletAddress?.let { wallet ->
            // Fetch all balance types
            publicBalance = styx.getBalance(wallet)
            shieldedBalance = styx.getShieldedBalance(wallet)
            compressedBalances = styx.compression.getCompressedBalances(wallet)
            virtualBalances = styx.dam.getVirtualBalances(wallet)
            
            // Start message listener
            styx.messaging.observeIncomingMessages(wallet)
                .collect { messages = messages + it }
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Styx Privacy Wallet") },
                actions = {
                    if (walletAddress != null) {
                        IconButton(onClick = { 
                            scope.launch { styx.mwa.disconnect(activityResultSender) }
                            walletAddress = null
                        }) {
                            Icon(Icons.Default.Logout, "Disconnect")
                        }
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Connect Button
            if (walletAddress == null) {
                item {
                    WalletConnectButton(
                        connected = false,
                        onConnect = {
                            scope.launch {
                                styx.mwa.connect(activityResultSender)
                                    .onSuccess { walletAddress = it }
                            }
                        },
                        onDisconnect = {},
                    )
                }
            }
            
            // Address Display
            walletAddress?.let { address ->
                item {
                    AddressDisplay(
                        address = address.toBase58(),
                        label = "Connected Wallet",
                        copyable = true,
                    )
                }
            }
            
            // Balance Overview
            item {
                PrivacyStatusCard(
                    publicBalance = publicBalance,
                    shieldedBalance = shieldedBalance,
                    compressedTokenCount = compressedBalances.size,
                    virtualTokenCount = virtualBalances.size,
                )
            }
            
            // Quick Actions
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ShieldButton(
                        mint = PublicKey.NATIVE_MINT,
                        amount = 100_000_000L, // 0.1 SOL
                        onShield = { mint, amount ->
                            scope.launch {
                                styx.shield(activityResultSender, mint, amount)
                            }
                        },
                        modifier = Modifier.weight(1f),
                    )
                    
                    UnshieldButton(
                        mint = PublicKey.NATIVE_MINT,
                        amount = 100_000_000L,
                        onUnshield = { mint, amount ->
                            scope.launch {
                                styx.unshield(activityResultSender, mint, amount)
                            }
                        },
                        modifier = Modifier.weight(1f),
                    )
                }
            }
            
            // Compressed Tokens Section
            if (compressedBalances.isNotEmpty()) {
                item {
                    Text(
                        text = "Compressed Tokens",
                        style = MaterialTheme.typography.titleMedium,
                    )
                }
                
                items(compressedBalances) { balance ->
                    CompressedTokenCard(
                        balance = balance,
                        onDecompress = {
                            scope.launch {
                                styx.decompress(activityResultSender, balance)
                            }
                        },
                    )
                }
            }
            
            // Virtual (DAM) Tokens Section
            if (virtualBalances.isNotEmpty()) {
                item {
                    Text(
                        text = "Virtual Tokens (Zero Rent)",
                        style = MaterialTheme.typography.titleMedium,
                    )
                }
                
                items(virtualBalances) { balance ->
                    VirtualTokenCard(
                        balance = balance,
                        onMaterialize = {
                            scope.launch {
                                styx.materialize(activityResultSender, balance)
                            }
                        },
                    )
                }
            }
            
            // Messages Section
            if (messages.isNotEmpty()) {
                item {
                    Text(
                        text = "Encrypted Messages",
                        style = MaterialTheme.typography.titleMedium,
                    )
                }
                
                items(messages) { message ->
                    EncryptedMessageBubble(
                        content = message.content,
                        isSentByMe = message.sender == walletAddress,
                        timestamp = message.timestamp,
                    )
                }
            }
        }
    }
}
```

---

## Security Best Practices

### 1. Secure Key Storage

```kotlin
// Always use Android Keystore-backed storage
val secureStorage = StyxSecureStorage(context)

// Never log or expose private keys
// âŒ DON'T: Log.d("Key", privateKey.toHex())
// âœ… DO: Store in secure storage only
secureStorage.storePrivateKey("identity", privateKey)
```

### 2. Commitment Security

```kotlin
// Use cryptographically secure random for commitments
val commitmentSeed = SecureRandom().generateSeed(32)

// Store commitment data for withdrawal
data class StoredCommitment(
    val commitment: ByteArray,
    val seed: ByteArray,
    val amount: Long,
    val mint: PublicKey,
    val timestamp: Long,
)

// Encrypt before storing
secureStorage.storeCommitment(commitment.encrypt(masterKey))
```

### 3. Nullifier Management

```kotlin
// Track spent nullifiers to prevent double-spend attempts
class NullifierTracker(private val storage: StyxSecureStorage) {
    fun markSpent(nullifier: ByteArray) {
        storage.addSpentNullifier(nullifier)
    }
    
    fun isSpent(nullifier: ByteArray): Boolean {
        return storage.isNullifierSpent(nullifier)
    }
}
```

### 4. Session Management

```kotlin
// Clear sensitive data on logout
fun logout() {
    // Clear ratchet sessions
    styx.messaging.clearAllSessions()
    
    // Clear cached commitments (keep backup!)
    styx.secureStorage.clearCache()
    
    // Disconnect MWA
    scope.launch {
        styx.mwa.disconnect(activityResultSender)
    }
}
```

### 5. Network Security

```kotlin
// Use certificate pinning for RPC calls
val config = StyxConfig(
    rpcUrl = "https://api.mainnet-beta.solana.com",
    certificatePins = listOf(
        "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    ),
)
```

---

## Version Matrix

| Component | Version |
|-----------|---------|
| Styx Android SDK | 1.3.0 |
| Kotlin | 2.1.0 (K2) |
| Android Gradle Plugin | 8.7.3 |
| Compile SDK | 35 (Android 15) |
| Min SDK | 24 (Android 7.0) |
| Target SDK | 35 |
| MWA clientlib-ktx | 2.1.0 |
| Compose UI | 1.7.6 |
| Material 3 | 1.3.1 |
| Coroutines | 1.10.1 |
| Ktor | 3.1.1 |
| BouncyCastle | 1.80 |

---

## Support & Resources

- **Program ID (Mainnet):** `STYXbZeL1wcNigy1WAMFbUQ7PNzJpPYV557H7foNyY5`
- **Maven Central:** `nexus.styx:styx-android:1.3.0`
- **GitHub:** [github.com/QuarksBlueFoot/StyxStack](https://github.com/QuarksBlueFoot/StyxStack)
- **Docs:** [docs.styx.nexus](https://docs.styx.nexus)

---

*Last updated: February 2026 Â· Styx Privacy SDK v1.3.0 Â· Bluefoot Labs*
