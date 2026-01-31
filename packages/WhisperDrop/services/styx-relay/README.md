# Styx Relay (Optional Service)

This folder is **not** part of the core Styx SDK tooling packages.

It contains a minimal, self-hostable **relay program** + client helpers that any operator can deploy/run.
The relay is designed to:

- accept an encrypted payload envelope (bytes)
- charge an explicit fee (lamports or SPL token, client-side) to a treasury
- emit the envelope on-chain (logs) so inbox/indexers can discover it

**Privacy reality check:** anything posted on-chain is public bytes. Privacy comes from **encryption + key management**, not from hiding that a transaction happened.

## What this is
- A tiny on-chain program that:
  - validates input size
  - transfers lamports from payer -> treasury via CPI to System Program
  - logs the payload with `sol_log_data` for discovery

## What this is not
- Not a backend.
- Not a custodial relayer.
- Not a privacy mixer.

## Build

```bash
cd services/styx-relay/program
cargo build-sbf
```

## Use

Use the TS helper in `services/styx-relay/client` to build a relay instruction and include it in the same transaction as your memo/message.
