package com.styx.appkit.compression

import com.styx.appkit.core.Base58
import com.styx.appkit.core.StyxClient
import com.styx.appkit.core.StyxCrypto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX INSCRIPTION COMPRESSION ADAPTER
 *  
 *  Privacy-aware compression and inscription support for Solana
 *  - View and manage compressed SPL tokens
 *  - Inscription-based metadata storage
 *  - ZK-Compression for state trees (Light Protocol)
 *  - Inscription token minting (Styx-20)
 *  - Inscription NFT minting (Styx-721)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

@Serializable
data class CompressedSPLToken(
    val mint: String,
    val owner: String,
    val amount: Long,
    val stateTree: String,
    val leafIndex: Int,
    val inscriptionId: String? = null,
    val metadata: CompressedTokenMetadata? = null
)

@Serializable
data class CompressedTokenMetadata(
    val name: String,
    val symbol: String,
    val decimals: Int,
    val image: String? = null,
    val description: String? = null
)

@Serializable
data class InscriptionData(
    val id: String,
    val contentType: String,
    val content: ByteArray,
    val authority: String,
    val slot: Long,
    val associatedAccount: String? = null
)

@Serializable
data class MembershipProof(
    val leaf: ByteArray,
    val path: List<ByteArray>,
    val indices: List<Int>,
    val root: ByteArray
)

// ═══════════════════════════════════════════════════════════════════════════════
// INSCRIPTION TOKEN TYPES (Styx-20)
// ═══════════════════════════════════════════════════════════════════════════════

@Serializable
data class InscriptionTokenConfig(
    val name: String,
    val symbol: String,
    val totalSupply: Long,
    val decimals: Int,
    val description: String? = null,
    val imageUri: String? = null,
    val attributes: Map<String, String>? = null,
    val mintLimit: Int? = null
)

@Serializable
data class InscriptionToken(
    val inscriptionId: String,
    val mint: String,
    val config: InscriptionTokenConfig,
    val authority: String,
    val circulatingSupply: Long,
    val mintState: String, // "open" or "closed"
    val createdAt: Long
)

@Serializable
data class InscriptionTokenBalance(
    val inscriptionId: String,
    val mint: String,
    val balance: Long,
    val nullifiers: List<ByteArray>,
    val token: InscriptionToken? = null
)

// ═══════════════════════════════════════════════════════════════════════════════
// INSCRIPTION NFT TYPES (Styx-721)
// ═══════════════════════════════════════════════════════════════════════════════

@Serializable
data class InscriptionNFTMetadata(
    val name: String,
    val description: String,
    val image: String,
    val animationUrl: String? = null,
    val externalUrl: String? = null,
    val attributes: List<NFTAttribute>? = null,
    val collection: NFTCollection? = null,
    val royalty: NFTRoyalty? = null
)

@Serializable
data class NFTAttribute(
    val traitType: String,
    val value: String,
    val displayType: String? = null
)

@Serializable
data class NFTCollection(
    val name: String,
    val family: String? = null
)

@Serializable
data class NFTRoyalty(
    val basisPoints: Int,
    val recipients: List<RoyaltyRecipient>
)

@Serializable
data class RoyaltyRecipient(
    val address: String,
    val share: Int
)

@Serializable
data class InscriptionNFT(
    val inscriptionId: String,
    val mint: String,
    val metadata: InscriptionNFTMetadata,
    val owner: String,
    val creator: String,
    val createdAt: Long,
    val compressed: Boolean,
    val collectionId: String? = null
)

@Serializable
data class InscriptionCollection(
    val collectionId: String,
    val name: String,
    val symbol: String,
    val description: String,
    val image: String,
    val creator: String,
    val totalItems: Int,
    val mintedItems: Int,
    val royalty: NFTRoyalty? = null
)

// ═══════════════════════════════════════════════════════════════════════════════
// INSCRIPTION COMPRESSION ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════

class InscriptionCompressionAdapter(
    private val styxClient: StyxClient,
    private val userPubkey: String
) {
    private val _compressedTokens = MutableStateFlow<List<CompressedSPLToken>>(emptyList())
    val compressedTokens: StateFlow<List<CompressedSPLToken>> = _compressedTokens.asStateFlow()
    
    companion object {
        const val LIGHT_PROTOCOL_PROGRAM_ID = "LitKFPdP9UYzH69xJ3MZTvY1U3TQYwPjhZ9SvR1nHtC"
        const val INSCRIPTION_PROGRAM_ID = "insc4R6e2eMY5E6w2U3fEJZbqPkYn2G3K8bQb7qQz1N"
        const val COMPRESSED_TOKEN_PROGRAM_ID = "cTokenmWW8bLPjZEBAUgYy3zKxQZW6VKi7bqNFEVv3m"
    }
    
    /**
     * Get all compressed SPL tokens for the user
     * Fetches from Light Protocol state trees and resolves metadata from inscriptions
     */
    suspend fun getCompressedTokens(): List<CompressedSPLToken> {
        // Would call Light Protocol RPC: getCompressedTokenAccountsByOwner
        // Then resolve inscription metadata for each token
        return emptyList()
    }
    
    /**
     * Get compressed token balance for a specific mint
     */
    suspend fun getCompressedBalance(mint: String): Long {
        val tokens = getCompressedTokens()
        return tokens.filter { it.mint == mint }.sumOf { it.amount }
    }
    
    /**
     * Fetch inscription data by ID
     */
    suspend fun getInscription(inscriptionId: String): InscriptionData? {
        // Would call RPC: getInscription
        return null
    }
    
    /**
     * Fetch token metadata from an inscription
     */
    suspend fun getInscriptionMetadata(inscriptionId: String): CompressedTokenMetadata? {
        val inscription = getInscription(inscriptionId) ?: return null
        
        if (inscription.contentType == "application/json") {
            return try {
                // Parse JSON metadata
                // kotlinx.serialization.json.Json.decodeFromString<CompressedTokenMetadata>(...)
                null
            } catch (e: Exception) {
                null
            }
        }
        
        return null
    }
    
    /**
     * Decompress tokens from compressed state to regular SPL
     */
    suspend fun decompressTokens(
        mint: String,
        amount: Long,
        proof: MembershipProof,
        stateTree: String,
        leafIndex: Int
    ): String {
        // Would build and send decompress transaction
        // Returns transaction signature
        return ""
    }
    
    /**
     * Compress tokens from regular SPL to compressed state
     */
    suspend fun compressTokens(
        mint: String,
        amount: Long,
        tokenAccount: String,
        stateTree: String
    ): String {
        // Would build and send compress transaction
        // Returns transaction signature
        return ""
    }
    
    /**
     * Transfer compressed tokens privately with stealth addressing
     */
    suspend fun transferCompressedPrivate(
        mint: String,
        toViewKey: ByteArray,
        toSpendKey: ByteArray,
        amount: Long,
        proof: MembershipProof,
        stateTree: String,
        leafIndex: Int
    ): CompressedTransferResult {
        // Generate stealth address
        val stealthResult = StyxCrypto.generateStealthAddress(toViewKey, toSpendKey)
        
        // Would build and send private transfer transaction
        
        return CompressedTransferResult(
            signature = "",
            stealthAddress = Base58.encode(stealthResult.stealthPubkey)
        )
    }
    
    /**
     * Refresh compressed tokens for the user
     */
    suspend fun refresh() {
        _compressedTokens.value = getCompressedTokens()
    }
    
    /**
     * Verify a membership proof
     */
    fun verifyProof(proof: MembershipProof, expectedRoot: ByteArray): Boolean {
        var current = proof.leaf
        
        for (i in proof.path.indices) {
            val sibling = proof.path[i]
            val isLeft = (proof.indices[i] and 1) == 0
            
            current = if (isLeft) {
                hashNodes(current, sibling)
            } else {
                hashNodes(sibling, current)
            }
        }
        
        return current.contentEquals(expectedRoot)
    }
    
    private fun hashNodes(left: ByteArray, right: ByteArray): ByteArray {
        val prefix = "styx-node-v1".toByteArray()
        return StyxCrypto.sha256(prefix + left + right)
    }
}

@Serializable
data class CompressedTransferResult(
    val signature: String,
    val stealthAddress: String
)

// ═══════════════════════════════════════════════════════════════════════════════
// INSCRIPTION TOKEN CLIENT (Styx-20)
// Create and manage inscription-based tokens (like BRC-20 on Solana)
// ═══════════════════════════════════════════════════════════════════════════════

class InscriptionTokenClient(
    private val styxClient: StyxClient,
    private val userPubkey: String
) {
    private val _tokens = MutableStateFlow<List<InscriptionToken>>(emptyList())
    val tokens: StateFlow<List<InscriptionToken>> = _tokens.asStateFlow()
    
    private val _balances = MutableStateFlow<List<InscriptionTokenBalance>>(emptyList())
    val balances: StateFlow<List<InscriptionTokenBalance>> = _balances.asStateFlow()
    
    /**
     * Deploy a new inscription token
     */
    suspend fun deployToken(config: InscriptionTokenConfig): DeployTokenResult {
        // Validate config
        require(config.symbol.length <= 10) { "Symbol must be 10 characters or less" }
        require(config.decimals <= 9) { "Decimals must be 9 or less" }
        
        // Build inscription content (Styx-20 protocol)
        val inscriptionContent = buildString {
            append("{")
            append("\"p\":\"styx-20\",")
            append("\"op\":\"deploy\",")
            append("\"tick\":\"${config.symbol}\",")
            append("\"name\":\"${config.name}\",")
            append("\"max\":\"${config.totalSupply}\",")
            append("\"dec\":${config.decimals}")
            config.description?.let { append(",\"desc\":\"$it\"") }
            config.imageUri?.let { append(",\"img\":\"$it\"") }
            config.mintLimit?.let { append(",\"lim\":$it") }
            append("}")
        }
        
        val content = inscriptionContent.toByteArray()
        
        // Generate inscription ID
        val inscriptionIdBytes = StyxCrypto.sha256(
            content + userPubkey.toByteArray() + System.currentTimeMillis().toByteArray()
        )
        val inscriptionId = inscriptionIdBytes.take(16).toByteArray().toHexString()
        
        // Derive mint address
        val mintSeed = StyxCrypto.sha256("styx-20:$inscriptionId".toByteArray())
        val mint = mintSeed.toBase58()
        
        // Would build and send transaction
        
        return DeployTokenResult(
            inscriptionId = inscriptionId,
            mint = mint,
            signature = ""
        )
    }
    
    /**
     * Mint inscription tokens to an address
     */
    suspend fun mintTokens(
        inscriptionId: String,
        mint: String,
        recipient: String,
        amount: Long
    ): String {
        val mintContent = buildString {
            append("{")
            append("\"p\":\"styx-20\",")
            append("\"op\":\"mint\",")
            append("\"tick\":\"$inscriptionId\",")
            append("\"amt\":\"$amount\",")
            append("\"to\":\"$recipient\"")
            append("}")
        }
        
        // Would build and send transaction
        return "" // signature
    }
    
    /**
     * Transfer inscription tokens
     */
    suspend fun transferTokens(
        inscriptionId: String,
        mint: String,
        to: String,
        amount: Long
    ): String {
        val transferContent = buildString {
            append("{")
            append("\"p\":\"styx-20\",")
            append("\"op\":\"transfer\",")
            append("\"tick\":\"$inscriptionId\",")
            append("\"amt\":\"$amount\"")
            append("}")
        }
        
        // Would build and send transaction
        return "" // signature
    }
    
    /**
     * Burn inscription tokens
     */
    suspend fun burnTokens(
        inscriptionId: String,
        mint: String,
        amount: Long
    ): String {
        val burnContent = buildString {
            append("{")
            append("\"p\":\"styx-20\",")
            append("\"op\":\"burn\",")
            append("\"tick\":\"$inscriptionId\",")
            append("\"amt\":\"$amount\"")
            append("}")
        }
        
        // Would build and send transaction
        return "" // signature
    }
    
    /**
     * Get inscription token info
     */
    suspend fun getTokenInfo(inscriptionId: String): InscriptionToken? {
        // Would call RPC
        return null
    }
    
    /**
     * Get all inscription token balances for the user
     */
    suspend fun getTokenBalances(): List<InscriptionTokenBalance> {
        // Would call RPC
        return emptyList()
    }
    
    /**
     * List all deployed inscription tokens
     */
    suspend fun listTokens(
        limit: Int = 50,
        offset: Int = 0,
        sortBy: String = "createdAt"
    ): List<InscriptionToken> {
        // Would call RPC
        return emptyList()
    }
    
    /**
     * Refresh tokens and balances
     */
    suspend fun refresh() {
        _tokens.value = listTokens()
        _balances.value = getTokenBalances()
    }
    
    private fun Long.toByteArray(): ByteArray {
        val buffer = java.nio.ByteBuffer.allocate(8)
        buffer.order(java.nio.ByteOrder.LITTLE_ENDIAN)
        buffer.putLong(this)
        return buffer.array()
    }
    
    private fun ByteArray.toHexString(): String = joinToString("") { "%02x".format(it) }
    
    private fun ByteArray.toBase58(): String {
        // Simplified base58 (in production use proper implementation)
        return this.toHexString()
    }
}

@Serializable
data class DeployTokenResult(
    val inscriptionId: String,
    val mint: String,
    val signature: String
)

// ═══════════════════════════════════════════════════════════════════════════════
// INSCRIPTION NFT CLIENT (Styx-721)
// Create and manage inscription-based NFTs
// ═══════════════════════════════════════════════════════════════════════════════

class InscriptionNFTClient(
    private val styxClient: StyxClient,
    private val userPubkey: String
) {
    private val _nfts = MutableStateFlow<List<InscriptionNFT>>(emptyList())
    val nfts: StateFlow<List<InscriptionNFT>> = _nfts.asStateFlow()
    
    private val _collections = MutableStateFlow<List<InscriptionCollection>>(emptyList())
    val collections: StateFlow<List<InscriptionCollection>> = _collections.asStateFlow()
    
    /**
     * Create an inscription NFT collection
     */
    suspend fun createCollection(
        name: String,
        symbol: String,
        description: String,
        image: String,
        maxItems: Int? = null,
        royalty: NFTRoyalty? = null
    ): CreateCollectionResult {
        val inscriptionContent = buildString {
            append("{")
            append("\"p\":\"styx-721\",")
            append("\"op\":\"collection\",")
            append("\"name\":\"$name\",")
            append("\"symbol\":\"$symbol\",")
            append("\"desc\":\"$description\",")
            append("\"img\":\"$image\"")
            maxItems?.let { append(",\"max\":$it") }
            append("}")
        }
        
        val content = inscriptionContent.toByteArray()
        
        // Generate collection ID
        val collectionIdBytes = StyxCrypto.sha256(
            content + userPubkey.toByteArray() + System.currentTimeMillis().toByteArray()
        )
        val collectionId = collectionIdBytes.take(16).toByteArray().toHexString()
        
        // Would build and send transaction
        
        return CreateCollectionResult(
            collectionId = collectionId,
            signature = ""
        )
    }
    
    /**
     * Mint an inscription NFT
     */
    suspend fun mintNFT(
        metadata: InscriptionNFTMetadata,
        collectionId: String? = null,
        recipient: String? = null,
        compressed: Boolean = true,
        stealth: Boolean = false
    ): MintNFTResult {
        val inscriptionContent = buildString {
            append("{")
            append("\"p\":\"styx-721\",")
            append("\"op\":\"mint\",")
            append("\"name\":\"${metadata.name}\",")
            append("\"desc\":\"${metadata.description}\",")
            append("\"img\":\"${metadata.image}\"")
            metadata.animationUrl?.let { append(",\"anim\":\"$it\"") }
            metadata.externalUrl?.let { append(",\"ext\":\"$it\"") }
            collectionId?.let { append(",\"col\":\"$it\"") }
            append(",\"compressed\":$compressed")
            append("}")
        }
        
        val content = inscriptionContent.toByteArray()
        
        // Generate inscription ID
        val inscriptionIdBytes = StyxCrypto.sha256(
            content + userPubkey.toByteArray() + System.currentTimeMillis().toByteArray()
        )
        val inscriptionId = inscriptionIdBytes.take(16).toByteArray().toHexString()
        
        // Derive mint address
        val mintSeed = StyxCrypto.sha256("styx-721:$inscriptionId".toByteArray())
        val mint = mintSeed.toHexString()
        
        // Would build and send transaction
        
        return MintNFTResult(
            inscriptionId = inscriptionId,
            mint = mint,
            signature = ""
        )
    }
    
    /**
     * Batch mint NFTs
     */
    suspend fun batchMintNFTs(
        metadataList: List<InscriptionNFTMetadata>,
        collectionId: String? = null,
        recipients: List<String>? = null,
        compressed: Boolean = true
    ): List<MintNFTResult> {
        return metadataList.mapIndexed { index, metadata ->
            mintNFT(
                metadata = metadata,
                collectionId = collectionId,
                recipient = recipients?.getOrNull(index),
                compressed = compressed
            )
        }
    }
    
    /**
     * Transfer an inscription NFT
     */
    suspend fun transferNFT(
        inscriptionId: String,
        mint: String,
        to: String,
        stealth: Boolean = false
    ): String {
        val transferContent = buildString {
            append("{")
            append("\"p\":\"styx-721\",")
            append("\"op\":\"transfer\",")
            append("\"id\":\"$inscriptionId\"")
            append("}")
        }
        
        // Would build and send transaction
        return "" // signature
    }
    
    /**
     * Burn an inscription NFT
     */
    suspend fun burnNFT(
        inscriptionId: String,
        mint: String
    ): String {
        val burnContent = buildString {
            append("{")
            append("\"p\":\"styx-721\",")
            append("\"op\":\"burn\",")
            append("\"id\":\"$inscriptionId\"")
            append("}")
        }
        
        // Would build and send transaction
        return "" // signature
    }
    
    /**
     * Get NFT info by inscription ID
     */
    suspend fun getNFT(inscriptionId: String): InscriptionNFT? {
        // Would call RPC
        return null
    }
    
    /**
     * Get all NFTs owned by the user
     */
    suspend fun getMyNFTs(): List<InscriptionNFT> {
        // Would call RPC
        return emptyList()
    }
    
    /**
     * Get collection info
     */
    suspend fun getCollection(collectionId: String): InscriptionCollection? {
        // Would call RPC
        return null
    }
    
    /**
     * Get all NFTs in a collection
     */
    suspend fun getNFTsByCollection(collectionId: String): List<InscriptionNFT> {
        // Would call RPC
        return emptyList()
    }
    
    /**
     * View inscription content
     */
    suspend fun viewInscription(inscriptionId: String): ViewInscriptionResult? {
        // Would call RPC to get inscription data
        return null
    }
    
    /**
     * Refresh NFTs and collections
     */
    suspend fun refresh() {
        _nfts.value = getMyNFTs()
    }
    
    private fun ByteArray.toHexString(): String = joinToString("") { "%02x".format(it) }
    
    private fun Long.toByteArray(): ByteArray {
        val buffer = java.nio.ByteBuffer.allocate(8)
        buffer.order(java.nio.ByteOrder.LITTLE_ENDIAN)
        buffer.putLong(this)
        return buffer.array()
    }
}

@Serializable
data class CreateCollectionResult(
    val collectionId: String,
    val signature: String
)

@Serializable
data class MintNFTResult(
    val inscriptionId: String,
    val mint: String,
    val signature: String
)

@Serializable
data class ViewInscriptionResult(
    val contentType: String,
    val content: ByteArray,
    val metadata: InscriptionNFTMetadata? = null
)
