---
name: himalaya
description: "IMAP/SMTP email management via CLI — read, compose, send, and organize email."
version: 1.0.0
metadata:
  tekton:
    tags: ["email", "imap", "smtp", "himalaya"]
    category: email
    confidence: 0.4
---

# Himalaya Email

## When to Use
- Managing email from the terminal
- Automating email workflows
- Batch email operations

## Procedure
1. Install: cargo install himalaya
2. Configure IMAP/SMTP in config.toml
3. List: himalaya envelope list
4. Read: himalaya message read <id>
5. Compose and send

## Pitfalls
- IMAP sync can be slow on large mailboxes
- SMTP requires correct authentication
- Handle attachments carefully

## Verification
- Can list and read messages
- Sent messages appear in Sent folder
- Configuration persists across sessions
