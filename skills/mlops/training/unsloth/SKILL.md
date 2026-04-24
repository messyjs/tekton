---
name: unsloth
description: "Fast fine-tuning with Unsloth: 2x faster, 60% less memory for LLM training."
version: 1.0.0
metadata:
  tekton:
    tags: ["training", "fine-tuning", "unsloth", "efficient"]
    category: mlops
    confidence: 0.5
---

# Unsloth Fine-Tuning

## When to Use
- When training speed matters
- Limited GPU memory scenarios
- Quick iteration on fine-tuning experiments

## Procedure
1. Install: `pip install unsloth`
2. Load model with Unsloth optimizations
3. Apply LoRA: `model = FastLanguageModel.get_peft_model(model, ...)`
4. Train with SFTTrainer
5. Save: `model.save_pretrained_merged()`

## Pitfalls
- Some model architectures not supported
- Flash attention may conflict with other optimizations
- Verify numerical equivalence with standard training

## Verification
- Training throughput is ~2x standard
- Memory usage reduced vs baseline
- Model quality comparable to standard fine-tuning
