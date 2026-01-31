package com.styx.envelope

import kotlin.test.Test
import kotlin.test.assertEquals

class StyxEnvelopeTest {
    @Test
    fun roundTrip() {
        val env = StyxEnvelopeV1(
            kind = 1,
            flags = 0x10,
            header = "{\"k\":\"v\"}".encodeToByteArray(),
            body = "hello".encodeToByteArray()
        )
        val enc = env.encode()
        val dec = StyxEnvelopeV1.decode(enc)
        assertEquals(env.kind, dec.kind)
        assertEquals(env.flags, dec.flags)
        assertEquals(String(env.header), String(dec.header))
        assertEquals(String(env.body), String(dec.body))
    }
}
