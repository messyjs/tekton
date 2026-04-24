---
name: test-driven-development
description: "RED-GREEN-REFACTOR cycle: write failing test, make it pass, then clean up."
version: 1.0.0
metadata:
  tekton:
    tags: ["testing", "tdd", "red-green-refactor"]
    category: software-development
    confidence: 0.8
---

# Test-Driven Development

## When to Use
- Writing new features
- Fixing bugs (write regression test first)
- Refactoring existing code

## Procedure
1. **RED**: Write a test that fails because the feature doesn't exist yet
2. **GREEN**: Write the minimum code to make the test pass
3. **REFACTOR**: Clean up the code while keeping tests green
4. Repeat for next requirement

## Pitfalls
- Don't skip the RED phase — the failure confirms the test is meaningful
- Don't write more code than needed to pass the current test
- Don't refactor without green tests

## Verification
- All tests pass (green)
- No dead code from over-implementation
- Test coverage is meaningful, not inflated
