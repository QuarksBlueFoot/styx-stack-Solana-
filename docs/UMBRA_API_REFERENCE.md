# Umbra API — Complete Reference

> **Version:** 1.0.0  
> **Base URL:** `https://api.styx.nexus/v1`  
> **Protocol:** JSON-RPC 2.0 + REST  
> **Program ID:** `STYXbZeL1wcNigy1WAMFbUQ7PNzJpPYV557H7foNyY5`

---

## Table of Contents

- [Introduction](#introduction)
- [Authentication](#authentication)
- [Request Format](#request-format)
- [Response Format](#response-format)
- [Endpoints Overview](#endpoints-overview)
- [ZK Compression API](#zk-compression-api)
  - [Account Queries](#account-queries)
  - [Balance Queries](#balance-queries)
  - [Token Account Queries](#token-account-queries)
  - [Proof Queries](#proof-queries)
  - [Signature Queries](#signature-queries)
  - [Transaction Queries](#transaction-queries)
  - [Indexer Status](#indexer-status)
- [DAS API](#das-api)
- [NFT Queries](#nft-queries)
- [Styx Privacy Extensions](#styx-privacy-extensions)
- [Utility Endpoints](#utility-endpoints)
- [WebSocket API](#websocket-api)
- [Error Codes](#error-codes)
- [Type Definitions](#type-definitions)
- [SDK Reference](#sdk-reference)
- [Changelog](#changelog)

---

## Introduction

**Umbra** is the native ZK Compression & Privacy RPC API for the Styx Privacy Standard (SPS). Named after the deepest part of a shadow, Umbra provides:

- **Full Helius ZK Compression API parity** — all 25 endpoints
- **DAS API compatibility** — `getAsset`, `getAssetProof`, `getAssetsByOwner`
- **Styx Privacy Extensions** — shielded note queries, nullifier checks, pool statistics
- **NFT compressed account queries**
- **Wallet compatibility** — Phantom, Solflare, Backpack

Umbra is designed to be a drop-in replacement for Helius's Photon ZK Compression API, with additional privacy-native endpoints.

---

## Authentication

The public API requires no authentication. Self-hosted instances can be configured with API keys via reverse proxy (nginx, Cloudflare).

---

## Request Format

### JSON-RPC (Primary)

```http
POST /v1
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "<method_name>",
  "params": { ... }
}
```

### REST (Alternative)

Every JSON-RPC method is also available as a REST endpoint:

```http
POST /v1/<method_name>
Content-Type: application/json

{ ...params... }
```

---

## Response Format

### JSON-RPC Success

```json
{
  "jsonrpc": "2.0",
  "result": {
    "context": { "slot": 298765432 },
    "value": { ... }
  },
  "id": 1
}
```

### JSON-RPC Error

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32601,
    "message": "Method not found: badMethod"
  },
  "id": 1
}
```

### REST Response

REST endpoints return the `result` object directly (no JSON-RPC wrapper):

```json
{
  "context": { "slot": 298765432 },
  "value": { ... }
}
```

---

## Endpoints Overview

| Category | Methods | Count |
|----------|---------|-------|
| Account Queries | `getCompressedAccount`, `getCompressedAccountProof`, `getCompressedAccountsByOwner`, `getMultipleCompressedAccounts` | 4 |
| Balance Queries | `getCompressedBalance`, `getCompressedBalanceByOwner` | 2 |
| Token Account Queries | `getCompressedTokenAccountsByOwner`, `getCompressedTokenAccountsByDelegate`, `getCompressedTokenAccountBalance`, `getCompressedTokenBalancesByOwner`, `getCompressedTokenBalancesByOwnerV2`, `getCompressedMintTokenHolders` | 6 |
| Proof Queries | `getMultipleCompressedAccountProofs`, `getMultipleNewAddressProofs`, `getMultipleNewAddressProofsV2`, `getValidityProof` | 4 |
| Signature Queries | `getCompressionSignaturesForAccount`, `getCompressionSignaturesForAddress`, `getCompressionSignaturesForOwner`, `getCompressionSignaturesForTokenOwner`, `getLatestCompressionSignatures`, `getLatestNonVotingSignatures` | 6 |
| Transaction Queries | `getTransactionWithCompressionInfo` | 1 |
| Indexer Status | `getIndexerHealth`, `getIndexerSlot` | 2 |
| DAS API | `getAsset`, `getAssetProof`, `getAssetsByOwner` | 3 |
| NFT Queries | `getCompressedNftsByOwner`, `getCompressedNft`, `getCompressedNftsByCollection` | 3 |
| Styx Extensions | `getShieldedNotesByOwner`, `getNullifierStatus`, `getPrivacyPoolStats` | 3 |
| **Total** | | **34** |

---

## ZK Compression API

### Account Queries

#### `getCompressedAccount`

Retrieves a single compressed account by hash or address.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hash` | `string` | One of hash/address | Note commitment hash |
| `address` | `string` | One of hash/address | Account address |

**Response:** `ApiResponse<Account | null>`

```json
{
  "context": { "slot": 298765432 },
  "value": {
    "hash": "abc123...",
    "address": null,
    "data": {
      "discriminator": [2, 0, 0, 0, 0, 0, 0, 0],
      "data": "base64_encoded_data",
      "dataHash": "abc123..."
    },
    "owner": "",
    "lamports": "0",
    "tree": "",
    "leafIndex": 0,
    "seq": 0,
    "slotCreated": 298765000
  }
}
```

---

#### `getCompressedAccountProof`

Fetches a Merkle proof for a compressed account.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hash` | `string` | Yes | Account hash |

**Response:** `ApiResponse<AccountProof>`

```json
{
  "context": { "slot": 298765432 },
  "value": {
    "hash": "abc123...",
    "root": null,
    "proof": [],
    "leafIndex": 0,
    "merkleTree": null,
    "rootSeq": 0
  }
}
```

---

#### `getCompressedAccountsByOwner`

Returns all compressed accounts for an owner address.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `owner` | `string` | Yes | Owner wallet address |
| `cursor` | `string` | No | Pagination cursor |
| `limit` | `number` | No | Max results (default: 100) |

**Response:** `ApiResponse<PaginatedList<Account>>`

---

#### `getMultipleCompressedAccounts`

Retrieve multiple accounts in a single request.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hashes` | `string[]` | One of | Array of account hashes |
| `addresses` | `string[]` | One of | Array of addresses |

**Response:** `ApiResponse<{ items: (Account | null)[] }>`

---

### Balance Queries

#### `getCompressedBalance`

Get the balance of a compressed account.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hash` | `string` | No | Account hash |
| `address` | `string` | No | Account address |

**Response:** `ApiResponse<{ value: string }>`

---

#### `getCompressedBalanceByOwner`

Total balance across all compressed accounts for an owner.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `owner` | `string` | Yes | Owner address |

**Response:** `ApiResponse<{ value: string }>`

---

### Token Account Queries

#### `getCompressedTokenAccountsByOwner`

All compressed token accounts for an owner.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `owner` | `string` | Yes | Owner address |
| `mint` | `string` | No | Filter by mint |
| `cursor` | `string` | No | Pagination cursor |
| `limit` | `number` | No | Max results (default: 100) |

**Response:** `ApiResponse<PaginatedList<TokenAccount>>`

---

#### `getCompressedTokenAccountsByDelegate`

Token accounts delegated to an address.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `delegate` | `string` | Yes | Delegate address |
| `mint` | `string` | No | Filter by mint |
| `cursor` | `string` | No | Pagination cursor |
| `limit` | `number` | No | Max results (default: 100) |

**Response:** `ApiResponse<PaginatedList<TokenAccount>>`

> **Note:** SPS privacy model doesn't expose delegation publicly. Returns empty for privacy-preserving default.

---

#### `getCompressedTokenAccountBalance`

Token balance for a specific compressed account.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hash` | `string` | No | Account hash |
| `address` | `string` | No | Account address |

**Response:** `ApiResponse<{ amount: string }>`

---

#### `getCompressedTokenBalancesByOwner`

All token balances for an owner.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `owner` | `string` | Yes | Owner address |
| `mint` | `string` | No | Filter to specific mint |
| `cursor` | `string` | No | Pagination cursor |
| `limit` | `number` | No | Max results (default: 100) |

**Response:** `ApiResponse<{ tokenBalances: TokenBalance[], cursor: string | null }>`

```json
{
  "tokenBalances": [
    { "mint": "DezXAZ...", "balance": "5000" }
  ],
  "cursor": null
}
```

---

#### `getCompressedTokenBalancesByOwnerV2`

Enhanced version with metadata (decimals, symbol, name).

**Parameters:** Same as V1.

**Response:**
```json
{
  "tokenBalances": [
    {
      "mint": "DezXAZ...",
      "balance": "5000",
      "decimals": 5,
      "symbol": "BONK",
      "name": "Bonk"
    }
  ],
  "cursor": null
}
```

---

#### `getCompressedMintTokenHolders`

List holders of a compressed token mint.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mint` | `string` | Yes | Token mint address |
| `cursor` | `string` | No | Pagination cursor |
| `limit` | `number` | No | Max results (default: 100) |

**Response:** `ApiResponse<PaginatedList<{ owner: string, balance: string }>>`

> **Note:** Owners are encrypted in SPS; returns `"(encrypted)"` for privacy.

---

### Proof Queries

#### `getMultipleCompressedAccountProofs`

Batch Merkle proofs for multiple accounts.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hashes` | `string[]` | Yes | Account hashes |

**Response:** `ApiResponse<AccountProof[]>`

---

#### `getMultipleNewAddressProofs`

Batch proofs for new addresses.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `addresses` | `string[]` | Yes | Addresses to prove |

**Response:** `ApiResponse<NewAddressProof[]>`

---

#### `getMultipleNewAddressProofsV2`

Enhanced address proofs with tree metadata.

**Parameters:** Same as V1.

---

#### `getValidityProof`

Validity proof for Light Protocol clients.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hashes` | `string[]` | No | Account hashes |
| `newAddresses` | `string[]` | No | New addresses |

**Response:**
```json
{
  "context": { "slot": 298765432 },
  "value": {
    "compressedProof": { "a": null, "b": null, "c": null },
    "roots": [],
    "rootIndices": [],
    "leafIndices": [],
    "leaves": [],
    "merkleTrees": [],
    "nullifierQueues": [],
    "addressQueues": []
  }
}
```

---

### Signature Queries

#### `getCompressionSignaturesForAccount`

Signatures for transactions involving a compressed account.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hash` | `string` | Yes | Account hash |
| `cursor` | `string` | No | Pagination cursor |
| `limit` | `number` | No | Max results (default: 100) |

**Response:** `ApiResponse<PaginatedList<CompressionSignature>>`

```json
{
  "items": [
    { "signature": "5KWK...", "slot": 298765000, "blockTime": 1710000000 }
  ],
  "cursor": null
}
```

---

#### `getCompressionSignaturesForAddress`

Signatures where an address appears as payer.

**Parameters:** `{ address, cursor?, limit? }`

---

#### `getCompressionSignaturesForOwner`

Signatures where an address is the owner.

**Parameters:** `{ owner, cursor?, limit? }`

---

#### `getCompressionSignaturesForTokenOwner`

Signatures involving tokens owned by an address.

**Parameters:** `{ owner, cursor?, limit? }`

---

#### `getLatestCompressionSignatures`

Most recent compression transaction signatures.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cursor` | `string` | No | Pagination cursor |
| `limit` | `number` | No | Max results (default: 50) |

---

#### `getLatestNonVotingSignatures`

Recent non-voting signatures (all SPS transactions are non-voting).

**Parameters:** Same as `getLatestCompressionSignatures`.

---

### Transaction Queries

#### `getTransactionWithCompressionInfo`

Full transaction details with compression metadata.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `signature` | `string` | Yes | Transaction signature |

**Response:**
```json
{
  "context": { "slot": 298765432 },
  "value": {
    "signature": "5KWK...",
    "compressionInfo": {
      "openedAccounts": [
        {
          "account": { "hash": "abc...", "slotCreated": 298765000 },
          "optionalTokenData": {
            "mint": "DezXAZ...",
            "owner": "72yk...",
            "amount": "1000"
          }
        }
      ],
      "closedAccounts": []
    },
    "explorerUrl": "https://styx.nexus/explorer/tx/5KWK..."
  }
}
```

---

### Indexer Status

#### `getIndexerHealth`

**Parameters:** None

**Response:** `"ok"` (string)

---

#### `getIndexerSlot`

**Parameters:** None

**Response:** `number` — current indexer slot

---

## DAS API

### `getAsset`

Retrieve a single asset (NFT, token mint, or SPS note) by ID.

**Parameters:** `{ id: string }`

**Response:** Varies by asset type:
- NFT → `{ interface: "V1_NFT", content, ownership, compression }`
- Token → `{ interface: "FungibleToken", content, compression }`
- Note → `{ interface: "SpsNote", ownership, compression }`

Throws error if asset not found.

### `getAssetProof`

**Parameters:** `{ id: string }`

**Response:** `{ root, proof, node_index, leaf, tree_id }`

### `getAssetsByOwner`

**Parameters:** `{ ownerAddress: string }`

**Response:** `{ items: [], cursor: null }`

> **Note:** SPS assets are privacy-encrypted; owner-based search requires the view key.

---

## NFT Queries

These are REST-only endpoints (POST to `/v1/<endpoint>`).

### `getCompressedNftsByOwner`

**Parameters:** `{ owner, cursor?, limit? }`

**Response:** `ApiResponse<PaginatedList<CompressedNft>>`

### `getCompressedNft`

**Parameters:** `{ id }`

**Response:** `ApiResponse<CompressedNft | null>`

### `getCompressedNftsByCollection`

**Parameters:** `{ collection, cursor?, limit? }`

**Response:** `ApiResponse<PaginatedList<CompressedNft>>`

**CompressedNft type:**
```json
{
  "id": "nft_abc",
  "name": "Shadow #42",
  "symbol": "SHADOW",
  "uri": "https://arweave.net/...",
  "royaltyBps": 500,
  "creator": "72yk...",
  "collection": "shadow_collection",
  "commitment": "abc123...",
  "createdAt": 1710000000,
  "createdSlot": 298765000
}
```

---

## Styx Privacy Extensions

### `getShieldedNotesByOwner`

Returns shielded notes for a wallet, optionally filtered by mint.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `owner` | `string` | Yes | Wallet address |
| `mint` | `string` | No | Filter by token mint |
| `cursor` | `string` | No | Pagination cursor |
| `limit` | `number` | No | Max results (default: 100) |

**Response:**
```json
{
  "context": { "slot": 298765432 },
  "value": {
    "items": [
      {
        "id": "clx...",
        "owner": "72yk...",
        "mint": "DezXAZ...",
        "amount": "5000",
        "commitment": "abc123...",
        "shieldedAt": 1710000000,
        "shieldedSlot": 298765000,
        "txSignature": "5KWK...",
        "spent": false,
        "spentAt": null,
        "spentTx": null
      }
    ],
    "cursor": null
  }
}
```

---

### `getNullifierStatus`

Check whether one or more nullifiers have been spent.

**Single nullifier:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nullifier` | `string` | Yes | Nullifier hash |

**Response:**
```json
{
  "context": { "slot": 298765432 },
  "value": { "nullifier": "deadbeef...", "spent": false }
}
```

**Batch nullifiers:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nullifiers` | `string[]` | Yes | Array of nullifier hashes |

**Response:**
```json
{
  "context": { "slot": 298765432 },
  "value": [
    { "nullifier": "aaa", "spent": false },
    { "nullifier": "bbb", "spent": true }
  ]
}
```

---

### `getPrivacyPoolStats`

Aggregated privacy pool statistics.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mint` | `string` | No | Filter by mint (reserved) |

**Response:**
```json
{
  "context": { "slot": 298765432 },
  "value": {
    "totalPools": 3,
    "totalShieldedNotes": 142,
    "totalNotes": 500,
    "totalNullifiers": 298,
    "totalMints": 12,
    "totalNfts": 5,
    "totalEvents": 1247
  }
}
```

---

## Utility Endpoints

### `GET /v1/health`

Umbra-specific health check.

```json
{
  "status": "ok",
  "api": "Umbra",
  "version": "1.0.0",
  "slot": 298765432,
  "eventCount": 1247,
  "docs": "https://docs.styx.nexus/api"
}
```

### `GET /v1/methods`

Lists all available API methods organized by category.

```json
{
  "api": "Umbra",
  "version": "1.0.0",
  "zkCompression": ["getCompressedAccount", "getCompressedAccountProof", ...],
  "das": ["getAsset", "getAssetProof", "getAssetsByOwner"],
  "nft": ["getCompressedNftsByOwner", "getCompressedNft", "getCompressedNftsByCollection"],
  "styx": ["getShieldedNotesByOwner", "getNullifierStatus", "getPrivacyPoolStats"],
  "docs": "https://docs.styx.nexus/api",
  "llmsTxt": "/v1/llms.txt"
}
```

### `GET /v1/llms.txt`

Machine-readable documentation index for LLM consumption. Returns plain text.

### `GET /health`

Root-level server health (includes init status, program ID, cluster info).

### `GET /stats`

Raw indexer statistics object.

---

## WebSocket API

Connect to `wss://api.styx.nexus` for real-time event streaming.

### Subscribe

```json
{ "type": "subscribe", "channel": "events" }
{ "type": "subscribe", "channel": "events", "filter": { "mint": "DezXAZ..." } }
```

### Unsubscribe

```json
{ "type": "unsubscribe", "channel": "events" }
```

### Events

```json
{
  "type": "event",
  "data": {
    "signature": "5KWK...",
    "slot": 298765000,
    "opName": "SHIELD",
    "payer": "72yk...",
    "data": { "mint": "DezXAZ...", "amount": "1000" }
  }
}
```

---

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| `-32601` | Method not found | The requested method does not exist |
| `-32602` | Invalid params | Missing or malformed parameters |
| `-32000` | Server error | Internal indexer error |

---

## Type Definitions

### Account

```typescript
interface Account {
  hash: string;
  address: string | null;
  data: {
    discriminator: number[];
    data: string;       // base64
    dataHash: string;
  };
  owner: string;
  lamports: string;
  tree: string;
  leafIndex: number;
  seq: number;
  slotCreated: number;
}
```

### TokenAccount

```typescript
interface TokenAccount {
  account: Account;
  tokenData: {
    mint: string;
    owner: string;
    amount: string;
    delegate: string | null;
    state: 'initialized' | 'frozen';
    tlv?: string | null;
  };
}
```

### TokenBalance

```typescript
interface TokenBalance {
  mint: string;
  balance: string;
}
```

### CompressionSignature

```typescript
interface CompressionSignature {
  signature: string;
  slot: number;
  blockTime: number | null;
}
```

### PaginatedList

```typescript
interface PaginatedList<T> {
  items: T[];
  cursor: string | null;
}
```

### ApiResponse

```typescript
interface ApiResponse<T> {
  context: { slot: number };
  value: T;
}
```

### CompressedNft

```typescript
interface CompressedNft {
  id: string;
  name: string;
  symbol: string;
  uri: string;
  royaltyBps: number;
  creator: string;
  collection: string | null;
  commitment: string | null;
  createdAt: number;
  createdSlot: number;
}
```

---

## SDK Reference

### Installation

```bash
npm install @styx-stack/sps-sdk @solana/web3.js
```

### SpsClient

```typescript
import { SpsClient } from '@styx-stack/sps-sdk';
import { Connection, Keypair } from '@solana/web3.js';

const client = new SpsClient(connection, wallet);

await client.shield(mint, amount);
await client.unshield(mint, amount, recipient, nullifier, proof);
await client.privateMessage(recipientPubkey, message);
await client.ratchetMessage(recipientPubkey, message, ratchetState);
await client.createAmmPool(mintA, mintB, fee);
await client.shieldWithInit(mint, amount);  // shield + initialize if needed
```

### Instruction Builders

```typescript
import {
  buildShieldIx,
  buildUnshieldIx,
  buildPrivateTransferIx,
  buildPrivateSwapIx,
  buildRevealToAuditorIx,
  buildAttachPoiIx,
  buildCreateAmmPoolIx,
  buildPrivateMessageIx,
  buildRatchetMessageIx,
  SPS_PROGRAM_ID,
} from '@styx-stack/sps-sdk';
```

---

## Changelog

### v1.0.0 (2025-06)

- Initial release of Umbra API
- Full Helius ZK Compression API parity (25 endpoints)
- DAS API compatibility (3 endpoints)
- NFT compressed queries (3 endpoints)
- Styx Privacy Extensions (3 endpoints)
- REST parity for all JSON-RPC methods
- Machine-readable docs (`/v1/llms.txt`)
- Method listing endpoint (`/v1/methods`)

---

*Styx Privacy Standard — Umbra API*  
*Built by Bluefoot Labs (@moonmanquark)*  
*GitHub: https://github.com/QuarksBlueFoot/StyxStack*
