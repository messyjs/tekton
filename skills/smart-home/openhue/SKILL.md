---
name: openhue
description: "Philips Hue control — lights, scenes, groups, and schedules."
version: 1.0.0
metadata:
  tekton:
    tags: ["hue", "lights", "smart-home", "automation"]
    category: smart-home
    confidence: 0.4
---

# OpenHue

## When to Use
- Controlling Philips Hue lights
- Setting up scenes and schedules
- Home automation routines

## Procedure
1. Discover bridge: curl https://discovery.meethue.com/
2. Register app: POST to /api with devicetype
3. Control lights: PUT /api/{username}/lights/{id}/state
4. Create scenes: PUT /api/{username}/scenes
5. Set schedules: PUT /api/{username}/schedules

## Pitfalls
- Bridge must be on same network
- Rate limit: max 10 commands per second
- Link button must be pressed for initial registration

## Verification
- Lights respond to commands
- Scenes activate correctly
- Schedules fire at configured times
