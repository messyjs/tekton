# Tekton Mobile — Feature Gap & Task List

## Feature Comparison vs Uncensored-Local-AI-Multiplatform

| Feature | Us | Them | Status |
|---------|:--:|:----:|--------|
| Dark mode (system + manual toggle) | ✅* | ✅ | ✅ Have it (system follows OS), but **no manual toggle in Settings** |
| Chat with local model | ✅ | ✅ | Done |
| Streaming responses | ✅ | ✅ | Done |
| Chat history (persistent, Hive) | ✅ | ✅ | Done |
| Download GGUF models from built-in catalog | ✅ | ✅ | Done (BuiltInModels catalog) |
| **Custom model import (URL + file picker)** | ❌ | ✅ | **MISSING — add URL input + file browser** |
| **Delete/unload models** | ❌ | ✅ | **MISSING** (ModelCatalog.deleteModel exists but no UI) |
| **Model filter (all / downloaded / uncensored / custom)** | ❌ | ✅ | **MISSING** |
| **Live tokens/sec + loading progress** | ❌ | ✅ | **MISSING** |
| Local OpenAI-compatible API server | ✅ | ✅ | Done (port 4891, shelf) |
| **API server toggle in Settings UI** | ❌ | ✅ | **MISSING** (server code exists, no on/off UI) |
| **API endpoint test page** | ❌ | ✅ | **MISSING** |
| **Listen on 0.0.0.0 vs localhost toggle** | ❌ | ✅ | **MISSING** (currently hardcoded 0.0.0.0 — **security risk!**) |
| **Custom API port** | ❌ | ✅ | **MISSING** (hardcoded 4891) |
| **Global system prompt (jailbreak per model)** | Partial | ✅ | We have per-agent systemPrompt, but **no global per-model system prompt** |
| **Inference params UI (temp, top_p, top_k, context, threads)** | Partial | ✅ | InferenceParams in AgentConfig exists, but **no UI sliders** |
| Multi-agent routing | ✅ | ❌ | We have this, they don't |
| Memory system (Ebbinghaus) | ✅ | 🔄 | They have "planned", we have it |
| Progressive install (chat → engine → model → agents) | ✅ | ❌ | Unique to us |
| Forge integration (product engineering) | ❌ | ❌ | Neither has it |
| Tool system (8 tools) | ✅ | ❌ | Unique to us |
| Secure tunnel (WireGuard/Tailscale) | ✅ | ❌ | Unique to us (code exists, no UI) |

## Task List (Priority Order)

### 🔴 Critical (Security + Core Parity)

- [ ] **1. Server bind address toggle** — Change default to `InternetAddress.loopback` (127.0.0.1). Add `0.0.0.0` as opt-in. File: `lib/domain/server/tekton_server.dart`
- [ ] **2. Server on/off toggle in Settings** — Add switch + status indicator. File: `lib/presentation/screens/settings_screen.dart`
- [ ] **3. Custom model import** — Add "Add Model" button to model catalog. Accept: GGUF URL, local file picker. File: `lib/domain/install/model_catalog.dart`, `lib/presentation/screens/model_catalog_screen.dart`
- [ ] **4. Model delete / unload UI** — Swipe-to-delete on downloaded models, load/unload toggle. File: `lib/presentation/screens/model_catalog_screen.dart`

### 🟡 Important (Feature Parity)

- [ ] **5. Dark mode manual toggle** — Settings → Appearance → Light / Dark / System. File: `lib/presentation/screens/settings_screen.dart`, `lib/app.dart`
- [ ] **6. Model filter tabs** — All / Downloaded / Custom tabs on model catalog. File: `lib/presentation/screens/model_catalog_screen.dart`
- [ ] **7. Per-model system prompt** — Each model gets its own default system prompt override. File: `lib/domain/llm/llm_backend.dart`, settings screen
- [ ] **8. Inference params UI** — Temperature, top_p, top_k, context length, thread count sliders. File: `lib/presentation/screens/agent_config_screen.dart`
- [ ] **9. Live tokens/sec + loading progress** — Show inference speed during streaming. File: `lib/presentation/screens/chat_screen.dart`, `lib/domain/llm/local_inference.dart`
- [ ] **10. Custom API port** — Editable port field in Settings → Server. File: `lib/domain/server/tekton_server.dart`, settings screen

### 🟢 Nice to Have (Competitive Edge)

- [ ] **11. API endpoint test page** — Button to test `/v1/models` and `/v1/chat/completions`. File: new `lib/presentation/screens/api_test_screen.dart`
- [ ] **12. Forge screen** — Browse Forge projects, see status, kick off new ones from mobile. Files: new `lib/presentation/screens/forge_screen.dart`, `lib/domain/forge/`
- [ ] **13. Model download progress bar** — Real-time download % with cancel. File: `lib/domain/install/install_manager.dart`, model catalog screen
- [ ] **14. Export/import conversations** — JSON export/import for chat history. File: `lib/domain/chat/chat_storage.dart`
- [ ] **15. Logs screen** — Real-time log viewer (like their logs_screen.dart). File: new `lib/presentation/screens/logs_screen.dart`

## APK Location

```
C:\Users\Massi\pi-agent\tekton\mobile\build\app\outputs\flutter-apk\app-debug.apk
```
151MB (debug, includes all ABIs + debug symbols). Release build would be ~40-50MB.