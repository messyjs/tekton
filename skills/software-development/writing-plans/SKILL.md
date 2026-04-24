---
name: writing-plans
description: "Create comprehensive implementation plans with scope, approach, risks, and verification steps."
version: 1.0.0
metadata:
  tekton:
    tags: ["planning", "implementation", "scope"]
    category: software-development
    confidence: 0.7
---

# Writing Plans

## When to Use
- Starting a new feature or project
- Complex refactoring
- Multi-file changes

## Procedure
1. Define clear Goal statement
2. List all files/modules that need changes
3. Describe the Approach for each change
4. Identify Risks and mitigation strategies
5. Define Verification criteria
6. Break into ordered Steps with estimated effort

## Pitfalls
- Don't be vague — specific files and line ranges
- Don't skip risk assessment
- Don't forget rollback plan

## Verification
- Plan addresses the full requirement
- Each step is independently verifiable
- Risks have concrete mitigations
