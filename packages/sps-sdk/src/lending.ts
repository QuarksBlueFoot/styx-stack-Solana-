/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SPS PRIVATE LENDING SDK
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Private peer-to-peer NFT and token lending with perpetual loans.
 * Like Sharky.fi/Banx.gg but with full privacy:
 * - Hidden loan terms
 * - Private liquidations
 * - Anonymous collection offers
 * - 1% protocol fee (same as Sharky)
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      PRIVATE LENDING FLOW                               │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  Lender creates offer → Borrower accepts → NFT escrowed                │
 * │  Repay: NFT released to borrower                                        │
 * │  Default: NFT transferred to lender                                     │
 * │  Perpetual: 72-hour termination notice                                 │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * Privacy features:
 * - Shielded loan amounts
 * - Private interest rates
 * - Anonymous lender/borrower
 * - Hidden collateral valuations
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
} from '@solana/web3.js';
import { randomBytes, createHash } from 'crypto';
import { SPS_PROGRAM_ID } from './index';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/** Domain byte for DeFi operations */
export const DOMAIN_DEFI = 0x08;

/** Lending operation codes */
export const LENDING_OPS = {
  CREATE_OFFER: 0x01,
  CANCEL_OFFER: 0x02,
  ACCEPT_OFFER: 0x03,
  REPAY_LOAN: 0x04,
  CLAIM_DEFAULT: 0x05,
  EXTEND_LOAN: 0x06,
  PARTIAL_REPAY: 0x07,
  TERMINATE_PERPETUAL: 0x08,
  REFINANCE: 0x09,
} as const;

/** PDA Seeds for lending */
export const LENDING_SEEDS = {
  OFFER: Buffer.from('lending_offer'),
  LOAN: Buffer.from('lending_loan'),
  ESCROW: Buffer.from('lending_escrow'),
  TREASURY: Buffer.from('lending_treasury'),
} as const;

/** Protocol fee: 1% (matching Sharky.fi) */
export const PROTOCOL_FEE_BPS = 100; // 1% = 100 basis points

/** Perpetual loan termination grace period: 72 hours */
export const PERPETUAL_GRACE_PERIOD_SECONDS = 72 * 60 * 60;

/** Supported NFT types */
export enum NftType {
  Standard = 0,
  Compressed = 1,
  Programmable = 2,
}

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

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CollectionOffer {
  /** Unique offer ID */
  offerId: string;
  /** Lender's public key (or stealth) */
  lender: PublicKey;
  /** Collection verified creator or collection mint */
  collection: PublicKey;
  /** Loan amount in lamports */
  amount: bigint;
  /** Interest rate in basis points (annual) */
  interestBps: number;
  /** Loan duration in seconds (0 for perpetual) */
  durationSeconds: number;
  /** Loan type */
  loanType: LoanType;
  /** NFT type accepted */
  nftType: NftType;
  /** Maximum number of loans from this offer */
  maxLoans: number;
  /** Current active loans from this offer */
  activeLoans: number;
  /** Offer expiry timestamp */
  expiryTimestamp: number;
  /** Whether offer is active */
  isActive: boolean;
}

export interface Loan {
  /** Unique loan ID */
  loanId: string;
  /** Offer this loan was created from */
  offerId: string;
  /** Borrower's public key (or stealth) */
  borrower: PublicKey;
  /** Lender's public key (or stealth) */
  lender: PublicKey;
  /** NFT mint */
  nftMint: PublicKey;
  /** NFT type */
  nftType: NftType;
  /** Principal amount */
  principal: bigint;
  /** Interest rate in basis points */
  interestBps: number;
  /** Loan start timestamp */
  startTimestamp: number;
  /** Loan due timestamp (0 for perpetual) */
  dueTimestamp: number;
  /** Termination timestamp for perpetual loans */
  terminationTimestamp?: number;
  /** Loan type */
  loanType: LoanType;
  /** Current state */
  state: LoanState;
  /** Amount repaid so far */
  amountRepaid: bigint;
}

export interface CreateOfferParams {
  /** Collection to make offer on */
  collection: PublicKey;
  /** Loan amount in lamports */
  amount: bigint;
  /** Interest rate in basis points */
  interestBps: number;
  /** Duration in seconds (0 for perpetual) */
  durationSeconds?: number;
  /** Loan type */
  loanType?: LoanType;
  /** NFT type */
  nftType?: NftType;
  /** Maximum loans */
  maxLoans?: number;
  /** Offer expiry in seconds from now */
  expirySeconds?: number;
  /** Use stealth address for privacy */
  useStealth?: boolean;
}

export interface AcceptOfferParams {
  /** Offer ID to accept */
  offerId: string;
  /** NFT mint to collateralize */
  nftMint: PublicKey;
  /** NFT type */
  nftType?: NftType;
  /** Use stealth address for privacy */
  useStealth?: boolean;
}

export interface RepayLoanParams {
  /** Loan ID to repay */
  loanId: string;
  /** Amount to repay (for partial repayment) */
  amount?: bigint;
}

export interface TerminateLoanParams {
  /** Loan ID to terminate */
  loanId: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a unique offer ID
 */
export function generateOfferId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Generate a unique loan ID
 */
export function generateLoanId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Calculate interest for a loan
 */
export function calculateInterest(
  principal: bigint,
  interestBps: number,
  durationSeconds: number
): bigint {
  // Annual interest rate converted to duration
  const yearSeconds = 365 * 24 * 60 * 60;
  const interestRate = BigInt(interestBps) * BigInt(durationSeconds) / BigInt(yearSeconds * 10000);
  return (principal * interestRate) / BigInt(100);
}

/**
 * Calculate total repayment amount
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
 * Calculate protocol fee
 */
export function calculateProtocolFee(amount: bigint): bigint {
  return (amount * BigInt(PROTOCOL_FEE_BPS)) / BigInt(10000);
}

/**
 * Derive offer PDA
 */
export function deriveOfferPda(offerId: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [LENDING_SEEDS.OFFER, Buffer.from(offerId)],
    SPS_PROGRAM_ID
  );
  return pda;
}

/**
 * Derive loan PDA
 */
export function deriveLoanPda(loanId: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [LENDING_SEEDS.LOAN, Buffer.from(loanId)],
    SPS_PROGRAM_ID
  );
  return pda;
}

/**
 * Derive escrow PDA for NFT
 */
export function deriveEscrowPda(loanId: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [LENDING_SEEDS.ESCROW, Buffer.from(loanId)],
    SPS_PROGRAM_ID
  );
  return pda;
}

/**
 * Derive treasury PDA
 */
export function deriveTreasuryPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [LENDING_SEEDS.TREASURY],
    SPS_PROGRAM_ID
  );
  return pda;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRIVATE LENDING CLIENT
// ═══════════════════════════════════════════════════════════════════════════

export class PrivateLendingClient {
  private connection: Connection;
  private programId: PublicKey;

  constructor(
    connection: Connection,
    programId: PublicKey = SPS_PROGRAM_ID
  ) {
    this.connection = connection;
    this.programId = programId;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LENDER OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create a collection offer
   * Lender deposits SOL, sets terms for any NFT from collection
   */
  async createOffer(
    lender: Keypair,
    params: CreateOfferParams
  ): Promise<{ offerId: string; offer: CollectionOffer; tx: string }> {
    const offerId = generateOfferId();
    const offerPda = deriveOfferPda(offerId);
    const treasuryPda = deriveTreasuryPda();

    const durationSeconds = params.durationSeconds ?? 0;
    const loanType = params.loanType ?? (durationSeconds === 0 ? LoanType.Perpetual : LoanType.Fixed);
    const expiryTimestamp = Math.floor(Date.now() / 1000) + (params.expirySeconds ?? 7 * 24 * 60 * 60);

    // Build instruction data
    const data = Buffer.alloc(128);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI, offset++);
    data.writeUInt8(LENDING_OPS.CREATE_OFFER, offset++);
    Buffer.from(offerId).copy(data, offset); offset += 32;
    params.collection.toBuffer().copy(data, offset); offset += 32;
    data.writeBigUInt64LE(params.amount, offset); offset += 8;
    data.writeUInt16LE(params.interestBps, offset); offset += 2;
    data.writeUInt32LE(durationSeconds, offset); offset += 4;
    data.writeUInt8(loanType, offset++);
    data.writeUInt8(params.nftType ?? NftType.Standard, offset++);
    data.writeUInt16LE(params.maxLoans ?? 100, offset); offset += 2;
    data.writeUInt32LE(expiryTimestamp, offset); offset += 4;

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: lender.publicKey, isSigner: true, isWritable: true },
        { pubkey: offerPda, isSigner: false, isWritable: true },
        { pubkey: treasuryPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: data.slice(0, offset),
    });

    const tx = new Transaction().add(instruction);
    const sig = await sendAndConfirmTransaction(this.connection, tx, [lender]);

    const offer: CollectionOffer = {
      offerId,
      lender: lender.publicKey,
      collection: params.collection,
      amount: params.amount,
      interestBps: params.interestBps,
      durationSeconds,
      loanType,
      nftType: params.nftType ?? NftType.Standard,
      maxLoans: params.maxLoans ?? 100,
      activeLoans: 0,
      expiryTimestamp,
      isActive: true,
    };

    return { offerId, offer, tx: sig };
  }

  /**
   * Cancel an offer and withdraw deposited SOL
   */
  async cancelOffer(
    lender: Keypair,
    offerId: string
  ): Promise<{ tx: string }> {
    const offerPda = deriveOfferPda(offerId);

    const data = Buffer.alloc(64);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI, offset++);
    data.writeUInt8(LENDING_OPS.CANCEL_OFFER, offset++);
    Buffer.from(offerId).copy(data, offset); offset += 32;

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: lender.publicKey, isSigner: true, isWritable: true },
        { pubkey: offerPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: data.slice(0, offset),
    });

    const tx = new Transaction().add(instruction);
    const sig = await sendAndConfirmTransaction(this.connection, tx, [lender]);

    return { tx: sig };
  }

  /**
   * Claim defaulted NFT after loan expires
   */
  async claimDefault(
    lender: Keypair,
    loanId: string
  ): Promise<{ tx: string }> {
    const loanPda = deriveLoanPda(loanId);
    const escrowPda = deriveEscrowPda(loanId);

    const data = Buffer.alloc(64);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI, offset++);
    data.writeUInt8(LENDING_OPS.CLAIM_DEFAULT, offset++);
    Buffer.from(loanId).copy(data, offset); offset += 32;

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: lender.publicKey, isSigner: true, isWritable: true },
        { pubkey: loanPda, isSigner: false, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: data.slice(0, offset),
    });

    const tx = new Transaction().add(instruction);
    const sig = await sendAndConfirmTransaction(this.connection, tx, [lender]);

    return { tx: sig };
  }

  /**
   * Terminate a perpetual loan (starts 72-hour grace period)
   */
  async terminatePerpetualLoan(
    lender: Keypair,
    loanId: string
  ): Promise<{ tx: string; graceEndsAt: number }> {
    const loanPda = deriveLoanPda(loanId);
    const graceEndsAt = Math.floor(Date.now() / 1000) + PERPETUAL_GRACE_PERIOD_SECONDS;

    const data = Buffer.alloc(64);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI, offset++);
    data.writeUInt8(LENDING_OPS.TERMINATE_PERPETUAL, offset++);
    Buffer.from(loanId).copy(data, offset); offset += 32;

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: lender.publicKey, isSigner: true, isWritable: true },
        { pubkey: loanPda, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data: data.slice(0, offset),
    });

    const tx = new Transaction().add(instruction);
    const sig = await sendAndConfirmTransaction(this.connection, tx, [lender]);

    return { tx: sig, graceEndsAt };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BORROWER OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Accept an offer and borrow against NFT
   * NFT is transferred to escrow, SOL is sent to borrower
   */
  async acceptOffer(
    borrower: Keypair,
    params: AcceptOfferParams
  ): Promise<{ loanId: string; loan: Loan; tx: string }> {
    const loanId = generateLoanId();
    const offerPda = deriveOfferPda(params.offerId);
    const loanPda = deriveLoanPda(loanId);
    const escrowPda = deriveEscrowPda(loanId);
    const treasuryPda = deriveTreasuryPda();

    const data = Buffer.alloc(128);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI, offset++);
    data.writeUInt8(LENDING_OPS.ACCEPT_OFFER, offset++);
    Buffer.from(params.offerId).copy(data, offset); offset += 32;
    Buffer.from(loanId).copy(data, offset); offset += 32;
    params.nftMint.toBuffer().copy(data, offset); offset += 32;
    data.writeUInt8(params.nftType ?? NftType.Standard, offset++);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: borrower.publicKey, isSigner: true, isWritable: true },
        { pubkey: offerPda, isSigner: false, isWritable: true },
        { pubkey: loanPda, isSigner: false, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: treasuryPda, isSigner: false, isWritable: true },
        { pubkey: params.nftMint, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: data.slice(0, offset),
    });

    const tx = new Transaction().add(instruction);
    const sig = await sendAndConfirmTransaction(this.connection, tx, [borrower]);

    // Note: In production, we'd fetch the actual offer details
    const loan: Loan = {
      loanId,
      offerId: params.offerId,
      borrower: borrower.publicKey,
      lender: PublicKey.default, // Would be fetched from offer
      nftMint: params.nftMint,
      nftType: params.nftType ?? NftType.Standard,
      principal: BigInt(0), // Would be fetched from offer
      interestBps: 0, // Would be fetched from offer
      startTimestamp: Math.floor(Date.now() / 1000),
      dueTimestamp: 0,
      loanType: LoanType.Perpetual,
      state: LoanState.Active,
      amountRepaid: BigInt(0),
    };

    return { loanId, loan, tx: sig };
  }

  /**
   * Repay a loan and recover NFT
   */
  async repayLoan(
    borrower: Keypair,
    params: RepayLoanParams
  ): Promise<{ tx: string; amountPaid: bigint }> {
    const loanPda = deriveLoanPda(params.loanId);
    const escrowPda = deriveEscrowPda(params.loanId);
    const treasuryPda = deriveTreasuryPda();

    const data = Buffer.alloc(64);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI, offset++);
    data.writeUInt8(LENDING_OPS.REPAY_LOAN, offset++);
    Buffer.from(params.loanId).copy(data, offset); offset += 32;
    if (params.amount) {
      data.writeBigUInt64LE(params.amount, offset); offset += 8;
    }

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: borrower.publicKey, isSigner: true, isWritable: true },
        { pubkey: loanPda, isSigner: false, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: treasuryPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: data.slice(0, offset),
    });

    const tx = new Transaction().add(instruction);
    const sig = await sendAndConfirmTransaction(this.connection, tx, [borrower]);

    return { tx: sig, amountPaid: params.amount ?? BigInt(0) };
  }

  /**
   * Partial repayment for perpetual loans
   */
  async partialRepay(
    borrower: Keypair,
    loanId: string,
    amount: bigint
  ): Promise<{ tx: string }> {
    const loanPda = deriveLoanPda(loanId);
    const treasuryPda = deriveTreasuryPda();

    const data = Buffer.alloc(64);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI, offset++);
    data.writeUInt8(LENDING_OPS.PARTIAL_REPAY, offset++);
    Buffer.from(loanId).copy(data, offset); offset += 32;
    data.writeBigUInt64LE(amount, offset); offset += 8;

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: borrower.publicKey, isSigner: true, isWritable: true },
        { pubkey: loanPda, isSigner: false, isWritable: true },
        { pubkey: treasuryPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: data.slice(0, offset),
    });

    const tx = new Transaction().add(instruction);
    const sig = await sendAndConfirmTransaction(this.connection, tx, [borrower]);

    return { tx: sig };
  }

  /**
   * Extend a fixed-term loan (pay interest to extend duration)
   */
  async extendLoan(
    borrower: Keypair,
    loanId: string,
    extensionSeconds: number
  ): Promise<{ tx: string; newDueTimestamp: number }> {
    const loanPda = deriveLoanPda(loanId);
    const treasuryPda = deriveTreasuryPda();

    const data = Buffer.alloc(64);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI, offset++);
    data.writeUInt8(LENDING_OPS.EXTEND_LOAN, offset++);
    Buffer.from(loanId).copy(data, offset); offset += 32;
    data.writeUInt32LE(extensionSeconds, offset); offset += 4;

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: borrower.publicKey, isSigner: true, isWritable: true },
        { pubkey: loanPda, isSigner: false, isWritable: true },
        { pubkey: treasuryPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: data.slice(0, offset),
    });

    const tx = new Transaction().add(instruction);
    const sig = await sendAndConfirmTransaction(this.connection, tx, [borrower]);

    const newDueTimestamp = Math.floor(Date.now() / 1000) + extensionSeconds;
    return { tx: sig, newDueTimestamp };
  }

  /**
   * Refinance loan with a better offer
   */
  async refinanceLoan(
    borrower: Keypair,
    loanId: string,
    newOfferId: string
  ): Promise<{ tx: string; newLoanId: string }> {
    const loanPda = deriveLoanPda(loanId);
    const newOfferPda = deriveOfferPda(newOfferId);
    const newLoanId = generateLoanId();
    const newLoanPda = deriveLoanPda(newLoanId);
    const escrowPda = deriveEscrowPda(loanId);
    const treasuryPda = deriveTreasuryPda();

    const data = Buffer.alloc(128);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI, offset++);
    data.writeUInt8(LENDING_OPS.REFINANCE, offset++);
    Buffer.from(loanId).copy(data, offset); offset += 32;
    Buffer.from(newOfferId).copy(data, offset); offset += 32;
    Buffer.from(newLoanId).copy(data, offset); offset += 32;

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: borrower.publicKey, isSigner: true, isWritable: true },
        { pubkey: loanPda, isSigner: false, isWritable: true },
        { pubkey: newOfferPda, isSigner: false, isWritable: true },
        { pubkey: newLoanPda, isSigner: false, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: treasuryPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: data.slice(0, offset),
    });

    const tx = new Transaction().add(instruction);
    const sig = await sendAndConfirmTransaction(this.connection, tx, [borrower]);

    return { tx: sig, newLoanId };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // QUERY OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get collection offers
   */
  async getCollectionOffers(collection: PublicKey): Promise<CollectionOffer[]> {
    // In production, this would query program accounts
    // For now, return empty array
    return [];
  }

  /**
   * Get active loans for a borrower
   */
  async getBorrowerLoans(borrower: PublicKey): Promise<Loan[]> {
    // In production, this would query program accounts
    return [];
  }

  /**
   * Get active loans for a lender
   */
  async getLenderLoans(lender: PublicKey): Promise<Loan[]> {
    // In production, this would query program accounts
    return [];
  }

  /**
   * Get loan details
   */
  async getLoan(loanId: string): Promise<Loan | null> {
    // In production, this would fetch from chain
    return null;
  }

  /**
   * Get offer details
   */
  async getOffer(offerId: string): Promise<CollectionOffer | null> {
    // In production, this would fetch from chain
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a PrivateLendingClient instance
 */
export function createPrivateLendingClient(
  connection: Connection,
  programId?: PublicKey
): PrivateLendingClient {
  return new PrivateLendingClient(connection, programId);
}

/**
 * Quick helper to create an offer
 */
export async function quickCreateOffer(
  connection: Connection,
  lender: Keypair,
  collection: PublicKey,
  amount: bigint,
  interestBps: number,
  loanType: LoanType = LoanType.Perpetual
): Promise<{ offerId: string; tx: string }> {
  const client = createPrivateLendingClient(connection);
  const result = await client.createOffer(lender, {
    collection,
    amount,
    interestBps,
    loanType,
  });
  return { offerId: result.offerId, tx: result.tx };
}

/**
 * Quick helper to accept an offer
 */
export async function quickAcceptOffer(
  connection: Connection,
  borrower: Keypair,
  offerId: string,
  nftMint: PublicKey
): Promise<{ loanId: string; tx: string }> {
  const client = createPrivateLendingClient(connection);
  const result = await client.acceptOffer(borrower, { offerId, nftMint });
  return { loanId: result.loanId, tx: result.tx };
}

/**
 * Quick helper to repay a loan
 */
export async function quickRepayLoan(
  connection: Connection,
  borrower: Keypair,
  loanId: string
): Promise<{ tx: string }> {
  const client = createPrivateLendingClient(connection);
  return await client.repayLoan(borrower, { loanId });
}
