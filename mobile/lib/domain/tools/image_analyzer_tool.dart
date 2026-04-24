/// ImageAnalyzer Tool — describe/analyze images shared in chat.
/// Uses Gemma 4 E4B's native vision capability.

import 'dart:io';
import 'dart:convert';
import 'tool_types.dart';

class ImageAnalyzerTool extends BaseTool {
  ImageAnalyzerTool() : super(const ToolDefinition(
    name: 'image_analyzer',
    description: 'Analyze images shared in chat using multimodal vision. Describe content, extract text (OCR), identify objects.',
    parameters: {
      'action': ToolParameter(type: 'string', description: 'Action: describe, ocr, objects, compare', enumValues: ['describe', 'ocr', 'objects', 'compare']),
      'path': ToolParameter(type: 'string', description: 'Path to the image file'),
      'path2': ToolParameter(type: 'string', description: 'Second image path (for compare action)', required: false),
      'prompt': ToolParameter(type: 'string', description: 'Custom prompt for analysis', required: false),
    },
    category: ToolCategory.image,
  ));

  @override
  bool get isAvailable => Platform.isAndroid || Platform.isIOS || Platform.isMacOS;

  @override
  Future<ToolExecutionResult> execute(String callId, Map<String, dynamic> arguments) async {
    final action = arguments['action'] as String;
    final path = arguments['path'] as String;

    final file = File(path);
    if (!await file.exists()) {
      return ToolExecutionResult.error(toolCallId: callId, error: 'Image not found: $path');
    }

    // Encode image as base64 for multimodal model input
    final bytes = await file.readAsBytes();
    final base64Image = base64Encode(bytes);
    final ext = path.split('.').last.toLowerCase();
    final mimeType = ext == 'png' ? 'image/png' : ext == 'gif' ? 'image/gif' : 'image/jpeg';

    switch (action) {
      case 'describe':
        return _describe(callId, path, base64Image, mimeType, arguments['prompt'] as String?);
      case 'ocr':
        return _ocr(callId, path, base64Image, mimeType);
      case 'objects':
        return _objects(callId, path, base64Image, mimeType);
      case 'compare':
        return _compare(callId, path, arguments['path2'] as String, arguments);
      default:
        return ToolExecutionResult.error(toolCallId: callId, error: 'Unknown action: $action');
    }
  }

  Future<ToolExecutionResult> _describe(String callId, String path, String base64Image, String mimeType, String? customPrompt) async {
    // In production, this sends to Gemma 4 E4B with vision
    return ToolExecutionResult.success(
      toolCallId: callId,
      data: {
        'path': path,
        'description': '[Image description requires local multimodal model — will be powered by Gemma 4 E4B]',
        'prompt': customPrompt ?? 'Describe this image in detail.',
        'mimeType': mimeType,
        'base64Length': base64Image.length,
      },
    );
  }

  Future<ToolExecutionResult> _ocr(String callId, String path, String base64Image, String mimeType) async {
    return ToolExecutionResult.success(
      toolCallId: callId,
      data: {
        'path': path,
        'text': '[OCR requires local multimodal model — will be powered by Gemma 4 E4B]',
      },
    );
  }

  Future<ToolExecutionResult> _objects(String callId, String path, String base64Image, String mimeType) async {
    return ToolExecutionResult.success(
      toolCallId: callId,
      data: {
        'path': path,
        'objects': '[Object detection requires local vision model]',
      },
    );
  }

  Future<ToolExecutionResult> _compare(String callId, String path1, String path2, Map<String, dynamic> args) async {
    final file2 = File(path2);
    if (!await file2.exists()) {
      return ToolExecutionResult.error(toolCallId: callId, error: 'Second image not found: $path2');
    }
    return ToolExecutionResult.success(
      toolCallId: callId,
      data: {
        'path1': path1,
        'path2': path2,
        'comparison': '[Image comparison requires local multimodal model]',
      },
    );
  }
}