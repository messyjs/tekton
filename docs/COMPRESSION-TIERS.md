# Compression Tiers

## Three-Tier Compression System

Tekton uses a three-tier compression system that progressively reduces context size to stay within token budgets while preserving key information.

## Tiers

### Tier 1: Lite (~10-20% reduction)
- Remove excessive whitespace
- Normalize formatting
- Trim redundant punctuation
- Preserve all semantic content
- Use for: Short prompts, simple queries, real-time chat

### Tier 2: Compact (~40-60% reduction)
- All lite transformations
- Aggressive summarization
- Keep key entities, numbers, code structure
- Remove conversational filler
- Use for: Medium prompts, general tasks, session context

### Tier 3: Full / Caveman (~70-90% reduction)
- All compact transformations
- Ultra-compressed "caveman" format
- Key concepts only, no filler
- Symbols and abbreviations
- Use for: Very long contexts, memory-constrained sessions, historical context

## Auto-Detection

`detectTier()` automatically selects the appropriate tier based on:
- Input length (longer → more aggressive)
- Content type (code → lighter touch)
- Token count estimates

```typescript
import { compress, detectTier } from "@tekton/core";

const text = "Very long conversation history...";
const tier = detectTier(text);  // Returns "lite" | "compact" | "full"
const compressed = compress(text, tier);
```

## Token Savings

| Original Tokens | After Lite | After Compact | After Full |
|----------------|------------|---------------|------------|
| 1,000 | ~900 | ~500 | ~100-200 |
| 5,000 | ~4,500 | ~2,500 | ~500-1,000 |
| 10,000 | ~9,000 | ~5,000 | ~1,000-2,000 |

## Metrics

The `CompressionMetrics` class tracks:
- Original vs compressed length
- Compression ratio
- Estimated tokens saved
- Tier used per compression event

All metrics are persisted to the telemetry SQLite database for analysis via the dashboard.