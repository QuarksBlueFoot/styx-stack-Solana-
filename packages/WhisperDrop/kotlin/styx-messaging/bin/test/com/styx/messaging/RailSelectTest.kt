package com.styx.messaging

import kotlin.test.Test
import kotlin.test.assertEquals

class RailSelectTest {
    @Test
    fun autoSelectsMemoWhenUnderLimit() {
        val rail = RailSelect.selectRail(RailSelectArgs(envelopeBytes = 64, prefer = RailPreference.AUTO, pmpAvailable = true, memoMaxChars = 900))
        assertEquals(OnchainRail.MEMO, rail)
    }

    @Test
    fun autoSelectsPmpWhenOverLimitAndAvailable() {
        val rail = RailSelect.selectRail(RailSelectArgs(envelopeBytes = 4096, prefer = RailPreference.AUTO, pmpAvailable = true, memoMaxChars = 900))
        assertEquals(OnchainRail.PMP, rail)
    }
}
