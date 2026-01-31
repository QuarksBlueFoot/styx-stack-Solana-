#!/usr/bin/env node
/**
 * Mint "Quark" - A Styx Monke NFT on Devnet
 * 
 * STS Domain-Based Encoding v3.0
 * Domain: 0x01 (STS)
 * Operation: 0x11 (CREATE_NFT)
 */

import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  PublicKey,
  SystemProgram,
} from '@solana/web3.js';
import { createHash, randomBytes } from 'crypto';
import { readFileSync } from 'fs';

// STS Program ID (deployed on devnet)
const PROGRAM_ID = new PublicKey('CumUDpSpjmMEsaPhLMZEE8NKtgq9BTT6eyN7RCpsWmPE');

// Domain encoding constants (v3.0)
const STS_DOMAIN = 0x01;
const STS_OP_CREATE_NFT = 0x11;

function sha256(data) {
  return createHash('sha256').update(data).digest();
}

function buildStsInstruction(domain, op, data, accounts) {
  const instructionData = Buffer.concat([
    Buffer.from([domain, op]),
    data,
  ]);
  
  return new TransactionInstruction({
    keys: accounts,
    programId: PROGRAM_ID,
    data: instructionData,
  });
}

async function mintQuarkNft() {
  console.log('\n' + '═'.repeat(60));
  console.log('  🐵 MINTING QUARK - THE STYX MONKE NFT');
  console.log('═'.repeat(60));
  console.log('\n  STS Domain Encoding v3.0');
  console.log('  Domain: 0x01 (STS)');
  console.log('  Operation: 0x11 (CREATE_NFT)\n');

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load wallet
  const walletPath = '/workspaces/StyxStack/.devnet/test-wallet.json';
  const walletData = JSON.parse(readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
  
  console.log('  📍 Network:     Devnet');
  console.log(`  👛 Wallet:      ${wallet.publicKey.toString().slice(0, 8)}...`);
  
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`  💰 Balance:     ${(balance / 1e9).toFixed(4)} SOL\n`);

  // NFT Metadata
  const nftName = 'Quark';
  const nftSymbol = 'SMONKE';
  const nftDescription = 'The first Styx Monke - Privacy Pioneer of StyxStack';
  
  // Arweave-style metadata URI (mock for devnet)
  const metadataUri = 'https://arweave.net/styx-monke-quark-metadata';
  
  console.log('  🎨 NFT Details:');
  console.log(`     Name:        ${nftName}`);
  console.log(`     Symbol:      ${nftSymbol}`);
  console.log(`     Description: ${nftDescription.slice(0, 40)}...`);
  console.log(`     URI:         ${metadataUri.slice(0, 35)}...\n`);

  // Build NFT data according to STS standard
  // Layout:
  // [0..32]       nonce (32 bytes)
  // [32..64]      name (32 bytes, null-padded)
  // [64..72]      symbol (8 bytes, null-padded)
  // [72..74]      uri_len (2 bytes u16 LE)
  // [74..74+uri]  uri (variable)
  // [+0..32]      recipient_commitment (32 bytes)
  // [+32..64]     collection_id (32 bytes)
  // [+64]         privacy_mode (1 byte)
  // [+65..69]     extension_flags (4 bytes u32 LE)

  const nonce = randomBytes(32);
  
  const nameBuffer = Buffer.alloc(32);
  Buffer.from(nftName).copy(nameBuffer);
  
  const symbolBuffer = Buffer.alloc(8);
  Buffer.from(nftSymbol).copy(symbolBuffer);
  
  const uriBuf = Buffer.from(metadataUri);
  const uriLen = Buffer.alloc(2);
  uriLen.writeUInt16LE(uriBuf.length);
  
  // Recipient commitment (hash of owner + nonce + secret)
  const ownerSecret = randomBytes(32);
  const recipientCommitment = sha256(Buffer.concat([
    nonce,
    wallet.publicKey.toBuffer(),
    ownerSecret,
  ]));
  
  // Collection ID (null = standalone NFT)
  const collectionId = Buffer.alloc(32);
  
  // Privacy mode: 1 = Silhouette (metadata visible, owner hidden)
  const privacyMode = 1;
  
  // Extension flags (bit flags for future extensions)
  // Bit 0: Has royalties
  // Bit 1: Soulbound
  // Bit 2: Time-locked
  const extensionFlags = Buffer.alloc(4);
  extensionFlags.writeUInt32LE(0x01); // Has royalties
  
  const instructionData = Buffer.concat([
    nonce,                        // 32 bytes
    nameBuffer,                   // 32 bytes
    symbolBuffer,                 // 8 bytes
    uriLen,                       // 2 bytes
    uriBuf,                       // variable
    recipientCommitment,          // 32 bytes
    collectionId,                 // 32 bytes
    Buffer.from([privacyMode]),   // 1 byte
    extensionFlags,               // 4 bytes
  ]);

  console.log('  🔐 Privacy Settings:');
  console.log('     Mode:        Silhouette (metadata visible, owner hidden)');
  console.log('     Extensions:  Royalties enabled');
  console.log(`     Nonce:       ${nonce.toString('hex').slice(0, 16)}...\n`);

  // Build instruction
  const ix = buildStsInstruction(STS_DOMAIN, STS_OP_CREATE_NFT, instructionData, [
    { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]);

  // Derive NFT ID (same as on-chain)
  const nftId = sha256(Buffer.concat([
    Buffer.from('STS_NFT_V1'),
    wallet.publicKey.toBuffer(),
    nonce,
  ]));

  console.log('  📋 NFT Identity:');
  console.log(`     ID:          ${nftId.toString('hex').slice(0, 16)}...`);
  console.log(`     Commitment:  ${recipientCommitment.toString('hex').slice(0, 16)}...\n`);

  // Send transaction
  console.log('  ⏳ Submitting transaction to devnet...\n');
  
  try {
    const tx = new Transaction().add(ix);
    tx.feePayer = wallet.publicKey;
    
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    
    const signature = await sendAndConfirmTransaction(
      connection,
      tx,
      [wallet],
      { commitment: 'confirmed' }
    );

    console.log('  ✅ SUCCESS! NFT Minted on Devnet\n');
    console.log('═'.repeat(60));
    console.log('  🐵 QUARK - THE STYX MONKE');
    console.log('═'.repeat(60));
    console.log(`\n  Transaction:    https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    console.log(`  NFT ID:         ${nftId.toString('hex')}`);
    console.log(`  Owner Secret:   ${ownerSecret.toString('hex').slice(0, 32)}... (SAVE THIS!)`);
    console.log(`\n  🔒 Privacy Level: Silhouette`);
    console.log('     - Metadata is visible (name, image, traits)');
    console.log('     - Owner identity is hidden');
    console.log('     - Only you can prove ownership with the secret\n');
    
    // Save NFT data for future reference
    const nftData = {
      name: nftName,
      symbol: nftSymbol,
      description: nftDescription,
      uri: metadataUri,
      nftId: nftId.toString('hex'),
      nonce: nonce.toString('hex'),
      ownerSecret: ownerSecret.toString('hex'),
      recipientCommitment: recipientCommitment.toString('hex'),
      privacyMode: 'silhouette',
      mintTx: signature,
      mintedAt: new Date().toISOString(),
      network: 'devnet',
    };
    
    console.log('  📁 NFT Data (save this for ownership proofs):');
    console.log(JSON.stringify(nftData, null, 2));
    console.log('');

    return nftData;

  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}\n`);
    
    // Parse Solana error if available
    if (error.logs) {
      console.log('  📜 Transaction Logs:');
      error.logs.slice(-5).forEach(log => console.log(`     ${log}`));
    }
    
    throw error;
  }
}

// Run
mintQuarkNft()
  .then(nft => {
    console.log('\n  🎉 Quark the Styx Monke is now on-chain!');
    console.log('  Welcome to the STS NFT ecosystem.\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n  Error:', err.message);
    process.exit(1);
  });
