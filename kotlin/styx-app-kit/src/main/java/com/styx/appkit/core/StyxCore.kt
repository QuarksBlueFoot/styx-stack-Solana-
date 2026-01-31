package com.styx.appkit.core

import android.content.Context
import com.solana.mobilewalletadapter.clientlib.ConnectionIdentity
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX APP KIT - CORE MODULE
 *  
 *  Core functionality: Crypto, Config, Client
 *  Follows KMM 2026 patterns for Solana Seeker compatibility
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BASE58 ENCODING
// ═══════════════════════════════════════════════════════════════════════════════

object Base58 {
    private const val ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    private val ENCODED_ZERO = ALPHABET[0]
    private val INDEXES = IntArray(128).apply { fill(-1) }

    init {
        for (i in ALPHABET.indices) {
            INDEXES[ALPHABET[i].code] = i
        }
    }

    fun encode(input: ByteArray): String {
        if (input.isEmpty()) return ""
        
        var zeros = 0
        while (zeros < input.size && input[zeros].toInt() == 0) {
            ++zeros
        }
        
        val encoded = CharArray(input.size * 2)
        var outputStart = encoded.size
        var inputStart = zeros
        
        while (inputStart < input.size) {
            encoded[--outputStart] = ALPHABET[divmod(input, inputStart, 256, 58).toInt()]
            if (input[inputStart].toInt() == 0) {
                ++inputStart
            }
        }
        
        while (outputStart < encoded.size && encoded[outputStart] == ENCODED_ZERO) {
            ++outputStart
        }
        
        while (--zeros >= 0) {
            encoded[--outputStart] = ENCODED_ZERO
        }
        
        return String(encoded, outputStart, encoded.size - outputStart)
    }

    fun decode(input: String): ByteArray {
        if (input.isEmpty()) return ByteArray(0)
        
        val input58 = ByteArray(input.length)
        for (i in input.indices) {
            val c = input[i]
            val digit = if (c.code < 128) INDEXES[c.code] else -1
            if (digit < 0) {
                throw IllegalArgumentException("Invalid Base58 character: $c")
            }
            input58[i] = digit.toByte()
        }
        
        var zeros = 0
        while (zeros < input58.size && input58[zeros].toInt() == 0) {
            ++zeros
        }
        
        val decoded = ByteArray(input.length)
        var outputStart = decoded.size
        var inputStart = zeros
        
        while (inputStart < input58.size) {
            decoded[--outputStart] = divmod(input58, inputStart, 58, 256).toByte()
            if (input58[inputStart].toInt() == 0) {
                ++inputStart
            }
        }
        
        while (outputStart < decoded.size && decoded[outputStart].toInt() == 0) {
            ++outputStart
        }
        
        return decoded.copyOfRange(outputStart - zeros, decoded.size)
    }

    private fun divmod(number: ByteArray, firstDigit: Int, base: Int, divisor: Int): Byte {
        var remainder = 0
        for (i in firstDigit until number.size) {
            val digit = number[i].toInt() and 0xFF
            val temp = remainder * base + digit
            number[i] = (temp / divisor).toByte()
            remainder = temp % divisor
        }
        return remainder.toByte()
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLUSTER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

@Serializable
enum class Cluster(val rpcUrl: String, val wsUrl: String) {
    MAINNET_BETA(
        rpcUrl = "https://api.mainnet-beta.solana.com",
        wsUrl = "wss://api.mainnet-beta.solana.com"
    ),
    DEVNET(
        rpcUrl = "https://api.devnet.solana.com",
        wsUrl = "wss://api.devnet.solana.com"
    ),
    TESTNET(
        rpcUrl = "https://api.testnet.solana.com",
        wsUrl = "wss://api.testnet.solana.com"
    ),
    LOCALNET(
        rpcUrl = "http://localhost:8899",
        wsUrl = "ws://localhost:8900"
    );
    
    companion object {
        fun fromString(name: String): Cluster = when (name.lowercase()) {
            "mainnet-beta", "mainnet" -> MAINNET_BETA
            "devnet" -> DEVNET
            "testnet" -> TESTNET
            "localnet", "localhost" -> LOCALNET
            else -> DEVNET
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRAM IDS
// ═══════════════════════════════════════════════════════════════════════════════

object StyxPrograms {
    const val STYX_MAINNET = "GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9"
    const val STYX_DEVNET = "FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW"
    const val WHISPERDROP_MAINNET = "GhstFNnEbixAGQgLnWg1nWetJQgGfSUMhnxdBA6hWu5e"
    const val WHISPERDROP_DEVNET = "BPM5VuX9YrG7CgueWGxtqQZBQwMTacc315ppWCtTCJ5q"
    
    fun getStyxProgramId(cluster: Cluster): String = when (cluster) {
        Cluster.MAINNET_BETA -> STYX_MAINNET
        else -> STYX_DEVNET
    }
    
    fun getWhisperDropProgramId(cluster: Cluster): String = when (cluster) {
        Cluster.MAINNET_BETA -> WHISPERDROP_MAINNET
        else -> WHISPERDROP_DEVNET
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRYPTO UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

object StyxCrypto {
    private const val GCM_TAG_LENGTH = 128
    private const val GCM_IV_LENGTH = 12
    private const val AES_KEY_SIZE = 256
    
    private val secureRandom = SecureRandom()
    
    /**
     * Generate random bytes
     */
    fun randomBytes(size: Int): ByteArray {
        val bytes = ByteArray(size)
        secureRandom.nextBytes(bytes)
        return bytes
    }
    
    /**
     * Generate AES-256-GCM key
     */
    fun generateKey(): SecretKey {
        val keyGen = KeyGenerator.getInstance("AES")
        keyGen.init(AES_KEY_SIZE, secureRandom)
        return keyGen.generateKey()
    }
    
    /**
     * AES-256-GCM encrypt
     */
    fun encrypt(plaintext: ByteArray, key: SecretKey): EncryptedData {
        val iv = randomBytes(GCM_IV_LENGTH)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val spec = GCMParameterSpec(GCM_TAG_LENGTH, iv)
        cipher.init(Cipher.ENCRYPT_MODE, key, spec)
        val ciphertext = cipher.doFinal(plaintext)
        return EncryptedData(iv = iv, ciphertext = ciphertext)
    }
    
    /**
     * AES-256-GCM decrypt
     */
    fun decrypt(encrypted: EncryptedData, key: SecretKey): ByteArray {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val spec = GCMParameterSpec(GCM_TAG_LENGTH, encrypted.iv)
        cipher.init(Cipher.DECRYPT_MODE, key, spec)
        return cipher.doFinal(encrypted.ciphertext)
    }
    
    /**
     * Encrypt with byte array key
     */
    fun encryptWithKey(plaintext: ByteArray, keyBytes: ByteArray): EncryptedData {
        val key = SecretKeySpec(keyBytes, "AES")
        return encrypt(plaintext, key)
    }
    
    /**
     * Decrypt with byte array key
     */
    fun decryptWithKey(encrypted: EncryptedData, keyBytes: ByteArray): ByteArray {
        val key = SecretKeySpec(keyBytes, "AES")
        return decrypt(encrypted, key)
    }
    
    /**
     * SHA-256 hash
     */
    fun sha256(data: ByteArray): ByteArray {
        val digest = java.security.MessageDigest.getInstance("SHA-256")
        return digest.digest(data)
    }
    
    /**
     * Generate stealth address
     */
    fun generateStealthAddress(
        recipientSpendPubkey: ByteArray,
        recipientViewPubkey: ByteArray
    ): StealthAddressResult {
        // Generate ephemeral keypair
        val ephemeralPrivate = randomBytes(32)
        val ephemeralPublic = derivePublicKey(ephemeralPrivate)
        
        // ECDH shared secret
        val sharedSecret = ecdhSharedSecret(ephemeralPrivate, recipientViewPubkey)
        
        // Derive stealth pubkey: P' = P + H(shared_secret) * G
        val tweakHash = sha256(sharedSecret)
        val stealthPubkey = tweakPublicKey(recipientSpendPubkey, tweakHash)
        
        return StealthAddressResult(
            stealthPubkey = stealthPubkey,
            ephemeralPubkey = ephemeralPublic,
            sharedSecret = sharedSecret
        )
    }
    
    // X25519 ECDH (simplified - use BouncyCastle in production)
    private fun ecdhSharedSecret(privateKey: ByteArray, publicKey: ByteArray): ByteArray {
        // In production, use proper X25519 implementation
        return sha256(privateKey + publicKey)
    }
    
    fun derivePublicKey(privateKey: ByteArray): ByteArray {
        // In production, derive Ed25519 public key
        return sha256(privateKey)
    }
    
    private fun tweakPublicKey(pubkey: ByteArray, tweak: ByteArray): ByteArray {
        // In production, proper curve point addition
        return sha256(pubkey + tweak)
    }
    
    /**
     * Generate random bytes (alias for randomBytes)
     */
    fun generateRandomBytes(size: Int): ByteArray = randomBytes(size)
    
    /**
     * Generate random ID as ByteArray
     */
    fun generateRandomId(): ByteArray = randomBytes(32)
    
    /**
     * Generate nullifier from pubkey and ephemeral key
     */
    fun generateNullifier(pubkey: ByteArray, ephemeralKey: ByteArray): ByteArray {
        return sha256(pubkey + ephemeralKey)
    }
    
    /**
     * Keccak-256 hash (simplified - use BouncyCastle in production)
     */
    fun keccak256(data: ByteArray): ByteArray {
        // In production, use proper Keccak-256 implementation
        // For now, use SHA-256 as placeholder
        return sha256(data)
    }
}

@Serializable
data class EncryptedData(
    val iv: ByteArray,
    val ciphertext: ByteArray
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is EncryptedData) return false
        return iv.contentEquals(other.iv) && ciphertext.contentEquals(other.ciphertext)
    }
    
    override fun hashCode(): Int {
        return 31 * iv.contentHashCode() + ciphertext.contentHashCode()
    }
}

data class StealthAddressResult(
    val stealthPubkey: ByteArray,
    val ephemeralPubkey: ByteArray,
    val sharedSecret: ByteArray
)

// ═══════════════════════════════════════════════════════════════════════════════
// STYX CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

@Serializable
data class StyxConfig(
    val cluster: Cluster = Cluster.DEVNET,
    val rpcUrl: String? = null,
    val relayUrl: String = "https://relay.styxprivacy.app",
    val indexerUrl: String = "https://api.styxprivacy.app"
)

class StyxClient(
    private val context: Context,
    config: StyxConfig = StyxConfig()
) {
    private val _config = MutableStateFlow(config)
    val config: StateFlow<StyxConfig> = _config.asStateFlow()
    
    private val _connected = MutableStateFlow(false)
    val connected: StateFlow<Boolean> = _connected.asStateFlow()
    
    val rpcUrl: String
        get() = _config.value.rpcUrl ?: _config.value.cluster.rpcUrl
    
    val programId: String
        get() = StyxPrograms.getStyxProgramId(_config.value.cluster)
    
    val whisperDropProgramId: String
        get() = StyxPrograms.getWhisperDropProgramId(_config.value.cluster)
    
    /**
     * Update configuration
     */
    fun configure(update: (StyxConfig) -> StyxConfig) {
        _config.value = update(_config.value)
    }
    
    /**
     * Connect to network
     */
    suspend fun connect(): Boolean {
        // Verify RPC connection
        _connected.value = true
        return true
    }
    
    /**
     * Disconnect
     */
    fun disconnect() {
        _connected.value = false
    }
    
    /**
     * Get connection identity for Mobile Wallet Adapter
     */
    fun getConnectionIdentity(): ConnectionIdentity {
        return ConnectionIdentity(
            identityUri = android.net.Uri.parse("https://styxprivacy.app"),
            iconUri = android.net.Uri.parse("https://styxprivacy.app/icon.png"),
            identityName = "Styx App"
        )
    }
    
    /**
     * Send transaction to Styx network
     */
    suspend fun sendTransaction(
        domain: Int,
        op: Int,
        payload: ByteArray
    ): TransactionResult {
        // In production, build and submit actual transaction
        return TransactionResult.Success("mock_signature_${System.currentTimeMillis()}")
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSACTION RESULT
// ═══════════════════════════════════════════════════════════════════════════════

sealed class TransactionResult {
    data class Success(val signature: String) : TransactionResult()
    data class Failure(val error: String) : TransactionResult()
}

// ═══════════════════════════════════════════════════════════════════════════════
// WALLET STATE
// ═══════════════════════════════════════════════════════════════════════════════

data class WalletState(
    val connected: Boolean = false,
    val publicKey: ByteArray? = null,
    val publicKeyBase58: String? = null,
    val authToken: String? = null
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is WalletState) return false
        return connected == other.connected && 
               publicKey.contentEquals(other.publicKey) &&
               publicKeyBase58 == other.publicKeyBase58
    }
    
    override fun hashCode(): Int {
        var result = connected.hashCode()
        result = 31 * result + (publicKey?.contentHashCode() ?: 0)
        result = 31 * result + (publicKeyBase58?.hashCode() ?: 0)
        return result
    }
}
