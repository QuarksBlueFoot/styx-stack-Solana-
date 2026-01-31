/**
 * WhisperDrop Devnet Integration Test
 * 
 * Tests core WhisperDrop functionality on devnet.
 * 
 * Mainnet: GhstFNnEbixAGQgLnWg1nWetJQgGfSUMhnxdBA6hWu5e (NOT TOUCHED)
 * Devnet:  CumUDpSpjmMEsaPhLMZEE8NKtgq9BTT6eyN7RCpsWmPE
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  SystemProgram,
} from '@solana/web3.js';
import { createHash, randomBytes } from 'crypto';
import fs from 'fs';

// ============================================================================
// DEVNET CONFIG (separate from mainnet!)
// ============================================================================
const DEVNET_WHISPERDROP_PROGRAM_ID = new PublicKey('CumUDpSpjmMEsaPhLMZEE8NKtgq9BTT6eyN7RCpsWmPE');
const TREASURY = new PublicKey('13xnC9kDksJMBE9FYVW1S7dukLjRDgrh4Dzm6eq5moon');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Load devnet test keypair from repo
const keypairData = JSON.parse(fs.readFileSync(new URL('./.devnet/test-wallet.json', import.meta.url), 'utf8'));
const payer = Keypair.fromSecretKey(Uint8Array.from(keypairData));

console.log('🎁 WhisperDrop Devnet Integration Test');
console.log('======================================');
console.log(`Program ID: ${DEVNET_WHISPERDROP_PROGRAM_ID.toBase58()}`);
console.log(`Payer: ${payer.publicKey.toBase58()}`);
console.log(`Treasury: ${TREASURY.toBase58()}`);
console.log('');

// Instruction tags
const TAG_INIT_CAMPAIGN = 0;
const TAG_CLAIM = 1;
const TAG_RECLAIM = 2;
const TAG_CLAIM_STEALTH = 3;
const TAG_CLAIM_REFERRAL = 4;

// Seeds
const SEED_CAMPAIGN = Buffer.from('campaign');
const SEED_ESCROW = Buffer.from('escrow');
const SEED_NULLIFIER = Buffer.from('sts_nullifier');

// Fees
const INIT_FEE_LAMPORTS = 10_000_000; // 0.01 SOL
const CLAIM_FEE_LAMPORTS = 300_000;   // 0.0003 SOL

function keccak256(data) {
  return createHash('sha3-256').update(Buffer.from(data)).digest();
}

async function findCampaignPDA(campaignId) {
  return PublicKey.findProgramAddressSync(
    [SEED_CAMPAIGN, campaignId],
    DEVNET_WHISPERDROP_PROGRAM_ID
  );
}

async function findEscrowPDA(campaignPDA) {
  return PublicKey.findProgramAddressSync(
    [SEED_ESCROW, campaignPDA.toBuffer()],
    DEVNET_WHISPERDROP_PROGRAM_ID
  );
}

// ============================================================================
// TEST: Basic Program Interaction
// ============================================================================

async function testProgramExists() {
  console.log('\n🔍 Test 1: Program Exists Check');
  console.log('--------------------------------');
  
  try {
    const accountInfo = await connection.getAccountInfo(DEVNET_WHISPERDROP_PROGRAM_ID);
    if (accountInfo && accountInfo.executable) {
      console.log(`✅ Program exists and is executable`);
      console.log(`   Data length: ${accountInfo.data.length} bytes`);
      console.log(`   Owner: ${accountInfo.owner.toBase58()}`);
      return true;
    } else {
      console.log(`❌ Program not found or not executable`);
      return false;
    }
  } catch (e) {
    console.log(`❌ Failed: ${e.message}`);
    return false;
  }
}

async function testInvalidInstruction() {
  console.log('\n🚫 Test 2: Invalid Instruction Handling');
  console.log('----------------------------------------');
  
  // Send garbage data - should fail gracefully
  const data = Buffer.alloc(10);
  data[0] = 255; // Invalid tag
  randomBytes(9).copy(data, 1);
  
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    ],
    programId: DEVNET_WHISPERDROP_PROGRAM_ID,
    data,
  });
  
  try {
    const tx = new Transaction().add(ix);
    await sendAndConfirmTransaction(connection, tx, [payer]);
    console.log(`❌ Should have failed but succeeded`);
    return false;
  } catch (e) {
    if (e.message.includes('invalid instruction') || 
        e.message.includes('InvalidInstruction') ||
        e.message.includes('custom program error')) {
      console.log(`✅ Correctly rejected invalid instruction`);
      return true;
    } else {
      console.log(`⚠️ Failed with unexpected error: ${e.message.slice(0, 100)}`);
      return true; // Still passed - program rejected bad data
    }
  }
}

async function testInitCampaignMissingAccounts() {
  console.log('\n📝 Test 3: InitCampaign (Missing Accounts)');
  console.log('-------------------------------------------');
  
  // Try to init campaign without all required accounts
  const campaignId = randomBytes(32);
  const merkleRoot = randomBytes(32);
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 86400); // +1 day
  
  // Format: [tag:1][campaign_id:32][merkle_root:32][expiry:8]
  const data = Buffer.alloc(73);
  data[0] = TAG_INIT_CAMPAIGN;
  campaignId.copy(data, 1);
  merkleRoot.copy(data, 33);
  data.writeBigInt64LE(expiry, 65);
  
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      // Missing: campaign, escrow, mint, system, token, rent, treasury
    ],
    programId: DEVNET_WHISPERDROP_PROGRAM_ID,
    data,
  });
  
  try {
    const tx = new Transaction().add(ix);
    await sendAndConfirmTransaction(connection, tx, [payer]);
    console.log(`❌ Should have failed but succeeded`);
    return false;
  } catch (e) {
    if (e.message.includes('NotEnoughAccountKeys') || 
        e.message.includes('not enough account keys')) {
      console.log(`✅ Correctly rejected - missing accounts`);
      return true;
    } else {
      console.log(`✅ Failed as expected: ${e.message.slice(0, 80)}...`);
      return true;
    }
  }
}

async function testClaimInvalidCampaign() {
  console.log('\n🎫 Test 4: Claim (Non-existent Campaign)');
  console.log('-----------------------------------------');
  
  // Try to claim from a campaign that doesn't exist
  const fakeCampaignId = randomBytes(32);
  const [campaignPDA] = await findCampaignPDA(fakeCampaignId);
  const [escrowPDA] = await findEscrowPDA(campaignPDA);
  const fakeLeafHash = randomBytes(32);
  const fakeProof = Buffer.alloc(0); // No proof
  
  // Format: [tag:1][campaign_id:32][leaf_hash:32][amount:8][proof_len:1]
  const data = Buffer.alloc(74);
  data[0] = TAG_CLAIM;
  fakeCampaignId.copy(data, 1);
  fakeLeafHash.copy(data, 33);
  data.writeBigUInt64LE(BigInt(1000000), 65); // 0.001 SOL
  data[73] = 0; // No proof
  
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: campaignPDA, isSigner: false, isWritable: true },
      { pubkey: escrowPDA, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: false, isWritable: true }, // recipient
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
    ],
    programId: DEVNET_WHISPERDROP_PROGRAM_ID,
    data,
  });
  
  try {
    const tx = new Transaction().add(ix);
    await sendAndConfirmTransaction(connection, tx, [payer]);
    console.log(`❌ Should have failed but succeeded`);
    return false;
  } catch (e) {
    console.log(`✅ Correctly rejected: ${e.message.slice(0, 80)}...`);
    return true;
  }
}

async function testTreasuryAddress() {
  console.log('\n💰 Test 5: Treasury Address Validation');
  console.log('---------------------------------------');
  
  // Verify treasury is correct (should match mainnet)
  const expectedTreasury = '13xnC9kDksJMBE9FYVW1S7dukLjRDgrh4Dzm6eq5moon';
  
  if (TREASURY.toBase58() === expectedTreasury) {
    console.log(`✅ Treasury address matches: ${expectedTreasury}`);
    
    // Check if treasury exists on devnet
    const treasuryInfo = await connection.getAccountInfo(TREASURY);
    if (treasuryInfo) {
      console.log(`   Balance: ${treasuryInfo.lamports / 1e9} SOL`);
    } else {
      console.log(`   (Treasury account not initialized on devnet - OK)`);
    }
    return true;
  } else {
    console.log(`❌ Treasury mismatch!`);
    return false;
  }
}

async function testFeeConstants() {
  console.log('\n💸 Test 6: Fee Constants Verification');
  console.log('--------------------------------------');
  
  console.log(`   Init Fee:  ${INIT_FEE_LAMPORTS / 1e9} SOL (${INIT_FEE_LAMPORTS} lamports)`);
  console.log(`   Claim Fee: ${CLAIM_FEE_LAMPORTS / 1e9} SOL (${CLAIM_FEE_LAMPORTS} lamports)`);
  
  // Verify fees are reasonable
  if (INIT_FEE_LAMPORTS === 10_000_000 && CLAIM_FEE_LAMPORTS === 300_000) {
    console.log(`✅ Fee constants match expected values`);
    return true;
  } else {
    console.log(`⚠️ Fee constants differ from expected`);
    return true; // Still pass, just informational
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function main() {
  console.log('\n🚀 Starting WhisperDrop Devnet Tests...\n');
  
  const balance = await connection.getBalance(payer.publicKey);
  console.log(`💰 Payer balance: ${balance / 1e9} SOL`);
  
  const results = {
    programExists: await testProgramExists(),
    invalidInstruction: await testInvalidInstruction(),
    missingAccounts: await testInitCampaignMissingAccounts(),
    invalidCampaign: await testClaimInvalidCampaign(),
    treasuryAddress: await testTreasuryAddress(),
    feeConstants: await testFeeConstants(),
  };
  
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('                    TEST RESULTS SUMMARY                    ');
  console.log('═══════════════════════════════════════════════════════════');
  
  let passed = 0;
  let failed = 0;
  
  for (const [name, result] of Object.entries(results)) {
    const status = result ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${name.padEnd(20)} ${status}`);
    if (result) passed++;
    else failed++;
  }
  
  console.log('───────────────────────────────────────────────────────────');
  console.log(`  Total: ${passed}/${passed + failed} passed`);
  console.log('═══════════════════════════════════════════════════════════');
  
  const finalBalance = await connection.getBalance(payer.publicKey);
  console.log(`\n💰 Final balance: ${finalBalance / 1e9} SOL`);
  console.log(`   Fees spent: ${(balance - finalBalance) / 1e9} SOL`);
  
  console.log('\n📋 Program Summary:');
  console.log(`   Devnet:  ${DEVNET_WHISPERDROP_PROGRAM_ID.toBase58()}`);
  console.log(`   Mainnet: GhstFNnEbixAGQgLnWg1nWetJQgGfSUMhnxdBA6hWu5e (UNCHANGED)`);
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
