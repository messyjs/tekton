/// Model catalog screen — browse, download, import, and manage local models
/// Features: download progress bar, scan for existing GGUF files, Check RAM,
/// auto-suggest context length, SafeArea for Samsung navigation bar

import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:file_picker/file_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:tekton_app/domain/install/install.dart';
import 'package:tekton_app/presentation/providers/app_providers.dart';
import 'package:tekton_app/services/logger.dart';

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
  String _scanStatus = '';

  // Download progress tracking per model
  final Map<String, double> _downloadProgress = {};
  final Map<String, bool> _downloading = {};

  @override
  void initState() {
    super.initState();
    _checkRam();
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

    final ramKnown = _deviceRamMB > 0;

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
              tooltip: 'Browse for GGUF models',
              onPressed: _scanningModels ? null : _browseForModels,
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
                            if (ramKnown)
                              Text(
                                '${(_deviceRamMB / 1024.0 * 100).round() / 100} GB RAM available (${(_deviceRamMB / 0.65 / 1024).round()} GB total)',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: const Color(0xFF84CC16), // lime green
                                  fontWeight: FontWeight.w600,
                                ),
                              )
                            else
                              Text('Check your device RAM to filter compatible models', style: theme.textTheme.bodySmall),
                          ],
                        ),
                      ),
                      // Grayed out when RAM already known
                      Opacity(
                        opacity: ramKnown ? 0.5 : 1.0,
                        child: FilledButton.tonal(
                          onPressed: ramKnown ? null : _checkRam,
                          child: _checkingRam
                            ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                            : Text(ramKnown ? 'Checked' : 'Check RAM'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Scan status banner
              if (_scanStatus.isNotEmpty)
                Container(
                  margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.secondaryContainer.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.info_outline, size: 16, color: theme.colorScheme.onSecondaryContainer),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_scanStatus, style: theme.textTheme.bodySmall)),
                    ],
                  ),
                ),

              // Model list
              Expanded(
                child: filteredModels.isEmpty
                  ? _buildEmptyState(theme)
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
                      children: [
                        if (_filter == ModelFilter.all && filteredModels.where((m) => !_isCustomModel(m)).isNotEmpty) ...[
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

  Widget _buildEmptyState(ThemeData theme) {
    return Center(
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
              : 'Download a model or browse for one on your device',
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(height: 16),
          FilledButton.tonal(
            onPressed: _scanningModels ? null : _browseForModels,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _scanningModels
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.folder_open, size: 18),
                const SizedBox(width: 8),
                Text(_scanningModels ? 'Scanning...' : 'Browse for Models'),
              ],
            ),
          ),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: () => _importFromUrl(context),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.link, size: 18),
                const SizedBox(width: 8),
                const Text('Import from URL'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  bool _isCustomModel(ModelEntry m) {
    final builtInIds = BuiltInModels.catalog.map((b) => b.id).toSet();
    return !builtInIds.contains(m.id);
  }

  // ==================== Device RAM Detection ====================

  Future<void> _checkRam() async {
    if (_deviceRamMB > 0) return; // already known
    setState(() => _checkingRam = true);
    try {
      final deviceInfo = DeviceInfoPlugin();
      if (Platform.isAndroid) {
        final android = await deviceInfo.androidInfo;
        int totalRamMB = 8192; // default assumption

        final model = android.model.toLowerCase();
        final manufacturer = android.manufacturer.toLowerCase();

        // Samsung Galaxy S24 Ultra = 12GB
        if (model.contains('sm-s928') || model.contains('s24 ultra')) totalRamMB = 12288;
        else if (model.contains('sm-s926') || model.contains('s24+')) totalRamMB = 12288;
        else if (model.contains('s24') || model.contains('sm-s921')) totalRamMB = 8192;
        // Samsung S23 series
        else if (model.contains('s23 ultra')) totalRamMB = 12288;
        else if (model.contains('s23')) totalRamMB = 8192;
        // Pixel 8/9
        else if (model.contains('pixel 9 pro')) totalRamMB = 16384;
        else if (model.contains('pixel 9')) totalRamMB = 12288;
        else if (model.contains('pixel 8 pro')) totalRamMB = 12288;
        else if (model.contains('pixel 8')) totalRamMB = 8192;
        // Generic flagships
        else if (model.contains('pro') || model.contains('ultra')) totalRamMB = 12288;

        // Available RAM is ~65% of total (OS + GPU uses the rest)
        _deviceRamMB = (totalRamMB * 0.65).round();
      } else {
        _deviceRamMB = 8192;
      }

      setState(() {
        _scanStatus = 'Device has ${(_deviceRamMB / 1024).round()} GB available RAM';
      });
    } catch (e) {
      _deviceRamMB = 6144; // safe default
      setState(() {
        _scanStatus = 'Could not detect exact RAM, assuming 6 GB available';
      });
    }
    setState(() => _checkingRam = false);
  }

  // ==================== Browse for GGUF Files (using file_picker) ====================

  Future<void> _browseForModels() async {
    setState(() {
      _scanningModels = true;
      _scanStatus = 'Browsing for GGUF files...';
    });

    try {
      // First, scan our own app directory
      await _scanAppDirectory();

      // Then, use file_picker to let user browse for GGUF files
      final result = await FilePicker.pickFiles(
        type: FileType.any,
        allowMultiple: true,
        dialogTitle: 'Select GGUF model files',
        // On Android this opens the system file picker (SAF)
      );

      if (result != null && result.files.isNotEmpty) {
        int imported = 0;
        for (final pickedFile in result.files) {
          final filePath = pickedFile.path;
          if (filePath != null && filePath.toLowerCase().endsWith('.gguf')) {
            await _registerFoundModel(filePath);
            imported++;
          }
        }
        setState(() {
          _scanStatus = imported > 0
            ? 'Imported $imported model(s) from file picker'
            : 'No .gguf files selected';
        });
      } else {
        // User cancelled the file picker — still show if we found anything in app dir
        setState(() {
          _scanStatus = 'Browse cancelled. Use Import from URL to add models manually.';
        });
      }
    } catch (e) {
      log.warning('File picker error: $e');
      setState(() {
        _scanStatus = 'File picker not available. Try Import from URL instead.';
      });
    }

    setState(() => _scanningModels = false);
  }

  /// Scan our own app models directory
  Future<void> _scanAppDirectory() async {
    try {
      final appDir = await getApplicationSupportDirectory();
      final modelsDir = Directory('${appDir.path}/models');
      if (await modelsDir.exists()) {
        await for (final entity in modelsDir.list(recursive: false)) {
          if (entity is File && entity.path.toLowerCase().endsWith('.gguf')) {
            await _registerFoundModel(entity.path, isAppDir: true);
          }
        }
      }
    } catch (e) {
      log.warning('Error scanning app directory: $e');
    }
  }

  /// Register a found GGUF file with the catalog
  Future<void> _registerFoundModel(String filePath, {bool isAppDir = false}) async {
    final catalog = ModelCatalog.instance;
    final fileName = filePath.split('/').last.split('\\').last;
    final file = File(filePath);

    // Check if we already track this file
    final existing = catalog.allModels.where((m) =>
      m.localPath == filePath || m.url.endsWith(fileName)
    );

    if (existing.isEmpty) {
      int fileSize = 0;
      try { fileSize = await file.length(); } catch (_) {}

      final name = fileName
        .replaceAll('.gguf', '')
        .replaceAll('-Q4_K_M', '')
        .replaceAll('-Q5_K_M', '')
        .replaceAll('-Q8_0', '')
        .replaceAll('-', ' ')
        .trim();
      final ramEstimate = fileSize > 0 ? (fileSize / (1024 * 1024) * 1.5).round() : 0;
      final contextLen = _suggestContextLength(ramEstimate);

      final id = isAppDir
        ? 'local-${fileName.hashCode.abs()}'
        : 'found-${DateTime.now().millisecondsSinceEpoch}';

      catalog.addModel(ModelEntry(
        id: id,
        name: name.isNotEmpty ? name : fileName,
        description: isAppDir ? 'Downloaded in app' : 'Found at ${filePath.split('/').last.split('\\').last}',
        url: '',
        sizeBytes: fileSize,
        ramRequiredMB: ramEstimate,
        quantization: _guessQuant(fileName),
        contextLength: contextLen,
        capabilities: ['chat'],
        recommendedTier: DeviceTier.flagship,
        isDownloaded: true,
        localPath: filePath,
      ));
      log.info('Registered found model: $name at $filePath');
    } else if (!existing.first.isDownloaded) {
      existing.first.isDownloaded = true;
      existing.first.localPath = filePath;
      try { existing.first.sizeBytes = await file.length(); } catch (_) {}
    }
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

  /// Auto-suggest context length based on available RAM
  int _suggestContextLength(int ramRequiredMB) {
    final availableMB = _deviceRamMB > 0 ? _deviceRamMB : 6144;
    final headroomMB = availableMB - ramRequiredMB;

    if (headroomMB < 500) return 2048;
    if (headroomMB < 1000) return 4096;
    if (headroomMB < 2000) return 8192;
    if (headroomMB < 4000) return 16384;
    return 32768;
  }

  // ==================== Download with Progress ====================

  Future<void> _downloadModel(ModelEntry model) async {
    if (model.url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No download URL for ${model.name}')),
      );
      return;
    }

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
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${model.name} downloaded successfully')),
        );
      } else {
        _downloadProgress.remove(model.id);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to download ${model.name}. Check your connection.')),
        );
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
              Text('Context length auto-set based on your device RAM.',
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
              final contextLen = _suggestContextLength(0);

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
                    color: Theme.of(context).colorScheme.secondaryContainer,
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
                      size: 16, color: _deviceRamMB >= model.ramRequiredMB ? const Color(0xFF84CC16) : Colors.orange),
                    const SizedBox(width: 8),
                    Text(_deviceRamMB >= model.ramRequiredMB
                      ? 'Fits your device (${(_deviceRamMB/1024).round()} GB available)'
                      : 'May be slow (${(_deviceRamMB/1024).round()} GB available, needs ${model.ramFormatted})',
                      style: TextStyle(
                        color: _deviceRamMB >= model.ramRequiredMB ? const Color(0xFF84CC16) : Colors.orange,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
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
              ] else if (model.url.isNotEmpty) ...[
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
              ] else ...[
                // No URL and not downloaded — local file model
                Text('This model was found on your device. No download URL available.',
                  style: Theme.of(context).textTheme.bodySmall),
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
    final limeGreen = const Color(0xFF84CC16);

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
                    color: model.isLoaded ? limeGreen
                      : model.isDownloaded ? limeGreen
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
                        color: limeGreen.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text('Active', style: TextStyle(color: Color(0xFF84CC16), fontSize: 11, fontWeight: FontWeight.w600)),
                    )
                  else if (model.isDownloaded)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: limeGreen.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text('Ready', style: TextStyle(color: Color(0xFF84CC16), fontSize: 11, fontWeight: FontWeight.w600)),
                    )
                  else if (!fitsDevice)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.orange.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text('Slow', style: TextStyle(color: Colors.orange, fontSize: 11, fontWeight: FontWeight.w600)),
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
                    color: limeGreen,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${(downloadProgress! * 100).toStringAsFixed(0)}% downloaded',
                  style: theme.textTheme.labelSmall?.copyWith(color: limeGreen, fontWeight: FontWeight.w600),
                ),
              ],

              // Quick download button if not downloaded and not downloading
              if (!model.isDownloaded && !isDownloading && model.url.isNotEmpty) ...[
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
          Icon(icon, size: 16, color: const Color(0xFF84CC16)),
          const SizedBox(width: 8),
          Text(label, style: Theme.of(context).textTheme.bodySmall),
          const Spacer(),
          Flexible(child: Text(value, style: Theme.of(context).textTheme.bodyMedium, overflow: TextOverflow.ellipsis)),
        ],
      ),
    );
  }
}