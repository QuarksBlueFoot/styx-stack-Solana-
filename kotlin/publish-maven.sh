#!/bin/bash
# ╔══════════════════════════════════════════════════════════════╗
# ║        Styx Kotlin SDK - Maven Central Publishing            ║
# ╚══════════════════════════════════════════════════════════════╝
#
# Run with: ./publish-maven.sh
# Or trigger via GitHub Actions workflow_dispatch

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           Styx SDK Maven Central Publishing Script           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check for required environment variables
if [ -z "$OSSRH_USERNAME" ] || [ -z "$OSSRH_PASSWORD" ]; then
    echo "❌ Error: OSSRH_USERNAME and OSSRH_PASSWORD environment variables required"
    echo "   Set them with:"
    echo "   export OSSRH_USERNAME=your-username"
    echo "   export OSSRH_PASSWORD=your-password"
    exit 1
fi

if [ -z "$SIGNING_KEY_ID" ] || [ -z "$SIGNING_PASSWORD" ]; then
    echo "❌ Error: SIGNING_KEY_ID and SIGNING_PASSWORD environment variables required"
    echo "   Set them with:"
    echo "   export SIGNING_KEY_ID=your-key-id"
    echo "   export SIGNING_PASSWORD=your-signing-password"
    exit 1
fi

# Version from environment or default
VERSION=${PUBLISH_VERSION:-"1.0.0"}
echo "📦 Publishing version: $VERSION"

echo ""
echo "📋 Step 1: Clean build"
./gradlew clean

echo ""
echo "📋 Step 2: Build all modules"
./gradlew build

echo ""
echo "📋 Step 3: Publish styx-android to Maven Central"
./gradlew :styx-android:publishReleasePublicationToOSSRHRepository \
    -Pversion=$VERSION \
    -Psigning.keyId=$SIGNING_KEY_ID \
    -Psigning.password=$SIGNING_PASSWORD \
    -Psigning.secretKeyRingFile=$HOME/.gnupg/secring.gpg \
    -PossrhUsername=$OSSRH_USERNAME \
    -PossrhPassword=$OSSRH_PASSWORD

echo ""
echo "📋 Step 4: Publish styx-app-kit to Maven Central"
./gradlew :styx-app-kit:publishReleasePublicationToOSSRHRepository \
    -Pversion=$VERSION \
    -Psigning.keyId=$SIGNING_KEY_ID \
    -Psigning.password=$SIGNING_PASSWORD \
    -Psigning.secretKeyRingFile=$HOME/.gnupg/secring.gpg \
    -PossrhUsername=$OSSRH_USERNAME \
    -PossrhPassword=$OSSRH_PASSWORD

echo ""
echo "📋 Step 5: Publish styx-envelope to Maven Central"
./gradlew :styx-envelope:publishMavenPublicationToOSSRHRepository \
    -Pversion=$VERSION \
    -Psigning.keyId=$SIGNING_KEY_ID \
    -Psigning.password=$SIGNING_PASSWORD \
    -Psigning.secretKeyRingFile=$HOME/.gnupg/secring.gpg \
    -PossrhUsername=$OSSRH_USERNAME \
    -PossrhPassword=$OSSRH_PASSWORD

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    ✅ PUBLISH COMPLETE                       ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Next steps:                                                 ║"
echo "║  1. Go to https://central.sonatype.com                      ║"
echo "║  2. Login with your OSSRH credentials                       ║"
echo "║  3. Go to 'Staging Repositories' / 'Deployments'            ║"
echo "║  4. Find your staged repository (nexus.styx)                ║"
echo "║  5. Click 'Close' then 'Release'                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
