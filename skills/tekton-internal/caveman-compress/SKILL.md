---
name: caveman-compress
description: "Compression rules for reducing token usage in communication."
version: 1.0.0
metadata:
  tekton:
    tags: ["compression", "tokens", "caveman", "efficiency"]
    category: tekton-internal
    confidence: 0.7
---

# Caveman Compress

## When to Use
- Context window approaching limits
- Reduce token usage by 50-75%
- Preserve technical accuracy while cutting noise

## Procedure
1. Identify compression tier: none, lite, full, ultra
2. none: no compression
3. lite: remove articles, contractions, filler words
4. full: lite + phrase substitution + brevity patterns
5. ultra: full + abbreviation dictionary
6. Never compress code blocks, URLs, or quoted strings

## Pitfalls
- Don't compress code — it's already dense
- Ultra mode may lose important context
- Always preserve numbers and technical terms

## Verification
- Compressed version preserves all technical substance
- Compression ratio is 0.25-0.75
- Key terms are retained
