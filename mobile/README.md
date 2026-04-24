# 📱 Tekton Mobile — Native Extensible AI Platform

A Flutter-based AI chat client and multi-agent platform that runs on Android, iOS, Windows, macOS, and Linux. Starts as a lightweight chat client and optionally expands into a full on-device inference engine with multi-agent orchestration.

## Architecture

```
mobile/
├── lib/
│   ├── main.dart                          # App entry point
│   ├── app.dart                           # MaterialApp + routing
│   ├── domain/
│   │   ├── agent/                         # Agent protocol, config, manager, routing
│   │   │   ├── agent_config.dart          # Agent schema (model, prompt, tools, routing)
│   │   │   ├── agent_manager.dart         # Create, delete, route agents
│   │   │   └── agent_protocol.dart        # Tool calls, messages, routing API
│   │   ├── llm/                           # Multi-backend LLM abstraction
│   │   │   ├── llm_backend.dart           # BackendConfig, InferenceParams, LlmResponse
│   │   │   ├── backend_manager.dart       # Unified backend registry & chat dispatch
│   │   │   ├── local_inference.dart       # llama.cpp FFI bindings for on-device inference
│   │   │   └── remote_api.dart            # OpenAI, Anthropic, Ollama adapters
│   │   ├── chat/                          # Chat core
│   │   │   ├── chat_message.dart           # Message model with metadata
│   │   │   ├── conversation.dart           # Conversation model (multi-thread, agent assignment)
│   │   │   ├── chat_storage.dart           # Hive persistence layer
│   │   │   └── chat_controller.dart        # Stream controller, agent routing, tool calls
│   │   ├── tools/                         # Tool system (Pi Agent compatible format)
│   │   │   ├── tool_types.dart             # ToolDefinition, BaseTool, ToolCategory
│   │   │   ├── tool_registry.dart          # Registry & execution engine
│   │   │   ├── filesystem_tool.dart        # Read, write, list, search (scoped + full)
│   │   │   ├── web_search_tool.dart        # DuckDuckGo search + content extraction
│   │   │   ├── calculator_tool.dart        # Safe math evaluator + unit conversion
│   │   │   ├── doc_analyzer_tool.dart      # RAG over documents (PDF, code, text)
│   │   │   ├── image_analyzer_tool.dart     # Vision analysis (Gemma 4 E4B)
│   │   │   ├── system_info_tool.dart        # Device info, CPU, RAM, storage
│   │   │   └── code_exec_tool.dart          # Sandboxed Python/JS execution
│   │   ├── install/                        # Progressive install system
│   │   │   ├── install_state.dart           # CHAT_ONLY → ENGINE → MODEL → AGENTS states
│   │   │   ├── install_manager.dart         # Engine download, SHA-256 verification
│   │   │   └── model_catalog.dart           # Model catalog, download w/ resume, RAM check
│   │   ├── memory/                         # AI memory system
│   │   │   └── memory_store.dart            # Ebbinghaus forgetting curve, CRUD, search
│   │   ├── server/                         # Server mode
│   │   │   ├── tekton_server.dart            # OpenAI-compatible multi-model server (port 4891)
│   │   │   ├── discovery_service.dart        # mDNS/Bonjour auto-discovery
│   │   │   └── secure_tunnel.dart            # TLS proxy, WireGuard, Tailscale
│   │   └── config/
│   │       ├── app_config.dart              # Encrypted settings, install state, preferences
│   │       └── registry.dart                # Hive adapter registration
│   ├── presentation/
│   │   ├── theme/app_theme.dart             # Material 3 theme (light + dark)
│   │   ├── providers/app_providers.dart     # Riverpod providers
│   │   ├── screens/
│   │   │   ├── onboarding_screen.dart       # Setup wizard (Cloud/Local/Hybrid)
│   │   │   ├── chat_screen.dart             # Main chat with streaming, file attachments
│   │   │   ├── settings_screen.dart         # Backend management, install state, server mode
│   │   │   ├── agent_config_screen.dart      # Create/edit agents with presets
│   │   │   ├── model_catalog_screen.dart      # Browse, download, manage models
│   │   │   └── memory_browser_screen.dart     # View, search, prune memories
│   │   └── widgets/
│   │       ├── agent_switch_bar.dart         # Quick-switch agents in chat
│   │       ├── file_attachment_widget.dart    # File/folder cards in messages
│   │       └── streaming_indicator.dart       # Real-time token stream cursor
│   └── services/
│       └── logger.dart                      # Structured logging
└── android/                                # Android manifests + security config
```

## Progressive Install States

| State | Description | Features |
|-------|-------------|----------|
| CHAT_ONLY | Base APK (~15-20MB) | Remote backend chat only |
| ENGINE_INSTALLED | llama.cpp downloaded | Local inference available |
| MODEL_LOADED | GGUF model downloaded | On-device AI chat |
| AGENTS_CONFIGURED | Agents created & assigned | Multi-agent orchestration |

## Agent Protocol

Every agent is an instance of the same JSON schema, compatible with Pi Agent's tool format:

```json
{
  "id": "preset-code",
  "displayName": "Code Agent",
  "systemPrompt": "You are Tekton Code Agent...",
  "modelRef": "glm-5.1",
  "backendId": "remote-glm",
  "enabledTools": ["filesystem", "codeExec", "webSearch"],
  "taskAffinities": ["coding"],
  "priority": 10,
  "inferenceParams": { "temperature": 0.2, "topP": 0.95 }
}
```

## Routing Modes

- **Director** — Gemma 4 E2B classifies each message and routes to best agent
- **User** — @-mention specific agents, or set per-conversation default
- **Pipeline** — Chain agents sequentially (output → next agent input)

## Tool System (8 tools)

| Tool | Description | Assignment |
|------|-------------|-----------|
| FileSystem | Read, write, search device files | Gemma 4 E4B |
| WebSearch | Search web, extract content | Gemma 4 E2B + GLM-5.1 |
| CodeExec | Run Python/JS in sandbox | GLM-5.1 |
| Calculator | Math + unit conversion | Gemma 4 E2B |
| DocAnalyzer | RAG over PDF/DOCX/code | Gemma 4 E4B |
| ImageAnalyzer | Vision analysis | Gemma 4 E4B |
| SystemInfo | Device stats, CPU, RAM | Gemma 4 E2B |

## Model Roster

| Model | Size | Role | Deployment |
|-------|------|------|-----------|
| GLM-5.1 | 754B (40B active) | Director, code gen | Remote server only |
| Gemma 4 E4B | ~5GB Q4 | Primary on-device | Local (flagship phones) |
| Gemma 4 E2B | ~3.2GB Q4 | Quick chat, routing | Local (all phones) |

## Quick Start

```bash
cd mobile
flutter pub get
flutter run
```

### First Run

1. Choose: **Cloud Chat**, **Local AI**, or **Hybrid**
2. Enter API keys for cloud backends (if selected)
3. Download inference engine and models (if local/hybrid)
4. Start chatting

## Development

```bash
# Run tests
flutter test

# Build APK
flutter build apk

# Build Windows
flutter build windows

# Generate Hive adapters (run after model changes)
dart run build_runner build
```

## License

MIT