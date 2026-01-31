#!/usr/bin/env node
/**
 * STS (Styx Token Standard) Devnet Test Suite
 * 
 * Tests the revolutionary event-sourced token primitive:
 * - Zero rent, native privacy
 * - Note-based (UTXO-like) ownership
 * - Per-note composable extensions
 * - Optional trustless verification (nullifier PDAs)
 * - Three liquidity exit modes
 */

import {
    Connection,
    Keypair,
    PublicKey,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
    StyxPMP,
    STS,
    TAG_NOTE_MINT,
    TAG_NOTE_TRANSFER,
    TAG_GPOOL_DEPOSIT,
    TAG_GPOOL_WITHDRAW,
    EXT_TRANSFER_FEE,
    EXT_ROYALTY,
    EXT_VESTING,
    TRUST_INDEXER,
    TRUST_NULLIFIER_PDA,
} from './dist/index.mjs';
import pkg from 'js-sha3';
const { keccak_256 } = pkg;

// ============================================================================
// Test Configuration
// ============================================================================

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
// STS is part of PMP - use the existing devnet PMP program
const PROGRAM_ID = new PublicKey('FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW');

// Use the funded devnet test wallet from .devnet folder
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let testWallet;
try {
    const keypairPath = join(__dirname, '../../.devnet/test-wallet.json');
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    testWallet = Keypair.fromSecretKey(Uint8Array.from(keypairData));
} catch (e) {
    // Fallback to random keypair if wallet not found
    console.warn('Warning: Could not load .devnet/test-wallet.json, using random keypair');
    testWallet = Keypair.generate();
}

// Fake mint for testing (since we're inscribing, not real Token-22)
const FAKE_MINT = new PublicKey('So11111111111111111111111111111111111111112');

// ============================================================================
// Test Helpers
// ============================================================================

const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m',
};

let passCount = 0;
let failCount = 0;

function log(msg, color = colors.reset) {
    console.log(`${color}${msg}${colors.reset}`);
}

function pass(name) {
    passCount++;
    log(`  ✓ ${name}`, colors.green);
}

function fail(name, error) {
    failCount++;
    log(`  ✗ ${name}: ${error}`, colors.red);
}

function section(title) {
    log(`\n${colors.bold}${colors.cyan}━━━ ${title} ━━━${colors.reset}`);
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Test Suite
// ============================================================================

async function main() {
    log(`${colors.bold}${colors.blue}`, false);
    log(`╔══════════════════════════════════════════════════════════════╗`);
    log(`║     STS (Styx Token Standard) - Devnet Test Suite           ║`);
    log(`║     Event-Sourced Token Revolution                          ║`);
    log(`╚══════════════════════════════════════════════════════════════╝`);
    log(`${colors.reset}`);

    log(`\n${colors.yellow}Configuration:${colors.reset}`);
    log(`  RPC:     ${RPC_URL}`);
    log(`  Program: ${PROGRAM_ID.toBase58()}`);
    log(`  Wallet:  ${testWallet.publicKey.toBase58()}`);

    const connection = new Connection(RPC_URL, 'confirmed');
    const styx = new StyxPMP(connection, PROGRAM_ID);
    const sts = new STS(styx);

    // Check balance
    const balance = await connection.getBalance(testWallet.publicKey);
    log(`  Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

    if (balance < 0.01 * LAMPORTS_PER_SOL) {
        log(`\n${colors.yellow}⚠ Low balance - requesting airdrop...${colors.reset}`);
        try {
            const sig = await connection.requestAirdrop(testWallet.publicKey, 0.5 * LAMPORTS_PER_SOL);
            await connection.confirmTransaction(sig);
            log(`${colors.green}  Airdrop received!${colors.reset}`);
            await sleep(2000);
        } catch (e) {
            log(`${colors.red}  Airdrop failed: ${e.message}${colors.reset}`);
        }
    }

    // ========================================================================
    // Test 1: Note Commitment Generation
    // ========================================================================
    section('Test 1: Note Commitment Generation');

    try {
        const ownerSecret = new Uint8Array(32);
        crypto.getRandomValues(ownerSecret);
        const nonce = new Uint8Array(32);
        crypto.getRandomValues(nonce);
        const amount = BigInt(1000000000); // 1 token (9 decimals)

        const commitment = sts.createCommitment(ownerSecret, amount, nonce);
        
        if (commitment.length === 32) {
            pass('Commitment is 32 bytes');
        } else {
            fail('Commitment is 32 bytes', `Got ${commitment.length}`);
        }

        // Verify deterministic
        const commitment2 = sts.createCommitment(ownerSecret, amount, nonce);
        if (Buffer.from(commitment).equals(Buffer.from(commitment2))) {
            pass('Commitment is deterministic');
        } else {
            fail('Commitment is deterministic', 'Different results');
        }

        // Different inputs = different commitment
        const commitment3 = sts.createCommitment(ownerSecret, amount + 1n, nonce);
        if (!Buffer.from(commitment).equals(Buffer.from(commitment3))) {
            pass('Different amount = different commitment');
        } else {
            fail('Different amount = different commitment', 'Same result');
        }
    } catch (e) {
        fail('Commitment generation', e.message);
    }

    // ========================================================================
    // Test 2: Nullifier Generation
    // ========================================================================
    section('Test 2: Nullifier Generation');

    try {
        const ownerSecret = new Uint8Array(32);
        crypto.getRandomValues(ownerSecret);
        const nonce = new Uint8Array(32);
        crypto.getRandomValues(nonce);
        const amount = BigInt(1000000000);

        const commitment = sts.createCommitment(ownerSecret, amount, nonce);
        const nullifier = sts.createNullifier(commitment, ownerSecret);

        if (nullifier.length === 32) {
            pass('Nullifier is 32 bytes');
        } else {
            fail('Nullifier is 32 bytes', `Got ${nullifier.length}`);
        }

        // Nullifier is deterministic
        const nullifier2 = sts.createNullifier(commitment, ownerSecret);
        if (Buffer.from(nullifier).equals(Buffer.from(nullifier2))) {
            pass('Nullifier is deterministic');
        } else {
            fail('Nullifier is deterministic', 'Different results');
        }

        // Nullifier != commitment
        if (!Buffer.from(nullifier).equals(Buffer.from(commitment))) {
            pass('Nullifier differs from commitment');
        } else {
            fail('Nullifier differs from commitment', 'Same value');
        }
    } catch (e) {
        fail('Nullifier generation', e.message);
    }

    // ========================================================================
    // Test 3: Note Encryption
    // ========================================================================
    section('Test 3: Note Encryption');

    try {
        const ownerSecret = new Uint8Array(32);
        crypto.getRandomValues(ownerSecret);
        const nonce = new Uint8Array(32);
        crypto.getRandomValues(nonce);
        const amount = BigInt(1000000000);

        const encrypted = sts.encryptNote(ownerSecret, amount, nonce);

        if (encrypted.length === 64) {
            pass('Encrypted note is 64 bytes');
        } else {
            fail('Encrypted note is 64 bytes', `Got ${encrypted.length}`);
        }

        // Deterministic
        const encrypted2 = sts.encryptNote(ownerSecret, amount, nonce);
        if (Buffer.from(encrypted).equals(Buffer.from(encrypted2))) {
            pass('Encryption is deterministic');
        } else {
            fail('Encryption is deterministic', 'Different results');
        }
    } catch (e) {
        fail('Note encryption', e.message);
    }

    // ========================================================================
    // Test 4: Extension Builders
    // ========================================================================
    section('Test 4: Extension Builders');

    try {
        // Transfer Fee
        const transferFee = STS.ext.transferFee(250, BigInt(1000000)); // 2.5%, max 1M
        if (transferFee.type === 'transfer_fee' && transferFee.data.length === 10) {
            pass('TransferFee extension created');
        } else {
            fail('TransferFee extension', 'Invalid structure');
        }

        // Royalty
        const royalty = STS.ext.royalty(testWallet.publicKey, 500); // 5%
        if (royalty.type === 'royalty' && royalty.data.length === 34) {
            pass('Royalty extension created');
        } else {
            fail('Royalty extension', 'Invalid structure');
        }

        // Vesting
        const vesting = STS.ext.vesting(1, BigInt(1000), BigInt(2000));
        if (vesting.type === 'vesting' && vesting.data.length === 17) {
            pass('Vesting extension created');
        } else {
            fail('Vesting extension', 'Invalid structure');
        }

        // Delegation
        const delegation = STS.ext.delegation(testWallet.publicKey, BigInt(1000000), BigInt(9999999999));
        if (delegation.type === 'delegation' && delegation.data.length === 48) {
            pass('Delegation extension created');
        } else {
            fail('Delegation extension', 'Invalid structure');
        }

        // Soulbound
        const proof = new Uint8Array(32);
        crypto.getRandomValues(proof);
        const soulbound = STS.ext.soulbound(proof);
        if (soulbound.type === 'soulbound' && soulbound.data.length === 32) {
            pass('Soulbound extension created');
        } else {
            fail('Soulbound extension', 'Invalid structure');
        }

        // Metadata
        const metaHash = new Uint8Array(32);
        crypto.getRandomValues(metaHash);
        const metadata = STS.ext.metadata(metaHash);
        if (metadata.type === 'metadata' && metadata.data.length === 32) {
            pass('Metadata extension created');
        } else {
            fail('Metadata extension', 'Invalid structure');
        }
    } catch (e) {
        fail('Extension builders', e.message);
    }

    // ========================================================================
    // Test 5: Extension TLV Encoding
    // ========================================================================
    section('Test 5: Extension TLV Encoding');

    try {
        const extensions = [
            STS.ext.transferFee(250, BigInt(1000000)),
            STS.ext.royalty(testWallet.publicKey, 500),
        ];

        const encoded = sts.encodeExtensions(extensions);
        
        // TransferFee: 2 header + 10 data = 12
        // Royalty: 2 header + 34 data = 36
        // Total: 48
        if (encoded.length === 48) {
            pass('TLV encoding correct length');
        } else {
            fail('TLV encoding correct length', `Got ${encoded.length}, expected 48`);
        }

        // Check first header byte is EXT_TRANSFER_FEE (0x01)
        if (encoded[0] === EXT_TRANSFER_FEE) {
            pass('First extension type correct');
        } else {
            fail('First extension type correct', `Got ${encoded[0]}`);
        }

        // Check length byte
        if (encoded[1] === 10) {
            pass('First extension length correct');
        } else {
            fail('First extension length correct', `Got ${encoded[1]}`);
        }
    } catch (e) {
        fail('TLV encoding', e.message);
    }

    // ========================================================================
    // Test 6: PDA Derivation
    // ========================================================================
    section('Test 6: PDA Derivation');

    try {
        // Global pool PDA
        const [poolPDA, poolBump] = sts.derivePoolPDA(FAKE_MINT);
        if (poolPDA instanceof PublicKey && poolBump >= 0 && poolBump <= 255) {
            pass(`Pool PDA derived: ${poolPDA.toBase58().slice(0, 20)}...`);
        } else {
            fail('Pool PDA derivation', 'Invalid result');
        }

        // Nullifier PDA
        const nullifier = new Uint8Array(32);
        crypto.getRandomValues(nullifier);
        const [nullPDA, nullBump] = sts.deriveNullifierPDA(nullifier);
        if (nullPDA instanceof PublicKey && nullBump >= 0 && nullBump <= 255) {
            pass(`Nullifier PDA derived: ${nullPDA.toBase58().slice(0, 20)}...`);
        } else {
            fail('Nullifier PDA derivation', 'Invalid result');
        }

        // Different nullifier = different PDA
        const nullifier2 = new Uint8Array(32);
        crypto.getRandomValues(nullifier2);
        const [nullPDA2] = sts.deriveNullifierPDA(nullifier2);
        if (!nullPDA.equals(nullPDA2)) {
            pass('Different nullifiers = different PDAs');
        } else {
            fail('Different nullifiers = different PDAs', 'Same PDA');
        }
    } catch (e) {
        fail('PDA derivation', e.message);
    }

    // ========================================================================
    // Test 7: Note Mint (On-Chain)
    // ========================================================================
    section('Test 7: Note Mint (On-Chain)');

    try {
        const ownerSecret = new Uint8Array(32);
        crypto.getRandomValues(ownerSecret);

        log(`${colors.yellow}  Minting note with 1 token...${colors.reset}`);
        
        const sig = await sts.mint(testWallet, {
            mint: FAKE_MINT,
            amount: BigInt(1000000000),
            ownerSecret,
            extensions: [STS.ext.transferFee(100, BigInt(100000))], // 1% fee
            trustLevel: TRUST_INDEXER,
        });

        pass(`Note minted: ${sig.slice(0, 20)}...`);

        // Verify transaction
        await sleep(2000);
        const txInfo = await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
        if (txInfo && txInfo.meta && !txInfo.meta.err) {
            pass('Transaction confirmed');
        } else {
            fail('Transaction confirmed', 'Not found or error');
        }

        // Check logs for inscription
        const logs = txInfo?.meta?.logMessages || [];
        const hasProgram = logs.some(l => l.includes('Program log:') || l.includes('Memo'));
        if (hasProgram) {
            pass('Program executed successfully');
        } else {
            fail('Program executed', 'No program logs');
        }
    } catch (e) {
        fail('Note mint', e.message);
    }

    // ========================================================================
    // Test 8: Note Transfer (On-Chain)
    // ========================================================================
    section('Test 8: Note Transfer (On-Chain)');

    try {
        // Generate nullifier for transfer
        const oldSecret = new Uint8Array(32);
        crypto.getRandomValues(oldSecret);
        const nonce = new Uint8Array(32);
        crypto.getRandomValues(nonce);
        const oldCommitment = sts.createCommitment(oldSecret, BigInt(500000000), nonce);
        const nullifier = sts.createNullifier(oldCommitment, oldSecret);

        // New commitment for recipient
        const newSecret = new Uint8Array(32);
        crypto.getRandomValues(newSecret);
        const newNonce = new Uint8Array(32);
        crypto.getRandomValues(newNonce);
        const newCommitment = sts.createCommitment(newSecret, BigInt(500000000), newNonce);

        log(`${colors.yellow}  Transferring note...${colors.reset}`);

        const sig = await sts.transfer(testWallet, {
            nullifier,
            newCommitment,
            encryptedAmount: BigInt(500000000),
            trustLevel: TRUST_INDEXER,
        });

        pass(`Note transferred: ${sig.slice(0, 20)}...`);

        // Verify
        await sleep(2000);
        const txInfo = await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
        if (txInfo && txInfo.meta && !txInfo.meta.err) {
            pass('Transfer confirmed');
        } else {
            fail('Transfer confirmed', 'Not found or error');
        }
    } catch (e) {
        fail('Note transfer', e.message);
    }

    // ========================================================================
    // Test 9: Global Pool Deposit (On-Chain)
    // ========================================================================
    section('Test 9: Global Pool Deposit (On-Chain)');

    try {
        const ownerSecret = new Uint8Array(32);
        crypto.getRandomValues(ownerSecret);

        log(`${colors.yellow}  Depositing to global pool...${colors.reset}`);

        const sig = await sts.deposit(testWallet, {
            mint: FAKE_MINT,
            amount: BigInt(100000000),
            ownerSecret,
        });

        pass(`Deposit inscribed: ${sig.slice(0, 20)}...`);

        await sleep(2000);
        const txInfo = await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
        if (txInfo && txInfo.meta && !txInfo.meta.err) {
            pass('Deposit confirmed');
        } else {
            fail('Deposit confirmed', 'Not found or error');
        }
    } catch (e) {
        fail('Pool deposit', e.message);
    }

    // ========================================================================
    // Test 10: Global Pool Withdraw (On-Chain)
    // ========================================================================
    section('Test 10: Global Pool Withdraw (On-Chain)');

    try {
        // Generate nullifier for withdrawal
        const secret = new Uint8Array(32);
        crypto.getRandomValues(secret);
        const nonce = new Uint8Array(32);
        crypto.getRandomValues(nonce);
        const commitment = sts.createCommitment(secret, BigInt(50000000), nonce);
        const nullifier = sts.createNullifier(commitment, secret);

        const recipient = Keypair.generate().publicKey;

        log(`${colors.yellow}  Withdrawing from global pool...${colors.reset}`);

        const sig = await sts.withdraw(testWallet, {
            nullifier,
            mint: FAKE_MINT,
            amount: BigInt(50000000),
            recipient,
            trustLevel: TRUST_INDEXER,
        });

        pass(`Withdrawal inscribed: ${sig.slice(0, 20)}...`);

        await sleep(2000);
        const txInfo = await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
        if (txInfo && txInfo.meta && !txInfo.meta.err) {
            pass('Withdrawal confirmed');
        } else {
            fail('Withdrawal confirmed', 'Not found or error');
        }
    } catch (e) {
        fail('Pool withdraw', e.message);
    }

    // ========================================================================
    // Test 11: Stealth Withdraw (On-Chain)
    // ========================================================================
    section('Test 11: Stealth Withdraw (On-Chain)');

    try {
        const secret = new Uint8Array(32);
        crypto.getRandomValues(secret);
        const nonce = new Uint8Array(32);
        crypto.getRandomValues(nonce);
        const commitment = sts.createCommitment(secret, BigInt(25000000), nonce);
        const nullifier = sts.createNullifier(commitment, secret);

        // Ephemeral keypair for stealth
        const ephemeralPubkey = Keypair.generate().publicKey.toBytes();
        const encryptedRecipient = new Uint8Array(32);
        crypto.getRandomValues(encryptedRecipient);

        log(`${colors.yellow}  Stealth withdrawing...${colors.reset}`);

        const sig = await sts.withdrawStealth(testWallet, {
            nullifier,
            mint: FAKE_MINT,
            amount: BigInt(25000000),
            ephemeralPubkey,
            encryptedRecipient,
            trustLevel: TRUST_INDEXER,
        });

        pass(`Stealth withdraw: ${sig.slice(0, 20)}...`);

        await sleep(2000);
        const txInfo = await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
        if (txInfo && txInfo.meta && !txInfo.meta.err) {
            pass('Stealth confirmed');
        } else {
            fail('Stealth confirmed', 'Not found or error');
        }
    } catch (e) {
        fail('Stealth withdraw', e.message);
    }

    // ========================================================================
    // Test 12: Multi-Extension Note
    // ========================================================================
    section('Test 12: Multi-Extension Note');

    try {
        const ownerSecret = new Uint8Array(32);
        crypto.getRandomValues(ownerSecret);

        const extensions = [
            STS.ext.transferFee(250, BigInt(500000)),     // 2.5% fee
            STS.ext.royalty(testWallet.publicKey, 300),   // 3% royalty
            STS.ext.vesting(1, BigInt(Date.now()), BigInt(Date.now() + 86400000)), // 1 day vest
        ];

        log(`${colors.yellow}  Minting note with 3 extensions...${colors.reset}`);

        const sig = await sts.mint(testWallet, {
            mint: FAKE_MINT,
            amount: BigInt(5000000000),
            ownerSecret,
            extensions,
            trustLevel: TRUST_INDEXER,
        });

        pass(`Multi-extension note: ${sig.slice(0, 20)}...`);

        await sleep(2000);
        const txInfo = await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
        if (txInfo && txInfo.meta && !txInfo.meta.err) {
            pass('Multi-extension confirmed');
        } else {
            fail('Multi-extension confirmed', 'Not found or error');
        }
    } catch (e) {
        fail('Multi-extension note', e.message);
    }

    // ========================================================================
    // Test 13: Wrap SPL (Token-22 Parity)
    // ========================================================================
    section('Test 13: Wrap SPL Token');

    try {
        const ownerSecret = new Uint8Array(32);
        crypto.getRandomValues(ownerSecret);

        log(`${colors.yellow}  Wrapping tokens...${colors.reset}`);

        const sig = await sts.wrap(testWallet, FAKE_MINT, BigInt(100000000), ownerSecret);

        pass(`Wrap inscribed: ${sig.slice(0, 20)}...`);

        await sleep(2000);
        const txInfo = await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
        if (txInfo && txInfo.meta && !txInfo.meta.err) {
            pass('Wrap confirmed');
        } else {
            fail('Wrap confirmed', 'Not found or error');
        }
    } catch (e) {
        fail('Wrap SPL', e.message);
    }

    // ========================================================================
    // Test 14: Unwrap SPL (Token-22 Parity)
    // ========================================================================
    section('Test 14: Unwrap SPL Token');

    try {
        const secret = new Uint8Array(32);
        crypto.getRandomValues(secret);
        const nonce = new Uint8Array(32);
        crypto.getRandomValues(nonce);
        const commitment = sts.createCommitment(secret, BigInt(50000000), nonce);
        const nullifier = sts.createNullifier(commitment, secret);

        const recipient = Keypair.generate().publicKey;

        log(`${colors.yellow}  Unwrapping tokens...${colors.reset}`);

        const sig = await sts.unwrap(testWallet, nullifier, FAKE_MINT, BigInt(50000000), recipient);

        pass(`Unwrap inscribed: ${sig.slice(0, 20)}...`);

        await sleep(2000);
        const txInfo = await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
        if (txInfo && txInfo.meta && !txInfo.meta.err) {
            pass('Unwrap confirmed');
        } else {
            fail('Unwrap confirmed', 'Not found or error');
        }
    } catch (e) {
        fail('Unwrap SPL', e.message);
    }

    // ========================================================================
    // Test 15: Create Collection (NFT)
    // ========================================================================
    section('Test 15: Create NFT Collection');

    try {
        log(`${colors.yellow}  Creating NFT collection...${colors.reset}`);

        const sig = await sts.createCollection(
            testWallet,
            'StyxTestNFTs',
            'STXNFT',
            BigInt(10000),
            500 // 5% royalty
        );

        pass(`Collection created: ${sig.slice(0, 20)}...`);

        await sleep(2000);
        const txInfo = await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
        if (txInfo && txInfo.meta && !txInfo.meta.err) {
            pass('Collection confirmed');
        } else {
            fail('Collection confirmed', 'Not found or error');
        }
    } catch (e) {
        fail('Create collection', e.message);
    }

    // ========================================================================
    // Test 16: Mint NFT
    // ========================================================================
    section('Test 16: Mint NFT');

    try {
        const ownerSecret = new Uint8Array(32);
        crypto.getRandomValues(ownerSecret);
        const collectionId = new Uint8Array(32);
        crypto.getRandomValues(collectionId);
        const metadataHash = new Uint8Array(32);
        crypto.getRandomValues(metadataHash);

        log(`${colors.yellow}  Minting NFT...${colors.reset}`);

        const sig = await sts.mintNFT(
            testWallet,
            collectionId,
            metadataHash,
            ownerSecret,
            250 // 2.5% royalty
        );

        pass(`NFT minted: ${sig.slice(0, 20)}...`);

        await sleep(2000);
        const txInfo = await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
        if (txInfo && txInfo.meta && !txInfo.meta.err) {
            pass('NFT confirmed');
        } else {
            fail('NFT confirmed', 'Not found or error');
        }
    } catch (e) {
        fail('Mint NFT', e.message);
    }

    // ========================================================================
    // Test 17: Create Group
    // ========================================================================
    section('Test 17: Create Group');

    try {
        const groupId = new Uint8Array(32);
        crypto.getRandomValues(groupId);

        log(`${colors.yellow}  Creating group...${colors.reset}`);

        const sig = await sts.createGroup(
            testWallet,
            groupId,
            'TestGroup',
            BigInt(100)
        );

        pass(`Group created: ${sig.slice(0, 20)}...`);

        await sleep(2000);
        const txInfo = await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
        if (txInfo && txInfo.meta && !txInfo.meta.err) {
            pass('Group confirmed');
        } else {
            fail('Group confirmed', 'Not found or error');
        }
    } catch (e) {
        fail('Create group', e.message);
    }

    // ========================================================================
    // Test 18: Fair Launch Commit
    // ========================================================================
    section('Test 18: Fair Launch Commit (Meme Coin)');

    try {
        const launchId = new Uint8Array(32);
        crypto.getRandomValues(launchId);
        const nonce = new Uint8Array(32);
        crypto.getRandomValues(nonce);

        // Get current slot and add 1000 for reveal
        const currentSlot = await connection.getSlot();
        const revealSlot = BigInt(currentSlot + 1000);

        log(`${colors.yellow}  Committing to fair launch (reveal at slot ${revealSlot})...${colors.reset}`);

        const sig = await sts.fairLaunchCommit(
            testWallet,
            launchId,
            BigInt(1000000000), // 1 token
            nonce,
            revealSlot
        );

        pass(`Fair launch commit: ${sig.slice(0, 20)}...`);

        await sleep(2000);
        const txInfo = await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
        if (txInfo && txInfo.meta && !txInfo.meta.err) {
            pass('Commit confirmed');
        } else {
            fail('Commit confirmed', 'Not found or error');
        }
    } catch (e) {
        fail('Fair launch commit', e.message);
    }

    // ========================================================================
    // Final Summary
    // ========================================================================
    log(`\n${colors.bold}${colors.blue}━━━ STS Test Summary ━━━${colors.reset}`);
    log(`  ${colors.green}Passed: ${passCount}${colors.reset}`);
    log(`  ${colors.red}Failed: ${failCount}${colors.reset}`);
    log(`  Total:  ${passCount + failCount}`);
    log(`  Rate:   ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);

    if (failCount === 0) {
        log(`\n${colors.bold}${colors.green}🎉 ALL STS TESTS PASSED!${colors.reset}`);
        log(`${colors.cyan}The Styx Token Standard is operational.${colors.reset}`);
        log(`${colors.cyan}Zero rent. Native privacy. Token-22 parity. Event-sourced revolution.${colors.reset}\n`);
    } else {
        log(`\n${colors.yellow}⚠ Some tests failed. Review above for details.${colors.reset}\n`);
    }

    process.exit(failCount > 0 ? 1 : 0);
}

main().catch(e => {
    console.error(`${colors.red}Fatal error: ${e.message}${colors.reset}`);
    console.error(e.stack);
    process.exit(1);
});
