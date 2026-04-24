/// Tekton Server Mode — extend the local API server into a full multi-model server.
/// OpenAI-compatible endpoints for other Tekton instances and apps.

import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:shelf/shelf.dart' as shelf;
import 'package:shelf/shelf_io.dart' as io;
import 'package:shelf_router/shelf_router.dart';
import '../llm/llm.dart';
import '../agent/agent_protocol.dart';
import '../../services/logger.dart';

class TektonServer {
  HttpServer? _server;
  final BackendManager _backends = BackendManager.instance;
  final Map<String, _ConnectedClient> _clients = {};
  final List<void Function(_ServerEvent)> _listeners = [];

  int port = 4891;
  bool isRunning = false;

  // Server metrics
  int totalRequests = 0;
  int activeRequests = 0;
  DateTime? startTime;

  /// Start the server
  Future<void> start({int? portOverride}) async {
    if (isRunning) return;
    port = portOverride ?? 4891;

    final router = _buildRouter();
    final handler = const shelf.Pipeline()
        .addMiddleware(shelf.logRequests())
        .addMiddleware(_corsMiddleware())
        .addHandler(router.call);

    _server = await io.serve(handler, InternetAddress.anyIPv4, port);
    isRunning = true;
    startTime = DateTime.now();
    log.info('Tekton Server running on port $port');
  }

  /// Stop the server
  Future<void> stop() async {
    if (!isRunning) return;
    await _server?.close(force: true);
    isRunning = false;
    log.info('Tekton Server stopped');
  }

  /// Build the API router
  Router _buildRouter() {
    final router = Router();

    // Health check
    router.get('/health', _handleHealth);

    // Models
    router.get('/v1/models', _handleListModels);
    router.get('/v1/models/<modelId>', _handleGetModel);

    // Chat completions
    router.post('/v1/chat/completions', _handleChatCompletion);

    // Server status
    router.get('/v1/status', _handleServerStatus);

    // Connected clients
    router.get('/v1/clients', _handleListClients);

    return router;
  }

  // === Handlers ===

  shelf.Response _handleHealth(shelf.Request request) =>
    shelf.Response.ok(jsonEncode({'status': 'ok', 'version': '0.1.0'}));

  shelf.Response _handleListModels(shelf.Request request) {
    final models = _backends.backends.map((b) => {
      'id': b.defaultModel,
      'object': 'model',
      'created': b.createdAt.millisecondsSinceEpoch ~/ 1000,
      'owned_by': 'tekton',
    }).toList();

    return shelf.Response.ok(
      jsonEncode({'object': 'list', 'data': models}),
      headers: {'Content-Type': 'application/json'},
    );
  }

  shelf.Response _handleGetModel(shelf.Request request, String modelId) {
    final backend = _backends.backends.where(
      (b) => b.defaultModel == modelId
    ).firstOrNull;

    if (backend == null) {
      return shelf.Response.notFound(jsonEncode({'error': 'Model not found'}));
    }

    return shelf.Response.ok(
      jsonEncode({
        'id': modelId,
        'object': 'model',
        'created': backend.createdAt.millisecondsSinceEpoch ~/ 1000,
        'owned_by': 'tekton',
      }),
      headers: {'Content-Type': 'application/json'},
    );
  }

  Future<shelf.Response> _handleChatCompletion(shelf.Request request) async {
    totalRequests++;
    activeRequests++;

    try {
      final body = jsonDecode(await request.readAsString()) as Map<String, dynamic>;
      final model = body['model'] as String? ?? '';
      final messages = (body['messages'] as List).cast<Map<String, dynamic>>();
      final stream = body['stream'] as bool? ?? false;

      // Find the backend for this model
      final backend = _backends.backends.where(
        (b) => b.defaultModel == model
      ).firstOrNull ?? _backends.defaultBackend;

      if (backend == null) {
        return shelf.Response(503, body: jsonEncode({'error': 'No backend available'}));
      }

      // Convert to agent messages
      final agentMessages = messages.map((m) => AgentMessage(
        role: AgentRole.values.byName(m['role'] as String),
        content: m['content'] as String,
      )).toList();

      if (stream) {
        // Return SSE stream
        return shelf.Response(200,
          body: _streamResponse(backend.id, agentMessages, model: model),
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        );
      }

      // Non-streaming
      final response = await _backends.chat(
        backendId: backend.id,
        messages: agentMessages,
        model: model,
      );

      return shelf.Response.ok(
        jsonEncode({
          'id': 'tekton-${DateTime.now().millisecondsSinceEpoch}',
          'object': 'chat.completion',
          'created': DateTime.now().millisecondsSinceEpoch ~/ 1000,
          'model': response.model,
          'choices': [{
            'index': 0,
            'message': {'role': 'assistant', 'content': response.content},
            'finish_reason': response.stoppedByLimit ? 'length' : 'stop',
          }],
          'usage': {
            'prompt_tokens': response.promptTokens,
            'completion_tokens': response.completionTokens,
            'total_tokens': response.totalTokens,
          },
        }),
        headers: {'Content-Type': 'application/json'},
      );
    } catch (e) {
      log.error('Chat completion error: $e');
      return shelf.Response(500, body: jsonEncode({'error': e.toString()}));
    } finally {
      activeRequests--;
    }
  }

  Stream<String> _streamResponse(String backendId, List<AgentMessage> messages, {String? model}) async* {
    yield 'data: {"id":"tekton-stream","object":"chat.completion.chunk","model":"$model","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}\n\n';

    await for (final chunk in _backends.chatStream(
      backendId: backendId,
      messages: messages,
      model: model,
    )) {
      final data = jsonEncode({
        'id': 'tekton-stream',
        'object': 'chat.completion.chunk',
        'model': chunk.model,
        'choices': [{
          'index': 0,
          'delta': {'content': chunk.content},
          'finish_reason': null,
        }],
      });
      yield 'data: $data\n\n';
    }

    yield 'data: [DONE]\n\n';
  }

  shelf.Response _handleServerStatus(shelf.Request request) =>
    shelf.Response.ok(jsonEncode({
      'running': isRunning,
      'port': port,
      'uptime': startTime != null ? DateTime.now().difference(startTime!).inSeconds : 0,
      'totalRequests': totalRequests,
      'activeRequests': activeRequests,
      'clients': _clients.length,
      'models': _backends.backends.map((b) => b.defaultModel).toList(),
    }), headers: {'Content-Type': 'application/json'});

  shelf.Response _handleListClients(shelf.Request request) =>
    shelf.Response.ok(jsonEncode({
      'clients': _clients.values.map((c) => c.toJson()).toList(),
    }), headers: {'Content-Type': 'application/json'});

  /// CORS middleware for cross-origin requests
  shelf.Middleware _corsMiddleware() => (shelf.Handler innerHandler) =>
    (shelf.Request request) async {
      if (request.method == 'OPTIONS') {
        return shelf.Response.ok('', headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        });
      }
      final response = await innerHandler(request);
      return response.change(headers: {
        'Access-Control-Allow-Origin': '*',
      });
    };

  void addListener(void Function(_ServerEvent) listener) => _listeners.add(listener);
  void removeListener(void Function(_ServerEvent) listener) => _listeners.remove(listener);
}

class _ConnectedClient {
  final String id;
  final String address;
  DateTime connectedAt;
  int requestsCount;

  _ConnectedClient({
    required this.id,
    required this.address,
    DateTime? connectedAt,
    this.requestsCount = 0,
  }) : connectedAt = connectedAt ?? DateTime.now();

  Map<String, dynamic> toJson() => {
    'id': id,
    'address': address,
    'connectedAt': connectedAt.toIso8601String(),
    'requestsCount': requestsCount,
  };
}

class _ServerEvent {
  final String type; // client_connected, client_disconnected, request_completed
  final dynamic data;

  _ServerEvent(this.type, this.data);
}