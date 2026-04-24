---
name: p5js
description: "p5.js interactive generative art — create visual sketches with JavaScript."
version: 1.0.0
metadata:
  tekton:
    tags: ["generative-art", "p5js", "creative-coding", "visualization"]
    category: creative
    confidence: 0.5
---

# p5.js Generative Art

## When to Use
- Creating interactive visualizations
- Generative art projects
- Creative coding experiments

## Procedure
1. Create HTML with p5.js CDN
2. Write setup() — canvas size, initial state
3. Write draw() — animation loop
4. Use p5 primitives: circle(), rect(), line(), text()
5. Add interactivity: mousePressed(), keyPressed()
6. Export: saveCanvas() for PNG

## Pitfalls
- Watch performance in draw() — avoid allocations each frame
- Use noLoop() for static sketches
- Random seeds for reproducible art

## Verification
- Sketch runs in browser without errors
- Interaction works as expected
- Visual output matches intent
