package com.styx.appkit.airdrop

import com.styx.appkit.core.Base58
import com.styx.appkit.core.StyxClient
import com.styx.appkit.core.StyxCrypto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX PRIVATE AIRDROP MODULE (WhisperDrop)
 *  
 *  Private airdrops on Solana with:
 *  - Merkle proof claims (cheap, scalable)
 *  - Collection gating (NFT/cNFT holder requirements)
 *  - Time-locked releases
 *  - Anonymous claiming via stealth addresses
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

@Serializable
data class Airdrop(
    val id: String,
    val name: String,
    val description: String? = null,
    val creator: String,
    val mint: String? = null,  // null for SOL
    val totalAmount: Long,
    val claimedAmount: Long = 0,
    val recipientCount: Int,
    val merkleRoot: ByteArray,
    val startsAt: Long,
    val endsAt: Long,
    val eligibility: List<EligibilityRequirement> = emptyList(),
    val privacy: AirdropPrivacy,
    val status: AirdropStatus = AirdropStatus.ACTIVE,
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
enum class AirdropStatus {
    DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED
}

@Serializable
data class EligibilityRequirement(
    val type: EligibilityType,
    val mint: String? = null,
    val collection: String? = null,
    val minBalance: Long? = null,
    val minNFTCount: Int? = null,
    val snapshotSlot: Long? = null,
    val traitRequirements: List<TraitRequirement>? = null,
    val description: String
)

@Serializable
enum class EligibilityType {
    TOKEN_HOLDER,
    NFT_HOLDER,
    COLLECTION_HOLDER,  // Must hold NFT from specific collection
    CNFT_HOLDER,        // Must hold compressed NFT
    CNFT_COLLECTION,    // Must hold cNFT from specific collection
    SNAPSHOT,
    ALLOWLIST,
    CUSTOM
}

@Serializable
data class TraitRequirement(
    val traitType: String,
    val value: String? = null,
    val values: List<String>? = null,  // Any of these values
    val operator: TraitOperator = TraitOperator.EQUALS
)

@Serializable
enum class TraitOperator {
    EQUALS, CONTAINS, GREATER_THAN, LESS_THAN
}

@Serializable
data class CollectionGate(
    val collection: String,
    val minCount: Int = 1,
    val traits: List<TraitRequirement>? = null,
    val includeCNFTs: Boolean = true,
    val snapshotSlot: Long? = null
)

@Serializable
data class AirdropPrivacy(
    val hiddenAmounts: Boolean = false,
    val stealthClaims: Boolean = true,
    val hiddenRecipients: Boolean = true,
    val encryptedClaims: Boolean = false
)

@Serializable
data class ClaimResult(
    val signature: String,
    val amount: Long,
    val destination: String,
    val timestamp: Long = System.currentTimeMillis()
)

@Serializable
data class EligibilityCheckResult(
    val eligible: Boolean,
    val ownedNFTs: List<OwnedNFTInfo> = emptyList(),
    val missingRequirements: List<String> = emptyList()
)

@Serializable
data class OwnedNFTInfo(
    val mint: String,
    val collection: String,
    val isCNFT: Boolean
)

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE AIRDROP CLIENT (WhisperDrop)
// ═══════════════════════════════════════════════════════════════════════════════

class PrivateAirdropClient(
    private val styxClient: StyxClient,
    private val userPubkey: String
) {
    private val _eligibleAirdrops = MutableStateFlow<List<Airdrop>>(emptyList())
    val eligibleAirdrops: StateFlow<List<Airdrop>> = _eligibleAirdrops.asStateFlow()
    
    private val _createdAirdrops = MutableStateFlow<List<Airdrop>>(emptyList())
    val createdAirdrops: StateFlow<List<Airdrop>> = _createdAirdrops.asStateFlow()
    
    companion object {
        const val WHISPERDROP_PROGRAM_ID = "GhstFNnEbixAGQgLnWg1nWetJQgGfSUMhnxdBA6hWu5e"
    }
    
    /**
     * Create a collection-gated airdrop (WhisperDrop)
     * Only holders of specific NFT collections can claim
     */
    suspend fun createCollectionGatedAirdrop(
        name: String,
        description: String? = null,
        mint: String? = null,
        totalAmount: Long,
        amountPerClaim: Long,
        maxClaims: Int? = null,
        collectionGates: List<CollectionGate>,
        startsAt: Long = System.currentTimeMillis(),
        endsAt: Long = startsAt + 30 * 24 * 60 * 60 * 1000L,
        privacy: AirdropPrivacy = AirdropPrivacy()
    ): Airdrop {
        val airdropId = generateAirdropId()
        
        // Build eligibility from collection gates
        val eligibility = collectionGates.map { gate ->
            EligibilityRequirement(
                type = if (gate.includeCNFTs) EligibilityType.CNFT_COLLECTION else EligibilityType.COLLECTION_HOLDER,
                collection = gate.collection,
                minNFTCount = gate.minCount,
                traitRequirements = gate.traits,
                snapshotSlot = gate.snapshotSlot,
                description = "Hold ${gate.minCount}+ NFT(s) from collection ${gate.collection.take(8)}..."
            )
        }
        
        // TODO: Build and send transaction to create gated airdrop
        
        val airdrop = Airdrop(
            id = airdropId,
            name = name,
            description = description,
            creator = userPubkey,
            mint = mint,
            totalAmount = totalAmount,
            recipientCount = maxClaims ?: 0,
            merkleRoot = ByteArray(32),  // Not used for gated airdrops
            startsAt = startsAt,
            endsAt = endsAt,
            eligibility = eligibility,
            privacy = privacy
        )
        
        _createdAirdrops.value = _createdAirdrops.value + airdrop
        return airdrop
    }
    
    /**
     * Claim from a collection-gated airdrop
     * Requires proof of collection ownership
     */
    suspend fun claimGatedAirdrop(
        airdropId: String,
        nftMint: String? = null,
        cnftAssetId: String? = null,
        cnftProof: CNFTOwnershipProof? = null,
        useStealth: Boolean = true
    ): ClaimResult {
        // Verify ownership
        require(nftMint != null || (cnftAssetId != null && cnftProof != null)) {
            "Must provide either NFT mint or cNFT asset ID with proof"
        }
        
        // TODO: Build claim transaction with ownership proof
        
        return ClaimResult(
            signature = "",  // Would be filled by actual tx
            amount = 0,
            destination = userPubkey
        )
    }
    
    /**
     * Verify if an address is eligible for a collection-gated airdrop
     */
    suspend fun verifyCollectionEligibility(
        airdropId: String,
        address: String = userPubkey
    ): EligibilityCheckResult {
        // Would call indexer to check NFT ownership against collection gates
        return EligibilityCheckResult(
            eligible = false,
            ownedNFTs = emptyList(),
            missingRequirements = listOf("Verification pending")
        )
    }
    
    /**
     * Create a standard merkle-based airdrop
     */
    suspend fun createAirdrop(
        name: String,
        description: String? = null,
        mint: String? = null,
        recipients: List<AirdropRecipient>,
        startsAt: Long = System.currentTimeMillis(),
        endsAt: Long = startsAt + 30 * 24 * 60 * 60 * 1000L,
        eligibility: List<EligibilityRequirement> = emptyList(),
        privacy: AirdropPrivacy = AirdropPrivacy()
    ): Airdrop {
        val airdropId = generateAirdropId()
        
        // Build merkle tree
        val merkleRoot = buildMerkleTree(recipients)
        val totalAmount = recipients.sumOf { it.amount }
        
        // TODO: Build and send transaction
        
        val airdrop = Airdrop(
            id = airdropId,
            name = name,
            description = description,
            creator = userPubkey,
            mint = mint,
            totalAmount = totalAmount,
            recipientCount = recipients.size,
            merkleRoot = merkleRoot,
            startsAt = startsAt,
            endsAt = endsAt,
            eligibility = eligibility,
            privacy = privacy
        )
        
        _createdAirdrops.value = _createdAirdrops.value + airdrop
        return airdrop
    }
    
    /**
     * Claim from an airdrop
     */
    suspend fun claim(
        airdropId: String,
        useStealth: Boolean = true
    ): ClaimResult {
        // TODO: Fetch proof and build claim transaction
        
        return ClaimResult(
            signature = "",
            amount = 0,
            destination = userPubkey
        )
    }
    
    /**
     * Get airdrops this user is eligible for
     */
    suspend fun refreshEligibleAirdrops() {
        // Would call indexer to fetch eligible airdrops
        // _eligibleAirdrops.value = fetchedAirdrops
    }
    
    /**
     * Generate claim URL for sharing
     */
    fun generateClaimUrl(airdropId: String): String {
        return "https://drop.styxprivacy.app/claim/$airdropId"
    }
    
    private fun generateAirdropId(): String {
        return Base58.encode(StyxCrypto.randomBytes(8))
    }
    
    private fun buildMerkleTree(recipients: List<AirdropRecipient>): ByteArray {
        // Simplified merkle tree construction
        // In production, would use proper merkle tree library
        val leaves = recipients.map { recipient ->
            StyxCrypto.keccak256(
                Base58.decode(recipient.address) + 
                recipient.amount.toByteArray()
            )
        }
        
        if (leaves.isEmpty()) return ByteArray(32)
        if (leaves.size == 1) return leaves[0]
        
        var currentLevel = leaves
        while (currentLevel.size > 1) {
            val nextLevel = mutableListOf<ByteArray>()
            for (i in currentLevel.indices step 2) {
                val left = currentLevel[i]
                val right = if (i + 1 < currentLevel.size) currentLevel[i + 1] else left
                val combined = if (left.contentEquals(right) || 
                    left.zip(right).all { (l, r) -> l <= r }) {
                    left + right
                } else {
                    right + left
                }
                nextLevel.add(StyxCrypto.keccak256(combined))
            }
            currentLevel = nextLevel
        }
        
        return currentLevel[0]
    }
    
    private fun Long.toByteArray(): ByteArray {
        val buffer = java.nio.ByteBuffer.allocate(8)
        buffer.putLong(this)
        return buffer.array()
    }
}

@Serializable
data class AirdropRecipient(
    val address: String,
    val amount: Long
)

@Serializable
data class CNFTOwnershipProof(
    val root: ByteArray,
    val dataHash: ByteArray,
    val creatorHash: ByteArray,
    val leafIndex: Int,
    val proofNodes: List<String>
)
