import { Value } from "@sinclair/typebox/value";
import { SCPMessage } from "./types.js";
import { compress, decompress, type CompressionTier } from "../compression/caveman.js";

export interface EncodeOptions {
  compressFields?: boolean;
  compressionTier?: CompressionTier;
}

export function encodeSCP(msg: Static<typeof SCPMessage>, options?: EncodeOptions): string {
  const shouldCompress = options?.compressFields ?? false;
  const tier = options?.compressionTier ?? "full";

  if (shouldCompress) {
    const encoded = { ...msg };
    if ("task" in encoded && typeof encoded.task === "string") {
      encoded.task = compress(encoded.task, tier);
    }
    if ("result" in encoded && typeof encoded.result === "string") {
      encoded.result = compress(encoded.result, tier);
    }
    if ("context" in encoded && typeof encoded.context === "string") {
      encoded.context = compress(encoded.context, tier);
    }
    return JSON.stringify(encoded);
  }

  return JSON.stringify(msg);
}

export function decodeSCP(json: string): Static<typeof SCPMessage> {
  const parsed: unknown = JSON.parse(json);
  if (!Value.Check(SCPMessage, parsed)) {
    throw new Error("Invalid SCP message: failed schema validation");
  }
  return parsed as Static<typeof SCPMessage>;
}

export type { SCPMessage };
import type { Static } from "@sinclair/typebox";