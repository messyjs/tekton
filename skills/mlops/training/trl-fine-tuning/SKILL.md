---
name: trl-fine-tuning
description: "TRL library for SFT, DPO, and GRPO training on language models."
version: 1.0.0
metadata:
  tekton:
    tags: ["training", "trl", "sft", "dpo", "grpo"]
    category: mlops
    confidence: 0.5
---

# TRL Fine-Tuning

## When to Use
- Supervised fine-tuning (SFT)
- Direct Preference Optimization (DPO)
- Group Relative Policy Optimization (GRPO)

## Procedure
1. Install: `pip install trl`
2. SFT: `SFTTrainer` with dataset of completions
3. DPO: `DPOTrainer` with preference pairs
4. GRPO: `GRPOTrainer` with reward model
5. Log to wandb for experiment tracking

## Pitfalls
- DPO needs both chosen and rejected examples
- Learning rate too high causes training instability
- DPO can overfit the preference data — validate carefully

## Verification
- Reward model scores improve on validation
- Generated text quality is subjectively better
- No training loss spikes or NaN
