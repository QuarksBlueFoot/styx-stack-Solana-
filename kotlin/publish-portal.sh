#!/bin/bash
# ╔══════════════════════════════════════════════════════════════╗
# ║     Styx Kotlin SDK - Central Portal API Publishing          ║
# ╚══════════════════════════════════════════════════════════════╝
#
# Publishes to Maven Central via the new Central Portal API
# Run with: ./publish-maven.sh

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           Styx SDK Central Portal Publishing Script          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check for required environment variables
if [ -z "$CENTRAL_USERNAME" ] || [ -z "$CENTRAL_PASSWORD" ]; then
    echo "❌ Error: CENTRAL_USERNAME and CENTRAL_PASSWORD environment variables required"
    exit 1
fi

if [ -z "$SIGNING_KEY_ID" ] || [ -z "$SIGNING_PASSWORD" ]; then
    echo "❌ Error: SIGNING_KEY_ID and SIGNING_PASSWORD environment variables required"
    exit 1
fi

# Version from environment or default
VERSION=${PUBLISH_VERSION:-"1.0.0"}
NAMESPACE="nexus.styx"
BUNDLE_DIR="build/central-bundle"
BUNDLE_FILE="build/styx-bundle-${VERSION}.zip"

echo "📦 Publishing version: $VERSION"
echo "📦 Namespace: $NAMESPACE"

echo ""
echo "📋 Step 1: Clean"
./gradlew clean

echo ""
echo "📋 Step 2: Build all modules"
./gradlew build

echo ""
echo "📋 Step 3: Publish to local staging directory"
rm -rf $BUNDLE_DIR
mkdir -p $BUNDLE_DIR

# Publish each module to local directory
./gradlew :styx-android:publishReleasePublicationToLocalStagingRepository \
    -Pversion=$VERSION \
    -Psigning.keyId=$SIGNING_KEY_ID \
    -Psigning.password=$SIGNING_PASSWORD \
    -Psigning.secretKeyRingFile=$HOME/.gnupg/secring.gpg \
    -PlocalStagingDir=$BUNDLE_DIR

./gradlew :styx-app-kit:publishReleasePublicationToLocalStagingRepository \
    -Pversion=$VERSION \
    -Psigning.keyId=$SIGNING_KEY_ID \
    -Psigning.password=$SIGNING_PASSWORD \
    -Psigning.secretKeyRingFile=$HOME/.gnupg/secring.gpg \
    -PlocalStagingDir=$BUNDLE_DIR

./gradlew :styx-envelope:publishMavenPublicationToLocalStagingRepository \
    -Pversion=$VERSION \
    -Psigning.keyId=$SIGNING_KEY_ID \
    -Psigning.password=$SIGNING_PASSWORD \
    -Psigning.secretKeyRingFile=$HOME/.gnupg/secring.gpg \
    -PlocalStagingDir=$BUNDLE_DIR

echo ""
echo "📋 Step 4: Create bundle ZIP"
cd $BUNDLE_DIR
zip -r ../styx-bundle-${VERSION}.zip .
cd ..

echo ""
echo "📋 Step 5: Upload to Central Portal"
BUNDLE_PATH="styx-bundle-${VERSION}.zip"

# Upload via Central Portal API
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "https://central.sonatype.com/api/v1/publisher/upload?name=styx-${VERSION}&publishingType=AUTOMATIC" \
    -H "Authorization: Bearer $(echo -n "${CENTRAL_USERNAME}:${CENTRAL_PASSWORD}" | base64)" \
    -F "bundle=@${BUNDLE_PATH}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Bundle uploaded successfully!"
    echo "Deployment ID: $BODY"
else
    echo "❌ Upload failed with status $HTTP_CODE"
    echo "$BODY"
    exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    ✅ UPLOAD COMPLETE                        ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  The bundle has been uploaded to Central Portal.            ║"
echo "║                                                              ║"
echo "║  With publishingType=AUTOMATIC, it will auto-release        ║"
echo "║  after validation passes.                                   ║"
echo "║                                                              ║"
echo "║  Check status at: https://central.sonatype.com              ║"
echo "║  -> Publishing Settings -> Deployments                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
