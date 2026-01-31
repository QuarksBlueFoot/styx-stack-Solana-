/**
 * STS State Initializers
 * 
 * Provides functions to initialize required on-chain state for testing.
 * 
 * DESIGN PRINCIPLES (Solana Foundation Standard):
 * 1. PDAs are derived deterministically using program seeds
 * 2. State is initialized via inscription (zero-rent model)
 * 3. All accounts are properly sized and aligned
 * 4. Authority patterns follow SPL Token conventions
 * 
 * @author @moonmanquark (Bluefoot Labs)
 * @license BSL-1.1
 */

const {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} = require('@solana/web3.js');
const crypto = require('crypto');

// PDA Seeds (must match lib.rs exactly)
const SEEDS = {
  GLOBAL_POOL: Buffer.from('styx_gpool'),
  NULLIFIER: Buffer.from('styx_null'),
  MERKLE_ROOT: Buffer.from('styx_root'),
  PPV: Buffer.from('styx_ppv'),
  NFT_LISTING: Buffer.from('styx_list'),
  AUCTION: Buffer.from('styx_auction'),
  OFFER: Buffer.from('styx_offer'),
  ADAPTER: Buffer.from('styx_adapter'),
  POOL: Buffer.from('styx_pool'),
  VAULT: Buffer.from('styx_vault'),
  TOKEN_MINT: Buffer.from('styx_mint'),
  STEALTH: Buffer.from('styx_stealth'),
  AMM_POOL: Buffer.from('styx_amm'),
  LP_NOTE: Buffer.from('styx_lp'),
  LIMIT_ORDER: Buffer.from('styx_limit'),
  CLMM_POS: Buffer.from('styx_clmm'),
  PROPOSAL: Buffer.from('styx_prop'),
  SWAP: Buffer.from('styx_swap'),
  VSL_POOL: Buffer.from('styx_vsl'),
  ESCROW: Buffer.from('styx_escrow'),
  MULTISIG: Buffer.from('styx_msig'),
  SUBSCRIPTION: Buffer.from('styx_sub'),
  VESTING: Buffer.from('styx_vest'),
  VOUCHER: Buffer.from('styx_vouch'),
  FARM: Buffer.from('styx_farm'),
  STAKE: Buffer.from('styx_stake'),
  DCA: Buffer.from('styx_dca'),
  MARGIN: Buffer.from('styx_margin'),
  BRIDGE: Buffer.from('styx_bridge'),
  OPTION: Buffer.from('styx_option'),
  SECURITY: Buffer.from('styx_sec'),
};

// TAG Constants for state initialization
const INIT_TAGS = {
  // Governance
  CREATE_PROPOSAL: 9,
  CREATE_DELEGATION: 13,
  
  // VSL Atomic
  CREATE_SWAP_OFFER: 14,
  
  // Novel Privacy
  CREATE_MERKLE_TREE: 194,
  CREATE_STEALTH_KEY: 24,
  CREATE_AUCTION: 28,
  CREATE_SEALED_BID: 29,
  
  // VSL Privacy
  INIT_VSL_POOL: 32,
  VSL_DEPOSIT: 33,
  
  // Advanced Privacy
  MINT_PRIVATE_NFT: 44,
  CREATE_SUBSCRIPTION: 52,
  CREATE_VESTING: 55,
  CREATE_ESCROW: 60,
  CREATE_MULTISIG: 63,
  
  // Token Ops
  INIT_MINT: 94,
  CREATE_TOKEN_ACCOUNT: 93,
  MINT_TOKENS: 85,
  
  // NFT Marketplace
  CREATE_LISTING: 112,
  CREATE_OFFER: 115,
  CREATE_NFT_AUCTION: 118,
  
  // Privacy Vouchers
  CREATE_VOUCHER: 122,
  
  // DeFi
  CREATE_FARM: 134,
  CREATE_STAKE: 143,
  CREATE_VAULT: 163,
  CREATE_DCA: 170,
  CREATE_LIMIT_ORDER: 173,
  
  // AMM
  CREATE_POOL: 176,
  ADD_LIQUIDITY: 177,
  
  // Nullifiers
  CREATE_NULLIFIER: 192,
  PUBLISH_MERKLE_ROOT: 194,
  
  // Bridges
  INIT_BRIDGE: 241,
  
  // Options
  CREATE_OPTION_SERIES: 221,
  
  // Margin
  OPEN_MARGIN: 231,
  
  // Securities
  ISSUE_SECURITY: 211,
};

/**
 * StateInitializer - Creates prerequisite state for testing
 */
class StateInitializer {
  constructor(connection, payer, programId) {
    this.connection = connection;
    this.payer = payer;
    this.programId = programId;
    this.initialized = new Map();
  }

  /**
   * Derive PDA with bump
   */
  derivePDA(seeds) {
    return PublicKey.findProgramAddressSync(seeds, this.programId);
  }

  /**
   * Generate unique nonce for state
   */
  generateNonce() {
    return crypto.randomBytes(8);
  }

  /**
   * Build STS envelope header
   */
  buildHeader(tag, payloadLen) {
    const header = Buffer.alloc(8);
    header.writeUInt8(tag, 0);
    header.writeUInt8(0x01, 1); // version
    header.writeUInt16LE(payloadLen + 8, 2); // total length
    header.writeUInt32LE(Math.floor(Date.now() / 1000), 4); // timestamp
    return header;
  }

  /**
   * Create instruction with proper envelope format
   */
  createInstruction(tag, payload, additionalKeys = []) {
    const header = this.buildHeader(tag, payload.length);
    const data = Buffer.concat([header, payload]);
    
    const keys = [
      { pubkey: this.payer.publicKey, isSigner: true, isWritable: true },
      ...additionalKeys,
    ];

    return new TransactionInstruction({
      keys,
      programId: this.programId,
      data,
    });
  }

  /**
   * Send transaction with retries
   */
  async sendWithRetry(ix, signers = [this.payer], maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const tx = new Transaction().add(ix);
        const { blockhash } = await this.connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = this.payer.publicKey;

        const sig = await this.connection.sendTransaction(tx, signers, {
          skipPreflight: true,
        });
        await this.connection.confirmTransaction(sig, 'confirmed');
        return sig;
      } catch (err) {
        if (attempt === maxRetries - 1) throw err;
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GOVERNANCE STATE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize a proposal for governance testing
   */
  async initializeProposal() {
    if (this.initialized.has('proposal')) return this.initialized.get('proposal');

    const nonce = this.generateNonce();
    const [proposalPDA] = this.derivePDA([SEEDS.PROPOSAL, nonce]);
    
    // Build proposal payload
    const payload = Buffer.alloc(128);
    nonce.copy(payload, 0);
    payload.writeUInt32LE(Date.now() / 1000 + 86400, 8); // end time: 24h from now
    payload.writeUInt8(2, 12); // 2 choices
    Buffer.from('Test Proposal').copy(payload, 13);

    const ix = this.createInstruction(INIT_TAGS.CREATE_PROPOSAL, payload);
    await this.sendWithRetry(ix);

    this.initialized.set('proposal', { pda: proposalPDA, nonce });
    return this.initialized.get('proposal');
  }

  /**
   * Initialize a delegation for delegated voting
   */
  async initializeDelegation() {
    if (this.initialized.has('delegation')) return this.initialized.get('delegation');

    const delegate = Keypair.generate().publicKey;
    const payload = Buffer.alloc(96);
    delegate.toBuffer().copy(payload, 0);
    payload.writeUInt32LE(Date.now() / 1000 + 86400, 32); // expiry: 24h
    payload.writeBigUInt64LE(BigInt(1000000), 36); // weight

    const ix = this.createInstruction(INIT_TAGS.CREATE_DELEGATION, payload);
    await this.sendWithRetry(ix);

    this.initialized.set('delegation', { delegate });
    return this.initialized.get('delegation');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VSL ATOMIC STATE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize a swap offer for atomic swap testing
   */
  async initializeSwapOffer() {
    if (this.initialized.has('swap_offer')) return this.initialized.get('swap_offer');

    const nonce = this.generateNonce();
    const [swapPDA] = this.derivePDA([SEEDS.SWAP, nonce]);

    const payload = Buffer.alloc(128);
    nonce.copy(payload, 0);
    this.payer.publicKey.toBuffer().copy(payload, 8);
    payload.writeBigUInt64LE(BigInt(1000000), 40); // offered amount
    payload.writeBigUInt64LE(BigInt(500000), 48); // wanted amount
    payload.writeUInt32LE(Date.now() / 1000 + 3600, 56); // expiry: 1h

    const ix = this.createInstruction(INIT_TAGS.CREATE_SWAP_OFFER, payload);
    await this.sendWithRetry(ix);

    this.initialized.set('swap_offer', { pda: swapPDA, nonce });
    return this.initialized.get('swap_offer');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NOVEL PRIVACY STATE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize merkle tree for membership proofs
   */
  async initializeMerkleTree() {
    if (this.initialized.has('merkle_tree')) return this.initialized.get('merkle_tree');

    const nonce = this.generateNonce();
    const [rootPDA] = this.derivePDA([SEEDS.MERKLE_ROOT, nonce]);

    // Create dummy merkle root
    const root = crypto.randomBytes(32);
    const payload = Buffer.alloc(64);
    nonce.copy(payload, 0);
    root.copy(payload, 8);

    const ix = this.createInstruction(INIT_TAGS.PUBLISH_MERKLE_ROOT, payload);
    await this.sendWithRetry(ix);

    this.initialized.set('merkle_tree', { pda: rootPDA, root, nonce });
    return this.initialized.get('merkle_tree');
  }

  /**
   * Initialize stealth key for stealth transfers
   */
  async initializeStealthKey() {
    if (this.initialized.has('stealth_key')) return this.initialized.get('stealth_key');

    const nonce = this.generateNonce();
    const [stealthPDA] = this.derivePDA([SEEDS.STEALTH, this.payer.publicKey.toBuffer()]);

    const scanKey = crypto.randomBytes(32);
    const spendKey = crypto.randomBytes(32);
    
    const payload = Buffer.alloc(96);
    nonce.copy(payload, 0);
    scanKey.copy(payload, 8);
    spendKey.copy(payload, 40);

    const ix = this.createInstruction(INIT_TAGS.CREATE_STEALTH_KEY, payload);
    await this.sendWithRetry(ix);

    this.initialized.set('stealth_key', { pda: stealthPDA, scanKey, spendKey });
    return this.initialized.get('stealth_key');
  }

  /**
   * Initialize auction for private auctions
   */
  async initializeAuction() {
    if (this.initialized.has('auction')) return this.initialized.get('auction');

    const nonce = this.generateNonce();
    const [auctionPDA] = this.derivePDA([SEEDS.AUCTION, nonce]);

    const payload = Buffer.alloc(128);
    nonce.copy(payload, 0);
    this.payer.publicKey.toBuffer().copy(payload, 8); // seller
    payload.writeBigUInt64LE(BigInt(100000), 40); // reserve price
    payload.writeUInt32LE(Date.now() / 1000 + 3600, 48); // end time: 1h

    const ix = this.createInstruction(INIT_TAGS.CREATE_AUCTION, payload);
    await this.sendWithRetry(ix);

    this.initialized.set('auction', { pda: auctionPDA, nonce });
    return this.initialized.get('auction');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VSL PRIVACY STATE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize VSL privacy pool
   */
  async initializeVslPool() {
    if (this.initialized.has('vsl_pool')) return this.initialized.get('vsl_pool');

    const nonce = this.generateNonce();
    const [poolPDA] = this.derivePDA([SEEDS.VSL_POOL, nonce]);

    const payload = Buffer.alloc(96);
    nonce.copy(payload, 0);
    payload.writeBigUInt64LE(BigInt(10000000), 8); // max capacity
    payload.writeUInt8(18, 16); // decimals

    const ix = this.createInstruction(INIT_TAGS.INIT_VSL_POOL, payload);
    await this.sendWithRetry(ix);

    this.initialized.set('vsl_pool', { pda: poolPDA, nonce });
    return this.initialized.get('vsl_pool');
  }

  /**
   * Initialize VSL balance via deposit
   */
  async initializeVslBalance() {
    const pool = await this.initializeVslPool();
    if (this.initialized.has('vsl_balance')) return this.initialized.get('vsl_balance');

    const payload = Buffer.alloc(96);
    pool.nonce.copy(payload, 0);
    payload.writeBigUInt64LE(BigInt(1000000), 8); // deposit amount

    const ix = this.createInstruction(INIT_TAGS.VSL_DEPOSIT, payload);
    await this.sendWithRetry(ix);

    this.initialized.set('vsl_balance', { pool: pool.pda, amount: 1000000n });
    return this.initialized.get('vsl_balance');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADVANCED PRIVACY STATE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize subscription
   */
  async initializeSubscription() {
    if (this.initialized.has('subscription')) return this.initialized.get('subscription');

    const nonce = this.generateNonce();
    const [subPDA] = this.derivePDA([SEEDS.SUBSCRIPTION, this.payer.publicKey.toBuffer(), nonce]);

    const payload = Buffer.alloc(128);
    nonce.copy(payload, 0);
    payload.writeBigUInt64LE(BigInt(100000), 8); // monthly amount
    payload.writeUInt32LE(30 * 24 * 3600, 16); // interval: 30 days
    payload.writeUInt32LE(Date.now() / 1000, 20); // start time

    const ix = this.createInstruction(INIT_TAGS.CREATE_SUBSCRIPTION, payload);
    await this.sendWithRetry(ix);

    this.initialized.set('subscription', { pda: subPDA, nonce });
    return this.initialized.get('subscription');
  }

  /**
   * Initialize vesting schedule
   */
  async initializeVesting() {
    if (this.initialized.has('vesting')) return this.initialized.get('vesting');

    const nonce = this.generateNonce();
    const beneficiary = Keypair.generate().publicKey;
    const [vestPDA] = this.derivePDA([SEEDS.VESTING, beneficiary.toBuffer(), nonce]);

    const payload = Buffer.alloc(128);
    nonce.copy(payload, 0);
    beneficiary.toBuffer().copy(payload, 8);
    payload.writeBigUInt64LE(BigInt(10000000), 40); // total amount
    payload.writeUInt32LE(Date.now() / 1000, 48); // start time
    payload.writeUInt32LE(365 * 24 * 3600, 52); // duration: 1 year
    payload.writeUInt32LE(90 * 24 * 3600, 56); // cliff: 90 days

    const ix = this.createInstruction(INIT_TAGS.CREATE_VESTING, payload);
    await this.sendWithRetry(ix);

    this.initialized.set('vesting', { pda: vestPDA, beneficiary, nonce });
    return this.initialized.get('vesting');
  }

  /**
   * Initialize escrow
   */
  async initializeEscrow() {
    if (this.initialized.has('escrow')) return this.initialized.get('escrow');

    const nonce = this.generateNonce();
    const recipient = Keypair.generate().publicKey;
    const [escrowPDA] = this.derivePDA([SEEDS.ESCROW, nonce]);

    const payload = Buffer.alloc(128);
    nonce.copy(payload, 0);
    this.payer.publicKey.toBuffer().copy(payload, 8);
    recipient.toBuffer().copy(payload, 40);
    payload.writeBigUInt64LE(BigInt(500000), 72); // amount
    payload.writeUInt32LE(Date.now() / 1000 + 86400, 80); // release time: 24h

    const ix = this.createInstruction(INIT_TAGS.CREATE_ESCROW, payload);
    await this.sendWithRetry(ix);

    this.initialized.set('escrow', { pda: escrowPDA, recipient, nonce });
    return this.initialized.get('escrow');
  }

  /**
   * Initialize multisig
   */
  async initializeMultisig() {
    if (this.initialized.has('multisig')) return this.initialized.get('multisig');

    const nonce = this.generateNonce();
    const [msigPDA] = this.derivePDA([SEEDS.MULTISIG, nonce]);

    const signers = [
      this.payer.publicKey,
      Keypair.generate().publicKey,
      Keypair.generate().publicKey,
    ];

    const payload = Buffer.alloc(128);
    nonce.copy(payload, 0);
    payload.writeUInt8(2, 8); // threshold: 2 of 3
    payload.writeUInt8(3, 9); // total signers
    signers[0].toBuffer().copy(payload, 10);
    signers[1].toBuffer().copy(payload, 42);
    signers[2].toBuffer().copy(payload, 74);

    const ix = this.createInstruction(INIT_TAGS.CREATE_MULTISIG, payload);
    await this.sendWithRetry(ix);

    this.initialized.set('multisig', { pda: msigPDA, signers, threshold: 2, nonce });
    return this.initialized.get('multisig');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOKEN OPS STATE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize token mint
   */
  async initializeTokenMint() {
    if (this.initialized.has('token_mint')) return this.initialized.get('token_mint');

    const nonce = this.generateNonce();
    const [mintPDA] = this.derivePDA([SEEDS.TOKEN_MINT, nonce]);

    const payload = Buffer.alloc(96);
    nonce.copy(payload, 0);
    payload.writeUInt8(9, 8); // decimals
    this.payer.publicKey.toBuffer().copy(payload, 9); // mint authority
    this.payer.publicKey.toBuffer().copy(payload, 41); // freeze authority

    const ix = this.createInstruction(INIT_TAGS.INIT_MINT, payload);
    await this.sendWithRetry(ix);

    this.initialized.set('token_mint', { pda: mintPDA, nonce, decimals: 9 });
    return this.initialized.get('token_mint');
  }

  /**
   * Initialize token balance via mint
   */
  async initializeTokenBalance() {
    const mint = await this.initializeTokenMint();
    if (this.initialized.has('token_balance')) return this.initialized.get('token_balance');

    const payload = Buffer.alloc(64);
    mint.nonce.copy(payload, 0);
    this.payer.publicKey.toBuffer().copy(payload, 8);
    payload.writeBigUInt64LE(BigInt(10000000000), 40); // 10 tokens

    const ix = this.createInstruction(INIT_TAGS.MINT_TOKENS, payload);
    await this.sendWithRetry(ix);

    this.initialized.set('token_balance', { mint: mint.pda, amount: 10000000000n });
    return this.initialized.get('token_balance');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NFT MARKETPLACE STATE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize NFT listing
   */
  async initializeListing() {
    if (this.initialized.has('listing')) return this.initialized.get('listing');

    const nonce = this.generateNonce();
    const [listingPDA] = this.derivePDA([SEEDS.NFT_LISTING, nonce]);

    const nftMint = Keypair.generate().publicKey;
    const payload = Buffer.alloc(96);
    nonce.copy(payload, 0);
    nftMint.toBuffer().copy(payload, 8);
    this.payer.publicKey.toBuffer().copy(payload, 40);
    payload.writeBigUInt64LE(BigInt(1000000000), 72); // price: 1 SOL

    const ix = this.createInstruction(INIT_TAGS.CREATE_LISTING, payload);
    await this.sendWithRetry(ix);

    this.initialized.set('listing', { pda: listingPDA, nftMint, nonce });
    return this.initialized.get('listing');
  }

  /**
   * Initialize NFT offer
   */
  async initializeOffer() {
    if (this.initialized.has('offer')) return this.initialized.get('offer');

    const nonce = this.generateNonce();
    const [offerPDA] = this.derivePDA([SEEDS.OFFER, nonce]);

    const nftMint = Keypair.generate().publicKey;
    const payload = Buffer.alloc(96);
    nonce.copy(payload, 0);
    nftMint.toBuffer().copy(payload, 8);
    this.payer.publicKey.toBuffer().copy(payload, 40);
    payload.writeBigUInt64LE(BigInt(500000000), 72); // offer: 0.5 SOL
    payload.writeUInt32LE(Date.now() / 1000 + 86400, 80); // expiry: 24h

    const ix = this.createInstruction(INIT_TAGS.CREATE_OFFER, payload);
    await this.sendWithRetry(ix);

    this.initialized.set('offer', { pda: offerPDA, nftMint, nonce });
    return this.initialized.get('offer');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DEFI STATE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize AMM pool
   */
  async initializePool() {
    if (this.initialized.has('pool')) return this.initialized.get('pool');

    const nonce = this.generateNonce();
    const [poolPDA] = this.derivePDA([SEEDS.AMM_POOL, nonce]);

    const tokenA = Keypair.generate().publicKey;
    const tokenB = Keypair.generate().publicKey;

    const payload = Buffer.alloc(128);
    nonce.copy(payload, 0);
    tokenA.toBuffer().copy(payload, 8);
    tokenB.toBuffer().copy(payload, 40);
    payload.writeUInt16LE(30, 72); // fee: 0.3%

    const ix = this.createInstruction(INIT_TAGS.CREATE_POOL, payload);
    await this.sendWithRetry(ix);

    this.initialized.set('pool', { pda: poolPDA, tokenA, tokenB, nonce });
    return this.initialized.get('pool');
  }

  /**
   * Initialize LP position
   */
  async initializeLpPosition() {
    const pool = await this.initializePool();
    if (this.initialized.has('lp_position')) return this.initialized.get('lp_position');

    const [lpPDA] = this.derivePDA([SEEDS.LP_NOTE, pool.nonce, this.payer.publicKey.toBuffer()]);

    const payload = Buffer.alloc(128);
    pool.nonce.copy(payload, 0);
    payload.writeBigUInt64LE(BigInt(1000000), 8); // amount A
    payload.writeBigUInt64LE(BigInt(1000000), 16); // amount B

    const ix = this.createInstruction(INIT_TAGS.ADD_LIQUIDITY, payload);
    await this.sendWithRetry(ix);

    this.initialized.set('lp_position', { pda: lpPDA, pool: pool.pda });
    return this.initialized.get('lp_position');
  }

  /**
   * Initialize DCA position
   */
  async initializeDcaPosition() {
    if (this.initialized.has('dca_position')) return this.initialized.get('dca_position');

    const nonce = this.generateNonce();
    const [dcaPDA] = this.derivePDA([SEEDS.DCA, this.payer.publicKey.toBuffer(), nonce]);

    const tokenIn = Keypair.generate().publicKey;
    const tokenOut = Keypair.generate().publicKey;

    const payload = Buffer.alloc(128);
    nonce.copy(payload, 0);
    tokenIn.toBuffer().copy(payload, 8);
    tokenOut.toBuffer().copy(payload, 40);
    payload.writeBigUInt64LE(BigInt(100000), 72); // amount per interval
    payload.writeUInt32LE(3600, 80); // interval: 1 hour
    payload.writeUInt8(10, 84); // total intervals

    const ix = this.createInstruction(INIT_TAGS.CREATE_DCA, payload);
    await this.sendWithRetry(ix);

    this.initialized.set('dca_position', { pda: dcaPDA, nonce });
    return this.initialized.get('dca_position');
  }

  /**
   * Initialize limit order
   */
  async initializeLimitOrder() {
    if (this.initialized.has('limit_order')) return this.initialized.get('limit_order');

    const nonce = this.generateNonce();
    const [orderPDA] = this.derivePDA([SEEDS.LIMIT_ORDER, nonce]);

    const payload = Buffer.alloc(96);
    nonce.copy(payload, 0);
    payload.writeBigUInt64LE(BigInt(1000000), 8); // amount in
    payload.writeBigUInt64LE(BigInt(950000), 16); // min amount out
    payload.writeUInt32LE(Date.now() / 1000 + 86400, 24); // expiry

    const ix = this.createInstruction(INIT_TAGS.CREATE_LIMIT_ORDER, payload);
    await this.sendWithRetry(ix);

    this.initialized.set('limit_order', { pda: orderPDA, nonce });
    return this.initialized.get('limit_order');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE REQUIREMENT RESOLVER
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize all state required for a given stateReq
   */
  async initializeForRequirement(stateReq) {
    const initializers = {
      'proposal': () => this.initializeProposal(),
      'delegation': () => this.initializeDelegation(),
      'swap_offer': () => this.initializeSwapOffer(),
      'merkle_tree': () => this.initializeMerkleTree(),
      'stealth_key': () => this.initializeStealthKey(),
      'auction': () => this.initializeAuction(),
      'sealed_bid': () => this.initializeAuction(), // needs auction first
      'vsl_pool': () => this.initializeVslPool(),
      'vsl_balance': () => this.initializeVslBalance(),
      'vsl_account': () => this.initializeVslBalance(),
      'vsl_delegation': () => this.initializeVslBalance(),
      'subscription': () => this.initializeSubscription(),
      'vesting': () => this.initializeVesting(),
      'escrow': () => this.initializeEscrow(),
      'multisig': () => this.initializeMultisig(),
      'token_mint': () => this.initializeTokenMint(),
      'mint_authority': () => this.initializeTokenMint(),
      'token_balance': () => this.initializeTokenBalance(),
      'token_account': () => this.initializeTokenBalance(),
      'listing': () => this.initializeListing(),
      'offer': () => this.initializeOffer(),
      'pool': () => this.initializePool(),
      'lp_position': () => this.initializeLpPosition(),
      'dca_position': () => this.initializeDcaPosition(),
      'limit_order': () => this.initializeLimitOrder(),
      // Add more as needed...
    };

    if (initializers[stateReq]) {
      try {
        await initializers[stateReq]();
        return true;
      } catch (err) {
        console.error(`Failed to initialize ${stateReq}:`, err.message);
        return false;
      }
    }

    return false;
  }

  /**
   * Get initialized state for a requirement
   */
  getState(stateReq) {
    return this.initialized.get(stateReq);
  }
}

module.exports = {
  StateInitializer,
  SEEDS,
  INIT_TAGS,
};
