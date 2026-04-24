/**
 * OpenSCAD Validator — Validates OpenSCAD models.
 * Gracefully skips if OpenSCAD is not installed.
 */
import { execSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import type { QAResult } from "../verdict.js";

async function toolExists(tool: string): Promise<boolean> {
  const cmd = process.platform === "win32" ? `where ${tool}` : `which ${tool}`;
  try {
    execSync(cmd, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

export async function validateOpenSCAD(projectDir: string, mainFile?: string): Promise<QAResult> {
  if (!(await toolExists("openscad"))) {
    return {
      tester: "openscad-validator",
      passed: true,
      skipped: true,
      artifact: mainFile ?? "model.scad",
      category: "domain-validation",
      details: "OpenSCAD not found — skipped",
    };
  }

  const inputFile = mainFile ?? "main.scad";
  const inputPath = join(projectDir, inputFile);
  const outputPath = join(projectDir, "output.stl");

  if (!existsSync(inputPath)) {
    return {
      tester: "openscad-validator",
      passed: true,
      skipped: true,
      artifact: inputFile,
      category: "domain-validation",
      details: `Input file ${inputFile} not found — skipped`,
    };
  }

  try {
    execSync(`openscad -o "${outputPath}" "${inputPath}"`, {
      cwd: projectDir,
      timeout: 120000,
      encoding: "utf-8",
    });

    // Check output file exists and has content
    if (existsSync(outputPath)) {
      const stats = statSync(outputPath);
      const sizeKB = stats.size / 1024;

      if (stats.size > 0) {
        return {
          tester: "openscad-validator",
          passed: true,
          artifact: inputFile,
          category: "domain-validation",
          details: `OpenSCAD model rendered successfully (${sizeKB.toFixed(1)} KB)`,
        };
      } else {
        return {
          tester: "openscad-validator",
          passed: false,
          artifact: inputFile,
          category: "domain-validation",
          details: "OpenSCAD output file is empty (0 bytes) — model may be degenerate",
          severity: "major",
        };
      }
    } else {
      return {
        tester: "openscad-validator",
        passed: false,
        artifact: inputFile,
        category: "domain-validation",
        details: "OpenSCAD output file not created",
        severity: "major",
      };
    }
  } catch (e: any) {
    return {
      tester: "openscad-validator",
      passed: false,
      artifact: inputFile,
      category: "domain-validation",
      details: `OpenSCAD rendering failed: ${(e.stdout ?? e.message ?? "").slice(0, 500)}`,
      severity: "major",
    };
  }
}