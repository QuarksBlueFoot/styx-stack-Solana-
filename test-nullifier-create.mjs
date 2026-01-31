#!/usr/bin/env node
/**
 * Test nullifier creation with correct account layout
 * 
 * Fee collection accounts (3):
 * - payer (signer, writable)
 * - treasury (writable)
 * - system_program
 * 
 * Nullifier creation accounts (3):
 * - spender (signer, writable)
 * - nullifier_pda (writable)
 * - system_program
 */

import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction, 
  TransactionInstruction, 
  SystemProgram 
} from '@solana/web3.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import fs from 'fs';

const PROGRAM_ID = new PublicKey('FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW');
// PDA derivation uses the same ID as the deployed program
const PDA_DERIVATION_ID = PROGRAM_ID;
const TREASURY = new PublicKey('13xnC9kDksJMBE9FYVW1S7dukLjRDgrh4Dzm6eq5moon');
const SEED_NULLIFIER = Buffer.from('styx_null');

async function main() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const wallet = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync('.devnet/test-wallet.json'))));
  
  console.log('🔒 Testing Nullifier Creation with Correct Account Layout');
  console.log('═'.repeat(60));
  
  // Generate unique test data
  const rand = Buffer.from(Date.now().toString(16).padStart(16, '0'), 'hex');
  const noteCommit = Buffer.alloc(32);
  rand.copy(noteCommit);
  const secretHash = Buffer.alloc(32);
  Buffer.from('secret' + Date.now()).copy(secretHash);
  
  // Compute nullifier = keccak(note_commit || secret_hash)
  const nullifier = Buffer.from(keccak_256(Buffer.concat([noteCommit, secretHash])));
  
  console.log('Note commit:', noteCommit.slice(0, 8).toString('hex') + '...');
  console.log('Secret hash:', secretHash.slice(0, 8).toString('hex') + '...');
  console.log('Nullifier:', nullifier.slice(0, 8).toString('hex') + '...');
  
  // Derive PDA using the hardcoded ID from the program
  const [nullifierPDA, bump] = PublicKey.findProgramAddressSync([SEED_NULLIFIER, nullifier], PDA_DERIVATION_ID);
  console.log('PDA:', nullifierPDA.toString().slice(0, 20) + '...');
  console.log('Bump:', bump);
  
  // Build data - [tag:1][note_commit:32][nullifier:32][secret_hash:32][flags:1] = 98 bytes
  const data = Buffer.alloc(98);
  let offset = 0;
  data.writeUInt8(192, offset++); // TAG_NULLIFIER_CREATE = 192
  noteCommit.copy(data, offset); offset += 32;
  nullifier.copy(data, offset); offset += 32;
  secretHash.copy(data, offset); offset += 32;
  data.writeUInt8(0x01, offset); // flags = 1
  
  console.log('Data length:', data.length, 'bytes');
  
  // CORRECT ACCOUNT LAYOUT:
  // First 3: Fee collection (payer, treasury, system)
  // Next 3: Nullifier creation (spender, pda, system)
  const ix = new TransactionInstruction({
    keys: [
      // Fee collection accounts (collect_protocol_fee)
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      // Nullifier creation accounts (process_nullifier_create)
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: nullifierPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
  
  const tx = new Transaction().add(ix);
  tx.feePayer = wallet.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  
  console.log('\n📡 Simulating with 6 accounts...');
  const sim = await connection.simulateTransaction(tx);
  console.log('Logs:', JSON.stringify(sim.value.logs, null, 2));
  
  if (sim.value.err) {
    console.log('\n❌ Simulation failed:', JSON.stringify(sim.value.err));
  } else {
    console.log('\n🎉 Simulation SUCCESS! Sending transaction...');
    tx.sign(wallet);
    const sig = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(sig, 'confirmed');
    console.log('✅ NULLIFIER CREATED!');
    console.log('Signature:', sig);
    
    // Verify the PDA exists
    const pdaInfo = await connection.getAccountInfo(nullifierPDA);
    if (pdaInfo) {
      console.log('\n🔍 PDA Verification:');
      console.log('   Owner:', pdaInfo.owner.toString());
      console.log('   Data length:', pdaInfo.data.length, 'bytes');
      console.log('   Data:', Buffer.from(pdaInfo.data).toString('hex'));
    }
  }
}

main().catch(console.error);
