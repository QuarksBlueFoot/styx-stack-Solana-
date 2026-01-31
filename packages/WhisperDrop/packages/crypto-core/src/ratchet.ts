/**
 * Styx Double Ratchet Implementation
 * 
 * Provides forward secrecy for messaging:
 * - Each message uses a unique key
 * - Compromise of current key doesn't reveal past messages
 * - Key rotation on each send/receive
 * 
 * Based on Signal Protocol's Double Ratchet Algorithm
 * Original implementation - not copied from any source
 */

import { sha256Bytes } from "./hash";
import { concatBytes } from "./bytes";

// Alias for internal use
const sha256 = sha256Bytes;

export interface RatchetState {
  /** Root key for deriving chain keys */
  rootKey: Uint8Array;
  /** Sending chain key */
  sendChainKey: Uint8Array;
  /** Receiving chain key */
  recvChainKey: Uint8Array;
  /** Our ephemeral public key */
  ourEphemeralPublic: Uint8Array;
  /** Their ephemeral public key */
  theirEphemeralPublic: Uint8Array;
  /** Send message counter */
  sendCounter: number;
  /** Receive message counter */
  recvCounter: number;
  /** Previous chain length (for out-of-order messages) */
  previousChainLength: number;
  /** Session ID for identification */
  sessionId: Uint8Array;
}

export interface RatchetMessage {
  /** Ephemeral public key for this message */
  ephemeralPublic: Uint8Array;
  /** Message counter */
  counter: number;
  /** Previous chain length */
  previousChainLength: number;
  /** Encrypted ciphertext */
  ciphertext: Uint8Array;
}

const CHAIN_KEY_DOMAIN = new TextEncoder().encode("STYX_CHAIN_KEY_V1");
const MESSAGE_KEY_DOMAIN = new TextEncoder().encode("STYX_MESSAGE_KEY_V1");
const ROOT_KEY_DOMAIN = new TextEncoder().encode("STYX_ROOT_KEY_V1");

/**
 * Derive the next chain key and message key from current chain key
 */
export function deriveChainStep(chainKey: Uint8Array, counter: number): {
  nextChainKey: Uint8Array;
  messageKey: Uint8Array;
} {
  // Next chain key = SHA256(CHAIN_DOMAIN || chainKey || counter || 0x01)
  const counterBytes = new Uint8Array(8);
  new DataView(counterBytes.buffer).setBigUint64(0, BigInt(counter), true);
  
  const nextChainKey = sha256(concatBytes(
    CHAIN_KEY_DOMAIN,
    chainKey,
    counterBytes,
    new Uint8Array([0x01])
  ));

  // Message key = SHA256(MESSAGE_DOMAIN || chainKey || counter || 0x02)
  const messageKey = sha256(concatBytes(
    MESSAGE_KEY_DOMAIN,
    chainKey,
    counterBytes,
    new Uint8Array([0x02])
  ));

  return { nextChainKey, messageKey };
}

/**
 * Derive new root key and chain key from DH output
 */
export function deriveRootStep(rootKey: Uint8Array, dhOutput: Uint8Array): {
  newRootKey: Uint8Array;
  newChainKey: Uint8Array;
} {
  // HKDF-like derivation
  const combined = sha256(concatBytes(ROOT_KEY_DOMAIN, rootKey, dhOutput));
  
  // Split into root key and chain key
  const newRootKey = sha256(concatBytes(combined, new Uint8Array([0x01])));
  const newChainKey = sha256(concatBytes(combined, new Uint8Array([0x02])));

  return { newRootKey, newChainKey };
}

/**
 * Initialize a new ratchet session
 */
export function initRatchet(
  sharedSecret: Uint8Array,
  ourEphemeralPublic: Uint8Array,
  theirEphemeralPublic: Uint8Array,
  isInitiator: boolean
): RatchetState {
  // Derive initial root key from shared secret
  const rootKey = sha256(concatBytes(
    ROOT_KEY_DOMAIN,
    sharedSecret,
    new Uint8Array([isInitiator ? 0x01 : 0x02])
  ));

  // Derive initial chain keys
  const sendChainKey = sha256(concatBytes(rootKey, new Uint8Array([0x01])));
  const recvChainKey = sha256(concatBytes(rootKey, new Uint8Array([0x02])));

  // Session ID for identification
  const sessionId = sha256(concatBytes(
    ourEphemeralPublic,
    theirEphemeralPublic,
    sharedSecret
  ));

  return {
    rootKey,
    sendChainKey: isInitiator ? sendChainKey : recvChainKey,
    recvChainKey: isInitiator ? recvChainKey : sendChainKey,
    ourEphemeralPublic,
    theirEphemeralPublic,
    sendCounter: 0,
    recvCounter: 0,
    previousChainLength: 0,
    sessionId,
  };
}

/**
 * Advance the sending ratchet and get message key
 */
export function ratchetSend(state: RatchetState): {
  messageKey: Uint8Array;
  newState: RatchetState;
} {
  const { nextChainKey, messageKey } = deriveChainStep(
    state.sendChainKey,
    state.sendCounter
  );

  const newState: RatchetState = {
    ...state,
    sendChainKey: nextChainKey,
    sendCounter: state.sendCounter + 1,
  };

  return { messageKey, newState };
}

/**
 * Advance the receiving ratchet and get message key
 */
export function ratchetReceive(
  state: RatchetState,
  messageCounter: number
): {
  messageKey: Uint8Array;
  newState: RatchetState;
} {
  // Handle potential skipped messages
  let currentKey = state.recvChainKey;
  let messageKey: Uint8Array | null = null;

  // Derive keys up to the message counter
  for (let i = state.recvCounter; i <= messageCounter; i++) {
    const step = deriveChainStep(currentKey, i);
    currentKey = step.nextChainKey;
    if (i === messageCounter) {
      messageKey = step.messageKey;
    }
  }

  if (!messageKey) {
    throw new Error("Failed to derive message key");
  }

  const newState: RatchetState = {
    ...state,
    recvChainKey: currentKey,
    recvCounter: messageCounter + 1,
  };

  return { messageKey, newState };
}

/**
 * Perform a DH ratchet step (when receiving new ephemeral key)
 */
export function dhRatchetStep(
  state: RatchetState,
  theirNewEphemeral: Uint8Array,
  ourNewEphemeral: Uint8Array,
  dhOutput: Uint8Array
): RatchetState {
  // Derive new root and receiving chain
  const { newRootKey, newChainKey: newRecvChain } = deriveRootStep(
    state.rootKey,
    dhOutput
  );

  // Derive new sending chain from another DH
  const { newChainKey: newSendChain } = deriveRootStep(newRootKey, dhOutput);

  return {
    rootKey: newRootKey,
    sendChainKey: newSendChain,
    recvChainKey: newRecvChain,
    ourEphemeralPublic: ourNewEphemeral,
    theirEphemeralPublic: theirNewEphemeral,
    sendCounter: 0,
    recvCounter: 0,
    previousChainLength: state.sendCounter,
    sessionId: state.sessionId,
  };
}

/**
 * Serialize ratchet state for storage
 */
export function serializeRatchetState(state: RatchetState): Uint8Array {
  const data = new Uint8Array(32 + 32 + 32 + 32 + 32 + 8 + 8 + 4 + 32);
  let offset = 0;

  data.set(state.rootKey, offset); offset += 32;
  data.set(state.sendChainKey, offset); offset += 32;
  data.set(state.recvChainKey, offset); offset += 32;
  data.set(state.ourEphemeralPublic, offset); offset += 32;
  data.set(state.theirEphemeralPublic, offset); offset += 32;

  const view = new DataView(data.buffer);
  view.setBigUint64(offset, BigInt(state.sendCounter), true); offset += 8;
  view.setBigUint64(offset, BigInt(state.recvCounter), true); offset += 8;
  view.setUint32(offset, state.previousChainLength, true); offset += 4;

  data.set(state.sessionId, offset);

  return data;
}

/**
 * Deserialize ratchet state from storage
 */
export function deserializeRatchetState(data: Uint8Array): RatchetState {
  if (data.length !== 32 + 32 + 32 + 32 + 32 + 8 + 8 + 4 + 32) {
    throw new Error("Invalid ratchet state data");
  }

  let offset = 0;
  const rootKey = data.slice(offset, offset + 32); offset += 32;
  const sendChainKey = data.slice(offset, offset + 32); offset += 32;
  const recvChainKey = data.slice(offset, offset + 32); offset += 32;
  const ourEphemeralPublic = data.slice(offset, offset + 32); offset += 32;
  const theirEphemeralPublic = data.slice(offset, offset + 32); offset += 32;

  const view = new DataView(data.buffer, data.byteOffset);
  const sendCounter = Number(view.getBigUint64(offset, true)); offset += 8;
  const recvCounter = Number(view.getBigUint64(offset, true)); offset += 8;
  const previousChainLength = view.getUint32(offset, true); offset += 4;

  const sessionId = data.slice(offset, offset + 32);

  return {
    rootKey,
    sendChainKey,
    recvChainKey,
    ourEphemeralPublic,
    theirEphemeralPublic,
    sendCounter,
    recvCounter,
    previousChainLength,
    sessionId,
  };
}
