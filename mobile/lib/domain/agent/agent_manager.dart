import 'package:hive_flutter/hive_flutter.dart';
import 'agent_config.dart';
import 'agent_protocol.dart';
import '../../domain/config/adapters.dart';

/// Manages agent lifecycle — creation, routing, fallback chains.
class AgentManager {
  static const String _boxName = 'agents';
  late Box<AgentConfig> _box;

  final List<void Function()> _listeners = [];

  AgentManager._();
  static final AgentManager _instance = AgentManager._();
  static AgentManager get instance => _instance;

  Future<void> init() async {
    _box = await Hive.openBox<AgentConfig>(_boxName);
  }

  /// Create a new agent
  AgentConfig createAgent(AgentConfig config) {
    _box.put(config.id, config);
    _notifyListeners();
    return config;
  }

  /// Get agent by ID
  AgentConfig? getAgent(String id) => _box.get(id);

  /// List all agents
  List<AgentConfig> get allAgents => _box.values.toList();

  /// Update an agent
  void updateAgent(AgentConfig config) {
    config.updatedAt = DateTime.now();
    _box.put(config.id, config);
    _notifyListeners();
  }

  /// Delete an agent
  void deleteAgent(String id) {
    _box.delete(id);
    _notifyListeners();
  }

  /// Find best agent for a task type
  AgentConfig? findBestAgent(TaskAffinity affinity) {
    final agents = allAgents
        .where((a) => a.handlesTask(affinity))
        .toList()
      ..sort((a, b) => b.priority.compareTo(a.priority));
    return agents.isNotEmpty ? agents.first : null;
  }

  /// Get fallback chain for an agent
  List<AgentConfig> getFallbackChain(String agentId) {
    final chain = <AgentConfig>[];
    var current = getAgent(agentId);
    while (current != null && chain.length < 5) {
      chain.add(current);
      if (current.fallbackAgentId == null) break;
      current = getAgent(current.fallbackAgentId!);
    }
    return chain;
  }

  /// Route a message to the best agent
  AgentConfig? routeMessage(String message, {String? preferredBackend}) {
    final lower = message.toLowerCase();

    if (lower.contains('file') || lower.contains('document') || lower.contains('pdf') || lower.contains('folder')) {
      return findBestAgent(TaskAffinity.fileOperations);
    }

    if (lower.contains('code') || lower.contains('script') || lower.contains('programming') ||
        lower.contains('function') || lower.contains('debug') || lower.contains('python') ||
        lower.contains('javascript') || lower.contains('rust') || lower.contains('compile')) {
      return findBestAgent(TaskAffinity.coding);
    }

    if (lower.contains('analyze') || lower.contains('compare') || lower.contains('research') ||
        lower.contains('data') || lower.contains('statistics')) {
      return findBestAgent(TaskAffinity.analysis);
    }

    if (lower.contains('image') || lower.contains('picture') || lower.contains('photo') || lower.contains('screenshot')) {
      return findBestAgent(TaskAffinity.multimodal);
    }

    return findBestAgent(TaskAffinity.generalChat);
  }

  void addListener(void Function() listener) => _listeners.add(listener);
  void removeListener(void Function() listener) => _listeners.remove(listener);
  void _notifyListeners() {
    for (final l in _listeners) { l(); }
  }
}