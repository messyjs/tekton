/**
 * Forge Types — All domain types with TypeBox schemas for runtime validation.
 */
import { Static } from "@sinclair/typebox";
export declare const ProductDomainEnum: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"vst-audio">, import("@sinclair/typebox").TLiteral<"windows-desktop">, import("@sinclair/typebox").TLiteral<"web-app">, import("@sinclair/typebox").TLiteral<"unreal-engine">, import("@sinclair/typebox").TLiteral<"android">, import("@sinclair/typebox").TLiteral<"ios">, import("@sinclair/typebox").TLiteral<"cad-physical">, import("@sinclair/typebox").TLiteral<"html-static">, import("@sinclair/typebox").TLiteral<"cross-platform">]>;
export type ProductDomain = Static<typeof ProductDomainEnum>;
export declare const RevisionNoteSchema: import("@sinclair/typebox").TObject<{
    round: import("@sinclair/typebox").TNumber;
    directorNotes: import("@sinclair/typebox").TString;
    changesMade: import("@sinclair/typebox").TString;
    timestamp: import("@sinclair/typebox").TNumber;
}>;
export type RevisionNote = Static<typeof RevisionNoteSchema>;
export declare const ProductBriefSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    title: import("@sinclair/typebox").TString;
    problemStatement: import("@sinclair/typebox").TString;
    proposedSolution: import("@sinclair/typebox").TString;
    technicalApproach: import("@sinclair/typebox").TString;
    userStories: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    risks: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    estimatedComplexity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"low">, import("@sinclair/typebox").TLiteral<"medium">, import("@sinclair/typebox").TLiteral<"high">, import("@sinclair/typebox").TLiteral<"extreme">]>;
    domains: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"vst-audio">, import("@sinclair/typebox").TLiteral<"windows-desktop">, import("@sinclair/typebox").TLiteral<"web-app">, import("@sinclair/typebox").TLiteral<"unreal-engine">, import("@sinclair/typebox").TLiteral<"android">, import("@sinclair/typebox").TLiteral<"ios">, import("@sinclair/typebox").TLiteral<"cad-physical">, import("@sinclair/typebox").TLiteral<"html-static">, import("@sinclair/typebox").TLiteral<"cross-platform">]>>;
    ideationTranscript: import("@sinclair/typebox").TString;
    createdAt: import("@sinclair/typebox").TNumber;
    revisionHistory: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        round: import("@sinclair/typebox").TNumber;
        directorNotes: import("@sinclair/typebox").TString;
        changesMade: import("@sinclair/typebox").TString;
        timestamp: import("@sinclair/typebox").TNumber;
    }>>;
}>;
export type ProductBrief = Static<typeof ProductBriefSchema>;
export type DirectorVerdict = "approved" | "revise" | "rejected";
export declare const DirectorDecisionSchema: import("@sinclair/typebox").TObject<{
    verdict: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"approved">, import("@sinclair/typebox").TLiteral<"revise">, import("@sinclair/typebox").TLiteral<"rejected">]>;
    reasoning: import("@sinclair/typebox").TString;
    scores: import("@sinclair/typebox").TObject<{
        feasibility: import("@sinclair/typebox").TNumber;
        clarity: import("@sinclair/typebox").TNumber;
        completeness: import("@sinclair/typebox").TNumber;
        originality: import("@sinclair/typebox").TNumber;
        scopeAppropriate: import("@sinclair/typebox").TNumber;
    }>;
    revisionNotes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    productionPlan: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type DirectorDecision = Static<typeof DirectorDecisionSchema>;
export declare const TaskCardSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    planId: import("@sinclair/typebox").TString;
    role: import("@sinclair/typebox").TString;
    title: import("@sinclair/typebox").TString;
    description: import("@sinclair/typebox").TString;
    context: import("@sinclair/typebox").TString;
    acceptanceCriteria: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    outputFiles: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    dependencies: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"in-progress">, import("@sinclair/typebox").TLiteral<"completed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"blocked">]>;
    sessionHistory: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{}>>;
}>;
export type TaskCardStatus = "pending" | "in-progress" | "completed" | "failed" | "blocked";
export type TaskCard = Static<typeof TaskCardSchema>;
export declare const RoleDefinitionSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    name: import("@sinclair/typebox").TString;
    systemPrompt: import("@sinclair/typebox").TString;
    tools: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    model: import("@sinclair/typebox").TString;
    sessionLimit: import("@sinclair/typebox").TNumber;
}>;
export type RoleDefinition = Static<typeof RoleDefinitionSchema>;
export declare const TestRoleDefinitionSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    name: import("@sinclair/typebox").TString;
    systemPrompt: import("@sinclair/typebox").TString;
    tools: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    model: import("@sinclair/typebox").TString;
    sessionLimit: import("@sinclair/typebox").TNumber;
    validatorCommand: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    testPattern: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type TestRoleDefinition = Static<typeof TestRoleDefinitionSchema>;
export declare const TeamTemplateSchema: import("@sinclair/typebox").TObject<{
    domain: import("@sinclair/typebox").TString;
    roles: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        name: import("@sinclair/typebox").TString;
        systemPrompt: import("@sinclair/typebox").TString;
        tools: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        model: import("@sinclair/typebox").TString;
        sessionLimit: import("@sinclair/typebox").TNumber;
    }>>;
    testRoles: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        name: import("@sinclair/typebox").TString;
        systemPrompt: import("@sinclair/typebox").TString;
        tools: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        model: import("@sinclair/typebox").TString;
        sessionLimit: import("@sinclair/typebox").TNumber;
        validatorCommand: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        testPattern: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    projectTemplate: import("@sinclair/typebox").TString;
    buildCommand: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    testCommand: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    requiredTools: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    optionalTools: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
}>;
export type TeamTemplate = Static<typeof TeamTemplateSchema>;
export declare const ProductionPlanSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    briefId: import("@sinclair/typebox").TString;
    domains: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"vst-audio">, import("@sinclair/typebox").TLiteral<"windows-desktop">, import("@sinclair/typebox").TLiteral<"web-app">, import("@sinclair/typebox").TLiteral<"unreal-engine">, import("@sinclair/typebox").TLiteral<"android">, import("@sinclair/typebox").TLiteral<"ios">, import("@sinclair/typebox").TLiteral<"cad-physical">, import("@sinclair/typebox").TLiteral<"html-static">, import("@sinclair/typebox").TLiteral<"cross-platform">]>>;
    teamTemplate: import("@sinclair/typebox").TObject<{
        domain: import("@sinclair/typebox").TString;
        roles: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            name: import("@sinclair/typebox").TString;
            systemPrompt: import("@sinclair/typebox").TString;
            tools: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            model: import("@sinclair/typebox").TString;
            sessionLimit: import("@sinclair/typebox").TNumber;
        }>>;
        testRoles: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            name: import("@sinclair/typebox").TString;
            systemPrompt: import("@sinclair/typebox").TString;
            tools: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            model: import("@sinclair/typebox").TString;
            sessionLimit: import("@sinclair/typebox").TNumber;
            validatorCommand: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            testPattern: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        }>>;
        projectTemplate: import("@sinclair/typebox").TString;
        buildCommand: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        testCommand: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        requiredTools: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        optionalTools: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    }>;
    taskCards: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        planId: import("@sinclair/typebox").TString;
        role: import("@sinclair/typebox").TString;
        title: import("@sinclair/typebox").TString;
        description: import("@sinclair/typebox").TString;
        context: import("@sinclair/typebox").TString;
        acceptanceCriteria: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        outputFiles: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        dependencies: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"in-progress">, import("@sinclair/typebox").TLiteral<"completed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"blocked">]>;
        sessionHistory: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{}>>;
    }>>;
    dependencyGraph: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    estimatedSessions: import("@sinclair/typebox").TNumber;
}>;
export type ProductionPlan = Static<typeof ProductionPlanSchema>;
export declare const AgentTupleSchema: import("@sinclair/typebox").TObject<{
    instruction: import("@sinclair/typebox").TString;
    context: import("@sinclair/typebox").TString;
    tools: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    model: import("@sinclair/typebox").TString;
}>;
export type AgentTuple = Static<typeof AgentTupleSchema>;
export type SessionRecordStatus = "active" | "completed" | "limit-reached" | "error";
export declare const FileChangeSchema: import("@sinclair/typebox").TObject<{
    path: import("@sinclair/typebox").TString;
    action: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"created">, import("@sinclair/typebox").TLiteral<"modified">, import("@sinclair/typebox").TLiteral<"deleted">]>;
    status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"draft">, import("@sinclair/typebox").TLiteral<"beta">, import("@sinclair/typebox").TLiteral<"testing">, import("@sinclair/typebox").TLiteral<"release">]>;
    hash: import("@sinclair/typebox").TString;
}>;
export type FileChangeAction = "created" | "modified" | "deleted";
export type FileChangeStatus = "draft" | "beta" | "testing" | "release";
export type FileChange = Static<typeof FileChangeSchema>;
export declare const HandoffPackageSchema: import("@sinclair/typebox").TObject<{
    sessionId: import("@sinclair/typebox").TString;
    taskCardId: import("@sinclair/typebox").TString;
    summary: import("@sinclair/typebox").TString;
    completedWork: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    remainingWork: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    filesModified: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        path: import("@sinclair/typebox").TString;
        action: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"created">, import("@sinclair/typebox").TLiteral<"modified">, import("@sinclair/typebox").TLiteral<"deleted">]>;
        status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"draft">, import("@sinclair/typebox").TLiteral<"beta">, import("@sinclair/typebox").TLiteral<"testing">, import("@sinclair/typebox").TLiteral<"release">]>;
        hash: import("@sinclair/typebox").TString;
    }>>;
    importantDecisions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    blockers: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    cavememObservations: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    precisionItems: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TAny>>;
    nextSessionContext: import("@sinclair/typebox").TString;
}>;
export type HandoffPackage = Static<typeof HandoffPackageSchema>;
export declare const SessionRecordSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    agentRole: import("@sinclair/typebox").TString;
    taskCardId: import("@sinclair/typebox").TString;
    messageCount: import("@sinclair/typebox").TNumber;
    maxMessages: import("@sinclair/typebox").TNumber;
    startedAt: import("@sinclair/typebox").TNumber;
    endedAt: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"completed">, import("@sinclair/typebox").TLiteral<"limit-reached">, import("@sinclair/typebox").TLiteral<"error">]>;
    handoffPackage: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        sessionId: import("@sinclair/typebox").TString;
        taskCardId: import("@sinclair/typebox").TString;
        summary: import("@sinclair/typebox").TString;
        completedWork: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        remainingWork: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        filesModified: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            path: import("@sinclair/typebox").TString;
            action: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"created">, import("@sinclair/typebox").TLiteral<"modified">, import("@sinclair/typebox").TLiteral<"deleted">]>;
            status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"draft">, import("@sinclair/typebox").TLiteral<"beta">, import("@sinclair/typebox").TLiteral<"testing">, import("@sinclair/typebox").TLiteral<"release">]>;
            hash: import("@sinclair/typebox").TString;
        }>>;
        importantDecisions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        blockers: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        cavememObservations: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        precisionItems: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TAny>>;
        nextSessionContext: import("@sinclair/typebox").TString;
    }>>;
}>;
export type SessionRecord = Static<typeof SessionRecordSchema>;
export type ForgePhase = "ideation" | "review" | "production" | "qa" | "release";
export declare const ArtifactEntrySchema: import("@sinclair/typebox").TObject<{
    path: import("@sinclair/typebox").TString;
    status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"draft">, import("@sinclair/typebox").TLiteral<"beta">, import("@sinclair/typebox").TLiteral<"testing">, import("@sinclair/typebox").TLiteral<"release">]>;
    producedBy: import("@sinclair/typebox").TString;
    taskCardId: import("@sinclair/typebox").TString;
    lastModified: import("@sinclair/typebox").TNumber;
    testedBy: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    hash: import("@sinclair/typebox").TString;
}>;
export type ArtifactStatus = "draft" | "beta" | "testing" | "release";
export type ArtifactEntry = Static<typeof ArtifactEntrySchema>;
export declare const QASignoffSchema: import("@sinclair/typebox").TObject<{
    artifactPath: import("@sinclair/typebox").TString;
    testerRole: import("@sinclair/typebox").TString;
    passed: import("@sinclair/typebox").TBoolean;
    notes: import("@sinclair/typebox").TString;
    timestamp: import("@sinclair/typebox").TNumber;
}>;
export type QASignoff = Static<typeof QASignoffSchema>;
export declare const ForgeManifestSchema: import("@sinclair/typebox").TObject<{
    projectId: import("@sinclair/typebox").TString;
    briefId: import("@sinclair/typebox").TString;
    domains: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"vst-audio">, import("@sinclair/typebox").TLiteral<"windows-desktop">, import("@sinclair/typebox").TLiteral<"web-app">, import("@sinclair/typebox").TLiteral<"unreal-engine">, import("@sinclair/typebox").TLiteral<"android">, import("@sinclair/typebox").TLiteral<"ios">, import("@sinclair/typebox").TLiteral<"cad-physical">, import("@sinclair/typebox").TLiteral<"html-static">, import("@sinclair/typebox").TLiteral<"cross-platform">]>>;
    artifacts: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        path: import("@sinclair/typebox").TString;
        status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"draft">, import("@sinclair/typebox").TLiteral<"beta">, import("@sinclair/typebox").TLiteral<"testing">, import("@sinclair/typebox").TLiteral<"release">]>;
        producedBy: import("@sinclair/typebox").TString;
        taskCardId: import("@sinclair/typebox").TString;
        lastModified: import("@sinclair/typebox").TNumber;
        testedBy: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        hash: import("@sinclair/typebox").TString;
    }>>;
    qaSignoffs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        artifactPath: import("@sinclair/typebox").TString;
        testerRole: import("@sinclair/typebox").TString;
        passed: import("@sinclair/typebox").TBoolean;
        notes: import("@sinclair/typebox").TString;
        timestamp: import("@sinclair/typebox").TNumber;
    }>>;
    currentPhase: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"ideation">, import("@sinclair/typebox").TLiteral<"review">, import("@sinclair/typebox").TLiteral<"production">, import("@sinclair/typebox").TLiteral<"qa">, import("@sinclair/typebox").TLiteral<"release">]>;
}>;
export type ForgeManifest = Static<typeof ForgeManifestSchema>;
export declare const PreflightResultSchema: import("@sinclair/typebox").TObject<{
    ready: import("@sinclair/typebox").TBoolean;
    missing: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    warnings: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
}>;
export type PreflightResult = Static<typeof PreflightResultSchema>;
//# sourceMappingURL=types.d.ts.map