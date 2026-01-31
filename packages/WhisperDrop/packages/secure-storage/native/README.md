# PrivacyAead native modules

This repo expects a React Native native module named `PrivacyAead` implementing:

- ensureKey(alias): Promise<boolean>
- deleteKey(alias): Promise<boolean>
- encrypt(alias, plaintextBytes[], aadBytes[]): Promise<{ nonce:number[], ciphertext:number[] }>
- decrypt(alias, nonceBytes[], ciphertextBytes[], aadBytes[]): Promise<{ plaintext:number[] }>

Reference Android/iOS implementations are included in the Step 09 zip.
