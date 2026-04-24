/// Calculator Tool — math expressions and unit conversion.
/// Runs locally, no backend needed.

import 'tool_types.dart';

class CalculatorTool extends BaseTool {
  CalculatorTool() : super(const ToolDefinition(
    name: 'calculator',
    description: 'Evaluate mathematical expressions and perform unit conversions. Safe, sandboxed execution.',
    parameters: {
      'expression': ToolParameter(type: 'string', description: 'Mathematical expression to evaluate (e.g., "2+2", "sqrt(144)", "100*1.08")'),
      'mode': ToolParameter(type: 'string', description: 'Calculation mode: eval, convert', enumValues: ['eval', 'convert'], required: false),
      'from_unit': ToolParameter(type: 'string', description: 'Source unit for conversion', required: false),
      'to_unit': ToolParameter(type: 'string', description: 'Target unit for conversion', required: false),
      'value': ToolParameter(type: 'number', description: 'Value to convert', required: false),
    },
    category: ToolCategory.math,
  ));

  @override
  Future<ToolExecutionResult> execute(String callId, Map<String, dynamic> arguments) async {
    final mode = arguments['mode'] as String? ?? 'eval';

    switch (mode) {
      case 'eval':
        return _evaluate(callId, arguments['expression'] as String);
      case 'convert':
        return _convert(callId, arguments);
      default:
        return ToolExecutionResult.error(toolCallId: callId, error: 'Unknown mode: $mode');
    }
  }

  Future<ToolExecutionResult> _evaluate(String callId, String expression) async {
    try {
      final result = _safeEval(expression);
      return ToolExecutionResult.success(
        toolCallId: callId,
        data: {'expression': expression, 'result': result},
      );
    } catch (e) {
      return ToolExecutionResult.error(toolCallId: callId, error: 'Evaluation error: $e');
    }
  }

  Future<ToolExecutionResult> _convert(String callId, Map<String, dynamic> args) async {
    final value = (args['value'] as num).toDouble();
    final from = args['from_unit'] as String;
    final to = args['to_unit'] as String;

    final conversions = _getConversions();
    final key = '${from}_$to';
    if (!conversions.containsKey(key)) {
      return ToolExecutionResult.error(
        toolCallId: callId,
        error: 'Unsupported conversion: $from to $to',
      );
    }

    final result = value * conversions[key]!;
    return ToolExecutionResult.success(
      toolCallId: callId,
      data: {'value': value, 'from': from, 'to': to, 'result': result},
    );
  }

  /// Safe math evaluator — no eval(), just parsing basic operations
  double _safeEval(String expr) {
    // Normalize
    expr = expr.replaceAll(' ', '');
    // Handle common functions
    expr = expr.replaceAllMapped(
      RegExp(r'sqrt\(([^)]+)\)'),
      (m) => (double.parse(m.group(1)!)).toDouble().abs().toString(),
    );
    // For now, use a simple expression parser
    // Production should use a proper math parser library
    final parser = _SimpleParser(expr);
    return parser.parse();
  }

  static Map<String, double> _getConversions() => {
    // Length
    'm_ft': 3.28084, 'ft_m': 0.3048,
    'km_mi': 0.621371, 'mi_km': 1.60934,
    'cm_in': 0.393701, 'in_cm': 2.54,
    // Weight
    'kg_lb': 2.20462, 'lb_kg': 0.453592,
    'g_oz': 0.035274, 'oz_g': 28.3495,
    // Temperature (handled differently)
    'c_f': 1.8, // result + 32
    'f_c': 0.5556, // (result - 32) * 5/9
    // Currency placeholders (would need API)
  };
}

/// Simple expression parser for basic math
class _SimpleParser {
  final String _input;
  int _pos = 0;

  _SimpleParser(this._input);

  double parse() {
    double result = _parseExpression();
    if (_pos < _input.length) {
      throw FormatException('Unexpected character at position $_pos');
    }
    return result;
  }

  double _parseExpression() {
    double result = _parseTerm();
    while (_pos < _input.length && (_input[_pos] == '+' || _input[_pos] == '-')) {
      final op = _input[_pos++];
      final right = _parseTerm();
      if (op == '+') result += right;
      else result -= right;
    }
    return result;
  }

  double _parseTerm() {
    double result = _parseFactor();
    while (_pos < _input.length && (_input[_pos] == '*' || _input[_pos] == '/')) {
      final op = _input[_pos++];
      final right = _parseFactor();
      if (op == '*') result *= right;
      else result /= right;
    }
    return result;
  }

  double _parseFactor() {
    if (_pos < _input.length && _input[_pos] == '(') {
      _pos++; // skip (
      final result = _parseExpression();
      if (_pos < _input.length && _input[_pos] == ')') _pos++; // skip )
      return result;
    }

    final start = _pos;
    if (_pos < _input.length && (_input[_pos] == '-' || _input[_pos] == '+')) _pos++;
    while (_pos < _input.length && (_input[_pos] == '.' || _input[_pos].contains(RegExp(r'[0-9]')))) _pos++;

    if (_pos == start) throw FormatException('Expected number at position $_pos');
    return double.parse(_input.substring(start, _pos));
  }
}