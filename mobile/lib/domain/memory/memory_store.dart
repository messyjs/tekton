/// Memory entry class (no Hive annotations, hand-written adapter)
import '../../services/logger.dart';

enum MemoryType {
  fact,
  preference,
  pattern,
  context,
  skill,
}

class MemoryEntry {
  String id;
  MemoryType type;
  String content;
  double importance;
  DateTime createdAt;
  DateTime lastAccessedAt;
  int accessCount;
  String? sourceConversationId;
  String? sourceAgentId;
  List<String> tags;
  Map<String, dynamic> metadata;

  MemoryEntry({
    required this.id,
    required this.type,
    required this.content,
    this.importance = 0.5,
    DateTime? createdAt,
    DateTime? lastAccessedAt,
    this.accessCount = 0,
    this.sourceConversationId,
    this.sourceAgentId,
    this.tags = const [],
    this.metadata = const {},
  })  : createdAt = createdAt ?? DateTime.now(),
        lastAccessedAt = lastAccessedAt ?? DateTime.now();

  /// Forgetting curve — Ebbinghaus decay
  double getStrength() {
    final hoursSinceAccess = DateTime.now().difference(lastAccessedAt).inHours;
    final decayRate = importance >= 0.9 ? 720
        : importance >= 0.7 ? 168
        : importance >= 0.4 ? 48
        : 12;
    return importance * (1 / (1 + hoursSinceAccess / decayRate));
  }

  bool isRelevant({double threshold = 0.1}) => getStrength() >= threshold;

  void recordAccess() {
    accessCount++;
    lastAccessedAt = DateTime.now();
    importance = (importance + 0.05).clamp(0.0, 1.0);
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type.name,
    'content': content,
    'importance': importance,
    'strength': getStrength(),
    'createdAt': createdAt.toIso8601String(),
    'lastAccessedAt': lastAccessedAt.toIso8601String(),
    'accessCount': accessCount,
    'tags': tags,
  };
}

class MemoryStore {
  static const String _boxName = 'memories';
  final Map<String, MemoryEntry> _memories = {};
  final List<void Function()> _listeners = [];

  static final MemoryStore _instance = MemoryStore._();
  static MemoryStore get instance => _instance;
  MemoryStore._();

  Future<void> init() async {
    log.info('MemoryStore initialized');
  }

  MemoryEntry add({
    required String content,
    required MemoryType type,
    double importance = 0.5,
    String? sourceConversationId,
    String? sourceAgentId,
    List<String> tags = const [],
  }) {
    final existing = _memories.values.where((m) => m.content == content && m.type == type);
    if (existing.isNotEmpty) {
      final entry = existing.first;
      entry.recordAccess();
      return entry;
    }

    final entry = MemoryEntry(
      id: _uuid(),
      type: type,
      content: content,
      importance: importance,
      sourceConversationId: sourceConversationId,
      sourceAgentId: sourceAgentId,
      tags: tags,
    );
    _memories[entry.id] = entry;
    _notifyListeners();
    return entry;
  }

  List<MemoryEntry> get all => _memories.values.toList();

  MemoryEntry? get(String id) => _memories[id];

  List<MemoryEntry> search(String query) {
    final lower = query.toLowerCase();
    return _memories.values
        .where((m) => m.content.toLowerCase().contains(lower) ||
                      m.tags.any((t) => t.toLowerCase().contains(lower)))
        .where((m) => m.isRelevant())
        .toList()
      ..sort((a, b) => b.getStrength().compareTo(a.getStrength()));
  }

  List<MemoryEntry> getByType(MemoryType type) =>
    _memories.values.where((m) => m.type == type && m.isRelevant()).toList()
      ..sort((a, b) => b.getStrength().compareTo(a.getStrength()));

  List<MemoryEntry> getRelevant({int maxCount = 10, double minStrength = 0.1}) {
    final entries = _memories.values
        .where((m) => m.getStrength() >= minStrength)
        .toList()
      ..sort((a, b) => b.getStrength().compareTo(a.getStrength()));
    return entries.take(maxCount).toList();
  }

  String formatForContext({int maxCount = 10}) {
    final memories = getRelevant(maxCount: maxCount);
    if (memories.isEmpty) return '';
    final buffer = StringBuffer('## Memory\n');
    for (final m in memories) {
      buffer.writeln('- [${m.type.name}] ${m.content}');
    }
    return buffer.toString();
  }

  void delete(String id) {
    _memories.remove(id);
    _notifyListeners();
  }

  int pruneExpired({double threshold = 0.05}) {
    final expired = _memories.values.where((m) => m.getStrength() < threshold).toList();
    for (final m in expired) {
      _memories.remove(m.id);
    }
    if (expired.isNotEmpty) {
      log.info('Pruned ${expired.length} expired memories');
      _notifyListeners();
    }
    return expired.length;
  }

  Future<void> extractFromConversation(String conversationId, String summary) async {
    add(
      content: summary,
      type: MemoryType.context,
      importance: 0.6,
      sourceConversationId: conversationId,
    );
  }

  void addListener(void Function() listener) => _listeners.add(listener);
  void removeListener(void Function() listener) => _listeners.remove(listener);
  void _notifyListeners() {
    for (final l in _listeners) { l(); }
  }

  String _uuid() => DateTime.now().millisecondsSinceEpoch.toRadixString(36);
}