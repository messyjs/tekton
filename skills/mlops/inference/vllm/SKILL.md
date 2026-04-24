---
name: vllm
description: "vLLM high-throughput LLM serving with PagedAttention, continuous batching, and OpenAI-compatible API."
version: 1.0.0
metadata:
  tekton:
    tags: ["inference", "vllm", "serving", "high-throughput"]
    category: mlops
    confidence: 0.6
---

# vLLM Serving

## When to Use
- High-throughput LLM inference
- Production model serving
- Need OpenAI-compatible API

## Procedure
1. Install: `pip install vllm`
2. Serve: `python -m vllm.entrypoints.openai.api_server --model <model> --port 8000`
3. Use OpenAI client: `client = OpenAI(base_url="http://localhost:8000/v1")`
4. Configure: `--max-model-len`, `--gpu-memory-utilization 0.9`
5. Quantize: `--quantization awq` or `gptq`

## Pitfalls
- OOM: reduce gpu_memory_utilization or max_model_len
- First request is slow (model loading)
- Quantization may degrade quality significantly

## Verification
- API responds to /v1/models
- Throughput matches expected tokens/sec
- No OOM errors under load
