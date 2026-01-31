# Styx Rails

Styx uses a *rails* model: one API, multiple privacy backends.

## Capabilities probe

```ts
import { railCapabilities } from "@styx/tx-tooling";
const caps = await railCapabilities({ connection, ctx: { network: "devnet", mobile: true, ctAvailable: false }});
```

## Runtime selection

```ts
import { createMessagingRailAdapters, buildWithRailSelection } from "@styx/tx-tooling";

const adapters = createMessagingRailAdapters();
const result = await buildWithRailSelection({
  adapters,
  ctx: { network: "devnet", mobile: true, ctAvailable: false },
  preferred: ["private-memo-program", "encrypted-memo"],
  buildArgs: { connection, senderWallet, recipientWallet, plaintext, tag }
});
```
