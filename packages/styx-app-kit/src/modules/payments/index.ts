/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX PRIVATE PAYMENTS
 *  
 *  Private payments on Solana with:
 *  - Stealth addresses (unlinkable recipients)
 *  - Resolv claimable links (no wallet required)
 *  - Gasless transfers (relayer-paid)
 *  - Payment requests & invoices
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  PublicKey,
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from '@noble/ciphers/webcrypto';
import bs58 from 'bs58';
import {
  StyxClient,
  generateStealthAddress,
  scanStealthPayment,
  encryptData,
  decryptData,
  deriveEncryptionKey,
  computeSharedSecret,
  ed25519ToX25519,
  encodeEnvelope,
  EnvelopeKind,
  STYX_PROGRAM_ID,
} from '../../core';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PaymentLink {
  /** Unique link ID */
  id: string;
  /** Claimable URL */
  url: string;
  /** Amount in lamports */
  amount: bigint;
  /** Token mint (null for SOL) */
  mint: PublicKey | null;
  /** Creator's public key */
  creator: PublicKey;
  /** Escrow account holding funds */
  escrow: PublicKey;
  /** Claim secret (encrypted in link) */
  claimSecret: Uint8Array;
  /** Expiration timestamp (0 = never) */
  expiresAt: number;
  /** Memo/description */
  memo?: string;
  /** Whether single or multi-use */
  singleUse: boolean;
  /** Max claims (0 = unlimited) */
  maxClaims: number;
  /** Current claim count */
  claimCount: number;
  /** Creation timestamp */
  createdAt: number;
  /** Status */
  status: 'active' | 'claimed' | 'expired' | 'cancelled';
}

export interface StealthPayment {
  /** Payment ID */
  id: string;
  /** Amount transferred */
  amount: bigint;
  /** Token mint */
  mint: PublicKey | null;
  /** Stealth address (one-time) */
  stealthAddress: PublicKey;
  /** Ephemeral public key (for recipient scanning) */
  ephemeralPubkey: Uint8Array;
  /** View tag for efficient scanning */
  viewTag: number;
  /** Transaction signature */
  signature: string;
  /** Timestamp */
  timestamp: number;
}

export interface PaymentRequest {
  /** Request ID */
  id: string;
  /** Requester's public key */
  requester: PublicKey;
  /** Requested amount */
  amount: bigint;
  /** Token mint */
  mint: PublicKey | null;
  /** Description */
  memo?: string;
  /** Expiration */
  expiresAt: number;
  /** Payment URL/QR data */
  paymentUrl: string;
  /** Status */
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
}

export interface PaymentReceipt {
  paymentId: string;
  amount: bigint;
  mint: PublicKey | null;
  from: PublicKey;
  to: PublicKey;
  signature: string;
  timestamp: number;
  memo?: string;
  fee: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT LINK (Resolv) - Claimable without wallet
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreatePaymentLinkOptions {
  /** Amount in lamports (SOL) or token units */
  amount: bigint;
  /** Token mint (omit for SOL) */
  mint?: PublicKey;
  /** Memo/description */
  memo?: string;
  /** Expiration in seconds from now */
  expiresIn?: number;
  /** Single use (default true) */
  singleUse?: boolean;
  /** Max claims (for multi-use links) */
  maxClaims?: number;
  /** Custom domain for link */
  domain?: string;
}

/**
 * Create a claimable payment link
 * Recipients can claim without having a wallet - perfect for onboarding
 */
export async function createPaymentLink(
  client: StyxClient,
  payer: Keypair,
  options: CreatePaymentLinkOptions
): Promise<PaymentLink> {
  const {
    amount,
    mint = null,
    memo,
    expiresIn,
    singleUse = true,
    maxClaims = 1,
    domain = 'https://pay.styxprivacy.app',
  } = options;

  // Generate claim secret
  const claimSecret = randomBytes(32);
  
  // Derive escrow PDA
  const [escrowPda, escrowBump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('resolv-escrow'),
      payer.publicKey.toBytes(),
      claimSecret.slice(0, 16),
    ],
    STYX_PROGRAM_ID
  );

  // Create payment link ID
  const linkId = bs58.encode(sha256(claimSecret).slice(0, 8));
  
  // Build transaction to fund escrow
  const tx = new Transaction();
  
  // Priority fee for faster confirmation
  tx.add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 })
  );
  
  if (mint === null) {
    // SOL transfer to escrow
    tx.add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: escrowPda,
        lamports: amount,
      })
    );
  } else {
    // Token transfer would use SPL Token program
    // For now, we'll focus on SOL
    throw new Error('Token payment links coming soon');
  }
  
  // Add initialization instruction
  const initData = Buffer.alloc(1 + 8 + 1 + 8 + 4);
  initData[0] = 0x10; // CREATE_PAYMENT_LINK instruction
  initData.writeBigUInt64LE(amount, 1);
  initData[9] = singleUse ? 1 : 0;
  initData.writeBigUInt64LE(BigInt(expiresIn ?? 0), 10);
  initData.writeUInt32LE(maxClaims, 18);
  
  tx.add(
    new TransactionInstruction({
      keys: [
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: STYX_PROGRAM_ID,
      data: initData,
    })
  );
  
  // Sign and send
  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = (await client.connection.getLatestBlockhash()).blockhash;
  tx.sign(payer);
  
  await client.connection.sendRawTransaction(tx.serialize());
  
  // Encode claim secret into URL
  const encodedSecret = bs58.encode(claimSecret);
  const url = `${domain}/claim/${linkId}#${encodedSecret}`;
  
  return {
    id: linkId,
    url,
    amount,
    mint,
    creator: payer.publicKey,
    escrow: escrowPda,
    claimSecret,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : 0,
    memo,
    singleUse,
    maxClaims,
    claimCount: 0,
    createdAt: Date.now(),
    status: 'active',
  };
}

/**
 * Claim a payment link
 * Can be claimed by anyone with the link - creates wallet if needed
 */
export async function claimPaymentLink(
  client: StyxClient,
  linkUrl: string,
  recipient: Keypair
): Promise<PaymentReceipt> {
  // Parse link
  const url = new URL(linkUrl);
  const linkId = url.pathname.split('/').pop()!;
  const claimSecret = bs58.decode(url.hash.slice(1));
  
  // Derive escrow PDA (would need creator pubkey in production)
  // For now, we'll use a simplified approach
  const [escrowPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('resolv-escrow'), claimSecret.slice(0, 16)],
    STYX_PROGRAM_ID
  );
  
  // Get escrow balance
  const escrowInfo = await client.connection.getAccountInfo(escrowPda);
  if (!escrowInfo) {
    throw new Error('Payment link not found or already claimed');
  }
  
  const amount = BigInt(escrowInfo.lamports);
  
  // Build claim transaction
  const claimData = Buffer.alloc(1 + 32);
  claimData[0] = 0x11; // CLAIM_PAYMENT instruction
  claimData.set(claimSecret, 1);
  
  const tx = new Transaction().add(
    new TransactionInstruction({
      keys: [
        { pubkey: recipient.publicKey, isSigner: true, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: STYX_PROGRAM_ID,
      data: claimData,
    })
  );
  
  tx.feePayer = recipient.publicKey;
  tx.recentBlockhash = (await client.connection.getLatestBlockhash()).blockhash;
  tx.sign(recipient);
  
  const signature = await client.connection.sendRawTransaction(tx.serialize());
  
  return {
    paymentId: linkId,
    amount,
    mint: null,
    from: escrowPda,
    to: recipient.publicKey,
    signature,
    timestamp: Date.now(),
    fee: 5000, // Estimated
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEALTH PAYMENTS - Unlinkable recipients
// ═══════════════════════════════════════════════════════════════════════════════

export interface SendStealthPaymentOptions {
  /** Amount in lamports */
  amount: bigint;
  /** Token mint (omit for SOL) */
  mint?: PublicKey;
  /** Recipient's view key (X25519) */
  recipientViewKey: Uint8Array;
  /** Recipient's spend key */
  recipientSpendKey: PublicKey;
  /** Optional memo */
  memo?: string;
}

/**
 * Send a stealth payment
 * Creates a one-time address that only the recipient can detect and spend from
 */
export async function sendStealthPayment(
  client: StyxClient,
  sender: Keypair,
  options: SendStealthPaymentOptions
): Promise<StealthPayment> {
  const {
    amount,
    mint = null,
    recipientViewKey,
    recipientSpendKey,
    memo,
  } = options;

  // Generate stealth address
  const { stealthAddress, ephemeralPubkey, viewTag } = generateStealthAddress(
    recipientViewKey,
    recipientSpendKey
  );

  // Build transaction
  const tx = new Transaction();
  
  tx.add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 })
  );
  
  if (mint === null) {
    // SOL transfer
    tx.add(
      SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: stealthAddress,
        lamports: amount,
      })
    );
  } else {
    throw new Error('Token stealth payments coming soon');
  }
  
  // Add announcement for recipient scanning
  const announcementData = Buffer.alloc(1 + 32 + 1);
  announcementData[0] = 0x20; // STEALTH_ANNOUNCEMENT instruction
  announcementData.set(ephemeralPubkey, 1);
  announcementData[33] = viewTag;
  
  tx.add(
    new TransactionInstruction({
      keys: [
        { pubkey: sender.publicKey, isSigner: true, isWritable: false },
      ],
      programId: STYX_PROGRAM_ID,
      data: announcementData,
    })
  );
  
  tx.feePayer = sender.publicKey;
  tx.recentBlockhash = (await client.connection.getLatestBlockhash()).blockhash;
  tx.sign(sender);
  
  const signature = await client.connection.sendRawTransaction(tx.serialize());
  
  const paymentId = bs58.encode(sha256(ephemeralPubkey).slice(0, 8));
  
  return {
    id: paymentId,
    amount,
    mint,
    stealthAddress,
    ephemeralPubkey,
    viewTag,
    signature,
    timestamp: Date.now(),
  };
}

/**
 * Scan for stealth payments addressed to us
 */
export async function scanStealthPayments(
  client: StyxClient,
  viewSecretKey: Uint8Array,
  spendSecretKey: Uint8Array,
  options?: {
    fromSlot?: number;
    toSlot?: number;
  }
): Promise<StealthPayment[]> {
  // In production, this would scan the indexer for stealth announcements
  // and try to decrypt each one with our view key
  
  const indexerUrl = client.getIndexerUrl();
  
  // Query indexer for announcements
  const response = await fetch(`${indexerUrl}/v1/stealth/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fromSlot: options?.fromSlot ?? 0,
      toSlot: options?.toSlot,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to query indexer');
  }
  
  const { announcements } = await response.json();
  
  const payments: StealthPayment[] = [];
  
  for (const announcement of announcements) {
    const ephemeralPubkey = new Uint8Array(announcement.ephemeralPubkey);
    const viewTag = announcement.viewTag;
    
    // Try to scan
    const result = scanStealthPayment(
      viewSecretKey,
      spendSecretKey,
      ephemeralPubkey,
      viewTag
    );
    
    if (result.matches && result.stealthKeypair) {
      // Check if there's actually a balance
      const balance = await client.connection.getBalance(result.stealthKeypair.publicKey);
      
      if (balance > 0) {
        payments.push({
          id: announcement.id,
          amount: BigInt(balance),
          mint: null,
          stealthAddress: result.stealthKeypair.publicKey,
          ephemeralPubkey,
          viewTag,
          signature: announcement.signature,
          timestamp: announcement.timestamp,
        });
      }
    }
  }
  
  return payments;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT REQUESTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreatePaymentRequestOptions {
  amount: bigint;
  mint?: PublicKey;
  memo?: string;
  expiresIn?: number;
}

/**
 * Create a payment request / invoice
 */
export function createPaymentRequest(
  requester: PublicKey,
  options: CreatePaymentRequestOptions
): PaymentRequest {
  const requestId = bs58.encode(randomBytes(8));
  
  // Encode as Solana Pay URL
  const params = new URLSearchParams();
  params.set('amount', (Number(options.amount) / LAMPORTS_PER_SOL).toString());
  if (options.memo) params.set('memo', options.memo);
  if (options.mint) params.set('spl-token', options.mint.toBase58());
  
  const paymentUrl = `solana:${requester.toBase58()}?${params.toString()}`;
  
  return {
    id: requestId,
    requester,
    amount: options.amount,
    mint: options.mint ?? null,
    memo: options.memo,
    expiresAt: options.expiresIn ? Date.now() + options.expiresIn * 1000 : 0,
    paymentUrl,
    status: 'pending',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE PAYMENTS CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

export class PrivatePaymentsClient {
  private readonly client: StyxClient;
  private readonly signer: Keypair;
  private readonly x25519Keys: { publicKey: Uint8Array; secretKey: Uint8Array };

  constructor(client: StyxClient, signer: Keypair) {
    this.client = client;
    this.signer = signer;
    this.x25519Keys = ed25519ToX25519(signer.secretKey);
  }

  /**
   * Get our view key for receiving stealth payments
   */
  getViewKey(): Uint8Array {
    return this.x25519Keys.publicKey;
  }

  /**
   * Get our spend key
   */
  getSpendKey(): PublicKey {
    return this.signer.publicKey;
  }

  /**
   * Create a claimable payment link
   */
  async createPaymentLink(options: CreatePaymentLinkOptions): Promise<PaymentLink> {
    return createPaymentLink(this.client, this.signer, options);
  }

  /**
   * Claim a payment link
   */
  async claimPaymentLink(linkUrl: string): Promise<PaymentReceipt> {
    return claimPaymentLink(this.client, linkUrl, this.signer);
  }

  /**
   * Send a stealth payment
   */
  async sendStealthPayment(options: SendStealthPaymentOptions): Promise<StealthPayment> {
    return sendStealthPayment(this.client, this.signer, options);
  }

  /**
   * Scan for incoming stealth payments
   */
  async scanIncomingPayments(options?: { fromSlot?: number }): Promise<StealthPayment[]> {
    return scanStealthPayments(
      this.client,
      this.x25519Keys.secretKey,
      this.signer.secretKey,
      options
    );
  }

  /**
   * Create a payment request
   */
  createPaymentRequest(options: CreatePaymentRequestOptions): PaymentRequest {
    return createPaymentRequest(this.signer.publicKey, options);
  }

  /**
   * Send a simple private payment (using stealth address internally)
   */
  async sendPayment(
    recipientViewKey: Uint8Array,
    recipientSpendKey: PublicKey,
    amount: bigint,
    memo?: string
  ): Promise<StealthPayment> {
    return this.sendStealthPayment({
      amount,
      recipientViewKey,
      recipientSpendKey,
      memo,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { PrivatePaymentsClient as PaymentsClient };

// Payment Links (legacy export - use Resolv for new code)
export { 
  PaymentLinksClient,
  PaymentLinkParams,
  PaymentLink,
  ClaimParams,
  ClaimResult as PaymentLinkClaimResult,
} from './payment-links';

// Re-export Resolv as the unified payment system
// Privacy routing powered by SilentSwap (https://silentswap.com)
export * from '../resolve';
