# Forge Agents

## Director
- Evaluates product briefs for feasibility, clarity, completeness, originality, and scope
- Decides: approved, revise, or rejected
- Classifies product domains
- Generates production plans
- Final signoff before release

## Ideation Team
### Strategist
- Market analysis, competitive landscape, business model
- Identifies risks and differentiation opportunities

### Architect
- Technical approach, system design, technology stack
- Evaluates feasibility and technical risks

### UX Thinker
- User experience, accessibility, user stories
- Ensures human-centered design

## Production Roles

### Web
- **Frontend Developer**: HTML/CSS/JS/React, responsive design, accessibility
- **Backend Developer**: APIs, databases, authentication, server logic
- **DevOps Agent**: CI/CD, deployment, monitoring

### Audio
- **DSP Engineer**: Audio signal processing, plugin DSP core
- **Audio UI Designer**: Plugin GUI, parameter layouts, user interaction
- **Audio Build Engineer**: JUCE builds, platform packaging, CI
- **Preset Architect**: Factory presets, sound design, patch organization

### Desktop
- **Systems Architect**: Native API interfaces, system integration
- **Core Developer**: Application logic, data management, algorithms
- **UI Builder**: Desktop UI framework, custom controls, theming
- **Installer Engineer**: Package managers, installers, auto-updates

### Mobile
- **Mobile Architect**: Platform-native patterns, app structure
- **Platform Integrator**: Device APIs, push notifications, App Store

### Unreal
- **Blueprint Designer**: UE Blueprints, game logic, interaction systems
- **Gameplay Programmer**: C++ gameplay systems, AI, networking
- **Shader Author**: Material editor, post-processing, VFX
- **Level Builder**: Level design, lighting, environment art

### CAD
- **Parametric Designer**: OpenSCAD/FreeCAD scripting, parametric models
- **Mechanical Engineer**: DFM analysis, tolerance, mechanisms
- **DFM Reviewer**: Manufacturing feasibility, cost optimization
- **Render Agent**: Visualization, STL validation

### Shared
- **Config Manager**: Cross-platform configuration, environment handling
- **Documentation Writer**: README, API docs, user guides

## QA Roles
- **Unit Tester**: Writes and runs unit tests for all code files
- **Integration Tester**: Builds project, runs integration tests, verifies component interaction
- **Code Reviewer**: Reviews security, style, error handling, documentation quality

## Scribe Roles
- **scribe-ideation**: Observes ideation and director sessions
- **scribe-production**: Observes production sessions
- **scribe-qa**: Observes QA sessions

## Session Management
- Sessions have message budgets per role
- Warning injected at 3 messages remaining
- Final message warning at 1 remaining
- Session shutdown triggers Scribe handoff
- Reset Orchestrator spawns fresh session with handoff context