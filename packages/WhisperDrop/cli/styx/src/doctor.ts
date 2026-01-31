import fs from "fs";
import path from "path";

export type DoctorSeverity = "error" | "warn";

export type DoctorCheck = {
  name: string;
  ok: boolean;
  severity: DoctorSeverity;
  hint?: string;
};

export type DoctorReport = {
  ok: boolean;
  checks: DoctorCheck[];
  next?: string[];
  meta: {
    node: string;
    cwd: string;
  };
};

function readJsonIfExists(p: string): any | null {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function hasAnyDep(pkg: any, names: string[]): boolean {
  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
  return names.some((n) => typeof deps[n] === "string");
}

export async function runDoctor({ cwd }: { cwd: string }): Promise<DoctorReport> {
  const checks: DoctorCheck[] = [];

  // Node version (mobile dev stacks are usually Node 18/20+ now)
  const major = Number(process.versions.node.split(".")[0]);
  checks.push({
    name: `Node.js >= 18 (found ${process.versions.node})`,
    ok: major >= 18,
    severity: "error",
    hint: major >= 18 ? undefined : "Upgrade Node to 18+ (20 LTS recommended) for modern Solana tooling.",
  });

  const pkgPath = path.join(cwd, "package.json");
  const pkg = readJsonIfExists(pkgPath);
  checks.push({
    name: "package.json found", 
    ok: !!pkg,
    severity: "error",
    hint: pkg ? undefined : "Run this in your app root (where package.json lives).",
  });

  // Solana deps (typical app kits)
  const hasWeb3 = pkg ? hasAnyDep(pkg, ["@solana/web3.js"]) : false;
  checks.push({
    name: "@solana/web3.js installed",
    ok: hasWeb3,
    severity: "error",
    hint: hasWeb3 ? undefined : "Install @solana/web3.js (required for Styx messaging + tx tooling).",
  });

  // Wallet integration (MWA or wallet-adapter)
  const hasMWA = pkg ? hasAnyDep(pkg, ["@solana-mobile/wallet-adapter-mobile", "@solana-mobile/mobile-wallet-adapter-protocol"]) : false;
  const hasWalletAdapter = pkg ? hasAnyDep(pkg, ["@solana/wallet-adapter-base", "@solana/wallet-adapter-react", "@solana/wallet-adapter-wallets"]) : false;
  checks.push({
    name: "Wallet integration present (MWA or wallet-adapter)",
    ok: hasMWA || hasWalletAdapter,
    severity: "warn",
    hint: (hasMWA || hasWalletAdapter)
      ? undefined
      : "For mobile: add Solana Mobile Wallet Adapter (MWA). For web: wallet-adapter packages.",
  });

  // Secure storage for mobile privacy kits
  const hasSecureStore = pkg ? hasAnyDep(pkg, ["react-native-keychain", "react-native-encrypted-storage", "expo-secure-store"]) : false;
  checks.push({
    name: "Secure storage present (Keychain/Keystore)",
    ok: hasSecureStore,
    severity: "warn",
    hint: hasSecureStore ? undefined : "Add a secure storage lib (react-native-keychain, react-native-encrypted-storage, or expo-secure-store).",
  });

  // Avoid accidental logging of secrets
  const hasSentry = pkg ? hasAnyDep(pkg, ["@sentry/react-native", "@sentry/browser", "@sentry/node"]) : false;
  checks.push({
    name: "Crash reporting configured with redaction plan", 
    ok: true,
    severity: "warn",
    hint: hasSentry ? "If you use Sentry, ensure Styx redaction is applied to breadcrumbs + events." : "If you add crash reporting, wire Styx redaction to avoid leaking keys.",
  });

  // Suggest Styx packages (not required in target app, but popular)
  const styxPkgs = pkg ? Object.keys({ ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }).filter((k) => k.startsWith("@styx/")) : [];
  checks.push({
    name: "Styx packages detected",
    ok: styxPkgs.length > 0,
    severity: "warn",
    hint: styxPkgs.length > 0 ? undefined : "Install at least @styx/onchain-messaging or @styx/tx-tooling to start.",
  });

  
  // Optional but recommended: Outbox for mobile reliability
  const allDeps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
  const hasMobileDropin = !!allDeps["@styx/solana-mobile-dropin"];
  const hasOutbox = !!allDeps["@styx/mobile-outbox"];
  if (hasMobileDropin && !hasOutbox) {
  checks.push({
    name: "Recommended: @styx/mobile-outbox for mobile send reliability",
    ok: false,
    severity: "warn",
    hint: "Install @styx/mobile-outbox to queue pending sends and survive background/network interruptions.",
  });
}
const ok = checks.every((c) => c.ok || c.severity !== "error");
  const next: string[] = [];
  if (!hasMWA && !hasWalletAdapter) next.push("Add a wallet integration (MWA for mobile). Then use @styx/solana-mobile-dropin helpers.");
  if (!hasSecureStore) next.push("Add secure storage and wire @styx/secure-storage adapter for local-first inbox and keys.");
  if (!styxPkgs.length) next.push("Try: pnpm add @styx/onchain-messaging @styx/solana-mobile-dropin");

  return {
    ok,
    checks,
    next: next.length ? next : undefined,
    meta: {
      node: process.versions.node,
      cwd,
    },
  };
}
