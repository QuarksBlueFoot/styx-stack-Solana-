#!/usr/bin/env node
/**
 * Upload Coach Bluefoot image + metadata to Irys (Arweave)
 * Then update NFT metadata URI
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import Irys from '@irys/sdk';
import fs from 'fs';

const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=40d65582-231b-430c-9aef-1012f07e631a';
const WALLET_PATH = '/home/codespace/.config/solana/styxdeploy.json';
const IMAGE_PATH = '/workspaces/StyxStack/programs/styx-private-memo-program/target/bluefoot sardine hat.png';
const MINT = new PublicKey('DMJan7rXoMqopuBExnF8oZTekPgG36EHthgNjCtj1uNt');
const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// NFT Info
const NFT_NAME = 'Coach Bluefoot';
const NFT_SYMBOL = 'COACH';
const NFT_DESCRIPTION = 'The legendary Coach Bluefoot - a sardine-hat-wearing wisdom keeper of the Styx Privacy Standard ecosystem. Genesis SPS NFT that can be SHIELDED into privacy or traded openly on marketplaces.';

function loadWallet(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║      🐟 COACH BLUEFOOT - Upload to Irys + Update NFT  🐟         ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const walletData = loadWallet(WALLET_PATH);
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  console.log(`Wallet: ${wallet.publicKey.toBase58()}`);

  // Check image
  const imageStats = fs.statSync(IMAGE_PATH);
  console.log(`Image: ${(imageStats.size / 1024).toFixed(1)} KB`);

  // Initialize Irys
  console.log('\nInitializing Irys...');
  const irys = new Irys({
    network: 'mainnet',
    token: 'solana',
    key: walletData,
    config: { providerUrl: HELIUS_RPC }
  });

  // Get price estimate
  const totalBytes = imageStats.size + 2000; // image + metadata JSON
  const price = await irys.getPrice(totalBytes);
  console.log(`Upload cost: ~${irys.utils.fromAtomic(price)} SOL`);

  // Check/fund Irys balance
  let balance = await irys.getLoadedBalance();
  console.log(`Irys balance: ${irys.utils.fromAtomic(balance)} SOL`);

  if (balance.lt(price)) {
    const fundAmount = price.multipliedBy(1.5); // 50% buffer
    console.log(`\nFunding Irys with ${irys.utils.fromAtomic(fundAmount)} SOL...`);
    try {
      const fundTx = await irys.fund(fundAmount);
      console.log(`✅ Funded: ${fundTx.id}`);
      balance = await irys.getLoadedBalance();
    } catch (e) {
      console.error('❌ Funding failed:', e.message);
      return;
    }
  }

  // Upload image
  console.log('\nUploading image to Arweave via Irys...');
  const imageTags = [
    { name: 'Content-Type', value: 'image/png' },
    { name: 'App-Name', value: 'SPS-NFT' },
    { name: 'NFT-Name', value: NFT_NAME },
  ];

  const imageReceipt = await irys.uploadFile(IMAGE_PATH, { tags: imageTags });
  const imageUrl = `https://arweave.net/${imageReceipt.id}`;
  console.log(`✅ Image uploaded: ${imageUrl}`);

  // Create metadata JSON
  const metadata = {
    name: NFT_NAME,
    symbol: NFT_SYMBOL,
    description: NFT_DESCRIPTION,
    image: imageUrl,
    external_url: 'https://github.com/QuarksBlueFoot/StyxStack',
    attributes: [
      { trait_type: 'Collection', value: 'SPS Genesis' },
      { trait_type: 'Standard', value: 'SPS (Styx Privacy Standard)' },
      { trait_type: 'Hat Type', value: 'Sardine' },
      { trait_type: 'Rarity', value: 'Genesis' },
      { trait_type: 'Privacy', value: 'SHIELD-capable' },
    ],
    properties: {
      category: 'image',
      files: [{ uri: imageUrl, type: 'image/png' }],
      creators: [{ address: wallet.publicKey.toBase58(), share: 100 }],
    },
    collection: {
      name: 'SPS Genesis',
      family: 'Styx Privacy Standard',
    },
  };

  // Upload metadata
  console.log('\nUploading metadata JSON...');
  const metadataTags = [
    { name: 'Content-Type', value: 'application/json' },
    { name: 'App-Name', value: 'SPS-NFT' },
  ];

  const metadataReceipt = await irys.upload(JSON.stringify(metadata, null, 2), { tags: metadataTags });
  const metadataUrl = `https://arweave.net/${metadataReceipt.id}`;
  console.log(`✅ Metadata uploaded: ${metadataUrl}`);

  // Now update the on-chain metadata
  console.log('\nUpdating on-chain NFT metadata...');
  
  const connection = new Connection(HELIUS_RPC, 'confirmed');
  
  // Derive metadata PDA
  const [metadataPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), METADATA_PROGRAM_ID.toBuffer(), MINT.toBuffer()],
    METADATA_PROGRAM_ID
  );

  // UpdateMetadataAccountV2 instruction (discriminator = 15)
  const newName = NFT_NAME;
  const newSymbol = NFT_SYMBOL;
  const newUri = metadataUrl;
  
  // Build instruction data for UpdateMetadataAccountV2
  // discriminator(1) + option(1) + data...
  const nameLen = Math.min(newName.length, 32);
  const symbolLen = Math.min(newSymbol.length, 10);
  const uriLen = Math.min(newUri.length, 200);
  
  let size = 1 + 1; // discriminator + option<data>
  size += 4 + nameLen + 4 + symbolLen + 4 + uriLen + 2; // strings + fee
  size += 1 + 4 + (32 + 1 + 1); // creators option + vec + 1 creator
  size += 1 + 1; // collection + uses = None
  size += 1; // option<updateAuthority> = None
  size += 1; // option<primarySaleHappened> = None
  size += 1; // option<isMutable> = None

  const data = Buffer.alloc(size);
  let offset = 0;

  // Discriminator for UpdateMetadataAccountV2 = 15
  data[offset++] = 15;
  
  // Some(data)
  data[offset++] = 1;
  
  // name
  data.writeUInt32LE(nameLen, offset); offset += 4;
  Buffer.from(newName.slice(0, nameLen)).copy(data, offset); offset += nameLen;
  
  // symbol
  data.writeUInt32LE(symbolLen, offset); offset += 4;
  Buffer.from(newSymbol.slice(0, symbolLen)).copy(data, offset); offset += symbolLen;
  
  // uri
  data.writeUInt32LE(uriLen, offset); offset += 4;
  Buffer.from(newUri.slice(0, uriLen)).copy(data, offset); offset += uriLen;
  
  // seller_fee_basis_points
  data.writeUInt16LE(500, offset); offset += 2;
  
  // creators: Some([{wallet, true, 100}])
  data[offset++] = 1; // Some
  data.writeUInt32LE(1, offset); offset += 4; // 1 creator
  wallet.publicKey.toBuffer().copy(data, offset); offset += 32;
  data[offset++] = 1; // verified
  data[offset++] = 100; // share
  
  // collection = None
  data[offset++] = 0;
  
  // uses = None
  data[offset++] = 0;
  
  // updateAuthority = None (don't change)
  data[offset++] = 0;
  
  // primarySaleHappened = None
  data[offset++] = 0;
  
  // isMutable = None (keep mutable)
  data[offset++] = 0;

  const updateIx = new TransactionInstruction({
    programId: METADATA_PROGRAM_ID,
    keys: [
      { pubkey: metadataPDA, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
    ],
    data: data.slice(0, offset),
  });

  try {
    const tx = new Transaction().add(updateIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [wallet], { commitment: 'confirmed' });
    console.log(`✅ On-chain metadata updated: ${sig.slice(0, 20)}...`);
  } catch (e) {
    console.error('❌ Update failed:', e.message);
    if (e.logs) console.log('Logs:', e.logs.slice(-3));
  }

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║              🎉 COACH BLUEFOOT NFT COMPLETE! 🎉                  ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  Image: ${imageUrl.slice(0, 50)}...  ║`);
  console.log(`║  Metadata: ${metadataUrl.slice(0, 47)}...  ║`);
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║  View NFT:                                                        ║');
  console.log(`║  https://solscan.io/token/${MINT.toBase58().slice(0, 30)}...  ║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log(`Full image URL: ${imageUrl}`);
  console.log(`Full metadata URL: ${metadataUrl}`);
  console.log(`\nSolscan: https://solscan.io/token/${MINT.toBase58()}`);
  console.log(`Magic Eden: https://magiceden.io/item-details/${MINT.toBase58()}`);
}

main().catch(console.error);
