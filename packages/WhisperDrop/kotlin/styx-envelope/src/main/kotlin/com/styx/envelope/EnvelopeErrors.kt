package com.styx.envelope

sealed class StyxEnvelopeError(message: String) : Exception(message) {
    class BadMagic : StyxEnvelopeError("STYX_ENV_BAD_MAGIC")
    class UnsupportedVersion(v: Int) : StyxEnvelopeError("STYX_ENV_UNSUPPORTED_VERSION:$v")
    class Truncated : StyxEnvelopeError("STYX_ENV_TRUNCATED")
    class BadField(name: String) : StyxEnvelopeError("STYX_ENV_BAD_FIELD:$name")
}
