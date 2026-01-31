package com.styx.whisperdrop.wd

import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.PrivateKey
import java.security.PublicKey

/**
 * Ed25519 keypair for "Lite Claim" ephemeral claim wallet.
 * This is not a full Solana signer integration; we export the claim payload
 * (memo string + recipient pubkey) for submission via an external wallet.
 */
object Ed25519 {
  fun generateKeypair(): KeyPair {
    val kpg = KeyPairGenerator.getInstance("Ed25519")
    return kpg.generateKeyPair()
  }

  fun pubEncoded(pub: PublicKey): ByteArray = pub.encoded
  fun privEncoded(priv: PrivateKey): ByteArray = priv.encoded
}
