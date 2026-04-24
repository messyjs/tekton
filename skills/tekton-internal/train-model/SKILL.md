---
name: train-model
description: "Training orchestration for fine-tuning LLMs — config, data, launch, monitor."
version: 1.0.0
metadata:
  tekton:
    tags: ["training", "fine-tuning", "lora", "orchestration"]
    category: tekton-internal
    confidence: 0.6
---

# Train Model

## When to Use
- Fine-tuning LLMs for specific tasks
- Creating custom models for your use case
- Experimenting with LoRA/QLoRA

## Procedure
1. Prepare dataset in instruction format
2. Choose base model and training framework (Axolotl, Unsloth, TRL)
3. Configure training: learning rate, epochs, batch size
4. Launch training with proper GPU allocation
5. Monitor loss and validation metrics
6. Evaluate on held-out data
7. Export or merge LoRA weights

## Pitfalls
- Overfitting: always validate on held-out data
- Learning rate too high causes training instability
- LoRA rank tradeoff: higher = better quality but slower
- Always use gradient checkpointing to save memory

## Verification
- Training loss decreases monotonically
- Validation perplexity improves
- Model generates coherent outputs on test prompts
- No NaN loss values
