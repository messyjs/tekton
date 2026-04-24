/**
 * Session Budget — Track and enforce message limits per role.
 *
 * Loads session limits from config, tracks usage, and provides
 * warning/exhaustion detection.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ── Config ──────────────────────────────────────────────────────────────────

export interface SessionLimitsConfig {
  defaults: Record<string, number>;
  categories: Record<string, number>;
  roleOverrides: Record<string, number>;
  warnings: {
    firstWarning: number;
    secondWarning: number;
    finalWarning: number;
  };
}

const CONFIGS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "configs");
const LIMITS_FILE = join(CONFIGS_DIR, "session-limits.json");

let _config: SessionLimitsConfig | null = null;

function loadConfig(): SessionLimitsConfig {
  if (_config) return _config;

  if (existsSync(LIMITS_FILE)) {
    const content = readFileSync(LIMITS_FILE, "utf-8");
    _config = JSON.parse(content) as SessionLimitsConfig;
  } else {
    // Fallback defaults
    _config = {
      defaults: { deep: 25, standard: 20, fast: 15, light: 10 },
      categories: { engineer: 20, designer: 20, tester: 15, reviewer: 15, integrator: 15, builder: 20 },
      roleOverrides: {},
      warnings: { firstWarning: 3, secondWarning: 2, finalWarning: 1 },
    };
  }

  return _config;
}

// ── Session Budget ──────────────────────────────────────────────────────────

export interface SessionBudget {
  roleId: string;
  limit: number;
  used: number;
  warnings: {
    firstWarning: number;
    secondWarning: number;
    finalWarning: number;
  };
}

/**
 * Create a session budget for a role.
 */
export function createBudget(roleId: string): SessionBudget {
  const config = loadConfig();
  const limit = getLimit(roleId);

  return {
    roleId,
    limit,
    used: 0,
    warnings: { ...config.warnings },
  };
}

/**
 * Increment a budget's used count. Returns the updated budget.
 */
export function increment(budget: SessionBudget): SessionBudget {
  return { ...budget, used: budget.used + 1 };
}

/**
 * Get remaining messages in a budget.
 */
export function remaining(budget: SessionBudget): number {
  return Math.max(0, budget.limit - budget.used);
}

/**
 * Check if a budget is in the warning zone (remaining <= firstWarning threshold).
 */
export function isWarningZone(budget: SessionBudget): boolean {
  return remaining(budget) <= budget.warnings.firstWarning;
}

/**
 * Check if a budget is exhausted.
 */
export function isExhausted(budget: SessionBudget): boolean {
  return budget.used >= budget.limit;
}

/**
 * Get the session limit for a role.
 * Checks role override first, then category heuristics, then default.
 */
export function getLimit(roleId: string): number {
  const config = loadConfig();

  // Check role override
  if (config.roleOverrides[roleId]) {
    return config.roleOverrides[roleId];
  }

  // Category heuristic based on role name
  const nameLower = roleId.toLowerCase();
  if (nameLower.includes("test") || nameLower.includes("validator")) {
    return config.categories.tester ?? config.defaults.fast;
  }
  if (nameLower.includes("review") || nameLower.includes("audit")) {
    return config.categories.reviewer ?? config.defaults.fast;
  }
  if (nameLower.includes("integrat") || nameLower.includes("deploy") || nameLower.includes("build")) {
    return config.categories.integrator ?? config.defaults.fast;
  }
  if (nameLower.includes("design") || nameLower.includes("ui")) {
    return config.categories.designer ?? config.defaults.standard;
  }
  if (nameLower.includes("engineer") || nameLower.includes("develop") || nameLower.includes("program")) {
    return config.categories.engineer ?? config.defaults.standard;
  }

  // Default
  return config.defaults.standard;
}