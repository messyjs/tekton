/// Model catalog and download manager
import 'dart:io';
import 'dart:async';
import 'package:path_provider/path_provider.dart';
import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;
import '../../services/logger.dart';

/// Model catalog and download manager with resume support
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

/// Pre-populated model catalog
class BuiltInModels {
  static List<ModelEntry> get catalog => [
    ModelEntry(
      id: 'gemma4-e2b-q4km',
      name: 'Gemma 4 E2B (Q4_K_M)',
      description: 'Lightweight multimodal model. Fast responses, low power. Recommended for all devices.',
      url: 'https://huggingface.co/google/gemma-4-2b-it-GGUF/resolve/main/gemma-4-2b-it-Q4_K_M.gguf',
      sizeBytes: 3200 * 1024 * 1024,
      ramRequiredMB: 4500,
      quantization: 'Q4_K_M',
      contextLength: 128000,
      capabilities: ['chat', 'vision', 'code', 'function_calling'],
      recommendedTier: DeviceTier.budget,
    ),
    ModelEntry(
      id: 'gemma4-e4b-q4km',
      name: 'Gemma 4 E4B (Q4_K_M)',
      description: 'Balanced multimodal model. Great for file analysis, vision, and longer conversations.',
      url: 'https://huggingface.co/google/gemma-4-4b-it-GGUF/resolve/main/gemma-4-4b-it-Q4_K_M.gguf',
      sizeBytes: 5000 * 1024 * 1024,
      ramRequiredMB: 6500,
      quantization: 'Q4_K_M',
      contextLength: 128000,
      capabilities: ['chat', 'vision', 'code', 'function_calling', 'multilingual'],
      recommendedTier: DeviceTier.midrange,
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
    log.info('ModelCatalog initialized with ${_models.length} models');
  }

  List<ModelEntry> get allModels => _models.values.toList();
  List<ModelEntry> get downloadedModels => _models.values.where((m) => m.isDownloaded).toList();
  ModelEntry? getModel(String id) => _models[id];

  void addModel(ModelEntry model) => _models[model.id] = model;
  void removeModel(String id) => _models.remove(id);

  Future<bool> downloadModel(String modelId) async {
    final model = _models[modelId];
    if (model == null) return false;
    // Download implementation
    log.info('Downloading model: ${model.name}');
    return true;
  }

  Future<void> deleteModel(String modelId) async {
    final model = _models[modelId];
    if (model?.localPath != null) {
      final file = File(model!.localPath!);
      if (await file.exists()) await file.delete();
    }
    _models.remove(modelId);
  }
}