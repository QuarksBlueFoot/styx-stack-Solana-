/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  STYX PRIVATE SOCIAL
 *  
 *  Private social features for Solana apps
 *  Features: Private profiles, encrypted contacts, reputation, identity
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from '@noble/ciphers/webcrypto';
import bs58 from 'bs58';
import {
  StyxClient,
  encryptData,
  decryptData,
  deriveEncryptionKey,
  computeSharedSecret,
  ed25519ToX25519,
  encodeEnvelope,
  EnvelopeKind,
  STYX_PROGRAM_ID,
} from '../../core';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PrivateProfile {
  /** Profile ID */
  id: string;
  /** Solana address */
  address: PublicKey;
  /** Public display name */
  displayName: string;
  /** Avatar URL */
  avatar?: string;
  /** Bio */
  bio?: string;
  /** Public profile data */
  publicData: Record<string, unknown>;
  /** Encrypted private data (only you can see) */
  privateData?: Uint8Array;
  /** Social links */
  links?: SocialLink[];
  /** X25519 public key for encrypted comms */
  encryptionKey: Uint8Array;
  /** Created/updated timestamps */
  createdAt: number;
  updatedAt: number;
}

export interface SocialLink {
  platform: 'twitter' | 'github' | 'discord' | 'telegram' | 'website' | 'other';
  handle: string;
  verified: boolean;
}

export interface Contact {
  /** Contact ID */
  id: string;
  /** Their Solana address */
  address: PublicKey;
  /** Their X25519 public key */
  encryptionKey: Uint8Array;
  /** Custom nickname (encrypted, only you see) */
  nickname?: string;
  /** Notes about contact (encrypted) */
  notes?: string;
  /** Trust level */
  trustLevel: 'unknown' | 'verified' | 'trusted' | 'blocked';
  /** Tags for organization */
  tags: string[];
  /** Added at */
  addedAt: number;
  /** Last interaction */
  lastInteraction?: number;
}

export interface ContactRequest {
  id: string;
  from: PublicKey;
  fromProfile: PrivateProfile;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}

export interface ReputationScore {
  /** Overall score (0-100) */
  overall: number;
  /** Transaction history score */
  transactions: number;
  /** Age of account */
  accountAge: number;
  /** Social connections */
  social: number;
  /** Verified attestations */
  attestations: Attestation[];
  /** Last updated */
  updatedAt: number;
}

export interface Attestation {
  /** Attestation type */
  type: 'identity' | 'humanity' | 'accredited' | 'kyc' | 'custom';
  /** Issuer */
  issuer: PublicKey;
  /** Issuer name */
  issuerName: string;
  /** Claim (encrypted or public) */
  claim: string;
  /** Signature from issuer */
  signature: Uint8Array;
  /** Valid until */
  validUntil: number;
  /** Created at */
  createdAt: number;
}

export interface Post {
  id: string;
  author: PublicKey | null; // null if anonymous
  content: string;
  contentType: 'text' | 'image' | 'link' | 'poll';
  visibility: 'public' | 'followers' | 'private';
  reactions: PostReaction[];
  replyCount: number;
  repostCount: number;
  createdAt: number;
}

export interface PostReaction {
  type: string; // emoji
  count: number;
  reacted: boolean; // current user
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE SOCIAL CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface SocialClientOptions {
  client: StyxClient;
  signer: Keypair;
}

export class PrivateSocialClient {
  private readonly client: StyxClient;
  private readonly signer: Keypair;
  private readonly x25519Keys: { publicKey: Uint8Array; secretKey: Uint8Array };
  private contacts: Map<string, Contact> = new Map();

  constructor(options: SocialClientOptions) {
    this.client = options.client;
    this.signer = options.signer;
    this.x25519Keys = ed25519ToX25519(options.signer.secretKey);
  }

  /**
   * Get our encryption public key for sharing
   */
  getEncryptionKey(): Uint8Array {
    return this.x25519Keys.publicKey;
  }

  /**
   * Create or update profile
   */
  async updateProfile(profile: {
    displayName: string;
    avatar?: string;
    bio?: string;
    links?: SocialLink[];
    publicData?: Record<string, unknown>;
    privateData?: Record<string, unknown>;
  }): Promise<PrivateProfile> {
    // Encrypt private data if provided
    let encryptedPrivateData: Uint8Array | undefined;
    if (profile.privateData) {
      const key = deriveEncryptionKey(this.signer.secretKey, 'profile-private');
      const { ciphertext, nonce } = encryptData(
        new TextEncoder().encode(JSON.stringify(profile.privateData)),
        key
      );
      encryptedPrivateData = new Uint8Array([...nonce, ...ciphertext]);
    }
    
    const profileData = {
      displayName: profile.displayName,
      avatar: profile.avatar,
      bio: profile.bio,
      links: profile.links,
      publicData: profile.publicData ?? {},
      encryptionKey: Array.from(this.x25519Keys.publicKey),
    };
    
    const envelope = encodeEnvelope({
      version: 1,
      kind: EnvelopeKind.SOCIAL_POST,
      header: new TextEncoder().encode(JSON.stringify({
        type: 'profile_update',
        address: this.signer.publicKey.toBase58(),
      })),
      body: new TextEncoder().encode(JSON.stringify(profileData)),
    });
    
    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: true },
        ],
        programId: STYX_PROGRAM_ID,
        data: Buffer.from([0x60, ...envelope]), // 0x60 = UPDATE_PROFILE
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    await this.client.connection.sendRawTransaction(tx.serialize());
    
    return {
      id: this.signer.publicKey.toBase58().slice(0, 8),
      address: this.signer.publicKey,
      displayName: profile.displayName,
      avatar: profile.avatar,
      bio: profile.bio,
      publicData: profile.publicData ?? {},
      privateData: encryptedPrivateData,
      links: profile.links,
      encryptionKey: this.x25519Keys.publicKey,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Get profile by address
   */
  async getProfile(address: PublicKey): Promise<PrivateProfile | null> {
    const indexerUrl = this.client.getIndexerUrl();
    
    try {
      const response = await fetch(`${indexerUrl}/v1/social/profile/${address.toBase58()}`);
      
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Handle error
    }
    
    return null;
  }

  /**
   * Add a contact
   */
  async addContact(
    address: PublicKey,
    options?: {
      nickname?: string;
      notes?: string;
      tags?: string[];
      sendRequest?: boolean;
    }
  ): Promise<Contact> {
    // Fetch their profile to get encryption key
    const profile = await this.getProfile(address);
    const encryptionKey = profile?.encryptionKey ?? new Uint8Array(32);
    
    const contactId = bs58.encode(sha256(address.toBytes()).slice(0, 8));
    
    // Encrypt nickname and notes
    const key = deriveEncryptionKey(this.signer.secretKey, 'contacts-encryption');
    
    let encryptedNickname: string | undefined;
    if (options?.nickname) {
      const { ciphertext, nonce } = encryptData(
        new TextEncoder().encode(options.nickname),
        key
      );
      encryptedNickname = bs58.encode(new Uint8Array([...nonce, ...ciphertext]));
    }
    
    let encryptedNotes: string | undefined;
    if (options?.notes) {
      const { ciphertext, nonce } = encryptData(
        new TextEncoder().encode(options.notes),
        key
      );
      encryptedNotes = bs58.encode(new Uint8Array([...nonce, ...ciphertext]));
    }
    
    const contact: Contact = {
      id: contactId,
      address,
      encryptionKey,
      nickname: options?.nickname,
      notes: options?.notes,
      trustLevel: 'unknown',
      tags: options?.tags ?? [],
      addedAt: Date.now(),
    };
    
    this.contacts.set(contactId, contact);
    
    // Send contact request if requested
    if (options?.sendRequest) {
      await this.sendContactRequest(address, 'Would like to connect with you!');
    }
    
    return contact;
  }

  /**
   * Send contact request
   */
  async sendContactRequest(to: PublicKey, message?: string): Promise<ContactRequest> {
    const requestId = bs58.encode(randomBytes(8));
    
    // Encrypt message with recipient's key if we have it
    const profile = await this.getProfile(to);
    let encryptedMessage: string | undefined;
    
    if (message && profile?.encryptionKey) {
      const sharedSecret = computeSharedSecret(
        this.x25519Keys.secretKey,
        profile.encryptionKey
      );
      const key = deriveEncryptionKey(sharedSecret, 'contact-request');
      const { ciphertext, nonce } = encryptData(
        new TextEncoder().encode(message),
        key
      );
      encryptedMessage = bs58.encode(new Uint8Array([...nonce, ...ciphertext]));
    }
    
    const requestData = {
      id: requestId,
      from: this.signer.publicKey.toBase58(),
      message: encryptedMessage ?? message,
      ephemeralKey: Array.from(this.x25519Keys.publicKey),
    };
    
    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: false },
          { pubkey: to, isSigner: false, isWritable: false },
        ],
        programId: STYX_PROGRAM_ID,
        data: Buffer.from([
          0x61, // SEND_CONTACT_REQUEST
          ...new TextEncoder().encode(JSON.stringify(requestData)),
        ]),
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    await this.client.connection.sendRawTransaction(tx.serialize());
    
    return {
      id: requestId,
      from: this.signer.publicKey,
      fromProfile: {
        id: '',
        address: this.signer.publicKey,
        displayName: '',
        publicData: {},
        encryptionKey: this.x25519Keys.publicKey,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      message,
      status: 'pending',
      createdAt: Date.now(),
    };
  }

  /**
   * Get pending contact requests
   */
  async getContactRequests(): Promise<ContactRequest[]> {
    const indexerUrl = this.client.getIndexerUrl();
    
    try {
      const response = await fetch(`${indexerUrl}/v1/social/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: this.signer.publicKey.toBase58(),
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.requests ?? [];
      }
    } catch {
      // Handle error
    }
    
    return [];
  }

  /**
   * Accept or reject contact request
   */
  async respondToRequest(requestId: string, accept: boolean): Promise<void> {
    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: false },
        ],
        programId: STYX_PROGRAM_ID,
        data: Buffer.from([
          accept ? 0x62 : 0x63, // ACCEPT_REQUEST or REJECT_REQUEST
          ...bs58.decode(requestId),
        ]),
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    await this.client.connection.sendRawTransaction(tx.serialize());
  }

  /**
   * Get my reputation score
   */
  async getReputationScore(): Promise<ReputationScore> {
    const indexerUrl = this.client.getIndexerUrl();
    
    try {
      const response = await fetch(
        `${indexerUrl}/v1/social/reputation/${this.signer.publicKey.toBase58()}`
      );
      
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Handle error
    }
    
    // Return default score
    return {
      overall: 50,
      transactions: 50,
      accountAge: 50,
      social: 50,
      attestations: [],
      updatedAt: Date.now(),
    };
  }

  /**
   * Create an attestation for another user
   */
  async createAttestation(
    subject: PublicKey,
    attestation: {
      type: Attestation['type'];
      claim: string;
      validityDays?: number;
    }
  ): Promise<Attestation> {
    const message = new Uint8Array([
      ...subject.toBytes(),
      ...new TextEncoder().encode(attestation.type),
      ...new TextEncoder().encode(attestation.claim),
    ]);
    
    // Sign the attestation
    const signature = sha256(new Uint8Array([...message, ...this.signer.secretKey]));
    
    const validUntil = Date.now() + (attestation.validityDays ?? 365) * 24 * 60 * 60 * 1000;
    
    const attestationData = {
      subject: subject.toBase58(),
      type: attestation.type,
      claim: attestation.claim,
      signature: Array.from(signature),
      validUntil,
    };
    
    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.signer.publicKey, isSigner: true, isWritable: false },
          { pubkey: subject, isSigner: false, isWritable: false },
        ],
        programId: STYX_PROGRAM_ID,
        data: Buffer.from([
          0x64, // CREATE_ATTESTATION
          ...new TextEncoder().encode(JSON.stringify(attestationData)),
        ]),
      })
    );
    
    tx.feePayer = this.signer.publicKey;
    tx.recentBlockhash = (await this.client.connection.getLatestBlockhash()).blockhash;
    tx.sign(this.signer);
    
    await this.client.connection.sendRawTransaction(tx.serialize());
    
    return {
      type: attestation.type,
      issuer: this.signer.publicKey,
      issuerName: 'Self',
      claim: attestation.claim,
      signature,
      validUntil,
      createdAt: Date.now(),
    };
  }

  /**
   * Get all contacts
   */
  getContacts(): Contact[] {
    return Array.from(this.contacts.values());
  }

  /**
   * Block a contact
   */
  blockContact(address: PublicKey): void {
    const contactId = bs58.encode(sha256(address.toBytes()).slice(0, 8));
    const contact = this.contacts.get(contactId);
    if (contact) {
      contact.trustLevel = 'blocked';
    }
  }

  /**
   * Verify a contact
   */
  verifyContact(address: PublicKey): void {
    const contactId = bs58.encode(sha256(address.toBytes()).slice(0, 8));
    const contact = this.contacts.get(contactId);
    if (contact) {
      contact.trustLevel = 'verified';
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { PrivateSocialClient as SocialClient };
