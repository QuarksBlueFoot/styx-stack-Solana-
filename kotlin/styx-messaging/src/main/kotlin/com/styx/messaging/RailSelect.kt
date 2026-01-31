package com.styx.messaging

/**
 * Kotlin parity helper for Styx on-chain messaging rail selection.
 *
 * This is intentionally pure/predictable (no RPC in Kotlin core):
 * - callers can probe availability (e.g. by getAccountInfo on SPS program) and pass spsAvailable.
 */

enum class OnchainRail { MEMO, PMP }

enum class RailPreference { AUTO, MEMO, PMP }

data class RailSelectArgs(
    val envelopeBytes: Int,
    val prefer: RailPreference = RailPreference.AUTO,
    val spsAvailable: Boolean = false,
    val memoMaxChars: Int = 900
)

object RailSelect {

    /**
     * Conservative estimate: memo string is `styx1:` + base64url(envelopeBytes).
     * base64url length is ceil(n * 4/3) with no padding.
     */
    fun estimateMemoChars(envelopeBytes: Int): Int {
        val b64Len = ((envelopeBytes + 2) / 3) * 4 // ceil(n/3)*4
        val prefix = 6 // "styx1:" length
        return prefix + b64Len
    }

    fun selectRail(args: RailSelectArgs): OnchainRail {
        return when (args.prefer) {
            RailPreference.MEMO -> OnchainRail.MEMO
            RailPreference.SPS -> OnchainRail.SPS
            RailPreference.AUTO -> {
                val memoChars = estimateMemoChars(args.envelopeBytes)
                if (memoChars <= args.memoMaxChars) OnchainRail.MEMO else if (args.spsAvailable) OnchainRail.SPS else OnchainRail.MEMO
            }
        }
    }
}
