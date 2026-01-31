package com.styx.whisperdrop.wd

import com.solana.rpc.solana.SolanaRpcClient
import com.solana.rpc.ktordriver.KtorNetworkDriver
import com.solana.rpc.*
import android.app.Activity
import android.net.Uri
import com.solana.mobilewalletadapter.clientlib.ActivityResultSender
import com.solana.mobilewalletadapter.clientlib.ConnectionIdentity
import com.solana.mobilewalletadapter.clientlib.MobileWalletAdapter
import com.solana.mobilewalletadapter.clientlib.TransactionResult
import com.solana.publickey.SolanaPublicKey
import com.solana.rpc.SolanaRpcClient
import com.solana.networking.KtorNetworkDriver
import com.solana.transaction.AccountMeta
import com.solana.transaction.Message
import com.solana.transaction.SystemProgram
import com.solana.transaction.Transaction
import com.solana.transaction.TransactionInstruction

/**
 * Step 9: Mobile Wallet Adapter (MWA) based "true in-app send".
 *
 * - Non-custodial: wallet signs.
 * - Builds a real Solana transaction locally (SystemProgram transfer + Memo).
 * - Uses Solana Mobile Kotlin libs: web3-solana + rpc + mobile-wallet-adapter-clientlib-ktx.
 */
object MwaClient {

  private fun accountExists(rpcUrl: String, pubkeyBase58: String): Boolean {
    val info = SolanaRpc.getAccountInfo(rpcUrl, pubkeyBase58).toString()
    return info.contains("\"value\":") && !info.contains("\"value\":null")
  }

  private const val MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"

  data class SendResult(val signatureBase58: String)

  suspend fun sendLiteClaim(
    activity: Activity,
    rpcUrl: String,
    sinkPubkeyBase58: String,
    memo: String,
    lamports: Long = 5_000L,
    identityUri: String = "https://boobiesinteractive.com",
    iconPath: String = "favicon.ico",
    identityName: String = "WhisperDrop"
  ): SendResult {
    val sender = ActivityResultSender(activity)

    val walletAdapter = MobileWalletAdapter(
      connectionIdentity = ConnectionIdentity(
        identityUri = Uri.parse(identityUri),
        iconUri = Uri.parse(iconPath), // resolves relative to identityUri
        identityName = identityName
      )
    )

    val result = walletAdapter.transact(sender) { authResult ->
      val from = SolanaPublicKey(authResult.accounts.first().publicKey)
      val to = SolanaPublicKey(sinkPubkeyBase58)

      // Fetch latest blockhash
      val rpc = SolanaRpcClient(rpcUrl, KtorNetworkDriver())
      val bh = rpc.getLatestBlockhash()
      if (bh.error != null) throw IllegalStateException("Failed to fetch latest blockhash: ${'$'}{bh.error?.message}")

      // Transfer + Memo instructions in the same tx
      val transferIx = SystemProgram.transfer(from, to, lamports)

      val memoIx = TransactionInstruction(
        SolanaPublicKey.from(MEMO_PROGRAM_ID),
        listOf(AccountMeta(from, true, true)),
        memo.encodeToByteArray()
      )

      val msg = Message.Builder()
        .addInstruction(transferIx)
        .addInstruction(memoIx)
        .setRecentBlockhash(bh.result!!.blockhash)
        .build()

      val tx = Transaction(msg)

      signAndSendTransactions(arrayOf(tx.serialize()))
    }

    when (result) {
      is TransactionResult.Success -> {
        val sigBytes = result.successPayload?.signatures?.firstOrNull()
          ?: throw IllegalStateException("MWA success without signature")
        return SendResult(Base58.encode(sigBytes))
      }
      is TransactionResult.NoWalletFound -> throw IllegalStateException("No MWA-compatible wallet found on device.")
      is TransactionResult.Failure -> throw IllegalStateException(result.e.message ?: "MWA failure")
    }
  }
suspend fun sendEscrowClaim(
  activity: Activity,
  rpcUrl: String,
  programIdBase58: String,
  campaignIdB64Url: String,
  mintBase58: String,
  recipientBase58: String,
  allocation: Long,
  nonceHex16: String,
  proofB64Url: List<String>,
  identityUri: String = "https://boobiesinteractive.com",
  iconPath: String = "favicon.ico",
  identityName: String = "WhisperDrop"
): SendResult {
  val sender = ActivityResultSender(activity)

  val walletAdapter = MobileWalletAdapter(
    connectionIdentity = ConnectionIdentity(
      identityUri = Uri.parse(identityUri),
      iconUri = Uri.parse(iconPath),
      identityName = identityName
    )
  )

  val result = walletAdapter.transact(sender) { authResult ->
    val payer = SolanaPublicKey(authResult.accounts.first().publicKey)

    val programId32 = Base58.decode(programIdBase58).also { require(it.size == 32) { "programId must be 32 bytes" } }
    val campaignId32 = Base64Url.decode(campaignIdB64Url).also { require(it.size == 32) { "campaignId must be 32 bytes b64url" } }

    // PDAs must match program seeds
    val (campaignPda32, _) = SolanaPda.findProgramAddress(listOf("campaign".toByteArray(), campaignId32), programId32)
    val (escrowPda32, _) = SolanaPda.findProgramAddress(listOf("escrow".toByteArray(), campaignPda32), programId32)

    val recipient32 = Base58.decode(recipientBase58).also { require(it.size == 32) { "recipient must be 32 bytes" } }
    val (nullifierPda32, _) = SolanaPda.findProgramAddress(listOf("nullifier".toByteArray(), campaignPda32, recipient32), programId32)

    val campaignPda = SolanaPublicKey(Base58.encode(campaignPda32))
    val escrowPda = SolanaPublicKey(Base58.encode(escrowPda32))
    val nullifierPda = SolanaPublicKey(Base58.encode(nullifierPda32))
    val mint = SolanaPublicKey(mintBase58)
    val recipient = SolanaPublicKey(recipientBase58)

    // Derive recipient ATA
    val recipientAtaBase58 = AssociatedToken.deriveAtaBase58(recipientBase58, mintBase58)
    val recipientAta = SolanaPublicKey(recipientAtaBase58)

    // Fetch latest blockhash
    val rpc = SolanaRpcClient(rpcUrl, KtorNetworkDriver())
    val bh = rpc.getLatestBlockhash()
    if (bh.error != null) throw IllegalStateException("Failed to fetch latest blockhash: ${'$'}{bh.error?.message}")

    // Build Anchor instruction data for `claim`
    val disc = AnchorIx.discriminator("claim")
    val nonce = nonceHex16.trim().let {
      require(it.length == 32) { "nonceHex16 must be 16 bytes hex (32 chars)" }
      Hex.decode(it)
    }
    val proof32 = proofB64Url.map { p ->
      Base64Url.decode(p).also { b -> require(b.size == 32) { "proof node must be 32 bytes" } }
    }
    val data = BorshWriter()
      .bytes(disc)
      .u64(allocation)
      .fixed16(nonce)
      .vecBytes32(proof32)
      .toByteArray()

    val program = SolanaPublicKey(programIdBase58)

    val ix = TransactionInstruction(
      program,
      listOf(
        AccountMeta(mint, false, false),
        AccountMeta(campaignPda, false, true),
        AccountMeta(recipient, false, false),
        AccountMeta(escrowPda, false, true),
        AccountMeta(nullifierPda, false, true),
        AccountMeta(payer, true, true),
        AccountMeta(recipientAta, false, true),
        AccountMeta(SolanaPublicKey.from(com.solana.transaction.SystemProgram.PROGRAM_ID), false, false),
        AccountMeta(SolanaPublicKey.from(AssociatedToken.tokenProgramId()), false, false),
      ),
      data
    )

    val msg = Message.Builder()
      .addInstruction(ix)
      .setRecentBlockhash(bh.result!!.blockhash)
      .build()

    val tx = Transaction(msg)

    signAndSendTransactions(arrayOf(tx.serialize()))
  }

  return when (result) {
    is TransactionResult.Success -> {
      val sigBytes = result.successPayload?.signatures?.firstOrNull()
        ?: throw IllegalStateException("MWA success without signature")
      SendResult(Base58.encode(sigBytes))
    }
    is TransactionResult.NoWalletFound -> throw IllegalStateException("No MWA-compatible wallet found on device.")
    is TransactionResult.Failure -> throw IllegalStateException(result.e.message ?: "MWA failure")
  }
suspend fun sendInitCampaign(
  activity: Activity,
  rpcUrl: String,
  programIdBase58: String,
  campaignIdB64Url: String,
  manifestHashB64Url: String,
  merkleRootB64Url: String,
  mintBase58: String,
  expiryUnix: Long,
  identityUri: String = "https://boobiesinteractive.com",
  iconPath: String = "favicon.ico",
  identityName: String = "WhisperDrop"
): SendResult {
  val sender = ActivityResultSender(activity)
  val walletAdapter = MobileWalletAdapter(
    connectionIdentity = ConnectionIdentity(
      identityUri = Uri.parse(identityUri),
      iconUri = Uri.parse(iconPath),
      identityName = identityName
    )
  )

  val result = walletAdapter.transact(sender) { authResult ->
    val payer = SolanaPublicKey(authResult.accounts.first().publicKey)

    val programId32 = Base58.decode(programIdBase58).also { require(it.size == 32) }
    val campaignId32 = Base64Url.decode(campaignIdB64Url).also { require(it.size == 32) }
    val manifestHash32 = Base64Url.decode(manifestHashB64Url).also { require(it.size == 32) }
    val merkleRoot32 = Base64Url.decode(merkleRootB64Url).also { require(it.size == 32) }

    val (campaignPda32, _) = SolanaPda.findProgramAddress(listOf("campaign".toByteArray(), campaignId32), programId32)
    val campaignPda = SolanaPublicKey(Base58.encode(campaignPda32))
    val program = SolanaPublicKey(programIdBase58)
    val mint = SolanaPublicKey(mintBase58)

    val rpc = SolanaRpcClient(rpcUrl, KtorNetworkDriver())
    val bh = rpc.getLatestBlockhash()
    if (bh.error != null) throw IllegalStateException("Failed to fetch latest blockhash: ${'$'}{bh.error?.message}")

    val disc = AnchorIx.discriminator("initCampaign")
    val data = BorshWriter()
      .bytes(disc)
      .bytes(campaignId32)
      .bytes(manifestHash32)
      .bytes(merkleRoot32)
      .u64(expiryUnix) // anchor uses i64; u64 is fine for non-negative
      .toByteArray()

    val ix = TransactionInstruction(
      program,
      listOf(
        AccountMeta(payer, true, true), // authority
        AccountMeta(mint, false, false),
        AccountMeta(campaignPda, false, true),
        // escrow PDA account is created by program in anchor version; but for init we don't require passing it here in our simplified client.
        AccountMeta(SolanaPublicKey.from(com.solana.transaction.SystemProgram.PROGRAM_ID), false, false),
        AccountMeta(SolanaPublicKey.from(AssociatedToken.tokenProgramId()), false, false),
        AccountMeta(SolanaPublicKey.from(AssociatedToken.sysvarRentId()), false, false),
      ),
      data
    )

    val msg = Message.Builder()
      .addInstruction(ix)
      .setRecentBlockhash(bh.result!!.blockhash)
      .build()

    val tx = Transaction(msg)
    signAndSendTransactions(arrayOf(tx.serialize()))
  }

  return when (result) {
    is TransactionResult.Success -> {
      val sigBytes = result.successPayload?.signatures?.firstOrNull()
        ?: throw IllegalStateException("MWA success without signature")
      SendResult(Base58.encode(sigBytes))
    }
    is TransactionResult.NoWalletFound -> throw IllegalStateException("No MWA-compatible wallet found on device.")
    is TransactionResult.Failure -> throw IllegalStateException(result.e.message ?: "MWA failure")
  }
}

suspend fun sendDepositToEscrowAta(
  activity: Activity,
  rpcUrl: String,
  campaignIdB64Url: String,
  programIdBase58: String,
  mintBase58: String,
  amount: Long,
  identityUri: String = "https://boobiesinteractive.com",
  iconPath: String = "favicon.ico",
  identityName: String = "WhisperDrop"
): SendResult {
  val sender = ActivityResultSender(activity)
  val walletAdapter = MobileWalletAdapter(
    connectionIdentity = ConnectionIdentity(
      identityUri = Uri.parse(identityUri),
      iconUri = Uri.parse(iconPath),
      identityName = identityName
    )
  )

  val result = walletAdapter.transact(sender) { authResult ->
    val payer = SolanaPublicKey(authResult.accounts.first().publicKey)

    val programId32 = Base58.decode(programIdBase58).also { require(it.size == 32) }
    val campaignId32 = Base64Url.decode(campaignIdB64Url).also { require(it.size == 32) }
    val (campaignPda32, _) = SolanaPda.findProgramAddress(listOf("campaign".toByteArray(), campaignId32), programId32)
    val campaignPdaBase58 = Base58.encode(campaignPda32)

    val mint = SolanaPublicKey(mintBase58)

    // escrow token account as ATA(owner = campaign PDA, mint)
    val escrowAtaBase58 = AssociatedToken.deriveAtaBase58(campaignPdaBase58, mintBase58)
    val escrowAta = SolanaPublicKey(escrowAtaBase58)

    // source token account as ATA(owner = payer, mint)
    val payerBase58 = Base58.encode(payer.toByteArray())
    val sourceAtaBase58 = AssociatedToken.deriveAtaBase58(payerBase58, mintBase58)
    val sourceAta = SolanaPublicKey(sourceAtaBase58)

    val rpc = SolanaRpcClient(rpcUrl, KtorNetworkDriver())
    val bh = rpc.getLatestBlockhash()
    if (bh.error != null) throw IllegalStateException("Failed to fetch latest blockhash: ${'$'}{bh.error?.message}")

    val mb = Message.Builder()
    if (!accountExists(rpcUrl, escrowAtaBase58)) {
      mb.addInstruction(AssociatedToken.createAtaInstruction(payer, escrowAta, SolanaPublicKey(campaignPdaBase58), mint))
    }
    // transfer tokens from payer ATA -> escrow ATA
    mb.addInstruction(SplTokenIx.transfer(sourceAta, escrowAta, payer, amount))

    val msg = mb.setRecentBlockhash(bh.result!!.blockhash).build()
    val tx = Transaction(msg)
    signAndSendTransactions(arrayOf(tx.serialize()))
  }

  return when (result) {
    is TransactionResult.Success -> {
      val sigBytes = result.successPayload?.signatures?.firstOrNull()
        ?: throw IllegalStateException("MWA success without signature")
      SendResult(Base58.encode(sigBytes))
    }
    is TransactionResult.NoWalletFound -> throw IllegalStateException("No MWA-compatible wallet found on device.")
    is TransactionResult.Failure -> throw IllegalStateException(result.e.message ?: "MWA failure")
  }
}

}


}