---
name: plan
description: "Plan mode: inspect context, write markdown plan, don't execute. Use when you need to analyze before acting."
version: 1.0.0
metadata:
  tekton:
    tags: ["planning", "analysis", "architecture"]
    category: software-development
    confidence: 0.8
---

# Plan Mode

## When to Use
- Before starting complex multi-step changes
- When requirements are ambiguous
- When the task affects multiple files or systems

## Procedure
1. Read all relevant files and context
2. Identify the scope of changes needed
3. Write a markdown plan with sections: Goal, Approach, Files to Change, Risk Assessment
4. Present plan to user for approval before executing
5. Do NOT write code or make changes until approved

## Pitfalls
- Don't start implementing during planning
- Don't skip reading existing code
- Don't assume requirements — ask clarifying questions

## Verification
- Plan covers all mentioned requirements
- User has approved the plan before execution begins
