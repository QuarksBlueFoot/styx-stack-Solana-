# Styx Token Standard (STS)

<div align="center">

![STS Logo](https://img.shields.io/badge/STS-Styx%20Token%20Standard-8B5CF6?style=for-the-badge&logo=solana&logoColor=white)
[![Solana](https://img.shields.io/badge/Solana-Mainnet-14F195?style=flat-square&logo=solana)](https://solana.com)
[![License](https://img.shields.io/badge/License-BSL%201.1-blue?style=flat-square)](LICENSE)
[![npm](https://img.shields.io/npm/v/@styxstack/sts-sdk?style=flat-square&logo=npm)](https://www.npmjs.com/package/@styxstack/sts-sdk)
[![CLI](https://img.shields.io/badge/CLI-styx-orange?style=flat-square)](cli/styx)

**The Next-Generation Token Standard for Solana**

*Event-sourced. Zero rent. Native privacy. Full composability.*

[Why STS?](#-why-a-new-token-standard) • [CLI](#-styx-cli) • [SDK](#-sdk) • [Documentation](#-documentation)

</div>

---

## 🎯 Why a New Token Standard?

**Token-22 was a step forward. STS takes a different approach.**

| Metric | Token-22 | STS | Notes |
|--------|----------|-----|-------|
| **Protocol fee** | 0 SOL | 0-0.001 SOL | STS has optional protocol fee |
| **Basic transfer cost** | ~0.000005 SOL | ~0.000005 SOL | Same Solana tx fee |
| **Privacy model** | CT (amounts only) | Full (sender, receiver, amount) | Different approach |
| **Rent per holder** | ~0.002 SOL | 0 SOL | STS uses inscriptions |
| **State storage** | Per-holder accounts | Transaction logs | Requires indexer |
| **Extension model** | Per-mint (global) | Per-note (composable) | More flexible |
| **Trust model** | On-chain accounts | Indexer or nullifier PDAs | User chooses |
| **Privacy** | Optional | Default | STS encrypts by default |
| **Instruction count** | ~30 | **200+** | More operations available |

**Important:** STS uses an inscription-based model where balances are logged on-chain and reconstructed by indexers. This is different from Token-22's account-based state. For trustless verification, use Level 1 (nullifier PDAs) or Level 2 (Merkle proofs).

### Same UX, Better Privacy

**STS works similarly to Token-22 from a user perspective, but with privacy by default:**

```bash
# Token-22 transfer:
spl-token transfer <MINT> 100 <RECIPIENT_ADDRESS>

# STS transfer:
styx sts send -t <RECIPIENT_ADDRESS> -a 100
```

**How it works under the hood:**
- Token balances are encrypted notes logged in transaction data
- Only the owner (with viewing key) can see their balance
- Transfers publish nullifiers to prevent double-spending
- An indexer reconstructs state from on-chain logs

### The Core Innovation: Inscription-Based Tokens

```
Traditional Token-22:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Mint Account    │    │ Token Account A │    │ Token Account B │
│ (rent: 0.003)   │    │ (rent: 0.002)   │    │ (rent: 0.002)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
↑ State stored in accounts = rent forever

STS (Styx Token Standard):
┌─────────────────────────────────────────────────────────────────┐
│                    Transaction Logs (Permanent)                  │
│  [MINT] → [TRANSFER] → [TRANSFER] → [SPLIT] → [MERGE] → ...    │
└─────────────────────────────────────────────────────────────────┘
↑ Balances inscribed as encrypted notes = zero rent

Note Model (UTXO-style):
┌─────────────────────────────────────────────────────────────────┐
│  Commitment: 0x3f8a...     │  Amount: [encrypted]              │
│  Nullifier:  abc123...     │  Owner: [stealth address]         │
└─────────────────────────────────────────────────────────────────┘
↑ Spent notes publish nullifiers, new notes created on transfer
```

**Key difference:** Token-22 stores balances in accounts you can read directly. STS encrypts balances in transaction logs that require a viewing key to decrypt.

---

## 🏆 What Makes STS Different

### ✅ Complete Token-22 Parity
Every Token-22 feature, fully implemented:
- ✅ Transfer fees (per-note, more composable)
- ✅ Interest accrual
- ✅ Transfer hooks (CPI to custom programs)
- ✅ Confidential transfers (encrypted amounts)
- ✅ Permanent delegate
- ✅ Non-transferable (soulbound)
- ✅ Required memo
- ✅ Freeze/thaw authority
- ✅ Group/member extensions
- ✅ CPI guard
- ✅ Metadata pointer
- ✅ Default account state

### 🚀 Beyond Token-22 (Unique to STS)

| Feature | Description | Tag(s) |
|---------|-------------|--------|
| **Stealth Addresses** | One-time addresses for payment privacy | 87, 130 |
| **Chrono Vaults** | Time-locked reveals (sealed bids, launches) | 48-49 |
| **Phantom NFTs** | Prove ownership without revealing which | 52-53 |
| **Decoy Storm** | Plausible deniability - "maybe I sent" | 44-45 |
| **Ephemeral Accounts** | One-time PDAs that break graph analysis | 46-47 |
| **Shadow Graph** | Private social layer on-chain | 50-51 |
| **Proof of Innocence** | Compliance-first privacy | 54-64 |
| **Privacy Vouchers (PPV)** | DeFi composability with privacy | 122-127 |
| **Selective Disclosure** | Reveal only specific fields to auditors | 157 |
| **Cross-Mint Atomic** | Atomic swaps across different token mints | 161 |
| **Social Recovery** | Guardian-based recovery (like Safe) | 162 |

### 📈 AMM & DEX Integration (Critical for Adoption)
Full DEX support for STS tokens:

| Operation | Description | Tag |
|-----------|-------------|-----|
| Pool Creation | Create liquidity pools | 176 |
| Add Liquidity | Provide liquidity, get LP notes | 177 |
| Remove Liquidity | Burn LP notes, get tokens | 178 |
| Swap | Token swaps through pools | 179 |
| Router | Multi-hop Jupiter-style routing | 184 |
| Limit Orders | Place/fill/cancel limit orders | 186-188 |
| TWAP | Time-weighted average price orders | 189-190 |
| Concentrated LP | Uniswap v3-style positions | 191 |

### 🎨 NFT Marketplace (Full Trading Stack)

| Operation | Description | Tag |
|-----------|-------------|-----|
| List | Fixed price listing | 112 |
| Buy | Atomic purchase | 114 |
| Offer | Make offers on NFTs | 115 |
| Auction | English/Dutch/Sealed auctions | 118-121 |
| Royalties | Enforced creator royalties | 109 |

---

## 📊 Real-World Comparison

### Cost Analysis (10,000 Token Holders)

```
Token-22:
├── Mint account:           0.003 SOL
├── Token accounts (10k):  20.000 SOL  (0.002 × 10,000)
├── Metadata:               0.010 SOL
└── Total:                 20.013 SOL + ongoing rent

STS:
├── Mint inscription:       0.001 SOL  (one tx)
├── Holder notes (10k):     0.000 SOL  (no accounts!)
├── Metadata:               0.001 SOL  (inscribed)
└── Total:                  0.002 SOL  (99.99% cheaper, no rent)
```

### Validator Impact

```
1M token holders:
├── Token-22: ~2.0 GB RAM (account storage)
├── STS:      ~0.6 GB RAM (log scanning + nullifier PDAs)
└── Savings:  70% reduced validator burden
```

### Security Model

```
Token-22 Freeze:
└── Single authority → compromise = total freeze

STS Freeze:
├── 7-of-9 multi-sig requirement
├── 24-hour timelock before enforcement
├── DAO veto period
└── Auditor notification hooks
```

---

## 💻 Styx CLI

The `styx` CLI provides complete access to STS functionality:

```bash
# Install globally
npm install -g @styxstack/cli

# Or run directly
npx @styxstack/cli
```

### Core Commands

```bash
styx sts mint              # Mint new tokens
styx sts transfer          # Transfer tokens
styx sts balance           # Check balance
styx sts wrap              # Wrap SPL → STS
styx sts unwrap            # Unwrap STS → SPL

styx sts nft:mint          # Mint NFT
styx sts nft:list          # List for sale
styx sts nft:buy           # Purchase NFT

styx sts prove:balance     # Prove balance threshold
styx sts prove:ownership   # Prove token ownership
```

### DEX & Trading

```bash
styx amm pools             # List liquidity pools
styx amm quote             # Get swap quote
styx amm swap              # Execute swap
styx amm add-liquidity     # Add liquidity
styx amm remove-liquidity  # Remove liquidity
```

### NFT Trading (NEW!)

Easy NFT trading with Magic Eden / Tensor UX:

```bash
styx nft list              # List NFT for sale
styx nft buy               # Buy NFT instantly  
styx nft sell              # Quick sell to highest bid
styx nft bid               # Place collection/trait bid
styx nft transfer          # Transfer to wallet
styx nft portfolio         # View your NFTs
```

### Token Operations (NEW!)

Full Token-22 parity:

```bash
styx token create          # Create new token
styx token mint            # Mint to address
styx token burn            # Burn tokens
styx token freeze/thaw     # Freeze/thaw accounts
styx token delegate        # Delegate authority
styx token authorize       # Set mint/freeze authority
styx token swap            # Quick swap via Jupiter
```

### Solana Mobile (NEW!)

Mobile-first commands:

```bash
styx mobile connect        # MWA connection guide
styx mobile outbox         # Offline tx queue
styx mobile qr             # Generate receive QR
```

### Privacy Features

```bash
styx stealth generate      # Generate stealth meta-address
styx stealth send          # Send to stealth address
styx stealth scan          # Scan for incoming payments

styx stream create         # Create payment stream
styx stream claim          # Claim from stream

styx recovery setup        # Configure guardians
styx recovery initiate     # Start recovery

styx gov create-proposal   # Create governance proposal
styx gov vote              # Cast private vote
styx gov reveal            # Reveal vote (optional)
```

### Comparison & Analytics

```bash
styx compare cost          # Compare costs vs Token-22
styx compare validators    # Validator burden comparison
styx compare security      # Security model comparison
styx compare features      # Feature comparison
styx compare summary       # Full summary
```

### Web Console

```bash
styx console               # Launch web interface at localhost:4242
```

Interactive dashboard with:
- Token operations UI
- Transaction builder
- Stealth address scanner
- Privacy set manager
- Real-time network stats

---

## 📦 SDK

### Installation

```bash
npm install @styxstack/sts-sdk
# or
pnpm add @styxstack/sts-sdk
```

### Quick Start

```typescript
import { STS, STYX_PROGRAM_ID } from '@styxstack/sts-sdk';
import { Connection, Keypair } from '@solana/web3.js';

const connection = new Connection('https://api.mainnet-beta.solana.com');
const sts = new STS(connection);

// Mint tokens (inscribed, zero rent)
const mintTx = await sts.mint({
  authority: payer,
  recipient: recipientPubkey,
  amount: 1_000_000n,
  decimals: 6,
  metadata: { name: 'My Token', symbol: 'MYT' }
});

// Transfer with privacy
const transferTx = await sts.transfer({
  from: sender,
  toHash: recipientHash, // Stealth address hash
  amount: 100_000n,
  encryptedMemo: await sts.encrypt('Payment for services')
});

// Prove balance without revealing amount
const proof = await sts.proveBalance({
  noteCommitment,
  threshold: 1_000_000n, // Proves balance >= 1M
  auditorKey: auditorPubkey
});
```

### Token-22 Drop-in Replacement

```typescript
// Token-22 (old way)
import { createTransferInstruction } from '@solana/spl-token';
const ix = createTransferInstruction(source, dest, owner, amount);

// STS (new way - same pattern, better features)
import { buildNoteTransferInstruction } from '@styxstack/sts-sdk';
const ix = buildNoteTransferInstruction({
  noteCommitment,
  newOwnerHash,
  amount,
  extensions: { transferFee: 100 } // per-note fee!
});
```

### Mobile Integration (Solana Mobile Standard)

Full MWA 2.0 compliance for React Native:

```typescript
import { STS } from '@styxstack/sts-sdk';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol';

await transact(async (wallet) => {
  const tx = await sts.buildTransfer({
    amount: 100_000n,
    toHash: recipientHash
  });
  
  const signed = await wallet.signTransactions([tx]);
  await connection.sendRawTransaction(signed[0].serialize());
});
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            YOUR APPLICATION                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│   @styxstack/cli       │    @styxstack/sts-sdk    │    @styx/rn-kit        │
│   (Terminal + Web)     │    (Core SDK)            │    (React Native)       │
├─────────────────────────────────────────────────────────────────────────────┤
│   @styx/mobile-toolkit │ @styx/secure-storage │ @styx/solana-mobile-dropin │
├─────────────────────────────────────────────────────────────────────────────┤
│   @styx/crypto-core    │    @styx/policy-kit    │  @styx/privacy-diagnostics│
├─────────────────────────────────────────────────────────────────────────────┤
│                         SOLANA NETWORK (Mainnet)                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Styx Token Standard: GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9      ││
│  │ WhisperDrop:         dropgR8h8axS4FrQ7En1YRnevHcUmkGoNLBrJaLMPsf       ││
│  │ Treasury:            13xnC9kDksJMBE9FYVW1S7dukLjRDgrh4Dzm6eq5moon       ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Event-Sourcing Flow

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Client SDK     │───▶│   STS Program    │───▶│ Transaction Logs │
│  (Build + Sign)  │    │   (Validate)     │    │ (Permanent State)│
└──────────────────┘    └──────────────────┘    └──────────────────┘
                                                        │
         ┌──────────────────────────────────────────────┤
         ▼                         ▼                    ▼
┌──────────────────┐    ┌──────────────────┐   ┌──────────────────┐
│  State Indexer   │    │  Nullifier PDAs  │   │  Merkle Proofs   │
│ (Reconstruct)    │    │ (Double-spend)   │   │ (Verification)   │
└──────────────────┘    └──────────────────┘   └──────────────────┘
```

---

## 🔐 Trust Levels (User Choice)

STS provides three levels of trust for users to choose based on their needs:

| Level | Cost | Trust Model | Use Case |
|-------|------|-------------|----------|
| **0** | Free | Indexer consensus | Normal usage, high volume |
| **1** | 0.00089 SOL | Nullifier PDAs | High-value transfers |
| **2** | Varies | Full Merkle proofs | Maximum trustlessness |

---

## 📱 Solana Mobile Standard Compliance

STS is built to Solana Mobile standards:

- ✅ **MWA 2.0** - Full Mobile Wallet Adapter support
- ✅ **Wallet Standard** - Compatible with all major wallets
- ✅ **Offline Support** - Transaction queue for unreliable networks
- ✅ **Secure Storage** - Biometric-protected key storage
- ✅ **Light Crypto** - No heavy ZK proofs on device
- ✅ **React Native** - First-class RN component library

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | Deep dive into event-sourcing and VSL |
| [Privacy Rails](docs/RAILS.md) | Understanding privacy rail selection |
| [Envelope Format](docs/STYX_ENVELOPE_V1.md) | Wire format specification |
| [Compliance](docs/COMPLIANCE.md) | Audit and disclosure features |
| [Mobile Integration](docs/STYX_ARTEMIS_DROPIN.md) | Kotlin/Android integration |

---

## 🆚 Understanding the Tradeoffs

| Aspect | Token-22 | STS |
|--------|----------|-----|
| **State location** | On-chain accounts | Transaction logs + indexer |
| **Trust model** | Trustless (read state directly) | Trust indexer OR use nullifier PDAs |
| **Privacy** | Optional confidential amounts | Full privacy by default |
| **Rent** | Pay per account | Zero (logs are free) |
| **Wallet support** | Native everywhere | Requires SPS-aware wallet/adapter |

### When to use STS
- You need privacy for amounts AND recipients
- You want zero rent costs at scale
- You're building a privacy-focused application

### When to use Token-22
- You need immediate trustless verification
- You want native wallet support everywhere
- Privacy is optional or not needed

### Can I Migrate?

Yes! STS provides seamless Token-22 wrapping:

```typescript
// Wrap existing Token-22 into STS
await sts.wrap({
  sourceTokenAccount,
  amount: 1_000_000n
});

// Unwrap STS back to Token-22
await sts.unwrap({
  noteCommitment,
  destinationTokenAccount
});
```

---

## 🛠️ Development

```bash
# Clone and install
git clone https://github.com/QuarksBlueFoot/StyxStack.git
cd StyxStack
pnpm install

# Build all packages
pnpm build

# Build and run CLI
cd cli/styx && pnpm build
node dist/index.js --help

# Launch web console
node dist/index.js console
```

---

## 💝 Support Development

STS is developed by Bluefoot Labs. Support continued innovation:

**Treasury:** `13xnC9kDksJMBE9FYVW1S7dukLjRDgrh4Dzm6eq5moon`

Your support enables:
- 🔧 Ongoing maintenance and improvements
- 🔐 Professional security audits
- 📚 Better documentation
- 🚀 New privacy primitives
- 🌍 Ecosystem grants

---

## 📄 License

**BSL 1.1** - Free for projects with <100k MAU. Converts to Apache-2.0 on 2030-01-26.

For commercial licensing: licensing@bluefoot.tech

---

<div align="center">

**Styx Token Standard** — *The future of tokens on Solana*

Built with ❤️ by [@moonmanquark](https://twitter.com/moonmanquark) (Bluefoot Labs)

[GitHub](https://github.com/QuarksBlueFoot/StyxStack) • [npm](https://www.npmjs.com/package/@styxstack/sts-sdk) • [CLI](https://www.npmjs.com/package/@styxstack/cli) • [Docs](docs/ARCHITECTURE.md)

</div>
