---
name: github-auth
description: "Set up GitHub authentication: SSH keys, tokens, and gh CLI configuration."
version: 1.0.0
metadata:
  tekton:
    tags: ["github", "auth", "ssh", "tokens"]
    category: github
    confidence: 0.7
---

# GitHub Authentication

## When to Use
- First-time setup on a new machine
- When git push/pull fails with auth errors
- Setting up CI/CD pipelines

## Procedure
1. Check if gh CLI is installed: `which gh`
2. Authenticate: `gh auth login`
3. For SSH: generate key with `ssh-keygen`, add to GitHub
4. Verify: `gh auth status` and `git remote -v`

## Pitfalls
- Don't commit tokens to repositories
- Don't use personal tokens in CI — use GitHub Actions secrets
- SSH vs HTTPS mismatch causes push failures

## Verification
- `gh auth status` shows authenticated
- `git push` works without password prompt
