# Reveal & Audit Flows (Selective Disclosure)

Styx is a **compliant privacy stack**: we ship strong privacy primitives *and* the hooks teams need to ship responsibly.

Truth-in-advertising:
- On Solana L1, **fees, payer, timing, and payload sizes are public**.
- With the Memo program, **ciphertext is public**.
- “Privacy” here means: strong encryption + minimizing metadata + optional selective disclosure.

This doc defines how selective disclosure works for on-chain messages.

## Concepts

### Message envelope
Messages are carried as a **Styx Envelope v1** (binary). See `docs/STYX_ENVELOPE_V1.md`.

### Reveal envelope
A reveal is another Styx envelope (`kind = reveal`) whose `body` is a small binary structure:

`RVL1 | v(1) | type | msgId(32) | data(varbytes)`

Types:
- `recipient`: disclose the intended recipient pubkey (useful if you hid it / used only hashes)
- `contentKey`: disclose the symmetric key for an attachment or a message batch
- `app`: application-defined disclosure (e.g., game state explanation)

## Why reveals exist

- **Compliance / abuse response**: a user can opt-in to disclose a specific message to a moderator.
- **Dispute resolution**: prove you sent a particular message without revealing your entire history.
- **Enterprise adoption**: “selective reveal” is how privacy tooling becomes deployable.

## Signing model

Styx never assumes custody of wallet keys.

Instead:
1. The SDK prepares an unsigned reveal envelope and returns `envelopeBytesToSign`.
2. Your app asks the wallet to sign those bytes (ed25519).
3. The SDK attaches the detached signature into the envelope (`sig` field) and produces the final memo/program instruction.

This is compatible with Solana Mobile Stack / MWA and “Solana Kit” style flows.

## Audit flows

An “audit” is just a reveal where `type = contentKey` (or `app`) and the receiver is a designated auditor.

Typical flow:
1. Sender encrypts message.
2. Sender shares the encrypted message on-chain.
3. If needed later, sender publishes a signed reveal that discloses **only**:
   - the content key (or recipient)
   - the target message id

Auditors can verify:
- The reveal is valid Styx envelope.
- The signature matches the revealer.
- The reveal references a known message id.

## Limits

Selective disclosure does not make L1 metadata private. It only adds a controlled “escape hatch” for specific messages.

## API (tooling)

See `packages/onchain-messaging/src/reveal.ts`:
- `prepareRevealEnvelope()`
- `attachSignature()`
- `buildRevealMemoInstruction()`
- `tryDecodeRevealMemo()`
