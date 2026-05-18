/**
 * SMS Adapter — Stub. Uses Twilio when fully implemented.
 */
import { BaseAdapter } from "../base-adapter.js";
import type { SendOptions } from "../types.js";
export declare class SMSAdapter extends BaseAdapter {
    readonly name: "sms";
    start(): Promise<void>;
    stop(): Promise<void>;
    send(target: string, message: string, options?: SendOptions): Promise<void>;
}
//# sourceMappingURL=sms.d.ts.map