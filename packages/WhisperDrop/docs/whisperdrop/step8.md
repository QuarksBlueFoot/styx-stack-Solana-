# Step 8: Solana Mobile “In-App Send” (Wallet-driven)

We implement a wallet-driven submission flow using **Solana Pay deep-links**.
This avoids embedding private keys, works across many wallets, and is production-proof.

## Lite Claim (Option A)
- Build claim packet in Android
- Tap **Open Wallet (Solana Pay)**
- Wallet opens with a pre-filled transfer to the claim sink including memo

The app also copies the Solana Pay URL to clipboard for debugging.

## Escrow Claim (Option B)
Escrow submission remains via the shipped Anchor CLI client in Step 7.
Step 9 can add a full Mobile Wallet Adapter (MWA) session flow to sign arbitrary transactions in-app.

## Why Solana Pay first
- Lowest integration friction
- Most wallet compatibility
- Keeps WhisperDrop non-custodial
