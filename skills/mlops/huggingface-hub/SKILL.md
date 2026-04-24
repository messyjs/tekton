---
name: huggingface-hub
description: "HF Hub CLI operations: upload, download, manage models and datasets."
version: 1.0.0
metadata:
  tekton:
    tags: ["huggingface", "hub", "models", "datasets"]
    category: mlops
    confidence: 0.6
---

# Hugging Face Hub

## When to Use
- Uploading/downloading models
- Managing datasets
- Sharing trained models

## Procedure
1. Install: `pip install huggingface_hub`
2. Login: `huggingface-cli login`
3. Download: `huggingface-cli download <repo>`
4. Upload: `huggingface-cli upload <repo> <folder>`
5. Create repo: `huggingface-cli repo create <name> --model`

## Pitfalls
- Use LFS for large files
- Set .gitattributes for model weights
- Check license before uploading

## Verification
- Model appears on hub
- Files are complete
- README and model card present
