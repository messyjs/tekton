/// Tool type definitions and registry.
/// Adapted from Pi Agent's @tekton/tools format for mobile use.

/// Tool definition — mirrors Pi Agent's tool schema
class ToolDefinition {
  final String name;
  final String description;
  final Map<String, ToolParameter> parameters;
  final bool required;
  final String category;
  final String? permission;

  const ToolDefinition({
    required this.name,
    required this.description,
    this.parameters = const {},
    this.required = false,
    required this.category,
    this.permission,
  });

  /// Convert to OpenAI function calling format
  Map<String, dynamic> toFunctionSchema() => {
    'type': 'function',
    'function': {
      'name': name,
      'description': description,
      'parameters': {
        'type': 'object',
        'properties': {
          for (final e in parameters.entries)
            e.key: {
              'type': e.value.type,
              'description': e.value.description,
              if (e.value.enumValues != null) 'enum': e.value.enumValues,
            },
        },
        'required': parameters.entries
            .where((e) => e.value.required)
            .map((e) => e.key)
            .toList(),
      },
    },
  };
}

class ToolParameter {
  final String type;
  final String description;
  final bool required;
  final List<String>? enumValues;

  const ToolParameter({
    required this.type,
    required this.description,
    this.required = true,
    this.enumValues,
  });
}

/// Tool execution result
class ToolExecutionResult {
  final String toolCallId;
  final bool success;
  final dynamic data;
  final String? error;

  const ToolExecutionResult.success({
    required this.toolCallId,
    required this.data,
  }) : success = true, error = null;

  const ToolExecutionResult.error({
    required this.toolCallId,
    required this.error,
  }) : success = false, data = null;
}

/// Abstract tool implementation
abstract class BaseTool {
  final ToolDefinition definition;

  BaseTool(this.definition);

  /// Execute the tool with given arguments
  Future<ToolExecutionResult> execute(String callId, Map<String, dynamic> arguments);

  /// Check if the tool is available on this platform
  bool get isAvailable => true;

  /// Check if the tool requires user permission
  bool requiresPermission(String action) => false;

  /// Request user permission for a sensitive action
  Future<bool> requestPermission(String action) async => true;
}

/// Tool categories
class ToolCategory {
  static const String filesystem = 'filesystem';
  static const String web = 'web';
  static const String code = 'code';
  static const String math = 'math';
  static const String doc = 'doc';
  static const String image = 'image';
  static const String system = 'system';
  static const String voice = 'voice';
  static const String memory = 'memory';
  static const String messaging = 'messaging';
}