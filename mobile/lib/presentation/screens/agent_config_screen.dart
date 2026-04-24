/// Agent configuration screen — create and manage named agents

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tekton_app/domain/agent/agent.dart';
import 'package:tekton_app/domain/llm/backend_manager.dart';
import 'package:tekton_app/presentation/providers/app_providers.dart';

class AgentConfigScreen extends ConsumerStatefulWidget {
  const AgentConfigScreen({super.key});

  @override
  ConsumerState<AgentConfigScreen> createState() => _AgentConfigScreenState();
}

class _AgentConfigScreenState extends ConsumerState<AgentConfigScreen> {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final agents = ref.watch(allAgentsProvider);
    final backends = ref.watch(backendsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Agents'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showCreateAgentDialog(context),
          ),
        ],
      ),
      body: agents.isEmpty
          ? _buildEmptyState(theme)
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Presets section
                Text('Quick Setup', style: theme.textTheme.titleMedium),
                const SizedBox(height: 12),
                _PresetCard(
                  icon: '💻',
                  title: 'Code Agent',
                  subtitle: 'GLM-5.1 remote · Best for coding',
                  onTap: () => _createPreset('code', backends),
                ),
                const SizedBox(height: 8),
                _PresetCard(
                  icon: '📁',
                  title: 'File Analyst',
                  subtitle: 'Gemma 4 E4B local · File & document analysis',
                  onTap: () => _createPreset('file', backends),
                ),
                const SizedBox(height: 8),
                _PresetCard(
                  icon: '⚡',
                  title: 'Quick Chat',
                  subtitle: 'Gemma 4 E2B local · Fast responses',
                  onTap: () => _createPreset('quick', backends),
                ),
                const SizedBox(height: 24),

                // Custom agents
                Text('Your Agents', style: theme.textTheme.titleMedium),
                const SizedBox(height: 12),
                ...agents.map((agent) => Card(
                  child: ListTile(
                    leading: CircleAvatar(
                      child: Text(agent.avatar ?? agent.displayName[0]),
                    ),
                    title: Text(agent.displayName),
                    subtitle: Text('${agent.modelRef} · Priority ${agent.priority}'),
                    trailing: PopupMenuButton(
                      itemBuilder: (_) => [
                        const PopupMenuItem(value: 'edit', child: Text('Edit')),
                        const PopupMenuItem(value: 'delete', child: Text('Delete')),
                      ],
                      onSelected: (value) {
                        if (value == 'delete') {
                          AgentManager.instance.deleteAgent(agent.id);
                          setState(() {});
                        } else if (value == 'edit') {
                          _showEditAgentDialog(context, agent);
                        }
                      },
                    ),
                    onTap: () => _showEditAgentDialog(context, agent),
                  ),
                )),
              ],
            ),
    );
  }

  Widget _buildEmptyState(ThemeData theme) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.smart_toy, size: 64, color: theme.colorScheme.primary.withValues(alpha: 0.3)),
          const SizedBox(height: 16),
          Text('No agents yet', style: theme.textTheme.titleLarge),
          const SizedBox(height: 8),
          Text('Create agents to handle different tasks', style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
          )),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: () => _showCreateAgentDialog(context),
            icon: const Icon(Icons.add),
            label: const Text('Create Agent'),
          ),
        ],
      ),
    );
  }

  void _createPreset(String type, List backends) {
    final backendId = backends.isNotEmpty ? backends.first.id : 'default';
    AgentConfig preset;
    switch (type) {
      case 'code':
        preset = AgentPresets.codeAssistant(remoteBackendId: backendId);
        break;
      case 'file':
        preset = AgentPresets.fileAnalyst(localBackendId: backendId);
        break;
      case 'quick':
        preset = AgentPresets.quickChat(localBackendId: backendId);
        break;
      default:
        return;
    }
    AgentManager.instance.createAgent(preset);
    setState(() {});
  }

  void _showCreateAgentDialog(BuildContext context) {
    _showAgentDialog(context, null);
  }

  void _showEditAgentDialog(BuildContext context, AgentConfig agent) {
    _showAgentDialog(context, agent);
  }

  void _showAgentDialog(BuildContext context, AgentConfig? existing) {
    final nameCtl = TextEditingController(text: existing?.displayName ?? '');
    final promptCtl = TextEditingController(text: existing?.systemPrompt ?? '');
    final modelCtl = TextEditingController(text: existing?.modelRef ?? 'gpt-4o');
    String? selectedBackendId = existing?.backendId;
    var selectedAvatar = existing?.avatar ?? '🤖';
    final toolPermissions = <String>{...?existing?.enabledTools};
    final taskAffinities = <String>{...?existing?.taskAffinities};

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text(existing != null ? 'Edit Agent' : 'Create Agent'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Avatar picker
                Row(
                  children: [
                    Text(selectedAvatar, style: const TextStyle(fontSize: 32)),
                    const SizedBox(width: 12),
                    Expanded(child: TextField(controller: nameCtl, decoration: const InputDecoration(labelText: 'Agent Name', border: OutlineInputBorder()))),
                  ],
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: promptCtl,
                  decoration: const InputDecoration(labelText: 'System Prompt', border: OutlineInputBorder(), alignLabelWithHint: true),
                  maxLines: 4,
                ),
                const SizedBox(height: 16),
                TextField(controller: modelCtl, decoration: const InputDecoration(labelText: 'Model', border: OutlineInputBorder(), hintText: 'gemma4-e4b')),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: selectedBackendId,
                  decoration: const InputDecoration(labelText: 'Backend', border: OutlineInputBorder()),
                  items: BackendManager.instance.backends.map((b) =>
                    DropdownMenuItem(value: b.id, child: Text(b.name)),
                  ).toList(),
                  onChanged: (v) => setState(() => selectedBackendId = v),
                ),
                const SizedBox(height: 16),
                Text('Tools', style: Theme.of(context).textTheme.titleSmall),
                Wrap(
                  spacing: 8,
                  children: ToolPermission.values.map((t) => FilterChip(
                    label: Text(t.name),
                    selected: toolPermissions.contains(t.name),
                    onSelected: (s) => setState(() => s ? toolPermissions.add(t.name) : toolPermissions.remove(t.name)),
                  )).toList(),
                ),
                const SizedBox(height: 16),
                Text('Task Affinities', style: Theme.of(context).textTheme.titleSmall),
                Wrap(
                  spacing: 8,
                  children: TaskAffinity.values.map((t) => FilterChip(
                    label: Text(t.name),
                    selected: taskAffinities.contains(t.name),
                    onSelected: (s) => setState(() => s ? taskAffinities.add(t.name) : taskAffinities.remove(t.name)),
                  )).toList(),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            FilledButton(
              onPressed: () {
                if (existing != null) {
                  existing.displayName = nameCtl.text;
                  existing.avatar = selectedAvatar;
                  existing.systemPrompt = promptCtl.text;
                  existing.modelRef = modelCtl.text;
                  existing.backendId = selectedBackendId ?? '';
                  existing.enabledTools = toolPermissions.toList();
                  existing.taskAffinities = taskAffinities.toList();
                  AgentManager.instance.updateAgent(existing);
                } else {
                  AgentManager.instance.createAgent(AgentConfig(
                    id: 'agent-${DateTime.now().millisecondsSinceEpoch}',
                    displayName: nameCtl.text,
                    avatar: selectedAvatar,
                    systemPrompt: promptCtl.text,
                    modelRef: modelCtl.text,
                    backendId: selectedBackendId ?? 'default',
                    enabledTools: toolPermissions.toList(),
                    taskAffinities: taskAffinities.toList(),
                  ));
                }
                Navigator.pop(context);
                this.setState(() {});
              },
              child: Text(existing != null ? 'Save' : 'Create'),
            ),
          ],
        ),
      ),
    );
  }
}

class _PresetCard extends StatelessWidget {
  final String icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _PresetCard({required this.icon, required this.title, required this.subtitle, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: Text(icon, style: const TextStyle(fontSize: 28)),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.add_circle_outline),
        onTap: onTap,
      ),
    );
  }
}