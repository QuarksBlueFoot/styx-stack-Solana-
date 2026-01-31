# whisperdrop-escrow-cli (Step 7)

Anchor-based CLI client for the Step 5B escrow program.

## Setup
```bash
cd tests/whisperdrop-escrow-cli
pnpm install
cp .env.example .env
```

## Commands
### Claim from a plan JSON
```bash
pnpm wd:claim --plan plan.json
```

### Init campaign (advanced)
```bash
pnpm wd:init --campaignIdB64Url <32-byte-b64url> --manifestHashB64Url <32-byte-b64url> --merkleRootB64Url <32-byte-b64url> --mint <MINT_PUBKEY> --expiry <unix>
```

### Deposit
```bash
pnpm wd:deposit --campaignPda <campaignPdaBase58> --fromAta <tokenAta> --amount <u64>
```

## Notes
- Reads env: `RPC_URL`, `WALLET`, `PROGRAM_ID`
- You must deploy the program ID you use (or keep the placeholder for localnet demos).
