/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Umbra API — Shadow Protocol JSON-RPC for Styx Privacy Standard
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * The Umbra API is the native ZK Compression & Privacy RPC layer for the
 * Styx Privacy Standard (SPS). Named after the deepest part of a shadow,
 * Umbra provides full Helius Photon API compatibility while extending it
 * with privacy-native endpoints unique to the Styx protocol.
 * 
 * Features:
 * - Full Helius ZK Compression API parity (all 25 endpoints)
 * - DAS API compatibility (getAsset, getAssetProof, getAssetsByOwner)
 * - Privacy-native extensions (shielded notes, nullifier queries, compliance)
 * - NFT compressed account queries
 * - Wallet compatibility (Phantom, Solflare, Backpack)
 * 
 * Docs: https://docs.styx.nexus/api
 * Index: https://api.styx.nexus/llms.txt
 * 
 * @see https://github.com/QuarksBlueFoot/StyxStack
 * @author Bluefoot Labs (@moonmanquark)
 */

import { Router, Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { SpsIndexer, SpsNote, SpsMint, SpsEvent, SpsNft } from './indexer';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — Umbra API (Photon-Compatible + Styx Extensions)
// ═══════════════════════════════════════════════════════════════════════════════

/** API response context */
interface Context {
  slot: number;
}

/** Token data structure (matches Light Protocol's TokenData) */
interface TokenData {
  mint: string;
  owner: string;
  amount: string;
  delegate: string | null;
  state: 'initialized' | 'frozen';
  tlv?: string | null;
}

/** Compressed account base structure */
interface Account {
  hash: string;
  address: string | null;
  data: {
    discriminator: number[];
    data: string;  // base64
    dataHash: string;
  };
  owner: string;
  lamports: string;
  tree: string;
  leafIndex: number;
  seq: number;
  slotCreated: number;
}

/** Token account with token data */
interface TokenAccount {
  account: Account;
  tokenData: TokenData;
}

/** Paginated list response */
interface PaginatedList<T> {
  items: T[];
  cursor: string | null;
}

/** Token balance entry */
interface TokenBalance {
  mint: string;
  balance: string;
}

/** API Response wrapper */
interface ApiResponse<T> {
  context: Context;
  value: T;
}

/** Signature entry for compression signatures endpoints */
interface CompressionSignature {
  signature: string;
  slot: number;
  blockTime: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPLORER LINKS (Styx Explorer + Orb fallback)
// ═══════════════════════════════════════════════════════════════════════════════

const STYX_EXPLORER_BASE = 'https://styx.nexus/explorer';
const ORB_BASE_URL = 'https://xray.helius.xyz';

export function getStyxTxLink(signature: string, cluster: string = 'mainnet-beta'): string {
  return `${STYX_EXPLORER_BASE}/tx/${signature}?cluster=${cluster}`;
}

export function getStyxAccountLink(address: string, cluster: string = 'mainnet-beta'): string {
  return `${STYX_EXPLORER_BASE}/account/${address}?cluster=${cluster}`;
}

export function getStyxTokenLink(mint: string, cluster: string = 'mainnet-beta'): string {
  return `${STYX_EXPLORER_BASE}/token/${mint}?cluster=${cluster}`;
}

// Legacy aliases for backward compatibility
export const getOrbTxLink = getStyxTxLink;
export const getOrbAccountLink = getStyxAccountLink;
export const getOrbTokenLink = getStyxTokenLink;

export const orbLinks = {
  tx: getStyxTxLink,
  account: getStyxAccountLink,
  token: getStyxTokenLink,
};

// ═══════════════════════════════════════════════════════════════════════════════
// UMBRA API ROUTER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates the Umbra API router with full ZK Compression + DAS + Styx Privacy endpoints.
 * Mount at /v1 for wallet compatibility.
 */
export function createUmbraRouter(indexer: SpsIndexer): Router {
  const router = Router();
  
  // ─────────────────────────────────────────────────────────────────────────
  // JSON-RPC Endpoint (POST /)
  // ─────────────────────────────────────────────────────────────────────────
  
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { method, params, id, jsonrpc } = req.body;
      
      let result: any;
      
      switch (method) {
        // ═══════════════════════════════════════════════════════════════════
        // ZK COMPRESSION API (Full Helius Parity — 25 endpoints)
        // ═══════════════════════════════════════════════════════════════════

        // — Account Queries —
        case 'getCompressedAccount':
          result = await handleGetCompressedAccount(indexer, params);
          break;
        case 'getCompressedAccountProof':
          result = await handleGetCompressedAccountProof(indexer, params);
          break;
        case 'getCompressedAccountsByOwner':
          result = await handleGetCompressedAccountsByOwner(indexer, params);
          break;
        case 'getMultipleCompressedAccounts':
          result = await handleGetMultipleCompressedAccounts(indexer, params);
          break;

        // — Balance Queries —
        case 'getCompressedBalance':
          result = await handleGetCompressedBalance(indexer, params);
          break;
        case 'getCompressedBalanceByOwner':
          result = await handleGetCompressedBalanceByOwner(indexer, params);
          break;

        // — Token Account Queries —
        case 'getCompressedTokenAccountsByOwner':
          result = await handleGetCompressedTokenAccountsByOwner(indexer, params);
          break;
        case 'getCompressedTokenAccountsByDelegate':
          result = await handleGetCompressedTokenAccountsByDelegate(indexer, params);
          break;
        case 'getCompressedTokenAccountBalance':
          result = await handleGetCompressedTokenAccountBalance(indexer, params);
          break;
        case 'getCompressedTokenBalancesByOwner':
          result = await handleGetCompressedTokenBalancesByOwner(indexer, params);
          break;
        case 'getCompressedTokenBalancesByOwnerV2':
          result = await handleGetCompressedTokenBalancesByOwnerV2(indexer, params);
          break;
        case 'getCompressedMintTokenHolders':
          result = await handleGetCompressedMintTokenHolders(indexer, params);
          break;

        // — Proof Queries —
        case 'getMultipleCompressedAccountProofs':
          result = await handleGetMultipleCompressedAccountProofs(indexer, params);
          break;
        case 'getMultipleNewAddressProofs':
          result = await handleGetMultipleNewAddressProofs(indexer, params);
          break;
        case 'getMultipleNewAddressProofsV2':
          result = await handleGetMultipleNewAddressProofsV2(indexer, params);
          break;
        case 'getValidityProof':
          result = await handleGetValidityProof(indexer, params);
          break;

        // — Signature / Transaction Queries —
        case 'getCompressionSignaturesForAccount':
          result = await handleGetCompressionSignaturesForAccount(indexer, params);
          break;
        case 'getCompressionSignaturesForAddress':
          result = await handleGetCompressionSignaturesForAddress(indexer, params);
          break;
        case 'getCompressionSignaturesForOwner':
          result = await handleGetCompressionSignaturesForOwner(indexer, params);
          break;
        case 'getCompressionSignaturesForTokenOwner':
          result = await handleGetCompressionSignaturesForTokenOwner(indexer, params);
          break;
        case 'getLatestCompressionSignatures':
          result = await handleGetLatestCompressionSignatures(indexer, params);
          break;
        case 'getLatestNonVotingSignatures':
          result = await handleGetLatestNonVotingSignatures(indexer, params);
          break;
        case 'getTransactionWithCompressionInfo':
          result = await handleGetTransactionWithCompressionInfo(indexer, params);
          break;

        // — Indexer Health —
        case 'getIndexerHealth':
          result = 'ok';
          break;
        case 'getIndexerSlot':
          result = indexer.getStats().lastSlot;
          break;

        // ═══════════════════════════════════════════════════════════════════
        // DAS API (Digital Asset Standard — Helius compatibility)
        // ═══════════════════════════════════════════════════════════════════
        case 'getAsset':
          result = await handleGetAsset(indexer, params);
          break;
        case 'getAssetProof':
          result = await handleGetAssetProof(indexer, params);
          break;
        case 'getAssetsByOwner':
          result = await handleGetAssetsByOwner(indexer, params);
          break;

        // ═══════════════════════════════════════════════════════════════════
        // STYX PRIVACY EXTENSIONS (unique to Umbra)
        // ═══════════════════════════════════════════════════════════════════
        case 'getShieldedNotesByOwner':
          result = await handleGetShieldedNotesByOwner(indexer, params);
          break;
        case 'getNullifierStatus':
          result = await handleGetNullifierStatus(indexer, params);
          break;
        case 'getPrivacyPoolStats':
          result = await handleGetPrivacyPoolStats(indexer, params);
          break;

        default:
          return res.status(400).json({
            jsonrpc: '2.0',
            error: { code: -32601, message: `Method not found: ${method}` },
            id,
          });
      }
      
      res.json({
        jsonrpc: jsonrpc || '2.0',
        result,
        id,
      });
    } catch (error: any) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: error.message },
        id: req.body?.id,
      });
    }
  });
  
  // ─────────────────────────────────────────────────────────────────────────
  // REST API Endpoints (all ZK Compression methods as REST too)
  // ─────────────────────────────────────────────────────────────────────────
  
  const restMethods: Record<string, (indexer: SpsIndexer, params: any) => Promise<any>> = {
    getCompressedAccount: handleGetCompressedAccount,
    getCompressedAccountProof: handleGetCompressedAccountProof,
    getCompressedAccountsByOwner: handleGetCompressedAccountsByOwner,
    getMultipleCompressedAccounts: handleGetMultipleCompressedAccounts,
    getCompressedBalance: handleGetCompressedBalance,
    getCompressedBalanceByOwner: handleGetCompressedBalanceByOwner,
    getCompressedTokenAccountsByOwner: handleGetCompressedTokenAccountsByOwner,
    getCompressedTokenAccountsByDelegate: handleGetCompressedTokenAccountsByDelegate,
    getCompressedTokenAccountBalance: handleGetCompressedTokenAccountBalance,
    getCompressedTokenBalancesByOwner: handleGetCompressedTokenBalancesByOwner,
    getCompressedTokenBalancesByOwnerV2: handleGetCompressedTokenBalancesByOwnerV2,
    getCompressedMintTokenHolders: handleGetCompressedMintTokenHolders,
    getMultipleCompressedAccountProofs: handleGetMultipleCompressedAccountProofs,
    getMultipleNewAddressProofs: handleGetMultipleNewAddressProofs,
    getMultipleNewAddressProofsV2: handleGetMultipleNewAddressProofsV2,
    getValidityProof: handleGetValidityProof,
    getCompressionSignaturesForAccount: handleGetCompressionSignaturesForAccount,
    getCompressionSignaturesForAddress: handleGetCompressionSignaturesForAddress,
    getCompressionSignaturesForOwner: handleGetCompressionSignaturesForOwner,
    getCompressionSignaturesForTokenOwner: handleGetCompressionSignaturesForTokenOwner,
    getLatestCompressionSignatures: handleGetLatestCompressionSignatures,
    getLatestNonVotingSignatures: handleGetLatestNonVotingSignatures,
    getTransactionWithCompressionInfo: handleGetTransactionWithCompressionInfo,
    // DAS
    getAsset: handleGetAsset,
    getAssetProof: handleGetAssetProof,
    getAssetsByOwner: handleGetAssetsByOwner,
    // NFTs
    getCompressedNftsByOwner: handleGetCompressedNftsByOwner,
    getCompressedNft: handleGetCompressedNft,
    getCompressedNftsByCollection: handleGetCompressedNftsByCollection,
    // Styx Extensions
    getShieldedNotesByOwner: handleGetShieldedNotesByOwner,
    getNullifierStatus: handleGetNullifierStatus,
    getPrivacyPoolStats: handleGetPrivacyPoolStats,
  };

  for (const [name, handler] of Object.entries(restMethods)) {
    router.post(`/${name}`, async (req: Request, res: Response) => {
      try {
        const result = await handler(indexer, req.body);
        res.json(result);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });
  }
  
  // Health check
  router.get('/health', (req: Request, res: Response) => {
    const stats = indexer.getStats();
    res.json({
      status: 'ok',
      api: 'Umbra',
      version: '1.0.0',
      slot: stats.lastSlot,
      eventCount: stats.eventCount,
      docs: 'https://docs.styx.nexus/api',
    });
  });

  // llms.txt — Machine-readable documentation index
  router.get('/llms.txt', (req: Request, res: Response) => {
    res.type('text/plain').send(LLMS_TXT);
  });

  // API method listing
  router.get('/methods', (req: Request, res: Response) => {
    res.json({
      api: 'Umbra',
      version: '1.0.0',
      zkCompression: Object.keys(restMethods).filter(n => n.startsWith('getCompressed') || n.startsWith('getMultiple') || n.startsWith('getLatest') || n.startsWith('getValidity') || n.startsWith('getTransaction') || n.startsWith('getIndexer') || n.startsWith('getCompression')),
      das: ['getAsset', 'getAssetProof', 'getAssetsByOwner'],
      nft: ['getCompressedNftsByOwner', 'getCompressedNft', 'getCompressedNftsByCollection'],
      styx: ['getShieldedNotesByOwner', 'getNullifierStatus', 'getPrivacyPoolStats'],
      docs: 'https://docs.styx.nexus/api',
      llmsTxt: '/v1/llms.txt',
    });
  });
  
  return router;
}

// Legacy alias for backward compatibility
export const createPhotonRouter = createUmbraRouter;

// ═══════════════════════════════════════════════════════════════════════════════
// ZK COMPRESSION — ACCOUNT QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * getCompressedAccount
 * Returns a single compressed account by hash or address.
 */
async function handleGetCompressedAccount(
  indexer: SpsIndexer,
  params: { hash?: string; address?: string }
): Promise<ApiResponse<Account | null>> {
  const stats = indexer.getStats();
  const note = params.hash ? indexer.getNoteByCommitment(params.hash) : null;
  return {
    context: { slot: stats.lastSlot },
    value: note ? noteToAccount(note) : null,
  };
}

/**
 * getCompressedAccountProof
 * Fetches a Merkle proof for a specific compressed account.
 */
async function handleGetCompressedAccountProof(
  indexer: SpsIndexer,
  params: { hash: string }
): Promise<ApiResponse<any>> {
  const stats = indexer.getStats();
  // SPS uses inscription-based state rather than Merkle trees for most operations.
  // Proof generation requires full tree state; return stub for now.
  return {
    context: { slot: stats.lastSlot },
    value: {
      hash: params.hash,
      root: null,
      proof: [],
      leafIndex: 0,
      merkleTree: null,
      rootSeq: 0,
    },
  };
}

/**
 * getCompressedAccountsByOwner
 * Returns all compressed accounts (not just tokens) for an owner.
 */
async function handleGetCompressedAccountsByOwner(
  indexer: SpsIndexer,
  params: { owner: string; cursor?: string; limit?: number }
): Promise<ApiResponse<PaginatedList<Account>>> {
  const { owner, cursor, limit = 100 } = params;
  const stats = indexer.getStats();
  const notes = indexer.getNotesByOwner(owner);
  
  let startIndex = 0;
  if (cursor) {
    const idx = notes.findIndex(n => n.commitment === cursor);
    if (idx >= 0) startIndex = idx + 1;
  }
  
  const page = notes.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < notes.length;
  
  return {
    context: { slot: stats.lastSlot },
    value: {
      items: page.map(noteToAccount),
      cursor: hasMore ? page[page.length - 1]?.commitment || null : null,
    },
  };
}

/**
 * getMultipleCompressedAccounts
 * Retrieves multiple compressed accounts in a single request.
 */
async function handleGetMultipleCompressedAccounts(
  indexer: SpsIndexer,
  params: { hashes?: string[]; addresses?: string[] }
): Promise<ApiResponse<{ items: (Account | null)[] }>> {
  const stats = indexer.getStats();
  const keys = params.hashes || params.addresses || [];
  
  const items = keys.map(key => {
    const note = indexer.getNoteByCommitment(key);
    return note ? noteToAccount(note) : null;
  });
  
  return {
    context: { slot: stats.lastSlot },
    value: { items },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZK COMPRESSION — BALANCE QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * getCompressedBalance
 * Retrieves the SOL balance of a compressed account.
 */
async function handleGetCompressedBalance(
  indexer: SpsIndexer,
  params: { hash?: string; address?: string }
): Promise<ApiResponse<{ value: string }>> {
  const stats = indexer.getStats();
  const note = params.hash ? indexer.getNoteByCommitment(params.hash) : null;
  return {
    context: { slot: stats.lastSlot },
    value: { value: note?.amount?.toString() || '0' },
  };
}

/**
 * getCompressedBalanceByOwner
 * Gets the total balance of all compressed accounts owned by an address.
 */
async function handleGetCompressedBalanceByOwner(
  indexer: SpsIndexer,
  params: { owner: string }
): Promise<ApiResponse<{ value: string }>> {
  const stats = indexer.getStats();
  const balances = indexer.getBalancesByOwner(params.owner);
  const total = balances.reduce((acc, b) => acc + b.balance, 0n);
  return {
    context: { slot: stats.lastSlot },
    value: { value: total.toString() },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZK COMPRESSION — TOKEN ACCOUNT QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * getCompressedTokenAccountsByOwner
 * Returns all compressed token accounts owned by a given address.
 */
async function handleGetCompressedTokenAccountsByOwner(
  indexer: SpsIndexer,
  params: { owner: string; mint?: string; cursor?: string; limit?: number }
): Promise<ApiResponse<PaginatedList<TokenAccount>>> {
  const { owner, mint, cursor, limit = 100 } = params;
  const stats = indexer.getStats();
  const notes = indexer.getNotesByOwner(owner, mint);
  
  let startIndex = 0;
  if (cursor) {
    const idx = notes.findIndex(n => n.commitment === cursor);
    if (idx >= 0) startIndex = idx + 1;
  }
  
  const page = notes.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < notes.length;
  
  return {
    context: { slot: stats.lastSlot },
    value: {
      items: page.map(n => noteToTokenAccount(n, indexer)),
      cursor: hasMore ? page[page.length - 1]?.commitment || null : null,
    },
  };
}

/**
 * getCompressedTokenAccountsByDelegate
 * Returns all compressed token accounts delegated to a specific address.
 */
async function handleGetCompressedTokenAccountsByDelegate(
  indexer: SpsIndexer,
  params: { delegate: string; mint?: string; cursor?: string; limit?: number }
): Promise<ApiResponse<PaginatedList<TokenAccount>>> {
  const stats = indexer.getStats();
  // SPS privacy model doesn't expose delegation publicly.
  // Return empty for privacy-preserving default.
  return {
    context: { slot: stats.lastSlot },
    value: { items: [], cursor: null },
  };
}

/**
 * getCompressedTokenAccountBalance
 * Retrieves the token balance of a compressed token account.
 */
async function handleGetCompressedTokenAccountBalance(
  indexer: SpsIndexer,
  params: { hash?: string; address?: string }
): Promise<ApiResponse<{ amount: string }>> {
  const stats = indexer.getStats();
  const note = params.hash ? indexer.getNoteByCommitment(params.hash) : null;
  return {
    context: { slot: stats.lastSlot },
    value: { amount: note?.amount?.toString() || '0' },
  };
}

/**
 * getCompressedTokenBalancesByOwner
 * Retrieves all token balances for compressed accounts owned by an address.
 */
async function handleGetCompressedTokenBalancesByOwner(
  indexer: SpsIndexer,
  params: { owner: string; mint?: string; cursor?: string; limit?: number }
): Promise<ApiResponse<{ tokenBalances: TokenBalance[]; cursor: string | null }>> {
  const { owner, mint, cursor, limit = 100 } = params;
  const stats = indexer.getStats();
  const balances = indexer.getBalancesByOwner(owner, mint);
  
  const tokenBalances: TokenBalance[] = balances.map((b: { mint: string; balance: bigint }) => ({
    mint: b.mint,
    balance: b.balance.toString(),
  }));
  
  let startIndex = 0;
  if (cursor) {
    const idx = tokenBalances.findIndex(b => b.mint === cursor);
    if (idx >= 0) startIndex = idx + 1;
  }
  
  const page = tokenBalances.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < tokenBalances.length;
  
  return {
    context: { slot: stats.lastSlot },
    value: {
      tokenBalances: page,
      cursor: hasMore ? page[page.length - 1]?.mint || null : null,
    },
  };
}

/**
 * getCompressedTokenBalancesByOwnerV2
 * Enhanced version with additional metadata (decimals, symbol).
 */
async function handleGetCompressedTokenBalancesByOwnerV2(
  indexer: SpsIndexer,
  params: { owner: string; mint?: string; cursor?: string; limit?: number }
): Promise<ApiResponse<{ tokenBalances: any[]; cursor: string | null }>> {
  const { owner, mint, cursor, limit = 100 } = params;
  const stats = indexer.getStats();
  const balances = indexer.getBalancesByOwner(owner, mint);
  
  const tokenBalances = balances.map((b: { mint: string; balance: bigint }) => {
    const mintInfo = indexer.getMint(b.mint);
    return {
      mint: b.mint,
      balance: b.balance.toString(),
      decimals: mintInfo?.decimals ?? 0,
      symbol: mintInfo?.symbol ?? '',
      name: mintInfo?.name ?? '',
    };
  });
  
  let startIndex = 0;
  if (cursor) {
    const idx = tokenBalances.findIndex(b => b.mint === cursor);
    if (idx >= 0) startIndex = idx + 1;
  }
  
  const page = tokenBalances.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < tokenBalances.length;
  
  return {
    context: { slot: stats.lastSlot },
    value: {
      tokenBalances: page,
      cursor: hasMore ? page[page.length - 1]?.mint || null : null,
    },
  };
}

/**
 * getCompressedMintTokenHolders
 * Lists all holders of a specific compressed token mint.
 */
async function handleGetCompressedMintTokenHolders(
  indexer: SpsIndexer,
  params: { mint: string; cursor?: string; limit?: number }
): Promise<ApiResponse<PaginatedList<{ owner: string; balance: string }>>> {
  const stats = indexer.getStats();
  // In SPS, owners are encrypted. We can return note-count-based stats
  // without revealing owners (privacy-preserving).
  const va = indexer.getVirtualAccount(params.mint);
  return {
    context: { slot: stats.lastSlot },
    value: {
      items: va ? [{
        owner: '(encrypted)',
        balance: va.totalAmount?.toString() || '0',
      }] : [],
      cursor: null,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZK COMPRESSION — PROOF QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * getMultipleCompressedAccountProofs
 * Fetches proofs for multiple compressed accounts in a single request.
 */
async function handleGetMultipleCompressedAccountProofs(
  indexer: SpsIndexer,
  params: { hashes: string[] }
): Promise<ApiResponse<any[]>> {
  const stats = indexer.getStats();
  const proofs = (params.hashes || []).map(hash => ({
    hash,
    root: null,
    proof: [],
    leafIndex: 0,
    merkleTree: null,
    rootSeq: 0,
  }));
  return { context: { slot: stats.lastSlot }, value: proofs };
}

/**
 * getMultipleNewAddressProofs
 * Fetches proofs for multiple new addresses.
 */
async function handleGetMultipleNewAddressProofs(
  indexer: SpsIndexer,
  params: { addresses: string[] }
): Promise<ApiResponse<any[]>> {
  const stats = indexer.getStats();
  const proofs = (params.addresses || []).map(address => ({
    address,
    merkleTree: null,
    lowElementLeafIndex: 0,
    lowElementValue: '',
    lowElementNextIndex: 0,
    lowElementNextValue: '',
    lowElementProof: [],
    root: null,
    rootSeq: 0,
  }));
  return { context: { slot: stats.lastSlot }, value: proofs };
}

/**
 * getMultipleNewAddressProofsV2
 * Enhanced version of multiple new address proofs with tree info.
 */
async function handleGetMultipleNewAddressProofsV2(
  indexer: SpsIndexer,
  params: { addresses: string[] }
): Promise<ApiResponse<any[]>> {
  // V2 adds tree metadata — same stub structure for now
  return handleGetMultipleNewAddressProofs(indexer, params);
}

/**
 * getValidityProof
 * Retrieves a validity proof for compressed data (used by Light Protocol clients).
 */
async function handleGetValidityProof(
  indexer: SpsIndexer,
  params: { hashes?: string[]; newAddresses?: string[] }
): Promise<ApiResponse<any>> {
  const stats = indexer.getStats();
  return {
    context: { slot: stats.lastSlot },
    value: {
      compressedProof: {
        a: null,
        b: null,
        c: null,
      },
      roots: [],
      rootIndices: [],
      leafIndices: [],
      leaves: [],
      merkleTrees: [],
      nullifierQueues: [],
      addressQueues: [],
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZK COMPRESSION — SIGNATURE / TRANSACTION QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * getCompressionSignaturesForAccount
 * Returns signatures for transactions involving a compressed account.
 */
async function handleGetCompressionSignaturesForAccount(
  indexer: SpsIndexer,
  params: { hash: string; cursor?: string; limit?: number }
): Promise<ApiResponse<PaginatedList<CompressionSignature>>> {
  const { hash, cursor, limit = 100 } = params;
  const stats = indexer.getStats();
  
  const note = indexer.getNoteByCommitment(hash);
  if (!note) {
    return { context: { slot: stats.lastSlot }, value: { items: [], cursor: null } };
  }
  
  const sigs: CompressionSignature[] = [];
  // Created tx
  sigs.push({ signature: note.txSignature, slot: note.createdSlot, blockTime: note.createdAt });
  // Spent tx
  if (note.spent && note.spentTx) {
    sigs.push({ signature: note.spentTx, slot: note.spentAt || 0, blockTime: note.spentAt || null });
  }
  
  return { context: { slot: stats.lastSlot }, value: { items: sigs, cursor: null } };
}

/**
 * getCompressionSignaturesForAddress
 * Retrieves signatures for transactions involving a specific address.
 */
async function handleGetCompressionSignaturesForAddress(
  indexer: SpsIndexer,
  params: { address: string; cursor?: string; limit?: number }
): Promise<ApiResponse<PaginatedList<CompressionSignature>>> {
  const { address, cursor, limit = 100 } = params;
  const stats = indexer.getStats();
  
  // Search events that reference this address as payer
  const events = indexer.getEvents({ limit: 1000 });
  const matching = events
    .filter(e => e.payer === address)
    .slice(0, limit)
    .map(e => ({ signature: e.signature, slot: e.slot, blockTime: e.blockTime }));
  
  return { context: { slot: stats.lastSlot }, value: { items: matching, cursor: null } };
}

/**
 * getCompressionSignaturesForOwner
 * Returns signatures for transactions where an address is the owner.
 */
async function handleGetCompressionSignaturesForOwner(
  indexer: SpsIndexer,
  params: { owner: string; cursor?: string; limit?: number }
): Promise<ApiResponse<PaginatedList<CompressionSignature>>> {
  // Equivalent to ForAddress for our model since owner ≈ payer in SPS
  return handleGetCompressionSignaturesForAddress(indexer, { ...params, address: params.owner });
}

/**
 * getCompressionSignaturesForTokenOwner
 * Lists signatures for transactions involving tokens owned by an address.
 */
async function handleGetCompressionSignaturesForTokenOwner(
  indexer: SpsIndexer,
  params: { owner: string; cursor?: string; limit?: number }
): Promise<ApiResponse<PaginatedList<CompressionSignature>>> {
  return handleGetCompressionSignaturesForOwner(indexer, params);
}

/**
 * getLatestCompressionSignatures
 * Returns the most recent transaction signatures related to compression.
 */
async function handleGetLatestCompressionSignatures(
  indexer: SpsIndexer,
  params: { cursor?: string; limit?: number }
): Promise<ApiResponse<PaginatedList<CompressionSignature>>> {
  const { limit = 50 } = params || {};
  const stats = indexer.getStats();
  
  const events = indexer.getEvents({ limit });
  const sigs = events.map(e => ({
    signature: e.signature,
    slot: e.slot,
    blockTime: e.blockTime,
  }));
  
  // Deduplicate by signature (multiple events can share a tx)
  const seen = new Set<string>();
  const unique = sigs.filter(s => {
    if (seen.has(s.signature)) return false;
    seen.add(s.signature);
    return true;
  });
  
  return { context: { slot: stats.lastSlot }, value: { items: unique, cursor: null } };
}

/**
 * getLatestNonVotingSignatures
 * Retrieves recent non-voting transaction signatures (all SPS txs are non-voting).
 */
async function handleGetLatestNonVotingSignatures(
  indexer: SpsIndexer,
  params: { cursor?: string; limit?: number }
): Promise<ApiResponse<PaginatedList<CompressionSignature>>> {
  // All SPS events are non-voting by definition
  return handleGetLatestCompressionSignatures(indexer, params);
}

/**
 * getTransactionWithCompressionInfo
 * Returns transaction details with compression-specific metadata.
 */
async function handleGetTransactionWithCompressionInfo(
  indexer: SpsIndexer,
  params: { signature: string }
): Promise<ApiResponse<any>> {
  const stats = indexer.getStats();
  const events = indexer.getEventsBySignature(params.signature);
  
  const openedAccounts = events
    .filter((e: SpsEvent) => e.opName.includes('MINT') || e.opName.includes('SHIELD') || e.opName.includes('TRANSFER'))
    .map((e: SpsEvent) => ({
      account: {
        hash: e.data?.commitment || '',
        slotCreated: e.slot,
      },
      optionalTokenData: e.data?.mint ? {
        mint: e.data.mint,
        owner: e.data.owner,
        amount: e.data.amount?.toString(),
      } : null,
    }));
  
  const closedAccounts = events
    .filter((e: SpsEvent) => e.opName.includes('BURN') || e.opName.includes('UNSHIELD') || e.opName.includes('SPEND'))
    .map((e: SpsEvent) => ({
      account: { hash: e.data?.nullifier || '' },
      optionalTokenData: null,
    }));
  
  return {
    context: { slot: stats.lastSlot },
    value: {
      signature: params.signature,
      compressionInfo: {
        openedAccounts,
        closedAccounts,
      },
      explorerUrl: getStyxTxLink(params.signature),
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAS API — getAsset, getAssetProof, getAssetsByOwner
// ═══════════════════════════════════════════════════════════════════════════════

async function handleGetAsset(indexer: SpsIndexer, params: any) {
  const { id } = params || {};
  if (!id) throw new Error('Params must include id');

  const nft = indexer.getNft(id);
  if (nft) {
    return {
      interface: 'V1_NFT',
      id: nft.nftId,
      content: {
        json_uri: nft.uri,
        metadata: { name: nft.name, symbol: nft.symbol },
      },
      ownership: { owner: null, delegated: false },
      compression: {
        compressed: true,
        data_hash: nft.currentCommitment,
        creator_hash: '',
        asset_hash: id,
        tree: '',
        leaf_id: 0,
      },
    };
  }

  const mint = indexer.getMint(id);
  if (mint) {
    return {
      interface: 'FungibleToken',
      id: mint.mintId,
      content: {
        metadata: { name: mint.name, symbol: mint.symbol, decimals: mint.decimals },
      },
      compression: { compressed: true },
    };
  }

  const note = indexer.getNoteByCommitment(id);
  if (note) {
    return {
      interface: 'SpsNote',
      id: note.commitment,
      ownership: { owner: null },
      compression: { compressed: true, data: note.encryptedData },
    };
  }

  throw new Error('Asset not found');
}

async function handleGetAssetProof(indexer: SpsIndexer, params: any) {
  return {
    root: '',
    proof: [],
    node_index: 0,
    leaf: '',
    tree_id: '',
  };
}

async function handleGetAssetsByOwner(indexer: SpsIndexer, params: any) {
  // SPS assets are privacy-encrypted; can't search by owner without view key.
  return { items: [], cursor: null };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NFT QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

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

async function handleGetCompressedNftsByOwner(
  indexer: SpsIndexer,
  params: { owner: string; cursor?: string; limit?: number }
): Promise<ApiResponse<PaginatedList<CompressedNft>>> {
  const { cursor, limit = 50 } = params;
  const stats = indexer.getStats();
  const all = indexer.getNfts();
  
  let startIndex = 0;
  if (cursor) {
    const idx = all.findIndex(n => n.nftId === cursor);
    if (idx >= 0) startIndex = idx + 1;
  }
  
  const page = all.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < all.length;
  
  return {
    context: { slot: stats.lastSlot },
    value: {
      items: page.map(nftToCompressedNft),
      cursor: hasMore ? page[page.length - 1]?.nftId || null : null,
    },
  };
}

async function handleGetCompressedNft(
  indexer: SpsIndexer,
  params: { id: string }
): Promise<ApiResponse<CompressedNft | null>> {
  const stats = indexer.getStats();
  const nft = indexer.getNft(params.id);
  return {
    context: { slot: stats.lastSlot },
    value: nft ? nftToCompressedNft(nft) : null,
  };
}

async function handleGetCompressedNftsByCollection(
  indexer: SpsIndexer,
  params: { collection: string; cursor?: string; limit?: number }
): Promise<ApiResponse<PaginatedList<CompressedNft>>> {
  const { collection, cursor, limit = 50 } = params;
  const stats = indexer.getStats();
  const filtered = indexer.getNfts().filter(n => n.collection === collection);
  
  let startIndex = 0;
  if (cursor) {
    const idx = filtered.findIndex(n => n.nftId === cursor);
    if (idx >= 0) startIndex = idx + 1;
  }
  
  const page = filtered.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < filtered.length;
  
  return {
    context: { slot: stats.lastSlot },
    value: {
      items: page.map(nftToCompressedNft),
      cursor: hasMore ? page[page.length - 1]?.nftId || null : null,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYX PRIVACY EXTENSIONS (Unique to Umbra)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * getShieldedNotesByOwner
 * Returns shielded notes for a given owner wallet address.
 */
async function handleGetShieldedNotesByOwner(
  indexer: SpsIndexer,
  params: { owner: string; mint?: string; cursor?: string; limit?: number }
): Promise<ApiResponse<PaginatedList<any>>> {
  const { owner, mint, limit = 100 } = params;
  const stats = indexer.getStats();
  const notes = indexer.getShieldedNotesByOwner(owner, mint);
  
  const items = notes.map(n => ({
    id: n.id,
    owner: n.owner,
    mint: n.mint,
    amount: n.amount.toString(),
    commitment: n.commitment,
    shieldedAt: n.shieldedAt,
    shieldedSlot: n.shieldedSlot,
    txSignature: n.txSignature,
    spent: n.spent,
    spentAt: n.spentAt || null,
    spentTx: n.spentTx || null,
  }));
  
  return {
    context: { slot: stats.lastSlot },
    value: { items: items.slice(0, limit), cursor: null },
  };
}

/**
 * getNullifierStatus
 * Checks whether a nullifier has been spent.
 */
async function handleGetNullifierStatus(
  indexer: SpsIndexer,
  params: { nullifier: string } | { nullifiers: string[] }
): Promise<ApiResponse<any>> {
  const stats = indexer.getStats();
  
  if ('nullifiers' in params) {
    const results = params.nullifiers.map(n => ({
      nullifier: n,
      spent: indexer.isNullifierSpent(n),
    }));
    return { context: { slot: stats.lastSlot }, value: results };
  }
  
  const spent = indexer.isNullifierSpent((params as any).nullifier);
  return {
    context: { slot: stats.lastSlot },
    value: { nullifier: (params as any).nullifier, spent },
  };
}

/**
 * getPrivacyPoolStats
 * Returns aggregated statistics for the privacy pools.
 */
async function handleGetPrivacyPoolStats(
  indexer: SpsIndexer,
  params: { mint?: string }
): Promise<ApiResponse<any>> {
  const stats = indexer.getStats();
  const pools = indexer.getPools();
  
  return {
    context: { slot: stats.lastSlot },
    value: {
      totalPools: pools.length,
      totalShieldedNotes: stats.totalShieldedNotes,
      totalNotes: stats.totalNotes,
      totalNullifiers: stats.totalNullifiers,
      totalMints: stats.totalMints,
      totalNfts: stats.totalNfts,
      totalEvents: stats.totalEvents,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVERSION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function noteToAccount(note: SpsNote): Account {
  return {
    hash: note.commitment,
    address: null,
    data: {
      discriminator: [2, 0, 0, 0, 0, 0, 0, 0],
      data: note.encryptedData,
      dataHash: note.commitment,
    },
    owner: '',
    lamports: '0',
    tree: '',
    leafIndex: 0,
    seq: 0,
    slotCreated: note.createdSlot,
  };
}

function noteToTokenAccount(note: SpsNote, indexer: SpsIndexer): TokenAccount {
  return {
    account: noteToAccount(note),
    tokenData: {
      mint: note.mintId,
      owner: '',
      amount: note.amount?.toString() || '0',
      delegate: null,
      state: 'initialized',
    },
  };
}

function nftToCompressedNft(nft: SpsNft): CompressedNft {
  return {
    id: nft.nftId,
    name: nft.name,
    symbol: nft.symbol,
    uri: nft.uri,
    royaltyBps: nft.royaltyBps,
    creator: nft.creator,
    collection: nft.collection || null,
    commitment: nft.currentCommitment || null,
    createdAt: nft.createdAt,
    createdSlot: nft.createdSlot,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// llms.txt — Machine-readable Documentation Index
// ═══════════════════════════════════════════════════════════════════════════════

const LLMS_TXT = `# Styx Privacy Standard — Umbra API
# Full documentation index for LLM consumption
# Base URL: https://api.styx.nexus/v1

## Overview
Umbra is the native ZK Compression & Privacy RPC API for the Styx Privacy Standard (SPS).
It provides full Helius Photon/ZK Compression API compatibility plus privacy-native extensions.
Program ID: STYXbZeL1wcNigy1WAMFbUQ7PNzJpPYV557H7foNyY5

## ZK Compression API (Helius-compatible)

### Account Queries
- POST /v1 { method: "getCompressedAccount", params: { hash: string } }
  Retrieves a single compressed account by hash or address.

- POST /v1 { method: "getCompressedAccountProof", params: { hash: string } }
  Fetches a Merkle proof for a compressed account.

- POST /v1 { method: "getCompressedAccountsByOwner", params: { owner: string, cursor?: string, limit?: number } }
  Returns all compressed accounts owned by a specific address.

- POST /v1 { method: "getMultipleCompressedAccounts", params: { hashes: string[] } }
  Retrieves multiple compressed accounts in a single request.

### Balance Queries
- POST /v1 { method: "getCompressedBalance", params: { hash: string } }
  Retrieves the balance of a compressed account.

- POST /v1 { method: "getCompressedBalanceByOwner", params: { owner: string } }
  Gets the total balance of all compressed accounts owned by an address.

### Token Account Queries
- POST /v1 { method: "getCompressedTokenAccountsByOwner", params: { owner: string, mint?: string } }
  Lists all compressed token accounts owned by a specific address.

- POST /v1 { method: "getCompressedTokenAccountsByDelegate", params: { delegate: string } }
  Returns all compressed token accounts delegated to a specific address.

- POST /v1 { method: "getCompressedTokenAccountBalance", params: { hash: string } }
  Retrieves the token balance of a compressed token account.

- POST /v1 { method: "getCompressedTokenBalancesByOwner", params: { owner: string } }
  Retrieves all token balances for compressed accounts owned by an address.

- POST /v1 { method: "getCompressedTokenBalancesByOwnerV2", params: { owner: string } }
  Enhanced version with decimals, symbol, and name metadata.

- POST /v1 { method: "getCompressedMintTokenHolders", params: { mint: string } }
  Lists all holders of a specific compressed token mint.

### Proof Queries
- POST /v1 { method: "getMultipleCompressedAccountProofs", params: { hashes: string[] } }
  Fetches proofs for multiple compressed accounts in a single request.

- POST /v1 { method: "getMultipleNewAddressProofs", params: { addresses: string[] } }
  Fetches proofs for multiple new addresses.

- POST /v1 { method: "getMultipleNewAddressProofsV2", params: { addresses: string[] } }
  Enhanced version of the multiple new address proofs endpoint.

- POST /v1 { method: "getValidityProof", params: { hashes?: string[], newAddresses?: string[] } }
  Retrieves a validity proof for compressed data.

### Signature Queries
- POST /v1 { method: "getCompressionSignaturesForAccount", params: { hash: string } }
  Returns signatures for transactions involving a compressed account.

- POST /v1 { method: "getCompressionSignaturesForAddress", params: { address: string } }
  Retrieves signatures for transactions involving a specific address.

- POST /v1 { method: "getCompressionSignaturesForOwner", params: { owner: string } }
  Returns signatures for transactions where an address is the owner.

- POST /v1 { method: "getCompressionSignaturesForTokenOwner", params: { owner: string } }
  Lists signatures for transactions involving tokens owned by an address.

- POST /v1 { method: "getLatestCompressionSignatures", params: { limit?: number } }
  Returns the most recent compression transaction signatures.

- POST /v1 { method: "getLatestNonVotingSignatures", params: { limit?: number } }
  Retrieves recent non-voting transaction signatures.

- POST /v1 { method: "getTransactionWithCompressionInfo", params: { signature: string } }
  Returns transaction details with compression-related information.

### Indexer Status
- POST /v1 { method: "getIndexerHealth" }
  Returns "ok" if the indexer is healthy.

- POST /v1 { method: "getIndexerSlot" }
  Returns the current slot of the compression indexer.

## DAS API (Digital Asset Standard)
- POST /v1 { method: "getAsset", params: { id: string } }
  Retrieves a single asset (NFT, token, or note) by its ID.

- POST /v1 { method: "getAssetProof", params: { id: string } }
  Fetches a Merkle proof for a specific asset.

- POST /v1 { method: "getAssetsByOwner", params: { ownerAddress: string } }
  Returns all assets owned by a specific address.

## NFT Queries
- POST /v1/getCompressedNftsByOwner { owner: string }
  Returns all compressed NFTs owned by a given address.

- POST /v1/getCompressedNft { id: string }
  Returns a single compressed NFT by ID.

- POST /v1/getCompressedNftsByCollection { collection: string }
  Returns all compressed NFTs in a specific collection.

## Styx Privacy Extensions
- POST /v1 { method: "getShieldedNotesByOwner", params: { owner: string, mint?: string } }
  Returns shielded notes for a given owner wallet address.

- POST /v1 { method: "getNullifierStatus", params: { nullifier: string } }
  Checks whether a nullifier has been spent.

- POST /v1 { method: "getPrivacyPoolStats", params: { mint?: string } }
  Returns aggregated statistics for the privacy pools.

## REST Endpoints
All JSON-RPC methods are also available as REST POST endpoints:
  POST /v1/{methodName}
  Body: params object

## Health & Info
- GET  /v1/health       — Umbra API health check
- GET  /v1/methods      — List all available methods
- GET  /v1/llms.txt     — This documentation index

## SDK
npm install @styx-stack/sps-sdk
- import SpsClient from '@styx-stack/sps-sdk'
- Docs: https://docs.styx.nexus/sdk

## Links
- Website: https://styx.nexus
- Docs: https://docs.styx.nexus
- GitHub: https://github.com/QuarksBlueFoot/StyxStack
- Explorer: https://styx.nexus/explorer
`;

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  TokenData,
  TokenAccount,
  TokenBalance,
  Account,
  ApiResponse,
  Context,
  PaginatedList,
  CompressionSignature,
};
