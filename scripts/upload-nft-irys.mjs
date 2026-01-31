#!/usr/bin/env node
/**
 * SPS NFT Upload Script - Irys (Arweave)
 * Uploads image and metadata for "Coach Bluefoot" NFT
 */

import Irys from "@irys/sdk";
import fs from "fs";
import path from "path";

const WALLET_PATH = "/home/codespace/.config/solana/styxdeploy.json";
const IMAGE_PATH = "/workspaces/StyxStack/programs/styx-private-memo-program/target/bluefoot sardine hat.png";

// NFT Metadata
const NFT_NAME = "Coach Bluefoot";
const NFT_DESCRIPTION = "The legendary Coach Bluefoot - a sardine-hat-wearing wisdom keeper of the Styx Privacy Standard ecosystem.";
const NFT_SYMBOL = "COACH";
const NFT_COLLECTION = "SPS Genesis";

async function main() {
  console.log("=== SPS NFT Upload via Irys ===\n");

  // Load wallet
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH, "utf-8"));
  console.log("Wallet loaded");

  // Check image
  const imageStats = fs.statSync(IMAGE_PATH);
  console.log(`Image size: ${(imageStats.size / 1024).toFixed(1)} KB`);

  // Initialize Irys
  const irys = new Irys({
    network: "mainnet",
    token: "solana",
    key: wallet,
    config: { providerUrl: "https://api.mainnet-beta.solana.com" }
  });

  // Check price
  const imageSize = imageStats.size;
  const metadataSize = 2000; // ~2KB for metadata JSON
  const totalSize = imageSize + metadataSize;
  
  const price = await irys.getPrice(totalSize);
  console.log(`\nEstimated cost: ${irys.utils.fromAtomic(price)} SOL`);

  // Check balance
  const balance = await irys.getLoadedBalance();
  console.log(`Irys balance: ${irys.utils.fromAtomic(balance)} SOL`);

  if (balance.lt(price)) {
    const fundAmount = price.multipliedBy(1.2); // 20% buffer
    console.log(`\nFunding Irys with ${irys.utils.fromAtomic(fundAmount)} SOL...`);
    
    try {
      const fundTx = await irys.fund(fundAmount);
      console.log(`Funded! TX: ${fundTx.id}`);
    } catch (e) {
      console.error("Funding failed:", e.message);
      console.log("\nTo fund manually, run:");
      console.log(`  irys fund ${fundAmount.toString()} -n mainnet -t solana -w ${WALLET_PATH}`);
      return;
    }
  }

  // Upload image
  console.log("\nUploading image...");
  const imageTags = [
    { name: "Content-Type", value: "image/png" },
    { name: "App-Name", value: "SPS-NFT" },
    { name: "NFT-Name", value: NFT_NAME },
  ];

  const imageReceipt = await irys.uploadFile(IMAGE_PATH, { tags: imageTags });
  const imageUrl = `https://arweave.net/${imageReceipt.id}`;
  console.log(`Image uploaded: ${imageUrl}`);

  // Create metadata
  const metadata = {
    name: NFT_NAME,
    symbol: NFT_SYMBOL,
    description: NFT_DESCRIPTION,
    image: imageUrl,
    external_url: "https://styx.nexus",
    attributes: [
      { trait_type: "Collection", value: NFT_COLLECTION },
      { trait_type: "Standard", value: "SPS (Styx Privacy Standard)" },
      { trait_type: "Rarity", value: "Genesis" },
      { trait_type: "Hat Type", value: "Sardine" },
    ],
    properties: {
      category: "image",
      files: [{ uri: imageUrl, type: "image/png" }],
      creators: [{ address: "styXHdP5wqJRWZqzo4WmGyCZxk9r6mvH3Rdj5mUHCk4", share: 100 }],
    },
    collection: {
      name: NFT_COLLECTION,
      family: "SPS Genesis",
    },
  };

  // Upload metadata
  console.log("\nUploading metadata...");
  const metadataTags = [
    { name: "Content-Type", value: "application/json" },
    { name: "App-Name", value: "SPS-NFT" },
    { name: "NFT-Name", value: NFT_NAME },
  ];

  const metadataReceipt = await irys.upload(JSON.stringify(metadata, null, 2), { tags: metadataTags });
  const metadataUrl = `https://arweave.net/${metadataReceipt.id}`;
  console.log(`Metadata uploaded: ${metadataUrl}`);

  // Summary
  console.log("\n=== UPLOAD COMPLETE ===");
  console.log(`NFT Name: ${NFT_NAME}`);
  console.log(`Image URI: ${imageUrl}`);
  console.log(`Metadata URI: ${metadataUrl}`);
  console.log(`\nUse this metadata URI to mint the NFT on SPS!`);
  
  // Save result
  const result = {
    name: NFT_NAME,
    symbol: NFT_SYMBOL,
    imageUri: imageUrl,
    metadataUri: metadataUrl,
    imageArweaveId: imageReceipt.id,
    metadataArweaveId: metadataReceipt.id,
    uploadedAt: new Date().toISOString(),
  };
  
  fs.writeFileSync(
    "/workspaces/StyxStack/scripts/coach-bluefoot-nft.json",
    JSON.stringify(result, null, 2)
  );
  console.log(`\nSaved to: scripts/coach-bluefoot-nft.json`);
}

main().catch(console.error);
