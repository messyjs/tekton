/**
 * Signal Adapter — Stub. Uses signal-cli when fully implemented.
 */
import { BaseAdapter } from "../base-adapter.js";
export class SignalAdapter extends BaseAdapter {
    name = "signal";
    async start() {
        // TODO: Initialize signal-cli wrapper
        this.markConnected();
    }
    async stop() {
        this.markDisconnected();
    }
    async send(target, message, options) {
        // TODO: Implement Signal send
        this.trackOutbound();
    }
}
//# sourceMappingURL=signal.js.map