import { BaseAdapter } from "../base-adapter.js";
import type { SendOptions } from "../types.js";
export interface ApiServerConfig {
    port?: number;
    authToken?: string;
}
export declare class ApiServerAdapter extends BaseAdapter {
    readonly name: "api-server";
    private port;
    private authToken;
    private server;
    constructor(config?: ApiServerConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    send(target: string, message: string, options?: SendOptions): Promise<void>;
    private handleRequest;
    private readBody;
    private jsonResponse;
    getPort(): number;
}
//# sourceMappingURL=api-server.d.ts.map