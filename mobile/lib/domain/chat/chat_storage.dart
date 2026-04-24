/// Chat storage using Hive for persistence.
import 'package:hive_flutter/hive_flutter.dart';
import 'chat_message.dart';
import 'conversation.dart';
import '../agent/agent_protocol.dart';
import '../config/adapters.dart';
import '../../services/logger.dart';

class ChatStorage {
  static const String _convoBox = 'conversations';
  static const String _msgBox = 'messages';

  late Box<Conversation> _conversations;
  late Box<ChatMessage> _messages;

  final List<void Function()> _listeners = [];

  static final ChatStorage _instance = ChatStorage._();
  static ChatStorage get instance => _instance;
  ChatStorage._();

  Future<void> init() async {
    _conversations = await Hive.openBox<Conversation>(_convoBox);
    _messages = await Hive.openBox<ChatMessage>(_msgBox);
    log.info('ChatStorage initialized');
  }

  Conversation createConversation({
    String? id,
    String title = 'New Chat',
    String? agentId,
    String? backendId,
    String routingMode = 'director',
  }) {
    final convo = Conversation(
      id: id ?? _uuid(),
      title: title,
      assignedAgentId: agentId,
      defaultBackendId: backendId,
      routingMode: routingMode,
    );
    _conversations.put(convo.id, convo);
    _notifyListeners();
    return convo;
  }

  Conversation? getConversation(String id) => _conversations.get(id);

  List<Conversation> get allConversations {
    final convos = _conversations.values.toList()
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return convos;
  }

  List<Conversation> get pinnedConversations =>
    allConversations.where((c) => c.isPinned).toList();

  void updateConversation(Conversation convo) {
    convo.updatedAt = DateTime.now();
    _conversations.put(convo.id, convo);
    _notifyListeners();
  }

  void deleteConversation(String id) {
    final msgIds = _messages.values
        .where((m) => m.conversationId == id)
        .map((m) => m.id)
        .toList();
    for (final msgId in msgIds) {
      _messages.delete(msgId);
    }
    _conversations.delete(id);
    _notifyListeners();
  }

  ChatMessage addMessage({
    required String conversationId,
    required AgentRole role,
    required String content,
    String? agentId,
    String? modelUsed,
    int? tokensConsumed,
    List<FileAttachment>? attachments,
    String? parentMessageId,
  }) {
    final msg = ChatMessage(
      id: _uuid(),
      role: role,
      content: content,
      conversationId: conversationId,
      agentId: agentId,
      modelUsed: modelUsed,
      tokensConsumed: tokensConsumed,
      attachments: attachments,
      parentMessageId: parentMessageId,
    );
    _messages.put(msg.id, msg);

    final convo = _conversations.get(conversationId);
    if (convo != null) {
      convo.messageCount++;
      if (tokensConsumed != null) convo.incrementTokens(tokensConsumed);
      if (role == AgentRole.user && convo.title == 'New Chat') {
        convo.updateTitle(content.split('\n').first.substring(0, content.length > 50 ? 50 : content.length));
      }
      _conversations.put(convo.id, convo);
    }
    _notifyListeners();
    return msg;
  }

  List<ChatMessage> getMessages(String conversationId) {
    final msgs = _messages.values
        .where((m) => m.conversationId == conversationId)
        .toList()
      ..sort((a, b) => a.timestamp.compareTo(b.timestamp));
    return msgs;
  }

  ChatMessage? getMessage(String id) => _messages.get(id);

  void updateMessage(ChatMessage msg) {
    _messages.put(msg.id, msg);
    _notifyListeners();
  }

  void deleteMessage(String id) {
    _messages.delete(id);
    _notifyListeners();
  }

  List<ChatMessage> searchMessages(String query, {String? conversationId}) {
    final q = query.toLowerCase();
    return _messages.values
        .where((m) {
          if (conversationId != null && m.conversationId != conversationId) return false;
          return m.content.toLowerCase().contains(q);
        })
        .toList()
      ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
  }

  Map<String, dynamic> exportConversation(String id) {
    final convo = getConversation(id);
    if (convo == null) throw Exception('Conversation not found: $id');
    final messages = getMessages(id);
    return {
      'conversation': convo.toJson(),
      'messages': messages.map((m) {
        final map = <String, dynamic>{
          'id': m.id,
          'role': m.role.name,
          'content': m.content,
          'timestamp': m.timestamp.toIso8601String(),
        };
        if (m.agentId != null) map['agentId'] = m.agentId!;
        if (m.modelUsed != null) map['modelUsed'] = m.modelUsed!;
        if (m.tokensConsumed != null) map['tokensConsumed'] = m.tokensConsumed!;
        return map;
      }).toList(),
    };
  }

  void addListener(void Function() listener) => _listeners.add(listener);
  void removeListener(void Function() listener) => _listeners.remove(listener);
  void _notifyListeners() {
    for (final l in _listeners) { l(); }
  }

  String _uuid() => DateTime.now().millisecondsSinceEpoch.toRadixString(36);
}