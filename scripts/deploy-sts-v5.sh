#!/bin/bash
# STS Token Standard v5.0 Deployment Script
# Deploys the upgraded program with Pool PDAs, Receipt Tokens, and Privacy features

set -e

PROGRAM_DIR="programs/styx-private-memo-program"
KEYPAIR_PATH=".devnet/test-wallet.json"
PROGRAM_KEYPAIR=".devnet/whisperdrop-program.json" # Reuse or create new

echo "=========================================="
echo "STS Token Standard v5.0 Deployment"
echo "=========================================="
echo ""
echo "Features:"
echo "  ✓ Pool PDAs for 1:1 SPL backing"
echo "  ✓ Receipt Tokens (Token-2022) for DEX trading"
echo "  ✓ Stealth Unshield (one-time addresses)"
echo "  ✓ Private AMM Swaps"
echo "  ✓ Enhanced SHIELD/UNSHIELD with receipt minting/burning"
echo ""

# Check Solana CLI
if ! command -v solana &> /dev/null; then
    echo "Error: Solana CLI not installed"
    echo "Install with: sh -c \"\$(curl -sSfL https://release.anza.xyz/stable/install)\""
    exit 1
fi

# Set devnet
echo "Setting cluster to devnet..."
solana config set --url devnet

# Check wallet balance
BALANCE=$(solana balance --keypair $KEYPAIR_PATH | awk '{print $1}')
echo "Wallet balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 2" | bc -l) )); then
    echo "Warning: Low balance. Need ~2 SOL for deployment."
    echo "Requesting airdrop..."
    solana airdrop 2 --keypair $KEYPAIR_PATH || true
fi

# Build for SBF
echo ""
echo "Building program for Solana BPF..."
cd $PROGRAM_DIR
cargo build-sbf

# Get program ID
PROGRAM_ID=$(solana-keygen pubkey ../../$PROGRAM_KEYPAIR 2>/dev/null || echo "")

if [ -z "$PROGRAM_ID" ]; then
    echo "Generating new program keypair..."
    solana-keygen new --outfile ../../$PROGRAM_KEYPAIR --no-bip39-passphrase
    PROGRAM_ID=$(solana-keygen pubkey ../../$PROGRAM_KEYPAIR)
fi

echo "Program ID: $PROGRAM_ID"

# Deploy
echo ""
echo "Deploying to devnet..."
solana program deploy \
    --program-id ../../$PROGRAM_KEYPAIR \
    --keypair ../../$KEYPAIR_PATH \
    target/deploy/styx_private_memo_program.so

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo "Program ID: $PROGRAM_ID"
echo ""
echo "Update .devnet/config.json with new program ID if changed."
echo ""
echo "Test with:"
echo "  node scripts/test-sts-v5.mjs"
