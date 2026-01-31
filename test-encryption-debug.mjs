import { PublicKey, Keypair } from '@solana/web3.js';
import crypto from 'crypto';

const LAMPORTS_PER_SOL = 1_000_000_000;

function keccakHash(...data) {
  const hash = crypto.createHash('sha3-256');
  data.forEach(d => hash.update(d));
  return hash.digest();
}

function encryptAmount(sender, recipient, amount, nonce) {
  const hash = keccakHash(
    Buffer.from('STYX_XFER_V3'),
    Buffer.from(sender.toBytes()),
    Buffer.from(recipient.toBytes()),
    nonce
  );
  
  console.log('Hash:', hash.toString('hex'));
  console.log('First 8 bytes:', hash.subarray(0, 8).toString('hex'));
  
  const mask = hash.readBigUInt64LE(0);
  console.log('Mask (u64 LE):', mask.toString());
  console.log('Mask (hex):', mask.toString(16));
  
  const encrypted = BigInt(amount) ^ mask;
  console.log('Amount:', amount);
  console.log('Amount (BigInt):', BigInt(amount).toString());
  console.log('Encrypted:', encrypted.toString());
  console.log('Encrypted (hex):', encrypted.toString(16));
  
  // Verify decryption
  const decrypted = encrypted ^ mask;
  console.log('Decrypted:', decrypted.toString());
  console.log('Match:', decrypted === BigInt(amount));
  
  return encrypted;
}

const wallet = Keypair.generate();
const receiver = Keypair.generate();
const amount = 0.001 * LAMPORTS_PER_SOL; // 1000000 lamports
const nonce = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);

console.log('\n=== Testing Encryption ===\n');
console.log('Sender:', wallet.publicKey.toString());
console.log('Receiver:', receiver.publicKey.toString());
console.log('Nonce:', nonce.toString('hex'));
console.log();

const encrypted = encryptAmount(wallet.publicKey, receiver.publicKey, amount, nonce);

console.log('\n=== Testing Buffer Write ===\n');
const buf = Buffer.alloc(8);
buf.writeBigUInt64LE(encrypted);
console.log('Buffer:', buf.toString('hex'));
const readBack = buf.readBigUInt64LE(0);
console.log('Read back:', readBack.toString());
console.log('Match:', readBack === encrypted);
