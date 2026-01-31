# Styx Doctor

`styx doctor` is a quick sanity check for projects integrating Styx.

It is intentionally **best-effort**: it checks common missing pieces and prints actionable guidance.

## Run

```bash
pnpm styx doctor
pnpm styx doctor --json
```

## Checks (current)

- Node.js baseline (>= 18)
- `package.json` present (run from app root)
- `@solana/web3.js` installed
- Wallet integration present (MWA or wallet-adapter) *(warn)
- Secure storage present (Keychain/Keystore) *(warn)
- Crash reporting redaction reminder
- Styx packages detected *(warn)

## Why

On mobile, missing **just one** of these usually becomes:

- flaky tx send flows,
- missing inbox state,
- or accidental secret leakage in logs.

Doctor makes the failure mode “printable” instead of “two days on Discord.”
