/**
 * WhatsApp Adapter — Stub. Uses whatsapp-web.js when fully implemented.
 */
import { BaseAdapter } from "../base-adapter.js";
import type { SendOptions } from "../types.js";
export declare class WhatsAppAdapter extends BaseAdapter {
    readonly name: "whatsapp";
    start(): Promise<void>;
    stop(): Promise<void>;
    send(target: string, message: string, options?: SendOptions): Promise<void>;
}
//# sourceMappingURL=whatsapp.d.ts.map