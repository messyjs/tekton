/// Onboarding screen — first-run experience with three paths:
/// (A) Cloud Chat, (B) Local AI, (C) Hybrid

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tekton_app/domain/llm/llm.dart';
import 'package:tekton_app/domain/config/config.dart';
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
  final _apiEndpointController = TextEditingController(text: 'https://api.openai.com');
  final _apiKeyController = TextEditingController();
  final _modelNameController = TextEditingController(text: 'gpt-4o');
  bool _testSuccess = false;
  bool _testing = false;

  @override
  void dispose() {
    _apiEndpointController.dispose();
    _apiKeyController.dispose();
    _modelNameController.dispose();
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
        Text('Connect to cloud AI services, run models\nlocally on your device, or use both.\nYour data stays private.', style: theme.textTheme.bodyMedium?.copyWith(
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

  Widget _buildModeStep(ThemeData theme) {
    return Column(
      key: const ValueKey('mode'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 24),
        Text('How do you want to use Tekton?', style: theme.textTheme.headlineSmall),
        const SizedBox(height: 32),
        _ModeCard(
          icon: Icons.cloud,
          title: 'Cloud Chat',
          subtitle: 'Connect to OpenAI, Anthropic, Ollama, or any OpenAI-compatible API',
          selected: _selectedMode == 'cloud',
          onTap: () => setState(() => _selectedMode = 'cloud'),
        ),
        const SizedBox(height: 16),
        _ModeCard(
          icon: Icons.phone_android,
          title: 'Local AI',
          subtitle: 'Run Gemma models directly on your device. Private, fast, works offline.',
          selected: _selectedMode == 'local',
          onTap: () => setState(() => _selectedMode = 'local'),
        ),
        const SizedBox(height: 16),
        _ModeCard(
          icon: Icons.settings_ethernet,
          title: 'Hybrid',
          subtitle: 'Use both cloud and local AI. Best of both worlds.',
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

  Widget _buildConfigStep(ThemeData theme) {
    final showCloud = _selectedMode == 'cloud' || _selectedMode == 'hybrid';
    final showLocal = _selectedMode == 'local' || _selectedMode == 'hybrid';

    return SingleChildScrollView(
      key: const ValueKey('config'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 24),
          Text('Configure your setup', style: theme.textTheme.headlineSmall),
          const SizedBox(height: 32),

          if (showCloud) ...[
            Text('Cloud Backend', style: theme.textTheme.titleMedium),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: 'openai',
              decoration: const InputDecoration(labelText: 'Provider', border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'openai', child: Text('OpenAI')),
                DropdownMenuItem(value: 'anthropic', child: Text('Anthropic')),
                DropdownMenuItem(value: 'ollama', child: Text('Ollama')),
                DropdownMenuItem(value: 'custom', child: Text('Custom')),
              ],
              onChanged: (v) {},
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _apiEndpointController,
              decoration: const InputDecoration(
                labelText: 'API Endpoint',
                border: OutlineInputBorder(),
                hintText: 'https://api.openai.com',
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _apiKeyController,
              decoration: const InputDecoration(
                labelText: 'API Key',
                border: OutlineInputBorder(),
                hintText: 'sk-...',
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
            const SizedBox(height: 16),
            FilledButton.tonal(
              onPressed: _testConnection,
              child: _testing
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : Text(_testSuccess ? '✓ Connected' : 'Test Connection'),
            ),
            if (_testSuccess)
              Padding(
                padding: const EdgeInsets.only(top: 8.0),
                child: Text('✓ Connection successful!', style: TextStyle(color: Colors.green.shade700)),
              ),
            const SizedBox(height: 32),
          ],

          if (showLocal) ...[
            Text('Local Engine', style: theme.textTheme.titleMedium),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('On-Device AI', style: theme.textTheme.titleSmall),
                    const SizedBox(height: 8),
                    const Text('The inference engine and models will be downloaded after setup. '
                        'You can choose which models to install from the Model Catalog.'),
                    const SizedBox(height: 8),
                    Text('Recommended models:', style: theme.textTheme.bodySmall),
                    const SizedBox(height: 4),
                    const Text('• Gemma 4 E2B (~3.2GB) — All phones'),
                    const Text('• Gemma 4 E4B (~5GB) — Flagship phones'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),
          ],

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

  Future<void> _testConnection() async {
    setState(() { _testing = true; _testSuccess = false; });

    try {
      final config = BackendConfig(
        id: 'test',
        name: 'Test',
        provider: ApiProvider.openai,
        baseUrl: _apiEndpointController.text,
        apiKey: _apiKeyController.text,
        defaultModel: _modelNameController.text,
      );

      final backends = BackendManager.instance;
      final success = await backends.testConnection(config);

      if (mounted) {
        setState(() { _testing = false; _testSuccess = success; });
      }
    } catch (e) {
      if (mounted) {
        setState(() { _testing = false; _testSuccess = false; });
      }
    }
  }

  void _completeOnboarding() {
    // Register the backend
    if (_selectedMode != 'local') {
      final provider = switch (_apiEndpointController.text) {
        _ when _apiEndpointController.text.contains('anthropic') => ApiProvider.anthropic,
        _ when _apiEndpointController.text.contains('ollama') => ApiProvider.ollama,
        _ => ApiProvider.openai,
      };

      BackendManager.instance.registerBackend(BackendConfig(
        id: 'default-cloud',
        name: 'Cloud (${_modelNameController.text})',
        provider: provider,
        baseUrl: _apiEndpointController.text,
        apiKey: _apiKeyController.text,
        defaultModel: _modelNameController.text,
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
          padding: const EdgeInsets.all(20.0),
          child: Row(
            children: [
              Icon(icon, size: 36, color: selected ? theme.colorScheme.primary : theme.colorScheme.onSurface.withValues(alpha: 0.6)),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: selected ? FontWeight.bold : FontWeight.normal,
                    )),
                    const SizedBox(height: 4),
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