/// Chat message model with full metadata
import '../agent/agent_protocol.dart';

/// Chat message stored in Hive
class ChatMessage {
  String id;
  AgentRole role;
  String content;
  DateTime timestamp;
  String? agentId;
  String? modelUsed;
  int? tokensConsumed;
  List<FileAttachment>? attachments;
  List<Map<String, dynamic>>? toolCallsData;
  String conversationId;
  String? parentMessageId;
  bool isStreaming;

  ChatMessage({
    required this.id,
    required this.role,
    required this.content,
    required this.conversationId,
    DateTime? timestamp,
    this.agentId,
    this.modelUsed,
    this.tokensConsumed,
    this.attachments,
    this.toolCallsData,
    this.parentMessageId,
    this.isStreaming = false,
  }) : timestamp = timestamp ?? DateTime.now();

  /// Convert to agent protocol message
  AgentMessage toAgentMessage() => AgentMessage(
    role: role,
    content: content,
    agentId: agentId,
    modelUsed: modelUsed,
    attachments: attachments,
    tokensConsumed: tokensConsumed,
    timestamp: timestamp,
  );

  /// Create a copy with updated content (for streaming)
  ChatMessage copyWith({
    String? content,
    bool? isStreaming,
    int? tokensConsumed,
    String? modelUsed,
  }) => ChatMessage(
    id: id,
    role: role,
    content: content ?? this.content,
    conversationId: conversationId,
    timestamp: timestamp,
    agentId: agentId,
    modelUsed: modelUsed ?? this.modelUsed,
    tokensConsumed: tokensConsumed ?? this.tokensConsumed,
    attachments: attachments,
    toolCallsData: toolCallsData,
    parentMessageId: parentMessageId,
    isStreaming: isStreaming ?? this.isStreaming,
  );
}