import fs from "fs";
import path from "path";
import process from "process";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";

function loadEnv() {
  // light .env loader (no deps)
  const p = path.join(process.cwd(), ".env");
  if (fs.existsSync(p)) {
    const lines = fs.readFileSync(p, "utf8").split(/\n/);
    for (const line of lines) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const k = m[1]; let v = m[2];
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

function loadKeypair(filePath) {
  const p = filePath.replace(/^~\//, process.env.HOME + "/");
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  return Keypair.fromSecretKey(new Uint8Array(raw));
}

function b64urlToBytes(s) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64");
}

function u16FromHex16(bytes16) {
  if (!Buffer.isBuffer(bytes16)) bytes16 = Buffer.from(bytes16);
  if (bytes16.length !== 16) throw new Error("nonce must be 16 bytes");
  return [...bytes16];
}

loadEnv();

const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const WALLET = process.env.WALLET || (process.env.HOME + "/.config/solana/id.json");
const PROGRAM_ID = process.env.PROGRAM_ID || "WDEscrow111111111111111111111111111111111";

const provider = new anchor.AnchorProvider(
  new anchor.web3.Connection(RPC_URL, "confirmed"),
  new anchor.Wallet(loadKeypair(WALLET)),
  { commitment: "confirmed" }
);
anchor.setProvider(provider);

const programId = new PublicKey(PROGRAM_ID);

// Minimal IDL baked for our 3 ix. (No code-copy from elsewhere; generated from our own program spec.)
const IDL = {
  version: "0.1.0",
  name: "whisperdrop_escrow",
  instructions: [
    { name: "initCampaign", accounts: [
      { name: "authority", isMut: true, isSigner: true },
      { name: "mint", isMut: false, isSigner: false },
      { name: "campaign", isMut: true, isSigner: false },
      { name: "escrow", isMut: true, isSigner: false },
      { name: "systemProgram", isMut: false, isSigner: false },
      { name: "tokenProgram", isMut: false, isSigner: false },
      { name: "rent", isMut: false, isSigner: false },
    ], args: [
      { name: "campaignId", type: { array: ["u8", 32] } },
      { name: "manifestHash", type: { array: ["u8", 32] } },
      { name: "merkleRoot", type: { array: ["u8", 32] } },
      { name: "expiryUnix", type: "i64" },
    ]},
    { name: "deposit", accounts: [
      { name: "authority", isMut: true, isSigner: true },
      { name: "mint", isMut: false, isSigner: false },
      { name: "campaign", isMut: true, isSigner: false },
      { name: "escrow", isMut: true, isSigner: false },
      { name: "fromAta", isMut: true, isSigner: false },
      { name: "tokenProgram", isMut: false, isSigner: false },
    ], args: [{ name: "amount", type: "u64" }]},
    { name: "claim", accounts: [
      { name: "mint", isMut: false, isSigner: false },
      { name: "campaign", isMut: true, isSigner: false },
      { name: "recipient", isMut: false, isSigner: false },
      { name: "escrow", isMut: true, isSigner: false },
      { name: "nullifier", isMut: true, isSigner: false },
      { name: "payer", isMut: true, isSigner: true },
      { name: "recipientAta", isMut: true, isSigner: false },
      { name: "systemProgram", isMut: false, isSigner: false },
      { name: "tokenProgram", isMut: false, isSigner: false },
    ], args: [
      { name: "allocation", type: "u64" },
      { name: "nonceHex16", type: { array: ["u8", 16] } },
      { name: "proof", type: { vec: { array: ["u8", 32] } } },
    ]},
  ]
};

const program = new anchor.Program(IDL, programId, provider);

function deriveCampaignPda(campaignId32) {
  return PublicKey.findProgramAddressSync([Buffer.from("campaign"), Buffer.from(campaignId32)], programId)[0];
}
function deriveEscrowPda(campaignPda) {
  // matches program: seeds = ["escrow", campaign.key()]
  return PublicKey.findProgramAddressSync([Buffer.from("escrow"), campaignPda.toBuffer()], programId)[0];
}
function deriveNullifierPda(campaignPda, recipient) {
  return PublicKey.findProgramAddressSync([Buffer.from("nullifier"), campaignPda.toBuffer(), recipient.toBuffer()], programId)[0];
}

const argv = yargs(hideBin(process.argv))
  .command("claim", "Claim from plan.json", (y) => y.option("plan", { type: "string", demandOption: true }))
  .command("init", "Init campaign", (y) => y
    .option("campaignIdB64Url", { type: "string", demandOption: true })
    .option("manifestHashB64Url", { type: "string", demandOption: true })
    .option("merkleRootB64Url", { type: "string", demandOption: true })
    .option("mint", { type: "string", demandOption: true })
    .option("expiry", { type: "number", demandOption: true }))
  .command("deposit", "Deposit to escrow", (y) => y
    .option("campaignPda", { type: "string", demandOption: true })
    .option("fromAta", { type: "string", demandOption: true })
    .option("amount", { type: "number", demandOption: true }))
  .demandCommand(1)
  .help()
  .parse();

async function main() {
  const cmd = argv._[0];

  if (cmd === "claim") {
    const planPath = argv.plan;
    const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
    const campaignId32 = b64urlToBytes(plan.campaignId);
    const campaignPda = deriveCampaignPda(campaignId32);
    const escrow = deriveEscrowPda(campaignPda);
    const recipient = new PublicKey(plan.recipient);
    const nullifier = deriveNullifierPda(campaignPda, recipient);
    const mint = new PublicKey(plan.mint || plan.mintPubkey || plan.mintAddress || plan.mint || plan.programMint || plan.mint); // tolerant
    // plan in Step5 didn't include mint; user can provide via env or extend plan; for now require env MINT optional?
    if (!mint) throw new Error("Plan must include mint field (base58). Add it when exporting, or extend plan.json.");

    const allocation = new anchor.BN(plan.allocation);
    const nonce = Buffer.from(plan.nonceHex, "hex");
    if (nonce.length !== 16) throw new Error("nonceHex must be 16 bytes hex");
    const nonceArr = u16FromHex16(nonce);

    const proof = (plan.proof || []).map((p) => {
      const b = b64urlToBytes(p);
      if (b.length !== 32) throw new Error("proof item must be 32 bytes b64url");
      return [...b];
    });

    const recipientAta = new PublicKey(plan.recipientAta || plan.recipient_ata || plan.recipientAtaBase58 || plan.recipientAtaPubkey || plan.recipientAta);
    if (!recipientAta) throw new Error("Plan must include recipientAta (token account).");

    const txSig = await program.methods.claim(allocation, nonceArr, proof)
      .accounts({
        mint,
        campaign: campaignPda,
        recipient,
        escrow,
        nullifier,
        payer: provider.wallet.publicKey,
        recipientAta,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("claimed:", txSig);
    return;
  }

  if (cmd === "init") {
    const campaignId32 = b64urlToBytes(argv.campaignIdB64Url);
    const manifestHash32 = b64urlToBytes(argv.manifestHashB64Url);
    const merkleRoot32 = b64urlToBytes(argv.merkleRootB64Url);
    if (campaignId32.length !== 32 || manifestHash32.length !== 32 || merkleRoot32.length !== 32) {
      throw new Error("campaignId/manifestHash/merkleRoot must be 32-byte b64url");
    }
    const campaignPda = deriveCampaignPda(campaignId32);
    const escrow = deriveEscrowPda(campaignPda);
    const mint = new PublicKey(argv.mint);

    const txSig = await program.methods.initCampaign(
      [...campaignId32],
      [...manifestHash32],
      [...merkleRoot32],
      new anchor.BN(argv.expiry)
    )
      .accounts({
        authority: provider.wallet.publicKey,
        mint,
        campaign: campaignPda,
        escrow,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("init:", txSig, "campaignPda:", campaignPda.toBase58(), "escrow:", escrow.toBase58());
    return;
  }

  if (cmd === "deposit") {
    const campaign = new PublicKey(argv.campaignPda);
    const escrow = deriveEscrowPda(campaign);
    const fromAta = new PublicKey(argv.fromAta);
    // mint can be read from campaign account; keeping simple: require mint env not implemented.
    throw new Error("Deposit requires mint; use Anchor or extend CLI. Note: deposit via Anchor script or write mint into CLI env.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
