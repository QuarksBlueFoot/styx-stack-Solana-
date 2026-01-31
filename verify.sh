#!/bin/bash
# ============================================================================
# Styx Stack - Verifiable Build Script
# ============================================================================
# Uses Ellipsis Labs' solana-verifiable-build for deterministic compilation.
# Ensures on-chain bytecode matches this source repository.
#
# Prerequisites:
#   - Docker installed and running
#   - Internet connection (to pull build image)
#
# Usage:
#   chmod +x verify.sh
#   ./verify.sh
#
# Reference: https://github.com/Ellipsis-Labs/solana-verifiable-build
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Styx Stack - Verifiable Build                        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed.${NC}"
    echo "   Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker daemon is not running.${NC}"
    echo "   Please start Docker and try again."
    exit 1
fi

echo -e "${GREEN}✓ Docker detected${NC}"

# Use Solana 2.0.3 compatible image (matches styx-private-memo-program)
IMAGE="solanafoundation/solana-verifiable-build:2.0.3"

echo -e "${YELLOW}📦 Pulling verifiable build image...${NC}"
echo "   Image: $IMAGE"
docker pull $IMAGE

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Building: Styx Private Memo Program (PMP)                     ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

docker run --rm \
    -v "$(pwd)":/work \
    -w /work/programs/styx-private-memo-program \
    $IMAGE \
    cargo build-sbf --manifest-path Cargo.toml

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Building: WhisperDrop                                         ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

docker run --rm \
    -v "$(pwd)":/work \
    -w /work/programs/whisperdrop \
    $IMAGE \
    cargo build-sbf --manifest-path Cargo.toml

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Verifiable Build Complete                                ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Binaries generated:"
echo "  - programs/styx-private-memo-program/target/deploy/styx_private_memo_program.so"
echo "  - programs/whisperdrop/target/deploy/whisperdrop.so"
echo ""
echo "To get program hashes:"
echo "  sha256sum programs/styx-private-memo-program/target/deploy/styx_private_memo_program.so"
echo "  sha256sum programs/whisperdrop/target/deploy/whisperdrop.so"
echo ""
echo "To verify against on-chain:"
echo "  solana program dump GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9 pmp_onchain.so"
echo "  sha256sum pmp_onchain.so"
echo ""
