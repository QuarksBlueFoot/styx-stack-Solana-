import { Keypair, PublicKey } from '@solana/web3.js';
import crypto from 'crypto';

// Keccak256 (sha3-256)
function keccakHash(...data) {
  const hash = crypto.createHash('sha3-256');
  data.forEach(d => hash.update(d));
  return hash.digest();
}

function encryptRecipient(sender, recipient) {
  const mask = keccakHash(Buffer.from('STYX_META_V3'), Buffer.from(sender.toBytes()));
  const recipientBytes = recipient.toBytes();
  const encrypted = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) {
    encrypted[i] = recipientBytes[i] ^ mask[i];
  }
  return encrypted;
}

function decryptRecipient(sender, encrypted) {
  const mask = keccakHash(Buffer.from('STYX_META_V3'), Buffer.from(sender.toBytes()));
  const decrypted = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) {
    decrypted[i] = encrypted[i] ^ mask[i];
  }
  return new PublicKey(decrypted);
}

// Test
const sender = Keypair.generate().publicKey;
const recipient = Keypair.generate().publicKey;

console.log('Sender:', sender.toString());
console.log('Recipient (original):', recipient.toString());

const encrypted = encryptRecipient(sender, recipient);
console.log('Encrypted:', encrypted.toString('hex'));

const decrypted = decryptRecipient(sender, encrypted);
console.log('Recipient (decrypted):', decrypted.toString());

console.log('\nMatch:', recipient.equals(decrypted));
