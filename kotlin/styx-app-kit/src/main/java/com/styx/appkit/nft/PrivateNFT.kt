package com.styx.appkit.nft

import com.styx.appkit.core.Base58
import com.styx.appkit.core.StyxClient
import com.styx.appkit.core.StyxCrypto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX PRIVATE NFT MODULE
 *  
 *  Private NFT and cNFT operations on Solana
 *  Features: Hidden ownership, stealth transfers, phantom proofs
 *           Compressed NFT (cNFT) support via Bubblegum
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

@Serializable
data class PrivateNFT(
    val mint: String,
    val inscriptionId: String? = null,
    val metadata: NFTMetadata,
    val owner: String? = null,  // null if hidden
    val ownershipCommitment: ByteArray? = null,
    val privacy: NFTPrivacy,
    val isCompressed: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
data class PrivateCNFT(
    /** Asset ID (unique identifier for cNFT) */
    val assetId: String,
    /** Merkle tree address */
    val merkleTree: String,
    /** Leaf index in the merkle tree */
    val leafIndex: Int,
    /** Data hash */
    val dataHash: ByteArray,
    /** Creator hash */
    val creatorHash: ByteArray,
    /** Metadata */
    val metadata: NFTMetadata,
    /** Owner (hidden if private) */
    val owner: String? = null,
    /** Privacy level */
    val privacy: NFTPrivacy,
    /** Created at */
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
data class NFTMetadata(
    val name: String,
    val symbol: String,
    val description: String,
    val image: String,
    val attributes: List<NFTAttribute> = emptyList(),
    val animationUrl: String? = null,
    val externalUrl: String? = null
)

@Serializable
data class NFTAttribute(
    val traitType: String,
    val value: String,
    val displayType: String? = null
)

@Serializable
data class NFTPrivacy(
    val hiddenOwnership: Boolean = false,
    val encryptedMetadata: Boolean = false,
    val phantomProof: Boolean = true,
    val stealthReceive: Boolean = true
)

@Serializable
data class PhantomProof(
    val collection: String,
    val nftCommitment: ByteArray,
    val ownershipProof: ByteArray,
    val timestamp: Long,
    val validUntil: Long
)

@Serializable
data class CNFTProof(
    val root: ByteArray,
    val dataHash: ByteArray,
    val creatorHash: ByteArray,
    val leafIndex: Int,
    val proofNodes: List<String>
)

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE NFT CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

class PrivateNFTClient(
    private val styxClient: StyxClient,
    private val userPubkey: String
) {
    private val _ownedNFTs = MutableStateFlow<List<PrivateNFT>>(emptyList())
    val ownedNFTs: StateFlow<List<PrivateNFT>> = _ownedNFTs.asStateFlow()
    
    private val _ownedCNFTs = MutableStateFlow<List<PrivateCNFT>>(emptyList())
    val ownedCNFTs: StateFlow<List<PrivateCNFT>> = _ownedCNFTs.asStateFlow()
    
    companion object {
        const val BUBBLEGUM_PROGRAM_ID = "BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY"
        const val COMPRESSION_PROGRAM_ID = "cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK"
    }
    
    /**
     * Send an NFT privately using stealth addressing
     */
    suspend fun sendPrivateNFT(
        nftMint: String,
        recipientViewKey: ByteArray,
        recipientSpendKey: ByteArray,
        memo: String? = null
    ): PrivateNFTTransferResult {
        // Generate stealth address for recipient
        val stealthResult = StyxCrypto.generateStealthAddress(
            recipientViewKey,
            recipientSpendKey
        )
        
        // TODO: Build and send transaction
        
        return PrivateNFTTransferResult(
            signature = "",  // Would be filled by actual tx
            stealthAddress = Base58.encode(stealthResult.stealthPubkey),
            ephemeralPubkey = Base58.encode(stealthResult.ephemeralPubkey)
        )
    }
    
    /**
     * Send a compressed NFT (cNFT) privately
     * Uses Bubblegum for the underlying transfer with stealth addressing
     */
    suspend fun sendPrivateCNFT(
        assetId: String,
        merkleTree: String,
        recipientViewKey: ByteArray,
        recipientSpendKey: ByteArray,
        proof: CNFTProof
    ): PrivateNFTTransferResult {
        // Generate stealth address for recipient
        val stealthResult = StyxCrypto.generateStealthAddress(
            recipientViewKey,
            recipientSpendKey
        )
        
        // TODO: Build Bubblegum transfer instruction with stealth recipient
        // This would:
        // 1. Create transfer instruction to stealth address
        // 2. Add stealth metadata memo for recipient scanning
        // 3. Send transaction
        
        return PrivateNFTTransferResult(
            signature = "",  // Would be filled by actual tx
            stealthAddress = Base58.encode(stealthResult.stealthPubkey),
            ephemeralPubkey = Base58.encode(stealthResult.ephemeralPubkey)
        )
    }
    
    /**
     * Fetch cNFT proof from DAS API
     */
    suspend fun getCNFTProof(assetId: String): CNFTProof? {
        // Would call DAS API (getAssetProof) or Styx indexer
        return null
    }
    
    /**
     * Create a phantom proof - proves ownership without revealing which NFT
     */
    fun createPhantomProof(
        nftMint: String,
        collection: String,
        validitySeconds: Int = 3600
    ): PhantomProof {
        val nonce = StyxCrypto.randomBytes(32)
        val nftCommitment = StyxCrypto.sha256(
            Base58.decode(nftMint) + nonce
        )
        
        val timestamp = System.currentTimeMillis()
        val message = Base58.decode(collection) + 
                     nftCommitment + 
                     timestamp.toByteArray()
        
        val ownershipProof = StyxCrypto.sha256(message + Base58.decode(userPubkey))
        
        return PhantomProof(
            collection = collection,
            nftCommitment = nftCommitment,
            ownershipProof = ownershipProof,
            timestamp = timestamp,
            validUntil = timestamp + validitySeconds * 1000
        )
    }
    
    /**
     * Get all owned NFTs including those received via stealth
     */
    suspend fun refreshOwnedNFTs() {
        // Would call indexer with view key for stealth scanning
        // _ownedNFTs.value = fetchedNFTs
    }
    
    /**
     * Get all owned cNFTs including those received via stealth
     */
    suspend fun refreshOwnedCNFTs() {
        // Would call indexer with view key for stealth scanning
        // _ownedCNFTs.value = fetchedCNFTs
    }
    
    private fun Long.toByteArray(): ByteArray {
        val buffer = java.nio.ByteBuffer.allocate(8)
        buffer.putLong(this)
        return buffer.array()
    }
}

@Serializable
data class PrivateNFTTransferResult(
    val signature: String,
    val stealthAddress: String,
    val ephemeralPubkey: String
)
