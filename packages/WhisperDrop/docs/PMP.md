# Styx Private Memo Program (PMP)

PMP is a **minimal, stateless** Solana program that lets apps publish **opaque bytes** (encrypted envelopes)
without the SPL Memo program's UTF-8 constraint.

This is **tooling + a small on-chain lego brick**, not an app.

## Why PMP exists

- **SPL Memo** requires UTF-8 strings. If you want to post raw bytes (or avoid large base64 strings),
  you need a program that can accept bytes.
- PMP **does not provide privacy by itself**. Privacy comes from **client-side encryption** (Styx Envelope).

## Wire format: PMP1 (post_envelope)

`instruction_data`:

| Field | Type | Notes |
|---|---:|---|
| tag | u8 | `1` = post_envelope |
| flags | u8 | reserved (0 for now) |
| has_recipient | u8 | 0 or 1 |
| recipient | [u8;32] | optional recipient pubkey bytes |
| payload_len | u16 LE | length of payload bytes |
| payload | [u8] | opaque bytes (e.g., Styx Envelope v1) |

Program behavior:
- validates lengths
- logs a short marker line
- emits `sol_log_data([payload])`

## Client usage

Use `@styx/private-memo-program-client`:

```ts
import { buildPmpPostMessageIx } from "@styx/private-memo-program-client";

// payload should typically be Styx Envelope v1 bytes
const ix = buildPmpPostMessageIx({
  sender,
  recipient,     // optional
  flags: 0,
  payload: envelopeBytes,
});
```

## Priority messaging

For “priority” / “loud” messages, just add a **separate transfer** instruction (SOL or SPL) to your chosen
destination before the PMP instruction. PMP stays minimal.

## Deployment

This repo intentionally ships a clean-room program source under:

- `programs/styx-private-memo-program`

When you deploy, update the program id in the TS client package constant:
- `packages/private-memo-program-client/src/index.ts`
