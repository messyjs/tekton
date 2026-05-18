/**
 * Eval Runner — lm-evaluation-harness wrapper for model evaluation.
 */
import { execSync } from "node:child_process";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
export const DEFAULT_EVAL_CONFIG = {
    model: "",
    tasks: ["mmlu", "hellaswag", "gsm8k"],
    numShots: 5,
    batchSize: 8,
    maxSeqLength: 2048,
    device: "auto",
    outputDir: "./eval-results",
};
export class EvalRunner {
    baseDir;
    results = new Map();
    constructor(baseDir = "./eval-results") {
        this.baseDir = baseDir;
        if (!existsSync(baseDir)) {
            mkdirSync(baseDir, { recursive: true });
        }
    }
    /** Check if lm-eval is available */
    isAvailable() {
        try {
            execSync("python3 -c \"import lm_eval\"", { encoding: "utf-8", timeout: 5000 });
            return true;
        }
        catch {
            try {
                execSync("lm-eval --version", { encoding: "utf-8", timeout: 5000 });
                return true;
            }
            catch {
                return false;
            }
        }
    }
    /** Run evaluation on a model */
    async run(config) {
        const resultId = `${config.model}-${config.tasks.join(",")}-${Date.now()}`;
        // Generate evaluation script
        const script = this.generateEvalScript(config);
        const scriptPath = join(config.outputDir, "eval_run.py");
        writeFileSync(scriptPath, script);
        // Try to run the evaluation
        let scores = {};
        let overall = 0;
        try {
            const output = execSync(`python3 ${scriptPath}`, { encoding: "utf-8", timeout: 600000, maxBuffer: 10 * 1024 * 1024 });
            const parsed = this.parseEvalOutput(output);
            scores = parsed.scores;
            overall = parsed.overall;
        }
        catch (err) {
            // lm-eval not available — return placeholder
            scores = config.tasks.reduce((acc, task) => {
                acc[task] = 0;
                return acc;
            }, {});
            overall = 0;
        }
        const result = {
            benchmark: config.tasks.join(","),
            scores,
            overall,
            timestamp: Date.now(),
        };
        this.results.set(resultId, result);
        return result;
    }
    /** Generate the evaluation command (doesn't execute) */
    generateCommand(config) {
        const tasks = config.tasks.join(",");
        const modelArgs = `pretrained=${config.model}`;
        return `lm_eval --model hf --model_args "${modelArgs}" --tasks ${tasks} --num_fewshot ${config.numShots} --batch_size ${config.batchSize} --device ${config.device} --output_path ${config.outputDir}`;
    }
    /** Get all stored results */
    getResults() {
        return Array.from(this.results.values());
    }
    /** Get a stored result by model name */
    getResult(model) {
        for (const [key, value] of this.results.entries()) {
            if (key.includes(model))
                return value;
        }
        return undefined;
    }
    /** Compare two evaluation results */
    compare(before, after) {
        const comparisons = [];
        for (const task of Object.keys(before.scores)) {
            const beforeScore = before.scores[task] ?? 0;
            const afterScore = after.scores[task] ?? 0;
            comparisons.push({ task, delta: afterScore - beforeScore });
        }
        return comparisons;
    }
    // ── Private ──────────────────────────────────────────────────────────
    generateEvalScript(config) {
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
    parseEvalOutput(output) {
        try {
            // Try to parse JSON output from the script
            for (const line of output.split("\n").reverse()) {
                if (line.trim().startsWith("{")) {
                    const parsed = JSON.parse(line.trim());
                    return { scores: parsed.scores ?? {}, overall: parsed.overall ?? 0 };
                }
            }
        }
        catch { }
        // Try to parse lm_eval native output
        const scores = {};
        let overall = 0;
        let count = 0;
        // Parse "Task | Metric | Value" format
        const lines = output.split("\n");
        for (const line of lines) {
            const match = line.match(/(\w+)\s*\|.*?[\d.]+%/);
            if (match) {
                const task = match[1].toLowerCase();
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
//# sourceMappingURL=eval-runner.js.map