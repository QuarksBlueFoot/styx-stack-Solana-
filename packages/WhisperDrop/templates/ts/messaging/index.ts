import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createDefaultRailAdapters, buildWithRailSelection } from "@solana-privacy/tx-tooling";

/**
 * Golden path: encrypted messaging in < 30 minutes.
 *
 * 1) Choose rails: PMP first, then encrypted memo fallback.
 * 2) Build tx with the selected rail.
 * 3) Sign and send with your wallet adapter.
 */
async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Replace with your wallet public keys (NO private keys in templates).
  const senderWallet = new PublicKey("Sender1111111111111111111111111111111111111");
  const recipientWallet = new PublicKey("Recip11111111111111111111111111111111111111");

  const adapters = createDefaultRailAdapters();

  const result = await buildWithRailSelection({
    adapters,
    ctx: { network: "devnet", mobile: true, ctAvailable: false },
    preferred: ["private-memo-program", "encrypted-memo"],
    buildArgs: {
      connection,
      senderWallet,
      recipientWallet,
      plaintext: "hello from Styx",
      tag: "demo"
    }
  });

  console.log("Built:", result);
}

main().catch(console.error);
