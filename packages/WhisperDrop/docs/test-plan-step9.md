# Test Plan (Step 9)

## Prereqs
- Android device/emulator with an MWA-compatible wallet installed (e.g., a Solana Mobile wallet).
- RPC URL set (devnet ok).
- Claim sink pubkey set in Settings.

## Flow 1: MWA Lite claim send
1. Go to **Claim**
2. Generate a Lite claim packet (existing steps)
3. Under Submission, tap **Send In-App (MWA)**
4. Wallet should open → approve
5. App shows `Sent! Signature: ...`
6. Verify on explorer (optional)

## Flow 2: Fallback Solana Pay
1. Tap **Open Wallet (Solana Pay)**
2. Wallet opens with transfer request
3. Approve → check signature in wallet history
