/// Model catalog screen — browse, download, import, and manage local models

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tekton_app/domain/install/install.dart';
import 'package:tekton_app/presentation/providers/app_providers.dart';

enum ModelFilter { all, downloaded, custom }

class ModelCatalogScreen extends ConsumerStatefulWidget {
  const ModelCatalogScreen({super.key});

  @override
  ConsumerState<ModelCatalogScreen> createState() => _ModelCatalogScreenState();
}

class _ModelCatalogScreenState extends ConsumerState<ModelCatalogScreen> {
  ModelFilter _filter = ModelFilter.all;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final catalog = ref.watch(modelCatalogProvider);
    final allModels = catalog.allModels;

    final filteredModels = allModels.where((m) {
      switch (_filter) {
        case ModelFilter.all:
          return true;
        case ModelFilter.downloaded:
          return m.isDownloaded;
        case ModelFilter.custom:
          return _isCustomModel(m);
      }
    }).toList();

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Model Catalog'),
          actions: [
            IconButton(
              icon: const Icon(Icons.link),
              tooltip: 'Import from URL',
              onPressed: () => _importFromUrl(context),
            ),
            IconButton(
              icon: const Icon(Icons.upload_file),
              tooltip: 'Import from file',
              onPressed: () => _importFromFile(context),
            ),
          ],
          bottom: TabBar(
            tabs: const [
              Tab(text: 'All'),
              Tab(text: 'Downloaded'),
              Tab(text: 'Custom'),
            ],
            onTap: (i) => setState(() => _filter = ModelFilter.values[i]),
          ),
        ),
        body: Column(
          children: [
            // Device info card
            Card(
              margin: const EdgeInsets.all(16),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(Icons.phone_android, color: theme.colorScheme.primary),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Your Device', style: theme.textTheme.titleSmall),
                          Text('Models matching your RAM are highlighted', style: theme.textTheme.bodySmall),
                        ],
                      ),
                    ),
                    FilledButton.tonal(
                      onPressed: () {},
                      child: const Text('Check RAM'),
                    ),
                  ],
                ),
              ),
            ),

            // Model list
            Expanded(
              child: filteredModels.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.inbox, size: 48, color: theme.colorScheme.outline),
                        const SizedBox(height: 16),
                        Text('No models found', style: theme.textTheme.titleMedium),
                        const SizedBox(height: 8),
                        Text(
                          _filter == ModelFilter.custom
                            ? 'Import a GGUF model from URL or file'
                            : 'Download a model to get started',
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  )
                : ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    children: [
                      if (_filter == ModelFilter.all) ...[
                        Text('Recommended for You', style: theme.textTheme.titleMedium),
                        const SizedBox(height: 8),
                        ...filteredModels.where((m) => !_isCustomModel(m) && m.recommendedTier != DeviceTier.budget).map((m) =>
                          _ModelCard(model: m, onTap: () => _showModelDetail(context, m)),
                        ),
                        const SizedBox(height: 24),
                        Text('All Models', style: theme.textTheme.titleMedium),
                        const SizedBox(height: 8),
                      ],
                      ...filteredModels.map((m) =>
                        _ModelCard(model: m, onTap: () => _showModelDetail(context, m)),
                      ),
                    ],
                  ),
            ),
          ],
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () => _importFromUrl(context),
          icon: const Icon(Icons.add),
          label: const Text('Add Model'),
        ),
      ),
    );
  }

  bool _isCustomModel(ModelEntry m) {
    // Custom models are ones not in the built-in catalog
    final builtInIds = BuiltInModels.catalog.map((b) => b.id).toSet();
    return !builtInIds.contains(m.id);
  }

  void _importFromUrl(BuildContext context) {
    final urlController = TextEditingController();
    final nameController = TextEditingController();
    final quantController = TextEditingController(text: 'Q4_K_M');
    final contextController = TextEditingController(text: '8192');

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Import Model from URL'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: urlController,
                decoration: const InputDecoration(
                  labelText: 'GGUF URL',
                  border: OutlineInputBorder(),
                  hintText: 'https://huggingface.co/.../model.gguf',
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Display Name',
                  border: OutlineInputBorder(),
                  hintText: 'My Custom Model',
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: quantController,
                      decoration: const InputDecoration(
                        labelText: 'Quantization',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: contextController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Context Length',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(
            onPressed: () {
              final url = urlController.text.trim();
              if (url.isEmpty) return;

              final id = 'custom-${DateTime.now().millisecondsSinceEpoch}';
              final name = nameController.text.isEmpty
                ? url.split('/').last.replaceAll('.gguf', '')
                : nameController.text;
              final contextLen = int.tryParse(contextController.text) ?? 8192;

              final model = ModelEntry(
                id: id,
                name: name,
                description: 'Custom imported model',
                url: url,
                sizeBytes: 0, // Unknown until downloaded
                ramRequiredMB: 0, // Will estimate after download
                quantization: quantController.text,
                contextLength: contextLen,
                capabilities: ['chat'],
                recommendedTier: DeviceTier.flagship,
              );

              ModelCatalog.instance.addModel(model);
              Navigator.pop(context);
              setState(() {});
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Added: $name')),
              );
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  void _importFromFile(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('File picker requires a running engine. Import from URL instead.')),
    );
  }

  void _showModelDetail(BuildContext context, ModelEntry model) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.4,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => ListView(
          controller: scrollController,
          padding: const EdgeInsets.all(24),
          children: [
            Text(model.name, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 4),
            if (_isCustomModel(model))
              Container(
                margin: const EdgeInsets.only(top: 4),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.tertiaryContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text('Custom', style: Theme.of(context).textTheme.labelSmall),
              ),
            const SizedBox(height: 8),
            Text(model.description),
            const SizedBox(height: 16),
            if (model.sizeBytes > 0) _InfoRow(Icons.storage, 'Size', model.sizeFormatted),
            if (model.ramRequiredMB > 0) _InfoRow(Icons.memory, 'RAM Required', model.ramFormatted),
            _InfoRow(Icons.speed, 'Quantization', model.quantization),
            _InfoRow(Icons.token, 'Context', '${model.contextLength ~/ 1000}K'),
            if (model.capabilities.isNotEmpty) _InfoRow(Icons.star, 'Capabilities', model.capabilities.join(', ')),
            if (model.url.isNotEmpty) _InfoRow(Icons.link, 'URL', model.url),
            const SizedBox(height: 24),
            if (model.isDownloaded)
              Row(
                children: [
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () {
                        // Load model
                        Navigator.pop(context);
                      },
                      icon: Icon(model.isLoaded ? Icons.check : Icons.play_arrow),
                      label: Text(model.isLoaded ? 'Loaded' : 'Load Model'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _confirmDelete(context, model),
                      icon: const Icon(Icons.delete),
                      label: const Text('Delete'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (!_isCustomModel(model))
                    const SizedBox.shrink()
                  else
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          ModelCatalog.instance.removeModel(model.id);
                          Navigator.pop(context);
                          setState(() {});
                        },
                        icon: const Icon(Icons.remove_circle_outline),
                        label: const Text('Remove'),
                      ),
                    ),
                ],
              )
            else
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () async {
                    await ModelCatalog.instance.downloadModel(model.id);
                    Navigator.pop(context);
                    setState(() {});
                  },
                  icon: const Icon(Icons.download),
                  label: model.sizeBytes > 0
                    ? Text('Download (${model.sizeFormatted})')
                    : const Text('Download'),
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _confirmDelete(BuildContext context, ModelEntry model) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Model'),
        content: Text('Remove ${model.name} from your device? This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () async {
              await ModelCatalog.instance.deleteModel(model.id);
              Navigator.pop(context); // Close dialog
              Navigator.pop(context); // Close bottom sheet
              setState(() {});
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}

class _ModelCard extends StatelessWidget {
  final ModelEntry model;
  final VoidCallback onTap;

  const _ModelCard({required this.model, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(
          model.isLoaded ? Icons.play_circle_filled : model.isDownloaded ? Icons.check_circle : Icons.download,
          color: model.isLoaded ? Colors.green : model.isDownloaded ? theme.colorScheme.primary : theme.colorScheme.outline,
        ),
        title: Text(model.name),
        subtitle: Text(
          model.sizeBytes > 0
            ? '${model.sizeFormatted} - ${model.ramFormatted} RAM - ${model.quantization}'
            : '${model.quantization} - ${model.contextLength ~/ 1000}K context',
        ),
        trailing: model.isLoaded
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.green.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text('Active', style: TextStyle(color: Colors.green, fontSize: 12)),
            )
          : model.isDownloaded
            ? const Text('Ready')
            : null,
        onTap: onTap,
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow(this.icon, this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 8),
          Text(label, style: Theme.of(context).textTheme.bodySmall),
          const Spacer(),
          Flexible(child: Text(value, style: Theme.of(context).textTheme.bodyMedium, overflow: TextOverflow.ellipsis)),
        ],
      ),
    );
  }
}