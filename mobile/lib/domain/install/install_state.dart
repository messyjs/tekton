/// Progressive install architecture.
/// States: CHAT_ONLY → ENGINE_INSTALLED → MODEL_LOADED → AGENTS_CONFIGURED

enum InstallState {
  chatOnly,
  engineInstalled,
  modelLoaded,
  agentsConfigured,
}

/// Extension methods for InstallState
extension InstallStateExt on InstallState {
  String get label {
    switch (this) {
      case InstallState.chatOnly: return 'Chat Only';
      case InstallState.engineInstalled: return 'Engine Ready';
      case InstallState.modelLoaded: return 'Model Loaded';
      case InstallState.agentsConfigured: return 'Agents Configured';
    }
  }

  String get description {
    switch (this) {
      case InstallState.chatOnly: return 'Connect to remote AI backends';
      case InstallState.engineInstalled: return 'Local inference engine ready — download a model next';
      case InstallState.modelLoaded: return 'Local model loaded — ready for on-device chat';
      case InstallState.agentsConfigured: return 'All systems go — multi-agent mode active';
    }
  }

  bool get canChat => true;
  bool get canLocalInference => index >= InstallState.engineInstalled.index;
  bool get canUseAgents => index >= InstallState.agentsConfigured.index;
}