/// Settings screen — app configuration, backend management, server, and preferences

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tekton_app/app.dart';
import 'package:tekton_app/domain/llm/llm.dart';
import 'package:tekton_app/domain/llm/backend_manager.dart';
import 'package:tekton_app/domain/config/config.dart';
import 'package:tekton_app/domain/server/server.dart';
import 'package:tekton_app/presentation/providers/app_providers.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final _nameController = TextEditingController();
  final _urlController = TextEditingController();
  final _keyController = TextEditingController();
  final _modelController = TextEditingController();
  final _systemPromptController = TextEditingController();
  final _portController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _urlController.dispose();
    _keyController.dispose();
    _modelController.dispose();
    _systemPromptController.dispose();
    _portController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final backends = ref.watch(backendsProvider);
    final server = ref.watch(tektonServerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          // === Appearance ===
          _sectionHeader(context, 'Appearance'),
          Consumer(builder: (context, ref, _) {
            final themeMode = ref.watch(themeModeProvider);
            return ListTile(
              leading: const Icon(Icons.dark_mode),
              title: const Text('Theme'),
              subtitle: Text(switch (themeMode) {
                ThemeMode.dark => 'Dark',
                ThemeMode.light => 'Light',
                ThemeMode.system => 'System',
              }),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => _showThemePicker(context),
            );
          }),
          Consumer(builder: (context, ref, _) {
            final seedColor = ref.watch(seedColorProvider);
            return ListTile(
              leading: Icon(Icons.palette, color: seedColor),
              title: const Text('Accent Color'),
              subtitle: Text(_colorName(seedColor)),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => _showColorPicker(context),
            );
          }),

          // === AI Backends ===
          _sectionHeader(context, 'AI Backends'),
          ...backends.map((b) => ListTile(
            leading: Icon(_providerIcon(b.provider), color: b.isConnected ? Colors.green : Colors.grey),
            title: Text(b.name),
            subtitle: Text('${b.provider.name} · ${b.defaultModel}'),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (b.isDefault)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text('Default', style: theme.textTheme.labelSmall),
                  ),
                IconButton(
                  icon: const Icon(Icons.edit_outlined),
                  onPressed: () => _editBackendSystemPrompt(context, b),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () => _deleteBackend(b),
                ),
              ],
            ),
            onLongPress: () => _setDefault(b),
          )),
          ListTile(
            leading: const Icon(Icons.add_circle_outline),
            title: const Text('Add Backend'),
            onTap: () => _showAddBackendDialog(context),
          ),

          // === Agent Routing ===
          _sectionHeader(context, 'Agent Routing'),
          ListTile(
            leading: const Icon(Icons.route),
            title: const Text('Default Routing Mode'),
            subtitle: const Text('Director auto-routes your messages'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _showRoutingModePicker(context),
          ),

          // === Inference Parameters ===
          _sectionHeader(context, 'Inference Parameters'),
          _InferenceParamsSection(),

          // === Memory ===
          _sectionHeader(context, 'Memory'),
          SwitchListTile(
            secondary: const Icon(Icons.psychology),
            title: const Text('AI Memory'),
            subtitle: const Text('Remember facts across conversations'),
            value: true,
            onChanged: (v) {},
          ),

          // === Local Engine ===
          _sectionHeader(context, 'Local Engine'),
          ListTile(
            leading: const Icon(Icons.download),
            title: const Text('Download Engine'),
            subtitle: const Text('llama.cpp native library'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const _EngineDownloadSection()));
            },
          ),

          // === Server Mode ===
          _sectionHeader(context, 'Server Mode'),
          SwitchListTile(
            secondary: Icon(server.isRunning ? Icons.dns : Icons.dns_outlined),
            title: const Text('Enable Server'),
            subtitle: Text(server.isRunning
              ? 'Running on ${server.bindToLocalhost ? "127.0.0.1" : "0.0.0.0"}:${server.port}'
              : 'Expose models via OpenAI-compatible API'),
            value: server.isRunning,
            onChanged: (v) async {
              if (v) {
                try {
                  await server.start();
                  ref.invalidate(tektonServerProvider);
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Server failed to start: $e')),
                    );
                  }
                }
              } else {
                await server.stop();
                ref.invalidate(tektonServerProvider);
              }
              setState(() {});
            },
          ),
          ListTile(
            leading: const Icon(Icons.numbers),
            title: const Text('Server Port'),
            subtitle: Text('${server.port}'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _showPortConfig(context, server),
          ),
          SwitchListTile(
            secondary: const Icon(Icons.lan),
            title: const Text('Bind to All Interfaces'),
            subtitle: const Text('Allow network access (0.0.0.0). Default: localhost only.'),
            value: !server.bindToLocalhost,
            onChanged: (v) async {
              if (server.isRunning) {
                await server.stop();
              }
              server.bindToLocalhost = !v;
              setState(() {});
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(v
                    ? 'Will bind to 0.0.0.0 on next start'
                    : 'Will bind to localhost on next start')),
                );
              }
            },
          ),
          ListTile(
            leading: const Icon(Icons.wifi_find),
            title: const Text('Auto-Discovery'),
            subtitle: const Text('mDNS/Bonjour for local network'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),

          // === About ===
          _sectionHeader(context, 'About'),
          const ListTile(
            leading: Icon(Icons.info_outline),
            title: Text('Tekton'),
            subtitle: Text('Version 0.1.0'),
          ),
          const ListTile(
            leading: Icon(Icons.code),
            title: Text('Open Source'),
            subtitle: Text('MIT License · github.com/messyjs/tekton'),
          ),
        ],
      ),
    );
  }

  IconData _providerIcon(ApiProvider provider) {
    if (provider == ApiProvider.anthropic) return Icons.cloud;
    if (provider == ApiProvider.ollama) return Icons.computer;
    if (provider == ApiProvider.llamaServer) return Icons.phone_android;
    if (provider == ApiProvider.tektonServer) return Icons.hub;
    if (provider == ApiProvider.custom) return Icons.settings_ethernet;
    return Icons.cloud;
  }

  void _showThemePicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text('Theme', style: Theme.of(context).textTheme.titleLarge),
            ),
            Consumer(builder: (context, ref, _) {
              final current = ref.watch(themeModeProvider);
              return Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ListTile(
                    leading: const Icon(Icons.brightness_auto),
                    title: const Text('System'),
                    trailing: current == ThemeMode.system ? const Icon(Icons.check) : null,
                    onTap: () { ref.read(themeModeProvider.notifier).setTheme(ThemeMode.system); Navigator.pop(context); },
                  ),
                  ListTile(
                    leading: const Icon(Icons.light_mode),
                    title: const Text('Light'),
                    trailing: current == ThemeMode.light ? const Icon(Icons.check) : null,
                    onTap: () { ref.read(themeModeProvider.notifier).setTheme(ThemeMode.light); Navigator.pop(context); },
                  ),
                  ListTile(
                    leading: const Icon(Icons.dark_mode),
                    title: const Text('Dark'),
                    trailing: current == ThemeMode.dark ? const Icon(Icons.check) : null,
                    onTap: () { ref.read(themeModeProvider.notifier).setTheme(ThemeMode.dark); Navigator.pop(context); },
                  ),
                ],
              );
            }),
          ],
        ),
      ),
    );
  }

  static const Map<String, Color> _accentColors = {
    'Lime Green': Color(0xFF84CC16),
    'Emerald': Color(0xFF10B981),
    'Cyan': Color(0xFF06B6D4),
    'Blue': Color(0xFF3B82F6),
    'Indigo': Color(0xFF6366F1),
    'Purple': Color(0xFF8B5CF6),
    'Pink': Color(0xFFEC4899),
    'Rose': Color(0xFFF43F5E),
    'Orange': Color(0xFFF97316),
    'Amber': Color(0xFFF59E0B),
    'Teal': Color(0xFF14B8A6),
    'Slate': Color(0xFF64748B),
  };

  String _colorName(Color color) {
    for (final entry in _accentColors.entries) {
      if (entry.value.value == color.value) return entry.key;
    }
    return 'Custom';
  }

  void _showColorPicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text('Accent Color', style: Theme.of(context).textTheme.titleLarge),
            ),
            Consumer(builder: (context, ref, _) {
              final current = ref.watch(seedColorProvider);
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: _accentColors.entries.map((entry) => InkWell(
                    onTap: () {
                      ref.read(seedColorProvider.notifier).setColor(entry.value);
                      Navigator.pop(context);
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: entry.value,
                        borderRadius: BorderRadius.circular(12),
                        border: current.value == entry.value.value
                          ? Border.all(color: Colors.white, width: 3)
                          : null,
                      ),
                      child: current.value == entry.value.value
                        ? const Icon(Icons.check, color: Colors.white, size: 28)
                        : null,
                    ),
                  )).toList(),
                ),
              );
            }),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _showPortConfig(BuildContext context, TektonServer server) {
    _portController.text = server.port.toString();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Server Port'),
        content: TextField(
          controller: _portController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Port',
            hintText: '4891',
            border: OutlineInputBorder(),
            helperText: 'Choose a port from 1024 to 65535',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(
            onPressed: () {
              final port = int.tryParse(_portController.text) ?? 4891;
              server.port = port.clamp(1024, 65535);
              Navigator.pop(context);
              setState(() {});
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _editBackendSystemPrompt(BuildContext context, BackendConfig backend) {
    _systemPromptController.text = backend.customSystemPrompt ?? '';
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('System Prompt: ${backend.name}'),
        content: TextField(
          controller: _systemPromptController,
          maxLines: 8,
          decoration: const InputDecoration(
            labelText: 'Custom System Prompt',
            border: OutlineInputBorder(),
            hintText: 'Override the default system prompt for this model...',
            alignLabelWithHint: true,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              backend.customSystemPrompt = null;
              _systemPromptController.clear();
              Navigator.pop(context);
            },
            child: const Text('Reset'),
          ),
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(
            onPressed: () {
              backend.customSystemPrompt = _systemPromptController.text.isEmpty
                ? null : _systemPromptController.text;
              Navigator.pop(context);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _showAddBackendDialog(BuildContext context) {
    ApiProvider selectedProvider = ApiProvider.openai;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Add Backend'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<ApiProvider>(
                  value: selectedProvider,
                  decoration: const InputDecoration(labelText: 'Provider', border: OutlineInputBorder()),
                  items: ApiProvider.values.map((p) => DropdownMenuItem(value: p, child: Text(p.name))).toList(),
                  onChanged: (v) => setState(() => selectedProvider = v!),
                ),
                const SizedBox(height: 16),
                TextField(controller: _nameController, decoration: const InputDecoration(labelText: 'Name', border: OutlineInputBorder(), hintText: 'My OpenAI')),
                const SizedBox(height: 16),
                TextField(controller: _urlController, decoration: const InputDecoration(labelText: 'API Endpoint', border: OutlineInputBorder(), hintText: 'https://api.openai.com')),
                const SizedBox(height: 16),
                TextField(controller: _keyController, decoration: const InputDecoration(labelText: 'API Key', border: OutlineInputBorder(), hintText: 'sk-...'), obscureText: true),
                const SizedBox(height: 16),
                TextField(controller: _modelController, decoration: const InputDecoration(labelText: 'Default Model', border: OutlineInputBorder(), hintText: 'gpt-4o')),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            FilledButton(
              onPressed: () {
                final backend = BackendConfig(
                  id: 'backend-${DateTime.now().millisecondsSinceEpoch}',
                  name: _nameController.text.isEmpty ? selectedProvider.name : _nameController.text,
                  provider: selectedProvider,
                  baseUrl: _urlController.text.isEmpty ? 'https://api.openai.com' : _urlController.text,
                  apiKey: _keyController.text,
                  defaultModel: _modelController.text.isEmpty ? 'gpt-4o' : _modelController.text,
                );
                BackendManager.instance.registerBackend(backend);
                Navigator.pop(context);
                this.setState(() {});
              },
              child: const Text('Add'),
            ),
          ],
        ),
      ),
    );
  }

  void _deleteBackend(BackendConfig backend) {
    BackendManager.instance.removeBackend(backend.id);
    setState(() {});
  }

  void _setDefault(BackendConfig backend) {
    BackendManager.instance.setDefault(backend.id);
    setState(() {});
  }

  void _showRoutingModePicker(BuildContext context) {}

  Widget _sectionHeader(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
      child: Text(title, style: Theme.of(context).textTheme.titleSmall?.copyWith(
        color: Theme.of(context).colorScheme.primary,
        fontWeight: FontWeight.bold,
      )),
    );
  }
}

class _InferenceParamsSection extends ConsumerStatefulWidget {
  @override
  ConsumerState<_InferenceParamsSection> createState() => _InferenceParamsSectionState();
}

class _InferenceParamsSectionState extends ConsumerState<_InferenceParamsSection> {
  double _temperature = 0.7;
  double _topP = 0.9;
  int _topK = 40;
  int _contextLength = 8192;
  int _threadCount = 4;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        ListTile(
          title: Text('Temperature: ${_temperature.toStringAsFixed(1)}'),
          subtitle: Slider(
            value: _temperature,
            min: 0,
            max: 2,
            divisions: 20,
            label: _temperature.toStringAsFixed(1),
            onChanged: (v) => setState(() => _temperature = v),
          ),
        ),
        ListTile(
          title: Text('Top P: ${_topP.toStringAsFixed(1)}'),
          subtitle: Slider(
            value: _topP,
            min: 0,
            max: 1,
            divisions: 10,
            label: _topP.toStringAsFixed(1),
            onChanged: (v) => setState(() => _topP = v),
          ),
        ),
        ListTile(
          title: Text('Top K: $_topK'),
          subtitle: Slider(
            value: _topK.toDouble(),
            min: 1,
            max: 100,
            divisions: 99,
            label: '$_topK',
            onChanged: (v) => setState(() => _topK = v.round()),
          ),
        ),
        ListTile(
          title: Text('Context Length: ${(_contextLength / 1024).round()}K'),
          subtitle: Slider(
            value: _contextLength.toDouble(),
            min: 512,
            max: 131072,
            divisions: 20,
            label: '${(_contextLength / 1024).round()}K',
            onChanged: (v) => setState(() => _contextLength = v.round()),
          ),
        ),
        ListTile(
          title: Text('Threads: $_threadCount'),
          subtitle: Slider(
            value: _threadCount.toDouble(),
            min: 1,
            max: 16,
            divisions: 15,
            label: '$_threadCount',
            onChanged: (v) => setState(() => _threadCount = v.round()),
          ),
        ),
      ],
    );
  }
}

class _EngineDownloadSection extends StatelessWidget {
  const _EngineDownloadSection();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Local Engine')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Icon(Icons.phone_android, color: Theme.of(context).colorScheme.primary),
                    const SizedBox(width: 12),
                    Text('llama.cpp Engine', style: Theme.of(context).textTheme.titleMedium),
                  ]),
                  const SizedBox(height: 12),
                  const Text('Download the native inference engine to run AI models directly on your device.'),
                  const SizedBox(height: 12),
                  const Text('Size: ~15-25MB (architecture dependent)'),
                  const SizedBox(height: 8),
                  const Text('Supports: arm64-v8a, armeabi-v7a, x86_64'),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.download),
                    label: const Text('Download Engine'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}