---
name: powerpoint
description: "PPTX creation and editing — generate slides, add content, format presentations."
version: 1.0.0
metadata:
  tekton:
    tags: ["powerpoint", "pptx", "slides", "presentation"]
    category: productivity
    confidence: 0.4
---

# PowerPoint

## When to Use
- Creating presentations programmatically
- Generating reports as slides
- Batch-producing training materials

## Procedure
1. Install: pip install python-pptx
2. Create: prs = Presentation()
3. Add slide: slide = prs.slides.add_slide(layout)
4. Add content: text boxes, shapes, charts, images
5. Save: prs.save('output.pptx')

## Pitfalls
- Slide layouts vary by template
- Font sizing needs manual adjustment
- Images may need resizing

## Verification
- PPTX opens in PowerPoint/LibreOffice
- Content is on correct slides
- Formatting is consistent
