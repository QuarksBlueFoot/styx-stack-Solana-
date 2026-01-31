import { concatBytes, utf8ToBytes, type Bytes } from "@styx/crypto-core";
import { sha256Bytes } from "@styx/crypto-core";
import { verifyEd25519 } from "@styx/crypto-core";

export type KRB1 = {
  walletPubkey: Bytes;      // 32
  x25519Pubkey: Bytes;      // 32
  createdAt: bigint;        // unix ms
  domain: string;           // "solana-privacy:key-registry:v1"
};

const MAGIC = utf8ToBytes("KRB1");

function u64le(n: bigint): Bytes {
  const out = new Uint8Array(8);
  let x = n;
  for (let i = 0; i < 8; i++) { out[i] = Number(x & 0xffn); x >>= 8n; }
  return out;
}

function u16le(n: number): Bytes {
  const out = new Uint8Array(2);
  out[0] = n & 0xff;
  out[1] = (n >> 8) & 0xff;
  return out;
}

export function encodeKRB1Payload(p: KRB1): Bytes {
  const domainBytes = utf8ToBytes(p.domain);
  if (p.walletPubkey.length != 32) throw new Error("walletPubkey must be 32 bytes");
  if (p.x25519Pubkey.length != 32) throw new Error("x25519Pubkey must be 32 bytes");
  return concatBytes(
    MAGIC,
    new Uint8Array([1]),
    p.walletPubkey,
    p.x25519Pubkey,
    u64le(p.createdAt),
    u16le(domainBytes.length),
    domainBytes
  );
}

export function krb1MessageHash(payload: Bytes): Bytes {
  return sha256Bytes(payload);
}

export async function verifyKRB1Signature(args: { payload: Bytes; signature: Bytes; walletPubkey: Bytes }): Promise<boolean> {
  const msg = krb1MessageHash(args.payload);
  return await verifyEd25519(args.signature, msg, args.walletPubkey);
}
