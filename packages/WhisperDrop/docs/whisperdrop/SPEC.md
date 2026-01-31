# WhisperDrop Protocol Spec (v1)

WhisperDrop provides **provably-fair, activity-based credits** while keeping the eligible set private by default.

## Definitions

- **Manifest**: canonical JSON document describing campaign rules and snapshot.
- **manifestHash**: SHA-256 hash of canonical manifest JSON (base64url).
- **Leaf**: (campaignId, recipient, allocation, nonce) encoded deterministically.
- **merkleRoot**: SHA-256 Merkle root over leaf hashes using order-independent parents.
- **Commitment**: public on-chain memo anchoring `manifestHash` and `merkleRoot`.

Fairness property: the creator cannot change rules or eligibility after publishing the commitment without changing the `manifestHash` or `merkleRoot`.

## Manifest (whisperdrop.manifest.v1)

Canonical JSON rules:

- Object keys sorted lexicographically
- Arrays preserve order
- Undefined values omitted (JSON.stringify behavior)

Hash:

- `manifestHash = sha256(utf8(canonicalJson(manifest)))`
- Encode as base64url (no padding)

See `packages/whisperdrop-kit/src/types.ts`.

## Leaf encoding

String format:

`wdleaf1|<campaignId>|<recipient>|<allocation>|<nonceHex>`

Notes:

- `allocation` is a base-10 integer string (smallest unit)
- `nonceHex` is 16 bytes encoded as 32 lowercase hex characters
- `recipient` is treated as an opaque string (often base58 pubkey)

Leaf hash:

`leafHash = sha256(utf8(leafString))`

## Merkle tree

Tree construction:

- Leaves are in the creator-defined order.
- If a level has an odd count, the last hash is duplicated.

Parent hash is **order-independent**:

- `parent = sha256(min(a,b) || max(a,b))` where `min/max` are lexicographic byte order

Proof:

- Proof is a list of sibling hashes (base64url)
- Direction is unnecessary because parent hashing is order-independent

Verification:

- Start with `leafHash`
- For each sibling: `acc = sha256(min(acc,sib)||max(acc,sib))`
- Final `acc` must equal `merkleRoot`

## On-chain commitment memo

Memo string:

`whisperdrop:commitment:v1:<manifestHashB64Url>:<merkleRootB64Url>`

Creators anchor this memo on-chain (SPL Memo program) to provide a public commitment.

Instruction builder is provided by `buildCommitmentMemoIx()`.

## Security notes

- Nonce is required for replay resistance of claim tickets (delivered privately in Step 3b).
- Commitments are public; do not include the eligible list on-chain.
- Validation must reject malformed allocations and nonces.

