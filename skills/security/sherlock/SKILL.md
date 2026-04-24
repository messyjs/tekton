---
name: sherlock
description: "Username reconnaissance — search social media platforms for username availability."
version: 1.0.0
metadata:
  tekton:
    tags: ["sherlock", "username", "osint", "reconnaissance"]
    category: security
    confidence: 0.3
---

# Sherlock Username Search

## When to Use
- Checking username availability
- OSINT username research
- Account discovery

## Procedure
1. Install: pip install sherlock-project
2. Search: sherlock username
3. Filter results by platform
4. Analyze found accounts

## Pitfalls
- Some platforms rate-limit
- False positives from similar usernames
- Results may include deleted accounts

## Verification
- Confirmed accounts match username exactly
- Platform URLs are valid
- No false positives from similar names
