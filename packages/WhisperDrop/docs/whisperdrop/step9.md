# Step 9: Mobile Wallet Adapter (MWA) signing + in-app send

This step adds a real non-custodial **MWA sign+send** flow for Lite claims.

## What changed
- Android now includes Solana Mobile Kotlin libraries:
  - `mobile-wallet-adapter-clientlib-ktx`
  - `web3-solana`
  - `rpc-core` + `rpc-solana` + `rpc-ktordriver`
- Claim → Lite includes **Send In-App (MWA)**:
  - Connects to a wallet (MWA session)
  - Fetches latest blockhash via `SolanaRpcClient`
  - Builds a transaction with:
    - System Program transfer (tiny lamports) to claim sink
    - Memo Program instruction containing the claim memo
  - Requests `signAndSendTransactions`
  - Displays returned signature (base58)

## Notes
- If there is no compatible wallet installed, you'll see a clear error.
- We keep Solana Pay as a fallback, since some wallets support Solana Pay but not MWA (and vice-versa).
