import { canonicalJson } from "./canonical";
import { sha256Utf8, bytesToB64Url } from "./crypto";
import type { WhisperDropManifestV1 } from "./types";

export function manifestCanonicalJson(manifest: WhisperDropManifestV1): string {
  return canonicalJson(manifest);
}

export function manifestHashBytes(manifest: WhisperDropManifestV1): Uint8Array {
  return sha256Utf8(manifestCanonicalJson(manifest));
}

export function manifestHashB64Url(manifest: WhisperDropManifestV1): string {
  return bytesToB64Url(manifestHashBytes(manifest));
}
