#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SPS TRADEABLE NFT MINTER - Metaplex Standard
 *  Creates a standard SPL NFT with Metaplex metadata
 *  Tradeable on Magic Eden/Tensor, can be SHIELDED into SPS
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
  TOKEN_PROGRAM_ID,
  createSetAuthorityInstruction,
  AuthorityType,
} from '@solana/spl-token';
import mplTokenMetadata from '@metaplex-foundation/mpl-token-metadata';
const { createCreateMetadataAccountV3Instruction } = mplTokenMetadata;
import fs from 'fs';

// Metaplex Token Metadata Program ID
const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// Configuration
const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=40d65582-231b-430c-9aef-1012f07e631a';
const WALLET_PATH = '/home/codespace/.config/solana/styxdeploy.json';

// NFT Metadata (placeholder - update with Irys URI)
const NFT_NAME = 'Coach Bluefoot';
const NFT_SYMBOL = 'COACH';
const METADATA_URI = 'https://arweave.net/placeholder'; // Update after Irys upload

function loadWallet(keypairPath) {
  const data = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  return Keypair.fromSecretKey(new Uint8Array(data));
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║      🖼️  SPS TRADEABLE NFT MINTER (Metaplex Standard)  🖼️        ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║  Creates real SPL NFT → Tradeable on Magic Eden/Tensor          ║');
  console.log('║  Can be SHIELDED into SPS privacy layer                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const wallet = loadWallet(WALLET_PATH);
  console.log(`Wallet: ${wallet.publicKey.toBase58()}`);

  const connection = new Connection(HELIUS_RPC, 'confirmed');
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL\n`);

  if (balance < 0.03 * LAMPORTS_PER_SOL) {
    console.error('❌ Need at least 0.03 SOL for NFT minting');
    process.exit(1);
  }

  // Step 1: Create mint
  console.log('Step 1: Creating mint...');
  const mintKeypair = Keypair.generate();
  
  const mint = await createMint(
    connection,
    wallet,
    wallet.publicKey,  // mint authority
    wallet.publicKey,  // freeze authority
    0,                 // decimals = 0 for NFT
    mintKeypair,
    { commitment: 'confirmed' },
    TOKEN_PROGRAM_ID
  );
  console.log(`  Mint: ${mint.toBase58()}`);

  // Step 2: Create token account
  console.log('Step 2: Creating token account...');
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    mint,
    wallet.publicKey,
    false,
    'confirmed',
    undefined,
    TOKEN_PROGRAM_ID
  );
  console.log(`  Token Account: ${tokenAccount.address.toBase58()}`);

  // Step 3: Mint 1 token
  console.log('Step 3: Minting NFT...');
  await mintTo(
    connection,
    wallet,
    mint,
    tokenAccount.address,
    wallet.publicKey,
    1,
    [],
    { commitment: 'confirmed' },
    TOKEN_PROGRAM_ID
  );
  console.log('  ✅ Minted 1 token');

  // Step 4: Create Metaplex metadata
  console.log('Step 4: Creating Metaplex metadata...');
  
  // Derive metadata PDA
  const [metadataPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );

  const metadataData = {
    name: NFT_NAME,
    symbol: NFT_SYMBOL,
    uri: METADATA_URI,
    sellerFeeBasisPoints: 500, // 5% royalty
    creators: [
      {
        address: wallet.publicKey,
        verified: true,
        share: 100,
      },
    ],
    collection: null,
    uses: null,
  };

  const createMetadataIx = createCreateMetadataAccountV3Instruction(
    {
      metadata: metadataPDA,
      mint: mint,
      mintAuthority: wallet.publicKey,
      payer: wallet.publicKey,
      updateAuthority: wallet.publicKey,
    },
    {
      createMetadataAccountArgsV3: {
        data: metadataData,
        isMutable: true,
        collectionDetails: null,
      },
    }
  );

  const tx = new Transaction().add(createMetadataIx);
  const sig = await sendAndConfirmTransaction(connection, tx, [wallet], { commitment: 'confirmed' });
  console.log(`  ✅ Metadata created: ${sig.slice(0, 20)}...`);

  // Step 5: Remove mint authority (makes it a true NFT)
  console.log('Step 5: Removing mint authority (finalizing NFT)...');
  const removeMintAuthIx = createSetAuthorityInstruction(
    mint,
    wallet.publicKey,
    AuthorityType.MintTokens,
    null, // Remove mint authority
    [],
    TOKEN_PROGRAM_ID
  );
  
  const tx2 = new Transaction().add(removeMintAuthIx);
  await sendAndConfirmTransaction(connection, tx2, [wallet], { commitment: 'confirmed' });
  console.log('  ✅ Mint authority removed - NFT is now immutable');

  // Summary
  const finalBalance = await connection.getBalance(wallet.publicKey);
  const spent = (balance - finalBalance) / LAMPORTS_PER_SOL;

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                    🎉 NFT CREATED SUCCESSFULLY! 🎉              ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  Name: ${NFT_NAME.padEnd(55)}║`);
  console.log(`║  Symbol: ${NFT_SYMBOL.padEnd(53)}║`);
  console.log(`║  Mint: ${mint.toBase58()}  ║`);
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║  Links:                                                          ║');
  console.log(`║  Solscan: https://solscan.io/token/${mint.toBase58().slice(0, 25)}... ║`);
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  SOL Spent: ${spent.toFixed(6)} SOL                                     ║`);
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║  Next: Upload image to Irys and update metadata URI              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log(`\nFull mint address: ${mint.toBase58()}`);
  console.log(`View on Solscan: https://solscan.io/token/${mint.toBase58()}`);
  console.log(`View on Magic Eden: https://magiceden.io/item-details/${mint.toBase58()}`);
}

main().catch(console.error);
