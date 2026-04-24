---
name: scp-delegate
description: "How to delegate tasks via the Sub-agent Communication Protocol (SCP)."
version: 1.0.0
metadata:
  tekton:
    tags: ["scp", "delegation", "sub-agents", "protocol"]
    category: tekton-internal
    confidence: 0.8
---

# SCP Delegate

## When to Use
- Delegating tasks to sub-agents
- Parallel task execution
- Routing tasks to specialized agents

## Procedure
1. Create SCP delegate message with task_id, from, to, task description
2. Set priority: low, normal, or high
3. Optionally include skill_hint for agent routing
4. Optionally restrict tools the sub-agent can use
5. Wait for SCP result or SCP error response
6. Aggregate results from multiple delegates

## Pitfalls
- Always set timeout_ms for delegated tasks
- Don't delegate tasks that share mutable state
- Sub-agents can't see parent context

## Verification
- Result status is 'ok'
- Task completed within timeout
- Tokens used within budget
