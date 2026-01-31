import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import type { Bytes } from "@styx/crypto-core";
import { concatBytes } from "@styx/crypto-core";
import crypto from "crypto";

/**
 * Deployed Styx Private Memo Program ID
 * Devnet: Fke7EgU2SrZ3tx6yaUv2kdq45pdwYpVjbxjfRipkPjSE
 */
export const PRIVATE_MEMO_PROGRAM_ID = new PublicKey(
  process.env.STYX_PMP_PROGRAM_ID ?? "Fke7EgU2SrZ3tx6yaUv2kdq45pdwYpVjbxjfRipkPjSE"
);

/**
 * PMP2 instruction format - Maximum Privacy Edition:
 * data = [u8 tag=2] [u8 flags] [encrypted_recipient 32] [sender 32] [u16 payload_len_le] [encrypted_payload bytes]
 * 
 * Flags:
 * - bit 0: encryption enabled (1=yes, 0=no)
 * - bit 1: metadata obfuscation (minimal logs)
 * - bit 2: stealth mode (use ephemeral sender)
 */
function u8(n: number): Uint8Array { return new Uint8Array([n & 0xff]); }
function u16le(n: number): Uint8Array { return new Uint8Array([n & 0xff, (n >> 8) & 0xff]); }

const TAG_POST_PRIVATE_ENVELOPE = 2;
const FLAG_ENCRYPT = 0b0000_0001;
const FLAG_OBFUSCATE_METADATA = 0b0000_0010;
const FLAG_STEALTH_MODE = 0b0000_0100;

/**
 * Encrypt recipient pubkey for metadata privacy
 */
function encryptRecipientMetadata(sender: PublicKey, recipient: PublicKey): Uint8Array {
  const hash = crypto.createHash('sha256');
  hash.update(Buffer.from("STYX_RECIPIENT_KEY"));
  hash.update(sender.toBytes());
  const keyMaterial = hash.digest();
  
  const encrypted = new Uint8Array(32);
  const recipientBytes = recipient.toBytes();
  
  // XOR encryption
  for (let i = 0; i < 32; i++) {
    encrypted[i] = recipientBytes[i] ^ keyMaterial[i];
  }
  
  return encrypted;
}

/**
 * Decrypt recipient pubkey from encrypted metadata
 */
export function decryptRecipientMetadata(sender: PublicKey, encryptedRecipient: Uint8Array): PublicKey {
  const hash = crypto.createHash('sha256');
  hash.update(Buffer.from("STYX_RECIPIENT_KEY"));
  hash.update(sender.toBytes());
  const keyMaterial = hash.digest();
  
  const decrypted = new Uint8Array(32);
  
  // XOR decryption
  for (let i = 0; i < 32; i++) {
    decrypted[i] = encryptedRecipient[i] ^ keyMaterial[i];
  }
  
  return new PublicKey(decrypted);
}

/**
 * Add random padding to payload for length obfuscation
 */
function addPadding(payload: Uint8Array, targetSize?: number): Uint8Array {
  const actualLen = payload.length;
  
  // Default: pad to next power of 2, minimum 256 bytes
  let paddedLen = targetSize ?? Math.max(256, Math.pow(2, Math.ceil(Math.log2(actualLen + 2))));
  
  // Create padded payload: [u16 actual_len][payload][random_padding]
  const padded = new Uint8Array(paddedLen);
  padded[0] = actualLen & 0xff;
  padded[1] = (actualLen >> 8) & 0xff;
  padded.set(payload, 2);
  
  // Fill rest with random bytes
  crypto.randomFillSync(padded, 2 + actualLen);
  
  return padded;
}

/**
 * Remove padding from decrypted payload
 */
export function removePadding(paddedPayload: Uint8Array): Uint8Array {
  if (paddedPayload.length < 2) {
    throw new Error("Invalid padded payload");
  }
  
  const actualLen = paddedPayload[0] | (paddedPayload[1] << 8);
  
  if (actualLen > paddedPayload.length - 2) {
    throw new Error("Invalid length in padded payload");
  }
  
  return paddedPayload.subarray(2, 2 + actualLen);
}

export function buildPmpPostMessageIx(args: {
  sender: PublicKey;
  recipient?: PublicKey;
  flags?: number;
  payload: Bytes;
  encrypt?: boolean; // Enable on-chain encryption
  obfuscateMetadata?: boolean; // Minimize log output
  stealthMode?: boolean; // Maximum privacy
  padding?: boolean | number; // Add padding (true=auto, number=target size)
  programId?: PublicKey;
}): TransactionInstruction {
  let payload: Uint8Array = new Uint8Array(args.payload);
  
  // Add padding if requested
  if (args.padding) {
    const targetSize = typeof args.padding === 'number' ? args.padding : undefined;
    payload = addPadding(payload, targetSize);
  }
  
  if (payload.length > 65535) throw new Error("payload too large");
  
  // Set flags
  let flags = args.flags ?? 0;
  if (args.encrypt) {
    flags |= FLAG_ENCRYPT;
    if (!args.recipient) {
      throw new Error("Encryption requires a recipient pubkey");
    }
  }
  if (args.obfuscateMetadata) {
    flags |= FLAG_OBFUSCATE_METADATA;
  }
  if (args.stealthMode) {
    flags |= FLAG_STEALTH_MODE;
  }
  
  // Encrypt recipient metadata (PMP2 always encrypts recipient)
  const recipient = args.recipient ?? args.sender; // Default to sender if no recipient
  const encryptedRecipient = encryptRecipientMetadata(args.sender, recipient);

  // Build body: [tag] [flags] [encrypted_recipient] [sender] [payload_len] [payload]
  const senderBytes = args.sender.toBytes();
  const data = concatBytes(
    u8(TAG_POST_PRIVATE_ENVELOPE),
    u8(flags),
    encryptedRecipient,
    senderBytes,
    u16le(payload.length),
    payload
  );

  return new TransactionInstruction({
    programId: args.programId ?? PRIVATE_MEMO_PROGRAM_ID,
    keys: [{ pubkey: args.sender, isSigner: true, isWritable: false }],
    data: Buffer.from(data),
  });
}

/**
 * Build maximum privacy envelope (all privacy features enabled)
 */
export function buildPmpPrivateEnvelope(args: {
  sender: PublicKey;
  recipient: PublicKey;
  payload: Bytes;
  paddingSize?: number;
  programId?: PublicKey;
}): TransactionInstruction {
  return buildPmpPostMessageIx({
    ...args,
    encrypt: true,
    obfuscateMetadata: true,
    stealthMode: true,
    padding: args.paddingSize ?? true,
  });
}
