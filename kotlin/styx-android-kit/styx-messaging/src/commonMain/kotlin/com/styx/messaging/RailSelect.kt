package com.styx.messaging

/**
 * Rail selection for Styx on-chain messaging.
 *
 * KMP-compatible port — no RPC calls, pure logic.
 * Callers probe availability externally and pass pmpAvailable flag.
 */
enum class OnchainRail { MEMO, PMP }

enum class RailPreference { AUTO, MEMO, PMP }

data class RailSelectArgs(
    val envelopeBytes: Int,
    val prefer: RailPreference = RailPreference.AUTO,
    val pmpAvailable: Boolean = false,
    val memoMaxChars: Int = 900
)

object RailSelect {

    /**
     * Estimate memo string size: "styx1:" prefix + base64url(envelope).
     */
    fun estimateMemoChars(envelopeBytes: Int): Int {
        val b64Len = ((envelopeBytes + 2) / 3) * 4
        val prefix = 6 // "styx1:"
        return prefix + b64Len
    }

    /**
     * Select optimal rail for a given envelope size.
     */
    fun selectRail(args: RailSelectArgs): OnchainRail = when (args.prefer) {
        RailPreference.MEMO -> OnchainRail.MEMO
        RailPreference.PMP -> OnchainRail.PMP
        RailPreference.AUTO -> {
            val chars = estimateMemoChars(args.envelopeBytes)
            if (chars <= args.memoMaxChars) OnchainRail.MEMO
            else if (args.pmpAvailable) OnchainRail.PMP
            else OnchainRail.MEMO
        }
    }
}
