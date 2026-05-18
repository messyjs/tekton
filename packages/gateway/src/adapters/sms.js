/**
 * SMS Adapter — Stub. Uses Twilio when fully implemented.
 */
import { BaseAdapter } from "../base-adapter.js";
export class SMSAdapter extends BaseAdapter {
    name = "sms";
    async start() {
        // TODO: Initialize Twilio client
        this.markConnected();
    }
    async stop() {
        this.markDisconnected();
    }
    async send(target, message, options) {
        // TODO: Implement SMS send via Twilio
        this.trackOutbound();
    }
}
//# sourceMappingURL=sms.js.map