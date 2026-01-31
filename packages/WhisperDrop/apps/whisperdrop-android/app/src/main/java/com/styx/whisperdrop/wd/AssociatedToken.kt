package com.styx.whisperdrop.wd

object AssociatedToken {
  private const val SYSVAR_RENT = "SysvarRent111111111111111111111111111111111"
  // SPL Associated Token Program
  private const val ATA_PROGRAM_ID = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
  // SPL Token Program
  private const val TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"

  fun deriveAtaBase58(ownerBase58: String, mintBase58: String): String {
    val owner32 = Base58.decode(ownerBase58).also { require(it.size == 32) }
    val mint32 = Base58.decode(mintBase58).also { require(it.size == 32) }
    val token32 = Base58.decode(TOKEN_PROGRAM_ID).also { require(it.size == 32) }
    val ataProg32 = Base58.decode(ATA_PROGRAM_ID).also { require(it.size == 32) }

    val (pda32, _) = SolanaPda.findProgramAddress(listOf(owner32, token32, mint32), ataProg32)
    return Base58.encode(pda32)
  }

  fun ataProgramId(): String = ATA_PROGRAM_ID
  fun tokenProgramId(): String = TOKEN_PROGRAM_ID
}


fun sysvarRentId(): String = SYSVAR_RENT

/**
 * Create Associated Token Account instruction (data is empty).
 */
fun createAtaInstruction(
  payer: com.solana.publickey.SolanaPublicKey,
  ata: com.solana.publickey.SolanaPublicKey,
  owner: com.solana.publickey.SolanaPublicKey,
  mint: com.solana.publickey.SolanaPublicKey
): com.solana.transaction.TransactionInstruction {
  val program = com.solana.publickey.SolanaPublicKey(ATA_PROGRAM_ID)
  return com.solana.transaction.TransactionInstruction(
    program,
    listOf(
      com.solana.transaction.AccountMeta(payer, true, true),
      com.solana.transaction.AccountMeta(ata, false, true),
      com.solana.transaction.AccountMeta(owner, false, false),
      com.solana.transaction.AccountMeta(mint, false, false),
      com.solana.transaction.AccountMeta(com.solana.publickey.SolanaPublicKey.from(com.solana.transaction.SystemProgram.PROGRAM_ID), false, false),
      com.solana.transaction.AccountMeta(com.solana.publickey.SolanaPublicKey(TOKEN_PROGRAM_ID), false, false),
      com.solana.transaction.AccountMeta(com.solana.publickey.SolanaPublicKey(SYSVAR_RENT), false, false),
    ),
    ByteArray(0)
  )
}
