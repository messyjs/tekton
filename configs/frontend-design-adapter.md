# Tekton Frontend Design Skill

## Overview

Adapts the Claude Code frontend-design plugin for Tekton. Instead of relying on Claude Code's plugin system, this implements the same design skill as a **Gemini sub-agent** that can generate, review, and refine Tekton's frontend components.

## Architecture

The Claude Code plugin works by:
1. Detecting frontend-related tasks
2. Loading a SKILL.md prompt with design principles
3. Using those principles to generate better code

For Tekton, we implement this as:
1. A dedicated Gemini endpoint (`/api/design`) that receives design requests
2. The SKILL.md prompt as a system instruction
3. Current Tekton component code + CSS variables passed as context
4. Gemini generates refined/improved components following the design principles

## Endpoints

- POST `/api/design/generate` - Generate new component from description
- POST `/api/design/refine` - Refine existing component with design principles
- GET `/api/design/components` - List available Tekton components for context
- POST `/api/design/preview` - Generate standalone HTML preview

## Current Tekton Design Language

- **Theme**: Dark cyberpunk (deep navy/black bg, neon cyan #00d4ff, green #00ff88, red #ff3355)
- **Fonts**: JetBrains Mono (mono), Space Grotesk (sans)  
- **CSS Variables**: --bg, --bg2, --surface, --surface2, --border, --neon, --green, --red, --text, --text2
- **Components**: Rail nav, Topbar, Engine selector, Ticker dropdown, Hero block, Signal cards, Chart panels
- **Frameworks**: React (createElement), LightweightCharts, no build step (vanilla HTML/JS/CSS)
- **No emoji** in UI text (per user preference)

## Design Principles (from SKILL.md)

1. **Bold aesthetic** - Avoid generic AI aesthetics, commit to a direction
2. **Typography** - Distinctive fonts, avoid Inter/Roboto/Arial. We use Space Grotesk + JetBrains Mono
3. **Color** - Dominant with sharp accents, CSS variables for consistency
4. **Motion** - CSS animations, staggered reveals, hover states
5. **Spatial composition** - Unexpected layouts, asymmetry, overlap
6. **Backgrounds** - Gradient meshes, noise textures, geometric patterns, depth
7. **Production-grade** - Real working code, not mockups