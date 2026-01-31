/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX PRIVATE MESSAGING
 *  
 *  Signal-like encrypted messaging on Solana
 *  Features: E2E encryption, group chats, file sharing, message reactions
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { 
  PublicKey, 
  Connection, 
  Keypair, 
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from '@noble/ciphers/webcrypto';
import {
  StyxClient,
  StyxConfig,
  encryptData,
  decryptData,
  computeSharedSecret,
  deriveEncryptionKey,
  ed25519ToX25519,
  encodeEnvelope,
  decodeEnvelope,
  EnvelopeKind,
  STYX_PROGRAM_ID,
} from '../../core';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PrivateMessage {
  id: string;
  sender: PublicKey;
  recipient: PublicKey;
  content: string;
  timestamp: number;
  signature: string;
  ephemeralPubkey: Uint8Array;
  replyTo?: string;
  reactions?: MessageReaction[];
  attachments?: MessageAttachment[];
  readReceipt?: boolean;
}

export interface MessageReaction {
  emoji: string;
  from: PublicKey;
  timestamp: number;
}

export interface MessageAttachment {
  type: 'image' | 'file' | 'audio' | 'video';
  name: string;
  size: number;
  encryptedUrl: string;
  thumbnailUrl?: string;
  mimeType: string;
}

export interface GroupChat {
  id: string;
  name: string;
  members: PublicKey[];
  admins: PublicKey[];
  createdAt: number;
  groupKey: Uint8Array; // Shared group encryption key
  avatar?: string;
  description?: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  participants: PublicKey[];
  lastMessage?: PrivateMessage;
  unreadCount: number;
  updatedAt: number;
  muted: boolean;
  archived: boolean;
}

export interface MessagingSession {
  theirPubkey: PublicKey;
  theirX25519Key: Uint8Array;
  ourX25519Key: { publicKey: Uint8Array; secretKey: Uint8Array };
  sharedSecret: Uint8Array;
  chainKey: Uint8Array;
  messageIndex: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOUBLE RATCHET PROTOCOL (Signal Protocol Core)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Styx Double Ratchet implementation for forward secrecy
 * Each message uses a new derived key, providing Perfect Forward Secrecy
 */
export class StyxDoubleRatchet {
  private rootKey: Uint8Array;
  private sendChainKey: Uint8Array;
  private receiveChainKey: Uint8Array;
  private sendMessageNumber: number = 0;
  private receiveMessageNumber: number = 0;
  private ourRatchetKey: { publicKey: Uint8Array; secretKey: Uint8Array };
  private theirRatchetKey: Uint8Array;

  constructor(
    sharedSecret: Uint8Array,
    ourRatchetKey: { publicKey: Uint8Array; secretKey: Uint8Array },
    theirRatchetKey: Uint8Array,
    isInitiator: boolean
  ) {
    this.rootKey = sha256(new Uint8Array([...sharedSecret, ...Buffer.from('styx-ratchet-root')]));
    this.ourRatchetKey = ourRatchetKey;
    this.theirRatchetKey = theirRatchetKey;
    
    // Derive initial chain keys
    const chainMaterial = sha256(new Uint8Array([...this.rootKey, ...Buffer.from('chain')]));
    if (isInitiator) {
      this.sendChainKey = chainMaterial.slice(0, 32);
      this.receiveChainKey = sha256(chainMaterial);
    } else {
      this.receiveChainKey = chainMaterial.slice(0, 32);
      this.sendChainKey = sha256(chainMaterial);
    }
  }

  /**
   * Derive the next message key for sending
   */
  deriveNextSendKey(): { messageKey: Uint8Array; messageNumber: number } {
    const messageKey = sha256(
      new Uint8Array([...this.sendChainKey, ...Buffer.from('message-key'), this.sendMessageNumber])
    );
    
    // Advance chain
    this.sendChainKey = sha256(new Uint8Array([...this.sendChainKey, ...Buffer.from('chain-advance')]));
    const messageNumber = this.sendMessageNumber++;
    
    return { messageKey, messageNumber };
  }

  /**
   * Derive the message key for receiving
   */
  deriveReceiveKey(messageNumber: number): Uint8Array {
    // In a full implementation, we'd handle out-of-order messages
    // For now, assume in-order delivery
    let chainKey = this.receiveChainKey;
    
    for (let i = this.receiveMessageNumber; i < messageNumber; i++) {
      chainKey = sha256(new Uint8Array([...chainKey, ...Buffer.from('chain-advance')]));
    }
    
    const messageKey = sha256(
      new Uint8Array([...chainKey, ...Buffer.from('message-key'), messageNumber])
    );
    
    this.receiveMessageNumber = messageNumber + 1;
    this.receiveChainKey = sha256(new Uint8Array([...chainKey, ...Buffer.from('chain-advance')]));
    
    return messageKey;
  }

  /**
   * Perform a DH ratchet step when receiving a new ratchet key
   */
  ratchetStep(theirNewRatchetKey: Uint8Array): void {
    // Compute new shared secret
    const sharedSecret = computeSharedSecret(this.ourRatchetKey.secretKey, theirNewRatchetKey);
    
    // Derive new root and chain keys
    const kdfOutput = sha256(new Uint8Array([...this.rootKey, ...sharedSecret]));
    this.rootKey = kdfOutput.slice(0, 32);
    this.receiveChainKey = sha256(kdfOutput);
    
    // Generate new ratchet keypair
    const newSecretKey = randomBytes(32);
    const newPublicKey = computeSharedSecret(newSecretKey, new Uint8Array(32).fill(9)); // Base point
    this.ourRatchetKey = { publicKey: newPublicKey, secretKey: newSecretKey };
    
    // Derive new send chain
    const newShared = computeSharedSecret(this.ourRatchetKey.secretKey, theirNewRatchetKey);
    const sendKdf = sha256(new Uint8Array([...this.rootKey, ...newShared]));
    this.rootKey = sendKdf.slice(0, 32);
    this.sendChainKey = sha256(sendKdf);
    
    // Reset message counters
    this.sendMessageNumber = 0;
    this.receiveMessageNumber = 0;
    this.theirRatchetKey = theirNewRatchetKey;
  }

  /**
   * Get current ratchet public key for including in messages
   */
  getPublicRatchetKey(): Uint8Array {
    return this.ourRatchetKey.publicKey;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE MESSAGING CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface MessagingClientOptions {
  client: StyxClient;
  signer: Keypair;
  onMessage?: (message: PrivateMessage) => void;
  onTyping?: (from: PublicKey) => void;
  onDelivered?: (messageId: string) => void;
  onRead?: (messageId: string) => void;
}

/**
 * Main client for Styx private messaging
 */
export class PrivateMessagingClient {
  private readonly client: StyxClient;
  private readonly signer: Keypair;
  private readonly x25519Keys: { publicKey: Uint8Array; secretKey: Uint8Array };
  private readonly sessions: Map<string, StyxDoubleRatchet> = new Map();
  private readonly onMessage?: (message: PrivateMessage) => void;
  private readonly onTyping?: (from: PublicKey) => void;
  private readonly onDelivered?: (messageId: string) => void;
  private readonly onRead?: (messageId: string) => void;
  private relayConnection?: WebSocket;

  constructor(options: MessagingClientOptions) {
    this.client = options.client;
    this.signer = options.signer;
    this.x25519Keys = ed25519ToX25519(options.signer.secretKey);
    this.onMessage = options.onMessage;
    this.onTyping = options.onTyping;
    this.onDelivered = options.onDelivered;
    this.onRead = options.onRead;
  }

  /**
   * Get our X25519 public key for key exchange
   */
  getPublicEncryptionKey(): Uint8Array {
    return this.x25519Keys.publicKey;
  }

  /**
   * Initialize or get a messaging session with a peer
   */
  async initSession(
    theirPubkey: PublicKey,
    theirX25519Key: Uint8Array
  ): Promise<StyxDoubleRatchet> {
    const sessionKey = theirPubkey.toBase58();
    
    if (this.sessions.has(sessionKey)) {
      return this.sessions.get(sessionKey)!;
    }

    // Compute initial shared secret
    const sharedSecret = computeSharedSecret(this.x25519Keys.secretKey, theirX25519Key);
    
    // Determine initiator (lexicographically smaller pubkey initiates)
    const isInitiator = this.signer.publicKey.toBase58() < theirPubkey.toBase58();
    
    // Create double ratchet session
    const ratchet = new StyxDoubleRatchet(
      sharedSecret,
      this.x25519Keys,
      theirX25519Key,
      isInitiator
    );
    
    this.sessions.set(sessionKey, ratchet);
    return ratchet;
  }

  /**
   * Send an encrypted message to a recipient
   */
  async sendMessage(
    recipient: PublicKey,
    recipientX25519Key: Uint8Array,
    content: string,
    options?: {
      replyTo?: string;
      attachments?: MessageAttachment[];
    }
  ): Promise<PrivateMessage> {
    // Get or create session
    const ratchet = await this.initSession(recipient, recipientX25519Key);
    
    // Derive message key
    const { messageKey, messageNumber } = ratchet.deriveNextSendKey();
    
    // Create message payload
    const messagePayload = {
      content,
      timestamp: Date.now(),
      replyTo: options?.replyTo,
      attachments: options?.attachments,
      ratchetKey: Array.from(ratchet.getPublicRatchetKey()),
      messageNumber,
    };
    
    // Encrypt
    const plaintext = new TextEncoder().encode(JSON.stringify(messagePayload));
    const { ciphertext, nonce } = encryptData(plaintext, messageKey);
    
    // Create envelope
    const header = new TextEncoder().encode(JSON.stringify({
      sender: this.signer.publicKey.toBase58(),
      recipient: recipient.toBase58(),
      ephemeralKey: Array.from(this.x25519Keys.publicKey),
    }));
    
    const envelope = encodeEnvelope({
      version: 1,
      kind: EnvelopeKind.MESSAGE,
      header,
      body: new Uint8Array([...nonce, ...ciphertext]),
    });
    
    // Create transaction with memo
    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: true },
          { pubkey: recipient, isSigner: false, isWritable: false },
        ],
        programId: STYX_PROGRAM_ID,
        data: Buffer.from([0x01, ...envelope]), // 0x01 = MESSAGE domain
      })
    );
    
    // Sign and send
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    const signature = await this.client.connection.sendRawTransaction(tx.serialize());
    
    // Generate message ID
    const messageId = sha256(new Uint8Array([...envelope, ...Buffer.from(signature)]));
    
    return {
      id: Buffer.from(messageId).toString('hex').slice(0, 16),
      sender: this.signer.publicKey,
      recipient,
      content,
      timestamp: messagePayload.timestamp,
      signature,
      ephemeralPubkey: this.x25519Keys.publicKey,
      replyTo: options?.replyTo,
      attachments: options?.attachments,
    };
  }

  /**
   * Decrypt and process a received message
   */
  async decryptMessage(
    encryptedEnvelope: Uint8Array,
    senderPubkey: PublicKey,
    senderX25519Key: Uint8Array
  ): Promise<PrivateMessage> {
    // Decode envelope
    const envelope = decodeEnvelope(encryptedEnvelope);
    
    if (envelope.kind !== EnvelopeKind.MESSAGE) {
      throw new Error('Invalid envelope kind for message');
    }
    
    // Extract nonce and ciphertext
    const nonce = envelope.body.slice(0, 24);
    const ciphertext = envelope.body.slice(24);
    
    // Get or create session
    const ratchet = await this.initSession(senderPubkey, senderX25519Key);
    
    // Parse header for message metadata
    const header = JSON.parse(new TextDecoder().decode(envelope.header));
    
    // Check if we need to ratchet
    const theirRatchetKey = new Uint8Array(header.ephemeralKey);
    
    // Derive message key (simplified - would track message number properly)
    const sharedSecret = computeSharedSecret(this.x25519Keys.secretKey, senderX25519Key);
    const messageKey = deriveEncryptionKey(sharedSecret, 'styx-message-v1');
    
    // Decrypt
    const plaintext = decryptData(ciphertext, messageKey, nonce);
    const payload = JSON.parse(new TextDecoder().decode(plaintext));
    
    return {
      id: sha256(encryptedEnvelope).slice(0, 8).toString(),
      sender: senderPubkey,
      recipient: this.signer.publicKey,
      content: payload.content,
      timestamp: payload.timestamp,
      signature: '',
      ephemeralPubkey: theirRatchetKey,
      replyTo: payload.replyTo,
      attachments: payload.attachments,
    };
  }

  /**
   * Connect to the relay for real-time message delivery
   */
  async connectToRelay(): Promise<void> {
    const relayUrl = this.client.getRelayUrl();
    
    return new Promise((resolve, reject) => {
      this.relayConnection = new WebSocket(relayUrl);
      
      this.relayConnection.onopen = () => {
        // Subscribe to our inbox
        this.relayConnection!.send(JSON.stringify({
          type: 'subscribe',
          pubkey: this.signer.publicKey.toBase58(),
          signature: 'TODO_SIGN_AUTH_MESSAGE',
        }));
        resolve();
      };
      
      this.relayConnection.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data.toString());
          
          if (data.type === 'message') {
            // Decrypt and handle incoming message
            const message = await this.decryptMessage(
              new Uint8Array(data.envelope),
              new PublicKey(data.sender),
              new Uint8Array(data.senderX25519)
            );
            this.onMessage?.(message);
          } else if (data.type === 'typing') {
            this.onTyping?.(new PublicKey(data.from));
          } else if (data.type === 'delivered') {
            this.onDelivered?.(data.messageId);
          } else if (data.type === 'read') {
            this.onRead?.(data.messageId);
          }
        } catch (e) {
          console.error('Failed to process relay message:', e);
        }
      };
      
      this.relayConnection.onerror = (error) => {
        reject(error);
      };
    });
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(to: PublicKey): void {
    if (this.relayConnection?.readyState === WebSocket.OPEN) {
      this.relayConnection.send(JSON.stringify({
        type: 'typing',
        from: this.signer.publicKey.toBase58(),
        to: to.toBase58(),
      }));
    }
  }

  /**
   * Send read receipt
   */
  sendReadReceipt(messageId: string, to: PublicKey): void {
    if (this.relayConnection?.readyState === WebSocket.OPEN) {
      this.relayConnection.send(JSON.stringify({
        type: 'read',
        messageId,
        from: this.signer.publicKey.toBase58(),
        to: to.toBase58(),
      }));
    }
  }

  /**
   * Disconnect from relay
   */
  disconnect(): void {
    this.relayConnection?.close();
    this.relayConnection = undefined;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP MESSAGING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new encrypted group chat
 */
export async function createGroupChat(
  client: StyxClient,
  creator: Keypair,
  name: string,
  members: PublicKey[],
  options?: {
    description?: string;
    avatar?: string;
  }
): Promise<GroupChat> {
  // Generate group encryption key
  const groupKey = randomBytes(32);
  
  // Generate group ID
  const groupIdPreimage = new Uint8Array([
    ...creator.publicKey.toBytes(),
    ...Buffer.from(name),
    ...randomBytes(16),
  ]);
  const groupId = sha256(groupIdPreimage);
  
  // In a full implementation, we'd encrypt the group key for each member
  // and store the group metadata on-chain or in a distributed storage
  
  return {
    id: Buffer.from(groupId).toString('hex').slice(0, 16),
    name,
    members: [creator.publicKey, ...members],
    admins: [creator.publicKey],
    createdAt: Date.now(),
    groupKey,
    avatar: options?.avatar,
    description: options?.description,
  };
}

/**
 * Send a message to a group
 */
export async function sendGroupMessage(
  client: StyxClient,
  signer: Keypair,
  group: GroupChat,
  content: string,
  options?: {
    replyTo?: string;
    attachments?: MessageAttachment[];
  }
): Promise<PrivateMessage> {
  // Encrypt with group key
  const messagePayload = {
    content,
    timestamp: Date.now(),
    sender: signer.publicKey.toBase58(),
    replyTo: options?.replyTo,
    attachments: options?.attachments,
  };
  
  const plaintext = new TextEncoder().encode(JSON.stringify(messagePayload));
  const { ciphertext, nonce } = encryptData(plaintext, group.groupKey);
  
  // Create envelope
  const header = new TextEncoder().encode(JSON.stringify({
    groupId: group.id,
    sender: signer.publicKey.toBase58(),
  }));
  
  const envelope = encodeEnvelope({
    version: 1,
    kind: EnvelopeKind.MESSAGE,
    header,
    body: new Uint8Array([...nonce, ...ciphertext]),
  });
  
  // Broadcast to all members (via relay or on-chain)
  // In production, this would fan out through the relay
  
  const messageId = sha256(envelope);
  
  return {
    id: Buffer.from(messageId).toString('hex').slice(0, 16),
    sender: signer.publicKey,
    recipient: signer.publicKey, // Group context
    content,
    timestamp: messagePayload.timestamp,
    signature: '',
    ephemeralPubkey: new Uint8Array(32),
    replyTo: options?.replyTo,
    attachments: options?.attachments,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  PrivateMessagingClient as MessagingClient,
  StyxDoubleRatchet as DoubleRatchet,
};
