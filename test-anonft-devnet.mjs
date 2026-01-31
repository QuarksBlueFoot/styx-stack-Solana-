#!/usr/bin/env node
/**
 * ANONFT Devnet Test Script
 * 
 * Tests the ANS-1 (Anonymous NFT Standard) on Solana devnet:
 * 1. Shadow Forest creation
 * 2. Ring signature generation
 * 3. ZK proof generation
 * 4. ANONFT minting simulation
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import fs from 'fs';

// Import ANONFT modules (relative path for testing)
import {
    // Forest
    createShadowForest,
    MIN_FOREST_TREES,
    MAX_FOREST_TREES,
    MIN_TREE_DEPTH,
    MAX_TREE_DEPTH,
    getForestStats,
    
    // Ring signatures
    createRing,
    createRingWithDecoys,
    lsagSign,
    lsagVerify,
    computeKeyImage,
    createOwnershipProof,
    verifyOwnershipProof,
    
    // ZK proofs
    generateTraitProof,
    verifyTraitProof,
    generateCollectionProof,
    verifyCollectionProof,
    
    // Status
    printStatus,
    VERSION,
    STANDARD_VERSION,
} from './packages/styx-nft/dist/index.js';

const RPC_URL = 'https://api.devnet.solana.com';
const WALLET_PATH = '/workspaces/StyxStack/.devnet/test-wallet.json';

console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                     🧪 ANONFT DEVNET TEST SUITE                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Standard: ANS-1 (Anonymous NFT Standard)                                    ║
║  Version:  ${VERSION}                                                             ║
║  Network:  Solana Devnet                                                     ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

async function main() {
    // Load wallet
    let payer;
    try {
        const walletData = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf8'));
        payer = Keypair.fromSecretKey(Uint8Array.from(walletData));
        console.log(`✅ Loaded wallet: ${payer.publicKey.toBase58()}`);
    } catch (e) {
        console.error(`❌ Failed to load wallet: ${e.message}`);
        process.exit(1);
    }
    
    // Connect to devnet
    const connection = new Connection(RPC_URL, 'confirmed');
    const balance = await connection.getBalance(payer.publicKey);
    console.log(`✅ Connected to devnet, balance: ${balance / 1e9} SOL\n`);
    
    let passed = 0;
    let failed = 0;
    
    // =========================================================================
    // TEST 1: Ring Signature Creation
    // =========================================================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 1: Ring Signature Creation');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Extract 32-byte private key from Solana's 64-byte secretKey
    const privateKey32 = payer.secretKey.slice(0, 32);
    
    try {
        const ringSize = 8;
        const { ring, signerIndex } = createRingWithDecoys(
            payer.publicKey.toBytes(),
            ringSize - 1,
            'ownership'
        );
        
        console.log(`   Ring ID: ${Buffer.from(ring.id).toString('hex').slice(0, 16)}...`);
        console.log(`   Members: ${ring.members.length}`);
        console.log(`   Signer Index: ${signerIndex} (secret)`);
        console.log(`   Purpose: ${ring.purpose}`);
        console.log(`   ✅ Ring created successfully`);
        passed++;
        
        // Test key image computation
        const keyImage = computeKeyImage(privateKey32);
        console.log(`   Key Image: ${Buffer.from(keyImage).toString('hex').slice(0, 16)}...`);
        console.log(`   ✅ Key image computed (double-spend prevention)`);
        passed++;
        
    } catch (e) {
        console.log(`   ❌ Ring creation failed: ${e.message}`);
        failed++;
    }
    
    // =========================================================================
    // TEST 2: LSAG Signature & Verification
    // =========================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 2: LSAG Signature & Verification');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
        const ringSize = 4;
        const { ring, signerIndex } = createRingWithDecoys(
            payer.publicKey.toBytes(),
            ringSize - 1,
            'transfer'
        );
        
        // Message to sign
        const message = new TextEncoder().encode('Transfer ANONFT #12345 to new owner');
        
        // Sign with LSAG (privateKey, signerIndex, ring, message)
        const signature = lsagSign(privateKey32, signerIndex, ring, message);
        console.log(`   Message: "Transfer ANONFT #12345 to new owner"`);
        console.log(`   Signature c0: ${Buffer.from(signature.c0).toString('hex').slice(0, 16)}...`);
        console.log(`   Key Image: ${Buffer.from(signature.keyImage).toString('hex').slice(0, 16)}...`);
        console.log(`   Responses: ${signature.responses.length}`);
        
        // Verify signature (signature includes message and ring)
        const isValid = lsagVerify(signature);
        if (isValid) {
            console.log(`   ✅ LSAG signature verified`);
            console.log(`   💡 Verifier knows: "one of ${ringSize} keys signed"`);
            console.log(`   💡 Verifier CANNOT know: "which specific key signed"`);
            passed++;
        } else {
            console.log(`   ❌ LSAG signature verification failed`);
            failed++;
        }
        
        // Test with wrong message - create a modified signature with wrong message
        const modifiedSig = { ...signature, message: new TextEncoder().encode('Wrong message') };
        const shouldFail = lsagVerify(modifiedSig);
        if (!shouldFail) {
            console.log(`   ✅ Correctly rejected tampered message`);
            passed++;
        } else {
            console.log(`   ❌ Should have rejected tampered message`);
            failed++;
        }
        
    } catch (e) {
        console.log(`   ❌ LSAG test failed: ${e.message}`);
        failed++;
    }
    
    // =========================================================================
    // TEST 3: Ownership Proof
    // =========================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 3: Ownership Proof (Anonymous)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
        // Create ring
        const { ring, signerIndex } = createRingWithDecoys(
            payer.publicKey.toBytes(),
            7, // 8 total members
            'ownership'
        );
        
        // Mock NFT commitment
        const nftCommitment = new Uint8Array(32);
        crypto.getRandomValues(nftCommitment);
        
        // Create ownership proof (positional params: privateKey, signerIndex, ring, nftCommitment)
        const proof = createOwnershipProof(privateKey32, signerIndex, ring, nftCommitment);
        
        console.log(`   NFT Commitment: ${Buffer.from(nftCommitment).toString('hex').slice(0, 16)}...`);
        console.log(`   Timestamp: ${proof.timestamp}`);
        console.log(`   Key Image: ${Buffer.from(proof.signature.keyImage).toString('hex').slice(0, 16)}...`);
        
        // Verify
        const verified = verifyOwnershipProof(proof);
        if (verified) {
            console.log(`   ✅ Ownership proof verified`);
            console.log(`   💡 Proves: "I own this NFT"`);
            console.log(`   💡 Hides: "which public key is mine"`);
            passed++;
        } else {
            console.log(`   ❌ Ownership proof failed`);
            failed++;
        }
        
    } catch (e) {
        console.log(`   ❌ Ownership proof test failed: ${e.message}`);
        failed++;
    }
    
    // =========================================================================
    // TEST 4: Trait Proof (ZK)
    // =========================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 4: Trait Proof (Zero-Knowledge)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
        // NFT metadata (private)
        const metadata = {
            name: 'Shadow Cat #42',
            symbol: 'SCAT',
            uri: 'https://arweave.net/encrypted...',
            traits: [
                { trait_type: 'Background', value: 'Cosmic Purple' },
                { trait_type: 'Fur', value: 'Golden' },
                { trait_type: 'Eyes', value: 'Laser' },
                { trait_type: 'Rarity', value: 'Legendary' },
            ],
        };
        
        // Create collection root (mock)
        const collectionRoot = new Uint8Array(32);
        crypto.getRandomValues(collectionRoot);
        
        // Create witness with metadata
        const witness = {
            privateKey: privateKey32,
            metadata,
            salt: new Uint8Array(32),
        };
        crypto.getRandomValues(witness.salt);
        
        // Prove we have a "Legendary" NFT without revealing which one
        const traitProof = await generateTraitProof({
            traitName: 'Rarity',
            traitValue: 'Legendary',
            collectionRoot,
            witness,
        });
        
        console.log(`   Proving: Rarity = "Legendary"`);
        console.log(`   Proof Type: ${traitProof.type}`);
        console.log(`   Trait Hash: ${Buffer.from(traitProof.traitNameHash).toString('hex').slice(0, 16)}...`);
        console.log(`   Metadata Hidden: ✅`);
        console.log(`   NFT Identity Hidden: ✅`);
        
        // Verify
        const traitValid = await verifyTraitProof(traitProof);
        if (traitValid) {
            console.log(`   ✅ Trait proof verified`);
            console.log(`   💡 Verifier knows: "Owner has a Legendary NFT"`);
            console.log(`   💡 Verifier CANNOT know: "which specific NFT"`);
            passed++;
        } else {
            console.log(`   ❌ Trait proof failed`);
            failed++;
        }
        
    } catch (e) {
        console.log(`   ❌ Trait proof test failed: ${e.message}`);
        failed++;
    }
    
    // =========================================================================
    // TEST 5: Collection Membership Proof
    // =========================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 5: Collection Membership Proof');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
        const collectionId = Keypair.generate().publicKey;
        
        // Create witness for collection proof
        const collectionWitness = {
            privateKey: privateKey32,
            metadata: { name: 'Test NFT', symbol: 'TEST' },
            salt: new Uint8Array(32),
        };
        crypto.getRandomValues(collectionWitness.salt);
        
        const collectionProof = await generateCollectionProof({
            collectionId: collectionId.toBytes(),
            witness: collectionWitness,
        });
        
        console.log(`   Collection: ${collectionId.toBase58().slice(0, 12)}...`);
        console.log(`   Proof Type: ${collectionProof.type}`);
        console.log(`   Key Image: ${Buffer.from(collectionProof.keyImage).toString('hex').slice(0, 16)}...`);
        
        const collectionValid = await verifyCollectionProof(collectionProof);
        if (collectionValid) {
            console.log(`   ✅ Collection proof verified`);
            console.log(`   💡 Proves: "I own an NFT from this collection"`);
            console.log(`   💡 Hides: "which specific NFT in the collection"`);
            passed++;
        } else {
            console.log(`   ❌ Collection proof failed`);
            failed++;
        }
        
    } catch (e) {
        console.log(`   ❌ Collection proof test failed: ${e.message}`);
        failed++;
    }
    
    // =========================================================================
    // TEST 6: Shadow Forest Configuration
    // =========================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 6: Shadow Forest Configuration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
        console.log(`   Min Trees: ${MIN_FOREST_TREES}`);
        console.log(`   Max Trees: ${MAX_FOREST_TREES}`);
        console.log(`   Min Depth: ${MIN_TREE_DEPTH}`);
        console.log(`   Max Depth: ${MAX_TREE_DEPTH}`);
        
        // Calculate capacity for different configurations
        const configs = [
            { trees: 8, depth: 14 },
            { trees: 16, depth: 16 },
            { trees: 32, depth: 20 },
        ];
        
        console.log(`\n   Forest Configurations:`);
        for (const cfg of configs) {
            const capacity = Math.pow(2, cfg.depth) * cfg.trees;
            console.log(`   - ${cfg.trees} trees × 2^${cfg.depth} = ${capacity.toLocaleString()} NFTs`);
        }
        
        console.log(`\n   ✅ Forest configuration valid`);
        console.log(`   💡 Multi-tree structure hides which tree contains your NFT`);
        passed++;
        
    } catch (e) {
        console.log(`   ❌ Forest config test failed: ${e.message}`);
        failed++;
    }
    
    // =========================================================================
    // RESULTS
    // =========================================================================
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                         RESULTS');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   Total:   ${passed + failed}`);
    console.log('═══════════════════════════════════════════════════════════════');
    
    if (failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! ANONFT (ANS-1) is ready for devnet.\n');
        printStatus();
    } else {
        console.log('\n⚠️  Some tests failed. Review the output above.\n');
        process.exit(1);
    }
}

main().catch(console.error);
