# Styx Kotlin Modules (Mobile-First)

These modules are **tooling libraries** intended to be dropped into Android / Solana Mobile Stack projects.

- No wallet UI
- No backend required
- Clean-room implementation

## Modules

### `styx-envelope`
A versioned, future-proof binary envelope used across Styx for:
- encrypted memos
- on-chain messaging payloads
- selective-reveal / audit bundles

Build & test:

```bash
cd kotlin/styx-envelope
./gradlew test
```

Usage:

```kotlin
import com.styx.envelope.StyxEnvelopeV1
import com.styx.envelope.Base64Url

val env = StyxEnvelopeV1(kind = 1, header = "{}".encodeToByteArray(), body = ciphertext)
val bytes = env.encode()
val b64 = Base64Url.encode(bytes)
```
