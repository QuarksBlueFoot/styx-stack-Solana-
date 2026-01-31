/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX RESOLV - Universal Privacy Payment System
 *  
 *  The complete privacy-first payment infrastructure:
 *  - SEND Links: Send crypto via email/URL (recipient claims to any wallet)
 *  - PAY Links: Create payment requests (payer identity hidden)
 *  - BUY Links: Product/service purchase links with privacy
 *  - Invoices: Private invoicing where payer identity is protected
 *  - Referrals: Track referrals while protecting end-user privacy
 *  - GIGS: TaskRabbit-style private gig economy (web3 freelancing)
 *  - Name Resolution: Human-readable names → wallet addresses
 * 
 *  All routes through SilentSwap for cross-chain privacy when enabled.
 *  SilentSwap: https://silentswap.com - Privacy-preserving cross-chain routing
 * 
 *  Privacy Hack 2026 - SilentSwap Bounty Submission
 *  Powered by @silentswap/sdk for maximum payment privacy
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
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
} from '../swaps/silentswap-integration';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const RESOLV_BASE_URL = 'https://styx.nexus';
const RESOLV_API_URL = 'https://api.styx.nexus';

// Link type prefixes
export const LINK_TYPES = {
  SEND: 'send',     // Sender creates, recipient claims
  PAY: 'pay',       // Merchant creates payment request
  BUY: 'buy',       // Product/service purchase
  INVOICE: 'inv',   // Formal invoice
  GIG: 'gig',       // TaskRabbit-style gig/task
} as const;

export type LinkType = typeof LINK_TYPES[keyof typeof LINK_TYPES];

// ═══════════════════════════════════════════════════════════════════════════════
// BASE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ResolvConfig {
  baseUrl?: string;
  apiUrl?: string;
  connection?: Connection;
  /** Enable SilentSwap for cross-chain privacy routing (https://silentswap.com) */
  useSilentSwap?: boolean;
  integratorId?: string;
}

export interface BaseLinkParams {
  /** Amount in token units */
  amount: string;
  /** Token mint address or 'SOL' */
  token: string;
  /** Optional message */
  message?: string;
  /** Expiration in hours (default 168 = 7 days) */
  expiresInHours?: number;
  /** Use SilentSwap for maximum privacy */
  useSilentSwap?: boolean;
  /** Referral code for tracking (privacy-preserved) */
  referralCode?: string;
}

export interface BaseLink {
  /** Unique link ID */
  id: string;
  /** Link type */
  type: LinkType;
  /** Full URL */
  url: string;
  /** Secret code (embedded in URL hash) */
  secretCode: string;
  /** Amount */
  amount: string;
  /** Token */
  token: string;
  /** Expiration timestamp */
  expiresAt: number;
  /** Status */
  status: 'pending' | 'funded' | 'completed' | 'expired' | 'cancelled';
  /** Optional message */
  message?: string;
  /** Referral tracking ID (hashed) */
  referralHash?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEND LINK TYPES (Sender → Recipient via link)
// ═══════════════════════════════════════════════════════════════════════════════

export interface SendLinkParams extends BaseLinkParams {
  /** Recipient email for notification */
  recipientEmail?: string;
  /** Sender name (for display) */
  senderName?: string;
}

export interface SendLink extends BaseLink {
  type: 'send';
  /** Escrow address holding funds */
  escrowAddress: string;
  /** Recipient email (if provided) */
  recipientEmail?: string;
  /** Sender name */
  senderName?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAY LINK TYPES (Merchant creates payment request)
// ═══════════════════════════════════════════════════════════════════════════════

export interface PayLinkParams extends BaseLinkParams {
  /** Merchant/recipient wallet */
  merchantWallet: string;
  /** Merchant name */
  merchantName?: string;
  /** Order/reference ID */
  orderId?: string;
  /** Callback URL on completion */
  callbackUrl?: string;
  /** Webhook URL for payment notifications */
  webhookUrl?: string;
  /** Accept multiple payments (for donations) */
  allowMultiple?: boolean;
}

export interface PayLink extends Omit<BaseLink, 'type'> {
  type: 'pay';
  /** Merchant wallet to receive funds */
  merchantWallet: string;
  /** Merchant name */
  merchantName?: string;
  /** Order/reference ID */
  orderId?: string;
  /** Total amount paid */
  totalPaid: string;
  /** Number of payments received */
  paymentCount: number;
  /** Allow multiple payments */
  allowMultiple: boolean;
  /** Callback URL */
  callbackUrl?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUY LINK TYPES (Product/service purchase)
// ═══════════════════════════════════════════════════════════════════════════════

export interface BuyLinkParams extends PayLinkParams {
  /** Product/service name */
  productName: string;
  /** Product description */
  productDescription?: string;
  /** Product image URL */
  productImage?: string;
  /** Quantity available (null = unlimited) */
  quantityAvailable?: number;
  /** SKU/product ID */
  sku?: string;
  /** Metadata for fulfillment */
  metadata?: Record<string, string>;
}

export interface BuyLink extends Omit<PayLink, 'type'> {
  type: 'buy';
  /** Product name */
  productName: string;
  /** Product description */
  productDescription?: string;
  /** Product image */
  productImage?: string;
  /** Quantity available */
  quantityAvailable: number | null;
  /** Quantity sold */
  quantitySold: number;
  /** SKU */
  sku?: string;
  /** Metadata */
  metadata?: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVOICE TYPES (Formal invoicing with payer privacy)
// ═══════════════════════════════════════════════════════════════════════════════

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: string;
  amount: string;
}

export interface InvoiceParams extends BaseLinkParams {
  /** Recipient wallet (who gets paid) */
  recipientWallet: string;
  /** Invoice number */
  invoiceNumber: string;
  /** Sender/biller info */
  billerName: string;
  billerEmail?: string;
  billerAddress?: string;
  /** Customer reference (optional, privacy-preserved) */
  customerRef?: string;
  /** Line items */
  items: InvoiceLineItem[];
  /** Due date */
  dueDate?: number;
  /** Notes */
  notes?: string;
  /** Tax amount */
  tax?: string;
  /** Discount */
  discount?: string;
}

export interface Invoice extends BaseLink {
  type: 'inv';
  /** Invoice number */
  invoiceNumber: string;
  /** Recipient wallet */
  recipientWallet: string;
  /** Biller info */
  billerName: string;
  billerEmail?: string;
  /** Line items */
  items: InvoiceLineItem[];
  /** Subtotal */
  subtotal: string;
  /** Tax */
  tax?: string;
  /** Discount */
  discount?: string;
  /** Due date */
  dueDate?: number;
  /** Paid status */
  paid: boolean;
  /** Paid timestamp */
  paidAt?: number;
  /** Notes */
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GIG TYPES (TaskRabbit-style private gig economy)
// ═══════════════════════════════════════════════════════════════════════════════

export type GigStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'disputed' | 'cancelled';

export interface GigParams extends BaseLinkParams {
  /** Poster wallet (who pays for the gig) */
  posterWallet: string;
  /** Gig title */
  title: string;
  /** Gig description */
  description: string;
  /** Category */
  category: string;
  /** Skills required */
  skills?: string[];
  /** Location (optional, for local gigs) */
  location?: string;
  /** Remote/online */
  remote?: boolean;
  /** Deadline */
  deadline?: number;
  /** Allow applications (vs. instant accept) */
  requiresApplication?: boolean;
  /** Max number of workers */
  maxWorkers?: number;
}

export interface Gig extends BaseLink {
  type: 'gig';
  /** Poster wallet */
  posterWallet: string;
  /** Gig title */
  title: string;
  /** Gig description */
  description: string;
  /** Category */
  category: string;
  /** Skills */
  skills: string[];
  /** Location */
  location?: string;
  /** Remote */
  remote: boolean;
  /** Deadline */
  deadline?: number;
  /** Gig-specific status */
  gigStatus: GigStatus;
  /** Assigned workers (wallet hashes for privacy) */
  assignedWorkers: string[];
  /** Number of applications */
  applicationCount: number;
  /** Max workers */
  maxWorkers: number;
  /** Requires application */
  requiresApplication: boolean;
}

export interface GigApplication {
  /** Application ID */
  id: string;
  /** Gig ID */
  gigId: string;
  /** Applicant wallet hash (for privacy) */
  applicantHash: string;
  /** Cover message (encrypted) */
  encryptedMessage?: string;
  /** Proposed rate (if different from listing) */
  proposedRate?: string;
  /** Status */
  status: 'pending' | 'accepted' | 'rejected';
  /** Timestamp */
  appliedAt: number;
}

export interface GigCompletionProof {
  /** Proof type */
  type: 'deliverable' | 'attestation' | 'milestone';
  /** Description */
  description: string;
  /** Encrypted proof data (only poster can decrypt) */
  encryptedData?: string;
  /** Public proof hash */
  proofHash: string;
  /** Timestamp */
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REFERRAL TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReferralConfig {
  /** Unique referral code */
  code: string;
  /** Owner wallet (who earns referral rewards) */
  ownerWallet: string;
  /** Reward percentage (0-100) */
  rewardPercent: number;
  /** Reward cap per referral */
  rewardCap?: string;
  /** Total earned */
  totalEarned: string;
  /** Total referrals */
  totalReferrals: number;
  /** Active */
  active: boolean;
}

export interface ReferralTrack {
  /** Referral code used */
  code: string;
  /** Hashed payer ID (for privacy) */
  payerHash: string;
  /** Amount */
  amount: string;
  /** Reward earned */
  reward: string;
  /** Timestamp */
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAME RESOLUTION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface NameRecord {
  /** Registered name */
  name: string;
  /** Owner's public key */
  owner: PublicKey;
  /** Resolution target */
  target: PublicKey;
  /** Record type */
  type: 'wallet' | 'inbox' | 'profile' | 'payment' | 'custom';
  /** Expiry timestamp */
  expiresAt: number | null;
  /** Metadata */
  metadata?: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETION/CLAIM TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClaimResult {
  success: boolean;
  txSignature?: string;
  amount?: string;
  token?: string;
  error?: string;
}

export interface PaymentResult {
  success: boolean;
  txSignature?: string;
  amount?: string;
  referralReward?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLV CLIENT - Main unified client
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Styx Resolv - Universal Privacy Payment Client
 * 
 * Create private payment links, invoices, gigs, and buy buttons that can be
 * shared on social media while protecting end-user privacy.
 * 
 * Privacy routing powered by SilentSwap (https://silentswap.com)
 * @see https://github.com/SilentSwap/silentswap-sdk
 * 
 * @example
 * ```typescript
 * const resolv = new ResolvClient({
 *   useSilentSwap: true,  // Enable SilentSwap for maximum privacy
 *   integratorId: 'my-app'
 * });
 * 
 * // Create a send link (like Venmo/PayPal link)
 * const sendLink = await resolv.createSendLink({
 *   amount: '10',
 *   token: 'USDC',
 *   recipientEmail: 'friend@example.com'
 * });
 * 
 * // Create a pay link (payment request)
 * const payLink = await resolv.createPayLink({
 *   amount: '50',
 *   token: 'SOL',
 *   merchantWallet: 'Abc123...',
 *   merchantName: 'My Store'
 * });
 * 
 * // Create a buy link for products
 * const buyLink = await resolv.createBuyLink({
 *   amount: '25',
 *   token: 'USDC',
 *   merchantWallet: 'Abc123...',
 *   productName: 'Digital Art NFT',
 *   quantityAvailable: 100
 * });
 * 
 * // Create an invoice (payer hidden)
 * const invoice = await resolv.createInvoice({
 *   recipientWallet: 'Abc123...',
 *   invoiceNumber: 'INV-001',
 *   billerName: 'Acme Corp',
 *   items: [{ description: 'Consulting', quantity: 10, unitPrice: '100', amount: '1000' }],
 *   amount: '1000',
 *   token: 'USDC'
 * });
 * 
 * // Create a gig (TaskRabbit-style)
 * const gig = await resolv.createGig({
 *   amount: '100',
 *   token: 'USDC',
 *   posterWallet: 'MyWallet...',
 *   title: 'Build a Landing Page',
 *   description: 'Need a responsive landing page...',
 *   category: 'web-dev',
 *   remote: true
 * });
 * ```
 */
export class ResolvClient {
  private baseUrl: string;
  private apiUrl: string;
  private connection?: Connection;
  /** SilentSwap client for privacy-preserving cross-chain routing */
  private silentSwapClient?: StealthSilentSwapClient;

  constructor(config: ResolvConfig = {}) {
    this.baseUrl = config.baseUrl || RESOLV_BASE_URL;
    this.apiUrl = config.apiUrl || RESOLV_API_URL;
    this.connection = config.connection;
    
    // Initialize SilentSwap for cross-chain privacy routing
    // SilentSwap: https://silentswap.com - Privacy-preserving DEX aggregator
    if (config.useSilentSwap) {
      this.silentSwapClient = new StealthSilentSwapClient({
        integratorId: config.integratorId || 'styx-resolv',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  private generateSecretCode(): string {
    return bs58.encode(randomBytes(24));
  }

  private deriveLinkId(secretCode: string, type: LinkType): string {
    const hash = sha256(new TextEncoder().encode(`${type}:${secretCode}`));
    return bs58.encode(hash.slice(0, 16));
  }

  private hashReferral(code: string): string {
    return bs58.encode(sha256(new TextEncoder().encode(`ref:${code}`)).slice(0, 8));
  }

  private async encryptMessage(message: string, secret: Uint8Array): Promise<string> {
    const key = deriveEncryptionKey(secret, 'styx-resolve-msg');
    const msgBytes = new TextEncoder().encode(message);
    const { ciphertext, nonce } = encryptData(msgBytes, key);
    return bs58.encode(new Uint8Array([...nonce, ...ciphertext]));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEND LINKS - Pay someone via link
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a Send Link
   * 
   * Create a link that holds funds in escrow. Share the link with anyone
   * and they can claim to their wallet. Perfect for:
   * - Paying friends without knowing their wallet
   * - Onboarding new users to crypto
   * - Sending rewards/prizes via email or social
   */
  async createSendLink(params: SendLinkParams): Promise<SendLink> {
    const secretCode = this.generateSecretCode();
    const linkId = this.deriveLinkId(secretCode, 'send');
    const expiresAt = Date.now() + ((params.expiresInHours || 168) * 60 * 60 * 1000);
    
    // Derive escrow address
    const escrowSeed = sha256(new TextEncoder().encode(`escrow:${linkId}`));
    const escrowKeypair = Keypair.fromSeed(escrowSeed);
    
    const linkData = {
      id: linkId,
      type: 'send' as const,
      secretCodeHash: bs58.encode(sha256(new TextEncoder().encode(secretCode))),
      escrowAddress: escrowKeypair.publicKey.toBase58(),
      amount: params.amount,
      token: params.token,
      expiresAt,
      message: params.message,
      senderName: params.senderName,
      recipientEmail: params.recipientEmail,
      useSilentSwap: params.useSilentSwap || false,
      referralHash: params.referralCode ? this.hashReferral(params.referralCode) : undefined,
    };

    const response = await fetch(`${this.apiUrl}/v1/resolve/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(linkData),
    });

    if (!response.ok) {
      throw new Error('Failed to create send link');
    }

    // Send email notification if provided
    if (params.recipientEmail) {
      await this.sendEmailNotification('send', params.recipientEmail, {
        url: `${this.baseUrl}/claim/${linkId}#${secretCode}`,
        amount: params.amount,
        token: params.token,
        message: params.message,
        senderName: params.senderName,
      });
    }

    return {
      id: linkId,
      type: 'send',
      url: `${this.baseUrl}/claim/${linkId}#${secretCode}`,
      secretCode,
      escrowAddress: escrowKeypair.publicKey.toBase58(),
      amount: params.amount,
      token: params.token,
      expiresAt,
      status: 'pending',
      message: params.message,
      senderName: params.senderName,
      recipientEmail: params.recipientEmail,
      referralHash: linkData.referralHash,
    };
  }

  /**
   * Claim a Send Link
   */
  async claimSendLink(secretCode: string, recipientWallet: string): Promise<ClaimResult> {
    const linkId = this.deriveLinkId(secretCode, 'send');
    const secretCodeHash = bs58.encode(sha256(new TextEncoder().encode(secretCode)));

    const response = await fetch(`${this.apiUrl}/v1/resolve/send/${linkId}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secretCodeHash, recipientWallet }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message };
    }

    return response.json();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAY LINKS - Payment requests
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a Pay Link
   * 
   * Create a payment request link that customers can use to pay you.
   * The payer's identity is hidden while you receive funds. Perfect for:
   * - Freelance payments
   * - Donation buttons
   * - Subscription payments
   * - Service fees
   */
  async createPayLink(params: PayLinkParams): Promise<PayLink> {
    const secretCode = this.generateSecretCode();
    const linkId = this.deriveLinkId(secretCode, 'pay');
    const expiresAt = Date.now() + ((params.expiresInHours || 168) * 60 * 60 * 1000);

    const linkData = {
      id: linkId,
      type: 'pay' as const,
      secretCodeHash: bs58.encode(sha256(new TextEncoder().encode(secretCode))),
      merchantWallet: params.merchantWallet,
      merchantName: params.merchantName,
      orderId: params.orderId,
      amount: params.amount,
      token: params.token,
      expiresAt,
      message: params.message,
      allowMultiple: params.allowMultiple || false,
      callbackUrl: params.callbackUrl,
      webhookUrl: params.webhookUrl,
      useSilentSwap: params.useSilentSwap || false,
      referralHash: params.referralCode ? this.hashReferral(params.referralCode) : undefined,
    };

    const response = await fetch(`${this.apiUrl}/v1/resolve/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(linkData),
    });

    if (!response.ok) {
      throw new Error('Failed to create pay link');
    }

    return {
      id: linkId,
      type: 'pay',
      url: `${this.baseUrl}/pay/${linkId}#${secretCode}`,
      secretCode,
      merchantWallet: params.merchantWallet,
      merchantName: params.merchantName,
      orderId: params.orderId,
      amount: params.amount,
      token: params.token,
      expiresAt,
      status: 'pending',
      message: params.message,
      totalPaid: '0',
      paymentCount: 0,
      allowMultiple: params.allowMultiple || false,
      callbackUrl: params.callbackUrl,
      referralHash: linkData.referralHash,
    };
  }

  /**
   * Complete a Pay Link payment
   * 
   * Payer's identity is hidden from merchant through SilentSwap routing
   */
  async payLink(
    secretCode: string, 
    payerWallet: PublicKey,
    signTransaction: (tx: Transaction) => Promise<Transaction>
  ): Promise<PaymentResult> {
    const linkId = this.deriveLinkId(secretCode, 'pay');

    // Get link details
    const linkResponse = await fetch(`${this.apiUrl}/v1/resolve/pay/${linkId}`);
    if (!linkResponse.ok) {
      return { success: false, error: 'Pay link not found' };
    }
    const link: PayLink = await linkResponse.json();

    // Create payment transaction
    const paymentResponse = await fetch(`${this.apiUrl}/v1/resolve/pay/${linkId}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payerWallet: payerWallet.toBase58(),
        useSilentSwap: link.referralHash ? true : false, // Always use SilentSwap with referrals
      }),
    });

    if (!paymentResponse.ok) {
      const error = await paymentResponse.json();
      return { success: false, error: error.message };
    }

    return paymentResponse.json();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BUY LINKS - Product purchase
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a Buy Link
   * 
   * Create a link for selling products or services. Buyers remain anonymous
   * while you receive payment and can fulfill orders. Perfect for:
   * - Digital product sales
   * - NFT mints
   * - Event tickets
   * - Merchandise with privacy
   */
  async createBuyLink(params: BuyLinkParams): Promise<BuyLink> {
    const secretCode = this.generateSecretCode();
    const linkId = this.deriveLinkId(secretCode, 'buy');
    const expiresAt = Date.now() + ((params.expiresInHours || 720) * 60 * 60 * 1000); // 30 days default

    const linkData = {
      id: linkId,
      type: 'buy' as const,
      secretCodeHash: bs58.encode(sha256(new TextEncoder().encode(secretCode))),
      merchantWallet: params.merchantWallet,
      merchantName: params.merchantName,
      productName: params.productName,
      productDescription: params.productDescription,
      productImage: params.productImage,
      quantityAvailable: params.quantityAvailable || null,
      sku: params.sku,
      amount: params.amount,
      token: params.token,
      expiresAt,
      message: params.message,
      allowMultiple: true,
      callbackUrl: params.callbackUrl,
      webhookUrl: params.webhookUrl,
      metadata: params.metadata,
      useSilentSwap: params.useSilentSwap || false,
      referralHash: params.referralCode ? this.hashReferral(params.referralCode) : undefined,
    };

    const response = await fetch(`${this.apiUrl}/v1/resolve/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(linkData),
    });

    if (!response.ok) {
      throw new Error('Failed to create buy link');
    }

    return {
      id: linkId,
      type: 'buy',
      url: `${this.baseUrl}/buy/${linkId}#${secretCode}`,
      secretCode,
      merchantWallet: params.merchantWallet,
      merchantName: params.merchantName,
      productName: params.productName,
      productDescription: params.productDescription,
      productImage: params.productImage,
      quantityAvailable: params.quantityAvailable || null,
      quantitySold: 0,
      sku: params.sku,
      orderId: params.orderId,
      amount: params.amount,
      token: params.token,
      expiresAt,
      status: 'pending',
      message: params.message,
      totalPaid: '0',
      paymentCount: 0,
      allowMultiple: true,
      callbackUrl: params.callbackUrl,
      metadata: params.metadata,
      referralHash: linkData.referralHash,
    };
  }

  /**
   * Purchase via Buy Link
   */
  async buyProduct(
    secretCode: string,
    buyerWallet: PublicKey,
    quantity: number = 1,
    fulfillmentData?: Record<string, string> // e.g., { email: '...', shippingAddress: '...' }
  ): Promise<PaymentResult & { purchaseId?: string }> {
    const linkId = this.deriveLinkId(secretCode, 'buy');

    const response = await fetch(`${this.apiUrl}/v1/resolve/buy/${linkId}/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyerWallet: buyerWallet.toBase58(),
        quantity,
        fulfillmentData: fulfillmentData 
          ? await this.encryptFulfillmentData(fulfillmentData, secretCode)
          : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message };
    }

    return response.json();
  }

  private async encryptFulfillmentData(
    data: Record<string, string>,
    secret: string
  ): Promise<string> {
    const key = deriveEncryptionKey(
      sha256(new TextEncoder().encode(secret)),
      'fulfillment'
    );
    const { ciphertext, nonce } = encryptData(
      new TextEncoder().encode(JSON.stringify(data)),
      key
    );
    return bs58.encode(new Uint8Array([...nonce, ...ciphertext]));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INVOICES - Formal invoicing with payer privacy
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create an Invoice
   * 
   * Generate professional invoices where the payer's identity remains private.
   * The biller receives payment without knowing who paid. Perfect for:
   * - B2B services with privacy requirements
   * - Anonymous donations with receipts
   * - Consulting services
   * - Subscription renewals
   */
  async createInvoice(params: InvoiceParams): Promise<Invoice> {
    const secretCode = this.generateSecretCode();
    const linkId = this.deriveLinkId(secretCode, 'inv');
    const expiresAt = params.dueDate || Date.now() + ((params.expiresInHours || 720) * 60 * 60 * 1000);

    // Calculate totals
    const subtotal = params.items.reduce(
      (sum, item) => sum + parseFloat(item.amount),
      0
    ).toString();
    
    const tax = params.tax || '0';
    const discount = params.discount || '0';

    const invoiceData = {
      id: linkId,
      type: 'inv' as const,
      secretCodeHash: bs58.encode(sha256(new TextEncoder().encode(secretCode))),
      invoiceNumber: params.invoiceNumber,
      recipientWallet: params.recipientWallet,
      billerName: params.billerName,
      billerEmail: params.billerEmail,
      billerAddress: params.billerAddress,
      customerRef: params.customerRef 
        ? bs58.encode(sha256(new TextEncoder().encode(params.customerRef)).slice(0, 8))
        : undefined,
      items: params.items,
      subtotal,
      tax,
      discount,
      amount: params.amount,
      token: params.token,
      expiresAt,
      dueDate: params.dueDate,
      notes: params.notes,
      useSilentSwap: params.useSilentSwap || false,
      referralHash: params.referralCode ? this.hashReferral(params.referralCode) : undefined,
    };

    const response = await fetch(`${this.apiUrl}/v1/resolve/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoiceData),
    });

    if (!response.ok) {
      throw new Error('Failed to create invoice');
    }

    return {
      id: linkId,
      type: 'inv',
      url: `${this.baseUrl}/invoice/${linkId}#${secretCode}`,
      secretCode,
      invoiceNumber: params.invoiceNumber,
      recipientWallet: params.recipientWallet,
      billerName: params.billerName,
      billerEmail: params.billerEmail,
      items: params.items,
      subtotal,
      tax,
      discount,
      amount: params.amount,
      token: params.token,
      expiresAt,
      dueDate: params.dueDate,
      status: 'pending',
      message: params.message,
      paid: false,
      notes: params.notes,
      referralHash: invoiceData.referralHash,
    };
  }

  /**
   * Pay an Invoice
   */
  async payInvoice(secretCode: string, payerWallet: PublicKey): Promise<PaymentResult> {
    const linkId = this.deriveLinkId(secretCode, 'inv');

    const response = await fetch(`${this.apiUrl}/v1/resolve/invoice/${linkId}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payerWallet: payerWallet.toBase58(),
        secretCodeHash: bs58.encode(sha256(new TextEncoder().encode(secretCode))),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message };
    }

    return response.json();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GIGS - TaskRabbit-style private gig economy
  // Payments routed via SilentSwap for worker/client privacy
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a Gig
   * 
   * Post a gig/task for freelancers to complete. Workers apply anonymously
   * and payments are made privately via SilentSwap. Perfect for:
   * - Freelance work (dev, design, writing)
   * - Local tasks (delivery, errands)
   * - Professional services (consulting, tutoring)
   * - Creative work (art, music, video)
   * 
   * Privacy powered by SilentSwap (https://silentswap.com)
   */
  async createGig(params: GigParams): Promise<Gig> {
    const secretCode = this.generateSecretCode();
    const linkId = this.deriveLinkId(secretCode, 'gig');
    const expiresAt = Date.now() + ((params.expiresInHours || 720) * 60 * 60 * 1000); // 30 days default

    const gigData = {
      id: linkId,
      type: 'gig' as const,
      secretCodeHash: bs58.encode(sha256(new TextEncoder().encode(secretCode))),
      posterWallet: params.posterWallet,
      title: params.title,
      description: params.description,
      category: params.category,
      skills: params.skills || [],
      location: params.location,
      remote: params.remote ?? true,
      deadline: params.deadline,
      amount: params.amount,
      token: params.token,
      expiresAt,
      message: params.message,
      requiresApplication: params.requiresApplication ?? true,
      maxWorkers: params.maxWorkers || 1,
      useSilentSwap: params.useSilentSwap ?? true, // Default to SilentSwap for gig privacy
      referralHash: params.referralCode ? this.hashReferral(params.referralCode) : undefined,
    };

    const response = await fetch(`${this.apiUrl}/v1/resolv/gig`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gigData),
    });

    if (!response.ok) {
      throw new Error('Failed to create gig');
    }

    return {
      id: linkId,
      type: 'gig',
      url: `${this.baseUrl}/gig/${linkId}#${secretCode}`,
      secretCode,
      posterWallet: params.posterWallet,
      title: params.title,
      description: params.description,
      category: params.category,
      skills: params.skills || [],
      location: params.location,
      remote: params.remote ?? true,
      deadline: params.deadline,
      amount: params.amount,
      token: params.token,
      expiresAt,
      status: 'pending',
      gigStatus: 'open',
      message: params.message,
      assignedWorkers: [],
      applicationCount: 0,
      maxWorkers: params.maxWorkers || 1,
      requiresApplication: params.requiresApplication ?? true,
      referralHash: gigData.referralHash,
    };
  }

  /**
   * Apply to a Gig
   * 
   * Workers apply anonymously - poster only sees a privacy-preserving hash
   */
  async applyToGig(
    secretCode: string,
    workerWallet: PublicKey,
    message?: string,
    proposedRate?: string
  ): Promise<{ success: boolean; applicationId?: string; error?: string }> {
    const linkId = this.deriveLinkId(secretCode, 'gig');
    
    // Hash worker wallet for privacy
    const workerHash = bs58.encode(
      sha256(new TextEncoder().encode(`worker:${workerWallet.toBase58()}`)).slice(0, 12)
    );

    // Encrypt message if provided
    let encryptedMessage: string | undefined;
    if (message) {
      encryptedMessage = await this.encryptMessage(
        message,
        sha256(new TextEncoder().encode(secretCode))
      );
    }

    const response = await fetch(`${this.apiUrl}/v1/resolv/gig/${linkId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workerHash,
        encryptedMessage,
        proposedRate,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message };
    }

    return response.json();
  }

  /**
   * Accept a Gig Application
   * 
   * Poster accepts a worker - funds are escrowed via SilentSwap
   */
  async acceptGigApplication(
    secretCode: string,
    applicationId: string
  ): Promise<{ success: boolean; error?: string }> {
    const linkId = this.deriveLinkId(secretCode, 'gig');

    const response = await fetch(`${this.apiUrl}/v1/resolv/gig/${linkId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secretCodeHash: bs58.encode(sha256(new TextEncoder().encode(secretCode))),
        applicationId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /**
   * Submit Gig Completion Proof
   * 
   * Worker submits proof of work completion
   */
  async submitGigProof(
    secretCode: string,
    workerWallet: PublicKey,
    proof: Omit<GigCompletionProof, 'proofHash' | 'timestamp'>
  ): Promise<{ success: boolean; proofId?: string; error?: string }> {
    const linkId = this.deriveLinkId(secretCode, 'gig');
    
    // Create proof hash
    const proofData = JSON.stringify({ ...proof, timestamp: Date.now() });
    const proofHash = bs58.encode(sha256(new TextEncoder().encode(proofData)).slice(0, 16));

    // Encrypt proof data for poster
    const encryptedData = await this.encryptMessage(
      proofData,
      sha256(new TextEncoder().encode(secretCode))
    );

    const response = await fetch(`${this.apiUrl}/v1/resolv/gig/${linkId}/proof`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workerHash: bs58.encode(
          sha256(new TextEncoder().encode(`worker:${workerWallet.toBase58()}`)).slice(0, 12)
        ),
        proofHash,
        encryptedData,
        type: proof.type,
        description: proof.description,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message };
    }

    return response.json();
  }

  /**
   * Complete Gig and Release Payment
   * 
   * Poster approves work and releases payment to worker via SilentSwap
   * Worker receives funds without poster knowing their real wallet
   */
  async completeGig(
    secretCode: string,
    rating?: number,
    feedback?: string
  ): Promise<PaymentResult> {
    const linkId = this.deriveLinkId(secretCode, 'gig');

    const response = await fetch(`${this.apiUrl}/v1/resolv/gig/${linkId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secretCodeHash: bs58.encode(sha256(new TextEncoder().encode(secretCode))),
        rating,
        feedback: feedback 
          ? await this.encryptMessage(feedback, sha256(new TextEncoder().encode(secretCode)))
          : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message };
    }

    return response.json();
  }

  /**
   * Dispute a Gig
   * 
   * Either party can raise a dispute for arbitration
   */
  async disputeGig(
    secretCode: string,
    disputerWallet: PublicKey,
    reason: string
  ): Promise<{ success: boolean; disputeId?: string; error?: string }> {
    const linkId = this.deriveLinkId(secretCode, 'gig');

    const response = await fetch(`${this.apiUrl}/v1/resolv/gig/${linkId}/dispute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        disputerHash: bs58.encode(
          sha256(new TextEncoder().encode(`disputer:${disputerWallet.toBase58()}`)).slice(0, 12)
        ),
        reason: await this.encryptMessage(reason, sha256(new TextEncoder().encode(secretCode))),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message };
    }

    return response.json();
  }

  /**
   * Get Gig Applications (for poster)
   */
  async getGigApplications(secretCode: string): Promise<GigApplication[]> {
    const linkId = this.deriveLinkId(secretCode, 'gig');

    const response = await fetch(`${this.apiUrl}/v1/resolv/gig/${linkId}/applications`, {
      headers: {
        'X-Secret-Hash': bs58.encode(sha256(new TextEncoder().encode(secretCode))),
      },
    });

    if (!response.ok) return [];
    return response.json();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REFERRALS - Privacy-preserving referral tracking
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a Referral Code
   * 
   * Generate referral codes that track conversions while preserving
   * end-user privacy. Referrers earn rewards without knowing who converted.
   */
  async createReferralCode(params: {
    ownerWallet: string;
    rewardPercent: number;
    rewardCap?: string;
    customCode?: string;
  }): Promise<ReferralConfig> {
    const code = params.customCode || bs58.encode(randomBytes(6)).toUpperCase();

    const response = await fetch(`${this.apiUrl}/v1/resolve/referrals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        ownerWallet: params.ownerWallet,
        rewardPercent: params.rewardPercent,
        rewardCap: params.rewardCap,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create referral code');
    }

    return {
      code,
      ownerWallet: params.ownerWallet,
      rewardPercent: params.rewardPercent,
      rewardCap: params.rewardCap,
      totalEarned: '0',
      totalReferrals: 0,
      active: true,
    };
  }

  /**
   * Get Referral Stats
   */
  async getReferralStats(code: string): Promise<ReferralConfig | null> {
    const response = await fetch(`${this.apiUrl}/v1/resolve/referrals/${code}`);
    if (!response.ok) return null;
    return response.json();
  }

  /**
   * Generate referral link for any base link
   */
  appendReferralCode(baseUrl: string, referralCode: string): string {
    const url = new URL(baseUrl);
    url.searchParams.set('ref', referralCode);
    return url.toString();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EMAIL NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  private async sendEmailNotification(
    type: string,
    email: string,
    data: Record<string, any>
  ): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/v1/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          template: `resolve-${type}`,
          data,
        }),
      });
    } catch (e) {
      console.warn('Failed to send email notification:', e);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LINK MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get link status (works for all link types)
   */
  async getLinkStatus(linkId: string, type: LinkType): Promise<BaseLink | null> {
    const response = await fetch(`${this.apiUrl}/v1/resolve/${type}/${linkId}`);
    if (!response.ok) return null;
    return response.json();
  }

  /**
   * Cancel a link (for send links, returns funds to sender)
   */
  async cancelLink(secretCode: string, type: LinkType): Promise<{ success: boolean; error?: string }> {
    const linkId = this.deriveLinkId(secretCode, type);

    const response = await fetch(`${this.apiUrl}/v1/resolve/${type}/${linkId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secretCodeHash: bs58.encode(sha256(new TextEncoder().encode(secretCode))),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message };
    }

    return { success: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAME RESOLVER
// ═══════════════════════════════════════════════════════════════════════════════

export class NameResolver {
  private connection: Connection;
  private apiUrl: string;
  
  constructor(connection: Connection, apiUrl: string = RESOLV_API_URL) {
    this.connection = connection;
    this.apiUrl = apiUrl;
  }
  
  /**
   * Resolve a name to a wallet address
   */
  async resolve(name: string): Promise<PublicKey | null> {
    const normalized = name.toLowerCase().trim();
    
    try {
      const response = await fetch(`${this.apiUrl}/v1/resolv/names/${normalized}`);
      if (!response.ok) return null;
      
      const record = await response.json();
      return new PublicKey(record.target);
    } catch {
      return null;
    }
  }
  
  /**
   * Resolve a name or parse a public key
   */
  async resolveOrParse(input: string): Promise<PublicKey | null> {
    try {
      return new PublicKey(input);
    } catch {}
    return this.resolve(input);
  }
  
  /**
   * Get full name record
   */
  async getRecord(name: string): Promise<NameRecord | null> {
    const normalized = name.toLowerCase().trim();
    
    try {
      const response = await fetch(`${this.apiUrl}/v1/resolv/names/${normalized}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      return {
        ...data,
        owner: new PublicKey(data.owner),
        target: new PublicKey(data.target),
      };
    } catch {
      return null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quick send via link (powered by SilentSwap)
 */
export async function quickSend(
  amount: string,
  token: string,
  options?: Partial<SendLinkParams>
): Promise<SendLink> {
  const client = new ResolvClient({ useSilentSwap: options?.useSilentSwap });
  return client.createSendLink({ amount, token, ...options });
}

/**
 * Quick create pay link (powered by SilentSwap)
 */
export async function quickPayLink(
  amount: string,
  token: string,
  merchantWallet: string,
  options?: Partial<PayLinkParams>
): Promise<PayLink> {
  const client = new ResolvClient({ useSilentSwap: options?.useSilentSwap });
  return client.createPayLink({ amount, token, merchantWallet, ...options });
}

/**
 * Quick create buy link (powered by SilentSwap)
 */
export async function quickBuyLink(
  amount: string,
  token: string,
  merchantWallet: string,
  productName: string,
  options?: Partial<BuyLinkParams>
): Promise<BuyLink> {
  const client = new ResolvClient({ useSilentSwap: options?.useSilentSwap });
  return client.createBuyLink({ amount, token, merchantWallet, productName, ...options });
}

/**
 * Quick create invoice (powered by SilentSwap)
 */
export async function quickInvoice(
  recipientWallet: string,
  invoiceNumber: string,
  billerName: string,
  items: InvoiceLineItem[],
  token: string,
  options?: Partial<InvoiceParams>
): Promise<Invoice> {
  const amount = items.reduce((sum, item) => sum + parseFloat(item.amount), 0).toString();
  const client = new ResolvClient({ useSilentSwap: options?.useSilentSwap });
  return client.createInvoice({ 
    recipientWallet, 
    invoiceNumber, 
    billerName, 
    items, 
    amount,
    token,
    ...options 
  });
}

/**
 * Quick create gig (TaskRabbit-style, powered by SilentSwap)
 */
export async function quickGig(
  amount: string,
  token: string,
  posterWallet: string,
  title: string,
  description: string,
  category: string,
  options?: Partial<GigParams>
): Promise<Gig> {
  const client = new ResolvClient({ useSilentSwap: options?.useSilentSwap ?? true });
  return client.createGig({ 
    amount, 
    token, 
    posterWallet, 
    title, 
    description, 
    category,
    ...options 
  });
}

/**
 * Extract secret code from URL
 */
export function extractSecretCode(url: string): string | null {
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
 * Extract referral code from URL
 */
export function extractReferralCode(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('ref');
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a Resolv client
 * 
 * Privacy routing powered by SilentSwap (https://silentswap.com)
 */
export function createResolv(config?: ResolvConfig): ResolvClient {
  return new ResolvClient(config);
}

/**
 * Create a Name Resolver
 */
export function createNameResolver(connection: Connection, apiUrl?: string): NameResolver {
  return new NameResolver(connection, apiUrl);
}

// Legacy alias
export const createResolve = createResolv;
export type ResolveConfig = ResolvConfig;
export const ResolveClient = ResolvClient;

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT OBJECT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Styx Resolv - Universal Privacy Payment System
 * 
 * Privacy routing powered by SilentSwap (https://silentswap.com)
 * 
 * Features:
 * - SEND: Send crypto via email/URL
 * - PAY: Create payment requests (payer hidden)
 * - BUY: Product purchase links with privacy
 * - INVOICE: Private invoicing
 * - GIG: TaskRabbit-style private gig economy
 * - REFERRALS: Track conversions with privacy
 */
export const Resolv = {
  ResolvClient,
  NameResolver,
  LINK_TYPES,
  // Quick functions
  quickSend,
  quickPayLink,
  quickBuyLink,
  quickInvoice,
  quickGig,
  // Utilities
  extractSecretCode,
  extractReferralCode,
  createResolv,
  createNameResolver,
};

// Legacy alias
export const Resolve = Resolv;

export default Resolv;
