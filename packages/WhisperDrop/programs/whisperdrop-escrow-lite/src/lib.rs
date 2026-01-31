#![deny(clippy::all)]
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
};
use spl_token::instruction as token_ix;

solana_program::entrypoint!(process_instruction);

const SEED_CAMPAIGN: &[u8] = b"campaign";
const SEED_ESCROW: &[u8] = b"escrow";
const SEED_NULLIFIER: &[u8] = b"nullifier";

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub enum Instruction {
    InitCampaign {
        campaign_id: [u8; 32],
        manifest_hash: [u8; 32],
        merkle_root: [u8; 32],
        mint: Pubkey,
        expiry_unix: i64,
        authority: Pubkey,
    },
    Claim {
        allocation: u64,
        nonce16: [u8; 16],
        proof: Vec<[u8; 32]>,
    },
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Campaign {
    pub campaign_id: [u8; 32],
    pub manifest_hash: [u8; 32],
    pub merkle_root: [u8; 32],
    pub mint: Pubkey,
    pub expiry_unix: i64,
    pub authority: Pubkey,
    pub bump: u8,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Nullifier {
    pub campaign: Pubkey,
    pub recipient: Pubkey,
    pub nonce16: [u8; 16],
}

fn sha256(data: &[u8]) -> [u8; 32] {
    use solana_program::hash::hash;
    hash(data).to_bytes()
}

fn hash_pair(a: &[u8;32], b: &[u8;32]) -> [u8;32] {
    let (lo, hi) = if a <= b { (a, b) } else { (b, a) };
    let mut buf = [0u8; 64];
    buf[..32].copy_from_slice(lo);
    buf[32..].copy_from_slice(hi);
    sha256(&buf)
}

fn verify_merkle(leaf: [u8;32], proof: &[[u8;32]], root: [u8;32]) -> bool {
    let mut cur = leaf;
    for p in proof {
        cur = hash_pair(&cur, p);
    }
    cur == root
}

fn claim_leaf(campaign_id: [u8;32], recipient: &Pubkey, allocation: u64, nonce16: [u8;16]) -> [u8;32] {
    // leaf = sha256( "wd:claim:v1" || campaign_id || recipient || allocation_le || nonce16 )
    let mut buf = Vec::with_capacity(12 + 32 + 32 + 8 + 16);
    buf.extend_from_slice(b"wd:claim:v1");
    buf.extend_from_slice(&campaign_id);
    buf.extend_from_slice(recipient.as_ref());
    buf.extend_from_slice(&allocation.to_le_bytes());
    buf.extend_from_slice(&nonce16);
    sha256(&buf)
}

pub fn process_instruction(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let ix = Instruction::try_from_slice(data).map_err(|_| ProgramError::InvalidInstructionData)?;
    match ix {
        Instruction::InitCampaign { campaign_id, manifest_hash, merkle_root, mint, expiry_unix, authority } => {
            process_init_campaign(program_id, accounts, campaign_id, manifest_hash, merkle_root, mint, expiry_unix, authority)
        }
        Instruction::Claim { allocation, nonce16, proof } => {
            process_claim(program_id, accounts, allocation, nonce16, proof)
        }
    }
}

fn process_init_campaign(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    campaign_id: [u8;32],
    manifest_hash: [u8;32],
    merkle_root: [u8;32],
    mint: Pubkey,
    expiry_unix: i64,
    authority: Pubkey,
) -> ProgramResult {
    let acc_iter = &mut accounts.iter();
    let payer = next_account_info(acc_iter)?; // signer, pays rent
    let campaign_ai = next_account_info(acc_iter)?; // pda, writable
    let system = next_account_info(acc_iter)?;
    let rent_sysvar = next_account_info(acc_iter)?;

    if !payer.is_signer { return Err(ProgramError::MissingRequiredSignature); }

    let (campaign_pda, bump) = Pubkey::find_program_address(&[SEED_CAMPAIGN, &campaign_id], program_id);
    if campaign_pda != *campaign_ai.key { return Err(ProgramError::InvalidSeeds); }

    let rent = Rent::from_account_info(rent_sysvar)?;
    let mut state = Campaign {
        campaign_id,
        manifest_hash,
        merkle_root,
        mint,
        expiry_unix,
        authority,
        bump,
    };
    let bytes = state.try_to_vec()?;
    let space = bytes.len();
    let lamports = rent.minimum_balance(space);

    // create campaign account if not already initialized
    if campaign_ai.data_is_empty() {
        invoke_signed(
            &system_instruction::create_account(payer.key, campaign_ai.key, lamports, space as u64, program_id),
            &[payer.clone(), campaign_ai.clone(), system.clone()],
            &[&[SEED_CAMPAIGN, &campaign_id, &[bump]]],
        )?;
        campaign_ai.data.borrow_mut()[..space].copy_from_slice(&bytes);
        msg!("campaign initialized");
    } else {
        msg!("campaign already exists");
    }
    Ok(())
}

fn process_claim(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    allocation: u64,
    nonce16: [u8;16],
    proof: Vec<[u8;32]>,
) -> ProgramResult {
    let acc_iter = &mut accounts.iter();
    let mint_ai = next_account_info(acc_iter)?; // readonly
    let campaign_ai = next_account_info(acc_iter)?; // writable
    let recipient_ai = next_account_info(acc_iter)?; // readonly
    let escrow_ai = next_account_info(acc_iter)?; // writable token acct
    let nullifier_ai = next_account_info(acc_iter)?; // writable (system acct)
    let payer_ai = next_account_info(acc_iter)?; // signer
    let recipient_ata_ai = next_account_info(acc_iter)?; // writable token acct
    let system_ai = next_account_info(acc_iter)?;
    let token_ai = next_account_info(acc_iter)?;
    let rent_sysvar = next_account_info(acc_iter)?;

    if !payer_ai.is_signer { return Err(ProgramError::MissingRequiredSignature); }

    let campaign: Campaign = Campaign::try_from_slice(&campaign_ai.data.borrow())?;
    if campaign.mint != *mint_ai.key { return Err(ProgramError::InvalidAccountData); }

    // expiry check (optional hard fail)
    let now = solana_program::clock::Clock::get()?.unix_timestamp;
    if now > campaign.expiry_unix {
        msg!("campaign expired");
        return Err(ProgramError::Custom(1));
    }

    // verify campaign PDA
    let (campaign_pda, bump) = Pubkey::find_program_address(&[SEED_CAMPAIGN, &campaign.campaign_id], program_id);
    if campaign_pda != *campaign_ai.key { return Err(ProgramError::InvalidSeeds); }

    // verify escrow PDA is correct owner/signer seed
    let (escrow_pda, escrow_bump) = Pubkey::find_program_address(&[SEED_ESCROW, campaign_pda.as_ref()], program_id);
    if escrow_pda != *escrow_ai.owner {
        // For token accounts, owner is token program; the escrow *authority* must be campaign PDA.
        // We can't read token account authority without unpacking; keep lightweight: rely on invoke failing if authority mismatch.
        msg!("note: token account owner mismatch check skipped; token program will enforce authority");
    }

    // derive nullifier PDA (account address)
    let (nullifier_pda, null_bump) = Pubkey::find_program_address(&[SEED_NULLIFIER, campaign_pda.as_ref(), recipient_ai.key.as_ref()], program_id);
    if nullifier_pda != *nullifier_ai.key { return Err(ProgramError::InvalidSeeds); }

    // create nullifier account (one-time claim)
    if !nullifier_ai.data_is_empty() {
        msg!("already claimed");
        return Err(ProgramError::Custom(2));
    }

    let rent = Rent::from_account_info(rent_sysvar)?;
    let null_state = Nullifier {
        campaign: campaign_pda,
        recipient: *recipient_ai.key,
        nonce16,
    };
    let null_bytes = null_state.try_to_vec()?;
    let space = null_bytes.len();
    let lamports = rent.minimum_balance(space);

    invoke_signed(
        &system_instruction::create_account(payer_ai.key, nullifier_ai.key, lamports, space as u64, program_id),
        &[payer_ai.clone(), nullifier_ai.clone(), system_ai.clone()],
        &[&[SEED_NULLIFIER, campaign_pda.as_ref(), recipient_ai.key.as_ref(), &[null_bump]]],
    )?;
    nullifier_ai.data.borrow_mut()[..space].copy_from_slice(&null_bytes);

    // verify proof
    let leaf = claim_leaf(campaign.campaign_id, recipient_ai.key, allocation, nonce16);
    if !verify_merkle(leaf, &proof, campaign.merkle_root) {
        msg!("invalid proof");
        return Err(ProgramError::Custom(3));
    }

    // token transfer from escrow token account -> recipient ATA
    // Expect escrow token account authority is campaign PDA.
    let ix = token_ix::transfer(
        token_ai.key,
        escrow_ai.key,
        recipient_ata_ai.key,
        &campaign_pda,
        &[],
        allocation,
    )?;

    invoke_signed(
        &ix,
        &[escrow_ai.clone(), recipient_ata_ai.clone(), token_ai.clone()],
        &[&[SEED_CAMPAIGN, &campaign.campaign_id, &[bump]]],
    )?;

    msg!("claimed");
    Ok(())
}
