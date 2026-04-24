export interface CavememResult {
  id: string;
  content: string;
  kind: string;
  timestamp: string;
  relevance: number;
}

export interface CavememEntry {
  id: string;
  kind: string;
  content: string;
  timestamp: string;
}

export interface CavememObservation {
  id: string;
  kind: string;
  content: string;
  sessionId: string;
  timestamp: string;
  metadata: Record<string, string>;
}

export interface CavememSession {
  id: string;
  startTime: string;
  endTime: string;
  entryCount: number;
}

let availabilityChecked = false;
let isAvailable = false;

export class CavememBridge {
  constructor() {
    this.checkAvailability();
  }

  private checkAvailability(): void {
    if (availabilityChecked) return;

    try {
      // Try to require cavemem — if it exists, it's available
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require.resolve("cavemem");
      isAvailable = true;
    } catch {
      isAvailable = false;
    }
    availabilityChecked = true;

    if (!isAvailable) {
      console.warn(
        "Cavemem not installed. Install with `npm i -g cavemem` for persistent cross-agent memory.",
      );
    }
  }

  isAvailable(): boolean {
    return isAvailable;
  }

  async search(_query: string, _limit = 10): Promise<CavememResult[]> {
    if (!isAvailable) return [];
    // When cavemem is available, delegate to its MCP tools
    // This is a stub that will be connected in the hermes-bridge phase
    return [];
  }

  async timeline(_sessionId: string, _limit = 50): Promise<CavememEntry[]> {
    if (!isAvailable) return [];
    return [];
  }

  async getObservations(_ids: string[], _expand = false): Promise<CavememObservation[]> {
    if (!isAvailable) return [];
    return [];
  }

  async store(_observation: { content: string; kind: string; sessionId: string }): Promise<void> {
    if (!isAvailable) return;
    // Stub — delegates to cavemem MCP
  }

  async listSessions(_limit = 20): Promise<CavememSession[]> {
    if (!isAvailable) return [];
    return [];
  }
}