package nexus.styx.sps

/**
 * SPS Operation Codes — Canonical KMP mapping of domains.rs
 *
 * Each object corresponds to a domain module with exact op-code bytes
 * matching the on-chain program at STYXbZeL1wcNigy1WAMFbUQ7PNzJpPYV557H7foNyY5
 */

// ════════════════════════════════════════════════════════════════════════════
// STS DOMAIN (0x01) - Token Standard Core
// ════════════════════════════════════════════════════════════════════════════
object StsOps {
    const val CREATE_MINT: Byte = 0x01
    const val UPDATE_MINT: Byte = 0x02
    const val FREEZE_MINT: Byte = 0x03
    const val MINT_TO: Byte = 0x04
    const val BURN: Byte = 0x05
    const val TRANSFER: Byte = 0x06
    const val SHIELD: Byte = 0x07
    const val UNSHIELD: Byte = 0x08
    const val CREATE_RULESET: Byte = 0x09
    const val UPDATE_RULESET: Byte = 0x0A
    const val FREEZE_RULESET: Byte = 0x0B
    const val REVEAL_TO_AUDITOR: Byte = 0x0C
    const val ATTACH_POI: Byte = 0x0D
    const val BATCH_TRANSFER: Byte = 0x0E
    const val DECOY_STORM: Byte = 0x0F
    const val CHRONO_VAULT: Byte = 0x10
    const val CREATE_NFT: Byte = 0x11
    const val TRANSFER_NFT: Byte = 0x12
    const val REVEAL_NFT: Byte = 0x13
    const val CREATE_POOL: Byte = 0x14
    const val CREATE_RECEIPT_MINT: Byte = 0x15
    const val STEALTH_UNSHIELD: Byte = 0x16
    const val PRIVATE_SWAP: Byte = 0x17
    const val CREATE_AMM_POOL: Byte = 0x18
    const val ADD_LIQUIDITY: Byte = 0x19
    const val REMOVE_LIQUIDITY: Byte = 0x1A
    const val GENERATE_STEALTH: Byte = 0x1B
    const val IAP_TRANSFER: Byte = 0x1C
    const val IAP_BURN: Byte = 0x1D
    const val IAP_TRANSFER_NFT: Byte = 0x1E
    const val SHIELD_WITH_INIT: Byte = 0x1F
    const val UNSHIELD_WITH_CLOSE: Byte = 0x20
    const val SWAP_WITH_INIT: Byte = 0x21
    const val ADD_LIQUIDITY_WITH_INIT: Byte = 0x22
    const val STEALTH_UNSHIELD_WITH_INIT: Byte = 0x23

    fun name(op: Byte): String = when (op) {
        CREATE_MINT -> "CREATE_MINT"; UPDATE_MINT -> "UPDATE_MINT"; FREEZE_MINT -> "FREEZE_MINT"
        MINT_TO -> "MINT_TO"; BURN -> "BURN"; TRANSFER -> "TRANSFER"
        SHIELD -> "SHIELD"; UNSHIELD -> "UNSHIELD"
        CREATE_RULESET -> "CREATE_RULESET"; UPDATE_RULESET -> "UPDATE_RULESET"; FREEZE_RULESET -> "FREEZE_RULESET"
        REVEAL_TO_AUDITOR -> "REVEAL_TO_AUDITOR"; ATTACH_POI -> "ATTACH_POI"
        BATCH_TRANSFER -> "BATCH_TRANSFER"; DECOY_STORM -> "DECOY_STORM"; CHRONO_VAULT -> "CHRONO_VAULT"
        CREATE_NFT -> "CREATE_NFT"; TRANSFER_NFT -> "TRANSFER_NFT"; REVEAL_NFT -> "REVEAL_NFT"
        CREATE_POOL -> "CREATE_POOL"; CREATE_RECEIPT_MINT -> "CREATE_RECEIPT_MINT"
        STEALTH_UNSHIELD -> "STEALTH_UNSHIELD"; PRIVATE_SWAP -> "PRIVATE_SWAP"
        CREATE_AMM_POOL -> "CREATE_AMM_POOL"; ADD_LIQUIDITY -> "ADD_LIQUIDITY"
        REMOVE_LIQUIDITY -> "REMOVE_LIQUIDITY"; GENERATE_STEALTH -> "GENERATE_STEALTH"
        IAP_TRANSFER -> "IAP_TRANSFER"; IAP_BURN -> "IAP_BURN"; IAP_TRANSFER_NFT -> "IAP_TRANSFER_NFT"
        SHIELD_WITH_INIT -> "SHIELD_WITH_INIT"; UNSHIELD_WITH_CLOSE -> "UNSHIELD_WITH_CLOSE"
        SWAP_WITH_INIT -> "SWAP_WITH_INIT"; ADD_LIQUIDITY_WITH_INIT -> "ADD_LIQUIDITY_WITH_INIT"
        STEALTH_UNSHIELD_WITH_INIT -> "STEALTH_UNSHIELD_WITH_INIT"
        else -> "UNKNOWN(0x${op.toHexByte()})"
    }
}

// ════════════════════════════════════════════════════════════════════════════
// MESSAGING DOMAIN (0x02)
// ════════════════════════════════════════════════════════════════════════════
object MessagingOps {
    const val PRIVATE_MESSAGE: Byte = 0x01
    const val ROUTED_MESSAGE: Byte = 0x02
    const val PRIVATE_TRANSFER: Byte = 0x03
    const val RATCHET_MESSAGE: Byte = 0x04
    const val COMPLIANCE_REVEAL: Byte = 0x05
    const val PREKEY_BUNDLE_PUBLISH: Byte = 0x06
    const val PREKEY_BUNDLE_REFRESH: Byte = 0x07
    const val REFERRAL_REGISTER: Byte = 0x08
    const val REFERRAL_CLAIM: Byte = 0x09

    fun name(op: Byte): String = when (op) {
        PRIVATE_MESSAGE -> "PRIVATE_MESSAGE"; ROUTED_MESSAGE -> "ROUTED_MESSAGE"
        PRIVATE_TRANSFER -> "PRIVATE_TRANSFER"; RATCHET_MESSAGE -> "RATCHET_MESSAGE"
        COMPLIANCE_REVEAL -> "COMPLIANCE_REVEAL"
        PREKEY_BUNDLE_PUBLISH -> "PREKEY_BUNDLE_PUBLISH"; PREKEY_BUNDLE_REFRESH -> "PREKEY_BUNDLE_REFRESH"
        REFERRAL_REGISTER -> "REFERRAL_REGISTER"; REFERRAL_CLAIM -> "REFERRAL_CLAIM"
        else -> "UNKNOWN(0x${op.toHexByte()})"
    }
}

// ════════════════════════════════════════════════════════════════════════════
// ACCOUNT DOMAIN (0x03) - VTA, Delegation, Guardians
// ════════════════════════════════════════════════════════════════════════════
object AccountOps {
    const val VTA_TRANSFER: Byte = 0x01
    const val VTA_DELEGATE: Byte = 0x02
    const val VTA_REVOKE: Byte = 0x03
    const val VTA_GUARDIAN_SET: Byte = 0x04
    const val VTA_GUARDIAN_RECOVER: Byte = 0x05
    const val MULTIPARTY_VTA_INIT: Byte = 0x06
    const val MULTIPARTY_VTA_SIGN: Byte = 0x07
    const val STEALTH_SWAP_INIT: Byte = 0x08
    const val STEALTH_SWAP_EXEC: Byte = 0x09
    const val PRIVATE_SUBSCRIPTION: Byte = 0x0A
    const val DELEGATION_CHAIN: Byte = 0x0B
    const val SOCIAL_RECOVERY: Byte = 0x0C
    const val MULTI_SIG_NOTE: Byte = 0x0D
    const val RECOVERABLE_NOTE: Byte = 0x0E
    const val SELECTIVE_DISCLOSURE: Byte = 0x0F
    const val VTA_REGISTRY_INIT: Byte = 0x10
    const val VTA_REGISTRY_INIT_V2: Byte = 0x11  // v7.1 — paged bitset (replaces deprecated STEP1)
    const val APB_TRANSFER: Byte = 0x20
    const val APB_BATCH: Byte = 0x21
    const val STEALTH_SCAN_HINT: Byte = 0x22
    const val APPROVE_DELEGATE: Byte = 0x24       // Defined but NOT routed
    const val REVOKE_DELEGATE: Byte = 0x25         // Defined but NOT routed

    fun name(op: Byte): String = when (op) {
        VTA_TRANSFER -> "VTA_TRANSFER"; VTA_DELEGATE -> "VTA_DELEGATE"; VTA_REVOKE -> "VTA_REVOKE"
        VTA_GUARDIAN_SET -> "VTA_GUARDIAN_SET"; VTA_GUARDIAN_RECOVER -> "VTA_GUARDIAN_RECOVER"
        MULTIPARTY_VTA_INIT -> "MULTIPARTY_VTA_INIT"; MULTIPARTY_VTA_SIGN -> "MULTIPARTY_VTA_SIGN"
        STEALTH_SWAP_INIT -> "STEALTH_SWAP_INIT"; STEALTH_SWAP_EXEC -> "STEALTH_SWAP_EXEC"
        PRIVATE_SUBSCRIPTION -> "PRIVATE_SUBSCRIPTION"; DELEGATION_CHAIN -> "DELEGATION_CHAIN"
        SOCIAL_RECOVERY -> "SOCIAL_RECOVERY"; MULTI_SIG_NOTE -> "MULTI_SIG_NOTE"
        RECOVERABLE_NOTE -> "RECOVERABLE_NOTE"; SELECTIVE_DISCLOSURE -> "SELECTIVE_DISCLOSURE"
        VTA_REGISTRY_INIT -> "VTA_REGISTRY_INIT"; VTA_REGISTRY_INIT_V2 -> "VTA_REGISTRY_INIT_V2"
        APB_TRANSFER -> "APB_TRANSFER"; APB_BATCH -> "APB_BATCH"
        STEALTH_SCAN_HINT -> "STEALTH_SCAN_HINT"
        APPROVE_DELEGATE -> "APPROVE_DELEGATE"; REVOKE_DELEGATE -> "REVOKE_DELEGATE"
        else -> "UNKNOWN(0x${op.toHexByte()})"
    }
}

// ════════════════════════════════════════════════════════════════════════════
// VSL DOMAIN (0x04) - Virtual Shielded Ledger
// ════════════════════════════════════════════════════════════════════════════
object VslOps {
    const val DEPOSIT: Byte = 0x01
    const val WITHDRAW: Byte = 0x02
    const val PRIVATE_TRANSFER: Byte = 0x03
    const val PRIVATE_SWAP: Byte = 0x04
    const val SHIELDED_SEND: Byte = 0x05
    const val SPLIT: Byte = 0x06
    const val MERGE: Byte = 0x07
    const val ESCROW_CREATE: Byte = 0x08
    const val ESCROW_RELEASE: Byte = 0x09
    const val ESCROW_REFUND: Byte = 0x0A
    const val BALANCE_PROOF: Byte = 0x0B
    const val AUDIT_REVEAL: Byte = 0x0C
    const val ZK_PRIVATE_TRANSFER: Byte = 0x0D
    const val SET_FEE_CONFIG: Byte = 0x0E
    const val INIT_FEE_CONFIG: Byte = 0x0F

    fun name(op: Byte): String = when (op) {
        DEPOSIT -> "DEPOSIT"; WITHDRAW -> "WITHDRAW"
        PRIVATE_TRANSFER -> "PRIVATE_TRANSFER"; PRIVATE_SWAP -> "PRIVATE_SWAP"
        SHIELDED_SEND -> "SHIELDED_SEND"; SPLIT -> "SPLIT"; MERGE -> "MERGE"
        ESCROW_CREATE -> "ESCROW_CREATE"; ESCROW_RELEASE -> "ESCROW_RELEASE"; ESCROW_REFUND -> "ESCROW_REFUND"
        BALANCE_PROOF -> "BALANCE_PROOF"; AUDIT_REVEAL -> "AUDIT_REVEAL"
        ZK_PRIVATE_TRANSFER -> "ZK_PRIVATE_TRANSFER"
        SET_FEE_CONFIG -> "SET_FEE_CONFIG"; INIT_FEE_CONFIG -> "INIT_FEE_CONFIG"
        else -> "UNKNOWN(0x${op.toHexByte()})"
    }
}

// ════════════════════════════════════════════════════════════════════════════
// DAM DOMAIN (0x0E) - Deferred Account Materialization
// ════════════════════════════════════════════════════════════════════════════
object DamOps {
    const val POOL_CREATE: Byte = 0x01
    const val POOL_FUND: Byte = 0x02
    const val POOL_UPDATE: Byte = 0x03
    const val VIRTUAL_MINT: Byte = 0x10
    const val VIRTUAL_TRANSFER: Byte = 0x11
    const val VIRTUAL_BURN: Byte = 0x12
    const val ROOT_COMMIT: Byte = 0x13
    const val MATERIALIZE: Byte = 0x20
    const val MATERIALIZE_BATCH: Byte = 0x21
    const val MATERIALIZE_AND_SWAP: Byte = 0x22
    const val MATERIALIZE_WITH_INIT: Byte = 0x23
    const val DEMATERIALIZE: Byte = 0x30
    const val DEMATERIALIZE_BATCH: Byte = 0x31
    const val SWAP_AND_DEMATERIALIZE: Byte = 0x32
    const val PRIVATE_VIRTUAL_TRANSFER: Byte = 0x40
    const val VIRTUAL_SPLIT: Byte = 0x41
    const val VIRTUAL_MERGE: Byte = 0x42
    const val VIRTUAL_DECOY: Byte = 0x43
    const val VERIFY_BALANCE_PROOF: Byte = 0x50
    const val VERIFY_MATERIALIZE_ELIGIBLE: Byte = 0x51
    const val POOL_QUERY: Byte = 0x52

    fun name(op: Byte): String = when (op) {
        POOL_CREATE -> "POOL_CREATE"; POOL_FUND -> "POOL_FUND"; POOL_UPDATE -> "POOL_UPDATE"
        VIRTUAL_MINT -> "VIRTUAL_MINT"; VIRTUAL_TRANSFER -> "VIRTUAL_TRANSFER"
        VIRTUAL_BURN -> "VIRTUAL_BURN"; ROOT_COMMIT -> "ROOT_COMMIT"
        MATERIALIZE -> "MATERIALIZE"; MATERIALIZE_BATCH -> "MATERIALIZE_BATCH"
        MATERIALIZE_AND_SWAP -> "MATERIALIZE_AND_SWAP"; MATERIALIZE_WITH_INIT -> "MATERIALIZE_WITH_INIT"
        DEMATERIALIZE -> "DEMATERIALIZE"; DEMATERIALIZE_BATCH -> "DEMATERIALIZE_BATCH"
        SWAP_AND_DEMATERIALIZE -> "SWAP_AND_DEMATERIALIZE"
        PRIVATE_VIRTUAL_TRANSFER -> "PRIVATE_VIRTUAL_TRANSFER"
        VIRTUAL_SPLIT -> "VIRTUAL_SPLIT"; VIRTUAL_MERGE -> "VIRTUAL_MERGE"
        VIRTUAL_DECOY -> "VIRTUAL_DECOY"
        VERIFY_BALANCE_PROOF -> "VERIFY_BALANCE_PROOF"
        VERIFY_MATERIALIZE_ELIGIBLE -> "VERIFY_MATERIALIZE_ELIGIBLE"
        POOL_QUERY -> "POOL_QUERY"
        else -> "UNKNOWN(0x${op.toHexByte()})"
    }
}

// ════════════════════════════════════════════════════════════════════════════
// IC DOMAIN (0x0F) - Inscription Compression
// ════════════════════════════════════════════════════════════════════════════
object IcOps {
    const val TREE_INIT: Byte = 0x01
    const val TREE_APPEND: Byte = 0x02
    const val TREE_UPDATE_ROOT: Byte = 0x03
    const val TREE_CLOSE: Byte = 0x04
    const val MINT_COMPRESSED: Byte = 0x10
    const val COMPRESS: Byte = 0x11
    const val DECOMPRESS: Byte = 0x12
    const val TRANSFER: Byte = 0x13
    const val TRANSFER_BATCH: Byte = 0x14
    const val PRIVATE_MINT: Byte = 0x20
    const val PRIVATE_TRANSFER: Byte = 0x21
    const val REVEAL_BALANCE: Byte = 0x22
    const val SPLIT: Byte = 0x23
    const val MERGE: Byte = 0x24
    const val INSCRIBE_ROOT: Byte = 0x30
    const val VERIFY_PROOF: Byte = 0x31
    const val BATCH_VERIFY: Byte = 0x32
    const val VERIFY_INSCRIPTION: Byte = 0x33
    const val RECOMPRESS: Byte = 0x40
    const val SWAP_AND_RECOMPRESS: Byte = 0x41
    const val ATTACH_POI: Byte = 0x50
    const val VERIFY_POI: Byte = 0x51

    fun name(op: Byte): String = when (op) {
        TREE_INIT -> "TREE_INIT"; TREE_APPEND -> "TREE_APPEND"
        TREE_UPDATE_ROOT -> "TREE_UPDATE_ROOT"; TREE_CLOSE -> "TREE_CLOSE"
        MINT_COMPRESSED -> "MINT_COMPRESSED"; COMPRESS -> "COMPRESS"
        DECOMPRESS -> "DECOMPRESS"; TRANSFER -> "TRANSFER"
        TRANSFER_BATCH -> "TRANSFER_BATCH"
        PRIVATE_MINT -> "PRIVATE_MINT"; PRIVATE_TRANSFER -> "PRIVATE_TRANSFER"
        REVEAL_BALANCE -> "REVEAL_BALANCE"; SPLIT -> "SPLIT"; MERGE -> "MERGE"
        INSCRIBE_ROOT -> "INSCRIBE_ROOT"; VERIFY_PROOF -> "VERIFY_PROOF"
        BATCH_VERIFY -> "BATCH_VERIFY"; VERIFY_INSCRIPTION -> "VERIFY_INSCRIPTION"
        RECOMPRESS -> "RECOMPRESS"; SWAP_AND_RECOMPRESS -> "SWAP_AND_RECOMPRESS"
        ATTACH_POI -> "ATTACH_POI"; VERIFY_POI -> "VERIFY_POI"
        else -> "UNKNOWN(0x${op.toHexByte()})"
    }
}

// ════════════════════════════════════════════════════════════════════════════
// GOVERNANCE DOMAIN (0x0D)
// ⚠️ DEAD on mainnet — all ops return Err. Moving to StyxFi v24.
// ════════════════════════════════════════════════════════════════════════════
object GovernanceOps {
    const val PROPOSAL: Byte = 0x01
    const val PRIVATE_VOTE: Byte = 0x02
    const val PROTOCOL_PAUSE: Byte = 0x03
    const val PROTOCOL_UNPAUSE: Byte = 0x04
    const val FREEZE_ENFORCED: Byte = 0x05
    const val THAW_GOVERNED: Byte = 0x06

    fun name(op: Byte): String = when (op) {
        PROPOSAL -> "PROPOSAL"; PRIVATE_VOTE -> "PRIVATE_VOTE"
        PROTOCOL_PAUSE -> "PROTOCOL_PAUSE"; PROTOCOL_UNPAUSE -> "PROTOCOL_UNPAUSE"
        FREEZE_ENFORCED -> "FREEZE_ENFORCED"; THAW_GOVERNED -> "THAW_GOVERNED"
        else -> "UNKNOWN(0x${op.toHexByte()})"
    }
}

// ════════════════════════════════════════════════════════════════════════════
// TLV EXTENSION TYPES (0xFE) - Token-22 compatible
// ════════════════════════════════════════════════════════════════════════════
object TlvExtensions {
    const val TRANSFER_FEE: Byte = 0x01
    const val ROYALTY: Byte = 0x02
    const val INTEREST: Byte = 0x03
    const val VESTING: Byte = 0x04
    const val DELEGATION: Byte = 0x05
    const val SOULBOUND: Byte = 0x06
    const val FROZEN: Byte = 0x07
    const val METADATA: Byte = 0x08
    const val HOOK: Byte = 0x09
    const val GROUP: Byte = 0x0A
    const val CONFIDENTIAL: Byte = 0x0B
    const val PERMANENT_DELEGATE: Byte = 0x0C
    const val NON_TRANSFERABLE: Byte = 0x0D
    const val DEFAULT_STATE: Byte = 0x0E
    const val MEMO_REQUIRED: Byte = 0x0F
    const val CPI_GUARD: Byte = 0x10
    // SPS-unique extensions
    const val POI: Byte = 0x80.toByte()
    const val PROVENANCE: Byte = 0x81.toByte()
    const val CHRONO_LOCK: Byte = 0x82.toByte()
    const val GUARDIAN: Byte = 0x83.toByte()
    const val DECOY: Byte = 0x84.toByte()
    const val STEALTH: Byte = 0x85.toByte()
}

// ═══════════════════════════════════════════════════════════════════════════
// EASYPAY DOMAIN (0x11) - Private No-Wallet Payments
// ⚠️ DEAD on mainnet — moved to WhisperDrop as RESOLV.
// Canonical mapping of domains.rs → pub mod easypay
// ═══════════════════════════════════════════════════════════════════════════
object EasyPayOps {
    // Payment Creation
    const val CREATE_PAYMENT: Byte = 0x01
    const val CREATE_BATCH_PAYMENT: Byte = 0x02
    const val CREATE_RECURRING: Byte = 0x03
    // Claim Operations (no wallet needed!)
    const val CLAIM_PAYMENT: Byte = 0x10
    const val CLAIM_TO_STEALTH: Byte = 0x11
    const val CLAIM_TO_EXISTING: Byte = 0x12
    // Payment Management
    const val CANCEL_PAYMENT: Byte = 0x20
    const val EXTEND_EXPIRY: Byte = 0x21
    const val REFUND_EXPIRED: Byte = 0x22
    // Gasless Relayer
    const val REGISTER_RELAYER: Byte = 0x30
    const val SUBMIT_META_TX: Byte = 0x31
    const val CLAIM_RELAYER_FEE: Byte = 0x32
    // Stealth Addresses
    const val GENERATE_STEALTH_KEYS: Byte = 0x40
    const val PUBLISH_STEALTH_META: Byte = 0x41
    const val ANNOUNCE_STEALTH: Byte = 0x42
    // Private Payments
    const val PRIVATE_PAYMENT: Byte = 0x50
    const val REVEAL_TO_AUDITOR: Byte = 0x51
    const val BATCH_REVEAL: Byte = 0x52

    fun name(op: Byte): String = when (op) {
        CREATE_PAYMENT -> "CREATE_PAYMENT"; CREATE_BATCH_PAYMENT -> "CREATE_BATCH_PAYMENT"
        CREATE_RECURRING -> "CREATE_RECURRING"
        CLAIM_PAYMENT -> "CLAIM_PAYMENT"; CLAIM_TO_STEALTH -> "CLAIM_TO_STEALTH"
        CLAIM_TO_EXISTING -> "CLAIM_TO_EXISTING"
        CANCEL_PAYMENT -> "CANCEL_PAYMENT"; EXTEND_EXPIRY -> "EXTEND_EXPIRY"
        REFUND_EXPIRED -> "REFUND_EXPIRED"
        REGISTER_RELAYER -> "REGISTER_RELAYER"; SUBMIT_META_TX -> "SUBMIT_META_TX"
        CLAIM_RELAYER_FEE -> "CLAIM_RELAYER_FEE"
        GENERATE_STEALTH_KEYS -> "GENERATE_STEALTH_KEYS"
        PUBLISH_STEALTH_META -> "PUBLISH_STEALTH_META"
        ANNOUNCE_STEALTH -> "ANNOUNCE_STEALTH"
        PRIVATE_PAYMENT -> "PRIVATE_PAYMENT"; REVEAL_TO_AUDITOR -> "REVEAL_TO_AUDITOR"
        BATCH_REVEAL -> "BATCH_REVEAL"
        else -> "UNKNOWN(0x${op.toHexByte()})"
    }
}

// Helper
internal fun Byte.toHexByte(): String {
    val v = this.toInt() and 0xFF
    return v.toString(16).padStart(2, '0').uppercase()
}
