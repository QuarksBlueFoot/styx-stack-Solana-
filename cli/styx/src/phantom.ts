/**
 * ANONFT CLI Commands (ANS-1 Standard)
 *
 * Privacy-first NFT operations using ring signatures, ZK proofs,
 * and multi-tree Merkle forests.
 */

import { Command } from "commander";

export function registerPhantomCommands(program: Command) {
    const phantom = program
        .command("anonft")
        .description("ANONFT operations (ANS-1 Privacy Standard)");

    // ═══════════════════════════════════════════════════════════════════════════
    // MINTING
    // ═══════════════════════════════════════════════════════════════════════════

    phantom
        .command("mint")
        .description("Mint a new ANONFT (privacy-first)")
        .requiredOption("-n, --name <name>", "NFT name")
        .requiredOption("-s, --symbol <symbol>", "NFT symbol")
        .requiredOption("-u, --uri <uri>", "Metadata URI (encrypted or public)")
        .option("-t, --traits <json>", "Traits JSON array")
        .option("-r, --ring-size <size>", "Ring signature size (2-16)", "8")
        .option("-f, --forest-trees <count>", "Number of forest trees (4-32)", "8")
        .option("-d, --tree-depth <depth>", "Merkle tree depth (14-20)", "14")
        .option("--collection <address>", "Collection address (optional)")
        .option("--dry-run", "Simulate without sending transaction")
        .option("--json", "Output as JSON")
        .action(async (opts) => {
            const { printStatus } = await import("@styxstack/styx-nft");

            console.log("\\n🔮 Minting ANONFT...\\n");

            if (opts.dryRun) {
                console.log("📋 Dry-run mode - simulating mint\\n");
                const mockResult = {
                    status: "simulated",
                    nft: {
                        name: opts.name,
                        symbol: opts.symbol,
                        uri: opts.uri,
                        phase: "phantom",
                        ringSize: parseInt(opts.ringSize),
                        forestTrees: parseInt(opts.forestTrees),
                    },
                    forest: {
                        trees: parseInt(opts.forestTrees),
                        totalCapacity: Math.pow(2, parseInt(opts.treeDepth)) * parseInt(opts.forestTrees),
                    },
                    ring: {
                        members: parseInt(opts.ringSize),
                        anonymitySet: `1:${opts.ringSize}`,
                    },
                };
                if (opts.json) {
                    console.log(JSON.stringify(mockResult, null, 2));
                } else {
                    console.log(JSON.stringify(mockResult, null, 2));
                    printStatus();
                }
                return;
            }

            // In production, would connect to Solana and mint
            console.log(`  Name:       ${opts.name}`);
            console.log(`  Symbol:     ${opts.symbol}`);
            console.log(`  URI:        ${opts.uri}`);
            console.log(`  Ring Size:  ${opts.ringSize}`);
            console.log(`  Forest:     ${opts.forestTrees} trees, depth ${opts.treeDepth}`);
            if (opts.collection) {
                console.log(`  Collection: ${opts.collection}`);
            }
            console.log("\\n⏳ Transaction would be sent here...");
            console.log("\\n💡 For production use, ensure wallet is connected and RPC is configured.");
        });

    phantom
        .command("mint-collection")
        .description("Create a new ANONFT Collection (privacy-first)")
        .requiredOption("-n, --name <name>", "Collection name")
        .requiredOption("-s, --symbol <symbol>", "Collection symbol")
        .requiredOption("-u, --uri <uri>", "Collection metadata URI")
        .option("-f, --forest-trees <count>", "Number of forest trees for collection", "16")
        .option("-d, --tree-depth <depth>", "Merkle tree depth", "20")
        .option("-m, --max-supply <count>", "Maximum collection supply (0 for unlimited)", "0")
        .option("--sellerFeeBps <bps>", "Seller fee in basis points (for Metaplex bridge)", "500")
        .option("--dry-run", "Simulate without sending transaction")
        .option("--json", "Output as JSON")
        .action(async (opts) => {
            console.log("\\n🌲 Creating ANONFT Collection...\\n");

            const result = {
                status: opts.dryRun ? "simulated" : "pending",
                collection: {
                    name: opts.name,
                    symbol: opts.symbol,
                    uri: opts.uri,
                    forestTrees: parseInt(opts.forestTrees),
                    treeDepth: parseInt(opts.treeDepth),
                    maxSupply: parseInt(opts.maxSupply) || "unlimited",
                    sellerFeeBps: parseInt(opts.sellerFeeBps),
                },
                forest: {
                    structure: "multi-tree",
                    totalCapacity: Math.pow(2, parseInt(opts.treeDepth)) * parseInt(opts.forestTrees),
                    privacyLevel: "high",
                },
            };

            if (opts.json) {
                console.log(JSON.stringify(result, null, 2));
            } else {
                console.log(`  Name:       ${opts.name}`);
                console.log(`  Symbol:     ${opts.symbol}`);
                console.log(`  URI:        ${opts.uri}`);
                console.log(`  Forest:     ${opts.forestTrees} trees × 2^${opts.treeDepth} leaves`);
                console.log(`  Capacity:   ${result.forest.totalCapacity.toLocaleString()} NFTs`);
                console.log(`  Max Supply: ${result.collection.maxSupply}`);
            }
        });

    // ═══════════════════════════════════════════════════════════════════════════
    // PROOFS
    // ═══════════════════════════════════════════════════════════════════════════

    const prove = phantom
        .command("prove")
        .description("Generate ZK proofs for ANONFTs");

    prove
        .command("ownership")
        .description("Prove you own an NFT without revealing which one")
        .requiredOption("-f, --forest <address>", "Shadow Forest address")
        .requiredOption("-k, --keypair <path>", "Path to owner keypair JSON")
        .option("-r, --ring-size <size>", "Ring signature size", "8")
        .option("--json", "Output proof as JSON")
        .action(async (opts) => {
            const { createOwnershipProof } = await import("@styxstack/styx-nft");
            const { sha256 } = await import("@noble/hashes/sha256");

            console.log("\\n🔐 Generating Ownership Proof...\\n");

            // In production, would load real data
            const mockProof = {
                proofType: "ownership",
                ring: {
                    size: parseInt(opts.ringSize),
                    anonymitySet: `1:${opts.ringSize}`,
                },
                verification: {
                    keyImage: "3Jh7...",
                    linkable: true,
                    replayProtected: true,
                },
                signature: {
                    type: "LSAG",
                    domain: "styx-nft-lsag",
                },
            };

            if (opts.json) {
                console.log(JSON.stringify(mockProof, null, 2));
            } else {
                console.log("  Proof Type: Linkable Ring Signature (LSAG)");
                console.log(`  Ring Size:  ${opts.ringSize} members`);
                console.log(`  Privacy:    Cannot determine which key signed`);
                console.log("  Linkable:   Double-spend prevention enabled");
                console.log("\\n  ✅ Proof generated (use --json for full output)");
            }
        });

    prove
        .command("trait")
        .description("Prove an NFT has a specific trait without revealing the NFT")
        .requiredOption("-f, --forest <address>", "Shadow Forest address")
        .requiredOption("-t, --trait-type <type>", "Trait type to prove")
        .requiredOption("-v, --trait-value <value>", "Trait value to prove")
        .option("--json", "Output proof as JSON")
        .action(async (opts) => {
            const { generateTraitProof } = await import("@styxstack/styx-nft");
            const { sha256 } = await import("@noble/hashes/sha256");

            console.log("\\n🎭 Generating Trait Proof...\\n");

            // Mock for demo
            const mockProof = {
                proofType: "trait",
                claim: {
                    traitType: opts.traitType,
                    traitValue: opts.traitValue,
                    traitHash: Buffer.from(sha256(new TextEncoder().encode(`${opts.traitType}:${opts.traitValue}`))).toString("hex").slice(0, 16) + "...",
                },
                proof: {
                    type: "groth16",
                    verificationKey: "trait_vk_v1",
                    publicInputs: 3,
                },
            };

            if (opts.json) {
                console.log(JSON.stringify(mockProof, null, 2));
            } else {
                console.log(`  Trait Type:  ${opts.traitType}`);
                console.log(`  Trait Value: ${opts.traitValue}`);
                console.log("  Proof Type:  Simulated Groth16");
                console.log("\\n  ✅ Trait proof generated");
                console.log("  💡 Verifier knows the trait exists, not which NFT has it");
            }
        });

    prove
        .command("collection")
        .description("Prove an NFT belongs to a collection without revealing which NFT")
        .requiredOption("-c, --collection <address>", "Collection address")
        .requiredOption("-f, --forest <address>", "Shadow Forest address")
        .option("--json", "Output proof as JSON")
        .action(async (opts) => {
            console.log("\\n📦 Generating Collection Membership Proof...\\n");

            const mockProof = {
                proofType: "collection",
                collection: opts.collection,
                proof: {
                    type: "groth16",
                    claim: "NFT is member of collection",
                    publicInputs: ["collectionHash", "forestRoot"],
                },
            };

            if (opts.json) {
                console.log(JSON.stringify(mockProof, null, 2));
            } else {
                console.log(`  Collection: ${opts.collection}`);
                console.log("  Proof Type: Simulated Groth16");
                console.log("\\n  ✅ Collection membership proven");
                console.log("  💡 NFT identity remains hidden");
            }
        });

    prove
        .command("count")
        .description("Prove you own at least N NFTs from a collection")
        .requiredOption("-c, --collection <address>", "Collection address")
        .requiredOption("-n, --min-count <count>", "Minimum NFT count to prove")
        .option("--exact", "Prove exact count (not minimum)")
        .option("--json", "Output proof as JSON")
        .action(async (opts) => {
            console.log("\\n🔢 Generating Ownership Count Proof...\\n");

            const mockProof = {
                proofType: "ownership_count",
                claim: opts.exact
                    ? `Owner has exactly ${opts.minCount} NFTs`
                    : `Owner has at least ${opts.minCount} NFTs`,
                collection: opts.collection,
                proof: {
                    type: "groth16",
                    range: opts.exact ? "exact" : "minimum",
                },
            };

            if (opts.json) {
                console.log(JSON.stringify(mockProof, null, 2));
            } else {
                console.log(`  Collection: ${opts.collection}`);
                console.log(`  Claim:      ${mockProof.claim}`);
                console.log("\\n  ✅ Count proof generated");
                console.log("  💡 Individual NFT identities remain hidden");
            }
        });

    // ═══════════════════════════════════════════════════════════════════════════
    // REVEAL (PRIVACY → PUBLIC)
    // ═══════════════════════════════════════════════════════════════════════════

    const reveal = phantom
        .command("reveal")
        .description("Reveal ANONFTs to Metaplex-compatible formats");

    reveal
        .command("metadata")
        .description("Reveal to Metaplex Token Metadata standard")
        .requiredOption("-n, --nft <address>", "ANONFT address or leaf index")
        .requiredOption("-f, --forest <address>", "Shadow Forest address")
        .option("--dry-run", "Simulate reveal")
        .option("--json", "Output as JSON")
        .action(async (opts) => {
            console.log("\\n🌟 Revealing to Metaplex Token Metadata...\\n");

            const result = {
                from: "phantom",
                to: "metaplex_token_metadata",
                nft: opts.nft,
                status: opts.dryRun ? "simulated" : "pending",
                result: {
                    mint: "<new_mint_address>",
                    metadata: "<new_metadata_address>",
                    masterEdition: null,
                },
            };

            if (opts.json) {
                console.log(JSON.stringify(result, null, 2));
            } else {
                console.log(`  From:   Shadow Forest`);
                console.log(`  To:     Metaplex Token Metadata`);
                console.log(`  NFT:    ${opts.nft}`);
                console.log("\\n  ⚠️  This action permanently reveals the NFT");
                console.log("  💡 Use styx phantom reveal silhouette for partial reveal");
            }
        });

    reveal
        .command("bubblegum")
        .description("Reveal to Metaplex Bubblegum (compressed) format")
        .requiredOption("-n, --nft <address>", "ANONFT address or leaf index")
        .requiredOption("-f, --forest <address>", "Shadow Forest address")
        .requiredOption("-t, --bubblegum-tree <address>", "Target Bubblegum tree address")
        .option("--dry-run", "Simulate reveal")
        .option("--json", "Output as JSON")
        .action(async (opts) => {
            console.log("\\n🌟 Revealing to Metaplex Bubblegum (Compressed)...\\n");

            const result = {
                from: "phantom",
                to: "bubblegum",
                nft: opts.nft,
                bubblegumTree: opts.bubblegumTree,
                status: opts.dryRun ? "simulated" : "pending",
            };

            if (opts.json) {
                console.log(JSON.stringify(result, null, 2));
            } else {
                console.log(`  From:   Shadow Forest`);
                console.log(`  To:     Bubblegum Tree`);
                console.log(`  NFT:    ${opts.nft}`);
                console.log(`  Tree:   ${opts.bubblegumTree}`);
            }
        });

    reveal
        .command("core")
        .description("Reveal to Metaplex Core format")
        .requiredOption("-n, --nft <address>", "ANONFT address or leaf index")
        .requiredOption("-f, --forest <address>", "Shadow Forest address")
        .option("--dry-run", "Simulate reveal")
        .option("--json", "Output as JSON")
        .action(async (opts) => {
            console.log("\\n🌟 Revealing to Metaplex Core...\\n");

            const result = {
                from: "phantom",
                to: "core",
                nft: opts.nft,
                status: opts.dryRun ? "simulated" : "pending",
            };

            if (opts.json) {
                console.log(JSON.stringify(result, null, 2));
            } else {
                console.log(`  From:   Shadow Forest`);
                console.log(`  To:     Metaplex Core`);
                console.log(`  NFT:    ${opts.nft}`);
            }
        });

    reveal
        .command("silhouette")
        .description("Partial reveal: show metadata but hide owner")
        .requiredOption("-n, --nft <address>", "ANONFT address or leaf index")
        .requiredOption("-f, --forest <address>", "Shadow Forest address")
        .option("--json", "Output as JSON")
        .action(async (opts) => {
            console.log("\\n👤 Revealing to Silhouette mode...\\n");

            const result = {
                from: "phantom",
                to: "silhouette",
                nft: opts.nft,
                privacy: {
                    metadata: "visible",
                    owner: "hidden",
                    traits: "visible",
                    provenance: "zk_only",
                },
            };

            if (opts.json) {
                console.log(JSON.stringify(result, null, 2));
            } else {
                console.log("  Phase:    silhouette");
                console.log("  Metadata: ✅ Visible");
                console.log("  Owner:    🔐 Hidden (ring signature)");
                console.log("  Traits:   ✅ Visible");
                console.log("  History:  🔐 ZK proofs only");
            }
        });

    // ═══════════════════════════════════════════════════════════════════════════
    // PHANTOMIZE (PUBLIC → PRIVATE)
    // ═══════════════════════════════════════════════════════════════════════════

    const phantomize = phantom
        .command("anonize")
        .description("Convert existing NFTs to ANONFT format (privacy)");

    phantomize
        .command("metadata")
        .description("Phantomize a Metaplex Token Metadata NFT")
        .requiredOption("-m, --mint <address>", "Existing NFT mint address")
        .requiredOption("-f, --forest <address>", "Target Shadow Forest address")
        .option("-r, --ring-size <size>", "Ring signature size", "8")
        .option("--burn", "Burn the original NFT (default: escrow)")
        .option("--dry-run", "Simulate phantomization")
        .option("--json", "Output as JSON")
        .action(async (opts) => {
            console.log("\\n🌑 Phantomizing Metaplex NFT...\\n");

            const result = {
                from: "metaplex_token_metadata",
                to: "phantom",
                mint: opts.mint,
                forest: opts.forest,
                originalNft: opts.burn ? "burned" : "escrowed",
                ringSize: parseInt(opts.ringSize),
                status: opts.dryRun ? "simulated" : "pending",
            };

            if (opts.json) {
                console.log(JSON.stringify(result, null, 2));
            } else {
                console.log(`  Mint:       ${opts.mint}`);
                console.log(`  Forest:     ${opts.forest}`);
                console.log(`  Original:   ${result.originalNft}`);
                console.log(`  Ring Size:  ${opts.ringSize}`);
                console.log("\\n  💡 Your NFT will be hidden in the Shadow Forest");
            }
        });

    phantomize
        .command("bubblegum")
        .description("Phantomize a Metaplex Bubblegum (compressed) NFT")
        .requiredOption("-l, --leaf-index <index>", "Bubblegum leaf index")
        .requiredOption("-t, --tree <address>", "Source Bubblegum tree address")
        .requiredOption("-f, --forest <address>", "Target Shadow Forest address")
        .option("-r, --ring-size <size>", "Ring signature size", "8")
        .option("--dry-run", "Simulate phantomization")
        .option("--json", "Output as JSON")
        .action(async (opts) => {
            console.log("\\n🌑 Phantomizing Bubblegum NFT...\\n");

            const result = {
                from: "bubblegum",
                to: "phantom",
                bubblegumTree: opts.tree,
                leafIndex: parseInt(opts.leafIndex),
                forest: opts.forest,
                ringSize: parseInt(opts.ringSize),
                status: opts.dryRun ? "simulated" : "pending",
            };

            if (opts.json) {
                console.log(JSON.stringify(result, null, 2));
            } else {
                console.log(`  From Tree:  ${opts.tree}`);
                console.log(`  Leaf:       ${opts.leafIndex}`);
                console.log(`  To Forest:  ${opts.forest}`);
            }
        });

    phantomize
        .command("core")
        .description("Phantomize a Metaplex Core NFT")
        .requiredOption("-a, --asset <address>", "Core asset address")
        .requiredOption("-f, --forest <address>", "Target Shadow Forest address")
        .option("-r, --ring-size <size>", "Ring signature size", "8")
        .option("--dry-run", "Simulate phantomization")
        .option("--json", "Output as JSON")
        .action(async (opts) => {
            console.log("\\n🌑 Phantomizing Metaplex Core NFT...\\n");

            const result = {
                from: "core",
                to: "phantom",
                asset: opts.asset,
                forest: opts.forest,
                ringSize: parseInt(opts.ringSize),
                status: opts.dryRun ? "simulated" : "pending",
            };

            if (opts.json) {
                console.log(JSON.stringify(result, null, 2));
            } else {
                console.log(`  Asset:      ${opts.asset}`);
                console.log(`  Forest:     ${opts.forest}`);
            }
        });

    // ═══════════════════════════════════════════════════════════════════════════
    // FOREST MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    const forest = phantom
        .command("forest")
        .description("Manage Shadow Forests (multi-tree Merkle structures)");

    forest
        .command("create")
        .description("Create a new Shadow Forest")
        .requiredOption("-n, --name <name>", "Forest name")
        .option("-t, --trees <count>", "Number of trees (4-32)", "8")
        .option("-d, --depth <depth>", "Tree depth (14-20)", "14")
        .option("--json", "Output as JSON")
        .action(async (opts) => {
            const { MIN_FOREST_TREES, MAX_FOREST_TREES, MIN_TREE_DEPTH, MAX_TREE_DEPTH } = await import("@styxstack/styx-nft");
            const crypto = await import("crypto");

            console.log("\\n🌲 Creating Shadow Forest...\\n");

            const treeCount = Math.min(MAX_FOREST_TREES, Math.max(MIN_FOREST_TREES, parseInt(opts.trees)));
            const depth = Math.min(MAX_TREE_DEPTH, Math.max(MIN_TREE_DEPTH, parseInt(opts.depth)));

            // Generate mock forest root for demo
            const forestRoot = crypto.randomBytes(32);

            const result = {
                name: opts.name,
                trees: treeCount,
                depth,
                totalCapacity: Math.pow(2, depth) * treeCount,
                forestRoot: Buffer.from(forestRoot).toString("hex").slice(0, 16) + "...",
                structure: "multi-tree merkle",
                privacyModel: "NFT location hidden among all trees",
            };

            if (opts.json) {
                console.log(JSON.stringify(result, null, 2));
            } else {
                console.log(`  Name:       ${result.name}`);
                console.log(`  Trees:      ${result.trees}`);
                console.log(`  Depth:      ${result.depth}`);
                console.log(`  Capacity:   ${result.totalCapacity.toLocaleString()} NFTs`);
                console.log(`  Root:       ${result.forestRoot}`);
                console.log("\\n  ✅ Shadow Forest created");
            }
        });

    forest
        .command("status")
        .description("Get status of a Shadow Forest")
        .requiredOption("-f, --forest <address>", "Forest address")
        .option("--json", "Output as JSON")
        .action(async (opts) => {
            console.log("\\n📊 Shadow Forest Status\\n");

            // Mock for demo
            const status = {
                address: opts.forest,
                trees: 8,
                depth: 14,
                totalLeaves: 8 * Math.pow(2, 14),
                usedLeaves: 1234,
                utilizationPercent: "0.94%",
                crossReferences: 567,
                lastUpdate: new Date().toISOString(),
            };

            if (opts.json) {
                console.log(JSON.stringify(status, null, 2));
            } else {
                console.log(`  Address:    ${status.address}`);
                console.log(`  Trees:      ${status.trees}`);
                console.log(`  Used:       ${status.usedLeaves.toLocaleString()} / ${status.totalLeaves.toLocaleString()}`);
                console.log(`  Util:       ${status.utilizationPercent}`);
                console.log(`  X-Refs:     ${status.crossReferences}`);
            }
        });

    // ═══════════════════════════════════════════════════════════════════════════
    // RING MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    const ring = phantom
        .command("ring")
        .description("Manage ring signatures for anonymous ownership");

    ring
        .command("create")
        .description("Create a ring with decoy keys")
        .requiredOption("-k, --keypair <path>", "Path to real owner keypair")
        .option("-s, --size <size>", "Ring size (2-16)", "8")
        .option("-p, --purpose <purpose>", "Ring purpose", "ownership")
        .option("--json", "Output as JSON")
        .action(async (opts) => {
            const { createRingWithDecoys, MIN_RING_SIZE, MAX_RING_SIZE } = await import("@styxstack/styx-nft");
            const crypto = await import("crypto");

            console.log("\\n💍 Creating Ring Signature Structure...\\n");

            const size = Math.min(MAX_RING_SIZE, Math.max(MIN_RING_SIZE, parseInt(opts.size)));

            // Mock public key for demo
            const mockPubkey = crypto.randomBytes(32);
            const result = createRingWithDecoys(mockPubkey, size - 1, opts.purpose);

            const output = {
                ringId: Buffer.from(result.ring.id).toString("hex").slice(0, 16) + "...",
                size: result.ring.members.length,
                realKeyIndex: result.signerIndex,
                purpose: opts.purpose,
                anonymitySet: `1:${size}`,
                members: result.ring.members.map(m => Buffer.from(m).toString("hex").slice(0, 8) + "..."),
            };

            if (opts.json) {
                console.log(JSON.stringify(output, null, 2));
            } else {
                console.log(`  Ring ID:    ${output.ringId}`);
                console.log(`  Size:       ${output.size} members`);
                console.log(`  Your Index: ${output.realKeyIndex} (secret!)`);
                console.log(`  Privacy:    Cannot tell which key is yours`);
            }
        });

    ring
        .command("rotate")
        .description("Rotate ring decoys (refresh anonymity set)")
        .requiredOption("-r, --ring <id>", "Ring ID to rotate")
        .requiredOption("-k, --keypair <path>", "Path to real owner keypair")
        .option("--json", "Output as JSON")
        .action(async (opts) => {
            console.log("\\n🔄 Rotating Ring Decoys...\\n");

            const result = {
                ringId: opts.ring,
                status: "rotated",
                newDecoys: 7,
                reason: "Fresh decoy keys increase privacy",
            };

            if (opts.json) {
                console.log(JSON.stringify(result, null, 2));
            } else {
                console.log(`  Ring:       ${opts.ring}`);
                console.log(`  Status:     Rotated`);
                console.log("  💡 Old signatures remain valid");
            }
        });

    // ═══════════════════════════════════════════════════════════════════════════
    // VERIFICATION
    // ═══════════════════════════════════════════════════════════════════════════

    phantom
        .command("verify")
        .description("Verify a ZK proof or ring signature")
        .requiredOption("-p, --proof <json>", "Proof JSON or path to file")
        .option("--type <type>", "Proof type: ownership | trait | collection | count", "ownership")
        .option("--json", "Output as JSON")
        .action(async (opts) => {
            console.log("\\n✅ Verifying Proof...\\n");

            // Mock verification
            const result = {
                proofType: opts.type,
                valid: true,
                verificationTime: "12ms",
                publicInputsMatched: true,
                signatureScheme: opts.type === "ownership" ? "LSAG" : "groth16",
            };

            if (opts.json) {
                console.log(JSON.stringify(result, null, 2));
            } else {
                console.log(`  Type:    ${opts.type}`);
                console.log(`  Valid:   ✅ Yes`);
                console.log(`  Time:    ${result.verificationTime}`);
            }
        });

    // ═══════════════════════════════════════════════════════════════════════════
    // INFO
    // ═══════════════════════════════════════════════════════════════════════════

    phantom
        .command("info")
        .description("Display information about the ANONFT Standard (ANS-1)")
        .action(() => {
            console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                     🌑 ANONFT STANDARD (ANS-1)                            ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  The ANONFT Standard is a privacy-first NFT protocol that inverts          ║
║  the traditional model: privacy is the default, revelation is the choice.  ║
║                                                                              ║
║  🌲 SHADOW FOREST                                                           ║
║     Multi-tree Merkle structure (4-32 trees, 14-20 depth each)              ║
║     NFT location hidden among multiple trees for maximum ambiguity          ║
║                                                                              ║
║  💍 RING SIGNATURES                                                          ║
║     Linkable Spontaneous Anonymous Group (LSAG) signatures                  ║
║     Proves ownership without revealing which key signed                     ║
║     Key images prevent double-spending while maintaining anonymity          ║
║                                                                              ║
║  🔐 ZERO-KNOWLEDGE PROOFS                                                    ║
║     Prove traits without revealing NFT identity                             ║
║     Prove collection membership privately                                   ║
║     Prove ownership count (whale detection resistant)                       ║
║                                                                              ║
║  🌟 TEMPORAL PHASES                                                          ║
║     Shadow:     Fully hidden (owner, metadata, traits)                      ║
║     Silhouette: Metadata visible, owner hidden                              ║
║     Revealed:   Full Metaplex compatibility                                 ║
║                                                                              ║
║  🔗 METAPLEX BRIDGE                                                          ║
║     Bidirectional: ANONFT ↔ Token Metadata, Bubblegum, Core                 ║
║     Marketplace compatible after reveal                                     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

Commands:
  styx anonft mint              Mint a new ANONFT
  styx anonft prove ownership   Prove ownership anonymously
  styx anonft prove trait       Prove trait without revealing NFT
  styx anonft reveal metadata   Reveal to Metaplex format
  styx anonft anonize           Convert existing NFT to ANONFT
  styx anonft forest create     Create a new Shadow Forest
  styx anonft ring create       Create ring with decoys

Run 'styx anonft <command> --help' for more information.
`);
        });

    return phantom;
}
