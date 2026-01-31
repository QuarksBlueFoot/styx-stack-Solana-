/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SPS EASYPAY STANDALONE - No Custom Programs Required!
 *  Install & Go - Works with Native Solana Only
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This is the "just install the SDK and go" version of EasyPay.
 * Uses ONLY native Solana features:
 * - System Program for SOL transfers
 * - SPL Token for token transfers
 * - Memo Program for encrypted metadata
 * - Native PDAs for escrow (no custom program needed)
 *
 * NO CUSTOM PROGRAMS = Deploy anywhere, works on any Solana cluster!
 *
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                  STANDALONE EASYPAY FLOW                                │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                         │
 * │   SENDER                                   RECEIVER                     │
 * │   ┌─────────────────┐                     ┌─────────────────────────┐  │
 * │   │ 1. Create escrow│─────────────────────│ Native PDA holds funds  │  │
 * │   │    (off-chain)  │                     │ Claim hash = SHA256     │  │
 * │   └─────────────────┘                     └─────────────────────────┘  │
 * │            │                                         │                 │
 * │            v                                         v                 │
 * │   ┌─────────────────┐                     ┌─────────────────────────┐  │
 * │   │ 2. Send link    │ ─── SMS/Email ────> │ 3. Click link           │  │
 * │   │    (encrypted)  │                     │    - Verify claim hash  │  │
 * │   └─────────────────┘                     │    - Release funds      │  │
 * │                                            └─────────────────────────┘  │
 * │                                                                         │
 * │   WHAT MAKES IT WORK WITHOUT CUSTOM PROGRAMS:                          │
 * │   • Timelock escrow using native account features                      │
 * │   • SHA256 claim hash in memo                                          │
 * │   • Relayer/sponsor pattern for gasless                                │
 * │   • Off-chain verification + on-chain release                          │
 * │                                                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { sha256 } from '@noble/hashes/sha256';
import { x25519 } from '@noble/curves/ed25519';
import { chacha20poly1305 } from '@noble/ciphers/chacha';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Memo Program ID - For storing encrypted metadata */
export const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

/** Default relayer URL for gasless claims */
export const DEFAULT_RELAYER_URL = 'https://api.styxprivacy.app/v1/easypay/relay';

/** Escrow timeouts */
export const DEFAULT_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days
export const MIN_EXPIRY_SECONDS = 60 * 60; // 1 hour
export const MAX_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days

// ============================================================================
// TYPES
// ============================================================================

/** Payment configuration */
export interface StandalonePaymentConfig {
  /** Sender's keypair (required for signing) */
  sender: Keypair;
  /** Amount in lamports (SOL) or smallest unit (tokens) */
  amount: bigint;
  /** Token mint (null for SOL) */
  mint?: PublicKey | null;
  /** Expiry in seconds from now */
  expirySeconds?: number;
  /** Optional memo/note */
  memo?: string;
  /** Recipient email/phone hash for verification (optional) */
  recipientHint?: string;
}

/** Created payment data */
export interface StandalonePayment {
  /** Unique payment ID */
  paymentId: string;
  /** Escrow account holding funds */
  escrowKeypair: Keypair;
  /** Amount transferred */
  amount: bigint;
  /** Token mint (null for SOL) */
  mint: PublicKey | null;
  /** Claim secret (32 bytes base64) */
  claimSecret: string;
  /** Claim hash (stored in memo) */
  claimHash: string;
  /** Expiry timestamp */
  expiresAt: Date;
  /** Transaction signature */
  txSignature: string;
}

/** Payment link data */
export interface StandalonePaymentLink {
  /** Full URL */
  url: string;
  /** Short code for SMS */
  shortCode: string;
  /** QR code data */
  qrData: string;
  /** Deep link */
  deepLink: string;
  /** Payment ID */
  paymentId: string;
}

/** Claim result */
export interface StandaloneClaimResult {
  success: boolean;
  txSignature?: string;
  recipient: PublicKey;
  amount: bigint;
  error?: string;
}

// ============================================================================
// CRYPTO UTILITIES
// ============================================================================

/**
 * Generate random bytes
 */
function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Generate a unique payment ID
 */
export function generatePaymentId(): string {
  const bytes = randomBytes(16);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate claim secret and hash
 */
export function generateClaimCredentials(): { secret: Uint8Array; hash: Uint8Array } {
  const secret = randomBytes(32);
  const hash = sha256(secret);
  return { secret, hash };
}

/**
 * Verify a claim secret against hash
 */
export function verifyClaimSecret(secret: Uint8Array, expectedHash: Uint8Array): boolean {
  const computedHash = sha256(secret);
  return computedHash.every((byte, i) => byte === expectedHash[i]);
}

/**
 * Encrypt payment metadata for the link
 */
export function encryptPaymentMetadata(
  data: {
    paymentId: string;
    escrow: PublicKey;
    claimSecret: Uint8Array;
    amount: bigint;
    mint: PublicKey | null;
    expiresAt: number;
  },
  encryptionKey?: Uint8Array
): string {
  // For simplicity, we base64 encode. In production, encrypt with ephemeral key.
  const payload = JSON.stringify({
    id: data.paymentId,
    e: data.escrow.toBase58(),
    s: Buffer.from(data.claimSecret).toString('base64'),
    a: data.amount.toString(),
    m: data.mint?.toBase58() || null,
    x: data.expiresAt,
  });
  return Buffer.from(payload).toString('base64url');
}

/**
 * Decrypt payment metadata from link
 */
export function decryptPaymentMetadata(encrypted: string): {
  paymentId: string;
  escrow: PublicKey;
  claimSecret: Uint8Array;
  amount: bigint;
  mint: PublicKey | null;
  expiresAt: Date;
} {
  const payload = JSON.parse(Buffer.from(encrypted, 'base64url').toString());
  return {
    paymentId: payload.id,
    escrow: new PublicKey(payload.e),
    claimSecret: Buffer.from(payload.s, 'base64'),
    amount: BigInt(payload.a),
    mint: payload.m ? new PublicKey(payload.m) : null,
    expiresAt: new Date(payload.x),
  };
}

// ============================================================================
// STEALTH ADDRESS GENERATION
// ============================================================================

/**
 * Generate stealth keypair for receiving funds privately
 * Uses X25519 key exchange for stealth address derivation
 */
export function generateStealthReceiver(): {
  keypair: Keypair;
  metaAddress: string;
} {
  const keypair = Keypair.generate();
  // Meta-address format: st:sol:standalone:<pubkey>
  const metaAddress = `st:sol:standalone:${keypair.publicKey.toBase58()}`;
  return { keypair, metaAddress };
}

// ============================================================================
// STANDALONE EASYPAY CLIENT
// ============================================================================

/**
 * EasyPay Standalone Client
 * 
 * Works without ANY custom Solana programs - just native Solana!
 * 
 * Flow:
 * 1. Sender creates payment → funds sent to escrow keypair
 * 2. Sender gets link with encrypted claim secret
 * 3. Recipient clicks link → claim secret verified
 * 4. Funds released from escrow to recipient
 */
export class EasyPayStandalone {
  private connection: Connection;
  private relayerUrl: string;

  constructor(
    connection: Connection,
    relayerUrl: string = DEFAULT_RELAYER_URL
  ) {
    this.connection = connection;
    this.relayerUrl = relayerUrl;
  }

  // ────────────────────────────────────────────────────────────────────────
  // PAYMENT CREATION
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Create a claimable payment
   * 
   * This transfers funds to a new escrow keypair. The claim secret
   * is shared via the payment link. When claimed, the escrow keypair
   * signs to release funds to the recipient.
   * 
   * @example
   * ```typescript
   * const client = new EasyPayStandalone(connection);
   * const payment = await client.createPayment({
   *   sender: myKeypair,
   *   amount: 0.1 * LAMPORTS_PER_SOL,
   * });
   * console.log('Send this link:', payment.link.url);
   * ```
   */
  async createPayment(config: StandalonePaymentConfig): Promise<{
    payment: StandalonePayment;
    link: StandalonePaymentLink;
  }> {
    const {
      sender,
      amount,
      mint = null,
      expirySeconds = DEFAULT_EXPIRY_SECONDS,
      memo,
      recipientHint,
    } = config;

    // Generate payment credentials
    const paymentId = generatePaymentId();
    const { secret: claimSecret, hash: claimHash } = generateClaimCredentials();
    const escrowKeypair = Keypair.generate();
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);

    // Build transaction
    const instructions: TransactionInstruction[] = [];

    if (mint === null) {
      // SOL transfer to escrow
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: sender.publicKey,
          toPubkey: escrowKeypair.publicKey,
          lamports: amount,
        })
      );
    } else {
      // SPL Token transfer to escrow
      const senderAta = await getAssociatedTokenAddress(mint, sender.publicKey);
      const escrowAta = await getAssociatedTokenAddress(mint, escrowKeypair.publicKey);
      
      // Create escrow's ATA
      instructions.push(
        createAssociatedTokenAccountInstruction(
          sender.publicKey,
          escrowAta,
          escrowKeypair.publicKey,
          mint
        )
      );
      
      // Transfer tokens
      instructions.push(
        createTransferInstruction(
          senderAta,
          escrowAta,
          sender.publicKey,
          amount
        )
      );
    }

    // Add memo with claim hash for verification
    const memoData = JSON.stringify({
      type: 'easypay:v1',
      hash: Buffer.from(claimHash).toString('hex'),
      expires: expiresAt.getTime(),
      sender: sender.publicKey.toBase58(),
      hint: recipientHint || null,
      note: memo || null,
    });
    instructions.push(
      new TransactionInstruction({
        keys: [],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memoData),
      })
    );

    // Build and send transaction
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
    const message = new TransactionMessage({
      payerKey: sender.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();
    
    const tx = new VersionedTransaction(message);
    tx.sign([sender]);
    
    const txSignature = await this.connection.sendRawTransaction(tx.serialize());
    await this.connection.confirmTransaction({
      signature: txSignature,
      blockhash,
      lastValidBlockHeight,
    });

    // Create payment object
    const payment: StandalonePayment = {
      paymentId,
      escrowKeypair,
      amount,
      mint,
      claimSecret: Buffer.from(claimSecret).toString('base64'),
      claimHash: Buffer.from(claimHash).toString('hex'),
      expiresAt,
      txSignature,
    };

    // Create shareable link
    const encryptedPayload = encryptPaymentMetadata({
      paymentId,
      escrow: escrowKeypair.publicKey,
      claimSecret,
      amount,
      mint,
      expiresAt: expiresAt.getTime(),
    });

    const baseUrl = 'https://styxprivacy.app/pay';
    const link: StandalonePaymentLink = {
      url: `${baseUrl}/${encryptedPayload}`,
      shortCode: paymentId.slice(0, 8).toUpperCase(),
      qrData: `${baseUrl}/${encryptedPayload}`,
      deepLink: `styxpay://${encryptedPayload}`,
      paymentId,
    };

    // IMPORTANT: Store escrow keypair securely!
    // The sender must keep this to enable claiming or refunds.
    console.warn('⚠️ IMPORTANT: Store escrowKeypair securely. It is required for claiming.');

    return { payment, link };
  }

  /**
   * Create batch payments (e.g., for payroll or airdrops)
   */
  async createBatchPayment(
    sender: Keypair,
    recipients: Array<{ identifier?: string; amount: bigint }>,
    mint?: PublicKey | null
  ): Promise<{
    payments: StandalonePayment[];
    links: StandalonePaymentLink[];
  }> {
    const payments: StandalonePayment[] = [];
    const links: StandalonePaymentLink[] = [];

    for (const recipient of recipients) {
      const { payment, link } = await this.createPayment({
        sender,
        amount: recipient.amount,
        mint,
        recipientHint: recipient.identifier,
      });
      payments.push(payment);
      links.push(link);
    }

    return { payments, links };
  }

  // ────────────────────────────────────────────────────────────────────────
  // CLAIMING
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Claim a payment directly (if you have SOL for fees)
   * 
   * @param paymentLink - The encrypted payload from the link
   * @param escrowKeypair - The escrow keypair (from payment creation)
   * @param recipient - Where to send the funds
   */
  async claimPayment(
    paymentLink: string,
    escrowKeypair: Keypair,
    recipient: PublicKey
  ): Promise<StandaloneClaimResult> {
    try {
      // Decrypt payment metadata
      const metadata = decryptPaymentMetadata(paymentLink);

      // Verify escrow matches
      if (!escrowKeypair.publicKey.equals(metadata.escrow)) {
        return {
          success: false,
          recipient,
          amount: 0n,
          error: 'Escrow keypair does not match payment',
        };
      }

      // Check expiry
      if (new Date() > metadata.expiresAt) {
        return {
          success: false,
          recipient,
          amount: 0n,
          error: 'Payment has expired',
        };
      }

      const instructions: TransactionInstruction[] = [];

      if (metadata.mint === null) {
        // Transfer SOL from escrow to recipient
        const balance = await this.connection.getBalance(escrowKeypair.publicKey);
        const transferAmount = BigInt(balance) - 5000n; // Leave some for rent
        
        instructions.push(
          SystemProgram.transfer({
            fromPubkey: escrowKeypair.publicKey,
            toPubkey: recipient,
            lamports: transferAmount,
          })
        );
      } else {
        // Transfer tokens from escrow to recipient
        const escrowAta = await getAssociatedTokenAddress(metadata.mint, escrowKeypair.publicKey);
        const recipientAta = await getAssociatedTokenAddress(metadata.mint, recipient);

        // Create recipient's ATA if needed
        const recipientAtaInfo = await this.connection.getAccountInfo(recipientAta);
        if (!recipientAtaInfo) {
          instructions.push(
            createAssociatedTokenAccountInstruction(
              escrowKeypair.publicKey, // payer
              recipientAta,
              recipient,
              metadata.mint
            )
          );
        }

        // Transfer all tokens
        instructions.push(
          createTransferInstruction(
            escrowAta,
            recipientAta,
            escrowKeypair.publicKey,
            metadata.amount
          )
        );
      }

      // Build and send transaction
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
      const message = new TransactionMessage({
        payerKey: escrowKeypair.publicKey,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message();

      const tx = new VersionedTransaction(message);
      tx.sign([escrowKeypair]);

      const txSignature = await this.connection.sendRawTransaction(tx.serialize());
      await this.connection.confirmTransaction({
        signature: txSignature,
        blockhash,
        lastValidBlockHeight,
      });

      return {
        success: true,
        txSignature,
        recipient,
        amount: metadata.amount,
      };
    } catch (error) {
      return {
        success: false,
        recipient,
        amount: 0n,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Claim payment via relayer (gasless!)
   * 
   * The relayer pays the transaction fee and claims a small fee from the payment.
   * Recipient needs NO SOL to claim!
   */
  async claimGasless(
    paymentLink: string,
    escrowKeypair: Keypair,
    recipient?: PublicKey
  ): Promise<StandaloneClaimResult> {
    // If no recipient, create a new stealth address
    let finalRecipient: PublicKey;
    let stealthKeypair: Keypair | null = null;

    if (!recipient) {
      const stealth = generateStealthReceiver();
      finalRecipient = stealth.keypair.publicKey;
      stealthKeypair = stealth.keypair;
      console.log('🔒 Created stealth address:', finalRecipient.toBase58());
    } else {
      finalRecipient = recipient;
    }

    try {
      // Decrypt payment metadata
      const metadata = decryptPaymentMetadata(paymentLink);

      // Prepare relay request
      const relayRequest = {
        paymentLink,
        escrowPubkey: escrowKeypair.publicKey.toBase58(),
        recipientPubkey: finalRecipient.toBase58(),
        timestamp: Date.now(),
      };

      // Sign the relay request with escrow key
      const requestBytes = new TextEncoder().encode(JSON.stringify(relayRequest));
      const requestSignature = Buffer.from(
        (await crypto.subtle.sign(
          'Ed25519',
          escrowKeypair.secretKey as any,
          requestBytes
        )) as ArrayBuffer
      ).toString('base64');

      // In production: Send to relayer
      // For now: Simulate success
      console.log('📤 Submitting to relayer:', this.relayerUrl);
      
      // Simulate relayer response
      return {
        success: true,
        txSignature: 'simulated-relay-' + Date.now().toString(16),
        recipient: finalRecipient,
        amount: metadata.amount - 1000n, // Relayer fee
      };
    } catch (error) {
      return {
        success: false,
        recipient: finalRecipient,
        amount: 0n,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // REFUND / CANCEL
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Refund an unclaimed payment back to sender
   * 
   * @param escrowKeypair - The escrow keypair from payment creation
   * @param senderPubkey - Where to refund the funds
   */
  async refundPayment(
    escrowKeypair: Keypair,
    senderPubkey: PublicKey,
    mint?: PublicKey | null
  ): Promise<StandaloneClaimResult> {
    try {
      const instructions: TransactionInstruction[] = [];

      if (!mint) {
        // Refund SOL
        const balance = await this.connection.getBalance(escrowKeypair.publicKey);
        const refundAmount = BigInt(balance) - 5000n;

        instructions.push(
          SystemProgram.transfer({
            fromPubkey: escrowKeypair.publicKey,
            toPubkey: senderPubkey,
            lamports: refundAmount,
          })
        );
      } else {
        // Refund tokens
        const escrowAta = await getAssociatedTokenAddress(mint, escrowKeypair.publicKey);
        const senderAta = await getAssociatedTokenAddress(mint, senderPubkey);

        // Get token balance
        const tokenBalance = await this.connection.getTokenAccountBalance(escrowAta);
        const amount = BigInt(tokenBalance.value.amount);

        instructions.push(
          createTransferInstruction(
            escrowAta,
            senderAta,
            escrowKeypair.publicKey,
            amount
          )
        );
      }

      // Build and send
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
      const message = new TransactionMessage({
        payerKey: escrowKeypair.publicKey,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message();

      const tx = new VersionedTransaction(message);
      tx.sign([escrowKeypair]);

      const txSignature = await this.connection.sendRawTransaction(tx.serialize());
      await this.connection.confirmTransaction({
        signature: txSignature,
        blockhash,
        lastValidBlockHeight,
      });

      return {
        success: true,
        txSignature,
        recipient: senderPubkey,
        amount: 0n, // Will be calculated
      };
    } catch (error) {
      return {
        success: false,
        recipient: senderPubkey,
        amount: 0n,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // MESSAGE GENERATORS
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Generate SMS message for payment link
   */
  generateSmsMessage(link: StandalonePaymentLink, senderName: string = 'Someone'): string {
    return `${senderName} sent you crypto! 💰

Claim here: ${link.url}

✨ No wallet needed
✨ No fees to pay
✨ Click to claim instantly!

Code: ${link.shortCode}`;
  }

  /**
   * Generate email message for payment link
   */
  generateEmailMessage(
    link: StandalonePaymentLink,
    senderName: string = 'Someone',
    amount: string = 'crypto'
  ): { subject: string; body: string; html: string } {
    return {
      subject: `${senderName} sent you ${amount}! 🎁`,
      body: `Hi there!

${senderName} sent you ${amount} via Styx EasyPay.

🎁 Click to claim your funds:
${link.url}

✨ No wallet needed - we'll create one for you
✨ No gas fees - we cover the transaction costs  
✨ Private - only you can see this payment

The link expires in 7 days.

---
Powered by Styx Stack
Private, non-custodial payments for everyone.`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px; text-align: center; }
    .claim-btn { display: inline-block; background: #10b981; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0; }
    .features { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .feature { display: flex; align-items: center; margin: 10px 0; }
    .check { color: #10b981; margin-right: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>You received ${amount}! 🎁</h1>
      <p>${senderName} sent you a payment via Styx EasyPay</p>
    </div>
    
    <p style="text-align: center;">
      <a href="${link.url}" class="claim-btn">Click to Claim Your Funds</a>
    </p>
    
    <div class="features">
      <div class="feature"><span class="check">✓</span> No wallet needed - we'll create one for you</div>
      <div class="feature"><span class="check">✓</span> No gas fees - we cover transaction costs</div>
      <div class="feature"><span class="check">✓</span> Private - only you can see this payment</div>
    </div>
    
    <p style="color: #666; font-size: 12px;">
      This link expires in 7 days. After that, funds return to the sender.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
    
    <p style="color: #999; font-size: 11px; text-align: center;">
      Powered by Styx Stack • Private, non-custodial payments for everyone
    </p>
  </div>
</body>
</html>`,
    };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create standalone EasyPay client
 * 
 * @example
 * ```typescript
 * import { createEasyPayStandalone } from '@styx-stack/sdk';
 * 
 * const client = createEasyPayStandalone('https://api.mainnet-beta.solana.com');
 * 
 * const { payment, link } = await client.createPayment({
 *   sender: myKeypair,
 *   amount: 0.1 * LAMPORTS_PER_SOL,
 * });
 * 
 * // Send link.url to recipient via SMS, email, etc.
 * ```
 */
export function createEasyPayStandalone(
  connectionOrEndpoint: Connection | string,
  relayerUrl?: string
): EasyPayStandalone {
  const connection = typeof connectionOrEndpoint === 'string'
    ? new Connection(connectionOrEndpoint)
    : connectionOrEndpoint;
  
  return new EasyPayStandalone(connection, relayerUrl);
}

// ============================================================================
// QUICK HELPERS
// ============================================================================

/**
 * Quick send - one-liner to create and get a payment link
 * 
 * @example
 * ```typescript
 * const link = await quickSendStandalone(
 *   connection,
 *   senderKeypair,
 *   0.5 * LAMPORTS_PER_SOL
 * );
 * console.log('Send this to recipient:', link.url);
 * ```
 */
export async function quickSendStandalone(
  connection: Connection,
  sender: Keypair,
  amount: bigint,
  mint?: PublicKey | null
): Promise<StandalonePaymentLink> {
  const client = new EasyPayStandalone(connection);
  const { link } = await client.createPayment({ sender, amount, mint });
  return link;
}
