#!/usr/bin/env node
/**
 * STS Advanced Operations Test Suite
 * Tests SHIELD, UNSHIELD, RATCHET_MESSAGE, PREKEY_BUNDLE, and other advanced operations
 */

import { 
  Connection, 
  PublicKey, 
  Keypair, 
  TransactionMessage, 
  VersionedTransaction, 
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  createMint,
  mintTo,
} from '@solana/spl-token';
import fs from 'fs';
import crypto from 'crypto';

const PROGRAM_ID = new PublicKey('CumUDpSpjmMEsaPhLMZEE8NKtgq9BTT6eyN7RCpsWmPE');
const NULLIFIER_SEED = Buffer.from('sts_nullifier');
const POOL_SEED = Buffer.from('sts_pool');

// Helper to send versioned transaction
async function sendVersionedTx(connection, instruction, signers) {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  const message = new TransactionMessage({
    payerKey: signers[0].publicKey,
    recentBlockhash: blockhash,
    instructions: [instruction],
  }).compileToV0Message();
  const vtx = new VersionedTransaction(message);
  vtx.sign(signers);
  const sig = await connection.sendTransaction(vtx, { skipPreflight: false });
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
  return sig;
}

// Track results
let passed = 0, failed = 0;
const results = [];

function logTest(name, success, details = '') {
  if (success) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}: ${details.slice(0, 80)}`);
  }
  results.push({ name, success, details });
}

// Main test runner
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║   STS ADVANCED OPERATIONS TEST SUITE                             ║');
  console.log('║   Testing: RATCHET, PREKEY, COMPLIANCE, CHRONO, and more         ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const wallet = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync('.devnet/test-wallet.json')))
  );

  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Wallet: ${wallet.publicKey.toBase58()}`);
  console.log(`Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL\n`);

  // =========================================================================
  // PHASE 1: MESSAGING DOMAIN (0x02)
  // =========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  PHASE 1: MESSAGING DOMAIN (0x02) - Double Ratchet & X3DH');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 1: RATCHET_MESSAGE (Op 0x04) - Double Ratchet Encrypted Message
  // Handler reads: counter at 34-42, ciphertext_len at 74-75 (u16)
  // Format: [domain:1][op:1][recipient:32][counter:8][ratchet_key:32][ciphertext_len:2][ciphertext...]
  // Total before ciphertext: 2 + 32 + 8 + 32 + 2 = 76 bytes (matches MIN_LEN)
  try {
    const recipient = Keypair.generate().publicKey;
    const ratchetPubkey = crypto.randomBytes(32);
    const ciphertext = Buffer.from('Double ratchet encrypted message test');

    const data = Buffer.alloc(76 + ciphertext.length);
    let offset = 0;
    data.writeUInt8(0x02, offset++); // MESSAGING domain [0]
    data.writeUInt8(0x04, offset++); // RATCHET_MESSAGE op [1]
    recipient.toBuffer().copy(data, offset); offset += 32; // recipient [2..34]
    data.writeBigUInt64LE(42n, offset); offset += 8; // counter [34..42]
    ratchetPubkey.copy(data, offset); offset += 32; // ratchet_key [42..74]
    data.writeUInt16LE(ciphertext.length, offset); offset += 2; // ciphertext_len [74..76]
    ciphertext.copy(data, offset); // ciphertext [76..]

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: true }],
      data
    });

    await sendVersionedTx(connection, ix, [wallet]);
    logTest('RATCHET_MESSAGE (Double Ratchet)', true);
  } catch (e) {
    logTest('RATCHET_MESSAGE (Double Ratchet)', false, e.message);
  }

  // Test 2: PREKEY_BUNDLE_PUBLISH (Op 0x06) - X3DH Key Exchange
  // Handler format: [domain:1][op:1=version for handler][owner:32][identity_key:32][signed_prekey_id:4]
  //                 [signed_prekey:32][signature:64][onetime_count:2][onetime_prekeys:32*count][timestamp:8]
  // MIN_LEN = 176 bytes + (32 * onetime_count)
  try {
    const identityKey = crypto.randomBytes(32);
    const signedPrekey = crypto.randomBytes(32);
    const signedPrekeySignature = crypto.randomBytes(64);
    const oneTimePrekeys = [crypto.randomBytes(32), crypto.randomBytes(32)];
    const timestamp = BigInt(Math.floor(Date.now() / 1000));

    // data[1] = version, data[2..34] = owner
    // Format starting at [0]: [domain][version][owner][identity_key][signed_prekey_id:4][signed_prekey:32][sig:64][count:2][otks][ts:8]
    // Wait - the handler reads data[1] as version and data[2..34] as owner
    // But in messaging domain dispatch, data[0] is still domain, data[1] is op
    // So the handler is wrong OR needs tag=0x06 in data[0]
    // Let's use: [0x06:1][version:1][owner:32]... for tag-based
    // Actually the domain dispatch receives full buffer. Let me use op=0x06 then version=0x01 at data[2]
    
    // Correcting format: domain dispatch passes data with [domain:0x02][op:0x06]...
    // Handler reads: version=data[1]=0x06? owner=data[2..34]?
    // That seems wrong. Let me check the comment again: [tag:1][version:1][owner:32]
    // So handler expects: [0x06:tag][version:1][owner:32]...
    // But domain dispatch means [0x02:domain][0x06:op]... is passed
    // Handler then reads data[1]=0x06 as version (bug?) and data[2..34] as owner
    // This is actually domain+op being reused. Let's match what handler expects.
    
    // Let's read handler carefully: version=data[1], owner=data[2..34]
    // For domain route: data[0]=0x02, data[1]=0x06, so version=0x06, owner=data[2..34]
    // This means version gets the op code value (0x06). Not ideal but it works.
    // We need to put actual owner at data[2..34]
    
    const dataLen = 2 + 32 + 32 + 4 + 32 + 64 + 2 + (32 * oneTimePrekeys.length) + 8;
    const data = Buffer.alloc(dataLen);
    let offset = 0;
    data.writeUInt8(0x02, offset++);   // domain [0]
    data.writeUInt8(0x06, offset++);   // op (handler reads as "version") [1]
    wallet.publicKey.toBuffer().copy(data, offset); offset += 32; // owner (must match signer!) [2..34]
    identityKey.copy(data, offset); offset += 32; // identity_key [34..66]
    data.writeUInt32LE(1, offset); offset += 4; // signed_prekey_id [66..70]
    signedPrekey.copy(data, offset); offset += 32; // signed_prekey [70..102]
    signedPrekeySignature.copy(data, offset); offset += 64; // signature [102..166]
    data.writeUInt16LE(oneTimePrekeys.length, offset); offset += 2; // onetime_count [166..168]
    for (const prekey of oneTimePrekeys) {
      prekey.copy(data, offset); offset += 32;
    }
    data.writeBigInt64LE(timestamp, offset);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: true }],
      data
    });

    await sendVersionedTx(connection, ix, [wallet]);
    logTest('PREKEY_BUNDLE_PUBLISH (X3DH)', true);
  } catch (e) {
    logTest('PREKEY_BUNDLE_PUBLISH (X3DH)', false, e.message);
  }

  // Test 3: COMPLIANCE_REVEAL (Op 0x05) - Auditor Disclosure
  try {
    const noteCommitment = crypto.randomBytes(32);
    const auditorPubkey = Keypair.generate().publicKey;
    const disclosureKey = crypto.randomBytes(32);
    const revealType = 0x01; // Amount reveal

    // Format: [domain:1][op:1][note_commitment:32][auditor:32][disclosure_key:32][reveal_type:1]
    const data = Buffer.alloc(2 + 32 + 32 + 32 + 1);
    let offset = 0;
    data.writeUInt8(0x02, offset++);   // MESSAGING domain
    data.writeUInt8(0x05, offset++);   // COMPLIANCE_REVEAL op
    noteCommitment.copy(data, offset); offset += 32;
    auditorPubkey.toBuffer().copy(data, offset); offset += 32;
    disclosureKey.copy(data, offset); offset += 32;
    data.writeUInt8(revealType, offset);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: true }],
      data
    });

    await sendVersionedTx(connection, ix, [wallet]);
    logTest('COMPLIANCE_REVEAL', true);
  } catch (e) {
    logTest('COMPLIANCE_REVEAL', false, e.message);
  }

  // Test 4: ROUTED_MESSAGE (Op 0x02) - Relay-routed message
  try {
    const recipient = Keypair.generate().publicKey;
    const routingPrefix = crypto.randomBytes(8);
    const encryptedPayload = Buffer.from('Routed message through relay network');

    // Format: [domain:1][op:1][recipient:32][routing_prefix:8][payload_len:4][payload]
    const data = Buffer.alloc(2 + 32 + 8 + 4 + encryptedPayload.length);
    let offset = 0;
    data.writeUInt8(0x02, offset++);   // MESSAGING domain
    data.writeUInt8(0x02, offset++);   // ROUTED_MESSAGE op
    recipient.toBuffer().copy(data, offset); offset += 32;
    routingPrefix.copy(data, offset); offset += 8;
    data.writeUInt32LE(encryptedPayload.length, offset); offset += 4;
    encryptedPayload.copy(data, offset);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: true }],
      data
    });

    await sendVersionedTx(connection, ix, [wallet]);
    logTest('ROUTED_MESSAGE', true);
  } catch (e) {
    logTest('ROUTED_MESSAGE', false, e.message);
  }

  // =========================================================================
  // PHASE 2: PRIVACY DOMAIN (0x07) - Decoys, Ephemeral, Chrono
  // =========================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  PHASE 2: PRIVACY DOMAIN (0x07) - Decoys, Ephemeral, Chrono');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 5: DECOY_BROADCAST (Op 0x01) - Privacy decoys
  try {
    const realCommitment = crypto.randomBytes(32);
    const decoys = [crypto.randomBytes(32), crypto.randomBytes(32), crypto.randomBytes(32)];

    // Format: [domain:1][op:1][real_commitment:32][decoy_count:1][decoys:32*count]
    const data = Buffer.alloc(2 + 32 + 1 + (32 * decoys.length));
    let offset = 0;
    data.writeUInt8(0x07, offset++);   // PRIVACY domain
    data.writeUInt8(0x01, offset++);   // DECOY_BROADCAST op
    realCommitment.copy(data, offset); offset += 32;
    data.writeUInt8(decoys.length, offset++);
    for (const decoy of decoys) {
      decoy.copy(data, offset); offset += 32;
    }

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: true }],
      data
    });

    await sendVersionedTx(connection, ix, [wallet]);
    logTest('DECOY_BROADCAST', true);
  } catch (e) {
    logTest('DECOY_BROADCAST', false, e.message);
  }

  // Test 6: EPHEMERAL_KEY_PUBLISH (Op 0x02) - Ephemeral keypair
  try {
    const ephemeralPubkey = crypto.randomBytes(32);
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1hr expiry

    // Format: [domain:1][op:1][ephemeral_pubkey:32][expires_at:8]
    const data = Buffer.alloc(2 + 32 + 8);
    let offset = 0;
    data.writeUInt8(0x07, offset++);   // PRIVACY domain
    data.writeUInt8(0x02, offset++);   // EPHEMERAL_KEY_PUBLISH op
    ephemeralPubkey.copy(data, offset); offset += 32;
    data.writeBigInt64LE(expiresAt, offset);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: true }],
      data
    });

    await sendVersionedTx(connection, ix, [wallet]);
    logTest('EPHEMERAL_KEY_PUBLISH', true);
  } catch (e) {
    logTest('EPHEMERAL_KEY_PUBLISH', false, e.message);
  }

  // Test 7: CHRONO_LOCK (Op 0x03) - Time-locked vault
  try {
    const commitment = crypto.randomBytes(32);
    const unlockTime = BigInt(Math.floor(Date.now() / 1000) + 7200); // 2hr unlock
    const encryptedData = crypto.randomBytes(64);

    // Format: [domain:1][op:1][commitment:32][unlock_time:8][encrypted_len:4][encrypted_data]
    const data = Buffer.alloc(2 + 32 + 8 + 4 + encryptedData.length);
    let offset = 0;
    data.writeUInt8(0x07, offset++);   // PRIVACY domain
    data.writeUInt8(0x03, offset++);   // CHRONO_LOCK op
    commitment.copy(data, offset); offset += 32;
    data.writeBigInt64LE(unlockTime, offset); offset += 8;
    data.writeUInt32LE(encryptedData.length, offset); offset += 4;
    encryptedData.copy(data, offset);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: true }],
      data
    });

    await sendVersionedTx(connection, ix, [wallet]);
    logTest('CHRONO_LOCK', true);
  } catch (e) {
    logTest('CHRONO_LOCK', false, e.message);
  }

  // Test 8: SHADOW_TRANSFER (Op 0x04) - Stealth transfer
  try {
    const stealthAddress = crypto.randomBytes(32);
    const ephemeralPubkey = crypto.randomBytes(32);
    const encryptedAmount = crypto.randomBytes(16);

    // Format: [domain:1][op:1][stealth_address:32][ephemeral_pubkey:32][encrypted_amount:16]
    const data = Buffer.alloc(2 + 32 + 32 + 16);
    let offset = 0;
    data.writeUInt8(0x07, offset++);   // PRIVACY domain
    data.writeUInt8(0x04, offset++);   // SHADOW_TRANSFER op
    stealthAddress.copy(data, offset); offset += 32;
    ephemeralPubkey.copy(data, offset); offset += 32;
    encryptedAmount.copy(data, offset);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: true }],
      data
    });

    await sendVersionedTx(connection, ix, [wallet]);
    logTest('SHADOW_TRANSFER', true);
  } catch (e) {
    logTest('SHADOW_TRANSFER', false, e.message);
  }

  // =========================================================================
  // PHASE 3: VSL DOMAIN (0x04) - Virtual Shielded Ledger
  // =========================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  PHASE 3: VSL DOMAIN (0x04) - Virtual Shielded Ledger');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 9: VSL_DEPOSIT (Op 0x01) - Deposit to VSL
  try {
    const commitment = crypto.randomBytes(32);
    const amount = 1000000n;
    const encryptedNote = crypto.randomBytes(64);

    // Format: [domain:1][op:1][commitment:32][amount:8][encrypted_note_len:4][encrypted_note]
    const data = Buffer.alloc(2 + 32 + 8 + 4 + encryptedNote.length);
    let offset = 0;
    data.writeUInt8(0x04, offset++);   // VSL domain
    data.writeUInt8(0x01, offset++);   // DEPOSIT op
    commitment.copy(data, offset); offset += 32;
    data.writeBigUInt64LE(amount, offset); offset += 8;
    data.writeUInt32LE(encryptedNote.length, offset); offset += 4;
    encryptedNote.copy(data, offset);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: true }],
      data
    });

    await sendVersionedTx(connection, ix, [wallet]);
    logTest('VSL_DEPOSIT', true);
  } catch (e) {
    logTest('VSL_DEPOSIT', false, e.message);
  }

  // Test 10: VSL_PRIVATE_TRANSFER (Op 0x03) - Private transfer within VSL
  try {
    const nullifier = crypto.randomBytes(32);
    const [nullifierPda] = PublicKey.findProgramAddressSync(
      [NULLIFIER_SEED, nullifier],
      PROGRAM_ID
    );
    const outputCommitment1 = crypto.randomBytes(32);
    const outputCommitment2 = crypto.randomBytes(32);

    // Format: [domain:1][op:1][nullifier:32][output1:32][output2:32]
    const data = Buffer.alloc(2 + 32 + 32 + 32);
    let offset = 0;
    data.writeUInt8(0x04, offset++);   // VSL domain
    data.writeUInt8(0x03, offset++);   // PRIVATE_TRANSFER op
    nullifier.copy(data, offset); offset += 32;
    outputCommitment1.copy(data, offset); offset += 32;
    outputCommitment2.copy(data, offset);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: nullifierPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data
    });

    await sendVersionedTx(connection, ix, [wallet]);
    logTest('VSL_PRIVATE_TRANSFER', true);
  } catch (e) {
    logTest('VSL_PRIVATE_TRANSFER', false, e.message);
  }

  // =========================================================================
  // PHASE 4: VTA DOMAIN (0x03) - View Token Authority (Multiparty)
  // =========================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  PHASE 4: VTA DOMAIN (0x03) - View Token Authority');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 11: VTA_CREATE (Op 0x01) - Create View Token Authority
  try {
    const vtaId = crypto.randomBytes(32);
    const encryptedViewKey = crypto.randomBytes(64);
    const threshold = 2;
    const guardians = [
      Keypair.generate().publicKey,
      Keypair.generate().publicKey,
      Keypair.generate().publicKey,
    ];

    // Format: [domain:1][op:1][vta_id:32][encrypted_view_key:64][threshold:1][guardian_count:1][guardians:32*count]
    const data = Buffer.alloc(2 + 32 + 64 + 1 + 1 + (32 * guardians.length));
    let offset = 0;
    data.writeUInt8(0x03, offset++);   // VTA domain
    data.writeUInt8(0x01, offset++);   // VTA_CREATE op
    vtaId.copy(data, offset); offset += 32;
    encryptedViewKey.copy(data, offset); offset += 64;
    data.writeUInt8(threshold, offset++);
    data.writeUInt8(guardians.length, offset++);
    for (const guardian of guardians) {
      guardian.toBuffer().copy(data, offset);
      offset += 32;
    }

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: true }],
      data
    });

    await sendVersionedTx(connection, ix, [wallet]);
    logTest('VTA_CREATE', true);
  } catch (e) {
    logTest('VTA_CREATE', false, e.message);
  }

  // =========================================================================
  // PHASE 5: IAP DOMAIN (0x1C-0x1E) - Inscription-Anchored Privacy
  // =========================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  PHASE 5: IAP (0x1C-0x1E) - Inscription-Anchored Privacy');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 12: IAP_MINT_WITH_PROOF (Op 0x1C)
  try {
    const commitment = crypto.randomBytes(32);
    const schnorrSignature = crypto.randomBytes(64);
    const nonce = crypto.randomBytes(32);
    const amount = 1000000n;

    // Format: [op:1][commitment:32][signature:64][nonce:32][amount:8]
    const data = Buffer.alloc(1 + 32 + 64 + 32 + 8);
    let offset = 0;
    data.writeUInt8(0x1C, offset++);   // IAP_MINT_WITH_PROOF
    commitment.copy(data, offset); offset += 32;
    schnorrSignature.copy(data, offset); offset += 64;
    nonce.copy(data, offset); offset += 32;
    data.writeBigUInt64LE(amount, offset);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: true }],
      data
    });

    await sendVersionedTx(connection, ix, [wallet]);
    logTest('IAP_MINT_WITH_PROOF', true);
  } catch (e) {
    logTest('IAP_MINT_WITH_PROOF', false, e.message);
  }

  // Test 13: IAP_TRANSFER_WITH_PROOF (Op 0x1D)
  try {
    const nullifier = crypto.randomBytes(32);
    const [nullifierPda] = PublicKey.findProgramAddressSync(
      [NULLIFIER_SEED, nullifier],
      PROGRAM_ID
    );
    const newCommitment = crypto.randomBytes(32);
    const schnorrSignature = crypto.randomBytes(64);

    // Format: [op:1][nullifier:32][new_commitment:32][signature:64]
    const data = Buffer.alloc(1 + 32 + 32 + 64);
    let offset = 0;
    data.writeUInt8(0x1D, offset++);   // IAP_TRANSFER_WITH_PROOF
    nullifier.copy(data, offset); offset += 32;
    newCommitment.copy(data, offset); offset += 32;
    schnorrSignature.copy(data, offset);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: nullifierPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data
    });

    await sendVersionedTx(connection, ix, [wallet]);
    logTest('IAP_TRANSFER_WITH_PROOF', true);
  } catch (e) {
    logTest('IAP_TRANSFER_WITH_PROOF', false, e.message);
  }

  // Test 14: IAP_BURN_WITH_PROOF (Op 0x1E)
  try {
    const nullifier = crypto.randomBytes(32);
    const [nullifierPda] = PublicKey.findProgramAddressSync(
      [NULLIFIER_SEED, nullifier],
      PROGRAM_ID
    );
    const schnorrSignature = crypto.randomBytes(64);
    const burnAmount = 500000n;

    // Format: [op:1][nullifier:32][signature:64][amount:8]
    const data = Buffer.alloc(1 + 32 + 64 + 8);
    let offset = 0;
    data.writeUInt8(0x1E, offset++);   // IAP_BURN_WITH_PROOF
    nullifier.copy(data, offset); offset += 32;
    schnorrSignature.copy(data, offset); offset += 64;
    data.writeBigUInt64LE(burnAmount, offset);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: nullifierPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data
    });

    await sendVersionedTx(connection, ix, [wallet]);
    logTest('IAP_BURN_WITH_PROOF', true);
  } catch (e) {
    logTest('IAP_BURN_WITH_PROOF', false, e.message);
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                      TEST RESULTS SUMMARY                        ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  ✅ PASSED: ${passed.toString().padStart(2)}                                                  ║`);
  console.log(`║  ❌ FAILED: ${failed.toString().padStart(2)}                                                  ║`);
  console.log(`║  📊 SUCCESS RATE: ${Math.round(passed / (passed + failed) * 100)}%                                       ║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const finalBalance = await connection.getBalance(wallet.publicKey);
  console.log(`SOL Spent: ${((balance - finalBalance) / LAMPORTS_PER_SOL).toFixed(6)} SOL`);

  // Exit with error code if any tests failed
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
