import { Value } from "@sinclair/typebox/value";
import { SCPMessage } from "./types.js";

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export function validateSCP(msg: unknown): ValidationResult {
  if (typeof msg !== "object" || msg === null) {
    return { valid: false, errors: ["Expected an object"] };
  }

  if (!Value.Check(SCPMessage, msg)) {
    const errors = Value.Errors(SCPMessage, msg);
    const messages: string[] = [];
    for (const err of errors) {
      messages.push(`${err.path}: ${err.message}`);
    }
    return { valid: false, errors: messages };
  }

  return { valid: true };
}