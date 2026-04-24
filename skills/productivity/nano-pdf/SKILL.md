---
name: nano-pdf
description: "Edit PDFs with natural language commands — add text, merge, split, annotate."
version: 1.0.0
metadata:
  tekton:
    tags: ["pdf", "edit", "merge", "split"]
    category: productivity
    confidence: 0.4
---

# Nano PDF

## When to Use
- Quick PDF edits
- Merging or splitting PDFs
- Adding annotations or text

## Procedure
1. Read PDF: use PyMuPDF or pdfplumber
2. Add text: locate page and insert text box
3. Merge: combine multiple PDFs
4. Split: extract specific pages
5. Annotate: add highlights, comments, shapes
6. Save: output modified PDF

## Pitfalls
- PDF editing is lossy
- Font embedding may break
- Large PDFs may be slow

## Verification
- Output PDF opens correctly
- Text additions are visible
- Pages are in correct order after merge/split
