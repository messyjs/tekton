/// Chat controller — bridges the chat UI with the backend, agent, and storage layers.
/// Handles streaming, tool calls, agent routing, and message lifecycle.

import 'dart:async';
import '../agent/agent.dart';
import '../llm/llm.dart';
import 'chat_message.dart';
import 'chat_storage.dart';
import 'conversation.dart';
import '../../services/logger.dart';

enum ChatState { idle, thinking, streaming, toolCalling, error }

class ChatController {
  final ChatStorage _storage = ChatStorage.instance;
  final BackendManager _backends = BackendManager.instance;
  final AgentManager _agents = AgentManager.instance;

  final StreamController<ChatState> _stateController = StreamController.broadcast();
  final StreamController<ChatMessage> _messageController = StreamController.broadcast();
  final StreamController<String> _streamingController = StreamController.broadcast();

  ChatState _state = ChatState.idle;
  String? currentConversationId;
  String? _abortTag;

  // Getters
  ChatState get state => _state;
  Stream<ChatState> get stateStream => _stateController.stream;
  Stream<ChatMessage> get messageStream => _messageController.stream;
  Stream<String> get streamingStream => _streamingController.stream;

  /// Start a new conversation
  Conversation startConversation({
    String? agentId,
    String? backendId,
    String routingMode = 'director',
  }) {
    final convo = _storage.createConversation(
      agentId: agentId,
      backendId: backendId,
      routingMode: routingMode,
    );
    currentConversationId = convo.id;
    return convo;
  }

  /// Send a user message and get agent response
  Future<ChatMessage> sendMessage(
    String content, {
    List<FileAttachment>? attachments,
    String? overrideAgentId,
    String? overrideBackendId,
  }) async {
    if (currentConversationId == null) {
      throw StateError('No active conversation');
    }

    final convo = _storage.getConversation(currentConversationId!);
    if (convo == null) throw StateError('Conversation not found');

    // 1. Store user message
    final userMsg = _storage.addMessage(
      conversationId: currentConversationId!,
      role: AgentRole.user,
      content: content,
      attachments: attachments,
    );
    _messageController.add(userMsg);

    // 2. Determine which agent and backend to use
    final agent = _resolveAgent(content, overrideAgentId: overrideAgentId, routingMode: convo.routingMode);
    final backendId = overrideBackendId ?? agent?.backendId ?? convo.defaultBackendId ?? _backends.defaultBackend?.id;

    if (backendId == null) {
      _setState(ChatState.error);
      throw StateError('No backend available');
    }

    // 3. Build message history for context
    final history = _buildContext(currentConversationId!);

    // 4. Add system prompt from agent config
    if (agent != null) {
      history.insert(0, AgentMessage(
        role: AgentRole.system,
        content: agent.systemPrompt,
        agentId: agent.id,
      ));
    }

    // 5. Call LLM backend
    _setState(ChatState.thinking);

    try {
      final response = await _backends.chat(
        backendId: backendId,
        messages: history,
        model: agent?.modelRef,
        params: agent != null
            ? InferenceParams(
                temperature: agent.inferenceParams['temperature'] as double? ?? 0.7,
                topP: agent.inferenceParams['topP'] as double? ?? 0.9,
              )
            : null,
      ).timeout(const Duration(seconds: 120));

      _setState(ChatState.idle);

      // 6. Handle tool calls
      if (response.toolCalls != null && response.toolCalls!.isNotEmpty) {
        _setState(ChatState.toolCalling);
        await _handleToolCalls(response.toolCalls!, backendId, agent);
        _setState(ChatState.idle);
      }

      // 7. Store assistant response
      final assistantMsg = _storage.addMessage(
        conversationId: currentConversationId!,
        role: AgentRole.assistant,
        content: response.content,
        agentId: agent?.id,
        modelUsed: response.model,
        tokensConsumed: response.totalTokens,
      );
      _messageController.add(assistantMsg);
      return assistantMsg;

    } catch (e) {
      _setState(ChatState.error);
      log.error('Chat error: $e');
      rethrow;
    }
  }

  /// Send a message with streaming response
  Stream<String> sendMessageStream(
    String content, {
    List<FileAttachment>? attachments,
    String? overrideAgentId,
    String? overrideBackendId,
  }) async* {
    if (currentConversationId == null) {
      throw StateError('No active conversation');
    }

    final convo = _storage.getConversation(currentConversationId!);
    if (convo == null) throw StateError('Conversation not found');

    // Store user message
    final userMsg = _storage.addMessage(
      conversationId: currentConversationId!,
      role: AgentRole.user,
      content: content,
      attachments: attachments,
    );
    _messageController.add(userMsg);

    final agent = _resolveAgent(content, overrideAgentId: overrideAgentId, routingMode: convo.routingMode);
    final backendId = overrideBackendId ?? agent?.backendId ?? convo.defaultBackendId ?? _backends.defaultBackend?.id;

    if (backendId == null) {
      throw StateError('No backend available');
    }

    final history = _buildContext(currentConversationId!);
    if (agent != null) {
      history.insert(0, AgentMessage(role: AgentRole.system, content: agent.systemPrompt, agentId: agent.id));
    }

    _setState(ChatState.streaming);

    String fullContent = '';
    String? model;

    await for (final chunk in _backends.chatStream(
      backendId: backendId,
      messages: history,
      model: agent?.modelRef,
    )) {
      fullContent += chunk.content;
      model ??= chunk.model;
      _streamingController.add(chunk.content);
      yield chunk.content;
    }

    _setState(ChatState.idle);

    // Store complete response
    final assistantMsg = _storage.addMessage(
      conversationId: currentConversationId!,
      role: AgentRole.assistant,
      content: fullContent,
      agentId: agent?.id,
      modelUsed: model,
    );
    _messageController.add(assistantMsg);
  }

  /// Parse @-mentions for explicit agent selection
  String? _parseAgentMention(String content) {
    final mentionRegex = RegExp(r'@(\w+)');
    final match = mentionRegex.firstMatch(content);
    return match?.group(1);
  }

  /// Resolve which agent should handle a message
  AgentConfig? _resolveAgent(String content, {String? overrideAgentId, required String routingMode}) {
    if (overrideAgentId != null) {
      return _agents.getAgent(overrideAgentId);
    }

    switch (routingMode) {
      case 'director':
        return _agents.routeMessage(content);
      case 'user':
        final mention = _parseAgentMention(content);
        if (mention != null) {
          final agents = _agents.allAgents.where(
            (a) => a.displayName.toLowerCase().startsWith(mention.toLowerCase())
          );
          return agents.isNotEmpty ? agents.first : null;
        }
        return null;
      case 'single':
        // Use the conversation's assigned agent
        final convo = _storage.getConversation(currentConversationId!);
        return convo?.assignedAgentId != null ? _agents.getAgent(convo!.assignedAgentId!) : null;
      default:
        return null;
    }
  }

  /// Build context window from conversation history
  List<AgentMessage> _buildContext(String conversationId) {
    return _storage.getMessages(conversationId).map((m) => m.toAgentMessage()).toList();
  }

  /// Handle tool calls from the LLM
  Future<void> _handleToolCalls(List<ToolCallData> toolCalls, String backendId, AgentConfig? agent) async {
    // Tool handling will be implemented in Phase 3.4
    log.info('Tool calls received: ${toolCalls.map((t) => t.name).join(', ')}');
  }

  void _setState(ChatState state) {
    _state = state;
    _stateController.add(state);
  }

  /// Abort current generation
  void abort() {
    _abortTag = 'abort';
    _setState(ChatState.idle);
  }

  void dispose() {
    _stateController.close();
    _messageController.close();
    _streamingController.close();
  }
}