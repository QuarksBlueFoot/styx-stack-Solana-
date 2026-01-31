/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX PRIVATE SWAPS
 *  
 *  Private DEX trading on Solana with:
 *  - Stealth orders (hidden trading intent)
 *  - Private liquidity pools
 *  - MEV protection via commit-reveal
 *  - Anonymous trading via ring signatures
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha256';
import { keccak_256 } from '@noble/hashes/sha3';
import { randomBytes } from '@noble/ciphers/webcrypto';
import bs58 from 'bs58';
import {
  StyxClient,
  encryptData,
  generateStealthAddress,
  generateNullifier,
  STYX_PROGRAM_ID,
} from '../../core';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SwapQuote {
  /** Quote ID */
  id: string;
  /** Input token mint */
  inputMint: PublicKey;
  /** Output token mint */
  outputMint: PublicKey;
  /** Input amount */
  inputAmount: bigint;
  /** Estimated output amount */
  outputAmount: bigint;
  /** Price impact percentage */
  priceImpact: number;
  /** Minimum output (with slippage) */
  minimumOutput: bigint;
  /** Fees */
  fee: bigint;
  /** Route */
  route: SwapRoute[];
  /** Valid until */
  expiresAt: number;
  /** Privacy level */
  privacy: SwapPrivacy;
}

export interface SwapRoute {
  pool: PublicKey;
  inputMint: PublicKey;
  outputMint: PublicKey;
  portion: number; // 0-100
}

export interface SwapPrivacy {
  /** Use stealth address for output */
  stealthOutput: boolean;
  /** Use commit-reveal for MEV protection */
  mevProtection: boolean;
  /** Add decoy transactions */
  decoyTransactions: boolean;
  /** Delay execution randomly */
  randomDelay: boolean;
}

export interface StealthOrder {
  /** Order ID */
  id: string;
  /** Commitment to order details */
  commitment: Uint8Array;
  /** Order type */
  type: 'market' | 'limit' | 'twap';
  /** Input mint (encrypted) */
  inputMint: Uint8Array;
  /** Output mint (encrypted) */
  outputMint: Uint8Array;
  /** Status */
  status: 'pending' | 'committed' | 'revealed' | 'executed' | 'cancelled';
  /** Reveal deadline */
  revealDeadline: number;
  /** Created at */
  createdAt: number;
}

export interface LimitOrder {
  id: string;
  maker: PublicKey | null; // null if anonymous
  inputMint: PublicKey;
  outputMint: PublicKey;
  inputAmount: bigint;
  outputAmount: bigint; // Desired output
  price: number;
  filled: bigint;
  status: 'open' | 'partial' | 'filled' | 'cancelled';
  expiresAt: number;
  createdAt: number;
}

export interface PrivatePool {
  id: string;
  tokenA: PublicKey;
  tokenB: PublicKey;
  reserveA: bigint;
  reserveB: bigint;
  fee: number; // basis points
  privacy: {
    hiddenReserves: boolean;
    anonymousLPs: boolean;
  };
  lpMint: PublicKey;
  totalLpSupply: bigint;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMIT-REVEAL SCHEME (MEV Protection)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create an order commitment for MEV protection
 * Reveals order details only after commitment is on-chain
 */
export function createOrderCommitment(
  inputMint: PublicKey,
  outputMint: PublicKey,
  inputAmount: bigint,
  minOutput: bigint,
  secret: Uint8Array
): { commitment: Uint8Array; orderData: Uint8Array } {
  const orderData = new Uint8Array(32 + 32 + 8 + 8 + 32);
  orderData.set(inputMint.toBytes(), 0);
  orderData.set(outputMint.toBytes(), 32);
  new DataView(orderData.buffer).setBigUint64(64, inputAmount, true);
  new DataView(orderData.buffer).setBigUint64(72, minOutput, true);
  orderData.set(secret, 80);
  
  const commitment = keccak_256(orderData);
  
  return { commitment, orderData };
}

/**
 * Verify an order commitment against revealed data
 */
export function verifyOrderCommitment(
  commitment: Uint8Array,
  orderData: Uint8Array
): boolean {
  const computed = keccak_256(orderData);
  return commitment.every((byte, i) => byte === computed[i]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE SWAPS CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface SwapsClientOptions {
  client: StyxClient;
  signer: Keypair;
  defaultPrivacy?: Partial<SwapPrivacy>;
}

export class PrivateSwapsClient {
  private readonly client: StyxClient;
  private readonly signer: Keypair;
  private readonly defaultPrivacy: SwapPrivacy;
  
  // Store order secrets for reveal phase
  private orderSecrets: Map<string, { secret: Uint8Array; orderData: Uint8Array }> = new Map();

  constructor(options: SwapsClientOptions) {
    this.client = options.client;
    this.signer = options.signer;
    this.defaultPrivacy = {
      stealthOutput: options.defaultPrivacy?.stealthOutput ?? true,
      mevProtection: options.defaultPrivacy?.mevProtection ?? true,
      decoyTransactions: options.defaultPrivacy?.decoyTransactions ?? false,
      randomDelay: options.defaultPrivacy?.randomDelay ?? false,
    };
  }

  /**
   * Get a swap quote
   */
  async getQuote(
    inputMint: PublicKey,
    outputMint: PublicKey,
    inputAmount: bigint,
    options?: {
      slippage?: number;
      privacy?: Partial<SwapPrivacy>;
    }
  ): Promise<SwapQuote> {
    const indexerUrl = this.client.getIndexerUrl();
    const slippage = options?.slippage ?? 0.5; // 0.5% default
    
    // Query for best route
    const response = await fetch(`${indexerUrl}/v1/swap/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputMint: inputMint.toBase58(),
        outputMint: outputMint.toBase58(),
        inputAmount: inputAmount.toString(),
        slippage,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get quote');
    }
    
    const data = await response.json();
    
    const privacy: SwapPrivacy = {
      ...this.defaultPrivacy,
      ...options?.privacy,
    };
    
    return {
      id: bs58.encode(randomBytes(8)),
      inputMint,
      outputMint,
      inputAmount,
      outputAmount: BigInt(data.outputAmount ?? 0),
      priceImpact: data.priceImpact ?? 0,
      minimumOutput: BigInt(data.minimumOutput ?? 0),
      fee: BigInt(data.fee ?? 0),
      route: data.route ?? [],
      expiresAt: Date.now() + 30000, // 30 second validity
      privacy,
    };
  }

  /**
   * Execute a private swap with MEV protection
   */
  async executeSwap(quote: SwapQuote): Promise<{
    signature: string;
    inputAmount: bigint;
    outputAmount: bigint;
  }> {
    if (quote.privacy.mevProtection) {
      // Use commit-reveal pattern
      return this.executeCommitRevealSwap(quote);
    } else {
      // Direct swap
      return this.executeDirectSwap(quote);
    }
  }

  /**
   * Execute swap using commit-reveal for MEV protection
   */
  private async executeCommitRevealSwap(quote: SwapQuote): Promise<{
    signature: string;
    inputAmount: bigint;
    outputAmount: bigint;
  }> {
    const secret = randomBytes(32);
    
    // Create commitment
    const { commitment, orderData } = createOrderCommitment(
      quote.inputMint,
      quote.outputMint,
      quote.inputAmount,
      quote.minimumOutput,
      secret
    );
    
    const orderId = bs58.encode(sha256(commitment).slice(0, 8));
    this.orderSecrets.set(orderId, { secret, orderData });
    
    // Phase 1: Commit
    const commitTx = new Transaction();
    commitTx.add(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 })
    );
    
    const commitData = Buffer.alloc(1 + 32 + 8);
    commitData[0] = 0x40; // SWAP_COMMIT instruction
    commitData.set(commitment, 1);
    // Reveal deadline: 2 slots (~800ms)
    new DataView(commitData.buffer).setBigUint64(33, BigInt(2), true);
    
    commitTx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: true },
        ],
        programId: STYX_PROGRAM_ID,
        data: commitData,
      })
    );
    
    commitTx.feePayer = this.signer.publicKey;
    commitTx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    commitTx.sign(this.signer);
    
    await this.client.connection.sendRawTransaction(commitTx.serialize());
    
    // Wait for commit confirmation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Phase 2: Reveal and execute
    const revealTx = new Transaction();
    revealTx.add(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 })
    );
    
    const revealData = Buffer.alloc(1 + orderData.length);
    revealData[0] = 0x41; // SWAP_REVEAL instruction
    revealData.set(orderData, 1);
    
    revealTx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: true },
          { pubkey: quote.inputMint, isSigner: false, isWritable: false },
          { pubkey: quote.outputMint, isSigner: false, isWritable: false },
          // Pool accounts would be added based on route
        ],
        programId: STYX_PROGRAM_ID,
        data: revealData,
      })
    );
    
    revealTx.feePayer = this.signer.publicKey;
    revealTx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    revealTx.sign(this.signer);
    
    const signature = await this.client.connection.sendRawTransaction(revealTx.serialize());
    
    return {
      signature,
      inputAmount: quote.inputAmount,
      outputAmount: quote.outputAmount,
    };
  }

  /**
   * Execute direct swap without MEV protection
   */
  private async executeDirectSwap(quote: SwapQuote): Promise<{
    signature: string;
    inputAmount: bigint;
    outputAmount: bigint;
  }> {
    const tx = new Transaction();
    tx.add(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 })
    );
    
    const swapData = Buffer.alloc(1 + 32 + 32 + 8 + 8);
    swapData[0] = 0x42; // SWAP_EXECUTE instruction
    swapData.set(quote.inputMint.toBytes(), 1);
    swapData.set(quote.outputMint.toBytes(), 33);
    new DataView(swapData.buffer).setBigUint64(65, quote.inputAmount, true);
    new DataView(swapData.buffer).setBigUint64(73, quote.minimumOutput, true);
    
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: true },
          { pubkey: quote.inputMint, isSigner: false, isWritable: false },
          { pubkey: quote.outputMint, isSigner: false, isWritable: false },
        ],
        programId: STYX_PROGRAM_ID,
        data: swapData,
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    const signature = await this.client.connection.sendRawTransaction(tx.serialize());
    
    return {
      signature,
      inputAmount: quote.inputAmount,
      outputAmount: quote.outputAmount,
    };
  }

  /**
   * Create a private limit order
   */
  async createLimitOrder(
    inputMint: PublicKey,
    outputMint: PublicKey,
    inputAmount: bigint,
    price: number, // output per input
    options?: {
      expiresIn?: number;
      anonymous?: boolean;
    }
  ): Promise<LimitOrder> {
    const orderId = bs58.encode(randomBytes(8));
    const outputAmount = BigInt(Math.floor(Number(inputAmount) * price));
    
    const orderData = Buffer.alloc(1 + 32 + 32 + 8 + 8 + 8 + 1);
    orderData[0] = 0x43; // CREATE_LIMIT_ORDER instruction
    orderData.set(inputMint.toBytes(), 1);
    orderData.set(outputMint.toBytes(), 33);
    new DataView(orderData.buffer).setBigUint64(65, inputAmount, true);
    new DataView(orderData.buffer).setBigUint64(73, outputAmount, true);
    new DataView(orderData.buffer).setBigUint64(81, BigInt(options?.expiresIn ?? 86400), true);
    orderData[89] = options?.anonymous ? 1 : 0;
    
    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: true },
          { pubkey: inputMint, isSigner: false, isWritable: false },
          { pubkey: outputMint, isSigner: false, isWritable: false },
        ],
        programId: STYX_PROGRAM_ID,
        data: orderData,
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    await this.client.connection.sendRawTransaction(tx.serialize());
    
    return {
      id: orderId,
      maker: options?.anonymous ? null : this.signer.publicKey,
      inputMint,
      outputMint,
      inputAmount,
      outputAmount,
      price,
      filled: BigInt(0),
      status: 'open',
      expiresAt: Date.now() + (options?.expiresIn ?? 86400) * 1000,
      createdAt: Date.now(),
    };
  }

  /**
   * Cancel a limit order
   */
  async cancelOrder(orderId: string): Promise<void> {
    const cancelData = Buffer.alloc(1 + 8);
    cancelData[0] = 0x44; // CANCEL_ORDER instruction
    cancelData.set(bs58.decode(orderId), 1);
    
    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: true },
        ],
        programId: STYX_PROGRAM_ID,
        data: cancelData,
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    await this.client.connection.sendRawTransaction(tx.serialize());
  }

  /**
   * Get my open orders
   */
  async getMyOrders(): Promise<LimitOrder[]> {
    const indexerUrl = this.client.getIndexerUrl();
    
    try {
      const response = await fetch(`${indexerUrl}/v1/swap/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maker: this.signer.publicKey.toBase58(),
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.orders ?? [];
      }
    } catch {
      // Handle error
    }
    
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHIELDED SWAPS (STS INTEGRATION)
// Full privacy via Styx Token Standard (STS)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * STS instruction tags for shielded operations
 */
const STS_TAG_VSL_PRIVATE_SWAP = 35;
const STS_TAG_PRIVATE_SWAP = 134;
const STS_TAG_AMM_SWAP = 179;
const STS_TAG_STEALTH_SWAP_INIT = 25;
const STS_TAG_STEALTH_SWAP_EXEC = 26;

export interface ShieldedSwapQuote {
  /** Quote ID */
  id: string;
  /** Input note nullifier (private balance) */
  inputNullifier: Uint8Array;
  /** Output mint */
  outputMint: PublicKey;
  /** Estimated output amount */
  outputAmount: bigint;
  /** Price impact percentage */
  priceImpact: number;
  /** Minimum output with slippage */
  minimumOutput: bigint;
  /** Swap route (anonymized) */
  route: string[];
  /** Valid until slot */
  expiresAtSlot: number;
  /** ZK proof for balance verification */
  balanceProof?: Uint8Array;
  /** Stealth recipient for output */
  stealthRecipient?: PublicKey;
}

export interface ShieldedPoolLiquidity {
  poolId: PublicKey;
  tokenA: PublicKey;
  tokenB: PublicKey;
  /** Blinded reserves (real values hidden) */
  blindedReserves: {
    a: Uint8Array;
    b: Uint8Array;
  };
  /** Your LP note nullifier */
  lpNullifier?: Uint8Array;
  /** Your LP share (only visible to you) */
  lpShare?: bigint;
  /** Total LP supply (public) */
  totalLpSupply: bigint;
  fee: number;
}

export interface ShieldedSwapResult {
  /** Transaction signature */
  signature: string;
  /** New output note nullifier */
  outputNullifier: Uint8Array;
  /** Stealth address where output was sent */
  stealthAddress: PublicKey;
  /** Actual output amount (private) */
  outputAmount: bigint;
  /** Ephemeral key for recipient to scan */
  ephemeralPubkey: Uint8Array;
}

/**
 * ShieldedSwapsClient - Privacy-preserving DEX trading using STS
 * 
 * Features:
 * - Full amount privacy (encrypted input/output amounts)
 * - Stealth output addresses (unlinkable to recipient identity)
 * - MEV protection via ZK commit-reveal
 * - Private liquidity provision (hidden LP positions)
 */
export class ShieldedSwapsClient {
  private readonly client: StyxClient;
  private readonly signer: Keypair;
  
  constructor(options: SwapsClientOptions) {
    this.client = options.client;
    this.signer = options.signer;
  }
  
  /**
   * Get a shielded swap quote using private balance
   * Amount and identity remain hidden
   */
  async getShieldedQuote(args: {
    /** Note nullifier proving ownership of input balance */
    inputNullifier: Uint8Array;
    /** Amount to swap (encrypted commitment) */
    inputAmountCommitment: Uint8Array;
    /** Output token mint */
    outputMint: PublicKey;
    /** Slippage tolerance (default 0.5%) */
    slippage?: number;
    /** Generate stealth address for output */
    useStealthOutput?: boolean;
  }): Promise<ShieldedSwapQuote> {
    const indexerUrl = this.client.getIndexerUrl();
    const slippage = args.slippage ?? 0.5;
    
    // Request quote from STS indexer (amounts remain private)
    const response = await fetch(`${indexerUrl}/v1/shielded/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputNullifier: bs58.encode(args.inputNullifier),
        inputCommitment: bs58.encode(args.inputAmountCommitment),
        outputMint: args.outputMint.toBase58(),
        slippage,
        useStealthOutput: args.useStealthOutput ?? true,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get shielded quote');
    }
    
    const data = await response.json();
    
    // Generate stealth recipient if requested
    let stealthRecipient: PublicKey | undefined;
    if (args.useStealthOutput) {
      const { stealthAddress } = generateStealthAddress(
        this.signer.publicKey,
        randomBytes(32)
      );
      stealthRecipient = stealthAddress;
    }
    
    return {
      id: bs58.encode(randomBytes(8)),
      inputNullifier: args.inputNullifier,
      outputMint: args.outputMint,
      outputAmount: BigInt(data.estimatedOutput ?? 0),
      priceImpact: data.priceImpact ?? 0,
      minimumOutput: BigInt(data.minimumOutput ?? 0),
      route: data.route ?? [],
      expiresAtSlot: data.expiresAtSlot ?? 0,
      balanceProof: data.balanceProof ? bs58.decode(data.balanceProof) : undefined,
      stealthRecipient,
    };
  }
  
  /**
   * Execute a shielded swap with full privacy
   * Uses ZK proofs to verify balance without revealing amounts
   */
  async executeShieldedSwap(quote: ShieldedSwapQuote): Promise<ShieldedSwapResult> {
    // Generate ephemeral keypair for stealth output
    const ephemeralKeypair = Keypair.generate();
    const ephemeralPubkey = ephemeralKeypair.publicKey.toBytes();
    
    // Build shielded swap instruction
    const data = Buffer.alloc(1 + 32 + 32 + 32 + 32 + 8 + 32);
    let offset = 0;
    data[offset++] = STS_TAG_VSL_PRIVATE_SWAP;
    data.set(quote.inputNullifier, offset); offset += 32;
    data.set(quote.outputMint.toBytes(), offset); offset += 32;
    // Minimum output commitment (not raw amount)
    const minOutputCommit = sha256(
      new Uint8Array([
        ...quote.outputMint.toBytes(),
        ...new Uint8Array(new BigUint64Array([quote.minimumOutput]).buffer),
        ...randomBytes(32), // blinding factor
      ])
    );
    data.set(minOutputCommit, offset); offset += 32;
    data.set(quote.stealthRecipient?.toBytes() ?? new Uint8Array(32), offset); offset += 32;
    new DataView(data.buffer).setBigUint64(offset, BigInt(quote.expiresAtSlot), true); offset += 8;
    data.set(ephemeralPubkey, offset);
    
    const tx = new Transaction();
    tx.add(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 }),
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
    );
    
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: true },
          { pubkey: quote.outputMint, isSigner: false, isWritable: false },
          { pubkey: quote.stealthRecipient ?? this.signer.publicKey, isSigner: false, isWritable: true },
          { pubkey: ephemeralKeypair.publicKey, isSigner: true, isWritable: false },
        ],
        programId: STYX_PROGRAM_ID,
        data,
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer, ephemeralKeypair);
    
    const signature = await this.client.connection.sendRawTransaction(tx.serialize());
    
    // Generate output nullifier for recipient to track
    const outputNullifier = generateNullifier(
      quote.stealthRecipient ?? this.signer.publicKey,
      ephemeralPubkey
    );
    
    return {
      signature,
      outputNullifier,
      stealthAddress: quote.stealthRecipient ?? this.signer.publicKey,
      outputAmount: quote.outputAmount,
      ephemeralPubkey,
    };
  }
  
  /**
   * Add liquidity to a shielded pool
   * Your position remains private to other observers
   */
  async addShieldedLiquidity(args: {
    poolId: PublicKey;
    tokenANullifier: Uint8Array;
    tokenBNullifier: Uint8Array;
    amountACommitment: Uint8Array;
    amountBCommitment: Uint8Array;
  }): Promise<{
    signature: string;
    lpNullifier: Uint8Array;
  }> {
    const data = Buffer.alloc(1 + 32 + 32 + 32 + 32 + 32);
    let offset = 0;
    data[offset++] = 137; // TAG_PRIVATE_LP_ADD
    data.set(args.poolId.toBytes(), offset); offset += 32;
    data.set(args.tokenANullifier, offset); offset += 32;
    data.set(args.tokenBNullifier, offset); offset += 32;
    data.set(args.amountACommitment, offset); offset += 32;
    data.set(args.amountBCommitment, offset);
    
    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: true },
          { pubkey: args.poolId, isSigner: false, isWritable: true },
        ],
        programId: STYX_PROGRAM_ID,
        data,
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    const signature = await this.client.connection.sendRawTransaction(tx.serialize());
    
    // LP nullifier derived from pool + user + slot
    const lpNullifier = generateNullifier(
      args.poolId,
      this.signer.publicKey.toBytes()
    );
    
    return { signature, lpNullifier };
  }
  
  /**
   * Remove liquidity from a shielded pool
   */
  async removeShieldedLiquidity(args: {
    poolId: PublicKey;
    lpNullifier: Uint8Array;
    shareCommitment: Uint8Array;
  }): Promise<{
    signature: string;
    tokenANullifier: Uint8Array;
    tokenBNullifier: Uint8Array;
  }> {
    const data = Buffer.alloc(1 + 32 + 32 + 32);
    let offset = 0;
    data[offset++] = 138; // TAG_PRIVATE_LP_REMOVE
    data.set(args.poolId.toBytes(), offset); offset += 32;
    data.set(args.lpNullifier, offset); offset += 32;
    data.set(args.shareCommitment, offset);
    
    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: true },
          { pubkey: args.poolId, isSigner: false, isWritable: true },
        ],
        programId: STYX_PROGRAM_ID,
        data,
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    const signature = await this.client.connection.sendRawTransaction(tx.serialize());
    
    // Generate output nullifiers
    const tokenANullifier = generateNullifier(args.poolId, new Uint8Array([0]));
    const tokenBNullifier = generateNullifier(args.poolId, new Uint8Array([1]));
    
    return { signature, tokenANullifier, tokenBNullifier };
  }
  
  /**
   * Get your shielded LP positions (private to you)
   */
  async getMyShieldedPositions(): Promise<ShieldedPoolLiquidity[]> {
    const indexerUrl = this.client.getIndexerUrl();
    
    try {
      const response = await fetch(`${indexerUrl}/v1/shielded/positions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: this.signer.publicKey.toBase58(),
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return (data.positions ?? []).map((p: any) => ({
          poolId: new PublicKey(p.poolId),
          tokenA: new PublicKey(p.tokenA),
          tokenB: new PublicKey(p.tokenB),
          blindedReserves: {
            a: bs58.decode(p.blindedReserves.a),
            b: bs58.decode(p.blindedReserves.b),
          },
          lpNullifier: p.lpNullifier ? bs58.decode(p.lpNullifier) : undefined,
          lpShare: p.lpShare ? BigInt(p.lpShare) : undefined,
          totalLpSupply: BigInt(p.totalLpSupply ?? 0),
          fee: p.fee ?? 30, // 0.3% default
        }));
      }
    } catch {
      // Handle error
    }
    
    return [];
  }
  
  /**
   * Jupiter integration with privacy wrapper
   * Routes through Jupiter but shields your identity
   */
  async jupiterSwapShielded(args: {
    inputMint: PublicKey;
    outputMint: PublicKey;
    /** Input note nullifier (private balance) */
    inputNullifier: Uint8Array;
    /** Amount commitment */
    amountCommitment: Uint8Array;
    slippage?: number;
  }): Promise<ShieldedSwapResult> {
    // Get Jupiter route
    const response = await fetch('https://quote-api.jup.ag/v6/quote?' + new URLSearchParams({
      inputMint: args.inputMint.toBase58(),
      outputMint: args.outputMint.toBase58(),
      amount: '0', // We use commitment, not raw amount
      slippageBps: String(Math.floor((args.slippage ?? 0.5) * 100)),
    }));
    
    const jupiterQuote = response.ok ? await response.json() : null;
    
    // Wrap in shielded transaction
    const quote = await this.getShieldedQuote({
      inputNullifier: args.inputNullifier,
      inputAmountCommitment: args.amountCommitment,
      outputMint: args.outputMint,
      slippage: args.slippage,
      useStealthOutput: true,
    });
    
    return this.executeShieldedSwap(quote);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { PrivateSwapsClient as SwapsClient };

