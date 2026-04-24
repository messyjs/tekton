---
name: blogwatcher
description: "Monitor RSS feeds for new content from tech blogs and news sources."
version: 1.0.0
metadata:
  tekton:
    tags: ["rss", "monitoring", "blogs", "news"]
    category: research
    confidence: 0.4
---

# Blogwatcher

## When to Use
- Monitoring tech blogs for new posts
- Tracking information sources
- Competitive intelligence

## Procedure
1. Collect RSS feed URLs
2. Parse feeds: use feedparser library
3. Extract title, link, date, summary
4. Filter by keywords
5. Deduplicate and sort by date
6. Summarize relevant posts

## Pitfalls
- Some sites have broken RSS
- Rate limits on frequent polling
- Handle encoding issues gracefully

## Verification
- All monitored feeds returning data
- No duplicates in output
- Key posts are not missed
