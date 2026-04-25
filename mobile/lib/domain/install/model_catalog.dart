/// Model catalog and download manager
import 'dart:io';
import 'dart:async';
import 'package:path_provider/path_provider.dart';
import 'package:http/http.dart' as http;
import '../../services/logger.dart';

/// Device tier for model recommendations
class DeviceTier {
  final String name;
  final int minRamGB;
  const DeviceTier._(this.name, this.minRamGB);

  static const budget = DeviceTier._('budget', 4);
  static const midrange = DeviceTier._('midrange', 6);
  static const flagship = DeviceTier._('flagship', 8);

  static const values = [budget, midrange, flagship];

  static DeviceTier byName(String name) =>
    values.firstWhere((e) => e.name == name, orElse: () => midrange);

  @override
  String toString() => name;
}

/// Model metadata entry
class ModelEntry {
  String id;
  String name;
  String description;
  String url;
  int sizeBytes;
  int ramRequiredMB;
  String quantization;
  int contextLength;
  List<String> capabilities;
  DeviceTier recommendedTier;
  String sha256;
  bool isDownloaded;
  String? localPath;
  bool isLoaded;
  String? customSystemPrompt;

  ModelEntry({
    required this.id,
    required this.name,
    required this.description,
    required this.url,
    required this.sizeBytes,
    required this.ramRequiredMB,
    required this.quantization,
    this.contextLength = 8192,
    this.capabilities = const ['chat'],
    this.recommendedTier = DeviceTier.midrange,
    this.sha256 = '',
    this.isDownloaded = false,
    this.localPath,
    this.isLoaded = false,
    this.customSystemPrompt,
  });

  String get sizeFormatted {
    if (sizeBytes > 1024 * 1024 * 1024) {
      return '${(sizeBytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
    } else if (sizeBytes > 1024 * 1024) {
      return '${(sizeBytes / (1024 * 1024)).toStringAsFixed(0)} MB';
    }
    return '$sizeBytes B';
  }

  String get ramFormatted => ramRequiredMB >= 1024
    ? '${(ramRequiredMB / 1024).toStringAsFixed(1)} GB'
    : '$ramRequiredMB MB';
}

/// Pre-populated model catalog — matches Uncensored-Local-AI model selection
class BuiltInModels {
  static List<ModelEntry> get catalog => [
    // === Recommended for all devices ===
    ModelEntry(
      id: 'gemma3-4b-q4km',
      name: 'Gemma 3 4B (Q4_K_M)',
      description: 'Google Gemma 3 4B instruction-tuned. Fast responses, works on any phone. Best lightweight model.',
      url: 'https://huggingface.co/google/gemma-3-4b-it-GGUF/resolve/main/gemma-3-4b-it-Q4_K_M.gguf',
      sizeBytes: 2500 * 1024 * 1024,
      ramRequiredMB: 4500,
      quantization: 'Q4_K_M',
      contextLength: 128000,
      capabilities: ['chat', 'vision', 'code', 'function_calling'],
      recommendedTier: DeviceTier.budget,
    ),
    // === Recommended for midrange+ ===
    ModelEntry(
      id: 'dolphin29-2b-q4km',
      name: 'Dolphin 2.9 2B (Q4_K_M)',
      description: 'Uncensored Llama 3.2 2B fine-tune by Eric Hartford. No refusals, creative writing.',
      url: 'https://huggingface.co/cognitivecomputations/dolphin-2.9-llama3-2b-GGUF/resolve/main/dolphin-2.9-llama3-2b-Q4_K_M.gguf',
      sizeBytes: 1500 * 1024 * 1024,
      ramRequiredMB: 3000,
      quantization: 'Q4_K_M',
      contextLength: 8192,
      capabilities: ['chat', 'creative', 'uncensored'],
      recommendedTier: DeviceTier.budget,
    ),
    // === Recommended for flagship ===
    ModelEntry(
      id: 'phi35-mini-38b-q4km',
      name: 'Phi-3.5 Mini 3.8B (Q4_K_M)',
      description: 'Microsoft Phi-3.5 Mini. Excellent for code, reasoning, and math. Compact but capable.',
      url: 'https://huggingface.co/microsoft/Phi-3.5-mini-instruct-GGUF/resolve/main/phi-3.5-mini-instruct-Q4_K_M.gguf',
      sizeBytes: 2400 * 1024 * 1024,
      ramRequiredMB: 5000,
      quantization: 'Q4_K_M',
      contextLength: 128000,
      capabilities: ['chat', 'code', 'reasoning', 'math'],
      recommendedTier: DeviceTier.midrange,
    ),
    ModelEntry(
      id: 'gemma3-12b-q4km',
      name: 'Gemma 3 12B (Q4_K_M)',
      description: 'Full Gemma 3 12B model. Best quality, requires 8GB+ RAM. Server-grade on mobile.',
      url: 'https://huggingface.co/google/gemma-3-12b-it-GGUF/resolve/main/gemma-3-12b-it-Q4_K_M.gguf',
      sizeBytes: 7600 * 1024 * 1024,
      ramRequiredMB: 10000,
      quantization: 'Q4_K_M',
      contextLength: 128000,
      capabilities: ['chat', 'vision', 'code', 'function_calling', 'multilingual'],
      recommendedTier: DeviceTier.flagship,
    ),
  ];

  static List<ModelEntry> recommended(DeviceTier tier) =>
    catalog.where((m) => m.recommendedTier.minRamGB <= tier.minRamGB).toList();
}

/// Model catalog manager
class ModelCatalog {
  static final ModelCatalog _instance = ModelCatalog._();
  static ModelCatalog get instance => _instance;
  ModelCatalog._();

  final Map<String, ModelEntry> _models = {};

  Future<void> init() async {
    // Load built-in catalog
    for (final model in BuiltInModels.catalog) {
      _models[model.id] = model;
    }
    // Check which models are already downloaded
    try {
      final appDir = await getApplicationSupportDirectory();
      final modelsDir = Directory('${appDir.path}/models');
      if (await modelsDir.exists()) {
        for (final model in _models.values) {
          final file = File('${modelsDir.path}/${model.id}.gguf');
          if (await file.exists()) {
            model.isDownloaded = true;
            model.localPath = file.path;
          }
        }
      }
    } catch (e) {
      log.warning('Could not check downloaded models: $e');
    }
    log.info('ModelCatalog initialized with ${_models.length} models');
  }

  List<ModelEntry> get allModels => _models.values.toList();
  List<ModelEntry> get downloadedModels => _models.values.where((m) => m.isDownloaded).toList();
  List<ModelEntry> get customModels => _models.values.where((m) => !BuiltInModels.catalog.any((b) => b.id == m.id)).toList();
  ModelEntry? getModel(String id) => _models[id];

  void addModel(ModelEntry model) => _models[model.id] = model;
  void removeModel(String id) => _models.remove(id);

  Future<bool> downloadModel(String modelId, {void Function(double progress)? onProgress}) async {
    final model = _models[modelId];
    if (model == null) return false;

    try {
      final appDir = await getApplicationSupportDirectory();
      final modelsDir = Directory('${appDir.path}/models');
      if (!await modelsDir.exists()) {
        await modelsDir.create(recursive: true);
      }

      final targetFile = File('${modelsDir.path}/${model.id}.gguf');
      final tempFile = File('${modelsDir.path}/${model.id}.gguf.tmp');

      log.info('Downloading model: ${model.name} from ${model.url}');

      final request = http.Request('GET', Uri.parse(model.url));
      final response = await http.Client().send(request);

      if (response.statusCode != 200) {
        log.error('Download failed: HTTP ${response.statusCode}');
        return false;
      }

      final totalBytes = response.contentLength ?? 0;
      int downloadedBytes = 0;
      final stopwatch = Stopwatch()..start();

      final sink = tempFile.openWrite();
      await for (final chunk in response.stream) {
        sink.add(chunk);
        downloadedBytes += chunk.length;
        if (totalBytes > 0 && onProgress != null) {
          onProgress(downloadedBytes / totalBytes);
        }
      }
      await sink.close();
      stopwatch.stop();

      // Move temp file to final location
      if (await targetFile.exists()) await targetFile.delete();
      await tempFile.rename(targetFile.path);

      model.isDownloaded = true;
      model.localPath = targetFile.path;
      model.sizeBytes = downloadedBytes;

      log.info('Downloaded ${model.name} in ${stopwatch.elapsed.inSeconds}s (${model.sizeFormatted})');
      return true;
    } catch (e) {
      log.error('Download failed: $e');
      // Clean up temp file
      try {
        final appDir = await getApplicationSupportDirectory();
        final tempFile = File('${appDir.path}/models/${model.id}.gguf.tmp');
        if (await tempFile.exists()) await tempFile.delete();
      } catch (_) {}
      return false;
    }
  }

  Future<void> deleteModel(String modelId) async {
    final model = _models[modelId];
    if (model?.localPath != null) {
      final file = File(model!.localPath!);
      if (await file.exists()) await file.delete();
      model.isDownloaded = false;
      model.localPath = null;
    }
    // For custom models, remove from catalog entirely
    if (!BuiltInModels.catalog.any((b) => b.id == modelId)) {
      _models.remove(modelId);
    }
  }
}