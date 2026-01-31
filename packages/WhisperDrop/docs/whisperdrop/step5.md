# Step 5: Claim Options (A + B)

## Option A: Lite Claim (No Program)
- App generates a claim memo containing a nullifier.
- User submits memo via any wallet (tiny SOL transfer + memo).
- Double-claim prevention is best-effort by scanning for same nullifier.

## Option B: Escrow Claim (Program)
- Anchor program `programs/whisperdrop-escrow/` holds tokens in escrow.
- Claim validates Merkle proof + nullifier PDA.
- Transfers allocation from escrow to recipient ATA.

## What we shipped in Step 5
- Android Claim screen with method selector and local proof verification.
- Lite claim packet generator (memo + nullifier).
- Escrow claim plan generator.
- Fully implemented Anchor escrow program source.
