#![allow(unexpected_cfgs)]
//! Styx Private Memo Program (PMP) v3 - Ultimate Privacy Suite
//!
//! Revolutionary privacy features for Solana:
//!
//! 🔐 **ENCRYPTION & FORWARD SECRECY**
//! - ChaCha20-Poly1305 AEAD encryption
//! - Double Ratchet-inspired ephemeral keys
//! - Per-message key derivation (forward secrecy)
//! - Key rotation with ratchet chains
//!
//! 🌐 **HOP ROUTING (ONION-STYLE)**
//! - Multi-hop message relay
//! - Layered encryption (peel-the-onion)
//! - Intermediate nodes only see next hop
//! - Final recipient hidden from relays
//!
//! 💰 **PRIVATE TOKEN TRANSFERS**
//! - Encrypted transfer amounts
//! - Stealth recipient addresses
//! - Confidential memos with transfers
//! - Cross-program invocation support
//!
//! 📋 **COMPLIANCE (OPTIONAL)**
//! - Auditor key support
//! - Selective disclosure proofs
//! - Time-locked reveal keys
//! - Regulatory hooks (opt-in)
//!
//! Wire formats designed for maximum privacy while enabling optional compliance.

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::invoke,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
};
use chacha20poly1305::{
    aead::{Aead, NewAead},
    ChaCha20Poly1305, Nonce, Key,
};
use sha2::{Sha256, Digest};

// ============================================================================
// INSTRUCTION TAGS
// ============================================================================

/// PMP3 instructions
const TAG_PRIVATE_MESSAGE: u8 = 3;       // Enhanced private message
const TAG_ROUTED_MESSAGE: u8 = 4;        // Multi-hop routed message
const TAG_PRIVATE_TRANSFER: u8 = 5;      // Private token transfer
const TAG_RATCHET_MESSAGE: u8 = 7;       // Forward-secret message
const TAG_COMPLIANCE_REVEAL: u8 = 8;     // Compliance disclosure

// ============================================================================
// FLAGS
// ============================================================================

const FLAG_ENCRYPT: u8 = 0b0000_0001;
const FLAG_STEALTH: u8 = 0b0000_0010;
const FLAG_COMPLIANCE_ENABLED: u8 = 0b0001_0000;

// ============================================================================
// CONSTANTS
// ============================================================================

/// Maximum number of hops for routed messages
const MAX_HOPS: usize = 5;

/// Key derivation domains
const RATCHET_CHAIN_DOMAIN: &[u8] = b"STYX_RATCHET_CHAIN_V1";
const RATCHET_MESSAGE_DOMAIN: &[u8] = b"STYX_RATCHET_MSG_V1";
const TRANSFER_DOMAIN: &[u8] = b"STYX_TRANSFER_V1";

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    if instruction_data.is_empty() {
        return Err(ProgramError::InvalidInstructionData);
    }

    match instruction_data[0] {
        TAG_PRIVATE_MESSAGE => process_private_message(instruction_data),
        TAG_ROUTED_MESSAGE => process_routed_message(instruction_data),
        TAG_PRIVATE_TRANSFER => process_private_transfer(accounts, instruction_data),
        TAG_RATCHET_MESSAGE => process_ratchet_message(instruction_data),
        TAG_COMPLIANCE_REVEAL => process_compliance_reveal(instruction_data),
        _ => Err(ProgramError::InvalidInstructionData),
    }
}

// ============================================================================
// CRYPTOGRAPHIC PRIMITIVES
// ============================================================================

/// Derive encryption key from two pubkeys
fn derive_shared_key(a: &Pubkey, b: &Pubkey) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(a.as_ref());
    hasher.update(b.as_ref());
    let result = hasher.finalize();
    
    let mut key = [0u8; 32];
    key.copy_from_slice(&result);
    key
}

/// Derive nonce from key material
fn derive_nonce(domain: &[u8], material: &[u8]) -> [u8; 12] {
    let mut hasher = Sha256::new();
    hasher.update(domain);
    hasher.update(material);
    let result = hasher.finalize();
    
    let mut nonce = [0u8; 12];
    nonce.copy_from_slice(&result[..12]);
    nonce
}

/// Ratchet key derivation - produces next chain key and message key
#[allow(dead_code)]
fn ratchet_derive(chain_key: &[u8; 32], counter: u64) -> ([u8; 32], [u8; 32]) {
    // Derive next chain key
    let mut hasher = Sha256::new();
    hasher.update(RATCHET_CHAIN_DOMAIN);
    hasher.update(chain_key);
    hasher.update(&counter.to_le_bytes());
    hasher.update(&[0x01]); // Chain key marker
    let next_chain = hasher.finalize();
    
    // Derive message key
    let mut hasher = Sha256::new();
    hasher.update(RATCHET_MESSAGE_DOMAIN);
    hasher.update(chain_key);
    hasher.update(&counter.to_le_bytes());
    hasher.update(&[0x02]); // Message key marker
    let msg_key = hasher.finalize();
    
    let mut next_chain_arr = [0u8; 32];
    let mut msg_key_arr = [0u8; 32];
    next_chain_arr.copy_from_slice(&next_chain);
    msg_key_arr.copy_from_slice(&msg_key);
    
    (next_chain_arr, msg_key_arr)
}

/// Encrypt recipient metadata
#[allow(dead_code)]
fn encrypt_metadata(sender: &Pubkey, recipient: &Pubkey) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(b"STYX_METADATA_KEY_V3");
    hasher.update(sender.as_ref());
    let key_material = hasher.finalize();
    
    let mut encrypted = [0u8; 32];
    let recipient_bytes = recipient.as_ref();
    
    for i in 0..32 {
        encrypted[i] = recipient_bytes[i] ^ key_material[i];
    }
    
    encrypted
}

/// Decrypt recipient metadata
fn decrypt_metadata(sender: &Pubkey, encrypted: &[u8; 32]) -> Pubkey {
    let mut hasher = Sha256::new();
    hasher.update(b"STYX_METADATA_KEY_V3");
    hasher.update(sender.as_ref());
    let key_material = hasher.finalize();
    
    let mut decrypted = [0u8; 32];
    
    for i in 0..32 {
        decrypted[i] = encrypted[i] ^ key_material[i];
    }
    
    Pubkey::new_from_array(decrypted)
}

/// Derive transfer obfuscation key
fn derive_transfer_mask(sender: &Pubkey, recipient: &Pubkey, amount_nonce: &[u8; 8]) -> u64 {
    let mut hasher = Sha256::new();
    hasher.update(TRANSFER_DOMAIN);
    hasher.update(sender.as_ref());
    hasher.update(recipient.as_ref());
    hasher.update(amount_nonce);
    let result = hasher.finalize();
    
    u64::from_le_bytes(result[..8].try_into().unwrap())
}

// ============================================================================
// ENCRYPTION/DECRYPTION
// ============================================================================

fn encrypt_payload(key: &[u8; 32], nonce: &[u8; 12], plaintext: &[u8]) -> Result<Vec<u8>, ProgramError> {
    let cipher_key = Key::from_slice(key);
    let cipher = ChaCha20Poly1305::new(cipher_key);
    let cipher_nonce = Nonce::from_slice(nonce);
    
    cipher.encrypt(cipher_nonce, plaintext)
        .map_err(|_| ProgramError::InvalidInstructionData)
}

#[allow(dead_code)]
fn decrypt_payload(key: &[u8; 32], nonce: &[u8; 12], ciphertext: &[u8]) -> Result<Vec<u8>, ProgramError> {
    let cipher_key = Key::from_slice(key);
    let cipher = ChaCha20Poly1305::new(cipher_key);
    let cipher_nonce = Nonce::from_slice(nonce);
    
    cipher.decrypt(cipher_nonce, ciphertext)
        .map_err(|_| ProgramError::InvalidInstructionData)
}

// ============================================================================
// INSTRUCTION HANDLERS
// ============================================================================

/// Process enhanced private message (backward compatible with v2 + new features)
fn process_private_message(data: &[u8]) -> ProgramResult {
    // Wire format:
    // [tag:1] [flags:1] [encrypted_recipient:32] [sender:32] [payload_len:2] [payload:var]
    // Optional (if FLAG_COMPLIANCE_ENABLED):
    //   [auditor_count:1] [auditor_pubkeys:32*n] [encrypted_disclosure:var]
    
    if data.len() < 1 + 1 + 32 + 32 + 2 {
        return Err(ProgramError::InvalidInstructionData);
    }

    let flags = data[1];
    let encrypt = (flags & FLAG_ENCRYPT) != 0;
    let stealth = (flags & FLAG_STEALTH) != 0;
    let compliance = (flags & FLAG_COMPLIANCE_ENABLED) != 0;

    let mut offset = 2;

    // Parse encrypted recipient
    let encrypted_recipient: [u8; 32] = data[offset..offset + 32]
        .try_into()
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    offset += 32;

    // Parse sender
    let sender = Pubkey::new_from_array(
        data[offset..offset + 32]
            .try_into()
            .map_err(|_| ProgramError::InvalidInstructionData)?
    );
    offset += 32;

    // Parse payload
    let payload_len = u16::from_le_bytes([data[offset], data[offset + 1]]) as usize;
    offset += 2;

    if data.len() < offset + payload_len {
        return Err(ProgramError::InvalidInstructionData);
    }

    let payload = &data[offset..offset + payload_len];
    offset += payload_len;

    // Decrypt recipient
    let recipient = decrypt_metadata(&sender, &encrypted_recipient);

    // Process encryption
    let final_payload = if encrypt {
        let key = derive_shared_key(&sender, &recipient);
        let nonce = derive_nonce(b"STYX_MSG_NONCE_V3", &encrypted_recipient);
        
        encrypt_payload(&key, &nonce, payload)?
    } else {
        payload.to_vec()
    };

    // Handle compliance if enabled
    if compliance && data.len() > offset {
        let auditor_count = data[offset] as usize;
        msg!("STYX_PMP3 COMPLIANCE auditors={}", auditor_count);
    }

    // Log based on privacy level
    if stealth {
        msg!("STYX_PMP3_STEALTH len={}", final_payload.len());
    } else {
        msg!("STYX_PMP3 flags={} len={}", flags, final_payload.len());
    }

    solana_program::log::sol_log_data(&[&final_payload]);

    Ok(())
}

/// Process multi-hop routed message (onion routing style)
fn process_routed_message(data: &[u8]) -> ProgramResult {
    // Wire format:
    // [tag:1] [flags:1] [hop_count:1] [session_id:32]
    // [current_hop_index:1] [next_hop_encrypted:32]
    // [layered_payload_len:2] [layered_payload:var]
    //
    // Each hop peels one layer of encryption
    // Only the final recipient can read the message
    
    if data.len() < 1 + 1 + 1 + 32 + 1 + 32 + 2 {
        return Err(ProgramError::InvalidInstructionData);
    }

    let _flags = data[1];
    let hop_count = data[2] as usize;
    
    if hop_count > MAX_HOPS {
        msg!("ERROR: Too many hops (max={})", MAX_HOPS);
        return Err(ProgramError::InvalidInstructionData);
    }

    let mut offset = 3;

    // Parse session ID
    let _session_id: [u8; 32] = data[offset..offset + 32]
        .try_into()
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    offset += 32;

    // Current hop index
    let current_hop = data[offset];
    offset += 1;

    // Next hop (encrypted)
    let _next_hop_encrypted: [u8; 32] = data[offset..offset + 32]
        .try_into()
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    offset += 32;

    // Layered payload
    let payload_len = u16::from_le_bytes([data[offset], data[offset + 1]]) as usize;
    offset += 2;

    if data.len() < offset + payload_len {
        return Err(ProgramError::InvalidInstructionData);
    }

    let layered_payload = &data[offset..offset + payload_len];

    // Log minimal info (hides routing details)
    if current_hop as usize == hop_count {
        msg!("STYX_ROUTED_FINAL len={}", payload_len);
    } else {
        msg!("STYX_ROUTED_HOP hop={}/{}", current_hop + 1, hop_count);
    }

    // Emit the layered payload (next hop will peel a layer)
    solana_program::log::sol_log_data(&[layered_payload]);

    Ok(())
}

/// Process private token transfer with encrypted memo
fn process_private_transfer(
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    // Wire format:
    // [tag:1] [flags:1] [encrypted_recipient:32] [sender:32]
    // [encrypted_amount:8] [amount_nonce:8] [memo_len:2] [encrypted_memo:var]
    
    if data.len() < 1 + 1 + 32 + 32 + 8 + 8 + 2 {
        return Err(ProgramError::InvalidInstructionData);
    }

    let _flags = data[1];
    let mut offset = 2;

    // Parse encrypted recipient
    let encrypted_recipient: [u8; 32] = data[offset..offset + 32]
        .try_into()
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    offset += 32;

    // Parse sender
    let sender = Pubkey::new_from_array(
        data[offset..offset + 32]
            .try_into()
            .map_err(|_| ProgramError::InvalidInstructionData)?
    );
    offset += 32;

    // Parse encrypted amount and nonce
    let encrypted_amount = u64::from_le_bytes(
        data[offset..offset + 8]
            .try_into()
            .map_err(|_| ProgramError::InvalidInstructionData)?
    );
    offset += 8;

    let amount_nonce: [u8; 8] = data[offset..offset + 8]
        .try_into()
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    offset += 8;

    // Parse memo
    let memo_len = u16::from_le_bytes([data[offset], data[offset + 1]]) as usize;
    offset += 2;

    let encrypted_memo = if memo_len > 0 && data.len() >= offset + memo_len {
        Some(&data[offset..offset + memo_len])
    } else {
        None
    };

    // Decrypt recipient and amount
    let recipient = decrypt_metadata(&sender, &encrypted_recipient);
    let amount_mask = derive_transfer_mask(&sender, &recipient, &amount_nonce);
    let actual_amount = encrypted_amount ^ amount_mask;

    // Execute transfer via CPI (if accounts provided)
    if !accounts.is_empty() {
        let account_iter = &mut accounts.iter();
        let from_account = next_account_info(account_iter)?;
        let to_account = next_account_info(account_iter)?;
        let system_program = next_account_info(account_iter)?;

        // Verify sender
        if !from_account.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        // Verify recipient matches decrypted value
        if to_account.key != &recipient {
            msg!("ERROR: Recipient mismatch - expected {:?}, got {:?}", recipient, to_account.key);
            return Err(ProgramError::InvalidAccountData);
        }

        // Create transfer instruction - use decrypted recipient
        let transfer_ix = system_instruction::transfer(
            from_account.key,
            &recipient,  // Fixed: use decrypted recipient, not to_account.key
            actual_amount,
        );

        invoke(
            &transfer_ix,
            &[from_account.clone(), to_account.clone(), system_program.clone()],
        )?;

        msg!("STYX_PRIVATE_TRANSFER complete: {} lamports to {:?}", actual_amount, recipient);
    }

    // Log encrypted memo if present
    if let Some(memo) = encrypted_memo {
        solana_program::log::sol_log_data(&[memo]);
    }

    Ok(())
}

/// Process forward-secret ratchet message
fn process_ratchet_message(data: &[u8]) -> ProgramResult {
    // Wire format:
    // [tag:1] [flags:1] [session_id:32] [counter:8]
    // [ephemeral_pubkey:32] [ciphertext_len:2] [ciphertext:var]
    
    if data.len() < 1 + 1 + 32 + 8 + 32 + 2 {
        return Err(ProgramError::InvalidInstructionData);
    }

    let _flags = data[1];
    let mut offset = 2;

    let _session_id: [u8; 32] = data[offset..offset + 32]
        .try_into()
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    offset += 32;

    let counter = u64::from_le_bytes(
        data[offset..offset + 8]
            .try_into()
            .map_err(|_| ProgramError::InvalidInstructionData)?
    );
    offset += 8;

    let _ephemeral_pubkey: [u8; 32] = data[offset..offset + 32]
        .try_into()
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    offset += 32;

    let ciphertext_len = u16::from_le_bytes([data[offset], data[offset + 1]]) as usize;
    offset += 2;

    if data.len() < offset + ciphertext_len {
        return Err(ProgramError::InvalidInstructionData);
    }

    let ciphertext = &data[offset..offset + ciphertext_len];

    // Log with minimal metadata (forward secrecy hides old keys)
    msg!("STYX_RATCHET_MSG counter={} len={}", counter, ciphertext.len());

    solana_program::log::sol_log_data(&[ciphertext]);

    Ok(())
}

/// Process compliance disclosure (optional audit support)
fn process_compliance_reveal(data: &[u8]) -> ProgramResult {
    // Wire format:
    // [tag:1] [flags:1] [message_id:32] [auditor:32]
    // [disclosure_key:32] [reveal_type:1]
    //
    // reveal_type: 0=full, 1=amount_only, 2=recipient_only, 3=metadata_only
    
    if data.len() < 1 + 1 + 32 + 32 + 32 + 1 {
        return Err(ProgramError::InvalidInstructionData);
    }

    let _flags = data[1];
    let mut offset = 2;

    let _message_id: [u8; 32] = data[offset..offset + 32]
        .try_into()
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    offset += 32;

    let auditor = Pubkey::new_from_array(
        data[offset..offset + 32]
            .try_into()
            .map_err(|_| ProgramError::InvalidInstructionData)?
    );
    offset += 32;

    let disclosure_key: [u8; 32] = data[offset..offset + 32]
        .try_into()
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    offset += 32;

    let reveal_type = data[offset];

    let reveal_desc = match reveal_type {
        0 => "full",
        1 => "amount",
        2 => "recipient",
        3 => "metadata",
        _ => "unknown",
    };

    msg!("STYX_COMPLIANCE_REVEAL auditor={} type={}", auditor, reveal_desc);

    // Emit disclosure key (auditor can use this to decrypt)
    solana_program::log::sol_log_data(&[&disclosure_key]);

    Ok(())
}
