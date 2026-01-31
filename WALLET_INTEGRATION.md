# Styx Privacy Standard (SPS) - Wallet Integration Guide

## Integration Overview

Add support for **inscription-based private tokens (SPS)** to your Solana wallet. SPS uses an inscription model where token state is logged on-chain and reconstructed by indexers. This is different from SPL/Token-22 where balances are stored in accounts.

**Key things to understand:**
- Balances are encrypted notes in transaction logs, not account state
- You need an indexer to query balances (or run your own)
- Nullifier PDAs provide trustless double-spend protection
- Users hold viewing keys to decrypt their balances

---

## Quick Reference

| Component | Value |
|-----------|-------|
| **Mainnet Program** | `GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9` |
| **Devnet Program** | `FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW` |
| **Indexer API** | `https://api.styx.so/v1` (or self-host) |
| **SDK Package** | `@styxstack/sps-sdk` |

---

## Step 1: Add Program ID (30 seconds)

```typescript
const SPS_PROGRAM_ID = {
  mainnet: 'GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9',
  devnet: 'FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW',
};
```

---

## Step 2: Detect SPS Transactions (1 minute)

```typescript
import { PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';

function isSPSTransaction(tx: ParsedTransactionWithMeta, cluster: 'mainnet' | 'devnet'): boolean {
  const programId = SPS_PROGRAM_ID[cluster];
  return tx.transaction.message.instructions.some(
    ix => ix.programId.toBase58() === programId
  );
}
```

---

## Step 3: Parse Domain-Based Instructions (2 minutes)

SPS uses a domain-based encoding: `[DOMAIN:u8][OP:u8][...data]`

```typescript
// Domain IDs
const DOMAINS = {
  STS: 0x01,        // Styx Token Standard (fungible, NFT, semi-fungible)
  MESSAGING: 0x02,  // Encrypted messaging (Signal-style)
  ACCOUNT: 0x03,    // Virtual accounts
  VSL: 0x04,        // Verifiable State Lamports
  NOTES: 0x05,      // UTXO notes
  PRIVACY: 0x07,    // Privacy operations
  DEFI: 0x08,       // DeFi (swaps, pools)
  NFT: 0x09,        // NFT Marketplace (listings, auctions)
  GOVERNANCE: 0x0D, // Private voting
  DAM: 0x0E,        // Deferred Account Materialization
  IC: 0x0F,         // Inscription Compression (Light Protocol-style)
};

// Operation codes per domain
const STS_OPS = {
  CREATE_MINT: 0x01,  // Create any token type
  MINT_TO: 0x02,
  TRANSFER: 0x03,
  BURN: 0x04,
  SHIELD: 0x05,
  UNSHIELD: 0x06,
};

// Mint types (byte 83 in CREATE_MINT)
const MINT_TYPES = {
  FUNGIBLE: 0,       // Standard fungible token
  NFT: 1,            // Non-fungible (1 of 1)
  SEMI_FUNGIBLE: 2,  // Editions/prints (like Metaplex editions)
};

const NFT_MARKETPLACE_OPS = {
  LIST: 0x01,
  DELIST: 0x02,
  BUY: 0x03,
  BID: 0x04,
  ACCEPT_BID: 0x05,
};

function parseSPSInstruction(data: Buffer): { domain: number; op: number; payload: Buffer } {
  return {
    domain: data[0],
    op: data[1],
    payload: data.slice(2),
  };
}
```

---

## Step 4: Query Balances via Indexer (3 minutes)

The SPS indexer provides a Photon-compatible API for querying compressed assets:

```typescript
interface SPSBalance {
  mint: string;
  balance: string;  // bigint as string
  decimals: number;
  name: string;
  symbol: string;
  isPrivate: boolean;
}

async function getSPSBalances(wallet: string, cluster: 'mainnet' | 'devnet'): Promise<SPSBalance[]> {
  const baseUrl = cluster === 'mainnet' 
    ? 'https://api.styx.so/v1'
    : 'https://devnet.api.styx.so/v1';
  
  const response = await fetch(`${baseUrl}/accounts/${wallet}/balances`);
  return response.json();
}

// For compressed NFTs (cNFTs via inscriptions)
async function getSPSNFTs(wallet: string, cluster: 'mainnet' | 'devnet') {
  const baseUrl = cluster === 'mainnet' 
    ? 'https://api.styx.so/v1'
    : 'https://devnet.api.styx.so/v1';
  
  const response = await fetch(`${baseUrl}/accounts/${wallet}/nfts`);
  return response.json();
}
```

---

## Step 5: Display IC Tokens & Inscription NFTs (5 minutes)

```typescript
// Token display component
interface ICToken {
  mint: string;
  name: string;
  symbol: string;
  balance: bigint;
  decimals: number;
  logo?: string;
  isCompressed: true;  // Always true for SPS tokens
}

function formatTokenBalance(balance: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const whole = balance / divisor;
  const fraction = balance % divisor;
  return `${whole}.${fraction.toString().padStart(decimals, '0')}`;
}

// Badge for UI
function getTokenBadge(token: ICToken): { label: string; color: string } {
  return {
    label: 'IC Token',  // Inscription Compressed
    color: '#8B5CF6',   // Styx purple
  };
}
```

---

## Step 6: Build Transfer Transactions (5 minutes)

### Using the SDK (Recommended)

```typescript
import { SpsClient, Domains } from '@styxstack/sps-sdk';
import { Connection } from '@solana/web3.js';

const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=YOUR_KEY');
const client = new SpsClient(connection, wallet, { network: 'mainnet' });

// Transfer IC tokens
const { signature } = await client.transfer({
  mintId: 'TOKEN_MINT_ID',
  amount: 1000000n,
  recipient: recipientPubkey,
});

// Transfer inscription NFT
const { signature: nftSig } = await client.transferNft({
  nftId: 'NFT_ID',
  recipient: recipientPubkey,
});
```

### Manual Instruction Building

```typescript
import { TransactionInstruction, PublicKey } from '@solana/web3.js';

function buildSPSTransferInstruction(
  programId: PublicKey,
  sender: PublicKey,
  mintId: string,
  amount: bigint,
  recipientCommitment: Uint8Array,
): TransactionInstruction {
  // Domain: STS (0x01), Op: TRANSFER (0x03)
  const data = Buffer.alloc(42);
  data[0] = 0x01;  // STS domain
  data[1] = 0x03;  // TRANSFER op
  // Amount (8 bytes, little-endian)
  data.writeBigUInt64LE(amount, 2);
  // Recipient commitment (32 bytes)
  recipientCommitment.forEach((b, i) => data[10 + i] = b);
  
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: sender, isSigner: true, isWritable: true },
      // Additional accounts derived from mintId
    ],
    data,
  });
}
```

---

## Step 7: Add to Token List Auto-Discovery (3 minutes)

SPS tokens are discovered via transaction logs:

```typescript
// Parse logs for new token discovery
function parseSPSMintCreated(logs: string[]): { mintId: string; name: string; symbol: string } | null {
  for (const log of logs) {
    // Domain 0x01 (STS), Op 0x01 (CREATE_MINT)
    if (log.includes('Program log: SPS:01:01')) {
      // Parse mint details from subsequent logs
      const dataLog = logs.find(l => l.includes('Program log: mint_data:'));
      if (dataLog) {
        const json = JSON.parse(dataLog.split('mint_data:')[1]);
        return json;
      }
    }
  }
  return null;
}

// Or use indexer for all known mints
async function getKnownMints(cluster: 'mainnet' | 'devnet') {
  const baseUrl = cluster === 'mainnet' 
    ? 'https://api.styx.so/v1'
    : 'https://devnet.api.styx.so/v1';
  
  const response = await fetch(`${baseUrl}/mints`);
  return response.json();
}
```

---

## 📊 Comparison: Light Protocol vs SPS

| Feature | Light Protocol | SPS |
|---------|----------------|-----|
| **Encoding** | Account compression | Inscription-based |
| **State** | Merkle trees | Event-sourced logs |
| **Rent** | Zero | Zero |
| **Privacy** | Optional | Native |
| **NFTs** | Separate program | Same program |
| **Integration** | ~2 hours | ~20 minutes |

---

## 🏗️ Token Architecture Models

SPS offers **3 distinct token models** for different use cases:

### 1. Native STS (Pure Inscription)

**Zero accounts, zero rent** - State lives only in transaction logs.

```typescript
// Domain: STS (0x01)
// Token state is inscribed, never stored in accounts
const NATIVE_TOKEN = {
  backing_type: 0,  // Native inscription-only
  rent: 0,          // No accounts = no rent
  privacy: true,    // Built-in
};
```

**Use Case:** Maximum efficiency, lowest cost tokens.

### 2. IC Domain (Light Protocol-Style Compression)

**Merkle trees + inscription anchors** - Compatible with Light Protocol patterns but with privacy.

```typescript
// Domain: IC (0x0F)
const IC_OPS = {
  TREE_INIT: 0x01,     // Initialize state tree
  TREE_APPEND: 0x02,   // Append leaves
  COMPRESS: 0x03,      // Compress tokens
  DECOMPRESS: 0x04,    // Decompress to SPL
  TRANSFER: 0x05,      // Transfer compressed
};

// Light Protocol-style but with:
// - No trusted setup (vs Groth16)
// - 4x cheaper (~50k CU vs ~200k CU)
// - Optional privacy layer
// - Rent recovery on recompress
```

**Use Case:** Compatibility with Light Protocol patterns, large state trees.

### 3. DAM (Deferred Account Materialization)

**Token-2022 Permanent Delegate** - Unique bidirectional Virtual ↔ Real.

```typescript
// Domain: DAM (0x0E)
const DAM_OPS = {
  VIRTUAL_MINT: 0x10,      // Mint virtual tokens
  VIRTUAL_TRANSFER: 0x11,  // Transfer virtually
  MATERIALIZE: 0x20,       // Convert virtual → real SPL
  DEMATERIALIZE: 0x30,     // Convert real → virtual (RENT RECOVERED!)
};

// Key Innovation: Token-2022 Permanent Delegate
// Pool burns your tokens trustlessly, returns rent!
```

**Use Case:** DeFi integration, on-demand liquidity, rent recovery.

### Model Comparison

| Feature | Native STS | IC (Compression) | DAM (Materialize) |
|---------|------------|------------------|-------------------|
| **State** | Inscription only | Merkle trees | Pool + virtual ledger |
| **Accounts** | None | Tree accounts | On-demand |
| **Rent** | Zero always | Zero (recoverable) | Zero virtual, real when needed |
| **Privacy** | ✅ Native | ✅ Optional | ✅ Virtual transfers |
| **DeFi** | Via pools | Via decompress | ✅ Materialize for any DEX |
| **Speed** | ~50k CU | ~50k CU | ~80k CU (materialize) |

---

## 💬 Signal-Style Encrypted Messaging

SPS includes a full **Signal Protocol-compatible** messaging system with E2E encryption and forward secrecy.

### Messaging Domain (0x02)

```typescript
// Domain: MESSAGING (0x02)
const MESSAGING_OPS = {
  PRIVATE_MESSAGE: 0x01,        // Send E2E encrypted message
  ROUTED_MESSAGE: 0x02,         // Anonymous relay routing
  PRIVATE_TRANSFER: 0x03,       // Message with payment
  RATCHET_MESSAGE: 0x04,        // Double Ratchet (forward secrecy)
  PREKEY_BUNDLE_PUBLISH: 0x06,  // Publish X3DH prekeys
  PREKEY_BUNDLE_REFRESH: 0x07,  // Rotate prekeys
};
```

### X3DH Key Exchange (Asynchronous)

Recipients publish prekey bundles so senders can initiate encrypted conversations without both parties being online:

```typescript
import { MessagingClient } from '@styxstack/sps-sdk';

// Recipient: Publish prekey bundle
await messagingClient.publishPrekeyBundle({
  identityKey: keypair.publicKey,     // Long-term Ed25519
  signedPrekey: signedPrekeyPair,     // Medium-term X25519
  onetimePrekeys: generatePrekeys(20), // Ephemeral pool
});

// Sender: Fetch bundle and initiate conversation
const bundle = await indexer.getPrekeyBundle(recipientPubkey);
const session = await messagingClient.initiateSession(bundle);
```

### Send Encrypted Messages

```typescript
// E2E encrypted with XChaCha20-Poly1305
// Uses Double Ratchet for forward secrecy
await messagingClient.sendMessage({
  recipient: recipientPubkey,
  content: 'Hello from Solana!',
  // Optional: attach payment
  payment: { amount: 1_000_000n, mint: 'SOL' },
});
```

### Real-Time Message Reception

```typescript
// Subscribe to incoming messages via WebSocket
messagingClient.onMessage((msg) => {
  console.log('From:', msg.sender);
  console.log('Decrypted:', msg.content);
  console.log('Payment:', msg.payment);
});

// Or poll indexer for message history
const messages = await indexer.getMessages(myPubkey, { since: timestamp });
```

### React Native Integration

```tsx
import { 
  PrivateMessagingClient, 
  StyxClient,
} from '@styxstack/app-kit';

function ChatApp() {
  const [client, setClient] = useState<PrivateMessagingClient | null>(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const messagingClient = new PrivateMessagingClient({
      client: new StyxClient(getClusterConfig('mainnet-beta')),
      signer: wallet.keypair,
      onMessage: (msg) => setMessages(prev => [...prev, msg]),
    });
    
    messagingClient.connectRelay();
    setClient(messagingClient);
  }, [wallet]);

  const sendMessage = async (recipient: string, text: string) => {
    await client.sendMessage(new PublicKey(recipient), text);
  };

  return <ChatUI messages={messages} onSend={sendMessage} />;
}
```

### Wallet Integration for Messaging

For wallet developers:

```typescript
// 1. Check if user has published prekeys
const hasBundle = await indexer.hasPrekeyBundle(walletPubkey);

// 2. Show "Enable Encrypted Messaging" if not
if (!hasBundle) {
  showPrompt('Enable encrypted messaging?');
  // On confirm:
  await messagingClient.publishPrekeyBundle(generateBundle());
}

// 3. Display message inbox
const inbox = await indexer.getMessages(walletPubkey);
// Show notification badge for unread count

// 4. Parse messaging transactions in history
function parseMessagingTx(data: Buffer) {
  if (data[0] === 0x02) { // MESSAGING domain
    switch (data[1]) {
      case 0x01: return { type: 'MESSAGE_SENT', ... };
      case 0x03: return { type: 'MESSAGE_WITH_PAYMENT', ... };
      case 0x06: return { type: 'PREKEYS_PUBLISHED', ... };
    }
  }
}
```

---

## 🔌 React Integration

```tsx
import { useSPSTokens, useSPSNFTs, SPSProvider } from '@styxstack/sps-sdk/react';

function App() {
  return (
    <WalletProvider wallets={wallets}>
      <SPSProvider network="mainnet">
        <TokenList />
        <NFTGallery />
      </SPSProvider>
    </WalletProvider>
  );
}

function TokenList() {
  const { tokens, loading, refresh } = useSPSTokens();
  
  if (loading) return <Spinner />;
  
  return (
    <div>
      {tokens.map(token => (
        <div key={token.mint} className="token-row">
          <span className="badge ic-badge">IC</span>
          <span>{token.symbol}</span>
          <span>{formatTokenBalance(token.balance, token.decimals)}</span>
        </div>
      ))}
    </div>
  );
}

function NFTGallery() {
  const { nfts, loading } = useSPSNFTs();
  
  return (
    <div className="nft-grid">
      {nfts.map(nft => (
        <div key={nft.id} className="nft-card">
          <img src={nft.image} alt={nft.name} />
          <span className="badge inscription-badge">Inscription</span>
          <h3>{nft.name}</h3>
        </div>
      ))}
    </div>
  );
}
```

---

## 📱 Mobile Integration (React Native / Kotlin)

### React Native

```typescript
import { SPSKit } from '@styxstack/sps-sdk/react-native';

// Initialize
await SPSKit.initialize({
  network: 'mainnet',
  secureStorage: 'keychain',
});

// Get all assets (tokens + NFTs)
const assets = await SPSKit.getAssets(walletPubkey);

// Transfer
const signature = await SPSKit.transfer({
  type: 'token',  // or 'nft'
  id: assetId,
  amount: '1000000000',
  recipient: recipientPubkey,
});
```

### Kotlin (Android Native)

```kotlin
import com.styx.appkit.StyxPrivacyKit
import com.styx.appkit.tokens.ICTokenService

class WalletViewModel : ViewModel() {
    private val styxKit = StyxPrivacyKit.create(
        network = Network.MAINNET,
        rpcUrl = "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"
    )
    
    suspend fun getICTokens(wallet: String): List<ICToken> {
        return styxKit.tokens.getBalances(wallet)
    }
    
    suspend fun getInscriptionNFTs(wallet: String): List<InscriptionNFT> {
        return styxKit.nfts.getNFTs(wallet)
    }
    
    suspend fun transfer(
        mint: String,
        amount: Long,
        recipient: String
    ): TransactionResult {
        return styxKit.tokens.transfer(mint, amount, recipient)
    }
}
```

---

## ✅ Integration Checklist

### Quick Start (20 minutes)
- [ ] Add SPS program ID
- [ ] Detect SPS transactions
- [ ] Parse domain-based instructions
- [ ] Query indexer for balances
- [ ] Display IC token badge
- [ ] Display inscription NFT badge

### Full Integration (4 hours)
- [ ] Build transfer UI
- [ ] Auto-discover new tokens from logs
- [ ] Add to portfolio view
- [ ] Transaction history parsing
- [ ] NFT gallery view

### Advanced (1-2 days)
- [ ] Private balance tracking
- [ ] Stealth address support
- [ ] DeFi integration (swaps)
- [ ] Governance voting
- [ ] Encrypted messaging (prekey bundles)
- [ ] DAM materialize/dematerialize UI
- [ ] IC compress/decompress flows

---

## 🧪 Test on Devnet

```bash
# Install CLI
npm install -g @styxstack/cli

# Create test token
styx sts mint --name "Test Token" --symbol "TEST" --amount 1000000 --network devnet

# Check balance
styx balance --network devnet

# Transfer
styx sts send --mint <MINT_ID> --amount 100 --to <ADDRESS> --network devnet
```

---

## 📚 Resources

- **SDK Docs**: [SDK_REFERENCE.md](SDK_REFERENCE.md)
- **Indexer API**: [INDEXER_ARCHITECTURE.md](INDEXER_ARCHITECTURE.md)
- **Explorer**: https://explorer.styx.so
- **Discord**: @moonmanquark

---

## ❓ FAQ

### How is this different from Light Protocol?

SPS has an **IC domain (0x0F)** that works similarly to Light Protocol - Merkle trees, state trees, compress/decompress operations. The key differences:

| Feature | Light Protocol | SPS IC Domain |
|---------|----------------|---------------|
| ZK Proofs | Groth16 (~200k CU) | ZK-free Merkle (~50k CU) |
| Trusted Setup | Required | ❌ Not needed |
| Privacy | No | ✅ Optional |
| Rent Recovery | No | ✅ RECOMPRESS |

SPS also offers **Native STS** (pure inscriptions, no accounts) and **DAM** (Token-2022 Permanent Delegate for bidirectional materialization).

### What are the 3 token models?

1. **Native STS**: Inscription-only, zero accounts, zero rent ever
2. **IC (Compression)**: Light Protocol-style Merkle trees with privacy
3. **DAM (Materialize)**: Virtual tokens that materialize to real SPL on-demand

### How does encrypted messaging work?

SPS uses Signal Protocol-compatible encryption:
- **X3DH**: Asynchronous key exchange via prekey bundles
- **Double Ratchet**: Forward secrecy with ratcheting keys
- **XChaCha20-Poly1305**: Message encryption

Users publish prekey bundles on-chain, and senders can initiate encrypted sessions without both parties online.

### Do users need to run their own indexer?

No. The public indexer at `api.styx.so` handles balance and message queries. For maximum privacy, users can run a local indexer.

### Are IC tokens compatible with DeFi?

Yes. IC tokens can be:
- Swapped on SPS pools directly
- Decompressed to SPL for external DEXs
- Materialized via DAM for any SPL-compatible protocol
