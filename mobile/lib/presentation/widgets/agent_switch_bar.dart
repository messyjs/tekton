/// Agent switch bar — shows active agents as tappable avatars at the top of chat

import 'package:flutter/material.dart';
import '../../../domain/agent/agent.dart';

class AgentSwitchBar extends StatelessWidget {
  final List<AgentConfig> agents;
  final ValueChanged<AgentConfig> onAgentSelected;

  const AgentSwitchBar({super.key, required this.agents, required this.onAgentSelected});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: agents.map((agent) => Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: ActionChip(
            avatar: Text(agent.avatar ?? agent.displayName[0]),
            label: Text(agent.displayName),
            onPressed: () => onAgentSelected(agent),
          ),
        )).toList(),
      ),
    );
  }
}