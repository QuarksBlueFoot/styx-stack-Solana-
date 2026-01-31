# Step 10: Full In-App Escrow Claim (MWA) + Cheaper Rust Program

## Android: Escrow claim via MWA
- Claim tab (Escrow) now includes **Send In-App (MWA)**.
- Builds Anchor-style `claim` instruction data and submits via Mobile Wallet Adapter.
- Requires ticket fields:
  - `campaignId` (32-byte base64url)
  - `mint` (base58)
  - `recipient` (base58)
- Requires you to press **Build Claim Output** first (to produce allocation/nonce/proof).

## Program: whisperdrop-escrow-lite
- Native Solana program in Rust (no Anchor) with smaller binary footprint.
- Keeps the same PDA seeds as the client for compatibility.
- Deposit is done off-program by transferring tokens into the escrow token account controlled by the campaign PDA.

## Next
Step 11: finalize escrow ATA creation flow (if missing), and make ticket generation always include `mint` + derived `recipientAta`.
