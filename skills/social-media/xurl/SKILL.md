---
name: xurl
description: "X/Twitter operations via xurl CLI — post, read, search, and manage tweets."
version: 1.0.0
metadata:
  tekton:
    tags: ["twitter", "x", "social-media", "posting"]
    category: social-media
    confidence: 0.4
---

# xurl — X/Twitter CLI

## When to Use
- Posting automated tweets
- Reading tweet timelines
- Searching Twitter/X

## Procedure
1. Install xurl CLI
2. Authenticate with X API credentials
3. Post: xurl tweet "Hello world"
4. Read: xurl timeline --count 10
5. Search: xurl search "#topic" --limit 20

## Pitfalls
- Rate limits are strict (300 tweets/3hr)
- API tiers have different access levels
- Don't expose API credentials

## Verification
- Posts appear on timeline
- Search returns relevant results
- Rate limits are respected
