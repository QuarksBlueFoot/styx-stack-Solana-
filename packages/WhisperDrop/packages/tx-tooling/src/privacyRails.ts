export type PrivacyRail =
  | "public"
  | "encrypted-memo"
  | "private-memo-program"
  | "confidential-tokens"
  | "ephemeral-rollup";

export interface PrivacyRailContext {
  network: "mainnet" | "devnet" | "testnet" | "localnet";
  mobile: boolean;
  ctAvailable: boolean;
}

export interface PrivacyRailAdapter {
  rail: PrivacyRail;
  isAvailable(ctx: PrivacyRailContext): boolean;
  build(...args: any[]): Promise<any>;
}

export function selectRail(adapters: PrivacyRailAdapter[], ctx: PrivacyRailContext, preferred: PrivacyRail[]) {
  for (const p of preferred) {
    const a = adapters.find(x => x.rail === p && x.isAvailable(ctx));
    if (a) return a;
  }
  throw new Error("No available privacy rail");
}
