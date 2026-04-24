/// Remote API adapters for OpenAI, Anthropic, Ollama, and custom endpoints.

import 'dart:convert';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'package:dio/dio.dart';
import 'llm_backend.dart';
import '../agent/agent_protocol.dart';
import '../../services/logger.dart';

/// Abstract remote API adapter
abstract class RemoteApiAdapter {
  final BackendConfig config;
  RemoteApiAdapter(this.config);

  Future<LlmResponse> chat(
    List<AgentMessage> messages, {
    String? model,
    InferenceParams? params,
  });

  Stream<LlmResponse> chatStream(
    List<AgentMessage> messages, {
    String? model,
    InferenceParams? params,
  });

  Future<List<ModelInfo>> listModels();
  Future<bool> testConnection();
}

/// Model info from a remote API
class ModelInfo {
  final String id;
  final String? ownedBy;
  final int? contextLength;
  final DateTime? created;

  const ModelInfo({
    required this.id,
    this.ownedBy,
    this.contextLength,
    this.created,
  });
}

/// OpenAI-compatible API adapter (works for OpenAI, Ollama, llama-server, etc.)
class OpenAICompatibleAdapter extends RemoteApiAdapter {
  final http.Client _client = http.Client();

  OpenAICompatibleAdapter(super.config);

  @override
  Future<LlmResponse> chat(
    List<AgentMessage> messages, {
    String? model,
    InferenceParams? params,
  }) async {
    final stopwatch = Stopwatch()..start();
    final body = _buildBody(messages, model: model, params: params, stream: false);

    final uri = Uri.parse(config.chatEndpoint);
    final response = await _client
        .post(uri, headers: config.requestHeaders, body: jsonEncode(body))
        .timeout(const Duration(seconds: 120));

    stopwatch.stop();

    if (response.statusCode != 200) {
      throw ApiException(response.statusCode, response.body);
    }

    return _parseResponse(response.body, stopwatch.elapsed);
  }

  @override
  Stream<LlmResponse> chatStream(
    List<AgentMessage> messages, {
    String? model,
    InferenceParams? params,
  }) async* {
    final body = _buildBody(messages, model: model, params: params, stream: true);
    final uri = Uri.parse(config.chatEndpoint);

    final request = http.Request('POST', uri)
      ..headers.addAll(config.requestHeaders)
      ..body = jsonEncode(body);

    final streamResponse = await _client.send(request);
    if (streamResponse.statusCode != 200) {
      throw ApiException(streamResponse.statusCode, 'Stream failed');
    }

    String buffer = '';
    await for (final chunk in streamResponse.stream.transform(utf8.decoder)) {
      buffer += chunk;
      final lines = buffer.split('\n');
      buffer = lines.removeLast();

      for (final line in lines) {
        if (line.startsWith('data: ')) {
          final data = line.substring(6).trim();
          if (data == '[DONE]') return;
          try {
            final json = jsonDecode(data) as Map<String, dynamic>;
            final delta = json['choices']?[0]?['delta']?['content'];
            if (delta != null) {
              yield LlmResponse(content: delta, model: json['model'] ?? '');
            }
          } catch (_) {}
        }
      }
    }
  }

  @override
  Future<List<ModelInfo>> listModels() async {
    final uri = Uri.parse(config.modelsEndpoint);
    final response = await _client
        .get(uri, headers: config.requestHeaders)
        .timeout(const Duration(seconds: 10));

    if (response.statusCode != 200) {
      throw ApiException(response.statusCode, response.body);
    }

    final json = jsonDecode(response.body);
    final models = (json['data'] as List?) ?? [];
    return models.map((m) => ModelInfo(
      id: m['id'] as String,
      ownedBy: m['owned_by'] as String?,
      created: m['created'] != null
          ? DateTime.fromMillisecondsSinceEpoch((m['created'] as int) * 1000)
          : null,
    )).toList();
  }

  @override
  Future<bool> testConnection() async {
    try {
      final uri = Uri.parse(config.modelsEndpoint);
      final response = await _client
          .get(uri, headers: config.requestHeaders)
          .timeout(const Duration(seconds: 10));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Map<String, dynamic> _buildBody(
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
    if (params != null) body.addAll(params.toJson());
    return body;
  }

  LlmResponse _parseResponse(String body, Duration latency) {
    final json = jsonDecode(body);
    final choice = json['choices']?[0];
    final message = choice?['message'];
    final usage = json['usage'];

    return LlmResponse(
      content: message?['content'] ?? '',
      model: json['model'] ?? '',
      promptTokens: usage?['prompt_tokens'] ?? 0,
      completionTokens: usage?['completion_tokens'] ?? 0,
      stoppedByLimit: choice?['finish_reason'] == 'length',
      latency: latency,
    );
  }
}

/// Anthropic API adapter
class AnthropicAdapter extends RemoteApiAdapter {
  final http.Client _client = http.Client();

  AnthropicAdapter(super.config);

  @override
  Future<LlmResponse> chat(
    List<AgentMessage> messages, {
    String? model,
    InferenceParams? params,
  }) async {
    final stopwatch = Stopwatch()..start();
    final body = _buildBody(messages, model: model, params: params);

    final uri = Uri.parse(config.chatEndpoint);
    final headers = {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey ?? '',
      'anthropic-version': '2023-06-01',
    };

    final response = await _client
        .post(uri, headers: headers, body: jsonEncode(body))
        .timeout(const Duration(seconds: 120));

    stopwatch.stop();

    if (response.statusCode != 200) {
      throw ApiException(response.statusCode, response.body);
    }

    return _parseResponse(response.body, stopwatch.elapsed);
  }

  @override
  Stream<LlmResponse> chatStream(
    List<AgentMessage> messages, {
    String? model,
    InferenceParams? params,
  }) async* {
    final body = _buildBody(messages, model: model, params: params)
      ..['stream'] = true;
    final uri = Uri.parse(config.chatEndpoint);
    final headers = {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey ?? '',
      'anthropic-version': '2023-06-01',
    };

    final request = http.Request('POST', uri)..headers.addAll(headers)..body = jsonEncode(body);
    final streamResponse = await _client.send(request);

    String buffer = '';
    await for (final chunk in streamResponse.stream.transform(utf8.decoder)) {
      buffer += chunk;
      final lines = buffer.split('\n');
      buffer = lines.removeLast();
      for (final line in lines) {
        if (line.startsWith('data: ')) {
          final data = line.substring(6).trim();
          if (data == '[DONE]') return;
          try {
            final json = jsonDecode(data);
            if (json['type'] == 'content_block_delta') {
              final text = json['delta']?['text'];
              if (text != null) yield LlmResponse(content: text, model: model ?? config.defaultModel);
            }
          } catch (_) {}
        }
      }
    }
  }

  @override
  Future<List<ModelInfo>> listModels() async {
    // Anthropic doesn't have a standard models endpoint
    return [
      const ModelInfo(id: 'claude-sonnet-4-20250514', ownedBy: 'anthropic'),
      const ModelInfo(id: 'claude-3-5-haiku-20241022', ownedBy: 'anthropic'),
    ];
  }

  @override
  Future<bool> testConnection() async {
    try {
      // Anthropic doesn't have a health endpoint, try a minimal request
      final uri = Uri.parse('${config.baseUrl}/v1/messages');
      final response = await _client
          .post(uri, headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey ?? '',
        'anthropic-version': '2023-06-01',
      }, body: jsonEncode({
        'model': config.defaultModel,
        'max_tokens': 1,
        'messages': [{'role': 'user', 'content': 'test'}],
      }))
          .timeout(const Duration(seconds: 10));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Map<String, dynamic> _buildBody(
    List<AgentMessage> messages, {
    String? model,
    InferenceParams? params,
  }) {
    final systemMsg = messages.where((m) => m.role == AgentRole.system).fold<String>(
      '', (prev, m) => prev + (prev.isEmpty ? '' : '\n') + m.content,
    );
    final chatMessages = messages
        .where((m) => m.role != AgentRole.system)
        .map((m) => {'role': m.role == AgentRole.tool ? 'user' : m.role.name, 'content': m.content})
        .toList();

    return {
      'model': model ?? config.defaultModel,
      'max_tokens': params?.maxTokens ?? config.maxTokens,
      'system': systemMsg.isEmpty ? null : systemMsg,
      'messages': chatMessages,
      if (params != null) ...{
        'temperature': params.temperature,
        'top_p': params.topP,
      },
    };
  }

  LlmResponse _parseResponse(String body, Duration latency) {
    final json = jsonDecode(body);
    final content = (json['content'] as List?)?.fold<String>(
      '', (prev, block) => prev + (block['text'] ?? ''),
    ) ?? '';
    return LlmResponse(
      content: content,
      model: json['model'] ?? '',
      promptTokens: json['usage']?['input_tokens'] ?? 0,
      completionTokens: json['usage']?['output_tokens'] ?? 0,
      latency: latency,
    );
  }
}

/// Factory to create the right adapter for a backend
class ApiAdapterFactory {
  static RemoteApiAdapter create(BackendConfig config) {
    switch (config.provider) {
      case ApiProvider.anthropic:
        return AnthropicAdapter(config);
      default:
        return OpenAICompatibleAdapter(config);
    }
  }
}

/// API exception
class ApiException implements Exception {
  final int statusCode;
  final String message;
  const ApiException(this.statusCode, this.message);
  @override
  String toString() => 'ApiException($statusCode): $message';
}