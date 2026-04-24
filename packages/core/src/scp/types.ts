import { Type, Static } from "@sinclair/typebox";

export const SCPDelegate = Type.Object({
  type: Type.Literal("delegate"),
  task_id: Type.String(),
  from: Type.String(),
  to: Type.String(),
  task: Type.String({ description: "Caveman-compressed task description" }),
  context: Type.Optional(Type.String()),
  priority: Type.Union([Type.Literal("low"), Type.Literal("normal"), Type.Literal("high")]),
  skill_hint: Type.Optional(Type.String()),
  tools: Type.Optional(Type.Array(Type.String())),
  timeout_ms: Type.Optional(Type.Number()),
});

export const SCPResult = Type.Object({
  type: Type.Literal("result"),
  task_id: Type.String(),
  from: Type.String(),
  status: Type.Union([Type.Literal("ok"), Type.Literal("partial"), Type.Literal("error")]),
  result: Type.String({ description: "Caveman-compressed result" }),
  tokens_used: Type.Number(),
  model_used: Type.String(),
  duration_ms: Type.Number(),
});

export const SCPError = Type.Object({
  type: Type.Literal("error"),
  task_id: Type.String(),
  from: Type.String(),
  code: Type.String(),
  message: Type.String(),
  recoverable: Type.Boolean(),
});

export const SCPStatus = Type.Object({
  type: Type.Literal("status"),
  from: Type.String(),
  state: Type.Union([Type.Literal("idle"), Type.Literal("busy"), Type.Literal("blocked")]),
  current_task: Type.Optional(Type.String()),
  tokens_remaining: Type.Optional(Type.Number()),
});

export const SCPSkillQuery = Type.Object({
  type: Type.Literal("skill-query"),
  from: Type.String(),
  query: Type.String(),
  top_k: Type.Number({ default: 5 }),
});

export const SCPSkillResponse = Type.Object({
  type: Type.Literal("skill-response"),
  from: Type.String(),
  skills: Type.Array(Type.Object({
    name: Type.String(),
    description: Type.String(),
    confidence: Type.Number(),
  })),
});

export const SCPMessage = Type.Union([
  SCPDelegate,
  SCPResult,
  SCPError,
  SCPStatus,
  SCPSkillQuery,
  SCPSkillResponse,
]);

export type SCPDelegate = Static<typeof SCPDelegate>;
export type SCPResult = Static<typeof SCPResult>;
export type SCPError = Static<typeof SCPError>;
export type SCPStatus = Static<typeof SCPStatus>;
export type SCPSkillQuery = Static<typeof SCPSkillQuery>;
export type SCPSkillResponse = Static<typeof SCPSkillResponse>;
export type SCPMessage = Static<typeof SCPMessage>;