---
name: pokemon-player
description: "Auto-play Pokemon games using emulator control and AI decision-making."
version: 1.0.0
metadata:
  tekton:
    tags: ["pokemon", "emulator", "ai-player", "gaming"]
    category: gaming
    confidence: 0.2
---

# Pokemon Player

## When to Use
- AI-driven Pokemon gameplay
- Testing battle strategies
- Automating grinding

## Procedure
1. Set up emulator (mGBA recommended)
2. Configure memory mappings for game state
3. Implement battle AI: type effectiveness, switching logic
4. Route planning: minimize random encounters
5. Save state management for risk-free exploration

## Pitfalls
- Memory addresses differ between ROM versions
- Battle AI needs type matchup tables
- Soft locks in certain routes

## Verification
- AI can navigate routes
- Battle decisions are optimal
- No stuck states
