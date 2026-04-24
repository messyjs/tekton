/// LLM Backend types and configuration
import '../agent/agent_protocol.dart';
class ApiProvider {
  final String name;
  const ApiProvider._(this.name);

  static const openai = ApiProvider._('openai');
  static const anthropic = ApiProvider._('anthropic');
  static const ollama = ApiProvider._('ollama');
  static const custom = ApiProvider._('custom');
  static const llamaServer = ApiProvider._('llamaServer');
  static const tektonServer = ApiProvider._('tektonServer');

  static const values = [openai, anthropic, ollama, custom, llamaServer, tektonServer];

  @override
  String toString() => name;

  static ApiProvider byName(String name) =>
    values.firstWhere((e) => e.name == name, orElse: () => openai);
}

/// Backend configuration
class BackendConfig {
  String id;
  String name;
  ApiProvider provider;
  String baseUrl;
  String? apiKey;
  String defaultModel;
  int maxTokens;
  bool isDefault;
  bool isConnected;
  DateTime createdAt;
  Map<String, String> headers;

  BackendConfig({
    required this.id,
    required this.name,
    required this.provider,
    required this.baseUrl,
    this.apiKey,
    required this.defaultModel,
    this.maxTokens = 4096,
    this.isDefault = false,
    this.isConnected = false,
    DateTime? createdAt,
    this.headers = const {},
  }) : createdAt = createdAt ?? DateTime.now();

  /// Build headers for HTTP requests
  Map<String, String> get requestHeaders => {
    'Content-Type': 'application/json',
    if (apiKey != null && apiKey!.isNotEmpty)
      'Authorization': 'Bearer $apiKey',
    ...headers,
  };

  /// Get the chat completions endpoint
  String get chatEndpoint {
    if (provider == ApiProvider.anthropic) {
      return '$baseUrl/v1/messages';
    }
    return '$baseUrl/v1/chat/completions';
  }

  /// Get the models listing endpoint
  String get modelsEndpoint => '$baseUrl/v1/models';

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'provider': provider.name,
    'baseUrl': baseUrl,
    'apiKey': apiKey,
    'defaultModel': defaultModel,
    'maxTokens': maxTokens,
    'isDefault': isDefault,
    'isConnected': isConnected,
    'createdAt': createdAt.toIso8601String(),
    'headers': headers,
  };

  factory BackendConfig.fromJson(Map<String, dynamic> json) => BackendConfig(
    id: json['id'] as String,
    name: json['name'] as String,
    provider: ApiProvider.byName(json['provider'] as String),
    baseUrl: json['baseUrl'] as String,
    apiKey: json['apiKey'] as String?,
    defaultModel: json['defaultModel'] as String,
    maxTokens: json['maxTokens'] as int? ?? 4096,
    isDefault: json['isDefault'] as bool? ?? false,
    isConnected: json['isConnected'] as bool? ?? false,
    headers: Map<String, String>.from(json['headers'] as Map? ?? {}),
  );
}

/// Inference parameters for a request
class InferenceParams {
  final double temperature;
  final double topP;
  final int? topK;
  final double? minP;
  final double? repeatPenalty;
  final int maxTokens;
  final int? contextLength;
  final int? threadCount;
  final List<String>? stop;

  const InferenceParams({
    this.temperature = 0.7,
    this.topP = 0.9,
    this.topK,
    this.minP,
    this.repeatPenalty,
    this.maxTokens = 4096,
    this.contextLength,
    this.threadCount,
    this.stop,
  });

  Map<String, dynamic> toJson() => {
    'temperature': temperature,
    'top_p': topP,
    if (topK != null) 'top_k': topK,
    if (minP != null) 'min_p': minP,
    if (repeatPenalty != null) 'repeat_penalty': repeatPenalty,
    'max_tokens': maxTokens,
    if (contextLength != null) 'n_ctx': contextLength,
    if (threadCount != null) 'n_threads': threadCount,
    if (stop != null) 'stop': stop,
  };
}

/// Response from an LLM backend
class LlmResponse {
  final String content;
  final String model;
  final int promptTokens;
  final int completionTokens;
  final List<ToolCallData>? toolCalls;
  final bool stoppedByLimit;
  final Duration latency;

  const LlmResponse({
    required this.content,
    required this.model,
    this.promptTokens = 0,
    this.completionTokens = 0,
    this.toolCalls,
    this.stoppedByLimit = false,
    this.latency = Duration.zero,
  });

  int get totalTokens => promptTokens + completionTokens;
}

/// Tool call data from LLM response
class ToolCallData {
  final String id;
  final String name;
  final Map<String, dynamic> arguments;

  const ToolCallData({
    required this.id,
    required this.name,
    required this.arguments,
  });
}
