# Adaptive Model Routing

## How It Works

Tekton's model router sends simple prompts to fast/cheap models and complex prompts to deep/expensive models, automatically.

### Complexity Scoring

Each prompt is scored from 0.0 (trivial) to 1.0 (extremely complex) based on:

| Signal | Weight | Example |
|--------|--------|---------|
| Token count (log scale) | 0.3 | 10 tokens → 0.1, 1000 → 0.75 |
| Code blocks presence | 0.15 | ```function``` → +0.15 |
| Matching skills count | 0.15 | 3 skills → +0.15 |
| Multi-step keywords | 0.2 | "then", "after", "next" |
| Domain keywords | 0.1 | "architect", "design", "implement" |
| Session history | 0.05 | Average of last 3 scores |

### Routing Decisions

| Complexity | Route | Model | Cost |
|-----------|-------|-------|------|
| 0.0 – 0.3 | Fast | gemma3:4b | Low |
| 0.3 – 0.6 | Default | gemma3:12b | Medium |
| 0.6 – 1.0 | Deep | gemma3:27b | High |

### Rule Engine

Custom routing rules override complexity-based routing:

```yaml
rules:
  - name: "code-generation"
    priority: 100
    enabled: true
    condition:
      hasCodeBlocks: true
      skillsMatch: ["coding", "refactoring"]
    action:
      model: "deep"
      provider: "ollama"
```

Rules are evaluated in priority order. First match wins.

### Fallback Chains

When a model fails, the router tries alternatives:

```
deep → medium → fast → last-resort
```

Each fallback is tracked in telemetry for cost analysis.

### Cost Optimization

- Auto-downgrades on budget thresholds
- Tracks cost per model/provider/session/day
- Reports savings from routing decisions
- Compresses prompts before sending to reduce token costs