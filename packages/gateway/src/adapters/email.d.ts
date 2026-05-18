/**
 * Email Adapter — Stub. Uses nodemailer + IMAP when fully implemented.
 */
import { BaseAdapter } from "../base-adapter.js";
import type { SendOptions } from "../types.js";
export declare class EmailAdapter extends BaseAdapter {
    readonly name: "email";
    start(): Promise<void>;
    stop(): Promise<void>;
    send(target: string, message: string, options?: SendOptions): Promise<void>;
}
//# sourceMappingURL=email.d.ts.map