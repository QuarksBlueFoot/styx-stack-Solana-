# 🔐 Styx Privacy App Kit

**Build privacy-first mobile apps on Solana in minutes.**

The Styx App Kit provides production-ready modules for:
- 📨 **Signal-like Messaging** - E2E encrypted messaging with Double Ratchet
- 🎰 **Private Games** - Provably fair coin flip, dice, RPS with commit-reveal
- 🗳️ **Anonymous Voting** - Polls with hidden votes and identities
- 💸 **Private Payments** - Stealth addresses and claimable links
- 🏛️ **DAO Governance** - Anonymous proposals and voting
- 🖼️ **Private NFTs** - Hidden ownership and encrypted metadata

## Quick Start

```bash
npm install @styx-stack/app-kit @solana/web3.js
```

---

## 📨 Signal-Style Messenger (React Native)

Build a complete encrypted messenger in under 100 lines:

```tsx
import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Text } from 'react-native';
import { 
  PrivateMessagingClient, 
  StyxClient,
  getClusterConfig,
} from '@styx-stack/app-kit';
import { useAuthorization } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';

export function PrivateMessenger() {
  const { authorizeSession, selectedAccount } = useAuthorization();
  const [client, setClient] = useState<PrivateMessagingClient | null>(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [recipient, setRecipient] = useState('');

  useEffect(() => {
    if (selectedAccount) {
      // Initialize messaging client
      const config = getClusterConfig('mainnet-beta');
      const styxClient = new StyxClient(config);
      
      const messagingClient = new PrivateMessagingClient({
        client: styxClient,
        signer: selectedAccount.keypair,
        onMessage: (msg) => {
          // New message received!
          setMessages(prev => [...prev, msg]);
        },
      });
      
      setClient(messagingClient);
      
      // Connect to relay for real-time messages
      messagingClient.connectRelay();
    }
  }, [selectedAccount]);

  const sendMessage = async () => {
    if (!client || !recipient || !input) return;
    
    // Messages are E2E encrypted using X25519 + XChaCha20-Poly1305
    // With Double Ratchet for forward secrecy
    await client.sendMessage(
      new PublicKey(recipient),
      recipientX25519Key, // Get from indexer or QR code
      input
    );
    
    setInput('');
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TextInput
        placeholder="Recipient public key"
        value={recipient}
        onChangeText={setRecipient}
        style={styles.input}
      />
      
      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <View style={styles.message}>
            <Text style={styles.sender}>{item.sender.toBase58().slice(0, 8)}...</Text>
            <Text>{item.content}</Text>
          </View>
        )}
        style={{ flex: 1 }}
      />
      
      <View style={styles.inputRow}>
        <TextInput
          placeholder="Type a message..."
          value={input}
          onChangeText={setInput}
          style={[styles.input, { flex: 1 }]}
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
          <Text>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = {
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 8 },
  inputRow: { flexDirection: 'row', gap: 8 },
  sendBtn: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8 },
  message: { padding: 12, backgroundColor: '#f0f0f0', borderRadius: 8, marginBottom: 8 },
  sender: { fontWeight: 'bold', marginBottom: 4 },
};
```

### How It Works

1. **Key Exchange**: Each user's Ed25519 key is converted to X25519 for ECDH
2. **Encryption**: Messages encrypted with XChaCha20-Poly1305 (256-bit)
3. **Forward Secrecy**: Double Ratchet derives new keys per message
4. **On-Chain Proof**: Encrypted message logged in Styx program memo
5. **Indexer Delivery**: Real-time WebSocket delivery via indexer

---

## 🎰 Private Coin Flip Game

Provably fair coin flip with commit-reveal cryptography:

```tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { 
  PrivateCoinFlip, 
  StyxClient,
  getClusterConfig,
  LAMPORTS_PER_SOL,
} from '@styx-stack/app-kit';

export function CoinFlipGame({ wallet }) {
  const [game, setGame] = useState(null);
  const [phase, setPhase] = useState<'idle' | 'creating' | 'waiting' | 'revealing' | 'complete'>('idle');
  const [result, setResult] = useState<'won' | 'lost' | null>(null);

  const config = getClusterConfig('mainnet-beta');
  const styxClient = new StyxClient(config);
  
  const coinFlip = new PrivateCoinFlip({
    client: styxClient,
    signer: wallet,
  });

  // Create a new game
  const createGame = async (choice: 'heads' | 'tails') => {
    setPhase('creating');
    
    const newGame = await coinFlip.createGame(
      choice,
      BigInt(0.1 * LAMPORTS_PER_SOL), // 0.1 SOL stake
      { 
        commitDeadlineSeconds: 300,  // 5 min to join
        revealDeadlineSeconds: 300,  // 5 min to reveal
      }
    );
    
    setGame(newGame);
    setPhase('waiting');
    
    // Share game ID for opponent to join
    console.log('Share this game ID:', newGame.id);
  };

  // Join existing game
  const joinGame = async (gameId: string, choice: 'heads' | 'tails') => {
    setPhase('creating');
    
    const joinedGame = await coinFlip.joinGame(
      gameId,
      choice,
      BigInt(0.1 * LAMPORTS_PER_SOL)
    );
    
    setGame(joinedGame);
    setPhase('revealing');
    
    // Automatically reveal our choice
    await revealChoice(gameId);
  };

  // Reveal choice (required after both players commit)
  const revealChoice = async (gameId: string) => {
    setPhase('revealing');
    
    await coinFlip.revealChoice(gameId);
    
    // Wait for opponent to reveal, then claim
    // In production, poll the game state or use WebSocket
    const finalGame = await coinFlip.getGame(gameId);
    
    if (finalGame.phase === 'complete') {
      if (finalGame.winner?.equals(wallet.publicKey)) {
        setResult('won');
        await coinFlip.claimPrize(gameId);
      } else {
        setResult('lost');
      }
    }
    
    setPhase('complete');
  };

  return (
    <View style={{ padding: 20, alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        🎰 Private Coin Flip
      </Text>
      
      {phase === 'idle' && (
        <View>
          <Text style={{ marginBottom: 16, textAlign: 'center' }}>
            Stake: 0.1 SOL{'\n'}
            Choose your side to create a game
          </Text>
          
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <TouchableOpacity 
              onPress={() => createGame('heads')}
              style={styles.choiceBtn}
            >
              <Text style={{ fontSize: 32 }}>🟡</Text>
              <Text>Heads</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => createGame('tails')}
              style={styles.choiceBtn}
            >
              <Text style={{ fontSize: 32 }}>⚫</Text>
              <Text>Tails</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {phase === 'waiting' && (
        <View style={{ alignItems: 'center' }}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 16 }}>Waiting for opponent...</Text>
          <Text style={{ marginTop: 8, fontFamily: 'monospace' }}>
            Game ID: {game?.id}
          </Text>
        </View>
      )}
      
      {phase === 'complete' && result && (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 48 }}>
            {result === 'won' ? '🎉' : '😢'}
          </Text>
          <Text style={{ fontSize: 24, marginTop: 16 }}>
            You {result}!
          </Text>
          <Text style={{ marginTop: 8 }}>
            {result === 'won' ? '+0.2 SOL' : '-0.1 SOL'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = {
  choiceBtn: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    minWidth: 100,
  },
};
```

### How Commit-Reveal Works

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. COMMIT PHASE                                                               │
│                                                                               │
│    Player A picks "heads" + random bytes                                     │
│    commitment_A = keccak256(heads | random_A | pubkey_A)                     │
│    → Submits commitment_A on-chain (choice hidden)                           │
│                                                                               │
│    Player B picks "tails" + random bytes                                     │
│    commitment_B = keccak256(tails | random_B | pubkey_B)                     │
│    → Submits commitment_B on-chain (choice hidden)                           │
├──────────────────────────────────────────────────────────────────────────────┤
│ 2. REVEAL PHASE                                                               │
│                                                                               │
│    Player A reveals: (heads, random_A)                                       │
│    → Program verifies keccak256(heads | random_A | A) == commitment_A        │
│                                                                               │
│    Player B reveals: (tails, random_B)                                       │
│    → Program verifies keccak256(tails | random_B | B) == commitment_B        │
├──────────────────────────────────────────────────────────────────────────────┤
│ 3. DETERMINE WINNER                                                           │
│                                                                               │
│    combined_random = sha256(random_A | random_B)                             │
│    result = combined_random[0] % 2  (0=heads, 1=tails)                       │
│    → Neither player could predict or manipulate the outcome                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗳️ Private Voting / Polls

Create anonymous polls for any app:

```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { 
  PrivateVoting,
  StyxClient,
  getClusterConfig,
} from '@styx-stack/app-kit';

export function PrivatePoll({ wallet, appId }) {
  const [voting, setVoting] = useState<PrivateVoting | null>(null);
  const [polls, setPolls] = useState([]);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [results, setResults] = useState(null);

  useEffect(() => {
    const config = getClusterConfig('mainnet-beta');
    const styxClient = new StyxClient(config);
    
    const votingClient = new PrivateVoting({
      client: styxClient,
      signer: wallet,
      appId: appId, // Scope polls to your app
    });
    
    setVoting(votingClient);
    
    // Load active polls
    votingClient.listActivePolls().then(setPolls);
  }, [wallet]);

  // Create a new poll
  const createPoll = async () => {
    const poll = await voting.createPoll({
      question: 'What feature should we build next?',
      options: ['Dark Mode', 'Push Notifications', 'Multi-language'],
      duration: 86400, // 24 hours
      type: 'commit-reveal',
      privacy: {
        anonymousVoters: true,   // Hide who voted
        hiddenTallies: true,     // Hide counts until end
        commitReveal: true,      // Two-phase voting
      },
    });
    
    setPolls(prev => [...prev, poll]);
  };

  // Cast an anonymous vote
  const castVote = async (pollId: string, optionIndex: number) => {
    // Vote is committed (hashed) - choice is hidden
    await voting.vote(pollId, optionIndex);
    
    alert('Vote committed! Remember to reveal after voting ends.');
  };

  // Reveal vote (required for commit-reveal polls)
  const revealVote = async (pollId: string) => {
    await voting.revealVote(pollId);
    
    alert('Vote revealed!');
  };

  // Get results after poll ends
  const showResults = async (pollId: string) => {
    const { poll, results, winner } = await voting.getResults(pollId);
    setResults({ poll, results, winner });
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        🗳️ Private Polls
      </Text>
      
      <TouchableOpacity 
        onPress={createPoll}
        style={styles.createBtn}
      >
        <Text style={{ color: 'white' }}>Create New Poll</Text>
      </TouchableOpacity>
      
      <FlatList
        data={polls}
        renderItem={({ item: poll }) => (
          <View style={styles.pollCard}>
            <Text style={styles.pollQuestion}>{poll.question}</Text>
            <Text style={styles.pollMeta}>
              {poll.phase} • Ends {new Date(poll.votingEndsAt).toLocaleDateString()}
            </Text>
            
            {poll.phase === 'voting' && (
              <View style={{ marginTop: 12 }}>
                {poll.options.map((option, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => castVote(poll.id, i)}
                    style={[
                      styles.optionBtn,
                      voting?.hasVoted(poll.id) && styles.optionBtnDisabled
                    ]}
                    disabled={voting?.hasVoted(poll.id)}
                  >
                    <Text>{option.label}</Text>
                    {voting?.hasVoted(poll.id) && 
                      voting.getMyVote(poll.id)?.optionIndex === i && (
                        <Text>✓ Your vote</Text>
                      )
                    }
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            {poll.phase === 'revealing' && voting?.hasVoted(poll.id) && (
              <TouchableOpacity
                onPress={() => revealVote(poll.id)}
                style={styles.revealBtn}
              >
                <Text>Reveal My Vote</Text>
              </TouchableOpacity>
            )}
            
            {poll.phase === 'finalized' && (
              <TouchableOpacity
                onPress={() => showResults(poll.id)}
                style={styles.resultsBtn}
              >
                <Text>View Results</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
      
      {results && (
        <View style={styles.resultsModal}>
          <Text style={styles.pollQuestion}>{results.poll.question}</Text>
          {results.results.map(({ option, percentage }) => (
            <View key={option.index} style={styles.resultRow}>
              <Text>{option.label}</Text>
              <View style={styles.resultBar}>
                <View style={[styles.resultFill, { width: `${percentage}%` }]} />
              </View>
              <Text>{percentage.toFixed(1)}%</Text>
            </View>
          ))}
          {results.winner && (
            <Text style={styles.winner}>
              🏆 Winner: {results.winner.label}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = {
  createBtn: { backgroundColor: '#007AFF', padding: 16, borderRadius: 8, marginBottom: 16 },
  pollCard: { backgroundColor: '#f8f8f8', padding: 16, borderRadius: 12, marginBottom: 12 },
  pollQuestion: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  pollMeta: { color: '#666', marginBottom: 8 },
  optionBtn: { backgroundColor: 'white', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#ddd' },
  optionBtnDisabled: { opacity: 0.6 },
  revealBtn: { backgroundColor: '#FF9500', padding: 12, borderRadius: 8, marginTop: 8 },
  resultsBtn: { backgroundColor: '#34C759', padding: 12, borderRadius: 8, marginTop: 8 },
  resultsModal: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  resultRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  resultBar: { flex: 1, height: 8, backgroundColor: '#eee', borderRadius: 4, marginHorizontal: 12 },
  resultFill: { height: '100%', backgroundColor: '#007AFF', borderRadius: 4 },
  winner: { textAlign: 'center', fontSize: 18, fontWeight: 'bold', marginTop: 16 },
};
```

---

## 🔧 Kotlin (Android Native)

For native Android apps, use the Kotlin SDK:

```kotlin
// build.gradle.kts
dependencies {
    implementation("com.styx:messaging:1.0.0")
}
```

```kotlin
import com.styx.messaging.*

class PrivateMessenger(private val wallet: Keypair) {
    private val client = SpsClient.mainnet()
    private val messaging = PrivateMessagingClient(client, wallet)
    
    suspend fun sendMessage(recipient: PublicKey, content: String) {
        // Get recipient's X25519 key from indexer
        val recipientKey = client.getEncryptionKey(recipient)
        
        // Send encrypted message
        messaging.sendMessage(recipient, recipientKey, content)
    }
    
    fun onMessageReceived(callback: (PrivateMessage) -> Unit) {
        messaging.connectRelay { message ->
            callback(message)
        }
    }
}

// Voting
class PrivatePolls(private val wallet: Keypair) {
    private val client = SpsClient.mainnet()
    private val voting = VotingClient(client, wallet, appId = "my-app")
    
    suspend fun createPoll(question: String, options: List<String>) {
        voting.createPoll(
            question = question,
            options = options,
            duration = 86400, // 24 hours
            privacy = PollPrivacy(
                anonymousVoters = true,
                hiddenTallies = true,
            )
        )
    }
    
    suspend fun vote(pollId: String, optionIndex: Int) {
        voting.vote(pollId, optionIndex)
    }
}

// Coin Flip
class CoinFlipGame(private val wallet: Keypair) {
    private val client = SpsClient.mainnet()
    private val coinFlip = CoinFlipClient(client, wallet)
    
    suspend fun createGame(choice: CoinSide, stakeAmount: Long): Game {
        return coinFlip.createGame(choice, stakeAmount)
    }
    
    suspend fun joinGame(gameId: String, choice: CoinSide, stake: Long) {
        coinFlip.joinGame(gameId, choice, stake)
    }
}
```

---

## 📚 Module Reference

| Module | Description | Key Classes |
|--------|-------------|-------------|
| `messaging` | Signal-like encrypted messaging | `PrivateMessagingClient`, `StyxDoubleRatchet` |
| `games` | Commit-reveal games | `PrivateCoinFlip`, `PrivateDice`, `PrivateRPS` |
| `voting` | Anonymous polls | `PrivateVoting`, `createVotingHooks` |
| `payments` | Stealth payments | `PrivatePaymentsClient`, `generateStealthAddress` |
| `governance` | DAO voting | `PrivateGovernanceClient` |
| `nft` | Private NFTs | `PrivateNFTClient` |
| `airdrop` | WhisperDrop | `WhisperDropClient` |

---

## 🔐 Security Model

All Styx privacy features use:

- **X25519** for key exchange (Curve25519 ECDH)
- **XChaCha20-Poly1305** for authenticated encryption
- **Keccak-256** for commitments and nullifiers
- **Double Ratchet** for forward secrecy in messaging
- **Commit-Reveal** for fair randomness in games/voting

**No trusted setup** - all cryptography is transparent and auditable.

---

## 🔗 Links

- [API Reference](../docs/API_REFERENCE.md)
- [Architecture](../docs/ARCHITECTURE.md)
- [Security Checklist](../docs/SECURITY_CHECKLIST.md)
- [Mainnet Program](https://solscan.io/account/GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9)

---

*Built with 🔐 by Bluefoot Labs*
