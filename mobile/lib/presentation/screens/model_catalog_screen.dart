/// Model catalog screen — browse, download, and manage local models

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tekton_app/domain/install/install.dart';
import 'package:tekton_app/presentation/providers/app_providers.dart';

class ModelCatalogScreen extends ConsumerStatefulWidget {
  const ModelCatalogScreen({super.key});

  @override
  ConsumerState<ModelCatalogScreen> createState() => _ModelCatalogScreenState();
}

class _ModelCatalogScreenState extends ConsumerState<ModelCatalogScreen> {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final catalog = ref.watch(modelCatalogProvider);
    final models = catalog.allModels;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Model Catalog'),
        actions: [
          IconButton(
            icon: const Icon(Icons.file_upload),
            tooltip: 'Import GGUF',
            onPressed: () => _importModel(context),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Device info
          Card(
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
                        Text('Optimal models shown with ✅', style: theme.textTheme.bodySmall),
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
          const SizedBox(height: 16),

          // Recommended section
          Text('Recommended for You', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          ...models.where((m) => m.recommendedTier != DeviceTier.budget).map((m) =>
            _ModelCard(model: m, onTap: () => _showModelDetail(context, m)),
          ),
          const SizedBox(height: 24),

          // All models
          Text('All Models', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          ...models.map((m) => _ModelCard(model: m, onTap: () => _showModelDetail(context, m))),
        ],
      ),
    );
  }

  void _showModelDetail(BuildContext context, ModelEntry model) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(model.name, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text(model.description),
            const SizedBox(height: 16),
            _InfoRow(Icons.storage, 'Size', model.sizeFormatted),
            _InfoRow(Icons.memory, 'RAM Required', model.ramFormatted),
            _InfoRow(Icons.speed, 'Quantization', model.quantization),
            _InfoRow(Icons.token, 'Context', '${model.contextLength ~/ 1000}K'),
            _InfoRow(Icons.star, 'Capabilities', model.capabilities.join(', ')),
            const SizedBox(height: 24),
            if (model.isDownloaded)
              Row(
                children: [
                  Expanded(child: FilledButton.icon(
                    onPressed: () {
                      // Load model
                      Navigator.pop(context);
                    },
                    icon: const Icon(Icons.play_arrow),
                    label: model.isLoaded ? const Text('Loaded') : const Text('Load Model'),
                  )),
                  const SizedBox(width: 8),
                  Expanded(child: OutlinedButton.icon(
                    onPressed: () {
                      // Delete model
                      Navigator.pop(context);
                    },
                    icon: const Icon(Icons.delete),
                    label: const Text('Delete'),
                  )),
                ],
              )
            else
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () {
                    // Download model
                    Navigator.pop(context);
                  },
                  icon: const Icon(Icons.download),
                  label: Text('Download (${model.sizeFormatted})'),
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _importModel(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('GGUF import coming soon')),
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
          model.isLoaded ? Icons.circle : model.isDownloaded ? Icons.check_circle : Icons.download,
          color: model.isLoaded ? Colors.green : model.isDownloaded ? Colors.blue : Colors.grey,
        ),
        title: Text(model.name),
        subtitle: Text('${model.sizeFormatted} · ${model.ramFormatted} RAM · ${model.capabilities.join(', ')}'),
        trailing: model.isLoaded
          ? const Badge(label: Text('Active'))
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
          Text(value, style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }
}