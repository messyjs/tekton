# ── Tekton LLM Infrastructure ──
# Updated: 2026-05-07

## WORKSTATION (.60) - HP Z820
# CPU: 2x Intel Xeon E5-2670 (16C/32T @ 2.60GHz, Sandy Bridge-EP)
# RAM: 131 GB DDR3-1333 (16x 8GB, 8 per CPU socket)
# GPU: NVIDIA Quadro M2000 4GB GDDR5, CUDA 11.6, **Maxwell Compute 5.0**
# Storage: C: 500GB SSD (139GB free), E: 6TB HDD (4.5TB free), F: 500GB SSD (348GB free)
# OS: Windows 10 Pro, Hyper-V enabled
# Ollama: v0.23.0 running at 192.168.68.60:11434
#
# CRITICAL: Both GPUs (Quadro M2000 + GTX 960M) are Maxwell (Compute 5.0).
# Modern llama.cpp requires Compute 6.0+ (Pascal). GPU offload (-ngl) does NOT work.
# Both machines must run CPU-only inference.
#
# The workstation's strength is 131GB RAM + 32 threads - can run ANY model on CPU.
# Current Ollama speed: deepseek-r1:8b @ ~4.8 tok/s (underusing threads)

## LAPTOP (.61) - DESKTOP-HQTVA5S
# CPU: Intel i7-6700HQ (4C/8T @ 2.60GHz)
# RAM: 16 GB DDR4
# GPU: NVIDIA GTX 960M 4GB (Maxwell, Compute 5.0 - NOT usable for llama.cpp)
# Storage: D: 82GB free / 931GB total
# Ollama: v0.23.0 running locally

## 75% POWER SETTINGS

### Workstation (24 of 32 threads, ~98GB of 131GB RAM):
# Ollama environment:
set OLLAMA_NUM_PARALLEL=1
set OLLAMA_MAX_LOADED_MODELS=1
set OLLAMA_FLASH_ATTENTION=1
set OLLAMA_KEEP_ALIVE=30m
ollama serve

# llama.cpp (like Codacus video, but CPU-only):
# Download: https://github.com/ggergan/llama.cpp/releases
# Get: llama-*-win-cpu-avx2*.zip
llama-server -m deepseek-r1-32b-Q4_K_M.gguf -ngl 0 -t 24 -c 8192 --host 0.0.0.0 --port 8080
llama-server -m qwen3.5-27b-Q4_K_M.gguf -ngl 0 -t 24 -c 8192 --host 0.0.0.0 --port 8080

### Laptop (6 of 8 threads, 11GB of 16GB RAM):
# .wslconfig:
[wsl2]
memory=11GB
swap=4GB
processors=6

# Ollama environment:
set OLLAMA_NUM_PARALLEL=1
set OLLAMA_MAX_LOADED_MODELS=1
set OLLAMA_FLASH_ATTENTION=1
ollama serve

# Best models for laptop (CPU-only, limited RAM):
ollama pull qwen3:1.7b        # 1.4GB, ~15-20 tok/s on laptop CPU
ollama pull deepseek-r1:1.5b  # 1.1GB, ~20 tok/s
ollama pull deepseek-r1:8b     # 4.9GB, ~3-5 tok/s (slow but works)

## MODEL RECOMMENDATIONS

| Model          | Size  | Workstation tok/s (est 24t) | Laptop tok/s (est 6t) | Best For |
|----------------|-------|------------------------------|----------------------|----------|
| qwen3:1.7b     | 1.4GB | 40-50                        | 15-20                | Fast chat |
| deepseek-r1:1.5b | 1.1GB | 40-50                        | 20-25                | Quick reasoning |
| granite4.1:3b  | 2.0GB | 25-35                        | 10-15                | General |
| deepseek-r1:8b | 4.9GB | 18-22                        | 3-5                  | Deep reasoning |
| gemma4:26b     | 8.9GB | 8-12                         | N/A (too slow)       | Balanced |
| qwen3.5-27b    | 15.4GB | 4-6                         | N/A                  | High quality |
| deepseek-r1:32b | 18.5GB | 4-6                         | N/A                  | Deep analysis |

## CONNECTING LAPTOP TO WORKSTATION
# In Tekton config (configs/models.json), already set:
# "ollama": { "baseUrl": "http://192.168.68.60:11434" }
#
# Or set on laptop:
set OLLAMA_HOST=http://192.168.68.60:11434
ollama run deepseek-r1:32b   # Runs on workstation