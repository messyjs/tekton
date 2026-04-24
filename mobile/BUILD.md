# Tekton Mobile — Build & Development Guide

## Prerequisites

- Flutter 3.41+ (stable channel)
- Android SDK (compileSdk 35, minSdk 24)
- Android NDK 27.0.12077973 (for llama.cpp FFI)
- Java 17+ (JBR from Android Studio works)
- Visual Studio 2022+ (for Windows builds)
- Xcode 15+ (for macOS builds)

## Environment Setup

```bash
# Install Flutter
git clone https://github.com/flutter/flutter.git --depth 1 -b stable
export PATH="$HOME/flutter/bin:$PATH"

# Verify
flutter doctor

# Set Android SDK
export ANDROID_HOME="$HOME/Android/Sdk"
export JAVA_HOME="/path/to/jbr"
```

## Quick Start

```bash
cd mobile
flutter pub get
flutter run                    # Debug on connected device
flutter run -d windows         # Windows desktop
flutter run -d chrome          # Web
```

## Build

```bash
flutter build apk              # Android APK
flutter build appbundle        # Android App Bundle
flutter build windows          # Windows
flutter build macos            # macOS
flutter build web              # Web
```

## Architecture Overview

```
mobile/lib/
├── main.dart                  # Entry: Hive init, adapter registration, ProviderScope
├── app.dart                   # MaterialApp with theme & routing
│
├── domain/                    # Pure Dart business logic (no Flutter deps)
│   ├── agent/                 # Agent protocol, config, manager
│   ├── llm/                   # Multi-backend LLM abstraction
│   ├── chat/                  # Chat messages, conversations, storage, controller
│   ├── tools/                 # 8 tools (filesystem, web, code, calc, doc, image, system)
│   ├── install/               # Progressive install states & engine download
│   ├── memory/                # Cross-conversation AI memory (Ebbinghaus decay)
│   ├── server/                # OpenAI-compatible server, mDNS discovery, TLS tunnel
│   └── config/                # App config, Hive adapters, registry
│
├── presentation/              # Flutter UI layer
│   ├── theme/                 # Material 3 theme
│   ├── providers/             # Riverpod state management
│   ├── screens/               # 7 screens (onboarding, chat, settings, agents, models, memory, server)
│   └── widgets/               # Reusable widgets
│
└── services/                  # Cross-cutting services
    └── logger.dart
```

## Key Design Decisions

### No hive_generator
The `hive_generator` package conflicts with `riverpod_generator` due to incompatible
`analyzer` version requirements. All Hive adapters are hand-written in
`domain/config/adapters.dart`.

### ApiProvider as class (not enum)
`ApiProvider` is implemented as a class with static const instances (like `ApiProvider.openai`)
instead of a Dart enum. This allows adding custom providers at runtime without
modifying the enum definition. Switch statements use `if-else` instead.

### Progressive Install
The app starts as a lightweight chat client (~15-20MB). The llama.cpp engine and
models are downloaded on-demand:
1. `CHAT_ONLY` — Remote backends only
2. `ENGINE_INSTALLED` — llama.cpp .so loaded
3. `MODEL_LOADED` — GGUF model ready
4. `AGENTS_CONFIGURED` — Multi-agent mode active

### Agent Protocol
Every agent (local or remote) is an instance of `AgentConfig`, compatible with
Pi Agent's tool-calling format. The `AgentProtocol` class defines the JSON schema,
message format, and tool call structures.

## Testing

```bash
flutter test                   # Unit tests
flutter test --coverage        # With coverage
flutter drive --target=test_driver/app.dart  # Integration tests
```

## Generating Code

```bash
# If you add new Hive models, add adapters to domain/config/adapters.dart manually
# If you add new Riverpod providers, add to presentation/providers/app_providers.dart
```

## Platform-Specific Notes

### Android
- Network security config allows cleartext to localhost (for local server)
- Backup rules exclude downloaded models and engine (too large)
- Permissions: INTERNET, storage, record audio, vibrate
- NDK required for llama.cpp FFI (arm64-v8a, armeabi-v7a)

### Windows
- Requires Visual Studio Build Tools
- CMake-based build system

### macOS
- Requires Xcode
- Entitlements for network access

### Web
- Works for chat with remote backends
- No local inference (no FFI support in browsers)
- No server mode

## Troubleshooting

### Flutter analyze shows 0 errors
```bash
flutter analyze
# Should show: 0 errors, some warnings/infos
```

### Android build fails
- Check `ANDROID_HOME` is set
- Check NDK is installed: `ls $ANDROID_HOME/ndk/`
- Check Java version: `java -version` (must be 17+)

### iOS build
- Not yet configured — needs CocoaPods setup
- Add to `pubspec.yaml` if needed: `flutter create --platforms ios .`