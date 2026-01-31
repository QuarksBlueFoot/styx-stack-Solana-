# @styx-stack/whisperdrop-sdk

TypeScript SDK for **WhisperDrop** - Privacy-Preserving Airdrops on Solana.

[![npm version](https://badge.fury.io/js/@styx-stack%2Fwhisperdrop-sdk.svg)](https://www.npmjs.com/package/@styx-stack/whisperdrop-sdk)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Features

- 🔒 **Privacy-Preserving** - Recipient lists never published on-chain
- 🌳 **Merkle Proofs** - Efficient verification for 1M+ recipients
- 🎫 **Token Gating** - SPL, Token-2022, NFT, and cNFT support
- ⏰ **Time-Locked** - Automatic expiry with reclaim
- ⚡ **Ultra-Efficient** - ~5K compute units per claim

## Installation

```bash
npm install @styx-stack/whisperdrop-sdk @solana/web3.js
```

## Quick Start

```typescript
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { 
    WhisperDrop, 
    buildMerkleTree, 
    generateCampaignId, 
    generateNonce,
    GateType 
} from '@styx-stack/whisperdrop-sdk';

const connection = new Connection('https://api.mainnet-beta.solana.com');
const whisperdrop = new WhisperDrop(connection);

// 1. Create allocations
const allocations = [
    { recipient: new PublicKey('...'), amount: 1000n, nonce: generateNonce() },
    { recipient: new PublicKey('...'), amount: 2000n, nonce: generateNonce() },
    // ... up to 1M+ recipients
];

// 2. Build Merkle tree
const campaignId = generateCampaignId();
const { root, proofs } = buildMerkleTree(campaignId, allocations);

// 3. Initialize campaign with Token-2022 gating
const { campaignPDA, escrowPDA } = await whisperdrop.initCampaign(
    authority,
    tokenMint,
    {
        campaignId,
        merkleRoot: root,
        expiryUnix: BigInt(Date.now() / 1000 + 86400 * 30), // 30 days
        gateType: GateType.Token22Holder,
        gateMint: membershipToken, // Require Token-2022 token to claim
    }
);

// 4. Recipients claim with proof
const proof = proofs.get(recipient.publicKey.toBase58())!;
await whisperdrop.claim(
    payer,
    recipient,
    campaignPDA,
    allocation,
    proof,
    recipientATA,
    gateTokenAccount // Token-2022 token account
);
```

## Token Gating

WhisperDrop supports selective claiming based on multiple token standards:

### SPL Token (Original Token Program)

```typescript
// Require any amount of SPL token
{ gateType: GateType.SplTokenHolder, gateMint: tokenMint }

// Require minimum balance
{ gateType: GateType.SplMinBalance, gateMint: tokenMint, gateAmount: 1000_000_000n }
```

### Token-2022 (Token Extensions)

```typescript
// Require any amount of Token-2022 token
{ gateType: GateType.Token22Holder, gateMint: token22Mint }

// Require minimum balance
{ gateType: GateType.Token22MinBalance, gateMint: token22Mint, gateAmount: 500_000_000n }
```

### NFT (Metaplex Standard)

```typescript
// Require specific NFT
{ gateType: GateType.NftHolder, gateMint: nftMint }

// Require NFT from collection
{ gateType: GateType.NftCollection, gateMint: collectionMint }
```

### cNFT (Compressed NFT via Bubblegum)

```typescript
// Require specific cNFT (asset ID as mint)
{ gateType: GateType.CnftHolder, gateMint: assetId }

// Require cNFT from collection
{ gateType: GateType.CnftCollection, gateMint: collectionId }
```

### GateType.NftCollection
Must hold an NFT from a specific collection (future: Metaplex verification).

## API Reference

### WhisperDrop Class

```typescript
const wd = new WhisperDrop(connection, programId?);
```

#### `initCampaign(authority, mint, config)`
Initialize a new airdrop campaign.

#### `claim(payer, recipient, campaignPDA, allocation, proof, recipientATA, gateTokenAccount?)`
Claim tokens with Merkle proof.

#### `reclaim(authority, campaignPDA, authorityATA)`
Reclaim remaining tokens after expiry.

#### `hasClaimed(campaignPDA, recipient)`
Check if recipient has already claimed.

#### `getCampaign(campaignPDA)`
Get campaign state.

### Merkle Tree Utilities

```typescript
import { 
    buildMerkleTree,
    verifyMerkleProof,
    computeLeafHash,
    computeNodeHash,
} from '@styx-stack/whisperdrop-sdk';
```

### PDA Derivation

```typescript
import {
    deriveCampaignPDA,
    deriveEscrowPDA,
    deriveNullifierPDA,
} from '@styx-stack/whisperdrop-sdk';
```

## Program IDs

| Network | Program ID |
|---------|------------|
| **Mainnet** | `GhstFNnEbixAGQgLnWg1nWetJQgGfSUMhnxdBA6hWu5e` |
| Devnet | `BPM5VuX9YrG7CgueWGxtqQZBQwMTacc315ppWCtTCJ5q` |

## Use Cases

### 1. NFT Holder Airdrops
Airdrop tokens only to holders of your NFT collection.

### 2. Staker Rewards
Distribute rewards to users who stake above a threshold.

### 3. Community Rewards
Private distribution to community members without revealing the list.

### 4. Retroactive Airdrops
Reward early users without publishing their addresses.

## Security

- **Nullifiers** prevent double-claiming
- **Time-locked reclaim** protects unclaimed funds
- **Immutable Merkle root** ensures allocation integrity
- **PDA escrow** for secure token custody

## License

Apache-2.0

---

Built by [@moonmanquark](https://github.com/moonmanquark) at **Bluefoot Labs**
