---
name: 1password
description: "1Password CLI integration — retrieve secrets, manage vaults, automate credential access."
version: 1.0.0
metadata:
  tekton:
    tags: ["1password", "secrets", "vault", "credentials"]
    category: security
    confidence: 0.5
---

# 1Password

## When to Use
- Retrieving secrets in scripts
- Managing credentials programmatically
- CI/CD secret injection

## Procedure
1. Install: brew install 1password-cli
2. Sign in: op account add
3. List vaults: op vault list
4. Get item: op item get "My Credential" --fields password
5. Use in scripts: export DB_PASS=$(op read op://vault/item/field)

## Pitfalls
- Never echo secrets to console
- Use op read for non-interactive access
- Session timeout requires re-authentication

## Verification
- CLI returns expected credentials
- Secrets are not logged
- Script works in CI environment
