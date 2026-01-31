# Keccak-256 vs SHA3-256: Critical Encryption Fix

## Problem Statement

The Private Memo Program's TAG_PRIVATE_TRANSFER (TAG 5) was failing with "Recipient mismatch" error despite correct implementation logic. The issue was caused by using **SHA3-256** in JavaScript tests while Solana uses **Keccak-256** on-chain.

---

## Root Cause

### What We Thought
SHA3-256 and Keccak-256 are the same algorithm.

### Reality
They are **different** algorithms with **different padding schemes**.

| Algorithm | Standard | Padding | Used By |
|-----------|----------|---------|---------|
| **Keccak-256** | Original (2012) | Keccak padding | Solana, Ethereum, Bitcoin |
| **SHA3-256** | FIPS-202 (2015) | SHA-3 padding | NIST standard, Node.js crypto |

### Why It Mattered

```javascript
// WRONG - Node.js crypto.createHash('sha3-256')
const hash = crypto.createHash('sha3-256');
hash.update(data);
const wrong = hash.digest(); // SHA3-256 (FIPS-202)

// RIGHT - @noble/hashes keccak_256
import { keccak_256 } from '@noble/hashes/sha3.js';
const right = keccak_256(data); // Keccak-256 (original)

// These produce DIFFERENT hashes for the same input!
```

---

## The Bug

### Symptom
```
ERROR: Recipient mismatch
Program log: DEBUG: Decrypted recipient: J5PWkqo4v1DJeAasSUkeE3umU56kLM2eJfqfryHJNd1t
Program log: DEBUG: accounts[4] (to.key): 55iRjXtQth6uNER1BWDFDPF4t7BsdbPQ6VJjjuzR9WQr
```

### What Was Happening

1. **JavaScript Test** (using SHA3-256):
   ```javascript
   // Encrypt recipient using SHA3-256
   const mask = crypto.createHash('sha3-256')
     .update('STYX_META_V3')
     .update(sender.toBytes())
     .digest();
   const encrypted = recipient XOR mask;
   ```

2. **Solana Program** (using Keccak-256):
   ```rust
   // Decrypt recipient using Keccak-256
   let mask = keccak::hashv(&[b"STYX_META_V3", sender.as_ref()]);
   let recipient = encrypted XOR mask;
   ```

3. **Result:**
   - JavaScript encrypted with SHA3-256 mask
   - Solana decrypted with Keccak-256 mask
   - Different masks → wrong recipient after decryption
   - Verification failed: decrypted ≠ accounts[4]

---

## The Fix

### Before (WRONG)
```javascript
import crypto from 'crypto';

function keccakHash(...data) {
  const hash = crypto.createHash('sha3-256'); // ❌ SHA3-256
  data.forEach(d => hash.update(d));
  return hash.digest();
}
```

### After (CORRECT)
```javascript
import { keccak_256 } from '@noble/hashes/sha3.js';

function keccakHash(...data) {
  const combined = Buffer.concat(data);
  return Buffer.from(keccak_256(combined)); // ✅ Keccak-256
}
```

### Installation
```bash
pnpm add -w @noble/hashes
```

---

## Verification

### Before Fix
```
TEST 3/5: Private Transfer (TAG 5)
❌ Failed: Recipient mismatch
```

### After Fix
```
TEST 3/5: Private Transfer (TAG 5)
✅ ✨ Private transfer completed!
✅ Receiver balance: 0.001 SOL
```

### Roundtrip Test
```javascript
// Encrypt
const mask = keccakHash(Buffer.from('STYX_META_V3'), sender.toBytes());
const encrypted = recipient.toBytes().map((b, i) => b ^ mask[i]);

// Decrypt (same as program)
const decrypted = encrypted.map((b, i) => b ^ mask[i]);
const decryptedPubkey = new PublicKey(decrypted);

// Verify
console.log(decryptedPubkey.equals(recipient)); // true ✅
```

---

## Historical Context

### Why Two Standards?

1. **2007:** Keccak submitted to NIST SHA-3 competition
2. **2012:** Keccak selected as SHA-3 winner (original padding)
3. **2015:** NIST standardizes SHA-3 (changed padding for compatibility)
4. **Result:** Two incompatible algorithms with similar names

### Blockchain Usage

Most blockchains adopted **Keccak-256** (original) before NIST standardization:
- ✅ Ethereum: Uses Keccak-256 (not SHA3-256)
- ✅ Solana: Uses Keccak-256 via `keccak::hashv()`
- ✅ Bitcoin: Uses SHA-256 (different from both)

---

## Technical Details

### Keccak-256 Padding (Original)
```
message || 0x01 || 0x00...00 || 0x80
```

### SHA3-256 Padding (FIPS-202)
```
message || 0x06 || 0x00...00 || 0x80
```

**Key Difference:** First padding byte (`0x01` vs `0x06`)

### Impact on Hash Output
Same input → Different padding → Different final hash value

```javascript
const input = Buffer.from('STYX_META_V3');

// Keccak-256
const keccak = keccak_256(input);
// Output: a1b2c3d4...

// SHA3-256
const sha3 = crypto.createHash('sha3-256').update(input).digest();
// Output: e5f6g7h8... (DIFFERENT!)
```

---

## Lessons Learned

### 1. Never Assume Hash Algorithms Are Identical
Even similar names (Keccak vs SHA3) can hide critical differences.

### 2. Always Test Encryption Roundtrip
Before integrating encryption:
```javascript
const encrypted = encrypt(plaintext, key);
const decrypted = decrypt(encrypted, key);
assert(plaintext === decrypted); // Must pass!
```

### 3. Use Correct Libraries for Blockchain
- ❌ Node.js `crypto` → SHA3-256 (FIPS-202)
- ✅ `@noble/hashes` → Keccak-256 (original)
- ✅ `ethereum-cryptography` → Keccak-256
- ✅ `js-sha3` → Both (with options)

### 4. Debug with Logging
Add debug logs to see actual values:
```rust
msg!("DEBUG: Sender: {:?}", sender);
msg!("DEBUG: Encrypted: {:?}", encrypted);
msg!("DEBUG: Decrypted: {:?}", decrypted);
```

### 5. Match On-Chain Implementation Exactly
If program uses `keccak::hashv()`, client MUST use Keccak-256 (not SHA3-256).

---

## Migration Guide

### For Existing Code Using Wrong Hash

**Step 1:** Install correct package
```bash
npm install @noble/hashes
# or
pnpm add @noble/hashes
```

**Step 2:** Update imports
```javascript
// Remove
import crypto from 'crypto';

// Add
import { keccak_256 } from '@noble/hashes/sha3.js';
```

**Step 3:** Replace hash function
```javascript
// OLD (WRONG)
function hash(data) {
  return crypto.createHash('sha3-256').update(data).digest();
}

// NEW (CORRECT)
function hash(data) {
  return Buffer.from(keccak_256(data));
}
```

**Step 4:** Test encryption roundtrip
```javascript
const encrypted = encryptRecipient(sender, recipient);
const decrypted = decryptRecipient(sender, encrypted);
assert(decrypted.equals(recipient)); // Must pass!
```

**Step 5:** Verify on-chain
```javascript
const tx = await sendTransaction(encrypted);
console.log('Transaction:', tx.signature);
// Check for "Recipient mismatch" errors
```

---

## Quick Reference

### Correct Keccak-256 Usage

```javascript
import { keccak_256 } from '@noble/hashes/sha3.js';

// Single input
const hash1 = keccak_256(data);

// Multiple inputs (concatenate first)
const combined = Buffer.concat([data1, data2, data3]);
const hash2 = keccak_256(combined);

// Domain separation
const domainHash = keccak_256(
  Buffer.concat([
    Buffer.from('STYX_META_V3'),
    senderPubkey.toBytes()
  ])
);

// XOR encryption
const encrypted = Buffer.from(
  plaintext.map((byte, i) => byte ^ domainHash[i % 32])
);
```

---

## Test Results

### Before Fix: 4/5 Passing
```
✅ TAG 3 (Private Message)
✅ TAG 4 (Routed Message)
❌ TAG 5 (Private Transfer) - Recipient mismatch
✅ TAG 7 (Ratchet Message)
✅ TAG 8 (Compliance Reveal)
```

### After Fix: 5/5 Passing ✅
```
✅ TAG 3 (Private Message)
✅ TAG 4 (Routed Message)
✅ TAG 5 (Private Transfer) - FIXED!
✅ TAG 7 (Ratchet Message)
✅ TAG 8 (Compliance Reveal)
```

---

## Resources

### Official Specifications
- [Keccak Team (Original)](https://keccak.team/keccak.html)
- [NIST FIPS 202 (SHA-3)](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.202.pdf)

### Recommended Libraries
- [@noble/hashes](https://github.com/paulmillr/noble-hashes) - Best for Solana/Ethereum
- [ethereum-cryptography](https://github.com/ethereum/js-ethereum-cryptography) - Ethereum focused
- [js-sha3](https://github.com/emn178/js-sha3) - Supports both Keccak & SHA3

### Avoid
- ❌ Node.js `crypto.createHash('sha3-256')` - Wrong algorithm for Solana
- ❌ Any library that doesn't explicitly support "Keccak-256 (original)"

---

## Conclusion

The difference between Keccak-256 and SHA3-256 is subtle but critical for blockchain applications. Always use the original Keccak-256 algorithm when working with Solana, Ethereum, or any blockchain that predates NIST's SHA-3 standardization.

**Key Takeaway:** "SHA3" in Node.js crypto ≠ "Keccak" in Solana/Ethereum.

---

**Fixed:** 2026-01-27  
**Impact:** TAG_PRIVATE_TRANSFER now fully functional  
**Testing:** All 5 core PMP instructions passing on devnet
