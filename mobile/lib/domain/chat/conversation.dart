/// Conversation model
class Conversation {
  String id;
  String title;
  String? assignedAgentId;
  String? defaultBackendId;
  String routingMode;
  DateTime createdAt;
  DateTime updatedAt;
  bool isPinned;
  String? summary;
  int messageCount;
  int totalTokens;

  Conversation({
    required this.id,
    this.title = 'New Chat',
    this.assignedAgentId,
    this.defaultBackendId,
    this.routingMode = 'director',
    DateTime? createdAt,
    DateTime? updatedAt,
    this.isPinned = false,
    this.summary,
    this.messageCount = 0,
    this.totalTokens = 0,
  })  : createdAt = createdAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now();

  void updateTitle(String newTitle) {
    title = newTitle;
    updatedAt = DateTime.now();
  }

  void incrementTokens(int tokens) {
    totalTokens += tokens;
    updatedAt = DateTime.now();
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'assignedAgentId': assignedAgentId,
    'defaultBackendId': defaultBackendId,
    'routingMode': routingMode,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
    'isPinned': isPinned,
    'summary': summary,
    'messageCount': messageCount,
    'totalTokens': totalTokens,
  };

  factory Conversation.fromJson(Map<String, dynamic> json) => Conversation(
    id: json['id'] as String,
    title: json['title'] as String? ?? 'New Chat',
    assignedAgentId: json['assignedAgentId'] as String?,
    defaultBackendId: json['defaultBackendId'] as String?,
    routingMode: json['routingMode'] as String? ?? 'director',
    createdAt: DateTime.parse(json['createdAt'] as String),
    updatedAt: DateTime.parse(json['updatedAt'] as String),
    isPinned: json['isPinned'] as bool? ?? false,
    summary: json['summary'] as String?,
    messageCount: json['messageCount'] as int? ?? 0,
    totalTokens: json['totalTokens'] as int? ?? 0,
  );
}