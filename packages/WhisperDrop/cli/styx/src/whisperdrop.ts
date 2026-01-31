import fs from "fs";
import { Command } from "commander";
import {
  manifestHashB64Url,
  buildMerkleWithProofs,
  buildCommitmentMemoString
} from "@styx/whisperdrop-kit";
import type { WhisperDropManifestV1, WhisperDropLeafInput } from "@styx/whisperdrop-kit";

function readJsonFile<T>(p: string): T {
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw) as T;
}

export function registerWhisperDropCommands(program: Command) {
  const wd = program.command("whisperdrop").description("WhisperDrop protocol tooling");

  wd.command("manifest-hash")
    .description("Compute the canonical manifest hash (base64url)")
    .argument("<manifestPath>", "Path to manifest JSON")
    .action((manifestPath: string) => {
      const manifest = readJsonFile<WhisperDropManifestV1>(manifestPath);
      const out = manifestHashB64Url(manifest);
      console.log(out);
    });

  wd.command("merkle-build")
    .description("Build Merkle root and per-leaf proofs for a campaign")
    .requiredOption("--campaign <campaignId>", "Campaign id")
    .argument("<leavesPath>", "Path to leaves JSON array")
    .action((leavesPath: string, opts: { campaign: string }) => {
      const leaves = readJsonFile<WhisperDropLeafInput[]>(leavesPath);
      const res = buildMerkleWithProofs(opts.campaign, leaves);
      console.log(JSON.stringify(res, null, 2));
    });

  wd.command("commitment-memo")
    .description("Build the public commitment memo string")
    .requiredOption("--manifest <manifestPath>", "Path to manifest JSON")
    .requiredOption("--merkle-root <rootB64Url>", "Merkle root (base64url)")
    .action((opts: { manifest: string; merkleRoot: string }) => {
      const manifest = readJsonFile<WhisperDropManifestV1>(opts.manifest);
      const mh = manifestHashB64Url(manifest);
      const memo = buildCommitmentMemoString(mh, opts.merkleRoot);
      console.log(memo);
    });
}
