/// Main chat screen — the heart of the app.
/// Supports streaming, file attachments, agent switching, tool calls.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import '../../domain/agent/agent.dart';
import '../../domain/chat/chat.dart';
import '../../domain/llm/llm.dart';
import '../providers/app_providers.dart';
import '../widgets/agent_switch_bar.dart';
import '../widgets/file_attachment_widget.dart';
import 'settings_screen.dart';
import 'agent_config_screen.dart';
import 'model_catalog_screen.dart';
import 'memory_browser_screen.dart';

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  final _focusNode = FocusNode();
  ChatState _chatState = ChatState.idle;
  String _streamingContent = '';
  final List<FileAttachment> _pendingAttachments = [];

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final conversations = ref.watch(conversationsProvider);
    final activeId = ref.watch(activeConversationIdProvider);
    final messages = ref.watch(activeMessagesProvider);
    final agents = ref.watch(allAgentsProvider);

    // If no active conversation, show conversation list or create one
    if (activeId == null && conversations.isEmpty) {
      return _buildEmptyState(theme);
    }

    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (agents.isNotEmpty && activeId != null)
              AgentSwitchBar(
                agents: agents,
                onAgentSelected: (agent) {
                  // Update conversation agent
                  final convo = ref.read(chatStorageProvider).getConversation(activeId!);
                  if (convo != null) {
                    convo.assignedAgentId = agent.id;
                    ref.read(chatStorageProvider).updateConversation(convo);
                  }
                },
              ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.memory),
            tooltip: 'Model Catalog',
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ModelCatalogScreen())),
          ),
          IconButton(
            icon: const Icon(Icons.psychology),
            tooltip: 'Agents',
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AgentConfigScreen())),
          ),
          IconButton(
            icon: const Icon(Icons.history),
            tooltip: 'Memory',
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MemoryBrowserScreen())),
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen())),
          ),
        ],
      ),
      drawer: _buildDrawer(theme, conversations),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            // Messages list
            Expanded(
              child: messages.isEmpty
                  ? _buildWelcomeChat(theme)
                  : _buildMessageList(theme, messages),
            ),
            // Pending attachments
            if (_pendingAttachments.isNotEmpty)
              _buildAttachmentBar(theme),
            // Input area
            _buildInputArea(theme),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawer(ThemeData theme, List<Conversation> conversations) {
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: BoxDecoration(color: theme.colorScheme.primaryContainer),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.hub, size: 48, color: theme.colorScheme.primary),
                const SizedBox(height: 8),
                Text('Tekton', style: theme.textTheme.headlineSmall?.copyWith(
                  color: theme.colorScheme.onPrimaryContainer,
                )),
                Text('${conversations.length} conversations',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onPrimaryContainer.withValues(alpha: 0.7),
                  ),
                ),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.add),
            title: const Text('New Chat'),
            onTap: () {
              final convo = ref.read(chatStorageProvider).createConversation();
              ref.read(activeConversationIdProvider.notifier).state = convo.id;
              Navigator.pop(context);
              setState(() {});
            },
          ),
          const Divider(),
          ...conversations.map((c) => ListTile(
            leading: c.isPinned ? const Icon(Icons.push_pin, size: 16) : const Icon(Icons.chat_bubble_outline, size: 16),
            title: Text(c.title, maxLines: 1, overflow: TextOverflow.ellipsis),
            subtitle: Text('${c.messageCount} messages', style: theme.textTheme.bodySmall),
            selected: c.id == ref.watch(activeConversationIdProvider),
            onTap: () {
              ref.read(activeConversationIdProvider.notifier).state = c.id;
              Navigator.pop(context);
              setState(() {});
            },
            onLongPress: () => _showConversationOptions(c),
          )),
        ],
      ),
    );
  }

  Widget _buildEmptyState(ThemeData theme) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.hub, size: 80, color: theme.colorScheme.primary.withValues(alpha: 0.5)),
            const SizedBox(height: 24),
            Text('Welcome to Tekton', style: theme.textTheme.headlineMedium),
            const SizedBox(height: 8),
            Text('Start a conversation to begin', style: theme.textTheme.bodyLarge?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
            )),
            const SizedBox(height: 32),
            FilledButton.icon(
              onPressed: _startNewChat,
              icon: const Icon(Icons.add),
              label: const Text('New Chat'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWelcomeChat(ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.chat_bubble_outline, size: 48, color: theme.colorScheme.primary.withValues(alpha: 0.3)),
            const SizedBox(height: 16),
            Text('Start a conversation', style: theme.textTheme.titleMedium?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
            )),
            const SizedBox(height: 24),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _SuggestionChip('Write a Python script', onTap: () => _sendMessage('Write a Python script that...')),
                _SuggestionChip('Analyze this file', onTap: () => _pickFile()),
                _SuggestionChip('Explain a concept', onTap: () => _sendMessage('Explain how...')),
                _SuggestionChip('Help me debug', onTap: () => _sendMessage('Help me debug this code: ...')),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageList(ThemeData theme, List<ChatMessage> messages) {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: messages.length,
      itemBuilder: (context, index) {
        final msg = messages[index];
        return _MessageBubble(
          message: msg,
          isUser: msg.role == AgentRole.user,
          isStreaming: msg.isStreaming,
        );
      },
    );
  }

  Widget _buildAttachmentBar(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: theme.colorScheme.surfaceContainerLow,
      child: Row(
        children: [
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _pendingAttachments.map((a) =>
                  Chip(
                    label: Text(a.name, style: const TextStyle(fontSize: 12)),
                    deleteIcon: const Icon(Icons.close, size: 16),
                    onDeleted: () => setState(() => _pendingAttachments.remove(a)),
                  ),
                ).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputArea(ThemeData theme) {
    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(top: BorderSide(color: theme.colorScheme.outlineVariant)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // Attach file button
          IconButton(
            icon: const Icon(Icons.attach_file),
            onPressed: _pickFile,
            tooltip: 'Attach file',
          ),
          // Message input
          Expanded(
            child: TextField(
              controller: _messageController,
              focusNode: _focusNode,
              decoration: InputDecoration(
                hintText: _chatState == ChatState.thinking
                    ? 'Thinking...'
                    : _chatState == ChatState.streaming
                        ? 'Streaming...'
                        : 'Message Tekton...',
                border: const OutlineInputBorder(),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              ),
              maxLines: 5,
              minLines: 1,
              textInputAction: TextInputAction.newline,
              onSubmitted: (_) => _sendMessage(_messageController.text),
              enabled: _chatState == ChatState.idle,
            ),
          ),
          const SizedBox(width: 8),
          // Send / Stop button
          if (_chatState == ChatState.streaming || _chatState == ChatState.thinking)
            IconButton.filled(
              icon: const Icon(Icons.stop),
              onPressed: _stopGeneration,
              tooltip: 'Stop',
            )
          else
            IconButton.filled(
              icon: const Icon(Icons.send),
              onPressed: () => _sendMessage(_messageController.text),
              tooltip: 'Send',
            ),
        ],
      ),
    );
  }

  void _startNewChat() {
    final convo = ref.read(chatStorageProvider).createConversation();
    ref.read(activeConversationIdProvider.notifier).state = convo.id;
    setState(() {});
  }

  Future<void> _sendMessage(String content) async {
    if (content.trim().isEmpty) return;

    final controller = ref.read(chatControllerProvider);
    final activeId = ref.read(activeConversationIdProvider);

    if (activeId == null) {
      final convo = ref.read(chatStorageProvider).createConversation();
      ref.read(activeConversationIdProvider.notifier).state = convo.id;
      controller.currentConversationId = convo.id;
    }

    _messageController.clear();
    _pendingAttachments.clear();
    setState(() => _chatState = ChatState.thinking);

    try {
      await for (final chunk in controller.sendMessageStream(
        content,
        attachments: _pendingAttachments.isNotEmpty ? _pendingAttachments : null,
      )) {
        setState(() {
          _chatState = ChatState.streaming;
          _streamingContent += chunk;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      setState(() {
        _chatState = ChatState.idle;
        _streamingContent = '';
      });
    }
  }

  void _stopGeneration() {
    ref.read(chatControllerProvider).abort();
  }

  Future<void> _pickFile() async {
    // Use file_picker to let user select files
    // For now, show a simple dialog
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('File picker coming soon in next build')),
    );
  }

  void _showConversationOptions(Conversation convo) {
    showModalBottomSheet(
      context: context,
      builder: (context) => ListTile(
        leading: const Icon(Icons.delete),
        title: const Text('Delete conversation'),
        onTap: () {
          ref.read(chatStorageProvider).deleteConversation(convo.id);
          Navigator.pop(context);
          setState(() {});
        },
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final ChatMessage message;
  final bool isUser;
  final bool isStreaming;

  const _MessageBubble({
    required this.message,
    required this.isUser,
    this.isStreaming = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final alignment = isUser ? Alignment.centerRight : Alignment.centerLeft;
    final color = isUser
        ? theme.colorScheme.primaryContainer
        : theme.colorScheme.surfaceContainerHigh;

    return Align(
      alignment: alignment,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
        child: Card(
          color: color,
          child: Padding(
            padding: const EdgeInsets.all(12.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Agent/model label
                if (!isUser && message.modelUsed != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4.0),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.smart_toy, size: 14, color: theme.colorScheme.primary),
                        const SizedBox(width: 4),
                        Text(message.modelUsed!, style: theme.textTheme.labelSmall),
                      ],
                    ),
                  ),
                // Content
                if (isUser)
                  SelectableText(message.content)
                else
                  MarkdownBody(
                    data: message.content,
                    selectable: true,
                  ),
                if (isStreaming)
                  const Text('▊', style: TextStyle(fontSize: 16)),
                // File attachments
                if (message.attachments != null && message.attachments!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 8.0),
                    child: Wrap(
                      spacing: 4,
                      runSpacing: 4,
                      children: message.attachments!.map((a) =>
                        Chip(
                          avatar: const Icon(Icons.insert_drive_file, size: 14),
                          label: Text(a.name, style: const TextStyle(fontSize: 11)),
                        ),
                      ).toList(),
                    ),
                  ),
                // Token count
                if (message.tokensConsumed != null && message.tokensConsumed! > 0)
                  Align(
                    alignment: Alignment.bottomRight,
                    child: Text(
                      '${message.tokensConsumed} tokens',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SuggestionChip extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _SuggestionChip(this.label, {required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      label: Text(label),
      onPressed: onTap,
    );
  }
}