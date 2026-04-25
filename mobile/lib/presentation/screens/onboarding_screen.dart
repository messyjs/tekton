/// Onboarding screen — first-run experience.
/// Four setup modes: Ollama, Cloud API, On-Device AI, Everything.
/// Includes GGUF URL import, Ollama model auto-discovery, and model fetch.

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:tekton_app/domain/llm/llm.dart';
import 'package:tekton_app/domain/config/config.dart';
import 'package:tekton_app/domain/install/install.dart';
import 'package:tekton_app/presentation/providers/app_providers.dart';
import 'chat_screen.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  int _step = 0;
  String _selectedMode = 'cloud';

  // Cloud config
  final _apiEndpointController = TextEditingController(text: 'http://192.168.1.100:11434');
  final _apiKeyController = TextEditingController();
  String _selectedModel = 'gemma3:4b';
  String _selectedProvider = 'ollama';

  // Connection test state: null=untested, true=success, false=failed
  bool? _connectionResult;
  bool _testing = false;
  String _connectionError = '';

  // Ollama models fetched from server
  List<String> _fetchedModels = [];
  bool _fetchingModels = false;

  // Auto-discovery
  bool _discovering = false;
  String? _discoveredHost;

  // Local model import
  final _ggufUrlController = TextEditingController();
  final _customModelNameController = TextEditingController();
  String? _importError;

  @override
  void dispose() {
    _apiEndpointController.dispose();
    _apiKeyController.dispose();
    _ggufUrlController.dispose();
    _customModelNameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            child: switch (_step) {
              0 => _buildWelcomeStep(theme),
              1 => _buildModeStep(theme),
              2 => _buildConfigStep(theme),
              _ => _buildWelcomeStep(theme),
            },
          ),
        ),
      ),
    );
  }

  // ==================== STEP 0: Welcome ====================
  Widget _buildWelcomeStep(ThemeData theme) {
    return Column(
      key: const ValueKey('welcome'),
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Spacer(flex: 2),
        Icon(Icons.hub, size: 80, color: theme.colorScheme.primary),
        const SizedBox(height: 24),
        Text('Tekton', style: theme.textTheme.headlineLarge?.copyWith(
          fontWeight: FontWeight.bold, color: theme.colorScheme.primary,
        ), textAlign: TextAlign.center),
        const SizedBox(height: 8),
        Text('Dream It, Do It!', style: theme.textTheme.titleMedium?.copyWith(
          color: theme.colorScheme.primary.withValues(alpha: 0.8),
          fontWeight: FontWeight.w600,
          fontStyle: FontStyle.italic,
        ), textAlign: TextAlign.center),
        const SizedBox(height: 48),
        Text('Run AI models on your device, connect to\nOllama on your workstation, or use cloud APIs.\nYour data stays private.', style: theme.textTheme.bodyMedium?.copyWith(
          color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
          height: 1.6,
        ), textAlign: TextAlign.center),
        const Spacer(flex: 3),
        FilledButton(
          onPressed: () => setState(() => _step = 1),
          child: const Text('Get Started'),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  // ==================== STEP 1: Mode Selection ====================
  Widget _buildModeStep(ThemeData theme) {
    return Column(
      key: const ValueKey('mode'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 24),
        Text('How do you want to use Tekton?', style: theme.textTheme.headlineSmall),
        const SizedBox(height: 32),
        _ModeCard(
          icon: Icons.router,
          title: 'Connect to Ollama',
          subtitle: 'Ollama on your workstation/server. Fast, uses your GPU.',
          selected: _selectedMode == 'cloud' && _selectedProvider == 'ollama',
          onTap: () => setState(() { _selectedMode = 'cloud'; _selectedProvider = 'ollama'; }),
        ),
        const SizedBox(height: 12),
        _ModeCard(
          icon: Icons.cloud,
          title: 'Cloud API',
          subtitle: 'OpenAI, Anthropic, or any OpenAI-compatible API.',
          selected: _selectedMode == 'cloud' && _selectedProvider != 'ollama',
          onTap: () => setState(() { _selectedMode = 'cloud'; _selectedProvider = 'openai'; }),
        ),
        const SizedBox(height: 12),
        _ModeCard(
          icon: Icons.phone_android,
          title: 'On-Device AI',
          subtitle: 'Run GGUF models locally. Private, works offline.',
          selected: _selectedMode == 'local',
          onTap: () => setState(() => _selectedMode = 'local'),
        ),
        const SizedBox(height: 12),
        _ModeCard(
          icon: Icons.settings_ethernet,
          title: 'Everything',
          subtitle: 'Use all of the above. Switch anytime.',
          selected: _selectedMode == 'hybrid',
          onTap: () => setState(() => _selectedMode = 'hybrid'),
        ),
        const Spacer(),
        Row(
          children: [
            TextButton(onPressed: () => setState(() => _step = 0), child: const Text('Back')),
            const Spacer(),
            FilledButton(
              onPressed: () => setState(() => _step = 2),
              child: const Text('Continue'),
            ),
          ],
        ),
      ],
    );
  }

  // ==================== STEP 2: Configuration ====================
  Widget _buildConfigStep(ThemeData theme) {
    final showOllama = _selectedMode == 'cloud' && _selectedProvider == 'ollama' || _selectedMode == 'hybrid';
    final showCloud = _selectedMode == 'cloud' && _selectedProvider != 'ollama' || _selectedMode == 'hybrid';
    final showLocal = _selectedMode == 'local' || _selectedMode == 'hybrid';

    return SingleChildScrollView(
      key: const ValueKey('config'),
      padding: const EdgeInsets.only(bottom: 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 24),
          Text('Configure your setup', style: theme.textTheme.headlineSmall),
          const SizedBox(height: 24),

          if (showOllama) ..._buildOllamaSection(theme),
          if (showCloud) ..._buildCloudSection(theme),
          if (showLocal) ..._buildLocalSection(theme),

          const SizedBox(height: 24),
          Row(
            children: [
              TextButton(onPressed: () => setState(() => _step = 1), child: const Text('Back')),
              const Spacer(),
              FilledButton(
                onPressed: _completeOnboarding,
                child: const Text('Start Using Tekton'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ==================== Ollama Section ====================
  List<Widget> _buildOllamaSection(ThemeData theme) {
    // Determine connection status icon
    Widget statusIcon;
    if (_connectionResult == null) {
      statusIcon = const SizedBox.shrink();
    } else if (_connectionResult == true) {
      statusIcon = Icon(Icons.check_circle, color: Color(0xFF84CC16), size: 28);
    } else {
      statusIcon = Icon(Icons.cancel, color: Colors.red.shade600, size: 28);
    }

    return [
      Card(
        color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Icon(Icons.router, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text('Ollama Connection', style: theme.textTheme.titleMedium),
                const Spacer(),
                statusIcon,
              ]),
              const SizedBox(height: 12),
              Text('Connect to Ollama running on your workstation. Make sure Ollama is running and your phone is on the same network.',
                style: theme.textTheme.bodySmall),
              const SizedBox(height: 12),
              TextField(
                controller: _apiEndpointController,
                keyboardType: TextInputType.url,
                decoration: InputDecoration(
                  labelText: 'Ollama Server URL',
                  border: const OutlineInputBorder(),
                  hintText: 'http://192.168.1.100:11434',
                  prefixIcon: const Icon(Icons.link),
                  suffixIcon: _discovering
                    ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))
                    : IconButton(
                        icon: const Icon(Icons.wifi_find),
                        tooltip: 'Auto-discover Ollama on network',
                        onPressed: _autoDiscoverOllama,
                      ),
                ),
              ),
              if (_discoveredHost != null) ...[
                const SizedBox(height: 4),
                Row(children: [
                  Icon(Icons.wifi, size: 14, color: Color(0xFF84CC16)),
                  const SizedBox(width: 4),
                  Text('Found: $_discoveredHost', style: TextStyle(color: Color(0xFF6AAF0C), fontSize: 12)),
                  TextButton(
                    onPressed: () {
                      _apiEndpointController.text = _discoveredHost!;
                      _discoveredHost = null;
                    },
                    style: TextButton.styleFrom(padding: const EdgeInsets.only(left: 8), minimumSize: Size.zero),
                    child: const Text('Use this', style: TextStyle(fontSize: 12)),
                  ),
                ]),
              ],
              const SizedBox(height: 8),
              Text('Tip: Run "ollama serve" on your workstation, then enter its IP.',
                style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurface.withValues(alpha: 0.5))),
              const SizedBox(height: 12),

              // Test button with clear status
              Row(
                children: [
                  Expanded(
                    child: FilledButton.tonal(
                      onPressed: _testing ? null : _testOllamaConnection,
                      child: _testing
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                        : Text(_connectionResult == true ? 'Re-test' : 'Test Connection'),
                    ),
                  ),
                ],
              ),

              // Clear result banner
              if (_connectionResult == true) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Color(0xFF84CC16).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Color(0xFF84CC16).withValues(alpha: 0.3)),
                  ),
                  child: Row(children: [
                    Icon(Icons.check_circle, color: Color(0xFF84CC16), size: 20),
                    const SizedBox(width: 8),
                    Text('Connected to Ollama!', style: TextStyle(color: Color(0xFF4A7A0A), fontWeight: FontWeight.w600)),
                  ]),
                ),
              ],
              if (_connectionResult == false) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                  ),
                  child: Row(children: [
                    Icon(Icons.cancel, color: Colors.red.shade600, size: 20),
                    const SizedBox(width: 8),
                    Expanded(child: Text(
                      _connectionError.isNotEmpty ? _connectionError : 'Connection failed. Check the URL and network.',
                      style: TextStyle(color: Colors.red.shade800, fontSize: 13),
                    )),
                  ]),
                ),
              ],

              // Model selector — shows after successful connection
              if (_connectionResult == true) ...[
                const SizedBox(height: 16),
                Text('Select a Model', style: theme.textTheme.titleSmall),
                const SizedBox(height: 8),
                if (_fetchedModels.isNotEmpty)
                  DropdownButtonFormField<String>(
                    value: _fetchedModels.contains(_selectedModel) ? _selectedModel : _fetchedModels.first,
                    decoration: const InputDecoration(
                      labelText: 'Ollama Model',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.smart_toy),
                    ),
                    items: _fetchedModels.map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
                    onChanged: (v) { if (v != null) setState(() => _selectedModel = v); },
                  )
                else
                  TextField(
                    decoration: const InputDecoration(
                      labelText: 'Model Name',
                      border: OutlineInputBorder(),
                      hintText: 'gemma3:4b',
                      prefixIcon: Icon(Icons.smart_toy),
                    ),
                    onChanged: (v) => _selectedModel = v,
                  ),
                const SizedBox(height: 4),
                Text('${_fetchedModels.length} models available on this server',
                  style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurface.withValues(alpha: 0.5))),
              ],
            ],
          ),
        ),
      ),
      const SizedBox(height: 24),
    ];
  }

  // ==================== Cloud Section ====================
  List<Widget> _buildCloudSection(ThemeData theme) {
    return [
      Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Icon(Icons.cloud, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text('Cloud API', style: theme.textTheme.titleMedium),
              ]),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _selectedProvider == 'ollama' ? 'openai' : _selectedProvider,
                decoration: const InputDecoration(labelText: 'Provider', border: OutlineInputBorder()),
                items: const [
                  DropdownMenuItem(value: 'openai', child: Text('OpenAI')),
                  DropdownMenuItem(value: 'anthropic', child: Text('Anthropic')),
                  DropdownMenuItem(value: 'custom', child: Text('Custom OpenAI-compatible')),
                ],
                onChanged: (v) => setState(() => _selectedProvider = v ?? 'openai'),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _apiEndpointController,
                keyboardType: TextInputType.url,
                decoration: InputDecoration(
                  labelText: 'API Endpoint',
                  border: const OutlineInputBorder(),
                  hintText: _selectedProvider == 'openai'
                    ? 'https://api.openai.com'
                    : 'https://api.anthropic.com',
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _apiKeyController,
                decoration: const InputDecoration(
                  labelText: 'API Key',
                  border: OutlineInputBorder(),
                  hintText: 'sk-...',
                  prefixIcon: Icon(Icons.key),
                ),
                obscureText: true,
              ),
              const SizedBox(height: 16),
              TextField(
                decoration: const InputDecoration(
                  labelText: 'Default Model',
                  border: OutlineInputBorder(),
                  hintText: 'gpt-4o',
                ),
                onChanged: (v) => _selectedModel = v,
              ),
            ],
          ),
        ),
      ),
      const SizedBox(height: 24),
    ];
  }

  // ==================== Local Section ====================
  List<Widget> _buildLocalSection(ThemeData theme) {
    final quickModels = [
      ('Gemma 3 4B (Q4_K_M)', 'https://huggingface.co/google/gemma-3-4b-it-GGUF/resolve/main/gemma-3-4b-it-Q4_K_M.gguf', '4B params, ~2.5GB, runs on any phone'),
      ('Dolphin 2.9 2B (Q4_K_M)', 'https://huggingface.co/cognitivecomputations/dolphin-2.9-llama3-2b-GGUF/resolve/main/dolphin-2.9-llama3-2b-Q4_K_M.gguf', '2B params, uncensored, fast'),
      ('Phi-3.5 Mini 3.8B (Q4_K_M)', 'https://huggingface.co/microsoft/Phi-3.5-mini-instruct-GGUF/resolve/main/phi-3.5-mini-instruct-Q4_K_M.gguf', '3.8B params, great for code and reasoning'),
    ];

    return [
      Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Icon(Icons.phone_android, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text('Local Models', style: theme.textTheme.titleMedium),
              ]),
              const SizedBox(height: 12),
              Text('Download a model to run on your device, or paste a GGUF URL from HuggingFace.',
                style: theme.textTheme.bodySmall),

              const SizedBox(height: 16),
              Text('Quick Pick', style: theme.textTheme.titleSmall),
              const SizedBox(height: 8),
              ...quickModels.map((m) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: ListTile(
                  dense: true,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: theme.colorScheme.outlineVariant),
                  ),
                  leading: const Icon(Icons.download, size: 20),
                  title: Text(m.$1, style: theme.textTheme.bodyMedium),
                  subtitle: Text(m.$3, style: theme.textTheme.labelSmall),
                  trailing: TextButton(
                    onPressed: () => _importQuickModel(m.$1, m.$2),
                    child: const Text('Add'),
                  ),
                ),
              )),

              const SizedBox(height: 16),
              Text('Or paste a GGUF URL', style: theme.textTheme.titleSmall),
              const SizedBox(height: 8),
              TextField(
                controller: _ggufUrlController,
                keyboardType: TextInputType.url,
                decoration: InputDecoration(
                  labelText: 'GGUF File URL',
                  border: const OutlineInputBorder(),
                  hintText: 'https://huggingface.co/.../model-Q4_K_M.gguf',
                  prefixIcon: const Icon(Icons.link),
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.content_paste),
                    onPressed: () { /* clipboard paste */ },
                  ),
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _customModelNameController,
                decoration: const InputDecoration(
                  labelText: 'Model Name (optional)',
                  border: OutlineInputBorder(),
                  hintText: 'My Custom Model',
                ),
              ),
              if (_importError != null) ...[
                const SizedBox(height: 8),
                Text(_importError!, style: TextStyle(color: theme.colorScheme.error, fontSize: 12)),
              ],
              const SizedBox(height: 8),
              FilledButton.tonal(
                onPressed: _importCustomModel,
                child: const Text('Import Model'),
              ),
            ],
          ),
        ),
      ),
      const SizedBox(height: 24),
    ];
  }

  // ==================== Actions ====================

  Future<void> _testOllamaConnection() async {
    setState(() { _testing = true; _connectionResult = null; _connectionError = ''; _fetchedModels = []; });
    try {
      final url = _apiEndpointController.text.trim().replaceAll(RegExp(r'/$'), '');

      // Test connection by hitting /api/tags (Ollama's model list endpoint)
      final response = await http.get(
        Uri.parse('$url/api/tags'),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        // Parse Ollama model list
        final body = jsonDecode(response.body);
        final models = <String>[];
        if (body is Map && body['models'] is List) {
          for (final m in body['models'] as List) {
            if (m is Map && m['name'] is String) {
              models.add(m['name'] as String);
            }
          }
        }
        models.sort();
        if (models.isEmpty) models.add('no models found');

        setState(() {
          _testing = false;
          _connectionResult = true;
          _fetchedModels = models;
          if (models.isNotEmpty && models.first != 'no models found') {
            _selectedModel = models.first;
          }
        });
      } else {
        // Try /v1/models as fallback (OpenAI-compatible endpoint)
        final response2 = await http.get(Uri.parse('$url/v1/models')).timeout(const Duration(seconds: 5));
        if (response2.statusCode == 200) {
          final body = jsonDecode(response2.body);
          final models = <String>[];
          if (body is Map && body['data'] is List) {
            for (final m in body['data'] as List) {
              if (m is Map && m['id'] is String) {
                models.add(m['id'] as String);
              }
            }
          }
          models.sort();
          setState(() {
            _testing = false;
            _connectionResult = true;
            _fetchedModels = models;
            if (models.isNotEmpty) _selectedModel = models.first;
          });
        } else {
          setState(() {
            _testing = false;
            _connectionResult = false;
            _connectionError = 'Server responded with ${response.statusCode}. Is Ollama running?';
          });
        }
      }
    } catch (e) {
      setState(() {
        _testing = false;
        _connectionResult = false;
        _connectionError = _formatError(e.toString());
      });
    }
  }

  String _formatError(String error) {
    if (error.contains('Connection refused')) return 'Connection refused. Is Ollama running at this address?';
    if (error.contains('Connection timed out') || error.contains('Timeout')) return 'Connection timed out. Check the IP address and network.';
    if (error.contains('No route to host')) return 'No route to host. Check network connection.';
    if (error.contains('Connection reset')) return 'Connection was reset. Check firewall settings.';
    return 'Connection failed: ${error.substring(0, error.length > 80 ? 80 : error.length)}';
  }

  Future<void> _autoDiscoverOllama() async {
    setState(() { _discovering = true; _discoveredHost = null; });

    // Try common Ollama addresses on the local network
    final commonHosts = [
      'http://192.168.1.100:11434',
      'http://192.168.0.100:11434',
      'http://10.0.0.100:11434',
      'http://192.168.1.101:11434',
      'http://192.168.0.101:11434',
      'http://localhost:11434',
    ];

    // Also try the gateway + common IPs
    try {
      // Quick scan of the most likely addresses
      for (final host in commonHosts) {
        try {
          final response = await http.get(
            Uri.parse('$host/api/tags'),
          ).timeout(const Duration(seconds: 2));
          if (response.statusCode == 200) {
            if (mounted) {
              setState(() {
                _discovering = false;
                _discoveredHost = host;
              });
            }
            return;
          }
        } catch (_) { continue; }
      }

      // Wider scan: try 192.168.1.1-255 and 192.168.0.1-255 in parallel batches
      for (final subnet in ['192.168.1', '192.168.0', '10.0.0']) {
        final futures = <Future<http.Response?>>[];
        for (int i = 1; i <= 254; i++) {
          futures.add(_quickCheck('$subnet.$i'));
        }
        // Wait for any to succeed
        final results = await Future.any(futures.map((f) => f.then((r) => r).catchError((_) => null)));
        if (results != null && results.statusCode == 200) {
          // Find which one succeeded
          for (int i = 1; i <= 254; i++) {
            try {
              final r = await http.get(Uri.parse('http://$subnet.$i:11434/api/tags')).timeout(const Duration(milliseconds: 500));
              if (r.statusCode == 200) {
                if (mounted) {
                  setState(() {
                    _discovering = false;
                    _discoveredHost = 'http://$subnet.$i:11434';
                  });
                }
                return;
              }
            } catch (_) {}
          }
        }
      }
    } catch (e) {
      // ignore
    }

    if (mounted) {
      setState(() { _discovering = false; });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No Ollama server found. Enter the URL manually.')),
      );
    }
  }

  Future<http.Response> _quickCheck(String ip) async {
    return await http.get(Uri.parse('http://$ip:11434/api/tags')).timeout(const Duration(seconds: 2));
  }

  void _importQuickModel(String name, String url) {
    final id = 'builtin-${name.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '-')}';
    final model = ModelEntry(
      id: id,
      name: name,
      description: 'Downloaded from HuggingFace',
      url: url,
      sizeBytes: 0,
      ramRequiredMB: 0,
      quantization: 'Q4_K_M',
      contextLength: 8192,
      capabilities: ['chat'],
      recommendedTier: DeviceTier.flagship,
    );
    ModelCatalog.instance.addModel(model);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Added: $name')),
    );
  }

  void _importCustomModel() {
    final url = _ggufUrlController.text.trim();
    if (url.isEmpty || !url.startsWith('http')) {
      setState(() => _importError = 'Please enter a valid URL starting with http');
      return;
    }
    if (!url.toLowerCase().endsWith('.gguf') && !url.contains('/resolve/')) {
      setState(() => _importError = 'URL should point to a .gguf file');
      return;
    }
    final name = _customModelNameController.text.trim().isNotEmpty
      ? _customModelNameController.text.trim()
      : url.split('/').last.replaceAll('.gguf', '').replaceAll('-Q4_K_M', '');
    final id = 'custom-${DateTime.now().millisecondsSinceEpoch}';
    final model = ModelEntry(
      id: id,
      name: name,
      description: 'Custom imported model',
      url: url,
      sizeBytes: 0,
      ramRequiredMB: 0,
      quantization: 'Q4_K_M',
      contextLength: 8192,
      capabilities: ['chat'],
      recommendedTier: DeviceTier.flagship,
    );
    ModelCatalog.instance.addModel(model);
    setState(() { _importError = null; });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Added: $name')),
    );
  }

  void _completeOnboarding() {
    // Remove any auto-created default backend before adding user's choice
    final bm = BackendManager.instance;
    for (final b in bm.backends.toList()) {
      if (b.id == 'default-cloud' || b.id == 'setup-required') {
        bm.removeBackend(b.id);
      }
    }

    if (_selectedMode != 'local') {
      final provider = _selectedProvider == 'ollama' ? ApiProvider.ollama
        : _selectedProvider == 'anthropic' ? ApiProvider.anthropic
        : ApiProvider.openai;

      bm.registerBackend(BackendConfig(
        id: 'default-${_selectedProvider}',
        name: _selectedProvider == 'ollama' ? 'Ollama ($_selectedModel)' : 'Cloud ($_selectedModel)',
        provider: provider,
        baseUrl: _apiEndpointController.text.trim(),
        apiKey: _apiKeyController.text.trim(),
        defaultModel: _selectedModel,
        isDefault: true,
      ));
    }

    ref.read(onboardingCompleteProvider.notifier).state = true;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const ChatScreen()),
    );
  }
}

class _ModeCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  const _ModeCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      color: selected ? theme.colorScheme.primaryContainer : null,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: selected
            ? BorderSide(color: theme.colorScheme.primary, width: 2)
            : BorderSide(color: theme.colorScheme.outlineVariant),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              Icon(icon, size: 32, color: selected ? theme.colorScheme.primary : theme.colorScheme.onSurface.withValues(alpha: 0.6)),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: selected ? FontWeight.bold : FontWeight.normal,
                    )),
                    const SizedBox(height: 2),
                    Text(subtitle, style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                    )),
                  ],
                ),
              ),
              if (selected) Icon(Icons.check_circle, color: theme.colorScheme.primary),
            ],
          ),
        ),
      ),
    );
  }
}