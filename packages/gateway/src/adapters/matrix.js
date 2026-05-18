/**
 * Matrix Adapter — Stub. Uses matrix-js-sdk when fully implemented.
 */
import { BaseAdapter } from "../base-adapter.js";
export class MatrixAdapter extends BaseAdapter {
    name = "matrix";
    async start() {
        // TODO: Initialize matrix-js-sdk client
        this.markConnected();
    }
    async stop() {
        this.markDisconnected();
    }
    async send(target, message, options) {
        // TODO: Implement Matrix send
        this.trackOutbound();
    }
}
//# sourceMappingURL=matrix.js.map