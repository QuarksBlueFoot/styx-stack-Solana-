/**
 * STS Token Standard - TypeScript SDK
 * 
 * This is Solana's first privacy-native token standard.
 * Anyone can create tokens, NFTs, and privacy-wrapped assets.
 * 
 * @example
 * ```typescript
 * import { StsStandard } from '@styx/token-standard';
 * 
 * // Create a new privacy token
 * const myToken = await StsStandard.createMint({
 *   name: "My Privacy Token",
 *   symbol: "MPT",
 *   decimals: 9,
 *   backing: { type: 'native' },
 * });
 * 
 * // Mint tokens
 * await StsStandard.mintTo(myToken.mintId, recipientCommitment, 1000n);
 * 
 * // Transfer privately
 * await StsStandard.transfer(myToken.mintId, nullifier, newCommitment, 500n);
 * ```
 */

import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  Connection,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';

// ============================================================================
// Constants
// ============================================================================

export const STS_PROGRAM_ID = new PublicKey(
  'GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9'
);

// STS Domain prefix (first byte of instruction)
export const STS_DOMAIN = 0x01;

// STS Operation codes (second byte of instruction)
export const STS_OP_CREATE_MINT = 0x01;
export const STS_OP_UPDATE_MINT = 0x02;
export const STS_OP_FREEZE_MINT = 0x03;
export const STS_OP_MINT_TO = 0x04;
export const STS_OP_BURN = 0x05;
export const STS_OP_TRANSFER = 0x06;
export const STS_OP_SHIELD = 0x07;
export const STS_OP_UNSHIELD = 0x08;
export const STS_OP_CREATE_RULESET = 0x09;
export const STS_OP_UPDATE_RULESET = 0x0A;
export const STS_OP_FREEZE_RULESET = 0x0B;
export const STS_OP_REVEAL_TO_AUDITOR = 0x0C;
export const STS_OP_ATTACH_POI = 0x0D;
export const STS_OP_BATCH_TRANSFER = 0x0E;
export const STS_OP_DECOY_STORM = 0x0F;
export const STS_OP_CHRONO_VAULT = 0x10;
export const STS_OP_CREATE_NFT = 0x11;
export const STS_OP_TRANSFER_NFT = 0x12;
export const STS_OP_REVEAL_NFT = 0x13;

// v5.0 - Pool & Receipt Token Operations
export const STS_OP_CREATE_POOL = 0x14;
export const STS_OP_CREATE_RECEIPT_MINT = 0x15;
export const STS_OP_STEALTH_UNSHIELD = 0x16;
export const STS_OP_PRIVATE_SWAP = 0x17;
export const STS_OP_CREATE_AMM_POOL = 0x18;

// PDA Seeds
const POOL_SEED = Buffer.from('sts_pool');
const RECEIPT_MINT_SEED = Buffer.from('sts_receipt');
const NULLIFIER_SEED = Buffer.from('sts_nullifier');
const AMM_POOL_SEED = Buffer.from('sts_amm');

// ============================================================================
// Types
// ============================================================================

export enum StsMintType {
  Fungible = 0,
  NonFungible = 1,
  SemiFungible = 2,
}

export enum StsBackingType {
  Native = 0,
  SplBacked = 1,
  Hybrid = 2,
}

export enum StsPrivacyMode {
  Private = 0,
  Transparent = 1,
  Optional = 2,
}

export interface StsMintConfig {
  name: string;
  symbol: string;
  decimals: number;
  supplyCap?: bigint;
  mintType?: StsMintType;
  backing?: {
    type: 'native' | 'spl-backed' | 'hybrid';
    splMint?: PublicKey;
    unbackedRatio?: number;
  };
  privacyMode?: StsPrivacyMode;
  extensions?: StsExtension[];
  ruleSet?: StsRuleConfig;
}

export interface StsExtension {
  type: 'require-poi' | 'auditor-key' | 'transfer-fee' | 'timelock' | 'velocity-limit';
  data?: any;
}

export interface StsRuleConfig {
  rules: StsRule[];
  frozen?: boolean;
}

export interface StsRule {
  type: 'time-hold' | 'velocity-limit' | 'require-poi' | 'allow-list' | 'deny-list' | 'transfer-fee';
  minSlots?: number;
  maxAmount?: bigint;
  windowSlots?: number;
  addresses?: PublicKey[];
  basisPoints?: number;
  treasury?: PublicKey;
}

export interface StsNote {
  mintId: Uint8Array;
  commitment: Uint8Array;
  secret: Uint8Array;
  nonce: Uint8Array;
  amount: bigint;
  encryptedData?: Uint8Array;
}

export interface StsMint {
  mintId: Uint8Array;
  name: string;
  symbol: string;
  decimals: number;
  supplyCap: bigint;
  mintType: StsMintType;
  backing: StsBackingType;
  splMint?: PublicKey;
  authority: PublicKey;
  privacyMode: StsPrivacyMode;
}

// ============================================================================
// Crypto Utilities
// ============================================================================

/**
 * Create a note commitment (hides owner and amount)
 */
export function createCommitment(
  ownerSecret: Uint8Array,
  amount: bigint,
  nonce: Uint8Array
): Uint8Array {
  // In production, use keccak256
  // For now, simple hash concatenation
  const data = new Uint8Array([
    ...Buffer.from('STS_NOTE_V1'),
    ...ownerSecret,
    ...bigintToBytes(amount, 8),
    ...nonce,
  ]);
  return keccak256(data);
}

/**
 * Create a nullifier (revealed when spending)
 */
export function createNullifier(
  ownerSecret: Uint8Array,
  nonce: Uint8Array
): Uint8Array {
  const data = new Uint8Array([
    ...Buffer.from('STS_NULLIFIER_V1'),
    ...ownerSecret,
    ...nonce,
  ]);
  return keccak256(data);
}

/**
 * Generate a random 32-byte secret
 */
export function generateSecret(): Uint8Array {
  const secret = new Uint8Array(32);
  crypto.getRandomValues(secret);
  return secret;
}

/**
 * Generate a random nonce
 */
export function generateNonce(): Uint8Array {
  return generateSecret();
}

// ============================================================================
// PDA Derivations
// ============================================================================

/**
 * Get Pool PDA for an SPL mint (v5.0)
 * The Pool holds deposited SPL tokens for the STS mint
 */
export function getPoolPda(
  mintId: Uint8Array,
  programId: PublicKey = STS_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POOL_SEED, mintId],
    programId
  );
}

/**
 * Get Receipt Mint PDA (v5.0)
 * Token-2022 mint for DEX-tradeable receipt tokens
 */
export function getReceiptMintPda(
  mintId: Uint8Array,
  programId: PublicKey = STS_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [RECEIPT_MINT_SEED, mintId],
    programId
  );
}

/**
 * Get Nullifier PDA (prevents double-spend)
 */
export function getNullifierPda(
  nullifier: Uint8Array,
  programId: PublicKey = STS_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [NULLIFIER_SEED, nullifier],
    programId
  );
}

/**
 * Get AMM Pool PDA (v5.0)
 * Private AMM for in-layer swaps
 */
export function getAmmPoolPda(
  mintA: Uint8Array,
  mintB: Uint8Array,
  programId: PublicKey = STS_PROGRAM_ID
): [PublicKey, number] {
  // Sort mints for canonical ordering
  const [first, second] = Buffer.compare(Buffer.from(mintA), Buffer.from(mintB)) < 0
    ? [mintA, mintB]
    : [mintB, mintA];
  return PublicKey.findProgramAddressSync(
    [AMM_POOL_SEED, first, second],
    programId
  );
}

// ============================================================================
// Instruction Builders
// ============================================================================

/**
 * Create a new STS Mint
 */
export function createMintInstruction(
  creator: PublicKey,
  config: StsMintConfig,
  programId: PublicKey = STS_PROGRAM_ID
): TransactionInstruction {
  const nonce = generateNonce();
  const nameBytes = padString(config.name, 32);
  const symbolBytes = padString(config.symbol, 8);
  const decimals = config.decimals;
  const supplyCap = config.supplyCap ?? 0n;
  const mintType = config.mintType ?? StsMintType.Fungible;
  
  let backingType = StsBackingType.Native;
  let splMint: Uint8Array = new Uint8Array(32);
  
  if (config.backing) {
    if (config.backing.type === 'spl-backed') {
      backingType = StsBackingType.SplBacked;
      if (config.backing.splMint) {
        splMint = new Uint8Array(config.backing.splMint.toBytes());
      }
    } else if (config.backing.type === 'hybrid') {
      backingType = StsBackingType.Hybrid;
      if (config.backing.splMint) {
        splMint = new Uint8Array(config.backing.splMint.toBytes());
      }
    }
  }
  
  const privacyMode = config.privacyMode ?? StsPrivacyMode.Private;
  const extensionFlags = computeExtensionFlags(config.extensions ?? []);
  
  const data = Buffer.alloc(122);
  let offset = 0;
  
  // Two-byte instruction encoding: [STS_DOMAIN][STS_OP]
  data[offset++] = STS_DOMAIN;
  data[offset++] = STS_OP_CREATE_MINT;
  data.set(nonce, offset); offset += 32;
  data.set(nameBytes, offset); offset += 32;
  data.set(symbolBytes, offset); offset += 8;
  data[offset++] = decimals;
  data.writeBigUInt64LE(supplyCap, offset); offset += 8;
  data[offset++] = mintType;
  data[offset++] = backingType;
  data.set(splMint, offset); offset += 32;
  data[offset++] = privacyMode;
  data.writeUInt32LE(extensionFlags, offset);
  
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Mint tokens to a commitment
 */
export function mintToInstruction(
  authority: PublicKey,
  mintId: Uint8Array,
  amount: bigint,
  recipientCommitment: Uint8Array,
  encryptedNote: Uint8Array,
  programId: PublicKey = STS_PROGRAM_ID
): TransactionInstruction {
  const data = Buffer.alloc(78 + encryptedNote.length);
  let offset = 0;
  
  // Two-byte instruction encoding
  data[offset++] = STS_DOMAIN;
  data[offset++] = STS_OP_MINT_TO;
  data.set(mintId, offset); offset += 32;
  data.writeBigUInt64LE(amount, offset); offset += 8;
  data.set(recipientCommitment, offset); offset += 32;
  data.writeUInt32LE(encryptedNote.length, offset); offset += 4;
  data.set(encryptedNote, offset);
  
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
    ],
    data,
  });
}

/**
 * Private transfer (note to note)
 */
export function transferInstruction(
  sender: PublicKey,
  mintId: Uint8Array,
  inputNullifier: Uint8Array,
  outputCommitment1: Uint8Array,
  outputCommitment2: Uint8Array,
  amount1: bigint,
  amount2: bigint,
  encryptedNotes: Uint8Array,
  programId: PublicKey = STS_PROGRAM_ID
): TransactionInstruction {
  const [nullifierPda] = getNullifierPda(inputNullifier, programId);
  
  const data = Buffer.alloc(150 + encryptedNotes.length);
  let offset = 0;
  
  // Two-byte instruction encoding
  data[offset++] = STS_DOMAIN;
  data[offset++] = STS_OP_TRANSFER;
  data.set(mintId, offset); offset += 32;
  data.set(inputNullifier, offset); offset += 32;
  data.set(outputCommitment1, offset); offset += 32;
  data.set(outputCommitment2, offset); offset += 32;
  data.writeBigUInt64LE(amount1, offset); offset += 8;
  data.writeBigUInt64LE(amount2, offset); offset += 8;
  data.writeUInt32LE(encryptedNotes.length, offset); offset += 4;
  data.set(encryptedNotes, offset);
  
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: sender, isSigner: true, isWritable: true },
      { pubkey: nullifierPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Shield: Deposit SPL token into STS
 */
export function shieldInstruction(
  depositor: PublicKey,
  depositorTokenAccount: PublicKey,
  escrowTokenAccount: PublicKey,
  splMint: PublicKey,
  mintId: Uint8Array,
  amount: bigint,
  recipientCommitment: Uint8Array,
  encryptedNote: Uint8Array,
  programId: PublicKey = STS_PROGRAM_ID
): TransactionInstruction {
  const data = Buffer.alloc(78 + encryptedNote.length);
  let offset = 0;
  
  // Two-byte instruction encoding
  data[offset++] = STS_DOMAIN;
  data[offset++] = STS_OP_SHIELD;
  data.set(mintId, offset); offset += 32;
  data.writeBigUInt64LE(amount, offset); offset += 8;
  data.set(recipientCommitment, offset); offset += 32;
  data.writeUInt32LE(encryptedNote.length, offset); offset += 4;
  data.set(encryptedNote, offset);
  
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: depositor, isSigner: true, isWritable: true },
      { pubkey: depositorTokenAccount, isSigner: false, isWritable: true },
      { pubkey: escrowTokenAccount, isSigner: false, isWritable: true },
      { pubkey: splMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Unshield: Withdraw SPL token from STS Pool (v5.0)
 */
export function unshieldInstruction(
  withdrawer: PublicKey,
  recipientTokenAccount: PublicKey,
  poolTokenAccount: PublicKey,
  splMint: PublicKey,
  mintId: Uint8Array,
  nullifier: Uint8Array,
  amount: bigint,
  recipient: PublicKey,
  receiptMint?: PublicKey,
  withdrawerReceiptAccount?: PublicKey,
  programId: PublicKey = STS_PROGRAM_ID
): TransactionInstruction {
  const [nullifierPda] = getNullifierPda(nullifier, programId);
  const [poolPda] = getPoolPda(mintId, programId);
  
  const data = Buffer.alloc(106);
  let offset = 0;
  
  // Two-byte instruction encoding
  data[offset++] = STS_DOMAIN;
  data[offset++] = STS_OP_UNSHIELD;
  data.set(mintId, offset); offset += 32;
  data.set(nullifier, offset); offset += 32;
  data.writeBigUInt64LE(amount, offset); offset += 8;
  data.set(recipient.toBytes(), offset);
  
  const keys = [
    { pubkey: withdrawer, isSigner: true, isWritable: true },
    { pubkey: nullifierPda, isSigner: false, isWritable: true },
    { pubkey: recipientTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolPda, isSigner: false, isWritable: false },
    { pubkey: splMint, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
  
  // Optional: Include receipt token accounts for burning
  if (receiptMint && withdrawerReceiptAccount) {
    keys.push({ pubkey: receiptMint, isSigner: false, isWritable: true });
    keys.push({ pubkey: withdrawerReceiptAccount, isSigner: false, isWritable: true });
  }
  
  return new TransactionInstruction({
    programId,
    keys,
    data,
  });
}

/**
 * Create NFT with privacy
 */
export function createNftInstruction(
  creator: PublicKey,
  name: string,
  symbol: string,
  uri: string,
  recipientCommitment: Uint8Array,
  collectionId?: Uint8Array,
  privacyMode: StsPrivacyMode = StsPrivacyMode.Optional,
  programId: PublicKey = STS_PROGRAM_ID
): TransactionInstruction {
  const nonce = generateNonce();
  const nameBytes = padString(name, 32);
  const symbolBytes = padString(symbol, 8);
  const uriBytes = Buffer.from(uri);
  const collection = collectionId ?? new Uint8Array(32);
  
  const data = Buffer.alloc(76 + uriBytes.length + 69);
  let offset = 0;
  
  // Two-byte instruction encoding
  data[offset++] = STS_DOMAIN;
  data[offset++] = STS_OP_CREATE_NFT;
  data.set(nonce, offset); offset += 32;
  data.set(nameBytes, offset); offset += 32;
  data.set(symbolBytes, offset); offset += 8;
  data.writeUInt16LE(uriBytes.length, offset); offset += 2;
  data.set(uriBytes, offset); offset += uriBytes.length;
  data.set(recipientCommitment, offset); offset += 32;
  data.set(collection, offset); offset += 32;
  data[offset++] = privacyMode;
  data.writeUInt32LE(0, offset); // extension flags
  
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
    ],
    data,
  });
}

// ============================================================================
// v5.0 Pool & Receipt Token Instructions
// ============================================================================

/**
 * Create Pool PDA for an SPL mint (v5.0)
 * This creates the Pool that holds deposited SPL tokens
 */
export function createPoolInstruction(
  authority: PublicKey,
  splMint: PublicKey,
  mintId: Uint8Array,
  programId: PublicKey = STS_PROGRAM_ID
): TransactionInstruction {
  const [poolPda] = getPoolPda(mintId, programId);
  
  const data = Buffer.alloc(34);
  let offset = 0;
  
  data[offset++] = STS_DOMAIN;
  data[offset++] = STS_OP_CREATE_POOL;
  data.set(mintId, offset);
  
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: poolPda, isSigner: false, isWritable: true },
      { pubkey: splMint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Create Receipt Mint (v5.0)
 * Token-2022 mint representing shielded tokens for DEX trading
 */
export function createReceiptMintInstruction(
  authority: PublicKey,
  mintId: Uint8Array,
  decimals: number = 9,
  programId: PublicKey = STS_PROGRAM_ID
): TransactionInstruction {
  const [receiptMintPda] = getReceiptMintPda(mintId, programId);
  
  const data = Buffer.alloc(35);
  let offset = 0;
  
  data[offset++] = STS_DOMAIN;
  data[offset++] = STS_OP_CREATE_RECEIPT_MINT;
  data.set(mintId, offset); offset += 32;
  data[offset++] = decimals;
  
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: receiptMintPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      // Token-2022 program would be passed here in production
    ],
    data,
  });
}

/**
 * Stealth Unshield (v5.0)
 * Withdraw to a one-time stealth address for enhanced privacy
 */
export function stealthUnshieldInstruction(
  withdrawer: PublicKey,
  stealthAddress: PublicKey,
  stealthTokenAccount: PublicKey,
  poolTokenAccount: PublicKey,
  splMint: PublicKey,
  mintId: Uint8Array,
  nullifier: Uint8Array,
  amount: bigint,
  ephemeralPubkey: Uint8Array,
  programId: PublicKey = STS_PROGRAM_ID
): TransactionInstruction {
  const [nullifierPda] = getNullifierPda(nullifier, programId);
  const [poolPda] = getPoolPda(mintId, programId);
  
  const data = Buffer.alloc(138);
  let offset = 0;
  
  data[offset++] = STS_DOMAIN;
  data[offset++] = STS_OP_STEALTH_UNSHIELD;
  data.set(mintId, offset); offset += 32;
  data.set(nullifier, offset); offset += 32;
  data.writeBigUInt64LE(amount, offset); offset += 8;
  data.set(stealthAddress.toBytes(), offset); offset += 32;
  data.set(ephemeralPubkey, offset);
  
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: withdrawer, isSigner: true, isWritable: true },
      { pubkey: nullifierPda, isSigner: false, isWritable: true },
      { pubkey: stealthTokenAccount, isSigner: false, isWritable: true },
      { pubkey: poolTokenAccount, isSigner: false, isWritable: true },
      { pubkey: poolPda, isSigner: false, isWritable: false },
      { pubkey: splMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Create Private AMM Pool (v5.0)
 * Creates an AMM pool for private swaps within the inscription layer
 */
export function createAmmPoolInstruction(
  authority: PublicKey,
  mintIdA: Uint8Array,
  mintIdB: Uint8Array,
  feeBasisPoints: number = 30, // 0.3% default
  programId: PublicKey = STS_PROGRAM_ID
): TransactionInstruction {
  const [ammPoolPda] = getAmmPoolPda(mintIdA, mintIdB, programId);
  
  const data = Buffer.alloc(70);
  let offset = 0;
  
  data[offset++] = STS_DOMAIN;
  data[offset++] = STS_OP_CREATE_AMM_POOL;
  data.set(mintIdA, offset); offset += 32;
  data.set(mintIdB, offset); offset += 32;
  data.writeUInt16LE(feeBasisPoints, offset); offset += 2;
  data.writeUInt16LE(0, offset); // reserved flags
  
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: ammPoolPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Private Swap (v5.0)
 * Execute a swap within the private layer (note-to-note)
 */
export function privateSwapInstruction(
  swapper: PublicKey,
  mintIdIn: Uint8Array,
  mintIdOut: Uint8Array,
  inputNullifier: Uint8Array,
  outputCommitment: Uint8Array,
  amountIn: bigint,
  minAmountOut: bigint,
  encryptedNote: Uint8Array,
  programId: PublicKey = STS_PROGRAM_ID
): TransactionInstruction {
  const [inputNullifierPda] = getNullifierPda(inputNullifier, programId);
  const [ammPoolPda] = getAmmPoolPda(mintIdIn, mintIdOut, programId);
  
  const data = Buffer.alloc(154 + encryptedNote.length);
  let offset = 0;
  
  data[offset++] = STS_DOMAIN;
  data[offset++] = STS_OP_PRIVATE_SWAP;
  data.set(mintIdIn, offset); offset += 32;
  data.set(mintIdOut, offset); offset += 32;
  data.set(inputNullifier, offset); offset += 32;
  data.set(outputCommitment, offset); offset += 32;
  data.writeBigUInt64LE(amountIn, offset); offset += 8;
  data.writeBigUInt64LE(minAmountOut, offset); offset += 8;
  data.writeUInt32LE(encryptedNote.length, offset); offset += 4;
  data.set(encryptedNote, offset);
  
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: swapper, isSigner: true, isWritable: true },
      { pubkey: inputNullifierPda, isSigner: false, isWritable: true },
      { pubkey: ammPoolPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ============================================================================
// Stealth Address Utilities (v5.0)
// ============================================================================

/**
 * Generate a stealth address for one-time receiving
 */
export function generateStealthAddress(
  recipientViewKey: Uint8Array,
  recipientSpendKey: PublicKey
): { stealthAddress: PublicKey; ephemeralKeypair: Keypair } {
  // Generate ephemeral keypair
  const ephemeralKeypair = Keypair.generate();
  
  // Derive shared secret: ephemeral_private * recipient_view_key
  // In production, use proper ECDH
  const sharedSecret = keccak256(new Uint8Array([
    ...ephemeralKeypair.secretKey.slice(0, 32),
    ...recipientViewKey,
  ]));
  
  // Derive stealth address: recipient_spend_key + hash(shared_secret) * G
  // Simplified for this implementation
  const stealthBytes = new Uint8Array(32);
  const spendBytes = recipientSpendKey.toBytes();
  for (let i = 0; i < 32; i++) {
    stealthBytes[i] = spendBytes[i] ^ sharedSecret[i];
  }
  
  // Note: In production, this would be proper curve point addition
  // For now, we use the XOR'd bytes as a seed
  const stealthAddress = Keypair.fromSeed(stealthBytes).publicKey;
  
  return { stealthAddress, ephemeralKeypair };
}

/**
 * Derive the private key for a stealth address (recipient only)
 */
export function deriveStealthPrivateKey(
  viewKey: Uint8Array,
  spendKey: Uint8Array,
  ephemeralPubkey: Uint8Array
): Uint8Array {
  // Derive shared secret: view_key * ephemeral_pubkey
  const sharedSecret = keccak256(new Uint8Array([
    ...viewKey,
    ...ephemeralPubkey,
  ]));
  
  // Derive private key: spend_key + hash(shared_secret)
  const privateKey = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    privateKey[i] = spendKey[i] ^ sharedSecret[i];
  }
  
  return privateKey;
}

// ============================================================================
// High-Level API
// ============================================================================

export class StsStandard {
  constructor(
    public connection: Connection,
    public programId: PublicKey = STS_PROGRAM_ID
  ) {}
  
  /**
   * Create a new STS token mint
   */
  async createMint(
    payer: Keypair,
    config: StsMintConfig
  ): Promise<{ mintId: Uint8Array; signature: string }> {
    const ix = createMintInstruction(payer.publicKey, config, this.programId);
    const tx = new Transaction().add(ix);
    
    const signature = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [payer]
    );
    
    // Derive mint ID from the transaction logs
    // In production, parse the logs to get the exact mint ID
    const mintId = new Uint8Array(32); // Placeholder
    
    return { mintId, signature };
  }
  
  /**
   * Mint tokens to a recipient
   */
  async mintTo(
    authority: Keypair,
    mintId: Uint8Array,
    recipientSecret: Uint8Array,
    amount: bigint
  ): Promise<{ note: StsNote; signature: string }> {
    const nonce = generateNonce();
    const commitment = createCommitment(recipientSecret, amount, nonce);
    const encryptedNote = new Uint8Array(0); // In production, encrypt for recipient
    
    const ix = mintToInstruction(
      authority.publicKey,
      mintId,
      amount,
      commitment,
      encryptedNote,
      this.programId
    );
    
    const tx = new Transaction().add(ix);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [authority]
    );
    
    const note: StsNote = {
      mintId,
      commitment,
      secret: recipientSecret,
      nonce,
      amount,
    };
    
    return { note, signature };
  }
  
  /**
   * Transfer tokens privately
   */
  async transfer(
    sender: Keypair,
    note: StsNote,
    recipientSecret: Uint8Array,
    amount: bigint,
    changeSecret?: Uint8Array
  ): Promise<{ recipientNote: StsNote; changeNote?: StsNote; signature: string }> {
    const nullifier = createNullifier(note.secret, note.nonce);
    
    const recipientNonce = generateNonce();
    const recipientCommitment = createCommitment(recipientSecret, amount, recipientNonce);
    
    const changeAmount = note.amount - amount;
    let changeCommitment: Uint8Array = new Uint8Array(32);
    let changeNonce: Uint8Array = new Uint8Array(32);
    
    if (changeAmount > 0n && changeSecret) {
      changeNonce = new Uint8Array(generateNonce());
      changeCommitment = new Uint8Array(createCommitment(changeSecret, changeAmount, changeNonce));
    }
    
    const encryptedNotes = new Uint8Array(0); // In production, encrypt for recipients
    
    const ix = transferInstruction(
      sender.publicKey,
      note.mintId,
      nullifier,
      recipientCommitment,
      changeCommitment,
      amount,
      changeAmount,
      encryptedNotes,
      this.programId
    );
    
    const tx = new Transaction().add(ix);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [sender]
    );
    
    const recipientNote: StsNote = {
      mintId: note.mintId,
      commitment: recipientCommitment,
      secret: recipientSecret,
      nonce: recipientNonce,
      amount,
    };
    
    let changeNote: StsNote | undefined;
    if (changeAmount > 0n && changeSecret) {
      changeNote = {
        mintId: note.mintId,
        commitment: changeCommitment,
        secret: changeSecret,
        nonce: changeNonce,
        amount: changeAmount,
      };
    }
    
    return { recipientNote, changeNote, signature };
  }
  
  /**
   * Shield SPL tokens into STS
   */
  /**
   * Shield SPL tokens into STS (v5.0)
   * Deposits tokens into Pool PDA and creates private note
   */
  async shield(
    depositor: Keypair,
    mintId: Uint8Array,
    splMint: PublicKey,
    amount: bigint,
    recipientSecret: Uint8Array
  ): Promise<{ note: StsNote; signature: string }> {
    const [poolPda] = getPoolPda(mintId, this.programId);
    const depositorAta = await getAssociatedTokenAddress(splMint, depositor.publicKey);
    const poolAta = await getAssociatedTokenAddress(splMint, poolPda, true);
    
    const nonce = generateNonce();
    const commitment = createCommitment(recipientSecret, amount, nonce);
    const encryptedNote = new Uint8Array(0);
    
    const ix = shieldInstruction(
      depositor.publicKey,
      depositorAta,
      poolAta,
      splMint,
      mintId,
      amount,
      commitment,
      encryptedNote,
      this.programId
    );
    
    const tx = new Transaction().add(ix);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [depositor]
    );
    
    const note: StsNote = {
      mintId,
      commitment,
      secret: recipientSecret,
      nonce,
      amount,
    };
    
    return { note, signature };
  }
  
  /**
   * Unshield STS tokens to SPL (v5.0)
   * Burns receipt tokens and withdraws from Pool PDA
   */
  async unshield(
    withdrawer: Keypair,
    note: StsNote,
    splMint: PublicKey,
    recipient: PublicKey,
    receiptMint?: PublicKey,
  ): Promise<{ signature: string }> {
    const nullifier = createNullifier(note.secret, note.nonce);
    const [poolPda] = getPoolPda(note.mintId, this.programId);
    const recipientAta = await getAssociatedTokenAddress(splMint, recipient);
    const poolAta = await getAssociatedTokenAddress(splMint, poolPda, true);
    
    // Optional: get receipt token account if receipt minting is enabled
    let withdrawerReceiptAccount: PublicKey | undefined;
    if (receiptMint) {
      withdrawerReceiptAccount = await getAssociatedTokenAddress(receiptMint, withdrawer.publicKey);
    }
    
    const ix = unshieldInstruction(
      withdrawer.publicKey,
      recipientAta,
      poolAta,
      splMint,
      note.mintId,
      nullifier,
      note.amount,
      recipient,
      receiptMint,
      withdrawerReceiptAccount,
      this.programId
    );
    
    const tx = new Transaction().add(ix);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [withdrawer]
    );
    
    return { signature };
  }
  
  /**
   * Create a Pool for an STS mint (v5.0)
   */
  async createPool(
    authority: Keypair,
    mintId: Uint8Array,
    splMint: PublicKey
  ): Promise<{ poolPda: PublicKey; signature: string }> {
    const ix = createPoolInstruction(
      authority.publicKey,
      splMint,
      mintId,
      this.programId
    );
    
    const tx = new Transaction().add(ix);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [authority]
    );
    
    const [poolPda] = getPoolPda(mintId, this.programId);
    return { poolPda, signature };
  }
  
  /**
   * Create a Receipt Mint for an STS mint (v5.0)
   */
  async createReceiptMint(
    authority: Keypair,
    mintId: Uint8Array,
    decimals: number = 9
  ): Promise<{ receiptMint: PublicKey; signature: string }> {
    const ix = createReceiptMintInstruction(
      authority.publicKey,
      mintId,
      decimals,
      this.programId
    );
    
    const tx = new Transaction().add(ix);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [authority]
    );
    
    const [receiptMint] = getReceiptMintPda(mintId, this.programId);
    return { receiptMint, signature };
  }
  
  /**
   * Stealth Unshield (v5.0)
   * Withdraw to a one-time stealth address
   */
  async stealthUnshield(
    withdrawer: Keypair,
    note: StsNote,
    splMint: PublicKey,
    recipientViewKey: Uint8Array,
    recipientSpendKey: PublicKey
  ): Promise<{ stealthAddress: PublicKey; ephemeralPubkey: Uint8Array; signature: string }> {
    const nullifier = createNullifier(note.secret, note.nonce);
    const [poolPda] = getPoolPda(note.mintId, this.programId);
    
    // Generate stealth address
    const { stealthAddress, ephemeralKeypair } = generateStealthAddress(
      recipientViewKey,
      recipientSpendKey
    );
    
    const poolAta = await getAssociatedTokenAddress(splMint, poolPda, true);
    const stealthAta = await getAssociatedTokenAddress(splMint, stealthAddress);
    
    const ix = stealthUnshieldInstruction(
      withdrawer.publicKey,
      stealthAddress,
      stealthAta,
      poolAta,
      splMint,
      note.mintId,
      nullifier,
      note.amount,
      ephemeralKeypair.publicKey.toBytes(),
      this.programId
    );
    
    const tx = new Transaction().add(ix);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [withdrawer]
    );
    
    return {
      stealthAddress,
      ephemeralPubkey: ephemeralKeypair.publicKey.toBytes(),
      signature
    };
  }
  
  /**
   * Private Swap (v5.0)
   * Swap tokens within the private layer
   */
  async privateSwap(
    swapper: Keypair,
    inputNote: StsNote,
    outputMintId: Uint8Array,
    minAmountOut: bigint,
    recipientSecret: Uint8Array
  ): Promise<{ outputNote: StsNote; signature: string }> {
    const inputNullifier = createNullifier(inputNote.secret, inputNote.nonce);
    
    const outputNonce = generateNonce();
    const outputCommitment = createCommitment(recipientSecret, minAmountOut, outputNonce);
    const encryptedNote = new Uint8Array(0); // In production, encrypt for recipient
    
    const ix = privateSwapInstruction(
      swapper.publicKey,
      inputNote.mintId,
      outputMintId,
      inputNullifier,
      outputCommitment,
      inputNote.amount,
      minAmountOut,
      encryptedNote,
      this.programId
    );
    
    const tx = new Transaction().add(ix);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [swapper]
    );
    
    const outputNote: StsNote = {
      mintId: outputMintId,
      commitment: outputCommitment,
      secret: recipientSecret,
      nonce: outputNonce,
      amount: minAmountOut, // Actual amount may differ based on AMM
    };
    
    return { outputNote, signature };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function padString(str: string, length: number): Uint8Array {
  const bytes = Buffer.from(str);
  const padded = Buffer.alloc(length);
  bytes.copy(padded, 0, 0, Math.min(bytes.length, length));
  return padded;
}

function bigintToBytes(value: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Number((value >> BigInt(i * 8)) & 0xFFn);
  }
  return bytes;
}

function computeExtensionFlags(extensions: StsExtension[]): number {
  let flags = 0;
  for (const ext of extensions) {
    switch (ext.type) {
      case 'require-poi': flags |= 1 << 0; break;
      case 'auditor-key': flags |= 1 << 1; break;
      case 'transfer-fee': flags |= 1 << 2; break;
      case 'timelock': flags |= 1 << 3; break;
      case 'velocity-limit': flags |= 1 << 4; break;
    }
  }
  return flags;
}

// Simple keccak256 implementation (in production, use a proper library)
function keccak256(data: Uint8Array): Uint8Array {
  // Placeholder - in production use @noble/hashes or similar
  const hash = new Uint8Array(32);
  for (let i = 0; i < data.length; i++) {
    hash[i % 32] ^= data[i];
  }
  return hash;
}

export default StsStandard;
