#!/usr/bin/env node
import { Command } from "commander";
import fs from "fs";
import path from "path";
import { runDoctor } from "./doctor";
import { registerSTSCommands } from "./sts";
import { registerSPSCommands } from "./sps";
import { registerAMMCommands } from "./amm";
import { registerCompareCommands } from "./compare";
import { registerInnovativeCommands } from "./innovate";
import { registerTradeCommands } from "./trade";
import { registerPhantomCommands } from "./phantom";

function snippetFor(target: "rn-mwa" | "kotlin-artemis"): string {
  if (target === "kotlin-artemis") {
    return `// Kotlin (Artemis/Solana Mobile) — drop-in wiring sketch\n\n// 1) Add Styx deps (module-level):\n// implementation(\"com.styx:styx-game:VERSION\") // optional\n// implementation(\"com.styx:styx-envelope:VERSION\")\n\n// 2) Recommended pattern: Outbox-first sending\n// - Build tx (Artemis)\n// - Serialize to bytes\n// - Enqueue to Styx Outbox (encrypted local)\n// - Prompt wallet (MWA) to sign+send\n// - Confirm signatures in background when app resumes\n\n// 3) Inbox scan: use Styx Memo/PMP scanners, then decrypt locally, then reassemble\n// (threading + resend collapse are local-only, post-decrypt)\n`;
  }

  return `// React Native (MWA) — minimal drop-in wiring\n\nimport { createStyxContext } from \"@styx/styx-context\";\nimport { SecureStorageInboxStore } from \"@styx/inbox-store\";\nimport { SecureStorageOutboxStore } from \"@styx/mobile-outbox\";\nimport { mwaDrainOutbox, confirmOutboxSent } from \"@styx/solana-mobile-dropin\";\n\nexport function createStyx(connection, ownerPubkeyBase58) {\n  const inbox = new SecureStorageInboxStore();\n  const outbox = new SecureStorageOutboxStore();\n\n  const ctx = createStyxContext({\n    connection,\n    owner: ownerPubkeyBase58,\n    inboxStore: inbox,\n    outboxStore: outbox,\n    preferRail: \"auto\",\n    priority: \"normal\",\n  });\n\n  async function onResumeOrConnectivity(sender) {\n    // 1) Retry pending sends\n    await mwaDrainOutbox({ sender, connection, outbox });\n    // 2) Confirm what was sent\n    await confirmOutboxSent({ connection, outbox });\n  }\n\n  return { ctx, inbox, outbox, onResumeOrConnectivity };\n}\n`;
}

function resolveTemplateDir(feature: string): string {
  return path.resolve(process.cwd(), "templates", "ts", feature);
}

function copyDir(srcDir: string, dstDir: string) {
  if (!fs.existsSync(srcDir)) throw new Error(`template not found: ${srcDir}`);
  fs.mkdirSync(dstDir, { recursive: true });

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dst = path.join(dstDir, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

const program = new Command();
program.name("styx").description("Styx Token Standard (STS) CLI - Private tokens with Token-22 parity").version("0.6.0");

program
  program
  .command("init")
  .description("Initialize Styx wiring (tooling-only). Writes a drop-in scaffold.")
  .option("-o, --out <dir>", "output directory", "./styx")
  .option("--target <target>", "auto | rn-mwa | kotlin-artemis", "auto")
  .option("--snippet", "print copy/paste wiring snippet only", false)
  .option("--install", "attempt to write key snippet file into detected project structure", false)
  .option("--dry-run", "print actions without writing files", false)
  .action((opts) => {
    const projectRoot = process.cwd();
    const outDir = path.resolve(projectRoot, opts.out);

    const pkgPath = path.join(projectRoot, "package.json");
    const hasPkg = fs.existsSync(pkgPath);
    const pkg = hasPkg ? JSON.parse(fs.readFileSync(pkgPath, "utf8")) : {};
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

    const hasRN = Boolean(deps["react-native"] || deps["expo"]);
    const hasMWA = Boolean(deps["@solana/wallet-adapter-mobile"] || deps["@solana-mobile/wallet-adapter-mobile"]);
    const hasAndroidFolder = fs.existsSync(path.join(projectRoot, "android"));

    let target: "rn-mwa" | "kotlin-artemis";
    if (opts.target === "rn-mwa" || opts.target === "kotlin-artemis") {
      target = opts.target;
    } else {
      // auto
      target = (hasRN || hasMWA) ? "rn-mwa" : (hasAndroidFolder ? "kotlin-artemis" : "rn-mwa");
    }

    const src = path.resolve(projectRoot, "templates", "init", target);

    if (opts.snippet) {
      console.log(snippetFor(target));
      return;
    }

    const actions: string[] = [];
    actions.push(`Template: ${target} -> ${outDir}`);

    const configPath = path.join(outDir, "styx.config.json");
    const config = {
      version: 1,
      preferRail: "auto",
      priority: "normal",
      memoMaxChars: 900,
      outbox: { enabled: true },
      inbox: { enabled: true, persistPlaintext: false },
    };

    if (opts.dryRun) {
      console.log("🧪 dry-run");
      console.log(actions.join("\n"));
      console.log(`Would write: ${configPath}`);
      console.log(JSON.stringify(config, null, 2));
      console.log("Next: `styx doctor`");
      return;
    }

    try {
      // Copy scaffold
      copyDir(src, outDir);

      // Optionally install a snippet into the host project (DX)
      if (opts.install && target === "rn-mwa") {
        const candidateDirs = ["src", "app", "lib", "utils"].map((d) => path.join(projectRoot, d));
        const destBase = candidateDirs.find((d) => fs.existsSync(d)) ?? projectRoot;
        const dest = path.join(destBase, "styx.setup.ts");
        if (!fs.existsSync(dest)) {
          fs.writeFileSync(dest, snippetFor("rn-mwa"), "utf8");
          console.log("✅ Installed snippet:", dest);
        } else {
          console.log("ℹ️  Snippet already exists, not overwriting:", dest);
        }
      }

      // Write config (don't overwrite)
      if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
        console.log("✅ Wrote:", configPath);
      } else {
        console.log("ℹ️  Config exists, not overwriting:", configPath);
      }

      console.log("✅ Styx initialized (tooling-only).");
      console.log("Next:");
      console.log("  - Run: `styx doctor`");
      console.log("  - Add templates: `styx add messaging` (optional) or wire `@styx/styx-context` using styx.setup.ts");
      console.log("  - On mobile: call the outbox worker on resume/connectivity regained");
    } catch (e: any) {
      console.error("Init failed:", e?.message ?? e);
      console.log("You can manually copy from templates/init/.");
      process.exitCode = 1;
    }
  });

program
  .command("add")
  .argument("<feature>", "messaging | private-tx | per")
  .option("-o, --out <dir>", "output directory", "./styx")
  .description("Copy a golden-path template into your project")
  .action((feature, opts) => {
    const src = resolveTemplateDir(feature);
    const dst = path.resolve(process.cwd(), opts.out, feature);
    try {
      copyDir(src, dst);
      console.log("✅ Wrote template to:", dst);
    } catch (e: any) {
      console.error("Template copy failed:", e?.message ?? e);
      console.log("You can manually copy from templates/ts/.");
    }
  });

program
  .command("tx:pad-plan")
  .argument("<level>", "off | low | medium")
  .description("Print a default transaction padding plan (non-cryptographic obfuscation)")
  .action(async (level) => {
    const { getDefaultPaddingPlan } = await import("@styx/tx-tooling");
    const plan = getDefaultPaddingPlan(level as any);
    console.log(JSON.stringify(plan, null, 2));
  });

program
  .command("tx:explain")
  .argument("<error>", "raw error message (paste from logs)")
  .description("Explain a transaction error with stable Styx codes")
  .action(async (error) => {
    const { explainTxError } = await import("@styx/tx-tooling");
    const ex = explainTxError(new Error(String(error)));
    console.log(JSON.stringify(ex, null, 2));
  });

program
  .command("envelope:decode")
  .argument("<memo>", "memo string (expects styx1:... or raw base64url bytes)")
  .description("Decode a Styx Envelope v1 memo")
  .action(async (memo) => {
    const { fromMemoString, decodeStyxEnvelope, styxEnvelopeToJson } = await import("@styx/memo");
    const bytes = fromMemoString(memo);
    if (!bytes) {
      console.error("Not a Styx envelope memo.");
      process.exitCode = 1;
      return;
    }
    try {
      const env = decodeStyxEnvelope(bytes);
      console.log(styxEnvelopeToJson(env));
    } catch (e: any) {
      console.error("Failed to decode envelope:", e.message);
      process.exitCode = 1;
    }
  });

program
  .command("reveal:prepare")
  .requiredOption("--msg <b64url>", "message id (b64url)")
  .requiredOption("--type <type>", "recipient|contentKey|app")
  .requiredOption("--data <b64url>", "reveal payload bytes (b64url)")
  .description("Prepare a reveal envelope for wallet signing (mobile-safe flow)")
  .action(async (opts) => {
    const { prepareRevealEnvelope } = await import("@styx/onchain-messaging");
    const { b64UrlToBytes, bytesToB64Url } = await import("@styx/crypto-core");

    const res = prepareRevealEnvelope({
      msgId: b64UrlToBytes(opts.msg),
      revealType: opts.type,
      data: b64UrlToBytes(opts.data),
    } as any);

    console.log(JSON.stringify({
      bytesToSign: bytesToB64Url(res.envelopeBytesToSign),
      memoString: res.memoString,
    }, null, 2));
  });

program
  .command("doctor")
  .description("Run environment + dependency checks for mobile-ready Styx integration")
  .option("--json", "print results as JSON")
  .action(async (opts) => {
    const res = await runDoctor({ cwd: process.cwd() });
    if (opts.json) {
      console.log(JSON.stringify(res, null, 2));
      process.exitCode = res.ok ? 0 : 1;
      return;
    }

    // Pretty output (kit-style)
    console.log(res.ok ? "✅ Styx Doctor: OK" : "⚠️  Styx Doctor: issues found");
    for (const c of res.checks) {
      const icon = c.ok ? "✅" : (c.severity === "warn" ? "⚠️" : "❌");
      console.log(`${icon} ${c.name}`);
      if (!c.ok && c.hint) console.log(`   ↳ ${c.hint}`);
    }
    if (res.next && res.next.length) {
      console.log("\nNext:");
      for (const n of res.next) console.log(`  • ${n}`);
    }
    process.exitCode = res.ok ? 0 : 1;
  });

// Register STS (Styx Token Standard) commands - legacy
registerSTSCommands(program);

// Register SPS (Styx Privacy Standard) v3.0 commands - new
registerSPSCommands(program);

// Register AMM/DEX commands
registerAMMCommands(program);

// Register comparison commands
registerCompareCommands(program);

// Register innovative features (stealth, streaming, recovery, governance, ALT, meme)
registerInnovativeCommands(program);

// Register trading commands (NFT, tokens, mobile)
registerTradeCommands(program);

// Register ANONFT commands (ANS-1 Privacy Standard)
registerPhantomCommands(program);

// Console command
program
  .command("console")
  .description("Launch the visual Styx Console (web-based UI)")
  .option("-p, --port <port>", "Port to run on", "3847")
  .action(async (opts) => {
    console.log("\\n⚡ Launching Styx Console...\\n");
    console.log("Run: cd cli/styx-console && pnpm start");
    console.log(`Or:  npx tsx cli/styx-console/src/server.ts`);
    console.log(`\\nOpen: http://localhost:${opts.port}\\n`);
  });

program.parse(process.argv);
