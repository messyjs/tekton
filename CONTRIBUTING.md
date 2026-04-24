# Contributing to Tekton

## Setup

```bash
git clone <repo-url>
cd tekton
npm install
npm run build
npm test
```

## Development Workflow

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes in the appropriate package
3. Add tests for new functionality
4. Ensure all tests pass: `npx vitest run`
5. Ensure clean build: `npm run build`
6. Submit a PR

## Code Standards

- **TypeScript strict mode** — No `any` without explicit justification
- **ESM modules** — Use `.js` extensions in imports
- **TypeBox schemas** — All runtime-validated data structures
- **Vitest** — All tests must pass
- **No external SDK deps for adapters** — Use raw `fetch()` and `WebSocket`

## Package Structure

Each package follows this pattern:
```
packages/my-package/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # Barrel exports
│   ├── types.ts           # TypeBox schemas + TypeScript types
│   └── ...modules.ts
└── tests/
    └── my-package.test.ts
```

## Adding a New Package

1. Create `packages/my-package/` with `package.json`, `tsconfig.json`
2. Add to root `package.json` workspaces array
3. Add alias to `vitest.config.ts`
4. Add dependency references in other packages as needed
5. Export from `src/index.ts`

## Adding a CLI Command

1. Create `packages/cli/src/commands/tekton-mycommand.ts`
2. Implement `CommandRegistration` interface
3. Register in `packages/cli/src/commands/index.ts`
4. Add to `createFullCommandRegistry()`
5. Add test case

## Adding a Gateway Adapter

1. Create `packages/gateway/src/adapters/my-platform.ts`
2. Extend `BaseAdapter` class
3. Implement `connect()`, `disconnect()`, `send()`, `getMessageStats()`
4. Add to `packages/gateway/src/adapters/index.ts`
5. Add platform name to `DEFAULT_GATEWAY_CONFIG`

## Testing

- Unit tests: `npx vitest run packages/my-package`
- Single test: `npx vitest run -t "test name"`
- All tests: `npx vitest run`
- 624+ tests must pass

## Skill Contribution

Skills are SKILL.md files that follow the agentskills.io format:
```markdown
---
name: my-skill
confidence: 0.85
category: coding
---

# My Skill

Trigger: When user asks about X
Steps: ...
```

Place in `~/.tekton/skills/` directory.