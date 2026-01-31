# Contributing to Styx Stack

Thank you for your interest in contributing to Styx Stack! 🎉

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Style Guide](#style-guide)
- [Attribution](#attribution)

## 📜 Code of Conduct

This project adheres to a simple code of conduct:

1. **Be respectful** - Treat everyone with respect
2. **Be constructive** - Focus on improving the project
3. **Be patient** - Maintainers are volunteers

## 🤝 How Can I Contribute?

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/QuarksBlueFoot/StyxStack/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)

### Suggesting Features

1. Open an issue with the `enhancement` label
2. Describe the feature and its use case
3. Explain why it would benefit the project

### Code Contributions

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write/update tests
5. Submit a pull request

## 🛠️ Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/StyxStack.git
cd StyxStack

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck
```

### Project Structure

```
StyxStack/
├── packages/           # TypeScript packages
│   ├── styx-pmp-sdk/   # Main PMP SDK
│   ├── crypto-core/    # Cryptographic primitives
│   └── ...
├── programs/           # Solana programs (Rust)
│   ├── styx-private-memo-program/
│   └── whisperdrop/
├── docs/               # Documentation
└── demos/              # Example code
```

## 📝 Pull Request Process

1. **Update documentation** - If your change affects the API, update the docs
2. **Add tests** - All new features should have tests
3. **Follow the style guide** - See below
4. **Write a clear PR description** - What, why, and how

### PR Title Format

```
type(scope): description

Examples:
feat(pmp-sdk): add time capsule instruction builder
fix(crypto-core): correct nonce generation
docs(readme): update installation instructions
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## 🎨 Style Guide

### TypeScript

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use meaningful variable names
- Document public APIs with JSDoc
- Use async/await over raw promises

```typescript
/**
 * Send a private message using the PMP program
 * 
 * @param sender - The sender's keypair
 * @param recipient - The recipient's public key
 * @param message - The plaintext message
 * @returns Transaction signature
 */
async function sendPrivateMessage(
  sender: Keypair,
  recipient: PublicKey,
  message: string
): Promise<string> {
  // Implementation
}
```

### Rust

- Follow Rust naming conventions
- Use `msg!` for logging
- Minimize dependencies
- Document with `///` comments

```rust
/// Process a private message instruction
/// 
/// # Arguments
/// * `data` - The instruction data bytes
/// 
/// # Returns
/// * `ProgramResult` - Success or error
fn process_private_message(data: &[u8]) -> ProgramResult {
    // Implementation
}
```

## 🙏 Attribution

All contributors will be credited in the project. By contributing, you agree that your contributions will be licensed under the Apache 2.0 license.

### Hall of Fame

Contributors who make significant contributions will be featured in:
- README.md acknowledgments
- Release notes
- Project documentation

---

## 💝 Support the Project

If you're using Styx Stack in a commercial project, please consider:

1. **Sponsoring development** - Send SOL to `13xnC9kDksJMBE9FYVW1S7dukLjRDgrh4Dzm6eq5moon`
2. **Contributing code** - Help improve the toolkit
3. **Spreading the word** - Star the repo, share with others

Thank you for making Styx Stack better! ❤️

---

Created by **@moonmanquark** (Bluefoot Labs)
