# WhisperDrop Test Plan (Step 3a)

This test plan verifies correctness of the protocol primitives and commitment tooling.

## Smoke tests

1. Build workspace:

```bash
pnpm install
pnpm build
```

2. Run kit selftest:

```bash
pnpm -C packages/whisperdrop-kit build
pnpm -C packages/whisperdrop-kit test
```

Expected: prints `ok` and exits 0.

## Critical path checks (top 3 flows)

### 1) Deterministic manifest hashing
- Run CLI `manifest-hash` twice.
- Expected: identical base64url output.

### 2) Merkle root and proof verification
- Build merkle output from sample leaves.
- For each leaf, verify using kit verifier.
- Expected: all proofs validate to the returned root.

### 3) Commitment memo format
- Generate commitment memo string.
- Expected: prefix matches `whisperdrop:commitment:v1:` and includes 2 base64url tokens.

## Edge cases

- Allocation not a base-10 integer string -> reject
- Nonce length not 32 hex chars -> reject
- Empty campaignId or recipient -> reject
- Single-leaf merkle tree -> root equals leaf hash

