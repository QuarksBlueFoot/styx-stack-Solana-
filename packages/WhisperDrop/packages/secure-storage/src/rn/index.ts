import type { NonExportableAead, SecureStoreBackend, Bytes } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules } from "react-native";

const { PrivacyAead } = NativeModules as any;

function toU8(x: number[] | Uint8Array): Bytes {
  return x instanceof Uint8Array ? x : new Uint8Array(x);
}

export function rnBackend(): SecureStoreBackend {
  return {
    setItem: (k, v) => AsyncStorage.setItem(k, v),
    getItem: (k) => AsyncStorage.getItem(k),
    removeItem: (k) => AsyncStorage.removeItem(k),
    clear: () => AsyncStorage.clear(),
  };
}

export function rnNativeAead(): NonExportableAead {
  if (!PrivacyAead) throw new Error("Missing native module: PrivacyAead");

  return {
    ensureKey: (alias) => PrivacyAead.ensureKey(alias),
    deleteKey: (alias) => PrivacyAead.deleteKey(alias),

    encrypt: async (alias, plaintext, aad) => {
      const res = await PrivacyAead.encrypt(
        alias,
        Array.from(plaintext),
        aad ? Array.from(aad) : []
      );
      return { nonce: toU8(res.nonce), ciphertext: toU8(res.ciphertext) };
    },

    decrypt: async (alias, nonce, ciphertext, aad) => {
      const res = await PrivacyAead.decrypt(
        alias,
        Array.from(nonce),
        Array.from(ciphertext),
        aad ? Array.from(aad) : []
      );
      return toU8(res.plaintext);
    },
  };
}
