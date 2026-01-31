# @styx/sts-standard

**STS Token Standard** - Solana's first privacy-native token standard.

## What is STS?

STS (Styx Token Standard) is a new token paradigm for Solana that makes privacy a first-class citizen. Like Token-22 or pNFTs, STS defines how tokens work - but with privacy built-in from the ground up.

## Key Features

### 🔐 Native Privacy
- **Commitments** - Hide owner and amount
- **Nullifiers** - Prevent double-spending
- **Stealth Addresses** - Private recipient discovery

### 🪙 Token Types
- **Fungible** - ERC-20 style tokens with privacy
- **Non-Fungible** - NFTs with hidden ownership
- **Semi-Fungible** - Edition-style tokens

### 🌉 SPL Compatibility
- **Shield** - Deposit SPL tokens into private pool
- **Unshield** - Withdraw back to public SPL
- **DEX Compatible** - Trade on Jupiter, Raydium via unshield

### 📋 Programmable Rules (like pNFTs)
- Time holds
- Velocity limits
- Allow/deny lists
- Transfer fees

### ✅ Compliance Ready
- **POI (Proof of Innocence)** - Provable chain-of-custody
- **Auditor Keys** - Selective disclosure to regulators
- **ChronoVault** - Time-delayed revelations

## Installation

```bash
npm install @styx/sts-standard
# or
pnpm add @styx/sts-standard
```

## Quick Start

```typescript
import { StsStandard } from '@styx/sts-standard';
import { Connection, Keypair } from '@solana/web3.js';

// Connect
const connection = new Connection('https://api.devnet.solana.com');
const sts = new StsStandard(connection);

// Create a privacy token
const { mintId } = await sts.createMint(wallet, {
  name: "Privacy Coin",
  symbol: "PRIV",
  decimals: 9,
  backing: { type: 'native' },
});

// Mint to a secret
const secret = generateSecret();
const { note } = await sts.mintTo(wallet, mintId, secret, 1000_000_000n);

// Transfer privately
const recipientSecret = generateSecret();
await sts.transfer(wallet, note, recipientSecret, 500_000_000n);
```

## Creating an SPL-Backed Token

Wrap existing SPL tokens for privacy:

```typescript
import { PublicKey } from '@solana/web3.js';

// Wrap USDC
const { mintId } = await sts.createMint(wallet, {
  name: "Private USDC",
  symbol: "pUSDC",
  decimals: 6,
  backing: {
    type: 'spl-backed',
    splMint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  },
});

// Shield USDC
const { note } = await sts.shield(wallet, mintId, usdcMint, 100_000_000n, secret);

// Later, unshield back to regular USDC
await sts.unshield(wallet, note, usdcMint, wallet.publicKey);
```

## Creating an NFT

```typescript
import { createNftInstruction, StsPrivacyMode } from '@styx/sts-standard';

const ix = createNftInstruction(
  creator.publicKey,
  "Private Artwork",
  "ART",
  "https://arweave.net/...",
  recipientCommitment,
  undefined, // no collection
  StsPrivacyMode.Optional,
);
```

## STS vs Other Standards

| Feature | Token-22 | pNFT | Light | **STS** |
|---------|----------|------|-------|---------|
| Privacy by default | ❌ | ❌ | ✅ | ✅ |
| Programmable rules | ✅ | ✅ | ❌ | ✅ |
| Zero rent | ❌ | ❌ | ✅ | ✅ |
| SPL bridge | N/A | N/A | ✅ | ✅ |
| Compliance ready | ❌ | ❌ | ❌ | ✅ |
| NFT support | ✅ | ✅ | ❌ | ✅ |

## Architecture

STS uses an inscription-based model:
- **StsMint** - Token definition (logged, not stored)
- **StsNote** - Token balance (commitment-based)
- **StsRuleSet** - Transfer rules (logged)
- **Nullifiers** - Double-spend prevention (PDAs)

## License

Apache 2.0
