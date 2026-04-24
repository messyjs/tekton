---
name: model-select
description: "When to route to fast vs deep models based on task complexity."
version: 1.0.0
metadata:
  tekton:
    tags: ["routing", "models", "complexity", "fast-vs-deep"]
    category: tekton-internal
    confidence: 0.8
---

# Model Selection

## When to Use
- Deciding between fast and deep models
- Optimizing cost vs quality
- Routing based on task complexity

## Procedure
1. Score task complexity (0-1)
2. If complexity < 0.3: use fast model
3. If complexity > 0.6: use deep model
4. If 0.3-0.6: use fast model with skill support
5. Override with explicit routing mode if needed

## Pitfalls
- Don't over-route to deep models (costly)
- Simple tasks on deep models waste tokens
- Skill-matched tasks can use fast model even at medium complexity

## Verification
- Routing decision matches task difficulty
- Cost estimate is reasonable
- Quality of output matches expectations
