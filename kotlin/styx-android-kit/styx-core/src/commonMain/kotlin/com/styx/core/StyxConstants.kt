package com.styx.core

/**
 * Styx Program Constants — Canonical addresses and configuration.
 *
 * All program IDs match the mainnet-deployed Solana programs.
 * Domain bytes match programs/styx-privacy-standard/src/domains.rs
 */
object StyxConstants {
    /** SPS v6 mainnet program */
    const val SPS_PROGRAM_ID = "STYXbZeL1wcNigy1WAMFbUQ7PNzJpPYV557H7foNyY5"

    /** StyxZK Groth16 verifier */
    const val STYXZK_VERIFIER_ID = "FERRYpEo4dPbJZYqUfpkWHEMQCCs33Vm3TwBLZpBovXM"

    /** WhisperDrop airdrop program */
    const val WHISPERDROP_PROGRAM_ID = "dropgR8h8axS4FrQ7En1YRnevHcUmkGoNLBrJaLMPsf"

    /** Solana Memo v2 */
    const val MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"

    /** Devnet SPS program (for testing) */
    const val SPS_DEVNET_PROGRAM_ID = "FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW"

    /** Default mainnet RPC */
    const val DEFAULT_RPC_URL = "https://api.mainnet-beta.solana.com"

    /** Default indexer URL */
    const val DEFAULT_INDEXER_URL = "https://sps-indexer-production.up.railway.app"

    /** SDK version */
    const val SDK_VERSION = "1.0.0"
}

/**
 * Solana cluster configuration.
 */
enum class SolanaCluster(val rpcUrl: String) {
    MAINNET("https://api.mainnet-beta.solana.com"),
    DEVNET("https://api.devnet.solana.com"),
    TESTNET("https://api.testnet.solana.com"),
    LOCALNET("http://localhost:8899");

    val programId: String
        get() = when (this) {
            MAINNET -> StyxConstants.SPS_PROGRAM_ID
            else -> StyxConstants.SPS_DEVNET_PROGRAM_ID
        }
}
