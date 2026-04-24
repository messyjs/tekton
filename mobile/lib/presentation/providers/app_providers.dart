/// Riverpod providers for the Tekton app

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tekton_app/domain/agent/agent.dart';
import 'package:tekton_app/domain/llm/llm.dart';
import 'package:tekton_app/domain/chat/chat.dart';
import 'package:tekton_app/domain/tools/tools.dart';
import 'package:tekton_app/domain/install/install.dart';
import 'package:tekton_app/domain/memory/memory.dart';
import 'package:tekton_app/domain/server/server.dart';
import 'package:tekton_app/domain/config/config.dart';

// === Config ===
final appConfigProvider = FutureProvider<AppConfig>((ref) => AppConfig.load());

final onboardingCompleteProvider = StateProvider<bool>((ref) => false);

// === Agent ===
final agentManagerProvider = Provider<AgentManager>((ref) => AgentManager.instance);

final allAgentsProvider = Provider<List<AgentConfig>>((ref) {
  final manager = ref.watch(agentManagerProvider);
  return manager.allAgents;
});

// === LLM ===
final backendManagerProvider = Provider<BackendManager>((ref) => BackendManager.instance);

final backendsProvider = Provider<List<BackendConfig>>((ref) {
  final manager = ref.watch(backendManagerProvider);
  return manager.backends;
});

final defaultBackendProvider = Provider<BackendConfig?>((ref) {
  final manager = ref.watch(backendManagerProvider);
  return manager.defaultBackend;
});

// === Chat ===
final chatStorageProvider = Provider<ChatStorage>((ref) => ChatStorage.instance);

final conversationsProvider = Provider<List<Conversation>>((ref) {
  final storage = ref.watch(chatStorageProvider);
  return storage.allConversations;
});

final chatControllerProvider = Provider<ChatController>((ref) => ChatController());

// === Tools ===
final toolRegistryProvider_ = Provider<ToolRegistry>((ref) => ToolRegistry.instance);

// === Install ===
final engineInstallerProvider = Provider<EngineInstaller>((ref) => EngineInstaller());

final modelCatalogProvider = Provider<ModelCatalog>((ref) => ModelCatalog.instance);

final installStateProvider = StateProvider<InstallState>((ref) => InstallState.chatOnly);

// === Memory ===
final memoryStoreProvider = Provider<MemoryStore>((ref) => MemoryStore.instance);

// === Server ===
final tektonServerProvider = Provider<TektonServer>((ref) => TektonServer());

final discoveryServiceProvider = Provider<DiscoveryService>((ref) => DiscoveryService());

// === Active conversation ===
final activeConversationIdProvider = StateProvider<String?>((ref) => null);

final activeMessagesProvider = Provider<List<ChatMessage>>((ref) {
  final conversationId = ref.watch(activeConversationIdProvider);
  if (conversationId == null) return [];
  final storage = ref.watch(chatStorageProvider);
  return storage.getMessages(conversationId);
});