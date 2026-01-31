#!/usr/bin/env node
/**
 * SPS EasyPay SDK Demo
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Demonstrates the unique "No Wallet, No Gas, Text/Email Payment" flow:
 * 
 * 1. SENDER: Creates claimable payment → gets shareable link
 * 2. SEND: Via SMS, email, QR code, or DM
 * 3. RECEIVER: Clicks link → stealth wallet created → funds claimed gaslessly
 * 
 * This is Venmo/Cash App UX with crypto privacy + on-chain settlement!
 */

import { 
  Connection, 
  Keypair, 
  PublicKey, 
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import nacl from 'tweetnacl';

// ============================================================================
// CONSTANTS
// ============================================================================

const SPS_PROGRAM_ID = new PublicKey('GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9');

const DOMAIN_EASYPAY = 0x11;
const EASYPAY_OPS = {
  CREATE_PAYMENT: 0x01,
  CREATE_BATCH_PAYMENT: 0x02,
  CLAIM_PAYMENT: 0x10,
  CLAIM_TO_STEALTH: 0x11,
  CLAIM_GASLESS: 0x12,
  CANCEL_PAYMENT: 0x20,
  REGISTER_RELAYER: 0x30,
  SUBMIT_META_TX: 0x31,
  GENERATE_STEALTH_KEYS: 0x40,
  PUBLISH_STEALTH_META: 0x41,
  PRIVATE_PAYMENT: 0x50,
};

// Demo relayer (for gasless claims)
const DEMO_RELAYER_URL = 'https://api.styx.nexus/v1/resolv/relay';

// ============================================================================
// STEALTH ADDRESS GENERATION (Solana-native)
// ============================================================================

/**
 * Generate stealth keypair (spending + viewing keys)
 * Original Solana implementation
 */
function generateStealthKeys() {
  const spendingKey = Keypair.generate();
  const viewingKey = Keypair.generate();
  
  // Meta-address format: st:sol:<spendingPubkey>:<viewingPubkey>
  const metaAddress = `st:sol:${spendingKey.publicKey.toBase58()}:${viewingKey.publicKey.toBase58()}`;
  
  return {
    spendingKey,
    viewingKey,
    metaAddress,
  };
}

/**
 * Parse stealth meta-address
 */
function parseStealthMetaAddress(metaAddress) {
  const parts = metaAddress.split(':');
  if (parts.length !== 4 || parts[0] !== 'st' || parts[1] !== 'sol') {
    throw new Error('Invalid stealth meta-address format');
  }
  
  return {
    spendingPubkey: new PublicKey(parts[2]),
    viewingPubkey: new PublicKey(parts[3]),
  };
}

/**
 * Generate one-time stealth address for receiving
 */
function generateStealthAddress(metaAddress) {
  const { spendingPubkey, viewingPubkey } = parseStealthMetaAddress(metaAddress);
  
  // Generate ephemeral keypair
  const ephemeralKey = Keypair.generate();
  
  // Shared secret via ECDH (simplified - actual impl uses proper curve math)
  // In production: S = ephemeralPriv * viewingPub
  const sharedSecret = nacl.box.before(
    viewingPubkey.toBytes().slice(0, 32),
    ephemeralKey.secretKey.slice(0, 32)
  );
  
  // Derive stealth public key: P' = P + hash(S) * G
  // Simplified: We create a deterministic keypair from the shared secret
  const stealthSeed = nacl.hash(Buffer.concat([
    spendingPubkey.toBytes(),
    sharedSecret
  ])).slice(0, 32);
  
  const stealthKeypair = Keypair.fromSeed(stealthSeed);
  
  return {
    stealthAddress: stealthKeypair.publicKey,
    ephemeralPubkey: ephemeralKey.publicKey,
    viewTag: sharedSecret.slice(0, 4), // For fast scanning
  };
}

// ============================================================================
// PAYMENT CREATION
// ============================================================================

/**
 * Create claimable payment
 * Returns escrow PDA and claim secret
 */
async function createPayment(
  connection,
  sender,
  amount,
  mint,
  options = {}
) {
  const {
    expireAt = Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days default
    memo = '',
    recipient = null, // Optional: restrict to specific recipient
  } = options;
  
  // Generate claim secret (32 bytes)
  const claimSecret = nacl.randomBytes(32);
  const claimHash = nacl.hash(claimSecret);
  
  // Payment ID = hash(sender + secret + timestamp)
  const paymentId = nacl.hash(Buffer.concat([
    sender.publicKey.toBytes(),
    claimSecret,
    Buffer.from(Date.now().toString())
  ])).slice(0, 16);
  
  // Derive escrow PDA
  const [escrowPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('easypay'),
      Buffer.from('escrow'),
      sender.publicKey.toBytes(),
      paymentId
    ],
    SPS_PROGRAM_ID
  );
  
  console.log('\n📦 Creating Payment...');
  console.log(`   Amount: ${amount / LAMPORTS_PER_SOL} SOL (or tokens)`);
  console.log(`   Escrow: ${escrowPda.toBase58()}`);
  console.log(`   Expires: ${new Date(expireAt).toISOString()}`);
  
  // In production: Build and send transaction
  // For demo: Return simulated result
  
  return {
    paymentId: Buffer.from(paymentId).toString('hex'),
    escrowPda,
    claimSecret: Buffer.from(claimSecret).toString('base64'),
    claimHash: Buffer.from(claimHash).toString('hex'),
    amount,
    mint,
    expireAt,
    sender: sender.publicKey.toBase58(),
  };
}

// ============================================================================
// PAYMENT LINK GENERATION
// ============================================================================

/**
 * Create shareable payment link
 */
function createPaymentLink(payment, options = {}) {
  const {
    baseUrl = 'https://styx.nexus/pay',
    format = 'full', // 'full' | 'short' | 'qr'
  } = options;
  
  // Encode payment data
  const payloadData = {
    id: payment.paymentId,
    s: payment.claimSecret, // Secret (encrypted in production)
    a: payment.amount.toString(),
    m: payment.mint,
    e: payment.escrowPda.toBase58(),
  };
  
  const payload = Buffer.from(JSON.stringify(payloadData)).toString('base64url');
  
  // Full URL
  const fullUrl = `${baseUrl}/${payload}`;
  
  // Short code (for SMS)
  const shortCode = payment.paymentId.slice(0, 8).toUpperCase();
  
  return {
    url: fullUrl,
    shortCode,
    qrData: fullUrl,
    deepLink: `styxpay://${payload}`,
  };
}

/**
 * Generate SMS message for payment
 */
function generateSmsMessage(link, senderName = 'Someone') {
  return `${senderName} sent you money! Claim it here: ${link.url}
  
No wallet needed, no fees to pay!`;
}

/**
 * Generate email message for payment
 */
function generateEmailMessage(link, senderName = 'Someone', amount = '') {
  return {
    subject: `${senderName} sent you ${amount}!`,
    body: `
Hi there!

${senderName} sent you ${amount} via SPS EasyPay.

🎁 Click to claim your funds:
${link.url}

✨ No wallet needed - we'll create one for you
✨ No gas fees - we cover the transaction costs
✨ Private - only you can see this payment

The link expires in 7 days. After that, the funds return to the sender.

---
Powered by SPS (Styx Privacy Standard)
Private, non-custodial payments for everyone.
    `.trim()
  };
}

// ============================================================================
// GASLESS CLAIMING
// ============================================================================

/**
 * Claim payment with relayer (gasless)
 */
async function claimGasless(payment, claimSecret, recipientAddress = null) {
  // If no recipient, generate stealth wallet
  let recipient;
  let stealthInfo = null;
  
  if (!recipientAddress) {
    console.log('\n🔒 No wallet provided - creating stealth wallet...');
    const stealthKeys = generateStealthKeys();
    recipient = stealthKeys.spendingKey.publicKey;
    stealthInfo = stealthKeys;
    console.log(`   Stealth address: ${recipient.toBase58()}`);
    console.log(`   Meta-address: ${stealthKeys.metaAddress}`);
  } else {
    recipient = new PublicKey(recipientAddress);
  }
  
  // Build claim message (for meta-transaction)
  const claimMessage = {
    paymentId: payment.paymentId,
    claimSecret,
    recipient: recipient.toBase58(),
    timestamp: Date.now(),
  };
  
  // Sign with recipient key (or stealth key)
  const messageBytes = Buffer.from(JSON.stringify(claimMessage));
  const signature = stealthInfo 
    ? nacl.sign.detached(messageBytes, stealthInfo.spendingKey.secretKey)
    : null;
  
  console.log('\n📤 Submitting gasless claim...');
  console.log(`   Relayer: ${DEMO_RELAYER_URL}`);
  console.log(`   Recipient: ${recipient.toBase58()}`);
  
  // In production: Send to relayer
  // For demo: Simulate success
  
  return {
    success: true,
    txId: 'simulated-tx-' + Date.now().toString(16),
    recipient: recipient.toBase58(),
    stealthInfo: stealthInfo ? {
      metaAddress: stealthInfo.metaAddress,
      // In production: Encrypt private keys for user storage
    } : null,
    relayerFee: 0.001, // Fee taken from payment
    amountReceived: (payment.amount / LAMPORTS_PER_SOL) - 0.001,
  };
}

// ============================================================================
// DEMO FLOW
// ============================================================================

async function runDemo() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                     SPS EASYPAY SDK DEMO                                   ║
║                                                                            ║
║  Private Payments • Gasless • No Wallet Needed                            ║
║  "Venmo/Cash App UX with Crypto Privacy"                                  ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

  // Create demo sender
  const sender = Keypair.generate();
  console.log('👤 Sender wallet:', sender.publicKey.toBase58());

  // -------------------------------------------------------------------------
  // STEP 1: Create Payment
  // -------------------------------------------------------------------------
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('STEP 1: CREATE CLAIMABLE PAYMENT');
  console.log('═══════════════════════════════════════════════════════════════');
  
  const payment = await createPayment(
    null, // connection (simulated)
    sender,
    0.5 * LAMPORTS_PER_SOL, // 0.5 SOL
    'So11111111111111111111111111111111111111112', // Native SOL (wrapped)
    { memo: 'Dinner split 🍕' }
  );
  
  console.log('\n✅ Payment created!');
  console.log(`   Payment ID: ${payment.paymentId}`);

  // -------------------------------------------------------------------------
  // STEP 2: Generate Shareable Link
  // -------------------------------------------------------------------------
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('STEP 2: GENERATE SHAREABLE LINK');
  console.log('═══════════════════════════════════════════════════════════════');
  
  const link = createPaymentLink(payment);
  
  console.log('\n📱 Payment Link:');
  console.log(`   URL: ${link.url.slice(0, 60)}...`);
  console.log(`   Short Code: ${link.shortCode}`);
  console.log(`   Deep Link: ${link.deepLink.slice(0, 40)}...`);

  // -------------------------------------------------------------------------
  // STEP 3: Generate Messages
  // -------------------------------------------------------------------------
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('STEP 3: READY-TO-SEND MESSAGES');
  console.log('═══════════════════════════════════════════════════════════════');
  
  const sms = generateSmsMessage(link, 'Alice');
  console.log('\n📱 SMS Message:');
  console.log('   ' + sms.replace(/\n/g, '\n   '));
  
  const email = generateEmailMessage(link, 'Alice', '0.5 SOL');
  console.log('\n📧 Email:');
  console.log(`   Subject: ${email.subject}`);
  console.log(`   Body: ${email.body.split('\n').slice(0, 5).join('\n   ')}...`);

  // -------------------------------------------------------------------------
  // STEP 4: Recipient Claims (No Wallet!)
  // -------------------------------------------------------------------------
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('STEP 4: GASLESS CLAIM (NO WALLET NEEDED!)');
  console.log('═══════════════════════════════════════════════════════════════');
  
  console.log('\n📲 Recipient clicks link...');
  console.log('   → No existing wallet detected');
  console.log('   → Creating stealth wallet...');
  console.log('   → Submitting gasless claim via relayer...');
  
  const claimResult = await claimGasless(
    payment,
    payment.claimSecret,
    null // No recipient address - create stealth wallet!
  );
  
  console.log('\n✅ Payment claimed!');
  console.log(`   Recipient: ${claimResult.recipient}`);
  console.log(`   Amount: ${claimResult.amountReceived} SOL`);
  console.log(`   Relayer fee: ${claimResult.relayerFee} SOL`);
  console.log(`   Tx: ${claimResult.txId}`);
  
  if (claimResult.stealthInfo) {
    console.log('\n🔐 Stealth Wallet Created:');
    console.log(`   Meta-address: ${claimResult.stealthInfo.metaAddress.slice(0, 50)}...`);
    console.log('   (Save this to receive future payments privately!)');
  }

  // -------------------------------------------------------------------------
  // UNIQUE FEATURES SUMMARY
  // -------------------------------------------------------------------------
  console.log(`
═══════════════════════════════════════════════════════════════════════════
                     SPS EASYPAY - UNIQUE FEATURES
═══════════════════════════════════════════════════════════════════════════

┌─────────────────┬──────────┬──────────┬──────────┬─────────────────┐
│ Feature         │ Venmo    │ Sol Pay  │ Lightning│ SPS EasyPay     │
├─────────────────┼──────────┼──────────┼──────────┼─────────────────┤
│ No wallet       │ ✅       │ ❌       │ ❌       │ ✅              │
│ Text/Email pay  │ ✅       │ ❌       │ ⚠️       │ ✅              │
│ Private amounts │ ❌       │ ❌       │ ✅       │ ✅              │
│ On-chain        │ ❌       │ ✅       │ ❌ (L2)  │ ✅              │
│ Non-custodial   │ ❌       │ ✅       │ ✅       │ ✅              │
│ Gasless claims  │ ✅       │ ❌       │ ✅       │ ✅              │
│ Stealth address │ ❌       │ ❌       │ ❌       │ ✅              │
└─────────────────┴──────────┴──────────┴──────────┴─────────────────┘

🎯 UNIQUE COMBINATION:
   • Venmo UX (text/email, no wallet)
   • Crypto privacy (stealth addresses, hidden amounts)
   • On-chain settlement (non-custodial, verifiable)
   • Gasless experience (relayer pays fees)

📱 USE CASES:
   • Send crypto to anyone (no wallet needed!)
   • Split bills privately
   • Gift cards / gift payments
   • Payroll without exposing salaries
   • Refunds without linking identities
`);
}

// Run demo
runDemo().catch(console.error);
