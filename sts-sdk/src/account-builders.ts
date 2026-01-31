/**
 * STS Account Builders
 * 
 * Provides comprehensive PDA derivation and account building utilities
 * for all STS instruction types.
 * 
 * DESIGN INSPIRED BY (but original implementation):
 * - Light Protocol: CPI context patterns, compressed account management
 * - Token-22: StateWithExtensions pattern, extension initialization order
 * 
 * SOLANA FOUNDATION STANDARD:
 * - All PDAs use deterministic seeds matching lib.rs
 * - Accounts are properly sized for rent exemption
 * - Authority patterns follow SPL Token conventions
 * 
 * @author @moonmanquark (Bluefoot Labs)
 * @license BSL-1.1
 */

import { PublicKey, Keypair } from '@solana/web3.js';
import { STYX_PMP_DEVNET_PROGRAM_ID, STYX_PMP_PROGRAM_ID } from './index';

// ============================================================================
// PDA SEEDS - Must match lib.rs exactly
// ============================================================================

export const PDA_SEEDS = {
  // Core State
  GLOBAL_POOL: Buffer.from('styx_gpool'),
  NULLIFIER: Buffer.from('styx_null'),
  MERKLE_ROOT: Buffer.from('styx_root'),
  CONFIG: Buffer.from('styx_config'),
  
  // Privacy & VSL
  PPV: Buffer.from('styx_ppv'),
  STEALTH: Buffer.from('styx_stealth'),
  VSL_POOL: Buffer.from('styx_vsl'),
  VSL_NOTE: Buffer.from('styx_vnote'),
  
  // Token Operations
  TOKEN_MINT: Buffer.from('styx_mint'),
  TOKEN_ACCOUNT: Buffer.from('styx_acct'),
  WRAPPER: Buffer.from('styx_wrap'),
  
  // NFT Marketplace
  NFT_LISTING: Buffer.from('styx_list'),
  AUCTION: Buffer.from('styx_auction'),
  OFFER: Buffer.from('styx_offer'),
  COLLECTION: Buffer.from('styx_coll'),
  
  // DeFi State
  ADAPTER: Buffer.from('styx_adapter'),
  POOL: Buffer.from('styx_pool'),
  VAULT: Buffer.from('styx_vault'),
  FARM: Buffer.from('styx_farm'),
  STAKE: Buffer.from('styx_stake'),
  
  // AMM & DEX
  AMM_POOL: Buffer.from('styx_amm'),
  LP_NOTE: Buffer.from('styx_lp'),
  LIMIT_ORDER: Buffer.from('styx_limit'),
  CLMM_POS: Buffer.from('styx_clmm'),
  ROUTER: Buffer.from('styx_router'),
  
  // Governance
  PROPOSAL: Buffer.from('styx_prop'),
  VOTE: Buffer.from('styx_vote'),
  DELEGATION: Buffer.from('styx_deleg'),
  
  // Advanced
  ESCROW: Buffer.from('styx_escrow'),
  MULTISIG: Buffer.from('styx_msig'),
  SUBSCRIPTION: Buffer.from('styx_sub'),
  VESTING: Buffer.from('styx_vest'),
  VOUCHER: Buffer.from('styx_vouch'),
  DCA: Buffer.from('styx_dca'),
  
  // Securities & Options
  SECURITY: Buffer.from('styx_sec'),
  OPTION: Buffer.from('styx_option'),
  MARGIN: Buffer.from('styx_margin'),
  POSITION: Buffer.from('styx_pos'),
  
  // Bridges
  BRIDGE: Buffer.from('styx_bridge'),
  LOCK: Buffer.from('styx_lock'),
  GUARDIAN: Buffer.from('styx_guard'),
} as const;

// ============================================================================
// ACCOUNT SIZES - Calculated for rent exemption
// ============================================================================

export const ACCOUNT_SIZES = {
  // Core (inscription-based, but tracked here for reference)
  NULLIFIER: 8 + 32,              // discriminator + hash
  MERKLE_ROOT: 8 + 32 + 8 + 32,   // disc + root + timestamp + authority
  CONFIG: 8 + 1 + 32 + 32 + 8,    // disc + paused + authority + treasury + fee
  
  // Token
  MINT: 8 + 82,                   // disc + SPL mint equivalent
  ACCOUNT: 8 + 165,               // disc + SPL account equivalent
  
  // NFT
  LISTING: 8 + 32 + 32 + 8 + 8,   // disc + mint + seller + price + expiry
  AUCTION: 8 + 32 + 32 + 8 + 8 + 32 + 8, // disc + mint + seller + reserve + end + bidder + bid
  OFFER: 8 + 32 + 32 + 32 + 8 + 8, // disc + mint + nft_owner + buyer + amount + expiry
  
  // DeFi
  POOL: 8 + 32 + 32 + 8 + 8 + 1,  // disc + mintA + mintB + reserveA + reserveB + type
  LP_POSITION: 8 + 32 + 32 + 8,   // disc + pool + owner + shares
  LIMIT_ORDER: 8 + 32 + 32 + 32 + 8 + 8 + 8, // disc + owner + in + out + amount + min + expiry
  
  // Governance
  PROPOSAL: 8 + 32 + 8 + 8 + 1 + 64 + 128, // disc + proposer + end + threshold + active + title + desc
  VOTE: 8 + 32 + 32 + 8 + 1,      // disc + proposal + voter + weight + choice
  
  // Privacy
  VSL_POOL: 8 + 32 + 8 + 32,      // disc + mint + capacity + authority
  VSL_NOTE: 8 + 32 + 64 + 32,     // disc + pool + encrypted_amount + owner_hint
  STEALTH: 8 + 32 + 32,           // disc + scan_key + spend_key
  PPV: 8 + 32 + 8 + 8 + 32,       // disc + issuer + amount + expiry + commitment
  
  // Securities
  SECURITY: 8 + 32 + 12 + 16 + 32 + 8, // disc + issuer + cusip + class + TA + supply
  OPTION: 8 + 1 + 32 + 32 + 8 + 8 + 8 + 32, // disc + type + underlying + quote + strike + expiry + lot + writer
  MARGIN: 8 + 32 + 32 + 8 + 8 + 1, // disc + owner + collateral + debt + liq_price + cross
  
  // Bridge
  LOCK: 8 + 32 + 8 + 32 + 4 + 32, // disc + token + amount + recipient + chain + hash
  BRIDGE_CONFIG: 8 + 32 + 1 + 8 + 32, // disc + guardian + active + fee + treasury
} as const;

// ============================================================================
// PDA DERIVATION FUNCTIONS
// ============================================================================

export interface PDAwithBump {
  pda: PublicKey;
  bump: number;
}

/**
 * Derive global pool PDA
 */
export function deriveGlobalPool(programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID): PDAwithBump {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.GLOBAL_POOL],
    programId
  );
  return { pda, bump };
}

/**
 * Derive nullifier PDA from hash
 */
export function deriveNullifier(
  hash: Buffer | Uint8Array,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.NULLIFIER, Buffer.from(hash)],
    programId
  );
  return { pda, bump };
}

/**
 * Derive merkle root PDA from nonce
 */
export function deriveMerkleRoot(
  nonce: Buffer | Uint8Array,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.MERKLE_ROOT, Buffer.from(nonce)],
    programId
  );
  return { pda, bump };
}

/**
 * Derive token mint PDA
 */
export function deriveTokenMint(
  nonce: Buffer | Uint8Array,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.TOKEN_MINT, Buffer.from(nonce)],
    programId
  );
  return { pda, bump };
}

/**
 * Derive token account PDA for owner + mint
 */
export function deriveTokenAccount(
  owner: PublicKey,
  mint: PublicKey,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.TOKEN_ACCOUNT, owner.toBuffer(), mint.toBuffer()],
    programId
  );
  return { pda, bump };
}

/**
 * Derive stealth address PDA
 */
export function deriveStealthAddress(
  owner: PublicKey,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.STEALTH, owner.toBuffer()],
    programId
  );
  return { pda, bump };
}

/**
 * Derive NFT listing PDA
 */
export function deriveNftListing(
  nftMint: PublicKey,
  seller: PublicKey,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.NFT_LISTING, nftMint.toBuffer(), seller.toBuffer()],
    programId
  );
  return { pda, bump };
}

/**
 * Derive auction PDA
 */
export function deriveAuction(
  nonce: Buffer | Uint8Array,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.AUCTION, Buffer.from(nonce)],
    programId
  );
  return { pda, bump };
}

/**
 * Derive NFT offer PDA
 */
export function deriveOffer(
  nftMint: PublicKey,
  buyer: PublicKey,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.OFFER, nftMint.toBuffer(), buyer.toBuffer()],
    programId
  );
  return { pda, bump };
}

/**
 * Derive AMM pool PDA
 */
export function deriveAmmPool(
  mintA: PublicKey,
  mintB: PublicKey,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  // Canonical ordering: lower mint first
  const [first, second] = mintA.toBuffer().compare(mintB.toBuffer()) < 0
    ? [mintA, mintB]
    : [mintB, mintA];
  
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.AMM_POOL, first.toBuffer(), second.toBuffer()],
    programId
  );
  return { pda, bump };
}

/**
 * Derive LP position PDA
 */
export function deriveLpPosition(
  pool: PublicKey,
  owner: PublicKey,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.LP_NOTE, pool.toBuffer(), owner.toBuffer()],
    programId
  );
  return { pda, bump };
}

/**
 * Derive limit order PDA
 */
export function deriveLimitOrder(
  nonce: Buffer | Uint8Array,
  owner: PublicKey,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.LIMIT_ORDER, owner.toBuffer(), Buffer.from(nonce)],
    programId
  );
  return { pda, bump };
}

/**
 * Derive proposal PDA
 */
export function deriveProposal(
  nonce: Buffer | Uint8Array,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.PROPOSAL, Buffer.from(nonce)],
    programId
  );
  return { pda, bump };
}

/**
 * Derive vote PDA
 */
export function deriveVote(
  proposal: PublicKey,
  voter: PublicKey,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.VOTE, proposal.toBuffer(), voter.toBuffer()],
    programId
  );
  return { pda, bump };
}

/**
 * Derive VSL pool PDA
 */
export function deriveVslPool(
  mint: PublicKey,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.VSL_POOL, mint.toBuffer()],
    programId
  );
  return { pda, bump };
}

/**
 * Derive VSL note (private balance) PDA
 */
export function deriveVslNote(
  pool: PublicKey,
  commitment: Buffer | Uint8Array,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.VSL_NOTE, pool.toBuffer(), Buffer.from(commitment)],
    programId
  );
  return { pda, bump };
}

/**
 * Derive PPV (Privacy Voucher) PDA
 */
export function derivePpv(
  nonce: Buffer | Uint8Array,
  issuer: PublicKey,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.PPV, issuer.toBuffer(), Buffer.from(nonce)],
    programId
  );
  return { pda, bump };
}

/**
 * Derive escrow PDA
 */
export function deriveEscrow(
  nonce: Buffer | Uint8Array,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.ESCROW, Buffer.from(nonce)],
    programId
  );
  return { pda, bump };
}

/**
 * Derive multisig PDA
 */
export function deriveMultisig(
  nonce: Buffer | Uint8Array,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.MULTISIG, Buffer.from(nonce)],
    programId
  );
  return { pda, bump };
}

/**
 * Derive vesting schedule PDA
 */
export function deriveVesting(
  beneficiary: PublicKey,
  nonce: Buffer | Uint8Array,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.VESTING, beneficiary.toBuffer(), Buffer.from(nonce)],
    programId
  );
  return { pda, bump };
}

/**
 * Derive subscription PDA
 */
export function deriveSubscription(
  subscriber: PublicKey,
  merchant: PublicKey,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.SUBSCRIPTION, subscriber.toBuffer(), merchant.toBuffer()],
    programId
  );
  return { pda, bump };
}

/**
 * Derive DCA position PDA
 */
export function deriveDca(
  owner: PublicKey,
  nonce: Buffer | Uint8Array,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.DCA, owner.toBuffer(), Buffer.from(nonce)],
    programId
  );
  return { pda, bump };
}

/**
 * Derive security token PDA
 */
export function deriveSecurity(
  cusip: string | Buffer,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const cusipBuffer = typeof cusip === 'string' 
    ? Buffer.from(cusip.padEnd(12, '\0')) 
    : cusip;
  
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.SECURITY, cusipBuffer],
    programId
  );
  return { pda, bump };
}

/**
 * Derive option contract PDA
 */
export function deriveOption(
  underlying: PublicKey,
  strike: bigint,
  expiry: number,
  isCall: boolean,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const strikeBuffer = Buffer.alloc(8);
  strikeBuffer.writeBigUInt64LE(strike);
  
  const expiryBuffer = Buffer.alloc(4);
  expiryBuffer.writeUInt32LE(expiry);
  
  const typeBuffer = Buffer.from([isCall ? 1 : 0]);
  
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.OPTION, underlying.toBuffer(), strikeBuffer, expiryBuffer, typeBuffer],
    programId
  );
  return { pda, bump };
}

/**
 * Derive margin account PDA
 */
export function deriveMarginAccount(
  owner: PublicKey,
  collateralMint: PublicKey,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.MARGIN, owner.toBuffer(), collateralMint.toBuffer()],
    programId
  );
  return { pda, bump };
}

/**
 * Derive bridge lock PDA
 */
export function deriveBridgeLock(
  sourceToken: PublicKey,
  destChain: number,
  nonce: Buffer | Uint8Array,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const chainBuffer = Buffer.alloc(4);
  chainBuffer.writeUInt32LE(destChain);
  
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.LOCK, sourceToken.toBuffer(), chainBuffer, Buffer.from(nonce)],
    programId
  );
  return { pda, bump };
}

/**
 * Derive bridge guardian set PDA
 */
export function deriveBridgeGuardian(
  bridgeId: Buffer | Uint8Array,
  programId: PublicKey = STYX_PMP_DEVNET_PROGRAM_ID
): PDAwithBump {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.GUARDIAN, Buffer.from(bridgeId)],
    programId
  );
  return { pda, bump };
}

// ============================================================================
// ACCOUNT BUILDERS - Token-22 Inspired Pattern
// ============================================================================

/**
 * Account configuration for building instruction accounts
 */
export interface AccountConfig {
  pubkey: PublicKey;
  isSigner: boolean;
  isWritable: boolean;
}

/**
 * Build accounts for a token mint instruction
 */
export function buildMintAccounts(
  payer: PublicKey,
  mintPda: PublicKey,
  mintAuthority: PublicKey
): AccountConfig[] {
  return [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: mintPda, isSigner: false, isWritable: true },
    { pubkey: mintAuthority, isSigner: true, isWritable: false },
  ];
}

/**
 * Build accounts for a token transfer instruction
 */
export function buildTransferAccounts(
  payer: PublicKey,
  source: PublicKey,
  destination: PublicKey,
  owner: PublicKey
): AccountConfig[] {
  return [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: source, isSigner: false, isWritable: true },
    { pubkey: destination, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: true, isWritable: false },
  ];
}

/**
 * Build accounts for AMM swap
 */
export function buildSwapAccounts(
  payer: PublicKey,
  poolPda: PublicKey,
  userTokenIn: PublicKey,
  userTokenOut: PublicKey,
  poolVaultIn: PublicKey,
  poolVaultOut: PublicKey
): AccountConfig[] {
  return [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: poolPda, isSigner: false, isWritable: true },
    { pubkey: userTokenIn, isSigner: false, isWritable: true },
    { pubkey: userTokenOut, isSigner: false, isWritable: true },
    { pubkey: poolVaultIn, isSigner: false, isWritable: true },
    { pubkey: poolVaultOut, isSigner: false, isWritable: true },
  ];
}

/**
 * Build accounts for adding liquidity
 */
export function buildAddLiquidityAccounts(
  payer: PublicKey,
  poolPda: PublicKey,
  lpPositionPda: PublicKey,
  userTokenA: PublicKey,
  userTokenB: PublicKey,
  poolVaultA: PublicKey,
  poolVaultB: PublicKey
): AccountConfig[] {
  return [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: poolPda, isSigner: false, isWritable: true },
    { pubkey: lpPositionPda, isSigner: false, isWritable: true },
    { pubkey: userTokenA, isSigner: false, isWritable: true },
    { pubkey: userTokenB, isSigner: false, isWritable: true },
    { pubkey: poolVaultA, isSigner: false, isWritable: true },
    { pubkey: poolVaultB, isSigner: false, isWritable: true },
  ];
}

/**
 * Build accounts for governance vote
 */
export function buildVoteAccounts(
  voter: PublicKey,
  proposalPda: PublicKey,
  votePda: PublicKey
): AccountConfig[] {
  return [
    { pubkey: voter, isSigner: true, isWritable: true },
    { pubkey: proposalPda, isSigner: false, isWritable: true },
    { pubkey: votePda, isSigner: false, isWritable: true },
  ];
}

/**
 * Build accounts for VSL private transfer
 */
export function buildVslTransferAccounts(
  payer: PublicKey,
  vslPoolPda: PublicKey,
  sourceNote: PublicKey,
  destNote: PublicKey,
  nullifierPda: PublicKey
): AccountConfig[] {
  return [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: vslPoolPda, isSigner: false, isWritable: true },
    { pubkey: sourceNote, isSigner: false, isWritable: true },
    { pubkey: destNote, isSigner: false, isWritable: true },
    { pubkey: nullifierPda, isSigner: false, isWritable: true },
  ];
}

/**
 * Build accounts for NFT listing
 */
export function buildNftListAccounts(
  seller: PublicKey,
  nftMint: PublicKey,
  listingPda: PublicKey,
  nftTokenAccount: PublicKey,
  escrowVault: PublicKey
): AccountConfig[] {
  return [
    { pubkey: seller, isSigner: true, isWritable: true },
    { pubkey: nftMint, isSigner: false, isWritable: false },
    { pubkey: listingPda, isSigner: false, isWritable: true },
    { pubkey: nftTokenAccount, isSigner: false, isWritable: true },
    { pubkey: escrowVault, isSigner: false, isWritable: true },
  ];
}

/**
 * Build accounts for bridge lock
 */
export function buildBridgeLockAccounts(
  user: PublicKey,
  tokenMint: PublicKey,
  userTokenAccount: PublicKey,
  lockPda: PublicKey,
  lockVault: PublicKey,
  bridgeConfig: PublicKey
): AccountConfig[] {
  return [
    { pubkey: user, isSigner: true, isWritable: true },
    { pubkey: tokenMint, isSigner: false, isWritable: false },
    { pubkey: userTokenAccount, isSigner: false, isWritable: true },
    { pubkey: lockPda, isSigner: false, isWritable: true },
    { pubkey: lockVault, isSigner: false, isWritable: true },
    { pubkey: bridgeConfig, isSigner: false, isWritable: false },
  ];
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  deriveGlobalPool,
  deriveNullifier,
  deriveMerkleRoot,
  deriveTokenMint,
  deriveTokenAccount,
  deriveStealthAddress,
  deriveNftListing,
  deriveAuction,
  deriveOffer,
  deriveAmmPool,
  deriveLpPosition,
  deriveLimitOrder,
  deriveProposal,
  deriveVote,
  deriveVslPool,
  deriveVslNote,
  derivePpv,
  deriveEscrow,
  deriveMultisig,
  deriveVesting,
  deriveSubscription,
  deriveDca,
  deriveSecurity,
  deriveOption,
  deriveMarginAccount,
  deriveBridgeLock,
  deriveBridgeGuardian,
};
