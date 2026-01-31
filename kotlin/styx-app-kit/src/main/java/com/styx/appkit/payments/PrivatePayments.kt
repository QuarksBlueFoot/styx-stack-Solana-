package com.styx.appkit.payments

import com.styx.appkit.core.Base58
import com.styx.appkit.core.StyxClient
import com.styx.appkit.core.StyxCrypto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable
import java.util.UUID

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX PRIVATE PAYMENTS MODULE
 *  
 *  Private payments with stealth addresses and Resolv links
 *  Features: Stealth Transfers, Payment Links, Gasless Claims
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

@Serializable
data class PaymentLink(
    val id: String,
    val url: String,
    val shortCode: String,
    val qrData: String,
    val amount: Long,  // lamports
    val tokenMint: String? = null,  // null = SOL
    val memo: String? = null,
    val expiresAt: Long? = null,
    val claimSecret: String,
    val escrowPubkey: String,
    val status: PaymentStatus = PaymentStatus.PENDING
)

@Serializable
enum class PaymentStatus {
    PENDING,
    CLAIMED,
    EXPIRED,
    REFUNDED
}

@Serializable
data class StealthPayment(
    val id: String,
    val stealthPubkey: String,
    val ephemeralPubkey: String,
    val amount: Long,
    val tokenMint: String? = null,
    val signature: String? = null,
    val timestamp: Long = System.currentTimeMillis()
)

@Serializable
data class PaymentRequest(
    val id: String,
    val requesterPubkey: String,
    val amount: Long,
    val tokenMint: String? = null,
    val memo: String? = null,
    val status: RequestStatus = RequestStatus.PENDING
)

@Serializable
enum class RequestStatus {
    PENDING,
    APPROVED,
    REJECTED,
    COMPLETED
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE PAYMENTS CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

class PrivatePaymentsClient(
    private val styxClient: StyxClient,
    private val userPubkey: String
) {
    private val _paymentLinks = MutableStateFlow<List<PaymentLink>>(emptyList())
    val paymentLinks: StateFlow<List<PaymentLink>> = _paymentLinks.asStateFlow()
    
    private val _stealthPayments = MutableStateFlow<List<StealthPayment>>(emptyList())
    val stealthPayments: StateFlow<List<StealthPayment>> = _stealthPayments.asStateFlow()
    
    private val _paymentRequests = MutableStateFlow<List<PaymentRequest>>(emptyList())
    val paymentRequests: StateFlow<List<PaymentRequest>> = _paymentRequests.asStateFlow()
    
    companion object {
        const val RESOLV_BASE_URL = "https://styxprivacy.app/claim"
        const val LAMPORTS_PER_SOL = 1_000_000_000L
    }
    
    /**
     * Create a payment link (Resolv)
     * 
     * Recipient can claim without wallet via text/email
     */
    suspend fun createPaymentLink(
        amountSol: Double,
        tokenMint: String? = null,
        memo: String? = null,
        expiresInHours: Int? = null
    ): PaymentLink {
        val amountLamports = (amountSol * LAMPORTS_PER_SOL).toLong()
        
        // Generate claim secret
        val claimSecretBytes = StyxCrypto.randomBytes(32)
        val claimSecret = Base58.encode(claimSecretBytes)
        
        // Derive escrow address from claim secret
        val escrowPubkey = deriveEscrowAddress(claimSecretBytes)
        
        // Generate payment ID
        val paymentId = UUID.randomUUID().toString().take(8)
        val shortCode = paymentId.uppercase()
        
        // Build URL
        val url = "$RESOLV_BASE_URL/$paymentId?s=${claimSecret}"
        
        val expiresAt = expiresInHours?.let {
            System.currentTimeMillis() + (it * 60 * 60 * 1000)
        }
        
        val link = PaymentLink(
            id = paymentId,
            url = url,
            shortCode = shortCode,
            qrData = url,
            amount = amountLamports,
            tokenMint = tokenMint,
            memo = memo,
            expiresAt = expiresAt,
            claimSecret = claimSecret,
            escrowPubkey = escrowPubkey
        )
        
        _paymentLinks.value = _paymentLinks.value + link
        
        // TODO: Send transaction to fund escrow
        
        return link
    }
    
    /**
     * Claim a payment link
     */
    suspend fun claimPaymentLink(
        claimSecret: String,
        recipientPubkey: String = userPubkey
    ): ClaimResult {
        // Decode claim secret
        val secretBytes = Base58.decode(claimSecret)
        val escrowPubkey = deriveEscrowAddress(secretBytes)
        
        // TODO: Build and send claim transaction
        
        return ClaimResult(
            success = true,
            signature = "mock_signature",
            amount = 0,
            recipient = recipientPubkey
        )
    }
    
    /**
     * Send stealth payment
     * 
     * Uses DKSAP for unlinkable recipient addresses
     */
    suspend fun sendStealthPayment(
        recipientSpendPubkey: ByteArray,
        recipientViewPubkey: ByteArray,
        amountSol: Double,
        tokenMint: String? = null
    ): StealthPayment {
        val amountLamports = (amountSol * LAMPORTS_PER_SOL).toLong()
        
        // Generate stealth address
        val stealthResult = StyxCrypto.generateStealthAddress(
            recipientSpendPubkey,
            recipientViewPubkey
        )
        
        val stealthPubkeyBase58 = Base58.encode(stealthResult.stealthPubkey)
        val ephemeralPubkeyBase58 = Base58.encode(stealthResult.ephemeralPubkey)
        
        val payment = StealthPayment(
            id = UUID.randomUUID().toString(),
            stealthPubkey = stealthPubkeyBase58,
            ephemeralPubkey = ephemeralPubkeyBase58,
            amount = amountLamports,
            tokenMint = tokenMint
        )
        
        _stealthPayments.value = _stealthPayments.value + payment
        
        // TODO: Build and send transaction to stealth address
        
        return payment
    }
    
    /**
     * Scan for incoming stealth payments
     */
    suspend fun scanForStealthPayments(
        viewPrivateKey: ByteArray,
        spendPublicKey: ByteArray
    ): List<StealthPayment> {
        // TODO: Scan blockchain announcements and check ownership
        return emptyList()
    }
    
    /**
     * Create payment request
     */
    suspend fun createPaymentRequest(
        amountSol: Double,
        tokenMint: String? = null,
        memo: String? = null
    ): PaymentRequest {
        val amountLamports = (amountSol * LAMPORTS_PER_SOL).toLong()
        
        val request = PaymentRequest(
            id = UUID.randomUUID().toString(),
            requesterPubkey = userPubkey,
            amount = amountLamports,
            tokenMint = tokenMint,
            memo = memo
        )
        
        _paymentRequests.value = _paymentRequests.value + request
        
        return request
    }
    
    /**
     * Generate SMS text for payment link
     */
    fun generateSmsText(link: PaymentLink, recipientName: String? = null): String {
        val amountSol = link.amount.toDouble() / LAMPORTS_PER_SOL
        val name = recipientName ?: "there"
        return "Hey $name! You've received $amountSol SOL. Claim it here: ${link.url}"
    }
    
    /**
     * Generate email content for payment link
     */
    fun generateEmailContent(link: PaymentLink, recipientName: String? = null): EmailContent {
        val amountSol = link.amount.toDouble() / LAMPORTS_PER_SOL
        val name = recipientName ?: "there"
        
        return EmailContent(
            subject = "You've received $amountSol SOL!",
            body = """
                Hey $name!
                
                You've received $amountSol SOL on Solana.
                
                Claim your payment here:
                ${link.url}
                
                This link is your key to the funds - keep it safe!
            """.trimIndent(),
            url = link.url
        )
    }
    
    /**
     * Get payment link status
     */
    suspend fun getPaymentStatus(paymentId: String): PaymentStatus {
        val link = _paymentLinks.value.find { it.id == paymentId }
        return link?.status ?: PaymentStatus.EXPIRED
    }
    
    /**
     * Refund unclaimed payment
     */
    suspend fun refundPayment(paymentId: String): Boolean {
        val link = _paymentLinks.value.find { it.id == paymentId }
            ?: return false
            
        if (link.status != PaymentStatus.PENDING) return false
        
        // TODO: Build refund transaction
        
        _paymentLinks.value = _paymentLinks.value.map { l ->
            if (l.id == paymentId) l.copy(status = PaymentStatus.REFUNDED) else l
        }
        
        return true
    }
    
    private fun deriveEscrowAddress(claimSecret: ByteArray): String {
        val hash = StyxCrypto.sha256(claimSecret)
        return Base58.encode(hash)
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

@Serializable
data class ClaimResult(
    val success: Boolean,
    val signature: String?,
    val amount: Long,
    val recipient: String,
    val error: String? = null
)

@Serializable
data class EmailContent(
    val subject: String,
    val body: String,
    val url: String
)
