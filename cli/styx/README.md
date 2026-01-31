# @styxstack/cli

<div align="center">

![Styx CLI](https://img.shields.io/badge/styx-CLI-8B5CF6?style=for-the-badge)
[![npm](https://img.shields.io/npm/v/@styxstack/cli?style=flat-square)](https://www.npmjs.com/package/@styxstack/cli)
[![License](https://img.shields.io/badge/License-BSL%201.1-blue?style=flat-square)](LICENSE)

**Command-line interface for the Styx Token Standard (STS)**

</div>

## Installation

```bash
# Install globally
npm install -g @styxstack/cli

# Or run directly with npx
npx @styxstack/cli

# Or use pnpm
pnpm add -g @styxstack/cli
```

## Quick Start

```bash
# Check installation
styx --version

# Get help
styx --help

# Launch web console
styx console
```

## Commands

### Token Operations (`styx sts`)

Core STS token operations with full Token-22 parity:

```bash
# Send tokens to any address (Token-22 UX!)
styx sts send --to <ADDRESS> --amount 100000

# Receive tokens sent to your address
styx sts receive

# Mint new tokens
styx sts mint --amount 1000000 --decimals 6 --name "My Token" --symbol "MYT"

# Transfer tokens (advanced - with nullifier)
styx sts transfer --nullifier <HEX> --to <ADDRESS>

# Check balance
styx sts balance --mint <MINT_ADDRESS>

# Wrap SPL tokens into STS (Token-22 → STS)
styx sts wrap --mint <SPL_MINT> --amount 1000000

# Unwrap STS back to SPL (STS → Token-22)
styx sts unwrap --nullifier <HEX> --to <TOKEN_ACCOUNT>
```

**Same UX as Token-22:**
```bash
# Token-22 style transfer:
spl-token transfer <MINT> 100 <RECIPIENT>

# STS equivalent (identical experience!):
styx sts send -t <RECIPIENT> -a 100
```

### NFT Operations (`styx sts nft:*`)

```bash
# Mint an NFT
styx sts nft:mint --name "My NFT" --uri "https://..." --royalty 500

# List NFT for sale
styx sts nft:list --note <NOTE> --price 1.5

# Buy listed NFT
styx sts nft:buy --listing <LISTING_PDA>

# Create auction
styx sts nft:auction --note <NOTE> --type english --start 1.0 --duration 86400
```

### Proofs (`styx sts prove:*`)

```bash
# Prove balance meets threshold
styx sts prove:balance --note <NOTE> --threshold 1000000

# Prove ownership
styx sts prove:ownership --note <NOTE>

# Prove for audit
styx sts prove:audit --note <NOTE> --auditor <PUBKEY>
```

### AMM & DEX (`styx amm`)

```bash
# List liquidity pools
styx amm pools

# Get swap quote
styx amm quote --from SOL --to USDC --amount 1.0

# Execute swap
styx amm swap --from SOL --to USDC --amount 1.0 --slippage 0.5

# Add liquidity
styx amm add-liquidity --pool <POOL> --token-a 100 --token-b 500

# Remove liquidity
styx amm remove-liquidity --pool <POOL> --shares 50
```

### NFT Trading (`styx nft`) - NEW!

Easy NFT trading with Magic Eden / Tensor UX:

```bash
# List NFT for sale (like Magic Eden)
styx nft list --nft <NFT_MINT> --price 5.0
styx nft list --nft <NFT_MINT> --price 5.0 --private  # Hidden seller

# Buy NFT instantly (quick buy)
styx nft buy --nft <NFT_MINT>
styx nft buy --nft <NFT_MINT> --max-price 5.5  # With price limit

# Instant sell to highest bid (like Tensor)
styx nft sell --nft <NFT_MINT>
styx nft sell --nft <NFT_MINT> --min-price 4.0  # With minimum

# Place bid on NFT or collection
styx nft bid --nft <NFT_MINT> --amount 3.0
styx nft bid --collection <COLLECTION> --amount 3.0  # Floor bid

# Transfer NFT
styx nft transfer --nft <NFT_MINT> --to <RECIPIENT>
styx nft transfer --nft <NFT_MINT> --to <RECIPIENT> --private  # Stealth

# View NFT details
styx nft show --nft <NFT_MINT>

# View your portfolio
styx nft portfolio
styx nft portfolio --listed  # Only listed NFTs
```

### Token Operations (`styx token`) - NEW!

Full Token-22 parity with easy commands:

```bash
# Create a new token
styx token create --name "My Token" --symbol "MYT" --decimals 9
styx token create --name "My Token" --symbol "MYT" --transfer-fee 50  # 0.5% fee
styx token create --name "My Token" --confidential  # Private transfers

# Mint tokens
styx token mint --mint <MINT> --amount 1000000
styx token mint --mint <MINT> --amount 1000000 --to <RECIPIENT>

# Burn tokens
styx token burn --mint <MINT> --amount 500000

# Freeze/Thaw accounts (Token-22 parity)
styx token freeze --account <TOKEN_ACCOUNT>
styx token thaw --account <TOKEN_ACCOUNT>

# Delegate tokens
styx token delegate --mint <MINT> --to <DELEGATE> --amount 100000
styx token revoke --mint <MINT>

# Set authorities (Token-22 parity)
styx token authorize --mint <MINT> --type mint --new-authority <NEW_AUTH>
styx token authorize --mint <MINT> --type freeze --new-authority <NEW_AUTH>

# List your token accounts
styx token accounts
styx token accounts --mint <SPECIFIC_MINT>

# Quick token swap (Jupiter integration)
styx token swap -i SOL -o USDC -a 1.0
styx token swap -i SOL -o USDC -a 1.0 --private  # Via STS wrapper
```

### Solana Mobile (`styx mobile`) - NEW!

Mobile-first commands for Solana Mobile / MWA:

```bash
# Connect to mobile wallet (MWA)
styx mobile connect

# Manage offline transaction queue
styx mobile outbox
styx mobile outbox --flush   # Send all pending
styx mobile outbox --clear   # Clear failed

# Generate receive QR code (Solana Pay compatible)
styx mobile qr --address <YOUR_ADDRESS>
styx mobile qr --address <YOUR_ADDRESS> --amount 1.5
```

### Stealth Addresses (`styx stealth`)

```bash
# Generate stealth meta-address
styx stealth generate

# Output:
# View Key:  0x1234...abcd
# Spend Key: 0x5678...efgh
# Meta-Address: st:0xabcd...1234

# Send to stealth address
styx stealth send --to st:0xabcd...1234 --amount 100 --mint <MINT>

# Scan for incoming payments
styx stealth scan --view-key 0x1234...abcd
```

### Streaming Payments (`styx stream`)

```bash
# Create payment stream
styx stream create --to <ADDRESS> --total 1000 --duration 86400 --mint <MINT>

# List your streams
styx stream list

# Claim from stream
styx stream claim --stream <STREAM_ID>

# Cancel stream (creator only)
styx stream cancel --stream <STREAM_ID>
```

### Social Recovery (`styx recovery`)

```bash
# Setup guardians
styx recovery setup --guardians <ADDR1>,<ADDR2>,<ADDR3> --threshold 2

# Initiate recovery (guardian)
styx recovery initiate --owner <OWNER> --new-owner <NEW_OWNER>

# Check recovery status
styx recovery status --owner <OWNER>

# Cancel pending recovery
styx recovery cancel --owner <OWNER>
```

### Private Governance (`styx gov`)

```bash
# Create proposal
styx gov create-proposal --title "Increase fees" --options yes,no --duration 172800

# Cast private vote
styx gov vote --proposal <ID> --choice 0 --secret <YOUR_SECRET>

# Reveal vote (optional)
styx gov reveal --proposal <ID> --secret <YOUR_SECRET>

# Tally votes
styx gov tally --proposal <ID>
```

### ALT Privacy Sets (`styx alt`)

```bash
# Create privacy set (Address Lookup Table)
styx alt create-set --name "Privacy Pool Alpha"

# Join a privacy set
styx alt join-set --set <ALT_ADDRESS>

# List available sets
styx alt list-sets
```

### Fair Meme Launch (`styx meme`)

```bash
# Create fair launch (anti-snipe)
styx meme create --name "MEME" --supply 1000000000 --commit-window 3600 --reveal-window 1800

# Commit to buy (hidden)
styx meme commit --launch <ID> --amount 1.5 --secret <YOUR_SECRET>

# Reveal commitment
styx meme reveal --launch <ID> --secret <YOUR_SECRET>

# Claim tokens after launch
styx meme claim --launch <ID>
```

### Token-22 Comparison (`styx compare`)

```bash
# Compare costs
styx compare cost

# Output:
# ╔══════════════════════╦══════════════╦══════════════╦════════════╗
# ║ Operation            ║ Token-22     ║ STS          ║ Savings    ║
# ╠══════════════════════╬══════════════╬══════════════╬════════════╣
# ║ Create mint          ║ 0.003 SOL    ║ 0.001 SOL    ║ 66%        ║
# ║ Transfer (CT)        ║ 0.15 SOL     ║ 0.001 SOL    ║ 99.3%      ║
# ║ 10k token accounts   ║ 20 SOL       ║ 0 SOL        ║ 100%       ║
# ╚══════════════════════╩══════════════╩══════════════╩════════════╝

# Compare validator burden
styx compare validators

# Compare security models
styx compare security

# Compare feature sets
styx compare features

# Full summary
styx compare summary
```

### Web Console (`styx console`)

```bash
# Launch interactive web interface
styx console

# Specify port
styx console --port 8080

# Opens browser at http://localhost:4242 (default)
```

Features:
- Token dashboard with balance overview
- Transaction builder with preview
- Stealth address scanner
- Privacy set manager
- AMM/DEX interface
- Governance panel
- Real-time network stats

## Environment Variables

```bash
# RPC endpoint (default: mainnet)
export SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"

# Keypair path (default: ~/.config/solana/id.json)
export SOLANA_KEYPAIR_PATH="/path/to/keypair.json"

# Network (mainnet, devnet, testnet)
export SOLANA_NETWORK="mainnet"
```

## Configuration File

Create `~/.styx/config.json`:

```json
{
  "rpc": "https://api.mainnet-beta.solana.com",
  "keypair": "~/.config/solana/id.json",
  "defaultMint": "So11111111111111111111111111111111111111112",
  "slippage": 0.5,
  "console": {
    "port": 4242,
    "theme": "dark"
  }
}
```

## Programmatic Usage

```typescript
import { createSTSCommands } from '@styxstack/cli';
import { Command } from 'commander';

const program = new Command();
createSTSCommands(program);
program.parse(process.argv);
```

## Development

```bash
# Clone repository
git clone https://github.com/QuarksBlueFoot/StyxStack.git
cd StyxStack/cli/styx

# Install dependencies
pnpm install

# Build
pnpm build

# Run locally
node dist/index.js --help

# Watch mode
pnpm dev
```

## License

BSL 1.1 - Free for projects with <100k MAU.

---

<div align="center">

Part of the [Styx Token Standard](https://github.com/QuarksBlueFoot/StyxStack)

Built by [@moonmanquark](https://twitter.com/moonmanquark) (Bluefoot Labs)

</div>
