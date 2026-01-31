/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX RPC PROVIDERS
 *  
 *  Multi-provider RPC abstraction for Solana:
 *  - Helius (recommended) - Enhanced parsing, DAS API, WebSocket
 *  - QuickNode - Low latency, Streams, Functions
 *  - Alchemy - Webhook support, NFT API  
 *  - Triton - Geyser gRPC
 *  - Custom - Any Solana RPC endpoint
 * 
 *  Used for Helius ($5k) and QuickNode ($3k) bounties
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Connection, PublicKey, Commitment } from '@solana/web3.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type RpcProvider = 'helius' | 'quicknode' | 'alchemy' | 'triton' | 'custom';

export interface RpcConfig {
  /** HTTP RPC endpoint */
  rpcUrl: string;
  /** WebSocket endpoint (optional, derived from HTTP if not set) */
  wsUrl?: string;
  /** Provider type (auto-detected if not set) */
  provider?: RpcProvider;
  /** Commitment level */
  commitment?: Commitment;
  /** API key (for provider-specific features) */
  apiKey?: string;
}

export interface ProviderCapabilities {
  /** Supports enhanced transaction parsing */
  enhancedParsing: boolean;
  /** Supports DAS API for compressed NFTs */
  dasApi: boolean;
  /** Supports WebSocket subscriptions */
  webSocket: boolean;
  /** Supports priority fee estimation */
  priorityFees: boolean;
  /** Supports NFT/token metadata API */
  metadataApi: boolean;
  /** Supports Geyser gRPC */
  geyserGrpc: boolean;
}

export interface PriorityFees {
  /** Low priority (25th percentile) */
  low: number;
  /** Medium priority (50th percentile) */
  medium: number;
  /** High priority (75th percentile) */
  high: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Auto-detect provider from RPC URL
 */
export function detectProvider(rpcUrl: string): RpcProvider {
  const url = rpcUrl.toLowerCase();
  
  if (url.includes('helius')) return 'helius';
  if (url.includes('quicknode') || url.includes('quiknode')) return 'quicknode';
  if (url.includes('alchemy')) return 'alchemy';
  if (url.includes('triton') || url.includes('rpcpool')) return 'triton';
  
  return 'custom';
}

/**
 * Get provider capabilities
 */
export function getProviderCapabilities(provider: RpcProvider): ProviderCapabilities {
  switch (provider) {
    case 'helius':
      return {
        enhancedParsing: true,
        dasApi: true,
        webSocket: true,
        priorityFees: true,
        metadataApi: true,
        geyserGrpc: true,
      };
    case 'quicknode':
      return {
        enhancedParsing: false,
        dasApi: false,
        webSocket: true,
        priorityFees: true,
        metadataApi: true,
        geyserGrpc: true,
      };
    case 'alchemy':
      return {
        enhancedParsing: false,
        dasApi: false,
        webSocket: true,
        priorityFees: true,
        metadataApi: true,
        geyserGrpc: false,
      };
    case 'triton':
      return {
        enhancedParsing: false,
        dasApi: false,
        webSocket: true,
        priorityFees: true,
        metadataApi: false,
        geyserGrpc: true,
      };
    default:
      return {
        enhancedParsing: false,
        dasApi: false,
        webSocket: true,
        priorityFees: false,
        metadataApi: false,
        geyserGrpc: false,
      };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RPC CONNECTION FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a configured RPC connection with provider-specific optimizations
 */
export function createRpcConnection(config: RpcConfig): Connection {
  const { rpcUrl, wsUrl, commitment = 'confirmed' } = config;
  
  // Derive WebSocket URL if not provided
  const derivedWsUrl = wsUrl || deriveWsUrl(rpcUrl);
  
  return new Connection(rpcUrl, {
    commitment,
    wsEndpoint: derivedWsUrl,
    confirmTransactionInitialTimeout: 60000,
  });
}

/**
 * Derive WebSocket URL from HTTP URL
 */
function deriveWsUrl(httpUrl: string): string {
  return httpUrl
    .replace('https://', 'wss://')
    .replace('http://', 'ws://');
}

/**
 * Extract API key from URL query string
 */
function extractApiKey(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('api-key') || undefined;
  } catch {
    return undefined;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELIUS-SPECIFIC FEATURES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Helius: Enhanced transaction parsing
 * @see https://docs.helius.dev/solana-apis/enhanced-transactions-api
 */
export async function heliusParseTransactions(
  apiKey: string,
  signatures: string[],
  cluster: 'mainnet-beta' | 'devnet' = 'mainnet-beta'
): Promise<HeliusTransaction[]> {
  const baseUrl = cluster === 'devnet' 
    ? 'https://api-devnet.helius.xyz'
    : 'https://api.helius.xyz';
    
  const response = await fetch(`${baseUrl}/v0/transactions?api-key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactions: signatures }),
  });
  
  if (!response.ok) {
    throw new Error(`Helius API error: ${response.status}`);
  }
  
  return await response.json() as HeliusTransaction[];
}

export interface HeliusTransaction {
  signature: string;
  type: string;
  source: string;
  fee: number;
  feePayer: string;
  slot: number;
  timestamp: number;
  nativeTransfers: any[];
  tokenTransfers: any[];
  instructions: any[];
  events: any;
}

/**
 * Helius: DAS API for compressed NFTs and token metadata
 * @see https://docs.helius.dev/compression-and-das-api/digital-asset-standard-das-api
 */
export async function heliusGetAssetsByOwner(
  apiKey: string,
  owner: string,
  cluster: 'mainnet-beta' | 'devnet' = 'mainnet-beta'
): Promise<HeliusAsset[]> {
  const baseUrl = cluster === 'devnet'
    ? `https://devnet.helius-rpc.com/?api-key=${apiKey}`
    : `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
    
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'styx-sdk',
      method: 'getAssetsByOwner',
      params: {
        ownerAddress: owner,
        page: 1,
        limit: 1000,
      },
    }),
  });
  
  const result = await response.json() as { result: { items: HeliusAsset[] } };
  return result.result?.items || [];
}

export interface HeliusAsset {
  id: string;
  interface: string;
  content: {
    json_uri: string;
    metadata: {
      name: string;
      symbol: string;
      description?: string;
    };
  };
  authorities: any[];
  compression?: {
    eligible: boolean;
    compressed: boolean;
    tree: string;
    leaf_id: number;
  };
  ownership: {
    owner: string;
  };
}

/**
 * Helius: Get priority fee estimate
 */
export async function heliusGetPriorityFee(
  apiKey: string,
  cluster: 'mainnet-beta' | 'devnet' = 'mainnet-beta'
): Promise<PriorityFees> {
  const baseUrl = cluster === 'devnet'
    ? `https://devnet.helius-rpc.com/?api-key=${apiKey}`
    : `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
    
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'styx-sdk',
      method: 'getPriorityFeeEstimate',
      params: [{
        accountKeys: [],
        options: {
          priorityLevel: 'Medium',
        },
      }],
    }),
  });
  
  const result = await response.json() as { result: { priorityFeeEstimate: number } };
  const fee = result.result?.priorityFeeEstimate || 10000;
  
  return {
    low: Math.floor(fee * 0.5),
    medium: fee,
    high: Math.floor(fee * 2),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICKNODE-SPECIFIC FEATURES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * QuickNode: Get recent priority fees
 * Works with any Solana RPC but optimized for QuickNode
 */
export async function quicknodeGetPriorityFees(
  connection: Connection,
  accounts: PublicKey[] = []
): Promise<PriorityFees> {
  try {
    // Use the standard getRecentPrioritizationFees RPC method
    const fees = await (connection as any).getRecentPrioritizationFees(
      accounts.length > 0 ? accounts.map(a => ({ pubkey: a })) : undefined
    );
    
    if (!fees || fees.length === 0) {
      return { low: 1000, medium: 10000, high: 100000 };
    }
    
    // Sort and get percentiles
    const sorted = fees
      .map((f: any) => f.prioritizationFee)
      .sort((a: number, b: number) => a - b);
      
    return {
      low: sorted[Math.floor(sorted.length * 0.25)] || 1000,
      medium: sorted[Math.floor(sorted.length * 0.5)] || 10000,
      high: sorted[Math.floor(sorted.length * 0.75)] || 100000,
    };
  } catch {
    return { low: 1000, medium: 10000, high: 100000 };
  }
}

/**
 * QuickNode: Get token metadata (if Metaplex add-on enabled)
 * @see https://www.quicknode.com/docs/solana/qn_fetchNFTs
 */
export async function quicknodeGetNFTs(
  endpoint: string,
  owner: string
): Promise<QuickNodeNFT[]> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'styx-sdk',
      method: 'qn_fetchNFTs',
      params: {
        wallet: owner,
        page: 1,
        perPage: 100,
      },
    }),
  });
  
  const result = await response.json() as { result: { assets: QuickNodeNFT[] } };
  return result.result?.assets || [];
}

export interface QuickNodeNFT {
  name: string;
  collectionName: string;
  tokenAddress: string;
  collectionAddress: string;
  imageUrl: string;
  traits: { trait_type: string; value: string }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED RPC CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Unified RPC client with provider-specific optimizations
 */
export class StyxRpcClient {
  readonly connection: Connection;
  readonly provider: RpcProvider;
  readonly capabilities: ProviderCapabilities;
  readonly apiKey?: string;
  readonly cluster: 'mainnet-beta' | 'devnet';
  
  constructor(config: RpcConfig & { cluster?: 'mainnet-beta' | 'devnet' }) {
    this.provider = config.provider || detectProvider(config.rpcUrl);
    this.capabilities = getProviderCapabilities(this.provider);
    this.apiKey = config.apiKey || extractApiKey(config.rpcUrl);
    this.cluster = config.cluster || 'mainnet-beta';
    this.connection = createRpcConnection(config);
  }
  
  /**
   * Get priority fee estimate using best available method
   */
  async getPriorityFees(accounts?: PublicKey[]): Promise<PriorityFees> {
    if (this.provider === 'helius' && this.apiKey) {
      return heliusGetPriorityFee(this.apiKey, this.cluster);
    }
    return quicknodeGetPriorityFees(this.connection, accounts);
  }
  
  /**
   * Parse transactions with enhanced data if available
   */
  async parseTransactions(signatures: string[]): Promise<HeliusTransaction[] | null> {
    if (this.capabilities.enhancedParsing && this.apiKey) {
      return heliusParseTransactions(this.apiKey, signatures, this.cluster);
    }
    return null;
  }
  
  /**
   * Get assets by owner using DAS API if available
   */
  async getAssetsByOwner(owner: string): Promise<HeliusAsset[] | null> {
    if (this.capabilities.dasApi && this.apiKey) {
      return heliusGetAssetsByOwner(this.apiKey, owner, this.cluster);
    }
    return null;
  }
  
  /**
   * Get NFTs using best available method
   */
  async getNFTs(owner: string): Promise<QuickNodeNFT[] | HeliusAsset[] | null> {
    if (this.provider === 'helius' && this.apiKey) {
      return heliusGetAssetsByOwner(this.apiKey, owner, this.cluster);
    }
    if (this.provider === 'quicknode') {
      // QuickNode requires the endpoint URL
      return quicknodeGetNFTs(this.connection.rpcEndpoint, owner);
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default StyxRpcClient;
