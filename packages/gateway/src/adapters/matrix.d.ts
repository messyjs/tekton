/**
 * Matrix Adapter — Stub. Uses matrix-js-sdk when fully implemented.
 */
import { BaseAdapter } from "../base-adapter.js";
import type { SendOptions } from "../types.js";
export declare class MatrixAdapter extends BaseAdapter {
    readonly name: "matrix";
    start(): Promise<void>;
    stop(): Promise<void>;
    send(target: string, message: string, options?: SendOptions): Promise<void>;
}
//# sourceMappingURL=matrix.d.ts.map