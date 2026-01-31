# Changelog

## 0.0.54 - 2026-01-24

### Added
- Step 11: In-app campaign init + escrow deposit via Mobile Wallet Adapter (MWA).
- Merkle ticket generator now includes mint + derived recipient ATA for escrow-ready tickets.
- SPL token transfer + ATA create helpers for wallet-driven deposit.
- Fixed missing Hex utilities used by merkle builder.


## 0.0.53 - 2026-01-24

### Added
- Step 9: Mobile Wallet Adapter (MWA) Lite claim signing + in-app send (transfer + memo in one transaction).
- Solana Mobile Kotlin deps (MWA clientlib, web3-solana, rpc-core stack).
- `MwaClient` transaction builder and sender + UI hook on Claim screen.


## 0.0.52 - 2026-01-23

### Added
- Step 8: Solana Pay “in-app send” for Lite claims (opens compatible wallet to sign/send a transfer with memo).
- `SolanaPay` URL builder and clipboard + launch flow from the Claim tab.
- Step 8 documentation.


## 0.0.51 - 2026-01-23

### Added
- Step 7: submission helpers in Android Claim tab (copy/share memo + CLI command templates).
- `tests/whisperdrop-escrow-cli`: Anchor-based CLI client to submit escrow claims from an exported plan JSON.
- Docs for Step 7 submission flows without embedding private keys.

### Notes
- Escrow claim plan now supports `mint` and `recipientAta` fields (may be blank until Step 8 derives automatically).

## 0.0.50 - 2026-01-23

### Added
- Step 6 relay service (`services/whisperdrop-relay/server`) for envelope delivery with poll + ack.
- Android Settings tab (relay URL, RPC URL, lite claim sink pubkey, escrow program ID).
- Android Inbox relay polling + auto-decrypt.
- Claim status checks (lite memo scan; escrow nullifier PDA existence).


## 0.0.49 - 2026-01-23

### Added
- Step 5: Claim options (A/B) exposed in Android app (`Claim` tab) with local proof verification.
- Step 5A: Lite claim packet generator (nullifier + `whisperdrop:claim:lite` memo) for submission via any wallet.
- Step 5B: Escrow claim plan generator + fully implemented Anchor program `programs/whisperdrop-escrow/` enforcing Merkle proofs + nullifiers and paying out from escrow.

### Notes
- No cross-chain privacy hops are included. Privacy is achieved via encrypted ticket delivery + unlinkable claim methods.

## 0.0.48 - 2026-01-21

### Added
- WhisperDrop Step 4: Android Inbox with X25519 keypair generation and envelope encryption/decryption (HKDF-SHA256 + AES-GCM) for private claim ticket delivery.


## 0.0.47 - 2026-01-21

### Added
- `apps/whisperdrop-android/`: Kotlin + Jetpack Compose demo app for WhisperDrop Step 3b (offline manifest hash, Merkle build/proofs, ticket verification, commitment memo formatting).
- Android test plan and sample inputs under `apps/whisperdrop-android/docs/` and `apps/whisperdrop-android/examples/`.


All notable changes to this repository are documented in this file.

## 0.0.46 - 2026-01-20

### Added
- WhisperDrop Step 3a protocol tooling:
  - `@styx/whisperdrop-kit` with canonical manifest hashing, Merkle root + proofs, and commitment memo builders.
  - WhisperDrop protocol docs in `docs/whisperdrop/`.
  - Sample inputs in `examples/whisperdrop/`.

### Changed
- CLI: added `whisperdrop` commands to generate manifest hashes, build Merkle proofs, and construct commitment memos.

