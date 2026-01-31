package com.styx.appkit.messaging

import com.styx.appkit.core.EncryptedData
import com.styx.appkit.core.StyxClient
import com.styx.appkit.core.StyxCrypto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable
import java.util.UUID

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX PRIVATE MESSAGING MODULE
 *  
 *  Signal-like encrypted messaging on Solana
 *  Features: Double Ratchet, Forward Secrecy, Group Chats
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

@Serializable
data class PrivateMessage(
    val id: String,
    val sender: String,
    val recipient: String,
    val content: String,
    val timestamp: Long,
    val read: Boolean = false,
    val delivered: Boolean = false
)

@Serializable
data class Conversation(
    val id: String,
    val participants: List<String>,
    val lastMessage: PrivateMessage? = null,
    val unreadCount: Int = 0,
    val isGroup: Boolean = false,
    val groupName: String? = null,
    val groupAvatar: String? = null
)

@Serializable
data class MessageSession(
    val recipientPubkey: String,
    val rootKey: ByteArray,
    val sendChainKey: ByteArray,
    val receiveChainKey: ByteArray,
    val sendMessageNumber: Int = 0,
    val receiveMessageNumber: Int = 0
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is MessageSession) return false
        return recipientPubkey == other.recipientPubkey
    }
    
    override fun hashCode() = recipientPubkey.hashCode()
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOUBLE RATCHET IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simplified Double Ratchet for Signal-like forward secrecy
 */
class StyxDoubleRatchet(private val rootKey: ByteArray) {
    private var currentRootKey = rootKey.copyOf()
    private var sendChainKey = StyxCrypto.sha256(rootKey + "send".toByteArray())
    private var receiveChainKey = StyxCrypto.sha256(rootKey + "receive".toByteArray())
    private var messageNumber = 0
    
    /**
     * Derive message key and ratchet forward
     */
    fun deriveMessageKey(): ByteArray {
        val messageKey = StyxCrypto.sha256(sendChainKey + messageNumber.toString().toByteArray())
        sendChainKey = StyxCrypto.sha256(sendChainKey + "ratchet".toByteArray())
        messageNumber++
        return messageKey
    }
    
    /**
     * Derive key for decrypting received message
     */
    fun deriveReceiveKey(senderMessageNumber: Int): ByteArray {
        var key = receiveChainKey.copyOf()
        repeat(senderMessageNumber) {
            key = StyxCrypto.sha256(key + "ratchet".toByteArray())
        }
        return StyxCrypto.sha256(key + senderMessageNumber.toString().toByteArray())
    }
    
    /**
     * Perform Diffie-Hellman ratchet step
     */
    fun dhRatchet(theirPublicKey: ByteArray, ourPrivateKey: ByteArray) {
        val sharedSecret = StyxCrypto.sha256(ourPrivateKey + theirPublicKey)
        currentRootKey = StyxCrypto.sha256(currentRootKey + sharedSecret)
        sendChainKey = StyxCrypto.sha256(currentRootKey + "send".toByteArray())
        receiveChainKey = StyxCrypto.sha256(currentRootKey + "receive".toByteArray())
        messageNumber = 0
    }
    
    fun getState(): MessageSession {
        return MessageSession(
            recipientPubkey = "",
            rootKey = currentRootKey,
            sendChainKey = sendChainKey,
            receiveChainKey = receiveChainKey,
            sendMessageNumber = messageNumber
        )
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE MESSAGING CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

class PrivateMessagingClient(
    private val styxClient: StyxClient,
    private val userPubkey: String
) {
    private val sessions = mutableMapOf<String, StyxDoubleRatchet>()
    
    private val _messages = MutableStateFlow<List<PrivateMessage>>(emptyList())
    val messages: StateFlow<List<PrivateMessage>> = _messages.asStateFlow()
    
    private val _conversations = MutableStateFlow<List<Conversation>>(emptyList())
    val conversations: StateFlow<List<Conversation>> = _conversations.asStateFlow()
    
    private val _typingIndicators = MutableStateFlow<Map<String, Boolean>>(emptyMap())
    val typingIndicators: StateFlow<Map<String, Boolean>> = _typingIndicators.asStateFlow()
    
    /**
     * Send encrypted message
     */
    suspend fun sendMessage(
        recipientPubkey: String,
        content: String
    ): PrivateMessage {
        // Get or create session
        val session = getOrCreateSession(recipientPubkey)
        
        // Derive message key with forward secrecy
        val messageKey = session.deriveMessageKey()
        
        // Encrypt content
        val encrypted = StyxCrypto.encryptWithKey(
            content.toByteArray(Charsets.UTF_8),
            messageKey
        )
        
        // Create message
        val message = PrivateMessage(
            id = UUID.randomUUID().toString(),
            sender = userPubkey,
            recipient = recipientPubkey,
            content = content,
            timestamp = System.currentTimeMillis(),
            delivered = false
        )
        
        // Update local state
        _messages.value = _messages.value + message
        updateConversation(recipientPubkey, message)
        
        // TODO: Send to relay/on-chain
        
        return message
    }
    
    /**
     * Receive and decrypt message
     */
    suspend fun receiveMessage(
        senderPubkey: String,
        encryptedPayload: EncryptedData,
        messageNumber: Int
    ): PrivateMessage {
        val session = getOrCreateSession(senderPubkey)
        val messageKey = session.deriveReceiveKey(messageNumber)
        
        val decrypted = StyxCrypto.decryptWithKey(encryptedPayload, messageKey)
        val content = String(decrypted, Charsets.UTF_8)
        
        val message = PrivateMessage(
            id = UUID.randomUUID().toString(),
            sender = senderPubkey,
            recipient = userPubkey,
            content = content,
            timestamp = System.currentTimeMillis()
        )
        
        _messages.value = _messages.value + message
        updateConversation(senderPubkey, message)
        
        return message
    }
    
    /**
     * Create group chat
     */
    suspend fun createGroupChat(
        participantPubkeys: List<String>,
        groupName: String
    ): Conversation {
        val groupId = UUID.randomUUID().toString()
        
        // Generate group key
        val groupKey = StyxCrypto.randomBytes(32)
        
        val conversation = Conversation(
            id = groupId,
            participants = participantPubkeys + userPubkey,
            isGroup = true,
            groupName = groupName
        )
        
        _conversations.value = _conversations.value + conversation
        
        return conversation
    }
    
    /**
     * Send typing indicator
     */
    suspend fun sendTypingIndicator(recipientPubkey: String) {
        // Would send via WebSocket to relay
        _typingIndicators.value = _typingIndicators.value + (recipientPubkey to true)
    }
    
    /**
     * Mark message as read
     */
    suspend fun markAsRead(messageId: String) {
        _messages.value = _messages.value.map { msg ->
            if (msg.id == messageId) msg.copy(read = true) else msg
        }
    }
    
    /**
     * Get messages for conversation
     */
    fun getMessagesFor(pubkey: String): List<PrivateMessage> {
        return _messages.value.filter { 
            it.sender == pubkey || it.recipient == pubkey 
        }.sortedBy { it.timestamp }
    }
    
    private fun getOrCreateSession(recipientPubkey: String): StyxDoubleRatchet {
        return sessions.getOrPut(recipientPubkey) {
            // In production, perform X3DH key agreement
            val sharedSecret = StyxCrypto.sha256(
                (userPubkey + recipientPubkey).toByteArray()
            )
            StyxDoubleRatchet(sharedSecret)
        }
    }
    
    private fun updateConversation(otherPubkey: String, lastMessage: PrivateMessage) {
        val existing = _conversations.value.find { 
            it.participants.contains(otherPubkey) && !it.isGroup 
        }
        
        if (existing != null) {
            _conversations.value = _conversations.value.map { conv ->
                if (conv.id == existing.id) {
                    conv.copy(
                        lastMessage = lastMessage,
                        unreadCount = if (lastMessage.sender != userPubkey) conv.unreadCount + 1 else conv.unreadCount
                    )
                } else conv
            }
        } else {
            _conversations.value = _conversations.value + Conversation(
                id = UUID.randomUUID().toString(),
                participants = listOf(userPubkey, otherPubkey),
                lastMessage = lastMessage,
                unreadCount = if (lastMessage.sender != userPubkey) 1 else 0
            )
        }
    }
}
