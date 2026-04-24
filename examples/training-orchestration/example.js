// Training Orchestration — QLoRA fine-tune workflow
import { Orchestrator } from "@tekton/ml-ops";
import { join } from "node:path";
import { tmpdir } from "node:os";
async function main() {
    console.log("⚡ Tekton Training Orchestration Example\n");
    // Initialize orchestrator
    const workDir = join(tmpdir(), "tekton-training-example");
    const orch = new Orchestrator(workDir);
    // Detect environment
    const env = await orch.initialize();
    console.log("Environment:");
    console.log(`  Platform: ${env.platform}`);
    console.log(`  Python: ${env.pythonAvailable ? env.pythonVersion : "not found"}`);
    console.log(`  GPUs: ${env.gpus.length}`);
    if (env.gpus.length > 0) {
        console.log(`  GPU: ${env.gpus[0].name} (${env.gpus[0].vramTotalMB} MB)`);
    }
    console.log();
    // Create a training job from natural language
    const job = orch.createJobFromPrompt("fine-tune llama-3-8b on alpaca dataset with qlora for 3 epochs");
    console.log("Created training job:");
    console.log(`  ID: ${job.id}`);
    console.log(`  Method: ${job.method}`);
    console.log(`  Model: ${job.config.baseModel}`);
    console.log(`  Dataset: ${job.config.dataset}`);
    console.log(`  Epochs: ${job.config.epochs}`);
    console.log(`  Precision: ${job.config.precision}`);
    console.log(`  LoRA Rank: ${job.config.loraRank}`);
    console.log();
    // Start the job (generates Python script)
    const started = await orch.startJob(job.id);
    console.log(`Job started: ${started.status}`);
    console.log(`Script: ${started.logPath}`);
    console.log();
    // Simulate progress
    orch.updateJobProgress(job.id, 100, 2.5);
    orch.updateJobProgress(job.id, 500, 1.8);
    orch.updateJobProgress(job.id, 1000, 1.2);
    // Check metrics
    const summary = orch.getMetrics().getTrainingSummary(job.id);
    console.log("Training summary:");
    console.log(`  Total steps: ${summary.totalSteps}`);
    console.log(`  Current loss: ${summary.currentLoss.toFixed(4)}`);
    console.log(`  Best loss: ${summary.bestLoss.toFixed(4)}`);
    console.log(`  Loss reduction: ${summary.lossReduction.toFixed(4)}`);
    console.log();
    // List checkpoints
    const checkpoints = orch.getCheckpoints().listCheckpoints(job.id);
    console.log(`Checkpoints: ${checkpoints.length}`);
    for (const cp of checkpoints) {
        console.log(`  ${cp.id}: step=${cp.step}, loss=${cp.trainLoss.toFixed(4)}${cp.isBest ? " (best)" : ""}`);
    }
    // Clean up
    orch.close();
}
main().catch(console.error);
//# sourceMappingURL=example.js.map