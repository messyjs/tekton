---
name: axolotl
description: "Fine-tune LLMs with Axolotl: config-driven, multi-GPU, LoRA/QLoRA support."
version: 1.0.0
metadata:
  tekton:
    tags: ["training", "fine-tuning", "lora", "axolotl"]
    category: mlops
    confidence: 0.5
---

# Axolotl Fine-Tuning

## When to Use
- Fine-tuning large language models
- Multi-GPU training with LoRA/QLoRA
- Config-driven training pipelines

## Procedure
1. Install: `pip install axolotl`
2. Create YAML config specifying base model, dataset, LoRA params
3. Prepare dataset in Axolotl format (instruction/completion)
4. Launch: `accelerate launch -m axolotl.cli.train config.yml`
5. Monitor with wandb
6. Export: merge LoRA weights or keep adapter separate

## Pitfalls
- OOM: reduce batch_size or enable gradient_checkpointing
- LoRA rank too high = slower, too low = underfitting
- Always validate on held-out data

## Verification
- Loss decreases monotonically
- Validation perplexity improves
- Model generates coherent completions
