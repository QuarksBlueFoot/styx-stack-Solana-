# Styx Private Memo Program - Deployment Guide

## Overview

The Styx Private Memo Program (PMP) is a minimal, stateless Solana program that accepts encrypted envelope bytes and emits them via program logs. This enables privacy-preserving messaging without relying on SPL Memo's UTF-8 constraints.

## Prerequisites

- Solana CLI tools (v1.18.0 or later)
- A funded Solana wallet with ~5 SOL for deployment
- Rust toolchain with Solana BPF support

## Building the Program

```bash
# Install Solana CLI (if not already installed)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Add to PATH
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Navigate to program directory
cd programs/styx-private-memo-program

# Build the program
cargo build-sbf

# The compiled .so file will be at:
# target/deploy/styx_private_memo_program.so
```

## Deploying to Devnet

### 1. Configure Solana CLI

```bash
# Set to devnet
solana config set --url https://api.devnet.solana.com

# Import your wallet (using the devnet test wallet)
# Create keypair file from seed
solana-keygen recover prompt://
# Enter the seed phrase or use the JSON keypair file

# Verify configuration
solana config get

# Check balance
solana balance
```

### 2. Deploy the Program

```bash
# Deploy to devnet
solana program deploy target/deploy/styx_private_memo_program.so

# The command will output the program ID, for example:
# Program Id: PrvMmo1234567890abcdefghijklmnopqrstuvwxyz
```

### 3. Update Configuration

After deployment, update the program ID in your client code:

```typescript
// packages/memo/src/pmp.ts
export const PRIVATE_MEMO_PROGRAM_ID = new PublicKey(
  "YOUR_DEPLOYED_PROGRAM_ID_HERE"
);
```

Or set via environment variable:

```bash
export STYX_PMP_PROGRAM_ID="YOUR_DEPLOYED_PROGRAM_ID_HERE"
```

## Devnet Test Wallet

**⚠️ SECURITY**: Never commit private keys to repositories. Use environment variables or secure key management.

For testing, you'll need a funded devnet wallet:

```bash
# Generate a new keypair
solana-keygen new --outfile ~/.config/solana/devnet-test.json

# Or import your own keypair
# Place your keypair JSON in ~/.config/solana/devnet-test.json
```

### Importing Test Wallet

```bash
# Set as keypair
solana config set --keypair ~/.config/solana/devnet-test.json

# Request devnet airdrop
solana airdrop 5 --url devnet

# Verify
solana address
solana balance
```

## Testing the Deployment

### Using TypeScript Client

```typescript
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { buildPmpPostMessageIx } from "@styx/private-memo-program-client";

const connection = new Connection("https://api.devnet.solana.com");
const wallet = Keypair.fromSecretKey(/* your keypair */);

// Create test message
const testPayload = Buffer.from("Hello Styx PMP!", "utf-8");

// Build instruction
const ix = buildPmpPostMessageIx({
  payloadBytes: testPayload,
  recipientPubkey: wallet.publicKey, // optional
});

// Send transaction
const tx = new Transaction().add(ix);
const sig = await connection.sendTransaction(tx, [wallet]);
await connection.confirmTransaction(sig);

console.log(`Transaction: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
```

### Using Solana CLI

```bash
# Create a test instruction (requires custom tool)
# The instruction format is:
# [1][flags][has_recipient][recipient?][payload_len_le][payload]

# For now, use the TypeScript client for testing
```

## Verification

After deployment, verify the program is deployed correctly:

```bash
# Check program exists
solana program show YOUR_PROGRAM_ID

# View recent transactions
solana transaction-history --limit 10
```

## Program Details

**Wire Format (PMP1):**
```
[u8 tag=1]              // post_envelope instruction
[u8 flags]              // reserved (0 for now)
[u8 has_recipient]      // 0 or 1
[recipient? 32 bytes]   // Pubkey if has_recipient=1
[u16 payload_len_le]    // payload length
[payload bytes]         // encrypted envelope
```

**Log Output:**
```
STYX_PMP1 flags=0 recipient=1 payload_len=256
[base64-encoded-payload]
```

## Security Considerations

1. **No Encryption by Program**: The program does NOT encrypt data. All encryption must be done client-side.
2. **Public Metadata**: While payload content is encrypted, transaction metadata (sender, recipient hint, size) is visible on-chain.
3. **Stateless**: Program creates no accounts and stores nothing. All data is ephemeral (logs only).
4. **Minimal Attack Surface**: Simple validation logic reduces potential vulnerabilities.

## Costs

- **Deployment**: ~5 SOL (one-time, refundable if program is closed)
- **Transaction Fee**: ~0.000005 SOL per message
- **No Rent**: Program is stateless, no account rent

## Upgrading

The program is upgradeable by the upgrade authority (deployment wallet):

```bash
# Upgrade deployed program
solana program deploy --program-id YOUR_PROGRAM_ID target/deploy/styx_private_memo_program.so

# Set new upgrade authority
solana program set-upgrade-authority YOUR_PROGRAM_ID --new-upgrade-authority NEW_AUTHORITY

# Make program immutable (cannot be upgraded)
solana program set-upgrade-authority YOUR_PROGRAM_ID --final
```

## Troubleshooting

### Build Errors

```bash
# Clear build cache
cargo clean

# Update dependencies
cargo update

# Rebuild
cargo build-sbf
```

### Deployment Errors

**Insufficient Funds:**
```bash
# Request airdrop on devnet
solana airdrop 5
```

**Program Already Deployed:**
```bash
# Upgrade instead
solana program deploy --program-id EXISTING_PROGRAM_ID target/deploy/styx_private_memo_program.so
```

### Runtime Errors

**InvalidInstructionData:**
- Check instruction format matches PMP1 spec
- Verify payload_len matches actual payload size
- Ensure has_recipient is 0 or 1

## Mainnet Deployment

⚠️ **Before deploying to mainnet:**

1. Complete security audit
2. Test thoroughly on devnet
3. Use a secure keypair for upgrade authority
4. Consider making program immutable after verification
5. Budget for deployment costs (~5 SOL)

```bash
# Switch to mainnet
solana config set --url https://api.mainnet-beta.solana.com

# Deploy (ensure wallet is funded)
solana program deploy target/deploy/styx_private_memo_program.so

# Verify on Solana Explorer
# https://explorer.solana.com/address/YOUR_PROGRAM_ID
```

## Support

For issues or questions:
- GitHub: https://github.com/QuarksBlueFoot/StyxStack
- Docs: /workspaces/StyxStack/docs/
