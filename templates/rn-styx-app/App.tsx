/**
 * Styx React Native App Template
 * 
 * A privacy-first Solana mobile app template using Styx App Kit
 */

// Polyfills MUST be first
import 'react-native-get-random-values';

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  StyxProvider,
  useStyx,
  usePrivateMessaging,
  usePrivatePayments,
  ConnectButton,
} from '@styx-stack/app-kit';

// ═══════════════════════════════════════════════════════════════════════════════
// SCREENS
// ═══════════════════════════════════════════════════════════════════════════════

function HomeScreen() {
  const { client, connected, publicKey } = useStyx();
  const [activeTab, setActiveTab] = useState<'messages' | 'payments'>('messages');

  if (!connected) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Welcome to Styx</Text>
        <Text style={styles.subtitle}>Privacy-First Solana App</Text>
        <ConnectButton
          onConnect={async () => {
            // Mobile Wallet Adapter connection
            console.log('Connecting...');
          }}
          connectLabel="Connect Wallet"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Styx</Text>
        <Text style={styles.address}>
          {publicKey?.slice(0, 4)}...{publicKey?.slice(-4)}
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'messages' && styles.tabActive]}
          onPress={() => setActiveTab('messages')}
        >
          <Text style={styles.tabText}>Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'payments' && styles.tabActive]}
          onPress={() => setActiveTab('payments')}
        >
          <Text style={styles.tabText}>Payments</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'messages' ? <MessagesTab /> : <PaymentsTab />}
      </ScrollView>
    </View>
  );
}

function MessagesTab() {
  const { sendMessage, messages, conversations } = usePrivateMessaging();
  const [recipient, setRecipient] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!recipient || !messageText) return;
    setSending(true);
    try {
      await sendMessage(recipient, messageText);
      setMessageText('');
    } catch (e) {
      console.error('Failed to send:', e);
    }
    setSending(false);
  };

  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Private Messaging</Text>
      <Text style={styles.description}>
        🔒 End-to-end encrypted with Double Ratchet protocol
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Recipient</Text>
        <TextInput
          style={styles.input}
          placeholder="Pubkey..."
          placeholderTextColor="#666"
          value={recipient}
          onChangeText={setRecipient}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Message</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Your private message..."
          placeholderTextColor="#666"
          value={messageText}
          onChangeText={setMessageText}
          multiline
        />
      </View>

      <TouchableOpacity
        style={[styles.button, sending && styles.buttonDisabled]}
        onPress={handleSend}
        disabled={sending}
      >
        <Text style={styles.buttonText}>
          {sending ? 'Sending...' : 'Send Message'}
        </Text>
      </TouchableOpacity>

      {/* Message History */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>History</Text>
      {messages.length === 0 ? (
        <Text style={styles.emptyState}>No messages yet</Text>
      ) : (
        messages.map((msg) => (
          <View key={msg.id} style={styles.messageCard}>
            <Text style={styles.messageContent}>{msg.content}</Text>
            <Text style={styles.messageTime}>
              {new Date(msg.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

function PaymentsTab() {
  const { createPaymentLink, paymentLinks } = usePrivatePayments();
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [creating, setCreating] = useState(false);
  const [newLink, setNewLink] = useState<any>(null);

  const handleCreate = async () => {
    if (!amount) return;
    setCreating(true);
    try {
      const link = await createPaymentLink({
        amount: parseFloat(amount),
        memo: memo || undefined,
      });
      setNewLink(link);
      setAmount('');
      setMemo('');
    } catch (e) {
      console.error('Failed to create:', e);
    }
    setCreating(false);
  };

  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Payment Links</Text>
      <Text style={styles.description}>
        📱 Create links shareable via text or email - no wallet needed to claim!
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Amount (SOL)</Text>
        <TextInput
          style={styles.input}
          placeholder="1.0"
          placeholderTextColor="#666"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Memo (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Coffee money..."
          placeholderTextColor="#666"
          value={memo}
          onChangeText={setMemo}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, creating && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={creating}
      >
        <Text style={styles.buttonText}>
          {creating ? 'Creating...' : 'Create Payment Link'}
        </Text>
      </TouchableOpacity>

      {newLink && (
        <View style={styles.linkCard}>
          <Text style={styles.linkTitle}>✅ Link Created!</Text>
          <Text style={styles.linkUrl}>{newLink.url}</Text>
          <Text style={styles.linkCode}>Short Code: {newLink.shortCode}</Text>
        </View>
      )}

      {/* Payment History */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Your Links</Text>
      {paymentLinks.length === 0 ? (
        <Text style={styles.emptyState}>No payment links yet</Text>
      ) : (
        paymentLinks.map((link) => (
          <View key={link.id} style={styles.paymentCard}>
            <Text style={styles.paymentAmount}>
              {(link.amount / 1_000_000_000).toFixed(2)} SOL
            </Text>
            <Text style={styles.paymentStatus}>{link.status}</Text>
          </View>
        ))
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════════════════════════

export default function App() {
  return (
    <StyxProvider cluster="devnet">
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
        <HomeScreen />
      </SafeAreaView>
    </StyxProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8B8BAA',
    marginBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A26',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  address: {
    fontSize: 14,
    color: '#14F195',
    backgroundColor: '#1A1A26',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tabs: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#1A1A26',
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: '#9945FF',
  },
  tabText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#8B8BAA',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#8B8BAA',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1A1A26',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#252535',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#9945FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    color: '#6B6B8A',
    textAlign: 'center',
    padding: 24,
  },
  messageCard: {
    backgroundColor: '#1A1A26',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  messageContent: {
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 4,
  },
  messageTime: {
    color: '#6B6B8A',
    fontSize: 12,
  },
  paymentCard: {
    backgroundColor: '#1A1A26',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentAmount: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  paymentStatus: {
    color: '#14F195',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  linkCard: {
    backgroundColor: '#14F19520',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#14F195',
  },
  linkTitle: {
    color: '#14F195',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  linkUrl: {
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 4,
  },
  linkCode: {
    color: '#8B8BAA',
    fontSize: 14,
  },
});
