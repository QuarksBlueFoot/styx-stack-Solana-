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

---

## Publishing to Maven Central

### Automated (Recommended)

```powershell
# Windows
.\publish-maven.ps1 -Version "1.0.0"

# Linux/macOS
./publish-maven.sh 1.0.0
```

Or trigger manually via GitHub Actions:
```bash
gh workflow run publish-maven.yml -f version="1.0.0"
```

### Post-Publish Steps

Publishing uses the **Sonatype Central Portal API**. The CI workflow handles:
1. Build & sign all modules
2. Stage artifacts locally
3. Bundle into a ZIP
4. Upload to Central Portal

If `publishingType = USER_MANAGED`:
- Go to https://central.sonatype.com
- Login with your Central Portal credentials
- Find your deployment and click **Publish**

If `publishingType = AUTOMATIC`:
- Auto-released after validation passes

### Verify Publication

```bash
# Check Maven Central
curl https://repo1.maven.org/maven2/nexus/styx/styx-android/1.0.0/styx-android-1.0.0.pom
```

---

## Installation

### Maven Central (after release)
```gradle
implementation("nexus.styx:styx-android:1.0.0")
implementation("nexus.styx:styx-app-kit:1.0.0")
implementation("nexus.styx:styx-envelope:1.0.0")
```

### GitHub Packages
```gradle
repositories {
    maven {
        url = uri("https://maven.pkg.github.com/QuarksBlueFoot/styx-stack-Solana-")
        credentials {
            username = project.findProperty("gpr.user") ?: System.getenv("GITHUB_ACTOR")
            password = project.findProperty("gpr.key") ?: System.getenv("GITHUB_TOKEN")
        }
    }
}

dependencies {
    implementation("nexus.styx:styx-android:1.0.0")
}
```

---

## Secrets Configuration

GitHub Actions requires these secrets:

| Secret | Description |
|--------|-------------|
| `GPG_SIGNING_KEY` | ASCII-armored GPG private key (base64) |
| `GPG_KEY_ID` | Short key ID (e.g., `064E2E93`) |
| `GPG_PASSPHRASE` | GPG key passphrase |
| `CENTRAL_PORTAL_TOKEN` | base64(username:password) from central.sonatype.com |
