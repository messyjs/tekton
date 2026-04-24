/// FileSystem Tool — browse, read, write, search files on device.
/// Two permission tiers: Scoped (SAF) and Full (MANAGE_EXTERNAL_STORAGE)

import 'dart:io';
import 'tool_types.dart';
import '../../services/logger.dart';

class FileSystemTool extends BaseTool {
  FileSystemTool() : super(const ToolDefinition(
    name: 'filesystem',
    description: 'Browse, read, write, and search files on the device. Two tiers: Scoped Access (default, uses Android SAF) and Full Access (opt-in, requires MANAGE_EXTERNAL_STORAGE).',
    parameters: {
      'action': ToolParameter(type: 'string', description: 'Action to perform: read, write, list, search, delete', enumValues: ['read', 'write', 'list', 'search', 'delete']),
      'path': ToolParameter(type: 'string', description: 'File or directory path'),
      'content': ToolParameter(type: 'string', description: 'Content to write (for write action)', required: false),
      'pattern': ToolParameter(type: 'string', description: 'Search pattern (for search action)', required: false),
      'recursive': ToolParameter(type: 'boolean', description: 'Whether to recurse into directories', required: false),
    },
    category: ToolCategory.filesystem,
    permission: 'android.permission.MANAGE_EXTERNAL_STORAGE',
  ));

  @override
  Future<ToolExecutionResult> execute(String callId, Map<String, dynamic> arguments) async {
    final action = arguments['action'] as String;
    final path = arguments['path'] as String;

    switch (action) {
      case 'read':
        return _read(callId, path);
      case 'write':
        return _write(callId, path, arguments['content'] as String);
      case 'list':
        return _list(callId, path, arguments['recursive'] as bool? ?? false);
      case 'search':
        return _search(callId, path, arguments['pattern'] as String);
      case 'delete':
        return _delete(callId, path);
      default:
        return ToolExecutionResult.error(toolCallId: callId, error: 'Unknown action: $action');
    }
  }

  Future<ToolExecutionResult> _read(String callId, String path) async {
    try {
      final file = File(path);
      if (!await file.exists()) {
        return ToolExecutionResult.error(toolCallId: callId, error: 'File not found: $path');
      }
      // Read with size limit (1MB)
      final stat = await file.stat();
      if (stat.size > 1024 * 1024) {
        return ToolExecutionResult.error(toolCallId: callId, error: 'File too large: ${stat.size} bytes. Max 1MB for direct read.');
      }
      final content = await file.readAsString();
      return ToolExecutionResult.success(
        toolCallId: callId,
        data: {'path': path, 'content': content, 'size': stat.size},
      );
    } catch (e) {
      return ToolExecutionResult.error(toolCallId: callId, error: 'Read error: $e');
    }
  }

  Future<ToolExecutionResult> _write(String callId, String path, String content) async {
    try {
      final file = File(path);
      await file.parent.create(recursive: true);
      await file.writeAsString(content);
      return ToolExecutionResult.success(
        toolCallId: callId,
        data: {'path': path, 'written': content.length},
      );
    } catch (e) {
      return ToolExecutionResult.error(toolCallId: callId, error: 'Write error: $e');
    }
  }

  Future<ToolExecutionResult> _list(String callId, String path, bool recursive) async {
    try {
      final dir = Directory(path);
      if (!await dir.exists()) {
        return ToolExecutionResult.error(toolCallId: callId, error: 'Directory not found: $path');
      }
      final entries = <Map<String, dynamic>>[];
      final maxEntries = 500; // Safety limit

      await for (final entity in dir.list(recursive: recursive)) {
        if (entries.length >= maxEntries) break;
        final stat = await entity.stat();
        entries.add({
          'path': entity.path,
          'type': entity is File ? 'file' : 'directory',
          'size': stat.size,
          'modified': stat.modified.toIso8601String(),
        });
      }
      return ToolExecutionResult.success(
        toolCallId: callId,
        data: {'path': path, 'entries': entries, 'total': entries.length},
      );
    } catch (e) {
      return ToolExecutionResult.error(toolCallId: callId, error: 'List error: $e');
    }
  }

  Future<ToolExecutionResult> _search(String callId, String path, String pattern) async {
    try {
      final dir = Directory(path);
      if (!await dir.exists()) {
        return ToolExecutionResult.error(toolCallId: callId, error: 'Directory not found: $path');
      }
      final results = <Map<String, dynamic>>[];
      final regex = RegExp(pattern, caseSensitive: false);

      await for (final entity in dir.list(recursive: true)) {
        if (entity is File) {
          try {
            final content = await entity.readAsString();
            final lines = content.split('\n');
            for (var i = 0; i < lines.length; i++) {
              if (regex.hasMatch(lines[i])) {
                results.add({
                  'file': entity.path,
                  'line': i + 1,
                  'content': lines[i].trim(),
                });
                if (results.length >= 100) break;
              }
            }
          } catch (_) {
            // Skip binary/unreadable files
          }
          if (results.length >= 100) break;
        }
      }
      return ToolExecutionResult.success(
        toolCallId: callId,
        data: {'pattern': pattern, 'results': results},
      );
    } catch (e) {
      return ToolExecutionResult.error(toolCallId: callId, error: 'Search error: $e');
    }
  }

  Future<ToolExecutionResult> _delete(String callId, String path) async {
    try {
      final file = File(path);
      if (await file.exists()) {
        await file.delete();
        return ToolExecutionResult.success(toolCallId: callId, data: {'deleted': path});
      }
      final dir = Directory(path);
      if (await dir.exists()) {
        await dir.delete(recursive: true);
        return ToolExecutionResult.success(toolCallId: callId, data: {'deleted': path});
      }
      return ToolExecutionResult.error(toolCallId: callId, error: 'Not found: $path');
    } catch (e) {
      return ToolExecutionResult.error(toolCallId: callId, error: 'Delete error: $e');
    }
  }
}