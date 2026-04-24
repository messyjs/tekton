/// Agent Protocol specification for Tekton.
/// Defines the contract for agent communication, tool calls, and message routing.
/// Compatible with Pi Agent's @tekton/tools format.

import 'agent_config.dart';

/// Tool call format — compatible with Pi Agent's tool-calling schema
class ToolCall {
  final String id;
  final String name;
  final Map<String, dynamic> arguments;

  const ToolCall({
    required this.id,
    required this.name,
    required this.arguments,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': 'function',
    'function': {
      'name': name,
      'arguments': arguments,
    },
  };

  factory ToolCall.fromJson(Map<String, dynamic> json) => ToolCall(
    id: json['id'] as String,
    name: (json['function'] as Map)['name'] as String,
    arguments: Map<String, dynamic>.from(
      (json['function'] as Map)['arguments'] as Map,
    ),
  );
}

/// Tool result returned after execution
class ToolResult {
  final String toolCallId;
  final dynamic content;
  final bool isError;

  const ToolResult({
    required this.toolCallId,
    required this.content,
    this.isError = false,
  });

  Map<String, dynamic> toJson() => {
    'tool_call_id': toolCallId,
    'content': content is String ? content : content.toString(),
    'is_error': isError,
  };
}

/// Message role in the agent protocol
enum AgentRole { system, user, assistant, tool }

/// Agent protocol message — the standard message format
class AgentMessage {
  final AgentRole role;
  final String content;
  final String? agentId;
  final String? modelUsed;
  final List<ToolCall>? toolCalls;
  final List<ToolResult>? toolResults;
  final List<FileAttachment>? attachments;
  final int? tokensConsumed;
  final DateTime timestamp;

  AgentMessage({
    required this.role,
    required this.content,
    this.agentId,
    this.modelUsed,
    this.toolCalls,
    this.toolResults,
    this.attachments,
    this.tokensConsumed,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  Map<String, dynamic> toApiFormat() {
    final map = <String, dynamic>{
      'role': role.name,
      'content': content,
    };
    if (toolCalls != null) {
      map['tool_calls'] = toolCalls!.map((t) => t.toJson()).toList();
    }
    if (toolResults != null) {
      map['tool_results'] = toolResults!.map((t) => t.toJson()).toList();
    }
    return map;
  }
}

/// File attachment in a message
class FileAttachment {
  final String id;
  final String name;
  final String path;
  final int size;
  final String mimeType;
  final String? preview;

  const FileAttachment({
    required this.id,
    required this.name,
    required this.path,
    required this.size,
    required this.mimeType,
    this.preview,
  });
}

/// Routing decision from the director
class RoutingDecision {
  final String targetAgentId;
  final String reason;
  final double confidence;
  final List<String>? subTasks;

  const RoutingDecision({
    required this.targetAgentId,
    required this.reason,
    this.confidence = 1.0,
    this.subTasks,
  });
}

/// Agent protocol version info
class AgentProtocol {
  static String version = '1.0.0';
  static String namespace = 'com.tekton.agent';

  /// Schema for validating agent configs
  static Map<String, dynamic> get configSchema => {
    '\$schema': 'https://json-schema.org/draft/2020-12/schema',
    '\$id': '$namespace/config/v$version',
    'title': 'TektonAgentConfig',
    'type': 'object',
    'required': ['id', 'displayName', 'systemPrompt', 'modelRef', 'backendId'],
    'properties': {
      'id': {'type': 'string', 'format': 'uuid'},
      'displayName': {'type': 'string', 'minLength': 1, 'maxLength': 64},
      'avatar': {'type': 'string'},
      'systemPrompt': {'type': 'string', 'minLength': 1},
      'modelRef': {'type': 'string', 'description': 'GGUF path or remote model ID'},
      'backendId': {'type': 'string', 'description': 'References a BackendConfig'},
      'enabledTools': {
        'type': 'array',
        'items': {'type': 'string', 'enum': ToolPermission.values.map((e) => e.name).toList()},
      },
      'taskAffinities': {
        'type': 'array',
        'items': {'type': 'string', 'enum': TaskAffinity.values.map((e) => e.name).toList()},
      },
      'priority': {'type': 'integer', 'minimum': 0, 'maximum': 100},
      'fallbackAgentId': {'type': 'string'},
      'inferenceParams': {
        'type': 'object',
        'properties': {
          'temperature': {'type': 'number', 'minimum': 0, 'maximum': 2},
          'topP': {'type': 'number', 'minimum': 0, 'maximum': 1},
          'topK': {'type': 'integer', 'minimum': 1},
          'minP': {'type': 'number', 'minimum': 0, 'maximum': 1},
          'repeatPenalty': {'type': 'number', 'minimum': 1, 'maximum': 2},
          'contextLength': {'type': 'integer', 'minimum': 512},
          'threadCount': {'type': 'integer', 'minimum': 1},
        },
      },
    },
  };
}