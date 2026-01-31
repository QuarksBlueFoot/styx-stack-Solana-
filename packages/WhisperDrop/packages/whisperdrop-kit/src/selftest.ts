import { buildMerkleWithProofs, verifyLeafProof } from "./merkle";
import { buildCommitmentMemoString } from "./commitment";
import { manifestHashB64Url } from "./manifest";
import type { WhisperDropManifestV1 } from "./types";

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(`selftest failed: ${msg}`);
}

function main() {
  const manifest: WhisperDropManifestV1 = {
    version: "whisperdrop.manifest.v1",
    campaignId: "demo-campaign-001",
    name: "Demo WhisperDrop",
    description: "Selftest campaign",
    startTimeIso: "2026-01-01T00:00:00Z",
    endTimeIso: "2026-01-15T00:00:00Z",
    snapshot: { type: "slot", value: 123456789, network: "solana-devnet" },
    rules: { description: "Did the thing three times" },
    asset: { mint: "So11111111111111111111111111111111111111112", decimals: 9, totalAmount: "1000000000" },
    claim: { expiresTimeIso: "2026-02-01T00:00:00Z", mode: "memo-claim" },
    tags: ["selftest"]
  };

  const mh = manifestHashB64Url(manifest);
  assert(typeof mh === "string" && mh.length > 10, "manifest hash should look like b64url");

  const res = buildMerkleWithProofs(manifest.campaignId, [
    { recipient: "A", allocation: "100" },
    { recipient: "B", allocation: "200" },
    { recipient: "C", allocation: "300" }
  ]);
  assert(res.merkleRootB64Url.length > 10, "merkle root should look like b64url");

  for (const leaf of res.leaves) {
    const ok = verifyLeafProof(res.campaignId, leaf.recipient, leaf.allocation, leaf.nonceHex, leaf.proof, res.merkleRootB64Url);
    assert(ok, "generated proof must verify");
  }

  const memo = buildCommitmentMemoString(mh, res.merkleRootB64Url);
  assert(memo.startsWith("whisperdrop:commitment:v1:"), "memo prefix");
  console.log("ok");
}

main();
