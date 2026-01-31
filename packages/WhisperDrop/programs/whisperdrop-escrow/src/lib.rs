\
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use sha2::{Digest, Sha256};

declare_id!("WDEscrow111111111111111111111111111111111");

#[program]
pub mod whisperdrop_escrow {
    use super::*;

    pub fn init_campaign(
        ctx: Context<InitCampaign>,
        campaign_id: [u8; 32],
        manifest_hash: [u8; 32],
        merkle_root: [u8; 32],
        expiry_unix: i64,
    ) -> Result<()> {
        require!(expiry_unix > 0, WhisperErr::BadExpiry);
        let c = &mut ctx.accounts.campaign;
        c.authority = ctx.accounts.authority.key();
        c.campaign_id = campaign_id;
        c.manifest_hash = manifest_hash;
        c.merkle_root = merkle_root;
        c.mint = ctx.accounts.mint.key();
        c.expiry_unix = expiry_unix;
        c.bump = ctx.bumps.campaign;
        c.escrow_bump = ctx.bumps.escrow;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, WhisperErr::BadAmount);
        let c = &ctx.accounts.campaign;
        require!(ctx.accounts.authority.key() == c.authority, WhisperErr::NotAuthority);

        let cpi_accounts = Transfer {
            from: ctx.accounts.from_ata.to_account_info(),
            to: ctx.accounts.escrow.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;
        Ok(())
    }

    pub fn claim(
        ctx: Context<Claim>,
        allocation: u64,
        nonce_hex_16: [u8; 16],
        proof: Vec<[u8; 32]>,
    ) -> Result<()> {
        let c = &ctx.accounts.campaign;
        let now = Clock::get()?.unix_timestamp;
        require!(now <= c.expiry_unix, WhisperErr::Expired);
        require!(allocation > 0, WhisperErr::BadAmount);

        // Verify merkle proof
        let recipient = ctx.accounts.recipient.key();
        let leaf = leaf_hash(&c.campaign_id, &recipient, allocation, &nonce_hex_16);
        let root = compute_root(leaf, &proof);
        require!(root == c.merkle_root, WhisperErr::BadProof);

        // Nullifier PDA is created in the account constraints; if it exists, tx fails.
        // Transfer tokens from escrow to recipient ATA
        let seeds = &[
            b"campaign",
            &c.campaign_id,
            &[c.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow.to_account_info(),
            to: ctx.accounts.recipient_ata.to_account_info(),
            authority: ctx.accounts.campaign.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi_accounts, signer);
        token::transfer(cpi_ctx, allocation)?;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(campaign_id: [u8; 32])]
pub struct InitCampaign<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        space = 8 + Campaign::SPACE,
        seeds = [b"campaign", &campaign_id],
        bump
    )]
    pub campaign: Account<'info, Campaign>,

    #[account(
        init,
        payer = authority,
        token::mint = mint,
        token::authority = campaign,
        seeds = [b"escrow", campaign.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        has_one = mint,
    )]
    pub campaign: Account<'info, Campaign>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = campaign,
        seeds = [b"escrow", campaign.key().as_ref()],
        bump = campaign.escrow_bump
    )]
    pub escrow: Account<'info, TokenAccount>,

    #[account(mut, token::mint = mint, token::authority = authority)]
    pub from_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    pub mint: Account<'info, Mint>,

    #[account(mut, has_one = mint)]
    pub campaign: Account<'info, Campaign>,

    /// CHECK: recipient can be any pubkey
    pub recipient: UncheckedAccount<'info>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = campaign,
        seeds = [b"escrow", campaign.key().as_ref()],
        bump = campaign.escrow_bump
    )]
    pub escrow: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = payer,
        space = 8 + Nullifier::SPACE,
        seeds = [b"nullifier", campaign.key().as_ref(), recipient.key().as_ref()],
        bump
    )]
    pub nullifier: Account<'info, Nullifier>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut, token::mint = mint, token::authority = recipient)]
    pub recipient_ata: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Campaign {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub campaign_id: [u8; 32],
    pub manifest_hash: [u8; 32],
    pub merkle_root: [u8; 32],
    pub expiry_unix: i64,
    pub bump: u8,
    pub escrow_bump: u8,
}

impl Campaign {
    pub const SPACE: usize = 32 + 32 + 32 + 32 + 32 + 8 + 1 + 1;
}

#[account]
pub struct Nullifier {
    pub used: bool,
}

impl Nullifier {
    pub const SPACE: usize = 1;
}

#[error_code]
pub enum WhisperErr {
    #[msg("Bad expiry")]
    BadExpiry,
    #[msg("Not authority")]
    NotAuthority,
    #[msg("Bad amount")]
    BadAmount,
    #[msg("Expired")]
    Expired,
    #[msg("Bad merkle proof")]
    BadProof,
}

fn sha256(data: &[u8]) -> [u8; 32] {
    let mut h = Sha256::new();
    h.update(data);
    let out = h.finalize();
    let mut arr = [0u8; 32];
    arr.copy_from_slice(&out);
    arr
}

// leaf format mirrors Step 3a:
// "wdleaf1|<campaignIdB64?>|<recipient>|<allocation>|<nonceHex>"
// On-chain we do a binary-friendly encoding to avoid string parsing:
// sha256( b"wdleaf1" || campaign_id(32) || recipient(32) || allocation(le64) || nonce(16) )
fn leaf_hash(campaign_id: &[u8; 32], recipient: &Pubkey, allocation: u64, nonce16: &[u8; 16]) -> [u8; 32] {
    let mut buf = Vec::with_capacity(6 + 32 + 32 + 8 + 16);
    buf.extend_from_slice(b"wdleaf1");
    buf.extend_from_slice(campaign_id);
    buf.extend_from_slice(recipient.as_ref());
    buf.extend_from_slice(&allocation.to_le_bytes());
    buf.extend_from_slice(nonce16);
    sha256(&buf)
}

// order-independent parent: sha256(min||max)
fn parent(a: [u8; 32], b: [u8; 32]) -> [u8; 32] {
    if a <= b {
        let mut buf = [0u8; 64];
        buf[..32].copy_from_slice(&a);
        buf[32..].copy_from_slice(&b);
        sha256(&buf)
    } else {
        let mut buf = [0u8; 64];
        buf[..32].copy_from_slice(&b);
        buf[32..].copy_from_slice(&a);
        sha256(&buf)
    }
}

fn compute_root(mut acc: [u8; 32], proof: &Vec<[u8; 32]>) -> [u8; 32] {
    for sib in proof.iter() {
        acc = parent(acc, *sib);
    }
    acc
}
