/// Memory browser — view, edit, and delete stored memories

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tekton_app/domain/memory/memory.dart';
import 'package:tekton_app/presentation/providers/app_providers.dart';

class MemoryBrowserScreen extends ConsumerStatefulWidget {
  const MemoryBrowserScreen({super.key});

  @override
  ConsumerState<MemoryBrowserScreen> createState() => _MemoryBrowserScreenState();
}

class _MemoryBrowserScreenState extends ConsumerState<MemoryBrowserScreen> {
  String _searchQuery = '';
  MemoryType? _filterType;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final memoryStore = ref.watch(memoryStoreProvider);

    // Get filtered memories
    final memories = _searchQuery.isEmpty
        ? memoryStore.all
        : memoryStore.search(_searchQuery);
    final filteredMemories = _filterType != null
        ? memories.where((m) => m.type == _filterType).toList()
        : memories;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Memory'),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_sweep),
            tooltip: 'Prune expired',
            onPressed: () => _pruneExpired(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search memories...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(28)),
              ),
              onChanged: (v) => setState(() => _searchQuery = v),
            ),
          ),

          // Filter chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                FilterChip(
                  label: const Text('All'),
                  selected: _filterType == null,
                  onSelected: (_) => setState(() => _filterType = null),
                ),
                const SizedBox(width: 8),
                ...MemoryType.values.map((type) => Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(type.name),
                    selected: _filterType == type,
                    onSelected: (_) => setState(() => _filterType = type),
                  ),
                )),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // Memory count
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text('${filteredMemories.length} memories', style: theme.textTheme.bodySmall),
            ),
          ),

          // Memory list
          Expanded(
            child: filteredMemories.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.psychology_outlined, size: 64, color: theme.colorScheme.primary.withValues(alpha: 0.3)),
                        const SizedBox(height: 16),
                        Text('No memories yet', style: theme.textTheme.titleLarge),
                        const SizedBox(height: 8),
                        Text('Memories are built as you chat', style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                        )),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: filteredMemories.length,
                    itemBuilder: (context, index) {
                      final memory = filteredMemories[index];
                      final strength = memory.getStrength();
                      return Dismissible(
                        key: Key(memory.id),
                        direction: DismissDirection.endToStart,
                        background: Container(
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 16),
                          color: Colors.red,
                          child: const Icon(Icons.delete, color: Colors.white),
                        ),
                        onDismissed: (_) => memoryStore.delete(memory.id),
                        child: Card(
                          child: ListTile(
                            leading: _MemoryStrengthIndicator(strength: strength),
                            title: Text(memory.content, maxLines: 2, overflow: TextOverflow.ellipsis),
                            subtitle: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: theme.colorScheme.secondaryContainer,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(memory.type.name, style: theme.textTheme.labelSmall),
                                ),
                                const SizedBox(width: 8),
                                Text('Accessed ${memory.accessCount}×', style: theme.textTheme.bodySmall),
                                const Spacer(),
                                Text(_formatAge(memory.createdAt), style: theme.textTheme.labelSmall),
                              ],
                            ),
                            onTap: () => _showMemoryDetail(memory),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  void _showMemoryDetail(MemoryEntry memory) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(memory.type.name.toUpperCase()),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(memory.content),
              const SizedBox(height: 16),
              Text('Importance: ${(memory.importance * 100).toStringAsFixed(0)}%'),
              Text('Strength: ${(memory.getStrength() * 100).toStringAsFixed(0)}%'),
              Text('Accessed: ${memory.accessCount} times'),
              Text('Created: ${memory.createdAt.toLocal().toString()}'),
              Text('Last accessed: ${memory.lastAccessedAt.toLocal().toString()}'),
              if (memory.tags.isNotEmpty)
                Wrap(spacing: 4, children: memory.tags.map((t) => Chip(label: Text(t))).toList()),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () { ref.read(memoryStoreProvider).delete(memory.id); Navigator.pop(context); }, child: const Text('Delete')),
          FilledButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
        ],
      ),
    );
  }

  void _pruneExpired() {
    final count = ref.read(memoryStoreProvider).pruneExpired();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Pruned $count expired memories')),
    );
    setState(() {});
  }

  String _formatAge(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inDays > 30) return '${diff.inDays ~/ 30}mo ago';
    if (diff.inDays > 0) return '${diff.inDays}d ago';
    if (diff.inHours > 0) return '${diff.inHours}h ago';
    return 'just now';
  }
}

class _MemoryStrengthIndicator extends StatelessWidget {
  final double strength;

  const _MemoryStrengthIndicator({required this.strength});

  @override
  Widget build(BuildContext context) {
    final color = strength > 0.7 ? Colors.green : strength > 0.4 ? Colors.orange : Colors.red;
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
    );
  }
}