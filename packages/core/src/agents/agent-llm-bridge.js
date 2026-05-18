// ── AgentLLMBridge ─────────────────────────────────────────────────────
export class AgentLLMBridge {
    modelRouter;
    toolExecutor;
    fallbackChain;
    options;
    /**
     * Internal override for testing. Set a custom LLM call function
     * that receives (model, provider, messages, tools) and returns an LLMResponse.
     * This avoids having to mock real LLM APIs in tests.
     */
    _callLLMOverride = null;
    constructor(modelRouter, toolExecutor, options, fallbackChain) {
        this.modelRouter = modelRouter;
        this.toolExecutor = toolExecutor ?? null;
        this.fallbackChain = fallbackChain ?? null;
        this.options = {
            maxTurns: options?.maxTurns ?? 20,
            maxTokens: options?.maxTokens ?? 4096,
            temperature: options?.temperature ?? 0.3,
            stream: options?.stream ?? false,
        };
    }
    // ── Main execution loop ───────────────────────────────────────────
    async executeTask(params) {
        const startTime = Date.now();
        const maxTurns = params.maxTurns ?? this.options.maxTurns;
        const messages = [];
        const toolCalls = [];
        const filesModified = [];
        let messageCount = 0;
        let totalTokensUsed = 0;
        let lastModelUsed = "unknown";
        // 1. Build system prompt
        const systemParts = [params.systemPrompt];
        if (params.context) {
            systemParts.push(`\n\nAdditional context:\n${params.context}`);
        }
        const systemMsg = { role: "system", content: systemParts.join("\n") };
        messages.push(systemMsg);
        messageCount++;
        params.onMessage?.(systemMsg);
        // 2. Add task description as user message
        const userMsg = { role: "user", content: params.taskDescription };
        messages.push(userMsg);
        messageCount++;
        params.onMessage?.(userMsg);
        // 3. Get available tools (filtered by toolset)
        const availableTools = this.toolExecutor
            ? this.toolExecutor.getTools(params.tools)
            : [];
        // 4. Execution loop
        let turnCount = 0;
        let lastError;
        while (turnCount < maxTurns) {
            turnCount++;
            try {
                // Call LLM
                const llmResponse = await this.callLLM(messages, availableTools, params.model);
                lastModelUsed = llmResponse.model;
                totalTokensUsed += llmResponse.inputTokens + llmResponse.outputTokens;
                // Record assistant message
                const assistantContent = llmResponse.content ?? "";
                const assistantMsg = { role: "assistant", content: assistantContent };
                messages.push(assistantMsg);
                messageCount++;
                params.onMessage?.(assistantMsg);
                // If no tool calls, we're done — the LLM gave a final text response
                if (!llmResponse.toolCalls || llmResponse.toolCalls.length === 0) {
                    return {
                        success: true,
                        result: assistantContent,
                        filesModified: [...new Set(filesModified)],
                        toolCalls,
                        messageCount,
                        tokensUsed: totalTokensUsed,
                        modelUsed: lastModelUsed,
                        durationMs: Date.now() - startTime,
                    };
                }
                // Execute tool calls
                for (const tc of llmResponse.toolCalls) {
                    let toolResultContent;
                    let toolResultIsError = false;
                    if (this.toolExecutor) {
                        try {
                            const result = await this.toolExecutor.execute(tc.name, tc.arguments);
                            toolResultContent = result.content;
                            toolResultIsError = result.isError;
                        }
                        catch (err) {
                            toolResultContent = `Tool execution error: ${err instanceof Error ? err.message : String(err)}`;
                            toolResultIsError = true;
                        }
                    }
                    else {
                        toolResultContent = `Tool not available: ${tc.name}`;
                        toolResultIsError = true;
                    }
                    toolCalls.push({
                        tool: tc.name,
                        params: tc.arguments,
                        result: toolResultContent,
                        isError: toolResultIsError,
                    });
                    // Track file modifications from write/patch tools
                    if (tc.name.includes("write") || tc.name.includes("patch")) {
                        const filePath = String(tc.arguments?.path ?? tc.arguments?.file_path ?? tc.arguments?.filepath ?? "");
                        if (filePath)
                            filesModified.push(filePath);
                    }
                    // Add tool result to messages
                    const toolMessage = {
                        role: "tool",
                        content: toolResultContent,
                        toolCallId: tc.id,
                        toolName: tc.name,
                    };
                    messages.push(toolMessage);
                    messageCount++;
                    params.onMessage?.(toolMessage);
                }
            }
            catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                lastError = errorMsg;
                // If LLM call fails, retry once with fallback
                if (this.fallbackChain && turnCount <= 1) {
                    try {
                        const llmResponse = await this.callLLMFallback(messages, availableTools, params.model);
                        lastModelUsed = llmResponse.model;
                        totalTokensUsed += llmResponse.inputTokens + llmResponse.outputTokens;
                        const assistantContent = llmResponse.content ?? "";
                        const assistantMsg = { role: "assistant", content: assistantContent };
                        messages.push(assistantMsg);
                        messageCount++;
                        params.onMessage?.(assistantMsg);
                        if (!llmResponse.toolCalls || llmResponse.toolCalls.length === 0) {
                            return {
                                success: true,
                                result: assistantContent,
                                filesModified: [...new Set(filesModified)],
                                toolCalls,
                                messageCount,
                                tokensUsed: totalTokensUsed,
                                modelUsed: lastModelUsed,
                                durationMs: Date.now() - startTime,
                            };
                        }
                        // Execute fallback tool calls
                        for (const tc of llmResponse.toolCalls) {
                            let toolResultContent;
                            let toolResultIsError = false;
                            if (this.toolExecutor) {
                                try {
                                    const result = await this.toolExecutor.execute(tc.name, tc.arguments);
                                    toolResultContent = result.content;
                                    toolResultIsError = result.isError;
                                }
                                catch (err2) {
                                    toolResultContent = `Tool execution error: ${err2 instanceof Error ? err2.message : String(err2)}`;
                                    toolResultIsError = true;
                                }
                            }
                            else {
                                toolResultContent = `Tool not available: ${tc.name}`;
                                toolResultIsError = true;
                            }
                            toolCalls.push({
                                tool: tc.name,
                                params: tc.arguments,
                                result: toolResultContent,
                                isError: toolResultIsError,
                            });
                            const filePath = String(tc.arguments?.path ?? tc.arguments?.file_path ?? tc.arguments?.filepath ?? "");
                            if (filePath)
                                filesModified.push(filePath);
                            const toolMsg = {
                                role: "tool",
                                content: toolResultContent,
                                toolCallId: tc.id,
                                toolName: tc.name,
                            };
                            messages.push(toolMsg);
                            messageCount++;
                            params.onMessage?.(toolMsg);
                        }
                        continue; // Fallback succeeded, continue loop
                    }
                    catch {
                        // Fallback also failed, include error in messages and let LLM recover
                        const errMsg = {
                            role: "tool",
                            content: `LLM error (fallback also failed): ${errorMsg}`,
                        };
                        messages.push(errMsg);
                        messageCount++;
                        params.onMessage?.(errMsg);
                        continue;
                    }
                }
                // Tool execution error — include in messages and let LLM recover
                const errMsg = {
                    role: "tool",
                    content: `Error: ${errorMsg}`,
                };
                messages.push(errMsg);
                messageCount++;
                params.onMessage?.(errMsg);
            }
        }
        // maxTurns reached
        const lastAssistantContent = messages
            .filter(m => m.role === "assistant")
            .pop()?.content ?? "";
        return {
            success: false,
            result: lastAssistantContent || "Task did not complete within max turns",
            filesModified: [...new Set(filesModified)],
            toolCalls,
            messageCount,
            tokensUsed: totalTokensUsed,
            modelUsed: lastModelUsed,
            durationMs: Date.now() - startTime,
            error: `Max turns (${maxTurns}) reached. ${lastError ? `Last error: ${lastError}` : ""}`,
        };
    }
    // ── LLM Call ──────────────────────────────────────────────────────
    async callLLM(messages, availableTools, modelOverride) {
        const prompt = messages.map(m => m.content).join("\n");
        const routingContext = {
            prompt,
            tokenCount: Math.ceil(prompt.length / 4),
            hasCodeBlocks: prompt.includes("```"),
            matchingSkills: [],
            sessionComplexityHistory: [],
        };
        // Determine model
        let decision;
        if (modelOverride) {
            decision = {
                model: modelOverride,
                provider: "manual",
                reason: "Model override from task params",
                complexityScore: 0.5,
                estimatedCost: 0,
            };
        }
        else {
            decision = this.modelRouter.route(routingContext);
        }
        const startTime = Date.now();
        // If a test has set a callLLMOverride, use it
        if (this._callLLMOverride) {
            return this._callLLMOverride(decision.model, decision.provider, messages, availableTools);
        }
        // Default: return a stub response indicating no LLM backend
        return {
            content: `[stub] No LLM backend configured for ${decision.model}/${decision.provider}`,
            toolCalls: [],
            model: decision.model,
            provider: decision.provider,
            inputTokens: Math.ceil(prompt.length / 4),
            outputTokens: 0,
            durationMs: Date.now() - startTime,
        };
    }
    async callLLMFallback(messages, availableTools, modelOverride) {
        // Try fallback chain
        if (this.fallbackChain) {
            const prompt = messages.map(m => m.content).join("\n");
            const response = await this.fallbackChain.call({
                model: modelOverride ?? this.modelRouter.getRecentDecisions(1)[0]?.model ?? "unknown",
                provider: "fallback",
                messages: messages.map(m => ({ role: m.role, content: m.content })),
                maxTokens: this.options.maxTokens,
                temperature: this.options.temperature,
            });
            return {
                content: response.content,
                toolCalls: [],
                model: response.model,
                provider: response.provider,
                inputTokens: response.inputTokens,
                outputTokens: response.outputTokens,
                durationMs: response.latencyMs,
            };
        }
        // No fallback chain — just retry primary
        return this.callLLM(messages, availableTools, modelOverride);
    }
}
//# sourceMappingURL=agent-llm-bridge.js.map