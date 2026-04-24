---
name: linear
description: "Linear issue management — create, update, search issues and projects."
version: 1.0.0
metadata:
  tekton:
    tags: ["linear", "issues", "project-management", "tracking"]
    category: productivity
    confidence: 0.5
---

# Linear

## When to Use
- Managing bugs and features
- Sprint planning
- Tracking project progress

## Procedure
1. Get API key from Linear Settings > API
2. Create issue: linear issue create
3. List issues: linear issue list --filter status:active
4. Update: linear issue update <id> --status done
5. Use GraphQL API for advanced queries

## Pitfalls
- Team IDs vary per workspace
- Status workflow may differ
- Use labels consistently

## Verification
- Issues appear in Linear UI
- Status transitions are valid
- Assignees and labels correct
