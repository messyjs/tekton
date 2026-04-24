---
name: github-pr-workflow
description: "Full PR lifecycle: branch, commit, push, open PR, address review, merge."
version: 1.0.0
metadata:
  tekton:
    tags: ["pr", "branch", "merge", "workflow"]
    category: github
    confidence: 0.7
---

# GitHub PR Workflow

## When to Use
- Contributing to any repository
- Feature development workflow
- Bug fix submission

## Procedure
1. Create branch: `git checkout -b feature/my-change`
2. Make changes and commit with clear message
3. Push: `git push -u origin feature/my-change`
4. Open PR: `gh pr create --title "..." --body "..."`
5. Address review comments and push fixes
6. Merge: `gh pr merge <number>`

## Pitfalls
- Don't push to main directly
- Don't forget to rebase on latest main before merge
- Write PR descriptions that explain Why, not just What

## Verification
- PR is merged (or closed with reason)
- Branch cleaned up after merge
- CI passed before merge
