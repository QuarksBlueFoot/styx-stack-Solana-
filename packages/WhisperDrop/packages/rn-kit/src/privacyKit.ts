import nacl from "tweetnacl";
import { utf8ToBytes } from "@styx/crypto-core";
import {
  Connection,
  Transaction,
  TransactionInstruction,
  PublicKey,
  sendAndConfirmRawTransaction
} from "@solana/web3.js";

import type { WalletSignAdapter } from "@styx/wallet-adapters";
import type { SecureStorage } from "@styx/secure-storage";

import { getOrCreateX25519 } from "./x25519Keys";
import {
  buildUpsertKeyInstruction,
  deriveKeyRegistryPda,
  fetchX25519FromRegistry
} from "@styx/key-registry";

import {
  pmf1BinaryEncrypt,
  pmf1MemoHashB64,
  buildPrivateMemoInstruction,
  rpp1BuildWithWalletSigner,
  type RPP1Package
} from "@styx/memo";

export type PrivacyKitConfig = {
  connection: Connection;
  storage: SecureStorage;
  domain: string; // app identifier (used in registry + reveal context)
};

export class PrivacyKit {
  constructor(private readonly cfg: PrivacyKitConfig) {}

  /**
   * Register this device's X25519 public key (if missing).
   * - Requires one signature (tx) by the wallet.
   * - Safe to call on app start.
   */
  async registerKeyIfMissing(wallet: WalletSignAdapter): Promise<{ pda: PublicKey; didRegister: boolean }> {
    const walletPk = wallet.getPublicKey();
    if (!walletPk) throw new Error("wallet not connected");

    const existing = await fetchX25519FromRegistry(this.cfg.connection, walletPk);
    const pda = deriveKeyRegistryPda(walletPk);

    if (existing) return { pda, didRegister: false };

    const { publicKey } = await getOrCreateX25519(this.cfg.storage);
    const ix = buildUpsertKeyInstruction({
      wallet: walletPk,
      x25519Pubkey: publicKey
    });

    const tx = new Transaction().add(ix);
    tx.feePayer = walletPk;
    const { blockhash } = await this.cfg.connection.getLatestBlockhash("finalized");
    tx.recentBlockhash = blockhash;

    // Wallet adapters generally sign transactions; if not available, the app can sign elsewhere.
    // Here we keep rn-kit UI-free: caller submits signed tx bytes.
    throw new Error("registerKeyIfMissing: transaction signing is app-specific. Use buildRegisterKeyTx() instead.");
  }

  /**
   * Build a transaction for key registration; caller signs+sends using their wallet stack.
   */
  async buildRegisterKeyTx(walletPubkey: PublicKey): Promise<{ tx: Transaction; pda: PublicKey }> {
    const { publicKey } = await getOrCreateX25519(this.cfg.storage);
    const ix = buildUpsertKeyInstruction({ wallet: walletPubkey, x25519Pubkey: publicKey });
    const tx = new Transaction().add(ix);
    tx.feePayer = walletPubkey;
    const { blockhash } = await this.cfg.connection.getLatestBlockhash("finalized");
    tx.recentBlockhash = blockhash;
    return { tx, pda: deriveKeyRegistryPda(walletPubkey) };
  }

  /**
   * Send a private memo:
   * - resolves recipient X25519 via Key Registry PDA
   * - encrypts plaintext into PMF1 bytes
   * - submits PMP instruction carrying ciphertext
   */
  async buildPrivateMemoTx(args: {
    senderWallet: PublicKey;
    recipientWallet: PublicKey;
    plaintext: string;
    contentType?: string;
    appTag?: string;
  }): Promise<{ tx: Transaction; pmf1HashB64: string }> {
    const recipientX = await fetchX25519FromRegistry(this.cfg.connection, args.recipientWallet);
    if (!recipientX) throw new Error("recipient has no registered X25519 key");

    const ephemeral = nacl.box.keyPair();

    const pmf1 = pmf1BinaryEncrypt({
      senderX25519KeyPair: ephemeral,
      recipientX25519Pubkeys: [recipientX],
      plaintext: utf8ToBytes(args.plaintext),
      contentType: args.contentType ?? "text/plain; charset=utf-8",
      appTag: args.appTag ?? this.cfg.domain
    });

    const ix = buildPrivateMemoInstruction({ senderWallet: args.senderWallet, recipientWallet: args.recipientWallet, pmf1 });

    const tx = new Transaction().add(ix);
    tx.feePayer = args.senderWallet;
    const { blockhash } = await this.cfg.connection.getLatestBlockhash("finalized");
    tx.recentBlockhash = blockhash;

    return { tx, pmf1HashB64: pmf1MemoHashB64(pmf1) };
  }

  /**
   * Build a reveal package for an auditor, using wallet signMessage (no private key access).
   * The recipient (holder of recipient X25519 secret) typically produces the reveal.
   */
  async buildRevealPackage(args: {
    recipientWalletSigner: WalletSignAdapter;
    recipientX25519SecretKey: Uint8Array;
    pmf1: Uint8Array;
    auditorId: string;
    context?: string;
  }): Promise<RPP1Package> {
    const walletPk = args.recipientWalletSigner.getPublicKey();
    if (!walletPk) throw new Error("wallet not connected");

    return await rpp1BuildWithWalletSigner({
      pmf1: args.pmf1,
      recipientX25519SecretKey: args.recipientX25519SecretKey,
      auditorId: args.auditorId,
      context: args.context ?? this.cfg.domain,
      walletPubkey: walletPk,
      signer: args.recipientWalletSigner
    });
  }
}
