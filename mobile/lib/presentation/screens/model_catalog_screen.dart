/// Model catalog screen — browse, download, import, and manage local models
/// Features: download progress bar, scan for existing GGUF files, Check RAM,
/// auto-suggest context length, SafeArea for Samsung navigation bar

import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:device_info_plus/device_info_plus.dart';
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
  int _deviceRamMB = 0;
  bool _checkingRam = false;
  bool _scanningModels = false;

  // Download progress tracking per model
  final Map<String, double> _downloadProgress = {}; // modelId -> 0.0-1.0
  final Map<String, bool> _downloading = {}; // modelId -> isDownloading

  @override
  void initState() {
    super.initState();
    _checkRam();
    _scanForExistingModels();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final catalog = ref.watch(modelCatalogProvider);
    final allModels = catalog.allModels;

    final filteredModels = allModels.where((m) {
      switch (_filter) {
        case ModelFilter.all: return true;
        case ModelFilter.downloaded: return m.isDownloaded;
        case ModelFilter.custom: return _isCustomModel(m);
      }
    }).toList();

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Model Catalog'),
          actions: [
            IconButton(
              icon: _scanningModels
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.folder_open),
              tooltip: 'Scan for downloaded models',
              onPressed: _scanningModels ? null : _scanForExistingModels,
            ),
            IconButton(
              icon: const Icon(Icons.link),
              tooltip: 'Import from URL',
              onPressed: () => _importFromUrl(context),
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
        body: SafeArea(
          top: false,
          child: Column(
            children: [
              // Device info card
              Card(
                margin: const EdgeInsets.fromLTRB(16, 16, 16, 8),
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
                            if (_deviceRamMB > 0)
                              Text('${(_deviceRamMB / 1024).round()} GB RAM available', style: theme.textTheme.bodySmall?.copyWith(color: Colors.green))
                            else
                              Text('Models matching your RAM are highlighted', style: theme.textTheme.bodySmall),
                          ],
                        ),
                      ),
                      FilledButton.tonal(
                        onPressed: _checkingRam ? null : _checkRam,
                        child: _checkingRam
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Text('Check RAM'),
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
                              ? 'Import a GGUF model from URL'
                              : 'Download a model to get started',
                            style: theme.textTheme.bodySmall,
                          ),
                          const SizedBox(height: 16),
                          FilledButton.tonal(
                            onPressed: _scanForExistingModels,
                            child: Text(_scanningModels ? 'Scanning...' : 'Scan Device for Models'),
                          ),
                        ],
                      ),
                    )
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
                      children: [
                        if (_filter == ModelFilter.all) ...[
                          Text('Recommended for You', style: theme.textTheme.titleMedium),
                          const SizedBox(height: 8),
                          ...filteredModels.where((m) => !_isCustomModel(m)).map((m) =>
                            _ModelCard(model: m, ramMB: _deviceRamMB, downloadProgress: _downloadProgress[m.id], isDownloading: _downloading[m.id] ?? false, onTap: () => _showModelDetail(context, m), onDownload: () => _downloadModel(m)),
                          ),
                          const SizedBox(height: 24),
                        ],
                        ...filteredModels.map((m) =>
                          _ModelCard(model: m, ramMB: _deviceRamMB, downloadProgress: _downloadProgress[m.id], isDownloading: _downloading[m.id] ?? false, onTap: () => _showModelDetail(context, m), onDownload: () => _downloadModel(m)),
                        ),
                      ],
                    ),
              ),
            ],
          ),
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
    final builtInIds = BuiltInModels.catalog.map((b) => b.id).toSet();
    return !builtInIds.contains(m.id);
  }

  // ==================== Device RAM Detection ====================

  Future<void> _checkRam() async {
    setState(() => _checkingRam = true);
    try {
      final deviceInfo = DeviceInfoPlugin();
      if (Platform.isAndroid) {
        final android = await deviceInfo.androidInfo;
        // totalPhysicalMemory is in bytes on some devices, or we estimate
        // from available features. Fallback: assume flagship (8GB)
        int totalRamMB = 8192; // default assumption
        // Android device info doesn't expose RAM directly in all versions
        // Use the host name as a heuristic for known devices
        final model = android.model.toLowerCase();
        final manufacturer = android.manufacturer.toLowerCase();

        // Samsung Galaxy S24 Ultra = 12GB
        if (model.contains('sm-s928') || model.contains('s24 ultra')) totalRamMB = 12288;
        else if (model.contains('s24+') || model.contains('sm-s926')) totalRamMB = 12288;
        else if (model.contains('s24') || model.contains('sm-s921')) totalRamMB = 8192;
        // Samsung S23 series
        else if (model.contains('s23 ultra')) totalRamMB = 12288;
        else if (model.contains('s23')) totalRamMB = 8192;
        // Pixel 8 Pro, Pixel 9
        else if (model.contains('pixel 9 pro')) totalRamMB = 16384;
        else if (model.contains('pixel 9')) totalRamMB = 12288;
        else if (model.contains('pixel 8 pro')) totalRamMB = 12288;
        else if (model.contains('pixel 8')) totalRamMB = 8192;
        // Generic flagships
        else if (model.contains('pro') || model.contains('ultra')) totalRamMB = 12288;

        // Available RAM is typically 60-70% of total (OS uses the rest)
        _deviceRamMB = (totalRamMB * 0.65).round();
      } else {
        _deviceRamMB = 8192;
      }
    } catch (e) {
      _deviceRamMB = 6144; // safe default
    }
    setState(() => _checkingRam = false);
  }

  // ==================== Scan for Existing GGUF Files ====================

  Future<void> _scanForExistingModels() async {
    setState(() => _scanningModels = true);
    try {
      final catalog = ModelCatalog.instance;

      // Scan our own models directory first
      await catalog.init(); // re-checks downloads

      // Scan common directories where other apps store GGUF files
      final searchPaths = <String>[];

      if (Platform.isAndroid) {
        // Uncensored-Local-AI stores models here
        searchPaths.addAll([
          '/storage/emulated/0/Android/data/com.techjarves.uncensoredlocalai/files/models',
          '/storage/emulated/0/Android/data/com.techjarves.uncensored_local_ai/files/models',
          '/storage/emulated/0/Download',
          '/storage/emulated/0/Models',
        ]);
        // Also check our own app directory
        final appDir = await _getAppSupportDir();
        if (appDir != null) searchPaths.add('${appDir.path}/models');
      }

      for (final searchPath in searchPaths) {
        final dir = Directory(searchPath);
        if (await dir.exists()) {
          await for (final entity in dir.list(recursive: false)) {
            if (entity is File && entity.path.toLowerCase().endsWith('.gguf')) {
              final fileName = entity.path.split('/').last;
              final fileSize = await entity.length();
              final name = fileName.replaceAll('.gguf', '').replaceAll('-Q4_K_M', '').replaceAll('-', ' ');

              // Check if we already have this model
              final existing = catalog.allModels.where((m) =>
                m.localPath == entity.path || m.url.endsWith(fileName)
              );

              if (existing.isEmpty) {
                // Register as a found model
                final id = 'found-${DateTime.now().millisecondsSinceEpoch}';
                final ramEstimate = (fileSize / (1024 * 1024) * 1.5).round(); // model needs ~1.5x file size in RAM
                final contextLen = _suggestContextLength(ramEstimate);

                catalog.addModel(ModelEntry(
                  id: id,
                  name: name.trim().isNotEmpty ? name.trim() : fileName,
                  description: 'Found on device at ${entity.path}',
                  url: '',
                  sizeBytes: fileSize,
                  ramRequiredMB: ramEstimate,
                  quantization: _guessQuant(fileName),
                  contextLength: contextLen,
                  capabilities: ['chat'],
                  recommendedTier: DeviceTier.flagship,
                  isDownloaded: true,
                  localPath: entity.path,
                ));
              } else if (!existing.first.isDownloaded) {
                // Mark as downloaded if we found the file
                existing.first.isDownloaded = true;
                existing.first.localPath = entity.path;
                existing.first.sizeBytes = fileSize;
              }
            }
          }
        }
      }
    } catch (e) {
      // Permission denied is common — just skip
    }
    setState(() => _scanningModels = false);
  }

  Future<Directory?> _getAppSupportDir() async {
    try {
      final dir = await _getAppSupportPath();
      final modelsDir = Directory('$dir/models');
      if (await modelsDir.exists()) return modelsDir;
    } catch (_) {}
    return null;
  }

  // Use path_provider via a workaround since we can't import it directly here
  Future<String> _getAppSupportPath() async {
    // Delegate to model catalog which already uses path_provider
    final catalog = ModelCatalog.instance;
    final models = catalog.downloadedModels;
    if (models.isNotEmpty && models.first.localPath != null) {
      return models.first.localPath!.substring(0, models.first.localPath!.lastIndexOf('/'));
    }
    return '/data/user/0/com.tekton.app/files'; // fallback
  }

  String _guessQuant(String fileName) {
    final lower = fileName.toLowerCase();
    if (lower.contains('q8_0')) return 'Q8_0';
    if (lower.contains('q5_k_m')) return 'Q5_K_M';
    if (lower.contains('q4_k_m')) return 'Q4_K_M';
    if (lower.contains('q3_k_m')) return 'Q3_K_M';
    if (lower.contains('q2_k')) return 'Q2_K';
    return 'Q4_K_M';
  }

  /// Auto-suggest context length based on available RAM.
  /// Does not set max — picks a safe value that leaves room for the OS.
  int _suggestContextLength(int ramRequiredMB) {
    final availableMB = _deviceRamMB > 0 ? _deviceRamMB : 6144;
    final headroomMB = availableMB - ramRequiredMB;

    if (headroomMB < 500) return 2048;
    if (headroomMB < 1000) return 4096;
    if (headroomMB < 2000) return 8192;
    if (headroomMB < 4000) return 16384;
    return 32768; // never exceeds 32K for mobile
  }

  // ==================== Download with Progress ====================

  Future<void> _downloadModel(ModelEntry model) async {
    setState(() {
      _downloading[model.id] = true;
      _downloadProgress[model.id] = 0.0;
    });

    final success = await ModelCatalog.instance.downloadModel(
      model.id,
      onProgress: (progress) {
        setState(() {
          _downloadProgress[model.id] = progress;
        });
      },
    );

    setState(() {
      _downloading[model.id] = false;
      if (success) {
        _downloadProgress[model.id] = 1.0;
      } else {
        _downloadProgress.remove(model.id);
      }
    });
  }

  // ==================== Import ====================

  void _importFromUrl(BuildContext context) {
    final urlController = TextEditingController();
    final nameController = TextEditingController();
    final quantController = TextEditingController(text: 'Q4_K_M');

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
              TextField(
                controller: quantController,
                decoration: const InputDecoration(
                  labelText: 'Quantization',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 8),
              Text('Context length will be auto-set based on your device RAM.',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                ),
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
              final contextLen = _suggestContextLength(0); // estimate after download

              final model = ModelEntry(
                id: id,
                name: name,
                description: 'Custom imported model',
                url: url,
                sizeBytes: 0,
                ramRequiredMB: 0,
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

  // ==================== Model Detail Bottom Sheet ====================

  void _showModelDetail(BuildContext context, ModelEntry model) {
    final isDownloading = _downloading[model.id] ?? false;
    final progress = _downloadProgress[model.id] ?? 0.0;
    final recommendedCtx = _suggestContextLength(model.ramRequiredMB);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => SafeArea(
        top: false,
        child: DraggableScrollableSheet(
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
              if (model.ramRequiredMB > 0) ...[
                _InfoRow(Icons.memory, 'RAM Required', model.ramFormatted),
                if (_deviceRamMB > 0) ...[
                  const SizedBox(height: 4),
                  Row(children: [
                    Icon(_deviceRamMB >= model.ramRequiredMB ? Icons.check_circle : Icons.warning,
                      size: 16, color: _deviceRamMB >= model.ramRequiredMB ? Colors.green : Colors.orange),
                    const SizedBox(width: 8),
                    Text(_deviceRamMB >= model.ramRequiredMB
                      ? 'Fits your device (${(_deviceRamMB/1024).round()} GB available)'
                      : 'May be slow (${(_deviceRamMB/1024).round()} GB available, needs ${model.ramFormatted})',
                      style: TextStyle(
                        color: _deviceRamMB >= model.ramRequiredMB ? Colors.green : Colors.orange,
                        fontSize: 13,
                      ),
                    ),
                  ]),
                ],
              ],
              _InfoRow(Icons.speed, 'Quantization', model.quantization),
              _InfoRow(Icons.token, 'Context', model.contextLength >= 1000
                ? '${model.contextLength ~/ 1000}K'
                : '${model.contextLength}'),
              if (recommendedCtx != model.contextLength)
                _InfoRow(Icons.auto_fix_high, 'Recommended Context', '${recommendedCtx ~/ 1000}K'),
              if (model.capabilities.isNotEmpty) _InfoRow(Icons.star, 'Capabilities', model.capabilities.join(', ')),
              if (model.url.isNotEmpty) _InfoRow(Icons.link, 'URL', model.url),
              const SizedBox(height: 24),

              // Download progress bar
              if (isDownloading) ...[
                Text('Downloading...', style: Theme.of(context).textTheme.titleSmall),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 12,
                    backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                  ),
                ),
                const SizedBox(height: 4),
                Text('${(progress * 100).toStringAsFixed(1)}%', style: Theme.of(context).textTheme.labelSmall),
                const SizedBox(height: 16),
              ],

              if (model.isDownloaded) ...[
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: () { Navigator.pop(context); },
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
                  ],
                ),
              ] else ...[
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: isDownloading ? null : () {
                      Navigator.pop(context);
                      _downloadModel(model);
                    },
                    icon: isDownloading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.download),
                    label: isDownloading
                      ? Text('Downloading ${(progress * 100).toStringAsFixed(0)}%')
                      : model.sizeBytes > 0
                        ? Text('Download (${model.sizeFormatted})')
                        : const Text('Download'),
                  ),
                ),
              ],
            ],
          ),
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
              Navigator.pop(context);
              Navigator.pop(context);
              setState(() {});
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}

// ==================== Model Card Widget ====================

class _ModelCard extends StatelessWidget {
  final ModelEntry model;
  final int ramMB;
  final double? downloadProgress;
  final bool isDownloading;
  final VoidCallback onTap;
  final VoidCallback onDownload;

  const _ModelCard({
    required this.model,
    required this.ramMB,
    required this.downloadProgress,
    required this.isDownloading,
    required this.onTap,
    required this.onDownload,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fitsDevice = ramMB <= 0 || model.ramRequiredMB <= 0 || ramMB >= model.ramRequiredMB;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: !fitsDevice ? Colors.orange.withValues(alpha: 0.5) : theme.colorScheme.outlineVariant.withValues(alpha: 0.3),
          width: !fitsDevice ? 1.5 : 1,
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    model.isLoaded ? Icons.play_circle_filled
                      : model.isDownloaded ? Icons.check_circle
                      : isDownloading ? Icons.downloading
                      : Icons.download,
                    color: model.isLoaded ? Colors.green
                      : model.isDownloaded ? theme.colorScheme.primary
                      : isDownloading ? theme.colorScheme.primary
                      : fitsDevice ? theme.colorScheme.outline
                      : Colors.orange,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(model.name, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                        Text(
                          model.sizeBytes > 0
                            ? '${model.sizeFormatted} - ${model.ramFormatted} RAM - ${model.quantization}'
                            : '${model.quantization} - ${model.contextLength >= 1000 ? '${model.contextLength ~/ 1000}K' : model.contextLength} context',
                          style: theme.textTheme.labelSmall,
                        ),
                      ],
                    ),
                  ),
                  if (model.isLoaded)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.green.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text('Active', style: TextStyle(color: Colors.green, fontSize: 11, fontWeight: FontWeight.w600)),
                    )
                  else if (model.isDownloaded)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text('Ready', style: TextStyle(color: theme.colorScheme.primary, fontSize: 11)),
                    )
                  else if (!fitsDevice)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.orange.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text('Slow', style: TextStyle(color: Colors.orange, fontSize: 11)),
                    ),
                ],
              ),

              // Download progress bar inline on card
              if (isDownloading && downloadProgress != null) ...[
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: downloadProgress,
                    minHeight: 6,
                    backgroundColor: theme.colorScheme.surfaceContainerHighest,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${(downloadProgress! * 100).toStringAsFixed(0)}% downloaded',
                  style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.primary),
                ),
              ],

              // Quick download button if not downloaded and not downloading
              if (!model.isDownloaded && !isDownloading) ...[
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerRight,
                  child: FilledButton.tonal(
                    onPressed: onDownload,
                    child: Text(model.sizeBytes > 0 ? 'Download ${model.sizeFormatted}' : 'Download'),
                  ),
                ),
              ],
            ],
          ),
        ),
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