/**
 * AMM/DEX Integration CLI Commands
 * 
 * Commands for interacting with Jupiter, Raydium, and other DEXes
 * using STS wrapper tokens for liquidity.
 * 
 * @module @styxstack/cli/amm
 */

import { Command } from "commander";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import fs from "fs";
import path from "path";

// ============================================================================
// Types
// ============================================================================

interface PoolInfo {
  id: string;
  wrapperMint: string;
  underlyingMint: string;
  liquidity: bigint;
  volume24h: bigint;
  fee: number;
  apy: number;
}

interface SwapQuote {
  inputMint: string;
  outputMint: string;
  inputAmount: bigint;
  outputAmount: bigint;
  priceImpact: number;
  fee: bigint;
  route: string[];
}

// ============================================================================
// Utilities
// ============================================================================

function loadConfig() {
  const configPath = path.join(process.cwd(), "styx.config.json");
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  }
  return {
    rpc: "https://api.devnet.solana.com",
    programId: "FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW",
  };
}

function loadKeypair(pathOrEnv?: string): Keypair {
  const kpPath = pathOrEnv 
    || process.env.SOLANA_KEYPAIR 
    || path.join(process.env.HOME || "", ".config", "solana", "id.json");
  
  if (!fs.existsSync(kpPath)) {
    throw new Error(`Keypair not found: ${kpPath}`);
  }
  
  const secret = JSON.parse(fs.readFileSync(kpPath, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

function formatNumber(n: bigint | number): string {
  const num = typeof n === 'bigint' ? Number(n) : n;
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toFixed(2);
}

function printTable(headers: string[], rows: string[][]) {
  const widths = headers.map((h, i) => 
    Math.max(h.length, ...rows.map(r => (r[i] || "").length))
  );
  
  const sep = widths.map(w => "─".repeat(w + 2)).join("┼");
  console.log("┌" + sep.replace(/┼/g, "┬") + "┐");
  
  console.log("│ " + headers.map((h, i) => h.padEnd(widths[i])).join(" │ ") + " │");
  console.log("├" + sep + "┤");
  
  for (const row of rows) {
    console.log("│ " + row.map((c, i) => (c || "").padEnd(widths[i])).join(" │ ") + " │");
  }
  
  console.log("└" + sep.replace(/┼/g, "┴") + "┘");
}

// ============================================================================
// AMM Commands
// ============================================================================

export function registerAMMCommands(program: Command) {
  const amm = program
    .command("amm")
    .description("DEX/AMM operations - Trade with privacy using wrapper tokens");

  // ─────────────────────────────────────────────────────────────────────────
  // POOLS - List available liquidity pools
  // ─────────────────────────────────────────────────────────────────────────
  amm
    .command("pools")
    .description("List STS wrapper token pools on DEXes")
    .option("--dex <name>", "Filter by DEX (jupiter|raydium|orca)", "all")
    .option("--min-liquidity <amount>", "Minimum liquidity in SOL")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      console.log("\n📊 STS Liquidity Pools\n");
      
      // Mock pool data - in production, fetch from indexer
      const pools: PoolInfo[] = [
        {
          id: "STSw-SOL",
          wrapperMint: "STSw111...abc",
          underlyingMint: "So11111...111",
          liquidity: 1_250_000_000_000n, // 1250 SOL
          volume24h: 450_000_000_000n,
          fee: 30, // 0.3%
          apy: 42.5,
        },
        {
          id: "STSw-USDC",
          wrapperMint: "STSw222...def",
          underlyingMint: "EPjFWdd...USDC",
          liquidity: 2_500_000_000_000n,
          volume24h: 890_000_000_000n,
          fee: 30,
          apy: 38.2,
        },
        {
          id: "STSw-BONK",
          wrapperMint: "STSw333...ghi",
          underlyingMint: "DezXAZ8...BONK",
          liquidity: 180_000_000_000n,
          volume24h: 125_000_000_000n,
          fee: 100, // 1%
          apy: 156.8,
        },
      ];
      
      if (opts.json) {
        console.log(JSON.stringify(pools, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));
        return;
      }
      
      printTable(
        ["Pool", "Liquidity", "24h Volume", "Fee", "APY"],
        pools.map(p => [
          p.id,
          formatNumber(p.liquidity / 1_000_000_000n) + " SOL",
          formatNumber(p.volume24h / 1_000_000_000n) + " SOL",
          (p.fee / 100).toFixed(1) + "%",
          p.apy.toFixed(1) + "%",
        ])
      );
      
      console.log("\n💡 Use 'styx amm swap' to trade, 'styx amm add-liquidity' to provide LP");
    });

  // ─────────────────────────────────────────────────────────────────────────
  // QUOTE - Get swap quote
  // ─────────────────────────────────────────────────────────────────────────
  amm
    .command("quote")
    .description("Get a swap quote (private or public route)")
    .requiredOption("-i, --input <mint>", "Input token mint")
    .requiredOption("-o, --output <mint>", "Output token mint")
    .requiredOption("-a, --amount <amount>", "Amount to swap")
    .option("--private", "Use private route (via wrapper tokens)")
    .option("--slippage <bps>", "Max slippage in basis points", "50")
    .action(async (opts) => {
      console.log("\n💱 Swap Quote\n");
      
      const amount = BigInt(opts.amount);
      const slippage = parseInt(opts.slippage);
      
      // Mock quote - in production, use Jupiter API
      const publicRoute: SwapQuote = {
        inputMint: opts.input,
        outputMint: opts.output,
        inputAmount: amount,
        outputAmount: amount * 98n / 100n, // ~2% loss for example
        priceImpact: 0.12,
        fee: amount / 300n, // 0.33%
        route: ["Raydium", "Orca"],
      };
      
      const privateRoute: SwapQuote = {
        inputMint: opts.input,
        outputMint: opts.output,
        inputAmount: amount,
        outputAmount: amount * 97n / 100n, // Slightly worse due to wrapper overhead
        priceImpact: 0.18,
        fee: amount / 200n, // 0.5% (includes privacy premium)
        route: ["STS Wrap", "Jupiter", "STS Unwrap"],
      };
      
      const quote = opts.private ? privateRoute : publicRoute;
      
      console.log(`   Input:        ${formatNumber(amount)} tokens`);
      console.log(`   Output:       ${formatNumber(quote.outputAmount)} tokens`);
      console.log(`   Price Impact: ${quote.priceImpact.toFixed(2)}%`);
      console.log(`   Fee:          ${formatNumber(quote.fee)} tokens`);
      console.log(`   Route:        ${quote.route.join(" → ")}`);
      console.log(`   Slippage:     ${slippage / 100}% max`);
      
      if (opts.private) {
        console.log("\n   🔒 PRIVATE: Your trade is hidden from block explorers");
        console.log("   - Amount encrypted in STS note");
        console.log("   - Sender/recipient unlinkable");
        console.log("   - No MEV sandwich attacks possible");
      } else {
        console.log("\n   ⚠️  PUBLIC: Trade visible on-chain");
        console.log("   💡 Add --private for anonymity");
      }
      
      console.log("\n   Run 'styx amm swap ...' to execute");
    });

  // ─────────────────────────────────────────────────────────────────────────
  // SWAP - Execute a swap
  // ─────────────────────────────────────────────────────────────────────────
  amm
    .command("swap")
    .description("Execute a swap (uses Jupiter for routing)")
    .requiredOption("-i, --input <mint>", "Input token mint")
    .requiredOption("-o, --output <mint>", "Output token mint")
    .requiredOption("-a, --amount <amount>", "Amount to swap")
    .option("--private", "Use private route via STS wrappers")
    .option("--slippage <bps>", "Max slippage in basis points", "50")
    .option("-k, --keypair <path>", "Path to keypair file")
    .option("--dry-run", "Simulate without sending")
    .action(async (opts) => {
      try {
        console.log("\n🔄 STS Swap\n");
        
        const config = loadConfig();
        const keypair = loadKeypair(opts.keypair);
        const amount = BigInt(opts.amount);
        
        console.log(`   Wallet: ${keypair.publicKey.toBase58().slice(0, 8)}...`);
        console.log(`   Input:  ${opts.input.slice(0, 8)}...`);
        console.log(`   Output: ${opts.output.slice(0, 8)}...`);
        console.log(`   Amount: ${formatNumber(amount)}`);
        
        if (opts.private) {
          console.log("\n   🔒 Private swap route:");
          console.log("   1. Wrap input tokens → STS wrapper");
          console.log("   2. Swap wrappers via Jupiter");
          console.log("   3. Unwrap output → STS private note");
          
          const { STS } = await import("@styxstack/sts-sdk");
          
          // Step 1: Create wrap instruction
          console.log("\n   ⏳ Building wrap transaction...");
          
          // Step 2: Get Jupiter quote for wrapper tokens
          console.log("   ⏳ Getting Jupiter route...");
          
          // Step 3: Create unwrap instruction
          console.log("   ⏳ Building unwrap transaction...");
          
          if (opts.dryRun) {
            console.log("\n   📋 Dry Run - no transactions sent");
            console.log("   Would execute 3 transactions:");
            console.log("   1. Wrap (STS)");
            console.log("   2. Swap (Jupiter)");
            console.log("   3. Unwrap (STS)");
            return;
          }
          
          // In production: send atomic bundle
          console.log("\n   ✅ Private swap complete (mock)");
          console.log("   Your new balance is in a private STS note");
          console.log("   Run 'styx sts balance' to see it");
        } else {
          console.log("\n   📡 Using Jupiter for public swap...");
          
          if (opts.dryRun) {
            console.log("\n   📋 Dry Run - no transaction sent");
            return;
          }
          
          console.log("\n   ✅ Swap complete (mock)");
        }
        
      } catch (err: any) {
        console.error("\n❌ Swap failed:", err.message);
        process.exitCode = 1;
      }
    });

  // ─────────────────────────────────────────────────────────────────────────
  // ADD-LIQUIDITY - Provide liquidity to wrapper pools
  // ─────────────────────────────────────────────────────────────────────────
  amm
    .command("add-liquidity")
    .description("Add liquidity to an STS wrapper pool")
    .requiredOption("--pool <id>", "Pool ID (e.g., STSw-SOL)")
    .requiredOption("-a, --amount <amount>", "Amount to add")
    .option("-k, --keypair <path>", "Path to keypair file")
    .option("--dry-run", "Simulate without sending")
    .action(async (opts) => {
      console.log("\n💧 Add Liquidity\n");
      console.log(`   Pool:   ${opts.pool}`);
      console.log(`   Amount: ${opts.amount}`);
      
      console.log("\n   Flow:");
      console.log("   1. Your tokens are wrapped to STS wrapper tokens");
      console.log("   2. Wrapper tokens deposited to LP pool");
      console.log("   3. You receive LP tokens (tradeable, composable)");
      console.log("   4. Earn fees from swaps in this pool");
      
      if (opts.dryRun) {
        console.log("\n   📋 Dry Run - no transaction sent");
        return;
      }
      
      console.log("\n   ✅ Liquidity added (mock)");
      console.log("   LP tokens received: 1,234.56");
    });

  // ─────────────────────────────────────────────────────────────────────────
  // REMOVE-LIQUIDITY - Withdraw from pools
  // ─────────────────────────────────────────────────────────────────────────
  amm
    .command("remove-liquidity")
    .description("Remove liquidity from an STS wrapper pool")
    .requiredOption("--pool <id>", "Pool ID")
    .requiredOption("-a, --amount <amount>", "LP tokens to burn")
    .option("--unwrap", "Unwrap to private STS notes")
    .option("-k, --keypair <path>", "Path to keypair file")
    .action(async (opts) => {
      console.log("\n🔥 Remove Liquidity\n");
      console.log(`   Pool:     ${opts.pool}`);
      console.log(`   LP Burn:  ${opts.amount}`);
      
      if (opts.unwrap) {
        console.log("\n   Output: Private STS notes (amounts hidden)");
      } else {
        console.log("\n   Output: Public wrapper tokens");
      }
      
      console.log("\n   ✅ Liquidity removed (mock)");
    });

  // ─────────────────────────────────────────────────────────────────────────
  // WRAPPER - Manage wrapper token mints
  // ─────────────────────────────────────────────────────────────────────────
  amm
    .command("wrapper:create")
    .description("Create a new STS wrapper for an SPL token")
    .requiredOption("-m, --mint <pubkey>", "SPL token mint to wrap")
    .option("--fee <bps>", "Wrap/unwrap fee in basis points", "10")
    .option("-k, --keypair <path>", "Path to keypair file")
    .action(async (opts) => {
      console.log("\n🎁 Create Wrapper Token\n");
      console.log(`   Underlying: ${opts.mint}`);
      console.log(`   Fee:        ${opts.fee} bps (${parseInt(opts.fee) / 100}%)`);
      
      console.log("\n   This creates a new Token-22 compliant wrapper mint.");
      console.log("   The wrapper can be traded on any DEX while the");
      console.log("   underlying tokens remain in private STS notes.");
      
      console.log("\n   ✅ Wrapper created (mock)");
      console.log("   Wrapper Mint: STSw_NEW_MINT...");
    });

  amm
    .command("wrapper:info")
    .description("Get info about an STS wrapper token")
    .argument("<wrapper>", "Wrapper mint address")
    .action(async (wrapper) => {
      console.log("\n📋 Wrapper Token Info\n");
      console.log(`   Wrapper Mint:    ${wrapper}`);
      console.log(`   Underlying Mint: So11111...`);
      console.log(`   Total Wrapped:   1,234,567 tokens`);
      console.log(`   Wrap Fee:        10 bps`);
      console.log(`   Unwrap Fee:      10 bps`);
      console.log(`   DEX Pools:       3 (Jupiter, Raydium, Orca)`);
      console.log(`   24h Volume:      456,789 tokens`);
    });

  return amm;
}
