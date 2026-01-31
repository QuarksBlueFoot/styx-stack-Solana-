#!/usr/bin/env node
/**
 * Deploy upgraded program to devnet
 * 
 * Requires DEVNET_WALLET_SEED environment variable
 */

import { Keypair, Connection, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, unlinkSync } from "fs";

const execAsync = promisify(exec);

const DEVNET_WALLET_SEED = process.env.DEVNET_WALLET_SEED;
if (!DEVNET_WALLET_SEED) {
  console.error("❌ Error: DEVNET_WALLET_SEED environment variable is required");
  process.exit(1);
}

const PROGRAM_ID = "Fke7EgU2SrZ3tx6yaUv2kdq45pdwYpVjbxjfRipkPjSE";
const PROGRAM_PATH = "target/deploy/styx_private_memo_program.so";
const TEMP_KEYPAIR = "/tmp/deploy-wallet.json";

async function deploy() {
  try {
    // Recreate keypair from seed
    const seedBytes = bs58.decode(DEVNET_WALLET_SEED);
    const keypair = Keypair.fromSeed(seedBytes);
    
    console.log(`🔑 Deploying from wallet: ${keypair.publicKey.toBase58()}`);
    
    // Write temporary keypair file
    const keypairArray = Array.from(keypair.secretKey);
    writeFileSync(TEMP_KEYPAIR, JSON.stringify(keypairArray));
    
    // Deploy
    console.log(`📤 Deploying program: ${PROGRAM_ID}`);
    console.log(`📦 Program path: ${PROGRAM_PATH}`);
    
    const solanaPath = process.env.HOME + "/.local/share/solana/install/releases/2.1.7/solana-release/bin/solana";
    const cmd = `${solanaPath} program deploy ${PROGRAM_PATH} --program-id ${PROGRAM_ID} --url devnet --keypair ${TEMP_KEYPAIR}`;
    
    const { stdout, stderr } = await execAsync(cmd);
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log(`✅ Program deployed successfully!`);
    console.log(`🌐 Explorer: https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`);
    
  } catch (error) {
    console.error(`❌ Deployment failed: ${error}`);
    process.exit(1);
  } finally {
    // Clean up temporary keypair
    try {
      unlinkSync(TEMP_KEYPAIR);
    } catch (e) {
      // Ignore
    }
  }
}

deploy();
