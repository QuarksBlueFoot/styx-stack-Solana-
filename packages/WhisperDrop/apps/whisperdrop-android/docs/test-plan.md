# WhisperDrop Android Test Plan (Step 3b)

## Smoke
1. App launches on emulator/device.
2. Navigate between all 4 tabs (Campaign, Merkle, Verify, Memo). No crashes.

## Critical Path 1: Manifest Hash
1. Go to Campaign.
2. Paste `examples/manifest.sample.json` (from this folder).
3. Tap **Compute Hash**.
4. Confirm output is non-empty and stable:
   - Tap multiple times, output doesn't change.
   - Modify any manifest field, output changes.

## Critical Path 2: Merkle Build + Ticket Export
1. Go to Merkle.
2. Paste `examples/leaves.sample.json`.
3. Tap **Generate Nonces & Build Merkle**.
4. Confirm:
   - Root is non-empty.
   - Tickets export JSON is non-empty.
   - Each ticket contains `proof` array and `nonceHex`.

## Critical Path 3: Verify Ticket
1. Copy a single exported ticket JSON.
2. Go to Verify.
3. Paste that ticket.
4. Tap **Verify**.
5. Expect `VALID`.
6. Edit allocation slightly, verify should become `INVALID`.

## Edge Cases
- Empty leaves: should show error.
- Very large JSON: should show error (safety limits).
- Non-hex nonce: error.
- Invalid base64url hash: error.

## Performance
- 2k leaves should complete within a couple seconds on a modern phone.
