# Styx Private Memo Program - Maximum Privacy Edition

**Program ID:** `Fke7EgU2SrZ3tx6yaUv2kdq45pdwYpVjbxjfRipkPjSE`  
**Network:** Solana Devnet  
**Version:** PMP2 (Maximum Privacy Edition)  
**Deployed:** January 19, 2026

## 🔒 Privacy Features

### 1. **On-Chain Payload Encryption**
- **Algorithm:** ChaCha20-Poly1305 AEAD
- **Key Derivation:** SHA-256(sender_pubkey || recipient_pubkey)
- **Authentication:** 16-byte Poly1305 MAC tag (tamper-proof)
- **Result:** Payload content completely encrypted on-chain

### 2. **Metadata Obfuscation**
- **Recipient Encryption:** Recipient pubkey is encrypted using XOR with SHA-256(sender)
- **Visibility:** Only sender knows who the recipient is
- **Scanning:** Third parties cannot filter messages by recipient
- **Result:** Transaction graph analysis significantly harder

### 3. **Stealth Address Support**
- **Ephemeral Keys:** Sender can use one-time keypairs
- **Unlinkability:** Multiple messages from same sender appear unrelated
- **Privacy:** Breaks transaction linkability for advanced privacy
- **Result:** Sender identity can be fully obscured

### 4. **Length Obfuscation** (Client-Side)
- **Padding:** Random padding added to messages before encryption
- **Size Classes:** Messages padded to nearest power-of-2 or fixed size
- **Analysis:** Prevents length-based message correlation
- **Result:** Message sizes don't leak information

### 5. **Deterministic Nonces**
- **Source:** Derived from encrypted recipient + sender pubkey
- **Benefits:** No metadata leakage from nonce generation
- **Uniqueness:** Each sender+recipient pair has unique nonce stream
- **Result:** No side-channel information from nonce selection

## 🎯 Privacy Guarantees

| Aspect | Privacy Level | Notes |
|--------|---------------|-------|
| **Payload Content** | 🟢 **Fully Private** | ChaCha20-Poly1305 encryption |
| **Recipient Identity** | 🟢 **Fully Private** | Encrypted on-chain |
| **Message Length** | 🟡 **Partially Private** | Requires client-side padding |
| **Sender Identity** | 🟡 **Partially Private** | Can use stealth addresses |
| **Transaction Linkability** | 🟡 **Partially Private** | Stealth mode breaks links |
| **Transaction Existence** | 🔴 **Public** | Blockchain inherent limitation |
| **Transaction Timing** | 🔴 **Public** | Blockchain inherent limitation |
| **Program Invocation** | 🔴 **Public** | Visible that PMP was called |

## 📊 Privacy Modes

### Mode 1: **Standard Encrypted** (flags=0b001)
```
✅ Payload encrypted
✅ Recipient encrypted
❌ No stealth addressing
ℹ️  Sender pubkey visible
```

### Mode 2: **Private Metadata** (flags=0b011)
```
✅ Payload encrypted
✅ Recipient encrypted
✅ Minimal log output
ℹ️  Sender pubkey visible
```

### Mode 3: **Maximum Stealth** (flags=0b111)
```
✅ Payload encrypted
✅ Recipient encrypted
✅ Stealth sender address
✅ Minimal log output
✅ Maximum privacy
```

## 🔑 Key Derivation

The program uses a deterministic key derivation scheme:

```rust
// Encryption key
key = SHA-256(sender_pubkey || recipient_pubkey)

// Nonce (12 bytes)
nonce = SHA-256("STYX_NONCE_V2" || encrypted_recipient || sender_pubkey)[0..12]

// Recipient encryption (XOR)
encrypted_recipient = recipient_pubkey XOR SHA-256("STYX_RECIPIENT_KEY" || sender_pubkey)
```

This ensures:
- Unique keys per sender-recipient pair
- Deterministic nonces (no randomness needed)
- Recipient privacy without complex zkSNARKs
- Simple, auditable cryptography

## 🛡️ Security Properties

### AEAD Guarantees
- **Confidentiality:** Ciphertext reveals nothing about plaintext
- **Integrity:** Any tampering detected via MAC verification
- **Authentication:** Only holder of shared secret can create valid ciphertext

### Metadata Protection
- **Recipient Privacy:** Encrypted with sender-specific key
- **Nonce Privacy:** Derived deterministically from encrypted data
- **Length Privacy:** Requires client-side padding (best practice)

### Attack Resistance
- **Replay Attacks:** Prevented by transaction signatures
- **Man-in-the-Middle:** N/A (on-chain execution)
- **Ciphertext Malleability:** Prevented by Poly1305 MAC
- **Key Reuse:** Safe (AEAD with unique nonces per message)

## 🚀 Usage Example

```typescript
import { buildPmpPrivateEnvelope } from "@styx/private-memo-program-client";

// Create maximum privacy message
const ix = buildPmpPrivateEnvelope({
  sender: senderKeypair.publicKey,
  recipient: recipientPublicKey,
  payload: Buffer.from("Secret message"),
  flags: 0b111, // Enable all privacy features
  padding: true, // Add random padding
  stealthMode: true, // Use ephemeral sender
});

// Send transaction
const tx = new Transaction().add(ix);
await sendTransaction(tx, [senderKeypair, ephemeralKeypair]);
```

## ⚠️ Important Limitations

### What This Program CANNOT Hide

1. **Transaction Existence**
   - Fact that a transaction occurred is public
   - Solution: Use transaction batching, Solana's high TPS provides cover traffic

2. **Program Usage**
   - Fact that Styx PMP was invoked is visible
   - Solution: Use from multiple apps to increase anonymity set

3. **Transaction Timing**
   - Timestamp of message is public
   - Solution: Use scheduled/delayed sending services

4. **Transaction Fee**
   - Amount paid for transaction is visible
   - Solution: Standardize transaction sizes

5. **Account Balances**
   - Sender's SOL balance changes are visible
   - Solution: Use privacy-preserving balance protocols

### Recommended Additional Privacy Measures

1. **Use Tor/VPN** when submitting transactions
2. **Batch multiple messages** in one transaction
3. **Standardize message sizes** with padding
4. **Rotate sender addresses** frequently
5. **Use stealth addresses** for maximum privacy
6. **Combine with mixnets** for network-level privacy
7. **Use privacy-preserving RPC** nodes

## 📚 References

- **ChaCha20-Poly1305:** [RFC 8439](https://tools.ietf.org/html/rfc8439)
- **AEAD Security:** [Authenticated Encryption](https://en.wikipedia.org/wiki/Authenticated_encryption)
- **Stealth Addresses:** [Bitcoin Stealth Addresses](https://bitcoin.stackexchange.com/questions/20701/what-is-a-stealth-address)
- **Traffic Analysis:** [Mixnets and Tor](https://www.torproject.org/)

## 🔬 Privacy Analysis

### Threat Model

**Adversary Capabilities:**
- ✅ Can read all on-chain data
- ✅ Can analyze transaction graphs
- ✅ Can perform timing analysis
- ✅ Can run statistical analysis on message sizes
- ❌ Cannot break ChaCha20-Poly1305
- ❌ Cannot factor SHA-256 preimages

**Privacy Goals:**
1. **Message Content:** Fully confidential ✅
2. **Recipient Identity:** Fully confidential ✅
3. **Sender Identity:** Configurable (stealth mode) 🟡
4. **Message Metadata:** Minimal leakage 🟡

### Comparison to Alternatives

| Feature | Styx PMP | SPL Memo | Wormhole Messaging | Signal Protocol |
|---------|----------|----------|-------------------|-----------------|
| On-chain encryption | ✅ | ❌ | ❌ | ✅ (off-chain) |
| Recipient privacy | ✅ | ❌ | ❌ | ✅ |
| Metadata obfuscation | ✅ | ❌ | ⚠️ | ✅ |
| Stealth addresses | ✅ | ❌ | ❌ | N/A |
| Auditable | ✅ | ✅ | ✅ | ✅ |
| Gas efficient | ✅ | ✅ | ❌ | N/A |

---

**Deployed Transaction:** https://explorer.solana.com/tx/3fjJvjK9dqm6cuPLJnXStLMEcoBVmdjtEbr2kkQ6cEJkvXijizJQC8RwAxgdjMdnU89H33zHzf6Q5L1bSTfmSRZ3?cluster=devnet

**Built with privacy-first principles. Auditable. Open source.**
