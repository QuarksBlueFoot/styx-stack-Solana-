use borsh::{BorshDeserialize, BorshSerialize};
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

/// Upper bound to keep transactions affordable and reduce log spam.
/// (Logs are still public and should contain encrypted bytes.)
pub const MAX_ENVELOPE_BYTES: usize = 1024;

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub enum RelayIx {
    /// Relay an encrypted envelope and pay a lamports fee to a treasury.
    ///
    /// Accounts:
    /// 0. [signer, writable] payer
    /// 1. [writable] treasury
    /// 2. [] system program
    Relay { fee_lamports: u64, envelope: Vec<u8> },
}

#[repr(u32)]
pub enum RelayError {
    EnvelopeTooLarge = 1,
    MissingSignature = 2,
    InvalidSystemProgram = 3,
}

impl From<RelayError> for ProgramError {
    fn from(e: RelayError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    let ix = RelayIx::try_from_slice(data).map_err(|_| ProgramError::InvalidInstructionData)?;

    match ix {
        RelayIx::Relay {
            fee_lamports,
            envelope,
        } => relay(accounts, fee_lamports, envelope),
    }
}

fn relay(accounts: &[AccountInfo], fee_lamports: u64, envelope: Vec<u8>) -> ProgramResult {
    if envelope.len() > MAX_ENVELOPE_BYTES {
        return Err(RelayError::EnvelopeTooLarge.into());
    }

    let mut it = accounts.iter();
    let payer = next_account_info(&mut it)?;
    let treasury = next_account_info(&mut it)?;
    let system_program = next_account_info(&mut it)?;

    if !payer.is_signer {
        return Err(RelayError::MissingSignature.into());
    }

    if *system_program.key != solana_program::system_program::id() {
        return Err(RelayError::InvalidSystemProgram.into());
    }

    if fee_lamports > 0 {
        let transfer_ix = system_instruction::transfer(payer.key, treasury.key, fee_lamports);
        invoke(&transfer_ix, &[payer.clone(), treasury.clone(), system_program.clone()])?;
    }

    // Emit the (encrypted) envelope in logs for discovery.
    // Indexers/inbox scanners can parse this program's log frames.
    msg!("STYX_RELAY_V1");
    solana_program::log::sol_log_data(&[&envelope]);

    Ok(())
}
