/**
 * WhatsApp Adapter — Stub. Uses whatsapp-web.js when fully implemented.
 */
import { BaseAdapter } from "../base-adapter.js";
export class WhatsAppAdapter extends BaseAdapter {
    name = "whatsapp";
    async start() {
        // TODO: Initialize whatsapp-web.js client
        this.markConnected();
    }
    async stop() {
        this.markDisconnected();
    }
    async send(target, message, options) {
        // TODO: Implement WhatsApp send
        this.trackOutbound();
    }
}
//# sourceMappingURL=whatsapp.js.map