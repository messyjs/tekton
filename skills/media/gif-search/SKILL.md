---
name: gif-search
description: "Search Tenor for GIFs to use in messages and responses."
version: 1.0.0
metadata:
  tekton:
    tags: ["gif", "tenor", "search", "reaction"]
    category: media
    confidence: 0.3
---

# GIF Search

## When to Use
- Adding visual reactions in chat
- Finding relevant GIFs for responses

## Procedure
1. Get Tenor API key from tenor.com
2. Search: Tenor API search endpoint
3. Parse results for GIF URLs
4. Select best match

## Pitfalls
- API key must be kept secret
- Some queries return unexpected results
- Rate limits: 10 req/sec for free tier

## Verification
- GIF URL is accessible
- Content is appropriate
- Matches the search query
