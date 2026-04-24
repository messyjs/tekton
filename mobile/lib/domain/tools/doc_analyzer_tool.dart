/// DocAnalyzer Tool — RAG over uploaded documents (PDF, Word, code).
/// Uses Gemma 4 E4B for local multimodal analysis.

import 'dart:io';
import 'tool_types.dart';

class DocAnalyzerTool extends BaseTool {
  DocAnalyzerTool() : super(const ToolDefinition(
    name: 'doc_analyzer',
    description: 'Analyze documents (PDF, Word, code files) using RAG. Extract text, summarize, and answer questions about document content.',
    parameters: {
      'action': ToolParameter(type: 'string', description: 'Action: extract, summarize, question, chunk', enumValues: ['extract', 'summarize', 'question', 'chunk']),
      'path': ToolParameter(type: 'string', description: 'Path to the document file'),
      'query': ToolParameter(type: 'string', description: 'Question or query about the document (for question action)', required: false),
      'chunk_size': ToolParameter(type: 'number', description: 'Chunk size in characters (for chunk action, default 1000)', required: false),
      'overlap': ToolParameter(type: 'number', description: 'Overlap between chunks in characters (default 200)', required: false),
    },
    category: ToolCategory.doc,
    permission: 'android.permission.MANAGE_EXTERNAL_STORAGE',
  ));

  @override
  Future<ToolExecutionResult> execute(String callId, Map<String, dynamic> arguments) async {
    final action = arguments['action'] as String;
    final path = arguments['path'] as String;

    switch (action) {
      case 'extract':
        return _extract(callId, path);
      case 'summarize':
        return _summarize(callId, path);
      case 'question':
        return _question(callId, path, arguments['query'] as String);
      case 'chunk':
        return _chunk(callId, path, arguments);
      default:
        return ToolExecutionResult.error(toolCallId: callId, error: 'Unknown action: $action');
    }
  }

  Future<ToolExecutionResult> _extract(String callId, String path) async {
    final file = File(path);
    if (!await file.exists()) {
      return ToolExecutionResult.error(toolCallId: callId, error: 'File not found: $path');
    }

    final ext = path.split('.').last.toLowerCase();
    try {
      String content;
      switch (ext) {
        case 'txt':
        case 'md':
        case 'csv':
        case 'json':
        case 'xml':
        case 'yaml':
        case 'yml':
          content = await file.readAsString();
          break;
        case 'dart':
        case 'py':
        case 'js':
        case 'ts':
        case 'rs':
        case 'go':
        case 'java':
        case 'cpp':
        case 'c':
        case 'h':
          content = await file.readAsString();
          break;
        case 'pdf':
        case 'doc':
        case 'docx':
        default:
          return ToolExecutionResult.error(
            toolCallId: callId,
            error: 'Binary format ($ext) not yet supported. Use Tekton Docling service for PDF/Word.',
          );
      }

      // Limit content size
      if (content.length > 100000) {
        content = content.substring(0, 100000) + '\n... [truncated]'; 
      }

      return ToolExecutionResult.success(
        toolCallId: callId,
        data: {
          'path': path,
          'extension': ext,
          'size': content.length,
          'content': content,
        },
      );
    } catch (e) {
      return ToolExecutionResult.error(toolCallId: callId, error: 'Extract error: $e');
    }
  }

  Future<ToolExecutionResult> _summarize(String callId, String path) async {
    // In production, this would send the document content to the
    // local Gemma 4 E4B model for summarization
    return ToolExecutionResult.success(
      toolCallId: callId,
      data: {
        'path': path,
        'summary': '[Document summarization requires local model — will be powered by Gemma 4 E4B]',
      },
    );
  }

  Future<ToolExecutionResult> _question(String callId, String path, String query) async {
    // RAG-based Q&A — will use local model for context retrieval + answer
    return ToolExecutionResult.success(
      toolCallId: callId,
      data: {
        'path': path,
        'query': query,
        'answer': '[RAG question answering requires local model — will be powered by Gemma 4 E4B]',
      },
    );
  }

  Future<ToolExecutionResult> _chunk(String callId, String path, Map<String, dynamic> args) async {
    final chunkSize = (args['chunk_size'] as num?)?.toInt() ?? 1000;
    final overlap = (args['overlap'] as num?)?.toInt() ?? 200;

    final extractResult = await _extract(callId, path);
    if (!extractResult.success) return extractResult;

    final content = (extractResult.data as Map)['content'] as String;
    final chunks = <String>[];
    int start = 0;
    while (start < content.length) {
      final end = start + chunkSize;
      chunks.add(content.substring(start, end > content.length ? content.length : end));
      start += chunkSize - overlap;
    }

    return ToolExecutionResult.success(
      toolCallId: callId,
      data: {
        'path': path,
        'chunks': chunks.length,
        'chunk_size': chunkSize,
        'overlap': overlap,
        'content_chunks': chunks,
      },
    );
  }
}