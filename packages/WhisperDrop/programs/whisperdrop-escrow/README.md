# whisperdrop-escrow (Step 5B)

Anchor program implementing escrow-backed WhisperDrop claims:
- Campaign PDA stores: `manifest_hash`, `merkle_root`, `mint`, `expiry`
- Escrow token account PDA holds claim pool
- Claims verify Merkle proofs and enforce one-time claim via Nullifier PDA
- Transfers allocation from escrow to recipient ATA

## Build
Requires Solana + Anchor installed.

```bash
anchor build
```

## Notes
- Merkle parents are order-independent: sha256(min||max)
- On-chain leaf hashing uses binary-friendly encoding:
  sha256(b"wdleaf1" || campaignId[32] || recipientPubkey[32] || allocationLE64 || nonce16)
