/**
 * PHOTON INDEXER COMPATIBILITY ANALYSIS
 * =====================================
 * 
 * This script analyzes whether Styx compressed tokens can be indexed by Photon.
 * 
 * KEY FINDINGS FROM PHOTON SOURCE CODE:
 * 
 * 1. PROGRAM ID FILTERING (Critical Blocker):
 *    - Photon looks for: compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq
 *    - Styx uses: FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW
 *    - Photon has CLI flag: --compression-program-id <CUSTOM_ID>
 * 
 * 2. TOKEN PROGRAM ID CHECK:
 *    - Photon checks: owner == cTokenmWW8bLPjZEBAUgYy3zKxQZW6VKi7bqNFEVv3m
 *    - This is the COMPRESSED_TOKEN_PROGRAM constant
 *    - Styx needs to either use this program ID OR emit compatible events
 * 
 * 3. DISCRIMINATOR CHECK:
 *    - C_TOKEN_DISCRIMINATOR_V1: [2, 0, 0, 0, 0, 0, 0, 0]
 *    - C_TOKEN_DISCRIMINATOR_V2/V3 also supported
 *    - Data must start with this discriminator to be parsed as TokenData
 * 
 * 4. TokenData STRUCTURE (Must Match Exactly):
 *    ```rust
 *    pub struct TokenData {
 *        pub mint: Pubkey,
 *        pub owner: Pubkey,
 *        pub amount: u64,
 *        pub delegate: Option<Pubkey>,
 *        pub state: AccountState,  // 0=initialized, 1=frozen
 *        pub tlv: Option<Vec<u8>>,
 *    }
 *    ```
 * 
 * 5. EVENT FORMAT (PublicTransactionEvent):
 *    - Borsh serialized
 *    - Posted to NOOP program: noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV
 *    - Contains: input_hashes, output_hashes, output_accounts, leaf_indices, seq_numbers
 * 
 * 6. MERKLE TREE OWNER FILTERING:
 *    - EXPECTED_TREE_OWNER: Can be set to filter trees
 *    - Default: 24rt4RgeyjUCWGS2eF7L7gyNMuz6JWdqYpAvb1KRoHxs
 * 
 * WAYS TO MAKE PHOTON INDEX STYX:
 * 
 * OPTION A: Run Custom Photon Instance
 *    - Start Photon with: --compression-program-id FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW
 *    - Modify COMPRESSED_TOKEN_PROGRAM to match Styx
 *    - This is the CLEANEST approach
 * 
 * OPTION B: Emit Light-Compatible Events (More Complex)
 *    - Make Styx emit events in exact Borsh format to NOOP program
 *    - Use same PublicTransactionEvent structure
 *    - Still blocked by program ID check
 * 
 * OPTION C: Fork Photon for Styx (Best Long-Term)
 *    - Create styx-photon that understands Styx events
 *    - Add privacy-aware indexing (only index public metadata)
 *    - Could support encrypted balance indexing
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import * as crypto from 'crypto';

// ================ CRITICAL CONSTANTS FROM PHOTON ================

// Light Protocol's compression program
const LIGHT_COMPRESSION_PROGRAM = new PublicKey('compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq');

// Light Protocol's compressed token program  
const LIGHT_COMPRESSED_TOKEN_PROGRAM = new PublicKey('cTokenmWW8bLPjZEBAUgYy3zKxQZW6VKi7bqNFEVv3m');

// Styx's programs (different from Light)
const STYX_COMPRESSION_PROGRAM = new PublicKey('FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW');

// NOOP program for event emission
const NOOP_PROGRAM = new PublicKey('noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV');

// Token discriminators Photon looks for
const C_TOKEN_DISCRIMINATOR_V1 = Buffer.from([2, 0, 0, 0, 0, 0, 0, 0]);
const C_TOKEN_DISCRIMINATOR_V2 = Buffer.from([3, 0, 0, 0, 0, 0, 0, 0]);

// Example tokens
const BONK_MINT = new PublicKey('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');

// ================ TOKEN DATA SERIALIZATION (Light-Compatible) ================

/**
 * Serialize TokenData in Borsh format exactly as Photon expects
 * This is what Photon parses from compressed account data
 */
function serializeLightTokenData(
  mint: PublicKey,
  owner: PublicKey,
  amount: bigint,
  delegate: PublicKey | null,
  state: 'initialized' | 'frozen',
  tlv: Buffer | null
): Buffer {
  const parts: Buffer[] = [];
  
  // Mint (32 bytes)
  parts.push(mint.toBuffer());
  
  // Owner (32 bytes)
  parts.push(owner.toBuffer());
  
  // Amount (8 bytes, little-endian)
  const amountBuffer = Buffer.alloc(8);
  amountBuffer.writeBigUInt64LE(amount);
  parts.push(amountBuffer);
  
  // Delegate (Option<Pubkey>: 1 byte tag + optional 32 bytes)
  if (delegate) {
    parts.push(Buffer.from([1])); // Some
    parts.push(delegate.toBuffer());
  } else {
    parts.push(Buffer.from([0])); // None
  }
  
  // State (1 byte: 0=initialized, 1=frozen)
  parts.push(Buffer.from([state === 'initialized' ? 0 : 1]));
  
  // TLV (Option<Vec<u8>>: 1 byte tag + optional length + data)
  if (tlv && tlv.length > 0) {
    parts.push(Buffer.from([1])); // Some
    const lenBuffer = Buffer.alloc(4);
    lenBuffer.writeUInt32LE(tlv.length);
    parts.push(lenBuffer);
    parts.push(tlv);
  } else {
    parts.push(Buffer.from([0])); // None
  }
  
  return Buffer.concat(parts);
}

/**
 * Create full compressed account data with discriminator
 * This is what should be stored in the Merkle tree
 */
function createCompressedAccountData(tokenData: Buffer): Buffer {
  return Buffer.concat([C_TOKEN_DISCRIMINATOR_V1, tokenData]);
}

/**
 * Hash the account data (Photon uses SHA256, Light uses Poseidon)
 */
function hashAccountData(data: Buffer): Buffer {
  return crypto.createHash('sha256').update(data).digest();
}

// ================ ANALYSIS ================

async function analyzePhotonCompatibility() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           PHOTON INDEXER COMPATIBILITY ANALYSIS            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // 1. Program ID Comparison
  console.log('1️⃣  PROGRAM ID COMPARISON');
  console.log('─'.repeat(60));
  console.log(`   Light Compression Program: ${LIGHT_COMPRESSION_PROGRAM.toBase58()}`);
  console.log(`   Styx Compression Program:  ${STYX_COMPRESSION_PROGRAM.toBase58()}`);
  console.log(`   Match: ❌ NO (Photon filters by program ID)\n`);
  
  console.log(`   Light Token Program: ${LIGHT_COMPRESSED_TOKEN_PROGRAM.toBase58()}`);
  console.log(`   Styx uses different program ownership\n`);
  
  // 2. TokenData Structure
  console.log('2️⃣  TOKEN DATA STRUCTURE');
  console.log('─'.repeat(60));
  
  const owner = Keypair.generate().publicKey;
  const tokenData = serializeLightTokenData(
    BONK_MINT,
    owner,
    BigInt(1_000_000_000), // 1 billion BONK
    null,
    'initialized',
    null
  );
  
  console.log(`   TokenData size: ${tokenData.length} bytes`);
  console.log(`   Structure:`);
  console.log(`     - Mint:     ${BONK_MINT.toBase58().slice(0, 20)}...`);
  console.log(`     - Owner:    ${owner.toBase58().slice(0, 20)}...`);
  console.log(`     - Amount:   1,000,000,000`);
  console.log(`     - Delegate: None`);
  console.log(`     - State:    initialized (0)`);
  console.log(`     - TLV:      None\n`);
  
  const fullData = createCompressedAccountData(tokenData);
  console.log(`   Full account data size: ${fullData.length} bytes`);
  console.log(`   Discriminator: [${C_TOKEN_DISCRIMINATOR_V1.toString()}]`);
  console.log(`   Data hash: ${hashAccountData(fullData).toString('hex').slice(0, 40)}...\n`);
  
  // 3. Compatibility Status
  console.log('3️⃣  COMPATIBILITY STATUS');
  console.log('─'.repeat(60));
  
  const checks = [
    { check: 'Same mint pubkey for SPL + compressed', status: '✅ MATCH', detail: 'Both use original SPL mint' },
    { check: 'TokenData structure', status: '✅ COMPATIBLE', detail: 'Same Borsh format' },
    { check: 'Owner/delegate tracking', status: '✅ COMPATIBLE', detail: 'Same pubkey references' },
    { check: 'Program ID', status: '❌ DIFFERENT', detail: 'Photon filters by Light program ID' },
    { check: 'Token program ownership', status: '❌ DIFFERENT', detail: 'Different cToken program' },
    { check: 'Event format', status: '⚠️ SIMILAR', detail: 'Could emit compatible events' },
    { check: 'Amount visibility', status: '⚠️ DIFFERENT', detail: 'Styx hides amounts (privacy!)' },
  ];
  
  checks.forEach(({ check, status, detail }) => {
    console.log(`   ${status} ${check}`);
    console.log(`      └─ ${detail}`);
  });
  console.log();
  
  // 4. Solutions
  console.log('4️⃣  SOLUTIONS TO MAKE PHOTON INDEX STYX');
  console.log('─'.repeat(60));
  
  console.log(`
   OPTION A: Custom Photon Instance (Easiest)
   ──────────────────────────────────────────
   Run Photon with custom program ID:
   
   $ photon --compression-program-id ${STYX_COMPRESSION_PROGRAM.toBase58()}
   
   Also need to modify COMPRESSED_TOKEN_PROGRAM in Photon source.
   
   
   OPTION B: Styx Indexer (styx-photon)
   ────────────────────────────────────
   Fork Photon and create a Styx-specific indexer:
   
   - Parse Styx events (TREE_INIT, COMPRESS, etc.)
   - Handle privacy (index commitments, not amounts)
   - Same API as Photon for wallet compatibility
   
   
   OPTION C: Light Protocol CPI (Complex)
   ──────────────────────────────────────
   Make Styx CPI into Light's programs:
   
   - Use Light's account-compression program
   - Emit events in Light's format
   - Loses some Styx privacy features
   
   
   OPTION D: Helius Integration (Future)
   ─────────────────────────────────────
   Partner with Helius to add Styx support:
   
   - They already run Photon infrastructure
   - Could add Styx program ID to their indexer
   - Would enable "getCompressedTokenAccountsByOwner" for Styx
`);

  // 5. What Works Today
  console.log('5️⃣  WHAT WORKS TODAY');
  console.log('─'.repeat(60));
  console.log(`
   ✅ Same mint pubkey - wallets see BONK as BONK
   ✅ Same owner - your pubkey owns both SPL and compressed
   ✅ Same structure - TokenData is identical format
   ✅ On-chain PDAs - State Trees, Token Pools work
   
   ❌ Photon won't auto-index (different program ID)
   ❌ Phantom/Solflare compressed balance won't show
   ❌ Need custom indexer or Photon fork
`);

  // 6. Recommendation
  console.log('6️⃣  RECOMMENDATION');
  console.log('─'.repeat(60));
  console.log(`
   For Styx, the BEST approach is OPTION B: Build styx-photon
   
   Why:
   • Styx has PRIVACY features (hidden amounts)
   • Regular Photon would expose amounts
   • Need custom indexer that understands commitments
   • Can still expose same API for wallet compat
   
   Short-term: Run custom Photon with Styx program ID
   Long-term: Build privacy-preserving styx-photon indexer
`);

  console.log('\n✨ Analysis complete!\n');
}

// ================ DEMO: Light-Compatible Event ================

function demonstrateLightEvent() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           LIGHT-COMPATIBLE EVENT STRUCTURE                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('To be indexed by Photon, transactions must:');
  console.log('');
  console.log('1. Call compression program (compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq)');
  console.log('2. Emit event to NOOP program (noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV)');
  console.log('3. Event contains Borsh-serialized PublicTransactionEvent:');
  console.log(`
   PublicTransactionEvent {
     input_compressed_account_hashes: Vec<[u8; 32]>,  // Spent accounts
     output_compressed_account_hashes: Vec<[u8; 32]>, // New accounts
     output_compressed_accounts: Vec<OutputCompressedAccountWithPackedContext>,
     output_leaf_indices: Vec<u32>,
     sequence_numbers: Vec<MerkleTreeSequenceNumber>,
     relay_fee: Option<u64>,
     is_compress: bool,
     compression_lamports: Option<u64>,
     pubkey_array: Vec<Pubkey>,
     message: Option<Vec<u8>>,
   }
  `);
  console.log('4. Account owner must be COMPRESSED_TOKEN_PROGRAM (cTokenmWW8bLPjZEBAUgYy3zKxQZW6VKi7bqNFEVv3m)');
  console.log('5. Account data must have token discriminator [2, 0, 0, 0, 0, 0, 0, 0]');
  console.log('');
}

// Run analysis
analyzePhotonCompatibility();
demonstrateLightEvent();
