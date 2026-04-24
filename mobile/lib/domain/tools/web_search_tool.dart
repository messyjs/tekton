/// WebSearch Tool — search the web and scrape results.
/// Uses SearXNG or a configurable search backend.

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'tool_types.dart';

class WebSearchTool extends BaseTool {
  String searchBackend = 'https://search.brave.com/api/suggest';
  String? apiKey;

  WebSearchTool() : super(const ToolDefinition(
    name: 'web_search',
    description: 'Search the web and extract content from URLs. Returns search results with titles, URLs, and snippets.',
    parameters: {
      'query': ToolParameter(type: 'string', description: 'Search query'),
      'max_results': ToolParameter(type: 'number', description: 'Maximum number of results (default 5)', required: false),
      'extract': ToolParameter(type: 'boolean', description: 'Whether to extract content from top results', required: false),
    },
    category: ToolCategory.web,
  ));

  @override
  Future<ToolExecutionResult> execute(String callId, Map<String, dynamic> arguments) async {
    final query = arguments['query'] as String;
    final maxResults = (arguments['max_results'] as num?)?.toInt() ?? 5;
    final extract = arguments['extract'] as bool? ?? false;

    try {
      final results = await _search(query, maxResults);
      if (extract && results.isNotEmpty) {
        // Extract content from top results
        for (var i = 0; i < results.length && i < 3; i++) {
          final content = await _extractContent(results[i]['url'] as String);
          results[i]['extracted'] = content;
        }
      }
      return ToolExecutionResult.success(toolCallId: callId, data: {'query': query, 'results': results});
    } catch (e) {
      return ToolExecutionResult.error(toolCallId: callId, error: 'Search error: $e');
    }
  }

  Future<List<Map<String, String>>> _search(String query, int maxResults) async {
    // Use DuckDuckGo HTML search as fallback
    final uri = Uri.parse('https://html.duckduckgo.com/html/?q=${Uri.encodeComponent(query)}');
    final response = await http.get(uri, headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36',
    }).timeout(const Duration(seconds: 15));

    if (response.statusCode != 200) {
      throw Exception('Search returned ${response.statusCode}');
    }

    // Parse HTML results (simplified — production should use proper HTML parser)
    final results = <Map<String, String>>[];
    final linkRegex = RegExp(r'<a rel="nofollow" class="result__a" href="([^"]+)"[^>]*>(.*?)</a>', dotAll: true);
    final snippetRegex = RegExp(r'<a class="result__snippet"[^>]*>(.*?)</a>', dotAll: true);

    final linkMatches = linkRegex.allMatches(response.body);
    for (final match in linkMatches) {
      if (results.length >= maxResults) break;
      final url = match.group(1) ?? '';
      final title = _stripHtml(match.group(2) ?? '');
      results.add({'url': url, 'title': title, 'snippet': ''});
    }

    return results;
  }

  Future<String> _extractContent(String url) async {
    try {
      final uri = Uri.parse(url);
      final response = await http.get(uri, headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36',
      }).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        // Strip HTML tags for raw text (simplified)
        return _stripHtml(response.body).substring(0, response.body.length > 5000 ? 5000 : response.body.length);
      }
      return '';
    } catch (_) {
      return '';
    }
  }

  String _stripHtml(String html) {
    return html
      .replaceAll(RegExp(r'<[^>]*>'), '')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
  }
}