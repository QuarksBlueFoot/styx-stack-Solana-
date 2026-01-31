import fs from "node:fs";
import path from "node:path";

import { encodeStyxEnvelope, decodeStyxEnvelope } from "../packages/memo/src/styxEnvelope";

type Vector = {
  name: string;
  env: Record<string, string>;
  encoded_b64url: string;
  memo: string;
};

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "===".slice((b64.length + 3) % 4);
  return new Uint8Array(Buffer.from(padded, "base64"));
}

function bytesToB64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function getBytesField(env: Record<string, string>, key: string): Uint8Array | undefined {
  const v = env[key];
  if (!v) return undefined;
  return b64urlToBytes(v);
}

function assert(cond: any, msg: string): void {
  if (!cond) throw new Error(msg);
}

const vectorsPath = path.resolve(process.cwd(), "vectors/styx-envelope-v1.json");
const vectors = JSON.parse(fs.readFileSync(vectorsPath, "utf8")) as Vector[];

let ok = 0;
for (const v of vectors) {
  const envJson = v.env;
  const env = {
    v: 1 as const,
    kind: envJson.kind as any,
    algo: envJson.algo as any,
    id: getBytesField(envJson, "id")!,
    toHash: getBytesField(envJson, "toHash"),
    from: getBytesField(envJson, "from"),
    nonce: getBytesField(envJson, "nonce"),
    body: getBytesField(envJson, "body")!,
    aad: getBytesField(envJson, "aad"),
    sig: getBytesField(envJson, "sig"),
  };

  const encoded = encodeStyxEnvelope(env);
  const encB64url = bytesToB64url(encoded);
  assert(encB64url === v.encoded_b64url, `${v.name}: encoded mismatch`);
  assert(`styx1:${v.encoded_b64url}` === v.memo, `${v.name}: memo mismatch`);

  const decoded = decodeStyxEnvelope(encoded);
  assert(decoded.v === 1, `${v.name}: version mismatch`);
  assert(decoded.kind === env.kind, `${v.name}: kind mismatch`);
  assert(decoded.algo === env.algo, `${v.name}: algo mismatch`);
  assert(bytesToB64url(decoded.id) === envJson.id, `${v.name}: id mismatch`);
  assert(bytesToB64url(decoded.body) === envJson.body, `${v.name}: body mismatch`);

  ok++;
}

console.log(`OK: ${ok}/${vectors.length} Styx Envelope vectors verified`);
