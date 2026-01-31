# WhisperDrop

WhisperDrop is a privacy-preserving, provably-fair distribution system:

- **Fairness is public**: creators publish a campaign manifest and commit to a Merkle root on-chain.
- **Eligibility is private**: eligible users receive claim tickets off-list (delivered later in Step 3b).
- **Users are credited for activity** (verifiable actions), not name, status, or social rank.

This directory contains the protocol specification, runnable test plan, and tooling guidance.

## Step 3a contents

Step 3a ships the protocol primitives and commitment tooling:

- Canonical manifest hashing (`manifestHash`)
- Merkle root construction and inclusion proofs (`merkleRoot`, per-leaf proofs)
- On-chain commitment memo format and instruction builder

Code lives in `packages/whisperdrop-kit`.

## Quick start

Build the workspace:

```bash
pnpm install
pnpm build
```

Run the whisperdrop kit selftest:

```bash
pnpm -C packages/whisperdrop-kit build
pnpm -C packages/whisperdrop-kit test
```

Generate a manifest hash (CLI):

```bash
pnpm -C cli/styx build
node cli/styx/dist/index.js whisperdrop manifest-hash examples/whisperdrop/manifest.sample.json
```

Build merkle root + proofs (CLI):

```bash
node cli/styx/dist/index.js whisperdrop merkle-build --campaign demo-campaign-001 examples/whisperdrop/leaves.sample.json
```

Build commitment memo (CLI):

```bash
node cli/styx/dist/index.js whisperdrop commitment-memo --manifest examples/whisperdrop/manifest.sample.json --merkle-root <MERKLE_ROOT_B64URL>
```

## Next step (3b)

Step 3b delivers the Android-native demo app flow:

- Create Campaign (manifest)
- Receive Claim Ticket (private)
- Verify proof locally
- Build claim transaction (memo-claim for production)



## Android Demo App (Step 3b)
See `apps/whisperdrop-android/` for a Kotlin + Compose demo that computes manifestHash, builds Merkle roots/proofs, verifies tickets, and formats commitment memos offline.


## Step 4: Private Ticket Delivery
See `apps/whisperdrop-android/` Inbox tab for EnvelopeV1 encryption/decryption. This maps onto Styx rails (encrypted memos/relay) in Step 5.
