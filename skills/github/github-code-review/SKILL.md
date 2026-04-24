---
name: github-code-review
description: "Review diffs and leave inline PR comments with constructive feedback."
version: 1.0.0
metadata:
  tekton:
    tags: ["review", "pr", "diff", "feedback"]
    category: github
    confidence: 0.6
---

# GitHub Code Review

## When to Use
- Reviewing pull requests
- Providing feedback on code changes
- Ensuring code quality before merge

## Procedure
1. Fetch PR diff: `gh pr diff <number>`
2. Review change summary, then dive into specifics
3. Check for: correctness, performance, security, style
4. Leave inline comments
5. Submit review: approve, request changes, or comment

## Pitfalls
- Don't review without understanding the context
- Don't leave vague comments — be specific
- Check both the what and the why

## Verification
- All files in the diff have been reviewed
- Comments are actionable and specific
- Review decision is justified
