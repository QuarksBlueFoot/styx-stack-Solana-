# Publishing Guide - Styx Stack SDK

## Dual Platform Publishing (npm + Maven)

### Prerequisites

**npm Publishing:**
```bash
npm login
# Use your npm account credentials
```

**Maven Publishing (Sonatype Central Portal):**
1. Create account at https://central.sonatype.com
2. Generate a user token (Account → Generate User Token)
3. Generate GPG key: `gpg --gen-key`
4. Upload key: `gpg --keyserver keyserver.ubuntu.com --send-keys YOUR_KEY_ID`
5. Create `~/.gradle/gradle.properties`:
```properties
signing.keyId=YOUR_KEY_ID
signing.password=YOUR_GPG_PASSWORD
signing.secretKeyRingFile=/path/to/secring.gpg
```
6. Set `CENTRAL_PORTAL_TOKEN` as base64(username:password) in GitHub Actions secrets

---

## npm Packages (React Native + Node.js)

### 1. Build All Packages
```bash
cd sps-sdk && pnpm build && cd ..
cd sts-sdk && pnpm build && cd ..
cd styx-sdk && pnpm build && cd ..
cd styx-app-kit && pnpm build && cd ..
cd whisperdrop-sdk && pnpm build && cd ..
```

### 2. Publish to npm
```bash
# Publish each package
cd sps-sdk && npm publish --access public && cd ..
cd sts-sdk && npm publish --access public && cd ..
cd styx-sdk && npm publish --access public && cd ..
cd styx-app-kit && npm publish --access public && cd ..
cd whisperdrop-sdk && npm publish --access public && cd ..
```

---

## Maven Packages (Kotlin/Android)

### 1. Build Kotlin Modules
```bash
cd kotlin

# Build all modules
./gradlew clean build

# Or build individually
./gradlew :styx-envelope:build
./gradlew :styx-android:build
./gradlew :styx-app-kit:build
```

### 2. Publish to Maven Central (Central Portal)
```bash
# Stage all modules locally
./gradlew publishAllPublicationsToLocalStagingRepository

# Or use the automated script:
./publish-maven.ps1 -Version "1.1.0"  # Windows
./publish-portal.sh 1.1.0              # Linux/macOS
```

### 3. Release on Central Portal
1. Login to https://central.sonatype.com
2. Navigate to "Deployments"
3. Find your deployment (nexus.styx)
4. Click "Close" → Wait for validation
5. Click "Release" → Artifacts sync to Maven Central (~2 hours)

---

## Version Management

### Update Versions
```bash
# npm packages
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0

# Kotlin packages (edit build.gradle.kts)
version = "1.0.1"
```

---

## Installation Instructions for Users

### npm/React Native
```bash
npm install @styx-stack/sps-sdk @solana/web3.js
npm install @styx-stack/app-kit react-native
```

### Maven/Kotlin
```kotlin
dependencies {
    implementation("com.styx:styx-app-kit:1.0.0")
    implementation("com.styx:styx-envelope:0.2.4")
}
```

---

## CI/CD Automation (GitHub Actions)

Create `.github/workflows/publish.yml`:
```yaml
name: Publish Packages

on:
  push:
    tags:
      - 'v*'

jobs:
  publish-npm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install
      - run: pnpm build
      - run: pnpm publish -r --access public
        env:
          NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}
  
  publish-maven:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
        with:
          java-version: '17'
      - run: cd kotlin && ./gradlew publishAllPublicationsToLocalStagingRepository
        env:
          CENTRAL_PORTAL_TOKEN: ${{secrets.CENTRAL_PORTAL_TOKEN}}
          SIGNING_KEY: ${{secrets.SIGNING_KEY}}
          SIGNING_PASSWORD: ${{secrets.SIGNING_PASSWORD}}
```

---

## Package Versions

| Package | npm | Maven | React Native | Kotlin |
|---------|-----|-------|--------------|--------|
| sps-sdk | 3.0.0 | N/A | ✅ | N/A |
| sts-sdk | 2.3.0 | N/A | ✅ | N/A |
| styx-sdk | 1.0.0 | N/A | ✅ | N/A |
| styx-app-kit | 1.0.0 | 1.0.0 | ✅ | ✅ |
| styx-envelope | N/A | 0.2.4 | N/A | ✅ (KMM) |
| styx-android | N/A | 1.0.0 | N/A | ✅ |

**KMM = Kotlin Multiplatform Mobile** (iOS + Android + JVM)

---

## Post-Publishing Checklist

- [ ] Verify packages on npm: `npm view @styx-stack/sps-sdk`
- [ ] Verify on Maven Central: https://central.sonatype.com/artifact/com.styx/styx-app-kit
- [ ] Update README.md with new versions
- [ ] Create GitHub Release with changelog
- [ ] Update documentation site
- [ ] Tweet/announce release
- [ ] Test installation in fresh projects:
  - [ ] `npx create-react-native-app test && cd test && npm install @styx-stack/app-kit`
  - [ ] Create Android project and add `implementation("com.styx:styx-app-kit:1.0.0")`
