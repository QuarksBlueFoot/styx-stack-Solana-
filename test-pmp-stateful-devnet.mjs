#!/usr/bin/env node
/**
 * PMP STATEFUL OPERATIONS TEST
 * 
 * Tests instructions that require state initialization:
 * - Escrow create/release/refund
 * - Pool operations
 * - State channels
 * 
 * DEVNET ONLY
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
import fs from 'fs';
import { keccak_256 } from '@noble/hashes/sha3.js';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const DEVNET_PMP_PROGRAM_ID = new PublicKey('FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW');
const TREASURY = new PublicKey('13xnC9kDksJMBE9FYVW1S7dukLjRDgrh4Dzm6eq5moon');
const TEST_WALLET_PATH = '.devnet/test-wallet.json';

// TAGs for stateful operations
const TAG = {
  // Escrow
  VSL_ESCROW_CREATE: 39,
  VSL_ESCROW_RELEASE: 40,
  VSL_ESCROW_REFUND: 41,
  
  // State Channels
  STATE_CHANNEL_OPEN: 18,
  STATE_CHANNEL_CLOSE: 19,
  
  // Pool
  POOL_CREATE: 139,
  POOL_DEPOSIT: 140,
  POOL_WITHDRAW: 141,
  
  // Auction
  AUCTION_CREATE: 118,
  AUCTION_BID: 119,
  AUCTION_SETTLE: 120,
  
  // PPV
  PPV_CREATE: 122,
  PPV_VERIFY: 123,
  PPV_REDEEM: 124,
  
  // Nullifier
  NULLIFIER_CREATE: 192,
  NULLIFIER_CHECK: 193,
  
  // AMM
  AMM_POOL_CREATE: 176,
  AMM_ADD_LIQUIDITY: 177,
  AMM_SWAP: 179,
};

console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║               PMP STATEFUL OPERATIONS TEST                                   ║
║                                                                              ║
║  Testing create → use → cleanup workflows                                    ║
║  🔒 DEVNET ONLY                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

function loadTestWallet() {
  const secret = JSON.parse(fs.readFileSync(TEST_WALLET_PATH, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

function randomBytes(n) {
  const bytes = Buffer.alloc(n);
  for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
}

function keccakHash(...data) {
  return Buffer.from(keccak_256(Buffer.concat(data)));
}

function getStandardAccounts(payer) {
  return [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: TREASURY, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// TEST WORKFLOWS
// ============================================================================

async function testEscrowWorkflow(connection, payer) {
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('TEST: VSL Escrow Workflow (Create → Release)');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  const results = [];
  
  // Generate escrow ID
  const escrowId = randomBytes(32);
  const seller = Keypair.generate().publicKey;
  const amount = BigInt(10000);
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);
  
  console.log('📦 Creating escrow...');
  console.log(`   Escrow ID: ${escrowId.toString('hex').slice(0, 16)}...`);
  console.log(`   Seller: ${seller.toString().slice(0, 20)}...`);
  console.log(`   Amount: ${amount} lamports`);
  
  // 1. Create Escrow
  const createData = Buffer.alloc(1 + 1 + 32 + 32 + 8 + 8);
  let offset = 0;
  createData.writeUInt8(TAG.VSL_ESCROW_CREATE, offset++);
  createData.writeUInt8(0x01, offset++);
  escrowId.copy(createData, offset); offset += 32;
  Buffer.from(seller.toBytes()).copy(createData, offset); offset += 32;
  createData.writeBigUInt64LE(amount, offset); offset += 8;
  createData.writeBigUInt64LE(expiry, offset);
  
  try {
    const createIx = new TransactionInstruction({
      keys: getStandardAccounts(payer),
      programId: DEVNET_PMP_PROGRAM_ID,
      data: createData,
    });
    
    const sig1 = await sendAndConfirmTransaction(
      connection, 
      new Transaction().add(createIx), 
      [payer]
    );
    console.log(`✅ Escrow created: ${sig1.slice(0, 20)}...`);
    results.push({ step: 'CREATE', pass: true, sig: sig1 });
  } catch (err) {
    console.log(`❌ Create failed: ${err.message?.slice(0, 60)}`);
    results.push({ step: 'CREATE', pass: false, error: err.message });
  }
  
  await sleep(1000);
  
  // 2. Release Escrow  
  console.log('\n🔓 Releasing escrow...');
  
  const releaseData = Buffer.alloc(1 + 1 + 32 + 32);
  offset = 0;
  releaseData.writeUInt8(TAG.VSL_ESCROW_RELEASE, offset++);
  releaseData.writeUInt8(0x01, offset++);
  escrowId.copy(releaseData, offset); offset += 32;
  randomBytes(32).copy(releaseData, offset); // release proof
  
  try {
    const releaseIx = new TransactionInstruction({
      keys: getStandardAccounts(payer),
      programId: DEVNET_PMP_PROGRAM_ID,
      data: releaseData,
    });
    
    const sig2 = await sendAndConfirmTransaction(
      connection,
      new Transaction().add(releaseIx),
      [payer]
    );
    console.log(`✅ Escrow released: ${sig2.slice(0, 20)}...`);
    results.push({ step: 'RELEASE', pass: true, sig: sig2 });
  } catch (err) {
    console.log(`❌ Release failed: ${err.message?.slice(0, 60)}`);
    results.push({ step: 'RELEASE', pass: false, error: err.message });
  }
  
  return results;
}

async function testPoolWorkflow(connection, payer) {
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('TEST: Pool Workflow (Create → Deposit → Withdraw)');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  const results = [];
  
  const poolId = randomBytes(32);
  const amount = BigInt(100000);
  
  console.log('🏊 Creating pool...');
  console.log(`   Pool ID: ${poolId.toString('hex').slice(0, 16)}...`);
  
  // 1. Create Pool
  const createData = Buffer.alloc(1 + 1 + 32 + 8 + 32);
  let offset = 0;
  createData.writeUInt8(TAG.POOL_CREATE, offset++);
  createData.writeUInt8(0x01, offset++);
  poolId.copy(createData, offset); offset += 32;
  createData.writeBigUInt64LE(amount, offset); offset += 8;
  randomBytes(32).copy(createData, offset); // config
  
  try {
    const sig = await sendAndConfirmTransaction(
      connection,
      new Transaction().add(new TransactionInstruction({
        keys: getStandardAccounts(payer),
        programId: DEVNET_PMP_PROGRAM_ID,
        data: createData,
      })),
      [payer]
    );
    console.log(`✅ Pool created: ${sig.slice(0, 20)}...`);
    results.push({ step: 'CREATE', pass: true, sig });
  } catch (err) {
    console.log(`❌ Create failed: ${err.message?.slice(0, 60)}`);
    results.push({ step: 'CREATE', pass: false });
  }
  
  await sleep(1000);
  
  // 2. Deposit
  console.log('\n💰 Depositing to pool...');
  
  const depositData = Buffer.alloc(1 + 1 + 32 + 8 + 32);
  offset = 0;
  depositData.writeUInt8(TAG.POOL_DEPOSIT, offset++);
  depositData.writeUInt8(0x01, offset++);
  poolId.copy(depositData, offset); offset += 32;
  depositData.writeBigUInt64LE(amount, offset); offset += 8;
  randomBytes(32).copy(depositData, offset);
  
  try {
    const sig = await sendAndConfirmTransaction(
      connection,
      new Transaction().add(new TransactionInstruction({
        keys: getStandardAccounts(payer),
        programId: DEVNET_PMP_PROGRAM_ID,
        data: depositData,
      })),
      [payer]
    );
    console.log(`✅ Deposit completed: ${sig.slice(0, 20)}...`);
    results.push({ step: 'DEPOSIT', pass: true, sig });
  } catch (err) {
    console.log(`❌ Deposit failed: ${err.message?.slice(0, 60)}`);
    results.push({ step: 'DEPOSIT', pass: false });
  }
  
  await sleep(1000);
  
  // 3. Withdraw
  console.log('\n📤 Withdrawing from pool...');
  
  const withdrawData = Buffer.alloc(1 + 1 + 32 + 8 + 32);
  offset = 0;
  withdrawData.writeUInt8(TAG.POOL_WITHDRAW, offset++);
  withdrawData.writeUInt8(0x01, offset++);
  poolId.copy(withdrawData, offset); offset += 32;
  withdrawData.writeBigUInt64LE(amount / 2n, offset); offset += 8;
  randomBytes(32).copy(withdrawData, offset);
  
  try {
    const sig = await sendAndConfirmTransaction(
      connection,
      new Transaction().add(new TransactionInstruction({
        keys: getStandardAccounts(payer),
        programId: DEVNET_PMP_PROGRAM_ID,
        data: withdrawData,
      })),
      [payer]
    );
    console.log(`✅ Withdraw completed: ${sig.slice(0, 20)}...`);
    results.push({ step: 'WITHDRAW', pass: true, sig });
  } catch (err) {
    console.log(`❌ Withdraw failed: ${err.message?.slice(0, 60)}`);
    results.push({ step: 'WITHDRAW', pass: false });
  }
  
  return results;
}

async function testAMMWorkflow(connection, payer) {
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('TEST: AMM Workflow (Create Pool → Add Liquidity → Swap)');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  const results = [];
  
  const poolId = keccakHash(randomBytes(32));
  const tokenA = randomBytes(32);
  const tokenB = randomBytes(32);
  
  console.log('🏦 Creating AMM pool...');
  
  // 1. Create AMM Pool
  const createData = Buffer.alloc(1 + 1 + 32 + 32 + 32 + 8);
  let offset = 0;
  createData.writeUInt8(TAG.AMM_POOL_CREATE, offset++);
  createData.writeUInt8(0x01, offset++);
  poolId.copy(createData, offset); offset += 32;
  tokenA.copy(createData, offset); offset += 32;
  tokenB.copy(createData, offset); offset += 32;
  createData.writeBigUInt64LE(BigInt(30), offset); // 0.3% fee
  
  try {
    const sig = await sendAndConfirmTransaction(
      connection,
      new Transaction().add(new TransactionInstruction({
        keys: getStandardAccounts(payer),
        programId: DEVNET_PMP_PROGRAM_ID,
        data: createData,
      })),
      [payer]
    );
    console.log(`✅ AMM Pool created: ${sig.slice(0, 20)}...`);
    results.push({ step: 'CREATE_AMM', pass: true, sig });
  } catch (err) {
    console.log(`❌ Create failed: ${err.message?.slice(0, 60)}`);
    results.push({ step: 'CREATE_AMM', pass: false });
  }
  
  await sleep(1000);
  
  // 2. Add Liquidity
  console.log('\n💧 Adding liquidity...');
  
  const addLiqData = Buffer.alloc(1 + 1 + 32 + 8 + 8);
  offset = 0;
  addLiqData.writeUInt8(TAG.AMM_ADD_LIQUIDITY, offset++);
  addLiqData.writeUInt8(0x01, offset++);
  poolId.copy(addLiqData, offset); offset += 32;
  addLiqData.writeBigUInt64LE(BigInt(100000), offset); offset += 8; // amount A
  addLiqData.writeBigUInt64LE(BigInt(100000), offset); // amount B
  
  try {
    const sig = await sendAndConfirmTransaction(
      connection,
      new Transaction().add(new TransactionInstruction({
        keys: getStandardAccounts(payer),
        programId: DEVNET_PMP_PROGRAM_ID,
        data: addLiqData,
      })),
      [payer]
    );
    console.log(`✅ Liquidity added: ${sig.slice(0, 20)}...`);
    results.push({ step: 'ADD_LIQUIDITY', pass: true, sig });
  } catch (err) {
    console.log(`❌ Add liquidity failed: ${err.message?.slice(0, 60)}`);
    results.push({ step: 'ADD_LIQUIDITY', pass: false });
  }
  
  await sleep(1000);
  
  // 3. Swap
  console.log('\n🔄 Executing swap...');
  
  const swapData = Buffer.alloc(1 + 1 + 32 + 8 + 8 + 1);
  offset = 0;
  swapData.writeUInt8(TAG.AMM_SWAP, offset++);
  swapData.writeUInt8(0x01, offset++);
  poolId.copy(swapData, offset); offset += 32;
  swapData.writeBigUInt64LE(BigInt(1000), offset); offset += 8; // amount in
  swapData.writeBigUInt64LE(BigInt(990), offset); offset += 8; // min out
  swapData.writeUInt8(0, offset); // direction
  
  try {
    const sig = await sendAndConfirmTransaction(
      connection,
      new Transaction().add(new TransactionInstruction({
        keys: getStandardAccounts(payer),
        programId: DEVNET_PMP_PROGRAM_ID,
        data: swapData,
      })),
      [payer]
    );
    console.log(`✅ Swap completed: ${sig.slice(0, 20)}...`);
    results.push({ step: 'SWAP', pass: true, sig });
  } catch (err) {
    console.log(`❌ Swap failed: ${err.message?.slice(0, 60)}`);
    results.push({ step: 'SWAP', pass: false });
  }
  
  return results;
}

async function testNullifierWorkflow(connection, payer) {
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('TEST: Nullifier Workflow (Create → Check)');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  const results = [];
  
  const nullifier = keccakHash(randomBytes(32));
  
  console.log('🔒 Creating nullifier...');
  console.log(`   Nullifier: ${nullifier.toString('hex').slice(0, 16)}...`);
  
  // 1. Create Nullifier
  const createData = Buffer.alloc(1 + 1 + 32);
  createData.writeUInt8(TAG.NULLIFIER_CREATE, 0);
  createData.writeUInt8(0x01, 1);
  nullifier.copy(createData, 2);
  
  try {
    const sig = await sendAndConfirmTransaction(
      connection,
      new Transaction().add(new TransactionInstruction({
        keys: getStandardAccounts(payer),
        programId: DEVNET_PMP_PROGRAM_ID,
        data: createData,
      })),
      [payer]
    );
    console.log(`✅ Nullifier created: ${sig.slice(0, 20)}...`);
    results.push({ step: 'CREATE', pass: true, sig });
  } catch (err) {
    console.log(`❌ Create failed: ${err.message?.slice(0, 60)}`);
    results.push({ step: 'CREATE', pass: false });
  }
  
  await sleep(1000);
  
  // 2. Check Nullifier
  console.log('\n🔍 Checking nullifier...');
  
  const checkData = Buffer.alloc(1 + 1 + 32);
  checkData.writeUInt8(TAG.NULLIFIER_CHECK, 0);
  checkData.writeUInt8(0x01, 1);
  nullifier.copy(checkData, 2);
  
  try {
    const sig = await sendAndConfirmTransaction(
      connection,
      new Transaction().add(new TransactionInstruction({
        keys: getStandardAccounts(payer),
        programId: DEVNET_PMP_PROGRAM_ID,
        data: checkData,
      })),
      [payer]
    );
    console.log(`✅ Nullifier checked: ${sig.slice(0, 20)}...`);
    results.push({ step: 'CHECK', pass: true, sig });
  } catch (err) {
    console.log(`❌ Check failed: ${err.message?.slice(0, 60)}`);
    results.push({ step: 'CHECK', pass: false });
  }
  
  return results;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const connection = new Connection(DEVNET_RPC, 'confirmed');
  
  // Safety check
  const genesisHash = await connection.getGenesisHash();
  if (genesisHash === '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d') {
    console.error('🛑 MAINNET DETECTED - ABORTING');
    process.exit(1);
  }
  
  const payer = loadTestWallet();
  const balance = await connection.getBalance(payer.publicKey);
  
  console.log(`✅ Connected to devnet`);
  console.log(`   Wallet: ${payer.publicKey.toString()}`);
  console.log(`   Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  
  const allResults = {
    escrow: await testEscrowWorkflow(connection, payer),
    pool: await testPoolWorkflow(connection, payer),
    amm: await testAMMWorkflow(connection, payer),
    nullifier: await testNullifierWorkflow(connection, payer),
  };
  
  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('📊 STATEFUL OPERATIONS TEST SUMMARY');
  console.log('═'.repeat(70));
  
  let totalPass = 0;
  let totalFail = 0;
  
  for (const [workflow, results] of Object.entries(allResults)) {
    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass).length;
    totalPass += passed;
    totalFail += failed;
    
    const status = failed === 0 ? '✅' : (passed > 0 ? '🔄' : '❌');
    console.log(`${status} ${workflow.toUpperCase().padEnd(15)} ${passed}/${results.length} steps passed`);
  }
  
  console.log('─'.repeat(70));
  console.log(`TOTAL: ${totalPass + totalFail} steps | PASSED: ${totalPass} | FAILED: ${totalFail}`);
  
  const endBalance = await connection.getBalance(payer.publicKey);
  console.log(`\n💰 Spent: ${((balance - endBalance) / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log(`   Remaining: ${(endBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  
  // Save log
  fs.writeFileSync('PMP_STATEFUL_TEST_LOG.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    network: 'devnet',
    results: allResults,
    passed: totalPass,
    failed: totalFail,
  }, null, 2));
  
  console.log('\n📝 Log saved to PMP_STATEFUL_TEST_LOG.json');
  console.log('\n✅ Safety: All tests on DEVNET only\n');
}

main().catch(console.error);
