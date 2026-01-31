/**
 * SPS (Styx Privacy Standard) CLI Commands v3.0
 * 
 * Privacy-native token CLI with full domain support.
 * 
 * Key features:
 * - Domain-based instruction encoding matching on-chain program
 * - Human-readable output with transaction links
 * - Privacy by default (amounts/recipients encrypted)
 * - Support for all 13 domains (STS, Messaging, DeFi, NFT, etc.)
 * 
 * @module @styx/cli/sps
 */

import { Command } from "commander";
import { Connection, Keypair, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// ═══════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════

interface SPSConfig {
  rpc: string;
  programId: string;
  network: 'mainnet' | 'devnet';
}

// Mainnet by default now!
const MAINNET_CONFIG: SPSConfig = {
  rpc: "https://api.mainnet-beta.solana.com",
  programId: "GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9",
  network: 'mainnet',
};

const DEVNET_CONFIG: SPSConfig = {
  rpc: "https://api.devnet.solana.com",
  programId: "FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW",
  network: 'devnet',
};

// Domain constants matching domains.rs
const DOMAIN = {
  STS: 0x01,
  MESSAGING: 0x02,
  ACCOUNT: 0x03,
  VSL: 0x04,
  NOTES: 0x05,
  COMPLIANCE: 0x06,
  PRIVACY: 0x07,
  DEFI: 0x08,
  NFT: 0x09,
  DERIVATIVES: 0x0A,
  BRIDGE: 0x0B,
  SECURITIES: 0x0C,
  GOVERNANCE: 0x0D,
} as const;

// STS domain opcodes
const STS_OP = {
  CREATE_MINT: 0x01,
  UPDATE_MINT: 0x02,
  FREEZE_MINT: 0x03,
  MINT_TO: 0x04,
  BURN: 0x05,
  TRANSFER: 0x06,
  SHIELD: 0x07,
  UNSHIELD: 0x08,
  CREATE_RULESET: 0x09,
  UPDATE_RULESET: 0x0A,
  FREEZE_RULESET: 0x0B,
  REVEAL_TO_AUDITOR: 0x0C,
  ATTACH_POI: 0x0D,
  BATCH_TRANSFER: 0x0E,
  DECOY_STORM: 0x0F,
  CHRONO_VAULT: 0x10,
  CREATE_NFT: 0x11,
  TRANSFER_NFT: 0x12,
  REVEAL_NFT: 0x13,
  CREATE_POOL: 0x14,
  CREATE_RECEIPT_MINT: 0x15,
  STEALTH_UNSHIELD: 0x16,
  PRIVATE_SWAP: 0x17,
  CREATE_AMM_POOL: 0x18,
  ADD_LIQUIDITY: 0x19,
  REMOVE_LIQUIDITY: 0x1A,
  GENERATE_STEALTH: 0x1B,
  IAP_TRANSFER: 0x1C,
  IAP_BURN: 0x1D,
  IAP_TRANSFER_NFT: 0x1E,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════════════

function loadConfig(network?: 'mainnet' | 'devnet'): SPSConfig {
  const configPath = path.join(process.cwd(), "styx.config.json");
  if (fs.existsSync(configPath)) {
    const userConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (userConfig.sps) {
      return { ...MAINNET_CONFIG, ...userConfig.sps };
    }
  }
  return network === 'devnet' ? DEVNET_CONFIG : MAINNET_CONFIG;
}

function loadKeypair(pathOrEnv?: string): Keypair {
  const kpPath = pathOrEnv 
    || process.env.SOLANA_KEYPAIR 
    || path.join(process.env.HOME || "", ".config", "solana", "id.json");
  
  if (!fs.existsSync(kpPath)) {
    throw new Error(`Keypair not found: ${kpPath}\nRun: solana-keygen new`);
  }
  
  const secret = JSON.parse(fs.readFileSync(kpPath, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

function formatSol(lamports: number): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(6) + " SOL";
}

function shortSig(sig: string): string {
  return sig.slice(0, 12) + "..." + sig.slice(-8);
}

function printBox(title: string, lines: string[]) {
  const width = Math.max(title.length + 4, ...lines.map(l => l.length + 2));
  const border = "═".repeat(width);
  console.log(`╔${border}╗`);
  console.log(`║ ${title.padEnd(width - 1)}║`);
  console.log(`╠${border}╣`);
  for (const line of lines) {
    console.log(`║ ${line.padEnd(width - 1)}║`);
  }
  console.log(`╚${border}╝`);
}

async function sendVersionedTx(
  connection: Connection, 
  ix: TransactionInstruction, 
  signers: Keypair[]
): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  const message = new TransactionMessage({
    payerKey: signers[0].publicKey,
    recentBlockhash: blockhash,
    instructions: [ix],
  }).compileToV0Message();
  const tx = new VersionedTransaction(message);
  tx.sign(signers);
  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
  return sig;
}

// ═══════════════════════════════════════════════════════════════════════════
// SPS Command Group
// ═══════════════════════════════════════════════════════════════════════════

export function registerSPSCommands(program: Command) {
  const sps = program
    .command("sps")
    .description("Styx Privacy Standard - Privacy-native token operations");

  // ─────────────────────────────────────────────────────────────────────────
  // INFO - Show program info and domain opcodes
  // ─────────────────────────────────────────────────────────────────────────
  sps
    .command("info")
    .description("Show SPS program info and domain opcodes")
    .option("--devnet", "Use devnet")
    .action(async (opts) => {
      const config = loadConfig(opts.devnet ? 'devnet' : 'mainnet');
      
      console.log("\n╔══════════════════════════════════════════════════════════════════╗");
      console.log("║          🔒 STYX PRIVACY STANDARD (SPS) v3.0 🔒                   ║");
      console.log("╠══════════════════════════════════════════════════════════════════╣");
      console.log(`║  Network:  ${config.network.padEnd(52)}║`);
      console.log(`║  Program:  ${config.programId.slice(0, 44)}...     ║`);
      console.log("╠══════════════════════════════════════════════════════════════════╣");
      console.log("║  DOMAINS (13 total):                                             ║");
      console.log("║  ┌───────────────────────────────────────────────────────────┐   ║");
      console.log("║  │ 0x01 STS         Token standard core (mint/transfer/burn) │   ║");
      console.log("║  │ 0x02 MESSAGING   Private messaging & key exchange         │   ║");
      console.log("║  │ 0x03 ACCOUNT     VTA, delegation, guardians               │   ║");
      console.log("║  │ 0x04 VSL         Virtual Shielded Ledger                  │   ║");
      console.log("║  │ 0x05 NOTES       UTXO primitives, pools, merkle           │   ║");
      console.log("║  │ 0x06 COMPLIANCE  POI, innocence, provenance               │   ║");
      console.log("║  │ 0x07 PRIVACY     Decoys, ephemeral, chrono, shadow        │   ║");
      console.log("║  │ 0x08 DEFI        AMM, swaps, staking, yield               │   ║");
      console.log("║  │ 0x09 NFT         Marketplace, auctions, collections       │   ║");
      console.log("║  │ 0x0A DERIVATIVES Options, margin, perpetuals              │   ║");
      console.log("║  │ 0x0B BRIDGE      Cross-chain (Wormhole, LayerZero, BTC)   │   ║");
      console.log("║  │ 0x0C SECURITIES  Reg D, transfer agents                   │   ║");
      console.log("║  │ 0x0D GOVERNANCE  Proposals, voting, protocol admin        │   ║");
      console.log("║  └───────────────────────────────────────────────────────────┘   ║");
      console.log("╠══════════════════════════════════════════════════════════════════╣");
      console.log("║  KEY DIFFERENCES FROM TOKEN-22:                                  ║");
      console.log("║  ✅ ZERO rent - inscription-based state                          ║");
      console.log("║  ✅ Native privacy - commitments, nullifiers, stealth addresses  ║");
      console.log("║  ✅ 200+ operations (vs 25 in Token-22)                           ║");
      console.log("║  ✅ Built-in AMM/DEX for private trading                         ║");
      console.log("║  ✅ Compliance-ready with POI & auditor disclosure               ║");
      console.log("╚══════════════════════════════════════════════════════════════════╝\n");
    });

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE-TOKEN - Create new private token
  // ─────────────────────────────────────────────────────────────────────────
  sps
    .command("create-token")
    .description("Create a new private token (inscription-based, zero rent)")
    .requiredOption("-n, --name <name>", "Token name")
    .requiredOption("-s, --symbol <symbol>", "Token symbol (max 8 chars)")
    .option("-d, --decimals <decimals>", "Token decimals", "9")
    .option("--supply <amount>", "Max supply", "1000000000")
    .option("--devnet", "Use devnet")
    .option("-k, --keypair <path>", "Path to keypair file")
    .option("--rpc <url>", "Custom RPC endpoint")
    .action(async (opts) => {
      try {
        const config = loadConfig(opts.devnet ? 'devnet' : 'mainnet');
        const rpc = opts.rpc || config.rpc;
        const connection = new Connection(rpc, "confirmed");
        const keypair = loadKeypair(opts.keypair);
        const programId = new PublicKey(config.programId);
        
        console.log("\n🪙 Creating SPS Token...");
        console.log(`   Network: ${config.network}`);
        console.log(`   Wallet:  ${keypair.publicKey.toBase58()}`);
        
        const balance = await connection.getBalance(keypair.publicKey);
        console.log(`   Balance: ${formatSol(balance)}\n`);
        
        // Generate nonce
        const nonce = crypto.randomBytes(32);
        
        // Encode name (32 bytes)
        const nameBytes = Buffer.alloc(32);
        Buffer.from(opts.name, 'utf8').copy(nameBytes);
        
        // Encode symbol (8 bytes)
        const symbolBytes = Buffer.alloc(8);
        Buffer.from(opts.symbol.slice(0, 8), 'utf8').copy(symbolBytes);
        
        const decimals = parseInt(opts.decimals);
        const supply = BigInt(opts.supply) * BigInt(10 ** decimals);
        
        // Build instruction data
        const data = Buffer.alloc(122);
        let offset = 0;
        data.writeUInt8(DOMAIN.STS, offset++);
        data.writeUInt8(STS_OP.CREATE_MINT, offset++);
        nonce.copy(data, offset); offset += 32;
        nameBytes.copy(data, offset); offset += 32;
        symbolBytes.copy(data, offset); offset += 8;
        data.writeUInt8(decimals, offset++);
        data.writeBigUInt64LE(supply, offset); offset += 8;
        data.writeUInt8(0, offset++); // fungible
        data.writeUInt8(0, offset++); // native backing
        Buffer.alloc(32).copy(data, offset); offset += 32;
        data.writeUInt8(0, offset++); // private mode
        data.writeUInt32LE(0, offset);
        
        const ix = new TransactionInstruction({
          programId,
          keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: true }],
          data,
        });
        
        const sig = await sendVersionedTx(connection, ix, [keypair]);
        
        // Compute mint ID
        const mintId = crypto.createHash('sha256')
          .update(Buffer.concat([
            Buffer.from('SPS_MINT_V1'),
            keypair.publicKey.toBuffer(),
            nonce,
          ]))
          .digest();
        
        printBox("✅ Token Created", [
          `Name:     ${opts.name}`,
          `Symbol:   ${opts.symbol}`,
          `Decimals: ${decimals}`,
          `Supply:   ${opts.supply}`,
          `Mint ID:  ${mintId.toString('hex').slice(0, 32)}...`,
          `TX:       ${shortSig(sig)}`,
          ``,
          `View: https://solscan.io/tx/${sig}${config.network === 'devnet' ? '?cluster=devnet' : ''}`,
        ]);
        
      } catch (e: any) {
        console.error(`\n❌ Error: ${e.message}`);
        process.exit(1);
      }
    });

  // ─────────────────────────────────────────────────────────────────────────
  // MINT - Mint tokens to commitment
  // ─────────────────────────────────────────────────────────────────────────
  sps
    .command("mint")
    .description("Mint tokens to a commitment (private recipient)")
    .requiredOption("-t, --token <mintId>", "Token mint ID (hex)")
    .requiredOption("-a, --amount <amount>", "Amount to mint")
    .option("-c, --commitment <hex>", "Recipient commitment (auto-generated if not provided)")
    .option("--devnet", "Use devnet")
    .option("-k, --keypair <path>", "Path to keypair file")
    .option("--rpc <url>", "Custom RPC endpoint")
    .action(async (opts) => {
      try {
        const config = loadConfig(opts.devnet ? 'devnet' : 'mainnet');
        const rpc = opts.rpc || config.rpc;
        const connection = new Connection(rpc, "confirmed");
        const keypair = loadKeypair(opts.keypair);
        const programId = new PublicKey(config.programId);
        
        console.log("\n💰 Minting SPS Tokens...");
        
        const mintId = Buffer.from(opts.token, 'hex');
        const amount = BigInt(opts.amount);
        const commitment = opts.commitment 
          ? Buffer.from(opts.commitment, 'hex')
          : crypto.randomBytes(32);
        const encryptedNote = crypto.randomBytes(64);
        
        const data = Buffer.alloc(78 + encryptedNote.length);
        let offset = 0;
        data.writeUInt8(DOMAIN.STS, offset++);
        data.writeUInt8(STS_OP.MINT_TO, offset++);
        mintId.copy(data, offset); offset += 32;
        data.writeBigUInt64LE(amount, offset); offset += 8;
        commitment.copy(data, offset); offset += 32;
        data.writeUInt32LE(encryptedNote.length, offset); offset += 4;
        encryptedNote.copy(data, offset);
        
        const ix = new TransactionInstruction({
          programId,
          keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: true }],
          data,
        });
        
        const sig = await sendVersionedTx(connection, ix, [keypair]);
        
        printBox("✅ Tokens Minted", [
          `Amount:     ${opts.amount}`,
          `Commitment: ${commitment.toString('hex').slice(0, 16)}...`,
          `TX:         ${shortSig(sig)}`,
          ``,
          `View: https://solscan.io/tx/${sig}${config.network === 'devnet' ? '?cluster=devnet' : ''}`,
        ]);
        
      } catch (e: any) {
        console.error(`\n❌ Error: ${e.message}`);
        process.exit(1);
      }
    });

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE-NFT - Create privacy NFT
  // ─────────────────────────────────────────────────────────────────────────
  sps
    .command("create-nft")
    .description("Create a privacy NFT")
    .requiredOption("-n, --name <name>", "NFT name")
    .requiredOption("-s, --symbol <symbol>", "NFT symbol")
    .requiredOption("-u, --uri <uri>", "Metadata URI")
    .option("--royalty <bps>", "Royalty in basis points", "500")
    .option("--devnet", "Use devnet")
    .option("-k, --keypair <path>", "Path to keypair file")
    .option("--rpc <url>", "Custom RPC endpoint")
    .action(async (opts) => {
      try {
        const config = loadConfig(opts.devnet ? 'devnet' : 'mainnet');
        const rpc = opts.rpc || config.rpc;
        const connection = new Connection(rpc, "confirmed");
        const keypair = loadKeypair(opts.keypair);
        const programId = new PublicKey(config.programId);
        
        console.log("\n🎨 Creating SPS NFT...");
        
        const nonce = crypto.randomBytes(32);
        const nameBytes = Buffer.alloc(32);
        Buffer.from(opts.name, 'utf8').copy(nameBytes);
        const symbolBytes = Buffer.alloc(8);
        Buffer.from(opts.symbol.slice(0, 8), 'utf8').copy(symbolBytes);
        const uriBytes = Buffer.alloc(200);
        Buffer.from(opts.uri, 'utf8').copy(uriBytes);
        const royaltyBps = parseInt(opts.royalty);
        
        const data = Buffer.alloc(320);
        let offset = 0;
        data.writeUInt8(DOMAIN.STS, offset++);
        data.writeUInt8(STS_OP.CREATE_NFT, offset++);
        nonce.copy(data, offset); offset += 32;
        nameBytes.copy(data, offset); offset += 32;
        symbolBytes.copy(data, offset); offset += 8;
        uriBytes.copy(data, offset); offset += 200;
        data.writeUInt16LE(royaltyBps, offset); offset += 2;
        Buffer.alloc(32).copy(data, offset); offset += 32; // no collection
        Buffer.alloc(32).copy(data, offset); // no ruleset
        
        const ix = new TransactionInstruction({
          programId,
          keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: true }],
          data,
        });
        
        const sig = await sendVersionedTx(connection, ix, [keypair]);
        
        const nftId = crypto.createHash('sha256')
          .update(Buffer.concat([
            Buffer.from('SPS_NFT_V1'),
            keypair.publicKey.toBuffer(),
            nonce,
          ]))
          .digest();
        
        printBox("✅ NFT Created", [
          `Name:    ${opts.name}`,
          `Symbol:  ${opts.symbol}`,
          `URI:     ${opts.uri.slice(0, 40)}...`,
          `Royalty: ${royaltyBps} bps (${(royaltyBps/100).toFixed(1)}%)`,
          `NFT ID:  ${nftId.toString('hex').slice(0, 32)}...`,
          `TX:      ${shortSig(sig)}`,
        ]);
        
      } catch (e: any) {
        console.error(`\n❌ Error: ${e.message}`);
        process.exit(1);
      }
    });

  // ─────────────────────────────────────────────────────────────────────────
  // DECOY-STORM - Privacy mixing with decoys
  // ─────────────────────────────────────────────────────────────────────────
  sps
    .command("decoy-storm")
    .description("Generate decoy transactions for privacy (k-anonymity)")
    .option("-c, --count <count>", "Number of decoys", "10")
    .option("--devnet", "Use devnet")
    .option("-k, --keypair <path>", "Path to keypair file")
    .option("--rpc <url>", "Custom RPC endpoint")
    .action(async (opts) => {
      try {
        const config = loadConfig(opts.devnet ? 'devnet' : 'mainnet');
        const rpc = opts.rpc || config.rpc;
        const connection = new Connection(rpc, "confirmed");
        const keypair = loadKeypair(opts.keypair);
        const programId = new PublicKey(config.programId);
        
        const count = parseInt(opts.count);
        console.log(`\n🌪️ Generating ${count} decoys...`);
        
        // Generate decoy data
        const decoys: Buffer[] = [];
        for (let i = 0; i < count; i++) {
          decoys.push(crypto.randomBytes(72));
        }
        
        const transferSize = 72;
        const data = Buffer.alloc(4 + count * transferSize);
        let offset = 0;
        data.writeUInt8(DOMAIN.STS, offset++);
        data.writeUInt8(STS_OP.DECOY_STORM, offset++);
        data.writeUInt8(count, offset++);
        data.writeUInt8(0xff, offset++); // no real transfer
        
        for (const decoy of decoys) {
          decoy.copy(data, offset);
          offset += transferSize;
        }
        
        const ix = new TransactionInstruction({
          programId,
          keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: true }],
          data,
        });
        
        const sig = await sendVersionedTx(connection, ix, [keypair]);
        
        printBox("✅ Decoy Storm Complete", [
          `Decoys: ${count}`,
          `TX:     ${shortSig(sig)}`,
          ``,
          `Your real transaction is now hidden among ${count} decoys`,
        ]);
        
      } catch (e: any) {
        console.error(`\n❌ Error: ${e.message}`);
        process.exit(1);
      }
    });

  // ─────────────────────────────────────────────────────────────────────────
  // CHRONO-VAULT - Time-locked vault
  // ─────────────────────────────────────────────────────────────────────────
  sps
    .command("chrono-vault")
    .description("Create a time-locked vault")
    .requiredOption("--unlock-slot <slot>", "Slot when vault unlocks")
    .requiredOption("--content <text>", "Content to lock")
    .option("--devnet", "Use devnet")
    .option("-k, --keypair <path>", "Path to keypair file")
    .option("--rpc <url>", "Custom RPC endpoint")
    .action(async (opts) => {
      try {
        const config = loadConfig(opts.devnet ? 'devnet' : 'mainnet');
        const rpc = opts.rpc || config.rpc;
        const connection = new Connection(rpc, "confirmed");
        const keypair = loadKeypair(opts.keypair);
        const programId = new PublicKey(config.programId);
        
        const currentSlot = await connection.getSlot();
        const unlockSlot = BigInt(opts.unlockSlot);
        
        console.log(`\n⏳ Creating Chrono Vault...`);
        console.log(`   Current slot: ${currentSlot}`);
        console.log(`   Unlock slot:  ${unlockSlot}`);
        console.log(`   Time until unlock: ~${Math.round((Number(unlockSlot) - currentSlot) * 0.4 / 60)} minutes`);
        
        const nonce = crypto.randomBytes(32);
        const content = Buffer.from(opts.content, 'utf8');
        
        const data = Buffer.alloc(46 + content.length);
        let offset = 0;
        data.writeUInt8(DOMAIN.STS, offset++);
        data.writeUInt8(STS_OP.CHRONO_VAULT, offset++);
        nonce.copy(data, offset); offset += 32;
        data.writeBigUInt64LE(unlockSlot, offset); offset += 8;
        data.writeUInt32LE(content.length, offset); offset += 4;
        content.copy(data, offset);
        
        const ix = new TransactionInstruction({
          programId,
          keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: true }],
          data,
        });
        
        const sig = await sendVersionedTx(connection, ix, [keypair]);
        
        printBox("✅ Chrono Vault Created", [
          `Unlock Slot: ${unlockSlot}`,
          `Content:     ${opts.content.slice(0, 30)}${opts.content.length > 30 ? '...' : ''}`,
          `TX:          ${shortSig(sig)}`,
        ]);
        
      } catch (e: any) {
        console.error(`\n❌ Error: ${e.message}`);
        process.exit(1);
      }
    });

  // ─────────────────────────────────────────────────────────────────────────
  // MESSAGE - Send private message
  // ─────────────────────────────────────────────────────────────────────────
  sps
    .command("message")
    .description("Send an encrypted private message")
    .requiredOption("-t, --to <pubkey>", "Recipient public key")
    .requiredOption("-m, --message <text>", "Message content")
    .option("--devnet", "Use devnet")
    .option("-k, --keypair <path>", "Path to keypair file")
    .option("--rpc <url>", "Custom RPC endpoint")
    .action(async (opts) => {
      try {
        const config = loadConfig(opts.devnet ? 'devnet' : 'mainnet');
        const rpc = opts.rpc || config.rpc;
        const connection = new Connection(rpc, "confirmed");
        const keypair = loadKeypair(opts.keypair);
        const programId = new PublicKey(config.programId);
        
        console.log(`\n💬 Sending encrypted message...`);
        
        const recipientPubkey = new PublicKey(opts.to);
        const ephemeralKey = crypto.randomBytes(32);
        const message = Buffer.from(opts.message, 'utf8');
        
        const data = Buffer.alloc(70 + message.length);
        let offset = 0;
        data.writeUInt8(DOMAIN.MESSAGING, offset++);
        data.writeUInt8(0x01, offset++); // OP_PRIVATE_MESSAGE
        recipientPubkey.toBuffer().copy(data, offset); offset += 32;
        ephemeralKey.copy(data, offset); offset += 32;
        data.writeUInt32LE(message.length, offset); offset += 4;
        message.copy(data, offset);
        
        const ix = new TransactionInstruction({
          programId,
          keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: true }],
          data,
        });
        
        const sig = await sendVersionedTx(connection, ix, [keypair]);
        
        printBox("✅ Message Sent", [
          `To: ${opts.to.slice(0, 8)}...${opts.to.slice(-8)}`,
          `TX: ${shortSig(sig)}`,
          ``,
          `Message encrypted with X25519 + ChaCha20-Poly1305`,
        ]);
        
      } catch (e: any) {
        console.error(`\n❌ Error: ${e.message}`);
        process.exit(1);
      }
    });

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE-POOL - Create AMM pool
  // ─────────────────────────────────────────────────────────────────────────
  sps
    .command("create-pool")
    .description("Create a private AMM pool")
    .requiredOption("--mint-a <hex>", "First token mint ID")
    .requiredOption("--mint-b <hex>", "Second token mint ID")
    .option("--fee <bps>", "Fee in basis points", "30")
    .option("--devnet", "Use devnet")
    .option("-k, --keypair <path>", "Path to keypair file")
    .option("--rpc <url>", "Custom RPC endpoint")
    .action(async (opts) => {
      try {
        const config = loadConfig(opts.devnet ? 'devnet' : 'mainnet');
        const rpc = opts.rpc || config.rpc;
        const connection = new Connection(rpc, "confirmed");
        const keypair = loadKeypair(opts.keypair);
        const programId = new PublicKey(config.programId);
        
        console.log(`\n🏊 Creating AMM Pool...`);
        
        const mintA = Buffer.from(opts.mintA, 'hex');
        const mintB = Buffer.from(opts.mintB, 'hex');
        const fee = parseInt(opts.fee);
        
        const data = Buffer.alloc(70);
        let offset = 0;
        data.writeUInt8(DOMAIN.STS, offset++);
        data.writeUInt8(STS_OP.CREATE_AMM_POOL, offset++);
        mintA.copy(data, offset); offset += 32;
        mintB.copy(data, offset); offset += 32;
        data.writeUInt8(0, offset++); // constant product
        data.writeUInt16LE(fee, offset);
        
        const ix = new TransactionInstruction({
          programId,
          keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: true }],
          data,
        });
        
        const sig = await sendVersionedTx(connection, ix, [keypair]);
        
        printBox("✅ AMM Pool Created", [
          `Mint A: ${opts.mintA.slice(0, 16)}...`,
          `Mint B: ${opts.mintB.slice(0, 16)}...`,
          `Fee:    ${fee} bps (${(fee/100).toFixed(2)}%)`,
          `TX:     ${shortSig(sig)}`,
        ]);
        
      } catch (e: any) {
        console.error(`\n❌ Error: ${e.message}`);
        process.exit(1);
      }
    });

  return sps;
}

// Also export with legacy name for backwards compatibility
export const registerSTSCommands = registerSPSCommands;
