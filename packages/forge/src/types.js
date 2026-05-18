/**
 * Forge Types — All domain types with TypeBox schemas for runtime validation.
 */
import { Type } from "@sinclair/typebox";
// ── Product Domain ────────────────────────────────────────────────────────
export const ProductDomainEnum = Type.Union([
    Type.Literal("vst-audio"),
    Type.Literal("windows-desktop"),
    Type.Literal("web-app"),
    Type.Literal("unreal-engine"),
    Type.Literal("android"),
    Type.Literal("ios"),
    Type.Literal("cad-physical"),
    Type.Literal("html-static"),
    Type.Literal("cross-platform"),
]);
// ── Product Brief ─────────────────────────────────────────────────────────
export const RevisionNoteSchema = Type.Object({
    round: Type.Number(),
    directorNotes: Type.String(),
    changesMade: Type.String(),
    timestamp: Type.Number(),
});
export const ProductBriefSchema = Type.Object({
    id: Type.String(),
    title: Type.String(),
    problemStatement: Type.String(),
    proposedSolution: Type.String(),
    technicalApproach: Type.String(),
    userStories: Type.Array(Type.String()),
    risks: Type.Array(Type.String()),
    estimatedComplexity: Type.Union([
        Type.Literal("low"),
        Type.Literal("medium"),
        Type.Literal("high"),
        Type.Literal("extreme"),
    ]),
    domains: Type.Array(ProductDomainEnum),
    ideationTranscript: Type.String(),
    createdAt: Type.Number(),
    revisionHistory: Type.Array(RevisionNoteSchema),
});
export const DirectorDecisionSchema = Type.Object({
    verdict: Type.Union([
        Type.Literal("approved"),
        Type.Literal("revise"),
        Type.Literal("rejected"),
    ]),
    reasoning: Type.String(),
    scores: Type.Object({
        feasibility: Type.Number({ minimum: 1, maximum: 10 }),
        clarity: Type.Number({ minimum: 1, maximum: 10 }),
        completeness: Type.Number({ minimum: 1, maximum: 10 }),
        originality: Type.Number({ minimum: 1, maximum: 10 }),
        scopeAppropriate: Type.Number({ minimum: 1, maximum: 10 }),
    }),
    revisionNotes: Type.Optional(Type.String()),
    productionPlan: Type.Optional(Type.String()),
});
// ── Production Plan ────────────────────────────────────────────────────────
export const TaskCardSchema = Type.Object({
    id: Type.String(),
    planId: Type.String(),
    role: Type.String(),
    title: Type.String(),
    description: Type.String(),
    context: Type.String(),
    acceptanceCriteria: Type.Array(Type.String()),
    outputFiles: Type.Array(Type.String()),
    dependencies: Type.Array(Type.String()),
    status: Type.Union([
        Type.Literal("pending"),
        Type.Literal("in-progress"),
        Type.Literal("completed"),
        Type.Literal("failed"),
        Type.Literal("blocked"),
    ]),
    sessionHistory: Type.Array(Type.Object({})), // SessionRecord - recursive, use empty for now
});
export const RoleDefinitionSchema = Type.Object({
    id: Type.String(),
    name: Type.String(),
    systemPrompt: Type.String(),
    tools: Type.Array(Type.String()),
    model: Type.String(),
    sessionLimit: Type.Number(),
});
export const TestRoleDefinitionSchema = Type.Object({
    id: Type.String(),
    name: Type.String(),
    systemPrompt: Type.String(),
    tools: Type.Array(Type.String()),
    model: Type.String(),
    sessionLimit: Type.Number(),
    validatorCommand: Type.Optional(Type.String()),
    testPattern: Type.Optional(Type.String()),
});
export const TeamTemplateSchema = Type.Object({
    domain: Type.String(),
    roles: Type.Array(RoleDefinitionSchema),
    testRoles: Type.Array(TestRoleDefinitionSchema),
    projectTemplate: Type.String(),
    buildCommand: Type.Optional(Type.String()),
    testCommand: Type.Optional(Type.String()),
    requiredTools: Type.Array(Type.String()),
    optionalTools: Type.Array(Type.String()),
});
export const ProductionPlanSchema = Type.Object({
    id: Type.String(),
    briefId: Type.String(),
    domains: Type.Array(ProductDomainEnum),
    teamTemplate: TeamTemplateSchema,
    taskCards: Type.Array(TaskCardSchema),
    dependencyGraph: Type.Record(Type.String(), Type.Array(Type.String())),
    estimatedSessions: Type.Number(),
});
// ── Agent Tuple ───────────────────────────────────────────────────────────
export const AgentTupleSchema = Type.Object({
    instruction: Type.String(),
    context: Type.String(),
    tools: Type.Array(Type.String()),
    model: Type.String(),
});
export const FileChangeSchema = Type.Object({
    path: Type.String(),
    action: Type.Union([
        Type.Literal("created"),
        Type.Literal("modified"),
        Type.Literal("deleted"),
    ]),
    status: Type.Union([
        Type.Literal("draft"),
        Type.Literal("beta"),
        Type.Literal("testing"),
        Type.Literal("release"),
    ]),
    hash: Type.String(),
});
export const HandoffPackageSchema = Type.Object({
    sessionId: Type.String(),
    taskCardId: Type.String(),
    summary: Type.String(),
    completedWork: Type.Array(Type.String()),
    remainingWork: Type.Array(Type.String()),
    filesModified: Type.Array(FileChangeSchema),
    importantDecisions: Type.Array(Type.String()),
    blockers: Type.Array(Type.String()),
    cavememObservations: Type.Array(Type.String()),
    precisionItems: Type.Optional(Type.Array(Type.Any())),
    nextSessionContext: Type.String(),
});
export const SessionRecordSchema = Type.Object({
    id: Type.String(),
    agentRole: Type.String(),
    taskCardId: Type.String(),
    messageCount: Type.Number(),
    maxMessages: Type.Number(),
    startedAt: Type.Number(),
    endedAt: Type.Optional(Type.Number()),
    status: Type.Union([
        Type.Literal("active"),
        Type.Literal("completed"),
        Type.Literal("limit-reached"),
        Type.Literal("error"),
    ]),
    handoffPackage: Type.Optional(HandoffPackageSchema),
});
export const ArtifactEntrySchema = Type.Object({
    path: Type.String(),
    status: Type.Union([
        Type.Literal("draft"),
        Type.Literal("beta"),
        Type.Literal("testing"),
        Type.Literal("release"),
    ]),
    producedBy: Type.String(),
    taskCardId: Type.String(),
    lastModified: Type.Number(),
    testedBy: Type.Array(Type.String()),
    hash: Type.String(),
});
export const QASignoffSchema = Type.Object({
    artifactPath: Type.String(),
    testerRole: Type.String(),
    passed: Type.Boolean(),
    notes: Type.String(),
    timestamp: Type.Number(),
});
export const ForgeManifestSchema = Type.Object({
    projectId: Type.String(),
    briefId: Type.String(),
    domains: Type.Array(ProductDomainEnum),
    artifacts: Type.Array(ArtifactEntrySchema),
    qaSignoffs: Type.Array(QASignoffSchema),
    currentPhase: Type.Union([
        Type.Literal("ideation"),
        Type.Literal("review"),
        Type.Literal("production"),
        Type.Literal("qa"),
        Type.Literal("release"),
    ]),
});
// ── Preflight ─────────────────────────────────────────────────────────────
export const PreflightResultSchema = Type.Object({
    ready: Type.Boolean(),
    missing: Type.Array(Type.String()),
    warnings: Type.Array(Type.String()),
});
//# sourceMappingURL=types.js.map