# SPS SDK Reference

The Styx Privacy Standard SDK provides TypeScript tools for building privacy-preserving applications on Solana.

## Installation

```bash
npm install @styxstack/sps-sdk
# or
pnpm add @styxstack/sps-sdk
# or
yarn add @styxstack/sps-sdk
```

## Quick Start

```typescript
import { SpsClient, Domains, generateKeyPair } from '@styxstack/sps-sdk';
import { Connection, Keypair } from '@solana/web3.js';

const connection = new Connection('https://api.mainnet-beta.solana.com');
const wallet = Keypair.generate();

const client = new SpsClient(connection, wallet, {
  network: 'mainnet', // or 'devnet'
});
```

## Understanding the Model

SPS uses an inscription-based model, not traditional Solana accounts:

- **Notes** are encrypted commitments logged in transaction data
- **Nullifiers** mark notes as spent (prevents double-spending)
- **Viewing keys** let you decrypt and scan for your notes
- **Indexers** reconstruct state from on-chain logs

Most SDK operations inscribe data on-chain. The indexer then processes these inscriptions to update balances.

---

## SpsClient

The main client class for interacting with the SPS program.

### Constructor

```typescript
new SpsClient(connection: Connection, wallet: WalletContextState | Keypair, options?: SpsClientOptions)
```

**Options**:
- `network`: `'mainnet' | 'devnet'` — Network to use (default: `'mainnet'`)
- `programId`: `PublicKey` — Custom program ID (optional)

---

## Token Operations

### createMint

Create a new SPS token mint.

```typescript
const result = await client.createMint({
  name: string;          // Token name (max 32 chars)
  symbol: string;        // Token symbol (max 8 chars)
  decimals: number;      // Decimal places (0-18)
  supplyCap?: bigint;    // Maximum supply (optional)
  privacyMode?: 'private' | 'public' | 'optional';
});

// Returns
{
  mintId: string;        // Derived mint identifier
  signature: string;     // Transaction signature
}
```

### mintTo

Mint tokens to a commitment.

```typescript
const result = await client.mintTo({
  mintId: string;        // Mint identifier
  amount: bigint;        // Amount in base units
  commitment: Uint8Array; // Recipient's commitment
});

// Returns
{
  signature: string;
  noteCommitment: string;
}
```

### transfer

Transfer tokens using UTXO model.

```typescript
const result = await client.transfer({
  nullifier: Uint8Array;     // Spent note's nullifier
  newCommitment: Uint8Array; // New note commitment
  encryptedData?: Uint8Array; // Encrypted note data
});
```

### shield

Convert public SPL tokens to private SPS notes.

```typescript
const result = await client.shield({
  splMint: PublicKey;    // SPL token mint
  amount: bigint;        // Amount to shield
  commitment: Uint8Array; // Resulting commitment
});
```

### unshield

Convert private SPS notes back to public SPL tokens.

```typescript
const result = await client.unshield({
  nullifier: Uint8Array; // Note to unshield
  amount: bigint;        // Amount (for verification)
  recipient: PublicKey;  // SPL token recipient
});
```

---

## NFT Operations

### createNft

Create a private NFT.

```typescript
const result = await client.createNft({
  name: string;          // NFT name
  symbol: string;        // NFT symbol
  uri: string;           // Metadata URI (max 200 chars)
  royaltyBps?: number;   // Royalty basis points (default: 0)
  collection?: string;   // Collection ID (optional)
});

// Returns
{
  nftId: string;
  signature: string;
}
```

### transferNft

Transfer NFT ownership privately.

```typescript
const result = await client.transferNft({
  nftId: string;
  nullifier: Uint8Array;
  newCommitment: Uint8Array;
});
```

---

## Privacy Operations

### decoyStorm

Generate decoy transactions to obscure real activity.

```typescript
const result = await client.decoyStorm({
  count: number;         // Number of decoys (1-20)
});
```

### chronoVault

Create a time-locked note.

```typescript
const result = await client.chronoVault({
  commitment: Uint8Array;
  unlockSlot: number;    // Slot when funds unlock
});
```

### generateStealth

Generate a stealth address for receiving.

```typescript
const { stealthAddress, ephemeralKey } = await client.generateStealth(
  recipientViewKey: Uint8Array
);
```

---

## DeFi Operations

### createAmmPool

Create a private AMM liquidity pool.

```typescript
const result = await client.createAmmPool({
  mintA: string;         // First token mint ID
  mintB: string;         // Second token mint ID
  poolType: 'constant_product' | 'stable_swap' | 'concentrated';
  fee: number;           // Fee in basis points
});

// Returns
{
  poolId: string;
  signature: string;
}
```

### privateSwap

Execute a private swap.

```typescript
const result = await client.privateSwap({
  poolId: string;
  inputNullifier: Uint8Array;
  outputCommitment: Uint8Array;
  minOutput: bigint;
});
```

### addLiquidity

Add liquidity to a pool.

```typescript
const result = await client.addLiquidity({
  poolId: string;
  noteANullifier: Uint8Array;
  noteBNullifier: Uint8Array;
  lpCommitment: Uint8Array;
});
```

---

## Messaging

### sendMessage

Send an encrypted private message.

```typescript
const result = await client.sendMessage({
  recipient: PublicKey;
  message: string | Uint8Array;
  attachedNote?: Uint8Array; // Optional token attachment
});
```

### scanMessages

Scan for messages sent to your viewing key.

```typescript
const messages = await client.scanMessages(viewingKey: Uint8Array);

// Returns
Array<{
  sender: string;
  content: Uint8Array;
  timestamp: number;
  attachedNote?: string;
}>
```

---

## Key Management

### generateKeyPair

Generate a new spend/view keypair.

```typescript
import { generateKeyPair } from '@styxstack/sps-sdk';

const { spendKey, viewKey } = generateKeyPair();
// spendKey: Uint8Array (32 bytes) — Keep secret!
// viewKey: Uint8Array (32 bytes) — Can share for read-only access
```

### deriveViewingKey

Derive viewing key from spending key.

```typescript
import { deriveViewingKey } from '@styxstack/sps-sdk';

const viewKey = deriveViewingKey(spendKey);
```

### generateCommitment

Generate a note commitment.

```typescript
const commitment = await client.generateCommitment(
  amount: bigint,
  options?: { nonce?: Uint8Array }
);
```

### generateNullifier

Generate a nullifier for spending a note.

```typescript
const nullifier = await client.generateNullifier(
  commitment: Uint8Array,
  spendKey: Uint8Array
);
```

---

## Compliance

### attachPoi

Attach Proof of Innocence to a note.

```typescript
const result = await client.attachPoi({
  noteCommitment: Uint8Array;
  poiProof: Uint8Array;  // Merkle proof
  merkleRoot: Uint8Array;
});
```

### revealToAuditor

Reveal note details to a designated auditor.

```typescript
const result = await client.revealToAuditor({
  noteCommitment: Uint8Array;
  auditorPubkey: PublicKey;
  revealAmount: boolean;
  revealSender: boolean;
  revealRecipient: boolean;
});
```

---

## Scanning & Queries

### scanBalance

Scan for your token balance using viewing key.

```typescript
const balance = await client.scanBalance(
  mintId: string,
  viewingKey: Uint8Array
);

// Returns
{
  total: bigint;
  noteCount: number;
  notes: Array<{
    commitment: string;
    amount: bigint;
    slot: number;
  }>;
}
```

### scanNfts

Scan for your NFT ownership.

```typescript
const nfts = await client.scanNfts(viewingKey: Uint8Array);
```

### isNullifierSpent

Check if a nullifier has been used.

```typescript
const spent = await client.isNullifierSpent(nullifier: Uint8Array);
```

---

## Domains

Access domain and operation constants:

```typescript
import { Domains, Operations } from '@styxstack/sps-sdk';

Domains.STS          // 0x01
Domains.MESSAGING    // 0x02
Domains.PRIVACY      // 0x07
Domains.DEFI         // 0x08
Domains.NFT          // 0x09

Operations.STS.CREATE_MINT  // 0x01
Operations.STS.MINT_TO      // 0x04
Operations.STS.TRANSFER     // 0x06
```

---

## Error Handling

```typescript
import { SpsError } from '@styxstack/sps-sdk';

try {
  await client.transfer({ ... });
} catch (error) {
  if (error instanceof SpsError) {
    console.error('SPS Error:', error.code, error.message);
  }
}
```

**Error Codes**:
- `WALLET_NOT_CONNECTED` — No wallet available
- `INSUFFICIENT_FUNDS` — Not enough SOL for fees
- `INVALID_COMMITMENT` — Malformed commitment
- `NULLIFIER_SPENT` — Note already consumed
- `INVALID_PROOF` — Transfer proof invalid

---

## TypeScript Types

```typescript
import type {
  SpsClientOptions,
  CreateMintParams,
  MintToParams,
  TransferParams,
  CreateNftParams,
  CreatePoolParams,
  SwapParams,
  SpsMint,
  SpsNote,
  SpsNft,
  SpsPool,
} from '@styxstack/sps-sdk';
```

---

## Examples

See the [examples directory](../examples) for complete applications:

- `token-launch.ts` — Create and distribute a private token
- `nft-mint.ts` — Mint and transfer private NFTs
- `private-swap.ts` — Execute private DEX swaps
- `messaging.ts` — Send encrypted messages with token attachments
