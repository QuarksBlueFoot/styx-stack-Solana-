# Step 7: Transaction Submission (without embedding keys)

Goal: make WhisperDrop demo-able on real networks while keeping the Android app free of private-key custody.

## Lite (Option A) submission
- Use the Claim tab to generate a Lite Claim Packet.
- The app can copy/share a Solana CLI command:
  - `solana transfer <sink> 0.000005 --with-memo "<memo>"`

This anchors the claim publicly and enables best-effort nullifier scanning.

## Escrow (Option B) submission
- Use the Claim tab to generate an Escrow Claim Plan JSON.
- Save plan JSON to a file and run the included Anchor client:
  - `pnpm -C tests/whisperdrop-escrow-cli wd:claim --plan plan.json`

## Why this design
- Production-safe: no private keys stored in app.
- Mobile-native UX still helps by producing deterministic payloads and commands.
- Step 8 wires MWA wallet signing for full in-app submission.


### Escrow Plan requirements
For on-chain escrow claim submission, the plan JSON must include:
- `mint` (token mint pubkey base58)
- `recipientAta` (recipient token ATA base58)

Step 8 will auto-derive ATA in-app once mint is known.
