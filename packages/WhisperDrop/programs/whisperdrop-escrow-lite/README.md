# whisperdrop-escrow-lite (Rust-native, no Anchor)

Goal: a smaller deployment footprint than Anchor, while preserving WhisperDrop's core properties:
- Merkle-proof claim
- Nullifier one-time claim
- Escrow token account owned by campaign PDA
- Token transfer via CPI + PDA signer

## Build
Requires Solana toolchain:
```bash
cargo build-sbf
```

## Seeds (must match clients)
- campaign PDA: `["campaign", campaign_id_32]`
- escrow PDA: `["escrow", campaign_pda]`
- nullifier PDA: `["nullifier", campaign_pda, recipient_pubkey]`

## Instructions
- `InitCampaign { campaign_id, manifest_hash, merkle_root, mint, expiry_unix, authority }`
- `Claim { allocation, nonce16, proof[] }`

Deposit is done off-program by transferring tokens into the escrow token account whose **owner is the campaign PDA**.
