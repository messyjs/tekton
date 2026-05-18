import { SCPMessage } from "./types.js";
import { type CompressionTier } from "../compression/caveman.js";
export interface EncodeOptions {
    compressFields?: boolean;
    compressionTier?: CompressionTier;
}
export declare function encodeSCP(msg: Static<typeof SCPMessage>, options?: EncodeOptions): string;
export declare function decodeSCP(json: string): Static<typeof SCPMessage>;
export type { SCPMessage };
import type { Static } from "@sinclair/typebox";
//# sourceMappingURL=codec.d.ts.map