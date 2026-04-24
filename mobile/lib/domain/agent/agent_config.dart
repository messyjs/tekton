/// Agent configuration protocol for Tekton.
/// Every agent — local or remote — is an instance of this schema.
/// Compatible with Pi Agent's tool-calling format.

/// Tool permission flags
enum ToolPermission {
  filesystem,
  webSearch,
  codeExec,
  calculator,
  docAnalyzer,
  imageAnalyzer,
  systemInfo,
  voice,
}

/// Task type affinities for routing
enum TaskAffinity {
  coding,
  creativeWriting,
  analysis,
  generalChat,
  fileOperations,
  multimodal,
}

/// Backend type: local model or remote API
enum BackendType {
  local,
  remote,
  builtIn,
}

/// Agent configuration — the core schema for all agents in Tekton
class AgentConfig {
  String id;
  String displayName;
  String? avatar;
  String systemPrompt;
  String modelRef;
  String backendId;
  List<String> enabledTools;
  List<String> taskAffinities;
  int priority;
  String? fallbackAgentId;
  Map<String, dynamic> inferenceParams;
  DateTime createdAt;
  DateTime updatedAt;

  AgentConfig({
    required this.id,
    required this.displayName,
    this.avatar,
    required this.systemPrompt,
    required this.modelRef,
    required this.backendId,
    this.enabledTools = const [],
    this.taskAffinities = const [],
    this.priority = 0,
    this.fallbackAgentId,
    this.inferenceParams = const {},
    DateTime? createdAt,
    DateTime? updatedAt,
  })  : createdAt = createdAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now();

  /// Check if agent has a specific tool permission
  bool hasTool(ToolPermission tool) => enabledTools.contains(tool.name);

  /// Check if agent handles a task type
  bool handlesTask(TaskAffinity affinity) => taskAffinities.contains(affinity.name);

  /// Convert to JSON for export/sync
  Map<String, dynamic> toJson() => {
    'id': id,
    'displayName': displayName,
    'avatar': avatar,
    'systemPrompt': systemPrompt,
    'modelRef': modelRef,
    'backendId': backendId,
    'enabledTools': enabledTools,
    'taskAffinities': taskAffinities,
    'priority': priority,
    'fallbackAgentId': fallbackAgentId,
    'inferenceParams': inferenceParams,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
  };

  factory AgentConfig.fromJson(Map<String, dynamic> json) => AgentConfig(
    id: json['id'] as String,
    displayName: json['displayName'] as String,
    avatar: json['avatar'] as String?,
    systemPrompt: json['systemPrompt'] as String,
    modelRef: json['modelRef'] as String,
    backendId: json['backendId'] as String,
    enabledTools: (json['enabledTools'] as List).cast<String>(),
    taskAffinities: (json['taskAffinities'] as List).cast<String>(),
    priority: json['priority'] as int? ?? 0,
    fallbackAgentId: json['fallbackAgentId'] as String?,
    inferenceParams: Map<String, dynamic>.from(json['inferenceParams'] as Map),
    createdAt: DateTime.parse(json['createdAt'] as String),
    updatedAt: DateTime.parse(json['updatedAt'] as String),
  );
}

/// Built-in agent presets
class AgentPresets {
  static AgentConfig codeAssistant({
    required String remoteBackendId,
    String modelRef = 'glm-5.1',
  }) =>
    AgentConfig(
      id: 'preset-code',
      displayName: 'Code Agent',
      avatar: '💻',
      systemPrompt: _codeAssistantPrompt,
      modelRef: modelRef,
      backendId: remoteBackendId,
      enabledTools: [ToolPermission.codeExec.name, ToolPermission.filesystem.name, ToolPermission.webSearch.name],
      taskAffinities: [TaskAffinity.coding.name],
      priority: 10,
      inferenceParams: {'temperature': 0.2, 'topP': 0.95},
    );

  static AgentConfig fileAnalyst({
    required String localBackendId,
    String modelRef = 'gemma4-e4b',
  }) =>
    AgentConfig(
      id: 'preset-file',
      displayName: 'File Analyst',
      avatar: 'F',
      systemPrompt: _fileAnalystPrompt,
      modelRef: modelRef,
      backendId: localBackendId,
      enabledTools: [ToolPermission.filesystem.name, ToolPermission.docAnalyzer.name, ToolPermission.imageAnalyzer.name],
      taskAffinities: [TaskAffinity.fileOperations.name, TaskAffinity.multimodal.name],
      priority: 8,
      inferenceParams: {'temperature': 0.3, 'topP': 0.9},
    );

  static AgentConfig quickChat({
    required String localBackendId,
    String modelRef = 'gemma4-e2b',
  }) =>
    AgentConfig(
      id: 'preset-quick',
      displayName: 'Quick Chat',
      avatar: 'Q',
      systemPrompt: _quickChatPrompt,
      modelRef: modelRef,
      backendId: localBackendId,
      enabledTools: [ToolPermission.calculator.name, ToolPermission.systemInfo.name],
      taskAffinities: [TaskAffinity.generalChat.name],
      priority: 5,
      inferenceParams: {'temperature': 0.7, 'topP': 0.9},
    );

  static const _codeAssistantPrompt = '''You are Tekton Code Agent, an expert software engineer. You write clean, correct, well-tested code. You have access to filesystem and code execution tools. When the user asks for code:
1. Analyze the request carefully
2. Write production-quality code with error handling
3. Test edge cases
4. Explain your design decisions briefly''';

  static const _fileAnalystPrompt = '''You are Tekton File Analyst, a document and file analysis specialist. You can read, search, and analyze files on the user's device. When given files:
1. Understand the file structure and content
2. Extract key information
3. Answer questions about the content
4. Suggest organizational improvements''';

  static const _quickChatPrompt = '''You are Tekton Quick Chat, a fast and friendly conversational AI. Keep responses concise and helpful. You have access to a calculator and system information tools. Be direct, friendly, and efficient.''';
}