---
name: google-workspace
description: "Gmail, Calendar, Drive, Sheets, and Docs integration for productivity automation."
version: 1.0.0
metadata:
  tekton:
    tags: ["google", "gmail", "calendar", "drive", "sheets"]
    category: productivity
    confidence: 0.5
---

# Google Workspace

## When to Use
- Automating email workflows
- Managing calendar events
- Reading/writing Google Sheets
- Accessing Drive files

## Procedure
1. Enable Google Workspace APIs in Google Cloud Console
2. Create OAuth2 credentials
3. Authenticate with google-auth library
4. Use respective API clients
5. Handle pagination for large result sets

## Pitfalls
- OAuth scopes must be minimal
- Rate limits: respect quota
- Handle auth token refresh

## Verification
- API calls return expected data
- No permission errors
- Pagination works correctly
