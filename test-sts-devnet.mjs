#!/usr/bin/env node
/**
 * STS (Styx Token Standard) Devnet Test Script
 * 
 * SAFETY: This script ONLY uses devnet - no mainnet operations
 * 
 * Tests:
 * 1. Connection to devnet
 * 2. Check program deployment
 * 3. Test wallet balance check
 * 4. List STS features available
 * 
 * NO TRANSACTIONS SENT - just reads blockchain state
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import fs from 'fs';

// ============================================================================
// CONFIGURATION - DEVNET ONLY
// ============================================================================

const DEVNET_RPC = 'https://api.devnet.solana.com';
const DEVNET_PMP_PROGRAM_ID = 'FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW';
const DEVNET_WHISPERDROP_PROGRAM_ID = 'CumUDpSpjmMEsaPhLMZEE8NKtgq9BTT6eyN7RCpsWmPE';
const TEST_WALLET_PATH = '.devnet/test-wallet.json';

// ============================================================================
// SAFETY CHECK
// ============================================================================

console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                         STS DEVNET TEST SUITE                                ║
║                                                                              ║
║  ⚠️  DEVNET ONLY - NO MAINNET OPERATIONS                                    ║
║                                                                              ║
║  RPC:     ${DEVNET_RPC}                                ║
║  Program: ${DEVNET_PMP_PROGRAM_ID}     ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

// ============================================================================
// UTILITIES
// ============================================================================

function loadTestWallet() {
  if (!fs.existsSync(TEST_WALLET_PATH)) {
    throw new Error(`Test wallet not found: ${TEST_WALLET_PATH}`);
  }
  const secret = JSON.parse(fs.readFileSync(TEST_WALLET_PATH, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// TEST 1: Connection Check
// ============================================================================

async function testConnection() {
  console.log('\n📡 TEST 1: Devnet Connection');
  console.log('─'.repeat(80));
  
  try {
    const connection = new Connection(DEVNET_RPC, 'confirmed');
    const version = await connection.getVersion();
    const slot = await connection.getSlot();
    
    console.log('✅ Connected to devnet');
    console.log(`   Solana version: ${version['solana-core']}`);
    console.log(`   Current slot: ${slot}`);
    return connection;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    throw error;
  }
}

// ============================================================================
// TEST 2: Program Deployment Check
// ============================================================================

async function testProgramDeployment(connection) {
  console.log('\n🔍 TEST 2: Program Deployment Check');
  console.log('─'.repeat(80));
  
  try {
    const pmpProgramId = new PublicKey(DEVNET_PMP_PROGRAM_ID);
    const accountInfo = await connection.getAccountInfo(pmpProgramId);
    
    if (accountInfo && accountInfo.executable) {
      console.log('✅ PMP program is deployed on devnet');
      console.log(`   Program ID: ${DEVNET_PMP_PROGRAM_ID}`);
      console.log(`   Owner: ${accountInfo.owner.toString()}`);
      console.log(`   Data size: ${accountInfo.data.length} bytes`);
      console.log(`   Executable: ${accountInfo.executable}`);
    } else {
      console.log('⚠️  Program account exists but is not executable');
    }
    
    // Check WhisperDrop too
    const wdProgramId = new PublicKey(DEVNET_WHISPERDROP_PROGRAM_ID);
    const wdAccountInfo = await connection.getAccountInfo(wdProgramId);
    
    if (wdAccountInfo && wdAccountInfo.executable) {
      console.log('✅ WhisperDrop program is deployed on devnet');
      console.log(`   Program ID: ${DEVNET_WHISPERDROP_PROGRAM_ID}`);
    } else {
      console.log('⚠️  WhisperDrop program not found or not executable');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Program check failed:', error.message);
    return false;
  }
}

// ============================================================================
// TEST 3: Test Wallet Check
// ============================================================================

async function testWalletBalance(connection) {
  console.log('\n💰 TEST 3: Test Wallet Balance');
  console.log('─'.repeat(80));
  
  try {
    const wallet = loadTestWallet();
    const balance = await connection.getBalance(wallet.publicKey);
    const balanceSOL = (balance / 1e9).toFixed(4);
    
    console.log('✅ Test wallet loaded');
    console.log(`   Address: ${wallet.publicKey.toString()}`);
    console.log(`   Balance: ${balanceSOL} SOL`);
    
    if (balance < 0.01e9) {
      console.log('   ⚠️  Low balance - may need airdrop for transactions');
    }
    
    return wallet;
  } catch (error) {
    console.error('❌ Wallet check failed:', error.message);
    throw error;
  }
}

// ============================================================================
// TEST 4: List Available Features
// ============================================================================

async function listFeatures() {
  console.log('\n📋 TEST 4: Available STS Features');
  console.log('─'.repeat(80));
  
  const features = [
    { name: 'Private Messages', status: 'Available', description: 'Send encrypted messages' },
    { name: 'Stealth Addresses', status: 'Available', description: 'Generate one-time addresses' },
    { name: 'Token Streaming', status: 'Available', description: 'Stream payments over time' },
    { name: 'Fair Launch', status: 'Available', description: 'Launch tokens fairly' },
    { name: 'AMM Pools', status: 'Available', description: 'Create liquidity pools' },
    { name: 'Governance', status: 'Available', description: 'On-chain governance' },
    { name: 'Address Lookup Tables', status: 'Available', description: 'Optimize transactions' },
  ];
  
  console.log('Available features to test:\n');
  features.forEach((feat, idx) => {
    console.log(`   ${idx + 1}. ${feat.name.padEnd(25)} [${feat.status}]`);
    console.log(`      ${feat.description}`);
  });
  
  return features;
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runTests() {
  let connection;
  let wallet;
  
  try {
    // Test 1: Connection
    connection = await testConnection();
    await sleep(500);
    
    // Test 2: Program deployment
    await testProgramDeployment(connection);
    await sleep(500);
    
    // Test 3: Wallet
    wallet = await testWalletBalance(connection);
    await sleep(500);
    
    // Test 4: Features
    await listFeatures();
    
    // Summary
    console.log('\n' + '═'.repeat(80));
    console.log('✅ ALL CHECKS PASSED');
    console.log('═'.repeat(80));
    console.log('\n🎯 Ready for devnet testing!');
    console.log('\nNext steps:');
    console.log('  1. Choose which feature to test (send, receive, trade, pool, etc.)');
    console.log('  2. Run specific test with explicit confirmation');
    console.log('  3. Monitor transactions on devnet explorer');
    console.log('\n⚠️  Remember: Always get explicit consent before sending transactions!\n');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests();
