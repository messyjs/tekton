---
name: weights-and-biases
description: "W&B experiment tracking: log metrics, compare runs, visualize training progress."
version: 1.0.0
metadata:
  tekton:
    tags: ["evaluation", "wandb", "tracking", "experiments"]
    category: mlops
    confidence: 0.5
---

# Weights & Biases

## When to Use
- Tracking ML experiments
- Comparing training runs
- Visualizing metrics over time

## Procedure
1. Install: `pip install wandb`
2. Login: `wandb login`
3. Initialize: `wandb.init(project="my-project", config={...})`
4. Log metrics: `wandb.log({"loss": loss, "lr": lr})`
5. Finish: `wandb.finish()`

## Pitfalls
- Don't log every step — use commit=False for batched logging
- Set run names clearly for comparison
- Use tags for filtering

## Verification
- Dashboard shows metrics
- Runs are comparable
- No orphaned runs
