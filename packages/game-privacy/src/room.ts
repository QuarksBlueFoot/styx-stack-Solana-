import { sha256Bytes } from "@styx/crypto-core";
import bs58 from "bs58";

export function deriveRoomId(params: { participants: string[]; salt?: string }): string {
  const salt = params.salt ?? "styx-room-v1";
  const norm = [...params.participants].map((p) => p.trim()).filter(Boolean).sort();
  const joined = `${salt}|${norm.join(",")}`;
  const h = sha256Bytes(new TextEncoder().encode(joined));
  return bs58.encode(h.slice(0, 16));
}
