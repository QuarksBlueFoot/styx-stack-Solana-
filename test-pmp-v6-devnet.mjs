/**
 * PMP v6 Devnet Integration Test
 * 
 * Tests the new Proof of Innocence features:
 * - TAG_INNOCENCE_MINT (54)
 * - TAG_INNOCENCE_VERIFY (55)
 * - TAG_CLEAN_SOURCE_PROVE (58)
 * - TAG_TEMPORAL_INNOCENCE (59)
 * - TAG_PROVENANCE_COMMIT (62)
 * 
 * Also tests existing features for regression:
 * - TAG_PRIVATE_MESSAGE (3)
 * - TAG_DECOY_STORM (44)
 * - TAG_CHRONO_LOCK (48)
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
const DEVNET_PMP_PROGRAM_ID = new PublicKey('FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW');
const TREASURY = new PublicKey('13xnC9kDksJMBE9FYVW1S7dukLjRDgrh4Dzm6eq5moon');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Load devnet test keypair from repo
const keypairData = JSON.parse(fs.readFileSync(new URL('./.devnet/test-wallet.json', import.meta.url), 'utf8'));
const payer = Keypair.fromSecretKey(Uint8Array.from(keypairData));

console.log('🧪 PMP v6 Devnet Integration Test');
console.log('==================================');
console.log(`Program ID: ${DEVNET_PMP_PROGRAM_ID.toBase58()}`);
console.log(`Payer: ${payer.publicKey.toBase58()}`);
console.log(`Treasury: ${TREASURY.toBase58()}`);
console.log('');

// Instruction tags
const TAG_PRIVATE_MESSAGE = 3;
const TAG_DECOY_STORM = 44;
const TAG_CHRONO_LOCK = 48;
const TAG_INNOCENCE_MINT = 54;
const TAG_INNOCENCE_VERIFY = 55;
const TAG_CLEAN_SOURCE_PROVE = 58;
const TAG_TEMPORAL_INNOCENCE = 59;
const TAG_PROVENANCE_COMMIT = 62;

// Source types
const SOURCE_TYPE_CEX = 1;
const SOURCE_TYPE_DEFI = 2;

function keccak256(data) {
  return createHash('sha3-256').update(Buffer.from(data)).digest();
}

async function testPrivateMessage() {
  console.log('\n📨 Test 1: Private Message (TAG 3) - Regression Test');
  console.log('---------------------------------------------------');
  
  const recipient = Keypair.generate().publicKey;
  const message = Buffer.from('Hello from PMP v6 devnet test!');
  const encryptedMessage = Buffer.alloc(64);
  message.copy(encryptedMessage);
  
  // Format: [tag:1][flags:1][recipient:32][encrypted:64]
  const data = Buffer.alloc(98);
  data[0] = TAG_PRIVATE_MESSAGE;
  data[1] = 0x01; // FLAG_ENCRYPTED
  recipient.toBuffer().copy(data, 2);
  encryptedMessage.copy(data, 34);
  
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
  
  try {
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
    console.log(`✅ Private message sent! Sig: ${sig.slice(0, 20)}...`);
    return true;
  } catch (e) {
    console.log(`❌ Failed: ${e.message}`);
    return false;
  }
}

async function testDecoyStorm() {
  console.log('\n🎭 Test 2: Decoy Storm (TAG 44) - Plausible Deniability');
  console.log('--------------------------------------------------------');
  
  const decoyCount = 5;
  const encryptedRealIndex = 2; // Encrypted - only sender knows
  const nonce = randomBytes(12);
  const commitment = randomBytes(32);
  
  // Each decoy is 64 bytes of encrypted payload
  const payloadsLen = decoyCount * 64;
  
  // Format: [tag:1][decoy_count:1][encrypted_index:1][payloads:N*64][nonce:12][commitment:32]
  const data = Buffer.alloc(3 + payloadsLen + 12 + 32);
  data[0] = TAG_DECOY_STORM;
  data[1] = decoyCount;
  data[2] = encryptedRealIndex;
  
  // Fill in decoy payloads (each 64 bytes)
  for (let i = 0; i < decoyCount; i++) {
    randomBytes(64).copy(data, 3 + i * 64);
  }
  
  nonce.copy(data, 3 + payloadsLen);
  commitment.copy(data, 3 + payloadsLen + 12);
  
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
  
  try {
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
    console.log(`✅ Decoy storm created! ${decoyCount} decoys, encrypted index ${encryptedRealIndex}`);
    console.log(`   Sig: ${sig.slice(0, 20)}...`);
    return true;
  } catch (e) {
    console.log(`❌ Failed: ${e.message}`);
    return false;
  }
}

async function testChronoLock() {
  console.log('\n⏰ Test 3: Chrono Lock (TAG 48) - Temporal Privacy');
  console.log('---------------------------------------------------');
  
  const slot = await connection.getSlot();
  const unlockSlot = BigInt(slot + 100); // Unlock in ~40 seconds
  const encryptedContent = Buffer.alloc(64);
  Buffer.from('Secret message unlocked at future slot!').copy(encryptedContent);
  const commitment = randomBytes(32);
  
  // Format: [tag:1][unlock_slot:8][encrypted_content:N][commitment:32]
  const contentLen = encryptedContent.length;
  const data = Buffer.alloc(1 + 8 + contentLen + 32);
  data[0] = TAG_CHRONO_LOCK;
  data.writeBigUInt64LE(unlockSlot, 1);
  encryptedContent.copy(data, 9);
  commitment.copy(data, 9 + contentLen);
  
  // Handler expects signer at accounts[2]
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false }, // signer at [2]
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
  
  try {
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
    console.log(`✅ Chrono lock created! Unlocks at slot ${unlockSlot}`);
    console.log(`   Current slot: ${slot}`);
    console.log(`   Sig: ${sig.slice(0, 20)}...`);
    return true;
  } catch (e) {
    console.log(`❌ Failed: ${e.message}`);
    return false;
  }
}

async function testInnocenceMint() {
  console.log('\n🛡️ Test 4: Innocence Mint (TAG 54) - Proof of Innocence');
  console.log('--------------------------------------------------------');
  
  const sourceType = SOURCE_TYPE_CEX; // Claiming from CEX
  const sourceCommit = keccak256(Buffer.concat([
    Buffer.from('coinbase_kyc_data'),
    payer.publicKey.toBuffer(),
    Buffer.from(Date.now().toString()),
  ]));
  const validitySlots = BigInt(6480000); // ~30 days
  const attestor = Keypair.generate().publicKey; // Mock attestor
  const attestationSig = randomBytes(64); // Mock signature
  
  // Format: [tag:1][source_type:1][source_commit:32][validity_slots:8]
  //         [attestor:32][attestation_sig:64]
  const data = Buffer.alloc(138);
  data[0] = TAG_INNOCENCE_MINT;
  data[1] = sourceType;
  sourceCommit.copy(data, 2);
  data.writeBigUInt64LE(validitySlots, 34);
  attestor.toBuffer().copy(data, 42);
  attestationSig.copy(data, 74);
  
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
  
  try {
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
    console.log(`✅ Innocence NFT minted! Source: CEX`);
    console.log(`   Attestor: ${attestor.toBase58().slice(0, 8)}...`);
    console.log(`   Sig: ${sig.slice(0, 20)}...`);
    return true;
  } catch (e) {
    console.log(`❌ Failed: ${e.message}`);
    return false;
  }
}

async function testCleanSourceProve() {
  console.log('\n🌿 Test 5: Clean Source Prove (TAG 58) - Whitelist Proof');
  console.log('---------------------------------------------------------');
  
  const sourceId = keccak256(Buffer.from('known_clean_cex_source'));
  const amount = BigInt(1000000000); // 1 SOL
  const merkleRoot = randomBytes(32); // Mock merkle root
  const proofLen = 3;
  const merkleProof = Buffer.alloc(proofLen * 32);
  for (let i = 0; i < proofLen; i++) {
    randomBytes(32).copy(merkleProof, i * 32);
  }
  
  // Format: [tag:1][source_id:32][amount:8][merkle_root:32]
  //         [merkle_proof_len:1][merkle_proof:32*N]
  const data = Buffer.alloc(74 + proofLen * 32);
  data[0] = TAG_CLEAN_SOURCE_PROVE;
  sourceId.copy(data, 1);
  data.writeBigUInt64LE(amount, 33);
  merkleRoot.copy(data, 41);
  data[73] = proofLen;
  merkleProof.copy(data, 74);
  
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
  
  try {
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
    console.log(`✅ Clean source proven! Amount: ${Number(amount) / 1e9} SOL`);
    console.log(`   Proof depth: ${proofLen}`);
    console.log(`   Sig: ${sig.slice(0, 20)}...`);
    return true;
  } catch (e) {
    console.log(`❌ Failed: ${e.message}`);
    return false;
  }
}

async function testTemporalInnocence() {
  console.log('\n⏳ Test 6: Temporal Innocence (TAG 59) - Time-Based Absolution');
  console.log('--------------------------------------------------------------');
  
  const depositSlot = BigInt((await connection.getSlot()) - 1000); // Deposited 1000 slots ago
  const depositTxSig = randomBytes(64); // Mock tx signature
  const blacklistRoot = randomBytes(32); // Mock blacklist root
  const blacklistSnapshotSlot = BigInt((await connection.getSlot()) - 500); // Blacklist updated 500 slots ago
  
  // Since depositSlot < blacklistSnapshotSlot, we should be temporally innocent!
  
  // Format: [tag:1][deposit_slot:8][deposit_tx_sig:64][blacklist_root:32]
  //         [blacklist_snapshot_slot:8]
  const data = Buffer.alloc(113);
  data[0] = TAG_TEMPORAL_INNOCENCE;
  data.writeBigUInt64LE(depositSlot, 1);
  depositTxSig.copy(data, 9);
  blacklistRoot.copy(data, 73);
  data.writeBigUInt64LE(blacklistSnapshotSlot, 105);
  
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
  
  try {
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
    console.log(`✅ Temporal innocence proven!`);
    console.log(`   Deposit slot: ${depositSlot} (before blacklist)`);
    console.log(`   Blacklist slot: ${blacklistSnapshotSlot}`);
    console.log(`   Verdict: INNOCENT (deposit predates taint)`);
    console.log(`   Sig: ${sig.slice(0, 20)}...`);
    return true;
  } catch (e) {
    console.log(`❌ Failed: ${e.message}`);
    return false;
  }
}

async function testProvenanceCommit() {
  console.log('\n🔗 Test 7: Provenance Commit (TAG 62) - Chain of Custody');
  console.log('---------------------------------------------------------');
  
  const sourceInnocenceId = keccak256(Buffer.from('innocence_nft_id'));
  const amount = BigInt(5000000000); // 5 SOL
  const provenanceSecret = randomBytes(32);
  
  // Format: [tag:1][source_innocence_id:32][amount:8][provenance_secret:32]
  const data = Buffer.alloc(73);
  data[0] = TAG_PROVENANCE_COMMIT;
  sourceInnocenceId.copy(data, 1);
  data.writeBigUInt64LE(amount, 33);
  provenanceSecret.copy(data, 41);
  
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: DEVNET_PMP_PROGRAM_ID,
    data,
  });
  
  try {
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
    console.log(`✅ Provenance chain started! Depth: 0 (origin)`);
    console.log(`   Amount: ${Number(amount) / 1e9} SOL`);
    console.log(`   Sig: ${sig.slice(0, 20)}...`);
    return true;
  } catch (e) {
    console.log(`❌ Failed: ${e.message}`);
    return false;
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================
async function main() {
  console.log('\n🚀 Starting PMP v6 Devnet Tests...\n');
  
  const balance = await connection.getBalance(payer.publicKey);
  console.log(`💰 Payer balance: ${balance / 1e9} SOL`);
  
  const results = {
    privateMessage: await testPrivateMessage(),
    decoyStorm: await testDecoyStorm(),
    chronoLock: await testChronoLock(),
    innocenceMint: await testInnocenceMint(),
    cleanSourceProve: await testCleanSourceProve(),
    temporalInnocence: await testTemporalInnocence(),
    provenanceCommit: await testProvenanceCommit(),
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
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
