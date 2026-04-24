---
name: github-issues
description: "Create, manage, triage, and close GitHub issues with labels and milestones."
version: 1.0.0
metadata:
  tekton:
    tags: ["issues", "triage", "project-management"]
    category: github
    confidence: 0.7
---

# GitHub Issues

## When to Use
- Tracking bugs, features, tasks
- Managing project backlog
- Triaging incoming reports

## Procedure
1. Create issue: `gh issue create --title "..." --body "..."`
2. Add labels: `gh issue edit <number> --add-label bug,priority:high`
3. Assign: `gh issue edit <number> --assignee <user>`
4. Set milestone: `gh issue edit <number> --milestone v2.0`
5. Close: `gh issue close <number>`

## Pitfalls
- Don't create duplicate issues — search first
- Don't leave issues without labels or assignees
- Write actionable titles, not vague descriptions

## Verification
- Issue has clear title, description, labels
- Issue is assigned and has a milestone
- Duplicate issues are linked
