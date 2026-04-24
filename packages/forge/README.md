# @tekton/forge — Autonomous Product Engineering

Forge is Tekton's product engineering system. It takes ideas and builds real, shippable products through multi-agent teams with session budgets, quality gates, and cross-session continuity.

## Overview

Forge manages a pipeline from idea to release:

1. **Ideation** — Creative team generates a product brief
2. **Director Review** — Evaluates brief quality, classifies domains, generates production plan
3. **Preflight** — Checks tool availability for the target domain
4. **Production** — Role-based agents build the product in bounded sessions
5. **QA** — Unit tests, integration tests, code review, domain validation
6. **Promotion** — Beta → Release with QA signoffs
7. **Final Signoff** — Director reviews and approves

## Supported Domains

| Domain | Description |
|--------|-------------|
| vst-audio | Audio plugins (JUCE, VST3, AU) |
| web-app | Web applications (React, Node, etc.) |
| windows-desktop | Windows desktop apps |
| unreal-engine | Unreal Engine games |
| android | Android apps |
| ios | iOS apps |
| cad-physical | 3D-printed/CNC physical objects |
| html-static | Static HTML websites |
| cross-platform | Cross-platform desktop apps |

## Usage

### CLI

```bash
/tekton:forge enable          # Enable Forge
/tekton:forge new "Build a portfolio site with contact form"  # Start project
/tekton:forge status         # Show project status
/tekton:forge status <id>    # Show specific project
/tekton:forge resume <id>    # Resume a project
/tekton:forge list           # List all projects
/tekton:forge check web-app  # Preflight tool check
```

### Dashboard

- `GET /api/forge/status` — Forge status and projects
- `GET /api/forge/projects` — List all projects
- `GET /api/forge/projects/:id` — Project details
- `POST /api/forge/projects` — Create project (body: `{ brief: "..." }`)
- `POST /api/forge/projects/:id/approve` — Manual director override
- `POST /api/forge/projects/:id/reject` — Manual rejection

### Programmatic

```typescript
import { ForgeRuntime } from "@tekton/forge";

const runtime = new ForgeRuntime({ enabled: true });
const projectId = await runtime.newProject("Build a static HTML portfolio");
const status = runtime.getProjectStatus(projectId);
```

## Session Continuity

- **Scribe** observes sessions and compresses key information
- **Session Manager** enforces budgets with warnings
- **Handoff** packages state for fresh sessions
- **Reset Orchestrator** spawns new sessions with handoff context
- **File Tracker** detects changes with SHA-256 hashing

## QA Pipeline

1. **Unit Tester** — Writes and runs tests for each source file
2. **Integration Tester** — Builds project, verifies components work together
3. **Code Reviewer** — Reviews security, style, error handling
4. **Domain Validators** — Platform-specific validation (pluginval, Lighthouse, etc.)
5. **Verdict Aggregation** — Pass, conditional-pass, or fail
6. **Failure Router** — Creates retry task cards for failures
7. **Promotion** — Moves beta artifacts to release with QA signoffs

## Configuration

- `~/.tekton/forge-projects/` — Project directories
- `~/.tekton/forge-projects/<id>/forge-state.json` — Project state
- `~/.tekton/forge-projects/<id>/forge-manifest.json` — Artifact tracking
- `packages/forge/configs/scribe.json` — Scribe assignments
- `packages/forge/configs/domains/*.json` — Domain templates