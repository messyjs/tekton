/**
 * PI Agent Service — HTTP + MCP dual-mode server for trading intelligence.
 *
 * Port 7706 for HTTP, or stdio for MCP.
 *
 * Usage:
 *   tekton-pi-agent --mode http --port 7706   # HTTP API
 *   tekton-pi-agent --mode mcp                 # MCP stdio server
 */
import { Hono } from "hono";
export declare const MCP_TOOLS: ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            symbol: {
                type: string;
                description: string;
            };
            price: {
                type: string;
            };
            pivots: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        price: {
                            type: string;
                        };
                        time: {
                            type: string;
                        };
                        type: {
                            type: string;
                            enum: string[];
                        };
                    };
                    required: string[];
                };
            };
            timeframe: {
                type: string;
                description: string;
            };
            trend: {
                type: string;
                enum: string[];
            };
            anchor?: undefined;
            swings?: undefined;
            minRR?: undefined;
            question?: undefined;
            command?: undefined;
            args?: undefined;
            direction?: undefined;
            sl?: undefined;
            tp?: undefined;
            high?: undefined;
            low?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            symbol: {
                type: string;
                description?: undefined;
            };
            price: {
                type: string;
            };
            anchor: {
                type: string;
                description: string;
            };
            pivots?: undefined;
            timeframe?: undefined;
            trend?: undefined;
            swings?: undefined;
            minRR?: undefined;
            question?: undefined;
            command?: undefined;
            args?: undefined;
            direction?: undefined;
            sl?: undefined;
            tp?: undefined;
            high?: undefined;
            low?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            price: {
                type: string;
            };
            swings: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        price: {
                            type: string;
                        };
                        type: {
                            type: string;
                            enum: string[];
                        };
                    };
                    required: string[];
                };
            };
            symbol?: undefined;
            pivots?: undefined;
            timeframe?: undefined;
            trend?: undefined;
            anchor?: undefined;
            minRR?: undefined;
            question?: undefined;
            command?: undefined;
            args?: undefined;
            direction?: undefined;
            sl?: undefined;
            tp?: undefined;
            high?: undefined;
            low?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            symbol: {
                type: string;
                description?: undefined;
            };
            price: {
                type: string;
            };
            pivots: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        price: {
                            type: string;
                        };
                        time: {
                            type: string;
                        };
                        type: {
                            type: string;
                            enum: string[];
                        };
                    };
                    required: string[];
                };
            };
            timeframe: {
                type: string;
                description?: undefined;
            };
            trend: {
                type: string;
                enum: string[];
            };
            minRR: {
                type: string;
                description: string;
            };
            anchor?: undefined;
            swings?: undefined;
            question?: undefined;
            command?: undefined;
            args?: undefined;
            direction?: undefined;
            sl?: undefined;
            tp?: undefined;
            high?: undefined;
            low?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            question: {
                type: string;
            };
            symbol?: undefined;
            price?: undefined;
            pivots?: undefined;
            timeframe?: undefined;
            trend?: undefined;
            anchor?: undefined;
            swings?: undefined;
            minRR?: undefined;
            command?: undefined;
            args?: undefined;
            direction?: undefined;
            sl?: undefined;
            tp?: undefined;
            high?: undefined;
            low?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            symbol: {
                type: string;
                description?: undefined;
            };
            price?: undefined;
            pivots?: undefined;
            timeframe?: undefined;
            trend?: undefined;
            anchor?: undefined;
            swings?: undefined;
            minRR?: undefined;
            question?: undefined;
            command?: undefined;
            args?: undefined;
            direction?: undefined;
            sl?: undefined;
            tp?: undefined;
            high?: undefined;
            low?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            command: {
                type: string;
                description: string;
            };
            args: {
                type: string;
                items: {
                    type: string;
                };
            };
            symbol?: undefined;
            price?: undefined;
            pivots?: undefined;
            timeframe?: undefined;
            trend?: undefined;
            anchor?: undefined;
            swings?: undefined;
            minRR?: undefined;
            question?: undefined;
            direction?: undefined;
            sl?: undefined;
            tp?: undefined;
            high?: undefined;
            low?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            direction: {
                type: string;
                enum: string[];
            };
            price: {
                type: string;
            };
            sl: {
                type: string;
            };
            tp: {
                type: string;
            };
            symbol: {
                type: string;
                description?: undefined;
            };
            pivots?: undefined;
            timeframe?: undefined;
            trend?: undefined;
            anchor?: undefined;
            swings?: undefined;
            minRR?: undefined;
            question?: undefined;
            command?: undefined;
            args?: undefined;
            high?: undefined;
            low?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            symbol?: undefined;
            price?: undefined;
            pivots?: undefined;
            timeframe?: undefined;
            trend?: undefined;
            anchor?: undefined;
            swings?: undefined;
            minRR?: undefined;
            question?: undefined;
            command?: undefined;
            args?: undefined;
            direction?: undefined;
            sl?: undefined;
            tp?: undefined;
            high?: undefined;
            low?: undefined;
        };
        required?: undefined;
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            high: {
                type: string;
            };
            low: {
                type: string;
            };
            symbol?: undefined;
            price?: undefined;
            pivots?: undefined;
            timeframe?: undefined;
            trend?: undefined;
            anchor?: undefined;
            swings?: undefined;
            minRR?: undefined;
            question?: undefined;
            command?: undefined;
            args?: undefined;
            direction?: undefined;
            sl?: undefined;
            tp?: undefined;
        };
        required: string[];
    };
})[];
export declare function handleMcpRequest(request: {
    method: string;
    id: string;
    params?: Record<string, any>;
}): Promise<any>;
export declare function runMcpServer(): void;
export declare function createApp(): Hono;
export declare class PiAgentService {
    readonly app: Hono;
    private server;
    private port;
    constructor(port?: number);
    start(): Promise<void>;
    private handleRequest;
    stop(): Promise<void>;
}
export declare function main(): void;
//# sourceMappingURL=server.d.ts.map