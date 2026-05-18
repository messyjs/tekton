let availabilityChecked = false;
let isAvailable = false;
export class CavememBridge {
    constructor() {
        this.checkAvailability();
    }
    checkAvailability() {
        if (availabilityChecked)
            return;
        try {
            // Try to require cavemem — if it exists, it's available
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require.resolve("cavemem");
            isAvailable = true;
        }
        catch {
            isAvailable = false;
        }
        availabilityChecked = true;
        if (!isAvailable) {
            console.warn("Cavemem not installed. Install with `npm i -g cavemem` for persistent cross-agent memory.");
        }
    }
    isAvailable() {
        return isAvailable;
    }
    async search(_query, _limit = 10) {
        if (!isAvailable)
            return [];
        // When cavemem is available, delegate to its MCP tools
        // This is a stub that will be connected in the hermes-bridge phase
        return [];
    }
    async timeline(_sessionId, _limit = 50) {
        if (!isAvailable)
            return [];
        return [];
    }
    async getObservations(_ids, _expand = false) {
        if (!isAvailable)
            return [];
        return [];
    }
    async store(_observation) {
        if (!isAvailable)
            return;
        // Stub — delegates to cavemem MCP
    }
    async listSessions(_limit = 20) {
        if (!isAvailable)
            return [];
        return [];
    }
}
//# sourceMappingURL=cavemem-bridge.js.map