---
name: manim-video
description: "3Blue1Brown-style math animations using Manim for educational content."
version: 1.0.0
metadata:
  tekton:
    tags: ["math", "animation", "manim", "video"]
    category: creative
    confidence: 0.4
---

# Manim Video

## When to Use
- Creating math/CS educational content
- Explaining algorithms visually

## Procedure
1. Install: `pip install manim`
2. Write scene class in Python
3. Define objects: Text, MathTex, Circle, Arrow
4. Animate: FadeIn, Transform, Write, MoveToTarget
5. Render: `manim -pql scene.py SceneName`

## Pitfalls
- Preview at LQ, final at HQ
- Coordinate system: x right, y up, origin center
- Don't forget self.wait() between animations

## Verification
- Animation plays without errors
- Visual elements positioned correctly
- Narrative flows logically
