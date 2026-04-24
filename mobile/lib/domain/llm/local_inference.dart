/// Local inference engine via llama.cpp FFI bindings.
/// Handles model loading, inference, and streaming on device.

import 'dart:io';
import 'dart:async';
import '../agent/agent_protocol.dart';
import 'llm_backend.dart';
import '../../services/logger.dart';

class _InferenceMetrics {
  int promptTokens = 0;
  int completionTokens = 0;
  double tokensPerSecond = 0.0;
  int memoryUsedMB = 0;
  double contextUtilization = 0.0;
  DateTime? startTime;
}

class LocalInferenceEngine {
  final String backendId;
  String? _modelPath;
  bool _isLoaded = false;
  final _InferenceMetrics _metrics = _InferenceMetrics();

  // Model parameters
  int contextLength = 4096;
  int threadCount = 4;
  double temperature = 0.7;
  double topP = 0.9;
  int? topK;
  double? minP;
  double repeatPenalty = 1.1;

  static bool _nativeAvailable = false;

  LocalInferenceEngine({required this.backendId});

  /// Check if the native library is available
  static bool get isNativeAvailable {
    if (_nativeAvailable) return true;
    try {
      // Try to detect if llama.cpp native is available
      // This will be properly implemented with FFI when the engine is downloaded
      return false; // Will be true once engine is installed
    } catch (e) {
      log.warning('Native llama.cpp library not available: $e');
      return false;
    }
  }

  /// Load a GGUF model file for inference
  Future<void> loadModel(String modelPath) async {
    if (_isLoaded) await unloadModel();
    _modelPath = modelPath;

    // In production, this calls llama.cpp FFI
    // For now, store the path and mark as loaded
    _isLoaded = true;
    _metrics.startTime = DateTime.now();
    log.info('Model loaded: $modelPath');
  }

  /// Unload the current model
  Future<void> unloadModel() async {
    if (!_isLoaded) return;
    _isLoaded = false;
    _modelPath = null;
    log.info('Model unloaded');
  }

  /// Check if a model is loaded
  bool get isLoaded => _isLoaded;

  /// Get current inference metrics
  _InferenceMetrics get metrics => _metrics;

  /// Send a chat completion request (local)
  Future<LlmResponse> chat(
    List<AgentMessage> messages, {
    String? model,
    InferenceParams? params,
  }) async {
    if (!_isLoaded) {
      return _localServerChat(messages, model: model, params: params);
    }

    final stopwatch = Stopwatch()..start();
    final prompt = _buildPrompt(messages);
    stopwatch.stop();

    return LlmResponse(
      content: '[Local inference] $prompt',
      model: model ?? 'local',
      promptTokens: _metrics.promptTokens,
      completionTokens: _metrics.completionTokens,
      latency: stopwatch.elapsed,
    );
  }

  /// Stream a chat completion (local)
  Stream<LlmResponse> chatStream(
    List<AgentMessage> messages, {
    String? model,
    InferenceParams? params,
  }) async* {
    if (!_isLoaded) {
      yield* _localServerChatStream(messages, model: model, params: params);
      return;
    }

    yield LlmResponse(
      content: '[Local streaming]',
      model: model ?? 'local',
    );
  }

  String _buildPrompt(List<AgentMessage> messages) {
    final parts = <String>[];
    for (final m in messages) {
      switch (m.role) {
        case AgentRole.system:
          parts.add('System: ${m.content}');
          break;
        case AgentRole.user:
          parts.add('User: ${m.content}');
          break;
        case AgentRole.assistant:
          parts.add('Assistant: ${m.content}');
          break;
        case AgentRole.tool:
          parts.add('Tool: ${m.content}');
          break;
      }
    }
    parts.add('Assistant:');
    return parts.join('\n\n');
  }

  Future<LlmResponse> _localServerChat(
    List<AgentMessage> messages, {
    String? model,
    InferenceParams? params,
  }) async {
    throw UnimplementedError('Local server fallback not yet implemented');
  }

  Stream<LlmResponse> _localServerChatStream(
    List<AgentMessage> messages, {
    String? model,
    InferenceParams? params,
  }) async* {
    throw UnimplementedError('Local server streaming fallback not yet implemented');
  }

  /// Auto-detect CPU topology for thread count optimization
  static int getOptimalThreadCount() {
    final cores = Platform.numberOfProcessors;
    return (cores / 2).ceil();
  }

  /// Get model RAM requirements estimate (GB)
  static double estimateRamGB(int modelSizeBytes) {
    return modelSizeBytes / (1024 * 1024 * 1024) * 1.2;
  }

  void dispose() {
    unloadModel();
  }
}