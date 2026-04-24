import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { Value } from "@sinclair/typebox/value";
import { CONFIG_SCHEMA } from "./schema.js";
import { DEFAULT_CONFIG } from "./defaults.js";

export type TektonConfig = typeof DEFAULT_CONFIG;

function expandHome(filePath: string): string {
  if (filePath.startsWith("~")) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      typeof target[key] === "object" &&
      target[key] !== null &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>,
      );
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function parseYamlValue(rawVal: string): unknown {
  if (rawVal === "" || rawVal === "null") return null;
  if (rawVal === "true") return true;
  if (rawVal === "false") return false;
  if (/^-?\d+$/.test(rawVal)) return parseInt(rawVal, 10);
  if (/^-?\d+\.\d+$/.test(rawVal)) return parseFloat(rawVal);
  return rawVal.replace(/^["']|["']$/g, "");
}

function setNested(result: Record<string, unknown>, dottedKey: string, value: unknown): void {
  const parts = dottedKey.split(".");
  let current = result;
  for (let i = 0; i < parts.length - 1; i++) {
    if (current[parts[i]] === undefined || typeof current[parts[i]] !== "object" || current[parts[i]] === null) {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

function readYamlFile(filePath: string): Record<string, unknown> | null {
  const expanded = expandHome(filePath);
  if (!fs.existsSync(expanded)) return null;

  const content = fs.readFileSync(expanded, "utf-8");
  const result: Record<string, unknown> = {};
  const lines = content.split("\n");

  // Track the current parent key for indented blocks
  let currentParent = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const rawVal = trimmed.slice(colonIdx + 1).trim();

    // Detect indentation level — indented lines are children of currentParent
    const indent = line.length - line.trimStart().length;
    if (indent === 0) currentParent = "";

    const dottedKey = currentParent ? `${currentParent}.${key}` : key;

    if (rawVal === "") {
      // Block header (e.g. "identity:") — set parent for subsequent indented lines
      setNested(result, dottedKey, {});
      currentParent = dottedKey;
    } else {
      // Leaf value
      setNested(result, dottedKey, parseYamlValue(rawVal));
    }
  }

  return result;
}

export function loadConfig(projectPath?: string): TektonConfig {
  // Start with defaults
  let config: Record<string, unknown> = { ...DEFAULT_CONFIG } as Record<string, unknown>;

  // Global config: ~/.tekton/config.yaml
  const globalConfig = readYamlFile("~/.tekton/config.yaml");
  if (globalConfig) {
    config = deepMerge(config, globalConfig);
  }

  // Project config: .tekton/config.yaml
  if (projectPath) {
    const projectConfig = readYamlFile(path.join(projectPath, ".tekton/config.yaml"));
    if (projectConfig) {
      config = deepMerge(config, projectConfig);
    }
  }

  // Validate against schema (use defaults for missing fields)
  const withDefaults = Value.Default(CONFIG_SCHEMA, config);

  if (!Value.Check(CONFIG_SCHEMA, withDefaults)) {
    const errors = [...Value.Errors(CONFIG_SCHEMA, withDefaults)];
    if (errors.length > 0) {
      console.warn("Config validation warnings:", errors.map(e => `${e.path}: ${e.message}`).join("; "));
    }
  }

  return withDefaults as TektonConfig;
}