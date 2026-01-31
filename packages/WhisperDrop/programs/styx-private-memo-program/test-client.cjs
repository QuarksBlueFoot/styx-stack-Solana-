/**
 * Test client for Styx Private Memo Program (deployed on devnet)
 * Tests the deployed program at: Fke7EgU2SrZ3tx6yaUv2kdq45pdwYpVjbxjfRipkPjSE
 * 
 * Usage:
 *   DEVNET_WALLET_SEED=<base58_seed> node test-client.cjs
 */

const { Connection, Keypair, PublicKey, Transaction } = require("@solana/web3.js");
const bs58 = require("bs58");

// Deployed program ID
const PRIVATE_MEMO_PROGRAM_ID = new PublicKey("Fke7EgU2SrZ3tx6yaUv2kdq45pdwYpVjbxjfRipkPjSE");

// Load wallet from environment variable
const DEVNET_WALLET_SEED = process.env.DEVNET_WALLET_SEED;
if (!DEVNET_WALLET_SEED) {
  console.error("❌ Error: DEVNET_WALLET_SEED environment variable is required");
  console.error("Usage: DEVNET_WALLET_SEED=<base58_seed> node test-client.cjs");
  process.exit(1);
}

const DEVNET_ENDPOINT = "https://api.devnet.solana.com";

// Build PMP instruction manually
function buildPmpPostMessageIx(args) {
  const { payloadBytes, recipientPubkey } = args;
  
  const tag = 1; // post_envelope
  const flags = 0;
  const hasRecipient = recipientPubkey ? 1 : 0;
  const payloadLen = payloadBytes.length;
  
  let dataSize = 1 + 1 + 1 + 2 + payloadLen;
  if (hasRecipient) dataSize += 32;
  
  const data = Buffer.alloc(dataSize);
  let offset = 0;
  
  data[offset++] = tag;
  data[offset++] = flags;
  data[offset++] = hasRecipient;
  
  if (hasRecipient) {
    recipientPubkey.toBuffer().copy(data, offset);
    offset += 32;
  }
  
  data.writeUInt16LE(payloadLen, offset);
  offset += 2;
  
  payloadBytes.copy(data, offset);
  
  return {
    keys: [],
    programId: PRIVATE_MEMO_PROGRAM_ID,
    data,
  };
}

class PmpTester {
  constructor() {
    this.connection = new Connection(DEVNET_ENDPOINT, "confirmed");
    
    const seedBytes = bs58.decode(DEVNET_WALLET_SEED);
    this.wallet = Keypair.fromSeed(seedBytes);
    
    this.results = [];
    
    console.log(`🔑 Wallet: ${this.wallet.publicKey.toBase58()}`);
    console.log(`🌐 Network: Devnet`);
    console.log(`📋 Program: ${PRIVATE_MEMO_PROGRAM_ID.toBase58()}\n`);
  }

  async checkWalletBalance() {
    const startTime = Date.now();
    try {
      const balance = await this.connection.getBalance(this.wallet.publicKey);
      const solBalance = balance / 1e9;
      console.log(`💰 Balance: ${solBalance.toFixed(4)} SOL`);
      
      if (balance < 1000000) {
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
        error: error.message,
        duration: Date.now() - startTime
      });
      return false;
    }
  }

  async testSimpleMessage() {
    console.log("\n🧪 Test 1: Simple Message (no recipient)");
    const startTime = Date.now();
    
    try {
      const payload = Buffer.from("Hello from StyxStack PMP test!", "utf-8");
      const ix = buildPmpPostMessageIx({ payloadBytes: payload });
      
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
      console.log(`❌ Test failed: ${error.message}`);
      this.results.push({
        test: "Simple Message",
        passed: false,
        error: error.message,
        duration: Date.now() - startTime
      });
      return false;
    }
  }

  async testMessageWithRecipient() {
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
      console.log(`❌ Test failed: ${error.message}`);
      this.results.push({
        test: "Message with Recipient",
        passed: false,
        error: error.message,
        duration: Date.now() - startTime
      });
      return false;
    }
  }

  async testLargePayload() {
    console.log("\n🧪 Test 3: Large Payload (1KB)");
    const startTime = Date.now();
    
    try {
      const payload = Buffer.alloc(1024, "X");
      const ix = buildPmpPostMessageIx({ payloadBytes: payload });
      
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
      console.log(`❌ Test failed: ${error.message}`);
      this.results.push({
        test: "Large Payload (1KB)",
        passed: false,
        error: error.message,
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
    
    return passed === total;
  }

  async runAllTests() {
    console.log("🚀 Starting Styx Private Memo Program Tests\n");
    console.log("=".repeat(60));
    
    const hasBalance = await this.checkWalletBalance();
    if (!hasBalance) {
      console.log("\n❌ Insufficient balance. Please fund the wallet first:");
      console.log(`   solana airdrop 5 ${this.wallet.publicKey.toBase58()} --url devnet`);
      return false;
    }
    
    await this.testSimpleMessage();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await this.testMessageWithRecipient();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await this.testLargePayload();
    
    return this.printSummary();
  }
}

async function main() {
  const tester = new PmpTester();
  const success = await tester.runAllTests();
  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
