# Styx Envelope (Kotlin)

Tooling-only Kotlin/JVM implementation of **Styx Envelope v1**, matching the canonical TypeScript encoder in `@styx/memo`.

This is meant for **Solana Mobile / Android native** stacks that want to:
- encode encrypted payloads for Memo / Private Memo Program / Relay
- decode inbox messages locally

## What’s in here
- `StyxEnvelopeV1.encode(env)` / `StyxEnvelopeV1.decode(bytes)`
- `Base64Url` helpers
- JUnit vectors test pinned to `vectors/styx-envelope-v1.json`

## Usage

```kotlin
import com.styx.envelope.Base64Url
import com.styx.envelope.StyxEnvelopeV1

val env = StyxEnvelopeV1.Env(
  v = 1,
  kind = StyxEnvelopeV1.Kind.message,
  algo = StyxEnvelopeV1.Algo.pmf1,
  id = Base64Url.decode("...") ,
  body = Base64Url.decode("...")
)

val bytes = StyxEnvelopeV1.encode(env)
val parsed = StyxEnvelopeV1.decode(bytes)
```

## Notes
- This module intentionally does **not** implement encryption itself.
- Use it as the binary container for encrypted payloads produced by your chosen rail.
