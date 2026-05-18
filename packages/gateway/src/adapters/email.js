/**
 * Email Adapter — Stub. Uses nodemailer + IMAP when fully implemented.
 */
import { BaseAdapter } from "../base-adapter.js";
export class EmailAdapter extends BaseAdapter {
    name = "email";
    async start() {
        // TODO: Initialize nodemailer transport + IMAP watcher
        this.markConnected();
    }
    async stop() {
        this.markDisconnected();
    }
    async send(target, message, options) {
        // TODO: Implement email send via nodemailer
        this.trackOutbound();
    }
}
//# sourceMappingURL=email.js.map