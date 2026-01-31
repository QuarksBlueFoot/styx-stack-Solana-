# Styx Private Memo Program - Test Client

Test suite for the deployed Styx Private Memo Program on Solana devnet.

**Program ID:** `Fke7EgU2SrZ3tx6yaUv2kdq45pdwYpVjbxjfRipkPjSE`

## ⚠️ Security Notice

**NEVER commit private keys or wallet seeds to version control!**

This test client requires a wallet seed to sign transactions. Always:
- Use environment variables for sensitive data
- Use separate test wallets for devnet
- Never use production keys for testing
- See [SECURITY.md](../../SECURITY.md) for best practices

## Prerequisites

1. **Funded devnet wallet** (5+ SOL recommended)
2. **Node.js** v18 or later
3. **Wallet seed** (Base58 encoded)

## Setup

### 1. Generate a Test Wallet

```bash
# Generate new keypair
solana-keygen new --outfile ~/.config/solana/devnet-test.json

# Or use an existing wallet
# NEVER use your mainnet wallet for testing!
```

### 2. Fund the Wallet

```bash
# Configure for devnet
solana config set --url https://api.devnet.solana.com
solana config set --keypair ~/.config/solana/devnet-test.json

# Request airdrop
solana airdrop 5

# Verify balance
solana balance
```

### 3. Export Wallet Seed

```bash
# Get the base58-encoded seed (first 32 bytes)
# This is what you'll use for DEVNET_WALLET_SEED

# Option 1: Using solana-keygen
solana-keygen pubkey --keypair ~/.config/solana/devnet-test.json

# Option 2: Using jq (if keypair is JSON array)
cat ~/.config/solana/devnet-test.json | jq -r '.[0:32] | @base64'

# Option 3: Using Node.js
node -e "const fs=require('fs'); const bs58=require('bs58'); const kp=JSON.parse(fs.readFileSync(process.env.HOME+'/.config/solana/devnet-test.json')); console.log(bs58.encode(kp.slice(0,32)))"
```

## Running Tests

### Basic Usage

```bash
# Set environment variable and run tests
DEVNET_WALLET_SEED=<your_base58_seed> \
  NODE_PATH=../../node_modules/.pnpm/node_modules \
  node test-client.cjs
```

### Using .env File (Recommended)

```bash
# Create .env file (NOT committed to git)
echo "DEVNET_WALLET_SEED=<your_base58_seed>" > .env

# Load and run
export $(cat .env | xargs) && \
  NODE_PATH=../../node_modules/.pnpm/node_modules \
  node test-client.cjs
```

### From Repository Root

```bash
cd /path/to/StyxStack
DEVNET_WALLET_SEED=<your_seed> \
  NODE_PATH=./node_modules/.pnpm/node_modules \
  node programs/styx-private-memo-program/test-client.cjs
```

## Test Suite

The test client runs 4 tests:

1. **✅ Wallet Balance Check** - Verifies sufficient SOL
2. **✅ Simple Message** - Sends message without recipient
3. **✅ Message with Recipient** - Sends message with recipient pubkey
4. **✅ Large Payload (1KB)** - Tests 1KB payload handling

### Expected Output

```
🔑 Wallet: <your_wallet_address>
🌐 Network: Devnet
📋 Program: Fke7EgU2SrZ3tx6yaUv2kdq45pdwYpVjbxjfRipkPjSE

🚀 Starting Styx Private Memo Program Tests

============================================================
💰 Balance: X.XXXX SOL

🧪 Test 1: Simple Message (no recipient)
✅ Transaction confirmed
   Signature: <tx_signature>
   Explorer: https://explorer.solana.com/tx/<signature>?cluster=devnet

...

============================================================
📊 TEST SUMMARY
============================================================

Results: 4/4 tests passed (100.0%)

✅ 1. Wallet Balance Check (XXXms)
✅ 2. Simple Message (XXXms)
   Signature: <signature>
✅ 3. Message with Recipient (XXXms)
   Signature: <signature>
✅ 4. Large Payload (1KB) (XXXms)
   Signature: <signature>

============================================================
🎉 All tests passed!
```

## Transaction Costs

- **Per test**: ~0.000005 SOL
- **Full suite**: ~0.000015 SOL (3 transactions)
- **With buffer**: 0.01 SOL recommended

## Troubleshooting

### "DEVNET_WALLET_SEED environment variable is required"

You forgot to set the environment variable. Run:
```bash
DEVNET_WALLET_SEED=<your_seed> node test-client.cjs
```

### "Insufficient balance"

Your wallet needs more SOL. Request an airdrop:
```bash
solana airdrop 5 --url devnet
```

### "Cannot find module '@solana/web3.js'"

The NODE_PATH is not set correctly. Use:
```bash
NODE_PATH=../../node_modules/.pnpm/node_modules node test-client.cjs
```

Or run from the repository root:
```bash
cd /path/to/StyxStack
NODE_PATH=./node_modules/.pnpm/node_modules node programs/styx-private-memo-program/test-client.cjs
```

### Transaction Fails

1. **Check RPC status**: Devnet can be unstable
2. **Wait and retry**: Add delays between tests
3. **Check wallet balance**: Ensure sufficient SOL
4. **Verify program**: Confirm program is deployed

```bash
solana program show Fke7EgU2SrZ3tx6yaUv2kdq45pdwYpVjbxjfRipkPjSE --url devnet
```

## Test Results

Previous test results are documented in [TEST_RESULTS.md](TEST_RESULTS.md).

## Security Reminders

- ✅ Use separate test wallets
- ✅ Use environment variables for seeds
- ✅ Never commit private keys
- ✅ Keep .env files out of git (already in .gitignore)
- ❌ Never use mainnet keys for testing
- ❌ Never share your seed/private key
- ❌ Never commit wallet files

## Additional Testing

### Custom Payloads

Modify `test-client.cjs` to test custom scenarios:

```javascript
// Test encrypted payload
const payload = Buffer.from(/* your encrypted data */);
const ix = buildPmpPostMessageIx({ payloadBytes: payload });
```

### Stress Testing

```bash
# Run multiple times
for i in {1..10}; do
  DEVNET_WALLET_SEED=<seed> node test-client.cjs
  sleep 2
done
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Run PMP Tests
  env:
    DEVNET_WALLET_SEED: ${{ secrets.DEVNET_WALLET_SEED }}
  run: |
    NODE_PATH=./node_modules/.pnpm/node_modules \
    node programs/styx-private-memo-program/test-client.cjs
```

## Resources

- **Program Explorer**: https://explorer.solana.com/address/Fke7EgU2SrZ3tx6yaUv2kdq45pdwYpVjbxjfRipkPjSE?cluster=devnet
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Test Results**: [TEST_RESULTS.md](TEST_RESULTS.md)
- **Security Best Practices**: [../../SECURITY.md](../../SECURITY.md)

## Support

For issues or questions:
- Check [SECURITY.md](../../SECURITY.md) for security concerns
- Review [TEST_RESULTS.md](TEST_RESULTS.md) for expected behavior
- See [DEPLOYMENT.md](DEPLOYMENT.md) for program details
