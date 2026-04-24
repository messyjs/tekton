---
name: subagent-driven-development
description: "Dispatch delegate_task per independent task for parallel execution of unrelated work."
version: 1.0.0
metadata:
  tekton:
    tags: ["parallel", "delegation", "sub-agents", "orchestration"]
    category: software-development
    confidence: 0.7
---

# Sub-Agent Driven Development

## When to Use
- Multiple independent tasks can run in parallel
- Long-running tasks that don't depend on each other

## Procedure
1. Identify independent tasks from the current goal
2. Group tasks by dependency (parallel vs sequential)
3. For parallel group, use delegate_task with mode=parallel
4. For sequential group, use delegate_task with mode=sequential
5. Aggregate results and proceed
6. Verify combined output

## Pitfalls
- Don't delegate tasks with shared mutable state
- Don't assume sub-agents can see each other's context
- Keep task descriptions specific and self-contained

## Verification
- All delegated tasks completed
- Results aggregated correctly
- No conflicts between parallel outputs
