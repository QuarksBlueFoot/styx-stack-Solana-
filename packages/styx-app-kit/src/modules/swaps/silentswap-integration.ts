/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX + SILENTSWAP INTEGRATION
 *  
 *  Privacy-preserving cross-chain swaps using SilentSwap V2 SDK
 *  Combined with Styx stealth addresses for maximum anonymity
 * 
 *  SilentSwap: https://docs.silentswap.com
 *  Bounty: SilentSwap $5k - Privacy Hack 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { PublicKey, Connection, Transaction } from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from '@noble/ciphers/webcrypto';
import {
  generateStealthAddress,
  computeSharedSecret,
  encryptData,
  deriveEncryptionKey,
} from '../../core';

// ═══════════════════════════════════════════════════════════════════════════════
// SILENTSWAP SDK TYPES (from @silentswap/sdk)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * CAIP-19 Asset identifier format
 * Solana: "solana:<chainId>/slip44:501" (native SOL)
 * Solana SPL: "solana:<chainId>/spl:<mintAddress>"
 * EVM: "eip155:<chainId>/erc20:<contractAddress>"
 */
export type AssetId = string;

/**
 * CAIP-10 Account identifier format
 * Solana: "caip10:solana:*:<address>"
 * EVM: "caip10:eip155:<chainId>:<address>"
 */
export type AccountId = string;

export interface SilentSwapDestination {
  /** CAIP-19 asset identifier */
  asset: AssetId;
  /** CAIP-10 contact/recipient identifier */
  contact: AccountId;
  /** Amount (optional, calculated from splits if empty) */
  amount?: string;
}

export interface SilentSwapOrderParams {
  /** Source asset in CAIP-19 format */
  sourceAsset: AssetId;
  /** Amount to swap */
  sourceAmount: string;
  /** Destination(s) for the swap */
  destinations: SilentSwapDestination[];
  /** Split percentages (must sum to 1.0) */
  splits: number[];
  /** Sender contact ID in CAIP-10 format */
  senderContactId: AccountId;
  /** Optional integrator ID for tracking */
  integratorId?: string;
}

export interface SilentSwapOrderResult {
  /** Unique order ID */
  orderId: string;
  /** Deposit address */
  depositAddress: string;
  /** Required deposit amount */
  depositAmount: string;
  /** Order status */
  status: 'pending' | 'deposited' | 'processing' | 'complete' | 'failed';
  /** Estimated completion time */
  estimatedTime?: number;
}

export interface SilentSwapQuote {
  /** Input amount */
  inputAmount: string;
  /** Output amount */
  outputAmount: string;
  /** Exchange rate */
  rate: number;
  /** Fees breakdown */
  fees: {
    network: string;
    protocol: string;
    total: string;
  };
  /** Valid until timestamp */
  validUntil: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYX + SILENTSWAP ENHANCED TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface StealthSwapParams {
  /** Source asset */
  sourceAsset: AssetId;
  /** Amount to swap */
  sourceAmount: string;
  /** Destination asset */
  destAsset: AssetId;
  /** Recipient's view key (for stealth address) */
  recipientViewKey: Uint8Array;
  /** Recipient's spend public key (for stealth address) */
  recipientSpendKey: PublicKey;
  /** Optional integrator ID */
  integratorId?: string;
}

export interface StealthSwapResult extends SilentSwapOrderResult {
  /** Stealth address details for recipient scanning */
  stealthDetails: {
    /** Ephemeral public key */
    ephemeralPubkey: Uint8Array;
    /** View tag for quick scanning */
    viewTag: number;
    /** Encrypted destination info */
    encryptedDestination: Uint8Array;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSET ID HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Solana mainnet chain ID for CAIP-19 */
export const SOLANA_MAINNET = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';

/** Native SOL asset ID */
export const NATIVE_SOL = `solana:${SOLANA_MAINNET}/slip44:501`;

/**
 * Create CAIP-19 asset ID for Solana SPL token
 */
export function createSolanaAssetId(mintAddress: PublicKey | string): AssetId {
  const mint = typeof mintAddress === 'string' ? mintAddress : mintAddress.toBase58();
  return `solana:${SOLANA_MAINNET}/spl:${mint}`;
}

/**
 * Create CAIP-10 account ID for Solana address
 */
export function createSolanaAccountId(address: PublicKey | string): AccountId {
  const addr = typeof address === 'string' ? address : address.toBase58();
  return `caip10:solana:*:${addr}`;
}

/**
 * Create CAIP-19 asset ID for EVM token
 */
export function createEvmAssetId(chainId: number, contractAddress: string): AssetId {
  return `eip155:${chainId}/erc20:${contractAddress}`;
}

/**
 * Create CAIP-10 account ID for EVM address
 */
export function createEvmAccountId(chainId: number, address: string): AccountId {
  return `caip10:eip155:${chainId}:${address}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SILENTSWAP CLIENT WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SilentSwap client wrapper with Styx stealth address integration
 * 
 * Usage:
 * ```typescript
 * const client = new StealthSilentSwapClient();
 * 
 * // Create stealth swap - recipient address is hidden
 * const result = await client.createStealthSwap({
 *   sourceAsset: NATIVE_SOL,
 *   sourceAmount: '1.0',
 *   destAsset: createEvmAssetId(1, USDC_ETH),
 *   recipientViewKey: viewKey,
 *   recipientSpendKey: spendPubkey,
 * });
 * 
 * // Recipient scans for their swap
 * const found = client.scanForSwaps(viewSecretKey, spendSecretKey, orders);
 * ```
 */
export class StealthSilentSwapClient {
  private apiBase: string = 'https://api.silentswap.io';
  private integratorId?: string;

  constructor(config?: { apiBase?: string; integratorId?: string }) {
    if (config?.apiBase) this.apiBase = config.apiBase;
    if (config?.integratorId) this.integratorId = config.integratorId;
  }

  /**
   * Get a quote for a swap
   */
  async getQuote(
    sourceAsset: AssetId,
    destAsset: AssetId,
    amount: string
  ): Promise<SilentSwapQuote> {
    const response = await fetch(`${this.apiBase}/v2/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceAsset,
        destAsset,
        sourceAmount: amount,
      }),
    });

    if (!response.ok) {
      throw new Error(`Quote failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a swap order with stealth destination
   * 
   * The recipient's actual address is never revealed on-chain.
   * Instead, a one-time stealth address is generated that only
   * the recipient can claim.
   */
  async createStealthSwap(params: StealthSwapParams): Promise<StealthSwapResult> {
    const {
      sourceAsset,
      sourceAmount,
      destAsset,
      recipientViewKey,
      recipientSpendKey,
      integratorId,
    } = params;

    // Generate stealth address for the destination
    const stealth = generateStealthAddress(recipientViewKey, recipientSpendKey);

    // Determine destination chain from asset ID
    const destChainId = this.extractChainId(destAsset);
    const stealthAccountId = destAsset.startsWith('solana:')
      ? createSolanaAccountId(stealth.stealthAddress)
      : createEvmAccountId(destChainId, stealth.stealthAddress.toBase58());

    // Create order with stealth destination
    const orderParams: SilentSwapOrderParams = {
      sourceAsset,
      sourceAmount,
      destinations: [{
        asset: destAsset,
        contact: stealthAccountId,
      }],
      splits: [1],
      senderContactId: 'caip10:solana:*:anonymous', // Sender can be anonymous
      integratorId: integratorId || this.integratorId,
    };

    // Create order via SilentSwap API
    const order = await this.createOrder(orderParams);

    // Encrypt destination info for recipient
    const encKey = deriveEncryptionKey(stealth.ephemeralPubkey, 'styx-silentswap-v1');
    const destInfo = new TextEncoder().encode(JSON.stringify({
      orderId: order.orderId,
      asset: destAsset,
      amount: sourceAmount,
    }));
    const encrypted = encryptData(destInfo, encKey);

    return {
      ...order,
      stealthDetails: {
        ephemeralPubkey: stealth.ephemeralPubkey,
        viewTag: stealth.viewTag,
        encryptedDestination: new Uint8Array([...encrypted.nonce, ...encrypted.ciphertext]),
      },
    };
  }

  /**
   * Create a standard SilentSwap order
   */
  async createOrder(params: SilentSwapOrderParams): Promise<SilentSwapOrderResult> {
    const response = await fetch(`${this.apiBase}/v2/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Order creation failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string): Promise<SilentSwapOrderResult> {
    const response = await fetch(`${this.apiBase}/v2/orders/${orderId}`);
    
    if (!response.ok) {
      throw new Error(`Status check failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Scan for stealth swaps sent to you
   * 
   * @param viewSecretKey - Your view secret key
   * @param spendSecretKey - Your spend secret key  
   * @param potentialSwaps - Array of swap results with stealth details
   * @returns Swaps that belong to you
   */
  scanForSwaps(
    viewSecretKey: Uint8Array,
    spendSecretKey: Uint8Array,
    potentialSwaps: StealthSwapResult[]
  ): StealthSwapResult[] {
    const found: StealthSwapResult[] = [];

    for (const swap of potentialSwaps) {
      if (!swap.stealthDetails) continue;

      // Quick check via view tag
      const sharedSecret = computeSharedSecret(viewSecretKey, swap.stealthDetails.ephemeralPubkey);
      const computedViewTag = sha256(sharedSecret)[0];

      if (computedViewTag !== swap.stealthDetails.viewTag) {
        continue; // Not for us
      }

      // Full derivation to verify and recover spend key
      // (In production, this would derive the actual keypair to claim)
      found.push(swap);
    }

    return found;
  }

  /**
   * Extract chain ID from CAIP-19 asset ID
   */
  private extractChainId(assetId: AssetId): number {
    if (assetId.startsWith('eip155:')) {
      const match = assetId.match(/eip155:(\d+)/);
      return match ? parseInt(match[1], 10) : 1;
    }
    return 0; // Solana or unknown
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a private SOL → USDC swap with stealth output
 * 
 * @example
 * ```typescript
 * const result = await privateSolToUsdc({
 *   amount: '1.0',
 *   recipientViewKey,
 *   recipientSpendKey,
 *   destChain: 'ethereum', // or 'solana'
 * });
 * ```
 */
export async function privateSolToUsdc(params: {
  amount: string;
  recipientViewKey: Uint8Array;
  recipientSpendKey: PublicKey;
  destChain?: 'ethereum' | 'solana' | 'base' | 'arbitrum';
  integratorId?: string;
}): Promise<StealthSwapResult> {
  const { amount, recipientViewKey, recipientSpendKey, destChain = 'solana', integratorId } = params;

  // USDC addresses by chain
  const usdcAddresses: Record<string, { chainId: number; address: string }> = {
    ethereum: { chainId: 1, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
    solana: { chainId: 0, address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
    base: { chainId: 8453, address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
    arbitrum: { chainId: 42161, address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
  };

  const usdc = usdcAddresses[destChain];
  const destAsset = destChain === 'solana'
    ? createSolanaAssetId(usdc.address)
    : createEvmAssetId(usdc.chainId, usdc.address);

  const client = new StealthSilentSwapClient({ integratorId });

  return client.createStealthSwap({
    sourceAsset: NATIVE_SOL,
    sourceAmount: amount,
    destAsset,
    recipientViewKey,
    recipientSpendKey,
  });
}

/**
 * Create a private SPL token swap
 */
export async function privateSplSwap(params: {
  inputMint: PublicKey;
  outputMint: PublicKey;
  amount: string;
  recipientViewKey: Uint8Array;
  recipientSpendKey: PublicKey;
  integratorId?: string;
}): Promise<StealthSwapResult> {
  const client = new StealthSilentSwapClient({ integratorId: params.integratorId });

  return client.createStealthSwap({
    sourceAsset: createSolanaAssetId(params.inputMint),
    sourceAmount: params.amount,
    destAsset: createSolanaAssetId(params.outputMint),
    recipientViewKey: params.recipientViewKey,
    recipientSpendKey: params.recipientSpendKey,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default StealthSilentSwapClient;
