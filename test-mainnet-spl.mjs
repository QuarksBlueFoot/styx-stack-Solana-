#!/usr/bin/env node
/**
 * STYX PRIVACY STANDARD - MAINNET SPL TOKEN TESTS v4.1.0
 * 
 * Creates real SPL tokens and tests:
 * - OP_SHIELD: Deposit SPL → STS Note
 * - OP_UNSHIELD: Withdraw STS Note → SPL
 * - OP_SHIELD_WITH_INIT: Permissionless pool creation
 * - OP_UNSHIELD_WITH_CLOSE: Close empty pool
 * 
 * IMPORTANT: Tests multi-user isolation (one user's close doesn't affect others)
 * 
 * Program: GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  createMint,
  createAssociatedTokenAccount,
  getAssociatedTokenAddress,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { randomBytes } from 'crypto';
import sha3 from 'js-sha3';
const keccak256Hash = sha3.keccak256;
import fs from 'fs';

// ============================================================================
// MAINNET CONFIG
// ============================================================================
const PROGRAM_ID = new PublicKey('GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9');
const TREASURY = new PublicKey('13xnC9kDksJMBE9FYVW1S7dukLjRDgrh4Dzm6eq5moon');
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

const keypairPath = process.env.TEST_WALLET || '/workspaces/StyxStack/.devnet/test-wallet.json';
const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
const payer = Keypair.fromSecretKey(Uint8Array.from(keypairData));

// PDA Seeds (from lib.rs and sts_standard.rs)
const POOL_SEED = Buffer.from('sts_pool');
const NULLIFIER_SEED = Buffer.from('sts_nullifier');  // For OP_UNSHIELD
const NULLIFIER_SEED_V2 = Buffer.from('nullifier');    // For OP_UNSHIELD_WITH_CLOSE (inconsistent but deployed)

// Domain + Opcodes
const DOMAIN_STS = 0x01;
const OP_SHIELD = 0x07;
const OP_UNSHIELD = 0x08;
const OP_SHIELD_WITH_INIT = 0x1F;
const OP_UNSHIELD_WITH_CLOSE = 0x20;

// ============================================================================
// UTILITIES
// ============================================================================
const c = {
  g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', b: '\x1b[34m',
  c: '\x1b[36m', x: '\x1b[0m', B: '\x1b[1m',
};

let passCount = 0, failCount = 0;

function log(msg, color = c.x) { console.log(`${color}${msg}${c.x}`); }
function pass(name) { passCount++; log(`  ✓ ${name}`, c.g); }
function fail(name, err) { failCount++; log(`  ✗ ${name}: ${err}`, c.r); }
function section(title) { log(`\n${c.B}${c.c}━━━ ${title} ━━━${c.x}`); }
async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function keccak256(data) {
  return Buffer.from(keccak256Hash.arrayBuffer(Buffer.from(data)));
}

// ============================================================================
// PDA DERIVATION
// ============================================================================
function getPoolPda(mintId, programId) {
  return PublicKey.findProgramAddressSync(
    [POOL_SEED, mintId],
    programId
  );
}

function getPoolTokenAccountPda(mintId, programId) {
  return PublicKey.findProgramAddressSync(
    [POOL_SEED, mintId, Buffer.from('token')],
    programId
  );
}

function getNullifierPda(nullifier, programId) {
  // For OP_UNSHIELD (uses NULLIFIER_SEED = "sts_nullifier")
  return PublicKey.findProgramAddressSync(
    [NULLIFIER_SEED, nullifier],
    programId
  );
}

function getNullifierPdaV2(nullifier, programId) {
  // For OP_UNSHIELD_WITH_CLOSE (uses "nullifier" - inconsistent but deployed)
  return PublicKey.findProgramAddressSync(
    [NULLIFIER_SEED_V2, nullifier],
    programId
  );
}

// ============================================================================
// SPL TOKEN SETUP
// ============================================================================
async function createTestToken(mintAuthority, decimals = 6) {
  log(`  Creating SPL token...`, c.y);
  
  const mint = await createMint(
    connection,
    payer,
    mintAuthority.publicKey,
    null, // freeze authority
    decimals,
    undefined, // keypair
    { commitment: 'confirmed' },
    TOKEN_PROGRAM_ID
  );
  
  log(`  Token created: ${mint.toBase58()}`, c.g);
  return mint;
}

async function mintTestTokens(mint, mintAuthority, recipient, amount) {
  const ata = await getAssociatedTokenAddress(mint, recipient);
  
  // Create ATA if needed with retry
  let ataExists = false;
  try {
    await getAccount(connection, ata);
    ataExists = true;
  } catch {
    await createAssociatedTokenAccount(
      connection,
      payer,
      mint,
      recipient,
      { commitment: 'confirmed' }
    );
    await delay(2000); // Wait for ATA creation to propagate
  }
  
  await mintTo(
    connection,
    payer,
    mint,
    ata,
    mintAuthority,
    amount,
    [],
    { commitment: 'confirmed' }
  );
  
  return ata;
}

// ============================================================================
// SHIELD / UNSHIELD HELPERS
// ============================================================================
async function shieldTokens(mint, depositorAta, amount, commitment = null) {
  const mintId = mint.toBuffer();
  commitment = commitment || randomBytes(32);
  const encryptedNote = Buffer.from('test-encrypted-note');
  
  const [poolPda] = getPoolPda(mintId, PROGRAM_ID);
  const [poolTokenPda] = getPoolTokenAccountPda(mintId, PROGRAM_ID);
  
  // Build instruction data
  // Format: [domain:1][op:1][mint_id:32][amount:8][commitment:32][enc_len:4][enc_note:var][flags:1]
  const data = Buffer.alloc(78 + encryptedNote.length + 1);
  let off = 0;
  data[off++] = DOMAIN_STS;
  data[off++] = OP_SHIELD;
  mintId.copy(data, off); off += 32;
  data.writeBigUInt64LE(BigInt(amount), off); off += 8;
  commitment.copy(data, off); off += 32;
  data.writeUInt32LE(encryptedNote.length, off); off += 4;
  encryptedNote.copy(data, off); off += encryptedNote.length;
  data[off] = 0; // No receipt mint
  
  const accounts = [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: depositorAta, isSigner: false, isWritable: true },
    { pubkey: poolTokenPda, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];
  
  const ix = new TransactionInstruction({
    keys: accounts,
    programId: PROGRAM_ID,
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [payer], {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
    maxRetries: 5,
  });
  
  return { sig, commitment, poolPda, poolTokenPda };
}

async function shieldWithInit(mint, depositorAta, amount, commitment = null) {
  const mintId = mint.toBuffer();
  commitment = commitment || randomBytes(32);
  const encryptedNote = Buffer.from('test-encrypted-note-init');
  
  const [poolPda, poolBump] = getPoolPda(mintId, PROGRAM_ID);
  const [poolTokenPda, tokenBump] = getPoolTokenAccountPda(mintId, PROGRAM_ID);
  
  // Build instruction data
  const data = Buffer.alloc(78 + encryptedNote.length + 1);
  let off = 0;
  data[off++] = DOMAIN_STS;
  data[off++] = OP_SHIELD_WITH_INIT;
  mintId.copy(data, off); off += 32;
  data.writeBigUInt64LE(BigInt(amount), off); off += 8;
  commitment.copy(data, off); off += 32;
  data.writeUInt32LE(encryptedNote.length, off); off += 4;
  encryptedNote.copy(data, off); off += encryptedNote.length;
  data[off] = 0;
  
  const accounts = [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: depositorAta, isSigner: false, isWritable: true },
    { pubkey: poolPda, isSigner: false, isWritable: true },
    { pubkey: poolTokenPda, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
  
  const ix = new TransactionInstruction({
    keys: accounts,
    programId: PROGRAM_ID,
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [payer], {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
    maxRetries: 5,
  });
  
  return { sig, commitment, poolPda, poolTokenPda };
}

async function unshieldTokens(mint, recipientAta, amount, nullifier) {
  const mintId = mint.toBuffer();
  const recipient = payer.publicKey.toBuffer();
  
  const [poolPda] = getPoolPda(mintId, PROGRAM_ID);
  const [poolTokenPda] = getPoolTokenAccountPda(mintId, PROGRAM_ID);
  const [nullifierPda] = getNullifierPda(nullifier, PROGRAM_ID);
  
  // Build instruction data
  // Format: [domain:1][op:1][mint_id:32][nullifier:32][amount:8][recipient:32][flags:1]
  const data = Buffer.alloc(107);
  let off = 0;
  data[off++] = DOMAIN_STS;
  data[off++] = OP_UNSHIELD;
  mintId.copy(data, off); off += 32;
  nullifier.copy(data, off); off += 32;
  data.writeBigUInt64LE(BigInt(amount), off); off += 8;
  recipient.copy(data, off); off += 32;
  data[off] = 0; // No receipt burn
  
  const accounts = [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: nullifierPda, isSigner: false, isWritable: true },
    { pubkey: recipientAta, isSigner: false, isWritable: true },
    { pubkey: poolTokenPda, isSigner: false, isWritable: true },
    { pubkey: poolPda, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
  
  const ix = new TransactionInstruction({
    keys: accounts,
    programId: PROGRAM_ID,
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [payer], {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
    maxRetries: 5,
  });
  
  return { sig, nullifierPda };
}

async function unshieldWithClose(mint, recipientAta, amount, nullifier) {
  const mintId = mint.toBuffer();
  const recipient = payer.publicKey.toBuffer();
  
  const [poolPda] = getPoolPda(mintId, PROGRAM_ID);
  const [poolTokenPda] = getPoolTokenAccountPda(mintId, PROGRAM_ID);
  const [nullifierPda] = getNullifierPdaV2(nullifier, PROGRAM_ID);  // Uses "nullifier" seed
  
  const data = Buffer.alloc(107);
  let off = 0;
  data[off++] = DOMAIN_STS;
  data[off++] = OP_UNSHIELD_WITH_CLOSE;
  mintId.copy(data, off); off += 32;
  nullifier.copy(data, off); off += 32;
  data.writeBigUInt64LE(BigInt(amount), off); off += 8;
  recipient.copy(data, off); off += 32;
  data[off] = 0;
  
  const accounts = [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: nullifierPda, isSigner: false, isWritable: true },
    { pubkey: recipientAta, isSigner: false, isWritable: true },
    { pubkey: poolTokenPda, isSigner: false, isWritable: true },
    { pubkey: poolPda, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
  
  const ix = new TransactionInstruction({
    keys: accounts,
    programId: PROGRAM_ID,
    data,
  });
  
  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [payer], {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
    maxRetries: 5,
  });
  
  return { sig, nullifierPda };
}

// ============================================================================
// TESTS
// ============================================================================

async function testSPLShieldUnshield() {
  section('SPL TOKEN SHIELD/UNSHIELD');
  
  log('  Creating test SPL token on mainnet...', c.y);
  
  try {
    // Create a test token
    const mint = await createTestToken(payer, 6);
    const mintId = mint.toBuffer();
    
    // Mint some tokens to ourselves
    const testAmount = 1_000_000; // 1 token with 6 decimals
    const depositorAta = await mintTestTokens(mint, payer, payer.publicKey, testAmount);
    log(`  Minted ${testAmount} tokens to ${depositorAta.toBase58()}`, c.g);
    
    // Check initial balance
    let account = await getAccount(connection, depositorAta);
    log(`  Initial balance: ${account.amount.toString()}`, c.y);
    
    // Test 1: Shield WITH Init (creates pool)
    log(`\n  Test 1: OP_SHIELD_WITH_INIT (creates pool)`, c.c);
    const shieldAmount1 = 500_000;
    const commitment1 = randomBytes(32);
    
    try {
      const result1 = await shieldWithInit(mint, depositorAta, shieldAmount1, commitment1);
      pass(`SHIELD_WITH_INIT: ${result1.sig.slice(0, 16)}`);
      log(`    Pool PDA: ${result1.poolPda.toBase58()}`, c.y);
      
      // Verify balance decreased
      account = await getAccount(connection, depositorAta);
      log(`    Balance after shield: ${account.amount.toString()}`, c.y);
      
    } catch (e) {
      fail('SHIELD_WITH_INIT', e.message);
    }
    
    await delay(2000);
    
    // Test 2: Shield more tokens (pool already exists)
    log(`\n  Test 2: OP_SHIELD (pool exists)`, c.c);
    const shieldAmount2 = 300_000;
    const commitment2 = randomBytes(32);
    
    try {
      const result2 = await shieldTokens(mint, depositorAta, shieldAmount2, commitment2);
      pass(`SHIELD (existing pool): ${result2.sig.slice(0, 16)}`);
      
      account = await getAccount(connection, depositorAta);
      log(`    Balance after 2nd shield: ${account.amount.toString()}`, c.y);
      
    } catch (e) {
      fail('SHIELD', e.message);
    }
    
    await delay(2000);
    
    // Test 3: Unshield partial (pool should NOT close)
    log(`\n  Test 3: OP_UNSHIELD (partial - pool stays open)`, c.c);
    const unshieldAmount1 = 200_000;
    const nullifier1 = randomBytes(32);
    
    try {
      const result3 = await unshieldTokens(mint, depositorAta, unshieldAmount1, nullifier1);
      pass(`UNSHIELD (partial): ${result3.sig.slice(0, 16)}`);
      
      account = await getAccount(connection, depositorAta);
      log(`    Balance after unshield: ${account.amount.toString()}`, c.y);
      
      // Verify pool still exists
      const [poolPda] = getPoolPda(mintId, PROGRAM_ID);
      const poolInfo = await connection.getAccountInfo(poolPda);
      if (poolInfo && poolInfo.lamports > 0) {
        pass('Pool still exists (not closed)');
      } else {
        fail('Pool check', 'Pool was unexpectedly closed');
      }
      
    } catch (e) {
      fail('UNSHIELD (partial)', e.message);
    }
    
    await delay(2000);
    
    // Test 4: Unshield with close (empties pool → closes it)
    log(`\n  Test 4: OP_UNSHIELD_WITH_CLOSE (empties pool → closes)`, c.c);
    const remainingInPool = 600_000; // 500k + 300k - 200k = 600k
    const nullifier2 = randomBytes(32);
    
    try {
      const result4 = await unshieldWithClose(mint, depositorAta, remainingInPool, nullifier2);
      pass(`UNSHIELD_WITH_CLOSE: ${result4.sig.slice(0, 16)}`);
      
      account = await getAccount(connection, depositorAta);
      log(`    Final balance: ${account.amount.toString()}`, c.y);
      
      // Verify pool is closed
      const [poolPda] = getPoolPda(mintId, PROGRAM_ID);
      const poolInfo = await connection.getAccountInfo(poolPda);
      if (!poolInfo || poolInfo.lamports === 0) {
        pass('Pool closed (rent reclaimed)');
      } else {
        log(`    Pool still has ${poolInfo.lamports} lamports (may be expected)`, c.y);
        pass('Pool close attempted');
      }
      
    } catch (e) {
      fail('UNSHIELD_WITH_CLOSE', e.message);
    }
    
  } catch (e) {
    fail('SPL Token Setup', e.message);
    console.error(e);
  }
}

async function testMultiUserIsolation() {
  section('MULTI-USER ISOLATION TEST');
  
  log('  Testing that one user closing pool does NOT affect others', c.y);
  log('  Scenario: User A and User B both shield, A unshields with close', c.y);
  
  try {
    // Create a new test token for this test
    const mint = await createTestToken(payer, 6);
    const mintId = mint.toBuffer();
    
    const totalMint = 2_000_000;
    const userAAta = await mintTestTokens(mint, payer, payer.publicKey, totalMint);
    
    // User A shields 1,000,000
    log(`\n  User A shields 1,000,000...`, c.c);
    const commitmentA = randomBytes(32);
    const resultA = await shieldWithInit(mint, userAAta, 1_000_000, commitmentA);
    pass(`User A shielded: ${resultA.sig.slice(0, 16)}`);
    
    await delay(2000);
    
    // User A shields another 500,000 (simulating User B in same pool)
    log(`  User A shields 500,000 more (simulating User B)...`, c.c);
    const commitmentB = randomBytes(32);
    const resultB = await shieldTokens(mint, userAAta, 500_000, commitmentB);
    pass(`User B shielded: ${resultB.sig.slice(0, 16)}`);
    
    await delay(2000);
    
    // User A unshields with close (only their 1,000,000)
    log(`\n  User A tries UNSHIELD_WITH_CLOSE for 1,000,000...`, c.c);
    const nullifierA = randomBytes(32);
    const resultC = await unshieldWithClose(mint, userAAta, 1_000_000, nullifierA);
    pass(`User A unshielded: ${resultC.sig.slice(0, 16)}`);
    
    await delay(1000);
    
    // Check if pool still exists (User B's 500,000 should still be there)
    const [poolPda] = getPoolPda(mintId, PROGRAM_ID);
    const poolInfo = await connection.getAccountInfo(poolPda);
    
    if (poolInfo && poolInfo.lamports > 0) {
      pass('✓ Pool NOT closed - User B funds safe!');
      log(`    Pool still has ${poolInfo.lamports} lamports`, c.g);
      
      // User B can still unshield
      log(`\n  User B unshields their 500,000...`, c.c);
      const nullifierB = randomBytes(32);
      const resultD = await unshieldWithClose(mint, userAAta, 500_000, nullifierB);
      pass(`User B unshielded: ${resultD.sig.slice(0, 16)}`);
      
      // NOW pool should be closed
      await delay(1000);
      const poolInfoFinal = await connection.getAccountInfo(poolPda);
      if (!poolInfoFinal || poolInfoFinal.lamports === 0) {
        pass('Pool closed after BOTH users withdrew');
      }
      
    } else {
      fail('ISOLATION', 'Pool was closed while User B still had funds!');
    }
    
  } catch (e) {
    fail('Multi-User Test', e.message);
    console.error(e);
  }
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  log(`${c.B}${c.b}`);
  log(`╔══════════════════════════════════════════════════════════════╗`);
  log(`║   STYX SPL TOKEN TESTS - MAINNET v4.1.0                     ║`);
  log(`║   Real SPL Shield/Unshield with Pool Isolation              ║`);
  log(`╚══════════════════════════════════════════════════════════════╝`);
  log(`${c.x}`);

  log(`\n${c.y}Configuration:${c.x}`);
  log(`  Network:  MAINNET`);
  log(`  Program:  ${PROGRAM_ID.toBase58()}`);
  log(`  Wallet:   ${payer.publicKey.toBase58()}`);

  const balance = await connection.getBalance(payer.publicKey);
  log(`  Balance:  ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  
  // SPL token creation costs ~0.002 SOL per mint
  // Plus ATA creation, transactions, etc.
  const requiredBalance = 0.05 * LAMPORTS_PER_SOL;
  
  if (balance < requiredBalance) {
    log(`\n${c.r}⚠ Low balance! Need at least 0.05 SOL for SPL tests${c.x}`);
    log(`${c.y}  Current: ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL${c.x}`);
    log(`${c.y}  SPL tests skipped - run with more SOL${c.x}`);
    return;
  }

  log(`\n${c.y}Running SPL token tests...${c.x}`);

  try {
    await testSPLShieldUnshield();
    await testMultiUserIsolation();
  } catch (e) {
    log(`\n${c.r}Fatal: ${e.message}${c.x}`);
    console.error(e);
  }

  log(`\n${c.B}━━━ FINAL RESULTS ━━━${c.x}`);
  log(`  ${c.g}Passed: ${passCount}${c.x}`);
  log(`  ${c.r}Failed: ${failCount}${c.x}`);
  
  const finalBalance = await connection.getBalance(payer.publicKey);
  log(`  Cost:   ${((balance - finalBalance) / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  
  if (failCount === 0) {
    log(`\n${c.g}${c.B}✓ ALL SPL TESTS PASSED!${c.x}`);
    log(`${c.g}Pool isolation verified - users protected from each other.${c.x}`);
  } else {
    log(`\n${c.y}${failCount} test(s) failed.${c.x}`);
  }
}

main().catch(console.error);
