---
name: minecraft-modpack-server
description: "Set up and manage Minecraft modded servers with modpack support."
version: 1.0.0
metadata:
  tekton:
    tags: ["minecraft", "server", "modpack", "gaming"]
    category: gaming
    confidence: 0.3
---

# Minecraft Modpack Server

## When to Use
- Hosting modded Minecraft
- Managing modpack updates
- Setting up multiplayer servers

## Procedure
1. Install Java 17+
2. Download server jar (Forge/Fabric/Quilt)
3. Accept EULA: echo eula=true > eula.txt
4. Install mods into mods/ directory
5. Configure server.properties
6. Start: java -Xmx4G -jar server.jar

## Pitfalls
- Allocate enough RAM (4G+ for modded)
- Mod version compatibility is critical
- Backup world before updates

## Verification
- Server starts without errors
- Players can connect
- Mods load correctly
