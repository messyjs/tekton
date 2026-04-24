---
name: notion
description: "Notion API for creating, updating, and querying pages and databases."
version: 1.0.0
metadata:
  tekton:
    tags: ["notion", "wiki", "database", "pages"]
    category: productivity
    confidence: 0.5
---

# Notion

## When to Use
- Managing project wikis
- Tracking tasks in databases
- Creating structured content

## Procedure
1. Create integration at notion.so/my-integrations
2. Get API key and share pages with integration
3. Create pages: POST /v1/pages
4. Query databases: POST /v1/databases/{id}/query
5. Update blocks: PATCH /v1/blocks/{id}

## Pitfalls
- Integration must be explicitly shared with pages
- Rate limit: 3 requests/second
- Rich text formatting is complex

## Verification
- Pages appear in Notion
- Database queries return expected results
- Content formatting is correct
