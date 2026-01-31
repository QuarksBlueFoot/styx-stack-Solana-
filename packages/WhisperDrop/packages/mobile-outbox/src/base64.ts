export function b64ToBytes(b64: string): Uint8Array {
  // Support Node and React Native
  if (typeof Buffer !== "undefined") {
    return Uint8Array.from(Buffer.from(b64, "base64"));
  }
  // @ts-ignore
  const bin = globalThis.atob ? globalThis.atob(b64) : (globalThis as any).Buffer?.from(b64, "base64").toString("binary");
  if (typeof bin !== "string") throw new Error("No base64 decoder available");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToB64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  // @ts-ignore
  if (globalThis.btoa) return globalThis.btoa(bin);
  throw new Error("No base64 encoder available");
}
