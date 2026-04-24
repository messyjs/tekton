/// Hive adapter registry — central place to register all type adapters.
import 'package:hive_flutter/hive_flutter.dart';
import 'adapters.dart';

class Registry {
  static bool _initialized = false;

  static Future<void> init() async {
    if (_initialized) return;

    Hive.registerAdapter(AgentConfigAdapter());
    Hive.registerAdapter(BackendConfigAdapter());
    Hive.registerAdapter(ChatMessageAdapter());
    Hive.registerAdapter(ConversationAdapter());
    Hive.registerAdapter(ModelEntryAdapter());
    Hive.registerAdapter(MemoryEntryAdapter());
    Hive.registerAdapter(AppConfigAdapter());
    Hive.registerAdapter(ApiProviderAdapter());
    Hive.registerAdapter(DeviceTierAdapter());
    Hive.registerAdapter(MemoryTypeAdapter());
    Hive.registerAdapter(AgentRoleAdapter());

    _initialized = true;
  }
}