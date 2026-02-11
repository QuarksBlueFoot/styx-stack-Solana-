package nexus.styx.core

/**
 * SPS v6 Domain-Based Instruction Encoding
 *
 * Canonical Kotlin mapping of programs/styx-privacy-standard/src/domains.rs
 * Aligned with lib.rs domain router (16,039 lines, entry L490, router L552)
 *
 * Encoding modes:
 *   COMPACT:  [DOMAIN:u8][OP:u8][...payload]           (2+ bytes, hot path)
 *   EXTENDED: [0x00][SIGHASH:8][...payload]             (9+ bytes, unlimited ops)
 *   TLV:      [0xFE][TYPE:u8][LEN:u16][...extensions]  (4+ bytes, Token-22 parity)
 *   SCHEMA:   [0xFF][HASH:32][...payload]               (33+ bytes, arbitrary schemas)
 *
 * Router dispatch (lib.rs):
 *   STS(0x01), MESSAGING(0x02)             → handler gets full data[]
 *   ACCOUNT(0x03)..NOTES(0x05)+higher      → handler gets &data[1..] (domain byte stripped)
 *   EXTENDED(0x00), TLV(0xFE), SCHEMA(0xFF)→ FAIL-CLOSED (not implemented, always Err)
 *   DERIVATIVES..SECURITIES, GOVERNANCE,
 *     SWAP, EASYPAY                         → DEAD (routed but always Err)
 */
object SpsDomains {

    // ── Special Domains ──
    const val EXTENDED: Byte = 0x00
    const val TLV: Byte = 0xFE.toByte()
    const val SCHEMA: Byte = 0xFF.toByte()

    // ── Compact Domains (0x01–0x11) ──
    const val STS: Byte = 0x01
    const val MESSAGING: Byte = 0x02
    const val ACCOUNT: Byte = 0x03
    const val VSL: Byte = 0x04
    const val NOTES: Byte = 0x05
    const val COMPLIANCE: Byte = 0x06
    const val PRIVACY: Byte = 0x07
    const val DEFI: Byte = 0x08
    const val NFT: Byte = 0x09
    const val DERIVATIVES: Byte = 0x0A
    const val BRIDGE: Byte = 0x0B
    const val SECURITIES: Byte = 0x0C
    const val GOVERNANCE: Byte = 0x0D
    const val DAM: Byte = 0x0E
    const val IC: Byte = 0x0F
    const val SWAP: Byte = 0x10
    const val EASYPAY: Byte = 0x11

    /** Domains currently active on mainnet (routed to live handlers in lib.rs) */
    val ACTIVE: Set<Byte> = setOf(
        STS, MESSAGING, ACCOUNT, VSL, NOTES, COMPLIANCE,
        PRIVACY, DEFI, NFT, DAM, IC,
    )

    /**
     * Dead domains — routed in lib.rs but ALL ops return Err on mainnet.
     * See SPS_DOMAIN_ROUTER_AUDIT.md for details.
     *   DERIVATIVES(0x0A) — moved to StyxFi
     *   BRIDGE(0x0B) — deprecated
     *   SECURITIES(0x0C) — deprecated
     *   GOVERNANCE(0x0D) — moved to StyxFi v24
     *   SWAP(0x10) — archived, use STS AMM ops instead
     *   EASYPAY(0x11) — moved to WhisperDrop as RESOLV
     */
    val DEAD: Set<Byte> = setOf(DERIVATIVES, BRIDGE, SECURITIES, GOVERNANCE, SWAP, EASYPAY)

    fun isCompact(domain: Byte): Boolean {
        val d = domain.toInt() and 0xFF
        return d in 0x01..0x11
    }

    fun name(domain: Byte): String = when (domain) {
        EXTENDED -> "EXTENDED"; TLV -> "TLV"; SCHEMA -> "SCHEMA"
        STS -> "STS"; MESSAGING -> "MESSAGING"; ACCOUNT -> "ACCOUNT"
        VSL -> "VSL"; NOTES -> "NOTES"; COMPLIANCE -> "COMPLIANCE"
        PRIVACY -> "PRIVACY"; DEFI -> "DEFI"; NFT -> "NFT"
        DERIVATIVES -> "DERIVATIVES"; BRIDGE -> "BRIDGE"; SECURITIES -> "SECURITIES"
        GOVERNANCE -> "GOVERNANCE"; DAM -> "DAM"; IC -> "IC"
        SWAP -> "SWAP"; EASYPAY -> "EASYPAY"
        else -> "UNKNOWN(0x${(domain.toInt() and 0xFF).toString(16).padStart(2, '0')})"
    }
}
