---
name: lm-evaluation-harness
description: "Run 60+ academic benchmarks (MMLU, HellaSwag, etc.) on language models."
version: 1.0.0
metadata:
  tekton:
    tags: ["evaluation", "benchmark", "mmlu", "harness"]
    category: mlops
    confidence: 0.5
---

# LM Evaluation Harness

## When to Use
- Evaluating model capabilities
- Comparing models on standard benchmarks
- Academic evaluation before release

## Procedure
1. Install: `pip install lm-eval`
2. Run MMLU: `lm_eval --model hf --model_args pretrained=<model> --tasks mmlu`
3. Run HellaSwag: `lm_eval --model hf --model_args pretrained=<model> --tasks hellaswag`
4. Multiple tasks: `--tasks mmlu,hellaswag,arc_challenge`
5. Output: `--output_path results.json`

## Pitfalls
- Some tasks require specific prompt templates
- Few-shot settings vary by benchmark
- Results depend on generation parameters

## Verification
- Results in expected range for model size
- No errors in evaluation log
- Comparison is apples-to-apples (same settings)
