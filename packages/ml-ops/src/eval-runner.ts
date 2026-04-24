/**
 * Eval Runner — lm-evaluation-harness wrapper for model evaluation.
 */
import { execSync } from "node:child_process";
import { mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { EvalResult } from "./types.js";

export interface EvalConfig {
  /** Model path or HuggingFace ID */
  model: string;
  /** Benchmark tasks (e.g. ["mmlu", "hellaswag", "gsm8k"]) */
  tasks: string[];
  /** Number of shots for few-shot evaluation */
  numShots: number;
  /** Batch size for evaluation */
  batchSize: number;
  /** Maximum sequence length */
  maxSeqLength: number;
  /** Device (auto, cuda, cpu) */
  device: string;
  /** Output directory */
  outputDir: string;
  /** Limits: max number of samples per task */
  limit?: number;
}

export const DEFAULT_EVAL_CONFIG: EvalConfig = {
  model: "",
  tasks: ["mmlu", "hellaswag", "gsm8k"],
  numShots: 5,
  batchSize: 8,
  maxSeqLength: 2048,
  device: "auto",
  outputDir: "./eval-results",
};

export class EvalRunner {
  private results: Map<string, EvalResult> = new Map();

  constructor(private readonly baseDir: string = "./eval-results") {
    if (!existsSync(baseDir)) {
      mkdirSync(baseDir, { recursive: true });
    }
  }

  /** Check if lm-eval is available */
  isAvailable(): boolean {
    try {
      execSync("python3 -c \"import lm_eval\"", { encoding: "utf-8", timeout: 5000 });
      return true;
    } catch {
      try {
        execSync("lm-eval --version", { encoding: "utf-8", timeout: 5000 });
        return true;
      } catch {
        return false;
      }
    }
  }

  /** Run evaluation on a model */
  async run(config: EvalConfig): Promise<EvalResult> {
    const resultId = `${config.model}-${config.tasks.join(",")}-${Date.now()}`;

    // Generate evaluation script
    const script = this.generateEvalScript(config);
    const scriptPath = join(config.outputDir, "eval_run.py");
    writeFileSync(scriptPath, script);

    // Try to run the evaluation
    let scores: Record<string, number> = {};
    let overall = 0;

    try {
      const output = execSync(
        `python3 ${scriptPath}`,
        { encoding: "utf-8", timeout: 600000, maxBuffer: 10 * 1024 * 1024 }
      );
      const parsed = this.parseEvalOutput(output);
      scores = parsed.scores;
      overall = parsed.overall;
    } catch (err: any) {
      // lm-eval not available — return placeholder
      scores = config.tasks.reduce((acc, task) => {
        acc[task] = 0;
        return acc;
      }, {} as Record<string, number>);
      overall = 0;
    }

    const result: EvalResult = {
      benchmark: config.tasks.join(","),
      scores,
      overall,
      timestamp: Date.now(),
    };

    this.results.set(resultId, result);
    return result;
  }

  /** Generate the evaluation command (doesn't execute) */
  generateCommand(config: EvalConfig): string {
    const tasks = config.tasks.join(",");
    const modelArgs = `pretrained=${config.model}`;
    return `lm_eval --model hf --model_args "${modelArgs}" --tasks ${tasks} --num_fewshot ${config.numShots} --batch_size ${config.batchSize} --device ${config.device} --output_path ${config.outputDir}`;
  }

  /** Get all stored results */
  getResults(): EvalResult[] {
    return Array.from(this.results.values());
  }

  /** Get a stored result by model name */
  getResult(model: string): EvalResult | undefined {
    for (const [key, value] of this.results.entries()) {
      if (key.includes(model)) return value;
    }
    return undefined;
  }

  /** Compare two evaluation results */
  compare(before: EvalResult, after: EvalResult): { task: string; delta: number }[] {
    const comparisons: { task: string; delta: number }[] = [];
    for (const task of Object.keys(before.scores)) {
      const beforeScore = before.scores[task] ?? 0;
      const afterScore = after.scores[task] ?? 0;
      comparisons.push({ task, delta: afterScore - beforeScore });
    }
    return comparisons;
  }

  // ── Private ──────────────────────────────────────────────────────────

  private generateEvalScript(config: EvalConfig): string {
    return `#!/usr/bin/env python3
"""Model evaluation using lm-evaluation-harness."""
import json
import os

def main():
    try:
        import lm_eval
        from lm_eval import evaluator
        
        tasks = ${JSON.stringify(config.tasks)}
        model_args = "pretrained=${config.model}"
        
        results = evaluator.simple_evaluate(
            model="hf",
            model_args=model_args,
            tasks=tasks,
            num_fewshot=${config.numShots},
            batch_size=${config.batchSize},
            max_seq_length=${config.maxSeqLength},
            device="${config.device}",
        )
        
        # Extract scores
        scores = {}
        for task_name, task_results in results.get("results", {}).items():
            if isinstance(task_results, dict):
                for metric_name, metric_value in task_results.items():
                    if "acc" in metric_name.lower() or "score" in metric_name.lower():
                        scores[task_name] = metric_value
                        break
        
        overall = sum(scores.values()) / len(scores) if scores else 0.0
        
        output = {
            "scores": scores,
            "overall": overall,
        }
        
        with open(os.path.join("${config.outputDir.replace(/\\/g, "/")}", "eval_results.json"), "w") as f:
            json.dump(output, f, indent=2)
        
        print(json.dumps(output))
        
    except ImportError:
        print(json.dumps({"error": "lm-eval not installed", "scores": {}, "overall": 0.0}))

if __name__ == "__main__":
    main()
`;
  }

  private parseEvalOutput(output: string): { scores: Record<string, number>; overall: number } {
    try {
      // Try to parse JSON output from the script
      for (const line of output.split("\n").reverse()) {
        if (line.trim().startsWith("{")) {
          const parsed = JSON.parse(line.trim());
          return { scores: parsed.scores ?? {}, overall: parsed.overall ?? 0 };
        }
      }
    } catch {}

    // Try to parse lm_eval native output
    const scores: Record<string, number> = {};
    let overall = 0;
    let count = 0;

    // Parse "Task | Metric | Value" format
    const lines = output.split("\n");
    for (const line of lines) {
      const match = line.match(/(\w+)\s*\|.*?[\d.]+%/);
      if (match) {
        const task = match[1]!.toLowerCase();
        const valueMatch = line.match(/(\d+\.\d+)%/);
        if (valueMatch) {
          scores[task] = Number(valueMatch[1]) / 100;
          count++;
        }
      }
    }

    if (count > 0) {
      overall = Object.values(scores).reduce((a, b) => a + b, 0) / count;
    }

    return { scores, overall };
  }
}