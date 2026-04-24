---
name: github-repo-management
description: "Clone, create, fork, and configure GitHub repositories."
version: 1.0.0
metadata:
  tekton:
    tags: ["repo", "clone", "fork", "create"]
    category: github
    confidence: 0.7
---

# GitHub Repository Management

## When to Use
- Setting up new projects
- Forking repositories for contribution
- Configuring repo settings

## Procedure
1. Clone: `gh repo clone owner/repo`
2. Create: `gh repo create my-repo --public --clone`
3. Fork: `gh repo fork owner/repo --clone`
4. Configure: `gh repo edit --description "..." --homepage URL`
5. Manage collaborators

## Pitfalls
- Check .gitignore before pushing
- Set default branch protection on new repos
- Use SSH URLs for reliability

## Verification
- Repo is accessible
- Branch protection rules are set
- Collaborators have correct permissions
