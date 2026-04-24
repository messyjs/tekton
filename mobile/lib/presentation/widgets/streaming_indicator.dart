/// Streaming indicator widget for real-time message display

import 'package:flutter/material.dart';

class StreamingIndicator extends StatelessWidget {
  final String? currentToken;

  const StreamingIndicator({super.key, this.currentToken});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (currentToken != null)
          Flexible(child: Text(currentToken!, maxLines: 1, overflow: TextOverflow.ellipsis)),
        const SizedBox(width: 4),
        const _TypingCursor(),
      ],
    );
  }
}

class _TypingCursor extends StatefulWidget {
  const _TypingCursor();

  @override
  State<_TypingCursor> createState() => _TypingCursorState();
}

class _TypingCursorState extends State<_TypingCursor> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _controller,
      child: const Text('▊', style: TextStyle(fontSize: 16)),
    );
  }
}