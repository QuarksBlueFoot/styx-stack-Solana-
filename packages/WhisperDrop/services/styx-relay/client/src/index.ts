import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { serialize } from "borsh";

/**
 * Styx Relay Program interface (client-side).
 *
 * NOTE: Program ID is supplied by the deployer. Keep it explicit to avoid
 * accidental mainnet misuse in dev environments.
 */

export type RelayV1Args = {
  feeLamports: bigint | number;
  envelope: Uint8Array;
};

class RelayV1Schema {
  feeLamports: bigint;
  envelope: Uint8Array;
  constructor(args: RelayV1Args) {
    this.feeLamports = BigInt(args.feeLamports);
    this.envelope = args.envelope;
  }
}

// Borsh layout matching services/styx-relay/program RelayIx::Relay
const RELAY_SCHEMA = new Map<any, any>([
  [
    RelayV1Schema,
    {
      kind: "struct",
      fields: [
        // enum discriminant u8 (0 for Relay)
        ["_disc", "u8"],
        ["feeLamports", "u64"],
        ["envelope", ["u8"]],
      ],
    },
  ],
]);

function encodeRelayV1(args: RelayV1Args): Buffer {
  // inject discriminant as a pseudo-field
  const o: any = new RelayV1Schema(args);
  o._disc = 0;
  return Buffer.from(serialize(RELAY_SCHEMA, o));
}

export function buildRelayInstruction(args: {
  programId: PublicKey;
  payer: PublicKey;
  treasury: PublicKey;
  relay: RelayV1Args;
}): TransactionInstruction {
  const data = encodeRelayV1(args.relay);

  return new TransactionInstruction({
    programId: args.programId,
    keys: [
      { pubkey: args.payer, isSigner: true, isWritable: true },
      { pubkey: args.treasury, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}
