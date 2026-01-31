package com.styx.envelope

import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals

class StyxEnvelopeV1Test {
    @Test
    fun roundTrip() {
        val env = StyxEnvelopeV1(
            kind = EnvelopeKind.MEMO,
            flags = 0,
            createdAtUnixMs = 1234L,
            senderPubkey = byteArrayOf(1,2,3),
            recipientPubkey = byteArrayOf(9,8),
            nonce = byteArrayOf(7,7,7,7),
            ciphertext = byteArrayOf(4,5,6,7,8)
        )

        val bytes = env.encode()
        val parsed = StyxEnvelopeV1.decode(bytes)

        assertEquals(env.kind, parsed.kind)
        assertEquals(env.flags, parsed.flags)
        assertEquals(env.createdAtUnixMs, parsed.createdAtUnixMs)
        assertContentEquals(env.senderPubkey, parsed.senderPubkey)
        assertContentEquals(env.recipientPubkey, parsed.recipientPubkey)
        assertContentEquals(env.nonce, parsed.nonce)
        assertContentEquals(env.ciphertext, parsed.ciphertext)
    }
}
