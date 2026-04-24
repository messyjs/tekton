/// Settings screen — app configuration, backend management, preferences

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tekton_app/domain/llm/llm.dart';
import 'package:tekton_app/domain/config/config.dart';
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

  @override
  void dispose() {
    _nameController.dispose();
    _urlController.dispose();
    _keyController.dispose();
    _modelController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final backends = ref.watch(backendsProvider);
    final defaultBackend = ref.watch(defaultBackendProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          // Theme
          _SectionHeader('Appearance'),
          ListTile(
            leading: const Icon(Icons.dark_mode),
            title: const Text('Theme'),
            subtitle: const Text('System default'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _showThemePicker(context),
          ),

          // Backends
          _SectionHeader('AI Backends'),
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

          // Agent Routing
          _SectionHeader('Agent Routing'),
          ListTile(
            leading: const Icon(Icons.route),
            title: const Text('Default Routing Mode'),
            subtitle: const Text('Director auto-routes your messages'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _showRoutingModePicker(context),
          ),

          // Memory
          _SectionHeader('Memory'),
          SwitchListTile(
            secondary: const Icon(Icons.psychology),
            title: const Text('AI Memory'),
            subtitle: const Text('Remember facts across conversations'),
            value: true,
            onChanged: (v) {},
          ),

          // Install
          _SectionHeader('Local Engine'),
          ListTile(
            leading: const Icon(Icons.download),
            title: const Text('Download Engine'),
            subtitle: const Text('llama.cpp native library'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const _EngineDownloadSection()));
            },
          ),

          // Server
          _SectionHeader('Server Mode'),
          SwitchListTile(
            secondary: const Icon(Icons.dns),
            title: const Text('Enable Server'),
            subtitle: const Text('Expose models via OpenAI-compatible API'),
            value: false,
            onChanged: (v) {},
          ),
          ListTile(
            leading: const Icon(Icons.wifi_find),
            title: const Text('Auto-Discovery'),
            subtitle: const Text('mDNS/Bonjour for local network'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),

          // About
          _SectionHeader('About'),
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
      builder: (context) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(title: Text('Theme', style: Theme.of(context).textTheme.titleLarge)),
          ListTile(leading: const Icon(Icons.brightness_auto), title: const Text('System'), onTap: () { Navigator.pop(context); }),
          ListTile(leading: const Icon(Icons.light_mode), title: const Text('Light'), onTap: () { Navigator.pop(context); }),
          ListTile(leading: const Icon(Icons.dark_mode), title: const Text('Dark'), onTap: () { Navigator.pop(context); }),
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
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader(this.title);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
      child: Text(title, style: Theme.of(context).textTheme.titleSmall?.copyWith(
        color: Theme.of(context).colorScheme.primary,
        fontWeight: FontWeight.bold,
      )),
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
                    onPressed: () {
                      // Trigger engine download
                    },
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