package com.styx.messenger.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.styx.appkit.StyxAppKit
import com.styx.appkit.messaging.PrivateMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MessagingViewModel @Inject constructor(
    private val appKit: StyxAppKit
) : ViewModel() {

    private val _messages = MutableStateFlow<List<PrivateMessage>>(emptyList())
    val messages = _messages.asStateFlow()

    fun sendMessage(recipient: String, content: String) {
        viewModelScope.launch {
            try {
                // Double Ratchet Encrypted Send
                appKit.messaging.sendMessage(recipient, content)
                
                // Optimistic UI update
                val msg = PrivateMessage(
                    id = "temp", 
                    sender = "me", 
                    recipient = recipient, 
                    content = content, 
                    timestamp = System.currentTimeMillis()
                )
                _messages.value += msg
            } catch (e: Exception) {
                // Handle error
            }
        }
    }
    
    fun loadMessages(recipient: String) {
        viewModelScope.launch {
            // Load decrypted history
            appKit.messaging.getHistory(recipient).collect { history ->
                _messages.value = history
            }
        }
    }
}
