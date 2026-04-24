/// Tool registry — registers, discovers, and executes tools.
/// Compatible with Pi Agent's tool-calling format.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'tool_types.dart';
import 'filesystem_tool.dart';
import 'web_search_tool.dart';
import 'calculator_tool.dart';
import 'doc_analyzer_tool.dart';
import 'system_info_tool.dart';

class ToolRegistry {
  final Map<String, BaseTool> _tools = {};
  final List<void Function()> _listeners = [];

  static final ToolRegistry _instance = ToolRegistry._();
  static ToolRegistry get instance => _instance;
  ToolRegistry._();

  /// Register a tool
  void register(BaseTool tool) {
    _tools[tool.definition.name] = tool;
    _notifyListeners();
  }

  /// Unregister a tool
  void unregister(String name) {
    _tools.remove(name);
    _notifyListeners();
  }

  /// Get a tool by name
  BaseTool? getTool(String name) => _tools[name];

  /// Get all tools
  List<BaseTool> get allTools => _tools.values.toList();

  /// Get tools by category
  List<BaseTool> getToolsByCategory(String category) =>
      _tools.values.where((t) => t.definition.category == category).toList();

  /// Get tools available for a specific agent (based on permissions)
  List<BaseTool> getToolsForAgent(List<String> enabledTools) =>
      _tools.values.where((t) => enabledTools.contains(t.definition.name)).toList();

  /// Get function schemas for OpenAI-compatible tool calling
  List<Map<String, dynamic>> getFunctionSchemas({List<String>? enabledTools}) {
    final tools = enabledTools != null
        ? getToolsForAgent(enabledTools)
        : allTools;
    return tools.map((t) => t.definition.toFunctionSchema()).toList();
  }

  /// Execute a tool call
  Future<ToolExecutionResult> execute(String toolName, String callId, Map<String, dynamic> arguments) async {
    final tool = _tools[toolName];
    if (tool == null) {
      return ToolExecutionResult.error(
        toolCallId: callId,
        error: 'Unknown tool: $toolName',
      );
    }

    if (!tool.isAvailable) {
      return ToolExecutionResult.error(
        toolCallId: callId,
        error: 'Tool not available: $toolName',
      );
    }

    try {
      return await tool.execute(callId, arguments);
    } catch (e) {
      return ToolExecutionResult.error(
        toolCallId: callId,
        error: 'Tool execution error: $e',
      );
    }
  }

  /// Initialize the default tool set
  void registerDefaults() {
    register(FileSystemTool());
    register(WebSearchTool());
    register(CalculatorTool());
    register(DocAnalyzerTool());
    register(SystemInfoTool());
  }

  void addListener(void Function() listener) => _listeners.add(listener);
  void removeListener(void Function() listener) => _listeners.remove(listener);
  void _notifyListeners() => _listeners.forEach((l) => l());
}

/// Riverpod provider for the tool registry
final toolRegistryProvider = Provider<ToolRegistry>((ref) {
  final registry = ToolRegistry.instance;
  registry.registerDefaults();
  return registry;
});