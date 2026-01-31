/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX PAYMENT LINKS + SILENTSWAP
 *  
 *  Send payments via email or shareable links using SilentSwap for privacy
 *  Recipients claim to any wallet without revealing their identity
 * 
 *  Features:
 *  - Email-based payments (recipient doesn't need wallet upfront)
 *  - Shareable claim links (URL-based claiming)
 *  - SilentSwap cross-chain routing for maximum privacy
 *  - Stealth address integration for unlinkable claims
 * 
 *  Bounty: SilentSwap $5k - Privacy Hack 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { PublicKey, Connection, Keypair, Transaction } from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from '@noble/ciphers/webcrypto';
import bs58 from 'bs58';
import {
  generateStealthAddress,
  computeSharedSecret,
  encryptData,
  decryptData,
  deriveEncryptionKey,
  generateX25519Keypair,
} from '../../core';
import {
  StealthSilentSwapClient,
  NATIVE_SOL,
  createSolanaAssetId,
  createSolanaAccountId,
  AssetId,
} from '../swaps/silentswap-integration';

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT LINK TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PaymentLinkParams {
  /** Amount to send */
  amount: string;
  /** Token mint address (or 'SOL' for native) */
  token: string;
  /** Recipient email (optional - for email delivery) */
  recipientEmail?: string;
  /** Message to include */
  message?: string;
  /** Expiration in hours (default 72) */
  expiresInHours?: number;
  /** Use SilentSwap for cross-chain routing */
  useSilentSwap?: boolean;
  /** Destination chain (if using SilentSwap) */
  destChain?: 'solana' | 'ethereum' | 'base' | 'arbitrum';
}

export interface PaymentLink {
  /** Unique link ID */
  id: string;
  /** Full claim URL */
  claimUrl: string;
  /** Secret claim code (embedded in URL) */
  claimCode: string;
  /** Ephemeral keypair for claim derivation */
  ephemeralKeypair: {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  };
  /** Escrow address (where funds are held) */
  escrowAddress: string;
  /** Amount */
  amount: string;
  /** Token */
  token: string;
  /** Expiration timestamp */
  expiresAt: number;
  /** Status */
  status: 'pending' | 'funded' | 'claimed' | 'expired' | 'refunded';
  /** Optional message */
  message?: string;
}

export interface ClaimParams {
  /** Claim code from URL */
  claimCode: string;
  /** Recipient wallet address */
  recipientAddress: string;
  /** Optional recipient signature for verification */
  signature?: Uint8Array;
}

export interface ClaimResult {
  /** Whether claim was successful */
  success: boolean;
  /** Transaction signature */
  txSignature?: string;
  /** Error message if failed */
  error?: string;
  /** Claimed amount */
  amount?: string;
  /** Token symbol */
  token?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT LINK CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Payment Links Client
 * 
 * Enables sending crypto via shareable links or email:
 * 
 * ```typescript
 * const client = new PaymentLinksClient({ baseUrl: 'https://styx.nexus' });
 * 
 * // Create a payment link
 * const link = await client.createPaymentLink({
 *   amount: '10',
 *   token: 'USDC',
 *   message: 'Thanks for your help!',
 * });
 * 
 * // Share link.claimUrl with recipient
 * 
 * // Recipient claims to their wallet
 * const result = await client.claimPayment({
 *   claimCode: extractedCode,
 *   recipientAddress: 'recipient-wallet-address',
 * });
 * ```
 */
export class PaymentLinksClient {
  private baseUrl: string;
  private apiUrl: string;
  private connection?: Connection;
  private silentSwapClient?: StealthSilentSwapClient;

  constructor(config: {
    baseUrl?: string;
    apiUrl?: string;
    connection?: Connection;
    useSilentSwap?: boolean;
  }) {
    this.baseUrl = config.baseUrl || 'https://styx.nexus';
    this.apiUrl = config.apiUrl || 'https://api.styx.nexus';
    this.connection = config.connection;
    
    if (config.useSilentSwap) {
      this.silentSwapClient = new StealthSilentSwapClient({
        integratorId: 'styx-payment-links',
      });
    }
  }

  /**
   * Generate a unique claim code
   */
  private generateClaimCode(): string {
    const bytes = randomBytes(24);
    return bs58.encode(bytes);
  }

  /**
   * Generate payment link ID from claim code
   */
  private derivePaymentId(claimCode: string): string {
    const hash = sha256(new TextEncoder().encode(claimCode));
    return bs58.encode(hash.slice(0, 16));
  }

  /**
   * Create a new payment link
   * 
   * Returns a shareable URL that anyone can use to claim the payment
   * to their wallet address.
   */
  async createPaymentLink(params: PaymentLinkParams): Promise<PaymentLink> {
    const {
      amount,
      token,
      recipientEmail,
      message,
      expiresInHours = 72,
      useSilentSwap = false,
      destChain = 'solana',
    } = params;

    // Generate unique claim code
    const claimCode = this.generateClaimCode();
    const paymentId = this.derivePaymentId(claimCode);

    // Generate ephemeral keypair for claim derivation
    const ephemeralKeypair = generateX25519Keypair();

    // Calculate expiration
    const expiresAt = Date.now() + (expiresInHours * 60 * 60 * 1000);

    // Create claim URL
    const claimUrl = `${this.baseUrl}/claim/${paymentId}#${claimCode}`;

    // Derive escrow address from payment ID
    const escrowSeed = sha256(new TextEncoder().encode(`styx-escrow-${paymentId}`));
    const escrowKeypair = Keypair.fromSeed(escrowSeed);

    // Prepare payment data for API
    const paymentData = {
      id: paymentId,
      claimCodeHash: bs58.encode(sha256(new TextEncoder().encode(claimCode))),
      ephemeralPubkey: bs58.encode(ephemeralKeypair.publicKey),
      escrowAddress: escrowKeypair.publicKey.toBase58(),
      amount,
      token,
      expiresAt,
      message: message ? await this.encryptMessage(message, ephemeralKeypair.secretKey) : undefined,
      recipientEmail,
      useSilentSwap,
      destChain,
    };

    // Register payment with API
    const response = await fetch(`${this.apiUrl}/v1/payment-links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      throw new Error('Failed to create payment link');
    }

    // If email provided, send notification
    if (recipientEmail) {
      await this.sendEmailNotification(recipientEmail, claimUrl, amount, token, message);
    }

    return {
      id: paymentId,
      claimUrl,
      claimCode,
      ephemeralKeypair,
      escrowAddress: escrowKeypair.publicKey.toBase58(),
      amount,
      token,
      expiresAt,
      status: 'pending',
      message,
    };
  }

  /**
   * Get payment link status
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentLink | null> {
    const response = await fetch(`${this.apiUrl}/v1/payment-links/${paymentId}`);
    
    if (!response.ok) {
      return null;
    }

    return response.json();
  }

  /**
   * Claim a payment to recipient's wallet
   * 
   * The claim code from the URL is used to prove eligibility
   * and derive the stealth destination address.
   */
  async claimPayment(params: ClaimParams): Promise<ClaimResult> {
    const { claimCode, recipientAddress, signature } = params;

    // Derive payment ID
    const paymentId = this.derivePaymentId(claimCode);

    // Verify claim code hash matches
    const claimCodeHash = bs58.encode(sha256(new TextEncoder().encode(claimCode)));

    // Request claim from API
    const response = await fetch(`${this.apiUrl}/v1/payment-links/${paymentId}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claimCodeHash,
        recipientAddress,
        signature: signature ? bs58.encode(signature) : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || 'Claim failed',
      };
    }

    const result = await response.json();

    return {
      success: true,
      txSignature: result.txSignature,
      amount: result.amount,
      token: result.token,
    };
  }

  /**
   * Create payment link using SilentSwap for cross-chain privacy
   * 
   * Funds are routed through SilentSwap's shielded network
   * before arriving at the recipient's stealth address.
   */
  async createSilentPaymentLink(params: PaymentLinkParams & {
    recipientViewKey: Uint8Array;
    recipientSpendKey: PublicKey;
  }): Promise<PaymentLink & { silentSwapOrderId?: string }> {
    if (!this.silentSwapClient) {
      throw new Error('SilentSwap not initialized');
    }

    // Create base payment link
    const paymentLink = await this.createPaymentLink({
      ...params,
      useSilentSwap: true,
    });

    // Determine asset ID
    const sourceAsset = params.token === 'SOL' 
      ? NATIVE_SOL 
      : createSolanaAssetId(params.token);

    // Create SilentSwap order with stealth destination
    const swapResult = await this.silentSwapClient.createStealthSwap({
      sourceAsset,
      sourceAmount: params.amount,
      destAsset: sourceAsset, // Same asset, just routed privately
      recipientViewKey: params.recipientViewKey,
      recipientSpendKey: params.recipientSpendKey,
    });

    return {
      ...paymentLink,
      silentSwapOrderId: swapResult.orderId,
    };
  }

  /**
   * Send email notification to recipient
   */
  private async sendEmailNotification(
    email: string,
    claimUrl: string,
    amount: string,
    token: string,
    message?: string
  ): Promise<void> {
    await fetch(`${this.apiUrl}/v1/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        template: 'payment-link',
        data: {
          claimUrl,
          amount,
          token,
          message,
        },
      }),
    });
  }

  /**
   * Encrypt message for recipient
   */
  private async encryptMessage(
    message: string,
    ephemeralSecret: Uint8Array
  ): Promise<string> {
    const key = deriveEncryptionKey(ephemeralSecret, 'styx-payment-message');
    const msgBytes = new TextEncoder().encode(message);
    const { ciphertext, nonce } = encryptData(msgBytes, key);
    return bs58.encode(new Uint8Array([...nonce, ...ciphertext]));
  }

  /**
   * Decrypt message for recipient
   */
  static decryptMessage(
    encryptedMessage: string,
    ephemeralPubkey: Uint8Array,
    viewSecretKey: Uint8Array
  ): string {
    const combined = bs58.decode(encryptedMessage);
    const nonce = combined.slice(0, 24);
    const ciphertext = combined.slice(24);
    
    const sharedSecret = computeSharedSecret(viewSecretKey, ephemeralPubkey);
    const key = deriveEncryptionKey(sharedSecret, 'styx-payment-message');
    
    const plaintext = decryptData(ciphertext, key, nonce);
    return new TextDecoder().decode(plaintext);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quick helper to create a SOL payment link
 */
export async function createSolPaymentLink(
  amount: string,
  options?: {
    recipientEmail?: string;
    message?: string;
    expiresInHours?: number;
  }
): Promise<PaymentLink> {
  const client = new PaymentLinksClient({});
  return client.createPaymentLink({
    amount,
    token: 'SOL',
    ...options,
  });
}

/**
 * Quick helper to create a USDC payment link
 */
export async function createUsdcPaymentLink(
  amount: string,
  options?: {
    recipientEmail?: string;
    message?: string;
    expiresInHours?: number;
  }
): Promise<PaymentLink> {
  const client = new PaymentLinksClient({});
  return client.createPaymentLink({
    amount,
    token: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint
    ...options,
  });
}

/**
 * Extract claim code from a payment link URL
 */
export function extractClaimCode(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hash = parsed.hash;
    if (hash && hash.startsWith('#')) {
      return hash.slice(1);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate a claim code format
 */
export function isValidClaimCode(code: string): boolean {
  try {
    const decoded = bs58.decode(code);
    return decoded.length === 24;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACT HOOK (for web integration)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * React hook for payment link operations
 * 
 * ```tsx
 * function SendPayment() {
 *   const { createLink, claimPayment, loading } = usePaymentLinks();
 *   
 *   const handleSend = async () => {
 *     const link = await createLink({ amount: '10', token: 'SOL' });
 *     // Share link.claimUrl
 *   };
 * }
 * ```
 */
export function usePaymentLinksConfig() {
  return {
    baseUrl: typeof window !== 'undefined' 
      ? window.location.origin 
      : 'https://styx.nexus',
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://api.styx.nexus',
  };
}
