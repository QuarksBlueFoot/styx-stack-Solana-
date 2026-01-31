package com.styx.sps

import com.styx.core.SpsInstructionInfo
import com.styx.core.SpsDomains as Domains

/**
 * SPS Instruction Builder — constructs binary payloads for the on-chain program.
 *
 * Program ID: STYXbZeL1wcNigy1WAMFbUQ7PNzJpPYV557H7foNyY5
 *
 * KMP-compatible: uses ByteArray with manual LE encoding (no java.nio).
 * Each builder returns a ByteArray ready for Solana instruction data.
 */
object SpsInstructions {

    const val PROGRAM_ID = "STYXbZeL1wcNigy1WAMFbUQ7PNzJpPYV557H7foNyY5"
    const val STYXZK_VERIFIER_ID = "FERRYpEo4dPbJZYqUfpkWHEMQCCs33Vm3TwBLZpBovXM"

    // ═══════════════════════════════════════════════════════════════════════
    // STS DOMAIN
    // ═══════════════════════════════════════════════════════════════════════

    /** STS Shield: [0x01][0x07][mint:32][amount:8][commitment:32] */
    fun stsShield(mint: ByteArray, amount: Long, commitment: ByteArray): ByteArray {
        require(mint.size == 32) { "mint must be 32 bytes" }
        require(commitment.size == 32) { "commitment must be 32 bytes" }
        return buildCompact(Domains.STS, StsOps.SHIELD, buildPayload(74) {
            putBytes(mint); putLongLE(amount); putBytes(commitment)
        })
    }

    /** STS Unshield: [0x01][0x08][nullifier:32][recipient:32][amount:8][proof:var] */
    fun stsUnshield(nullifier: ByteArray, recipient: ByteArray, amount: Long, proof: ByteArray): ByteArray {
        require(nullifier.size == 32) { "nullifier must be 32 bytes" }
        require(recipient.size == 32) { "recipient must be 32 bytes" }
        return buildCompact(Domains.STS, StsOps.UNSHIELD, buildPayload(72 + proof.size) {
            putBytes(nullifier); putBytes(recipient); putLongLE(amount); putBytes(proof)
        })
    }

    /** STS Shield with Init (permissionless): [0x01][0x1F][mint:32][amount:8][commitment:32] */
    fun stsShieldWithInit(mint: ByteArray, amount: Long, commitment: ByteArray): ByteArray {
        require(mint.size == 32) { "mint must be 32 bytes" }
        require(commitment.size == 32) { "commitment must be 32 bytes" }
        return buildCompact(Domains.STS, StsOps.SHIELD_WITH_INIT, buildPayload(72) {
            putBytes(mint); putLongLE(amount); putBytes(commitment)
        })
    }

    /** STS Transfer: [0x01][0x06][nullifier:32][amount:8][new_commitment:32][proof:96] */
    fun stsTransfer(nullifier: ByteArray, amount: Long, newCommitment: ByteArray, proof: ByteArray): ByteArray {
        require(nullifier.size == 32); require(newCommitment.size == 32); require(proof.size == 96)
        return buildCompact(Domains.STS, StsOps.TRANSFER, buildPayload(168) {
            putBytes(nullifier); putLongLE(amount); putBytes(newCommitment); putBytes(proof)
        })
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DAM DOMAIN
    // ═══════════════════════════════════════════════════════════════════════

    /** DAM Pool Create: [0x0E][0x01][mint:32][config:8][fee:2] */
    fun damPoolCreate(mint: ByteArray, config: Long, feeBps: Short): ByteArray {
        require(mint.size == 32)
        return buildCompact(Domains.DAM, DamOps.POOL_CREATE, buildPayload(42) {
            putBytes(mint); putLongLE(config); putShortLE(feeBps)
        })
    }

    /** DAM Virtual Mint: [0x0E][0x10][amount:8][commitment:32] */
    fun damVirtualMint(amount: Long, commitment: ByteArray): ByteArray {
        require(commitment.size == 32)
        return buildCompact(Domains.DAM, DamOps.VIRTUAL_MINT, buildPayload(40) {
            putLongLE(amount); putBytes(commitment)
        })
    }

    /** DAM Virtual Transfer: [0x0E][0x11][nullifier:32][amount:8][new_commitment:32][proof:96] */
    fun damVirtualTransfer(nullifier: ByteArray, amount: Long, newCommitment: ByteArray, proof: ByteArray): ByteArray {
        require(nullifier.size == 32); require(newCommitment.size == 32); require(proof.size == 96)
        return buildCompact(Domains.DAM, DamOps.VIRTUAL_TRANSFER, buildPayload(168) {
            putBytes(nullifier); putLongLE(amount); putBytes(newCommitment); putBytes(proof)
        })
    }

    /** DAM Materialize: [0x0E][0x20][nullifier:32][proof_len:1][proof:32*n][recipient:32][amount:8][schnorr:96] */
    fun damMaterialize(
        nullifier: ByteArray, merkleProof: List<ByteArray>,
        recipient: ByteArray, amount: Long, schnorr: ByteArray
    ): ByteArray {
        require(nullifier.size == 32); require(recipient.size == 32); require(schnorr.size == 96)
        merkleProof.forEach { require(it.size == 32) }
        val proofBytes = merkleProof.size * 32
        return buildCompact(Domains.DAM, DamOps.MATERIALIZE, buildPayload(33 + proofBytes + 32 + 8 + 96) {
            putBytes(nullifier); putByte(merkleProof.size.toByte())
            merkleProof.forEach { putBytes(it) }
            putBytes(recipient); putLongLE(amount); putBytes(schnorr)
        })
    }

    /** DAM Dematerialize: [0x0E][0x30][pool:32][amount:8][new_commitment:32] */
    fun damDematerialize(pool: ByteArray, amount: Long, newCommitment: ByteArray): ByteArray {
        require(pool.size == 32); require(newCommitment.size == 32)
        return buildCompact(Domains.DAM, DamOps.DEMATERIALIZE, buildPayload(72) {
            putBytes(pool); putLongLE(amount); putBytes(newCommitment)
        })
    }

    // ═══════════════════════════════════════════════════════════════════════
    // IC DOMAIN
    // ═══════════════════════════════════════════════════════════════════════

    /** IC Tree Init: [0x0F][0x01][mint:32][height:1][config:8] */
    fun icTreeInit(mint: ByteArray, height: Byte, config: Long): ByteArray {
        require(mint.size == 32)
        return buildCompact(Domains.IC, IcOps.TREE_INIT, buildPayload(41) {
            putBytes(mint); putByte(height); putLongLE(config)
        })
    }

    /** IC Compress: [0x0F][0x11][tree:32][amount:8][commitment:32] */
    fun icCompress(tree: ByteArray, amount: Long, commitment: ByteArray): ByteArray {
        require(tree.size == 32); require(commitment.size == 32)
        return buildCompact(Domains.IC, IcOps.COMPRESS, buildPayload(72) {
            putBytes(tree); putLongLE(amount); putBytes(commitment)
        })
    }

    /** IC Decompress: [0x0F][0x12][tree:32][nullifier:32][recipient:32][amount:8][schnorr:96] */
    fun icDecompress(
        tree: ByteArray, nullifier: ByteArray, recipient: ByteArray,
        amount: Long, schnorr: ByteArray
    ): ByteArray {
        require(tree.size == 32); require(nullifier.size == 32)
        require(recipient.size == 32); require(schnorr.size == 96)
        return buildCompact(Domains.IC, IcOps.DECOMPRESS, buildPayload(200) {
            putBytes(tree); putBytes(nullifier); putBytes(recipient); putLongLE(amount); putBytes(schnorr)
        })
    }

    /** IC Transfer: [0x0F][0x13][tree:32][nullifier:32][amount:8][new_commitment:32][proof:96] */
    fun icTransfer(
        tree: ByteArray, nullifier: ByteArray, amount: Long,
        newCommitment: ByteArray, proof: ByteArray
    ): ByteArray {
        require(tree.size == 32); require(nullifier.size == 32)
        require(newCommitment.size == 32); require(proof.size == 96)
        return buildCompact(Domains.IC, IcOps.TRANSFER, buildPayload(200) {
            putBytes(tree); putBytes(nullifier); putLongLE(amount); putBytes(newCommitment); putBytes(proof)
        })
    }

    /** IC Recompress: [0x0F][0x40][tree:32][amount:8][commitment:32] */
    fun icRecompress(tree: ByteArray, amount: Long, commitment: ByteArray): ByteArray {
        require(tree.size == 32); require(commitment.size == 32)
        return buildCompact(Domains.IC, IcOps.RECOMPRESS, buildPayload(72) {
            putBytes(tree); putLongLE(amount); putBytes(commitment)
        })
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GENERIC BUILDERS
    // ═══════════════════════════════════════════════════════════════════════

    /** Build a compact instruction: [domain:1][op:1][payload...] */
    fun buildCompact(domain: Byte, op: Byte, payload: ByteArray = ByteArray(0)): ByteArray {
        val result = ByteArray(2 + payload.size)
        result[0] = domain
        result[1] = op
        payload.copyInto(result, 2)
        return result
    }

    /**
     * Parse instruction data into domain/op information.
     *
     * Note: GOVERNANCE(0x0D) and EASYPAY(0x11) are DEAD on mainnet (all ops
     * return Err), but we still decode them for indexer/explorer use.
     */
    fun parseInstruction(data: ByteArray): SpsInstructionInfo? {
        if (data.isEmpty()) return null
        val domain = data[0]
        return when {
            Domains.isCompact(domain) && data.size >= 2 -> {
                val op = data[1]
                val opName = when (domain) {
                    Domains.STS -> StsOps.name(op)
                    Domains.DAM -> DamOps.name(op)
                    Domains.IC -> IcOps.name(op)
                    Domains.GOVERNANCE -> GovernanceOps.name(op)
                    Domains.EASYPAY -> EasyPayOps.name(op)
                    else -> "0x${op.toHexByte()}"
                }
                SpsInstructionInfo(
                    mode = "COMPACT",
                    domain = Domains.name(domain),
                    domainByte = domain,
                    opByte = op,
                    opName = opName,
                    payloadSize = data.size - 2
                )
            }
            domain == Domains.EXTENDED && data.size >= 9 -> {
                SpsInstructionInfo(
                    mode = "EXTENDED",
                    domain = "EXTENDED",
                    domainByte = domain,
                    opByte = 0,
                    opName = "sighash:${data.copyOfRange(1, 9).joinToString("") { (it.toInt() and 0xFF).toString(16).padStart(2, '0') }}",
                    payloadSize = data.size - 9
                )
            }
            domain == Domains.TLV && data.size >= 4 -> {
                SpsInstructionInfo(
                    mode = "TLV",
                    domain = "TLV",
                    domainByte = domain,
                    opByte = data[1],
                    opName = "type:0x${data[1].toHexByte()}",
                    payloadSize = data.size - 4
                )
            }
            domain == Domains.SCHEMA && data.size >= 33 -> {
                SpsInstructionInfo(
                    mode = "SCHEMA",
                    domain = "SCHEMA",
                    domainByte = domain,
                    opByte = 0,
                    opName = "hash:${data.copyOfRange(1, 33).joinToString("") { (it.toInt() and 0xFF).toString(16).padStart(2, '0') }}",
                    payloadSize = data.size - 33
                )
            }
            else -> null
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PAYLOAD BUILDER DSL (replaces java.nio.ByteBuffer)
// ═══════════════════════════════════════════════════════════════════════════

internal class PayloadBuilder(capacity: Int) {
    val data = ByteArray(capacity)
    var offset = 0

    fun putByte(b: Byte) { data[offset++] = b }
    fun putBytes(src: ByteArray) { src.copyInto(data, offset); offset += src.size }
    fun putShortLE(v: Short) {
        data[offset++] = (v.toInt() and 0xFF).toByte()
        data[offset++] = ((v.toInt() shr 8) and 0xFF).toByte()
    }
    fun putLongLE(v: Long) {
        for (i in 0..7) data[offset++] = ((v ushr (i * 8)) and 0xFF).toByte()
    }
}

internal inline fun buildPayload(capacity: Int, block: PayloadBuilder.() -> Unit): ByteArray {
    val builder = PayloadBuilder(capacity)
    builder.block()
    return if (builder.offset == capacity) builder.data else builder.data.copyOf(builder.offset)
}
