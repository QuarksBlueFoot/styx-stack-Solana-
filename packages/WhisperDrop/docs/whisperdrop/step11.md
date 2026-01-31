# Step 11: End-to-End Escrow Setup in App (MWA) + Ticket Completeness

## What’s new
### Ticket completeness (Escrow-ready)
Merkle ticket generation now supports a **mint** input and will automatically include:
- `mint` (base58)
- `recipientAta` (derived ATA for recipient + mint)

This makes Escrow claims fully submit-able without manual editing.

### In-app On-Chain Setup (MWA)
Campaign tab now includes:
- **Init Campaign (MWA)**: submits the `initCampaign` instruction using MWA.
- **Deposit (MWA)**: deposits tokens to an escrow ATA derived from (campaign PDA, mint).

Deposit flow:
- Derives escrow ATA = ATA(owner = campaign PDA, mint)
- Creates escrow ATA if missing
- Transfers SPL tokens from payer ATA -> escrow ATA

### Reliability fixes
- Restored missing `Hex.encode()` + `Hex.isHex()` (Merkle builder depended on them).

## Notes
- InitCampaign account metas are built to match the Anchor-style program layout (authority, mint, campaign, escrow, system, token, rent).
- The escrow deposit strategy is compatible with the new rust-native `whisperdrop-escrow-lite` program (Step 10).

## Next (Step 12)
- Add escrow ATA creation for **recipient ATA** inside claim if missing (already included for MWA escrow send).
- Tighten RPC parsing for account existence checks (Helius JSON parsing rather than substring).
- Add “Program Mode” selector to choose anchor vs rust-lite program IDs cleanly.
