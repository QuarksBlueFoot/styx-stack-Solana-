import { sha256 } from "@noble/hashes/sha256";
import type { Bytes } from "./bytes";

export function sha256Bytes(data: Bytes): Bytes {
  return sha256(data);
}
