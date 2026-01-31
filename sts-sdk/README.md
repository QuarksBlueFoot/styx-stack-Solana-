# @styxstack/sts-sdk

<div align="center">

![STS SDK](https://img.shields.io/badge/STS-SDK-8B5CF6?style=for-the-badge)
[![npm](https://img.shields.io/npm/v/@styxstack/sts-sdk?style=flat-square)](https://www.npmjs.com/package/@styxstack/sts-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-BSL%201.1-blue?style=flat-square)](LICENSE)

**TypeScript SDK for the Styx Token Standard (STS) on Solana**

*Event-sourced tokens. Zero rent. Native privacy. Full Token-22 parity.*

</div>

## Installation

```bash
npm install @styxstack/sts-sdk
# or
pnpm add @styxstack/sts-sdk
# or
yarn add @styxstack/sts-sdk
```

## Quick Start

```typescript
import { STS, StyxPMP, STYX_PMP_PROGRAM_ID } from '@styxstack/sts-sdk';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.mainnet-beta.solana.com');
const styx = new StyxPMP(connection);
const sts = new STS(styx);

// Send tokens to any address (Token-22 UX!)
const { signature } = await sts.sendTo(wallet, {
  to: new PublicKey('recipientAddress...'),
  amount: 1_000_000n,
  mint: tokenMint,
});

console.log('Sent!', signature);
```

**Same UX as Token-22:**
```typescript
// Token-22 way:
await transfer(connection, payer, sourceATA, destATA, payer, 1_000_000);

// STS way (simpler - no ATAs needed!):
await sts.sendTo(wallet, { to: recipientAddress, amount: 1_000_000n, mint });
```

## Why STS Over Token-22?

| Feature | Token-22 | STS |
|---------|----------|-----|
| Cost per CT transfer | ~0.15 SOL | ~0.001 SOL |
| Rent per holder | ~0.002 SOL | **0 SOL** |
| Extensions | Mint-wide | Per-note |
| Instruction count | ~30 | **207** |
| Privacy | Optional CT | Native |

## Core Features

### Token Operations

```typescript
// Mint new tokens
const mintIx = await sts.buildMintInstruction({
  authority: payer.publicKey,
  recipient: recipientPubkey,
  amount: 1_000_000n,
  decimals: 6
});

// Transfer with privacy
const transferIx = await sts.buildNoteTransferInstruction({
  noteCommitment: sourceNote,
  newOwnerHash: recipientHash, // Stealth address hash
  amount: 100_000n
});

// Merge multiple notes
const mergeIx = await sts.buildNoteMergeInstruction({
  noteCommitments: [note1, note2, note3],
  newOwnerHash: ownerHash
});

// Split note
const splitIx = await sts.buildNoteSplitInstruction({
  noteCommitment: sourceNote,
  amounts: [50_000n, 30_000n, 20_000n]
});
```

### Per-Note Extensions

Unlike Token-22's mint-wide extensions, STS allows extensions per individual note:

```typescript
// Transfer fee (per-note)
const noteWithFee = await sts.buildNoteWithExtensions({
  amount: 100_000n,
  extensions: [
    { type: 'transferFee', feeBps: 100, maxFee: 10_000n },
    { type: 'royalty', recipient: creatorPubkey, bps: 500 }
  ]
});

// Interest-bearing note
const interestNote = await sts.buildNoteWithExtensions({
  amount: 100_000n,
  extensions: [
    { type: 'interest', rateBps: 500, compoundSlots: 432_000 }
  ]
});

// Soulbound (non-transferable)
const soulboundNote = await sts.buildNoteWithExtensions({
  amount: 1n,
  extensions: [
    { type: 'soulbound', bindingProof: proofHash }
  ]
});
```

### Stealth Addresses

```typescript
// Generate stealth meta-address
const { viewKey, spendKey, metaAddress } = await sts.generateStealthMetaAddress();

// Send to stealth address
const stealthIx = await sts.buildStealthSendInstruction({
  noteCommitment: sourceNote,
  stealthMetaAddress: recipientMetaAddress,
  amount: 100_000n
});

// Scan for incoming payments
const payments = await sts.scanStealthPayments({
  viewKey: myViewKey,
  fromSlot: 250_000_000
});
```

### AMM & DEX Integration

```typescript
// Create liquidity pool
const createPoolIx = await sts.buildAMMPoolCreateInstruction({
  tokenA: mintA,
  tokenB: mintB,
  feeRateBps: 30 // 0.3%
});

// Swap
const swapIx = await sts.buildAMMSwapInstruction({
  pool: poolAddress,
  amountIn: 1_000_000n,
  minAmountOut: 990_000n, // 1% slippage
  direction: 'AtoB'
});

// Add liquidity
const addLiqIx = await sts.buildAMMAddLiquidityInstruction({
  pool: poolAddress,
  amountA: 1_000_000n,
  amountB: 1_000_000n,
  minLpTokens: 999_000n
});
```

### NFT Marketplace

```typescript
// Mint NFT (unique note with supply=1)
const nftMintIx = await sts.buildNFTMintInstruction({
  authority: creator.publicKey,
  metadata: {
    name: 'My NFT',
    symbol: 'MNFT',
    uri: 'https://arweave.net/...',
    royaltyBps: 500
  }
});

// List for sale
const listIx = await sts.buildNFTListInstruction({
  noteCommitment: nftNote,
  price: 1_500_000_000n // 1.5 SOL
});

// Create auction
const auctionIx = await sts.buildAuctionCreateInstruction({
  noteCommitment: nftNote,
  auctionType: 'english',
  startPrice: 1_000_000_000n,
  durationSlots: 172_800 // ~2 days
});
```

### Private Governance

```typescript
// Create proposal
const proposalIx = await sts.buildProposalInstruction({
  proposer: proposer.publicKey,
  title: 'Increase treasury allocation',
  descriptionHash: keccak256(description),
  votingEndSlot: currentSlot + 432_000n,
  quorumBps: 1000 // 10%
});

// Cast private vote (nullifier-based)
const voteIx = await sts.buildPrivateVoteInstruction({
  proposalId,
  voterSecret: mySecret,
  vote: 1, // yes
  weight: myTokenBalance
});
```

### Compliance & Auditing

```typescript
// Selective disclosure to auditor
const disclosureIx = await sts.buildSelectiveDisclosureInstruction({
  noteCommitment,
  auditorPubkey,
  fieldsToReveal: ['amount', 'timestamp'], // Hide sender/recipient
  expirySlot: currentSlot + 86_400
});

// Prove balance meets threshold
const proof = await sts.proveBalance({
  noteCommitment,
  threshold: 1_000_000n,
  auditorPubkey
});
```

## Mobile Integration

Full Solana Mobile Wallet Adapter (MWA) 2.0 support:

```typescript
import { STS } from '@styxstack/sts-sdk';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol';

await transact(async (wallet) => {
  const sts = new STS(connection);
  
  const tx = await sts.buildTransfer({
    amount: 100_000n,
    toHash: recipientHash
  });
  
  const signed = await wallet.signTransactions([tx]);
  await connection.sendRawTransaction(signed[0].serialize());
});
```

## Trust Levels

STS provides three trust levels:

```typescript
// Level 0: Trust indexer (free, default)
const balance = await sts.getBalance(ownerPubkey);

// Level 1: Nullifier PDAs (0.00089 SOL, trustless double-spend)
const transferIx = await sts.buildNoteTransferInstruction({
  noteCommitment,
  newOwnerHash,
  amount,
  createNullifierPDA: true // Explicit nullifier
});

// Level 2: Full Merkle proofs (trustless verification)
const verified = await sts.verifyNoteWithMerkleProof({
  noteCommitment,
  merkleProof,
  merkleRoot
});
```

## Constants

```typescript
import {
  STYX_PROGRAM_ID,           // Mainnet program ID
  STYX_DEVNET_PROGRAM_ID,    // Devnet program ID
  TAG_NOTE_MINT,             // Instruction tags
  TAG_NOTE_TRANSFER,
  TAG_NOTE_MERGE,
  // ... 207 total tags
} from '@styxstack/sts-sdk';
```

## Error Handling

```typescript
import { STSError, ErrorCode } from '@styxstack/sts-sdk';

try {
  await sts.transfer(...);
} catch (err) {
  if (err instanceof STSError) {
    switch (err.code) {
      case ErrorCode.InsufficientBalance:
        console.log('Not enough tokens');
        break;
      case ErrorCode.NullifierExists:
        console.log('Double-spend attempt detected');
        break;
      case ErrorCode.InvalidProof:
        console.log('Invalid cryptographic proof');
        break;
    }
  }
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| `@styxstack/cli` | Command-line interface |
| `@styx/crypto-core` | Cryptographic primitives |
| `@styx/rn-kit` | React Native components |
| `@styx/mobile-toolkit` | Mobile utilities |
| `@styx/policy-kit` | Compliance policies |

## Development

```bash
# Clone
git clone https://github.com/QuarksBlueFoot/StyxStack.git
cd StyxStack/packages/sts-sdk

# Install
pnpm install

# Build
pnpm build

# Test
pnpm test

# Type check
pnpm typecheck
```

## License

BSL 1.1 - Free for projects with <100k MAU. Converts to Apache-2.0 on 2030-01-26.

For commercial licensing: licensing@bluefoot.tech

---

<div align="center">

Part of the [Styx Token Standard](https://github.com/QuarksBlueFoot/StyxStack)

Built by [@moonmanquark](https://twitter.com/moonmanquark) (Bluefoot Labs)

</div>
