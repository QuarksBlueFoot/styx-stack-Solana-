# Styx Envelope v1 (Binary)

Goal: one small, versioned, future-proof binary payload format used consistently across:

- **Memo Program** (MEMO): carried as UTF-8 string `styx1:<base64url(envelopeBytes)>`
- **Styx Private Memo Program** (PMP): carried as raw instruction bytes
- **Relay** (optional): raw bytes

This avoids “JSON in memos” fatigue and gives us stable decoding, forward compatibility, and consistent message IDs.

## Threat model (truth)

Even with perfect encryption, Solana still leaks:

- fee payer
- timing
- memo/program usage
- payload sizes

Styx v1 minimizes metadata and keeps everything else encrypted.

## Canonical header

All multi-byte integers are little-endian.

| Field | Size | Notes |
|---|---:|---|
| magic | 4 | ASCII `STYX` |
| version | 1 | `0x01` |
| kind | 1 | `1=message, 2=reveal, 3=keybundle` |
| flags | 2 | bitset (see below) |
| algo | 1 | `1=pmf1` |
| id | 32 | message id (default: sha256(body)) |

## Optional header extensions (by flags)

| Flag | Meaning | Bytes |
|---:|---|---:|
| 0 | `toHash` present | 32 |
| 1 | `from` present | 32 |
| 2 | `nonce` present | varbytes |
| 3 | `aad` present | varbytes |
| 4 | `sig` present | varbytes |

### `toHash`

`toHash = sha256(recipient_wallet_pubkey_bytes)`.

This is a **recipient hint** that lets clients filter without publishing the raw recipient address.

### `from`

Optional sender public key hint. Default: **omit** to reduce metadata.

## Varbytes encoding

`varbytes = uvarint(length) || bytes` using unsigned LEB128.

## Body

The `body` field is algorithm-specific. For `pmf1`, `body` is the PMF1 binary payload (nonce + sealed box + metadata), not JSON.

## Memo wire string

`styx1:<b64url(envelopeBytes)>`

- base64url is URL-safe and has **no padding**
- `styx1:` prefix allows fast detection and future versions (`styx2:`)

## Message IDs

Default: `id = sha256(body)`.

Reason: stable, deterministic, cheap; works across Memo/PMP/Relay.

## Compatibility rules

- **v1 decoders must reject trailing bytes** (strict parsing)
- v2+ may introduce new kinds, flags, algos, and allow “extension blocks”

## Reference implementation

See:

- `packages/memo/src/styxEnvelope.ts`
- `packages/crypto-core/src/varint.ts`

## Conformance

Reference vectors live in `vectors/styx-envelope-v1.json` and are verified in TS, Kotlin, and Rust.
