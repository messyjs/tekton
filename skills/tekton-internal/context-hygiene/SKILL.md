---
name: context-hygiene
description: "Token budget management — keep context lean and relevant."
version: 1.0.0
metadata:
  tekton:
    tags: ["context", "tokens", "budget", "hygiene"]
    category: tekton-internal
    confidence: 0.8
---

# Context Hygiene

## When to Use
- Context window approaching limits
- After many conversation turns
- When response quality degrades

## Procedure
1. Check token count estimate
2. If < 50%: no action needed
3. If 50-75%: compress with lite tier
4. If 75-90%: compress with full tier, prune old messages
5. If > 90%: compress ultra + aggressive pruning
6. Always preserve: current task, recent tool results, user's latest message

## Pitfalls
- Don't remove the current task context
- Don't prune tool results the agent still needs
- Compression is lossy — accept some information loss

## Verification
- Context fits in window
- Key information preserved
- Agent can still perform the task
