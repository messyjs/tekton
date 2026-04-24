---
name: llama-cpp
description: "llama.cpp inference engine: quantized LLM serving, GGUF conversion, hardware acceleration."
version: 1.0.0
metadata:
  tekton:
    tags: ["inference", "llama-cpp", "gguf", "quantization"]
    category: mlops
    confidence: 0.6
---

# llama.cpp Inference

## When to Use
- Running LLMs on consumer hardware
- CPU/GPU inference without Python overhead
- Converting models to GGUF format

## Procedure
1. Build: `make` or `cmake --build`
2. Convert model: `python convert_hf_to_gguf.py /path/to/model`
3. Quantize: `./llama-quantize model.gguf Q4_K_M`
4. Serve: `./llama-server -m model-Q4_K_M.gguf -c 4096 --host 0.0.0.0`
5. Chat: `./llama-cli -m model-Q4_K_M.gguf`

## Pitfalls
- Q4 trades quality for speed; Q5_K_M is better quality
- Context length directly impacts memory usage
- Flash attention requires specific GPU support

## Verification
- Model loads without errors
- Generation is coherent and responsive
- Memory usage matches expectations
