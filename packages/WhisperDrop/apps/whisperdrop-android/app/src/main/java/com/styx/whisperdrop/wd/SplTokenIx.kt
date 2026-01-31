package com.styx.whisperdrop.wd

import com.solana.publickey.SolanaPublicKey
import com.solana.transaction.AccountMeta
import com.solana.transaction.TransactionInstruction

/**
 * Minimal SPL Token instruction builders (so we can keep deps light).
 */
object SplTokenIx {
  // Transfer instruction enum = 3 in SPL token program.
  fun transfer(
    sourceAta: SolanaPublicKey,
    destAta: SolanaPublicKey,
    owner: SolanaPublicKey,
    amount: Long
  ): TransactionInstruction {
    val program = SolanaPublicKey(AssociatedToken.tokenProgramId())
    val data = ByteArray(1 + 8)
    data[0] = 3 // Transfer
    var x = amount
    for (i in 0 until 8) {
      data[1 + i] = (x and 0xff).toByte()
      x = x ushr 8
    }
    return TransactionInstruction(
      program,
      listOf(
        AccountMeta(sourceAta, false, true),
        AccountMeta(destAta, false, true),
        AccountMeta(owner, true, false),
      ),
      data
    )
  }
}
