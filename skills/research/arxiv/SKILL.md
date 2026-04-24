---
name: arxiv
description: "Search and analyze arXiv papers — find, summarize, and extract key findings."
version: 1.0.0
metadata:
  tekton:
    tags: ["arxiv", "papers", "research", "academic"]
    category: research
    confidence: 0.5
---

# arXiv Search

## When to Use
- Finding relevant academic papers
- Literature review
- Staying current with research

## Procedure
1. Search arXiv API with keywords
2. Parse XML response for titles, authors, abstracts
3. Filter by date, category, relevance
4. Read abstract for relevance scoring
5. Download PDF for detailed reading

## Pitfalls
- arXiv API has rate limits
- Preprints are not peer-reviewed
- Search relevance can be noisy

## Verification
- Papers are from target domain
- Abstracts match search criteria
- Recent papers are prioritized
