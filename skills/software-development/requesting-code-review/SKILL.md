---
name: requesting-code-review
description: "Pre-commit verification pipeline: lint, type-check, test, format before requesting review."
version: 1.0.0
metadata:
  tekton:
    tags: ["review", "quality", "ci", "pre-commit"]
    category: software-development
    confidence: 0.8
---

# Requesting Code Review

## When to Use
- Before submitting a PR
- After completing a feature or fix
- When you want feedback on code quality

## Procedure
1. Run linter and fix all warnings
2. Run type checker
3. Run relevant tests and ensure all pass
4. Run formatter
5. Write clear PR description with: What, Why, How, Testing
6. Request review from appropriate team members

## Pitfalls
- Don't skip running tests locally
- Don't request review on failing CI
- Don't forget to self-review first

## Verification
- All CI checks pass
- PR description is complete
- Reviewer(s) assigned
