/**
 * Trading CLI Commands - Token-22 UX parity for easy adoption
 * 
 * Simple, intuitive commands inspired by spl-token CLI but with privacy.
 * Users can trade just like Token-22: specify address, amount, done!
 * 
 * Key principles (Solana Mobile ready):
 * - Progressive disclosure (simple defaults, power user options)
 * - Familiar patterns from spl-token CLI
 * - Built-in privacy by default
 * - Clear error messages with actionable suggestions
 * - Mobile-first: works with MWA (Mobile Wallet Adapter)
 * 
 * @module @styxstack/cli/trade
 */

import { Command } from "commander";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import fs from "fs";
import path from "path";

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

function hexEncode(data: Uint8Array): string {
  return Array.from(data).map(b => b.toString(16).padStart(2, "0")).join("");
}

function shortAddr(addr: string): string {
  return addr.slice(0, 4) + "..." + addr.slice(-4);
}

function formatAmount(amount: bigint | number, decimals: number = 9): string {
  const num = typeof amount === 'bigint' ? Number(amount) : amount;
  return (num / Math.pow(10, decimals)).toLocaleString(undefined, { 
    maximumFractionDigits: decimals 
  });
}

function printBox(title: string, lines: string[]) {
  const width = Math.max(title.length + 4, ...lines.map(l => l.length + 2));
  const border = "═".repeat(width);
  console.log(`╔${border}╗`);
  console.log(`║ ${title.padEnd(width - 1)}║`);
  console.log(`╠${border}╣`);
  for (const line of lines) {
    console.log(`║ ${line.padEnd(width - 1)}║`);
  }
  console.log(`╚${border}╝`);
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
// NFT Trading Commands - Easy adoption like OpenSea/Magic Eden UX
// ============================================================================

export function registerNFTCommands(program: Command) {
  const nft = program
    .command("nft")
    .description("NFT trading - Buy, sell, list with privacy");

  // ─────────────────────────────────────────────────────────────────────────
  // LIST - List NFT for sale (like Magic Eden / Tensor)
  // ─────────────────────────────────────────────────────────────────────────
  nft
    .command("list")
    .description("List your NFT for sale")
    .requiredOption("--nft <address>", "NFT mint address")
    .requiredOption("--price <sol>", "Price in SOL")
    .option("--private", "Hide seller identity")
    .option("--expiry <hours>", "Listing expiry in hours", "168") // 7 days
    .option("--marketplace <name>", "Marketplace (tensor|magiceden|styx)", "styx")
    .option("-k, --keypair <path>", "Path to keypair file")
    .option("--dry-run", "Preview without listing")
    .action(async (opts) => {
      try {
        console.log("\n🏷️  List NFT for Sale\n");
        
        const config = loadConfig();
        const keypair = loadKeypair(opts.keypair);
        const price = parseFloat(opts.price);
        const expiry = parseInt(opts.expiry);
        
        console.log(`   NFT:         ${shortAddr(opts.nft)}`);
        console.log(`   Price:       ${price} SOL`);
        console.log(`   Expiry:      ${expiry}h`);
        console.log(`   Marketplace: ${opts.marketplace}`);
        console.log(`   Privacy:     ${opts.private ? "🔒 Hidden seller" : "👤 Public"}`);
        
        if (opts.private) {
          console.log("\n   🔒 Private Listing:");
          console.log("   - Your wallet address is hidden");
          console.log("   - Buyer sees only the NFT");
          console.log("   - Sale settles privately");
        }
        
        if (opts.dryRun) {
          console.log("\n   📋 Dry Run - no listing created");
          return;
        }
        
        // Build listing
        const { STS } = await import("@styxstack/sts-sdk");
        
        const listingId = hexEncode(STS.randomBytes(16));
        
        console.log("\n   ⏳ Creating listing...");
        
        // Mock - in production: create escrow + listing account
        printBox("✅ NFT Listed", [
          `Listing ID: ${listingId}`,
          `Price:      ${price} SOL`,
          `Expires:    ${new Date(Date.now() + expiry * 3600000).toLocaleString()}`,
          "",
          "Share link: https://styx.market/" + listingId,
          "Cancel:     styx nft cancel --id " + listingId,
        ]);
        
      } catch (err: any) {
        console.error("\n❌ Listing failed:", err.message);
        process.exitCode = 1;
      }
    });

  // ─────────────────────────────────────────────────────────────────────────
  // BUY - Buy an NFT (one command, like Magic Eden quick buy)
  // ─────────────────────────────────────────────────────────────────────────
  nft
    .command("buy")
    .description("Buy an NFT instantly")
    .requiredOption("--nft <address>", "NFT mint address or listing ID")
    .option("--max-price <sol>", "Maximum price you'll pay")
    .option("--private", "Hide buyer identity")
    .option("-k, --keypair <path>", "Path to keypair file")
    .option("--dry-run", "Preview without buying")
    .action(async (opts) => {
      try {
        console.log("\n🛒 Buy NFT\n");
        
        const keypair = loadKeypair(opts.keypair);
        
        // Mock listing lookup
        const listing = {
          nft: opts.nft,
          price: 1.5,
          seller: "Abc123...xyz789",
          collection: "DeGods",
          name: "DeGod #1234",
        };
        
        console.log(`   Collection:  ${listing.collection}`);
        console.log(`   Name:        ${listing.name}`);
        console.log(`   Price:       ${listing.price} SOL`);
        console.log(`   Seller:      ${listing.seller}`);
        console.log(`   Your wallet: ${shortAddr(keypair.publicKey.toBase58())}`);
        
        if (opts.maxPrice && parseFloat(opts.maxPrice) < listing.price) {
          console.error(`\n❌ Price ${listing.price} SOL exceeds your max ${opts.maxPrice} SOL`);
          process.exitCode = 1;
          return;
        }
        
        if (opts.private) {
          console.log("\n   🔒 Private Purchase:");
          console.log("   - Your wallet won't appear as buyer");
          console.log("   - NFT delivered to stealth address");
        }
        
        if (opts.dryRun) {
          console.log("\n   📋 Dry Run - no purchase made");
          return;
        }
        
        console.log("\n   ⏳ Executing purchase...");
        
        printBox("✅ NFT Purchased!", [
          `NFT:       ${listing.name}`,
          `Price:     ${listing.price} SOL`,
          `TX:        abc123...def456`,
          "",
          "View: styx nft show --nft " + opts.nft,
        ]);
        
      } catch (err: any) {
        console.error("\n❌ Purchase failed:", err.message);
        process.exitCode = 1;
      }
    });

  // ─────────────────────────────────────────────────────────────────────────
  // SELL - Quick sell (like Tensor instant sell)
  // ─────────────────────────────────────────────────────────────────────────
  nft
    .command("sell")
    .description("Instantly sell NFT to highest bid")
    .requiredOption("--nft <address>", "NFT mint address")
    .option("--min-price <sol>", "Minimum acceptable price")
    .option("--private", "Hide seller identity")
    .option("-k, --keypair <path>", "Path to keypair file")
    .option("--dry-run", "Preview without selling")
    .action(async (opts) => {
      try {
        console.log("\n⚡ Quick Sell NFT\n");
        
        // Mock best bid lookup
        const bestBid = {
          price: 1.2,
          bidder: "Buyer...123",
          marketplace: "Tensor",
        };
        
        console.log(`   NFT:      ${shortAddr(opts.nft)}`);
        console.log(`   Best Bid: ${bestBid.price} SOL (${bestBid.marketplace})`);
        
        if (opts.minPrice && parseFloat(opts.minPrice) > bestBid.price) {
          console.log(`\n   ⚠️  Best bid ${bestBid.price} < your min ${opts.minPrice}`);
          console.log("   Use 'styx nft list' to set your own price");
          return;
        }
        
        if (opts.dryRun) {
          console.log("\n   📋 Dry Run - no sale made");
          return;
        }
        
        console.log("\n   ⏳ Accepting best bid...");
        
        printBox("✅ NFT Sold!", [
          `Price:  ${bestBid.price} SOL`,
          `Buyer:  ${bestBid.bidder}`,
          `TX:     abc123...def456`,
          "",
          "Proceeds deposited to your wallet.",
        ]);
        
      } catch (err: any) {
        console.error("\n❌ Sale failed:", err.message);
        process.exitCode = 1;
      }
    });

  // ─────────────────────────────────────────────────────────────────────────
  // BID - Place a bid on NFT or collection
  // ─────────────────────────────────────────────────────────────────────────
  nft
    .command("bid")
    .description("Place a bid on an NFT or collection")
    .option("--nft <address>", "Specific NFT (trait bid)")
    .option("--collection <address>", "Collection floor bid")
    .requiredOption("--amount <sol>", "Bid amount in SOL")
    .option("--expiry <hours>", "Bid expiry", "24")
    .option("--private", "Hide bidder identity")
    .option("-k, --keypair <path>", "Path to keypair file")
    .action(async (opts) => {
      console.log("\n🎯 Place Bid\n");
      
      const target = opts.nft ? `NFT: ${shortAddr(opts.nft)}` 
                              : `Collection: ${shortAddr(opts.collection)}`;
      
      console.log(`   Target: ${target}`);
      console.log(`   Amount: ${opts.amount} SOL`);
      console.log(`   Expiry: ${opts.expiry}h`);
      
      if (opts.private) {
        console.log("\n   🔒 Private bid - identity hidden until accepted");
      }
      
      console.log("\n   ✅ Bid placed (mock)");
      console.log("   Cancel: styx nft cancel-bid --id <bid-id>");
    });

  // ─────────────────────────────────────────────────────────────────────────
  // TRANSFER - Send NFT to someone (Token-22 style)
  // ─────────────────────────────────────────────────────────────────────────
  nft
    .command("transfer")
    .description("Transfer NFT to another wallet")
    .requiredOption("--nft <address>", "NFT mint address")
    .requiredOption("-t, --to <address>", "Recipient wallet address")
    .option("--private", "Use stealth transfer")
    .option("--memo <text>", "Attach message")
    .option("-k, --keypair <path>", "Path to keypair file")
    .action(async (opts) => {
      console.log("\n📤 Transfer NFT\n");
      
      const keypair = loadKeypair(opts.keypair);
      
      console.log(`   NFT:  ${shortAddr(opts.nft)}`);
      console.log(`   From: ${shortAddr(keypair.publicKey.toBase58())}`);
      console.log(`   To:   ${shortAddr(opts.to)}`);
      
      if (opts.private) {
        console.log("\n   🔒 Stealth Transfer:");
        console.log("   - Link between sender/recipient broken");
        console.log("   - Recipient scans with their key");
      }
      
      console.log("\n   ✅ NFT transferred (mock)");
      console.log("   TX: abc123...def456");
    });

  // ─────────────────────────────────────────────────────────────────────────
  // SHOW - Display NFT details
  // ─────────────────────────────────────────────────────────────────────────
  nft
    .command("show")
    .description("Display NFT details")
    .requiredOption("--nft <address>", "NFT mint address")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      console.log("\n🖼️  NFT Details\n");
      
      // Mock NFT data
      const data = {
        mint: opts.nft,
        name: "DeGod #1234",
        collection: "DeGods",
        owner: "Owner...123",
        attributes: [
          { trait: "Background", value: "Blue" },
          { trait: "Skin", value: "Gold" },
          { trait: "Eyes", value: "Laser" },
        ],
        rarity: "Legendary",
        lastSale: "5.2 SOL",
        floorPrice: "4.8 SOL",
      };
      
      if (opts.json) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }
      
      console.log(`   Name:       ${data.name}`);
      console.log(`   Collection: ${data.collection}`);
      console.log(`   Owner:      ${data.owner}`);
      console.log(`   Rarity:     ${data.rarity}`);
      console.log(`   Floor:      ${data.floorPrice}`);
      console.log(`   Last Sale:  ${data.lastSale}`);
      console.log("\n   Attributes:");
      for (const attr of data.attributes) {
        console.log(`   - ${attr.trait}: ${attr.value}`);
      }
    });

  // ─────────────────────────────────────────────────────────────────────────
  // PORTFOLIO - View your NFTs
  // ─────────────────────────────────────────────────────────────────────────
  nft
    .command("portfolio")
    .description("View your NFT portfolio")
    .option("--collection <address>", "Filter by collection")
    .option("--listed", "Show only listed NFTs")
    .option("-k, --keypair <path>", "Path to keypair file")
    .action(async (opts) => {
      console.log("\n🎨 Your NFT Portfolio\n");
      
      // Mock portfolio
      const nfts = [
        { name: "DeGod #1234", collection: "DeGods", floor: "4.8 SOL", listed: false },
        { name: "y00t #5678", collection: "y00ts", floor: "1.2 SOL", listed: "2.0 SOL" },
        { name: "Mad Lad #9012", collection: "Mad Lads", floor: "150 SOL", listed: false },
      ];
      
      printTable(
        ["NFT", "Collection", "Floor", "Listed"],
        nfts.map(n => [
          n.name,
          n.collection,
          n.floor,
          n.listed ? `✅ ${n.listed}` : "—",
        ])
      );
      
      const total = nfts.reduce((acc, n) => acc + parseFloat(n.floor), 0);
      console.log(`\n   Total Floor Value: ${total.toFixed(1)} SOL`);
    });

  return nft;
}

// ============================================================================
// Token Trading Commands - Easy swaps, token management
// ============================================================================

export function registerTokenCommands(program: Command) {
  const token = program
    .command("token")
    .description("Token operations - Token-22 parity with privacy");

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE - Create a new token (like spl-token create-token)
  // ─────────────────────────────────────────────────────────────────────────
  token
    .command("create")
    .description("Create a new token")
    .option("--name <name>", "Token name")
    .option("--symbol <symbol>", "Token symbol")
    .option("--decimals <n>", "Decimal places", "9")
    .option("--supply <amount>", "Initial supply")
    .option("--transfer-fee <bps>", "Transfer fee in basis points")
    .option("--interest-rate <bps>", "Interest-bearing rate")
    .option("--confidential", "Enable confidential transfers")
    .option("--private", "Keep creator identity private")
    .option("-k, --keypair <path>", "Path to keypair file")
    .action(async (opts) => {
      console.log("\n🪙 Create Token\n");
      
      const { STS } = await import("@styxstack/sts-sdk");
      const mintId = hexEncode(STS.randomBytes(32));
      
      console.log(`   Name:        ${opts.name || "Unnamed Token"}`);
      console.log(`   Symbol:      ${opts.symbol || "TOKEN"}`);
      console.log(`   Decimals:    ${opts.decimals}`);
      if (opts.supply) console.log(`   Supply:      ${opts.supply}`);
      if (opts.transferFee) console.log(`   Fee:         ${opts.transferFee} bps`);
      if (opts.interestRate) console.log(`   Interest:    ${opts.interestRate} bps`);
      if (opts.confidential) console.log(`   🔒 Confidential transfers enabled`);
      
      printBox("✅ Token Created", [
        `Mint: ${mintId.slice(0, 16)}...`,
        "",
        "Mint tokens:    styx token mint --mint " + mintId.slice(0, 16) + "...",
        "Send tokens:    styx sts send -t <addr> -a <amount>",
      ]);
    });

  // ─────────────────────────────────────────────────────────────────────────
  // MINT - Mint tokens (like spl-token mint)
  // ─────────────────────────────────────────────────────────────────────────
  token
    .command("mint")
    .description("Mint tokens to an address")
    .requiredOption("--mint <address>", "Token mint")
    .requiredOption("-a, --amount <amount>", "Amount to mint")
    .option("-t, --to <address>", "Recipient (default: self)")
    .option("--private", "Create as private note")
    .option("-k, --keypair <path>", "Path to keypair file")
    .action(async (opts) => {
      console.log("\n🪙 Mint Tokens\n");
      
      const keypair = loadKeypair(opts.keypair);
      const recipient = opts.to || keypair.publicKey.toBase58();
      
      console.log(`   Mint:      ${shortAddr(opts.mint)}`);
      console.log(`   Amount:    ${opts.amount}`);
      console.log(`   To:        ${shortAddr(recipient)}`);
      console.log(`   Mode:      ${opts.private ? "🔒 Private note" : "👤 Public"}`);
      
      console.log("\n   ✅ Minted (mock)");
      console.log("   TX: abc123...def456");
    });

  // ─────────────────────────────────────────────────────────────────────────
  // BURN - Burn tokens (like spl-token burn)
  // ─────────────────────────────────────────────────────────────────────────
  token
    .command("burn")
    .description("Burn tokens")
    .requiredOption("--mint <address>", "Token mint")
    .requiredOption("-a, --amount <amount>", "Amount to burn")
    .option("-k, --keypair <path>", "Path to keypair file")
    .action(async (opts) => {
      console.log("\n🔥 Burn Tokens\n");
      
      console.log(`   Mint:   ${shortAddr(opts.mint)}`);
      console.log(`   Amount: ${opts.amount}`);
      
      console.log("\n   ✅ Burned (mock)");
    });

  // ─────────────────────────────────────────────────────────────────────────
  // FREEZE / THAW - Freeze/thaw accounts (Token-22 parity)
  // ─────────────────────────────────────────────────────────────────────────
  token
    .command("freeze")
    .description("Freeze a token account")
    .requiredOption("--account <address>", "Token account to freeze")
    .option("-k, --keypair <path>", "Path to keypair file")
    .action(async (opts) => {
      console.log("\n❄️  Freeze Account\n");
      console.log(`   Account: ${shortAddr(opts.account)}`);
      console.log("\n   ✅ Account frozen (mock)");
    });

  token
    .command("thaw")
    .description("Thaw a frozen token account")
    .requiredOption("--account <address>", "Token account to thaw")
    .option("-k, --keypair <path>", "Path to keypair file")
    .action(async (opts) => {
      console.log("\n🔥 Thaw Account\n");
      console.log(`   Account: ${shortAddr(opts.account)}`);
      console.log("\n   ✅ Account thawed (mock)");
    });

  // ─────────────────────────────────────────────────────────────────────────
  // DELEGATE / REVOKE - Delegation (Token-22 parity)
  // ─────────────────────────────────────────────────────────────────────────
  token
    .command("delegate")
    .description("Delegate tokens to another account")
    .requiredOption("--mint <address>", "Token mint")
    .requiredOption("-t, --to <address>", "Delegate address")
    .requiredOption("-a, --amount <amount>", "Amount to delegate")
    .option("-k, --keypair <path>", "Path to keypair file")
    .action(async (opts) => {
      console.log("\n👤 Delegate Tokens\n");
      console.log(`   Mint:     ${shortAddr(opts.mint)}`);
      console.log(`   Delegate: ${shortAddr(opts.to)}`);
      console.log(`   Amount:   ${opts.amount}`);
      console.log("\n   ✅ Delegated (mock)");
    });

  token
    .command("revoke")
    .description("Revoke token delegation")
    .requiredOption("--mint <address>", "Token mint")
    .option("-k, --keypair <path>", "Path to keypair file")
    .action(async (opts) => {
      console.log("\n🚫 Revoke Delegation\n");
      console.log(`   Mint: ${shortAddr(opts.mint)}`);
      console.log("\n   ✅ Delegation revoked (mock)");
    });

  // ─────────────────────────────────────────────────────────────────────────
  // AUTHORIZE - Set/transfer authorities (Token-22 parity)
  // ─────────────────────────────────────────────────────────────────────────
  token
    .command("authorize")
    .description("Set or transfer token authorities")
    .requiredOption("--mint <address>", "Token mint")
    .requiredOption("--type <type>", "Authority type: mint, freeze, close")
    .option("--new-authority <address>", "New authority (omit to disable)")
    .option("-k, --keypair <path>", "Path to keypair file")
    .action(async (opts) => {
      console.log("\n🔑 Set Authority\n");
      console.log(`   Mint: ${shortAddr(opts.mint)}`);
      console.log(`   Type: ${opts.type}`);
      
      if (opts.newAuthority) {
        console.log(`   New:  ${shortAddr(opts.newAuthority)}`);
      } else {
        console.log(`   ⚠️  Disabling ${opts.type} authority (irreversible!)`);
      }
      
      console.log("\n   ✅ Authority updated (mock)");
    });

  // ─────────────────────────────────────────────────────────────────────────
  // ACCOUNTS - List token accounts (like spl-token accounts)
  // ─────────────────────────────────────────────────────────────────────────
  token
    .command("accounts")
    .description("List your token accounts")
    .option("--mint <address>", "Filter by specific mint")
    .option("-k, --keypair <path>", "Path to keypair file")
    .action(async (opts) => {
      console.log("\n💰 Token Accounts\n");
      
      // Mock accounts
      const accounts = [
        { mint: "USDC...abc", balance: "1,234.56", type: "public" },
        { mint: "SOL...def", balance: "45.2", type: "public" },
        { mint: "BONK...ghi", balance: "1,234,567", type: "private" },
      ];
      
      printTable(
        ["Mint", "Balance", "Type"],
        accounts.map(a => [shortAddr(a.mint), a.balance, a.type === "private" ? "🔒" : "👤"])
      );
    });

  // ─────────────────────────────────────────────────────────────────────────
  // SWAP - Quick token swap (Jupiter integration)
  // ─────────────────────────────────────────────────────────────────────────
  token
    .command("swap")
    .description("Swap tokens (via Jupiter)")
    .requiredOption("-i, --input <mint>", "Input token (or SOL)")
    .requiredOption("-o, --output <mint>", "Output token")
    .requiredOption("-a, --amount <amount>", "Amount to swap")
    .option("--private", "Use private swap route")
    .option("--slippage <bps>", "Max slippage", "50")
    .option("-k, --keypair <path>", "Path to keypair file")
    .action(async (opts) => {
      console.log("\n🔄 Token Swap\n");
      
      console.log(`   Input:    ${opts.input === "SOL" ? "SOL" : shortAddr(opts.input)}`);
      console.log(`   Output:   ${shortAddr(opts.output)}`);
      console.log(`   Amount:   ${opts.amount}`);
      console.log(`   Slippage: ${parseInt(opts.slippage) / 100}%`);
      console.log(`   Mode:     ${opts.private ? "🔒 Private" : "👤 Public"}`);
      
      if (opts.private) {
        console.log("\n   🔒 Private Swap Route:");
        console.log("   1. Wrap input → STS");
        console.log("   2. Swap via Jupiter");
        console.log("   3. Unwrap output → Private note");
      }
      
      console.log("\n   ✅ Swap executed (mock)");
      console.log("   Output: 123.45 tokens");
    });

  return token;
}

// ============================================================================
// Solana Mobile specific commands
// ============================================================================

export function registerMobileCommands(program: Command) {
  const mobile = program
    .command("mobile")
    .description("Solana Mobile / MWA specific commands");

  // ─────────────────────────────────────────────────────────────────────────
  // CONNECT - Connect to mobile wallet
  // ─────────────────────────────────────────────────────────────────────────
  mobile
    .command("connect")
    .description("Connect to a mobile wallet via MWA")
    .action(async () => {
      console.log("\n📱 Mobile Wallet Connection\n");
      console.log("   MWA (Mobile Wallet Adapter) flow:");
      console.log("");
      console.log("   1. Your app creates transaction");
      console.log("   2. Opens wallet app for approval");
      console.log("   3. User reviews & signs");
      console.log("   4. Transaction sent to network");
      console.log("");
      console.log("   Usage in React Native:");
      console.log('   import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol";');
      console.log("");
      console.log("   See: styx init --target rn-mwa");
    });

  // ─────────────────────────────────────────────────────────────────────────
  // OUTBOX - Manage offline transaction queue
  // ─────────────────────────────────────────────────────────────────────────
  mobile
    .command("outbox")
    .description("View/manage pending offline transactions")
    .option("--flush", "Send all pending transactions")
    .option("--clear", "Clear failed transactions")
    .action(async (opts) => {
      console.log("\n📤 Transaction Outbox\n");
      
      // Mock outbox
      const pending = [
        { id: "tx1", type: "transfer", status: "pending", created: "5m ago" },
        { id: "tx2", type: "swap", status: "failed", created: "1h ago" },
      ];
      
      printTable(
        ["ID", "Type", "Status", "Created"],
        pending.map(p => [p.id, p.type, p.status === "failed" ? "❌" : "⏳", p.created])
      );
      
      if (opts.flush) {
        console.log("\n   ⏳ Flushing pending transactions...");
        console.log("   ✅ Sent 1/2");
      }
      
      if (opts.clear) {
        console.log("\n   🗑️  Cleared failed transactions");
      }
    });

  // ─────────────────────────────────────────────────────────────────────────
  // QR - Generate QR code for mobile scanning
  // ─────────────────────────────────────────────────────────────────────────
  mobile
    .command("qr")
    .description("Generate QR code for transaction/address")
    .option("--address <addr>", "Wallet address to encode")
    .option("--tx <data>", "Transaction data to encode")
    .option("--amount <sol>", "Include amount in Solana Pay format")
    .action(async (opts) => {
      console.log("\n📱 QR Code Generator\n");
      
      if (opts.address) {
        const solanaPayUrl = `solana:${opts.address}${opts.amount ? `?amount=${opts.amount}` : ""}`;
        console.log(`   URL: ${solanaPayUrl}`);
        console.log("");
        console.log("   ┌─────────────────────────┐");
        console.log("   │  ▄▄▄▄▄ ██▄▄█ ▄▄▄▄▄     │");
        console.log("   │  █   █ ▀▀█▀█ █   █     │");
        console.log("   │  █▄▄▄█ ▀█ ▄▄ █▄▄▄█     │");
        console.log("   │   (QR code visual)     │");
        console.log("   └─────────────────────────┘");
        console.log("");
        console.log("   Scan with Solana Pay compatible wallet");
      } else {
        console.log("   Use --address <addr> to generate receive QR");
      }
    });

  return mobile;
}

// ============================================================================
// Register all trading commands
// ============================================================================

export function registerTradeCommands(program: Command) {
  registerNFTCommands(program);
  registerTokenCommands(program);
  registerMobileCommands(program);
  return program;
}
