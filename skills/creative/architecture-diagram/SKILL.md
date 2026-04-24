---
name: architecture-diagram
description: "Create dark-themed SVG system diagrams showing components and data flow."
version: 1.0.0
metadata:
  tekton:
    tags: ["diagram", "architecture", "svg", "visualization"]
    category: creative
    confidence: 0.6
---

# Architecture Diagram

## When to Use
- Documenting system design
- Explaining architecture to stakeholders
- Onboarding new team members

## Procedure
1. Identify components and their relationships
2. Choose layout: hierarchical, layered, or network
3. Create SVG with dark theme (#1a1a2e bg, #0f3460 nodes, #e94560 accents)
4. Add component boxes with labels
5. Draw arrows for data flow
6. Add legend and notes

## Pitfalls
- Don't over-complicate — focus on key components
- Use consistent styling for similar components
- Include directionality on all arrows

## Verification
- All major components are represented
- Data flows are correct and directional
- Diagram is readable at both small and large sizes
