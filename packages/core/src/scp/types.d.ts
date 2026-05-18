import { Static } from "@sinclair/typebox";
export declare const SCPDelegate: import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"delegate">;
    task_id: import("@sinclair/typebox").TString;
    from: import("@sinclair/typebox").TString;
    to: import("@sinclair/typebox").TString;
    task: import("@sinclair/typebox").TString;
    context: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    priority: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"low">, import("@sinclair/typebox").TLiteral<"normal">, import("@sinclair/typebox").TLiteral<"high">]>;
    skill_hint: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    tools: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    timeout_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
}>;
export declare const SCPResult: import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"result">;
    task_id: import("@sinclair/typebox").TString;
    from: import("@sinclair/typebox").TString;
    status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"ok">, import("@sinclair/typebox").TLiteral<"partial">, import("@sinclair/typebox").TLiteral<"error">]>;
    result: import("@sinclair/typebox").TString;
    tokens_used: import("@sinclair/typebox").TNumber;
    model_used: import("@sinclair/typebox").TString;
    duration_ms: import("@sinclair/typebox").TNumber;
}>;
export declare const SCPError: import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"error">;
    task_id: import("@sinclair/typebox").TString;
    from: import("@sinclair/typebox").TString;
    code: import("@sinclair/typebox").TString;
    message: import("@sinclair/typebox").TString;
    recoverable: import("@sinclair/typebox").TBoolean;
}>;
export declare const SCPStatus: import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"status">;
    from: import("@sinclair/typebox").TString;
    state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"idle">, import("@sinclair/typebox").TLiteral<"busy">, import("@sinclair/typebox").TLiteral<"blocked">]>;
    current_task: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    tokens_remaining: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
}>;
export declare const SCPSkillQuery: import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"skill-query">;
    from: import("@sinclair/typebox").TString;
    query: import("@sinclair/typebox").TString;
    top_k: import("@sinclair/typebox").TNumber;
}>;
export declare const SCPSkillResponse: import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"skill-response">;
    from: import("@sinclair/typebox").TString;
    skills: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        name: import("@sinclair/typebox").TString;
        description: import("@sinclair/typebox").TString;
        confidence: import("@sinclair/typebox").TNumber;
    }>>;
}>;
export declare const SCPMessage: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"delegate">;
    task_id: import("@sinclair/typebox").TString;
    from: import("@sinclair/typebox").TString;
    to: import("@sinclair/typebox").TString;
    task: import("@sinclair/typebox").TString;
    context: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    priority: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"low">, import("@sinclair/typebox").TLiteral<"normal">, import("@sinclair/typebox").TLiteral<"high">]>;
    skill_hint: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    tools: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    timeout_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
}>, import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"result">;
    task_id: import("@sinclair/typebox").TString;
    from: import("@sinclair/typebox").TString;
    status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"ok">, import("@sinclair/typebox").TLiteral<"partial">, import("@sinclair/typebox").TLiteral<"error">]>;
    result: import("@sinclair/typebox").TString;
    tokens_used: import("@sinclair/typebox").TNumber;
    model_used: import("@sinclair/typebox").TString;
    duration_ms: import("@sinclair/typebox").TNumber;
}>, import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"error">;
    task_id: import("@sinclair/typebox").TString;
    from: import("@sinclair/typebox").TString;
    code: import("@sinclair/typebox").TString;
    message: import("@sinclair/typebox").TString;
    recoverable: import("@sinclair/typebox").TBoolean;
}>, import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"status">;
    from: import("@sinclair/typebox").TString;
    state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"idle">, import("@sinclair/typebox").TLiteral<"busy">, import("@sinclair/typebox").TLiteral<"blocked">]>;
    current_task: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    tokens_remaining: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
}>, import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"skill-query">;
    from: import("@sinclair/typebox").TString;
    query: import("@sinclair/typebox").TString;
    top_k: import("@sinclair/typebox").TNumber;
}>, import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"skill-response">;
    from: import("@sinclair/typebox").TString;
    skills: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        name: import("@sinclair/typebox").TString;
        description: import("@sinclair/typebox").TString;
        confidence: import("@sinclair/typebox").TNumber;
    }>>;
}>]>;
export type SCPDelegate = Static<typeof SCPDelegate>;
export type SCPResult = Static<typeof SCPResult>;
export type SCPError = Static<typeof SCPError>;
export type SCPStatus = Static<typeof SCPStatus>;
export type SCPSkillQuery = Static<typeof SCPSkillQuery>;
export type SCPSkillResponse = Static<typeof SCPSkillResponse>;
export type SCPMessage = Static<typeof SCPMessage>;
//# sourceMappingURL=types.d.ts.map