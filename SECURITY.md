# Security Policy

## Reporting Security Issues

If you discover a security vulnerability in StyxStack, please report it by emailing **security@styx.nexus**. **DO NOT** open a public GitHub issue.

**Response Time:** We aim to acknowledge reports within 48 hours and provide a timeline for remediation within 7 days.

## Program Information

| Property | Value |
|----------|-------|
| **Program ID** | `GhSTPRZFBnWXMjt6xFnpY2ZHFwijFoC44KkxXSEC94X9` |
| **Network** | Solana Mainnet-Beta |
| **Upgrade Authority** | `styXHdP5wqJRWZqzo4WmGyCZxk9r6mvH3Rdj5mUHCk4` |
| **Version** | 4.0.0 |
| **Source Code** | [GitHub](https://github.com/QuarksBlueFoot/StyxStack) |
| **Verifiable Build** | See [programs/styx-privacy-standard/Solana.toml](programs/styx-privacy-standard/Solana.toml) |

## Security Best Practices

### Private Key Management

**❌ NEVER:**
- Commit private keys or seeds to version control
- Share private keys in chat, email, or documentation
- Use production keys for testing
- Store keys in plain text files in your repository
- Include keys in screenshots or demos

**✅ ALWAYS:**
- Use environment variables for sensitive data
- Store production keys in secure key management systems (AWS KMS, HashiCorp Vault, etc.)
- Use separate wallets for development and production
- Enable biometric/hardware key protection where available
- Rotate keys regularly
- Use least-privilege access controls

### Environment Variables

Use `.env` files for local development (never commit these):

```bash
# Copy the example
cp .env.example .env

# Edit .env with your secrets
nano .env
```

Verify `.env` is in your `.gitignore`:
```bash
cat .gitignore | grep .env
```

### Testing

For testing on devnet:

1. **Generate a test wallet:**
   ```bash
   solana-keygen new --outfile ~/.config/solana/devnet-test.json
   ```

2. **Fund it with devnet SOL:**
   ```bash
   solana airdrop 5 --url devnet
   ```

3. **Export seed for testing:**
   ```bash
   # Get the seed (first 32 bytes of the keypair)
   head -c 32 ~/.config/solana/devnet-test.json | base58
   
   # Set environment variable
   export DEVNET_WALLET_SEED="<base58_seed>"
   ```

4. **Run tests:**
   ```bash
   DEVNET_WALLET_SEED=<your_seed> pnpm test
   ```

### Production Deployment

For mainnet deployment:

1. **Use hardware wallets** (Ledger, etc.) for deployment and upgrade authority
2. **Multi-sig wallets** for critical operations
3. **Separate hot/cold wallets** for different risk levels
4. **Audit all code** before mainnet deployment
5. **Test thoroughly** on devnet first
6. **Monitor transactions** in production
7. **Have incident response plan** ready

### Solana Program Security

When deploying programs:

1. **Set upgrade authority carefully:**
   ```bash
   # Make program immutable (cannot be upgraded)
   solana program set-upgrade-authority <PROGRAM_ID> --final
   
   # Or transfer to multi-sig
   solana program set-upgrade-authority <PROGRAM_ID> --new-upgrade-authority <MULTISIG>
   ```

2. **Verify program deployment:**
   ```bash
   solana program show <PROGRAM_ID>
   ```

3. **Monitor program usage:**
   - Set up alerts for unexpected transactions
   - Monitor program account balance
   - Track upgrade authority changes

### Code Review Checklist

Before committing code, verify:

- [ ] No private keys or seeds in code
- [ ] No API keys or secrets in code
- [ ] No hardcoded wallet addresses (use env vars)
- [ ] `.gitignore` includes sensitive file patterns
- [ ] `.env` files are not committed
- [ ] Test data doesn't contain real keys
- [ ] Documentation doesn't expose secrets

### Sensitive Files

These should NEVER be committed:

```
*.json (except package.json, tsconfig.json, etc.)
*-wallet.json
*.keypair
*.key
.env
.env.local
*.pem
*.p12
id.json
keypair.json
```

### Audit Trail

- All mainnet deployments must be documented
- Keep records of:
  - Deployment transactions
  - Upgrade authority changes
  - Key rotations
  - Security incidents
  - Code audits

## Dependencies

### Supply Chain Security

- Review all dependencies before installing
- Use `pnpm audit` regularly to check for vulnerabilities
- Pin dependency versions in production
- Monitor security advisories for @solana/web3.js and other critical deps

### Regular Updates

```bash
# Check for vulnerabilities
pnpm audit

# Update dependencies
pnpm update

# Review changes before committing
git diff pnpm-lock.yaml
```

## Incident Response

If a security incident occurs:

1. **Immediate actions:**
   - Revoke compromised keys
   - Pause affected programs (if possible)
   - Notify users immediately
   - Document the incident

2. **Investigation:**
   - Determine scope of breach
   - Identify attack vector
   - Assess damage

3. **Remediation:**
   - Deploy fixes
   - Rotate all potentially compromised keys
   - Update security measures
   - Publish post-mortem

## Compliance

### Data Privacy

- StyxStack is designed for privacy-preserving applications
- No personal data should be stored unencrypted
- Follow applicable regulations (GDPR, CCPA, etc.)
- Implement proper data handling procedures

### Regulatory Compliance

- Understand local regulations for privacy and blockchain
- Implement required compliance features
- Document compliance measures
- Regular compliance audits

## Resources

- [Solana Security Best Practices](https://docs.solana.com/developers)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [Solana Program Security](https://github.com/solana-labs/solana-program-library/blob/master/SECURITY.md)

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 4.0.x   | :white_check_mark: (Current) |
| 3.x.x   | :x: (Deprecated) |
| 0.0.x   | :x: (Legacy) |

## Acknowledgments

We thank the following individuals and organizations for responsibly disclosing security issues:

- *No acknowledgments yet - be the first!*

To be added to this list, please report issues responsibly to security@styx.nexus.

## Contact

For security concerns, please email **security@styx.nexus** rather than opening public issues.

**PGP Key:** Coming soon

---

**Remember: Security is everyone's responsibility. When in doubt, ask!**
