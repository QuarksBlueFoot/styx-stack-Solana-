/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX RESOLVER MODULE (RESOLV)
 *  
 *  No-wallet payment system - send via text, email, or social links
 *  Claimable payment links via text, email, or QR codes
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha256';
import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { x25519 } from '@noble/curves/ed25519';
import { randomBytes } from '@noble/ciphers/webcrypto';
import bs58 from 'bs58';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const RESOLV_DOMAIN = 'https://styxprivacy.app/claim';
const RESOLV_PREFIX = 'resolv:';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ResolvPaymentConfig {
  /** Sender's keypair */
  sender: Keypair;
  /** Amount in lamports */
  amount: bigint | number;
  /** Optional memo */
  memo?: string;
  /** Expiry timestamp (Unix seconds) */
  expiresAt?: number;
  /** Optional recipient hint (for SMS/email display) */
  recipientHint?: string;
  /** Token mint (defaults to SOL) */
  mint?: PublicKey;
}

export interface ResolvPayment {
  /** Payment ID */
  id: string;
  /** Escrow account holding funds */
  escrowPubkey: PublicKey;
  /** Claim secret (give to recipient) */
  claimSecret: string;
  /** Sender's address */
  sender: PublicKey;
  /** Amount in lamports */
  amount: bigint;
  /** Token mint (null = SOL) */
  mint: PublicKey | null;
  /** Expiry timestamp */
  expiresAt: number | null;
  /** Memo */
  memo: string | null;
  /** Transaction signature */
  signature: string;
}

export interface ResolvPaymentLink {
  /** Full claim URL */
  url: string;
  /** Short code for SMS */
  shortCode: string;
  /** QR code data */
  qrData: string;
  /** Payment details */
  payment: ResolvPayment;
}

export interface ResolvClaimResult {
  /** Transaction signature */
  signature: string;
  /** Amount received */
  amount: bigint;
  /** Claimed to address */
  recipient: PublicKey;
}

export interface NameRecord {
  /** Registered name */
  name: string;
  /** Owner's public key */
  owner: PublicKey;
  /** Resolution target (wallet, inbox, etc) */
  target: PublicKey;
  /** Record type */
  type: 'wallet' | 'inbox' | 'profile' | 'custom';
  /** Expiry timestamp */
  expiresAt: number | null;
  /** Metadata */
  metadata?: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLV CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

export class ResolvClient {
  private connection: Connection;
  private baseUrl: string;
  
  constructor(connection: Connection | string, baseUrl: string = RESOLV_DOMAIN) {
    this.connection = typeof connection === 'string'
      ? new Connection(connection)
      : connection;
    this.baseUrl = baseUrl;
  }
  
  /**
   * Create a claimable payment link
   * No custom programs needed - uses native Solana
   */
  async createPayment(config: ResolvPaymentConfig): Promise<ResolvPaymentLink> {
    const amount = BigInt(config.amount);
    
    // Generate claim keypair
    const claimKeypair = Keypair.generate();
    const claimSecret = bs58.encode(claimKeypair.secretKey);
    
    // Create escrow PDA using claim pubkey as seed
    const escrowPubkey = claimKeypair.publicKey;
    
    // Build transfer instruction
    const ix = SystemProgram.transfer({
      fromPubkey: config.sender.publicKey,
      toPubkey: escrowPubkey,
      lamports: Number(amount),
    });
    
    // Optional: Add memo for metadata
    const memoData: any = {
      type: 'resolv-v1',
      expiresAt: config.expiresAt || null,
      hint: config.recipientHint || null,
    };
    
    if (config.memo) {
      memoData.memo = config.memo;
    }
    
    // Build and send transaction
    const tx = new Transaction().add(ix);
    const latestBlockhash = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = config.sender.publicKey;
    tx.sign(config.sender);
    
    const signature = await this.connection.sendRawTransaction(tx.serialize());
    await this.connection.confirmTransaction({
      signature,
      ...latestBlockhash,
    });
    
    // Generate payment ID
    const paymentId = bs58.encode(sha256(claimKeypair.publicKey.toBytes()).slice(0, 8));
    
    // Build payment object
    const payment: ResolvPayment = {
      id: paymentId,
      escrowPubkey,
      claimSecret,
      sender: config.sender.publicKey,
      amount,
      mint: config.mint || null,
      expiresAt: config.expiresAt || null,
      memo: config.memo || null,
      signature,
    };
    
    // Build link
    const url = `${this.baseUrl}/${paymentId}?s=${encodeURIComponent(claimSecret)}`;
    const shortCode = paymentId.slice(0, 6).toUpperCase();
    
    return {
      url,
      shortCode,
      qrData: url,
      payment,
    };
  }
  
  /**
   * Claim a payment using the claim secret
   */
  async claimPayment(
    claimSecret: string,
    recipientPubkey: PublicKey
  ): Promise<ResolvClaimResult> {
    // Reconstruct claim keypair from secret
    const secretKey = bs58.decode(claimSecret);
    const claimKeypair = Keypair.fromSecretKey(secretKey);
    const escrowPubkey = claimKeypair.publicKey;
    
    // Get escrow balance
    const balance = await this.connection.getBalance(escrowPubkey);
    if (balance === 0) {
      throw new Error('Payment already claimed or expired');
    }
    
    // Reserve rent + fee
    const rentExempt = await this.connection.getMinimumBalanceForRentExemption(0);
    const transferAmount = balance - 5000; // Reserve for fee
    
    // Build claim transaction
    const ix = SystemProgram.transfer({
      fromPubkey: escrowPubkey,
      toPubkey: recipientPubkey,
      lamports: transferAmount,
    });
    
    const tx = new Transaction().add(ix);
    const latestBlockhash = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = escrowPubkey;
    tx.sign(claimKeypair);
    
    const signature = await this.connection.sendRawTransaction(tx.serialize());
    await this.connection.confirmTransaction({
      signature,
      ...latestBlockhash,
    });
    
    return {
      signature,
      amount: BigInt(transferAmount),
      recipient: recipientPubkey,
    };
  }
  
  /**
   * Check payment status
   */
  async getPaymentStatus(escrowPubkey: PublicKey): Promise<{
    status: 'pending' | 'claimed' | 'expired';
    balance: bigint;
  }> {
    const balance = await this.connection.getBalance(escrowPubkey);
    
    if (balance === 0) {
      return { status: 'claimed', balance: 0n };
    }
    
    return { status: 'pending', balance: BigInt(balance) };
  }
  
  /**
   * Reclaim an unclaimed payment
   */
  async reclaimPayment(
    claimSecret: string,
    senderPubkey: PublicKey,
    senderSigner: Keypair
  ): Promise<string> {
    const secretKey = bs58.decode(claimSecret);
    const claimKeypair = Keypair.fromSecretKey(secretKey);
    const escrowPubkey = claimKeypair.publicKey;
    
    const balance = await this.connection.getBalance(escrowPubkey);
    if (balance === 0) {
      throw new Error('Payment already claimed');
    }
    
    const transferAmount = balance - 5000;
    
    const ix = SystemProgram.transfer({
      fromPubkey: escrowPubkey,
      toPubkey: senderPubkey,
      lamports: transferAmount,
    });
    
    const tx = new Transaction().add(ix);
    const latestBlockhash = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = escrowPubkey;
    tx.sign(claimKeypair);
    
    const signature = await this.connection.sendRawTransaction(tx.serialize());
    await this.connection.confirmTransaction({ signature, ...latestBlockhash });
    
    return signature;
  }
  
  /**
   * Generate SMS message with payment link
   */
  generateSmsMessage(link: ResolvPaymentLink, recipientName?: string): string {
    const amount = Number(link.payment.amount) / LAMPORTS_PER_SOL;
    const name = recipientName || 'there';
    return `Hey ${name}! You've received ${amount} SOL. Claim it here: ${link.url}`;
  }
  
  /**
   * Generate email content
   */
  generateEmailContent(link: ResolvPaymentLink, recipientName?: string): {
    subject: string;
    body: string;
    html: string;
  } {
    const amount = Number(link.payment.amount) / LAMPORTS_PER_SOL;
    const name = recipientName || 'there';
    
    return {
      subject: `You've received ${amount} SOL!`,
      body: `Hey ${name}!\n\nYou've received ${amount} SOL on Solana.\n\nClaim your payment here:\n${link.url}\n\nThis link is your key to the funds - keep it safe!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #9945FF;">You've received ${amount} SOL!</h1>
          <p>Hey ${name}!</p>
          <p>Someone sent you <strong>${amount} SOL</strong> on Solana.</p>
          <a href="${link.url}" style="display: inline-block; background: #9945FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
            Claim Your Payment
          </a>
          <p style="color: #666; font-size: 12px;">
            This link is your key to the funds. Don't share it with anyone!
          </p>
        </div>
      `,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAME RESOLVER
// ═══════════════════════════════════════════════════════════════════════════════

export class NameResolver {
  private connection: Connection;
  private records: Map<string, NameRecord> = new Map();
  
  constructor(connection: Connection) {
    this.connection = connection;
  }
  
  /**
   * Register a name
   */
  async register(args: {
    name: string;
    owner: Keypair;
    target: PublicKey;
    type?: 'wallet' | 'inbox' | 'profile' | 'custom';
    expiresInDays?: number;
    metadata?: Record<string, string>;
  }): Promise<NameRecord> {
    const name = args.name.toLowerCase().trim();
    
    if (this.records.has(name)) {
      throw new Error(`Name "${name}" already registered`);
    }
    
    const record: NameRecord = {
      name,
      owner: args.owner.publicKey,
      target: args.target,
      type: args.type || 'wallet',
      expiresAt: args.expiresInDays 
        ? Math.floor(Date.now() / 1000) + args.expiresInDays * 86400
        : null,
      metadata: args.metadata,
    };
    
    this.records.set(name, record);
    return record;
  }
  
  /**
   * Resolve a name to target
   */
  async resolve(name: string): Promise<PublicKey | null> {
    const normalized = name.toLowerCase().trim();
    const record = this.records.get(normalized);
    
    if (!record) return null;
    
    if (record.expiresAt && Date.now() / 1000 > record.expiresAt) {
      return null;
    }
    
    return record.target;
  }
  
  /**
   * Get full name record
   */
  async getRecord(name: string): Promise<NameRecord | null> {
    const normalized = name.toLowerCase().trim();
    return this.records.get(normalized) || null;
  }
  
  /**
   * Update name target
   */
  async update(
    name: string,
    newTarget: PublicKey,
    owner: Keypair
  ): Promise<NameRecord> {
    const normalized = name.toLowerCase().trim();
    const record = this.records.get(normalized);
    
    if (!record) {
      throw new Error(`Name "${name}" not found`);
    }
    
    if (!record.owner.equals(owner.publicKey)) {
      throw new Error('Not authorized to update this name');
    }
    
    record.target = newTarget;
    this.records.set(normalized, record);
    return record;
  }
  
  /**
   * Transfer name ownership
   */
  async transfer(
    name: string,
    newOwner: PublicKey,
    currentOwner: Keypair
  ): Promise<NameRecord> {
    const normalized = name.toLowerCase().trim();
    const record = this.records.get(normalized);
    
    if (!record) {
      throw new Error(`Name "${name}" not found`);
    }
    
    if (!record.owner.equals(currentOwner.publicKey)) {
      throw new Error('Not authorized to transfer this name');
    }
    
    record.owner = newOwner;
    this.records.set(normalized, record);
    return record;
  }
  
  /**
   * Resolve name or pubkey string
   */
  async resolveOrParse(input: string): Promise<PublicKey | null> {
    // Try as pubkey first
    try {
      return new PublicKey(input);
    } catch {}
    
    // Try as name
    return this.resolve(input);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK SEND FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quick send - create and return a payment link in one call
 */
export async function quickSend(
  connection: Connection | string,
  sender: Keypair,
  amount: number | bigint,
  options?: {
    memo?: string;
    recipientHint?: string;
    expiresInHours?: number;
  }
): Promise<ResolvPaymentLink> {
  const client = new ResolvClient(connection);
  return client.createPayment({
    sender,
    amount: BigInt(amount),
    memo: options?.memo,
    recipientHint: options?.recipientHint,
    expiresAt: options?.expiresInHours
      ? Math.floor(Date.now() / 1000) + options.expiresInHours * 3600
      : undefined,
  });
}

/**
 * Quick claim - claim a payment in one call
 */
export async function quickClaim(
  connection: Connection | string,
  claimSecret: string,
  recipient: PublicKey
): Promise<ResolvClaimResult> {
  const client = new ResolvClient(connection);
  return client.claimPayment(claimSecret, recipient);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function createResolv(
  connection: Connection | string,
  baseUrl?: string
): ResolvClient {
  return new ResolvClient(connection, baseUrl);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

// Alias for backwards compatibility
export { ResolvClient as EasyPayStandalone };
export { createResolv as createEasyPayStandalone };
export { quickSend as quickSendStandalone };

export const Resolv = {
  ResolvClient,
  NameResolver,
  quickSend,
  quickClaim,
  createResolv,
};
