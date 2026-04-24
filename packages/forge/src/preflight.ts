/**
 * Preflight — Checks real tool availability per domain before production begins.
 *
 * Required tools must be present. Optional tools generate warnings if missing.
 * Never crashes — always returns a result even if checks fail.
 */
import { execSync } from "node:child_process";
import type { ProductDomain, PreflightResult } from "./types.js";
import { DomainRegistry } from "./domain-registry.js";

function isWindows(): boolean {
  return process.platform === "win32";
}

/**
 * Check if a command-line tool is available on the system.
 */
async function checkToolExists(tool: string): Promise<boolean> {
  const cmd = isWindows() ? `where ${tool} 2>nul` : `which ${tool} 2>/dev/null`;
  try {
    execSync(cmd, { stdio: "pipe", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check preflight requirements for a single domain.
 *
 * Loads the domain config, checks required and optional tools,
 * and returns a PreflightResult.
 */
export async function checkDomain(domain: ProductDomain): Promise<PreflightResult> {
  const missing: string[] = [];
  const warnings: string[] = [];

  let requiredTools: string[] = [];
  let optionalTools: string[] = [];

  // Load domain config to get tool requirements
  try {
    const registry = new DomainRegistry();
    const template = registry.get(domain);
    if (template) {
      requiredTools = template.requiredTools ?? [];
      optionalTools = template.optionalTools ?? [];
    }
  } catch {
    // Domain config not loadable — just check common tools
  }

  // Domain-specific tool mappings
  const domainToolMap: Record<string, { required: string[]; optional: string[] }> = {
    "vst-audio": {
      required: ["git"],
      optional: ["cmake", "juce"],
    },
    "web-app": {
      required: ["git", "node"],
      optional: ["npm", "pnpm"],
    },
    "windows-desktop": {
      required: ["git"],
      optional: ["dotnet", "msbuild"],
    },
    "unreal-engine": {
      required: ["git"],
      optional: ["UnrealEditor", "UnrealEditor-Cmd"],
    },
    "android": {
      required: ["git"],
      optional: ["gradle", "adb"],
    },
    "ios": {
      required: ["git"],
      optional: ["xcodebuild", "swift"],
    },
    "cad-physical": {
      required: ["git"],
      optional: ["openscad"],
    },
    "html-static": {
      required: ["git"],
      optional: ["node"],
    },
    "cross-platform": {
      required: ["git"],
      optional: ["node", "npm"],
    },
  };

  // Merge domain config with hardcoded mappings
  const mapping = domainToolMap[domain] ?? { required: ["git"], optional: [] };
  requiredTools = [...new Set([...requiredTools, ...mapping.required])];
  optionalTools = [...new Set([...optionalTools, ...mapping.optional])];

  // Check required tools
  for (const tool of requiredTools) {
    const exists = await checkToolExists(tool);
    if (!exists) {
      missing.push(tool);
    }
  }

  // Check optional tools
  for (const tool of optionalTools) {
    const exists = await checkToolExists(tool);
    if (!exists) {
      warnings.push(`Optional tool "${tool}" not found — some features may be limited`);
    }
  }

  return {
    ready: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Check preflight for multiple domains.
 * Merges results across all domains.
 */
export async function checkMultipleDomains(domains: ProductDomain[]): Promise<PreflightResult> {
  const allMissing: string[] = [];
  const allWarnings: string[] = [];

  for (const domain of domains) {
    const result = await checkDomain(domain);
    allMissing.push(...result.missing);
    allWarnings.push(...result.warnings);
  }

  // Deduplicate
  const uniqueMissing = [...new Set(allMissing)];
  const uniqueWarnings = [...new Set(allWarnings)];

  return {
    ready: uniqueMissing.length === 0,
    missing: uniqueMissing,
    warnings: uniqueWarnings,
  };
}