#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *                    STS TOKEN STANDARD - COMPREHENSIVE TEST SUITE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Tests ALL 200+ features of the STS Token Standard on Devnet:
 * 
 * PART 1: STS Token Core Operations (0x01-0x08)
 * PART 2: STS Token Advanced (0x09-0x13)
 * PART 3: STS v5.0 Pool Operations (0x14-0x18)
 * PART 4: STS NFT Operations
 * PART 5: PMP Inscription Tags (3-64)
 * 
 * Program: CumUDpSpjmMEsaPhLMZEE8NKtgq9BTT6eyN7RCpsWmPE
 * Network: DEVNET ONLY
 * 
 * ⚠️  This test creates real on-chain transactions and accounts
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  mintTo,
  getAccount,
  createInitializeMintInstruction,
  MINT_SIZE,
} from '@solana/spl-token';
import { createHash, randomBytes } from 'crypto';
import * as fs from 'fs';

// ============================================================================
// CONFIGURATION
// ============================================================================

const STS_PROGRAM_ID = new PublicKey('CumUDpSpjmMEsaPhLMZEE8NKtgq9BTT6eyN7RCpsWmPE');
const DEVNET_RPC = 'https://api.devnet.solana.com';
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

// STS Domain and Operation Codes
const STS_DOMAIN = 0x01;

// Core Token Operations
const STS_OP_CREATE_MINT = 0x01;
const STS_OP_UPDATE_MINT = 0x02;
const STS_OP_FREEZE_MINT = 0x03;
const STS_OP_MINT_TO = 0x04;
const STS_OP_BURN = 0x05;
const STS_OP_TRANSFER = 0x06;
const STS_OP_SHIELD = 0x07;
const STS_OP_UNSHIELD = 0x08;

// RuleSet Operations
const STS_OP_CREATE_RULESET = 0x09;
const STS_OP_UPDATE_RULESET = 0x0A;
const STS_OP_FREEZE_RULESET = 0x0B;

// Compliance Operations
const STS_OP_REVEAL_TO_AUDITOR = 0x0C;
const STS_OP_ATTACH_POI = 0x0D;

// Advanced Privacy Operations
const STS_OP_BATCH_TRANSFER = 0x0E;
const STS_OP_DECOY_STORM = 0x0F;
const STS_OP_CHRONO_VAULT = 0x10;

// NFT Operations
const STS_OP_CREATE_NFT = 0x11;
const STS_OP_TRANSFER_NFT = 0x12;
const STS_OP_REVEAL_NFT = 0x13;

// v5.0 Pool Operations
const STS_OP_CREATE_POOL = 0x14;
const STS_OP_CREATE_RECEIPT_MINT = 0x15;
const STS_OP_STEALTH_UNSHIELD = 0x16;
const STS_OP_PRIVATE_SWAP = 0x17;
const STS_OP_CREATE_AMM_POOL = 0x18;

// PMP Tags (3-64)
const TAG_PRIVATE_MESSAGE = 3;
const TAG_GROUP_INVITE = 4;
const TAG_PRIVATE_TRANSFER = 5;
const TAG_KEY_ROTATION = 6;
const TAG_SESSION_INIT = 7;
const TAG_MESSAGE_ACK = 8;
const TAG_PROPOSAL_CREATE = 9;
const TAG_PROPOSAL_VOTE = 10;
const TAG_PROPOSAL_EXECUTE = 11;
const TAG_VSL_CREATE = 12;
const TAG_VSL_UPDATE = 13;
const TAG_INSCRIBED_MINT = 14;
const TAG_INSCRIBED_TRANSFER = 15;
const TAG_INSCRIBED_BURN = 16;
const TAG_INSCRIBED_FREEZE = 17;
const TAG_INSCRIBED_THAW = 18;
const TAG_INSCRIBED_DELEGATE = 19;
const TAG_INSCRIBED_REVOKE = 20;
const TAG_INSCRIBED_CLOSE = 21;
const TAG_INSCRIBED_METADATA = 22;
const TAG_VTA_STEALTH = 23;
const TAG_VTA_SPLIT = 24;
const TAG_VTA_MERGE = 25;
const TAG_VTA_TIMELOCK = 26;
const TAG_VTA_VELOCITY = 27;
const TAG_VTA_ALLOWLIST = 28;
const TAG_VTA_BLOCKLIST = 29;
const TAG_VTA_RECOVERY = 30;
const TAG_VTA_MULTISIG = 31;
const TAG_VSL_DEPOSIT = 32;
const TAG_VSL_WITHDRAW = 33;
const TAG_VSL_STAKE = 34;
const TAG_VSL_UNSTAKE = 35;
const TAG_VSL_CLAIM = 36;
const TAG_VSL_VOTE = 37;
const TAG_VSL_DELEGATE = 38;
const TAG_VSL_UNDELEGATE = 39;
const TAG_VSL_SLASH = 40;
const TAG_VSL_REWARD = 41;
const TAG_VSL_EPOCH = 42;
const TAG_VSL_CHECKPOINT = 43;
const TAG_DECOY_STORM = 44;
const TAG_CHRONO_VAULT = 45;
const TAG_STEALTH_REG = 46;
const TAG_RING_SIG = 47;
const TAG_ZK_PROOF = 48;
const TAG_AUDIT_REVEAL = 49;
const TAG_SELECTIVE_DISCLOSE = 50;
const TAG_CONFIDENTIAL_NOTE = 51;
const TAG_BATCH_PRIVATE = 52;
const TAG_MIXER_DEPOSIT = 53;
const TAG_POI_CREATE = 54;
const TAG_POI_VERIFY = 55;
const TAG_POI_ATTEST = 56;
const TAG_POI_CHALLENGE = 57;
const TAG_POI_RESPOND = 58;
const TAG_POI_RESOLVE = 59;
const TAG_POI_REVOKE = 60;
const TAG_POI_DELEGATE = 61;
const TAG_POI_SNAPSHOT = 62;
const TAG_POI_MERKLE = 63;
const TAG_POI_BATCH = 64;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function sha256(data) {
  return createHash('sha256').update(data).digest();
}

function keccak256(data) {
  return createHash('sha3-256').update(data).digest();
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function airdropIfNeeded(connection, pubkey, minBalance = 0.1) {
  const balance = await connection.getBalance(pubkey);
  if (balance < minBalance * LAMPORTS_PER_SOL) {
    console.log(`  💰 Airdropping to ${pubkey.toBase58().slice(0, 8)}...`);
    try {
      const sig = await connection.requestAirdrop(pubkey, 0.5 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig);
      await delay(1000);
    } catch (e) {
      console.log(`  ⚠️  Airdrop failed (rate limited?), using existing balance`);
    }
  }
}

function getPoolPda(mintId) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('sts_pool'), mintId],
    STS_PROGRAM_ID
  );
}

function getReceiptMintPda(mintId) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('sts_receipt'), mintId],
    STS_PROGRAM_ID
  );
}

function getAmmPoolPda(mintIdA, mintIdB) {
  // Sort mints for consistent derivation (matches Rust)
  const [first, second] = Buffer.compare(mintIdA, mintIdB) < 0 
    ? [mintIdA, mintIdB]
    : [mintIdB, mintIdA];
  return PublicKey.findProgramAddressSync(
    [Buffer.from('sts_amm'), first, second],
    STS_PROGRAM_ID
  );
}

function getNullifierPda(nullifierHash) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('sts_nullifier'), nullifierHash],
    STS_PROGRAM_ID
  );
}

// ============================================================================
// INSTRUCTION BUILDERS
// ============================================================================

// All STS instructions now use consistent data[2..] offset after bug fix
// The instruction format is [STS_DOMAIN (0x01)][STS_OP][payload]

function buildStsInstruction(opCode, data, accounts) {
  // After the off-by-one bug fix, ALL STS instructions now correctly parse
  // data starting at offset 2 (after the [STS_DOMAIN][STS_OP] prefix).
  // 
  // Data layout: [0x01][opCode][payload...]
  // Rust reads: data[2..] for all instruction fields
  const fullData = Buffer.concat([
    Buffer.from([STS_DOMAIN, opCode]),
    data
  ]);
  
  return new TransactionInstruction({
    keys: accounts,
    programId: STS_PROGRAM_ID,
    data: fullData,
  });
}

function buildPmpInstruction(tag, data, accounts) {
  const fullData = Buffer.concat([
    Buffer.from([tag]),
    data
  ]);
  
  return new TransactionInstruction({
    keys: accounts,
    programId: STS_PROGRAM_ID,
    data: fullData,
  });
}

// ============================================================================
// TEST CONTEXT
// ============================================================================

class TestContext {
  constructor() {
    this.connection = null;
    this.mainWallet = null;
    this.users = {};
    this.mints = {};
    this.tokenAccounts = {};
    this.pools = {};
    this.nfts = {};
    this.commitments = {};
    this.splMints = {};
    this.poolAtas = {};
    this.txHashes = [];
    this.testResults = [];
  }

  async initialize() {
    this.connection = new Connection(DEVNET_RPC, 'confirmed');
    
    // Load main wallet
    const walletPath = '/workspaces/StyxStack/.devnet/test-wallet.json';
    const walletData = fs.readFileSync(walletPath, 'utf8');
    this.mainWallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(walletData)));
    
    console.log(`📋 Main wallet: ${this.mainWallet.publicKey.toBase58()}`);
    
    const balance = await this.connection.getBalance(this.mainWallet.publicKey);
    console.log(`📋 Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    
    return this;
  }

  async createUser(name) {
    const user = Keypair.generate();
    this.users[name] = user;
    
    // Fund the user
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.mainWallet.publicKey,
        toPubkey: user.publicKey,
        lamports: 0.05 * LAMPORTS_PER_SOL,
      })
    );
    
    const sig = await sendAndConfirmTransaction(this.connection, tx, [this.mainWallet]);
    this.txHashes.push({ name: `Fund ${name}`, sig });
    
    console.log(`  👤 Created ${name}: ${user.publicKey.toBase58().slice(0, 12)}...`);
    return user;
  }

  async createSplMint(name, decimals = 9) {
    const mint = await createMint(
      this.connection,
      this.mainWallet,
      this.mainWallet.publicKey,
      null,
      decimals
    );
    
    this.mints[name] = mint;
    console.log(`  🪙 Created ${name} mint: ${mint.toBase58().slice(0, 12)}...`);
    return mint;
  }

  async createTokenAccount(owner, mint, name) {
    const ata = await getAssociatedTokenAddress(mint, owner.publicKey);
    
    try {
      await getAccount(this.connection, ata);
    } catch {
      const ix = createAssociatedTokenAccountInstruction(
        this.mainWallet.publicKey,
        ata,
        owner.publicKey,
        mint
      );
      const tx = new Transaction().add(ix);
      await sendAndConfirmTransaction(this.connection, tx, [this.mainWallet]);
    }
    
    this.tokenAccounts[name] = ata;
    return ata;
  }

  async mintTokens(mint, destination, amount) {
    await mintTo(
      this.connection,
      this.mainWallet,
      mint,
      destination,
      this.mainWallet,
      amount
    );
  }

  recordResult(name, passed, note = '', txSig = null) {
    this.testResults.push({ name, passed, note, txSig });
    if (txSig) {
      this.txHashes.push({ name, sig: txSig });
    }
  }
}

// ============================================================================
// PART 1: STS TOKEN CORE OPERATIONS
// ============================================================================

async function testStsTokenCore(ctx) {
  console.log('\n' + '═'.repeat(70));
  console.log('  PART 1: STS TOKEN CORE OPERATIONS (0x01-0x08)');
  console.log('═'.repeat(70) + '\n');

  // Test 1.1: CREATE_MINT
  console.log('🧪 Test 1.1: STS_OP_CREATE_MINT');
  try {
    // Data layout (after [STS_DOMAIN][STS_OP] prefix):
    // [0..32]   nonce (32 bytes) - Random for mint ID derivation
    // [32..64]  name (32 bytes) - Token name
    // [64..72]  symbol (8 bytes) - Token symbol
    // [72]      decimals (1 byte) - 0-18
    // [73..81]  supply_cap (8 bytes u64 LE) - 0 = unlimited
    // [81]      mint_type (1 byte) - 0=Fungible, 1=NFT, 2=SemiFungible
    // [82]      backing_type (1 byte) - 0=Native, 1=SplBacked, 2=Hybrid
    // [83..115] spl_mint (32 bytes) - If SplBacked, the SPL mint pubkey
    // [115]     privacy_mode (1 byte) - 0=Private, 1=Transparent, 2=Optional
    // [116..120] extension_flags (4 bytes u32 LE) - Extension bitfield
    // Total payload: 120 bytes
    
    const nonce = randomBytes(32);
    const name = Buffer.alloc(32, 0);
    Buffer.from('STS Test Token').copy(name);
    const symbol = Buffer.alloc(8, 0);
    Buffer.from('STSTEST').copy(symbol);
    const decimals = 9;
    const supplyCap = Buffer.alloc(8, 0); // 0 = unlimited
    const mintType = 0; // Fungible
    const backingType = 0; // Native (not SPL-backed)
    const splMint = Buffer.alloc(32, 0); // No SPL mint
    const privacyMode = 0; // Private
    const extensionFlags = Buffer.alloc(4, 0); // No extensions
    
    const data = Buffer.concat([
      nonce,        // 32 bytes
      name,         // 32 bytes
      symbol,       // 8 bytes
      Buffer.from([decimals]), // 1 byte
      supplyCap,    // 8 bytes
      Buffer.from([mintType]), // 1 byte
      Buffer.from([backingType]), // 1 byte
      splMint,      // 32 bytes
      Buffer.from([privacyMode]), // 1 byte
      extensionFlags, // 4 bytes
    ]); // Total: 120 bytes
    
    ctx.mints['sts_token_1'] = nonce; // Store nonce as mint ID reference
    
    const ix = buildStsInstruction(STS_OP_CREATE_MINT, data, [
      { pubkey: ctx.mainWallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]);
    
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(ctx.connection, tx, [ctx.mainWallet]);
    
    console.log(`  📋 Mint nonce: ${nonce.toString('hex').slice(0, 16)}...`);
    console.log(`  📋 TX: ${sig.slice(0, 20)}...`);
    ctx.recordResult('1.1 CREATE_MINT', true, 'STS mint created', sig);
    console.log('  ✅ PASSED\n');
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    ctx.recordResult('1.1 CREATE_MINT', false, e.message.slice(0, 50));
  }

  // Test 1.2: MINT_TO
  console.log('🧪 Test 1.2: STS_OP_MINT_TO');
  try {
    // Data layout (after [STS_DOMAIN][STS_OP] prefix):
    // [0..32]   mint_id (32 bytes)
    // [32..40]  amount (8 bytes u64 LE)
    // [40..72]  recipient_commitment (32 bytes)
    // [72..76]  encrypted_len (4 bytes u32 LE)
    // [76..]    encrypted_note (variable)
    // Total minimum: 76 bytes
    
    const mintId = ctx.mints['sts_token_1'];
    const amount = 1000n * BigInt(1e9);
    const commitment = sha256(Buffer.concat([
      mintId,
      ctx.mainWallet.publicKey.toBuffer(),
      Buffer.from(new BigUint64Array([amount]).buffer),
      randomBytes(32), // blinding factor
    ]));
    
    ctx.commitments['token_1_main'] = commitment;
    
    const amountBuf = Buffer.alloc(8);
    amountBuf.writeBigUInt64LE(amount);
    const encryptedLen = Buffer.alloc(4);
    encryptedLen.writeUInt32LE(0); // No encrypted note for test
    
    const data = Buffer.concat([
      mintId,        // 32 bytes
      amountBuf,     // 8 bytes
      commitment,    // 32 bytes
      encryptedLen,  // 4 bytes
    ]); // Total: 76 bytes
    
    const ix = buildStsInstruction(STS_OP_MINT_TO, data, [
      { pubkey: ctx.mainWallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]);
    
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(ctx.connection, tx, [ctx.mainWallet]);
    
    console.log(`  📋 Commitment: ${commitment.toString('hex').slice(0, 16)}...`);
    console.log(`  📋 Amount: 1000 tokens`);
    console.log(`  📋 TX: ${sig.slice(0, 20)}...`);
    ctx.recordResult('1.2 MINT_TO', true, '1000 tokens minted', sig);
    console.log('  ✅ PASSED\n');
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    ctx.recordResult('1.2 MINT_TO', false, e.message.slice(0, 50));
  }

  // Test 1.3: TRANSFER (private)
  console.log('🧪 Test 1.3: STS_OP_TRANSFER');
  try {
    // Data layout (after [STS_DOMAIN][STS_OP] prefix):
    // [0..32]    mint_id (32 bytes)
    // [32..64]   input_nullifier (32 bytes)
    // [64..96]   output_commitment_1 (32 bytes)
    // [96..128]  output_commitment_2 (32 bytes)
    // [128..136] amount_1 (8 bytes u64 LE)
    // [136..144] amount_2 (8 bytes u64 LE)
    // [144..148] encrypted_len (4 bytes u32 LE)
    // [148..]    encrypted_notes (variable)
    // Total minimum: 148 bytes
    
    const userB = await ctx.createUser('UserB');
    const mintId = ctx.mints['sts_token_1'];
    
    const oldCommitment = ctx.commitments['token_1_main'];
    const nullifier = sha256(Buffer.concat([oldCommitment, randomBytes(32)]));
    
    const amount1 = 500n * BigInt(1e9);
    const amount2 = 500n * BigInt(1e9); // Change back to sender
    
    const newCommitment1 = sha256(Buffer.concat([
      mintId,
      userB.publicKey.toBuffer(),
      Buffer.from(new BigUint64Array([amount1]).buffer),
      randomBytes(32),
    ]));
    
    const newCommitment2 = sha256(Buffer.concat([
      mintId,
      ctx.mainWallet.publicKey.toBuffer(),
      Buffer.from(new BigUint64Array([amount2]).buffer),
      randomBytes(32),
    ]));
    
    const [nullifierPda] = getNullifierPda(nullifier);
    
    const amount1Buf = Buffer.alloc(8);
    amount1Buf.writeBigUInt64LE(amount1);
    const amount2Buf = Buffer.alloc(8);
    amount2Buf.writeBigUInt64LE(amount2);
    const encryptedLen = Buffer.alloc(4);
    encryptedLen.writeUInt32LE(0);
    
    const data = Buffer.concat([
      mintId,           // 32
      nullifier,        // 32
      newCommitment1,   // 32
      newCommitment2,   // 32
      amount1Buf,       // 8
      amount2Buf,       // 8
      encryptedLen,     // 4
    ]); // Total: 148 bytes
    
    const ix = buildStsInstruction(STS_OP_TRANSFER, data, [
      { pubkey: ctx.mainWallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: nullifierPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]);
    
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(ctx.connection, tx, [ctx.mainWallet]);
    
    ctx.commitments['token_1_userB'] = newCommitment1;
    
    console.log(`  📋 Transferred: 500 tokens to UserB (private)`);
    console.log(`  📋 New commitment: ${newCommitment1.toString('hex').slice(0, 16)}...`);
    console.log(`  📋 TX: ${sig.slice(0, 20)}...`);
    ctx.recordResult('1.3 TRANSFER', true, '500 tokens transferred', sig);
    console.log('  ✅ PASSED\n');
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    ctx.recordResult('1.3 TRANSFER', false, e.message.slice(0, 50));
  }

  // Test 1.4: SHIELD (SPL → STS)
  console.log('🧪 Test 1.4: STS_OP_SHIELD');
  try {
    // Data layout (after [STS_DOMAIN][STS_OP] prefix):
    // [0..32]   mint_id (32 bytes)
    // [32..40]  amount (8 bytes u64 LE)
    // [40..72]  recipient_commitment (32 bytes)
    // [72..76]  encrypted_len (4 bytes u32 LE)
    // [76..]    encrypted_note (variable)
    // Total minimum: 76 bytes
    //
    // Accounts (from process_sts_shield):
    // [0] depositor (signer)
    // [1] depositor_token_account
    // [2] pool_token_account (Pool PDA's token account)
    // [3] spl_mint
    // [4] token_program (SPL Token)
    
    // Create a real SPL token for shielding
    const splMint = await ctx.createSplMint('spl_for_shield');
    const mainAta = await ctx.createTokenAccount(ctx.mainWallet, splMint, 'main_spl_ata');
    await ctx.mintTokens(splMint, mainAta, 10000n * BigInt(1e9));
    
    const mintId = sha256(Buffer.concat([Buffer.from('shield_'), splMint.toBuffer()]));
    const [poolPda] = getPoolPda(mintId);
    
    // Create pool token account (ATA for Pool PDA)
    const poolAta = await getAssociatedTokenAddress(splMint, poolPda, true);
    
    // Create the pool ATA before SHIELD (it must exist)
    const createAtaIx = createAssociatedTokenAccountInstruction(
      ctx.mainWallet.publicKey,  // payer
      poolAta,                   // associatedToken
      poolPda,                   // owner
      splMint,                   // mint
    );
    const createAtaTx = new Transaction().add(createAtaIx);
    await sendAndConfirmTransaction(ctx.connection, createAtaTx, [ctx.mainWallet]);
    
    const amount = 100n * BigInt(1e9);
    const commitment = sha256(Buffer.concat([
      mintId,
      ctx.mainWallet.publicKey.toBuffer(),
      Buffer.from(new BigUint64Array([amount]).buffer),
      randomBytes(32),
    ]));
    
    const amountBuf = Buffer.alloc(8);
    amountBuf.writeBigUInt64LE(amount);
    const encryptedLen = Buffer.alloc(4);
    encryptedLen.writeUInt32LE(0);
    
    const data = Buffer.concat([
      mintId,        // 32
      amountBuf,     // 8
      commitment,    // 32
      encryptedLen,  // 4
    ]); // Total: 76 bytes
    
    // Accounts order per Rust:
    // [0] depositor (signer)
    // [1] depositor_token_account
    // [2] pool_token_account (Pool PDA's token account)
    // [3] spl_mint
    // [4] token_program
    const ix = buildStsInstruction(STS_OP_SHIELD, data, [
      { pubkey: ctx.mainWallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: mainAta, isSigner: false, isWritable: true },
      { pubkey: poolAta, isSigner: false, isWritable: true },
      { pubkey: splMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ]);
    
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(ctx.connection, tx, [ctx.mainWallet]);
    
    ctx.commitments['shielded_1'] = commitment;
    ctx.mints['shielded_mint'] = mintId;
    ctx.pools['shield_pool'] = poolPda;
    ctx.splMints['shield_spl'] = splMint;
    ctx.poolAtas['shield_pool_ata'] = poolAta;
    
    console.log(`  📋 Shielded: 100 SPL tokens → private commitment`);
    console.log(`  📋 Pool PDA: ${poolPda.toBase58().slice(0, 12)}...`);
    console.log(`  📋 TX: ${sig.slice(0, 20)}...`);
    ctx.recordResult('1.4 SHIELD', true, '100 tokens shielded', sig);
    console.log('  ✅ PASSED\n');
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    ctx.recordResult('1.4 SHIELD', false, e.message.slice(0, 50));
  }

  // Test 1.5: UNSHIELD (STS → SPL)
  console.log('🧪 Test 1.5: STS_OP_UNSHIELD');
  try {
    // Data layout (after [STS_DOMAIN][STS_OP] prefix):
    // [0..32]    mint_id (32 bytes)
    // [32..64]   nullifier (32 bytes)
    // [64..72]   amount (8 bytes u64 LE)
    // [72..104]  recipient (32 bytes - pubkey)
    // Total: 104 bytes
    //
    // Accounts (from process_sts_unshield):
    // [0] withdrawer (signer)
    // [1] nullifier PDA (derived, writable)
    // [2] recipient_token_account
    // [3] pool_token_account (Pool PDA's token account)
    // [4] pool_pda (authority)
    // [5] spl_mint
    // [6] token_program
    // [7] system_program
    
    // Check if SHIELD succeeded
    if (!ctx.mints['shielded_mint'] || !ctx.splMints['shield_spl']) {
      throw new Error('SHIELD test did not succeed - cannot test UNSHIELD');
    }
    
    const userC = await ctx.createUser('UserC');
    const mintId = ctx.mints['shielded_mint'];
    const commitment = ctx.commitments['shielded_1'];
    const poolPda = ctx.pools['shield_pool'];
    const splMint = ctx.splMints['shield_spl'];
    const poolAta = ctx.poolAtas['shield_pool_ata'];
    
    const nullifier = sha256(Buffer.concat([commitment, randomBytes(32)]));
    const [nullifierPda] = getNullifierPda(nullifier);
    
    const userCAta = await ctx.createTokenAccount(userC, splMint, 'userC_ata');
    
    const amount = 50n * BigInt(1e9);
    const amountBuf = Buffer.alloc(8);
    amountBuf.writeBigUInt64LE(amount);
    
    const data = Buffer.concat([
      mintId,                       // 32
      nullifier,                    // 32
      amountBuf,                    // 8
      userC.publicKey.toBuffer(),   // 32
    ]); // Total: 104 bytes
    
    const ix = buildStsInstruction(STS_OP_UNSHIELD, data, [
      { pubkey: ctx.mainWallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: nullifierPda, isSigner: false, isWritable: true },
      { pubkey: userCAta, isSigner: false, isWritable: true },
      { pubkey: poolAta, isSigner: false, isWritable: true },
      { pubkey: poolPda, isSigner: false, isWritable: true },
      { pubkey: splMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]);
    
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(ctx.connection, tx, [ctx.mainWallet]);
    
    console.log(`  📋 Unshielded: 50 tokens to UserC`);
    console.log(`  📋 Recipient: ${userC.publicKey.toBase58().slice(0, 12)}...`);
    console.log(`  📋 TX: ${sig.slice(0, 20)}...`);
    ctx.recordResult('1.5 UNSHIELD', true, '50 tokens unshielded', sig);
    console.log('  ✅ PASSED\n');
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    ctx.recordResult('1.5 UNSHIELD', false, e.message.slice(0, 50));
  }

  // Test 1.6: BURN
  console.log('🧪 Test 1.6: STS_OP_BURN');
  try {
    // Data layout (after [STS_DOMAIN][STS_OP] prefix):
    // [0..32]   mint_id (32 bytes)
    // [32..64]  nullifier (32 bytes)
    // [64..72]  amount (8 bytes u64 LE)
    // Total: 72 bytes
    
    const mintId = ctx.mints['sts_token_1'];
    const commitment = ctx.commitments['token_1_userB'];
    const nullifier = sha256(Buffer.concat([commitment, randomBytes(32)]));
    const [nullifierPda] = getNullifierPda(nullifier);
    
    const amountBuf = Buffer.alloc(8);
    amountBuf.writeBigUInt64LE(100n * BigInt(1e9));
    
    const data = Buffer.concat([
      mintId,        // 32
      nullifier,     // 32
      amountBuf,     // 8
    ]); // Total: 72 bytes
    
    const ix = buildStsInstruction(STS_OP_BURN, data, [
      { pubkey: ctx.mainWallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: nullifierPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]);
    
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(ctx.connection, tx, [ctx.mainWallet]);
    
    console.log(`  📋 Burned: 100 tokens`);
    console.log(`  📋 TX: ${sig.slice(0, 20)}...`);
    ctx.recordResult('1.6 BURN', true, '100 tokens burned', sig);
    console.log('  ✅ PASSED\n');
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    ctx.recordResult('1.6 BURN', false, e.message.slice(0, 50));
  }

  // Test 1.7: UPDATE_MINT
  console.log('🧪 Test 1.7: STS_OP_UPDATE_MINT');
  try {
    // Data layout (after [STS_DOMAIN][STS_OP] prefix):
    // [0..32]   mint_id (32 bytes)
    // [32..64]  new_authority (32 bytes - pubkey)
    // Total: 64 bytes
    
    const mintId = ctx.mints['sts_token_1'];
    const newAuthority = Keypair.generate();
    
    const data = Buffer.concat([
      mintId,                           // 32
      newAuthority.publicKey.toBuffer() // 32
    ]); // Total: 64 bytes
    
    const ix = buildStsInstruction(STS_OP_UPDATE_MINT, data, [
      { pubkey: ctx.mainWallet.publicKey, isSigner: true, isWritable: true },
    ]);
    
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(ctx.connection, tx, [ctx.mainWallet]);
    
    console.log(`  📋 Updated mint authority`);
    console.log(`  📋 New authority: ${newAuthority.publicKey.toBase58().slice(0, 12)}...`);
    console.log(`  📋 TX: ${sig.slice(0, 20)}...`);
    ctx.recordResult('1.7 UPDATE_MINT', true, 'Authority updated', sig);
    console.log('  ✅ PASSED\n');
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    ctx.recordResult('1.7 UPDATE_MINT', false, e.message.slice(0, 50));
  }

  // Test 1.8: FREEZE_MINT
  console.log('🧪 Test 1.8: STS_OP_FREEZE_MINT');
  try {
    // FREEZE_MINT data layout (after [STS_DOMAIN][STS_OP] prefix):
    // [0..32]  mint_id (32 bytes)
    // Total: 32 bytes
    
    // Create a new mint to freeze (don't freeze main one)
    const freezeNonce = randomBytes(32);
    const freezeMintId = sha256(Buffer.concat([
      freezeNonce,
      ctx.mainWallet.publicKey.toBuffer(),
    ]));
    
    // Create mint first - full 120 byte payload
    const name = Buffer.alloc(32);
    Buffer.from('FreezableToken').copy(name);
    const symbol = Buffer.alloc(8);
    Buffer.from('FRZTOK').copy(symbol);
    const supplyCap = Buffer.alloc(8);
    supplyCap.writeBigUInt64LE(100000n * BigInt(1e9));
    const extensionFlags = Buffer.alloc(4);
    
    const createData = Buffer.concat([
      freezeNonce,                         // 32 - nonce
      name,                                // 32 - name
      symbol,                              // 8 - symbol
      Buffer.from([9]),                    // 1 - decimals
      supplyCap,                           // 8 - supply_cap
      Buffer.from([0]),                    // 1 - mint_type (Standard)
      Buffer.from([0]),                    // 1 - backing_type (None)
      Buffer.alloc(32),                    // 32 - backing_mint (zero)
      Buffer.from([0]),                    // 1 - privacy_mode
      extensionFlags,                      // 4 - extension_flags
    ]); // Total: 120 bytes
    
    const createIx = buildStsInstruction(STS_OP_CREATE_MINT, createData, [
      { pubkey: ctx.mainWallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]);
    
    const freezeData = Buffer.from(freezeMintId); // 32 bytes
    const freezeIx = buildStsInstruction(STS_OP_FREEZE_MINT, freezeData, [
      { pubkey: ctx.mainWallet.publicKey, isSigner: true, isWritable: true },
    ]);
    
    const tx = new Transaction().add(createIx).add(freezeIx);
    const sig = await sendAndConfirmTransaction(ctx.connection, tx, [ctx.mainWallet]);
    
    console.log(`  📋 Froze mint: ${freezeMintId.toString('hex').slice(0, 16)}...`);
    console.log(`  📋 TX: ${sig.slice(0, 20)}...`);
    ctx.recordResult('1.8 FREEZE_MINT', true, 'Mint frozen permanently', sig);
    console.log('  ✅ PASSED\n');
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    ctx.recordResult('1.8 FREEZE_MINT', false, e.message.slice(0, 50));
  }
}

// ============================================================================
// PART 2: STS TOKEN ADVANCED OPERATIONS
// ============================================================================

async function testStsAdvanced(ctx) {
  console.log('\n' + '═'.repeat(70));
  console.log('  PART 2: STS ADVANCED OPERATIONS (0x09-0x13)');
  console.log('═'.repeat(70) + '\n');

  // Test 2.1: CREATE_RULESET
  console.log('🧪 Test 2.1: STS_OP_CREATE_RULESET');
  try {
    // Data layout (after [STS_DOMAIN][STS_OP] prefix):
    // [0..32]   mint_id (32 bytes)
    // [32]      version (1 byte)
    // [33..65]  rules_authority (32 bytes)
    // [65]      rules_len (1 byte)
    // [66..]    rules_data (variable)
    // Total minimum: 66 bytes
    
    const mintId = ctx.mints['sts_token_1'];
    const rulesAuthority = ctx.mainWallet.publicKey;
    const version = 1;
    const rulesData = Buffer.from([1, 1, 0]); // flags: allowlist, timelock, no blocklist
    
    const data = Buffer.concat([
      mintId,                       // 32
      Buffer.from([version]),       // 1
      rulesAuthority.toBuffer(),    // 32
      Buffer.from([rulesData.length]), // 1
      rulesData,                    // 3
    ]); // Total: 69 bytes
    
    const ix = buildStsInstruction(STS_OP_CREATE_RULESET, data, [
      { pubkey: ctx.mainWallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]);
    
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(ctx.connection, tx, [ctx.mainWallet]);
    
    console.log(`  📋 Ruleset created for mint: ${mintId.toString('hex').slice(0, 16)}...`);
    console.log(`  📋 Rules authority: ${rulesAuthority.toBase58().slice(0, 12)}...`);
    console.log(`  📋 TX: ${sig.slice(0, 20)}...`);
    ctx.recordResult('2.1 CREATE_RULESET', true, 'Ruleset created', sig);
    console.log('  ✅ PASSED\n');
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    ctx.recordResult('2.1 CREATE_RULESET', false, e.message.slice(0, 50));
  }

  // Test 2.2: REVEAL_TO_AUDITOR
  console.log('🧪 Test 2.2: STS_OP_REVEAL_TO_AUDITOR');
  try {
    // Data layout (after [STS_DOMAIN][STS_OP] prefix):
    // [0..32]   mint_id (32 bytes)
    // [32..64]  note_commitment (32 bytes)
    // [64..96]  auditor (32 bytes - pubkey)
    // [96]      reveal_len (1 byte)
    // [97..]    encrypted_reveal (variable)
    // Total minimum: 97 bytes
    
    const auditor = await ctx.createUser('Auditor');
    const mintId = ctx.mints['sts_token_1'];
    const commitment = ctx.commitments['token_1_main'] || randomBytes(32);
    
    // Encrypted reveal data (could be amount, owner info, etc.)
    const encryptedReveal = randomBytes(64);
    
    const data = Buffer.concat([
      mintId,                             // 32
      commitment,                         // 32
      auditor.publicKey.toBuffer(),       // 32
      Buffer.from([encryptedReveal.length]), // 1
      encryptedReveal,                    // 64
    ]); // Total: 161 bytes
    
    const ix = buildStsInstruction(STS_OP_REVEAL_TO_AUDITOR, data, [
      { pubkey: ctx.mainWallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: auditor.publicKey, isSigner: false, isWritable: false },
    ]);
    
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(ctx.connection, tx, [ctx.mainWallet]);
    
    console.log(`  📋 Revealed to auditor: ${auditor.publicKey.toBase58().slice(0, 12)}...`);
    console.log(`  📋 Commitment: ${commitment.toString('hex').slice(0, 16)}...`);
    console.log(`  📋 TX: ${sig.slice(0, 20)}...`);
    ctx.recordResult('2.2 REVEAL_TO_AUDITOR', true, 'Balance revealed', sig);
    console.log('  ✅ PASSED\n');
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    ctx.recordResult('2.2 REVEAL_TO_AUDITOR', false, e.message.slice(0, 50));
  }

  // Test 2.3: ATTACH_POI
  console.log('🧪 Test 2.3: STS_OP_ATTACH_POI');
  try {
    // Data layout (after [STS_DOMAIN][STS_OP] prefix):
    // [0..32]   mint_id (32 bytes)
    // [32..64]  note_commitment (32 bytes)
    // [64..96]  proof_hash (32 bytes)
    // Total: 96 bytes
    
    const mintId = ctx.mints['sts_token_1'];
    const commitment = ctx.commitments['token_1_main'] || randomBytes(32);
    const proofHash = sha256(randomBytes(128)); // Hash of POI proof
    
    const data = Buffer.concat([
      mintId,       // 32
      commitment,   // 32
      proofHash,    // 32
    ]); // Total: 96 bytes
    
    const ix = buildStsInstruction(STS_OP_ATTACH_POI, data, [
      { pubkey: ctx.mainWallet.publicKey, isSigner: true, isWritable: true },
    ]);
    
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(ctx.connection, tx, [ctx.mainWallet]);
    
    console.log(`  📋 POI attached to commitment`);
    console.log(`  📋 Proof hash: ${proofHash.toString('hex').slice(0, 16)}...`);
    console.log(`  📋 TX: ${sig.slice(0, 20)}...`);
    ctx.recordResult('2.3 ATTACH_POI', true, 'POI attached', sig);
    console.log('  ✅ PASSED\n');
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    ctx.recordResult('2.3 ATTACH_POI', false, e.message.slice(0, 50));
  }

  // Test 2.4: BATCH_TRANSFER
  console.log('🧪 Test 2.4: STS_OP_BATCH_TRANSFER');
  try {
    // Data layout (after [STS_DOMAIN][STS_OP] prefix):
    // [0..32]   mint_id (32 bytes)
    // [32]      batch_count (1 byte)
    // [33..]    batch_data (variable - commitments + amounts)
    // Total minimum: 33 bytes
    
    const mintId = ctx.mints['sts_token_1'];
    const batchCount = 3;
    
    // Create batch data - 3 recipients with commitments and amounts
    const batchData = [];
    for (let i = 0; i < batchCount; i++) {
      const r = Keypair.generate();
      const commitment = sha256(Buffer.concat([
        mintId,
        r.publicKey.toBuffer(),
        Buffer.from(new BigUint64Array([50n * BigInt(1e9)]).buffer),
        randomBytes(32),
      ]));
      const amountBuf = Buffer.alloc(8);
      amountBuf.writeBigUInt64LE(50n * BigInt(1e9));
      batchData.push(Buffer.concat([commitment, amountBuf])); // 40 bytes each
    }
    
    const data = Buffer.concat([
      mintId,                          // 32
      Buffer.from([batchCount]),       // 1
      ...batchData,                    // 120 (3 * 40)
    ]); // Total: 153 bytes
    
    const ix = buildStsInstruction(STS_OP_BATCH_TRANSFER, data, [
      { pubkey: ctx.mainWallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]);
    
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(ctx.connection, tx, [ctx.mainWallet]);
    
    console.log(`  📋 Batch transfer: ${batchCount} recipients, 50 tokens each`);
    console.log(`  📋 TX: ${sig.slice(0, 20)}...`);
    ctx.recordResult('2.4 BATCH_TRANSFER', true, `${batchCount} transfers batched`, sig);
    console.log('  ✅ PASSED\n');
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    ctx.recordResult('2.4 BATCH_TRANSFER', false, e.message.slice(0, 50));
  }

  // Test 2.5: DECOY_STORM
  console.log('🧪 Test 2.5: STS_OP_DECOY_STORM');
  try {
    // Data layout (after [STS_DOMAIN][STS_OP] prefix):
    // [0..32]   mint_id (32 bytes)
    // [32]      decoy_count (1 byte)
    // [33..]    decoy_commitments (variable - 32 bytes each)
    // Total minimum: 33 bytes
    
    const mintId = ctx.mints['sts_token_1'];
    const decoyCount = 5;
    
    // Generate decoy commitments
    const decoys = [];
    for (let i = 0; i < decoyCount; i++) {
      decoys.push(sha256(randomBytes(64)));
    }
    
    const data = Buffer.concat([
      mintId,                      // 32
      Buffer.from([decoyCount]),   // 1
      ...decoys,                   // 160 (5 * 32)
    ]); // Total: 193 bytes
    
    const ix = buildStsInstruction(STS_OP_DECOY_STORM, data, [
      { pubkey: ctx.mainWallet.publicKey, isSigner: true, isWritable: true },
    ]);
    
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(ctx.connection, tx, [ctx.mainWallet]);
    
    console.log(`  📋 Decoy storm: ${decoyCount} decoy commitments created`);
    console.log(`  📋 TX: ${sig.slice(0, 20)}...`);
    ctx.recordResult('2.5 DECOY_STORM', true, `${decoyCount} decoys created`, sig);
    console.log('  ✅ PASSED\n');
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    ctx.recordResult('2.5 DECOY_STORM', false, e.message.slice(0, 50));
  }

  // Test 2.6: CHRONO_VAULT
  console.log('🧪 Test 2.6: STS_OP_CHRONO_VAULT');
  try {
    // Data layout (after [STS_DOMAIN][STS_OP] prefix):
    // [0..32]   mint_id (32 bytes)
    // [32..64]  commitment (32 bytes)
    // [64..72]  unlock_slot (8 bytes u64 LE)
    // [72..]    encrypted_vault_data (variable)
    // Total minimum: 72 bytes
    
    const mintId = ctx.mints['sts_token_1'];
    const commitment = sha256(Buffer.concat([mintId, randomBytes(32)]));
    
    // Use slot number instead of timestamp (Solana uses slots)
    const currentSlot = await ctx.connection.getSlot();
    const unlockSlot = BigInt(currentSlot + 216000); // ~24 hours at 400ms/slot
    
    const unlockSlotBuf = Buffer.alloc(8);
    unlockSlotBuf.writeBigUInt64LE(unlockSlot);
    
    const data = Buffer.concat([
      mintId,         // 32
      commitment,     // 32
      unlockSlotBuf,  // 8
    ]); // Total: 72 bytes
    
    const ix = buildStsInstruction(STS_OP_CHRONO_VAULT, data, [
      { pubkey: ctx.mainWallet.publicKey, isSigner: true, isWritable: true },
    ]);
    
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(ctx.connection, tx, [ctx.mainWallet]);
    
    console.log(`  📋 ChronoVault: locked until slot ${unlockSlot}`);
    console.log(`  📋 TX: ${sig.slice(0, 20)}...`);
    ctx.recordResult('2.6 CHRONO_VAULT', true, 'Tokens timelocked', sig);
    console.log('  ✅ PASSED\n');
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    ctx.recordResult('2.6 CHRONO_VAULT', false, e.message.slice(0, 50));
  }
}

// ============================================================================
// PART 3: STS NFT OPERATIONS
// ============================================================================

async function testStsNft(ctx) {
  console.log('\n' + '═'.repeat(70));
  console.log('  PART 3: STS NFT OPERATIONS (0x11-0x13)');
  console.log('═'.repeat(70) + '\n');

  // Test 3.1: CREATE_NFT
  console.log('🧪 Test 3.1: STS_OP_CREATE_NFT');
  try {
    // Data layout (after [STS_DOMAIN][STS_OP] prefix):
    // [0..32]       nonce (32 bytes)
    // [32..64]      name (32 bytes)
    // [64..72]      symbol (8 bytes)
    // [72..74]      uri_len (2 bytes u16 LE)
    // [74..74+uri]  uri (variable)
    // Then after uri:
    // [+0..32]      recipient_commitment (32 bytes)
    // [+32..64]     collection_id (32 bytes)
    // [+64]         privacy_mode (1 byte)
    // [+65..69]     extension_flags (4 bytes u32 LE)
    // Total minimum: 74 + uri_len + 69 bytes
    
    const nonce = randomBytes(32);
    const name = Buffer.alloc(32);
    Buffer.from('PrivacyNFT #1').copy(name);
    const symbol = Buffer.alloc(8);
    Buffer.from('PNFT').copy(symbol);
    
    const metadataUri = 'https://arweave.net/example-nft';
    const uriBuf = Buffer.from(metadataUri);
    const uriLen = Buffer.alloc(2);
    uriLen.writeUInt16LE(uriBuf.length);
    
    const recipientCommitment = sha256(Buffer.concat([
      nonce,
      ctx.mainWallet.publicKey.toBuffer(),
      randomBytes(32),
    ]));
    const collectionId = Buffer.alloc(32); // No collection
    const privacyMode = 0; // Public metadata
    const extensionFlags = Buffer.alloc(4);
    
    const data = Buffer.concat([
      nonce,                  // 32
      name,                   // 32
      symbol,                 // 8
      uriLen,                 // 2
      uriBuf,                 // variable
      recipientCommitment,    // 32
      collectionId,           // 32
      Buffer.from([privacyMode]), // 1
      extensionFlags,         // 4
    ]);
    
    const ix = buildStsInstruction(STS_OP_CREATE_NFT, data, [
      { pubkey: ctx.mainWallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]);
    
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(ctx.connection, tx, [ctx.mainWallet]);
    
    // Derive NFT ID the same way Rust does (for storage)
    const nftId = sha256(Buffer.concat([
      Buffer.from('STS_NFT_V1'),
      ctx.mainWallet.publicKey.toBuffer(),
      nonce,
    ]));
    ctx.nfts['nft_1'] = { id: nftId, nonce, owner: ctx.mainWallet.publicKey, commitment: recipientCommitment };
    
    console.log(`  📋 NFT Name: PrivacyNFT #1`);
    console.log(`  📋 Metadata: ${metadataUri.slice(0, 30)}...`);
    console.log(`  📋 TX: ${sig.slice(0, 20)}...`);
    ctx.recordResult('3.1 CREATE_NFT', true, 'Privacy NFT created', sig);
    console.log('  ✅ PASSED\n');
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    ctx.recordResult('3.1 CREATE_NFT', false, e.message.slice(0, 50));
  }

  // Test 3.2: TRANSFER_NFT
  console.log('🧪 Test 3.2: STS_OP_TRANSFER_NFT');
  try {
    // Data layout (after [STS_DOMAIN][STS_OP] prefix):
    // [0..32]    nft_mint_id (32 bytes)
    // [32..64]   input_nullifier (32 bytes)
    // [64..96]   new_commitment (32 bytes)
    // [96..100]  encrypted_len (4 bytes u32 LE)
    // [100..]    encrypted_data (variable)
    // Total minimum: 100 bytes
    
    const userD = await ctx.createUser('UserD');
    
    // Use stored nft_1 or create a fresh nonce for NFT ID
    let nftId;
    if (ctx.nfts['nft_1']?.id) {
      nftId = ctx.nfts['nft_1'].id;
    } else {
      nftId = randomBytes(32);
      ctx.nfts['nft_1'] = { id: nftId, owner: ctx.mainWallet.publicKey };
    }
    
    const newOwnerCommitment = sha256(Buffer.concat([
      nftId,
      userD.publicKey.toBuffer(),
      randomBytes(32), // blinding
    ]));
    
    const nullifier = sha256(Buffer.concat([nftId, randomBytes(32)]));
    const [nullifierPda] = getNullifierPda(nullifier);
    
    const encryptedLen = Buffer.alloc(4);
    encryptedLen.writeUInt32LE(0);
    
    const data = Buffer.concat([
      nftId,              // 32
      nullifier,          // 32
      newOwnerCommitment, // 32
      encryptedLen,       // 4
    ]); // Total: 100 bytes
    
    const ix = buildStsInstruction(STS_OP_TRANSFER_NFT, data, [
      { pubkey: ctx.mainWallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: nullifierPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]);
    
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(ctx.connection, tx, [ctx.mainWallet]);
    
    ctx.nfts['nft_1'].owner = userD.publicKey;
    ctx.nfts['nft_1'].commitment = newOwnerCommitment;
    
    console.log(`  📋 NFT transferred to UserD (privately)`);
    console.log(`  📋 New owner commitment: ${newOwnerCommitment.toString('hex').slice(0, 16)}...`);
    console.log(`  📋 TX: ${sig.slice(0, 20)}...`);
    ctx.recordResult('3.2 TRANSFER_NFT', true, 'NFT transferred privately', sig);
    console.log('  ✅ PASSED\n');
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    ctx.recordResult('3.2 TRANSFER_NFT', false, e.message.slice(0, 50));
  }

  // Test 3.3: REVEAL_NFT
  console.log('🧪 Test 3.3: STS_OP_REVEAL_NFT');
  try {
    // Data layout (after [STS_DOMAIN][STS_OP] prefix):
    // [0..32]   nft_mint_id (32 bytes)
    // [32..64]  commitment (32 bytes)
    // [64..96]  reveal_proof (32 bytes)
    // Total: 96 bytes
    
    const nftId = ctx.nfts['nft_1']?.id || randomBytes(32);
    const commitment = ctx.nfts['nft_1']?.commitment || sha256(Buffer.concat([nftId, randomBytes(32)]));
    const revealProof = sha256(Buffer.concat([
      nftId,
      commitment,
      ctx.mainWallet.publicKey.toBuffer(),
    ]));
    
    const data = Buffer.concat([
      nftId,        // 32
      commitment,   // 32
      revealProof,  // 32
    ]); // Total: 96 bytes
    
    const ix = buildStsInstruction(STS_OP_REVEAL_NFT, data, [
      { pubkey: ctx.mainWallet.publicKey, isSigner: true, isWritable: true },
    ]);
    
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(ctx.connection, tx, [ctx.mainWallet]);
    
    console.log(`  📋 NFT ownership revealed`);
    console.log(`  📋 Proof hash: ${revealProof.toString('hex').slice(0, 16)}...`);
    console.log(`  📋 TX: ${sig.slice(0, 20)}...`);
    ctx.recordResult('3.3 REVEAL_NFT', true, 'Ownership revealed', sig);
    console.log('  ✅ PASSED\n');
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    ctx.recordResult('3.3 REVEAL_NFT', false, e.message.slice(0, 50));
  }
}

// ============================================================================
// PART 4: STS v5.0 POOL OPERATIONS
// ============================================================================

async function testStsPoolOps(ctx) {
  console.log('\n' + '═'.repeat(70));
  console.log('  PART 4: STS v5.0 POOL OPERATIONS (0x14-0x18)');
  console.log('═'.repeat(70) + '\n');

  // Test 4.1: CREATE_POOL
  console.log('🧪 Test 4.1: STS_OP_CREATE_POOL');
  try {
    // Data layout (after [STS_DOMAIN][STS_OP] prefix):
    // [0..32]  mint_id (32 bytes)
    // Total: 32 bytes
    
    const splMint = await ctx.createSplMint('pool_spl');
    const mintId = sha256(Buffer.concat([Buffer.from('pool_'), splMint.toBuffer()]));
    const [poolPda] = getPoolPda(mintId);
    
    // Derive pool token account PDA
    const [poolTokenAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('sts_pool'), mintId, Buffer.from('token')],
      STS_PROGRAM_ID
    );
    
    const data = Buffer.from(mintId); // 32 bytes
    
    const ix = buildStsInstruction(STS_OP_CREATE_POOL, data, [
      { pubkey: ctx.mainWallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: poolPda, isSigner: false, isWritable: true },
      { pubkey: poolTokenAccountPda, isSigner: false, isWritable: true },
      { pubkey: splMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]);
    
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(ctx.connection, tx, [ctx.mainWallet]);
    
    ctx.pools['main_pool'] = { pda: poolPda, splMint, mintId };
    
    console.log(`  📋 Pool PDA: ${poolPda.toBase58().slice(0, 12)}...`);
    console.log(`  📋 SPL backing: ${splMint.toBase58().slice(0, 12)}...`);
    console.log(`  📋 TX: ${sig.slice(0, 20)}...`);
    ctx.recordResult('4.1 CREATE_POOL', true, 'Pool PDA created', sig);
    console.log('  ✅ PASSED\n');
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    ctx.recordResult('4.1 CREATE_POOL', false, e.message.slice(0, 50));
  }

  // Test 4.2: CREATE_RECEIPT_MINT
  console.log('🧪 Test 4.2: STS_OP_CREATE_RECEIPT_MINT');
  try {
    // Data layout (after [STS_DOMAIN][STS_OP] prefix):
    // [0..32]  mint_id (32 bytes)
    // [32]     decimals (1 byte)
    // Total: 33 bytes
    
    const pool = ctx.pools['main_pool'];
    if (!pool) throw new Error('Pool not created');
    
    const [receiptMintPda] = getReceiptMintPda(pool.mintId);
    const decimals = 9;
    
    const data = Buffer.concat([
      pool.mintId,           // 32
      Buffer.from([decimals]) // 1
    ]); // Total: 33 bytes
    
    const ix = buildStsInstruction(STS_OP_CREATE_RECEIPT_MINT, data, [
      { pubkey: ctx.mainWallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: receiptMintPda, isSigner: false, isWritable: true },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]);
    
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(ctx.connection, tx, [ctx.mainWallet]);
    
    ctx.mints['receipt_mint'] = receiptMintPda;
    
    console.log(`  📋 Receipt Mint: ${receiptMintPda.toBase58().slice(0, 12)}...`);
    console.log(`  📋 Token-2022 for DEX trading`);
    console.log(`  📋 TX: ${sig.slice(0, 20)}...`);
    ctx.recordResult('4.2 CREATE_RECEIPT_MINT', true, 'Token-2022 receipt', sig);
    console.log('  ✅ PASSED\n');
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    ctx.recordResult('4.2 CREATE_RECEIPT_MINT', false, e.message.slice(0, 50));
  }

  // Test 4.3: CREATE_AMM_POOL
  console.log('🧪 Test 4.3: STS_OP_CREATE_AMM_POOL');
  try {
    // Data layout (after [STS_DOMAIN][STS_OP] prefix):
    // [0..32]   mint_a (32 bytes)
    // [32..64]  mint_b (32 bytes)
    // [64..66]  fee_bps (2 bytes u16 LE)
    // Total: 66 bytes
    
    const mintIdA = ctx.pools['main_pool']?.mintId || randomBytes(32);
    const mintIdB = randomBytes(32);
    
    const [ammPoolPda] = getAmmPoolPda(mintIdA, mintIdB);
    
    const feeBps = Buffer.alloc(2);
    feeBps.writeUInt16LE(30); // 0.3% fee
    
    const data = Buffer.concat([
      mintIdA,   // 32
      mintIdB,   // 32
      feeBps,    // 2
    ]); // Total: 66 bytes
    
    const ix = buildStsInstruction(STS_OP_CREATE_AMM_POOL, data, [
      { pubkey: ctx.mainWallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: ammPoolPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]);
    
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(ctx.connection, tx, [ctx.mainWallet]);
    
    ctx.pools['amm_pool'] = { pda: ammPoolPda, mintA: mintIdA, mintB: mintIdB };
    
    console.log(`  📋 AMM Pool: ${ammPoolPda.toBase58().slice(0, 12)}...`);
    console.log(`  📋 Pair: MintA ↔ MintB`);
    console.log(`  📋 Fee: 0.3%`);
    console.log(`  📋 TX: ${sig.slice(0, 20)}...`);
    ctx.recordResult('4.3 CREATE_AMM_POOL', true, 'AMM pool created', sig);
    console.log('  ✅ PASSED\n');
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    ctx.recordResult('4.3 CREATE_AMM_POOL', false, e.message.slice(0, 50));
  }

  // Test 4.4: STEALTH_UNSHIELD
  console.log('🧪 Test 4.4: STS_OP_STEALTH_UNSHIELD');
  try {
    // Data layout (after [STS_DOMAIN][STS_OP] prefix):
    // [0..32]    mint_id (32 bytes)
    // [32..64]   nullifier (32 bytes)
    // [64..72]   amount (8 bytes u64 LE)
    // [72..104]  ephemeral_pubkey (32 bytes)
    // [104..136] recipient_scan_key (32 bytes)
    // Total: 136 bytes
    
    const pool = ctx.pools['main_pool'];
    if (!pool) throw new Error('Pool not created');
    
    // Create stealth address (one-time)
    const stealthKeypair = Keypair.generate();
    const ephemeralPubkey = Keypair.generate().publicKey;
    const recipientScanKey = Keypair.generate().publicKey;
    
    // Fund stealth address for rent
    const fundTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: ctx.mainWallet.publicKey,
        toPubkey: stealthKeypair.publicKey,
        lamports: 0.01 * LAMPORTS_PER_SOL,
      })
    );
    await sendAndConfirmTransaction(ctx.connection, fundTx, [ctx.mainWallet]);
    
    const stealthAta = await ctx.createTokenAccount(stealthKeypair, pool.splMint, 'stealth_ata');
    
    const nullifier = sha256(randomBytes(64));
    const [nullifierPda] = getNullifierPda(nullifier);
    
    // Derive pool token account
    const [poolTokenAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('sts_pool'), pool.mintId, Buffer.from('token')],
      STS_PROGRAM_ID
    );
    
    const amount = 25n * BigInt(1e9);
    const amountBuf = Buffer.alloc(8);
    amountBuf.writeBigUInt64LE(amount);
    
    const data = Buffer.concat([
      pool.mintId,                    // 32
      nullifier,                      // 32
      amountBuf,                      // 8
      ephemeralPubkey.toBuffer(),     // 32
      recipientScanKey.toBuffer(),    // 32
    ]); // Total: 136 bytes
    
    const ix = buildStsInstruction(STS_OP_STEALTH_UNSHIELD, data, [
      { pubkey: ctx.mainWallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: nullifierPda, isSigner: false, isWritable: true },
      { pubkey: pool.pda, isSigner: false, isWritable: true },
      { pubkey: poolTokenAccountPda, isSigner: false, isWritable: true },
      { pubkey: stealthAta, isSigner: false, isWritable: true },
      { pubkey: pool.splMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]);
    
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(ctx.connection, tx, [ctx.mainWallet]);
    
    console.log(`  📋 Stealth address: ${stealthKeypair.publicKey.toBase58().slice(0, 12)}...`);
    console.log(`  📋 Ephemeral pubkey: ${ephemeralPubkey.toBase58().slice(0, 12)}...`);
    console.log(`  📋 Amount: 25 tokens`);
    console.log(`  📋 TX: ${sig.slice(0, 20)}...`);
    ctx.recordResult('4.4 STEALTH_UNSHIELD', true, 'Stealth withdrawal', sig);
    console.log('  ✅ PASSED\n');
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    ctx.recordResult('4.4 STEALTH_UNSHIELD', false, e.message.slice(0, 50));
  }

  // Test 4.5: PRIVATE_SWAP
  console.log('🧪 Test 4.5: STS_OP_PRIVATE_SWAP');
  try {
    // Data layout (after [STS_DOMAIN][STS_OP] prefix):
    // [0..32]     pool_id (32 bytes)
    // [32..64]    input_mint (32 bytes)
    // [64..96]    input_nullifier (32 bytes)
    // [96..104]   input_amount (8 bytes u64 LE)
    // [104..136]  output_commitment (32 bytes)
    // [136..144]  min_output (8 bytes u64 LE)
    // [144..148]  encrypted_len (4 bytes u32 LE)
    // [148..]     encrypted_note (variable)
    // Total minimum: 148 bytes
    
    const ammPool = ctx.pools['amm_pool'];
    if (!ammPool) throw new Error('AMM pool not created');
    
    const inputNullifier = sha256(randomBytes(64));
    const outputCommitment = sha256(randomBytes(64));
    const [nullifierPda] = getNullifierPda(inputNullifier);
    
    const inputAmount = 10n * BigInt(1e9);
    const minOutput = 1n * BigInt(1e9);
    
    const inputAmountBuf = Buffer.alloc(8);
    inputAmountBuf.writeBigUInt64LE(inputAmount);
    const minOutputBuf = Buffer.alloc(8);
    minOutputBuf.writeBigUInt64LE(minOutput);
    const encryptedLen = Buffer.alloc(4);
    encryptedLen.writeUInt32LE(0);
    
    const data = Buffer.concat([
      ammPool.pda.toBuffer(),   // 32 - pool_id
      ammPool.mintA,            // 32 - input_mint
      inputNullifier,           // 32 - input_nullifier
      inputAmountBuf,           // 8 - input_amount
      outputCommitment,         // 32 - output_commitment
      minOutputBuf,             // 8 - min_output
      encryptedLen,             // 4 - encrypted_len
    ]); // Total: 148 bytes
    
    const ix = buildStsInstruction(STS_OP_PRIVATE_SWAP, data, [
      { pubkey: ctx.mainWallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: ammPool.pda, isSigner: false, isWritable: true },
      { pubkey: nullifierPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]);
    
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(ctx.connection, tx, [ctx.mainWallet]);
    
    console.log(`  📋 Swap: MintA → MintB (private)`);
    console.log(`  📋 Input: 10 tokens`);
    console.log(`  📋 TX: ${sig.slice(0, 20)}...`);
    ctx.recordResult('4.5 PRIVATE_SWAP', true, 'Private swap executed', sig);
    console.log('  ✅ PASSED\n');
  } catch (e) {
    console.log(`  ❌ FAILED: ${e.message}\n`);
    ctx.recordResult('4.5 PRIVATE_SWAP', false, e.message.slice(0, 50));
  }
}

// ============================================================================
// PART 5: PMP INSCRIPTION TAGS (3-64)
// ============================================================================

async function testPmpInscriptions(ctx) {
  console.log('\n' + '═'.repeat(70));
  console.log('  PART 5: PMP INSCRIPTION TAGS (3-64)');
  console.log('═'.repeat(70) + '\n');

  const tagTests = [
    // Core Messaging (3-8)
    { tag: TAG_PRIVATE_MESSAGE, name: 'PRIVATE_MESSAGE', data: () => Buffer.concat([randomBytes(32), Buffer.from('Hello encrypted world!')])},
    { tag: TAG_GROUP_INVITE, name: 'GROUP_INVITE', data: () => Buffer.concat([randomBytes(32), randomBytes(32), Buffer.from([5])])},
    { tag: TAG_KEY_ROTATION, name: 'KEY_ROTATION', data: () => Buffer.concat([randomBytes(32), randomBytes(32)])},
    { tag: TAG_SESSION_INIT, name: 'SESSION_INIT', data: () => Buffer.concat([randomBytes(32), randomBytes(64)])},
    { tag: TAG_MESSAGE_ACK, name: 'MESSAGE_ACK', data: () => randomBytes(32)},
    
    // Governance (9-13)
    { tag: TAG_PROPOSAL_CREATE, name: 'PROPOSAL_CREATE', data: () => Buffer.concat([randomBytes(32), Buffer.from('Test proposal')])},
    { tag: TAG_PROPOSAL_VOTE, name: 'PROPOSAL_VOTE', data: () => Buffer.concat([randomBytes(32), Buffer.from([1])])},
    { tag: TAG_PROPOSAL_EXECUTE, name: 'PROPOSAL_EXECUTE', data: () => randomBytes(32)},
    { tag: TAG_VSL_CREATE, name: 'VSL_CREATE', data: () => Buffer.concat([randomBytes(32), Buffer.from([1, 0, 0, 0])])},
    { tag: TAG_VSL_UPDATE, name: 'VSL_UPDATE', data: () => Buffer.concat([randomBytes(32), randomBytes(32)])},
    
    // Inscribed Primitives (14-22)
    { tag: TAG_INSCRIBED_MINT, name: 'INSCRIBED_MINT', data: () => Buffer.concat([randomBytes(32), Buffer.from([9]), Buffer.from(new BigUint64Array([1000n]).buffer)])},
    { tag: TAG_INSCRIBED_TRANSFER, name: 'INSCRIBED_TRANSFER', data: () => Buffer.concat([randomBytes(32), randomBytes(32), Buffer.from(new BigUint64Array([100n]).buffer)])},
    { tag: TAG_INSCRIBED_BURN, name: 'INSCRIBED_BURN', data: () => Buffer.concat([randomBytes(32), Buffer.from(new BigUint64Array([50n]).buffer)])},
    { tag: TAG_INSCRIBED_FREEZE, name: 'INSCRIBED_FREEZE', data: () => randomBytes(32)},
    { tag: TAG_INSCRIBED_THAW, name: 'INSCRIBED_THAW', data: () => randomBytes(32)},
    { tag: TAG_INSCRIBED_DELEGATE, name: 'INSCRIBED_DELEGATE', data: () => Buffer.concat([randomBytes(32), randomBytes(32)])},
    { tag: TAG_INSCRIBED_REVOKE, name: 'INSCRIBED_REVOKE', data: () => randomBytes(32)},
    { tag: TAG_INSCRIBED_CLOSE, name: 'INSCRIBED_CLOSE', data: () => randomBytes(32)},
    { tag: TAG_INSCRIBED_METADATA, name: 'INSCRIBED_METADATA', data: () => Buffer.concat([randomBytes(32), Buffer.from('{"name":"Test"}')])},
    
    // VTA Advanced (23-31)
    { tag: TAG_VTA_STEALTH, name: 'VTA_STEALTH', data: () => Buffer.concat([randomBytes(32), randomBytes(33)])},
    { tag: TAG_VTA_SPLIT, name: 'VTA_SPLIT', data: () => Buffer.concat([randomBytes(32), Buffer.from([3]), randomBytes(96)])},
    { tag: TAG_VTA_MERGE, name: 'VTA_MERGE', data: () => Buffer.concat([Buffer.from([2]), randomBytes(64)])},
    { tag: TAG_VTA_TIMELOCK, name: 'VTA_TIMELOCK', data: () => Buffer.concat([randomBytes(32), Buffer.from(new BigUint64Array([BigInt(Date.now() / 1000 + 3600)]).buffer)])},
    { tag: TAG_VTA_VELOCITY, name: 'VTA_VELOCITY', data: () => Buffer.concat([randomBytes(32), Buffer.from(new BigUint64Array([1000n]).buffer)])},
    { tag: TAG_VTA_ALLOWLIST, name: 'VTA_ALLOWLIST', data: () => Buffer.concat([randomBytes(32), Buffer.from([2]), randomBytes(64)])},
    { tag: TAG_VTA_BLOCKLIST, name: 'VTA_BLOCKLIST', data: () => Buffer.concat([randomBytes(32), Buffer.from([1]), randomBytes(32)])},
    { tag: TAG_VTA_RECOVERY, name: 'VTA_RECOVERY', data: () => Buffer.concat([randomBytes(32), randomBytes(32)])},
    { tag: TAG_VTA_MULTISIG, name: 'VTA_MULTISIG', data: () => Buffer.concat([Buffer.from([2, 3]), randomBytes(96)])},
    
    // VSL Extended (32-43)
    { tag: TAG_VSL_DEPOSIT, name: 'VSL_DEPOSIT', data: () => Buffer.concat([randomBytes(32), Buffer.from(new BigUint64Array([100n]).buffer)])},
    { tag: TAG_VSL_WITHDRAW, name: 'VSL_WITHDRAW', data: () => Buffer.concat([randomBytes(32), Buffer.from(new BigUint64Array([50n]).buffer)])},
    { tag: TAG_VSL_STAKE, name: 'VSL_STAKE', data: () => Buffer.concat([randomBytes(32), Buffer.from(new BigUint64Array([1000n]).buffer)])},
    { tag: TAG_VSL_UNSTAKE, name: 'VSL_UNSTAKE', data: () => Buffer.concat([randomBytes(32), Buffer.from(new BigUint64Array([500n]).buffer)])},
    { tag: TAG_VSL_CLAIM, name: 'VSL_CLAIM', data: () => randomBytes(32)},
    { tag: TAG_VSL_VOTE, name: 'VSL_VOTE', data: () => Buffer.concat([randomBytes(32), Buffer.from([1])])},
    { tag: TAG_VSL_DELEGATE, name: 'VSL_DELEGATE', data: () => Buffer.concat([randomBytes(32), randomBytes(32)])},
    { tag: TAG_VSL_UNDELEGATE, name: 'VSL_UNDELEGATE', data: () => randomBytes(32)},
    { tag: TAG_VSL_SLASH, name: 'VSL_SLASH', data: () => Buffer.concat([randomBytes(32), Buffer.from(new BigUint64Array([10n]).buffer)])},
    { tag: TAG_VSL_REWARD, name: 'VSL_REWARD', data: () => Buffer.concat([randomBytes(32), Buffer.from(new BigUint64Array([5n]).buffer)])},
    { tag: TAG_VSL_EPOCH, name: 'VSL_EPOCH', data: () => Buffer.concat([Buffer.from(new BigUint64Array([1n]).buffer), randomBytes(32)])},
    { tag: TAG_VSL_CHECKPOINT, name: 'VSL_CHECKPOINT', data: () => Buffer.concat([randomBytes(32), randomBytes(32)])},
    
    // World's First Privacy (44-53)
    { tag: TAG_DECOY_STORM, name: 'DECOY_STORM', data: () => Buffer.concat([Buffer.from([5]), randomBytes(160)])},
    { tag: TAG_CHRONO_VAULT, name: 'CHRONO_VAULT', data: () => Buffer.concat([randomBytes(32), Buffer.from(new BigUint64Array([BigInt(Date.now() / 1000 + 86400)]).buffer)])},
    { tag: TAG_STEALTH_REG, name: 'STEALTH_REG', data: () => Buffer.concat([randomBytes(33), randomBytes(33)])},
    { tag: TAG_RING_SIG, name: 'RING_SIG', data: () => Buffer.concat([Buffer.from([5]), randomBytes(165)])},
    { tag: TAG_ZK_PROOF, name: 'ZK_PROOF', data: () => Buffer.concat([Buffer.from([1]), randomBytes(256)])},
    { tag: TAG_AUDIT_REVEAL, name: 'AUDIT_REVEAL', data: () => Buffer.concat([randomBytes(32), randomBytes(32), randomBytes(64)])},
    { tag: TAG_SELECTIVE_DISCLOSE, name: 'SELECTIVE_DISCLOSE', data: () => Buffer.concat([randomBytes(32), Buffer.from([3]), randomBytes(96)])},
    { tag: TAG_CONFIDENTIAL_NOTE, name: 'CONFIDENTIAL_NOTE', data: () => Buffer.concat([randomBytes(64), Buffer.from('Encrypted data')])},
    { tag: TAG_BATCH_PRIVATE, name: 'BATCH_PRIVATE', data: () => Buffer.concat([Buffer.from([3]), randomBytes(192)])},
    { tag: TAG_MIXER_DEPOSIT, name: 'MIXER_DEPOSIT', data: () => Buffer.concat([randomBytes(32), Buffer.from(new BigUint64Array([100n]).buffer)])},
    
    // POI (54-64)
    { tag: TAG_POI_CREATE, name: 'POI_CREATE', data: () => Buffer.concat([randomBytes(32), randomBytes(64)])},
    { tag: TAG_POI_VERIFY, name: 'POI_VERIFY', data: () => Buffer.concat([randomBytes(32), randomBytes(32)])},
    { tag: TAG_POI_ATTEST, name: 'POI_ATTEST', data: () => Buffer.concat([randomBytes(32), randomBytes(64)])},
    { tag: TAG_POI_CHALLENGE, name: 'POI_CHALLENGE', data: () => Buffer.concat([randomBytes(32), randomBytes(32)])},
    { tag: TAG_POI_RESPOND, name: 'POI_RESPOND', data: () => Buffer.concat([randomBytes(32), randomBytes(128)])},
    { tag: TAG_POI_RESOLVE, name: 'POI_RESOLVE', data: () => Buffer.concat([randomBytes(32), Buffer.from([1])])},
    { tag: TAG_POI_REVOKE, name: 'POI_REVOKE', data: () => randomBytes(32)},
    { tag: TAG_POI_DELEGATE, name: 'POI_DELEGATE', data: () => Buffer.concat([randomBytes(32), randomBytes(32)])},
    { tag: TAG_POI_SNAPSHOT, name: 'POI_SNAPSHOT', data: () => Buffer.concat([randomBytes(32), randomBytes(32)])},
    { tag: TAG_POI_MERKLE, name: 'POI_MERKLE', data: () => Buffer.concat([randomBytes(32), Buffer.from([5]), randomBytes(160)])},
    { tag: TAG_POI_BATCH, name: 'POI_BATCH', data: () => Buffer.concat([Buffer.from([3]), randomBytes(96)])},
  ];

  let pmpPassed = 0;
  let pmpFailed = 0;

  for (const test of tagTests) {
    const testNum = tagTests.indexOf(test) + 1;
    console.log(`🧪 Test 5.${testNum}: TAG_${test.name} (${test.tag})`);
    
    try {
      const data = test.data();
      
      const ix = buildPmpInstruction(test.tag, data, [
        { pubkey: ctx.mainWallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ]);
      
      const tx = new Transaction().add(ix);
      const sig = await sendAndConfirmTransaction(ctx.connection, tx, [ctx.mainWallet]);
      
      console.log(`  📋 TX: ${sig.slice(0, 20)}...`);
      ctx.recordResult(`5.${testNum} ${test.name}`, true, `Tag ${test.tag}`, sig);
      console.log('  ✅ PASSED\n');
      pmpPassed++;
    } catch (e) {
      console.log(`  ❌ FAILED: ${e.message.slice(0, 60)}\n`);
      ctx.recordResult(`5.${testNum} ${test.name}`, false, e.message.slice(0, 40));
      pmpFailed++;
    }
    
    // Small delay to avoid rate limiting
    await delay(200);
  }

  console.log(`\n📊 PMP Tags Summary: ${pmpPassed}/${tagTests.length} passed\n`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n');
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(12) + 'STS TOKEN STANDARD v5.0 - COMPREHENSIVE TEST SUITE' + ' '.repeat(5) + '║');
  console.log('╠' + '═'.repeat(68) + '╣');
  console.log('║  Program: CumUDpSpjmMEsaPhLMZEE8NKtgq9BTT6eyN7RCpsWmPE' + ' '.repeat(10) + '║');
  console.log('║  Network: DEVNET ONLY' + ' '.repeat(45) + '║');
  console.log('║  Date: ' + new Date().toISOString().slice(0, 19) + ' '.repeat(40) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');
  console.log('\n');

  const ctx = new TestContext();
  await ctx.initialize();

  try {
    // Run all test suites
    await testStsTokenCore(ctx);
    await testStsAdvanced(ctx);
    await testStsNft(ctx);
    await testStsPoolOps(ctx);
    await testPmpInscriptions(ctx);

  } catch (e) {
    console.log(`\n❌ FATAL ERROR: ${e.message}\n`);
  }

  // ========================================================================
  // FINAL SUMMARY
  // ========================================================================
  console.log('\n' + '═'.repeat(70));
  console.log('  COMPREHENSIVE TEST RESULTS');
  console.log('═'.repeat(70) + '\n');

  const passed = ctx.testResults.filter(r => r.passed).length;
  const failed = ctx.testResults.filter(r => !r.passed).length;
  const total = ctx.testResults.length;

  // Group results by part
  const parts = {
    'PART 1 (Token Core)': ctx.testResults.filter(r => r.name.startsWith('1.')),
    'PART 2 (Advanced)': ctx.testResults.filter(r => r.name.startsWith('2.')),
    'PART 3 (NFT)': ctx.testResults.filter(r => r.name.startsWith('3.')),
    'PART 4 (Pools)': ctx.testResults.filter(r => r.name.startsWith('4.')),
    'PART 5 (PMP Tags)': ctx.testResults.filter(r => r.name.startsWith('5.')),
  };

  for (const [partName, results] of Object.entries(parts)) {
    const partPassed = results.filter(r => r.passed).length;
    const partTotal = results.length;
    const icon = partPassed === partTotal ? '✅' : '⚠️';
    console.log(`  ${icon} ${partName}: ${partPassed}/${partTotal}`);
  }

  console.log('\n' + '-'.repeat(70));
  console.log(`\n  TOTAL: ${passed}/${total} tests passed (${((passed/total)*100).toFixed(1)}%)\n`);

  // Transaction log
  console.log('\n' + '═'.repeat(70));
  console.log('  TRANSACTION LOG');
  console.log('═'.repeat(70) + '\n');
  
  console.log(`  Total transactions: ${ctx.txHashes.length}\n`);
  
  // Show first 20 transactions
  const showCount = Math.min(20, ctx.txHashes.length);
  for (let i = 0; i < showCount; i++) {
    const tx = ctx.txHashes[i];
    console.log(`  ${i+1}. ${tx.name}: ${tx.sig.slice(0, 24)}...`);
  }
  
  if (ctx.txHashes.length > 20) {
    console.log(`  ... and ${ctx.txHashes.length - 20} more transactions`);
  }

  // Save results to file
  const resultsFile = `/workspaces/StyxStack/.devnet/test-results-${Date.now()}.json`;
  const resultsData = {
    program: 'CumUDpSpjmMEsaPhLMZEE8NKtgq9BTT6eyN7RCpsWmPE',
    network: 'devnet',
    timestamp: new Date().toISOString(),
    summary: { passed, failed, total },
    results: ctx.testResults,
    transactions: ctx.txHashes,
  };
  
  fs.writeFileSync(resultsFile, JSON.stringify(resultsData, null, 2));
  console.log(`\n📁 Results saved to: ${resultsFile}\n`);

  console.log('═'.repeat(70));
  console.log('  TEST SUITE COMPLETE');
  console.log('═'.repeat(70) + '\n');
}

main().catch(console.error);
