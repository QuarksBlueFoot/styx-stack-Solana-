export type Bytes = Uint8Array;

export interface SecureStoreBackend {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface NonExportableAead {
  ensureKey(alias: string): Promise<void>;
  deleteKey(alias: string): Promise<void>;
  encrypt(alias: string, plaintext: Bytes, aad?: Bytes): Promise<{ nonce: Bytes; ciphertext: Bytes }>;
  decrypt(alias: string, nonce: Bytes, ciphertext: Bytes, aad?: Bytes): Promise<Bytes>;
}
