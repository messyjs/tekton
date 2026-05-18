import { Value } from "@sinclair/typebox/value";
import { SCPMessage } from "./types.js";
export function validateSCP(msg) {
    if (typeof msg !== "object" || msg === null) {
        return { valid: false, errors: ["Expected an object"] };
    }
    if (!Value.Check(SCPMessage, msg)) {
        const errors = Value.Errors(SCPMessage, msg);
        const messages = [];
        for (const err of errors) {
            messages.push(`${err.path}: ${err.message}`);
        }
        return { valid: false, errors: messages };
    }
    return { valid: true };
}
//# sourceMappingURL=validate.js.map