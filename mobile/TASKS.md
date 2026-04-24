# Tekton Mobile — Feature Gap & Task List

## Completed Tasks

- [x] ~~Dark mode manual toggle~~ — Done (Settings > Appearance > Dark/Light/System)
- [x] ~~Server on/off toggle in Settings~~ — Done
- [x] ~~Server port configuration~~ — Done
- [x] ~~Server bind address toggle (localhost vs 0.0.0.0)~~ — Done (defaults to localhost)
- [x] ~~Custom model import (GGUF URL)~~ — Done (Add Model button in catalog)
- [x] ~~Model filter tabs (All/Downloaded/Custom)~~ — Done
- [x] ~~Model delete with confirmation~~ — Done
- [x] ~~Per-model system prompt~~ — Done (edit backend > system prompt)
- [x] ~~Inference params UI~~ — Done (temperature, top_p, top_k, context, threads)
- [x] ~~Remove all emojis~~ — Done (Material Icons + text tags)
- [x] ~~New app icon~~ — Done (dark bg, teal T)
- [x] ~~Crash fix: removed TektonServerService from manifest~~ — Done
- [x] ~~Crash fix: Hive init is now crash-safe with recovery~~ — Done
- [x] ~~Network security config fixed~~ — Done

## Pending Tasks

### High Priority
- [ ] **1. Tokens/sec display** — Show inference speed during streaming. File: `chat_screen.dart`, `local_inference.dart`
- [ ] **2. Model download progress bar** — Real-time download % with cancel. File: `install_manager.dart`, model catalog screen
- [ ] **3. API endpoint test page** — Button to test /v1/models and /v1/chat/completions. File: new `api_test_screen.dart`
- [ ] **4. 3D Print File Generator** — User describes a part or shares a part number, AI generates STL/OBJ for 3D printing. File: new `domain/printing/` directory, new screen

### Nice to Have
- [ ] **5. Export/import conversations** — JSON export/import for chat history
- [ ] **6. Logs screen** — Real-time log viewer. File: new `logs_screen.dart`
- [ ] **7. Forge screen** — Browse Forge projects, see status, kick off new ones from mobile
- [ ] **8. Secure tunnel UI** — WireGuard/Tailscale configuration screen

## 3D Printing Feature Design

### User Flow
1. User opens "3D Print" tab in app
2. Options:
   - **Text to CAD**: Describe a part ("bracket that fits a 2x4 and holds a 1/2 pipe") → AI generates OpenSCAD code → renders STL
   - **Part Number Lookup**: Enter a part number ("IKEA 101761") → AI searches for dimensions → generates CAD model
   - **Photo to CAD**: Take photo of a part → AI estimates dimensions → generates model
3. Preview the 3D model in-app (simple wireframe viewer)
4. Export as STL, OBJ, or 3MF for printing
5. Share directly to slicer apps (PrusaSlicer, Cura, etc.)

### Architecture
```
domain/printing/
├── cad_generator.dart      # OpenSCAD code generation via LLM
├── stl_exporter.dart        # Convert OpenSCAD output to STL binary
├── part_catalog.dart        # Known part dimensions database
├── model_previewer.dart    # Simple 3D wireframe renderer (OpenGL/Metal)
└── print_coordinator.dart  # Orchestrate generation → preview → export
```

### Implementation Notes
- OpenSCAD is the easiest intermediate format (text-based, LLM can generate it)
- STL export from OpenSCAD data structures is straightforward (triangulated mesh)
- For preview: use `flutter_opengl` or `three_dart_jsm` for in-app 3D viewing
- Part catalog: start with common fasteners, brackets, and mechanical parts
- Photo to CAD: use local vision model (Gemma 4 multimodal) or remote API
- The same local LLM infrastructure (llama.cpp) drives the CAD generation

## APK Build Location

```
C:\Users\Massi\pi-agent\tekton\mobile\build\app\outputs\flutter-apk\app-arm64-v8a-release.apk  (21MB)
C:\Users\Massi\pi-agent\tekton\mobile\build\app\outputs\flutter-apk\app-release.apk             (21MB)
```