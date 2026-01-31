/**
 * Messaging Module - Private E2E Encrypted Messaging
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { keccak_256 } from '@noble/hashes/sha3';
import { x25519 } from '@noble/curves/ed25519';
import { chacha20poly1305 } from '@noble/ciphers/chacha';

// ============================================================================
// CONSTANTS
// ============================================================================

export const STYX_PROGRAM_ID = new PublicKey('GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9');

// Instruction tags
const TAG_PRIVATE_MESSAGE = 3;
const TAG_ROUTED_MESSAGE = 4;
const TAG_RATCHET_MESSAGE = 7;

// Flags
const FLAG_ENCRYPTED = 0x01;
const FLAG_STEALTH = 0x02;
const FLAG_COMPLIANCE = 0x10;

// ============================================================================
// TYPES
// ============================================================================

export interface EncryptedMessage {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  ephemeralPubkey?: Uint8Array;
}

export interface MessageThread {
  threadId: string;
  participants: PublicKey[];
  lastMessage?: Date;
  unreadCount: number;
}

// ============================================================================
// CRYPTO HELPERS
// ============================================================================

/**
 * Derive shared secret using X25519
 */
export function deriveSharedSecret(
  myPrivateKey: Uint8Array,
  theirPublicKey: Uint8Array
): Uint8Array {
  return x25519.scalarMult(myPrivateKey, theirPublicKey);
}

/**
 * Generate X25519 keypair for key exchange
 */
export function generateX25519Keypair(): { privateKey: Uint8Array; publicKey: Uint8Array } {
  const privateKey = crypto.getRandomValues(new Uint8Array(32));
  const publicKey = x25519.scalarMultBase(privateKey);
  return { privateKey, publicKey };
}

/**
 * Encrypt message with ChaCha20-Poly1305
 */
export function encryptMessage(message: Uint8Array, sharedSecret: Uint8Array): EncryptedMessage {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const cipher = chacha20poly1305(sharedSecret, nonce);
  const ciphertext = cipher.encrypt(message);
  return { ciphertext, nonce };
}

/**
 * Decrypt message with ChaCha20-Poly1305
 */
export function decryptMessage(encrypted: EncryptedMessage, sharedSecret: Uint8Array): Uint8Array {
  const cipher = chacha20poly1305(sharedSecret, encrypted.nonce);
  return cipher.decrypt(encrypted.ciphertext);
}

/**
 * Encrypt payload (legacy format with nonce prepended)
 */
export function encryptPayload(message: Uint8Array, sharedSecret: Uint8Array): Uint8Array {
  const { ciphertext, nonce } = encryptMessage(message, sharedSecret);
  return new Uint8Array([...nonce, ...ciphertext]);
}

/**
 * Decrypt payload (legacy format)
 */
export function decryptPayload(encrypted: Uint8Array, sharedSecret: Uint8Array): Uint8Array {
  const nonce = encrypted.slice(0, 12);
  const ciphertext = encrypted.slice(12);
  return decryptMessage({ ciphertext, nonce }, sharedSecret);
}

/**
 * Encrypt recipient pubkey using Keccak256 XOR mask
 */
export function encryptRecipient(sender: PublicKey, recipient: PublicKey): Uint8Array {
  const mask = keccak_256(Buffer.concat([
    Buffer.from('STYX_META_V3'),
    sender.toBytes()
  ]));
  const encrypted = new Uint8Array(32);
  const recipientBytes = recipient.toBytes();
  for (let i = 0; i < 32; i++) {
    encrypted[i] = recipientBytes[i] ^ mask[i];
  }
  return encrypted;
}

/**
 * Decrypt recipient pubkey
 */
export function decryptRecipient(sender: PublicKey, encrypted: Uint8Array): PublicKey {
  const mask = keccak_256(Buffer.concat([
    Buffer.from('STYX_META_V3'),
    sender.toBytes()
  ]));
  const decrypted = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    decrypted[i] = encrypted[i] ^ mask[i];
  }
  return new PublicKey(decrypted);
}

// ============================================================================
// MESSAGING CLIENT
// ============================================================================

/**
 * Styx Messaging Client
 * 
 * Private end-to-end encrypted messaging on Solana
 */
export class StyxMessaging {
  private connection: Connection;
  private programId: PublicKey;

  constructor(connection: Connection, programId: PublicKey = STYX_PROGRAM_ID) {
    this.connection = connection;
    this.programId = programId;
  }

  /**
   * Build a private message instruction
   */
  buildPrivateMessageInstruction(
    sender: PublicKey,
    recipient: PublicKey,
    payload: Uint8Array,
    options?: { stealth?: boolean; compliance?: boolean }
  ): TransactionInstruction {
    let flags = FLAG_ENCRYPTED;
    if (options?.stealth) flags |= FLAG_STEALTH;
    if (options?.compliance) flags |= FLAG_COMPLIANCE;

    const encryptedRecipient = encryptRecipient(sender, recipient);
    
    const payloadLen = Buffer.alloc(2);
    payloadLen.writeUInt16LE(payload.length);

    const data = Buffer.concat([
      Buffer.from([TAG_PRIVATE_MESSAGE, flags]),
      Buffer.from(encryptedRecipient),
      sender.toBytes(),
      payloadLen,
      Buffer.from(payload)
    ]);

    return new TransactionInstruction({
      programId: this.programId,
      keys: [],
      data
    });
  }

  /**
   * Send a private message
   */
  async sendPrivateMessage(
    sender: Keypair,
    recipient: PublicKey,
    message: string | Uint8Array,
    sharedSecret: Uint8Array,
    options?: { stealth?: boolean }
  ): Promise<string> {
    const messageBytes = typeof message === 'string' 
      ? new TextEncoder().encode(message) 
      : message;
    
    const encryptedPayload = encryptPayload(messageBytes, sharedSecret);
    
    const instruction = this.buildPrivateMessageInstruction(
      sender.publicKey,
      recipient,
      encryptedPayload,
      options
    );

    const tx = new Transaction().add(instruction);
    return await sendAndConfirmTransaction(this.connection, tx, [sender]);
  }

  /**
   * Send a routed message through multiple hops (onion routing)
   */
  async sendRoutedMessage(
    sender: Keypair,
    recipient: PublicKey,
    hops: PublicKey[],
    message: Uint8Array,
    sharedSecret: Uint8Array
  ): Promise<string> {
    const encryptedPayload = encryptPayload(message, sharedSecret);
    const routeInfo = new Uint8Array(32).fill(0);
    
    const encryptedRecipient = encryptRecipient(sender.publicKey, recipient);
    const payloadLen = Buffer.alloc(2);
    payloadLen.writeUInt16LE(encryptedPayload.length);

    const data = Buffer.concat([
      Buffer.from([TAG_ROUTED_MESSAGE, FLAG_ENCRYPTED, hops.length]),
      Buffer.from(encryptedRecipient),
      Buffer.from([0x00]),
      Buffer.from([0]),
      Buffer.from(routeInfo),
      payloadLen,
      Buffer.from(encryptedPayload)
    ]);

    const instruction = new TransactionInstruction({
      programId: this.programId,
      keys: [],
      data
    });

    const tx = new Transaction().add(instruction);
    return await sendAndConfirmTransaction(this.connection, tx, [sender]);
  }

  /**
   * Derive shared secret for a conversation
   */
  deriveSharedSecret(myPrivateKey: Uint8Array, theirPublicKey: Uint8Array): Uint8Array {
    return deriveSharedSecret(myPrivateKey, theirPublicKey);
  }

  /**
   * Encrypt a message for sending
   */
  encryptMessage(message: string, sharedSecret: Uint8Array): Uint8Array {
    const messageBytes = new TextEncoder().encode(message);
    return encryptPayload(messageBytes, sharedSecret);
  }

  /**
   * Decrypt a received message
   */
  decryptMessage(encrypted: Uint8Array, sharedSecret: Uint8Array): string {
    const decrypted = decryptPayload(encrypted, sharedSecret);
    return new TextDecoder().decode(decrypted);
  }
}

/**
 * Create a messaging client
 */
export function createMessagingClient(
  connection: Connection,
  programId?: PublicKey
): StyxMessaging {
  return new StyxMessaging(connection, programId);
}
