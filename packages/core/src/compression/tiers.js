export function detectTier(context) {
    const { source, destination, isSubAgent } = context;
    // User ↔ Tekton: no compression
    if (source === "user" && destination === "tekton")
        return "none";
    if (source === "tekton" && destination === "user")
        return "none";
    // Sub-agent ↔ Sub-agent: ultra
    if (isSubAgent)
        return "ultra";
    // Tekton ↔ Model: full
    if (source === "tekton" || destination === "model")
        return "full";
    if (destination === "sub-agent")
        return "full";
    // Default: full for model-facing, none for user-facing
    return "full";
}
//# sourceMappingURL=tiers.js.map