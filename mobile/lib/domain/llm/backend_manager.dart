/// BackendManager — unified multi-backend connection manager.
/// Abstracts over local llama.cpp, remote APIs, and built-in server.
/// The chat system doesn't know or care where inference is happening.

import 'dart:convert';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'llm_backend.dart';
import 'local_inference.dart';
import '../agent/agent_protocol.dart';
import '../../services/logger.dart';

class BackendManager {
  final Map<String, BackendConfig> _backends = {};
  final Map<String, LocalInferenceEngine> _localEngines = {};
  BackendConfig? _defaultBackend;
  final List<void Function()> _listeners = [];

  static final BackendManager _instance = BackendManager._();
  static BackendManager get instance => _instance;
  BackendManager._();

  /// Register a backend
  void registerBackend(BackendConfig config) {
    _backends[config.id] = config;
    if (config.isDefault) _defaultBackend = config;
    _notifyListeners();
    log.info('Backend registered: ${config.name} (${config.provider.name})');
  }

  /// Remove a backend
  void removeBackend(String id) {
    _backends.remove(id);
    _localEngines[id]?.dispose();
    _localEngines.remove(id);
    if (_defaultBackend?.id == id) {
      _defaultBackend = _backends.values.firstOrNull;
    }
    _notifyListeners();
  }

  /// Get all backends
  List<BackendConfig> get backends => _backends.values.toList();

  /// Get default backend
  BackendConfig? get defaultBackend => _defaultBackend;

  /// Set default backend
  void setDefault(String id) {
    if (_backends.containsKey(id)) {
      for (final b in _backends.values) {
        b.isDefault = b.id == id;
      }
      _defaultBackend = _backends[id];
      _notifyListeners();
    }
  }

  /// Test connectivity to a remote backend
  Future<bool> testConnection(BackendConfig config) async {
    try {
      final uri = Uri.parse(config.modelsEndpoint);
      final response = await http
          .get(uri, headers: config.requestHeaders)
          .timeout(const Duration(seconds: 10));
      final connected = response.statusCode == 200;
      config.isConnected = connected;
      _notifyListeners();
      return connected;
    } catch (e) {
      config.isConnected = false;
      _notifyListeners();
      return false;
    }
  }

  /// Send a chat completion request through a specific backend
  Future<LlmResponse> chat({
    required String backendId,
    required List<AgentMessage> messages,
    String? model,
    InferenceParams? params,
  }) async {
    final config = _backends[backendId];
    if (config == null) throw Exception('Backend not found: $backendId');

    // Check if local inference engine
    if (config.provider == ApiProvider.llamaServer && _localEngines.containsKey(backendId)) {
      return _localEngines[backendId]!.chat(messages, model: model, params: params);
    }

    // Remote API call
    return _remoteChat(config, messages, model: model, params: params);
  }

  /// Stream a chat completion through a specific backend
  Stream<LlmResponse> chatStream({
    required String backendId,
    required List<AgentMessage> messages,
    String? model,
    InferenceParams? params,
  }) async* {
    final config = _backends[backendId];
    if (config == null) throw Exception('Backend not found: $backendId');

    if (config.provider == ApiProvider.llamaServer && _localEngines.containsKey(backendId)) {
      yield* _localEngines[backendId]!.chatStream(messages, model: model, params: params);
      return;
    }

    yield* _remoteChatStream(config, messages, model: model, params: params);
  }

  /// Load a local model for inference
  Future<void> loadLocalModel(String backendId, String modelPath) async {
    final config = _backends[backendId];
    if (config == null) throw Exception('Backend not found: $backendId');

    final engine = LocalInferenceEngine(backendId: backendId);
    await engine.loadModel(modelPath);
    _localEngines[backendId] = engine;
    config.isConnected = true;
    _notifyListeners();
    log.info('Local model loaded: $modelPath');
  }

  /// Unload a local model
  Future<void> unloadLocalModel(String backendId) async {
    _localEngines[backendId]?.dispose();
    _localEngines.remove(backendId);
    final config = _backends[backendId];
    if (config != null) {
      config.isConnected = false;
    }
    _notifyListeners();
  }

  /// Remote API chat completion
  Future<LlmResponse> _remoteChat(
    BackendConfig config,
    List<AgentMessage> messages, {
    String? model,
    InferenceParams? params,
  }) async {
    final stopwatch = Stopwatch()..start();
    final body = _buildRequestBody(config, messages, model: model, params: params, stream: false);

    final uri = Uri.parse(config.chatEndpoint);
    final response = await http
        .post(uri, headers: config.requestHeaders, body: jsonEncode(body))
        .timeout(const Duration(seconds: 120));

    stopwatch.stop();

    if (response.statusCode != 200) {
      throw Exception('API error ${response.statusCode}: ${response.body}');
    }

    return _parseResponse(response.body, stopwatch.elapsed);
  }

  /// Remote API streaming chat
  Stream<LlmResponse> _remoteChatStream(
    BackendConfig config,
    List<AgentMessage> messages, {
    String? model,
    InferenceParams? params,
  }) async* {
    final body = _buildRequestBody(config, messages, model: model, params: params, stream: true);
    final uri = Uri.parse(config.chatEndpoint);

    final request = http.Request('POST', uri)
      ..headers.addAll(config.requestHeaders)
      ..body = jsonEncode(body);

    final client = http.Client();
    try {
      final response = await client.send(request);
      if (response.statusCode != 200) {
        throw Exception('API error ${response.statusCode}');
      }

      String buffer = '';
      await for (final chunk in response.stream.transform(utf8.decoder)) {
        buffer += chunk;
        final lines = buffer.split('\n');
        buffer = lines.removeLast(); // Keep incomplete line in buffer

        for (final line in lines) {
          if (line.startsWith('data: ')) {
            final data = line.substring(6).trim();
            if (data == '[DONE]') return;
            try {
              final json = jsonDecode(data);
              final delta = json['choices']?[0]?['delta']?['content'];
              if (delta != null) {
                yield LlmResponse(
                  content: delta,
                  model: json['model'] ?? '',
                );
              }
            } catch (_) {}
          }
        }
      }
    } finally {
      client.close();
    }
  }

  /// Build request body for OpenAI-compatible API
  Map<String, dynamic> _buildRequestBody(
    BackendConfig config,
    List<AgentMessage> messages, {
    String? model,
    InferenceParams? params,
    bool stream = false,
  }) {
    final apiMessages = messages.map((m) => m.toApiFormat()).toList();

    final body = <String, dynamic>{
      'model': model ?? config.defaultModel,
      'messages': apiMessages,
      'stream': stream,
    };

    if (params != null) {
      body.addAll(params.toJson());
    }

    return body;
  }

  /// Parse OpenAI-compatible response
  LlmResponse _parseResponse(String body, Duration latency) {
    final json = jsonDecode(body);
    final choice = json['choices']?[0];
    final message = choice?['message'];
    final usage = json['usage'];

    List<ToolCallData>? toolCalls;
    if (message?['tool_calls'] != null) {
      toolCalls = (message!['tool_calls'] as List).map((tc) {
        final fn = tc['function'];
        return ToolCallData(
          id: tc['id'] ?? '',
          name: fn['name'] ?? '',
          arguments: fn['arguments'] is String
              ? jsonDecode(fn['arguments'])
              : Map<String, dynamic>.from(fn['arguments']),
        );
      }).toList();
    }

    return LlmResponse(
      content: message?['content'] ?? '',
      model: json['model'] ?? '',
      promptTokens: usage?['prompt_tokens'] ?? 0,
      completionTokens: usage?['completion_tokens'] ?? 0,
      toolCalls: toolCalls,
      stoppedByLimit: choice?['finish_reason'] == 'length',
      latency: latency,
    );
  }

  void addListener(void Function() listener) => _listeners.add(listener);
  void removeListener(void Function() listener) => _listeners.remove(listener);
  void _notifyListeners() => _listeners.forEach((l) => l());
}