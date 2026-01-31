# Known Issue: Dependency Version Conflict

## Problem

As of January 2026, there's a compatibility issue between:
- Solana CLI cargo-build-sbf (uses Rust 1.75-1.79)
- Recent crates.io packages (require Rust 1.85+ for edition2024)

Affected packages: `constant_time_eq`, `blake3`, `toml_datetime`, and others.

## Workarounds

### Option 1: Use Docker (Recommended)

Use the official Solana Docker image with pinned dependencies:

```bash
docker run --rm -v $(pwd):/workspace -w /workspace \
  solanalabs/solana:v1.18.26 \
  cargo-build-sbf
```

### Option 2: Manual Build with Anchor

If you have Anchor installed:

```bash
anchor build
```

### Option 3: Patch Dependencies Locally

```bash
# Navigate to program directory
cd programs/styx-private-memo-program

# Downgrade problematic dependencies
cargo update blake3 --precise 1.5.0
cargo update borsh@1.6.0 --precise 1.5.0
sed -i 's/version = 4/version = 3/g' Cargo.lock

# Build
cargo-build-sbf
```

### Option 4: Deploy Pre-built Binary

A pre-built `.so` file can be deployed directly:

```bash
# If you have a pre-built binary
solana program deploy target/deploy/styx_private_memo_program.so
```

## Permanent Solution

Wait for Solana SDK to update their Rust toolchain to 1.85+, or use a custom Rust toolchain:

```bash
# Install rust-bpf with newer toolchain
rustup install 1.85.0
rustup default 1.85.0
cargo-build-sbf --rust-version 1.85.0
```

## Status

This is a temporary issue that will be resolved when:
1. Solana updates their bundled Rust toolchain, OR
2. crates.io packages roll back edition2024 requirements, OR  
3. We use Docker/Anchor for builds

For now, use Docker or wait for toolchain updates.
