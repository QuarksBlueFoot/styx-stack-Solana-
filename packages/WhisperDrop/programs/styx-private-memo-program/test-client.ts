#!/usr/bin/env node
/**
 * Test client for Styx Private Memo Program
 * 
 * This script demonstrates:
 * 1. Building PMP instructions
 * 2. Sending encrypted messages
 * 3. Reading messages from logs
 * 4. Testing with the devnet wallet
 * 
 * Usage:
 *   DEVNET_WALLET_SEED=<base58_seed> pnpm test
 */

import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { buildPmpPostMessageIx, PRIVATE_MEMO_PROGRAM_ID } from "../../packages/private-memo-program-client/dist/index.js";
import bs58 from "bs58";

// Load wallet from environment variable
const DEVNET_WALLET_SEED = process.env.DEVNET_WALLET_SEED;
if (!DEVNET_WALLET_SEED) {
  console.error("❌ Error: DEVNET_WALLET_SEED environment variable is required");
  console.error("Usage: DEVNET_WALLET_SEED=<base58_seed> pnpm test");
  process.exit(1);
}
const DEVNET_ENDPOINT = "https://api.devnet.solana.com";

interface TestResult {
  test: string;
  passed: boolean;
  signature?: string;
  error?: string;
  duration?: number;
}

class PmpTester {
  private connection: Connection;
  private wallet: Keypair;
  private results: TestResult[] = [];

  constructor() {
    this.connection = new Connection(DEVNET_ENDPOINT, "confirmed");
    
    // Recreate keypair from seed
    const seedBytes = bs58.decode(DEVNET_WALLET_SEED);
    this.wallet = Keypair.fromSeed(seedBytes);
    
    console.log(`🔑 Wallet: ${this.wallet.publicKey.toBase58()}`);
    console.log(`🌐 Network: Devnet`);
    console.log(`📋 Program: ${PRIVATE_MEMO_PROGRAM_ID.toBase58()}\n`);
  }

  async checkWalletBalance(): Promise<boolean> {
    const startTime = Date.now();
    try {
      const balance = await this.connection.getBalance(this.wallet.publicKey);
      const solBalance = balance / 1e9;
      console.log(`💰 Balance: ${solBalance.toFixed(4)} SOL`);
      
      if (balance < 1000000) { // Less than 0.001 SOL
        this.results.push({
          test: "Wallet Balance Check",
          passed: false,
          error: "Insufficient balance",
          duration: Date.now() - startTime
        });
        return false;
      }
      
      this.results.push({
        test: "Wallet Balance Check",
        passed: true,
        duration: Date.now() - startTime
      });
      return true;
    } catch (error) {
      this.results.push({
        test: "Wallet Balance Check",
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      return false;
    }
  }

  async testSimpleMessage(): Promise<boolean> {
    console.log("\n🧪 Test 1: Simple Message (no recipient)");
    const startTime = Date.now();
    
    try {
      const payload = Buffer.from("Hello from StyxStack PMP test!", "utf-8");
      
      const ix = buildPmpPostMessageIx({
        payloadBytes: payload,
      });
      
      const tx = new Transaction().add(ix);
      const sig = await this.connection.sendTransaction(tx, [this.wallet], {
        skipPreflight: false,
      });
      
      await this.connection.confirmTransaction(sig, "confirmed");
      
      console.log(`✅ Transaction confirmed`);
      console.log(`   Signature: ${sig}`);
      console.log(`   Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
      
      this.results.push({
        test: "Simple Message",
        passed: true,
        signature: sig,
        duration: Date.now() - startTime
      });
      
      return true;
    } catch (error) {
      console.log(`❌ Test failed: ${error}`);
      this.results.push({
        test: "Simple Message",
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      return false;
    }
  }

  async testMessageWithRecipient(): Promise<boolean> {
    console.log("\n🧪 Test 2: Message with Recipient");
    const startTime = Date.now();
    
    try {
      const recipient = Keypair.generate().publicKey;
      const payload = Buffer.from(`Private message to ${recipient.toBase58()}`, "utf-8");
      
      const ix = buildPmpPostMessageIx({
        payloadBytes: payload,
        recipientPubkey: recipient,
      });
      
      const tx = new Transaction().add(ix);
      const sig = await this.connection.sendTransaction(tx, [this.wallet], {
        skipPreflight: false,
      });
      
      await this.connection.confirmTransaction(sig, "confirmed");
      
      console.log(`✅ Transaction confirmed`);
      console.log(`   Recipient: ${recipient.toBase58()}`);
      console.log(`   Signature: ${sig}`);
      console.log(`   Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
      
      this.results.push({
        test: "Message with Recipient",
        passed: true,
        signature: sig,
        duration: Date.now() - startTime
      });
      
      return true;
    } catch (error) {
      console.log(`❌ Test failed: ${error}`);
      this.results.push({
        test: "Message with Recipient",
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      return false;
    }
  }

  async testLargePayload(): Promise<boolean> {
    console.log("\n🧪 Test 3: Large Payload (1KB)");
    const startTime = Date.now();
    
    try {
      // Create 1KB payload
      const payload = Buffer.alloc(1024, "X");
      
      const ix = buildPmpPostMessageIx({
        payloadBytes: payload,
      });
      
      const tx = new Transaction().add(ix);
      const sig = await this.connection.sendTransaction(tx, [this.wallet], {
        skipPreflight: false,
      });
      
      await this.connection.confirmTransaction(sig, "confirmed");
      
      console.log(`✅ Transaction confirmed`);
      console.log(`   Payload size: ${payload.length} bytes`);
      console.log(`   Signature: ${sig}`);
      console.log(`   Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
      
      this.results.push({
        test: "Large Payload (1KB)",
        passed: true,
        signature: sig,
        duration: Date.now() - startTime
      });
      
      return true;
    } catch (error) {
      console.log(`❌ Test failed: ${error}`);
      this.results.push({
        test: "Large Payload (1KB)",
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      return false;
    }
  }

  async testEncryptedPayload(): Promise<boolean> {
    console.log("\n🧪 Test 4: Simulated Encrypted Payload");
    const startTime = Date.now();
    
    try {
      // Simulate encrypted payload (random bytes)
      const payload = Buffer.alloc(256);
      for (let i = 0; i < payload.length; i++) {
        payload[i] = Math.floor(Math.random() * 256);
      }
      
      const ix = buildPmpPostMessageIx({
        payloadBytes: payload,
        recipientPubkey: this.wallet.publicKey,
      });
      
      const tx = new Transaction().add(ix);
      const sig = await this.connection.sendTransaction(tx, [this.wallet], {
        skipPreflight: false,
      });
      
      await this.connection.confirmTransaction(sig, "confirmed");
      
      console.log(`✅ Transaction confirmed`);
      console.log(`   Payload: <256 bytes of encrypted data>`);
      console.log(`   Signature: ${sig}`);
      console.log(`   Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
      
      this.results.push({
        test: "Encrypted Payload",
        passed: true,
        signature: sig,
        duration: Date.now() - startTime
      });
      
      return true;
    } catch (error) {
      console.log(`❌ Test failed: ${error}`);
      this.results.push({
        test: "Encrypted Payload",
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      return false;
    }
  }

  async testMultipleMessages(): Promise<boolean> {
    console.log("\n🧪 Test 5: Multiple Messages in One Transaction");
    const startTime = Date.now();
    
    try {
      const tx = new Transaction();
      
      // Add 3 messages
      for (let i = 0; i < 3; i++) {
        const payload = Buffer.from(`Message ${i + 1} of 3`, "utf-8");
        const ix = buildPmpPostMessageIx({
          payloadBytes: payload,
        });
        tx.add(ix);
      }
      
      const sig = await this.connection.sendTransaction(tx, [this.wallet], {
        skipPreflight: false,
      });
      
      await this.connection.confirmTransaction(sig, "confirmed");
      
      console.log(`✅ Transaction confirmed`);
      console.log(`   Messages sent: 3`);
      console.log(`   Signature: ${sig}`);
      console.log(`   Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
      
      this.results.push({
        test: "Multiple Messages",
        passed: true,
        signature: sig,
        duration: Date.now() - startTime
      });
      
      return true;
    } catch (error) {
      console.log(`❌ Test failed: ${error}`);
      this.results.push({
        test: "Multiple Messages",
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      return false;
    }
  }

  printSummary() {
    console.log("\n" + "=".repeat(60));
    console.log("📊 TEST SUMMARY");
    console.log("=".repeat(60));
    
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const passRate = ((passed / total) * 100).toFixed(1);
    
    console.log(`\nResults: ${passed}/${total} tests passed (${passRate}%)\n`);
    
    this.results.forEach((result, index) => {
      const icon = result.passed ? "✅" : "❌";
      const duration = result.duration ? `(${result.duration}ms)` : "";
      console.log(`${icon} ${index + 1}. ${result.test} ${duration}`);
      
      if (result.signature) {
        console.log(`   Signature: ${result.signature}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    console.log("\n" + "=".repeat(60));
    
    if (passed === total) {
      console.log("🎉 All tests passed!");
    } else {
      console.log(`⚠️  ${total - passed} test(s) failed`);
    }
  }

  async runAllTests() {
    console.log("🚀 Starting Styx Private Memo Program Tests\n");
    console.log("=".repeat(60));
    
    // Check wallet balance first
    const hasBalance = await this.checkWalletBalance();
    if (!hasBalance) {
      console.log("\n❌ Insufficient balance. Please fund the wallet first:");
      console.log(`   solana airdrop 5 ${this.wallet.publicKey.toBase58()} --url devnet`);
      return;
    }
    
    // Run all tests
    await this.testSimpleMessage();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting
    
    await this.testMessageWithRecipient();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await this.testLargePayload();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await this.testEncryptedPayload();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await this.testMultipleMessages();
    
    // Print summary
    this.printSummary();
  }
}

// Run tests
async function main() {
  const tester = new PmpTester();
  await tester.runAllTests();
}

main().catch(console.error);
