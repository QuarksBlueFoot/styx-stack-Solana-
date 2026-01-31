import { PublicKey, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import type { Bytes } from "@styx/crypto-core";
import { concatBytes, utf8ToBytes } from "@styx/crypto-core";

export const KEY_REGISTRY_PROGRAM_ID = new PublicKey("KeyReg1111111111111111111111111111111111111");

export function deriveKeyRegistryPda(wallet: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([utf8ToBytes("krp"), wallet.toBytes()], KEY_REGISTRY_PROGRAM_ID);
  return pda;
}

function u8(n: number): Bytes {
  return new Uint8Array([n & 0xff]);
}

export function buildUpsertKeyInstruction(args: {
  wallet: PublicKey;
  x25519Pubkey: Uint8Array; // 32
}): TransactionInstruction {
  if (args.x25519Pubkey.length !== 32) throw new Error("x25519Pubkey must be 32 bytes");

  // instruction data (original, simple): [0x01] + x25519_pubkey[32]
  const data = concatBytes(u8(1), args.x25519Pubkey);

  const pda = deriveKeyRegistryPda(args.wallet);

  return new TransactionInstruction({
    programId: KEY_REGISTRY_PROGRAM_ID,
    keys: [
      { pubkey: args.wallet, isSigner: true, isWritable: true },
      { pubkey: pda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}
