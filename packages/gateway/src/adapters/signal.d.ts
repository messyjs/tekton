/**
 * Signal Adapter — Stub. Uses signal-cli when fully implemented.
 */
import { BaseAdapter } from "../base-adapter.js";
import type { SendOptions } from "../types.js";
export declare class SignalAdapter extends BaseAdapter {
    readonly name: "signal";
    start(): Promise<void>;
    stop(): Promise<void>;
    send(target: string, message: string, options?: SendOptions): Promise<void>;
}
//# sourceMappingURL=signal.d.ts.map