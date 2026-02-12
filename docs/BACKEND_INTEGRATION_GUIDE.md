# Styx Privacy Standard — Backend Integration Guide

> **Audience:** Backend developers building services, indexers, or server-side apps that integrate with SPS.  
> **API:** Umbra API v1.0 — `https://api.styx.nexus/v1`  
> **SDK:** `@styx-stack/sps-sdk` (npm) — TypeScript/Node.js

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start — Node.js / TypeScript](#quick-start)
4. [SDK Integration](#sdk-integration)
   - [SpsClient Setup](#spsclient-setup)
   - [Shield Tokens](#shield-tokens)
   - [Unshield Tokens](#unshield-tokens)
   - [Private Transfer](#private-transfer)
   - [Private Swap](#private-swap)
   - [Compliance (Reveal / POI)](#compliance)
5. [Direct JSON-RPC Integration](#direct-json-rpc-integration)
   - [Account Queries](#account-queries)
   - [Balance Queries](#balance-queries)
   - [Token Account Queries](#token-queries)
   - [Proof Queries](#proof-queries)
   - [Signature / Transaction Queries](#signature-queries)
   - [DAS API](#das-api)
   - [Styx Privacy Extensions](#styx-extensions)
6. [WebSocket Real-Time Streaming](#websocket-streaming)
7. [Self-Hosting the Indexer](#self-hosting)
8. [Database Schema](#database-schema)
9. [Error Handling & Retry Logic](#error-handling)
10. [Rate Limits & Best Practices](#rate-limits)
11. [Security Considerations](#security)

---

## Overview

The **Styx Privacy Standard (SPS)** is an on-chain privacy layer for Solana. It implements a UTXO-style shielded pool where tokens are represented as encrypted notes with cryptographic commitments and nullifiers.

**Core Concepts:**

| Concept | Description |
|---------|-------------|
| **Shield** | Move tokens from public Solana → private SPS pool |
| **Unshield** | Move tokens from SPS pool → public Solana |
| **Note** | Encrypted UTXO containing `(owner, mint, amount, nonce)` |
| **Commitment** | `sha256(note_plaintext)` — unique identifier for a note |
| **Nullifier** | Proof that a note has been spent (prevents double-spend) |
| **Virtual Account** | Aggregated view of all unspent notes for a mint |

**Program ID:** `STYXbZeL1wcNigy1WAMFbUQ7PNzJpPYV557H7foNyY5`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Backend Service                      │
│  ┌────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │ SpsClient  │  │ Umbra API      │  │ WebSocket        │  │
│  │ (SDK)      │  │ (JSON-RPC)     │  │ (Real-time)      │  │
│  └─────┬──────┘  └───────┬────────┘  └────────┬─────────┘  │
└────────┼─────────────────┼─────────────────────┼────────────┘
         │                 │                     │
         ▼                 ▼                     ▼
   ┌───────────┐    ┌────────────┐    ┌───────────────────┐
   │ Solana    │    │ Umbra API  │    │ Indexer WS        │
   │ RPC       │    │ REST/RPC   │    │ wss://api.styx... │
   │ (mainnet) │    │ port 3100  │    │ port 3100         │
   └───────────┘    └────────────┘    └───────────────────┘
```

---

## Quick Start

### Install

```bash
npm install @styx-stack/sps-sdk @solana/web3.js
# or
pnpm add @styx-stack/sps-sdk @solana/web3.js
```

### Minimal Example

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import { SpsClient } from '@styx-stack/sps-sdk';

const connection = new Connection('https://api.mainnet-beta.solana.com');
const wallet = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(
  require('fs').readFileSync('wallet.json', 'utf8')
)));

const client = new SpsClient(connection, wallet);

// Shield 1000 BONK into the privacy pool
const sig = await client.shield(
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',  // BONK mint
  1000n,
);
console.log('Shield tx:', sig);

// Check nullifier status
const res = await fetch('https://api.styx.nexus/v1', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0', id: 1,
    method: 'getNullifierStatus',
    params: { nullifier: 'abc123...' },
  }),
});
const { result } = await res.json();
console.log('Spent?', result.value.spent);
```

---

## SDK Integration

### SpsClient Setup

```typescript
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  SpsClient,
  buildShieldIx,
  buildUnshieldIx,
  buildPrivateTransferIx,
  buildPrivateSwapIx,
  buildRevealToAuditorIx,
  buildAttachPoiIx,
  buildCreateAmmPoolIx,
  buildRatchetMessageIx,
  buildPrivateMessageIx,
  SPS_PROGRAM_ID,
} from '@styx-stack/sps-sdk';

const connection = new Connection(process.env.SOLANA_RPC_URL!);
const payer = Keypair.fromSecretKey(/* ... */);
const client = new SpsClient(connection, payer);
```

### Shield Tokens

```typescript
// Shield 5000 SPL tokens into the SPS pool
const mintAddress = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; // BONK
const amount = 5000n;

const signature = await client.shield(mintAddress, amount);
console.log(`Shielded ${amount} tokens: ${signature}`);

// Low-level: build the instruction yourself
const ix = buildShieldIx(
  payer.publicKey,
  new PublicKey(mintAddress),
  amount,
  noteCommitment,      // 32-byte Buffer
  encryptedNote,       // Buffer
);
```

### Unshield Tokens

```typescript
const signature = await client.unshield(
  mintAddress,
  amount,
  recipientPublicKey,
  nullifier,           // 32-byte Buffer (proves note was spent)
  merkleProof,         // Buffer
);
```

### Private Transfer

```typescript
// Transfer tokens between two SPS notes (on-chain, no public amounts)
const ix = buildPrivateTransferIx(
  payer.publicKey,
  new PublicKey(mintAddress),
  inputNullifier,       // Buffer — nullifier for input note
  outputCommitmentA,    // Buffer — commitment for first output
  outputCommitmentB,    // Buffer — commitment for second output (change)
  encryptedOutputA,     // Buffer
  encryptedOutputB,     // Buffer
  zkProof,              // Buffer — zero-knowledge proof
);
```

### Private Swap

```typescript
const ix = buildPrivateSwapIx(
  payer.publicKey,
  poolPda,              // PublicKey — AMM pool PDA
  new PublicKey(mintA),
  new PublicKey(mintB),
  inputNullifier,       // Buffer
  outputCommitment,     // Buffer
  encryptedOutput,      // Buffer
  zkProof,              // Buffer
  minOutput,            // bigint
);
```

### Compliance

```typescript
// Reveal a shielded note to a compliance auditor
const ix = buildRevealToAuditorIx(
  payer.publicKey,
  new PublicKey(mintAddress),
  noteCommitment,
  auditorPublicKey,
  encryptedReveal,       // Auditor-encrypted note data
);

// Attach a Proof of Innocence to a note
const ix = buildAttachPoiIx(
  payer.publicKey,
  new PublicKey(mintAddress),
  noteCommitment,
  proofHash,             // 32-byte sha256 of the POI payload
);
```

---

## Direct JSON-RPC Integration

For services that don't use the SDK, call the Umbra API directly via JSON-RPC or REST.

### Generic RPC Helper

```typescript
const UMBRA_URL = 'https://api.styx.nexus/v1';

async function umbraRpc(method: string, params: Record<string, any> = {}) {
  const res = await fetch(UMBRA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`${json.error.code}: ${json.error.message}`);
  return json.result;
}

// REST alternative (same result, different call style):
async function umbraRest(endpoint: string, params: Record<string, any> = {}) {
  const res = await fetch(`${UMBRA_URL}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}
```

### Account Queries

```typescript
// Get a single compressed account by hash
const account = await umbraRpc('getCompressedAccount', { hash: 'abc123...' });
// → { context: { slot }, value: { hash, address, data, owner, lamports, ... } | null }

// Get accounts by owner
const accounts = await umbraRpc('getCompressedAccountsByOwner', {
  owner: '72yk7xuPFqEfVCWmfGZdJKXGSD9v9eEoZZTZVhpkJN3D',
  limit: 50,
  cursor: null,       // pagination cursor
});
// → { context, value: { items: Account[], cursor: string | null } }

// Batch lookup
const multiple = await umbraRpc('getMultipleCompressedAccounts', {
  hashes: ['hash1', 'hash2', 'hash3'],
});
// → { context, value: { items: (Account | null)[] } }

// Get Merkle proof
const proof = await umbraRpc('getCompressedAccountProof', { hash: 'abc123' });
// → { context, value: { hash, root, proof: [], leafIndex, merkleTree, rootSeq } }
```

### Balance Queries

```typescript
// Single account balance
const balance = await umbraRpc('getCompressedBalance', { hash: 'abc123' });
// → { context, value: { value: "1000" } }

// Total balance across all compressed accounts for an owner
const ownerBalance = await umbraRpc('getCompressedBalanceByOwner', {
  owner: '72yk7xuPFqEfVCWmfGZdJKXGSD9v9eEoZZTZVhpkJN3D',
});
// → { context, value: { value: "5000" } }
```

### Token Queries

```typescript
// Token accounts owned by a wallet
const tokenAccounts = await umbraRpc('getCompressedTokenAccountsByOwner', {
  owner: '72yk...',
  mint: 'DezXAZ...', // optional — filter to specific mint
  limit: 100,
});
// → { context, value: { items: TokenAccount[], cursor } }

// Token balance for a specific hash
const tokenBalance = await umbraRpc('getCompressedTokenAccountBalance', {
  hash: 'abc123',
});
// → { context, value: { amount: "1000" } }

// All token balances (V1 — basic)
const balances = await umbraRpc('getCompressedTokenBalancesByOwner', {
  owner: '72yk...',
});
// → { context, value: { tokenBalances: [{ mint, balance }], cursor } }

// All token balances (V2 — with metadata)
const balancesV2 = await umbraRpc('getCompressedTokenBalancesByOwnerV2', {
  owner: '72yk...',
});
// → { context, value: { tokenBalances: [{ mint, balance, decimals, symbol, name }], cursor } }

// Mint holders
const holders = await umbraRpc('getCompressedMintTokenHolders', {
  mint: 'DezXAZ...',
});
// → { context, value: { items: [{ owner, balance }], cursor } }
```

### Proof Queries

```typescript
// Batch proofs
const proofs = await umbraRpc('getMultipleCompressedAccountProofs', {
  hashes: ['hash1', 'hash2'],
});
// → { context, value: [{ hash, root, proof, ... }] }

// New address proofs
const addrProofs = await umbraRpc('getMultipleNewAddressProofs', {
  addresses: ['addr1', 'addr2'],
});

// V2 address proofs
const addrProofsV2 = await umbraRpc('getMultipleNewAddressProofsV2', {
  addresses: ['addr1'],
});

// Validity proof (for Light Protocol clients)
const validity = await umbraRpc('getValidityProof', {
  hashes: ['abc'],
  newAddresses: ['xyz'],
});
// → { context, value: { compressedProof: { a, b, c }, roots, ... } }
```

### Signature Queries

```typescript
// Signatures for a specific compressed account
const sigs = await umbraRpc('getCompressionSignaturesForAccount', {
  hash: 'abc123',
  limit: 50,
});
// → { context, value: { items: [{ signature, slot, blockTime }], cursor } }

// Signatures for an address (as payer)
const addrSigs = await umbraRpc('getCompressionSignaturesForAddress', {
  address: '72yk...',
});

// Signatures for an owner
const ownerSigs = await umbraRpc('getCompressionSignaturesForOwner', {
  owner: '72yk...',
});

// Token owner signatures
const tokenSigs = await umbraRpc('getCompressionSignaturesForTokenOwner', {
  owner: '72yk...',
});

// Latest signatures globally
const latest = await umbraRpc('getLatestCompressionSignatures', { limit: 20 });

// Latest non-voting signatures
const nonVoting = await umbraRpc('getLatestNonVotingSignatures', { limit: 20 });

// Full transaction with compression info
const txInfo = await umbraRpc('getTransactionWithCompressionInfo', {
  signature: '5KWKXjUSK...',
});
// → { context, value: {
//     signature, compressionInfo: { openedAccounts, closedAccounts },
//     explorerUrl: "https://styx.nexus/explorer/tx/..."
// } }
```

### DAS API

```typescript
// Get asset by ID (NFT, token, or note)
const asset = await umbraRpc('getAsset', { id: 'nft_id_123' });

// Get asset Merkle proof
const assetProof = await umbraRpc('getAssetProof', { id: 'nft_id' });

// Get assets by owner (privacy-limited for SPS)
const assets = await umbraRpc('getAssetsByOwner', {
  ownerAddress: '72yk...',
});
```

### Styx Extensions

```typescript
// ── Shielded Notes ──────────────────────────────────────────────
const notes = await umbraRpc('getShieldedNotesByOwner', {
  owner: '72yk...',
  mint: 'DezXAZ...',  // optional filter
  limit: 100,
});
// → { context, value: { items: [{
//     id, owner, mint, amount, commitment,
//     shieldedAt, shieldedSlot, txSignature,
//     spent, spentAt, spentTx
// }], cursor } }

// ── Nullifier Status ────────────────────────────────────────────
// Single
const status = await umbraRpc('getNullifierStatus', {
  nullifier: 'deadbeef...',
});
// → { context, value: { nullifier: "...", spent: false } }

// Batch
const batchStatus = await umbraRpc('getNullifierStatus', {
  nullifiers: ['aaa', 'bbb', 'ccc'],
});
// → { context, value: [{ nullifier, spent }, ...] }

// ── Pool Stats ──────────────────────────────────────────────────
const stats = await umbraRpc('getPrivacyPoolStats', {});
// → { context, value: {
//     totalPools, totalShieldedNotes, totalNotes,
//     totalNullifiers, totalMints, totalNfts, totalEvents
// } }

// ── Health Check ────────────────────────────────────────────────
const health = await umbraRpc('getIndexerHealth');
// → "ok"

const slot = await umbraRpc('getIndexerSlot');
// → number (current slot)
```

### NFT Queries (REST only)

```typescript
// Get compressed NFTs for an owner
const nfts = await umbraRest('getCompressedNftsByOwner', { owner: '72yk...' });

// Get a single NFT
const nft = await umbraRest('getCompressedNft', { id: 'nft_abc' });

// Get NFTs by collection
const collection = await umbraRest('getCompressedNftsByCollection', {
  collection: 'collection_xyz',
});
```

---

## WebSocket Real-Time Streaming

The indexer supports WebSocket connections for real-time event streaming.

```typescript
import WebSocket from 'ws';

const ws = new WebSocket('wss://api.styx.nexus');

ws.on('open', () => {
  // Subscribe to all SPS events
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'events',
  }));
  
  // Subscribe to events for a specific mint
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'events',
    filter: { mint: 'DezXAZ...' },
  }));
});

ws.on('message', (data) => {
  const event = JSON.parse(data.toString());
  
  switch (event.type) {
    case 'event':
      console.log('SPS Event:', event.data.opName, event.data.signature);
      break;
    case 'stats':
      console.log('Stats update:', event.data);
      break;
  }
});

ws.on('close', () => {
  // Reconnect logic
  setTimeout(() => connectWs(), 5000);
});
```

---

## Self-Hosting the Indexer

You can run your own Umbra API instance:

```bash
# Clone
git clone https://github.com/QuarksBlueFoot/StyxStack.git
cd StyxStack/services/sps-indexer

# Install
pnpm install

# Set up database
export DATABASE_URL="postgresql://user:pass@localhost:5432/sps_indexer"
npx prisma migrate deploy
npx prisma generate

# Configure
export SOLANA_RPC_URL="https://your-rpc-provider.com"
export SOLANA_WS_URL="wss://your-rpc-provider.com"
export PORT=3100

# Run
pnpm dev     # Development (tsx watch)
pnpm build   # Build for production
pnpm start   # Production (compiled JS)
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install -g pnpm && pnpm install && pnpm build
EXPOSE 3100
CMD ["node", "dist/server.js"]
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3100` | HTTP/WS server port |
| `SOLANA_RPC_URL` | Helius mainnet | Solana JSON-RPC endpoint |
| `SOLANA_WS_URL` | Helius mainnet WS | Solana WebSocket endpoint |
| `DATABASE_URL` | *(required)* | PostgreSQL connection string |
| `SPS_PROGRAM_ID` | `STYXb...` | SPS program address |
| `CLUSTER` | `mainnet-beta` | Solana cluster |
| `ENABLE_LOG_SUBSCRIPTION` | `true` | Enable WebSocket log streaming |
| `MONITORED_MINTS` | *(empty)* | Comma-separated mints to track |

---

## Database Schema

The indexer uses PostgreSQL (via Prisma) for persistent storage:

```sql
-- Core tables
ShieldedNote     -- Shielded token notes (owner, mint, amount, commitment)
SpsEvent         -- Indexed on-chain events
SpsMint          -- Registered token mints
SpsNullifier     -- Spent nullifiers
SpsNft           -- Compressed NFTs
SpsPool          -- AMM pool metadata
```

The in-memory indexer (`SpsIndexer`) syncs from the chain and caches everything for fast queries. The database provides persistence across restarts.

---

## Error Handling & Retry Logic

```typescript
async function umbraRpcWithRetry(
  method: string,
  params: any,
  maxRetries = 3,
  baseDelay = 1000
): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await umbraRpc(method, params);
      return result;
    } catch (error: any) {
      // Don't retry client errors
      if (error.message.includes('-32601')) throw error; // Method not found
      if (error.message.includes('-32602')) throw error; // Invalid params
      
      // Retry server errors with exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`Umbra RPC retry ${attempt + 1}/${maxRetries} in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw new Error(`Failed after ${maxRetries} retries`);
}
```

---

## Rate Limits & Best Practices

| Tier | Limit | Notes |
|------|-------|-------|
| Free | 100 req/s | Per IP address |
| Batch | Use batch endpoints | `getMultipleCompressedAccounts`, batch `getNullifierStatus` |

**Best Practices:**

1. **Use batch endpoints** — Reduce round trips by querying multiple accounts/nullifiers in one call.

2. **Cache slot-based data** — Account data changes only when the slot advances. Use `context.slot` to detect freshness.

3. **WebSocket for live data** — Don't poll. Subscribe via WebSocket for real-time events.

4. **Paginate large queries** — Use `cursor` + `limit` params for large result sets.

5. **Health check** — Call `getIndexerHealth` periodically and fall back if the indexer is down.

6. **Use V2 endpoints** — `getCompressedTokenBalancesByOwnerV2` includes decimals/symbol metadata, saving extra lookups.

---

## Security Considerations

1. **Server-side note encryption:** Encrypt note data before submitting shield transactions. Use AES-256-GCM with the recipient's public key.

2. **Nullifier generation:** Nullifiers must be deterministic (`sha256(commitment || spending_key)`) so double-spends are detected on-chain.

3. **Key management:** Use HSMs or AWS KMS for production signing keys. Never store raw private keys in environment variables on shared infrastructure.

4. **Rate limiting your own API:** If you proxy Umbra API calls through your backend, add your own rate limiting to prevent abuse.

5. **Audit trail:** For regulated apps, use `revealToAuditor` and `attachPoi` instructions to provide compliance proofs without breaking user privacy.

---

*Styx Privacy Standard — Built by Bluefoot Labs (@moonmanquark)*  
*GitHub: https://github.com/QuarksBlueFoot/StyxStack*
