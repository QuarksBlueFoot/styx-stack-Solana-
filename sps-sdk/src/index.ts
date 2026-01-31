/**
 * @styx-stack/sps-sdk
 * 
 * Styx Privacy Standard (SPS) SDK v3.0 - Privacy-Native Token Standard for Solana
 * 
 * SPS is a privacy-first token standard that provides:
 * - ZERO rent tokens via inscription-based state
 * - Native privacy via commitments, nullifiers, stealth addresses
 * - Full Token-22 parity + 200+ additional operations
 * - Programmable rules for fungibles and NFTs
 * - Compliance-ready with Proof of Innocence
 * - Private DeFi integration (AMM, swaps, staking)
 * 
 * ## Quick Start
 * ```typescript
 * import { SpsClient } from '@styx-stack/sps-sdk';
 * 
 * const client = new SpsClient({ connection, wallet });
 * 
 * // Create a privacy token
 * const mint = await client.createMint({
 *   name: 'My Token',
 *   symbol: 'MYT',
 *   decimals: 9,
 * });
 * 
 * // Mint tokens to commitment (private)
 * await client.mintTo({
 *   mint,
 *   amount: 1_000_000n,
 *   commitment: generateCommitment(recipientKey),
 * });
 * ```
 * 
 * @see https://github.com/QuarksBlueFoot/StyxStack
 * @author Bluefoot Labs (@moonmanquark)
 * @license Apache-2.0
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { keccak_256 } from '@noble/hashes/sha3';
import { sha256 } from '@noble/hashes/sha256';
import { x25519 } from '@noble/curves/ed25519';
import { chacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes } from '@noble/ciphers/webcrypto';

// Re-export domains
export * from './domains';
import {
  DOMAIN_STS,
  DOMAIN_MESSAGING,
  DOMAIN_PRIVACY,
  DOMAIN_NFT,
  DOMAIN_DEFI,
  DOMAIN_NOTES,
  DOMAIN_COMPLIANCE,
  DOMAIN_DAM,
  sts,
  messaging,
  privacy,
  nft,
  defi,
  notes,
  compliance,
  dam,
  buildInstructionPrefix,
} from './domains';

// Re-export DAM client
export { DAMClient } from './dam';
export type {
  DAMPoolConfig,
  VirtualBalance as DAMVirtualBalance,
  MaterializationProof,
  MaterializationResult,
  DematerializationResult,
} from './dam';

// Re-export EasyPay client (No wallet, gasless, text/email payments)
export { EasyPayClient, createEasyPayClient, quickSend } from './easy-pay';
export type {
  ClaimablePayment,
  StealthKeys,
  PaymentLink,
  RelayerConfig,
  MetaTransaction,
} from './easy-pay';

// Re-export EasyPay Standalone (No custom programs needed!)
// Also export as "Resolv" for modern branding
export {
  EasyPayStandalone,
  EasyPayStandalone as Resolv,
  createEasyPayStandalone,
  createEasyPayStandalone as createResolv,
  quickSendStandalone,
  quickSendStandalone as resolvQuickSend,
  generatePaymentId,
  generateClaimCredentials,
  verifyClaimSecret,
  encryptPaymentMetadata,
  decryptPaymentMetadata,
  generateStealthReceiver,
  type StandalonePaymentConfig,
  type StandalonePaymentConfig as ResolvPaymentConfig,
  type StandalonePayment,
  type StandalonePayment as ResolvPayment,
  type StandalonePaymentLink,
  type StandalonePaymentLink as ResolvPaymentLink,
  type StandaloneClaimResult,
  type StandaloneClaimResult as ResolvClaimResult,
} from './easy-pay-standalone';

// Re-export Inscriptions (Lamport Inscription Tokens)
export {
  StyxInscriptions,
  createStyxInscriptions,
  quickInscribe,
  InscriptionType,
  InscriptionMode,
  type Inscription,
  type CreateInscriptionParams,
  type TransferInscriptionParams,
  type InscriptionCreateResult,
} from './inscriptions';

// Re-export Bulk Airdrop (Inscription-Compressed Token Distribution)
export {
  StyxBulkAirdrop,
  AirdropMerkleTree,
  CampaignStatus,
  AIRDROP_OPS,
  AIRDROP_SEEDS,
  MAX_RECIPIENTS_PER_BATCH,
  type AirdropRecipient,
  type ClaimConditions,
  type CampaignConfig,
  type Campaign,
  type ClaimProof,
  type ClaimResult,
  type CreateCampaignResult,
  type FinalizeResult,
} from './bulk-airdrop';

// Re-export Wallet Decompress (Turn compressed tokens back to SPL)
export {
  WalletDecompress,
  DECOMPRESS_SEEDS,
  MAX_BATCH_SIZE,
  type CompressedToken,
  type MerkleProof,
  type DecompressResult,
  type BatchDecompressResult,
  type DecompressFeeEstimate,
} from './wallet-decompress';

// Re-export Private Lending (P2P NFT & Token Loans)
export {
  PrivateLendingClient,
  createPrivateLendingClient,
  quickCreateOffer,
  quickAcceptOffer,
  quickRepayLoan,
  generateOfferId,
  generateLoanId,
  calculateInterest,
  calculateRepayment,
  calculateProtocolFee,
  deriveOfferPda,
  deriveLoanPda,
  deriveEscrowPda,
  deriveTreasuryPda,
  DOMAIN_DEFI as DOMAIN_LENDING,
  LENDING_OPS,
  LENDING_SEEDS,
  PROTOCOL_FEE_BPS,
  PERPETUAL_GRACE_PERIOD_SECONDS,
  NftType,
  LoanType,
  LoanState,
  type CollectionOffer,
  type Loan,
  type CreateOfferParams,
  type AcceptOfferParams,
  type RepayLoanParams,
  type TerminateLoanParams,
} from './lending';

// Re-export Private Lending Standalone (No Custom Programs!)
export {
  LendingStandalone,
  LendingStandalone as PrivateLendingStandalone,
  createLendingStandalone,
  createLendingStandalone as createPrivateLendingStandalone,
  quickCreateOffer as quickCreateOfferStandalone,
  generateId as generateLendingId,
  generateStealthKeypair,
  encryptLoanTerms,
  decryptLoanTerms,
  calculateInterest as calculateLoanInterest,
  calculateRepayment as calculateLoanRepayment,
  calculateProtocolFee as calculateLendingFee,
  MEMO_PROGRAM_ID as LENDING_MEMO_PROGRAM_ID,
  PROTOCOL_FEE_BPS as STANDALONE_PROTOCOL_FEE_BPS,
  PERPETUAL_GRACE_SECONDS,
  DEFAULT_OFFER_EXPIRY_SECONDS,
  LoanType as StandaloneLoanType,
  LoanState as StandaloneLoanState,
  PrivacyLevel,
  type StandaloneLendingConfig,
  type StandaloneOffer,
  type StandaloneLoan,
  type OfferLink,
  type StandaloneCreateOfferParams,
  type StandaloneAcceptOfferParams,
  type StandaloneRepayParams,
} from './lending-standalone';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/** SPS Program ID - Mainnet */
export const SPS_PROGRAM_ID = new PublicKey('GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9');

/** SPS Program ID - Devnet */
export const SPS_DEVNET_PROGRAM_ID = new PublicKey('FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW');

/** PDA Seeds */
export const SEEDS = {
  NULLIFIER: Buffer.from('nullifier'),
  MINT: Buffer.from('sps_mint'),
  NOTE: Buffer.from('sps_note'),
  POOL: Buffer.from('sps_pool'),
  RULESET: Buffer.from('sps_ruleset'),
  ESCROW: Buffer.from('sps_escrow'),
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Network configuration */
export type Network = 'mainnet' | 'devnet';

/** Client configuration */
export interface SpsClientConfig {
  connection: Connection;
  wallet?: Keypair;
  network?: Network;
  programId?: PublicKey;
}

/** Mint configuration */
export interface CreateMintParams {
  name: string;
  symbol: string;
  decimals?: number;
  supplyCap?: bigint;
  mintType?: 'fungible' | 'nft' | 'semi-fungible';
  backingType?: 'native' | 'spl-backed';
  splMint?: PublicKey;
  privacyMode?: 'private' | 'public' | 'optional';
}

/** Mint-to parameters */
export interface MintToParams {
  mintId: Uint8Array | Buffer;
  amount: bigint;
  commitment: Uint8Array;
  encryptedNote?: Uint8Array;
}

/** Transfer parameters */
export interface TransferParams {
  nullifier: Uint8Array;
  newCommitment: Uint8Array;
  encryptedAmount?: Uint8Array;
  proof?: Uint8Array;
}

/** NFT creation parameters */
export interface CreateNftParams {
  name: string;
  symbol: string;
  uri: string;
  royaltyBps?: number;
  creators?: Array<{ address: PublicKey; share: number }>;
  collection?: PublicKey;
  ruleSet?: PublicKey;
}

/** Pool creation parameters */
export interface CreatePoolParams {
  mintA: Uint8Array;
  mintB: Uint8Array;
  poolType?: 'constant_product' | 'stable_swap' | 'concentrated';
  fee?: number;
}

/** Private message parameters */
export interface PrivateMessageParams {
  recipientPubkey: Uint8Array;
  message: Uint8Array;
  ephemeralKey?: Uint8Array;
}

/** Stealth address */
export interface StealthAddress {
  pubkey: Uint8Array;
  viewTag: number;
  ephemeralPubkey: Uint8Array;
}

/** Note (UTXO) */
export interface SpsNote {
  commitment: Uint8Array;
  amount: bigint;
  nullifier: Uint8Array;
  encrypted: Uint8Array;
}

/** Virtual account balance */
export interface VirtualBalance {
  mintId: Uint8Array;
  totalAmount: bigint;
  notes: SpsNote[];
}

// ═══════════════════════════════════════════════════════════════════════════
// CRYPTOGRAPHIC UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a random commitment (for hiding recipient/amount)
 */
export function generateCommitment(): Uint8Array {
  return randomBytes(32);
}

/**
 * Compute commitment from secret and amount
 */
export function computeCommitment(secret: Uint8Array, amount: bigint): Uint8Array {
  const amountBytes = Buffer.alloc(8);
  amountBytes.writeBigUInt64LE(amount);
  return keccak_256(Buffer.concat([Buffer.from(secret), amountBytes]));
}

/**
 * Compute nullifier from note secret
 */
export function computeNullifier(noteSecret: Uint8Array): Uint8Array {
  return keccak_256(Buffer.concat([Buffer.from('nullifier:'), Buffer.from(noteSecret)]));
}

/**
 * Generate stealth address for recipient
 */
export function generateStealthAddress(
  recipientSpendPubkey: Uint8Array,
  recipientViewPubkey: Uint8Array
): StealthAddress {
  // Generate ephemeral keypair
  const ephemeralPriv = randomBytes(32);
  const ephemeralPub = x25519.getPublicKey(ephemeralPriv);
  
  // Compute shared secret: ephemeralPriv * viewPubkey
  const sharedSecret = x25519.getSharedSecret(ephemeralPriv, recipientViewPubkey);
  const hash = keccak_256(sharedSecret);
  
  // Derive stealth pubkey: spendPubkey + hash (simplified - actual impl uses EC addition)
  const stealthPubkey = keccak_256(Buffer.concat([Buffer.from(recipientSpendPubkey), hash]));
  
  // View tag is first byte of hash
  const viewTag = hash[0];
  
  return {
    pubkey: stealthPubkey,
    viewTag,
    ephemeralPubkey: ephemeralPub,
  };
}

/**
 * Check if stealth address belongs to recipient (using view tag)
 */
export function checkStealthAddress(
  ephemeralPubkey: Uint8Array,
  viewPrivkey: Uint8Array,
  expectedViewTag: number
): boolean {
  const sharedSecret = x25519.getSharedSecret(viewPrivkey, ephemeralPubkey);
  const hash = keccak_256(sharedSecret);
  return hash[0] === expectedViewTag;
}

/**
 * Encrypt message with ChaCha20-Poly1305
 */
export function encrypt(message: Uint8Array, key: Uint8Array): Uint8Array {
  const nonce = randomBytes(12);
  const cipher = chacha20poly1305(key, nonce);
  const ciphertext = cipher.encrypt(message);
  return new Uint8Array([...nonce, ...ciphertext]);
}

/**
 * Decrypt message with ChaCha20-Poly1305
 */
export function decrypt(encrypted: Uint8Array, key: Uint8Array): Uint8Array {
  const nonce = encrypted.slice(0, 12);
  const ciphertext = encrypted.slice(12);
  const cipher = chacha20poly1305(key, nonce);
  return cipher.decrypt(ciphertext);
}

// ═══════════════════════════════════════════════════════════════════════════
// PDA DERIVATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Derive nullifier PDA
 */
export function deriveNullifierPda(
  nullifier: Uint8Array,
  programId: PublicKey = SPS_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.NULLIFIER, Buffer.from(nullifier)],
    programId
  );
}

/**
 * Derive mint PDA
 */
export function deriveMintPda(
  authority: PublicKey,
  nonce: Uint8Array,
  programId: PublicKey = SPS_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.MINT, authority.toBuffer(), Buffer.from(nonce)],
    programId
  );
}

/**
 * Derive pool PDA
 */
export function derivePoolPda(
  mintA: Uint8Array,
  mintB: Uint8Array,
  programId: PublicKey = SPS_PROGRAM_ID
): [PublicKey, number] {
  // Sort mints for deterministic ordering
  const [first, second] = Buffer.compare(Buffer.from(mintA), Buffer.from(mintB)) <= 0
    ? [mintA, mintB]
    : [mintB, mintA];
  return PublicKey.findProgramAddressSync(
    [SEEDS.POOL, Buffer.from(first), Buffer.from(second)],
    programId
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// INSTRUCTION BUILDERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build CREATE_MINT instruction
 */
export function buildCreateMintIx(
  params: CreateMintParams,
  authority: PublicKey,
  programId: PublicKey = SPS_PROGRAM_ID
): { instruction: TransactionInstruction; nonce: Uint8Array; mintId: Uint8Array } {
  const nonce = randomBytes(32);
  
  // Encode name (32 bytes)
  const nameBytes = Buffer.alloc(32);
  Buffer.from(params.name, 'utf8').copy(nameBytes);
  
  // Encode symbol (8 bytes)
  const symbolBytes = Buffer.alloc(8);
  Buffer.from(params.symbol, 'utf8').copy(symbolBytes);
  
  const decimals = params.decimals ?? 9;
  const supplyCap = params.supplyCap ?? BigInt(1_000_000_000 * 10 ** decimals);
  
  const mintType = params.mintType === 'nft' ? 1 : params.mintType === 'semi-fungible' ? 2 : 0;
  const backingType = params.backingType === 'spl-backed' ? 1 : 0;
  const splMintBytes = params.splMint?.toBuffer() ?? Buffer.alloc(32);
  const privacyMode = params.privacyMode === 'public' ? 1 : params.privacyMode === 'optional' ? 2 : 0;
  
  // Build data: [domain][op][nonce][name][symbol][decimals][supply_cap][mint_type][backing_type][spl_mint][privacy_mode][extension_flags]
  const data = Buffer.alloc(122);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_CREATE_MINT, offset++);
  Buffer.from(nonce).copy(data, offset); offset += 32;
  nameBytes.copy(data, offset); offset += 32;
  symbolBytes.copy(data, offset); offset += 8;
  data.writeUInt8(decimals, offset++);
  data.writeBigUInt64LE(supplyCap, offset); offset += 8;
  data.writeUInt8(mintType, offset++);
  data.writeUInt8(backingType, offset++);
  splMintBytes.copy(data, offset); offset += 32;
  data.writeUInt8(privacyMode, offset++);
  data.writeUInt32LE(0, offset); // extension_flags
  
  // Compute mint ID
  const mintId = sha256(Buffer.concat([
    Buffer.from('SPS_MINT_V1'),
    authority.toBuffer(),
    Buffer.from(nonce),
  ]));
  
  const instruction = new TransactionInstruction({
    programId,
    keys: [{ pubkey: authority, isSigner: true, isWritable: true }],
    data,
  });
  
  return { instruction, nonce: new Uint8Array(nonce), mintId };
}

/**
 * Build MINT_TO instruction
 */
export function buildMintToIx(
  params: MintToParams,
  authority: PublicKey,
  programId: PublicKey = SPS_PROGRAM_ID
): TransactionInstruction {
  const encryptedNote = params.encryptedNote ?? randomBytes(64);
  
  // Format: [domain][op][mint_id][amount][commitment][encrypted_len][encrypted...]
  const data = Buffer.alloc(78 + encryptedNote.length);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_MINT_TO, offset++);
  Buffer.from(params.mintId).copy(data, offset); offset += 32;
  data.writeBigUInt64LE(params.amount, offset); offset += 8;
  Buffer.from(params.commitment).copy(data, offset); offset += 32;
  data.writeUInt32LE(encryptedNote.length, offset); offset += 4;
  Buffer.from(encryptedNote).copy(data, offset);
  
  return new TransactionInstruction({
    programId,
    keys: [{ pubkey: authority, isSigner: true, isWritable: true }],
    data,
  });
}

/**
 * Build TRANSFER instruction (UTXO-style)
 */
export function buildTransferIx(
  params: TransferParams,
  payer: PublicKey,
  programId: PublicKey = SPS_PROGRAM_ID
): TransactionInstruction {
  const [nullifierPda] = deriveNullifierPda(params.nullifier, programId);
  const encryptedAmount = params.encryptedAmount ?? randomBytes(8);
  const proof = params.proof ?? new Uint8Array(0);
  
  // Format: [domain][op][nullifier][new_commitment][encrypted_amount][proof_len][proof...]
  const data = Buffer.alloc(76 + proof.length);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_TRANSFER, offset++);
  Buffer.from(params.nullifier).copy(data, offset); offset += 32;
  Buffer.from(params.newCommitment).copy(data, offset); offset += 32;
  Buffer.from(encryptedAmount).copy(data, offset); offset += 8;
  data.writeUInt8(proof.length, offset++);
  if (proof.length > 0) {
    Buffer.from(proof).copy(data, offset);
  }
  
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: nullifierPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Build CREATE_NFT instruction
 */
export function buildCreateNftIx(
  params: CreateNftParams,
  authority: PublicKey,
  programId: PublicKey = SPS_PROGRAM_ID
): { instruction: TransactionInstruction; nonce: Uint8Array; nftId: Uint8Array } {
  const nonce = randomBytes(32);
  
  // Encode strings
  const nameBytes = Buffer.alloc(32);
  Buffer.from(params.name, 'utf8').copy(nameBytes);
  const symbolBytes = Buffer.alloc(8);
  Buffer.from(params.symbol, 'utf8').copy(symbolBytes);
  const uriBytes = Buffer.alloc(200);
  Buffer.from(params.uri, 'utf8').copy(uriBytes);
  
  const royaltyBps = params.royaltyBps ?? 500; // 5% default
  const collection = params.collection?.toBuffer() ?? Buffer.alloc(32);
  const ruleSet = params.ruleSet?.toBuffer() ?? Buffer.alloc(32);
  
  // Build data
  const data = Buffer.alloc(320);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_CREATE_NFT, offset++);
  Buffer.from(nonce).copy(data, offset); offset += 32;
  nameBytes.copy(data, offset); offset += 32;
  symbolBytes.copy(data, offset); offset += 8;
  uriBytes.copy(data, offset); offset += 200;
  data.writeUInt16LE(royaltyBps, offset); offset += 2;
  collection.copy(data, offset); offset += 32;
  ruleSet.copy(data, offset);
  
  // Compute NFT ID
  const nftId = sha256(Buffer.concat([
    Buffer.from('SPS_NFT_V1'),
    authority.toBuffer(),
    Buffer.from(nonce),
  ]));
  
  const instruction = new TransactionInstruction({
    programId,
    keys: [{ pubkey: authority, isSigner: true, isWritable: true }],
    data,
  });
  
  return { instruction, nonce: new Uint8Array(nonce), nftId };
}

/**
 * Build DECOY_STORM instruction
 */
export function buildDecoyStormIx(
  decoyCount: number,
  realTransfer: TransferParams | null,
  payer: PublicKey,
  programId: PublicKey = SPS_PROGRAM_ID
): TransactionInstruction {
  const decoys: Uint8Array[] = [];
  for (let i = 0; i < decoyCount; i++) {
    decoys.push(randomBytes(72)); // Fake transfer data
  }
  
  // Format: [domain][op][count][real_index][transfers...]
  const realIndex = realTransfer ? Math.floor(Math.random() * (decoyCount + 1)) : 0xff;
  const transferSize = 72;
  const data = Buffer.alloc(4 + (decoyCount + (realTransfer ? 1 : 0)) * transferSize);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_DECOY_STORM, offset++);
  data.writeUInt8(decoyCount + (realTransfer ? 1 : 0), offset++);
  data.writeUInt8(realIndex, offset++);
  
  for (let i = 0; i < decoyCount + (realTransfer ? 1 : 0); i++) {
    if (i === realIndex && realTransfer) {
      Buffer.from(realTransfer.nullifier).copy(data, offset); offset += 32;
      Buffer.from(realTransfer.newCommitment).copy(data, offset); offset += 32;
      Buffer.from(realTransfer.encryptedAmount ?? randomBytes(8)).copy(data, offset); offset += 8;
    } else {
      const decoyIdx = i > realIndex ? i - 1 : i;
      if (decoyIdx < decoys.length) {
        Buffer.from(decoys[decoyIdx]).copy(data, offset);
        offset += 72;
      }
    }
  }
  
  return new TransactionInstruction({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: true }],
    data,
  });
}

/**
 * Build CHRONO_VAULT instruction (time-locked)
 */
export function buildChronoVaultIx(
  unlockSlot: bigint,
  encryptedContent: Uint8Array,
  payer: PublicKey,
  programId: PublicKey = SPS_PROGRAM_ID
): TransactionInstruction {
  const nonce = randomBytes(32);
  
  // Format: [domain][op][nonce][unlock_slot][content_len][content...]
  const data = Buffer.alloc(46 + encryptedContent.length);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_CHRONO_VAULT, offset++);
  Buffer.from(nonce).copy(data, offset); offset += 32;
  data.writeBigUInt64LE(unlockSlot, offset); offset += 8;
  data.writeUInt32LE(encryptedContent.length, offset); offset += 4;
  Buffer.from(encryptedContent).copy(data, offset);
  
  return new TransactionInstruction({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: true }],
    data,
  });
}

/**
 * Build PRIVATE_MESSAGE instruction
 */
export function buildPrivateMessageIx(
  params: PrivateMessageParams,
  sender: PublicKey,
  programId: PublicKey = SPS_PROGRAM_ID
): TransactionInstruction {
  const ephemeralKey = params.ephemeralKey ?? randomBytes(32);
  
  // Format: [domain][op][recipient_pubkey][ephemeral_key][message_len][message...]
  const data = Buffer.alloc(70 + params.message.length);
  let offset = 0;
  data.writeUInt8(DOMAIN_MESSAGING, offset++);
  data.writeUInt8(messaging.OP_PRIVATE_MESSAGE, offset++);
  Buffer.from(params.recipientPubkey).copy(data, offset); offset += 32;
  Buffer.from(ephemeralKey).copy(data, offset); offset += 32;
  data.writeUInt32LE(params.message.length, offset); offset += 4;
  Buffer.from(params.message).copy(data, offset);
  
  return new TransactionInstruction({
    programId,
    keys: [{ pubkey: sender, isSigner: true, isWritable: true }],
    data,
  });
}

/**
 * Build CREATE_AMM_POOL instruction
 */
export function buildCreateAmmPoolIx(
  params: CreatePoolParams,
  authority: PublicKey,
  programId: PublicKey = SPS_PROGRAM_ID
): { instruction: TransactionInstruction; poolId: Uint8Array } {
  const poolType = params.poolType === 'stable_swap' ? 1 : params.poolType === 'concentrated' ? 2 : 0;
  const fee = params.fee ?? 30; // 0.3% default
  
  // Format: [domain][op][mint_a][mint_b][pool_type][fee_bps]
  const data = Buffer.alloc(70);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_CREATE_AMM_POOL, offset++);
  Buffer.from(params.mintA).copy(data, offset); offset += 32;
  Buffer.from(params.mintB).copy(data, offset); offset += 32;
  data.writeUInt8(poolType, offset++);
  data.writeUInt16LE(fee, offset);
  
  // Compute pool ID
  const [first, second] = Buffer.compare(Buffer.from(params.mintA), Buffer.from(params.mintB)) <= 0
    ? [params.mintA, params.mintB]
    : [params.mintB, params.mintA];
  const poolId = sha256(Buffer.concat([
    Buffer.from('SPS_POOL_V1'),
    Buffer.from(first),
    Buffer.from(second),
  ]));
  
  const instruction = new TransactionInstruction({
    programId,
    keys: [{ pubkey: authority, isSigner: true, isWritable: true }],
    data,
  });
  
  return { instruction, poolId };
}

/**
 * Build PRIVATE_SWAP instruction
 */
export function buildPrivateSwapIx(
  poolId: Uint8Array,
  inputNullifier: Uint8Array,
  outputCommitment: Uint8Array,
  minOutput: bigint,
  payer: PublicKey,
  programId: PublicKey = SPS_PROGRAM_ID
): TransactionInstruction {
  const [nullifierPda] = deriveNullifierPda(inputNullifier, programId);
  
  // Format: [domain][op][pool_id][input_nullifier][output_commitment][min_output]
  const data = Buffer.alloc(106);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_PRIVATE_SWAP, offset++);
  Buffer.from(poolId).copy(data, offset); offset += 32;
  Buffer.from(inputNullifier).copy(data, offset); offset += 32;
  Buffer.from(outputCommitment).copy(data, offset); offset += 32;
  data.writeBigUInt64LE(minOutput, offset);
  
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: nullifierPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Build SHIELD instruction (SPL → SPS Note)
 */
export function buildShieldIx(
  splMint: PublicKey,
  amount: bigint,
  commitment: Uint8Array,
  payer: PublicKey,
  tokenAccount: PublicKey,
  programId: PublicKey = SPS_PROGRAM_ID
): TransactionInstruction {
  // Format: [domain][op][spl_mint][amount][commitment]
  const data = Buffer.alloc(74);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_SHIELD, offset++);
  splMint.toBuffer().copy(data, offset); offset += 32;
  data.writeBigUInt64LE(amount, offset); offset += 8;
  Buffer.from(commitment).copy(data, offset);
  
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: tokenAccount, isSigner: false, isWritable: true },
      { pubkey: splMint, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Build UNSHIELD instruction (SPS Note → SPL)
 */
export function buildUnshieldIx(
  nullifier: Uint8Array,
  amount: bigint,
  recipient: PublicKey,
  payer: PublicKey,
  programId: PublicKey = SPS_PROGRAM_ID
): TransactionInstruction {
  const [nullifierPda] = deriveNullifierPda(nullifier, programId);
  
  // Format: [domain][op][nullifier][amount][recipient]
  const data = Buffer.alloc(74);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_UNSHIELD, offset++);
  Buffer.from(nullifier).copy(data, offset); offset += 32;
  data.writeBigUInt64LE(amount, offset); offset += 8;
  recipient.toBuffer().copy(data, offset);
  
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: nullifierPda, isSigner: false, isWritable: true },
      { pubkey: recipient, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Build REVEAL_TO_AUDITOR instruction
 */
export function buildRevealToAuditorIx(
  auditorPubkey: Uint8Array,
  encryptedDetails: Uint8Array,
  proofOfCompliance: Uint8Array,
  payer: PublicKey,
  programId: PublicKey = SPS_PROGRAM_ID
): TransactionInstruction {
  // Format: [domain][op][auditor_pubkey][encrypted_len][encrypted...][proof_len][proof...]
  const data = Buffer.alloc(40 + encryptedDetails.length + proofOfCompliance.length);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_REVEAL_TO_AUDITOR, offset++);
  Buffer.from(auditorPubkey).copy(data, offset); offset += 32;
  data.writeUInt16LE(encryptedDetails.length, offset); offset += 2;
  Buffer.from(encryptedDetails).copy(data, offset); offset += encryptedDetails.length;
  data.writeUInt16LE(proofOfCompliance.length, offset); offset += 2;
  Buffer.from(proofOfCompliance).copy(data, offset);
  
  return new TransactionInstruction({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: true }],
    data,
  });
}

/**
 * Build ATTACH_POI instruction (Proof of Innocence)
 */
export function buildAttachPoiIx(
  noteCommitment: Uint8Array,
  poiProof: Uint8Array,
  payer: PublicKey,
  programId: PublicKey = SPS_PROGRAM_ID
): TransactionInstruction {
  // Format: [domain][op][commitment][proof_len][proof...]
  const data = Buffer.alloc(38 + poiProof.length);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_ATTACH_POI, offset++);
  Buffer.from(noteCommitment).copy(data, offset); offset += 32;
  data.writeUInt32LE(poiProof.length, offset); offset += 4;
  Buffer.from(poiProof).copy(data, offset);
  
  return new TransactionInstruction({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: true }],
    data,
  });
}

/**
 * Build RATCHET_MESSAGE instruction (Double Ratchet forward secrecy)
 */
export function buildRatchetMessageIx(
  recipientPubkey: Uint8Array,
  ratchetHeader: Uint8Array,
  encryptedMessage: Uint8Array,
  sender: PublicKey,
  programId: PublicKey = SPS_PROGRAM_ID
): TransactionInstruction {
  // Format: [domain][op][recipient][header_len][header][message_len][message]
  const data = Buffer.alloc(40 + ratchetHeader.length + encryptedMessage.length);
  let offset = 0;
  data.writeUInt8(DOMAIN_MESSAGING, offset++);
  data.writeUInt8(messaging.OP_RATCHET_MESSAGE, offset++);
  Buffer.from(recipientPubkey).copy(data, offset); offset += 32;
  data.writeUInt16LE(ratchetHeader.length, offset); offset += 2;
  Buffer.from(ratchetHeader).copy(data, offset); offset += ratchetHeader.length;
  data.writeUInt16LE(encryptedMessage.length, offset); offset += 2;
  Buffer.from(encryptedMessage).copy(data, offset);
  
  return new TransactionInstruction({
    programId,
    keys: [{ pubkey: sender, isSigner: true, isWritable: true }],
    data,
  });
}

/**
 * Build IAP_MINT instruction (Inscription-Anchored Privacy)
 */
export function buildIapMintIx(
  mintId: Uint8Array,
  amount: bigint,
  commitment: Uint8Array,
  iapProof: Uint8Array,
  authority: PublicKey,
  programId: PublicKey = SPS_PROGRAM_ID
): TransactionInstruction {
  // Format: [domain][op][mint_id][amount][commitment][proof_len][proof]
  const data = Buffer.alloc(78 + iapProof.length);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_IAP_TRANSFER, offset++);
  Buffer.from(mintId).copy(data, offset); offset += 32;
  data.writeBigUInt64LE(amount, offset); offset += 8;
  Buffer.from(commitment).copy(data, offset); offset += 32;
  data.writeUInt32LE(iapProof.length, offset); offset += 4;
  Buffer.from(iapProof).copy(data, offset);
  
  return new TransactionInstruction({
    programId,
    keys: [{ pubkey: authority, isSigner: true, isWritable: true }],
    data,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SPS CLIENT CLASS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * High-level SPS Client for building and sending transactions
 */
export class SpsClient {
  public readonly connection: Connection;
  public readonly programId: PublicKey;
  public wallet?: Keypair;

  constructor(config: SpsClientConfig) {
    this.connection = config.connection;
    this.wallet = config.wallet;
    this.programId = config.programId ?? 
      (config.network === 'devnet' ? SPS_DEVNET_PROGRAM_ID : SPS_PROGRAM_ID);
  }

  /**
   * Get payer public key
   */
  get payer(): PublicKey {
    if (!this.wallet) throw new Error('Wallet not configured');
    return this.wallet.publicKey;
  }

  /**
   * Send versioned transaction
   */
  async sendTransaction(
    instructions: TransactionInstruction[],
    signers: Keypair[] = []
  ): Promise<string> {
    if (!this.wallet) throw new Error('Wallet not configured');
    
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
    
    const message = new TransactionMessage({
      payerKey: this.wallet.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();
    
    const tx = new VersionedTransaction(message);
    tx.sign([this.wallet, ...signers]);
    
    const signature = await this.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
    });
    
    await this.connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    }, 'confirmed');
    
    return signature;
  }

  /**
   * Create a new SPS mint
   */
  async createMint(params: CreateMintParams): Promise<{ signature: string; mintId: Uint8Array }> {
    const { instruction, mintId } = buildCreateMintIx(params, this.payer, this.programId);
    const signature = await this.sendTransaction([instruction]);
    return { signature, mintId };
  }

  /**
   * Mint tokens to a commitment
   */
  async mintTo(params: MintToParams): Promise<string> {
    const instruction = buildMintToIx(params, this.payer, this.programId);
    return this.sendTransaction([instruction]);
  }

  /**
   * Transfer tokens (UTXO-style)
   */
  async transfer(params: TransferParams): Promise<string> {
    const instruction = buildTransferIx(params, this.payer, this.programId);
    return this.sendTransaction([instruction]);
  }

  /**
   * Create a privacy NFT
   */
  async createNft(params: CreateNftParams): Promise<{ signature: string; nftId: Uint8Array }> {
    const { instruction, nftId } = buildCreateNftIx(params, this.payer, this.programId);
    const signature = await this.sendTransaction([instruction]);
    return { signature, nftId };
  }

  /**
   * Create a decoy storm (privacy mixing)
   */
  async decoyStorm(decoyCount: number, realTransfer?: TransferParams): Promise<string> {
    const instruction = buildDecoyStormIx(decoyCount, realTransfer ?? null, this.payer, this.programId);
    return this.sendTransaction([instruction]);
  }

  /**
   * Create a time-locked vault
   */
  async createChronoVault(unlockSlot: bigint, content: Uint8Array): Promise<string> {
    const key = randomBytes(32);
    const encrypted = encrypt(content, key);
    const instruction = buildChronoVaultIx(unlockSlot, encrypted, this.payer, this.programId);
    return this.sendTransaction([instruction]);
  }

  /**
   * Send a private message
   */
  async sendPrivateMessage(params: PrivateMessageParams): Promise<string> {
    const instruction = buildPrivateMessageIx(params, this.payer, this.programId);
    return this.sendTransaction([instruction]);
  }

  /**
   * Create an AMM pool
   */
  async createAmmPool(params: CreatePoolParams): Promise<{ signature: string; poolId: Uint8Array }> {
    const { instruction, poolId } = buildCreateAmmPoolIx(params, this.payer, this.programId);
    const signature = await this.sendTransaction([instruction]);
    return { signature, poolId };
  }

  /**
   * Private swap in AMM pool
   */
  async privateSwap(
    poolId: Uint8Array,
    inputNullifier: Uint8Array,
    outputCommitment: Uint8Array,
    minOutput: bigint
  ): Promise<string> {
    const instruction = buildPrivateSwapIx(
      poolId, inputNullifier, outputCommitment, minOutput,
      this.payer, this.programId
    );
    return this.sendTransaction([instruction]);
  }

  /**
   * Shield SPL tokens → SPS Notes
   */
  async shield(splMint: PublicKey, amount: bigint, tokenAccount: PublicKey): Promise<{ signature: string; commitment: Uint8Array }> {
    const commitment = generateCommitment();
    const instruction = buildShieldIx(splMint, amount, commitment, this.payer, tokenAccount, this.programId);
    const signature = await this.sendTransaction([instruction]);
    return { signature, commitment };
  }

  /**
   * Unshield SPS Notes → SPL tokens
   */
  async unshield(nullifier: Uint8Array, amount: bigint, recipient: PublicKey): Promise<string> {
    const instruction = buildUnshieldIx(nullifier, amount, recipient, this.payer, this.programId);
    return this.sendTransaction([instruction]);
  }

  /**
   * Reveal transaction details to auditor (compliance)
   */
  async revealToAuditor(
    auditorPubkey: Uint8Array,
    details: Uint8Array,
    proof: Uint8Array
  ): Promise<string> {
    const instruction = buildRevealToAuditorIx(auditorPubkey, details, proof, this.payer, this.programId);
    return this.sendTransaction([instruction]);
  }

  /**
   * Attach Proof of Innocence to note
   */
  async attachPoi(commitment: Uint8Array, proof: Uint8Array): Promise<string> {
    const instruction = buildAttachPoiIx(commitment, proof, this.payer, this.programId);
    return this.sendTransaction([instruction]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INDEXER CLIENT (for reading state)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Client for reading SPS state from inscriptions
 */
export class SpsIndexerClient {
  private connection: Connection;
  private programId: PublicKey;

  constructor(connection: Connection, programId: PublicKey = SPS_PROGRAM_ID) {
    this.connection = connection;
    this.programId = programId;
  }

  /**
   * Scan for notes belonging to a view key
   */
  async scanNotes(
    viewPrivkey: Uint8Array,
    _startSlot?: number,
    _endSlot?: number
  ): Promise<SpsNote[]> {
    // Implementation would scan transaction logs for stealth addresses
    // and decrypt notes that match the view key
    console.log('Scanning notes for view key...');
    return [];
  }

  /**
   * Get virtual balance (sum of unspent notes)
   */
  async getVirtualBalance(viewPrivkey: Uint8Array, mintId: Uint8Array): Promise<VirtualBalance> {
    const notes = await this.scanNotes(viewPrivkey);
    const mintNotes = notes.filter(n => 
      Buffer.from(n.commitment).equals(Buffer.from(mintId))
    );
    
    const totalAmount = mintNotes.reduce((sum, n) => sum + n.amount, 0n);
    
    return {
      mintId,
      totalAmount,
      notes: mintNotes,
    };
  }

  /**
   * Check if nullifier has been spent
   */
  async isNullifierSpent(nullifier: Uint8Array): Promise<boolean> {
    const [pda] = deriveNullifierPda(nullifier, this.programId);
    const account = await this.connection.getAccountInfo(pda);
    return account !== null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default SpsClient;
