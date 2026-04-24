---
name: systematic-debugging
description: "4-phase root cause investigation: reproduce, isolate, hypothesis, verify."
version: 1.0.0
metadata:
  tekton:
    tags: ["debugging", "root-cause", "investigation"]
    category: software-development
    confidence: 0.8
---

# Systematic Debugging

## When to Use
- Bug reports or unexpected behavior
- Intermittent failures
- Performance regressions

## Procedure
1. **Reproduce**: Create minimal reproduction case; document exact steps
2. **Isolate**: Binary search to narrow scope; check logs, add strategic prints
3. **Hypothesize**: List possible root causes; rank by likelihood
4. **Verify**: Apply fix for most likely cause; confirm it works; check for similar issues

## Pitfalls
- Don't skip reproduction — assumptions waste time
- Don't change multiple things at once during isolation
- Don't forget to check for similar bugs after fixing

## Verification
- Bug no longer reproduces
- Fix is minimal and targeted
- No regressions in related behavior
