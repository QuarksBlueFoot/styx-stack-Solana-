# Android Messaging Integration Guide

## Signal-Style Private Messaging for Android Apps

This guide covers implementing **end-to-end encrypted messaging** in Android apps using the Styx Kotlin SDK. Includes X3DH key exchange, Double Ratchet forward secrecy, Solana Mobile Wallet Adapter integration, and Jetpack Compose UI patterns.

---

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Key Concepts](#key-concepts)
4. [Mobile Wallet Integration](#mobile-wallet-integration)
5. [PreKey Bundle Setup](#prekey-bundle-setup)
6. [X3DH Key Exchange](#x3dh-key-exchange)
7. [Double Ratchet Protocol](#double-ratchet-protocol)
8. [Sending Messages](#sending-messages)
9. [Receiving Messages](#receiving-messages)
10. [Message With Payment](#message-with-payment)
11. [Jetpack Compose UI](#jetpack-compose-ui)
12. [Secure Key Storage](#secure-key-storage)
13. [Push Notifications](#push-notifications)
14. [Security Best Practices](#security-best-practices)
15. [Troubleshooting](#troubleshooting)

---

## Overview

Styx Messaging implements the Signal Protocol on Solana for Android:

| Component | Implementation |
|-----------|----------------|
| **Key Exchange** | X3DH (Extended Triple Diffie-Hellman) |
| **Forward Secrecy** | Double Ratchet Algorithm |
| **Encryption** | XChaCha20-Poly1305 AEAD |
| **Key Type** | X25519 (Curve25519) |
| **Signing** | Ed25519 |
| **Wallet Integration** | Solana Mobile Wallet Adapter |
| **Target SDK** | Android 14+ (API 34) / Solana Seeker |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Android App                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Compose UI │  │  ViewModel   │  │  PrivateMessagingClient│  │
│  │  (ChatScreen)│  │  (ChatVM)    │  │  (Styx SDK)           │  │
│  └─────────────┘  └──────────────┘  └───────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  MWA Client │  │  EncryptedPrefs│  │  WebSocket Relay     │  │
│  │  (Wallet)   │  │  (Keys/Sessions)│ │  (Real-time)         │  │
│  └─────────────┘  └──────────────┘  └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Solana Network                               │
│  ┌───────────────────────┐  ┌───────────────────────────────┐  │
│  │   Styx Program        │  │   Styx Indexer                │  │
│  │   (On-chain Messages) │  │   (Message Queries)           │  │
│  └───────────────────────┘  └───────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Setup

### 1. Add Dependencies

**build.gradle.kts (app level):**

```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization") version "2.0.21"
}

android {
    compileSdk = 35
    
    defaultConfig {
        minSdk = 26
        targetSdk = 35
    }
    
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    // ── Styx KMP SDK (recommended) ──────────────────────────────────
    // Single dependency pulls all modules (crypto, messaging, privacy, MWA)
    implementation("com.styx.sdk:styx-android:1.0.0")
    
    // Or legacy nexus.styx artifacts (see ANDROID_NATIVE_INTEGRATION.md for migration)
    // implementation("nexus.styx:styx-android:1.0.0")
    // implementation("nexus.styx:styx-app-kit:1.0.0")
    // implementation("nexus.styx:styx-envelope:1.0.0")
    
    // Solana Mobile Wallet Adapter 2.1
    implementation("com.solanamobile:mobile-wallet-adapter-clientlib-ktx:2.1.0")
    
    // Cryptography
    implementation("org.bouncycastle:bcprov-jdk18on:1.80")
    
    // Compose
    implementation("androidx.compose.ui:ui:1.7.0")
    implementation("androidx.compose.material3:material3:1.3.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.0")
    
    // Encrypted SharedPreferences
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
    
    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")
    
    // Serialization
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
    
    // WebSocket (for real-time messages)
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}
```

### 2. Initialize Styx Client

```kotlin
// StyxApplication.kt
class StyxApplication : Application() {
    
    lateinit var styxClient: StyxClient
    lateinit var messagingClient: PrivateMessagingClient
    
    override fun onCreate() {
        super.onCreate()
        
        // Initialize Styx client
        styxClient = StyxClient(
            context = this,
            config = StyxConfig(
                cluster = Cluster.MAINNET_BETA,
                relayUrl = "https://relay.styx.nexus",
                indexerUrl = "https://api.styx.nexus"
            )
        )
    }
    
    fun initMessaging(userPubkey: String) {
        messagingClient = PrivateMessagingClient(
            styxClient = styxClient,
            userPubkey = userPubkey
        )
    }
}
```

---

## Key Concepts

### Key Types in Kotlin

```kotlin
import org.bouncycastle.crypto.generators.X25519KeyPairGenerator
import org.bouncycastle.crypto.params.X25519KeyGenerationParameters
import java.security.SecureRandom

/**
 * Key types used in Signal Protocol:
 * 
 * 1. Identity Key - Long-term Ed25519, derived from Solana wallet
 * 2. Signed PreKey - Medium-term X25519, rotated weekly
 * 3. One-Time PreKeys - Ephemeral X25519 pool, single-use
 * 4. Ephemeral Key - Per-message X25519
 */

data class X25519KeyPair(
    val publicKey: ByteArray,   // 32 bytes
    val privateKey: ByteArray   // 32 bytes
)

object StyxKeyGen {
    private val secureRandom = SecureRandom()
    
    /**
     * Generate X25519 keypair for Diffie-Hellman
     */
    fun generateX25519KeyPair(): X25519KeyPair {
        val generator = X25519KeyPairGenerator()
        generator.init(X25519KeyGenerationParameters(secureRandom))
        val keyPair = generator.generateKeyPair()
        
        val publicKey = (keyPair.public as X25519PublicKeyParameters).encoded
        val privateKey = (keyPair.private as X25519PrivateKeyParameters).encoded
        
        return X25519KeyPair(publicKey, privateKey)
    }
    
    /**
     * Convert Ed25519 public key to X25519 (for identity key DH)
     */
    fun ed25519ToX25519Public(ed25519Public: ByteArray): ByteArray {
        // Use Curve25519 birational map
        val edPoint = Ed25519PublicKeyParameters(ed25519Public, 0)
        return edPoint.encoded // Simplified - use full implementation
    }
    
    /**
     * Generate signed prekey with signature
     */
    fun generateSignedPrekey(identityKeypair: Ed25519PrivateKeyParameters): SignedPrekey {
        val keyPair = generateX25519KeyPair()
        val signature = signWithEd25519(keyPair.publicKey, identityKeypair)
        
        return SignedPrekey(
            id = System.currentTimeMillis().toInt(),
            publicKey = keyPair.publicKey,
            privateKey = keyPair.privateKey,
            signature = signature
        )
    }
    
    /**
     * Generate batch of one-time prekeys
     */
    fun generateOnetimePrekeys(count: Int): List<OnetimePrekey> {
        return (0 until count).map { index ->
            val keyPair = generateX25519KeyPair()
            OnetimePrekey(
                id = System.currentTimeMillis().toInt() + index,
                publicKey = keyPair.publicKey,
                privateKey = keyPair.privateKey
            )
        }
    }
}

data class SignedPrekey(
    val id: Int,
    val publicKey: ByteArray,
    val privateKey: ByteArray,
    val signature: ByteArray
)

data class OnetimePrekey(
    val id: Int,
    val publicKey: ByteArray,
    val privateKey: ByteArray
)
```

### PreKey Bundle Data Class

```kotlin
@Serializable
data class PrekeyBundle(
    val identityKey: String,              // Base58 Ed25519 public key
    val signedPrekey: String,             // Base58 X25519 public key
    val signedPrekeySignature: String,    // Base58 signature
    val signedPrekeyId: Int,
    val onetimePrekeys: List<OnetimePrekeyEntry>
)

@Serializable
data class OnetimePrekeyEntry(
    val id: Int,
    val key: String  // Base58 X25519 public key
)
```

---

## Mobile Wallet Integration

### Connect with Solana Mobile Wallet Adapter

```kotlin
import com.solana.mobilewalletadapter.clientlib.*
import android.app.Activity

class WalletManager(private val activity: Activity) {
    
    private val wallet = StyxMobileWallet(
        identityUri = Uri.parse("https://yourapp.styx.nexus"),
        iconUri = Uri.parse("https://yourapp.styx.nexus/icon.png"),
        identityName = "Your Styx App",
        cluster = "mainnet-beta"
    )
    
    val state = wallet.state
    
    /**
     * Connect to mobile wallet (Phantom, Solflare, etc.)
     */
    suspend fun connect(): Result<WalletAccount> {
        return wallet.connect(activity)
    }
    
    /**
     * Disconnect from wallet
     */
    fun disconnect() {
        wallet.disconnect()
    }
    
    /**
     * Sign and send messaging transaction
     */
    suspend fun signAndSendMessage(transaction: ByteArray): Result<String> {
        return wallet.signAndSendTransaction(activity, transaction)
    }
    
    /**
     * Sign prekey bundle for publishing
     */
    suspend fun signPrekeyBundle(bundleHash: ByteArray): Result<ByteArray> {
        return wallet.signMessage(activity, bundleHash)
    }
}
```

### ViewModel for Wallet State

```kotlin
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class WalletViewModel(
    private val walletManager: WalletManager
) : ViewModel() {
    
    val walletState = walletManager.state
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), MobileWalletState())
    
    private val _connectionError = MutableStateFlow<String?>(null)
    val connectionError = _connectionError.asStateFlow()
    
    fun connect() {
        viewModelScope.launch {
            walletManager.connect()
                .onSuccess { account ->
                    // Initialize messaging after wallet connects
                    (application as StyxApplication).initMessaging(account.publicKeyBase58)
                }
                .onFailure { error ->
                    _connectionError.value = error.message
                }
        }
    }
    
    fun disconnect() {
        walletManager.disconnect()
    }
}
```

---

## PreKey Bundle Setup

### Generate and Store Keys Securely

```kotlin
class PrekeyManager(
    private val context: Context,
    private val walletManager: WalletManager
) {
    private val secureStorage = SecureKeyStorage(context)
    
    /**
     * Initialize messaging - generate and publish prekey bundle
     */
    suspend fun initializeMessaging(): Result<String> {
        val walletPubkey = walletManager.state.value.account?.publicKeyBase58
            ?: return Result.failure(Exception("Wallet not connected"))
        
        // 1. Generate keys
        val signedPrekey = StyxKeyGen.generateSignedPrekey(getIdentityKeypair())
        val onetimePrekeys = StyxKeyGen.generateOnetimePrekeys(100)
        
        // 2. Store private keys securely
        secureStorage.saveSignedPrekeyPrivate(signedPrekey.privateKey)
        secureStorage.saveOnetimePrekeysPrivate(onetimePrekeys)
        
        // 3. Build bundle for on-chain publication
        val bundle = PrekeyBundle(
            identityKey = walletPubkey,
            signedPrekey = Base58.encode(signedPrekey.publicKey),
            signedPrekeySignature = Base58.encode(signedPrekey.signature),
            signedPrekeyId = signedPrekey.id,
            onetimePrekeys = onetimePrekeys.map { 
                OnetimePrekeyEntry(it.id, Base58.encode(it.publicKey)) 
            }
        )
        
        // 4. Build and send transaction
        return publishPrekeyBundle(bundle)
    }
    
    /**
     * Publish prekey bundle on-chain (Domain 0x02, Op 0x06)
     */
    private suspend fun publishPrekeyBundle(bundle: PrekeyBundle): Result<String> {
        val transaction = buildPrekeyBundleTransaction(bundle)
        return walletManager.signAndSendMessage(transaction)
    }
    
    /**
     * Replenish one-time keys when pool is low
     */
    suspend fun replenishOnetimeKeys(): Result<String> {
        val currentBundle = fetchCurrentBundle()
        val remainingKeys = currentBundle.onetimePrekeys.size
        
        if (remainingKeys > 20) {
            return Result.success("Sufficient keys remaining: $remainingKeys")
        }
        
        // Generate new keys
        val newKeys = StyxKeyGen.generateOnetimePrekeys(50)
        
        // Append to secure storage
        secureStorage.appendOnetimePrekeys(newKeys)
        
        // Publish refresh (Domain 0x02, Op 0x07)
        return refreshPrekeyBundle(newKeys.map { 
            OnetimePrekeyEntry(it.id, Base58.encode(it.publicKey)) 
        })
    }
    
    private fun buildPrekeyBundleTransaction(bundle: PrekeyBundle): ByteArray {
        val programId = StyxPrograms.STYX_MAINNET
        
        // Serialize bundle data
        val data = buildList {
            add(0x02.toByte())  // Domain: MESSAGING
            add(0x06.toByte())  // Op: PREKEY_BUNDLE_PUBLISH
            addAll(Base58.decode(bundle.identityKey).toList())
            addAll(Base58.decode(bundle.signedPrekey).toList())
            addAll(Base58.decode(bundle.signedPrekeySignature).toList())
            addAll(bundle.signedPrekeyId.toByteArray())
            add(bundle.onetimePrekeys.size.toByte())
            bundle.onetimePrekeys.forEach { otk ->
                addAll(otk.id.toByteArray())
                addAll(Base58.decode(otk.key).toList())
            }
        }.toByteArray()
        
        // Build transaction (simplified)
        return buildTransaction(programId, data)
    }
}
```

### Fetch Remote PreKey Bundle

```kotlin
class PrekeyFetcher(private val indexerUrl: String = "https://api.styx.nexus") {
    
    private val client = OkHttpClient()
    private val json = Json { ignoreUnknownKeys = true }
    
    /**
     * Fetch recipient's prekey bundle from indexer
     */
    suspend fun fetchPrekeyBundle(recipientPubkey: String): Result<PrekeyBundle> {
        return withContext(Dispatchers.IO) {
            try {
                val request = Request.Builder()
                    .url("$indexerUrl/v1/prekey-bundle/$recipientPubkey")
                    .get()
                    .build()
                
                val response = client.newCall(request).execute()
                
                if (!response.isSuccessful) {
                    return@withContext Result.failure(
                        Exception("Failed to fetch bundle: ${response.code}")
                    )
                }
                
                val body = response.body?.string() 
                    ?: return@withContext Result.failure(Exception("Empty response"))
                
                val bundle = json.decodeFromString<PrekeyBundle>(body)
                Result.success(bundle)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    /**
     * Verify signed prekey signature
     */
    fun verifySignedPrekey(bundle: PrekeyBundle): Boolean {
        val identityKey = Base58.decode(bundle.identityKey)
        val signedPrekey = Base58.decode(bundle.signedPrekey)
        val signature = Base58.decode(bundle.signedPrekeySignature)
        
        return Ed25519.verify(
            signature = signature,
            message = signedPrekey,
            publicKey = identityKey
        )
    }
}
```

---

## X3DH Key Exchange

### Initiating a Session (Sender)

```kotlin
import org.bouncycastle.crypto.agreement.X25519Agreement

class X3DHSession {
    
    /**
     * Perform X3DH key agreement as sender
     */
    fun initiateSession(
        ourIdentityPrivate: ByteArray,      // Ed25519 private key
        recipientBundle: PrekeyBundle
    ): X3DHResult {
        // 1. Generate ephemeral keypair
        val ephemeralKeyPair = StyxKeyGen.generateX25519KeyPair()
        
        // 2. Convert keys
        val ourIdentityX25519 = ed25519ToX25519Private(ourIdentityPrivate)
        val theirIdentityX25519 = ed25519ToX25519Public(Base58.decode(recipientBundle.identityKey))
        val theirSignedPrekey = Base58.decode(recipientBundle.signedPrekey)
        
        // 3. Select one-time prekey (if available)
        val onetimePrekey = recipientBundle.onetimePrekeys.firstOrNull()
        val theirOnetimePrekey = onetimePrekey?.let { Base58.decode(it.key) }
        
        // 4. Compute DH operations
        // DH1 = DH(IK_A, SPK_B) - Identity → Signed PreKey
        val dh1 = x25519(ourIdentityX25519, theirSignedPrekey)
        
        // DH2 = DH(EK_A, IK_B) - Ephemeral → Identity  
        val dh2 = x25519(ephemeralKeyPair.privateKey, theirIdentityX25519)
        
        // DH3 = DH(EK_A, SPK_B) - Ephemeral → Signed PreKey
        val dh3 = x25519(ephemeralKeyPair.privateKey, theirSignedPrekey)
        
        // DH4 = DH(EK_A, OPK_B) - Ephemeral → One-Time PreKey (optional)
        val dh4 = theirOnetimePrekey?.let { 
            x25519(ephemeralKeyPair.privateKey, it) 
        }
        
        // 5. Derive shared secret with HKDF
        val dhConcat = if (dh4 != null) {
            dh1 + dh2 + dh3 + dh4
        } else {
            dh1 + dh2 + dh3
        }
        
        val sharedSecret = hkdf(dhConcat, 32, "StyxX3DH".toByteArray())
        
        // 6. Build associated data for AEAD binding
        val associatedData = Base58.decode(recipientBundle.identityKey) + 
                             ephemeralKeyPair.publicKey
        
        return X3DHResult(
            sharedSecret = sharedSecret,
            ephemeralPublicKey = ephemeralKeyPair.publicKey,
            usedOnetimePrekeyId = onetimePrekey?.id,
            associatedData = associatedData
        )
    }
    
    /**
     * Process initial message as recipient
     */
    fun processInitialMessage(
        ourIdentityPrivate: ByteArray,
        ourSignedPrekeyPrivate: ByteArray,
        ourOnetimePrekeyPrivate: ByteArray?,
        senderIdentityKey: ByteArray,
        senderEphemeralKey: ByteArray
    ): ByteArray {
        val ourIdentityX25519 = ed25519ToX25519Private(ourIdentityPrivate)
        val senderIdentityX25519 = ed25519ToX25519Public(senderIdentityKey)
        
        // Mirror the sender's DH operations
        val dh1 = x25519(ourSignedPrekeyPrivate, senderIdentityX25519)
        val dh2 = x25519(ourIdentityX25519, senderEphemeralKey)
        val dh3 = x25519(ourSignedPrekeyPrivate, senderEphemeralKey)
        val dh4 = ourOnetimePrekeyPrivate?.let { 
            x25519(it, senderEphemeralKey) 
        }
        
        val dhConcat = if (dh4 != null) {
            dh1 + dh2 + dh3 + dh4
        } else {
            dh1 + dh2 + dh3
        }
        
        return hkdf(dhConcat, 32, "StyxX3DH".toByteArray())
    }
    
    private fun x25519(privateKey: ByteArray, publicKey: ByteArray): ByteArray {
        val agreement = X25519Agreement()
        val ourPrivate = X25519PrivateKeyParameters(privateKey, 0)
        val theirPublic = X25519PublicKeyParameters(publicKey, 0)
        
        agreement.init(ourPrivate)
        val sharedSecret = ByteArray(32)
        agreement.calculateAgreement(theirPublic, sharedSecret, 0)
        
        return sharedSecret
    }
    
    private fun hkdf(input: ByteArray, length: Int, info: ByteArray): ByteArray {
        val hkdf = HKDFBytesGenerator(SHA256Digest())
        hkdf.init(HKDFParameters(input, null, info))
        val output = ByteArray(length)
        hkdf.generateBytes(output, 0, length)
        return output
    }
}

data class X3DHResult(
    val sharedSecret: ByteArray,
    val ephemeralPublicKey: ByteArray,
    val usedOnetimePrekeyId: Int?,
    val associatedData: ByteArray
)
```

---

## Double Ratchet Protocol

### Full Implementation

```kotlin
import javax.crypto.Cipher
import javax.crypto.spec.SecretKeySpec
import javax.crypto.spec.GCMParameterSpec

/**
 * Complete Double Ratchet implementation for Android
 */
class DoubleRatchet(
    private var rootKey: ByteArray,
    initialRemoteDhPublic: ByteArray? = null
) {
    private var dhKeyPair = StyxKeyGen.generateX25519KeyPair()
    private var remoteDhPublic: ByteArray? = initialRemoteDhPublic
    private var sendChainKey: ByteArray = ByteArray(32)
    private var receiveChainKey: ByteArray = ByteArray(32)
    private var sendMessageNumber = 0
    private var receiveMessageNumber = 0
    private var previousChainLength = 0
    
    // Skipped message keys for out-of-order delivery
    private val skippedKeys = mutableMapOf<String, ByteArray>()
    
    /**
     * Initialize as sender (after X3DH)
     */
    fun initializeAsSender(x3dhSecret: ByteArray, recipientSignedPrekey: ByteArray) {
        rootKey = x3dhSecret
        remoteDhPublic = recipientSignedPrekey
        
        // Initial DH ratchet
        val dhOutput = x25519(dhKeyPair.privateKey, recipientSignedPrekey)
        val (newRootKey, newSendChainKey) = kdfRootKey(rootKey, dhOutput)
        rootKey = newRootKey
        sendChainKey = newSendChainKey
    }
    
    /**
     * Initialize as recipient (after X3DH)
     */
    fun initializeAsRecipient(x3dhSecret: ByteArray) {
        rootKey = x3dhSecret
        // Will complete initialization on first message
    }
    
    /**
     * Encrypt a message
     */
    fun encrypt(plaintext: ByteArray): EncryptedRatchetMessage {
        // Derive message key
        val (messageKey, newChainKey) = kdfChainKey(sendChainKey)
        sendChainKey = newChainKey
        
        // Generate nonce
        val nonce = StyxCrypto.randomBytes(24)
        
        // Encrypt with XChaCha20-Poly1305
        val ciphertext = xChaCha20Poly1305Encrypt(messageKey, nonce, plaintext)
        
        val header = RatchetHeader(
            dhPublicKey = dhKeyPair.publicKey,
            previousChainLength = previousChainLength,
            messageNumber = sendMessageNumber
        )
        
        sendMessageNumber++
        
        return EncryptedRatchetMessage(
            header = header,
            nonce = nonce,
            ciphertext = ciphertext
        )
    }
    
    /**
     * Decrypt a message
     */
    fun decrypt(message: EncryptedRatchetMessage): ByteArray {
        // Try skipped keys first
        trySkippedKey(message)?.let { return it }
        
        // Check if DH ratchet needed
        if (remoteDhPublic == null || !message.header.dhPublicKey.contentEquals(remoteDhPublic)) {
            performDhRatchet(message.header)
        }
        
        // Skip messages if needed
        skipMessageKeys(message.header.messageNumber)
        
        // Derive message key
        val (messageKey, newChainKey) = kdfChainKey(receiveChainKey)
        receiveChainKey = newChainKey
        receiveMessageNumber = message.header.messageNumber + 1
        
        // Decrypt
        return xChaCha20Poly1305Decrypt(messageKey, message.nonce, message.ciphertext)
    }
    
    private fun performDhRatchet(header: RatchetHeader) {
        // Store skipped keys from previous chain
        if (remoteDhPublic != null) {
            skipMessageKeys(header.previousChainLength)
        }
        
        remoteDhPublic = header.dhPublicKey
        
        // Receive chain ratchet
        val dhOutput = x25519(dhKeyPair.privateKey, header.dhPublicKey)
        val (newRootKey, newReceiveChainKey) = kdfRootKey(rootKey, dhOutput)
        rootKey = newRootKey
        receiveChainKey = newReceiveChainKey
        
        // Generate new DH keypair
        previousChainLength = sendMessageNumber
        sendMessageNumber = 0
        receiveMessageNumber = 0
        dhKeyPair = StyxKeyGen.generateX25519KeyPair()
        
        // Send chain ratchet
        val dhOutput2 = x25519(dhKeyPair.privateKey, header.dhPublicKey)
        val (newRootKey2, newSendChainKey) = kdfRootKey(rootKey, dhOutput2)
        rootKey = newRootKey2
        sendChainKey = newSendChainKey
    }
    
    private fun skipMessageKeys(until: Int) {
        while (receiveMessageNumber < until) {
            val (messageKey, newChainKey) = kdfChainKey(receiveChainKey)
            receiveChainKey = newChainKey
            
            // Store for later retrieval
            val keyId = "${remoteDhPublic?.toHex()}:$receiveMessageNumber"
            skippedKeys[keyId] = messageKey
            
            receiveMessageNumber++
            
            // Limit stored keys to prevent memory issues
            if (skippedKeys.size > 1000) {
                skippedKeys.keys.take(100).forEach { skippedKeys.remove(it) }
            }
        }
    }
    
    private fun trySkippedKey(message: EncryptedRatchetMessage): ByteArray? {
        val keyId = "${message.header.dhPublicKey.toHex()}:${message.header.messageNumber}"
        val messageKey = skippedKeys.remove(keyId) ?: return null
        
        return xChaCha20Poly1305Decrypt(messageKey, message.nonce, message.ciphertext)
    }
    
    private fun kdfRootKey(rootKey: ByteArray, dhOutput: ByteArray): Pair<ByteArray, ByteArray> {
        val hkdf = HKDFBytesGenerator(SHA256Digest())
        hkdf.init(HKDFParameters(dhOutput, rootKey, "StyxRootKey".toByteArray()))
        val output = ByteArray(64)
        hkdf.generateBytes(output, 0, 64)
        return output.sliceArray(0..31) to output.sliceArray(32..63)
    }
    
    private fun kdfChainKey(chainKey: ByteArray): Pair<ByteArray, ByteArray> {
        val messageKey = hmacSha256(chainKey, byteArrayOf(0x01))
        val newChainKey = hmacSha256(chainKey, byteArrayOf(0x02))
        return messageKey to newChainKey
    }
    
    /**
     * Export session state for persistence
     */
    fun exportState(): RatchetState {
        return RatchetState(
            rootKey = rootKey,
            dhPublicKey = dhKeyPair.publicKey,
            dhPrivateKey = dhKeyPair.privateKey,
            remoteDhPublic = remoteDhPublic,
            sendChainKey = sendChainKey,
            receiveChainKey = receiveChainKey,
            sendMessageNumber = sendMessageNumber,
            receiveMessageNumber = receiveMessageNumber,
            previousChainLength = previousChainLength,
            skippedKeys = skippedKeys.toMap()
        )
    }
    
    /**
     * Restore session from state
     */
    fun restoreState(state: RatchetState) {
        rootKey = state.rootKey
        dhKeyPair = X25519KeyPair(state.dhPublicKey, state.dhPrivateKey)
        remoteDhPublic = state.remoteDhPublic
        sendChainKey = state.sendChainKey
        receiveChainKey = state.receiveChainKey
        sendMessageNumber = state.sendMessageNumber
        receiveMessageNumber = state.receiveMessageNumber
        previousChainLength = state.previousChainLength
        skippedKeys.clear()
        skippedKeys.putAll(state.skippedKeys)
    }
}

@Serializable
data class RatchetHeader(
    val dhPublicKey: ByteArray,
    val previousChainLength: Int,
    val messageNumber: Int
)

@Serializable
data class EncryptedRatchetMessage(
    val header: RatchetHeader,
    val nonce: ByteArray,
    val ciphertext: ByteArray
)

@Serializable
data class RatchetState(
    val rootKey: ByteArray,
    val dhPublicKey: ByteArray,
    val dhPrivateKey: ByteArray,
    val remoteDhPublic: ByteArray?,
    val sendChainKey: ByteArray,
    val receiveChainKey: ByteArray,
    val sendMessageNumber: Int,
    val receiveMessageNumber: Int,
    val previousChainLength: Int,
    val skippedKeys: Map<String, ByteArray>
)
```

---

## Sending Messages

### High-Level Messaging Client

```kotlin
class MessagingClient(
    private val context: Context,
    private val walletManager: WalletManager,
    private val sessionStore: SessionStore
) {
    private val prekeyFetcher = PrekeyFetcher()
    private val sessions = mutableMapOf<String, DoubleRatchet>()
    
    /**
     * Send encrypted message to recipient
     */
    suspend fun sendMessage(
        recipientPubkey: String,
        content: String
    ): Result<SentMessage> {
        // 1. Get or create session
        val session = getOrCreateSession(recipientPubkey).getOrElse { 
            return Result.failure(it) 
        }
        
        // 2. Encrypt with Double Ratchet
        val encrypted = session.encrypt(content.toByteArray(Charsets.UTF_8))
        
        // 3. Build on-chain message
        val onChainMessage = OnChainMessage(
            domain = 0x02,
            op = 0x04, // RATCHET_MESSAGE
            recipientIdentity = Base58.decode(recipientPubkey),
            dhPublic = encrypted.header.dhPublicKey,
            messageNumber = encrypted.header.messageNumber,
            previousChainLength = encrypted.header.previousChainLength,
            nonce = encrypted.nonce,
            ciphertext = encrypted.ciphertext
        )
        
        // 4. Build and send transaction
        val transaction = buildMessageTransaction(onChainMessage)
        val signatureResult = walletManager.signAndSendMessage(transaction)
        
        return signatureResult.map { signature ->
            // 5. Save session state
            sessionStore.saveSession(recipientPubkey, session.exportState())
            
            SentMessage(
                id = signature,
                recipient = recipientPubkey,
                content = content,
                timestamp = System.currentTimeMillis()
            )
        }
    }
    
    /**
     * Get or create Double Ratchet session with recipient
     */
    private suspend fun getOrCreateSession(recipientPubkey: String): Result<DoubleRatchet> {
        // Check for existing session
        sessions[recipientPubkey]?.let { return Result.success(it) }
        
        // Try to restore from storage
        sessionStore.getSession(recipientPubkey)?.let { state ->
            val session = DoubleRatchet(state.rootKey)
            session.restoreState(state)
            sessions[recipientPubkey] = session
            return Result.success(session)
        }
        
        // Need to perform X3DH key exchange
        return initializeNewSession(recipientPubkey)
    }
    
    /**
     * Initialize new session with X3DH
     */
    private suspend fun initializeNewSession(recipientPubkey: String): Result<DoubleRatchet> {
        // 1. Fetch recipient's prekey bundle
        val bundle = prekeyFetcher.fetchPrekeyBundle(recipientPubkey)
            .getOrElse { return Result.failure(it) }
        
        // 2. Verify signed prekey
        if (!prekeyFetcher.verifySignedPrekey(bundle)) {
            return Result.failure(Exception("Invalid prekey signature - possible MITM attack"))
        }
        
        // 3. Get our identity key from wallet
        val ourIdentityPrivate = getIdentityPrivateKey()
        
        // 4. Perform X3DH
        val x3dhSession = X3DHSession()
        val x3dhResult = x3dhSession.initiateSession(ourIdentityPrivate, bundle)
        
        // 5. Initialize Double Ratchet
        val ratchet = DoubleRatchet(x3dhResult.sharedSecret)
        ratchet.initializeAsSender(
            x3dhResult.sharedSecret,
            Base58.decode(bundle.signedPrekey)
        )
        
        sessions[recipientPubkey] = ratchet
        
        // 6. Store initial session info for first message header
        sessionStore.saveInitialSessionInfo(recipientPubkey, InitialSessionInfo(
            ephemeralPublicKey = x3dhResult.ephemeralPublicKey,
            usedOnetimePrekeyId = x3dhResult.usedOnetimePrekeyId
        ))
        
        return Result.success(ratchet)
    }
    
    private fun buildMessageTransaction(message: OnChainMessage): ByteArray {
        val programId = StyxPrograms.STYX_MAINNET
        
        val data = buildList {
            add(message.domain.toByte())
            add(message.op.toByte())
            addAll(message.recipientIdentity.toList())
            addAll(message.dhPublic.toList())
            addAll(message.messageNumber.toByteArray())
            addAll(message.previousChainLength.toByteArray())
            addAll(message.nonce.toList())
            addAll(message.ciphertext.toList())
        }.toByteArray()
        
        return buildTransaction(programId, data)
    }
}

data class SentMessage(
    val id: String,
    val recipient: String,
    val content: String,
    val timestamp: Long
)

data class OnChainMessage(
    val domain: Int,
    val op: Int,
    val recipientIdentity: ByteArray,
    val dhPublic: ByteArray,
    val messageNumber: Int,
    val previousChainLength: Int,
    val nonce: ByteArray,
    val ciphertext: ByteArray
)
```

---

## Receiving Messages

### WebSocket Real-Time Connection

```kotlin
import okhttp3.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.receiveAsFlow

class MessageRelay(
    private val relayUrl: String = "wss://relay.styx.nexus",
    private val walletPubkey: String
) {
    private val client = OkHttpClient()
    private var webSocket: WebSocket? = null
    
    private val _messages = Channel<EncryptedRelayMessage>(Channel.UNLIMITED)
    val messages: Flow<EncryptedRelayMessage> = _messages.receiveAsFlow()
    
    private val _connectionState = MutableStateFlow(ConnectionState.DISCONNECTED)
    val connectionState = _connectionState.asStateFlow()
    
    /**
     * Connect to message relay
     */
    fun connect() {
        val request = Request.Builder()
            .url("$relayUrl/ws/messages/$walletPubkey")
            .build()
        
        _connectionState.value = ConnectionState.CONNECTING
        
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                _connectionState.value = ConnectionState.CONNECTED
            }
            
            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val message = Json.decodeFromString<EncryptedRelayMessage>(text)
                    _messages.trySend(message)
                } catch (e: Exception) {
                    Log.e("MessageRelay", "Failed to parse message", e)
                }
            }
            
            override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
                // Handle binary messages
                try {
                    val message = parseEncryptedMessage(bytes.toByteArray())
                    _messages.trySend(message)
                } catch (e: Exception) {
                    Log.e("MessageRelay", "Failed to parse binary message", e)
                }
            }
            
            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                _connectionState.value = ConnectionState.DISCONNECTED
            }
            
            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                _connectionState.value = ConnectionState.ERROR
                Log.e("MessageRelay", "WebSocket error", t)
                
                // Auto-reconnect after delay
                reconnectAfterDelay()
            }
        })
    }
    
    fun disconnect() {
        webSocket?.close(1000, "User disconnect")
        webSocket = null
    }
    
    private fun reconnectAfterDelay() {
        Handler(Looper.getMainLooper()).postDelayed({
            if (_connectionState.value != ConnectionState.CONNECTED) {
                connect()
            }
        }, 5000)
    }
}

enum class ConnectionState {
    DISCONNECTED, CONNECTING, CONNECTED, ERROR
}

@Serializable
data class EncryptedRelayMessage(
    val senderPubkey: String,
    val encryptedPayload: String,  // Base64
    val timestamp: Long
)
```

### Message Receiver Component

```kotlin
class MessageReceiver(
    private val context: Context,
    private val sessionStore: SessionStore,
    private val messagingClient: MessagingClient
) {
    private val sessions = mutableMapOf<String, DoubleRatchet>()
    
    /**
     * Process incoming encrypted message
     */
    suspend fun processMessage(
        encryptedMessage: EncryptedRelayMessage
    ): Result<DecryptedMessage> {
        val senderPubkey = encryptedMessage.senderPubkey
        
        // 1. Parse encrypted payload
        val payload = parsePayload(Base64.decode(encryptedMessage.encryptedPayload, Base64.DEFAULT))
        
        // 2. Get or restore session
        val session = getOrRestoreSession(senderPubkey, payload)
            .getOrElse { return Result.failure(it) }
        
        // 3. Decrypt with Double Ratchet
        val ratchetMessage = EncryptedRatchetMessage(
            header = RatchetHeader(
                dhPublicKey = payload.dhPublic,
                previousChainLength = payload.previousChainLength,
                messageNumber = payload.messageNumber
            ),
            nonce = payload.nonce,
            ciphertext = payload.ciphertext
        )
        
        return try {
            val plaintext = session.decrypt(ratchetMessage)
            
            // 4. Save updated session state
            sessionStore.saveSession(senderPubkey, session.exportState())
            
            Result.success(DecryptedMessage(
                id = UUID.randomUUID().toString(),
                sender = senderPubkey,
                content = String(plaintext, Charsets.UTF_8),
                timestamp = encryptedMessage.timestamp
            ))
        } catch (e: Exception) {
            Result.failure(Exception("Decryption failed: ${e.message}"))
        }
    }
    
    /**
     * Get session or initialize from initial message
     */
    private suspend fun getOrRestoreSession(
        senderPubkey: String,
        payload: MessagePayload
    ): Result<DoubleRatchet> {
        // Check for existing session
        sessions[senderPubkey]?.let { return Result.success(it) }
        
        // Try to restore from storage
        sessionStore.getSession(senderPubkey)?.let { state ->
            val session = DoubleRatchet(state.rootKey)
            session.restoreState(state)
            sessions[senderPubkey] = session
            return Result.success(session)
        }
        
        // This is an initial message - need to process X3DH
        if (payload.isInitialMessage) {
            return processInitialMessage(senderPubkey, payload)
        }
        
        return Result.failure(Exception("No session found for sender"))
    }
    
    /**
     * Process first message and complete X3DH as recipient
     */
    private suspend fun processInitialMessage(
        senderPubkey: String,
        payload: MessagePayload
    ): Result<DoubleRatchet> {
        val secureStorage = SecureKeyStorage(context)
        
        // Load our keys
        val signedPrekeyPrivate = secureStorage.getSignedPrekeyPrivate()
            ?: return Result.failure(Exception("No signed prekey found"))
        
        val onetimePrekeyPrivate = payload.usedOnetimePrekeyId?.let { id ->
            secureStorage.getOnetimePrekeyPrivate(id)
        }
        
        // Get our identity key
        val ourIdentityPrivate = getIdentityPrivateKey()
        
        // Perform X3DH as recipient
        val x3dh = X3DHSession()
        val sharedSecret = x3dh.processInitialMessage(
            ourIdentityPrivate = ourIdentityPrivate,
            ourSignedPrekeyPrivate = signedPrekeyPrivate,
            ourOnetimePrekeyPrivate = onetimePrekeyPrivate,
            senderIdentityKey = Base58.decode(senderPubkey),
            senderEphemeralKey = payload.senderEphemeralKey!!
        )
        
        // Delete used one-time prekey (must be one-time use!)
        payload.usedOnetimePrekeyId?.let { id ->
            secureStorage.deleteOnetimePrekey(id)
        }
        
        // Initialize Double Ratchet as recipient
        val ratchet = DoubleRatchet(sharedSecret)
        ratchet.initializeAsRecipient(sharedSecret)
        
        sessions[senderPubkey] = ratchet
        
        return Result.success(ratchet)
    }
}

data class DecryptedMessage(
    val id: String,
    val sender: String,
    val content: String,
    val timestamp: Long
)

data class MessagePayload(
    val dhPublic: ByteArray,
    val messageNumber: Int,
    val previousChainLength: Int,
    val nonce: ByteArray,
    val ciphertext: ByteArray,
    val isInitialMessage: Boolean = false,
    val senderEphemeralKey: ByteArray? = null,
    val usedOnetimePrekeyId: Int? = null
)
```

---

## Message With Payment

### Send SOL or Token with Message

```kotlin
class PaymentMessaging(
    private val messagingClient: MessagingClient,
    private val walletManager: WalletManager
) {
    /**
     * Send encrypted message with SOL payment
     */
    suspend fun sendMessageWithSol(
        recipientPubkey: String,
        content: String,
        lamports: Long
    ): Result<SentPaymentMessage> {
        // 1. Encrypt message content + payment info
        val paymentInfo = PaymentInfo(
            type = PaymentType.SOL,
            amount = lamports
        )
        
        val encryptedContent = "$content\n__PAYMENT__${Json.encodeToString(paymentInfo)}"
        
        // 2. Build combined transaction
        val transaction = buildPaymentMessageTransaction(
            recipientPubkey = recipientPubkey,
            encryptedContent = encryptedContent,
            lamports = lamports
        )
        
        // 3. Sign and send
        return walletManager.signAndSendMessage(transaction).map { signature ->
            SentPaymentMessage(
                messageId = signature,
                recipient = recipientPubkey,
                content = content,
                paymentAmount = lamports,
                paymentType = PaymentType.SOL
            )
        }
    }
    
    /**
     * Send encrypted message with SPL token
     */
    suspend fun sendMessageWithToken(
        recipientPubkey: String,
        content: String,
        tokenMint: String,
        amount: Long
    ): Result<SentPaymentMessage> {
        // Build SPL transfer instruction alongside message
        val transaction = buildTokenPaymentMessageTransaction(
            recipientPubkey = recipientPubkey,
            content = content,
            tokenMint = tokenMint,
            amount = amount
        )
        
        return walletManager.signAndSendMessage(transaction).map { signature ->
            SentPaymentMessage(
                messageId = signature,
                recipient = recipientPubkey,
                content = content,
                paymentAmount = amount,
                paymentType = PaymentType.SPL_TOKEN,
                tokenMint = tokenMint
            )
        }
    }
}

@Serializable
data class PaymentInfo(
    val type: PaymentType,
    val amount: Long,
    val tokenMint: String? = null
)

@Serializable
enum class PaymentType {
    SOL, SPL_TOKEN, SPS_SHIELDED
}

data class SentPaymentMessage(
    val messageId: String,
    val recipient: String,
    val content: String,
    val paymentAmount: Long,
    val paymentType: PaymentType,
    val tokenMint: String? = null
)
```

---

## Jetpack Compose UI

### Complete Chat Screen

```kotlin
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun ChatScreen(
    recipientPubkey: String,
    viewModel: ChatViewModel = viewModel()
) {
    val messages by viewModel.messages.collectAsState()
    val sendingState by viewModel.sendingState.collectAsState()
    val connectionState by viewModel.connectionState.collectAsState()
    
    var inputText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()
    
    LaunchedEffect(recipientPubkey) {
        viewModel.loadConversation(recipientPubkey)
        viewModel.connectRelay()
    }
    
    // Auto-scroll to bottom on new messages
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }
    
    Scaffold(
        topBar = {
            ChatTopBar(
                recipientPubkey = recipientPubkey,
                connectionState = connectionState
            )
        },
        bottomBar = {
            ChatInputBar(
                text = inputText,
                onTextChange = { inputText = it },
                onSend = {
                    viewModel.sendMessage(recipientPubkey, inputText)
                    inputText = ""
                },
                sending = sendingState == SendingState.SENDING
            )
        }
    ) { padding ->
        LazyColumn(
            state = listState,
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(messages, key = { it.id }) { message ->
                MessageBubble(
                    message = message,
                    isOwn = message.isOwn
                )
            }
        }
    }
}

@Composable
fun ChatTopBar(
    recipientPubkey: String,
    connectionState: ConnectionState
) {
    TopAppBar(
        title = {
            Column {
                Text(
                    text = recipientPubkey.take(8) + "..." + recipientPubkey.takeLast(4),
                    style = MaterialTheme.typography.titleMedium
                )
                Text(
                    text = when (connectionState) {
                        ConnectionState.CONNECTED -> "🟢 Encrypted"
                        ConnectionState.CONNECTING -> "🟡 Connecting..."
                        else -> "🔴 Offline"
                    },
                    style = MaterialTheme.typography.bodySmall
                )
            }
        },
        actions = {
            IconButton(onClick = { /* Show conversation info */ }) {
                Icon(Icons.Default.Info, contentDescription = "Info")
            }
        }
    )
}

@Composable
fun MessageBubble(
    message: DisplayMessage,
    isOwn: Boolean
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isOwn) Arrangement.End else Arrangement.Start
    ) {
        Surface(
            shape = RoundedCornerShape(
                topStart = 16.dp,
                topEnd = 16.dp,
                bottomStart = if (isOwn) 16.dp else 4.dp,
                bottomEnd = if (isOwn) 4.dp else 16.dp
            ),
            color = if (isOwn) {
                MaterialTheme.colorScheme.primary
            } else {
                MaterialTheme.colorScheme.surfaceVariant
            },
            modifier = Modifier.widthIn(max = 280.dp)
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    text = message.content,
                    color = if (isOwn) {
                        MaterialTheme.colorScheme.onPrimary
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    }
                )
                
                // Payment badge if present
                message.payment?.let { payment ->
                    Spacer(modifier = Modifier.height(4.dp))
                    PaymentBadge(payment = payment)
                }
                
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = formatTime(message.timestamp),
                    style = MaterialTheme.typography.bodySmall,
                    color = if (isOwn) {
                        MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f)
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                    }
                )
            }
        }
    }
}

@Composable
fun PaymentBadge(payment: MessagePayment) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.tertiaryContainer
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.AttachMoney,
                contentDescription = "Payment",
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = "${payment.formattedAmount} ${payment.symbol}",
                style = MaterialTheme.typography.labelMedium
            )
        }
    }
}

@Composable
fun ChatInputBar(
    text: String,
    onTextChange: (String) -> Unit,
    onSend: () -> Unit,
    sending: Boolean
) {
    Surface(
        shadowElevation = 8.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            TextField(
                value = text,
                onValueChange = onTextChange,
                modifier = Modifier.weight(1f),
                placeholder = { Text("Type a message...") },
                colors = TextFieldDefaults.colors(
                    unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                    focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant
                ),
                shape = RoundedCornerShape(24.dp)
            )
            
            Spacer(modifier = Modifier.width(8.dp))
            
            IconButton(
                onClick = onSend,
                enabled = text.isNotBlank() && !sending
            ) {
                if (sending) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Icon(Icons.Default.Send, contentDescription = "Send")
                }
            }
        }
    }
}
```

### Chat ViewModel

```kotlin
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class ChatViewModel(
    private val messagingClient: MessagingClient,
    private val messageRelay: MessageRelay,
    private val messageReceiver: MessageReceiver
) : ViewModel() {
    
    private val _messages = MutableStateFlow<List<DisplayMessage>>(emptyList())
    val messages = _messages.asStateFlow()
    
    private val _sendingState = MutableStateFlow(SendingState.IDLE)
    val sendingState = _sendingState.asStateFlow()
    
    val connectionState = messageRelay.connectionState
    
    private var currentRecipient: String? = null
    
    init {
        // Listen for incoming messages
        viewModelScope.launch {
            messageRelay.messages.collect { encrypted ->
                processIncomingMessage(encrypted)
            }
        }
    }
    
    fun loadConversation(recipientPubkey: String) {
        currentRecipient = recipientPubkey
        viewModelScope.launch {
            // Load from local storage/indexer
            val history = loadMessageHistory(recipientPubkey)
            _messages.value = history
        }
    }
    
    fun connectRelay() {
        messageRelay.connect()
    }
    
    fun sendMessage(recipientPubkey: String, content: String) {
        if (content.isBlank()) return
        
        viewModelScope.launch {
            _sendingState.value = SendingState.SENDING
            
            messagingClient.sendMessage(recipientPubkey, content)
                .onSuccess { sent ->
                    // Add to local messages
                    _messages.value = _messages.value + DisplayMessage(
                        id = sent.id,
                        content = sent.content,
                        timestamp = sent.timestamp,
                        isOwn = true
                    )
                    _sendingState.value = SendingState.SUCCESS
                }
                .onFailure { error ->
                    _sendingState.value = SendingState.ERROR
                    // Show error to user
                }
            
            // Reset state after delay
            delay(1000)
            _sendingState.value = SendingState.IDLE
        }
    }
    
    private suspend fun processIncomingMessage(encrypted: EncryptedRelayMessage) {
        if (encrypted.senderPubkey != currentRecipient) return
        
        messageReceiver.processMessage(encrypted)
            .onSuccess { decrypted ->
                _messages.value = _messages.value + DisplayMessage(
                    id = decrypted.id,
                    content = decrypted.content,
                    timestamp = decrypted.timestamp,
                    isOwn = false
                )
            }
            .onFailure { error ->
                Log.e("ChatVM", "Failed to decrypt message", error)
            }
    }
}

data class DisplayMessage(
    val id: String,
    val content: String,
    val timestamp: Long,
    val isOwn: Boolean,
    val payment: MessagePayment? = null
)

data class MessagePayment(
    val amount: Long,
    val symbol: String,
    val formattedAmount: String
)

enum class SendingState {
    IDLE, SENDING, SUCCESS, ERROR
}
```

### Conversations List Screen

```kotlin
@Composable
fun ConversationsScreen(
    viewModel: ConversationsViewModel = viewModel(),
    onConversationClick: (String) -> Unit
) {
    val conversations by viewModel.conversations.collectAsState()
    val unreadTotal by viewModel.unreadTotal.collectAsState()
    
    LaunchedEffect(Unit) {
        viewModel.loadConversations()
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Text("Messages")
                },
                actions = {
                    if (unreadTotal > 0) {
                        Badge { Text(unreadTotal.toString()) }
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { /* New conversation */ }
            ) {
                Icon(Icons.Default.Edit, contentDescription = "New Message")
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            items(conversations, key = { it.id }) { conversation ->
                ConversationItem(
                    conversation = conversation,
                    onClick = { onConversationClick(conversation.recipientPubkey) }
                )
            }
        }
    }
}

@Composable
fun ConversationItem(
    conversation: ConversationPreview,
    onClick: () -> Unit
) {
    ListItem(
        headlineContent = {
            Text(
                text = conversation.displayName,
                fontWeight = if (conversation.unreadCount > 0) FontWeight.Bold else FontWeight.Normal
            )
        },
        supportingContent = {
            Text(
                text = conversation.lastMessagePreview,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        },
        leadingContent = {
            // Avatar
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(
                        MaterialTheme.colorScheme.primaryContainer,
                        CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = conversation.displayName.first().toString(),
                    style = MaterialTheme.typography.titleMedium
                )
            }
        },
        trailingContent = {
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = formatRelativeTime(conversation.lastMessageTime),
                    style = MaterialTheme.typography.bodySmall
                )
                if (conversation.unreadCount > 0) {
                    Badge { Text(conversation.unreadCount.toString()) }
                }
            }
        },
        modifier = Modifier.clickable(onClick = onClick)
    )
}

data class ConversationPreview(
    val id: String,
    val recipientPubkey: String,
    val displayName: String,
    val lastMessagePreview: String,
    val lastMessageTime: Long,
    val unreadCount: Int
)
```

---

## Secure Key Storage

### Android Keystore + EncryptedSharedPreferences

```kotlin
import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class SecureKeyStorage(context: Context) {
    
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()
    
    private val prefs = EncryptedSharedPreferences.create(
        context,
        "styx_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
    
    private val json = Json { ignoreUnknownKeys = true }
    
    // ════════════════════════════════════════════════════════════════════════════
    // SIGNED PREKEY
    // ════════════════════════════════════════════════════════════════════════════
    
    fun saveSignedPrekeyPrivate(privateKey: ByteArray) {
        prefs.edit()
            .putString("signed_prekey_private", Base64.encodeToString(privateKey, Base64.NO_WRAP))
            .apply()
    }
    
    fun getSignedPrekeyPrivate(): ByteArray? {
        val encoded = prefs.getString("signed_prekey_private", null) ?: return null
        return Base64.decode(encoded, Base64.NO_WRAP)
    }
    
    // ════════════════════════════════════════════════════════════════════════════
    // ONE-TIME PREKEYS
    // ════════════════════════════════════════════════════════════════════════════
    
    fun saveOnetimePrekeysPrivate(prekeys: List<OnetimePrekey>) {
        val serialized = prekeys.map { 
            StoredOnetimePrekey(
                id = it.id,
                privateKey = Base64.encodeToString(it.privateKey, Base64.NO_WRAP)
            )
        }
        prefs.edit()
            .putString("onetime_prekeys", json.encodeToString(serialized))
            .apply()
    }
    
    fun getOnetimePrekeyPrivate(id: Int): ByteArray? {
        val stored = prefs.getString("onetime_prekeys", null) ?: return null
        val prekeys = json.decodeFromString<List<StoredOnetimePrekey>>(stored)
        val prekey = prekeys.find { it.id == id } ?: return null
        return Base64.decode(prekey.privateKey, Base64.NO_WRAP)
    }
    
    fun deleteOnetimePrekey(id: Int) {
        val stored = prefs.getString("onetime_prekeys", null) ?: return
        val prekeys = json.decodeFromString<List<StoredOnetimePrekey>>(stored)
            .filter { it.id != id }
        prefs.edit()
            .putString("onetime_prekeys", json.encodeToString(prekeys))
            .apply()
    }
    
    fun appendOnetimePrekeys(newPrekeys: List<OnetimePrekey>) {
        val stored = prefs.getString("onetime_prekeys", null)
        val existing = if (stored != null) {
            json.decodeFromString<List<StoredOnetimePrekey>>(stored)
        } else {
            emptyList()
        }
        
        val newStored = newPrekeys.map {
            StoredOnetimePrekey(
                id = it.id,
                privateKey = Base64.encodeToString(it.privateKey, Base64.NO_WRAP)
            )
        }
        
        prefs.edit()
            .putString("onetime_prekeys", json.encodeToString(existing + newStored))
            .apply()
    }
    
    // ════════════════════════════════════════════════════════════════════════════
    // SESSION STATE
    // ════════════════════════════════════════════════════════════════════════════
    
    fun saveSession(peerId: String, state: RatchetState) {
        val serialized = json.encodeToString(state.toStorable())
        prefs.edit()
            .putString("session_$peerId", serialized)
            .apply()
    }
    
    fun getSession(peerId: String): RatchetState? {
        val serialized = prefs.getString("session_$peerId", null) ?: return null
        return json.decodeFromString<StorableRatchetState>(serialized).toRatchetState()
    }
    
    fun deleteSession(peerId: String) {
        prefs.edit().remove("session_$peerId").apply()
    }
    
    fun getAllSessionPeerIds(): List<String> {
        return prefs.all.keys
            .filter { it.startsWith("session_") }
            .map { it.removePrefix("session_") }
    }
    
    // ════════════════════════════════════════════════════════════════════════════
    // SECURE WIPE
    // ════════════════════════════════════════════════════════════════════════════
    
    fun wipeAllKeys() {
        prefs.edit().clear().apply()
    }
}

@Serializable
data class StoredOnetimePrekey(
    val id: Int,
    val privateKey: String  // Base64
)

@Serializable
data class StorableRatchetState(
    val rootKey: String,
    val dhPublicKey: String,
    val dhPrivateKey: String,
    val remoteDhPublic: String?,
    val sendChainKey: String,
    val receiveChainKey: String,
    val sendMessageNumber: Int,
    val receiveMessageNumber: Int,
    val previousChainLength: Int
)

fun RatchetState.toStorable() = StorableRatchetState(
    rootKey = Base64.encodeToString(rootKey, Base64.NO_WRAP),
    dhPublicKey = Base64.encodeToString(dhPublicKey, Base64.NO_WRAP),
    dhPrivateKey = Base64.encodeToString(dhPrivateKey, Base64.NO_WRAP),
    remoteDhPublic = remoteDhPublic?.let { Base64.encodeToString(it, Base64.NO_WRAP) },
    sendChainKey = Base64.encodeToString(sendChainKey, Base64.NO_WRAP),
    receiveChainKey = Base64.encodeToString(receiveChainKey, Base64.NO_WRAP),
    sendMessageNumber = sendMessageNumber,
    receiveMessageNumber = receiveMessageNumber,
    previousChainLength = previousChainLength
)

fun StorableRatchetState.toRatchetState() = RatchetState(
    rootKey = Base64.decode(rootKey, Base64.NO_WRAP),
    dhPublicKey = Base64.decode(dhPublicKey, Base64.NO_WRAP),
    dhPrivateKey = Base64.decode(dhPrivateKey, Base64.NO_WRAP),
    remoteDhPublic = remoteDhPublic?.let { Base64.decode(it, Base64.NO_WRAP) },
    sendChainKey = Base64.decode(sendChainKey, Base64.NO_WRAP),
    receiveChainKey = Base64.decode(receiveChainKey, Base64.NO_WRAP),
    sendMessageNumber = sendMessageNumber,
    receiveMessageNumber = receiveMessageNumber,
    previousChainLength = previousChainLength,
    skippedKeys = emptyMap() // Loaded separately if needed
)
```

---

## Push Notifications

### Firebase Cloud Messaging Setup

```kotlin
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class StyxMessagingService : FirebaseMessagingService() {
    
    override fun onNewToken(token: String) {
        // Register token with Styx relay for push notifications
        registerPushToken(token)
    }
    
    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.data
        
        when (data["type"]) {
            "new_message" -> {
                val senderPubkey = data["sender"] ?: return
                val encryptedPayload = data["payload"] ?: return
                
                // Show notification
                showMessageNotification(senderPubkey, "New encrypted message")
                
                // Queue for decryption when app opens
                queueEncryptedMessage(senderPubkey, encryptedPayload)
            }
            "prekey_low" -> {
                // Trigger prekey replenishment
                replenishPrekeysInBackground()
            }
        }
    }
    
    private fun showMessageNotification(sender: String, content: String) {
        val notificationManager = getSystemService(NotificationManager::class.java)
        
        val notification = NotificationCompat.Builder(this, "messages")
            .setSmallIcon(R.drawable.ic_message)
            .setContentTitle("New message from ${sender.take(8)}...")
            .setContentText(content)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setAutoCancel(true)
            .build()
        
        notificationManager.notify(sender.hashCode(), notification)
    }
    
    private fun registerPushToken(token: String) {
        // Send to Styx relay
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val response = OkHttpClient().newCall(
                    Request.Builder()
                        .url("https://relay.styx.nexus/v1/register-push")
                        .post(
                            Json.encodeToString(
                                mapOf("token" to token, "platform" to "android")
                            ).toRequestBody("application/json".toMediaType())
                        )
                        .build()
                ).execute()
                
                Log.d("Push", "Token registered: ${response.isSuccessful}")
            } catch (e: Exception) {
                Log.e("Push", "Failed to register token", e)
            }
        }
    }
}
```

---

## Security Best Practices

### Key Security Checklist

```kotlin
/**
 * Security Best Practices for Android Messaging
 */
object SecurityBestPractices {
    
    /**
     * ✅ Always verify signed prekey signatures
     */
    fun verifyBeforeSession(bundle: PrekeyBundle): Boolean {
        val verified = PrekeyFetcher().verifySignedPrekey(bundle)
        if (!verified) {
            Log.e("Security", "MITM DETECTED: Invalid prekey signature!")
            throw SecurityException("Invalid prekey signature - possible MITM attack")
        }
        return true
    }
    
    /**
     * ✅ Use Hardware-backed KeyStore when available
     */
    fun checkHardwareBackedKeystore(context: Context): Boolean {
        val keyStore = KeyStore.getInstance("AndroidKeyStore")
        keyStore.load(null)
        
        val keyInfo = keyStore.getKey("master_key", null)
        return if (keyInfo is SecretKey) {
            val factory = SecretKeyFactory.getInstance(keyInfo.algorithm, "AndroidKeyStore")
            val info = factory.getKeySpec(keyInfo, KeyInfo::class.java) as KeyInfo
            info.isInsideSecureHardware
        } else {
            false
        }
    }
    
    /**
     * ✅ Secure memory wiping
     */
    fun secureWipe(data: ByteArray) {
        for (i in data.indices) {
            data[i] = 0
        }
        // Also trigger garbage collection
        System.gc()
    }
    
    /**
     * ✅ Rate limit message sending to prevent spam
     */
    class RateLimiter(
        private val maxMessages: Int = 60,
        private val perSeconds: Long = 60
    ) {
        private val timestamps = mutableListOf<Long>()
        
        @Synchronized
        fun canSend(): Boolean {
            val now = System.currentTimeMillis()
            val windowStart = now - (perSeconds * 1000)
            
            // Remove old timestamps
            timestamps.removeAll { it < windowStart }
            
            return timestamps.size < maxMessages
        }
        
        @Synchronized
        fun recordSend() {
            timestamps.add(System.currentTimeMillis())
        }
    }
    
    /**
     * ✅ Backup encryption with user password
     */
    suspend fun exportEncryptedBackup(
        context: Context,
        password: String
    ): ByteArray {
        val storage = SecureKeyStorage(context)
        
        // Collect all key material
        val backup = mapOf(
            "signedPrekey" to storage.getSignedPrekeyPrivate()?.let { 
                Base64.encodeToString(it, Base64.NO_WRAP) 
            },
            "sessions" to storage.getAllSessionPeerIds().map { peerId ->
                peerId to storage.getSession(peerId)?.toStorable()
            }.toMap()
        )
        
        val plaintext = Json.encodeToString(backup).toByteArray()
        
        // Derive key from password with Argon2
        val salt = StyxCrypto.randomBytes(16)
        val key = deriveKeyFromPassword(password, salt)
        
        // Encrypt with AES-GCM
        val encrypted = StyxCrypto.encryptWithKey(plaintext, key)
        
        // Combine salt + encrypted data
        return salt + encrypted.iv + encrypted.ciphertext
    }
    
    private fun deriveKeyFromPassword(password: String, salt: ByteArray): ByteArray {
        // Use Argon2id for password key derivation
        val argon2 = Argon2Factory.create(Argon2Factory.Argon2Types.ARGON2id)
        return argon2.hash(
            iterations = 3,
            memory = 65536,
            parallelism = 4,
            password = password.toCharArray(),
            salt = salt
        ).rawHashBytes
    }
}
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "No wallet found" | No compatible wallet installed | Prompt user to install Phantom/Solflare |
| "Authorization denied" | User rejected wallet connection | Show retry UI with explanation |
| "No prekey bundle" | Recipient hasn't enabled messaging | Show "Invite to chat" option |
| "Decryption failed" | Session state mismatch | Reset session and re-establish |
| "Network timeout" | Relay connection issue | Implement exponential backoff retry |
| "Out of one-time keys" | Pool depleted | Trigger `replenishOnetimeKeys()` |

### Debug Logging

```kotlin
object StyxDebug {
    var enabled = BuildConfig.DEBUG
    
    fun logSessionState(peerId: String, state: RatchetState) {
        if (!enabled) return
        
        Log.d("StyxDebug", """
            Session with $peerId:
            - Send count: ${state.sendMessageNumber}
            - Receive count: ${state.receiveMessageNumber}
            - Skipped keys: ${state.skippedKeys.size}
        """.trimIndent())
    }
    
    fun logX3DH(result: X3DHResult) {
        if (!enabled) return
        
        Log.d("StyxDebug", """
            X3DH Complete:
            - Used OTP: ${result.usedOnetimePrekeyId}
            - Ephemeral: ${result.ephemeralPublicKey.toHex().take(16)}...
        """.trimIndent())
    }
    
    fun logEncryption(header: RatchetHeader, ciphertextSize: Int) {
        if (!enabled) return
        
        Log.d("StyxDebug", """
            Encrypted message:
            - Message #: ${header.messageNumber}
            - Prev chain: ${header.previousChainLength}
            - Ciphertext: $ciphertextSize bytes
        """.trimIndent())
    }
}
```

---

## API Reference

### Key Classes

| Class | Purpose |
|-------|---------|
| `StyxMobileWallet` | Solana Mobile Wallet Adapter wrapper |
| `PrivateMessagingClient` | High-level messaging API |
| `X3DHSession` | Key exchange handling |
| `DoubleRatchet` | Forward secrecy implementation |
| `MessageRelay` | WebSocket real-time connection |
| `SecureKeyStorage` | Encrypted key persistence |
| `PrekeyFetcher` | Remote bundle retrieval |

### Message Types (Domain 0x02)

| Op | Name | Description |
|----|------|-------------|
| 0x01 | PRIVATE_MESSAGE | Basic E2E encrypted message |
| 0x02 | ROUTED_MESSAGE | Anonymous relay routing |
| 0x03 | PRIVATE_TRANSFER | Message with payment |
| 0x04 | RATCHET_MESSAGE | Double Ratchet forward secrecy |
| 0x06 | PREKEY_BUNDLE_PUBLISH | Publish X3DH prekeys |
| 0x07 | PREKEY_BUNDLE_REFRESH | Rotate/replenish prekeys |

---

## Related Documentation

- [Android Native Integration](ANDROID_NATIVE_INTEGRATION.md) - Core Android SDK setup
- [React Native Integration](REACT_NATIVE_INTEGRATION.md) - Cross-platform mobile
- [Web Integration](WEB_INTEGRATION.md) - Browser-based messaging
- [Private Memo Program](PMP_INTEGRATION.md) - On-chain message storage
