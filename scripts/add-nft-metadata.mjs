#!/usr/bin/env node
/**
 * Add Metaplex metadata to existing NFT mint
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
import fs from 'fs';

const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=40d65582-231b-430c-9aef-1012f07e631a';
const WALLET_PATH = '/home/codespace/.config/solana/styxdeploy.json';
const MINT = new PublicKey('DMJan7rXoMqopuBExnF8oZTekPgG36EHthgNjCtj1uNt');

// Metaplex Token Metadata Program
const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// NFT Metadata
const NFT_NAME = 'Coach Bluefoot';
const NFT_SYMBOL = 'COACH';
const NFT_URI = 'https://arweave.net/placeholder'; // Update with Irys URI later

function loadWallet(keypairPath) {
  const data = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  return Keypair.fromSecretKey(new Uint8Array(data));
}

// Serialize string with length prefix (4 bytes)
function serializeString(str, maxLen) {
  const buf = Buffer.alloc(4 + maxLen);
  buf.writeUInt32LE(str.length, 0);
  Buffer.from(str).copy(buf, 4);
  return buf;
}

// Create CreateMetadataAccountV3 instruction manually
function createMetadataInstruction(
  metadata,
  mint,
  mintAuthority,
  payer,
  updateAuthority,
  name,
  symbol,
  uri,
  sellerFeeBasisPoints,
  creators
) {
  // Instruction discriminator for CreateMetadataAccountV3 = 33
  const discriminator = Buffer.from([33]);
  
  // Data layout for CreateMetadataAccountArgsV3:
  // - name: String (4 + len)
  // - symbol: String (4 + len)
  // - uri: String (4 + len)
  // - seller_fee_basis_points: u16
  // - creators: Option<Vec<Creator>>
  // - collection: Option<Collection> = None
  // - uses: Option<Uses> = None
  // - is_mutable: bool
  // - collection_details: Option<CollectionDetails> = None
  
  const nameLen = Math.min(name.length, 32);
  const symbolLen = Math.min(symbol.length, 10);
  const uriLen = Math.min(uri.length, 200);
  
  // Calculate total size
  let size = 1; // discriminator
  size += 4 + nameLen; // name
  size += 4 + symbolLen; // symbol
  size += 4 + uriLen; // uri
  size += 2; // seller_fee_basis_points
  
  // Creators: Option + len + creator data
  size += 1; // Some(creators)
  size += 4; // creators len
  size += creators.length * (32 + 1 + 1); // address + verified + share
  
  size += 1; // collection = None
  size += 1; // uses = None
  size += 1; // is_mutable
  size += 1; // collection_details = None
  
  const data = Buffer.alloc(size);
  let offset = 0;
  
  // Discriminator
  data[offset++] = 33;
  
  // Name (4-byte length prefix + string)
  data.writeUInt32LE(nameLen, offset); offset += 4;
  Buffer.from(name.slice(0, nameLen)).copy(data, offset); offset += nameLen;
  
  // Symbol
  data.writeUInt32LE(symbolLen, offset); offset += 4;
  Buffer.from(symbol.slice(0, symbolLen)).copy(data, offset); offset += symbolLen;
  
  // URI
  data.writeUInt32LE(uriLen, offset); offset += 4;
  Buffer.from(uri.slice(0, uriLen)).copy(data, offset); offset += uriLen;
  
  // Seller fee basis points
  data.writeUInt16LE(sellerFeeBasisPoints, offset); offset += 2;
  
  // Creators: Some
  data[offset++] = 1;
  // Creators vec length
  data.writeUInt32LE(creators.length, offset); offset += 4;
  // Creator data
  for (const creator of creators) {
    creator.address.toBuffer().copy(data, offset); offset += 32;
    data[offset++] = creator.verified ? 1 : 0;
    data[offset++] = creator.share;
  }
  
  // Collection = None
  data[offset++] = 0;
  
  // Uses = None
  data[offset++] = 0;
  
  // is_mutable
  data[offset++] = 1;
  
  // collection_details = None
  data[offset++] = 0;
  
  return new TransactionInstruction({
    programId: METADATA_PROGRAM_ID,
    keys: [
      { pubkey: metadata, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: mintAuthority, isSigner: true, isWritable: false },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: updateAuthority, isSigner: false, isWritable: false },
      { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false },
    ],
    data: data.slice(0, offset),
  });
}

async function main() {
  console.log('\n=== Adding Metaplex Metadata to NFT ===\n');

  const wallet = loadWallet(WALLET_PATH);
  console.log(`Wallet: ${wallet.publicKey.toBase58()}`);
  console.log(`Mint: ${MINT.toBase58()}`);

  const connection = new Connection(HELIUS_RPC, 'confirmed');
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL\n`);

  // Derive metadata PDA
  const [metadataPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      METADATA_PROGRAM_ID.toBuffer(),
      MINT.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );
  console.log(`Metadata PDA: ${metadataPDA.toBase58()}`);

  // Check if metadata already exists
  const metadataInfo = await connection.getAccountInfo(metadataPDA);
  if (metadataInfo) {
    console.log('✅ Metadata already exists!');
    console.log(`\nView NFT: https://solscan.io/token/${MINT.toBase58()}`);
    return;
  }

  console.log('Creating metadata...');
  
  const creators = [
    {
      address: wallet.publicKey,
      verified: true,
      share: 100,
    },
  ];

  const ix = createMetadataInstruction(
    metadataPDA,
    MINT,
    wallet.publicKey,
    wallet.publicKey,
    wallet.publicKey,
    NFT_NAME,
    NFT_SYMBOL,
    NFT_URI,
    500, // 5% royalty
    creators
  );

  const tx = new Transaction().add(ix);
  
  try {
    const sig = await sendAndConfirmTransaction(connection, tx, [wallet], { commitment: 'confirmed' });
    console.log(`\n✅ Metadata created! TX: ${sig}`);
    console.log(`\nView NFT: https://solscan.io/token/${MINT.toBase58()}`);
    console.log(`Magic Eden: https://magiceden.io/item-details/${MINT.toBase58()}`);
  } catch (e) {
    console.error('Error:', e.message);
    if (e.logs) console.log('Logs:', e.logs.slice(-5));
  }
}

main().catch(console.error);
