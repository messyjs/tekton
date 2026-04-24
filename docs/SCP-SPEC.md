# SCP (Structured Caveman Protocol) Specification

## Overview

SCP is Tekton's inter-agent communication protocol. It uses TypeBox-validated JSON messages passed between the orchestrator and sub-agents.

## Message Types

### delegate
Task delegation from orchestrator to sub-agent.

```json
{
  "type": "delegate",
  "task_id": "task-001",
  "from": "orchestrator",
  "to": "worker-alpha",
  "task": "Caveman-compressed task description",
  "context": "Optional context string",
  "priority": "high",
  "skill_hint": "code-generation",
  "tools": ["filesystem", "shell"],
  "timeout_ms": 30000
}
```

### result
Task completion response from sub-agent.

```json
{
  "type": "result",
  "task_id": "task-001",
  "from": "worker-alpha",
  "status": "ok",
  "result": "Caveman-compressed result",
  "tokens_used": 1500,
  "model_used": "gemma3:12b",
  "duration_ms": 3000
}
```

### error
Error reporting from sub-agents.

```json
{
  "type": "error",
  "task_id": "task-001",
  "from": "worker-alpha",
  "code": "TIMEOUT",
  "message": "Task timed out",
  "recoverable": true
}
```

### status
Agent status heartbeat.

```json
{
  "type": "status",
  "from": "worker-alpha",
  "state": "busy",
  "current_task": "Processing code review",
  "tokens_remaining": 50000
}
```

### skill-query / skill-response
Skill discovery protocol.

```json
// Query
{
  "type": "skill-query",
  "from": "orchestrator",
  "query": "code review",
  "top_k": 3
}

// Response
{
  "type": "skill-response",
  "from": "skill-registry",
  "skills": [
    { "name": "code-review", "description": "Reviews code", "confidence": 0.92 }
  ]
}
```

## Encoding

Messages are JSON-stringified and can be compressed using Tekton's compression tiers:
- **Lite**: Before delegation (reduce transfer size)
- **Compact**: For long contexts
- **Full**: Maximum compression for memory-constrained scenarios

## Validation

All messages are validated against TypeBox schemas before processing. Invalid messages are rejected with a descriptive error.