---
name: ascii-art
description: "Generate ASCII art using pyfiglet, cowsay, and boxes for headers and decoration."
version: 1.0.0
metadata:
  tekton:
    tags: ["ascii", "art", "decoration", "banner"]
    category: creative
    confidence: 0.5
---

# ASCII Art

## When to Use
- Creating CLI banners and headers
- Decorating terminal output
- Adding visual emphasis to text

## Procedure
1. Install: `pip install pyfiglet cowsay boxes`
2. Generate banner: `pyfiglet "Hello World"`
3. Add box: `echo "Hello World" | boxes -d boxblog`
4. Add cow: `cowsay "Hello World"`

## Pitfalls
- Don't use in JSON or structured output
- Keep under 80 chars wide
- Test in both light and dark terminals

## Verification
- Art renders correctly in terminal
- Alignment is correct
- No wrapping at 80 columns
