# WhisperDrop Android (Step 3b)

A native Android Kotlin + Jetpack Compose demo app for WhisperDrop.

This app is **fully functional offline** for the Step 3a protocol pieces:
- Build a canonical campaign manifest and compute `manifestHash` (sha256 over canonical JSON)
- Build Merkle root + per-recipient proofs (order-independent internal hashing)
- Verify a claim ticket's Merkle proof locally
- Build the public on-chain commitment memo string:
  `whisperdrop:commitment:v1:<manifestHashB64Url>:<merkleRootB64Url>`

## What this app does NOT do (by design, Step 3c+)
- It does not sign/send Solana transactions (wallet integration is a follow-up step).
- It does not do on-chain encrypted delivery yet (Styx rails integration is Step 4).

## Open & Run
1. Open this folder (`apps/whisperdrop-android`) in Android Studio.
2. Let Gradle sync/download dependencies.
3. Run the `app` configuration on an emulator/device.

> Note: If your environment requires a Gradle wrapper, Android Studio can generate it, or you can use your system Gradle.
> The project is standard Android Gradle Plugin + Kotlin + Compose.

## Screens
- **Campaign**: paste/edit the manifest JSON, compute manifestHash.
- **Merkle**: paste recipients+allocations JSON, generate nonces, compute root + proofs, export tickets JSON.
- **Ticket Verify**: paste a ticket JSON, verify against root.
- **Commitment Memo**: build the commitment memo string.

## Test Plan
See `docs/test-plan.md`.


## Step 4: Encrypted Ticket Delivery (Inbox)
The app includes an **Inbox** tab that:
- Generates an X25519 keypair (stored in SharedPreferences for demo)
- Encrypts a ticket JSON to an EnvelopeV1 JSON
- Decrypts an EnvelopeV1 JSON back into a ticket JSON locally

In Step 5+, the envelope payload is delivered via Styx rails (encrypted memos / relay) instead of copy/paste.


## Step 6: Relay + Claim Status
- Relay service: `services/whisperdrop-relay/server` stores encrypted envelopes and supports polling + ack.
- Android Settings tab configures relay + rpc + claim sink + escrow program id.
- Inbox can poll relay and auto-decrypt.
- Claim status: lite scans sink txs for nullifier; escrow derives nullifier PDA and checks account existence.


## Step 7: Submission Helpers
The Android app does not custody private keys. Instead it helps you submit claims by:
- Copying/sharing the Lite memo + a Solana CLI command template
- Copying/sharing an Anchor CLI command template for escrow claims (see `tests/whisperdrop-escrow-cli`)


## Step 8: In-App Send (Solana Pay)
Lite claims can be submitted by opening a wallet via Solana Pay deep-link (`solana:` URL). The Claim tab includes **Open Wallet (Solana Pay)** which opens a compatible wallet to sign/send the memo transfer.


## Step 9: In-App Send (MWA)
Lite claims can be sent directly through a Mobile Wallet Adapter compatible wallet. The Claim tab includes **Send In-App (MWA)** which builds a real transfer+memo transaction, requests wallet signing, and returns the signature.


## Step 10: Escrow In-App Send (MWA)
Escrow claims can now be submitted in-app via Mobile Wallet Adapter. Use Escrow mode, paste a ticket that includes campaignId+mint+recipient, press **Build Claim Output**, then press **Send In-App (MWA)**.


## Step 11: In-App Escrow Setup
- Merkle ticket generation accepts a mint and exports tickets that include `mint` + `recipientAta`.
- Campaign screen can now **Init Campaign (MWA)** and **Deposit (MWA)** to escrow ATA.
