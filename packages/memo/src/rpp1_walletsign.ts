import { PublicKey } from "@solana/web3.js";
import type { Bytes } from "@styx/crypto-core";
import { bytesToB64, bytesToHex, sha256Bytes, utf8ToBytes, concatBytes, bytesToUtf8, hexToBytes } from "@styx/crypto-core";
import { pmf1BinaryParse, pmf1BinaryDecrypt } from "./pmf1_binary";
import type { WalletSignAdapter } from "@styx/wallet-adapters";
import nacl from "tweetnacl";
import { rpp1Verify, type RPP1Package } from "./rpp1";

/**
 * Build RPP1 using a wallet signMessage() (no private key extraction).
 * This is how Solana Mobile / wallet-adapter apps should sign reveal packages. citeturn0search0turn0search4turn0search8turn0search1
 */
const MAGIC = utf8ToBytes("RPP1");

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

export function rpp1MessageHash(args: {
  pmf1_hash: Bytes;
  auditorId: string;
  context: string;
  revealedAt: bigint;
}): Bytes {
  const aud = utf8ToBytes(args.auditorId);
  const ctx = utf8ToBytes(args.context);
  return sha256Bytes(concatBytes(
    MAGIC,
    args.pmf1_hash,
    u16le(aud.length), aud,
    u16le(ctx.length), ctx,
    u64le(args.revealedAt),
  ));
}

export async function rpp1BuildWithWalletSigner(args: {
  pmf1: Bytes;
  recipientX25519SecretKey: Bytes;
  auditorId: string;
  context: string;
  walletPubkey: PublicKey;
  signer: WalletSignAdapter;
}): Promise<RPP1Package> {
  const parsed = pmf1BinaryParse(args.pmf1);
  const plaintext = pmf1BinaryDecrypt({ recipientX25519SecretKey: args.recipientX25519SecretKey, pmf1: args.pmf1 });

  const pmf1_hash = sha256Bytes(args.pmf1);
  const revealedAt = BigInt(Date.now());
  const msgHash = rpp1MessageHash({ pmf1_hash, auditorId: args.auditorId, context: args.context, revealedAt });

  // We sign the hash bytes directly (wallet-adapter signMessage signs bytes).
  const signature = await args.signer.signMessage(msgHash);

  const pkg: RPP1Package = {
    v: 1,
    pmf1_b64: bytesToB64(args.pmf1),
    pmf1_hash_b64: bytesToB64(pmf1_hash),
    auditorId: args.auditorId,
    context: args.context,
    revealedAt: Number(revealedAt),
    revealerWalletPubkey_b64: bytesToB64(args.walletPubkey.toBytes()),
    signature_b64: bytesToB64(signature),
    plaintext_b64: bytesToB64(plaintext),
    contentType: parsed.contentType,
    appTag: parsed.appTag
  };

  // sanity check: verify with existing verifier (expects ed25519 pubkey bytes)
  const ok = rpp1Verify({ pkg });
  if (!ok) throw new Error("internal error: built package did not verify");
  return pkg;
}
