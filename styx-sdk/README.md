# @styx-stack/sdk

**The Complete Privacy SDK for Solana** - Build private apps in minutes, not months.

[![npm version](https://badge.fury.io/js/%40styx-stack%2Fsdk.svg)](https://www.npmjs.com/package/@styx-stack/sdk)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

## 🎯 What's Included

| Module | Description | Requires Program? |
|--------|-------------|-------------------|
| **Resolv** | No-wallet payments, gasless, text/email | ❌ No |
| **Private Lending** | P2P NFT loans with hidden terms | ❌ No |
| **Inscriptions** | Lamport inscription tokens | ❌ No |
| **SPS Token Standard** | Privacy tokens, NFTs, 260+ operations | ✅ Yes |
| **Messaging** | E2E encrypted messaging, groups | ✅ Yes |
| **WhisperDrop** | Private airdrops, token gates | ✅ Yes |
| **Privacy Utils** | Stealth addresses, encryption | ❌ No |

## 🚀 Quick Start

```bash
npm install @styx-stack/sdk
```

### Standalone Mode (No Custom Programs!)

Perfect for quick integration - works on ANY Solana cluster:

```typescript
import { Resolv, LendingStandalone, LAMPORTS_PER_SOL } from '@styx-stack/sdk';
import { Connection, Keypair } from '@solana/web3.js';

const connection = new Connection('https://api.mainnet-beta.solana.com');

// === RESOLV PAYMENTS ===
const resolv = new Resolv(connection);
const { payment, link } = await resolv.createPayment({
  sender,
  amount: BigInt(0.1 * LAMPORTS_PER_SOL),
});
// Share link.url via SMS/email - recipient claims without wallet!

// === PRIVATE NFT LENDING (Sharky/Banx Parity) ===
const lending = new LendingStandalone({ connection });
const offer = await lending.createOffer({
  lender,
  collection: madLadsCollection,
  amount: BigInt(100 * LAMPORTS_PER_SOL),
  interestBps: 3500, // 35% APR
  privacyLevel: PrivacyLevel.EncryptedTerms,
});
// Share offer link - borrower accepts with their NFT
```

### Full Styx Mode (With Program)

For full privacy features using the Styx Program:

```typescript
import { StyxClient, createStyxClient } from '@styx-stack/sdk';

const styx = createStyxClient('https://api.mainnet-beta.solana.com');

// Private messaging
const sharedSecret = styx.messaging.deriveSharedSecret(myPrivKey, theirPubKey);
await styx.messaging.sendPrivateMessage(sender, recipient, "Hello!", sharedSecret);

// SPS Tokens (200+ operations)
await styx.sps.createMint({ name: 'MyToken', symbol: 'MTK', decimals: 9 });

// Private airdrops
await styx.whisperdrop.createCampaign({ merkleRoot, expiryUnix });
```

## 📦 Installation Options

```bash
# Full SDK
npm install @styx-stack/sdk

# Or individual modules
npm install @styx-stack/sps-sdk
npm install @styx-stack/whisperdrop-sdk
npm install @styx-stack/sts-sdk
```

## 🔧 Modules

### EasyPay Standalone

**No wallet required, gasless, text/email payments!**

```typescript
import { EasyPayStandalone, quickSendStandalone } from '@styx-stack/sdk';

// Full client
const easypay = new EasyPayStandalone(connection);
const { payment, link } = await easypay.createPayment({
  sender,
  amount: BigInt(0.5 * LAMPORTS_PER_SOL),
  memo: "Thanks for dinner! 🍕",
});

// Generate ready-to-send messages
const sms = easypay.generateSmsMessage(link, 'Alice');
const email = easypay.generateEmailMessage(link, 'Alice', '0.5 SOL');

// Quick one-liner
const link = await quickSendStandalone(connection, sender, amount);
```

**How it works:**
1. Sender creates payment → funds go to escrow keypair
2. Sender shares link via SMS/email/QR
3. Recipient clicks link → stealth wallet created
4. Funds released gaslessly via relayer

### SPS Token Standard

**200+ operations, Token-22 parity + privacy**

```typescript
import { SpsClient, DAMClient, PrivateSwapClient } from '@styx-stack/sdk';

const sps = new SpsClient({ connection });

// Create privacy token
await sps.createMint({
  name: 'Privacy Token',
  symbol: 'PRIV',
  decimals: 9,
});

// Mint to commitment (private balance)
await sps.mintTo({
  mint,
  amount: 1_000_000n,
  commitment: generateCommitment(recipientKey),
});

// DAM - Deferred Account Materialization
const dam = new DAMClient(connection);
await dam.initPool({ mint, poolAuthority });

// Private Swaps
const swap = new PrivateSwapClient(connection);
await swap.privateSwap({ fromMint, toMint, amount });
```

### Messaging

**E2E encrypted, onion routed**

```typescript
import { StyxMessaging, generateX25519Keypair } from '@styx-stack/sdk';

const messaging = new StyxMessaging(connection);

// Generate key exchange keys
const myKeys = generateX25519Keypair();
const sharedSecret = messaging.deriveSharedSecret(myKeys.privateKey, theirPubKey);

// Send encrypted message
await messaging.sendPrivateMessage(sender, recipient, "Secret message", sharedSecret);

// Onion routed (multi-hop)
await messaging.sendRoutedMessage(sender, recipient, [hop1, hop2], message, secret);
```

### WhisperDrop

**Private airdrops with token gates**

```typescript
import { WhisperDropClient, buildMerkleTree, GateType } from '@styx-stack/sdk';

const whisperdrop = new WhisperDropClient(connection);

// Build merkle tree for recipients
const allocations = [
  { recipient: pubkey1, amount: 1000n, nonce: randomBytes(16) },
  { recipient: pubkey2, amount: 2000n, nonce: randomBytes(16) },
];
const tree = buildMerkleTree(campaignId, allocations);

// Create campaign with NFT gate
await whisperdrop.createCampaign({
  campaignId,
  merkleRoot: tree.root,
  expiryUnix: BigInt(Date.now() + 7 * 24 * 60 * 60 * 1000),
  gateType: GateType.NftCollection,
  gateMint: collectionMint,
});
```

### Privacy Utils

**Stealth addresses, encryption, commitments**

```typescript
import {
  generateStealthKeys,
  generateStealthAddress,
  scanStealthPayments,
  encryptPayload,
  decryptPayload,
  generateCommitment,
  generateNullifier,
} from '@styx-stack/sdk';

// Generate stealth keys
const keys = generateStealthKeys();
console.log('Share this:', keys.metaAddress);

// Sender creates one-time address
const { stealthAddress, ephemeralPubkey, viewTag } = generateStealthAddress(metaAddress);

// Recipient scans for payments
const payments = scanStealthPayments(
  viewingKey,
  announcements,
  spendingPubkey
);

// Commitment schemes
const commitment = generateCommitment(1000n);
const nullifier = generateNullifier(commitment.value, spendingKey);
```

### Inscriptions

**Unique on-chain tokens backed by lamports**

```typescript
import { StyxInscriptions, InscriptionMode, quickInscribe } from '@styx-stack/sdk';

const inscriptions = new StyxInscriptions(connection);

// Create standard inscription (~0.001 SOL, permanent)
const { inscription, signature } = await inscriptions.createInscription({
  creator,
  content: 'Hello, I am inscription #1!',
  mode: InscriptionMode.Standard,
});

// Create ephemeral inscription (1 lamport, ~2 year lifespan)
const ephemeral = await inscriptions.createInscription({
  creator,
  content: 'This will fade away...',
  mode: InscriptionMode.Ephemeral,
});

// Quick helper
const result = await quickInscribe(connection, creator, 'My inscription!');

// Transfer inscription
await inscriptions.transferInscription({
  inscription: inscription.address,
  owner: creator,
  newOwner: recipientPubkey,
});
```

## 🌐 Program IDs

| Program | Mainnet | Devnet |
|---------|---------|--------|
| **Styx PMP** | `GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9` | `FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW` |
| **WhisperDrop** | `GhstFNnEbixAGQgLnWg1nWetJQgGfSUMhnxdBA6hWu5e` | `BPM5VuX9YrG7CgueWGxtqQZBQwMTacc315ppWCtTCJ5q` |

## 📊 Comparison

| Feature | Venmo | Solana Pay | Lightning | **Styx SDK** |
|---------|-------|------------|-----------|--------------|
| No wallet needed | ✅ | ❌ | ❌ | ✅ |
| Text/Email pay | ✅ | ❌ | ⚠️ | ✅ |
| Private amounts | ❌ | ❌ | ✅ | ✅ |
| On-chain | ❌ | ✅ | ❌ (L2) | ✅ |
| Non-custodial | ❌ | ✅ | ✅ | ✅ |
| Gasless claims | ✅ | ❌ | ✅ | ✅ |
| Stealth addresses | ❌ | ❌ | ❌ | ✅ |
| Token privacy | ❌ | ❌ | ❌ | ✅ |
| NFT support | ❌ | ⚠️ | ❌ | ✅ |

## 📚 Documentation

- [Full Documentation](https://styxprivacy.app/docs)
- [API Reference](https://styxprivacy.app/docs/api)
- [Tutorials](https://styxprivacy.app/docs/tutorials)
- [Examples](https://github.com/QuarksBlueFoot/StyxStack/tree/main/examples)

## 🔐 Security

- All encryption uses audited libraries (@noble/*)
- No centralized key custody
- Open source and verifiable
- [Security Policy](https://github.com/QuarksBlueFoot/StyxStack/security)

## 📄 License

Apache-2.0 - See [LICENSE](LICENSE) for details.

---

Built with 💜 by [Bluefoot Labs](https://styxprivacy.app) • [@moonmanquark](https://twitter.com/moonmanquark)
