---
name: obsidian
description: "Obsidian vault operations — create, search, link, and organize markdown notes."
version: 1.0.0
metadata:
  tekton:
    tags: ["obsidian", "notes", "markdown", "vault"]
    category: note-taking
    confidence: 0.5
---

# Obsidian

## When to Use
- Managing personal knowledge base
- Creating linked notes
- Organizing research

## Procedure
1. Locate Obsidian vault directory
2. Create notes as .md files with YAML frontmatter
3. Link notes with [[wiki-links]]
4. Use tags for categorization: #tag
5. Search with ripgrep across vault
6. Generate backlinks index

## Pitfalls
- Don't modify .obsidian config files directly
- Keep note titles unique in same folder
- Use consistent frontmatter schema

## Verification
- Notes appear in Obsidian
- Links resolve correctly
- Tags are consistent
