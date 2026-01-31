# Styx Stack

**The Mobile-First Privacy Toolkit for Solana**

Styx is a comprehensive, production-ready privacy SDK for Solana developers building mobile apps, dApps, and any application requiring private transactions, messaging, and data handling.

> **🎉 NEW**: Styx Private Memo Program now deployed on devnet! [View on Explorer](https://explorer.solana.com/address/Fke7EgU2SrZ3tx6yaUv2kdq45pdwYpVjbxjfRipkPjSE?cluster=devnet) | [Test Results](programs/styx-private-memo-program/TEST_RESULTS.md)

## Features

### 🔐 Private Payments
- **Confidential Transfers** - Token-2022 CT integration with automatic fallback
- **Stealth Addresses** - One-time addresses for payment privacy
- **Amount Hiding** - ElGamal encryption for transfer amounts

### 💬 Private Messaging
- **End-to-End Encrypted Messaging** - X25519 + XSalsa20-Poly1305
- **Multi-Rail Support** - Memo program, Private Memo Program, ephemeral rollups
- **Chunked Messages** - Large message support with automatic reassembly

### 📱 Mobile-First Design
- **React Native Kit** - Drop-in components for RN apps
- **Mobile Wallet Adapter** - Full MWA integration
- **Offline Queue** - Outbox for unreliable networks
- **Secure Storage** - Biometric-protected key storage

### 🛡️ Privacy Rails
- **Automatic Rail Selection** - Best privacy option based on context
- **Graceful Degradation** - Fallback when features are gated
- **ZK Compression** - Light Protocol integration for compressed accounts

### ✅ Compliance Ready
- **Selective Disclosure** - Reveal specific fields to auditors
- **Policy Hooks** - Configurable compliance rules
- **Audit Keys** - Optional third-party visibility

## Quick Start

```bash
# Install dependencies
pnpm install

# Run doctor to check environment
pnpm styx doctor

# Initialize Styx in your project
pnpm styx init
```

## Packages

| Package | Description |
|---------|-------------|
| `@styx/crypto-core` | Core cryptographic primitives |
| `@styx/memo` | Private memo formats (PMF1, PMP) |
| `@styx/onchain-messaging` | Encrypted on-chain messaging |
| `@styx/tx-tooling` | Transaction privacy utilities |
| `@styx/confidential-tokens` | Token-2022 CT integration |
| `@styx/key-registry` | On-chain X25519 key registry |
| `@styx/secure-storage` | Mobile secure storage |
| `@styx/mobile-outbox` | Offline transaction queue |
| `@styx/mobile-toolkit` | Mobile utilities (retry, connectivity) |
| `@styx/solana-mobile-dropin` | MWA integration helpers |
| `@styx/rn-kit` | React Native components |
| `@styx/privacy-diagnostics` | Privacy analysis tools |
| `@styx/policy-kit` | Compliance policy engine |
| `@styx/presets` | Opinionated defaults |
| `@styx/styx-context` | App wiring harness |
| `@styx/zk-compression-adapter` | Light Protocol adapter |
| `@styx/ephemeral-rollup` | MagicBlock rollup helpers |
| `@styx/game-privacy` | Private game sessions |

## Example: Private Message

```typescript
import { createStyxContext } from '@styx/styx-context';
import { Connection, PublicKey } from '@solana/web3.js';

const ctx = createStyxContext({
  connection: new Connection('https://api.mainnet-beta.solana.com'),
  owner: myWallet.publicKey,
});

// Build a private message
const plan = await ctx.buildMessage({
  to: recipientPubkey,
  plaintext: 'Hello, privately!',
});

// plan.instructions contains ready-to-sign instructions
```

## Example: Mobile Integration

```typescript
import { StyxPrivacyKit } from '@styx/rn-kit';
import { mwaSendTransactions } from '@styx/solana-mobile-dropin';

// Initialize privacy kit
const privacyKit = new StyxPrivacyKit({
  connection,
  domain: 'myapp.com',
});

// Register encryption keys
await privacyKit.ensureKeyRegistered(wallet, secureStorage);

// Build and send private memo
const { tx } = await privacyKit.buildPrivateMemoTx({
  senderWallet: wallet.publicKey,
  recipientWallet: recipient,
  plaintext: 'Secret message',
});

await mwaSendTransactions({
  sender: wallet,
  connection,
  transactions: [tx],
});
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Application                            │
├─────────────────────────────────────────────────────────────┤
│  @styx/styx-context  │  @styx/rn-kit  │  @styx/presets      │
├─────────────────────────────────────────────────────────────┤
│  @styx/onchain-messaging  │  @styx/tx-tooling               │
├─────────────────────────────────────────────────────────────┤
│  @styx/memo  │  @styx/confidential-tokens  │  @styx/key-reg │
├─────────────────────────────────────────────────────────────┤
│  @styx/crypto-core  │  @styx/secure-storage                 │
├─────────────────────────────────────────────────────────────┤
│                    Solana Network                            │
└─────────────────────────────────────────────────────────────┘
```

## Documentation

- [Privacy Rails](docs/RAILS.md) - Understanding privacy rail selection
- [Envelope Format](docs/STYX_ENVELOPE_V1.md) - Wire format specification
- [Compliance](docs/COMPLIANCE.md) - Audit and disclosure features
- [Mobile Integration](docs/STYX_ARTEMIS_DROPIN.md) - Kotlin/Android integration

## Development

```bash
# Build all packages
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint
```

## Why Styx?

| Capability | Other SDKs | Styx |
|------------|------------|------|
| Mobile SDK | ❌ | ✅ |
| React Native | ❌ | ✅ |
| MWA Integration | ❌ | ✅ |
| Offline Support | ❌ | ✅ |
| Privacy Presets | ❌ | ✅ |
| Multi-Rail | ❌ | ✅ |
| Compliance Hooks | ❌ | ✅ |

## License

Apache 2.0

## WhisperDrop

See `docs/whisperdrop/README.md` and `packages/whisperdrop-kit` for Step 3a protocol tooling.
