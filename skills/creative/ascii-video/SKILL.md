---
name: ascii-video
description: "Pipeline for converting video to ASCII art animation frames."
version: 1.0.0
metadata:
  tekton:
    tags: ["video", "ascii", "animation", "conversion"]
    category: creative
    confidence: 0.4
---

# ASCII Video

## When to Use
- Creating terminal-based video content
- Visual demonstrations in text environments

## Procedure
1. Extract frames: `ffmpeg -i input.mp4 frames/%04d.png`
2. Convert each frame to ASCII using Python PIL
3. Resize to terminal dimensions
4. Assemble: loop through frames with clear screen between each
5. Optional: add color via ANSI codes

## Pitfalls
- Frame rate must match terminal refresh capability
- High resolution creates too many characters
- Color adds significant complexity

## Verification
- Animation plays smoothly
- Characters are recognizable
- Terminal size accommodates the output
