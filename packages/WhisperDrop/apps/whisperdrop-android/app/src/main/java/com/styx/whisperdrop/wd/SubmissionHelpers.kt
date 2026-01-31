package com.styx.whisperdrop.wd

/**
 * Step 7: Submission helpers that are **actually usable** without embedding private keys.
 * We output reproducible CLI commands (Solana CLI + Anchor client).
 */
object SubmissionHelpers {

  fun liteSolanaCliCommand(
    sinkPubkey: String,
    memo: String,
    solAmount: String = "0.000005"
  ): String {
    // Requires user wallet configured in Solana CLI.
    // `--with-memo` exists in Solana CLI transfer.
    return "solana transfer $sinkPubkey $solAmount --with-memo "$memo""
  }

  fun escrowAnchorCliCommand(planJsonPath: String): String {
    // Anchor client we ship in tests/whisperdrop-escrow-cli
    return "pnpm -C tests/whisperdrop-escrow-cli wd:claim --plan $planJsonPath"
  }
}
