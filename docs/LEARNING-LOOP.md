# Learning Loop

## The Hermes Bridge

The learning loop is Tekton's self-improvement system, inspired by the Hermes protocol from the original project. It continuously evaluates, extracts, and refines skills from interactions.

## Cycle

```
┌──────────┐     ┌───────────┐     ┌──────────┐
│  Prompt   │────→│  Evaluate │────→│  Learn   │
│  + Response│    │  Quality  │     │  Extract │
└──────────┘     └───────────┘     └──────────┘
                       ↓                  ↓
                 ┌───────────┐     ┌──────────┐
                 │   Skill   │     │  User    │
                 │  Registry │     │  Model   │
                 └───────────┘     └──────────┘
                       ↓
                 ┌───────────┐
                 │  Context  │
                 │  Hygiene │
                 └───────────┘
```

### 1. Evaluation
The `Evaluator` assesses:
- Response completeness (0-1)
- Accuracy confidence (0-1)
- Task completion (boolean)
- Whether a skill could be extracted

### 2. Skill Extraction
The `SkillManager` identifies reusable patterns:
- Problem-solving strategies
- Code patterns
- Domain knowledge
- Tool usage patterns

Skills are stored in SKILL.md format:
```markdown
---
name: code-review
confidence: 0.92
usage_count: 45
last_used: 2024-01-15
---

# Code Review
Trigger: When asked to review code
Steps: ...
```

### 3. Context Hygiene
The `ContextHygiene` module manages conversation context:
- Auto-compacts when approaching token limits
- Preserves important context (system prompts, recent messages)
- Removes redundant or low-value exchanges
- Maintains conversation continuity

### 4. User Model
The `UserModel` tracks preferences:
- Preferred response style (verbose/concise)
- Domain expertise level
- Frequently used tools
- Communication patterns