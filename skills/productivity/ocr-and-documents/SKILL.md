---
name: ocr-and-documents
description: "PDF text extraction, OCR, and document parsing."
version: 1.0.0
metadata:
  tekton:
    tags: ["ocr", "pdf", "document", "extraction"]
    category: productivity
    confidence: 0.5
---

# OCR and Documents

## When to Use
- Extracting text from PDFs
- Scanning documents
- Converting images to text

## Procedure
1. For digital PDFs: use PyMuPDF or pdfplumber
2. For scanned images: use Tesseract OCR
3. Extract text
4. For tables: use tabula-py or camelot
5. Clean extracted text: normalize whitespace, fix encoding

## Pitfalls
- Scanned PDFs need OCR, not text extraction
- OCR accuracy depends on image quality
- Tables in PDFs are notoriously hard to extract

## Verification
- Extracted text matches visual content
- No missing pages or sections
- Tables retain structure
