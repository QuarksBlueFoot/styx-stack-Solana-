# Security Checklist ✅

Before committing code or deploying to production, verify:

## 🔐 Private Key Security

- [ ] No private keys in code
- [ ] No wallet seeds in code  
- [ ] No keypair files committed
- [ ] `.env` files not committed
- [ ] `.gitignore` includes sensitive patterns
- [ ] Test wallets separate from production
- [ ] Production keys in secure storage (KMS, Vault, etc.)

## 📝 Code Review

- [ ] No hardcoded secrets
- [ ] No API keys in code
- [ ] Environment variables used for config
- [ ] No sensitive data in logs
- [ ] No debugging output with secrets
- [ ] Comments don't contain secrets

## 📁 Files

Verify these files exist and are correct:

- [ ] `.gitignore` includes: `*.env`, `*-wallet.json`, `*.keypair`, `*.key`
- [ ] `.env.example` documents required variables (without values)
- [ ] `SECURITY.md` exists with security guidelines
- [ ] No `devnet-wallet.json` or similar in repo
- [ ] No keypair files in repo

## 🧪 Testing

- [ ] Tests use environment variables
- [ ] Tests don't expose secrets in output
- [ ] Test wallets documented as test-only
- [ ] CI/CD uses secret management (GitHub Secrets, etc.)

## 🚀 Deployment

- [ ] Devnet deployed with test keys
- [ ] Mainnet uses hardware wallet or multi-sig
- [ ] Upgrade authority secured
- [ ] Program audited before mainnet
- [ ] Monitoring in place
- [ ] Incident response plan ready

## ✅ Final Verification

Run these commands before pushing:

\`\`\`bash
# Check for sensitive files
find . -name "*.env" -o -name "*wallet*.json" -o -name "*.keypair" | grep -v node_modules

# Check git status
git status

# Verify .gitignore
cat .gitignore | grep -E "(\.env|wallet|keypair|\.key)"

# Search for potential secrets (adjust pattern)
git grep -E "(private|secret|key|seed).*=.*['\"][a-zA-Z0-9]{20,}['\"]" || echo "No hardcoded secrets found"
\`\`\`

## 🆘 If Secret Was Committed

If you accidentally committed a secret:

1. **Immediately revoke/rotate** the compromised key
2. **Remove from git history**: `git filter-branch` or BFG Repo-Cleaner
3. **Force push** to overwrite history
4. **Notify team** if key had access to resources
5. **Audit** what the key had access to
6. **Document incident** for post-mortem

**Never** just delete the file and commit - it remains in git history!

## 📚 Resources

- [SECURITY.md](SECURITY.md) - Comprehensive security guide
- [.env.example](.env.example) - Environment variable template
- [programs/styx-private-memo-program/README.md](programs/styx-private-memo-program/README.md) - Test client security

---

**Date Created:** January 19, 2026
**Last Reviewed:** January 19, 2026
**Next Review:** Before mainnet deployment
