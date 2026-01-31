#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SPS TRADEABLE NFT MINTER
 *  Creates a Token-2022 NFT that can be traded on Magic Eden/Tensor
 *  AND shielded into SPS privacy layer when desired
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Flow:
 *   1. Upload image → Irys/Arweave
 *   2. Upload metadata JSON → Irys/Arweave  
 *   3. Mint Token-2022 NFT with Metaplex metadata
 *   4. (Optional) SHIELD into SPS for privacy
 *   5. (Later) UNSHIELD to trade on marketplaces
 * 
 * Result: Real SPL NFT visible in Phantom, tradeable on Magic Eden
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_2022_PROGRAM_ID,
  ExtensionType,
  createInitializeMintInstruction,
  createInitializeMetadataPointerInstruction,
  getMintLen,
  TYPE_SIZE,
  LENGTH_SIZE,
} from '@solana/spl-token';
import {
  createInitializeInstruction,
  createUpdateFieldInstruction,
  pack,
} from '@solana/spl-token-metadata';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Configuration
const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=40d65582-231b-430c-9aef-1012f07e631a';
const WALLET_PATH = '/home/codespace/.config/solana/styxdeploy.json';
const IMAGE_PATH = '/workspaces/StyxStack/programs/styx-private-memo-program/target/bluefoot sardine hat.png';

// NFT Metadata
const NFT_NAME = 'Coach Bluefoot';
const NFT_SYMBOL = 'COACH';
const NFT_DESCRIPTION = 'The legendary Coach Bluefoot - a sardine-hat-wearing wisdom keeper of the Styx Privacy Standard ecosystem. Genesis SPS NFT.';

// For now, use a placeholder URI (we'll update after Irys upload)
// You can replace this with actual Irys URI after upload
const METADATA_URI = 'https://arweave.net/placeholder'; // Will be updated

function loadWallet(keypairPath) {
  const data = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  return Keypair.fromSecretKey(new Uint8Array(data));
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         🖼️  SPS TRADEABLE NFT MINTER (Token-2022)  🖼️            ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║  Creates real SPL NFT → Tradeable on Magic Eden/Tensor          ║');
  console.log('║  Can be SHIELDED into SPS privacy layer                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const wallet = loadWallet(WALLET_PATH);
  console.log(`Wallet: ${wallet.publicKey.toBase58()}`);

  const connection = new Connection(HELIUS_RPC, 'confirmed');
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL\n`);

  if (balance < 0.02 * LAMPORTS_PER_SOL) {
    console.error('❌ Need at least 0.02 SOL for NFT minting');
    process.exit(1);
  }

  // Generate new mint keypair for the NFT
  const mintKeypair = Keypair.generate();
  console.log(`NFT Mint Address: ${mintKeypair.publicKey.toBase58()}`);

  // Metadata for Token-2022 with metadata extension
  const metadata = {
    mint: mintKeypair.publicKey,
    name: NFT_NAME,
    symbol: NFT_SYMBOL,
    uri: METADATA_URI,
    additionalMetadata: [
      ['description', NFT_DESCRIPTION],
      ['standard', 'SPS (Styx Privacy Standard)'],
      ['collection', 'SPS Genesis'],
    ],
  };

  // Calculate space needed for mint with metadata extension
  // Token-2022 mint with MetadataPointer needs proper sizing
  const mintSpace = getMintLen([ExtensionType.MetadataPointer]);
  
  // Metadata space: TYPE_SIZE (2) + LENGTH_SIZE (4) + packed metadata
  const packedMetadata = pack(metadata);
  const metadataSpace = TYPE_SIZE + LENGTH_SIZE + packedMetadata.length;
  
  const totalSpace = mintSpace + metadataSpace;
  const mintRent = await connection.getMinimumBalanceForRentExemption(totalSpace);

  console.log(`Mint space: ${mintSpace} bytes`);
  console.log(`Metadata space: ${metadataSpace} bytes`);
  console.log(`Total: ${totalSpace} bytes`);
  console.log(`Rent: ${(mintRent / LAMPORTS_PER_SOL).toFixed(6)} SOL\n`);

  // Build transaction
  console.log('Building transaction...');
  
  const transaction = new Transaction().add(
    // Create account for mint
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: totalSpace,
      lamports: mintRent,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    // Initialize metadata pointer (points to itself)
    createInitializeMetadataPointerInstruction(
      mintKeypair.publicKey,
      wallet.publicKey, // update authority
      mintKeypair.publicKey, // metadata address (self-referential)
      TOKEN_2022_PROGRAM_ID
    ),
    // Initialize mint
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      0, // decimals = 0 for NFT
      wallet.publicKey, // mint authority
      wallet.publicKey, // freeze authority
      TOKEN_2022_PROGRAM_ID
    ),
    // Initialize metadata
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mintKeypair.publicKey,
      metadata: mintKeypair.publicKey,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      mintAuthority: wallet.publicKey,
      updateAuthority: wallet.publicKey,
    })
  );

  // Add additional metadata fields
  for (const [key, value] of metadata.additionalMetadata) {
    transaction.add(
      createUpdateFieldInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        metadata: mintKeypair.publicKey,
        updateAuthority: wallet.publicKey,
        field: key,
        value: value,
      })
    );
  }

  console.log('Sending transaction...');
  
  try {
    const sig = await sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet, mintKeypair],
      { commitment: 'confirmed' }
    );
    console.log(`\n✅ Mint created! TX: ${sig}`);
  } catch (e) {
    console.error('❌ Mint creation failed:', e.message);
    if (e.logs) {
      console.log('\nLogs:', e.logs.slice(-5));
    }
    process.exit(1);
  }

  // Create token account and mint 1 NFT
  console.log('\nCreating token account and minting NFT...');
  
  try {
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      mintKeypair.publicKey,
      wallet.publicKey,
      false,
      'confirmed',
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    console.log(`Token Account: ${tokenAccount.address.toBase58()}`);

    const mintSig = await mintTo(
      connection,
      wallet,
      mintKeypair.publicKey,
      tokenAccount.address,
      wallet.publicKey,
      1, // Amount = 1 for NFT
      [],
      { commitment: 'confirmed' },
      TOKEN_2022_PROGRAM_ID
    );
    console.log(`✅ NFT Minted! TX: ${mintSig}`);
  } catch (e) {
    console.error('❌ Minting failed:', e.message);
    process.exit(1);
  }

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                    🎉 NFT CREATED SUCCESSFULLY! 🎉              ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  Name: ${NFT_NAME.padEnd(55)}║`);
  console.log(`║  Symbol: ${NFT_SYMBOL.padEnd(53)}║`);
  console.log(`║  Mint: ${mintKeypair.publicKey.toBase58().slice(0, 44)}...  ║`);
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║  View on Solscan:                                                ║');
  console.log(`║  https://solscan.io/token/${mintKeypair.publicKey.toBase58().slice(0, 30)}...  ║`);
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║  Next steps:                                                      ║');
  console.log('║  1. Upload image to Irys → Update metadata URI                    ║');
  console.log('║  2. View in Phantom wallet                                        ║');
  console.log('║  3. Trade on Magic Eden / Tensor                                  ║');
  console.log('║  4. SHIELD into SPS for privacy when desired                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log(`Full mint address: ${mintKeypair.publicKey.toBase58()}`);
  console.log(`Solscan: https://solscan.io/token/${mintKeypair.publicKey.toBase58()}`);
}

main().catch(console.error);
