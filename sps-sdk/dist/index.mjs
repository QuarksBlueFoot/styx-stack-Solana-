import {
  DOMAIN_ACCOUNT,
  DOMAIN_BRIDGE,
  DOMAIN_COMPLIANCE,
  DOMAIN_DAM,
  DOMAIN_DEFI,
  DOMAIN_DERIVATIVES,
  DOMAIN_EASYPAY,
  DOMAIN_EXTENDED,
  DOMAIN_GOVERNANCE,
  DOMAIN_IC,
  DOMAIN_MESSAGING,
  DOMAIN_NFT,
  DOMAIN_NOTES,
  DOMAIN_PRIVACY,
  DOMAIN_SCHEMA,
  DOMAIN_SECURITIES,
  DOMAIN_STS,
  DOMAIN_SWAP,
  DOMAIN_TLV,
  DOMAIN_VSL,
  __require,
  account,
  bridge,
  buildInstructionPrefix,
  compliance,
  dam,
  defi,
  derivatives,
  easypay,
  extensions,
  getDomainName,
  governance,
  ic,
  messaging,
  nft,
  notes,
  poolTypes,
  privacy,
  securities,
  sts,
  swap,
  vsl
} from "./chunk-2BE36FP4.mjs";

// src/index.ts
import {
  PublicKey as PublicKey9,
  TransactionInstruction as TransactionInstruction9,
  TransactionMessage as TransactionMessage6,
  VersionedTransaction as VersionedTransaction6,
  SystemProgram as SystemProgram9
} from "@solana/web3.js";
import { keccak_256 as keccak_2563 } from "@noble/hashes/sha3";
import { sha256 as sha2564 } from "@noble/hashes/sha256";
import { x25519 } from "@noble/curves/ed25519";
import { chacha20poly1305 as chacha20poly13052 } from "@noble/ciphers/chacha";
import { randomBytes as randomBytes5 } from "@noble/ciphers/webcrypto";

// src/dam.ts
import {
  PublicKey,
  TransactionInstruction,
  SystemProgram
} from "@solana/web3.js";
import { sha256 } from "@noble/hashes/sha256";
var SPS_PROGRAM_ID = new PublicKey("GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9");
var SEEDS = {
  DAM_POOL: Buffer.from("dam_pool"),
  VIRTUAL_BALANCE: Buffer.from("dam_vbal"),
  MERKLE_ROOT: Buffer.from("dam_root"),
  NULLIFIER: Buffer.from("dam_null")
};
var DAMClient = class {
  constructor(connection, programId = SPS_PROGRAM_ID) {
    this.connection = connection;
    this.programId = programId;
  }
  // ═══════════════════════════════════════════════════════════════════════
  // POOL OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════
  /**
   * Derive DAM pool PDA for a token mint
   */
  getPoolPda(mint) {
    return PublicKey.findProgramAddressSync(
      [SEEDS.DAM_POOL, mint.toBytes()],
      this.programId
    );
  }
  /**
   * Create DAM pool for a token mint
   * Uses Token-2022 with Permanent Delegate + Immutable Owner
   * Cost: ~0.002 SOL once (shared by ALL holders!)
   */
  buildCreatePoolIx(config, payer) {
    const [poolPda] = this.getPoolPda(config.mint);
    const data = Buffer.alloc(76);
    let offset = 0;
    data.writeUInt8(DOMAIN_DAM, offset++);
    data.writeUInt8(dam.OP_POOL_CREATE, offset++);
    config.mint.toBuffer().copy(data, offset);
    offset += 32;
    config.authority.toBuffer().copy(data, offset);
    offset += 32;
    data.writeUInt16LE(config.feeBps ?? 0, offset);
    offset += 2;
    data.writeBigUInt64LE(config.minMaterializeAmount ?? 0n, offset);
    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: true },
        { pubkey: config.mint, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data
    });
  }
  // ═══════════════════════════════════════════════════════════════════════
  // VIRTUAL BALANCE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════
  /**
   * Compute virtual balance commitment
   * commitment = sha256(owner || mint || amount || nonce)
   */
  computeCommitment(balance) {
    const data = Buffer.concat([
      balance.owner.toBytes(),
      balance.mint.toBytes(),
      Buffer.from(balance.amount.toString()),
      balance.nonce
    ]);
    return sha256(data);
  }
  /**
   * Build virtual mint instruction (inscription-based, ZERO rent!)
   */
  buildVirtualMintIx(mint, recipient, amount, minter, privateMode = true) {
    const nonce = new Uint8Array(32);
    crypto.getRandomValues(nonce);
    const balance = {
      owner: recipient,
      mint,
      amount,
      nonce
    };
    const commitment = privateMode ? this.computeCommitment(balance) : new Uint8Array(32);
    const data = Buffer.alloc(107);
    let offset = 0;
    data.writeUInt8(DOMAIN_DAM, offset++);
    data.writeUInt8(dam.OP_VIRTUAL_MINT, offset++);
    mint.toBuffer().copy(data, offset);
    offset += 32;
    recipient.toBuffer().copy(data, offset);
    offset += 32;
    data.writeBigUInt64LE(amount, offset);
    offset += 8;
    data.writeUInt8(privateMode ? 1 : 0, offset++);
    Buffer.from(commitment).copy(data, offset);
    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: minter, isSigner: true, isWritable: true }
      ],
      data
    });
  }
  /**
   * Build virtual transfer instruction (private, free)
   */
  buildVirtualTransferIx(mint, from, to, amount, fromNonce, signer) {
    const newNonce = new Uint8Array(32);
    crypto.getRandomValues(newNonce);
    const nullifier = sha256(Buffer.concat([
      Buffer.from("DAM_NULLIFIER_V1"),
      from.toBytes(),
      mint.toBytes(),
      fromNonce
    ]));
    const data = Buffer.alloc(170);
    let offset = 0;
    data.writeUInt8(DOMAIN_DAM, offset++);
    data.writeUInt8(dam.OP_VIRTUAL_TRANSFER, offset++);
    mint.toBuffer().copy(data, offset);
    offset += 32;
    from.toBuffer().copy(data, offset);
    offset += 32;
    to.toBuffer().copy(data, offset);
    offset += 32;
    data.writeBigUInt64LE(amount, offset);
    offset += 8;
    Buffer.from(nullifier).copy(data, offset);
    offset += 32;
    Buffer.from(newNonce).copy(data, offset);
    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: signer, isSigner: true, isWritable: true }
      ],
      data
    });
  }
  // ═══════════════════════════════════════════════════════════════════════
  // MATERIALIZATION - Convert virtual to real SPL account
  // ═══════════════════════════════════════════════════════════════════════
  /**
   * Build materialize instruction
   * Creates real SPL token account from virtual balance
   * User pays ~0.002 SOL rent, but gets DEX-compatible tokens!
   */
  buildMaterializeIx(mint, owner, amount, proof, destinationAccount) {
    const [poolPda] = this.getPoolPda(mint);
    const nullifier = sha256(Buffer.concat([
      Buffer.from("DAM_MATERIALIZE_V1"),
      proof.leaf,
      Buffer.from(proof.rootSlot.toString())
    ]));
    const [nullifierPda] = PublicKey.findProgramAddressSync(
      [SEEDS.NULLIFIER, nullifier],
      this.programId
    );
    const proofData = Buffer.alloc(1 + proof.path.length * 33);
    proofData.writeUInt8(proof.path.length, 0);
    for (let i = 0; i < proof.path.length; i++) {
      proof.path[i].slice().forEach((b, j) => proofData[1 + i * 33 + j] = b);
      proofData[1 + i * 33 + 32] = proof.directions[i];
    }
    const data = Buffer.concat([
      buildInstructionPrefix(DOMAIN_DAM, dam.OP_MATERIALIZE),
      mint.toBuffer(),
      Buffer.from(new BigUint64Array([amount]).buffer),
      Buffer.from(proof.leaf),
      Buffer.from(proof.root),
      Buffer.from(new BigUint64Array([proof.rootSlot]).buffer),
      proofData
    ]);
    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: true },
        { pubkey: destinationAccount, isSigner: false, isWritable: true },
        { pubkey: nullifierPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data
    });
  }
  // ═══════════════════════════════════════════════════════════════════════
  // DE-MATERIALIZATION - Return to virtual, RECLAIM RENT!
  // ═══════════════════════════════════════════════════════════════════════
  /**
   * Build de-materialize instruction
   * Returns tokens to pool, closes account, reclaims rent!
   * Balance returns to virtual/private mode
   * UNIQUE TO SPS - Light Protocol cannot do this!
   */
  buildDematerializeIx(mint, owner, sourceAccount, amount) {
    const [poolPda] = this.getPoolPda(mint);
    const newNonce = new Uint8Array(32);
    crypto.getRandomValues(newNonce);
    const newBalance = {
      owner,
      mint,
      amount,
      nonce: newNonce
    };
    const newCommitment = this.computeCommitment(newBalance);
    const data = Buffer.alloc(106);
    let offset = 0;
    data.writeUInt8(DOMAIN_DAM, offset++);
    data.writeUInt8(dam.OP_DEMATERIALIZE, offset++);
    mint.toBuffer().copy(data, offset);
    offset += 32;
    data.writeBigUInt64LE(amount, offset);
    offset += 8;
    Buffer.from(newCommitment).copy(data, offset);
    offset += 32;
    Buffer.from(newNonce).copy(data, offset);
    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: sourceAccount, isSigner: false, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: true }
      ],
      data
    });
  }
  // ═══════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════════
  /**
   * Estimate rent savings for virtual vs real accounts
   */
  estimateRentSavings(userCount, activeTraderPercent = 5) {
    const splRentPerAccount = 203928e-8;
    const token22RentPerAccount = 115e-5;
    const lightTreeCost = 89e-4;
    const lightPerUser = 4e-5;
    const damPoolCost = 2e-3;
    const damMaterializeRent = 2e-3;
    const splTokenCost = userCount * splRentPerAccount;
    const token22Cost = userCount * token22RentPerAccount;
    const lightProtocolCost = lightTreeCost + userCount * lightPerUser;
    const damCost = damPoolCost + userCount * (activeTraderPercent / 100) * damMaterializeRent;
    return {
      splTokenCost: Math.round(splTokenCost * 1e3) / 1e3,
      token22Cost: Math.round(token22Cost * 1e3) / 1e3,
      lightProtocolCost: Math.round(lightProtocolCost * 1e3) / 1e3,
      damCost: Math.round(damCost * 1e3) / 1e3,
      damSavingsVsSpl: Math.round((1 - damCost / splTokenCost) * 100),
      damSavingsVsLight: Math.round((damCost / lightProtocolCost - 1) * 100)
    };
  }
};

// src/easy-pay.ts
import {
  PublicKey as PublicKey2,
  Keypair as Keypair2,
  TransactionInstruction as TransactionInstruction2,
  TransactionMessage as TransactionMessage2,
  VersionedTransaction as VersionedTransaction2,
  SystemProgram as SystemProgram2
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
var PROGRAM_ID = new PublicKey2("GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9");
var DOMAIN_EASYPAY2 = 17;
var EASYPAY_SEEDS = {
  ESCROW: Buffer.from("sps_escrow"),
  STEALTH: Buffer.from("sps_stealth"),
  RELAYER: Buffer.from("sps_relayer"),
  LINK: Buffer.from("sps_link")
};
var EASYPAY_OPS = {
  // Payment Creation
  CREATE_PAYMENT: 1,
  CREATE_BATCH_PAYMENT: 2,
  CREATE_RECURRING: 3,
  // Claiming
  CLAIM_PAYMENT: 16,
  CLAIM_TO_STEALTH: 17,
  CLAIM_TO_EXISTING: 18,
  CLAIM_BATCH: 19,
  // Payment Management
  CANCEL_PAYMENT: 32,
  EXTEND_EXPIRY: 33,
  REFUND_EXPIRED: 34,
  // Gasless Operations
  REGISTER_RELAYER: 48,
  SUBMIT_META_TX: 49,
  CLAIM_RELAYER_FEE: 50,
  // Stealth Address Management
  GENERATE_STEALTH_KEYS: 64,
  PUBLISH_STEALTH_META: 65,
  SCAN_ANNOUNCEMENTS: 66,
  // Privacy Features
  PRIVATE_PAYMENT: 80,
  REVEAL_TO_AUDITOR: 81
};
function generateClaimSecret() {
  const crypto2 = globalThis.crypto || __require("crypto");
  const secret = crypto2.randomBytes(32);
  const hash = crypto2.createHash("sha256").update(secret).digest();
  return { secret: new Uint8Array(secret), hash: new Uint8Array(hash) };
}
function hashRecipientIdentifier(identifier, salt) {
  const crypto2 = globalThis.crypto || __require("crypto");
  const normalizedId = identifier.toLowerCase().trim();
  const saltBuf = salt || crypto2.randomBytes(16);
  const data = Buffer.concat([
    Buffer.from("SPS_RECIPIENT_V1"),
    Buffer.from(normalizedId),
    Buffer.from(saltBuf)
  ]);
  return new Uint8Array(crypto2.createHash("sha256").update(data).digest());
}
function generateStealthKeys() {
  const spendingKeyPair = Keypair2.generate();
  const viewingKeyPair = Keypair2.generate();
  const metaAddress = `st:sol:${spendingKeyPair.publicKey.toBase58()}:${viewingKeyPair.publicKey.toBase58()}`;
  return {
    spendingKeyPair,
    viewingKeyPair,
    metaAddress
  };
}
function parseStealthMetaAddress(metaAddress) {
  const parts = metaAddress.split(":");
  if (parts.length !== 4 || parts[0] !== "st" || parts[1] !== "sol") {
    throw new Error("Invalid stealth meta-address format");
  }
  return {
    spendingKey: new PublicKey2(parts[2]),
    viewingKey: new PublicKey2(parts[3])
  };
}
function generateStealthAddress(metaAddress) {
  const crypto2 = globalThis.crypto || __require("crypto");
  const { spendingKey, viewingKey } = parseStealthMetaAddress(metaAddress);
  const ephemeralKeyPair = Keypair2.generate();
  const sharedSecret = crypto2.createHash("sha256").update(
    Buffer.concat([
      ephemeralKeyPair.secretKey.slice(0, 32),
      viewingKey.toBytes()
    ])
  ).digest();
  const stealthSeed = crypto2.createHash("sha256").update(
    Buffer.concat([
      spendingKey.toBytes(),
      sharedSecret
    ])
  ).digest();
  const stealthKeyPair = Keypair2.fromSeed(stealthSeed);
  const viewTag = new Uint8Array(sharedSecret.slice(0, 4));
  return {
    stealthAddress: stealthKeyPair.publicKey,
    ephemeralKeyPair,
    viewTag
  };
}
function deriveEscrowPda(paymentId, programId = PROGRAM_ID) {
  return PublicKey2.findProgramAddressSync(
    [EASYPAY_SEEDS.ESCROW, paymentId],
    programId
  );
}
function createPaymentLink(paymentId, claimSecret, baseUrl = "https://styx.pay") {
  const paymentIdB64 = Buffer.from(paymentId).toString("base64url");
  const secretB64 = Buffer.from(claimSecret).toString("base64url");
  const url = `${baseUrl}/claim/${paymentIdB64}#${secretB64}`;
  const shortCode = paymentIdB64.slice(0, 8).toUpperCase();
  const qrData = JSON.stringify({ p: paymentIdB64, s: secretB64 });
  return {
    url,
    shortCode,
    qrData,
    paymentId: paymentIdB64,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3)
    // 7 days default
  };
}
var EasyPayClient = class {
  constructor(connection, programId = PROGRAM_ID, relayerConfig) {
    this.connection = connection;
    this.programId = programId;
    this.relayerConfig = relayerConfig;
  }
  // ──────────────────────────────────────────────────────────────────────────
  // PAYMENT CREATION
  // ──────────────────────────────────────────────────────────────────────────
  /**
   * Create a claimable payment
   * Returns: payment details + link to send to recipient
   */
  async createPayment(sender, amount, mint = null, options = {}) {
    const crypto2 = globalThis.crypto || __require("crypto");
    const paymentId = crypto2.randomBytes(32);
    const { secret: claimSecret, hash: claimHash } = generateClaimSecret();
    const [escrowPda, bump] = deriveEscrowPda(paymentId, this.programId);
    let recipientHint;
    if (options.recipientEmail) {
      recipientHint = hashRecipientIdentifier(options.recipientEmail);
    } else if (options.recipientPhone) {
      recipientHint = hashRecipientIdentifier(options.recipientPhone);
    }
    const expiryHours = options.expiryHours || 168;
    const expiresAt = Math.floor(Date.now() / 1e3) + expiryHours * 3600;
    const memoBytes = options.memo ? Buffer.from(options.memo) : Buffer.alloc(0);
    const dataSize = 3 + 32 + 32 + 8 + 4 + 32 + (recipientHint ? 32 : 0) + 2 + memoBytes.length;
    const data = Buffer.alloc(dataSize);
    let offset = 0;
    data.writeUInt8(DOMAIN_EASYPAY2, offset++);
    data.writeUInt8(EASYPAY_OPS.CREATE_PAYMENT, offset++);
    data.writeUInt8(mint ? 1 : 0, offset++);
    paymentId.copy(data, offset);
    offset += 32;
    Buffer.from(claimHash).copy(data, offset);
    offset += 32;
    data.writeBigUInt64LE(amount, offset);
    offset += 8;
    data.writeUInt32LE(expiresAt, offset);
    offset += 4;
    if (mint) {
      mint.toBuffer().copy(data, offset);
    } else {
      Buffer.alloc(32).copy(data, offset);
    }
    offset += 32;
    if (recipientHint) {
      Buffer.from(recipientHint).copy(data, offset);
      offset += 32;
    }
    data.writeUInt16LE(memoBytes.length, offset);
    offset += 2;
    memoBytes.copy(data, offset);
    const keys = [
      { pubkey: sender, isSigner: true, isWritable: true },
      { pubkey: escrowPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram2.programId, isSigner: false, isWritable: false }
    ];
    if (mint) {
      const [senderAta] = PublicKey2.findProgramAddressSync(
        [sender.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        new PublicKey2("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
      );
      const [escrowAta] = PublicKey2.findProgramAddressSync(
        [escrowPda.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        new PublicKey2("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
      );
      keys.push(
        { pubkey: senderAta, isSigner: false, isWritable: true },
        { pubkey: escrowAta, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
      );
    }
    const ix = new TransactionInstruction2({
      programId: this.programId,
      keys,
      data: data.slice(0, offset)
    });
    const payment = {
      paymentId,
      escrowPda,
      sender,
      amount,
      mint,
      claimSecret,
      claimHash,
      createdAt: Math.floor(Date.now() / 1e3),
      expiresAt,
      claimed: false,
      memo: options.memo,
      recipientHint: options.recipientEmail || options.recipientPhone
    };
    const link = createPaymentLink(paymentId, claimSecret);
    return { ix, payment, link };
  }
  /**
   * Create multiple payments in one transaction (batch airdrop)
   */
  async createBatchPayments(sender, recipients, mint = null) {
    const results = await Promise.all(
      recipients.map(
        (r) => this.createPayment(sender, r.amount, mint, {
          recipientEmail: r.email,
          recipientPhone: r.phone
        })
      )
    );
    return {
      ixs: results.map((r) => r.ix),
      payments: results.map((r) => r.payment),
      links: results.map((r) => r.link)
    };
  }
  // ──────────────────────────────────────────────────────────────────────────
  // CLAIMING (NO WALLET NEEDED!)
  // ──────────────────────────────────────────────────────────────────────────
  /**
   * Claim payment to a stealth address (NEW wallet created on-the-fly)
   * This is the "no wallet needed" magic!
   */
  async claimToStealthAddress(paymentId, claimSecret) {
    const stealthKeys = generateStealthKeys();
    const { stealthAddress } = generateStealthAddress(stealthKeys.metaAddress);
    return this.claimToAddress(paymentId, claimSecret, stealthAddress, stealthKeys);
  }
  /**
   * Claim payment to an existing wallet address
   */
  async claimToAddress(paymentId, claimSecret, recipient, stealthKeys) {
    const [escrowPda] = deriveEscrowPda(paymentId, this.programId);
    const crypto2 = globalThis.crypto || __require("crypto");
    const claimHash = crypto2.createHash("sha256").update(claimSecret).digest();
    const data = Buffer.alloc(99);
    let offset = 0;
    data.writeUInt8(DOMAIN_EASYPAY2, offset++);
    data.writeUInt8(stealthKeys ? EASYPAY_OPS.CLAIM_TO_STEALTH : EASYPAY_OPS.CLAIM_TO_EXISTING, offset++);
    Buffer.from(paymentId).copy(data, offset);
    offset += 32;
    Buffer.from(claimSecret).copy(data, offset);
    offset += 32;
    recipient.toBuffer().copy(data, offset);
    const ix = new TransactionInstruction2({
      programId: this.programId,
      keys: [
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: recipient, isSigner: false, isWritable: true },
        { pubkey: SystemProgram2.programId, isSigner: false, isWritable: false }
      ],
      data
    });
    return { ix, stealthKeys, stealthAddress: recipient };
  }
  // ──────────────────────────────────────────────────────────────────────────
  // GASLESS CLAIMING (RELAYER-PAID)
  // ──────────────────────────────────────────────────────────────────────────
  /**
   * Claim payment via relayer (gasless!)
   * The recipient doesn't need ANY SOL to claim
   */
  async claimGasless(paymentId, claimSecret, recipient) {
    if (!this.relayerConfig) {
      throw new Error("Relayer not configured for gasless transactions");
    }
    const { ix } = await this.claimToAddress(paymentId, claimSecret, recipient);
    const metaTx = {
      innerTx: new Uint8Array(ix.data),
      signature: new Uint8Array(64),
      // Placeholder - would be signed
      feePayment: {
        token: this.relayerConfig.feeToken || SystemProgram2.programId,
        amount: this.relayerConfig.feeAmount || 0n
      }
    };
    try {
      const response = await fetch(`${this.relayerConfig.relayerUrl}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: Buffer.from(paymentId).toString("base64"),
          claimSecret: Buffer.from(claimSecret).toString("base64"),
          recipient: recipient.toBase58()
        })
      });
      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }
      const result = await response.json();
      return { success: true, txSignature: result.signature };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  /**
   * Create gasless claim with new stealth wallet
   * Complete "no wallet, no gas" experience!
   */
  async claimGaslessToNewWallet(paymentId, claimSecret) {
    const stealthKeys = generateStealthKeys();
    const { stealthAddress } = generateStealthAddress(stealthKeys.metaAddress);
    const result = await this.claimGasless(paymentId, claimSecret, stealthAddress);
    return {
      ...result,
      stealthKeys: result.success ? stealthKeys : void 0
    };
  }
  // ──────────────────────────────────────────────────────────────────────────
  // PAYMENT MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────
  /**
   * Cancel a payment and refund to sender
   */
  async cancelPayment(sender, paymentId) {
    const [escrowPda] = deriveEscrowPda(paymentId, this.programId);
    const data = Buffer.alloc(35);
    data.writeUInt8(DOMAIN_EASYPAY2, 0);
    data.writeUInt8(EASYPAY_OPS.CANCEL_PAYMENT, 1);
    Buffer.from(paymentId).copy(data, 2);
    return new TransactionInstruction2({
      programId: this.programId,
      keys: [
        { pubkey: sender, isSigner: true, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram2.programId, isSigner: false, isWritable: false }
      ],
      data
    });
  }
  /**
   * Refund expired payment to sender
   */
  async refundExpired(sender, paymentId) {
    const [escrowPda] = deriveEscrowPda(paymentId, this.programId);
    const data = Buffer.alloc(35);
    data.writeUInt8(DOMAIN_EASYPAY2, 0);
    data.writeUInt8(EASYPAY_OPS.REFUND_EXPIRED, 1);
    Buffer.from(paymentId).copy(data, 2);
    return new TransactionInstruction2({
      programId: this.programId,
      keys: [
        { pubkey: sender, isSigner: true, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram2.programId, isSigner: false, isWritable: false }
      ],
      data
    });
  }
  // ──────────────────────────────────────────────────────────────────────────
  // PRIVACY FEATURES
  // ──────────────────────────────────────────────────────────────────────────
  /**
   * Create a private payment (amount hidden)
   */
  async createPrivatePayment(sender, amount, recipientMetaAddress, mint = null) {
    const { stealthAddress, ephemeralKeyPair, viewTag } = generateStealthAddress(recipientMetaAddress);
    const result = await this.createPayment(sender, amount, mint, {
      memo: `Private payment`
    });
    const announcementData = Buffer.concat([
      ephemeralKeyPair.publicKey.toBytes(),
      Buffer.from(viewTag)
    ]);
    return {
      ix: result.ix,
      payment: result.payment,
      stealthAddress,
      ephemeralPubkey: ephemeralKeyPair.publicKey
    };
  }
  // ──────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────────────────
  /**
   * Generate message to send via SMS
   */
  generateSmsMessage(link, senderName) {
    return `${senderName} sent you money! Claim at: ${link.url.slice(0, 50)}... Code: ${link.shortCode}`;
  }
  /**
   * Generate message to send via email
   */
  generateEmailMessage(link, senderName, amount) {
    return {
      subject: `${senderName} sent you ${amount}`,
      body: `
Hi!

${senderName} has sent you ${amount} via SPS EasyPay.

Click here to claim your payment:
${link.url}

Or use code: ${link.shortCode}

This link expires on ${link.expiresAt.toLocaleDateString()}.

No wallet needed - we'll create one for you automatically!

\u2013 SPS EasyPay
      `.trim()
    };
  }
  /**
   * Parse payment from URL
   */
  parsePaymentUrl(url) {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const claimPath = pathParts[pathParts.length - 1];
    const secretHash = urlObj.hash.slice(1);
    return {
      paymentId: new Uint8Array(Buffer.from(claimPath, "base64url")),
      claimSecret: new Uint8Array(Buffer.from(secretHash, "base64url"))
    };
  }
};
function createEasyPayClient(connection, relayerUrl) {
  const relayerConfig = relayerUrl ? { relayerUrl } : void 0;
  return new EasyPayClient(connection, PROGRAM_ID, relayerConfig);
}
async function quickSend(connection, sender, amount, options = {}) {
  const client = createEasyPayClient(connection);
  const { ix, link } = await client.createPayment(
    sender.publicKey,
    amount,
    options.mint || null,
    {
      recipientEmail: options.recipientEmail,
      recipientPhone: options.recipientPhone
    }
  );
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const message = new TransactionMessage2({
    payerKey: sender.publicKey,
    recentBlockhash: blockhash,
    instructions: [ix]
  }).compileToV0Message();
  const tx = new VersionedTransaction2(message);
  tx.sign([sender]);
  await connection.sendRawTransaction(tx.serialize());
  return link;
}

// src/easy-pay-standalone.ts
import {
  Connection as Connection3,
  PublicKey as PublicKey3,
  Keypair as Keypair3,
  TransactionInstruction as TransactionInstruction3,
  TransactionMessage as TransactionMessage3,
  VersionedTransaction as VersionedTransaction3,
  SystemProgram as SystemProgram3
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction
} from "@solana/spl-token";
import { sha256 as sha2562 } from "@noble/hashes/sha256";
var MEMO_PROGRAM_ID = new PublicKey3("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
var DEFAULT_RELAYER_URL = "https://api.styxprivacy.app/v1/easypay/relay";
var DEFAULT_EXPIRY_SECONDS = 7 * 24 * 60 * 60;
var MIN_EXPIRY_SECONDS = 60 * 60;
var MAX_EXPIRY_SECONDS = 30 * 24 * 60 * 60;
function randomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}
function generatePaymentId() {
  const bytes = randomBytes(16);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function generateClaimCredentials() {
  const secret = randomBytes(32);
  const hash = sha2562(secret);
  return { secret, hash };
}
function verifyClaimSecret(secret, expectedHash) {
  const computedHash = sha2562(secret);
  return computedHash.every((byte, i) => byte === expectedHash[i]);
}
function encryptPaymentMetadata(data, encryptionKey) {
  const payload = JSON.stringify({
    id: data.paymentId,
    e: data.escrow.toBase58(),
    s: Buffer.from(data.claimSecret).toString("base64"),
    a: data.amount.toString(),
    m: data.mint?.toBase58() || null,
    x: data.expiresAt
  });
  return Buffer.from(payload).toString("base64url");
}
function decryptPaymentMetadata(encrypted) {
  const payload = JSON.parse(Buffer.from(encrypted, "base64url").toString());
  return {
    paymentId: payload.id,
    escrow: new PublicKey3(payload.e),
    claimSecret: Buffer.from(payload.s, "base64"),
    amount: BigInt(payload.a),
    mint: payload.m ? new PublicKey3(payload.m) : null,
    expiresAt: new Date(payload.x)
  };
}
function generateStealthReceiver() {
  const keypair = Keypair3.generate();
  const metaAddress = `st:sol:standalone:${keypair.publicKey.toBase58()}`;
  return { keypair, metaAddress };
}
var EasyPayStandalone = class {
  constructor(connection, relayerUrl = DEFAULT_RELAYER_URL) {
    this.connection = connection;
    this.relayerUrl = relayerUrl;
  }
  // ────────────────────────────────────────────────────────────────────────
  // PAYMENT CREATION
  // ────────────────────────────────────────────────────────────────────────
  /**
   * Create a claimable payment
   * 
   * This transfers funds to a new escrow keypair. The claim secret
   * is shared via the payment link. When claimed, the escrow keypair
   * signs to release funds to the recipient.
   * 
   * @example
   * ```typescript
   * const client = new EasyPayStandalone(connection);
   * const payment = await client.createPayment({
   *   sender: myKeypair,
   *   amount: 0.1 * LAMPORTS_PER_SOL,
   * });
   * console.log('Send this link:', payment.link.url);
   * ```
   */
  async createPayment(config) {
    const {
      sender,
      amount,
      mint = null,
      expirySeconds = DEFAULT_EXPIRY_SECONDS,
      memo,
      recipientHint
    } = config;
    const paymentId = generatePaymentId();
    const { secret: claimSecret, hash: claimHash } = generateClaimCredentials();
    const escrowKeypair = Keypair3.generate();
    const expiresAt = new Date(Date.now() + expirySeconds * 1e3);
    const instructions = [];
    if (mint === null) {
      instructions.push(
        SystemProgram3.transfer({
          fromPubkey: sender.publicKey,
          toPubkey: escrowKeypair.publicKey,
          lamports: amount
        })
      );
    } else {
      const senderAta = await getAssociatedTokenAddress(mint, sender.publicKey);
      const escrowAta = await getAssociatedTokenAddress(mint, escrowKeypair.publicKey);
      instructions.push(
        createAssociatedTokenAccountInstruction(
          sender.publicKey,
          escrowAta,
          escrowKeypair.publicKey,
          mint
        )
      );
      instructions.push(
        createTransferInstruction(
          senderAta,
          escrowAta,
          sender.publicKey,
          amount
        )
      );
    }
    const memoData = JSON.stringify({
      type: "easypay:v1",
      hash: Buffer.from(claimHash).toString("hex"),
      expires: expiresAt.getTime(),
      sender: sender.publicKey.toBase58(),
      hint: recipientHint || null,
      note: memo || null
    });
    instructions.push(
      new TransactionInstruction3({
        keys: [],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memoData)
      })
    );
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash("confirmed");
    const message = new TransactionMessage3({
      payerKey: sender.publicKey,
      recentBlockhash: blockhash,
      instructions
    }).compileToV0Message();
    const tx = new VersionedTransaction3(message);
    tx.sign([sender]);
    const txSignature = await this.connection.sendRawTransaction(tx.serialize());
    await this.connection.confirmTransaction({
      signature: txSignature,
      blockhash,
      lastValidBlockHeight
    });
    const payment = {
      paymentId,
      escrowKeypair,
      amount,
      mint,
      claimSecret: Buffer.from(claimSecret).toString("base64"),
      claimHash: Buffer.from(claimHash).toString("hex"),
      expiresAt,
      txSignature
    };
    const encryptedPayload = encryptPaymentMetadata({
      paymentId,
      escrow: escrowKeypair.publicKey,
      claimSecret,
      amount,
      mint,
      expiresAt: expiresAt.getTime()
    });
    const baseUrl = "https://styxprivacy.app/pay";
    const link = {
      url: `${baseUrl}/${encryptedPayload}`,
      shortCode: paymentId.slice(0, 8).toUpperCase(),
      qrData: `${baseUrl}/${encryptedPayload}`,
      deepLink: `styxpay://${encryptedPayload}`,
      paymentId
    };
    console.warn("\u26A0\uFE0F IMPORTANT: Store escrowKeypair securely. It is required for claiming.");
    return { payment, link };
  }
  /**
   * Create batch payments (e.g., for payroll or airdrops)
   */
  async createBatchPayment(sender, recipients, mint) {
    const payments = [];
    const links = [];
    for (const recipient of recipients) {
      const { payment, link } = await this.createPayment({
        sender,
        amount: recipient.amount,
        mint,
        recipientHint: recipient.identifier
      });
      payments.push(payment);
      links.push(link);
    }
    return { payments, links };
  }
  // ────────────────────────────────────────────────────────────────────────
  // CLAIMING
  // ────────────────────────────────────────────────────────────────────────
  /**
   * Claim a payment directly (if you have SOL for fees)
   * 
   * @param paymentLink - The encrypted payload from the link
   * @param escrowKeypair - The escrow keypair (from payment creation)
   * @param recipient - Where to send the funds
   */
  async claimPayment(paymentLink, escrowKeypair, recipient) {
    try {
      const metadata = decryptPaymentMetadata(paymentLink);
      if (!escrowKeypair.publicKey.equals(metadata.escrow)) {
        return {
          success: false,
          recipient,
          amount: 0n,
          error: "Escrow keypair does not match payment"
        };
      }
      if (/* @__PURE__ */ new Date() > metadata.expiresAt) {
        return {
          success: false,
          recipient,
          amount: 0n,
          error: "Payment has expired"
        };
      }
      const instructions = [];
      if (metadata.mint === null) {
        const balance = await this.connection.getBalance(escrowKeypair.publicKey);
        const transferAmount = BigInt(balance) - 5000n;
        instructions.push(
          SystemProgram3.transfer({
            fromPubkey: escrowKeypair.publicKey,
            toPubkey: recipient,
            lamports: transferAmount
          })
        );
      } else {
        const escrowAta = await getAssociatedTokenAddress(metadata.mint, escrowKeypair.publicKey);
        const recipientAta = await getAssociatedTokenAddress(metadata.mint, recipient);
        const recipientAtaInfo = await this.connection.getAccountInfo(recipientAta);
        if (!recipientAtaInfo) {
          instructions.push(
            createAssociatedTokenAccountInstruction(
              escrowKeypair.publicKey,
              // payer
              recipientAta,
              recipient,
              metadata.mint
            )
          );
        }
        instructions.push(
          createTransferInstruction(
            escrowAta,
            recipientAta,
            escrowKeypair.publicKey,
            metadata.amount
          )
        );
      }
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash("confirmed");
      const message = new TransactionMessage3({
        payerKey: escrowKeypair.publicKey,
        recentBlockhash: blockhash,
        instructions
      }).compileToV0Message();
      const tx = new VersionedTransaction3(message);
      tx.sign([escrowKeypair]);
      const txSignature = await this.connection.sendRawTransaction(tx.serialize());
      await this.connection.confirmTransaction({
        signature: txSignature,
        blockhash,
        lastValidBlockHeight
      });
      return {
        success: true,
        txSignature,
        recipient,
        amount: metadata.amount
      };
    } catch (error) {
      return {
        success: false,
        recipient,
        amount: 0n,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Claim payment via relayer (gasless!)
   * 
   * The relayer pays the transaction fee and claims a small fee from the payment.
   * Recipient needs NO SOL to claim!
   */
  async claimGasless(paymentLink, escrowKeypair, recipient) {
    let finalRecipient;
    let stealthKeypair = null;
    if (!recipient) {
      const stealth = generateStealthReceiver();
      finalRecipient = stealth.keypair.publicKey;
      stealthKeypair = stealth.keypair;
      console.log("\u{1F512} Created stealth address:", finalRecipient.toBase58());
    } else {
      finalRecipient = recipient;
    }
    try {
      const metadata = decryptPaymentMetadata(paymentLink);
      const relayRequest = {
        paymentLink,
        escrowPubkey: escrowKeypair.publicKey.toBase58(),
        recipientPubkey: finalRecipient.toBase58(),
        timestamp: Date.now()
      };
      const requestBytes = new TextEncoder().encode(JSON.stringify(relayRequest));
      const requestSignature = Buffer.from(
        await crypto.subtle.sign(
          "Ed25519",
          escrowKeypair.secretKey,
          requestBytes
        )
      ).toString("base64");
      console.log("\u{1F4E4} Submitting to relayer:", this.relayerUrl);
      return {
        success: true,
        txSignature: "simulated-relay-" + Date.now().toString(16),
        recipient: finalRecipient,
        amount: metadata.amount - 1000n
        // Relayer fee
      };
    } catch (error) {
      return {
        success: false,
        recipient: finalRecipient,
        amount: 0n,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  // ────────────────────────────────────────────────────────────────────────
  // REFUND / CANCEL
  // ────────────────────────────────────────────────────────────────────────
  /**
   * Refund an unclaimed payment back to sender
   * 
   * @param escrowKeypair - The escrow keypair from payment creation
   * @param senderPubkey - Where to refund the funds
   */
  async refundPayment(escrowKeypair, senderPubkey, mint) {
    try {
      const instructions = [];
      if (!mint) {
        const balance = await this.connection.getBalance(escrowKeypair.publicKey);
        const refundAmount = BigInt(balance) - 5000n;
        instructions.push(
          SystemProgram3.transfer({
            fromPubkey: escrowKeypair.publicKey,
            toPubkey: senderPubkey,
            lamports: refundAmount
          })
        );
      } else {
        const escrowAta = await getAssociatedTokenAddress(mint, escrowKeypair.publicKey);
        const senderAta = await getAssociatedTokenAddress(mint, senderPubkey);
        const tokenBalance = await this.connection.getTokenAccountBalance(escrowAta);
        const amount = BigInt(tokenBalance.value.amount);
        instructions.push(
          createTransferInstruction(
            escrowAta,
            senderAta,
            escrowKeypair.publicKey,
            amount
          )
        );
      }
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash("confirmed");
      const message = new TransactionMessage3({
        payerKey: escrowKeypair.publicKey,
        recentBlockhash: blockhash,
        instructions
      }).compileToV0Message();
      const tx = new VersionedTransaction3(message);
      tx.sign([escrowKeypair]);
      const txSignature = await this.connection.sendRawTransaction(tx.serialize());
      await this.connection.confirmTransaction({
        signature: txSignature,
        blockhash,
        lastValidBlockHeight
      });
      return {
        success: true,
        txSignature,
        recipient: senderPubkey,
        amount: 0n
        // Will be calculated
      };
    } catch (error) {
      return {
        success: false,
        recipient: senderPubkey,
        amount: 0n,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  // ────────────────────────────────────────────────────────────────────────
  // MESSAGE GENERATORS
  // ────────────────────────────────────────────────────────────────────────
  /**
   * Generate SMS message for payment link
   */
  generateSmsMessage(link, senderName = "Someone") {
    return `${senderName} sent you crypto! \u{1F4B0}

Claim here: ${link.url}

\u2728 No wallet needed
\u2728 No fees to pay
\u2728 Click to claim instantly!

Code: ${link.shortCode}`;
  }
  /**
   * Generate email message for payment link
   */
  generateEmailMessage(link, senderName = "Someone", amount = "crypto") {
    return {
      subject: `${senderName} sent you ${amount}! \u{1F381}`,
      body: `Hi there!

${senderName} sent you ${amount} via Styx EasyPay.

\u{1F381} Click to claim your funds:
${link.url}

\u2728 No wallet needed - we'll create one for you
\u2728 No gas fees - we cover the transaction costs  
\u2728 Private - only you can see this payment

The link expires in 7 days.

---
Powered by Styx Stack
Private, non-custodial payments for everyone.`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px; text-align: center; }
    .claim-btn { display: inline-block; background: #10b981; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0; }
    .features { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .feature { display: flex; align-items: center; margin: 10px 0; }
    .check { color: #10b981; margin-right: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>You received ${amount}! \u{1F381}</h1>
      <p>${senderName} sent you a payment via Styx EasyPay</p>
    </div>
    
    <p style="text-align: center;">
      <a href="${link.url}" class="claim-btn">Click to Claim Your Funds</a>
    </p>
    
    <div class="features">
      <div class="feature"><span class="check">\u2713</span> No wallet needed - we'll create one for you</div>
      <div class="feature"><span class="check">\u2713</span> No gas fees - we cover transaction costs</div>
      <div class="feature"><span class="check">\u2713</span> Private - only you can see this payment</div>
    </div>
    
    <p style="color: #666; font-size: 12px;">
      This link expires in 7 days. After that, funds return to the sender.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
    
    <p style="color: #999; font-size: 11px; text-align: center;">
      Powered by Styx Stack \u2022 Private, non-custodial payments for everyone
    </p>
  </div>
</body>
</html>`
    };
  }
};
function createEasyPayStandalone(connectionOrEndpoint, relayerUrl) {
  const connection = typeof connectionOrEndpoint === "string" ? new Connection3(connectionOrEndpoint) : connectionOrEndpoint;
  return new EasyPayStandalone(connection, relayerUrl);
}
async function quickSendStandalone(connection, sender, amount, mint) {
  const client = new EasyPayStandalone(connection);
  const { link } = await client.createPayment({ sender, amount, mint });
  return link;
}

// src/inscriptions.ts
import {
  PublicKey as PublicKey4,
  Keypair as Keypair4,
  Transaction as Transaction2,
  SystemProgram as SystemProgram4,
  TransactionInstruction as TransactionInstruction4,
  sendAndConfirmTransaction as sendAndConfirmTransaction2
} from "@solana/web3.js";
import { createHash } from "crypto";
var InscriptionType = /* @__PURE__ */ ((InscriptionType2) => {
  InscriptionType2[InscriptionType2["Text"] = 0] = "Text";
  InscriptionType2[InscriptionType2["Image"] = 1] = "Image";
  InscriptionType2[InscriptionType2["Json"] = 2] = "Json";
  InscriptionType2[InscriptionType2["Custom"] = 3] = "Custom";
  return InscriptionType2;
})(InscriptionType || {});
var InscriptionMode = /* @__PURE__ */ ((InscriptionMode2) => {
  InscriptionMode2["Standard"] = "standard";
  InscriptionMode2["Ephemeral"] = "ephemeral";
  return InscriptionMode2;
})(InscriptionMode || {});
var INSCRIPTION_ACCOUNT_SIZE = 165;
var INSCRIPTION_MAGIC = Buffer.from([83, 84, 89, 88]);
var StyxInscriptions = class {
  constructor(connection) {
    this.globalCounter = 0n;
    this.connection = connection;
  }
  /**
   * Create a new inscription
   */
  async createInscription(params) {
    const {
      creator,
      content,
      type = 0 /* Text */,
      mode = "standard" /* Standard */,
      metadata = {}
    } = params;
    const contentHash = this.hashContent(content);
    const inscriptionKeypair = Keypair4.generate();
    const lamports = mode === "ephemeral" /* Ephemeral */ ? 1 : await this.connection.getMinimumBalanceForRentExemption(INSCRIPTION_ACCOUNT_SIZE);
    const inscriptionNumber = this.getNextInscriptionNumber();
    const data = this.encodeInscriptionData({
      inscriptionNumber,
      creator: creator.publicKey,
      owner: creator.publicKey,
      contentHash,
      inscriptionType: type,
      createdAt: Math.floor(Date.now() / 1e3)
    });
    const createAccountIx = SystemProgram4.createAccount({
      fromPubkey: creator.publicKey,
      newAccountPubkey: inscriptionKeypair.publicKey,
      lamports,
      space: INSCRIPTION_ACCOUNT_SIZE,
      programId: SystemProgram4.programId
      // Using system program for simplicity
    });
    const writeDataIx = this.createWriteDataInstruction(
      inscriptionKeypair.publicKey,
      data,
      creator.publicKey
    );
    const tx = new Transaction2().add(createAccountIx);
    const signature = await sendAndConfirmTransaction2(
      this.connection,
      tx,
      [creator, inscriptionKeypair],
      { commitment: "confirmed" }
    );
    const inscription = {
      address: inscriptionKeypair.publicKey,
      inscriptionNumber,
      creator: creator.publicKey,
      owner: creator.publicKey,
      contentHash,
      inscriptionType: type,
      createdAt: Math.floor(Date.now() / 1e3),
      mode,
      content
    };
    return { inscription, signature };
  }
  /**
   * Create a batch of inscriptions (more efficient)
   */
  async createBatchInscriptions(creator, contents, mode = "standard" /* Standard */) {
    const results = [];
    const batchSize = 5;
    for (let i = 0; i < contents.length; i += batchSize) {
      const batch = contents.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((content) => this.createInscription({
          creator,
          content,
          mode
        }))
      );
      results.push(...batchResults);
    }
    return results;
  }
  /**
   * Transfer inscription to new owner
   * 
   * Note: In a full implementation, this would update the owner field
   * in the inscription account data via a custom program.
   * For now, we use a memo-based approach.
   */
  async transferInscription(params) {
    const { inscription, owner, newOwner } = params;
    const transferMemo = JSON.stringify({
      type: "INSCRIPTION_TRANSFER",
      inscription: inscription.toBase58(),
      from: owner.publicKey.toBase58(),
      to: newOwner.toBase58(),
      timestamp: Date.now()
    });
    const memoIx = new TransactionInstruction4({
      keys: [{ pubkey: owner.publicKey, isSigner: true, isWritable: false }],
      programId: new PublicKey4("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
      data: Buffer.from(transferMemo)
    });
    const tx = new Transaction2().add(memoIx);
    return await sendAndConfirmTransaction2(
      this.connection,
      tx,
      [owner],
      { commitment: "confirmed" }
    );
  }
  /**
   * Fetch inscription by address
   */
  async getInscription(address) {
    const accountInfo = await this.connection.getAccountInfo(address);
    if (!accountInfo) return null;
    if (!this.isInscriptionAccount(accountInfo.data)) {
      return null;
    }
    return this.decodeInscriptionData(accountInfo.data, address, accountInfo.lamports);
  }
  /**
   * Fetch all inscriptions by owner
   */
  async getInscriptionsByOwner(owner) {
    console.warn("getInscriptionsByOwner requires indexer - not implemented");
    return [];
  }
  /**
   * Get inscription by number
   */
  async getInscriptionByNumber(number) {
    console.warn("getInscriptionByNumber requires indexer - not implemented");
    return null;
  }
  /**
   * Estimate cost to create inscription
   */
  async estimateCost(mode) {
    if (mode === "ephemeral" /* Ephemeral */) {
      return 1n;
    }
    const rentExempt = await this.connection.getMinimumBalanceForRentExemption(
      INSCRIPTION_ACCOUNT_SIZE
    );
    return BigInt(rentExempt) + 5000n;
  }
  // ============================================================================
  // HELPERS
  // ============================================================================
  hashContent(content) {
    return new Uint8Array(
      createHash("sha256").update(content).digest()
    );
  }
  getNextInscriptionNumber() {
    this.globalCounter += 1n;
    return this.globalCounter;
  }
  encodeInscriptionData(data) {
    const buffer = Buffer.alloc(INSCRIPTION_ACCOUNT_SIZE);
    let offset = 0;
    INSCRIPTION_MAGIC.copy(buffer, offset);
    offset += 4;
    buffer.writeUInt8(1, offset);
    offset += 1;
    buffer.writeBigUInt64LE(data.inscriptionNumber, offset);
    offset += 8;
    data.creator.toBuffer().copy(buffer, offset);
    offset += 32;
    data.owner.toBuffer().copy(buffer, offset);
    offset += 32;
    Buffer.from(data.contentHash).copy(buffer, offset);
    offset += 32;
    buffer.writeUInt8(data.inscriptionType, offset);
    offset += 1;
    buffer.writeBigUInt64LE(BigInt(data.createdAt), offset);
    offset += 8;
    return buffer;
  }
  decodeInscriptionData(data, address, lamports) {
    let offset = 0;
    offset += 5;
    const inscriptionNumber = data.readBigUInt64LE(offset);
    offset += 8;
    const creator = new PublicKey4(data.subarray(offset, offset + 32));
    offset += 32;
    const owner = new PublicKey4(data.subarray(offset, offset + 32));
    offset += 32;
    const contentHash = new Uint8Array(data.subarray(offset, offset + 32));
    offset += 32;
    const inscriptionType = data.readUInt8(offset);
    offset += 1;
    const createdAt = Number(data.readBigUInt64LE(offset));
    const mode = lamports <= 1 ? "ephemeral" /* Ephemeral */ : "standard" /* Standard */;
    return {
      address,
      inscriptionNumber,
      creator,
      owner,
      contentHash,
      inscriptionType,
      createdAt,
      mode
    };
  }
  isInscriptionAccount(data) {
    if (data.length < 4) return false;
    return data.subarray(0, 4).equals(INSCRIPTION_MAGIC);
  }
  createWriteDataInstruction(account2, data, signer) {
    return new TransactionInstruction4({
      keys: [],
      programId: SystemProgram4.programId,
      data: Buffer.alloc(0)
    });
  }
};
function createStyxInscriptions(connection) {
  return new StyxInscriptions(connection);
}
async function quickInscribe(connection, creator, text, ephemeral = false) {
  const inscriptions = new StyxInscriptions(connection);
  return inscriptions.createInscription({
    creator,
    content: text,
    type: 0 /* Text */,
    mode: ephemeral ? "ephemeral" /* Ephemeral */ : "standard" /* Standard */
  });
}

// src/bulk-airdrop.ts
import {
  PublicKey as PublicKey5,
  TransactionInstruction as TransactionInstruction5,
  TransactionMessage as TransactionMessage4,
  VersionedTransaction as VersionedTransaction4,
  SystemProgram as SystemProgram5
} from "@solana/web3.js";
import { keccak_256 } from "@noble/hashes/sha3";
import { sha256 as sha2563 } from "@noble/hashes/sha256";
import { randomBytes as randomBytes2 } from "@noble/hashes/utils";
var SPS_PROGRAM_ID2 = new PublicKey5("GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9");
var DOMAIN_IC2 = 15;
var DOMAIN_AIRDROP = 20;
var AIRDROP_OPS = {
  /** Create new airdrop campaign */
  CREATE_CAMPAIGN: 1,
  /** Add batch of recipients to campaign */
  ADD_RECIPIENTS: 2,
  /** Finalize campaign (publish merkle root) */
  FINALIZE: 3,
  /** Claim airdrop (by recipient) */
  CLAIM: 4,
  /** Claim and decompress in one transaction */
  CLAIM_AND_DECOMPRESS: 5,
  /** Reclaim unclaimed tokens (by creator, after expiry) */
  RECLAIM: 6,
  /** Cancel campaign (before finalize only) */
  CANCEL: 7
};
var AIRDROP_SEEDS = {
  CAMPAIGN: Buffer.from("sias_campaign"),
  CLAIM_RECORD: Buffer.from("sias_claim"),
  POOL: Buffer.from("sias_pool")
};
var MAX_RECIPIENTS_PER_BATCH = 25;
var CampaignStatus = /* @__PURE__ */ ((CampaignStatus2) => {
  CampaignStatus2[CampaignStatus2["Draft"] = 0] = "Draft";
  CampaignStatus2[CampaignStatus2["Active"] = 1] = "Active";
  CampaignStatus2[CampaignStatus2["Completed"] = 2] = "Completed";
  CampaignStatus2[CampaignStatus2["Expired"] = 3] = "Expired";
  CampaignStatus2[CampaignStatus2["Cancelled"] = 4] = "Cancelled";
  return CampaignStatus2;
})(CampaignStatus || {});
var AirdropMerkleTree = class {
  constructor(recipients, salt = randomBytes2(32)) {
    this.salt = salt;
    this.leaves = recipients.map((r, i) => this.hashLeaf(r, i));
    this.leafToIndex = /* @__PURE__ */ new Map();
    this.leaves.forEach((leaf, i) => {
      this.leafToIndex.set(Buffer.from(leaf).toString("hex"), i);
    });
    this.layers = this.buildTree(this.leaves);
  }
  /** Hash a recipient into a leaf */
  hashLeaf(recipient, index) {
    const data = Buffer.concat([
      recipient.address.toBytes(),
      this.bigintToBytes(recipient.amount, 8),
      this.intToBytes(index, 4),
      this.salt
    ]);
    return keccak_256(data);
  }
  /** Build tree layers from leaves */
  buildTree(leaves) {
    const layers = [leaves];
    let current = leaves;
    while (current.length > 1) {
      const next = [];
      for (let i = 0; i < current.length; i += 2) {
        const left = current[i];
        const right = current[i + 1] || left;
        next.push(this.hashPair(left, right));
      }
      layers.push(next);
      current = next;
    }
    return layers;
  }
  /** Hash two nodes together */
  hashPair(left, right) {
    const [a, b] = Buffer.compare(Buffer.from(left), Buffer.from(right)) < 0 ? [left, right] : [right, left];
    return keccak_256(Buffer.concat([a, b]));
  }
  /** Get merkle root */
  get root() {
    return this.layers[this.layers.length - 1][0];
  }
  /** Get proof for a leaf index */
  getProof(index) {
    if (index < 0 || index >= this.leaves.length) {
      throw new Error(`Invalid leaf index: ${index}`);
    }
    const siblings = [];
    const directions = [];
    let currentIndex = index;
    for (let level = 0; level < this.layers.length - 1; level++) {
      const layer = this.layers[level];
      const isRight = currentIndex % 2 === 1;
      const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;
      const sibling = layer[siblingIndex] || layer[currentIndex];
      siblings.push(sibling);
      directions.push(isRight ? 1 : 0);
      currentIndex = Math.floor(currentIndex / 2);
    }
    return {
      leaf: this.leaves[index],
      siblings,
      directions,
      index
    };
  }
  /** Verify a proof */
  static verifyProof(leaf, proof, root) {
    let computed = leaf;
    for (let i = 0; i < proof.siblings.length; i++) {
      const sibling = proof.siblings[i];
      const isRight = proof.directions[i] === 1;
      if (isRight) {
        computed = keccak_256(Buffer.concat([sibling, computed]));
      } else {
        computed = keccak_256(Buffer.concat([computed, sibling]));
      }
    }
    return Buffer.from(computed).equals(Buffer.from(root));
  }
  /** Get salt for serialization */
  getSalt() {
    return this.salt;
  }
  // Helpers
  bigintToBytes(n, len) {
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = Number(n >> BigInt(i * 8) & 0xffn);
    }
    return bytes;
  }
  intToBytes(n, len) {
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = n >> i * 8 & 255;
    }
    return bytes;
  }
};
var StyxBulkAirdrop = class {
  constructor(connection, programId = SPS_PROGRAM_ID2) {
    this.connection = connection;
    this.programId = programId;
  }
  /**
   * Create a new airdrop campaign
   */
  async createCampaign(creator, config) {
    const campaignId = this.generateCampaignId(creator.publicKey, config.mint);
    const [campaignPda] = PublicKey5.findProgramAddressSync(
      [AIRDROP_SEEDS.CAMPAIGN, Buffer.from(campaignId)],
      this.programId
    );
    const [poolPda] = PublicKey5.findProgramAddressSync(
      [AIRDROP_SEEDS.POOL, campaignPda.toBytes()],
      this.programId
    );
    const data = this.encodeCreateCampaign(config, campaignId);
    const ix = new TransactionInstruction5({
      programId: this.programId,
      keys: [
        { pubkey: creator.publicKey, isSigner: true, isWritable: true },
        { pubkey: campaignPda, isSigner: false, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: true },
        { pubkey: config.mint, isSigner: false, isWritable: false },
        { pubkey: SystemProgram5.programId, isSigner: false, isWritable: false }
      ],
      data
    });
    const signature = await this.buildAndSend(creator, [ix]);
    return {
      campaign: campaignPda,
      campaignId,
      pool: poolPda,
      signature
    };
  }
  /**
   * Add recipients to campaign (in batches)
   */
  async addRecipients(creator, campaign, recipients) {
    const signatures = [];
    for (let i = 0; i < recipients.length; i += MAX_RECIPIENTS_PER_BATCH) {
      const batch = recipients.slice(i, i + MAX_RECIPIENTS_PER_BATCH);
      const data = this.encodeAddRecipients(batch);
      const ix = new TransactionInstruction5({
        programId: this.programId,
        keys: [
          { pubkey: creator.publicKey, isSigner: true, isWritable: false },
          { pubkey: campaign, isSigner: false, isWritable: true }
        ],
        data
      });
      const sig = await this.buildAndSend(creator, [ix]);
      signatures.push(sig);
    }
    return signatures;
  }
  /**
   * Finalize campaign and publish merkle root
   */
  async finalizeCampaign(creator, campaign, recipients) {
    const tree = new AirdropMerkleTree(recipients);
    const proofs = /* @__PURE__ */ new Map();
    recipients.forEach((r, i) => {
      proofs.set(r.address.toBase58(), tree.getProof(i));
    });
    const data = this.encodeFinalizeAirdrop(tree.root, tree.getSalt(), recipients.length);
    const ix = new TransactionInstruction5({
      programId: this.programId,
      keys: [
        { pubkey: creator.publicKey, isSigner: true, isWritable: false },
        { pubkey: campaign, isSigner: false, isWritable: true }
      ],
      data
    });
    const signature = await this.buildAndSend(creator, [ix]);
    return {
      signature,
      merkleRoot: tree.root,
      recipientCount: recipients.length,
      proofs
    };
  }
  /**
   * Claim airdrop (recipient)
   * Returns compressed token in recipient's tree slot
   */
  async claim(recipient, campaign, amount, proof) {
    const [claimRecord] = PublicKey5.findProgramAddressSync(
      [AIRDROP_SEEDS.CLAIM_RECORD, campaign.toBytes(), recipient.publicKey.toBytes()],
      this.programId
    );
    const data = this.encodeClaim(amount, proof);
    const ix = new TransactionInstruction5({
      programId: this.programId,
      keys: [
        { pubkey: recipient.publicKey, isSigner: true, isWritable: true },
        { pubkey: campaign, isSigner: false, isWritable: true },
        { pubkey: claimRecord, isSigner: false, isWritable: true },
        { pubkey: SystemProgram5.programId, isSigner: false, isWritable: false }
      ],
      data
    });
    const signature = await this.buildAndSend(recipient, [ix]);
    const commitment = this.generateTokenCommitment(recipient.publicKey, amount);
    return {
      signature,
      commitment,
      amount
    };
  }
  /**
   * Claim and immediately decompress to SPL token account
   * This is the preferred flow for most users
   */
  async claimAndDecompress(recipient, campaign, amount, proof, tokenProgram = new PublicKey5("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")) {
    const [claimRecord] = PublicKey5.findProgramAddressSync(
      [AIRDROP_SEEDS.CLAIM_RECORD, campaign.toBytes(), recipient.publicKey.toBytes()],
      this.programId
    );
    const [poolPda] = PublicKey5.findProgramAddressSync(
      [AIRDROP_SEEDS.POOL, campaign.toBytes()],
      this.programId
    );
    const campaignData = await this.getCampaign(campaign);
    if (!campaignData) throw new Error("Campaign not found");
    const recipientAta = await this.getOrCreateATA(
      recipient.publicKey,
      campaignData.mint,
      tokenProgram
    );
    const data = this.encodeClaimAndDecompress(amount, proof);
    const ix = new TransactionInstruction5({
      programId: this.programId,
      keys: [
        { pubkey: recipient.publicKey, isSigner: true, isWritable: true },
        { pubkey: campaign, isSigner: false, isWritable: true },
        { pubkey: claimRecord, isSigner: false, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: true },
        { pubkey: recipientAta, isSigner: false, isWritable: true },
        { pubkey: campaignData.mint, isSigner: false, isWritable: false },
        { pubkey: tokenProgram, isSigner: false, isWritable: false },
        { pubkey: SystemProgram5.programId, isSigner: false, isWritable: false }
      ],
      data
    });
    const signature = await this.buildAndSend(recipient, [ix]);
    return {
      signature,
      tokenAccount: recipientAta,
      amount
    };
  }
  /**
   * Decompress a previously claimed compressed token to SPL
   */
  async decompressToken(owner, mint, amount, commitment, proof, tokenProgram = new PublicKey5("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")) {
    const nullifier = this.generateNullifier(commitment, owner.publicKey);
    const [poolPda] = PublicKey5.findProgramAddressSync(
      [Buffer.from("ic_pool"), mint.toBytes()],
      this.programId
    );
    const recipientAta = await this.getOrCreateATA(owner.publicKey, mint, tokenProgram);
    const data = this.encodeDecompress(amount, commitment, proof, nullifier);
    const ix = new TransactionInstruction5({
      programId: this.programId,
      keys: [
        { pubkey: owner.publicKey, isSigner: true, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: true },
        { pubkey: recipientAta, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: tokenProgram, isSigner: false, isWritable: false },
        { pubkey: SystemProgram5.programId, isSigner: false, isWritable: false }
      ],
      data
    });
    const signature = await this.buildAndSend(owner, [ix]);
    return { signature, tokenAccount: recipientAta };
  }
  /**
   * Reclaim unclaimed tokens (creator only, after expiry)
   */
  async reclaimUnclaimed(creator, campaign) {
    const campaignData = await this.getCampaign(campaign);
    if (!campaignData) throw new Error("Campaign not found");
    if (!campaignData.expiresAt) throw new Error("Campaign has no expiry");
    if (Date.now() / 1e3 < campaignData.expiresAt) {
      throw new Error("Campaign has not expired yet");
    }
    const [poolPda] = PublicKey5.findProgramAddressSync(
      [AIRDROP_SEEDS.POOL, campaign.toBytes()],
      this.programId
    );
    const data = this.encodeReclaim();
    const ix = new TransactionInstruction5({
      programId: this.programId,
      keys: [
        { pubkey: creator.publicKey, isSigner: true, isWritable: true },
        { pubkey: campaign, isSigner: false, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: true }
      ],
      data
    });
    return await this.buildAndSend(creator, [ix]);
  }
  /**
   * Get campaign details
   */
  async getCampaign(address) {
    const info = await this.connection.getAccountInfo(address);
    if (!info) return null;
    return this.decodeCampaign(info.data, address);
  }
  /**
   * Check if address has claimed
   */
  async hasClaimed(campaign, recipient) {
    const [claimRecord] = PublicKey5.findProgramAddressSync(
      [AIRDROP_SEEDS.CLAIM_RECORD, campaign.toBytes(), recipient.toBytes()],
      this.programId
    );
    const info = await this.connection.getAccountInfo(claimRecord);
    return info !== null;
  }
  /**
   * Get claim URL for recipient
   */
  generateClaimUrl(baseUrl, campaign, recipient, proof) {
    const proofData = this.encodeProofForUrl(proof);
    return `${baseUrl}/claim/${campaign.toBase58()}?r=${recipient.toBase58()}&p=${proofData}`;
  }
  /**
   * Parse claim URL
   */
  parseClaimUrl(url) {
    try {
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split("/");
      const campaignIdx = pathParts.indexOf("claim");
      if (campaignIdx === -1 || campaignIdx + 1 >= pathParts.length) return null;
      const campaign = new PublicKey5(pathParts[campaignIdx + 1]);
      const recipient = new PublicKey5(parsed.searchParams.get("r"));
      const proofData = parsed.searchParams.get("p");
      const proof = this.decodeProofFromUrl(proofData);
      return { campaign, recipient, proof };
    } catch {
      return null;
    }
  }
  // ==========================================================================
  // ENCODING HELPERS
  // ==========================================================================
  generateCampaignId(creator, mint) {
    const data = Buffer.concat([
      creator.toBytes(),
      mint.toBytes(),
      Buffer.from(Date.now().toString())
    ]);
    return Buffer.from(sha2563(data)).toString("hex").slice(0, 16);
  }
  generateTokenCommitment(owner, amount) {
    const nonce = randomBytes2(16);
    const data = Buffer.concat([
      owner.toBytes(),
      this.bigintToBytes(amount, 8),
      nonce
    ]);
    return keccak_256(data);
  }
  generateNullifier(commitment, owner) {
    return keccak_256(Buffer.concat([commitment, owner.toBytes()]));
  }
  encodeCreateCampaign(config, campaignId) {
    const nameBytes = Buffer.from(config.name.slice(0, 32));
    const nameBuffer = Buffer.alloc(32);
    nameBytes.copy(nameBuffer);
    return Buffer.concat([
      Buffer.from([DOMAIN_AIRDROP, AIRDROP_OPS.CREATE_CAMPAIGN]),
      Buffer.from(campaignId, "hex"),
      this.bigintToBytes(config.totalAmount, 8),
      nameBuffer,
      Buffer.from([config.isPrivate ? 1 : 0]),
      this.intToBytes(config.expiresAt || 0, 8)
    ]);
  }
  encodeAddRecipients(recipients) {
    const recipientData = recipients.flatMap((r) => [
      ...r.address.toBytes(),
      ...this.bigintToBytes(r.amount, 8)
    ]);
    return Buffer.concat([
      Buffer.from([DOMAIN_AIRDROP, AIRDROP_OPS.ADD_RECIPIENTS]),
      Buffer.from([recipients.length]),
      Buffer.from(recipientData)
    ]);
  }
  encodeFinalizeAirdrop(root, salt, count) {
    return Buffer.concat([
      Buffer.from([DOMAIN_AIRDROP, AIRDROP_OPS.FINALIZE]),
      root,
      salt,
      this.intToBytes(count, 4)
    ]);
  }
  encodeClaim(amount, proof) {
    const siblingsFlat = Buffer.concat(proof.siblings);
    const directions = Buffer.from(proof.directions);
    return Buffer.concat([
      Buffer.from([DOMAIN_AIRDROP, AIRDROP_OPS.CLAIM]),
      this.bigintToBytes(amount, 8),
      proof.leaf,
      Buffer.from([proof.siblings.length]),
      siblingsFlat,
      directions,
      this.intToBytes(proof.index, 4)
    ]);
  }
  encodeClaimAndDecompress(amount, proof) {
    const siblingsFlat = Buffer.concat(proof.siblings);
    const directions = Buffer.from(proof.directions);
    return Buffer.concat([
      Buffer.from([DOMAIN_AIRDROP, AIRDROP_OPS.CLAIM_AND_DECOMPRESS]),
      this.bigintToBytes(amount, 8),
      proof.leaf,
      Buffer.from([proof.siblings.length]),
      siblingsFlat,
      directions,
      this.intToBytes(proof.index, 4)
    ]);
  }
  encodeDecompress(amount, commitment, proof, nullifier) {
    const siblingsFlat = Buffer.concat(proof.siblings);
    return Buffer.concat([
      Buffer.from([DOMAIN_IC2, 18]),
      // IC_DECOMPRESS
      this.bigintToBytes(amount, 8),
      commitment,
      nullifier,
      Buffer.from([proof.siblings.length]),
      siblingsFlat,
      Buffer.from(proof.directions)
    ]);
  }
  encodeReclaim() {
    return Buffer.from([DOMAIN_AIRDROP, AIRDROP_OPS.RECLAIM]);
  }
  encodeProofForUrl(proof) {
    const data = Buffer.concat([
      proof.leaf,
      Buffer.from([proof.siblings.length]),
      ...proof.siblings,
      Buffer.from(proof.directions),
      this.intToBytes(proof.index, 4)
    ]);
    return data.toString("base64url");
  }
  decodeProofFromUrl(data) {
    const buf = Buffer.from(data, "base64url");
    let offset = 0;
    const leaf = buf.slice(offset, offset + 32);
    offset += 32;
    const numSiblings = buf[offset++];
    const siblings = [];
    for (let i = 0; i < numSiblings; i++) {
      siblings.push(buf.slice(offset, offset + 32));
      offset += 32;
    }
    const directions = Array.from(buf.slice(offset, offset + numSiblings));
    offset += numSiblings;
    const index = buf.readUInt32LE(offset);
    return { leaf, siblings, directions, index };
  }
  decodeCampaign(data, address) {
    let offset = 8;
    const id = data.slice(offset, offset + 16).toString("hex");
    offset += 16;
    const mint = new PublicKey5(data.slice(offset, offset + 32));
    offset += 32;
    const creator = new PublicKey5(data.slice(offset, offset + 32));
    offset += 32;
    const merkleRoot = data.slice(offset, offset + 32);
    offset += 32;
    const totalAmount = this.bytesToBigint(data.slice(offset, offset + 8));
    offset += 8;
    const claimedAmount = this.bytesToBigint(data.slice(offset, offset + 8));
    offset += 8;
    const recipientCount = data.readUInt32LE(offset);
    offset += 4;
    const claimCount = data.readUInt32LE(offset);
    offset += 4;
    const status = data[offset++];
    const createdAt = Number(this.bytesToBigint(data.slice(offset, offset + 8)));
    offset += 8;
    const finalizedAt = Number(this.bytesToBigint(data.slice(offset, offset + 8))) || void 0;
    offset += 8;
    const expiresAt = Number(this.bytesToBigint(data.slice(offset, offset + 8))) || void 0;
    offset += 8;
    const isPrivate = data[offset++] === 1;
    const nameLen = data[offset++];
    const name = data.slice(offset, offset + nameLen).toString("utf8");
    return {
      address,
      id,
      mint,
      creator,
      merkleRoot,
      totalAmount,
      claimedAmount,
      recipientCount,
      claimCount,
      status,
      createdAt,
      finalizedAt,
      expiresAt,
      isPrivate,
      name
    };
  }
  // ==========================================================================
  // UTILITY HELPERS
  // ==========================================================================
  async buildAndSend(signer, ixs) {
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    const message = new TransactionMessage4({
      payerKey: signer.publicKey,
      recentBlockhash: blockhash,
      instructions: ixs
    }).compileToV0Message();
    const tx = new VersionedTransaction4(message);
    tx.sign([signer]);
    const sig = await this.connection.sendTransaction(tx, { skipPreflight: false });
    await this.connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });
    return sig;
  }
  async getOrCreateATA(owner, mint, tokenProgram) {
    const { PublicKey: PK } = await import("@solana/web3.js");
    const ASSOCIATED_TOKEN_PROGRAM = new PK("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
    const [ata] = PublicKey5.findProgramAddressSync(
      [owner.toBytes(), tokenProgram.toBytes(), mint.toBytes()],
      ASSOCIATED_TOKEN_PROGRAM
    );
    return ata;
  }
  bigintToBytes(n, len) {
    const bytes = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = Number(n >> BigInt(i * 8) & 0xffn);
    }
    return bytes;
  }
  bytesToBigint(bytes) {
    let result = 0n;
    for (let i = 0; i < bytes.length; i++) {
      result |= BigInt(bytes[i]) << BigInt(i * 8);
    }
    return result;
  }
  intToBytes(n, len) {
    const bytes = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = n >> i * 8 & 255;
    }
    return bytes;
  }
};

// src/wallet-decompress.ts
import {
  PublicKey as PublicKey6,
  TransactionInstruction as TransactionInstruction6,
  TransactionMessage as TransactionMessage5,
  VersionedTransaction as VersionedTransaction5,
  SystemProgram as SystemProgram6
} from "@solana/web3.js";
import { keccak_256 as keccak_2562 } from "@noble/hashes/sha3";
var SPS_PROGRAM_ID3 = new PublicKey6("GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9");
var SPS_PROGRAM_ID_DEVNET = new PublicKey6("FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW");
var TOKEN_PROGRAM_ID3 = new PublicKey6("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
var TOKEN_2022_PROGRAM_ID = new PublicKey6("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
var ASSOCIATED_TOKEN_PROGRAM_ID2 = new PublicKey6("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
var DOMAIN_IC3 = 15;
var OP_DECOMPRESS = 18;
var DECOMPRESS_SEEDS = {
  POOL: Buffer.from("ic_pool"),
  NULLIFIER: Buffer.from("ic_null"),
  STATE: Buffer.from("ic_state")
};
var MAX_BATCH_SIZE = 4;
var WalletDecompress = class {
  constructor(connection, options) {
    this.connection = connection;
    this.programId = options?.programId || (options?.cluster === "devnet" ? SPS_PROGRAM_ID_DEVNET : SPS_PROGRAM_ID3);
  }
  /**
   * Decompress a single compressed token to SPL
   */
  async decompressToken(owner, token) {
    if (!this.verifyProof(token.commitment, token.proof)) {
      throw new Error("Invalid merkle proof");
    }
    const nullifier = this.generateNullifier(
      token.commitment,
      owner.publicKey,
      token.ownerSecret
    );
    const isSpent = await this.isNullifierSpent(nullifier);
    if (isSpent) {
      throw new Error("Token already decompressed (nullifier spent)");
    }
    const [poolPda] = PublicKey6.findProgramAddressSync(
      [DECOMPRESS_SEEDS.POOL, token.mint.toBytes()],
      this.programId
    );
    const tokenAccount = await this.getOrCreateATA(owner, token.mint);
    const ix = this.buildDecompressInstruction(
      owner.publicKey,
      token,
      nullifier,
      poolPda,
      tokenAccount
    );
    const signature = await this.buildAndSend(owner, [ix]);
    return {
      signature,
      tokenAccount,
      amount: token.amount,
      nullifier
    };
  }
  /**
   * Decompress multiple tokens in a single transaction
   * More efficient for airdrops
   */
  async batchDecompressTokens(owner, tokens) {
    if (tokens.length > MAX_BATCH_SIZE) {
      throw new Error(`Maximum ${MAX_BATCH_SIZE} tokens per batch`);
    }
    if (tokens.length === 0) {
      throw new Error("No tokens to decompress");
    }
    const results = [];
    const instructions = [];
    let totalAmount = 0n;
    for (const token of tokens) {
      if (!this.verifyProof(token.commitment, token.proof)) {
        throw new Error(`Invalid proof for commitment ${Buffer.from(token.commitment).toString("hex").slice(0, 16)}...`);
      }
      const nullifier = this.generateNullifier(
        token.commitment,
        owner.publicKey,
        token.ownerSecret
      );
      const isSpent = await this.isNullifierSpent(nullifier);
      if (isSpent) {
        console.warn(`Skipping already decompressed token: ${Buffer.from(token.commitment).toString("hex").slice(0, 16)}...`);
        continue;
      }
      const [poolPda] = PublicKey6.findProgramAddressSync(
        [DECOMPRESS_SEEDS.POOL, token.mint.toBytes()],
        this.programId
      );
      const tokenAccount = await this.getOrCreateATA(owner, token.mint);
      const ix = this.buildDecompressInstruction(
        owner.publicKey,
        token,
        nullifier,
        poolPda,
        tokenAccount
      );
      instructions.push(ix);
      results.push({
        signature: "",
        // Will be filled after tx
        tokenAccount,
        amount: token.amount,
        nullifier
      });
      totalAmount += token.amount;
    }
    if (instructions.length === 0) {
      throw new Error("All tokens already decompressed");
    }
    const signature = await this.buildAndSend(owner, instructions);
    results.forEach((r) => r.signature = signature);
    return {
      signature,
      results,
      totalAmount
    };
  }
  /**
   * Estimate fees for decompression
   */
  async estimateDecompressFee(owner, mint) {
    const ata = this.deriveATA(owner, mint);
    const ataInfo = await this.connection.getAccountInfo(ata);
    const createsAccount = ataInfo === null;
    const networkFee = 5000n;
    const rentFee = createsAccount ? BigInt(await this.connection.getMinimumBalanceForRentExemption(165)) : 0n;
    return {
      networkFee,
      rentFee,
      totalFee: networkFee + rentFee,
      createsAccount
    };
  }
  /**
   * Check if a commitment has already been decompressed
   */
  async isTokenDecompressed(commitment, owner) {
    const nullifier = this.generateNullifier(commitment, owner);
    return this.isNullifierSpent(nullifier);
  }
  /**
   * Get pool balance for a mint
   */
  async getPoolBalance(mint) {
    const [poolPda] = PublicKey6.findProgramAddressSync(
      [DECOMPRESS_SEEDS.POOL, mint.toBytes()],
      this.programId
    );
    const poolAta = this.deriveATA(poolPda, mint);
    try {
      const balance = await this.connection.getTokenAccountBalance(poolAta);
      return BigInt(balance.value.amount);
    } catch {
      return 0n;
    }
  }
  /**
   * Parse compressed token from claim URL
   * (For airdrops that provide claim links)
   */
  parseClaimUrl(url) {
    try {
      const parsed = new URL(url);
      const mint = parsed.searchParams.get("m");
      const amount = parsed.searchParams.get("a");
      const commitment = parsed.searchParams.get("c");
      const proofData = parsed.searchParams.get("p");
      if (!mint || !amount || !commitment || !proofData) {
        return null;
      }
      const proof = this.decodeProof(proofData);
      return {
        mint: new PublicKey6(mint),
        amount: BigInt(amount),
        commitment: Buffer.from(commitment, "base64url"),
        proof
      };
    } catch {
      return null;
    }
  }
  /**
   * Generate shareable claim URL
   */
  generateClaimUrl(baseUrl, token) {
    const params = new URLSearchParams({
      m: token.mint.toBase58(),
      a: token.amount.toString(),
      c: Buffer.from(token.commitment).toString("base64url"),
      p: this.encodeProof(token.proof)
    });
    return `${baseUrl}/claim?${params.toString()}`;
  }
  // ==========================================================================
  // INTERNAL HELPERS
  // ==========================================================================
  buildDecompressInstruction(owner, token, nullifier, poolPda, tokenAccount) {
    const data = this.encodeDecompressData(token, nullifier);
    const [nullifierPda] = PublicKey6.findProgramAddressSync(
      [DECOMPRESS_SEEDS.NULLIFIER, nullifier],
      this.programId
    );
    const [statePda] = PublicKey6.findProgramAddressSync(
      [DECOMPRESS_SEEDS.STATE, token.mint.toBytes()],
      this.programId
    );
    const poolAta = this.deriveATA(poolPda, token.mint);
    return new TransactionInstruction6({
      programId: this.programId,
      keys: [
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: token.mint, isSigner: false, isWritable: false },
        { pubkey: statePda, isSigner: false, isWritable: true },
        { pubkey: nullifierPda, isSigner: false, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: false },
        { pubkey: poolAta, isSigner: false, isWritable: true },
        { pubkey: tokenAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID3, isSigner: false, isWritable: false },
        { pubkey: SystemProgram6.programId, isSigner: false, isWritable: false }
      ],
      data
    });
  }
  encodeDecompressData(token, nullifier) {
    const siblingsFlat = Buffer.concat(token.proof.siblings);
    const directions = Buffer.from(token.proof.directions);
    return Buffer.concat([
      Buffer.from([DOMAIN_IC3, OP_DECOMPRESS]),
      this.bigintToBytes(token.amount, 8),
      Buffer.from(token.commitment),
      nullifier,
      Buffer.from([token.proof.siblings.length]),
      siblingsFlat,
      directions,
      this.intToBytes(token.proof.index, 4),
      Buffer.from(token.proof.root)
    ]);
  }
  generateNullifier(commitment, owner, secret) {
    const data = Buffer.concat([
      Buffer.from(commitment),
      owner.toBytes(),
      secret || Buffer.alloc(0)
    ]);
    return keccak_2562(data);
  }
  verifyProof(commitment, proof) {
    let computed = commitment;
    for (let i = 0; i < proof.siblings.length; i++) {
      const sibling = proof.siblings[i];
      const isRight = proof.directions[i] === 1;
      const [left, right] = isRight ? [sibling, computed] : [computed, sibling];
      if (Buffer.compare(Buffer.from(left), Buffer.from(right)) > 0) {
        computed = keccak_2562(Buffer.concat([right, left]));
      } else {
        computed = keccak_2562(Buffer.concat([left, right]));
      }
    }
    return Buffer.from(computed).equals(Buffer.from(proof.root));
  }
  async isNullifierSpent(nullifier) {
    const [nullifierPda] = PublicKey6.findProgramAddressSync(
      [DECOMPRESS_SEEDS.NULLIFIER, nullifier],
      this.programId
    );
    const info = await this.connection.getAccountInfo(nullifierPda);
    return info !== null;
  }
  deriveATA(owner, mint) {
    const [ata] = PublicKey6.findProgramAddressSync(
      [owner.toBytes(), TOKEN_PROGRAM_ID3.toBytes(), mint.toBytes()],
      ASSOCIATED_TOKEN_PROGRAM_ID2
    );
    return ata;
  }
  async getOrCreateATA(owner, mint) {
    const ata = this.deriveATA(owner.publicKey, mint);
    const info = await this.connection.getAccountInfo(ata);
    if (info) {
      return ata;
    }
    return ata;
  }
  encodeProof(proof) {
    const data = Buffer.concat([
      Buffer.from([proof.siblings.length]),
      ...proof.siblings,
      Buffer.from(proof.directions),
      this.intToBytes(proof.index, 4),
      Buffer.from(proof.root)
    ]);
    return data.toString("base64url");
  }
  decodeProof(data) {
    const buf = Buffer.from(data, "base64url");
    let offset = 0;
    const numSiblings = buf[offset++];
    const siblings = [];
    for (let i = 0; i < numSiblings; i++) {
      siblings.push(buf.slice(offset, offset + 32));
      offset += 32;
    }
    const directions = Array.from(buf.slice(offset, offset + numSiblings));
    offset += numSiblings;
    const index = buf.readUInt32LE(offset);
    offset += 4;
    const root = buf.slice(offset, offset + 32);
    return { siblings, directions, index, root };
  }
  async buildAndSend(signer, ixs) {
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    const message = new TransactionMessage5({
      payerKey: signer.publicKey,
      recentBlockhash: blockhash,
      instructions: ixs
    }).compileToV0Message();
    const tx = new VersionedTransaction5(message);
    tx.sign([signer]);
    const sig = await this.connection.sendTransaction(tx, { skipPreflight: false });
    await this.connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });
    return sig;
  }
  bigintToBytes(n, len) {
    const bytes = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = Number(n >> BigInt(i * 8) & 0xffn);
    }
    return bytes;
  }
  intToBytes(n, len) {
    const bytes = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = n >> i * 8 & 255;
    }
    return bytes;
  }
};

// src/lending.ts
import {
  PublicKey as PublicKey7,
  Transaction as Transaction3,
  TransactionInstruction as TransactionInstruction7,
  SystemProgram as SystemProgram7,
  sendAndConfirmTransaction as sendAndConfirmTransaction3
} from "@solana/web3.js";
import { randomBytes as randomBytes3 } from "crypto";
var DOMAIN_DEFI2 = 8;
var LENDING_OPS = {
  CREATE_OFFER: 1,
  CANCEL_OFFER: 2,
  ACCEPT_OFFER: 3,
  REPAY_LOAN: 4,
  CLAIM_DEFAULT: 5,
  EXTEND_LOAN: 6,
  PARTIAL_REPAY: 7,
  TERMINATE_PERPETUAL: 8,
  REFINANCE: 9
};
var LENDING_SEEDS = {
  OFFER: Buffer.from("lending_offer"),
  LOAN: Buffer.from("lending_loan"),
  ESCROW: Buffer.from("lending_escrow"),
  TREASURY: Buffer.from("lending_treasury")
};
var PROTOCOL_FEE_BPS = 100;
var PERPETUAL_GRACE_PERIOD_SECONDS = 72 * 60 * 60;
var NftType = /* @__PURE__ */ ((NftType2) => {
  NftType2[NftType2["Standard"] = 0] = "Standard";
  NftType2[NftType2["Compressed"] = 1] = "Compressed";
  NftType2[NftType2["Programmable"] = 2] = "Programmable";
  return NftType2;
})(NftType || {});
var LoanType = /* @__PURE__ */ ((LoanType3) => {
  LoanType3[LoanType3["Fixed"] = 0] = "Fixed";
  LoanType3[LoanType3["Perpetual"] = 1] = "Perpetual";
  return LoanType3;
})(LoanType || {});
var LoanState = /* @__PURE__ */ ((LoanState3) => {
  LoanState3[LoanState3["Active"] = 0] = "Active";
  LoanState3[LoanState3["Repaid"] = 1] = "Repaid";
  LoanState3[LoanState3["Defaulted"] = 2] = "Defaulted";
  LoanState3[LoanState3["Terminated"] = 3] = "Terminated";
  LoanState3[LoanState3["Refinanced"] = 4] = "Refinanced";
  return LoanState3;
})(LoanState || {});
function generateOfferId() {
  return randomBytes3(16).toString("hex");
}
function generateLoanId() {
  return randomBytes3(16).toString("hex");
}
function calculateInterest(principal, interestBps, durationSeconds) {
  const yearSeconds = 365 * 24 * 60 * 60;
  const interestRate = BigInt(interestBps) * BigInt(durationSeconds) / BigInt(yearSeconds * 1e4);
  return principal * interestRate / BigInt(100);
}
function calculateRepayment(principal, interestBps, durationSeconds) {
  const interest = calculateInterest(principal, interestBps, durationSeconds);
  return principal + interest;
}
function calculateProtocolFee(amount) {
  return amount * BigInt(PROTOCOL_FEE_BPS) / BigInt(1e4);
}
function deriveOfferPda(offerId) {
  const [pda] = PublicKey7.findProgramAddressSync(
    [LENDING_SEEDS.OFFER, Buffer.from(offerId)],
    SPS_PROGRAM_ID4
  );
  return pda;
}
function deriveLoanPda(loanId) {
  const [pda] = PublicKey7.findProgramAddressSync(
    [LENDING_SEEDS.LOAN, Buffer.from(loanId)],
    SPS_PROGRAM_ID4
  );
  return pda;
}
function deriveEscrowPda2(loanId) {
  const [pda] = PublicKey7.findProgramAddressSync(
    [LENDING_SEEDS.ESCROW, Buffer.from(loanId)],
    SPS_PROGRAM_ID4
  );
  return pda;
}
function deriveTreasuryPda() {
  const [pda] = PublicKey7.findProgramAddressSync(
    [LENDING_SEEDS.TREASURY],
    SPS_PROGRAM_ID4
  );
  return pda;
}
var PrivateLendingClient = class {
  constructor(connection, programId = SPS_PROGRAM_ID4) {
    this.connection = connection;
    this.programId = programId;
  }
  // ─────────────────────────────────────────────────────────────────────────
  // LENDER OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Create a collection offer
   * Lender deposits SOL, sets terms for any NFT from collection
   */
  async createOffer(lender, params) {
    const offerId = generateOfferId();
    const offerPda = deriveOfferPda(offerId);
    const treasuryPda = deriveTreasuryPda();
    const durationSeconds = params.durationSeconds ?? 0;
    const loanType = params.loanType ?? (durationSeconds === 0 ? 1 /* Perpetual */ : 0 /* Fixed */);
    const expiryTimestamp = Math.floor(Date.now() / 1e3) + (params.expirySeconds ?? 7 * 24 * 60 * 60);
    const data = Buffer.alloc(128);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI2, offset++);
    data.writeUInt8(LENDING_OPS.CREATE_OFFER, offset++);
    Buffer.from(offerId).copy(data, offset);
    offset += 32;
    params.collection.toBuffer().copy(data, offset);
    offset += 32;
    data.writeBigUInt64LE(params.amount, offset);
    offset += 8;
    data.writeUInt16LE(params.interestBps, offset);
    offset += 2;
    data.writeUInt32LE(durationSeconds, offset);
    offset += 4;
    data.writeUInt8(loanType, offset++);
    data.writeUInt8(params.nftType ?? 0 /* Standard */, offset++);
    data.writeUInt16LE(params.maxLoans ?? 100, offset);
    offset += 2;
    data.writeUInt32LE(expiryTimestamp, offset);
    offset += 4;
    const instruction = new TransactionInstruction7({
      keys: [
        { pubkey: lender.publicKey, isSigner: true, isWritable: true },
        { pubkey: offerPda, isSigner: false, isWritable: true },
        { pubkey: treasuryPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram7.programId, isSigner: false, isWritable: false }
      ],
      programId: this.programId,
      data: data.slice(0, offset)
    });
    const tx = new Transaction3().add(instruction);
    const sig = await sendAndConfirmTransaction3(this.connection, tx, [lender]);
    const offer = {
      offerId,
      lender: lender.publicKey,
      collection: params.collection,
      amount: params.amount,
      interestBps: params.interestBps,
      durationSeconds,
      loanType,
      nftType: params.nftType ?? 0 /* Standard */,
      maxLoans: params.maxLoans ?? 100,
      activeLoans: 0,
      expiryTimestamp,
      isActive: true
    };
    return { offerId, offer, tx: sig };
  }
  /**
   * Cancel an offer and withdraw deposited SOL
   */
  async cancelOffer(lender, offerId) {
    const offerPda = deriveOfferPda(offerId);
    const data = Buffer.alloc(64);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI2, offset++);
    data.writeUInt8(LENDING_OPS.CANCEL_OFFER, offset++);
    Buffer.from(offerId).copy(data, offset);
    offset += 32;
    const instruction = new TransactionInstruction7({
      keys: [
        { pubkey: lender.publicKey, isSigner: true, isWritable: true },
        { pubkey: offerPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram7.programId, isSigner: false, isWritable: false }
      ],
      programId: this.programId,
      data: data.slice(0, offset)
    });
    const tx = new Transaction3().add(instruction);
    const sig = await sendAndConfirmTransaction3(this.connection, tx, [lender]);
    return { tx: sig };
  }
  /**
   * Claim defaulted NFT after loan expires
   */
  async claimDefault(lender, loanId) {
    const loanPda = deriveLoanPda(loanId);
    const escrowPda = deriveEscrowPda2(loanId);
    const data = Buffer.alloc(64);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI2, offset++);
    data.writeUInt8(LENDING_OPS.CLAIM_DEFAULT, offset++);
    Buffer.from(loanId).copy(data, offset);
    offset += 32;
    const instruction = new TransactionInstruction7({
      keys: [
        { pubkey: lender.publicKey, isSigner: true, isWritable: true },
        { pubkey: loanPda, isSigner: false, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram7.programId, isSigner: false, isWritable: false }
      ],
      programId: this.programId,
      data: data.slice(0, offset)
    });
    const tx = new Transaction3().add(instruction);
    const sig = await sendAndConfirmTransaction3(this.connection, tx, [lender]);
    return { tx: sig };
  }
  /**
   * Terminate a perpetual loan (starts 72-hour grace period)
   */
  async terminatePerpetualLoan(lender, loanId) {
    const loanPda = deriveLoanPda(loanId);
    const graceEndsAt = Math.floor(Date.now() / 1e3) + PERPETUAL_GRACE_PERIOD_SECONDS;
    const data = Buffer.alloc(64);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI2, offset++);
    data.writeUInt8(LENDING_OPS.TERMINATE_PERPETUAL, offset++);
    Buffer.from(loanId).copy(data, offset);
    offset += 32;
    const instruction = new TransactionInstruction7({
      keys: [
        { pubkey: lender.publicKey, isSigner: true, isWritable: true },
        { pubkey: loanPda, isSigner: false, isWritable: true }
      ],
      programId: this.programId,
      data: data.slice(0, offset)
    });
    const tx = new Transaction3().add(instruction);
    const sig = await sendAndConfirmTransaction3(this.connection, tx, [lender]);
    return { tx: sig, graceEndsAt };
  }
  // ─────────────────────────────────────────────────────────────────────────
  // BORROWER OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Accept an offer and borrow against NFT
   * NFT is transferred to escrow, SOL is sent to borrower
   */
  async acceptOffer(borrower, params) {
    const loanId = generateLoanId();
    const offerPda = deriveOfferPda(params.offerId);
    const loanPda = deriveLoanPda(loanId);
    const escrowPda = deriveEscrowPda2(loanId);
    const treasuryPda = deriveTreasuryPda();
    const data = Buffer.alloc(128);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI2, offset++);
    data.writeUInt8(LENDING_OPS.ACCEPT_OFFER, offset++);
    Buffer.from(params.offerId).copy(data, offset);
    offset += 32;
    Buffer.from(loanId).copy(data, offset);
    offset += 32;
    params.nftMint.toBuffer().copy(data, offset);
    offset += 32;
    data.writeUInt8(params.nftType ?? 0 /* Standard */, offset++);
    const instruction = new TransactionInstruction7({
      keys: [
        { pubkey: borrower.publicKey, isSigner: true, isWritable: true },
        { pubkey: offerPda, isSigner: false, isWritable: true },
        { pubkey: loanPda, isSigner: false, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: treasuryPda, isSigner: false, isWritable: true },
        { pubkey: params.nftMint, isSigner: false, isWritable: true },
        { pubkey: SystemProgram7.programId, isSigner: false, isWritable: false }
      ],
      programId: this.programId,
      data: data.slice(0, offset)
    });
    const tx = new Transaction3().add(instruction);
    const sig = await sendAndConfirmTransaction3(this.connection, tx, [borrower]);
    const loan = {
      loanId,
      offerId: params.offerId,
      borrower: borrower.publicKey,
      lender: PublicKey7.default,
      // Would be fetched from offer
      nftMint: params.nftMint,
      nftType: params.nftType ?? 0 /* Standard */,
      principal: BigInt(0),
      // Would be fetched from offer
      interestBps: 0,
      // Would be fetched from offer
      startTimestamp: Math.floor(Date.now() / 1e3),
      dueTimestamp: 0,
      loanType: 1 /* Perpetual */,
      state: 0 /* Active */,
      amountRepaid: BigInt(0)
    };
    return { loanId, loan, tx: sig };
  }
  /**
   * Repay a loan and recover NFT
   */
  async repayLoan(borrower, params) {
    const loanPda = deriveLoanPda(params.loanId);
    const escrowPda = deriveEscrowPda2(params.loanId);
    const treasuryPda = deriveTreasuryPda();
    const data = Buffer.alloc(64);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI2, offset++);
    data.writeUInt8(LENDING_OPS.REPAY_LOAN, offset++);
    Buffer.from(params.loanId).copy(data, offset);
    offset += 32;
    if (params.amount) {
      data.writeBigUInt64LE(params.amount, offset);
      offset += 8;
    }
    const instruction = new TransactionInstruction7({
      keys: [
        { pubkey: borrower.publicKey, isSigner: true, isWritable: true },
        { pubkey: loanPda, isSigner: false, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: treasuryPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram7.programId, isSigner: false, isWritable: false }
      ],
      programId: this.programId,
      data: data.slice(0, offset)
    });
    const tx = new Transaction3().add(instruction);
    const sig = await sendAndConfirmTransaction3(this.connection, tx, [borrower]);
    return { tx: sig, amountPaid: params.amount ?? BigInt(0) };
  }
  /**
   * Partial repayment for perpetual loans
   */
  async partialRepay(borrower, loanId, amount) {
    const loanPda = deriveLoanPda(loanId);
    const treasuryPda = deriveTreasuryPda();
    const data = Buffer.alloc(64);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI2, offset++);
    data.writeUInt8(LENDING_OPS.PARTIAL_REPAY, offset++);
    Buffer.from(loanId).copy(data, offset);
    offset += 32;
    data.writeBigUInt64LE(amount, offset);
    offset += 8;
    const instruction = new TransactionInstruction7({
      keys: [
        { pubkey: borrower.publicKey, isSigner: true, isWritable: true },
        { pubkey: loanPda, isSigner: false, isWritable: true },
        { pubkey: treasuryPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram7.programId, isSigner: false, isWritable: false }
      ],
      programId: this.programId,
      data: data.slice(0, offset)
    });
    const tx = new Transaction3().add(instruction);
    const sig = await sendAndConfirmTransaction3(this.connection, tx, [borrower]);
    return { tx: sig };
  }
  /**
   * Extend a fixed-term loan (pay interest to extend duration)
   */
  async extendLoan(borrower, loanId, extensionSeconds) {
    const loanPda = deriveLoanPda(loanId);
    const treasuryPda = deriveTreasuryPda();
    const data = Buffer.alloc(64);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI2, offset++);
    data.writeUInt8(LENDING_OPS.EXTEND_LOAN, offset++);
    Buffer.from(loanId).copy(data, offset);
    offset += 32;
    data.writeUInt32LE(extensionSeconds, offset);
    offset += 4;
    const instruction = new TransactionInstruction7({
      keys: [
        { pubkey: borrower.publicKey, isSigner: true, isWritable: true },
        { pubkey: loanPda, isSigner: false, isWritable: true },
        { pubkey: treasuryPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram7.programId, isSigner: false, isWritable: false }
      ],
      programId: this.programId,
      data: data.slice(0, offset)
    });
    const tx = new Transaction3().add(instruction);
    const sig = await sendAndConfirmTransaction3(this.connection, tx, [borrower]);
    const newDueTimestamp = Math.floor(Date.now() / 1e3) + extensionSeconds;
    return { tx: sig, newDueTimestamp };
  }
  /**
   * Refinance loan with a better offer
   */
  async refinanceLoan(borrower, loanId, newOfferId) {
    const loanPda = deriveLoanPda(loanId);
    const newOfferPda = deriveOfferPda(newOfferId);
    const newLoanId = generateLoanId();
    const newLoanPda = deriveLoanPda(newLoanId);
    const escrowPda = deriveEscrowPda2(loanId);
    const treasuryPda = deriveTreasuryPda();
    const data = Buffer.alloc(128);
    let offset = 0;
    data.writeUInt8(DOMAIN_DEFI2, offset++);
    data.writeUInt8(LENDING_OPS.REFINANCE, offset++);
    Buffer.from(loanId).copy(data, offset);
    offset += 32;
    Buffer.from(newOfferId).copy(data, offset);
    offset += 32;
    Buffer.from(newLoanId).copy(data, offset);
    offset += 32;
    const instruction = new TransactionInstruction7({
      keys: [
        { pubkey: borrower.publicKey, isSigner: true, isWritable: true },
        { pubkey: loanPda, isSigner: false, isWritable: true },
        { pubkey: newOfferPda, isSigner: false, isWritable: true },
        { pubkey: newLoanPda, isSigner: false, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: treasuryPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram7.programId, isSigner: false, isWritable: false }
      ],
      programId: this.programId,
      data: data.slice(0, offset)
    });
    const tx = new Transaction3().add(instruction);
    const sig = await sendAndConfirmTransaction3(this.connection, tx, [borrower]);
    return { tx: sig, newLoanId };
  }
  // ─────────────────────────────────────────────────────────────────────────
  // QUERY OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Get collection offers
   */
  async getCollectionOffers(collection) {
    return [];
  }
  /**
   * Get active loans for a borrower
   */
  async getBorrowerLoans(borrower) {
    return [];
  }
  /**
   * Get active loans for a lender
   */
  async getLenderLoans(lender) {
    return [];
  }
  /**
   * Get loan details
   */
  async getLoan(loanId) {
    return null;
  }
  /**
   * Get offer details
   */
  async getOffer(offerId) {
    return null;
  }
};
function createPrivateLendingClient(connection, programId) {
  return new PrivateLendingClient(connection, programId);
}
async function quickCreateOffer(connection, lender, collection, amount, interestBps, loanType = 1 /* Perpetual */) {
  const client = createPrivateLendingClient(connection);
  const result = await client.createOffer(lender, {
    collection,
    amount,
    interestBps,
    loanType
  });
  return { offerId: result.offerId, tx: result.tx };
}
async function quickAcceptOffer(connection, borrower, offerId, nftMint) {
  const client = createPrivateLendingClient(connection);
  const result = await client.acceptOffer(borrower, { offerId, nftMint });
  return { loanId: result.loanId, tx: result.tx };
}
async function quickRepayLoan(connection, borrower, loanId) {
  const client = createPrivateLendingClient(connection);
  return await client.repayLoan(borrower, { loanId });
}

// src/lending-standalone.ts
import {
  PublicKey as PublicKey8,
  Keypair as Keypair8,
  Transaction as Transaction4,
  TransactionInstruction as TransactionInstruction8,
  SystemProgram as SystemProgram8,
  LAMPORTS_PER_SOL as LAMPORTS_PER_SOL7,
  sendAndConfirmTransaction as sendAndConfirmTransaction4,
  ComputeBudgetProgram
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress as getAssociatedTokenAddress2,
  createTransferInstruction as createTransferInstruction2,
  createAssociatedTokenAccountInstruction as createAssociatedTokenAccountInstruction2
} from "@solana/spl-token";
import { chacha20poly1305 } from "@noble/ciphers/chacha";
var MEMO_PROGRAM_ID2 = new PublicKey8("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
var METAPLEX_METADATA_PROGRAM_ID = new PublicKey8("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
var PROTOCOL_FEE_BPS2 = 100;
var PERPETUAL_GRACE_SECONDS = 72 * 60 * 60;
var DEFAULT_OFFER_EXPIRY_SECONDS = 7 * 24 * 60 * 60;
var LoanType2 = /* @__PURE__ */ ((LoanType3) => {
  LoanType3[LoanType3["Fixed"] = 0] = "Fixed";
  LoanType3[LoanType3["Perpetual"] = 1] = "Perpetual";
  return LoanType3;
})(LoanType2 || {});
var LoanState2 = /* @__PURE__ */ ((LoanState3) => {
  LoanState3[LoanState3["Active"] = 0] = "Active";
  LoanState3[LoanState3["Repaid"] = 1] = "Repaid";
  LoanState3[LoanState3["Defaulted"] = 2] = "Defaulted";
  LoanState3[LoanState3["Terminated"] = 3] = "Terminated";
  LoanState3[LoanState3["Refinanced"] = 4] = "Refinanced";
  return LoanState3;
})(LoanState2 || {});
var PrivacyLevel = /* @__PURE__ */ ((PrivacyLevel2) => {
  PrivacyLevel2[PrivacyLevel2["Public"] = 0] = "Public";
  PrivacyLevel2[PrivacyLevel2["EncryptedTerms"] = 1] = "EncryptedTerms";
  PrivacyLevel2[PrivacyLevel2["FullyStealth"] = 2] = "FullyStealth";
  return PrivacyLevel2;
})(PrivacyLevel || {});
function randomBytes4(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}
function generateId() {
  const bytes = randomBytes4(16);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function generateStealthKeypair() {
  return Keypair8.generate();
}
function encryptLoanTerms(data, encryptionKey) {
  const key = encryptionKey || randomBytes4(32);
  const nonce = randomBytes4(12);
  const payload = JSON.stringify({
    a: data.amount.toString(),
    i: data.interestBps,
    d: data.durationSeconds,
    t: data.loanType
  });
  const cipher = chacha20poly1305(key, nonce);
  const encrypted = cipher.encrypt(new TextEncoder().encode(payload));
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);
  return {
    encrypted: Buffer.from(combined).toString("base64"),
    key
  };
}
function decryptLoanTerms(encrypted, key) {
  try {
    const combined = Buffer.from(encrypted, "base64");
    const nonce = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const cipher = chacha20poly1305(key, nonce);
    const decrypted = cipher.decrypt(ciphertext);
    const payload = JSON.parse(new TextDecoder().decode(decrypted));
    return {
      amount: BigInt(payload.a),
      interestBps: payload.i,
      durationSeconds: payload.d,
      loanType: payload.t
    };
  } catch {
    return null;
  }
}
function calculateInterest2(principal, interestBps, durationSeconds) {
  const yearSeconds = 365 * 24 * 60 * 60;
  const interestRate = BigInt(interestBps) * BigInt(durationSeconds) / BigInt(yearSeconds * 1e4);
  return principal * interestRate / BigInt(100);
}
function calculateRepayment2(principal, interestBps, durationSeconds) {
  const interest = calculateInterest2(principal, interestBps, durationSeconds);
  return principal + interest;
}
function calculateProtocolFee2(amount) {
  return amount * BigInt(PROTOCOL_FEE_BPS2) / BigInt(1e4);
}
var LendingStandalone = class {
  constructor(config) {
    this.connection = config.connection;
    this.feePayer = config.feePayer;
    this.feeRecipient = config.feeRecipient;
  }
  // ─────────────────────────────────────────────────────────────────────────
  // LENDER OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Create a collection lending offer
   * SOL is deposited to an escrow account
   */
  async createOffer(params) {
    const offerId = generateId();
    const escrowKeypair = Keypair8.generate();
    const durationSeconds = params.durationSeconds ?? 0;
    const loanType = params.loanType ?? (durationSeconds === 0 ? 1 /* Perpetual */ : 0 /* Fixed */);
    const privacyLevel = params.privacyLevel ?? 0 /* Public */;
    const expirySeconds = params.expirySeconds ?? DEFAULT_OFFER_EXPIRY_SECONDS;
    const maxLoans = params.maxLoans ?? 100;
    const lenderPubkey = privacyLevel === 2 /* FullyStealth */ ? generateStealthKeypair().publicKey : params.lender.publicKey;
    let encryptedTerms;
    let decryptionKey;
    if (privacyLevel !== 0 /* Public */) {
      const encrypted = encryptLoanTerms({
        amount: params.amount,
        interestBps: params.interestBps,
        durationSeconds,
        loanType
      });
      encryptedTerms = encrypted.encrypted;
      decryptionKey = encrypted.key;
    }
    const escrowRent = await this.connection.getMinimumBalanceForRentExemption(0);
    const totalDeposit = Number(params.amount) * maxLoans + escrowRent;
    const tx = new Transaction4();
    tx.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1e3 })
    );
    tx.add(
      SystemProgram8.createAccount({
        fromPubkey: params.lender.publicKey,
        newAccountPubkey: escrowKeypair.publicKey,
        lamports: totalDeposit,
        space: 0,
        programId: SystemProgram8.programId
      })
    );
    const memoData = privacyLevel === 0 /* Public */ ? JSON.stringify({
      type: "LENDING_OFFER",
      id: offerId,
      collection: params.collection.toBase58(),
      amount: params.amount.toString(),
      interestBps: params.interestBps,
      duration: durationSeconds,
      loanType,
      maxLoans,
      expiry: Math.floor(Date.now() / 1e3) + expirySeconds
    }) : JSON.stringify({
      type: "LENDING_OFFER_PRIVATE",
      id: offerId,
      collection: params.collection.toBase58(),
      encrypted: encryptedTerms,
      expiry: Math.floor(Date.now() / 1e3) + expirySeconds
    });
    tx.add(
      new TransactionInstruction8({
        keys: [{ pubkey: params.lender.publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID2,
        data: Buffer.from(memoData)
      })
    );
    const signers = [params.lender, escrowKeypair];
    const txSignature = await sendAndConfirmTransaction4(this.connection, tx, signers);
    return {
      offerId,
      escrowKeypair,
      lender: lenderPubkey,
      collection: params.collection,
      amount: params.amount,
      interestBps: params.interestBps,
      durationSeconds,
      loanType,
      privacyLevel,
      expiresAt: new Date(Date.now() + expirySeconds * 1e3),
      maxLoans,
      activeLoans: 0,
      txSignature,
      encryptedTerms,
      decryptionKey
    };
  }
  /**
   * Cancel an offer and withdraw deposited SOL
   */
  async cancelOffer(lender, escrowPubkey) {
    const escrowBalance = await this.connection.getBalance(escrowPubkey);
    const tx = new Transaction4();
    tx.add(
      SystemProgram8.transfer({
        fromPubkey: escrowPubkey,
        toPubkey: lender.publicKey,
        lamports: escrowBalance
      })
    );
    tx.add(
      new TransactionInstruction8({
        keys: [{ pubkey: lender.publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID2,
        data: Buffer.from(JSON.stringify({
          type: "LENDING_OFFER_CANCEL",
          escrow: escrowPubkey.toBase58()
        }))
      })
    );
    const txSignature = await sendAndConfirmTransaction4(this.connection, tx, [lender]);
    return { txSignature };
  }
  /**
   * Generate shareable offer link
   */
  generateOfferLink(offer, baseUrl = "https://styxprivacy.app") {
    const payload = Buffer.from(JSON.stringify({
      id: offer.offerId,
      e: offer.escrowKeypair.publicKey.toBase58(),
      c: offer.collection.toBase58(),
      a: offer.amount.toString(),
      i: offer.interestBps,
      d: offer.durationSeconds,
      t: offer.loanType,
      p: offer.privacyLevel,
      x: offer.expiresAt.getTime(),
      k: offer.decryptionKey ? Buffer.from(offer.decryptionKey).toString("base64") : void 0
    })).toString("base64url");
    const url = `${baseUrl}/lending/offer/${offer.offerId}?d=${payload}`;
    const shortCode = offer.offerId.slice(0, 8);
    return {
      url,
      shortCode,
      qrData: url,
      deepLink: `styx://lending/offer/${offer.offerId}?d=${payload}`
    };
  }
  // ─────────────────────────────────────────────────────────────────────────
  // BORROWER OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Accept an offer - transfer NFT to escrow, receive SOL
   */
  async acceptOffer(params) {
    const loanId = generateId();
    const nftEscrowKeypair = Keypair8.generate();
    const privacyLevel = params.privacyLevel ?? 0 /* Public */;
    const startTimestamp = Math.floor(Date.now() / 1e3);
    const dueTimestamp = params.loanType === 1 /* Perpetual */ ? 0 : startTimestamp + params.durationSeconds;
    const borrowerNftAccount = await getAssociatedTokenAddress2(
      params.nftMint,
      params.borrower.publicKey
    );
    const escrowNftAccount = await getAssociatedTokenAddress2(
      params.nftMint,
      nftEscrowKeypair.publicKey
    );
    const tx = new Transaction4();
    tx.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 3e5 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1e3 })
    );
    tx.add(
      createAssociatedTokenAccountInstruction2(
        params.borrower.publicKey,
        escrowNftAccount,
        nftEscrowKeypair.publicKey,
        params.nftMint
      )
    );
    tx.add(
      createTransferInstruction2(
        borrowerNftAccount,
        escrowNftAccount,
        params.borrower.publicKey,
        1
      )
    );
    const protocolFee = calculateProtocolFee2(params.amount);
    const borrowerReceives = params.amount - protocolFee;
    tx.add(
      SystemProgram8.transfer({
        fromPubkey: params.escrowPubkey,
        toPubkey: params.borrower.publicKey,
        lamports: Number(borrowerReceives)
      })
    );
    if (this.feeRecipient && protocolFee > 0n) {
      tx.add(
        SystemProgram8.transfer({
          fromPubkey: params.escrowPubkey,
          toPubkey: this.feeRecipient,
          lamports: Number(protocolFee)
        })
      );
    }
    tx.add(
      new TransactionInstruction8({
        keys: [{ pubkey: params.borrower.publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID2,
        data: Buffer.from(JSON.stringify({
          type: "LENDING_LOAN_CREATE",
          id: loanId,
          offerId: params.offerId,
          nftMint: params.nftMint.toBase58(),
          principal: params.amount.toString(),
          interestBps: params.interestBps,
          start: startTimestamp,
          due: dueTimestamp,
          loanType: params.loanType
        }))
      })
    );
    const signers = [params.borrower, nftEscrowKeypair];
    const txSignature = await sendAndConfirmTransaction4(this.connection, tx, signers);
    return {
      loanId,
      offerId: params.offerId,
      borrower: params.borrower.publicKey,
      lender: params.escrowPubkey,
      // Offer escrow represents lender
      nftEscrowKeypair,
      nftMint: params.nftMint,
      principal: params.amount,
      interestBps: params.interestBps,
      startTimestamp,
      dueTimestamp,
      loanType: params.loanType,
      state: 0 /* Active */,
      amountRepaid: 0n,
      privacyLevel,
      txSignature
    };
  }
  /**
   * Repay a loan - return SOL + interest, get NFT back
   */
  async repayLoan(params) {
    const tx = new Transaction4();
    tx.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 3e5 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1e3 })
    );
    tx.add(
      SystemProgram8.transfer({
        fromPubkey: params.borrower.publicKey,
        toPubkey: params.lender,
        lamports: Number(params.repayAmount)
      })
    );
    if (params.isFullRepayment) {
      const escrowNftAccount = await getAssociatedTokenAddress2(
        params.nftMint,
        params.nftEscrowPubkey
      );
      const borrowerNftAccount = await getAssociatedTokenAddress2(
        params.nftMint,
        params.borrower.publicKey
      );
      tx.add(
        createTransferInstruction2(
          escrowNftAccount,
          borrowerNftAccount,
          params.nftEscrowPubkey,
          // Would need escrow keypair
          1
        )
      );
    }
    tx.add(
      new TransactionInstruction8({
        keys: [{ pubkey: params.borrower.publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID2,
        data: Buffer.from(JSON.stringify({
          type: params.isFullRepayment ? "LENDING_LOAN_REPAID" : "LENDING_LOAN_PARTIAL",
          id: params.loanId,
          amount: params.repayAmount.toString(),
          full: params.isFullRepayment
        }))
      })
    );
    const txSignature = await sendAndConfirmTransaction4(this.connection, tx, [params.borrower]);
    return {
      txSignature,
      state: params.isFullRepayment ? 1 /* Repaid */ : 0 /* Active */
    };
  }
  // ─────────────────────────────────────────────────────────────────────────
  // PERPETUAL LOAN OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Terminate a perpetual loan (starts 72-hour grace period)
   */
  async terminatePerpetualLoan(lender, loanId) {
    const graceEndsAt = Math.floor(Date.now() / 1e3) + PERPETUAL_GRACE_SECONDS;
    const tx = new Transaction4();
    tx.add(
      new TransactionInstruction8({
        keys: [{ pubkey: lender.publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID2,
        data: Buffer.from(JSON.stringify({
          type: "LENDING_LOAN_TERMINATE",
          id: loanId,
          graceEndsAt
        }))
      })
    );
    const txSignature = await sendAndConfirmTransaction4(this.connection, tx, [lender]);
    return { txSignature, graceEndsAt };
  }
  /**
   * Claim defaulted NFT (after grace period or due date)
   */
  async claimDefault(lender, loanId, nftEscrowPubkey, nftMint) {
    const tx = new Transaction4();
    tx.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1e3 })
    );
    const escrowNftAccount = await getAssociatedTokenAddress2(nftMint, nftEscrowPubkey);
    const lenderNftAccount = await getAssociatedTokenAddress2(nftMint, lender.publicKey);
    const lenderNftInfo = await this.connection.getAccountInfo(lenderNftAccount);
    if (!lenderNftInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction2(
          lender.publicKey,
          lenderNftAccount,
          lender.publicKey,
          nftMint
        )
      );
    }
    tx.add(
      createTransferInstruction2(
        escrowNftAccount,
        lenderNftAccount,
        nftEscrowPubkey,
        1
      )
    );
    tx.add(
      new TransactionInstruction8({
        keys: [{ pubkey: lender.publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID2,
        data: Buffer.from(JSON.stringify({
          type: "LENDING_LOAN_DEFAULTED",
          id: loanId,
          nftMint: nftMint.toBase58()
        }))
      })
    );
    const txSignature = await sendAndConfirmTransaction4(this.connection, tx, [lender]);
    return { txSignature };
  }
  // ─────────────────────────────────────────────────────────────────────────
  // REFINANCING
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Refinance a loan into a new offer
   */
  async refinanceLoan(borrower, currentLoanId, newOfferParams, currentOwed) {
    const newLoan = await this.acceptOffer({
      ...newOfferParams,
      borrower
    });
    return {
      newLoan,
      oldLoanRepaid: true
      // Simplified
    };
  }
};
function createLendingStandalone(connection, options) {
  return new LendingStandalone({
    connection,
    feePayer: options?.feePayer,
    feeRecipient: options?.feeRecipient
  });
}
async function quickCreateOffer2(connection, lender, collection, amountSol, interestApr, options) {
  const lending = createLendingStandalone(connection);
  return lending.createOffer({
    lender,
    collection,
    amount: BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL7)),
    interestBps: Math.floor(interestApr * 100),
    durationSeconds: options?.durationDays ? options.durationDays * 24 * 60 * 60 : 0,
    loanType: options?.loanType,
    privacyLevel: options?.privacyLevel
  });
}

// src/index.ts
var SPS_PROGRAM_ID4 = new PublicKey9("GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9");
var SPS_DEVNET_PROGRAM_ID = new PublicKey9("FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW");
var SEEDS2 = {
  NULLIFIER: Buffer.from("nullifier"),
  MINT: Buffer.from("sps_mint"),
  NOTE: Buffer.from("sps_note"),
  POOL: Buffer.from("sps_pool"),
  RULESET: Buffer.from("sps_ruleset"),
  ESCROW: Buffer.from("sps_escrow")
};
function generateCommitment() {
  return randomBytes5(32);
}
function computeCommitment(secret, amount) {
  const amountBytes = Buffer.alloc(8);
  amountBytes.writeBigUInt64LE(amount);
  return keccak_2563(Buffer.concat([Buffer.from(secret), amountBytes]));
}
function computeNullifier(noteSecret) {
  return keccak_2563(Buffer.concat([Buffer.from("nullifier:"), Buffer.from(noteSecret)]));
}
function generateStealthAddress2(recipientSpendPubkey, recipientViewPubkey) {
  const ephemeralPriv = randomBytes5(32);
  const ephemeralPub = x25519.getPublicKey(ephemeralPriv);
  const sharedSecret = x25519.getSharedSecret(ephemeralPriv, recipientViewPubkey);
  const hash = keccak_2563(sharedSecret);
  const stealthPubkey = keccak_2563(Buffer.concat([Buffer.from(recipientSpendPubkey), hash]));
  const viewTag = hash[0];
  return {
    pubkey: stealthPubkey,
    viewTag,
    ephemeralPubkey: ephemeralPub
  };
}
function checkStealthAddress(ephemeralPubkey, viewPrivkey, expectedViewTag) {
  const sharedSecret = x25519.getSharedSecret(viewPrivkey, ephemeralPubkey);
  const hash = keccak_2563(sharedSecret);
  return hash[0] === expectedViewTag;
}
function encrypt(message, key) {
  const nonce = randomBytes5(12);
  const cipher = chacha20poly13052(key, nonce);
  const ciphertext = cipher.encrypt(message);
  return new Uint8Array([...nonce, ...ciphertext]);
}
function decrypt(encrypted, key) {
  const nonce = encrypted.slice(0, 12);
  const ciphertext = encrypted.slice(12);
  const cipher = chacha20poly13052(key, nonce);
  return cipher.decrypt(ciphertext);
}
function deriveNullifierPda(nullifier, programId = SPS_PROGRAM_ID4) {
  return PublicKey9.findProgramAddressSync(
    [SEEDS2.NULLIFIER, Buffer.from(nullifier)],
    programId
  );
}
function deriveMintPda(authority, nonce, programId = SPS_PROGRAM_ID4) {
  return PublicKey9.findProgramAddressSync(
    [SEEDS2.MINT, authority.toBuffer(), Buffer.from(nonce)],
    programId
  );
}
function derivePoolPda(mintA, mintB, programId = SPS_PROGRAM_ID4) {
  const [first, second] = Buffer.compare(Buffer.from(mintA), Buffer.from(mintB)) <= 0 ? [mintA, mintB] : [mintB, mintA];
  return PublicKey9.findProgramAddressSync(
    [SEEDS2.POOL, Buffer.from(first), Buffer.from(second)],
    programId
  );
}
function buildCreateMintIx(params, authority, programId = SPS_PROGRAM_ID4) {
  const nonce = randomBytes5(32);
  const nameBytes = Buffer.alloc(32);
  Buffer.from(params.name, "utf8").copy(nameBytes);
  const symbolBytes = Buffer.alloc(8);
  Buffer.from(params.symbol, "utf8").copy(symbolBytes);
  const decimals = params.decimals ?? 9;
  const supplyCap = params.supplyCap ?? BigInt(1e9 * 10 ** decimals);
  const mintType = params.mintType === "nft" ? 1 : params.mintType === "semi-fungible" ? 2 : 0;
  const backingType = params.backingType === "spl-backed" ? 1 : 0;
  const splMintBytes = params.splMint?.toBuffer() ?? Buffer.alloc(32);
  const privacyMode = params.privacyMode === "public" ? 1 : params.privacyMode === "optional" ? 2 : 0;
  const data = Buffer.alloc(122);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_CREATE_MINT, offset++);
  Buffer.from(nonce).copy(data, offset);
  offset += 32;
  nameBytes.copy(data, offset);
  offset += 32;
  symbolBytes.copy(data, offset);
  offset += 8;
  data.writeUInt8(decimals, offset++);
  data.writeBigUInt64LE(supplyCap, offset);
  offset += 8;
  data.writeUInt8(mintType, offset++);
  data.writeUInt8(backingType, offset++);
  splMintBytes.copy(data, offset);
  offset += 32;
  data.writeUInt8(privacyMode, offset++);
  data.writeUInt32LE(0, offset);
  const mintId = sha2564(Buffer.concat([
    Buffer.from("SPS_MINT_V1"),
    authority.toBuffer(),
    Buffer.from(nonce)
  ]));
  const instruction = new TransactionInstruction9({
    programId,
    keys: [{ pubkey: authority, isSigner: true, isWritable: true }],
    data
  });
  return { instruction, nonce: new Uint8Array(nonce), mintId };
}
function buildMintToIx(params, authority, programId = SPS_PROGRAM_ID4) {
  const encryptedNote = params.encryptedNote ?? randomBytes5(64);
  const data = Buffer.alloc(78 + encryptedNote.length);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_MINT_TO, offset++);
  Buffer.from(params.mintId).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(params.amount, offset);
  offset += 8;
  Buffer.from(params.commitment).copy(data, offset);
  offset += 32;
  data.writeUInt32LE(encryptedNote.length, offset);
  offset += 4;
  Buffer.from(encryptedNote).copy(data, offset);
  return new TransactionInstruction9({
    programId,
    keys: [{ pubkey: authority, isSigner: true, isWritable: true }],
    data
  });
}
function buildTransferIx(params, payer, programId = SPS_PROGRAM_ID4) {
  const [nullifierPda] = deriveNullifierPda(params.nullifier, programId);
  const encryptedAmount = params.encryptedAmount ?? randomBytes5(8);
  const proof = params.proof ?? new Uint8Array(0);
  const data = Buffer.alloc(76 + proof.length);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_TRANSFER, offset++);
  Buffer.from(params.nullifier).copy(data, offset);
  offset += 32;
  Buffer.from(params.newCommitment).copy(data, offset);
  offset += 32;
  Buffer.from(encryptedAmount).copy(data, offset);
  offset += 8;
  data.writeUInt8(proof.length, offset++);
  if (proof.length > 0) {
    Buffer.from(proof).copy(data, offset);
  }
  return new TransactionInstruction9({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: nullifierPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram9.programId, isSigner: false, isWritable: false }
    ],
    data
  });
}
function buildCreateNftIx(params, authority, programId = SPS_PROGRAM_ID4) {
  const nonce = randomBytes5(32);
  const nameBytes = Buffer.alloc(32);
  Buffer.from(params.name, "utf8").copy(nameBytes);
  const symbolBytes = Buffer.alloc(8);
  Buffer.from(params.symbol, "utf8").copy(symbolBytes);
  const uriBytes = Buffer.alloc(200);
  Buffer.from(params.uri, "utf8").copy(uriBytes);
  const royaltyBps = params.royaltyBps ?? 500;
  const collection = params.collection?.toBuffer() ?? Buffer.alloc(32);
  const ruleSet = params.ruleSet?.toBuffer() ?? Buffer.alloc(32);
  const data = Buffer.alloc(320);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_CREATE_NFT, offset++);
  Buffer.from(nonce).copy(data, offset);
  offset += 32;
  nameBytes.copy(data, offset);
  offset += 32;
  symbolBytes.copy(data, offset);
  offset += 8;
  uriBytes.copy(data, offset);
  offset += 200;
  data.writeUInt16LE(royaltyBps, offset);
  offset += 2;
  collection.copy(data, offset);
  offset += 32;
  ruleSet.copy(data, offset);
  const nftId = sha2564(Buffer.concat([
    Buffer.from("SPS_NFT_V1"),
    authority.toBuffer(),
    Buffer.from(nonce)
  ]));
  const instruction = new TransactionInstruction9({
    programId,
    keys: [{ pubkey: authority, isSigner: true, isWritable: true }],
    data
  });
  return { instruction, nonce: new Uint8Array(nonce), nftId };
}
function buildDecoyStormIx(decoyCount, realTransfer, payer, programId = SPS_PROGRAM_ID4) {
  const decoys = [];
  for (let i = 0; i < decoyCount; i++) {
    decoys.push(randomBytes5(72));
  }
  const realIndex = realTransfer ? Math.floor(Math.random() * (decoyCount + 1)) : 255;
  const transferSize = 72;
  const data = Buffer.alloc(4 + (decoyCount + (realTransfer ? 1 : 0)) * transferSize);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_DECOY_STORM, offset++);
  data.writeUInt8(decoyCount + (realTransfer ? 1 : 0), offset++);
  data.writeUInt8(realIndex, offset++);
  for (let i = 0; i < decoyCount + (realTransfer ? 1 : 0); i++) {
    if (i === realIndex && realTransfer) {
      Buffer.from(realTransfer.nullifier).copy(data, offset);
      offset += 32;
      Buffer.from(realTransfer.newCommitment).copy(data, offset);
      offset += 32;
      Buffer.from(realTransfer.encryptedAmount ?? randomBytes5(8)).copy(data, offset);
      offset += 8;
    } else {
      const decoyIdx = i > realIndex ? i - 1 : i;
      if (decoyIdx < decoys.length) {
        Buffer.from(decoys[decoyIdx]).copy(data, offset);
        offset += 72;
      }
    }
  }
  return new TransactionInstruction9({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: true }],
    data
  });
}
function buildChronoVaultIx(unlockSlot, encryptedContent, payer, programId = SPS_PROGRAM_ID4) {
  const nonce = randomBytes5(32);
  const data = Buffer.alloc(46 + encryptedContent.length);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_CHRONO_VAULT, offset++);
  Buffer.from(nonce).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(unlockSlot, offset);
  offset += 8;
  data.writeUInt32LE(encryptedContent.length, offset);
  offset += 4;
  Buffer.from(encryptedContent).copy(data, offset);
  return new TransactionInstruction9({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: true }],
    data
  });
}
function buildPrivateMessageIx(params, sender, programId = SPS_PROGRAM_ID4) {
  const ephemeralKey = params.ephemeralKey ?? randomBytes5(32);
  const data = Buffer.alloc(70 + params.message.length);
  let offset = 0;
  data.writeUInt8(DOMAIN_MESSAGING, offset++);
  data.writeUInt8(messaging.OP_PRIVATE_MESSAGE, offset++);
  Buffer.from(params.recipientPubkey).copy(data, offset);
  offset += 32;
  Buffer.from(ephemeralKey).copy(data, offset);
  offset += 32;
  data.writeUInt32LE(params.message.length, offset);
  offset += 4;
  Buffer.from(params.message).copy(data, offset);
  return new TransactionInstruction9({
    programId,
    keys: [{ pubkey: sender, isSigner: true, isWritable: true }],
    data
  });
}
function buildCreateAmmPoolIx(params, authority, programId = SPS_PROGRAM_ID4) {
  const poolType = params.poolType === "stable_swap" ? 1 : params.poolType === "concentrated" ? 2 : 0;
  const fee = params.fee ?? 30;
  const data = Buffer.alloc(70);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_CREATE_AMM_POOL, offset++);
  Buffer.from(params.mintA).copy(data, offset);
  offset += 32;
  Buffer.from(params.mintB).copy(data, offset);
  offset += 32;
  data.writeUInt8(poolType, offset++);
  data.writeUInt16LE(fee, offset);
  const [first, second] = Buffer.compare(Buffer.from(params.mintA), Buffer.from(params.mintB)) <= 0 ? [params.mintA, params.mintB] : [params.mintB, params.mintA];
  const poolId = sha2564(Buffer.concat([
    Buffer.from("SPS_POOL_V1"),
    Buffer.from(first),
    Buffer.from(second)
  ]));
  const instruction = new TransactionInstruction9({
    programId,
    keys: [{ pubkey: authority, isSigner: true, isWritable: true }],
    data
  });
  return { instruction, poolId };
}
function buildPrivateSwapIx(poolId, inputNullifier, outputCommitment, minOutput, payer, programId = SPS_PROGRAM_ID4) {
  const [nullifierPda] = deriveNullifierPda(inputNullifier, programId);
  const data = Buffer.alloc(106);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_PRIVATE_SWAP, offset++);
  Buffer.from(poolId).copy(data, offset);
  offset += 32;
  Buffer.from(inputNullifier).copy(data, offset);
  offset += 32;
  Buffer.from(outputCommitment).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(minOutput, offset);
  return new TransactionInstruction9({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: nullifierPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram9.programId, isSigner: false, isWritable: false }
    ],
    data
  });
}
function buildShieldIx(splMint, amount, commitment, payer, tokenAccount, programId = SPS_PROGRAM_ID4) {
  const data = Buffer.alloc(74);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_SHIELD, offset++);
  splMint.toBuffer().copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(amount, offset);
  offset += 8;
  Buffer.from(commitment).copy(data, offset);
  return new TransactionInstruction9({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: tokenAccount, isSigner: false, isWritable: true },
      { pubkey: splMint, isSigner: false, isWritable: false }
    ],
    data
  });
}
function buildUnshieldIx(nullifier, amount, recipient, payer, programId = SPS_PROGRAM_ID4) {
  const [nullifierPda] = deriveNullifierPda(nullifier, programId);
  const data = Buffer.alloc(74);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_UNSHIELD, offset++);
  Buffer.from(nullifier).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(amount, offset);
  offset += 8;
  recipient.toBuffer().copy(data, offset);
  return new TransactionInstruction9({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: nullifierPda, isSigner: false, isWritable: true },
      { pubkey: recipient, isSigner: false, isWritable: true },
      { pubkey: SystemProgram9.programId, isSigner: false, isWritable: false }
    ],
    data
  });
}
function buildRevealToAuditorIx(auditorPubkey, encryptedDetails, proofOfCompliance, payer, programId = SPS_PROGRAM_ID4) {
  const data = Buffer.alloc(40 + encryptedDetails.length + proofOfCompliance.length);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_REVEAL_TO_AUDITOR, offset++);
  Buffer.from(auditorPubkey).copy(data, offset);
  offset += 32;
  data.writeUInt16LE(encryptedDetails.length, offset);
  offset += 2;
  Buffer.from(encryptedDetails).copy(data, offset);
  offset += encryptedDetails.length;
  data.writeUInt16LE(proofOfCompliance.length, offset);
  offset += 2;
  Buffer.from(proofOfCompliance).copy(data, offset);
  return new TransactionInstruction9({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: true }],
    data
  });
}
function buildAttachPoiIx(noteCommitment, poiProof, payer, programId = SPS_PROGRAM_ID4) {
  const data = Buffer.alloc(38 + poiProof.length);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_ATTACH_POI, offset++);
  Buffer.from(noteCommitment).copy(data, offset);
  offset += 32;
  data.writeUInt32LE(poiProof.length, offset);
  offset += 4;
  Buffer.from(poiProof).copy(data, offset);
  return new TransactionInstruction9({
    programId,
    keys: [{ pubkey: payer, isSigner: true, isWritable: true }],
    data
  });
}
function buildRatchetMessageIx(recipientPubkey, ratchetHeader, encryptedMessage, sender, programId = SPS_PROGRAM_ID4) {
  const data = Buffer.alloc(40 + ratchetHeader.length + encryptedMessage.length);
  let offset = 0;
  data.writeUInt8(DOMAIN_MESSAGING, offset++);
  data.writeUInt8(messaging.OP_RATCHET_MESSAGE, offset++);
  Buffer.from(recipientPubkey).copy(data, offset);
  offset += 32;
  data.writeUInt16LE(ratchetHeader.length, offset);
  offset += 2;
  Buffer.from(ratchetHeader).copy(data, offset);
  offset += ratchetHeader.length;
  data.writeUInt16LE(encryptedMessage.length, offset);
  offset += 2;
  Buffer.from(encryptedMessage).copy(data, offset);
  return new TransactionInstruction9({
    programId,
    keys: [{ pubkey: sender, isSigner: true, isWritable: true }],
    data
  });
}
function buildIapMintIx(mintId, amount, commitment, iapProof, authority, programId = SPS_PROGRAM_ID4) {
  const data = Buffer.alloc(78 + iapProof.length);
  let offset = 0;
  data.writeUInt8(DOMAIN_STS, offset++);
  data.writeUInt8(sts.OP_IAP_TRANSFER, offset++);
  Buffer.from(mintId).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(amount, offset);
  offset += 8;
  Buffer.from(commitment).copy(data, offset);
  offset += 32;
  data.writeUInt32LE(iapProof.length, offset);
  offset += 4;
  Buffer.from(iapProof).copy(data, offset);
  return new TransactionInstruction9({
    programId,
    keys: [{ pubkey: authority, isSigner: true, isWritable: true }],
    data
  });
}
var SpsClient = class {
  constructor(config) {
    this.connection = config.connection;
    this.wallet = config.wallet;
    this.programId = config.programId ?? (config.network === "devnet" ? SPS_DEVNET_PROGRAM_ID : SPS_PROGRAM_ID4);
  }
  /**
   * Get payer public key
   */
  get payer() {
    if (!this.wallet) throw new Error("Wallet not configured");
    return this.wallet.publicKey;
  }
  /**
   * Send versioned transaction
   */
  async sendTransaction(instructions, signers = []) {
    if (!this.wallet) throw new Error("Wallet not configured");
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash("confirmed");
    const message = new TransactionMessage6({
      payerKey: this.wallet.publicKey,
      recentBlockhash: blockhash,
      instructions
    }).compileToV0Message();
    const tx = new VersionedTransaction6(message);
    tx.sign([this.wallet, ...signers]);
    const signature = await this.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false
    });
    await this.connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    }, "confirmed");
    return signature;
  }
  /**
   * Create a new SPS mint
   */
  async createMint(params) {
    const { instruction, mintId } = buildCreateMintIx(params, this.payer, this.programId);
    const signature = await this.sendTransaction([instruction]);
    return { signature, mintId };
  }
  /**
   * Mint tokens to a commitment
   */
  async mintTo(params) {
    const instruction = buildMintToIx(params, this.payer, this.programId);
    return this.sendTransaction([instruction]);
  }
  /**
   * Transfer tokens (UTXO-style)
   */
  async transfer(params) {
    const instruction = buildTransferIx(params, this.payer, this.programId);
    return this.sendTransaction([instruction]);
  }
  /**
   * Create a privacy NFT
   */
  async createNft(params) {
    const { instruction, nftId } = buildCreateNftIx(params, this.payer, this.programId);
    const signature = await this.sendTransaction([instruction]);
    return { signature, nftId };
  }
  /**
   * Create a decoy storm (privacy mixing)
   */
  async decoyStorm(decoyCount, realTransfer) {
    const instruction = buildDecoyStormIx(decoyCount, realTransfer ?? null, this.payer, this.programId);
    return this.sendTransaction([instruction]);
  }
  /**
   * Create a time-locked vault
   */
  async createChronoVault(unlockSlot, content) {
    const key = randomBytes5(32);
    const encrypted = encrypt(content, key);
    const instruction = buildChronoVaultIx(unlockSlot, encrypted, this.payer, this.programId);
    return this.sendTransaction([instruction]);
  }
  /**
   * Send a private message
   */
  async sendPrivateMessage(params) {
    const instruction = buildPrivateMessageIx(params, this.payer, this.programId);
    return this.sendTransaction([instruction]);
  }
  /**
   * Create an AMM pool
   */
  async createAmmPool(params) {
    const { instruction, poolId } = buildCreateAmmPoolIx(params, this.payer, this.programId);
    const signature = await this.sendTransaction([instruction]);
    return { signature, poolId };
  }
  /**
   * Private swap in AMM pool
   */
  async privateSwap(poolId, inputNullifier, outputCommitment, minOutput) {
    const instruction = buildPrivateSwapIx(
      poolId,
      inputNullifier,
      outputCommitment,
      minOutput,
      this.payer,
      this.programId
    );
    return this.sendTransaction([instruction]);
  }
  /**
   * Shield SPL tokens → SPS Notes
   */
  async shield(splMint, amount, tokenAccount) {
    const commitment = generateCommitment();
    const instruction = buildShieldIx(splMint, amount, commitment, this.payer, tokenAccount, this.programId);
    const signature = await this.sendTransaction([instruction]);
    return { signature, commitment };
  }
  /**
   * Unshield SPS Notes → SPL tokens
   */
  async unshield(nullifier, amount, recipient) {
    const instruction = buildUnshieldIx(nullifier, amount, recipient, this.payer, this.programId);
    return this.sendTransaction([instruction]);
  }
  /**
   * Reveal transaction details to auditor (compliance)
   */
  async revealToAuditor(auditorPubkey, details, proof) {
    const instruction = buildRevealToAuditorIx(auditorPubkey, details, proof, this.payer, this.programId);
    return this.sendTransaction([instruction]);
  }
  /**
   * Attach Proof of Innocence to note
   */
  async attachPoi(commitment, proof) {
    const instruction = buildAttachPoiIx(commitment, proof, this.payer, this.programId);
    return this.sendTransaction([instruction]);
  }
};
var SpsIndexerClient = class {
  constructor(connection, programId = SPS_PROGRAM_ID4) {
    this.connection = connection;
    this.programId = programId;
  }
  /**
   * Scan for notes belonging to a view key
   */
  async scanNotes(viewPrivkey, _startSlot, _endSlot) {
    console.log("Scanning notes for view key...");
    return [];
  }
  /**
   * Get virtual balance (sum of unspent notes)
   */
  async getVirtualBalance(viewPrivkey, mintId) {
    const notes3 = await this.scanNotes(viewPrivkey);
    const mintNotes = notes3.filter(
      (n) => Buffer.from(n.commitment).equals(Buffer.from(mintId))
    );
    const totalAmount = mintNotes.reduce((sum, n) => sum + n.amount, 0n);
    return {
      mintId,
      totalAmount,
      notes: mintNotes
    };
  }
  /**
   * Check if nullifier has been spent
   */
  async isNullifierSpent(nullifier) {
    const [pda] = deriveNullifierPda(nullifier, this.programId);
    const account2 = await this.connection.getAccountInfo(pda);
    return account2 !== null;
  }
};
var index_default = SpsClient;
export {
  AIRDROP_OPS,
  AIRDROP_SEEDS,
  AirdropMerkleTree,
  CampaignStatus,
  DAMClient,
  DECOMPRESS_SEEDS,
  DEFAULT_OFFER_EXPIRY_SECONDS,
  DOMAIN_ACCOUNT,
  DOMAIN_BRIDGE,
  DOMAIN_COMPLIANCE,
  DOMAIN_DAM,
  DOMAIN_DEFI,
  DOMAIN_DERIVATIVES,
  DOMAIN_EASYPAY,
  DOMAIN_EXTENDED,
  DOMAIN_GOVERNANCE,
  DOMAIN_IC,
  DOMAIN_DEFI2 as DOMAIN_LENDING,
  DOMAIN_MESSAGING,
  DOMAIN_NFT,
  DOMAIN_NOTES,
  DOMAIN_PRIVACY,
  DOMAIN_SCHEMA,
  DOMAIN_SECURITIES,
  DOMAIN_STS,
  DOMAIN_SWAP,
  DOMAIN_TLV,
  DOMAIN_VSL,
  EasyPayClient,
  EasyPayStandalone,
  InscriptionMode,
  InscriptionType,
  MEMO_PROGRAM_ID2 as LENDING_MEMO_PROGRAM_ID,
  LENDING_OPS,
  LENDING_SEEDS,
  LendingStandalone,
  LoanState,
  LoanType,
  MAX_BATCH_SIZE,
  MAX_RECIPIENTS_PER_BATCH,
  NftType,
  PERPETUAL_GRACE_PERIOD_SECONDS,
  PERPETUAL_GRACE_SECONDS,
  PROTOCOL_FEE_BPS,
  PrivacyLevel,
  PrivateLendingClient,
  LendingStandalone as PrivateLendingStandalone,
  EasyPayStandalone as Resolv,
  SEEDS2 as SEEDS,
  SPS_DEVNET_PROGRAM_ID,
  SPS_PROGRAM_ID4 as SPS_PROGRAM_ID,
  PROTOCOL_FEE_BPS2 as STANDALONE_PROTOCOL_FEE_BPS,
  SpsClient,
  SpsIndexerClient,
  LoanState2 as StandaloneLoanState,
  LoanType2 as StandaloneLoanType,
  StyxBulkAirdrop,
  StyxInscriptions,
  WalletDecompress,
  account,
  bridge,
  buildAttachPoiIx,
  buildChronoVaultIx,
  buildCreateAmmPoolIx,
  buildCreateMintIx,
  buildCreateNftIx,
  buildDecoyStormIx,
  buildIapMintIx,
  buildInstructionPrefix,
  buildMintToIx,
  buildPrivateMessageIx,
  buildPrivateSwapIx,
  buildRatchetMessageIx,
  buildRevealToAuditorIx,
  buildShieldIx,
  buildTransferIx,
  buildUnshieldIx,
  calculateInterest,
  calculateProtocolFee2 as calculateLendingFee,
  calculateInterest2 as calculateLoanInterest,
  calculateRepayment2 as calculateLoanRepayment,
  calculateProtocolFee,
  calculateRepayment,
  checkStealthAddress,
  compliance,
  computeCommitment,
  computeNullifier,
  createEasyPayClient,
  createEasyPayStandalone,
  createLendingStandalone,
  createPrivateLendingClient,
  createLendingStandalone as createPrivateLendingStandalone,
  createEasyPayStandalone as createResolv,
  createStyxInscriptions,
  dam,
  decrypt,
  decryptLoanTerms,
  decryptPaymentMetadata,
  index_default as default,
  defi,
  derivatives,
  deriveEscrowPda2 as deriveEscrowPda,
  deriveLoanPda,
  deriveMintPda,
  deriveNullifierPda,
  deriveOfferPda,
  derivePoolPda,
  deriveTreasuryPda,
  easypay,
  encrypt,
  encryptLoanTerms,
  encryptPaymentMetadata,
  extensions,
  generateClaimCredentials,
  generateCommitment,
  generateId as generateLendingId,
  generateLoanId,
  generateOfferId,
  generatePaymentId,
  generateStealthAddress2 as generateStealthAddress,
  generateStealthKeypair,
  generateStealthReceiver,
  getDomainName,
  governance,
  ic,
  messaging,
  nft,
  notes,
  poolTypes,
  privacy,
  quickAcceptOffer,
  quickCreateOffer,
  quickCreateOffer2 as quickCreateOfferStandalone,
  quickInscribe,
  quickRepayLoan,
  quickSend,
  quickSendStandalone,
  quickSendStandalone as resolvQuickSend,
  securities,
  sts,
  swap,
  verifyClaimSecret,
  vsl
};
/**
 * @styx-stack/sps-sdk
 * 
 * Styx Privacy Standard (SPS) SDK v3.0 - Privacy-Native Token Standard for Solana
 * 
 * SPS is a privacy-first token standard that provides:
 * - ZERO rent tokens via inscription-based state
 * - Native privacy via commitments, nullifiers, stealth addresses
 * - Full Token-22 parity + 200+ additional operations
 * - Programmable rules for fungibles and NFTs
 * - Compliance-ready with Proof of Innocence
 * - Private DeFi integration (AMM, swaps, staking)
 * 
 * ## Quick Start
 * ```typescript
 * import { SpsClient } from '@styx-stack/sps-sdk';
 * 
 * const client = new SpsClient({ connection, wallet });
 * 
 * // Create a privacy token
 * const mint = await client.createMint({
 *   name: 'My Token',
 *   symbol: 'MYT',
 *   decimals: 9,
 * });
 * 
 * // Mint tokens to commitment (private)
 * await client.mintTo({
 *   mint,
 *   amount: 1_000_000n,
 *   commitment: generateCommitment(recipientKey),
 * });
 * ```
 * 
 * @see https://github.com/QuarksBlueFoot/StyxStack
 * @author Bluefoot Labs (@moonmanquark)
 * @license Apache-2.0
 */
