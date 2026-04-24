/// CodeExec Tool — execute Python/JS in a sandboxed environment.
/// Routes to GLM-5.1 for code generation, uses local sandbox for execution.

import 'tool_types.dart';

class CodeExecTool extends BaseTool {
  CodeExecTool() : super(const ToolDefinition(
    name: 'code_exec',
    description: 'Generate and execute Python or JavaScript code in a sandboxed environment. Returns stdout, stderr, and exit code.',
    parameters: {
      'language': ToolParameter(type: 'string', description: 'Programming language: python, javascript', enumValues: ['python', 'javascript']),
      'code': ToolParameter(type: 'string', description: 'Code to execute'),
      'timeout': ToolParameter(type: 'number', description: 'Execution timeout in seconds (default 30, max 120)', required: false),
      'stdin': ToolParameter(type: 'string', description: 'Standard input for the program', required: false),
    },
    category: ToolCategory.code,
  ));

  @override
  Future<ToolExecutionResult> execute(String callId, Map<String, dynamic> arguments) async {
    final language = arguments['language'] as String;
    final code = arguments['code'] as String;
    final timeout = (arguments['timeout'] as num?)?.toInt() ?? 30;

    // Validate timeout
    if (timeout > 120 || timeout < 1) {
      return ToolExecutionResult.error(toolCallId: callId, error: 'Timeout must be between 1 and 120 seconds');
    }

    // In production, this would:
    // 1. Send code to GLM-5.1 remote for generation/refinement (if needed)
    // 2. Execute in a sandboxed container/process
    // For now, return a placeholder
    return ToolExecutionResult.success(
      toolCallId: callId,
      data: {
        'language': language,
        'code': code,
        'output': '[Code execution sandbox not yet implemented — will route to sandboxed runner]',
        'status': 'not_implemented',
        'timeout': timeout,
      },
    );
  }
}