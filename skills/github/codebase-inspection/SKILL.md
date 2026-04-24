---
name: codebase-inspection
description: "LOC counting, language breakdown, dependency analysis, and codebase statistics."
version: 1.0.0
metadata:
  tekton:
    tags: ["analysis", "metrics", "loc", "stats"]
    category: github
    confidence: 0.6
---

# Codebase Inspection

## When to Use
- Understanding a new codebase
- Preparing for refactoring
- Generating project documentation

## Procedure
1. Count lines of code: `find . -name '*.ts' | xargs wc -l | tail -1`
2. Language breakdown: `gh api repos/{owner}/{repo}/languages`
3. Find largest files: `find . -name '*.ts' -exec wc -l {} + | sort -rn | head -20`
4. Check dependencies: `cat package.json | jq '.dependencies | keys'`
5. Analyze commit patterns: `git log --oneline | head -50`

## Pitfalls
- Don't count node_modules or build artifacts
- Use .gitignore-aware tools
- Distinguish between source and generated code

## Verification
- Stats match visual inspection
- No build artifacts included in counts
