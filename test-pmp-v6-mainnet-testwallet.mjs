/**
 * PMP v6 COMPREHENSIVE MAINNET Test Suite
 * 
 * Tests ALL 62 instruction tags (3-64) on MAINNET
 * 
 * ⚠️  MAINNET - Real SOL costs! Each tx ~0.000005 SOL
 * 
 * Mainnet PMP: GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9
 * Treasury: 13xnC9kDksJMBE9FYVW1S7dukLjRDgrh4Dzm6eq5moon
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
import sha3 from 'js-sha3';
const keccak256Hash = sha3.keccak256;
import fs from 'fs';

// ============================================================================
// MAINNET CONFIG
// ============================================================================
const MAINNET_PMP_PROGRAM_ID = new PublicKey('GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9');
const TREASURY = new PublicKey('13xnC9kDksJMBE9FYVW1S7dukLjRDgrh4Dzm6eq5moon');
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// Load mainnet keypair - styxdeploy wallet with funds
const keypairPath = process.env.TEST_WALLET || "/workspaces/StyxStack/.devnet/test-wallet.json";
const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
const payer = Keypair.fromSecretKey(Uint8Array.from(keypairData));

console.log('🚀 PMP v6 COMPREHENSIVE MAINNET Test Suite');
console.log('============================================');
console.log(`Program ID: ${MAINNET_PMP_PROGRAM_ID.toBase58()}`);
console.log(`Payer: ${payer.publicKey.toBase58()}`);
console.log(`Network: MAINNET (real SOL costs!)`);
console.log('');
console.log('');

// ============================================================================
// ALL INSTRUCTION TAGS
// ============================================================================
const TAGS = {
  // Core Messaging (3-8)
  TAG_PRIVATE_MESSAGE: 3,
  TAG_ROUTED_MESSAGE: 4,
  TAG_PRIVATE_TRANSFER: 5,
  TAG_RATCHET_MESSAGE: 7,
  TAG_COMPLIANCE_REVEAL: 8,
  
  // Governance & VSL (9-13)
  TAG_PROPOSAL: 9,
  TAG_PRIVATE_VOTE: 10,
  TAG_VTA_TRANSFER: 11,
  TAG_REFERRAL_REGISTER: 12,
  TAG_REFERRAL_CLAIM: 13,
  
  // Inscribed Primitives (14-22)
  TAG_HASHLOCK_COMMIT: 14,
  TAG_HASHLOCK_REVEAL: 15,
  TAG_CONDITIONAL_COMMIT: 16,
  TAG_BATCH_SETTLE: 17,
  TAG_STATE_CHANNEL_OPEN: 18,
  TAG_STATE_CHANNEL_CLOSE: 19,
  TAG_TIME_CAPSULE: 20,
  TAG_GHOST_PDA: 21,
  TAG_CPI_INSCRIBE: 22,
  
  // VTA Advanced (23-31)
  TAG_VTA_DELEGATE: 23,
  TAG_VTA_REVOKE: 24,
  TAG_STEALTH_SWAP_INIT: 25,
  TAG_STEALTH_SWAP_EXEC: 26,
  TAG_VTA_GUARDIAN_SET: 27,
  TAG_VTA_GUARDIAN_RECOVER: 28,
  TAG_PRIVATE_SUBSCRIPTION: 29,
  TAG_MULTIPARTY_VTA_INIT: 30,
  TAG_MULTIPARTY_VTA_SIGN: 31,
  
  // VSL Extended (32-43)
  TAG_VSL_DEPOSIT: 32,
  TAG_VSL_WITHDRAW: 33,
  TAG_VSL_PRIVATE_TRANSFER: 34,
  TAG_VSL_PRIVATE_SWAP: 35,
  TAG_VSL_SHIELDED_SEND: 36,
  TAG_VSL_SPLIT: 37,
  TAG_VSL_MERGE: 38,
  TAG_VSL_ESCROW_CREATE: 39,
  TAG_VSL_ESCROW_RELEASE: 40,
  TAG_VSL_ESCROW_REFUND: 41,
  TAG_VSL_BALANCE_PROOF: 42,
  TAG_VSL_AUDIT_REVEAL: 43,
  
  // v6 World's First (44-53)
  TAG_DECOY_STORM: 44,
  TAG_DECOY_REVEAL: 45,
  TAG_EPHEMERAL_CREATE: 46,
  TAG_EPHEMERAL_DRAIN: 47,
  TAG_CHRONO_LOCK: 48,
  TAG_CHRONO_REVEAL: 49,
  TAG_SHADOW_FOLLOW: 50,
  TAG_SHADOW_UNFOLLOW: 51,
  TAG_PHANTOM_NFT_COMMIT: 52,
  TAG_PHANTOM_NFT_PROVE: 53,
  
  // Proof of Innocence (54-64)
  TAG_INNOCENCE_MINT: 54,
  TAG_INNOCENCE_VERIFY: 55,
  TAG_INNOCENCE_REVOKE: 56,
  TAG_CLEAN_SOURCE_REGISTER: 57,
  TAG_CLEAN_SOURCE_PROVE: 58,
  TAG_TEMPORAL_INNOCENCE: 59,
  TAG_COMPLIANCE_CHANNEL_OPEN: 60,
  TAG_COMPLIANCE_CHANNEL_REPORT: 61,
  TAG_PROVENANCE_COMMIT: 62,
  TAG_PROVENANCE_EXTEND: 63,
  TAG_PROVENANCE_VERIFY: 64,
};

// Use true Keccak-256 (NOT NIST SHA3-256!) - matches Solana's keccak_hash
function keccak256(data) {
  return Buffer.from(keccak256Hash.arrayBuffer(Buffer.from(data)));
}

// Standard accounts for fee-paying instructions
function getStandardAccounts() {
  return [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: TREASURY, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
}

// Extended accounts with signer at position 2 (for some handlers)
function getExtendedAccounts() {
  return [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: TREASURY, isSigner: false, isWritable: true },
    { pubkey: payer.publicKey, isSigner: true, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
}

// Extended accounts with signer at position 3 (for VSL handlers)
function getVSLAccounts() {
  return [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: TREASURY, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: payer.publicKey, isSigner: true, isWritable: false },
  ];
}

// Rate limiting for mainnet - 2 second delay between transactions
const TX_DELAY_MS = 2000;
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendInstruction(tag, data, accounts = null, description = '') {
  // Add delay before sending to avoid rate limits
  await delay(TX_DELAY_MS);
  
  const ix = new TransactionInstruction({
    keys: accounts || getStandardAccounts(),
    programId: MAINNET_PMP_PROGRAM_ID,
    data,
  });
  
  try {
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [payer], {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 5,
    });
    return { success: true, sig: sig.slice(0, 16) + '...', description };
  } catch (e) {
    return { success: false, error: e.message.slice(0, 80), description };
  }
}

// ============================================================================
// TEST FUNCTIONS FOR EACH CATEGORY
// ============================================================================

// --- Core Messaging (3-8) ---
async function testCoreMessaging() {
  console.log('\n📨 CORE MESSAGING (Tags 3-8)');
  console.log('─'.repeat(50));
  const results = [];
  
  // TAG 3: Private Message
  // Handler expects: [tag:1][flags:1][encrypted_recipient:32][sender:32][payload_len:2][payload:var]
  // MIN_LEN = 68
  {
    const data = Buffer.alloc(100); // 1+1+32+32+2+32 = 100
    data[0] = TAGS.TAG_PRIVATE_MESSAGE;
    data[1] = 0x01; // FLAG_ENCRYPTED
    Keypair.generate().publicKey.toBuffer().copy(data, 2);   // encrypted_recipient
    payer.publicKey.toBuffer().copy(data, 34);                // sender
    data.writeUInt16LE(32, 66);                               // payload_len
    randomBytes(32).copy(data, 68);                           // payload
    results.push(await sendInstruction(3, data, null, 'TAG_PRIVATE_MESSAGE'));
  }
  
  // TAG 4: Routed Message
  // Handler expects: [tag:1][flags:1][hop_count:1]...[payload_len@69-70:2][payload:N]
  // MIN_LEN = 71
  {
    const data = Buffer.alloc(75); // MIN_LEN + 4 bytes payload
    data[0] = TAGS.TAG_ROUTED_MESSAGE;
    data[1] = 0; // flags
    data[2] = 2; // hop_count
    Keypair.generate().publicKey.toBuffer().copy(data, 3);  // first hop
    data[35] = 0; // padding
    data[36] = 0; // current_hop (at position 36)
    Keypair.generate().publicKey.toBuffer().copy(data, 37); // encrypted part
    data.writeUInt16LE(4, 69);                              // payload_len at bytes 69-70
    randomBytes(4).copy(data, 71);                          // payload
    results.push(await sendInstruction(4, data, null, 'TAG_ROUTED_MESSAGE'));
  }
  
  // TAG 5: Private Transfer (Real SOL Transfer with Encrypted Amount)
  // Handler expects: [tag:1][flags:1][encrypted_recipient:32][sender:32][encrypted_amount:8][amount_nonce:8][memo_len:2]
  // MIN_LEN = 84
  // 
  // The handler:
  // 1. Computes: recipient = encrypted_recipient XOR keccak("STYX_META_V3" || sender)
  // 2. Computes: mask = keccak("STYX_XFER_V3" || sender || recipient || nonce)[0..8] as u64_le
  // 3. Computes: actual_amount = encrypted_amount XOR mask
  // 4. Performs: system_instruction::transfer(accounts[0], accounts[1], actual_amount)
  // 
  // Using proper Keccak-256 from js-sha3 (NOT NIST SHA3!)
  {
    // Create a real recipient (treasury to keep funds in ecosystem)
    const recipient = TREASURY;
    const sender = payer.publicKey;
    
    // Step 1: Encrypt recipient
    // encrypted_recipient = recipient XOR keccak("STYX_META_V3" || sender)
    const metaMask = keccak256(Buffer.concat([
      Buffer.from('STYX_META_V3'),
      sender.toBuffer()
    ]));
    const encryptedRecipient = Buffer.alloc(32);
    const recipientBytes = recipient.toBuffer();
    for (let i = 0; i < 32; i++) {
      encryptedRecipient[i] = recipientBytes[i] ^ metaMask[i];
    }
    
    // Step 2: Compute transfer mask
    // mask = keccak("STYX_XFER_V3" || sender || recipient || nonce)[0..8] as u64_le
    const nonce = Buffer.alloc(8);
    nonce.writeBigUInt64LE(BigInt(Date.now()), 0); // Use timestamp as nonce
    
    const transferMaskHash = keccak256(Buffer.concat([
      Buffer.from('STYX_XFER_V3'),
      sender.toBuffer(),
      recipient.toBuffer(),
      nonce
    ]));
    const mask = transferMaskHash.readBigUInt64LE(0);
    
    // Step 3: Encrypt amount (we want to transfer 1000 lamports = 0.000001 SOL)
    const desiredAmount = BigInt(1000);
    const encryptedAmount = desiredAmount ^ mask;
    
    // Build instruction data
    const data = Buffer.alloc(84);
    data[0] = TAGS.TAG_PRIVATE_TRANSFER;
    data[1] = 0x00; // flags
    encryptedRecipient.copy(data, 2);                       // encrypted_recipient
    sender.toBuffer().copy(data, 34);                       // sender
    data.writeBigUInt64LE(encryptedAmount, 66);             // encrypted_amount
    nonce.copy(data, 74);                                    // amount_nonce
    data.writeUInt16LE(0, 82);                               // memo_len = 0
    
    results.push(await sendInstruction(5, data, null, 'TAG_PRIVATE_TRANSFER'));
  }
  
  // TAG 7: Ratchet Message
  // Handler expects: [tag:1][...][@34:counter:8]...[ciphertext_len@74-75:2][ciphertext:N]
  // MIN_LEN = 76
  {
    const data = Buffer.alloc(80); // MIN_LEN + 4 bytes ciphertext
    data[0] = TAGS.TAG_RATCHET_MESSAGE;
    data[1] = 0; // flags
    Keypair.generate().publicKey.toBuffer().copy(data, 2);  // recipient
    data.writeBigUInt64LE(BigInt(1), 34);                   // counter
    randomBytes(32).copy(data, 42);                          // chain_key part
    data.writeUInt16LE(4, 74);                               // ciphertext_len
    randomBytes(4).copy(data, 76);                           // ciphertext
    results.push(await sendInstruction(7, data, null, 'TAG_RATCHET_MESSAGE'));
  }
  
  // TAG 8: Compliance Reveal
  {
    const data = Buffer.alloc(130);
    data[0] = TAGS.TAG_COMPLIANCE_REVEAL;
    data[1] = 0x10; // FLAG_COMPLIANCE
    randomBytes(32).copy(data, 2); // tx_id
    Keypair.generate().publicKey.toBuffer().copy(data, 34); // auditor
    randomBytes(64).copy(data, 66); // encrypted reveal
    results.push(await sendInstruction(8, data, null, 'TAG_COMPLIANCE_REVEAL'));
  }
  
  return results;
}

// --- Governance & VSL (9-13) ---
async function testGovernance() {
  console.log('\n🏛️ GOVERNANCE & VSL (Tags 9-13)');
  console.log('─'.repeat(50));
  const results = [];
  
  // TAG 9: Proposal
  // Handler expects: [tag:1][flags:1][proposal_id:32][content_hash:32][voting_end:8][proposal_type:1][title_len:2]...
  // MIN_LEN = 78
  {
    const data = Buffer.alloc(80); // 1+1+32+32+8+1+2+3 = 80
    data[0] = TAGS.TAG_PROPOSAL;
    data[1] = 0; // flags
    randomBytes(32).copy(data, 2);                          // proposal_id
    randomBytes(32).copy(data, 34);                         // content_hash
    const slot = await connection.getSlot();
    data.writeBigUInt64LE(BigInt(slot + 50000), 66);        // voting_end_slot
    data[74] = 1;                                            // proposal_type
    data[75] = 0;                                            // reserved
    data.writeUInt16LE(2, 76);                               // title_len (2 bytes at position 76-77)
    randomBytes(2).copy(data, 78);                           // title
    results.push(await sendInstruction(9, data, null, 'TAG_PROPOSAL'));
  }
  
  // TAG 10: Private Vote
  {
    const data = Buffer.alloc(106);
    data[0] = TAGS.TAG_PRIVATE_VOTE;
    data[1] = 0; // flags
    randomBytes(32).copy(data, 2); // proposal_id
    randomBytes(32).copy(data, 34); // nullifier
    randomBytes(32).copy(data, 66); // vote_commitment
    data.writeBigUInt64LE(BigInt(1000), 98); // vote_weight
    results.push(await sendInstruction(10, data, null, 'TAG_PRIVATE_VOTE'));
  }
  
  // TAG 11: VTA Transfer
  {
    const data = Buffer.alloc(130);
    data[0] = TAGS.TAG_VTA_TRANSFER;
    data[1] = 0; // flags
    randomBytes(32).copy(data, 2); // from_vta
    randomBytes(32).copy(data, 34); // to_vta
    data.writeBigUInt64LE(BigInt(1000000), 66); // amount
    randomBytes(32).copy(data, 74); // commitment
    randomBytes(24).copy(data, 106); // padding
    results.push(await sendInstruction(11, data, null, 'TAG_VTA_TRANSFER'));
  }
  
  // TAG 12: Referral Register
  // Handler expects: [tag:1][referrer:32][referee:32][parent_chain_hash:32][timestamp:8]
  // MIN_LEN = 105, NO FLAGS BYTE!
  {
    const data = Buffer.alloc(105); // Exact MIN_LEN
    data[0] = TAGS.TAG_REFERRAL_REGISTER;
    payer.publicKey.toBuffer().copy(data, 1);               // referrer (no flags byte!)
    Keypair.generate().publicKey.toBuffer().copy(data, 33); // referee
    randomBytes(32).copy(data, 65);                          // parent_chain_hash
    data.writeBigUInt64LE(BigInt(Date.now()), 97);          // timestamp
    results.push(await sendInstruction(12, data, null, 'TAG_REFERRAL_REGISTER'));
  }
  
  // TAG 13: Referral Claim
  // Handler expects: [tag:1][claimer:32][amount_claiming:8][depth:1][proof_len:2][proof:N]
  // MIN_LEN = 44, claimer must match accounts[3], NO FLAGS BYTE!
  {
    const data = Buffer.alloc(46); // MIN_LEN + 2 proof bytes
    data[0] = TAGS.TAG_REFERRAL_CLAIM;
    payer.publicKey.toBuffer().copy(data, 1);               // claimer (must match accounts[3]!)
    data.writeBigUInt64LE(BigInt(1000000), 33);             // amount_claiming
    data[41] = 0;                                            // depth (0 = 30%)
    data.writeUInt16LE(2, 42);                               // proof_len
    randomBytes(2).copy(data, 44);                           // proof
    results.push(await sendInstruction(13, data, getVSLAccounts(), 'TAG_REFERRAL_CLAIM'));
  }
  
  return results;
}

// --- Inscribed Primitives (14-22) ---
async function testInscribedPrimitives() {
  console.log('\n📜 INSCRIBED PRIMITIVES (Tags 14-22)');
  console.log('─'.repeat(50));
  const results = [];
  
  // TAG 14: Hashlock Commit
  {
    const data = Buffer.alloc(82);
    data[0] = TAGS.TAG_HASHLOCK_COMMIT;
    data[1] = 0;
    randomBytes(32).copy(data, 2); // hash_lock
    data.writeBigUInt64LE(BigInt(1000000), 34); // amount
    Keypair.generate().publicKey.toBuffer().copy(data, 42); // recipient
    data.writeBigUInt64LE(BigInt(18000), 74); // timeout_slots
    results.push(await sendInstruction(14, data, null, 'TAG_HASHLOCK_COMMIT'));
  }
  
  // TAG 15: Hashlock Reveal
  {
    const data = Buffer.alloc(66);
    data[0] = TAGS.TAG_HASHLOCK_REVEAL;
    data[1] = 0;
    randomBytes(32).copy(data, 2); // commit_id
    randomBytes(32).copy(data, 34); // preimage
    results.push(await sendInstruction(15, data, null, 'TAG_HASHLOCK_REVEAL'));
  }
  
  // TAG 16: Conditional Commit
  {
    const data = Buffer.alloc(106);
    data[0] = TAGS.TAG_CONDITIONAL_COMMIT;
    data[1] = 0;
    randomBytes(32).copy(data, 2); // condition_hash
    randomBytes(32).copy(data, 34); // action_hash
    data.writeBigUInt64LE(BigInt(1000000), 66); // amount
    randomBytes(32).copy(data, 74);
    results.push(await sendInstruction(16, data, null, 'TAG_CONDITIONAL_COMMIT'));
  }
  
  // TAG 17: Batch Settle
  {
    const data = Buffer.alloc(138);
    data[0] = TAGS.TAG_BATCH_SETTLE;
    data[1] = 0;
    data[2] = 3; // count
    for (let i = 0; i < 3; i++) {
      randomBytes(44).copy(data, 3 + i * 44);
    }
    results.push(await sendInstruction(17, data, null, 'TAG_BATCH_SETTLE'));
  }
  
  // TAG 18: State Channel Open
  {
    const data = Buffer.alloc(122);
    data[0] = TAGS.TAG_STATE_CHANNEL_OPEN;
    data[1] = 0;
    randomBytes(32).copy(data, 2); // channel_id
    data[34] = 2; // participant_count
    Keypair.generate().publicKey.toBuffer().copy(data, 35);
    Keypair.generate().publicKey.toBuffer().copy(data, 67);
    data.writeBigUInt64LE(BigInt(10000000), 99);
    randomBytes(15).copy(data, 107);
    results.push(await sendInstruction(18, data, null, 'TAG_STATE_CHANNEL_OPEN'));
  }
  
  // TAG 19: State Channel Close
  {
    const data = Buffer.alloc(98);
    data[0] = TAGS.TAG_STATE_CHANNEL_CLOSE;
    data[1] = 0;
    randomBytes(32).copy(data, 2); // channel_id
    randomBytes(64).copy(data, 34); // final_state_sig
    results.push(await sendInstruction(19, data, null, 'TAG_STATE_CHANNEL_CLOSE'));
  }
  
  // TAG 20: Time Capsule
  {
    const slot = await connection.getSlot();
    const data = Buffer.alloc(106);
    data[0] = TAGS.TAG_TIME_CAPSULE;
    data[1] = 0;
    data.writeBigUInt64LE(BigInt(slot + 1000), 2); // unlock_slot
    Keypair.generate().publicKey.toBuffer().copy(data, 10); // recipient
    randomBytes(64).copy(data, 42); // encrypted_content
    results.push(await sendInstruction(20, data, null, 'TAG_TIME_CAPSULE'));
  }
  
  // TAG 21: Ghost PDA
  // Handler expects: [tag:1][secret_hash:32][bump:1][action_type:1][action_data:var]
  // MIN_LEN = 35
  // 
  // The handler uses accounts[0].owner as program_id for PDA derivation:
  //   program_id = accounts[0].owner
  //   Pubkey::create_program_address(["ghost", secret_hash, [bump]], program_id)
  //
  // For testing, we use payer (owned by System Program).
  // We find a valid PDA using System Program as the program_id.
  {
    const secretHash = randomBytes(32);
    // Find a valid bump for PDA derivation with System Program as program_id
    let validBump = 255;
    for (let bump = 255; bump >= 0; bump--) {
      try {
        PublicKey.createProgramAddressSync(
          [Buffer.from('ghost'), secretHash, Buffer.from([bump])],
          SystemProgram.programId
        );
        validBump = bump;
        break;
      } catch (e) {
        // Try next bump
      }
    }
    const data = Buffer.alloc(36);
    data[0] = TAGS.TAG_GHOST_PDA;
    secretHash.copy(data, 1);                               // secret_hash
    data[33] = validBump;                                    // bump (found by search)
    data[34] = 1;                                            // action_type
    data[35] = 0;                                            // action_data
    // Standard accounts - accounts[0] is payer (owned by System Program)
    results.push(await sendInstruction(21, data, null, 'TAG_GHOST_PDA'));
  }
  
  // TAG 22: CPI Inscribe
  {
    const data = Buffer.alloc(130);
    data[0] = TAGS.TAG_CPI_INSCRIBE;
    data[1] = 0;
    Keypair.generate().publicKey.toBuffer().copy(data, 2); // caller_program
    randomBytes(32).copy(data, 34); // payload_hash
    randomBytes(64).copy(data, 66); // payload
    results.push(await sendInstruction(22, data, null, 'TAG_CPI_INSCRIBE'));
  }
  
  return results;
}

// --- VTA Advanced (23-31) ---
async function testVTAAdvanced() {
  console.log('\n🔑 VTA ADVANCED (Tags 23-31)');
  console.log('─'.repeat(50));
  const results = [];
  
  // TAG 23: VTA Delegate
  // Handler expects: [tag:1][flags:1][owner:32][delegate:32][mint:32][max_amount:8]
  //                  [expiry_slot:8][permissions:1][nonce:8]
  // MIN_LEN = 122, owner@data[2..34] must match accounts[3]
  {
    const slot = await connection.getSlot();
    const data = Buffer.alloc(123); // 1+1+32+32+32+8+8+1+8 = 123
    data[0] = TAGS.TAG_VTA_DELEGATE;
    data[1] = 0; // flags
    payer.publicKey.toBuffer().copy(data, 2);               // owner (must match accounts[3]!)
    Keypair.generate().publicKey.toBuffer().copy(data, 34); // delegate
    Keypair.generate().publicKey.toBuffer().copy(data, 66); // mint
    data.writeBigUInt64LE(BigInt(1000000), 98);             // max_amount
    data.writeBigUInt64LE(BigInt(slot + 10000), 106);       // expiry_slot
    data[114] = 0x01;                                        // permissions
    data.writeBigUInt64LE(BigInt(Date.now()), 115);         // nonce
    results.push(await sendInstruction(23, data, getVSLAccounts(), 'TAG_VTA_DELEGATE'));
  }
  
  // TAG 24: VTA Revoke
  // Handler expects: [tag:1][flags:1][vta_id:32][delegate:32]
  // MIN_LEN = 66, requires accounts[3] as signer
  {
    const data = Buffer.alloc(66); // Exact MIN_LEN
    data[0] = TAGS.TAG_VTA_REVOKE;
    data[1] = 0; // flags
    randomBytes(32).copy(data, 2);                          // vta_id
    Keypair.generate().publicKey.toBuffer().copy(data, 34); // delegate
    results.push(await sendInstruction(24, data, getVSLAccounts(), 'TAG_VTA_REVOKE'));
  }
  
  // TAG 25: Stealth Swap Init
  {
    const data = Buffer.alloc(186);
    data[0] = TAGS.TAG_STEALTH_SWAP_INIT;
    data[1] = 0;
    randomBytes(32).copy(data, 2); // swap_id
    Keypair.generate().publicKey.toBuffer().copy(data, 34); // counterparty
    Keypair.generate().publicKey.toBuffer().copy(data, 66); // mint_a
    Keypair.generate().publicKey.toBuffer().copy(data, 98); // mint_b
    randomBytes(32).copy(data, 130); // hash_lock
    const slot = await connection.getSlot();
    data.writeBigUInt64LE(BigInt(slot + 5000), 162); // timeout
    randomBytes(16).copy(data, 170);
    results.push(await sendInstruction(25, data, null, 'TAG_STEALTH_SWAP_INIT'));
  }
  
  // TAG 26: Stealth Swap Exec
  // Handler expects: [tag:1][flags:1][swap_id:32][preimage:32]
  // MIN_LEN = 65, requires accounts[3] as signer
  {
    const data = Buffer.alloc(66);
    data[0] = TAGS.TAG_STEALTH_SWAP_EXEC;
    data[1] = 0; // flags
    randomBytes(32).copy(data, 2);  // swap_id
    randomBytes(32).copy(data, 34); // preimage
    results.push(await sendInstruction(26, data, getVSLAccounts(), 'TAG_STEALTH_SWAP_EXEC'));
  }
  
  // TAG 27: VTA Guardian Set
  // Handler expects: [tag:1][vta_mint:32][threshold:1][guardian_count:1]
  //                  [guardians:32*n][encrypted_shares_len:2]...
  // MIN_LEN = 68 (for 1 guardian), threshold must be <= guardian_count
  {
    const guardianCount = 2;
    const guardiansEnd = 35 + guardianCount * 32;
    const data = Buffer.alloc(guardiansEnd + 2); // +2 for encrypted_shares_len
    data[0] = TAGS.TAG_VTA_GUARDIAN_SET;
    Keypair.generate().publicKey.toBuffer().copy(data, 1);  // vta_mint
    data[33] = 2;                                            // threshold
    data[34] = guardianCount;                                // guardian_count
    for (let i = 0; i < guardianCount; i++) {
      Keypair.generate().publicKey.toBuffer().copy(data, 35 + i * 32);
    }
    data.writeUInt16LE(0, guardiansEnd);                     // encrypted_shares_len
    results.push(await sendInstruction(27, data, getVSLAccounts(), 'TAG_VTA_GUARDIAN_SET'));
  }
  
  // TAG 28: VTA Guardian Recover
  // Handler expects: [tag:1][guardian_set_id:32][new_owner:32][sig_count:1]
  //                  [guardian_indices:n][signatures:64*n][recovery_nonce:8]
  // MIN_LEN = 75 (for 1 sig)
  {
    const sigCount = 1;
    const sigDataStart = 66;
    const sigDataLen = sigCount + sigCount * 64 + 8; // indices + sigs + nonce
    const data = Buffer.alloc(sigDataStart + sigDataLen);
    data[0] = TAGS.TAG_VTA_GUARDIAN_RECOVER;
    randomBytes(32).copy(data, 1);                          // guardian_set_id
    payer.publicKey.toBuffer().copy(data, 33);              // new_owner (should match accounts[3]?)
    data[65] = sigCount;                                     // sig_count
    data[66] = 0;                                            // guardian_index[0]
    randomBytes(64).copy(data, 67);                          // signature[0]
    data.writeBigUInt64LE(BigInt(Date.now()), 67 + 64);     // recovery_nonce
    results.push(await sendInstruction(28, data, getVSLAccounts(), 'TAG_VTA_GUARDIAN_RECOVER'));
  }
  
  // TAG 29: Private Subscription
  // Handler expects: [tag:1][flags:1][sub_id:32][subscriber:32][merchant:32][amount:8][interval:8][encrypted_terms:8]
  // MIN_LEN = 124
  {
    const data = Buffer.alloc(124); // Exact MIN_LEN
    data[0] = TAGS.TAG_PRIVATE_SUBSCRIPTION;
    data[1] = 0; // flags
    randomBytes(32).copy(data, 2);                          // subscription_id
    payer.publicKey.toBuffer().copy(data, 34);              // subscriber
    Keypair.generate().publicKey.toBuffer().copy(data, 66); // merchant
    data.writeBigUInt64LE(BigInt(1000000), 98);             // amount
    data.writeBigUInt64LE(BigInt(216000), 106);             // interval_slots
    data.writeBigUInt64LE(BigInt(0), 114);                  // encrypted_terms
    data.writeUInt16LE(0, 122);                              // padding
    results.push(await sendInstruction(29, data, getVSLAccounts(), 'TAG_PRIVATE_SUBSCRIPTION'));
  }
  
  // TAG 30: Multiparty VTA Init
  // Handler expects: [tag:1][flags:1][vta_id:32][n:1][k:1][participants:32*N][policy_hash:32]
  // MIN_LEN = 78 (for n=1)
  {
    const n = 2;
    const data = Buffer.alloc(68 + n * 32 + 32); // 1+1+32+1+1+n*32+32
    data[0] = TAGS.TAG_MULTIPARTY_VTA_INIT;
    data[1] = 0; // flags
    randomBytes(32).copy(data, 2);  // vta_id
    data[34] = n;                   // n (total participants)
    data[35] = 2;                   // k (threshold)
    for (let i = 0; i < n; i++) {
      Keypair.generate().publicKey.toBuffer().copy(data, 36 + i * 32);
    }
    randomBytes(32).copy(data, 36 + n * 32); // policy_hash
    results.push(await sendInstruction(30, data, getVSLAccounts(), 'TAG_MULTIPARTY_VTA_INIT'));
  }
  
  // TAG 31: Multiparty VTA Sign
  // Handler expects: [tag:1][flags:1][vta_id:32][action_hash:32][signer_index:1][sig:64]
  // MIN_LEN = 99, requires accounts[3] as signer
  {
    const data = Buffer.alloc(131);
    data[0] = TAGS.TAG_MULTIPARTY_VTA_SIGN;
    data[1] = 0; // flags
    randomBytes(32).copy(data, 2);  // vta_id
    randomBytes(32).copy(data, 34); // action_hash
    data[66] = 0;                   // signer_index (must be valid)
    randomBytes(64).copy(data, 67); // signature
    results.push(await sendInstruction(31, data, getVSLAccounts(), 'TAG_MULTIPARTY_VTA_SIGN'));
  }
  
  return results;
}

// --- VSL Extended (32-43) ---
async function testVSLExtended() {
  console.log('\n💎 VSL EXTENDED (Tags 32-43)');
  console.log('─'.repeat(50));
  const results = [];
  
  // TAG 32: VSL Deposit
  {
    const data = Buffer.alloc(146);
    data[0] = TAGS.TAG_VSL_DEPOSIT;
    data[1] = 0;
    Keypair.generate().publicKey.toBuffer().copy(data, 2); // mint
    data.writeBigUInt64LE(BigInt(1000000), 34); // amount
    randomBytes(32).copy(data, 42); // note_commitment
    randomBytes(64).copy(data, 74); // encrypted_note
    randomBytes(8).copy(data, 138); // deposit_nonce
    results.push(await sendInstruction(32, data, getVSLAccounts(), 'TAG_VSL_DEPOSIT'));
  }
  
  // TAG 33: VSL Withdraw
  {
    const data = Buffer.alloc(140);
    data[0] = TAGS.TAG_VSL_WITHDRAW;
    data[1] = 0;
    Keypair.generate().publicKey.toBuffer().copy(data, 2); // mint
    data.writeBigUInt64LE(BigInt(1000000), 34); // amount
    randomBytes(32).copy(data, 42); // nullifier
    Keypair.generate().publicKey.toBuffer().copy(data, 74); // recipient
    data[106] = 1; // proof_len
    randomBytes(32).copy(data, 107);
    results.push(await sendInstruction(33, data, getVSLAccounts(), 'TAG_VSL_WITHDRAW'));
  }
  
  // TAG 34: VSL Private Transfer
  {
    const data = Buffer.alloc(230);
    data[0] = TAGS.TAG_VSL_PRIVATE_TRANSFER;
    data[1] = 0;
    randomBytes(32).copy(data, 2); // mint
    randomBytes(32).copy(data, 34); // input_nullifier
    randomBytes(32).copy(data, 66); // output_commitment_1
    randomBytes(32).copy(data, 98); // output_commitment_2
    randomBytes(64).copy(data, 130); // encrypted_outputs
    randomBytes(32).copy(data, 194); // merkle_root
    results.push(await sendInstruction(34, data, getVSLAccounts(), 'TAG_VSL_PRIVATE_TRANSFER'));
  }
  
  // TAG 35: VSL Private Swap
  {
    const data = Buffer.alloc(290);
    data[0] = TAGS.TAG_VSL_PRIVATE_SWAP;
    data[1] = 0x01;
    randomBytes(32).copy(data, 2); // swap_id
    randomBytes(32).copy(data, 34); // mint_a
    randomBytes(32).copy(data, 66); // mint_b
    randomBytes(32).copy(data, 98); // nullifier_a
    randomBytes(32).copy(data, 130); // nullifier_b
    randomBytes(32).copy(data, 162); // output_a
    randomBytes(32).copy(data, 194); // output_b
    randomBytes(64).copy(data, 226); // encrypted_data
    results.push(await sendInstruction(35, data, getVSLAccounts(), 'TAG_VSL_PRIVATE_SWAP'));
  }
  
  // TAG 36: VSL Shielded Send
  // Handler expects: [tag:1][flags:1][mint:32][nullifier:32][stealth_pubkey:32]
  //                  [ephemeral_pubkey:32][output_commitment:32][encrypted_amount:8]
  // MIN_LEN = 170
  {
    const data = Buffer.alloc(170);
    data[0] = TAGS.TAG_VSL_SHIELDED_SEND;
    data[1] = 0; // flags
    randomBytes(32).copy(data, 2);   // mint
    randomBytes(32).copy(data, 34);  // nullifier
    randomBytes(32).copy(data, 66);  // stealth_pubkey
    randomBytes(32).copy(data, 98);  // ephemeral_pubkey
    randomBytes(32).copy(data, 130); // output_commitment
    data.writeBigUInt64LE(BigInt(1000000), 162); // encrypted_amount
    results.push(await sendInstruction(36, data, getVSLAccounts(), 'TAG_VSL_SHIELDED_SEND'));
  }
  
  // TAG 37: VSL Split
  // Handler expects: [tag:1][mint:32][input_nullifier:32][output_count:1][outputs:32*N][amounts:8*N]
  // MIN_LEN = 67 (for count=1), NO FLAGS BYTE
  {
    const outputCount = 2;
    const data = Buffer.alloc(66 + outputCount * 40); // 1+32+32+1 + 2*(32+8)
    data[0] = TAGS.TAG_VSL_SPLIT;
    randomBytes(32).copy(data, 1);                          // mint (no flags byte!)
    randomBytes(32).copy(data, 33);                         // input_nullifier
    data[65] = outputCount;                                  // output_count
    for (let i = 0; i < outputCount; i++) {
      randomBytes(32).copy(data, 66 + i * 32);              // output_commitment
    }
    for (let i = 0; i < outputCount; i++) {
      data.writeBigUInt64LE(BigInt(500000 + i), 66 + outputCount * 32 + i * 8); // encrypted_amount
    }
    results.push(await sendInstruction(37, data, getVSLAccounts(), 'TAG_VSL_SPLIT'));
  }
  
  // TAG 38: VSL Merge
  // Handler expects: [tag:1][mint:32][input_count:1][nullifiers:32*N][output_commitment:32][encrypted_total:8]
  // MIN_LEN = 75 (for count=1), NO FLAGS BYTE
  {
    const inputCount = 2;
    const nullifiersEnd = 34 + inputCount * 32;
    const data = Buffer.alloc(nullifiersEnd + 40); // 1+32+1+64+32+8
    data[0] = TAGS.TAG_VSL_MERGE;
    randomBytes(32).copy(data, 1);                          // mint (no flags byte!)
    data[33] = inputCount;                                   // input_count
    for (let i = 0; i < inputCount; i++) {
      randomBytes(32).copy(data, 34 + i * 32);              // nullifier
    }
    randomBytes(32).copy(data, nullifiersEnd);              // output_commitment
    data.writeBigUInt64LE(BigInt(1000000), nullifiersEnd + 32); // encrypted_total
    results.push(await sendInstruction(38, data, getVSLAccounts(), 'TAG_VSL_MERGE'));
  }
  
  // TAG 39: VSL Escrow Create
  {
    const slot = await connection.getSlot();
    const data = Buffer.alloc(170);
    data[0] = TAGS.TAG_VSL_ESCROW_CREATE;
    data[1] = 0x01;
    randomBytes(32).copy(data, 2); // mint
    randomBytes(32).copy(data, 34); // nullifier
    randomBytes(32).copy(data, 66); // escrow_commitment
    randomBytes(32).copy(data, 98); // arbiter_hash
    randomBytes(32).copy(data, 130); // conditions_hash
    data.writeBigUInt64LE(BigInt(slot + 50000), 162); // timeout_slot
    results.push(await sendInstruction(39, data, getVSLAccounts(), 'TAG_VSL_ESCROW_CREATE'));
  }
  
  // TAG 40: VSL Escrow Release
  {
    const data = Buffer.alloc(137);
    data[0] = TAGS.TAG_VSL_ESCROW_RELEASE;
    randomBytes(32).copy(data, 1); // escrow_id
    randomBytes(32).copy(data, 33); // recipient_commitment
    randomBytes(64).copy(data, 65); // release_proof
    data.writeBigUInt64LE(BigInt(1000000), 129); // encrypted_amount
    results.push(await sendInstruction(40, data, getVSLAccounts(), 'TAG_VSL_ESCROW_RELEASE'));
  }
  
  // TAG 41: VSL Escrow Refund
  {
    const data = Buffer.alloc(130);
    data[0] = TAGS.TAG_VSL_ESCROW_REFUND;
    randomBytes(32).copy(data, 1); // escrow_id
    randomBytes(32).copy(data, 33); // refund_commitment
    data[65] = 0; // refund_type: TIMEOUT
    randomBytes(64).copy(data, 66); // proof
    results.push(await sendInstruction(41, data, getVSLAccounts(), 'TAG_VSL_ESCROW_REFUND'));
  }
  
  // TAG 42: VSL Balance Proof
  {
    const data = Buffer.alloc(145);
    data[0] = TAGS.TAG_VSL_BALANCE_PROOF;
    randomBytes(32).copy(data, 1); // mint
    data.writeBigUInt64LE(BigInt(1000000), 33); // threshold
    randomBytes(32).copy(data, 41); // proof_commitment
    randomBytes(64).copy(data, 73); // range_proof
    data.writeBigUInt64LE(BigInt(Date.now()), 137); // timestamp
    results.push(await sendInstruction(42, data, getVSLAccounts(), 'TAG_VSL_BALANCE_PROOF'));
  }
  
  // TAG 43: VSL Audit Reveal
  {
    const data = Buffer.alloc(101);
    data[0] = TAGS.TAG_VSL_AUDIT_REVEAL;
    Keypair.generate().publicKey.toBuffer().copy(data, 1); // auditor
    data[33] = 1; // tx_count
    randomBytes(32).copy(data, 34); // tx_id
    randomBytes(32).copy(data, 66); // reveal_key
    data[98] = 2; // scope: FULL
    results.push(await sendInstruction(43, data, getVSLAccounts(), 'TAG_VSL_AUDIT_REVEAL'));
  }
  
  return results;
}

// --- v6 World's First (44-53) ---
async function testV6WorldsFirst() {
  console.log('\n🌟 v6 WORLD\'S FIRST (Tags 44-53)');
  console.log('─'.repeat(50));
  const results = [];
  
  // TAG 44: Decoy Storm
  {
    const decoyCount = 5;
    const payloadsLen = decoyCount * 64;
    const data = Buffer.alloc(3 + payloadsLen + 12 + 32);
    data[0] = TAGS.TAG_DECOY_STORM;
    data[1] = decoyCount;
    data[2] = 2; // encrypted_index
    for (let i = 0; i < decoyCount; i++) {
      randomBytes(64).copy(data, 3 + i * 64);
    }
    randomBytes(12).copy(data, 3 + payloadsLen); // nonce
    randomBytes(32).copy(data, 3 + payloadsLen + 12); // commitment
    results.push(await sendInstruction(44, data, null, 'TAG_DECOY_STORM'));
  }
  
  // TAG 45: Decoy Reveal
  {
    const data = Buffer.alloc(66);
    data[0] = TAGS.TAG_DECOY_REVEAL;
    randomBytes(32).copy(data, 1); // storm_id
    randomBytes(32).copy(data, 33); // reveal_secret
    data[65] = 2; // real_index
    results.push(await sendInstruction(45, data, null, 'TAG_DECOY_REVEAL'));
  }
  
  // TAG 46: Ephemeral Create
  {
    const slot = await connection.getSlot();
    const data = Buffer.alloc(81);
    data[0] = TAGS.TAG_EPHEMERAL_CREATE;
    randomBytes(32).copy(data, 1); // secret_hash
    data.writeBigUInt64LE(BigInt(1000000), 33); // amount
    data.writeBigUInt64LE(BigInt(slot + 100000), 41); // expiry_slot
    randomBytes(32).copy(data, 49); // drain_commitment
    results.push(await sendInstruction(46, data, null, 'TAG_EPHEMERAL_CREATE'));
  }
  
  // TAG 47: Ephemeral Drain
  {
    const data = Buffer.alloc(97);
    data[0] = TAGS.TAG_EPHEMERAL_DRAIN;
    randomBytes(32).copy(data, 1); // ephemeral_id
    randomBytes(32).copy(data, 33); // secret
    Keypair.generate().publicKey.toBuffer().copy(data, 65); // stealth_addr
    results.push(await sendInstruction(47, data, null, 'TAG_EPHEMERAL_DRAIN'));
  }
  
  // TAG 48: Chrono Lock
  {
    const slot = await connection.getSlot();
    const contentLen = 64;
    const data = Buffer.alloc(1 + 8 + contentLen + 32);
    data[0] = TAGS.TAG_CHRONO_LOCK;
    data.writeBigUInt64LE(BigInt(slot + 100), 1);
    randomBytes(contentLen).copy(data, 9);
    randomBytes(32).copy(data, 9 + contentLen);
    results.push(await sendInstruction(48, data, getExtendedAccounts(), 'TAG_CHRONO_LOCK'));
  }
  
  // TAG 49: Chrono Reveal
  {
    const data = Buffer.alloc(65);
    data[0] = TAGS.TAG_CHRONO_REVEAL;
    randomBytes(32).copy(data, 1); // vault_id
    randomBytes(32).copy(data, 33); // decryption_key
    results.push(await sendInstruction(49, data, null, 'TAG_CHRONO_REVEAL'));
  }
  
  // TAG 50: Shadow Follow
  {
    const data = Buffer.alloc(129);
    data[0] = TAGS.TAG_SHADOW_FOLLOW;
    randomBytes(32).copy(data, 1); // follower_commit
    randomBytes(32).copy(data, 33); // followee_commit
    randomBytes(64).copy(data, 65); // encrypted_edge
    results.push(await sendInstruction(50, data, null, 'TAG_SHADOW_FOLLOW'));
  }
  
  // TAG 51: Shadow Unfollow
  {
    const data = Buffer.alloc(65);
    data[0] = TAGS.TAG_SHADOW_UNFOLLOW;
    randomBytes(32).copy(data, 1); // edge_id
    randomBytes(32).copy(data, 33); // removal_proof
    results.push(await sendInstruction(51, data, null, 'TAG_SHADOW_UNFOLLOW'));
  }
  
  // TAG 52: Phantom NFT Commit
  {
    const data = Buffer.alloc(97);
    data[0] = TAGS.TAG_PHANTOM_NFT_COMMIT;
    randomBytes(32).copy(data, 1); // collection
    randomBytes(32).copy(data, 33); // ownership_commit
    randomBytes(32).copy(data, 65); // nullifier
    results.push(await sendInstruction(52, data, null, 'TAG_PHANTOM_NFT_COMMIT'));
  }
  
  // TAG 53: Phantom NFT Prove
  {
    const proofLen = 3;
    const data = Buffer.alloc(34 + proofLen * 32 + 64);
    data[0] = TAGS.TAG_PHANTOM_NFT_PROVE;
    randomBytes(32).copy(data, 1); // commit_id
    data[33] = proofLen;
    for (let i = 0; i < proofLen; i++) {
      randomBytes(32).copy(data, 34 + i * 32);
    }
    randomBytes(64).copy(data, 34 + proofLen * 32); // ownership_proof
    results.push(await sendInstruction(53, data, null, 'TAG_PHANTOM_NFT_PROVE'));
  }
  
  return results;
}

// --- Proof of Innocence (54-64) ---
async function testProofOfInnocence() {
  console.log('\n🛡️ PROOF OF INNOCENCE (Tags 54-64)');
  console.log('─'.repeat(50));
  const results = [];
  
  // TAG 54: Innocence Mint
  {
    const data = Buffer.alloc(138);
    data[0] = TAGS.TAG_INNOCENCE_MINT;
    data[1] = 1; // SOURCE_TYPE_CEX
    randomBytes(32).copy(data, 2); // source_commit
    data.writeBigUInt64LE(BigInt(6480000), 34); // validity_slots
    Keypair.generate().publicKey.toBuffer().copy(data, 42); // attestor
    randomBytes(64).copy(data, 74); // attestation_sig
    results.push(await sendInstruction(54, data, null, 'TAG_INNOCENCE_MINT'));
  }
  
  // TAG 55: Innocence Verify
  {
    const data = Buffer.alloc(98);
    data[0] = TAGS.TAG_INNOCENCE_VERIFY;
    randomBytes(32).copy(data, 1); // innocence_id
    randomBytes(32).copy(data, 33); // challenge
    randomBytes(32).copy(data, 65); // response
    results.push(await sendInstruction(55, data, null, 'TAG_INNOCENCE_VERIFY'));
  }
  
  // TAG 56: Innocence Revoke
  {
    const data = Buffer.alloc(98);
    data[0] = TAGS.TAG_INNOCENCE_REVOKE;
    randomBytes(32).copy(data, 1); // innocence_id
    randomBytes(64).copy(data, 33); // revoke_proof
    data[97] = 1; // reason
    results.push(await sendInstruction(56, data, null, 'TAG_INNOCENCE_REVOKE'));
  }
  
  // TAG 57: Clean Source Register
  // Handler expects: [tag:1][source_type:1][source_pubkey:32][source_name_hash:32]
  //                  [registration_proof:64][oracle_sig:64]
  // LEN = 194
  {
    const data = Buffer.alloc(194); // Exact LEN required
    data[0] = TAGS.TAG_CLEAN_SOURCE_REGISTER;
    data[1] = 1;                                            // SOURCE_TYPE_CEX
    Keypair.generate().publicKey.toBuffer().copy(data, 2);  // source_pubkey
    randomBytes(32).copy(data, 34);                         // source_name_hash
    randomBytes(64).copy(data, 66);                         // registration_proof
    randomBytes(64).copy(data, 130);                        // oracle_sig
    results.push(await sendInstruction(57, data, null, 'TAG_CLEAN_SOURCE_REGISTER'));
  }
  
  // TAG 58: Clean Source Prove
  {
    const proofLen = 3;
    const data = Buffer.alloc(74 + proofLen * 32);
    data[0] = TAGS.TAG_CLEAN_SOURCE_PROVE;
    randomBytes(32).copy(data, 1); // source_id
    data.writeBigUInt64LE(BigInt(1000000000), 33); // amount
    randomBytes(32).copy(data, 41); // merkle_root
    data[73] = proofLen;
    for (let i = 0; i < proofLen; i++) {
      randomBytes(32).copy(data, 74 + i * 32);
    }
    results.push(await sendInstruction(58, data, null, 'TAG_CLEAN_SOURCE_PROVE'));
  }
  
  // TAG 59: Temporal Innocence
  {
    const slot = await connection.getSlot();
    const data = Buffer.alloc(113);
    data[0] = TAGS.TAG_TEMPORAL_INNOCENCE;
    data.writeBigUInt64LE(BigInt(slot - 1000), 1); // deposit_slot
    randomBytes(64).copy(data, 9); // deposit_tx_sig
    randomBytes(32).copy(data, 73); // blacklist_root
    data.writeBigUInt64LE(BigInt(slot - 500), 105); // blacklist_snapshot_slot
    results.push(await sendInstruction(59, data, null, 'TAG_TEMPORAL_INNOCENCE'));
  }
  
  // TAG 60: Compliance Channel Open
  {
    const data = Buffer.alloc(130);
    data[0] = TAGS.TAG_COMPLIANCE_CHANNEL_OPEN;
    Keypair.generate().publicKey.toBuffer().copy(data, 1); // regulator
    randomBytes(32).copy(data, 33); // channel_id
    randomBytes(32).copy(data, 65); // encryption_key
    randomBytes(32).copy(data, 97); // metadata
    results.push(await sendInstruction(60, data, null, 'TAG_COMPLIANCE_CHANNEL_OPEN'));
  }
  
  // TAG 61: Compliance Channel Report
  // Handler expects: [tag:1][channel_id:32][report_hash:32][encrypted_len:2][encrypted_report:N]
  // MIN_LEN = 67, encrypted_len <= 1000
  {
    const encryptedLen = 64;
    const data = Buffer.alloc(67 + encryptedLen);
    data[0] = TAGS.TAG_COMPLIANCE_CHANNEL_REPORT;
    randomBytes(32).copy(data, 1);                          // channel_id
    randomBytes(32).copy(data, 33);                         // report_hash
    data.writeUInt16LE(encryptedLen, 65);                   // encrypted_len
    randomBytes(encryptedLen).copy(data, 67);               // encrypted_report
    results.push(await sendInstruction(61, data, null, 'TAG_COMPLIANCE_CHANNEL_REPORT'));
  }
  
  // TAG 62: Provenance Commit
  {
    const data = Buffer.alloc(73);
    data[0] = TAGS.TAG_PROVENANCE_COMMIT;
    randomBytes(32).copy(data, 1); // source_innocence_id
    data.writeBigUInt64LE(BigInt(5000000000), 33); // amount
    randomBytes(32).copy(data, 41); // provenance_secret
    results.push(await sendInstruction(62, data, null, 'TAG_PROVENANCE_COMMIT'));
  }
  
  // TAG 63: Provenance Extend
  {
    const data = Buffer.alloc(106);
    data[0] = TAGS.TAG_PROVENANCE_EXTEND;
    randomBytes(32).copy(data, 1); // parent_provenance_id
    randomBytes(32).copy(data, 33); // new_commitment
    data.writeBigUInt64LE(BigInt(1000000000), 65); // amount
    randomBytes(32).copy(data, 73); // extension_secret
    data[105] = 1; // depth
    results.push(await sendInstruction(63, data, null, 'TAG_PROVENANCE_EXTEND'));
  }
  
  // TAG 64: Provenance Verify
  // Handler expects: [tag:1][provenance_commit:32][claimed_depth:1][max_allowed_depth:1]
  // MIN_LEN = 35, claimed_depth must <= max_allowed_depth <= MAX_PROVENANCE_DEPTH(10)
  {
    const data = Buffer.alloc(35); // Exact MIN_LEN
    data[0] = TAGS.TAG_PROVENANCE_VERIFY;
    randomBytes(32).copy(data, 1);                          // provenance_commit
    data[33] = 2;                                            // claimed_depth (must be <= max_allowed)
    data[34] = 5;                                            // max_allowed_depth (must be <= 10)
    results.push(await sendInstruction(64, data, null, 'TAG_PROVENANCE_VERIFY'));
  }
  
  return results;
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function main() {
  console.log('\n🚀 Starting COMPREHENSIVE PMP v6 Mainnet Tests...\n');
  console.log('⚠️  NETWORK: MAINNET ONLY - Mainnet programs UNTOUCHED');
  console.log('');
  
  const balance = await connection.getBalance(payer.publicKey);
  console.log(`💰 Starting balance: ${balance / 1e9} SOL`);
  
  const allResults = [];
  
  // Run all test categories
  allResults.push(...await testCoreMessaging());
  allResults.push(...await testGovernance());
  allResults.push(...await testInscribedPrimitives());
  allResults.push(...await testVTAAdvanced());
  allResults.push(...await testVSLExtended());
  allResults.push(...await testV6WorldsFirst());
  allResults.push(...await testProofOfInnocence());
  
  // Summary
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('              COMPREHENSIVE TEST RESULTS                    ');
  console.log('═'.repeat(60));
  
  let passed = 0;
  let failed = 0;
  const expectedFailures = []; // Now using proper Keccak-256 from js-sha3!
  
  for (const result of allResults) {
    const isExpectedFail = !result.success && expectedFailures.includes(result.description);
    const status = result.success ? '✅' : (isExpectedFail ? '⚠️' : '❌');
    const info = result.success ? result.sig : (isExpectedFail ? '(Expected failure)' : result.error?.slice(0, 40));
    console.log(`  ${status} ${result.description.padEnd(28)} ${info}`);
    if (result.success) passed++;
    else failed++;
  }
  
  console.log('─'.repeat(60));
  const effectivePassed = passed + expectedFailures.filter(e => 
    allResults.find(r => r.description === e && !r.success)
  ).length;
  console.log(`  Total: ${passed}/${passed + failed} passed (${Math.round(passed/(passed+failed)*100)}%)`);
  if (expectedFailures.length > 0) {
    console.log(`  Note: ${expectedFailures.length} expected failures`);
    console.log(`  Effective: ${effectivePassed}/${passed + failed} (${Math.round(effectivePassed/(passed+failed)*100)}%)`);
  }
  console.log('═'.repeat(60));
  
  const finalBalance = await connection.getBalance(payer.publicKey);
  console.log(`\n💰 Final balance: ${finalBalance / 1e9} SOL`);
  console.log(`   Total fees: ${(balance - finalBalance) / 1e9} SOL`);
  
  console.log('\n📋 Program Summary:');
  console.log(`   Mainnet:  ${MAINNET_PMP_PROGRAM_ID.toBase58()}`);
  console.log(`   Mainnet: GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9 (UNCHANGED)`);
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
