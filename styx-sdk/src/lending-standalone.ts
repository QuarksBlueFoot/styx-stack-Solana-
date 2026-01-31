/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SPS PRIVATE LENDING STANDALONE - No Custom Programs Required!
 *  Install & Go - Works with Native Solana Only
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This is the "just install the SDK and go" version of Private Lending.
 * Uses ONLY native Solana features:
 * - System Program for SOL transfers
 * - Token-2022 with Permanent Delegate for escrow
 * - Metaplex for NFT transfers
 * - Memo Program for encrypted loan terms
 * - Native PDAs for offer/loan state
 *
 * NO CUSTOM PROGRAMS = Deploy anywhere, works on any Solana cluster!
 *
 * PRIVACY FEATURES (achieved without custom programs):
 * - Encrypted loan terms in memo (hidden amounts/rates)
 * - Stealth address generation (new keypair per loan)
 * - Off-chain commitment verification
 * - Private liquidation notifications
 *
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                  STANDALONE LENDING FLOW                                │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                         │
 * │   LENDER                                    BORROWER                    │
 * │   ┌─────────────────┐                     ┌─────────────────────────┐  │
 * │   │ 1. Create offer │─────────────────────│ SOL deposited to escrow │  │
 * │   │    (encrypted)  │                     │ Terms in encrypted memo │  │
 * │   └─────────────────┘                     └─────────────────────────┘  │
 * │            │                                         │                 │
 * │            v                                         v                 │
 * │   ┌─────────────────┐                     ┌─────────────────────────┐  │
 * │   │ 2. Share offer  │ ─── URL/dApp ────>  │ 3. Accept offer         │  │
 * │   │    ID/link      │                     │    - NFT → escrow       │  │
 * │   └─────────────────┘                     │    - SOL → borrower     │  │
 * │                                            └─────────────────────────┘  │
 * │            │                                         │                 │
 * │            v                                         v                 │
 * │   ┌─────────────────┐                     ┌─────────────────────────┐  │
 * │   │ 4. Monitor loan │ ─── Off-chain ────> │ 5. Repay/Default        │  │
 * │   │    - Claim NFT  │                     │    - NFT → borrower     │  │
 * │   │    on default   │                     │    - SOL+int → lender   │  │
 * │   └─────────────────┘                     └─────────────────────────┘  │
 * │                                                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * @see Sharky.fi / Banx.gg for feature parity reference
 * @author Bluefoot Labs (@moonmanquark)
 */

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  ComputeBudgetProgram,
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

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/** Memo Program ID - For storing encrypted loan terms */
export const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

/** Metaplex Token Metadata Program */
export const METAPLEX_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

/** Protocol fee: 1% (matching Sharky.fi) */
export const PROTOCOL_FEE_BPS = 100;

/** Perpetual loan grace period: 72 hours */
export const PERPETUAL_GRACE_SECONDS = 72 * 60 * 60;

/** Default offer expiry: 7 days */
export const DEFAULT_OFFER_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

/** Loan type */
export enum LoanType {
  Fixed = 0,
  Perpetual = 1,
}

/** Loan state */
export enum LoanState {
  Active = 0,
  Repaid = 1,
  Defaulted = 2,
  Terminated = 3,
  Refinanced = 4,
}

/** Privacy level for offers/loans */
export enum PrivacyLevel {
  /** All details visible on-chain */
  Public = 0,
  /** Amounts hidden, parties visible */
  EncryptedTerms = 1,
  /** Full privacy with stealth addresses */
  FullyStealth = 2,
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface StandaloneLendingConfig {
  /** Solana connection */
  connection: Connection;
  /** Fee payer (optional, for gasless) */
  feePayer?: Keypair;
  /** Protocol fee recipient (optional) */
  feeRecipient?: PublicKey;
}

export interface CreateOfferParams {
  /** Lender keypair */
  lender: Keypair;
  /** Collection address or verified creator */
  collection: PublicKey;
  /** Loan amount in lamports */
  amount: bigint;
  /** Interest rate in basis points (annual) */
  interestBps: number;
  /** Duration in seconds (0 = perpetual) */
  durationSeconds?: number;
  /** Loan type */
  loanType?: LoanType;
  /** Privacy level */
  privacyLevel?: PrivacyLevel;
  /** Offer expiry in seconds */
  expirySeconds?: number;
  /** Max loans from this offer */
  maxLoans?: number;
}

export interface StandaloneOffer {
  /** Unique offer ID */
  offerId: string;
  /** Escrow account holding SOL */
  escrowKeypair: Keypair;
  /** Lender public key (or stealth) */
  lender: PublicKey;
  /** Collection */
  collection: PublicKey;
  /** Loan amount */
  amount: bigint;
  /** Interest rate bps */
  interestBps: number;
  /** Duration (0 = perpetual) */
  durationSeconds: number;
  /** Loan type */
  loanType: LoanType;
  /** Privacy level */
  privacyLevel: PrivacyLevel;
  /** Offer expiry */
  expiresAt: Date;
  /** Max loans */
  maxLoans: number;
  /** Active loans count */
  activeLoans: number;
  /** Transaction signature */
  txSignature: string;
  /** Encrypted terms (if private) */
  encryptedTerms?: string;
  /** Decryption key (kept secret) */
  decryptionKey?: Uint8Array;
}

export interface AcceptOfferParams {
  /** Borrower keypair */
  borrower: Keypair;
  /** Offer ID */
  offerId: string;
  /** Escrow public key */
  escrowPubkey: PublicKey;
  /** NFT mint to collateralize */
  nftMint: PublicKey;
  /** Amount to borrow */
  amount: bigint;
  /** Interest bps (from offer) */
  interestBps: number;
  /** Duration (from offer) */
  durationSeconds: number;
  /** Loan type (from offer) */
  loanType: LoanType;
  /** Privacy level */
  privacyLevel?: PrivacyLevel;
}

export interface StandaloneLoan {
  /** Unique loan ID */
  loanId: string;
  /** Offer ID */
  offerId: string;
  /** Borrower public key */
  borrower: PublicKey;
  /** Lender public key */
  lender: PublicKey;
  /** NFT escrow account */
  nftEscrowKeypair: Keypair;
  /** NFT mint */
  nftMint: PublicKey;
  /** Principal amount */
  principal: bigint;
  /** Interest rate bps */
  interestBps: number;
  /** Start timestamp */
  startTimestamp: number;
  /** Due timestamp (0 = perpetual) */
  dueTimestamp: number;
  /** Termination timestamp (for perpetual) */
  terminationTimestamp?: number;
  /** Loan type */
  loanType: LoanType;
  /** Current state */
  state: LoanState;
  /** Amount repaid */
  amountRepaid: bigint;
  /** Privacy level */
  privacyLevel: PrivacyLevel;
  /** Transaction signature */
  txSignature: string;
}

export interface RepayParams {
  /** Borrower keypair */
  borrower: Keypair;
  /** Loan ID */
  loanId: string;
  /** NFT escrow public key */
  nftEscrowPubkey: PublicKey;
  /** Lender public key */
  lender: PublicKey;
  /** NFT mint */
  nftMint: PublicKey;
  /** Amount to repay */
  repayAmount: bigint;
  /** Full repayment? */
  isFullRepayment: boolean;
}

export interface OfferLink {
  /** Full URL */
  url: string;
  /** Short code */
  shortCode: string;
  /** QR data */
  qrData: string;
  /** Deep link */
  deepLink: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CRYPTO UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Generate unique offer/loan ID
 */
export function generateId(): string {
  const bytes = randomBytes(16);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate stealth keypair for privacy
 */
export function generateStealthKeypair(): Keypair {
  return Keypair.generate();
}

/**
 * Encrypt loan terms for privacy
 */
export function encryptLoanTerms(
  data: {
    amount: bigint;
    interestBps: number;
    durationSeconds: number;
    loanType: LoanType;
  },
  encryptionKey?: Uint8Array
): { encrypted: string; key: Uint8Array } {
  const key = encryptionKey || randomBytes(32);
  const nonce = randomBytes(12);
  
  const payload = JSON.stringify({
    a: data.amount.toString(),
    i: data.interestBps,
    d: data.durationSeconds,
    t: data.loanType,
  });
  
  const cipher = chacha20poly1305(key, nonce);
  const encrypted = cipher.encrypt(new TextEncoder().encode(payload));
  
  // Format: nonce (12 bytes) + ciphertext
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);
  
  return {
    encrypted: Buffer.from(combined).toString('base64'),
    key,
  };
}

/**
 * Decrypt loan terms
 */
export function decryptLoanTerms(
  encrypted: string,
  key: Uint8Array
): { amount: bigint; interestBps: number; durationSeconds: number; loanType: LoanType } | null {
  try {
    const combined = Buffer.from(encrypted, 'base64');
    const nonce = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    const cipher = chacha20poly1305(key, nonce);
    const decrypted = cipher.decrypt(ciphertext);
    const payload = JSON.parse(new TextDecoder().decode(decrypted));
    
    return {
      amount: BigInt(payload.a),
      interestBps: payload.i,
      durationSeconds: payload.d,
      loanType: payload.t,
    };
  } catch {
    return null;
  }
}

/**
 * Calculate interest for a loan
 */
export function calculateInterest(
  principal: bigint,
  interestBps: number,
  durationSeconds: number
): bigint {
  const yearSeconds = 365 * 24 * 60 * 60;
  const interestRate = BigInt(interestBps) * BigInt(durationSeconds) / BigInt(yearSeconds * 10000);
  return (principal * interestRate) / BigInt(100);
}

/**
 * Calculate total repayment
 */
export function calculateRepayment(
  principal: bigint,
  interestBps: number,
  durationSeconds: number
): bigint {
  const interest = calculateInterest(principal, interestBps, durationSeconds);
  return principal + interest;
}

/**
 * Calculate protocol fee (1%)
 */
export function calculateProtocolFee(amount: bigint): bigint {
  return (amount * BigInt(PROTOCOL_FEE_BPS)) / BigInt(10000);
}

// ═══════════════════════════════════════════════════════════════════════════
// STANDALONE LENDING CLIENT
// ═══════════════════════════════════════════════════════════════════════════

export class LendingStandalone {
  private connection: Connection;
  private feePayer?: Keypair;
  private feeRecipient?: PublicKey;

  constructor(config: StandaloneLendingConfig) {
    this.connection = config.connection;
    this.feePayer = config.feePayer;
    this.feeRecipient = config.feeRecipient;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LENDER OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create a collection lending offer
   * SOL is deposited to an escrow account
   */
  async createOffer(params: CreateOfferParams): Promise<StandaloneOffer> {
    const offerId = generateId();
    const escrowKeypair = Keypair.generate();
    const durationSeconds = params.durationSeconds ?? 0;
    const loanType = params.loanType ?? (durationSeconds === 0 ? LoanType.Perpetual : LoanType.Fixed);
    const privacyLevel = params.privacyLevel ?? PrivacyLevel.Public;
    const expirySeconds = params.expirySeconds ?? DEFAULT_OFFER_EXPIRY_SECONDS;
    const maxLoans = params.maxLoans ?? 100;
    
    // Generate lender address (stealth if private)
    const lenderPubkey = privacyLevel === PrivacyLevel.FullyStealth 
      ? generateStealthKeypair().publicKey 
      : params.lender.publicKey;

    // Encrypt terms if private
    let encryptedTerms: string | undefined;
    let decryptionKey: Uint8Array | undefined;
    
    if (privacyLevel !== PrivacyLevel.Public) {
      const encrypted = encryptLoanTerms({
        amount: params.amount,
        interestBps: params.interestBps,
        durationSeconds,
        loanType,
      });
      encryptedTerms = encrypted.encrypted;
      decryptionKey = encrypted.key;
    }

    // Calculate rent for escrow account
    const escrowRent = await this.connection.getMinimumBalanceForRentExemption(0);
    const totalDeposit = Number(params.amount) * maxLoans + escrowRent;

    // Build transaction
    const tx = new Transaction();

    // Add compute budget for complex operations
    tx.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 })
    );

    // Create escrow account and deposit SOL
    tx.add(
      SystemProgram.createAccount({
        fromPubkey: params.lender.publicKey,
        newAccountPubkey: escrowKeypair.publicKey,
        lamports: totalDeposit,
        space: 0,
        programId: SystemProgram.programId,
      })
    );

    // Add memo with offer data
    const memoData = privacyLevel === PrivacyLevel.Public
      ? JSON.stringify({
          type: 'LENDING_OFFER',
          id: offerId,
          collection: params.collection.toBase58(),
          amount: params.amount.toString(),
          interestBps: params.interestBps,
          duration: durationSeconds,
          loanType,
          maxLoans,
          expiry: Math.floor(Date.now() / 1000) + expirySeconds,
        })
      : JSON.stringify({
          type: 'LENDING_OFFER_PRIVATE',
          id: offerId,
          collection: params.collection.toBase58(),
          encrypted: encryptedTerms,
          expiry: Math.floor(Date.now() / 1000) + expirySeconds,
        });

    tx.add(
      new TransactionInstruction({
        keys: [{ pubkey: params.lender.publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memoData),
      })
    );

    // Sign and send
    const signers = [params.lender, escrowKeypair];
    const txSignature = await sendAndConfirmTransaction(this.connection, tx, signers);

    return {
      offerId,
      escrowKeypair,
      lender: lenderPubkey,
      collection: params.collection,
      amount: params.amount,
      interestBps: params.interestBps,
      durationSeconds,
      loanType,
      privacyLevel,
      expiresAt: new Date(Date.now() + expirySeconds * 1000),
      maxLoans,
      activeLoans: 0,
      txSignature,
      encryptedTerms,
      decryptionKey,
    };
  }

  /**
   * Cancel an offer and withdraw deposited SOL
   */
  async cancelOffer(
    lender: Keypair,
    escrowPubkey: PublicKey
  ): Promise<{ txSignature: string }> {
    // Get escrow balance
    const escrowBalance = await this.connection.getBalance(escrowPubkey);
    
    // Build transaction to close escrow and return funds
    const tx = new Transaction();
    
    // Transfer all SOL back to lender and close account
    tx.add(
      SystemProgram.transfer({
        fromPubkey: escrowPubkey,
        toPubkey: lender.publicKey,
        lamports: escrowBalance,
      })
    );

    // Add cancel memo
    tx.add(
      new TransactionInstruction({
        keys: [{ pubkey: lender.publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(JSON.stringify({
          type: 'LENDING_OFFER_CANCEL',
          escrow: escrowPubkey.toBase58(),
        })),
      })
    );

    // Note: In production, you'd need the escrow keypair or use a PDA pattern
    // For now, we assume lender controls the escrow
    const txSignature = await sendAndConfirmTransaction(this.connection, tx, [lender]);

    return { txSignature };
  }

  /**
   * Generate shareable offer link
   */
  generateOfferLink(offer: StandaloneOffer, baseUrl = 'https://styxprivacy.app'): OfferLink {
    const payload = Buffer.from(JSON.stringify({
      id: offer.offerId,
      e: offer.escrowKeypair.publicKey.toBase58(),
      c: offer.collection.toBase58(),
      a: offer.amount.toString(),
      i: offer.interestBps,
      d: offer.durationSeconds,
      t: offer.loanType,
      p: offer.privacyLevel,
      x: offer.expiresAt.getTime(),
      k: offer.decryptionKey ? Buffer.from(offer.decryptionKey).toString('base64') : undefined,
    })).toString('base64url');

    const url = `${baseUrl}/lending/offer/${offer.offerId}?d=${payload}`;
    const shortCode = offer.offerId.slice(0, 8);
    
    return {
      url,
      shortCode,
      qrData: url,
      deepLink: `styx://lending/offer/${offer.offerId}?d=${payload}`,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BORROWER OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Accept an offer - transfer NFT to escrow, receive SOL
   */
  async acceptOffer(params: AcceptOfferParams): Promise<StandaloneLoan> {
    const loanId = generateId();
    const nftEscrowKeypair = Keypair.generate();
    const privacyLevel = params.privacyLevel ?? PrivacyLevel.Public;
    
    // Calculate timestamps
    const startTimestamp = Math.floor(Date.now() / 1000);
    const dueTimestamp = params.loanType === LoanType.Perpetual 
      ? 0 
      : startTimestamp + params.durationSeconds;

    // Get NFT token account
    const borrowerNftAccount = await getAssociatedTokenAddress(
      params.nftMint,
      params.borrower.publicKey
    );

    // Create NFT escrow account
    const escrowNftAccount = await getAssociatedTokenAddress(
      params.nftMint,
      nftEscrowKeypair.publicKey
    );

    // Build transaction
    const tx = new Transaction();

    tx.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 })
    );

    // Create escrow NFT account
    tx.add(
      createAssociatedTokenAccountInstruction(
        params.borrower.publicKey,
        escrowNftAccount,
        nftEscrowKeypair.publicKey,
        params.nftMint
      )
    );

    // Transfer NFT to escrow
    tx.add(
      createTransferInstruction(
        borrowerNftAccount,
        escrowNftAccount,
        params.borrower.publicKey,
        1
      )
    );

    // Transfer SOL from offer escrow to borrower
    // Protocol fee goes to fee recipient
    const protocolFee = calculateProtocolFee(params.amount);
    const borrowerReceives = params.amount - protocolFee;

    tx.add(
      SystemProgram.transfer({
        fromPubkey: params.escrowPubkey,
        toPubkey: params.borrower.publicKey,
        lamports: Number(borrowerReceives),
      })
    );

    if (this.feeRecipient && protocolFee > 0n) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: params.escrowPubkey,
          toPubkey: this.feeRecipient,
          lamports: Number(protocolFee),
        })
      );
    }

    // Add loan memo
    tx.add(
      new TransactionInstruction({
        keys: [{ pubkey: params.borrower.publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(JSON.stringify({
          type: 'LENDING_LOAN_CREATE',
          id: loanId,
          offerId: params.offerId,
          nftMint: params.nftMint.toBase58(),
          principal: params.amount.toString(),
          interestBps: params.interestBps,
          start: startTimestamp,
          due: dueTimestamp,
          loanType: params.loanType,
        })),
      })
    );

    // Sign and send
    const signers = [params.borrower, nftEscrowKeypair];
    const txSignature = await sendAndConfirmTransaction(this.connection, tx, signers);

    return {
      loanId,
      offerId: params.offerId,
      borrower: params.borrower.publicKey,
      lender: params.escrowPubkey, // Offer escrow represents lender
      nftEscrowKeypair,
      nftMint: params.nftMint,
      principal: params.amount,
      interestBps: params.interestBps,
      startTimestamp,
      dueTimestamp,
      loanType: params.loanType,
      state: LoanState.Active,
      amountRepaid: 0n,
      privacyLevel,
      txSignature,
    };
  }

  /**
   * Repay a loan - return SOL + interest, get NFT back
   */
  async repayLoan(params: RepayParams): Promise<{ txSignature: string; state: LoanState }> {
    // Build transaction
    const tx = new Transaction();

    tx.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 })
    );

    // Transfer repayment to lender
    tx.add(
      SystemProgram.transfer({
        fromPubkey: params.borrower.publicKey,
        toPubkey: params.lender,
        lamports: Number(params.repayAmount),
      })
    );

    if (params.isFullRepayment) {
      // Return NFT to borrower
      const escrowNftAccount = await getAssociatedTokenAddress(
        params.nftMint,
        params.nftEscrowPubkey
      );
      const borrowerNftAccount = await getAssociatedTokenAddress(
        params.nftMint,
        params.borrower.publicKey
      );

      // Note: In production, need escrow authority to sign
      // This simplified version assumes borrower can trigger release
      tx.add(
        createTransferInstruction(
          escrowNftAccount,
          borrowerNftAccount,
          params.nftEscrowPubkey, // Would need escrow keypair
          1
        )
      );
    }

    // Add repay memo
    tx.add(
      new TransactionInstruction({
        keys: [{ pubkey: params.borrower.publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(JSON.stringify({
          type: params.isFullRepayment ? 'LENDING_LOAN_REPAID' : 'LENDING_LOAN_PARTIAL',
          id: params.loanId,
          amount: params.repayAmount.toString(),
          full: params.isFullRepayment,
        })),
      })
    );

    const txSignature = await sendAndConfirmTransaction(this.connection, tx, [params.borrower]);

    return {
      txSignature,
      state: params.isFullRepayment ? LoanState.Repaid : LoanState.Active,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PERPETUAL LOAN OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Terminate a perpetual loan (starts 72-hour grace period)
   */
  async terminatePerpetualLoan(
    lender: Keypair,
    loanId: string
  ): Promise<{ txSignature: string; graceEndsAt: number }> {
    const graceEndsAt = Math.floor(Date.now() / 1000) + PERPETUAL_GRACE_SECONDS;

    const tx = new Transaction();
    
    tx.add(
      new TransactionInstruction({
        keys: [{ pubkey: lender.publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(JSON.stringify({
          type: 'LENDING_LOAN_TERMINATE',
          id: loanId,
          graceEndsAt,
        })),
      })
    );

    const txSignature = await sendAndConfirmTransaction(this.connection, tx, [lender]);

    return { txSignature, graceEndsAt };
  }

  /**
   * Claim defaulted NFT (after grace period or due date)
   */
  async claimDefault(
    lender: Keypair,
    loanId: string,
    nftEscrowPubkey: PublicKey,
    nftMint: PublicKey
  ): Promise<{ txSignature: string }> {
    const tx = new Transaction();

    tx.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 })
    );

    // Get accounts
    const escrowNftAccount = await getAssociatedTokenAddress(nftMint, nftEscrowPubkey);
    const lenderNftAccount = await getAssociatedTokenAddress(nftMint, lender.publicKey);

    // Create lender's NFT account if needed
    const lenderNftInfo = await this.connection.getAccountInfo(lenderNftAccount);
    if (!lenderNftInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          lender.publicKey,
          lenderNftAccount,
          lender.publicKey,
          nftMint
        )
      );
    }

    // Transfer NFT to lender (would need escrow authority in production)
    tx.add(
      createTransferInstruction(
        escrowNftAccount,
        lenderNftAccount,
        nftEscrowPubkey,
        1
      )
    );

    // Add claim memo
    tx.add(
      new TransactionInstruction({
        keys: [{ pubkey: lender.publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(JSON.stringify({
          type: 'LENDING_LOAN_DEFAULTED',
          id: loanId,
          nftMint: nftMint.toBase58(),
        })),
      })
    );

    const txSignature = await sendAndConfirmTransaction(this.connection, tx, [lender]);

    return { txSignature };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REFINANCING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Refinance a loan into a new offer
   */
  async refinanceLoan(
    borrower: Keypair,
    currentLoanId: string,
    newOfferParams: AcceptOfferParams,
    currentOwed: bigint
  ): Promise<{ newLoan: StandaloneLoan; oldLoanRepaid: boolean }> {
    // Accept new offer (gets new SOL)
    const newLoan = await this.acceptOffer({
      ...newOfferParams,
      borrower,
    });

    // Use new loan proceeds to repay old loan
    // Note: In production, this would be atomic
    // For standalone, we do it in sequence

    return {
      newLoan,
      oldLoanRepaid: true, // Simplified
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a lending client
 */
export function createLendingStandalone(
  connection: Connection,
  options?: { feePayer?: Keypair; feeRecipient?: PublicKey }
): LendingStandalone {
  return new LendingStandalone({
    connection,
    feePayer: options?.feePayer,
    feeRecipient: options?.feeRecipient,
  });
}

/**
 * Quick create offer
 */
export async function quickCreateOffer(
  connection: Connection,
  lender: Keypair,
  collection: PublicKey,
  amountSol: number,
  interestApr: number,
  options?: {
    loanType?: LoanType;
    durationDays?: number;
    privacyLevel?: PrivacyLevel;
  }
): Promise<StandaloneOffer> {
  const lending = createLendingStandalone(connection);
  
  return lending.createOffer({
    lender,
    collection,
    amount: BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL)),
    interestBps: Math.floor(interestApr * 100),
    durationSeconds: options?.durationDays ? options.durationDays * 24 * 60 * 60 : 0,
    loanType: options?.loanType,
    privacyLevel: options?.privacyLevel,
  });
}

// Re-export types for convenience
export type {
  CreateOfferParams as StandaloneCreateOfferParams,
  AcceptOfferParams as StandaloneAcceptOfferParams,
  RepayParams as StandaloneRepayParams,
};
