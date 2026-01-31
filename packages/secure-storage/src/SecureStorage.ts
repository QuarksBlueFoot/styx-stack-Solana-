import { NonExportableAead, SecureStoreBackend } from "./types";
import { StoredEnvelopeV1, utf8ToBytes, bytesToUtf8, bytesToB64, b64ToBytes } from "./envelope";
import { rnBackend, rnNativeAead } from "./rn";

/**
 * SecureStorage is a thin, tooling-only wrapper that provides:
 * - non-exportable AEAD keys (platform keystore / Secure Enclave)
 * - authenticated encryption (AES-256-GCM)
 * - an envelope format for persistence
 *
 * The caller owns policy: what to store, when to wipe, and how to derive app-level keys.
 */
export class SecureStorage {
  private constructor(
    private readonly keyAlias: string,
    private readonly aadNamespace: string,
    private readonly aead: NonExportableAead,
    private readonly backend: SecureStoreBackend
  ) {}

  static mobile(opts: { keyAlias: string; aadNamespace?: string }): SecureStorage {
    return new SecureStorage(
      opts.keyAlias,
      opts.aadNamespace ?? "styx",
      rnNativeAead(),
      rnBackend()
    );
  }

  async setString(key: string, value: string): Promise<void> {
    await this.aead.ensureKey(this.keyAlias);

    const aad = utf8ToBytes(`${this.aadNamespace}:${key}`);
    const { nonce, ciphertext } = await this.aead.encrypt(this.keyAlias, utf8ToBytes(value), aad);

    const env: StoredEnvelopeV1 = {
      v: 1,
      alg: "AES-256-GCM",
      nonce_b64: bytesToB64(nonce),
      ct_b64: bytesToB64(ciphertext),
      created_at: Date.now(),
    };

    await this.backend.setItem(key, JSON.stringify(env));
  }

  async getString(key: string): Promise<string | null> {
    const raw = await this.backend.getItem(key);
    if (!raw) return null;

    let env: StoredEnvelopeV1;
    try {
      env = JSON.parse(raw);
    } catch {
      return null;
    }

    if (!env || env.v !== 1 || env.alg !== "AES-256-GCM") return null;

    await this.aead.ensureKey(this.keyAlias);

    const nonce = b64ToBytes(env.nonce_b64);
    const ct = b64ToBytes(env.ct_b64);
    const aad = env.aad_b64 ? b64ToBytes(env.aad_b64) : utf8ToBytes(`${this.aadNamespace}:${key}`);

    const pt = await this.aead.decrypt(this.keyAlias, nonce, ct, aad);
    return bytesToUtf8(pt);
  }

  async remove(key: string): Promise<void> {
    await this.backend.removeItem(key);
  }

  async wipeAll(): Promise<void> {
    await this.backend.clear();
    await this.aead.deleteKey(this.keyAlias);
  }
}
