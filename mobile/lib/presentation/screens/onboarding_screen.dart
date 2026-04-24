/// Onboarding screen — first-run experience.
/// Three setup modes: Cloud Chat (Ollama/OpenAI/Anthropic), Local AI (download GGUF), Hybrid
/// Includes model import from URL and Ollama quick-connect.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
  final _modelNameController = TextEditingController(text: 'gemma3:latest');
  String _selectedProvider = 'ollama';
  bool _testSuccess = false;
  bool _testing = false;

  // Local model import
  final _ggufUrlController = TextEditingController();
  final _customModelNameController = TextEditingController();
  String? _importError;

  @override
  void dispose() {
    _apiEndpointController.dispose();
    _apiKeyController.dispose();
    _modelNameController.dispose();
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
        Text('Your AI, Your Way', style: theme.textTheme.titleMedium?.copyWith(
          color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
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
          subtitle: 'Connect to Ollama running on your workstation or server. Fast, uses your GPU.',
          selected: _selectedMode == 'cloud' && _selectedProvider == 'ollama',
          onTap: () => setState(() { _selectedMode = 'cloud'; _selectedProvider = 'ollama'; }),
        ),
        const SizedBox(height: 12),
        _ModeCard(
          icon: Icons.cloud,
          title: 'Cloud API',
          subtitle: 'OpenAI, Anthropic, or any OpenAI-compatible API. Requires API key.',
          selected: _selectedMode == 'cloud' && _selectedProvider != 'ollama',
          onTap: () => setState(() { _selectedMode = 'cloud'; _selectedProvider = 'openai'; }),
        ),
        const SizedBox(height: 12),
        _ModeCard(
          icon: Icons.phone_android,
          title: 'On-Device AI',
          subtitle: 'Download and run GGUF models locally. Private, works offline.',
          selected: _selectedMode == 'local',
          onTap: () => setState(() => _selectedMode = 'local'),
        ),
        const SizedBox(height: 12),
        _ModeCard(
          icon: Icons.settings_ethernet,
          title: 'Everything',
          subtitle: 'Use all of the above. Switch between them anytime.',
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

          // Ollama quick-connect
          if (showOllama) ..._buildOllamaSection(theme),

          // Cloud API config
          if (showCloud) ..._buildCloudSection(theme),

          // Local model import
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

  List<Widget> _buildOllamaSection(ThemeData theme) {
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
              ]),
              const SizedBox(height: 12),
              Text('Connect to Ollama running on your workstation. Make sure Ollama is running and accessible on your network.',
                style: theme.textTheme.bodySmall),
              const SizedBox(height: 12),
              TextField(
                controller: _apiEndpointController,
                keyboardType: TextInputType.url,
                decoration: const InputDecoration(
                  labelText: 'Ollama Server URL',
                  border: OutlineInputBorder(),
                  hintText: 'http://192.168.1.100:11434',
                  prefixIcon: Icon(Icons.link),
                ),
              ),
              const SizedBox(height: 8),
              Text('Tip: Run "ollama serve" on your workstation, then enter its IP address.',
                style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurface.withValues(alpha: 0.5))),
              const SizedBox(height: 12),
              Row(children: [
                FilledButton.tonal(
                  onPressed: _testing ? null : _testOllamaConnection,
                  child: _testing
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : Text(_testSuccess ? 'Connected!' : 'Test Connection'),
                ),
                if (_testSuccess) ...[
                  const SizedBox(width: 8),
                  Icon(Icons.check_circle, color: Colors.green, size: 20),
                  Text('Connected', style: TextStyle(color: Colors.green.shade700)),
                ],
              ]),
            ],
          ),
        ),
      ),
      const SizedBox(height: 24),
    ];
  }

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
              if (_selectedProvider != 'ollama') ...[
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
                  controller: _modelNameController,
                  decoration: const InputDecoration(
                    labelText: 'Default Model',
                    border: OutlineInputBorder(),
                    hintText: 'gpt-4o',
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
      const SizedBox(height: 24),
    ];
  }

  List<Widget> _buildLocalSection(ThemeData theme) {
    // Built-in models the user can pick from
    final quickModels = [
      ('Gemma 4 2B (Q4_K_M)', 'https://huggingface.co/google/gemma-4-2b-it-GGUF/resolve/main/gemma-4-2b-it-Q4_K_M.gguf', '2B params, ~1.5GB, runs on any phone'),
      ('Gemma 4 4B (Q4_K_M)', 'https://huggingface.co/google/gemma-4-4b-it-GGUF/resolve/main/gemma-4-4b-it-Q4_K_M.gguf', '4B params, ~3GB, best for flagship phones'),
      ('Phi-3.5 Mini 3.8B (Q4_K_M)', 'https://huggingface.co/microsoft/Phi-3.5-mini-instruct-GGUF/resolve/main/phi-3.5-mini-instruct-Q4_K_M.gguf', '3.8B params, great for code and reasoning'),
      ('Dolphin 2.9 2B (Q4_K_M)', 'https://huggingface.co/cognitivecomputations/dolphin-2.9-llama3-2b-GGUF/resolve/main/dolphin-2.9-llama3-2b-Q4_K_M.gguf', '2B params, uncensored'),
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

              // Quick-pick models
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

              // Custom URL import
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
                    onPressed: () {
                      // TODO: clipboard paste
                    },
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
    setState(() { _testing = true; _testSuccess = false; });
    try {
      final url = _apiEndpointController.text.trim();
      final config = BackendConfig(
        id: 'test',
        name: 'Test',
        provider: ApiProvider.ollama,
        baseUrl: url,
        defaultModel: _modelNameController.text,
      );
      final success = await BackendManager.instance.testConnection(config);
      if (mounted) setState(() { _testing = false; _testSuccess = success; });
    } catch (e) {
      if (mounted) setState(() { _testing = false; _testSuccess = false; });
    }
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
      SnackBar(content: Text('Added: $name. Download from Model Catalog later.')),
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
    // Register backends based on selection
    if (_selectedMode != 'local') {
      final provider = _selectedProvider == 'ollama' ? ApiProvider.ollama
        : _selectedProvider == 'anthropic' ? ApiProvider.anthropic
        : ApiProvider.openai;

      BackendManager.instance.registerBackend(BackendConfig(
        id: 'default-${_selectedProvider}',
        name: _selectedProvider == 'ollama' ? 'Ollama' : 'Cloud (${_modelNameController.text})',
        provider: provider,
        baseUrl: _apiEndpointController.text.trim(),
        apiKey: _apiKeyController.text.trim(),
        defaultModel: _modelNameController.text.trim(),
        isDefault: true,
      ));
    }

    // Complete onboarding
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