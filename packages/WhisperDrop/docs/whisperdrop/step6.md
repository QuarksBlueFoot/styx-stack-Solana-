# Step 6: Relay + Claim Status

## Relay service
`services/whisperdrop-relay/server`
- Append-only JSONL storage (no DB required) for envelopes per recipient public key.
- Poll endpoint supports cursor (`after`) and ack.

## Android
- **Settings**: relay URL, RPC URL, lite claim sink pubkey, escrow program ID.
- **Inbox**: poll relay and auto-decrypt newest envelope.
- **Claim**: status checks
  - Lite: scans recent txs to sink for nullifier string.
  - Escrow: derives campaign PDA + nullifier PDA and calls `getAccountInfo`.

## Next
Step 7 wires actual wallet send/sign flows (MWA / external wallet intent) and hardens status checks.
