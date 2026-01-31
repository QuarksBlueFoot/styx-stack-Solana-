
import fs from "fs";
import path from "path";
import { tryDecodeChunkFrame, encodeChunkFrame } from "../packages/onchain-messaging/src/chunking";

type Vectors = {
  version: number;
  format: string;
  cases: Array<{
    name: string;
    msgId: string;
    index: number;
    total: number;
    contentType: string;
    chunkB64Url: string;
    frame: string;
  }>;
};

function main() {
  const p = path.join(__dirname, "..", "vectors", "styx-chunk-v1.json");
  const raw = fs.readFileSync(p, "utf8");
  const v: Vectors = JSON.parse(raw);
  if (v.version !== 1) throw new Error("Unsupported vectors version");

  for (const c of v.cases) {
    const decoded = tryDecodeChunkFrame(c.frame);
    if (!decoded) throw new Error(`Failed to decode ${c.name}`);
    const re = encodeChunkFrame(decoded);
    if (re !== c.frame) throw new Error(`Re-encode mismatch for ${c.name}`);
  }
  console.log("✅ Chunk vectors verified");
}

main();
