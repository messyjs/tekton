/**
 * Metrics Tracker — Parse training logs, track loss/eval metrics over time.
 */
import { mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import type { MetricPoint, TrainingJob } from "./types.js";

export class MetricsTracker {
  private db: Database.Database;
  private metrics: Map<string, MetricPoint[]> = new Map();

  constructor(dbPath: string = ":memory:") {
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jobId TEXT NOT NULL,
        step INTEGER NOT NULL,
        epoch REAL NOT NULL,
        trainLoss REAL,
        evalLoss REAL,
        learningRate REAL,
        gpuUtil REAL,
        gpuVramMB REAL,
        samplesPerSecond REAL,
        timestamp INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_metrics_job ON metrics(jobId);
      CREATE INDEX IF NOT EXISTS idx_metrics_step ON metrics(jobId, step);
    `);
  }

  /** Record a metric point for a job */
  recordMetric(jobId: string, point: Omit<MetricPoint, "timestamp">): void {
    const full: MetricPoint = { ...point, timestamp: Date.now() };

    // In-memory
    const points = this.metrics.get(jobId) ?? [];
    points.push(full);
    this.metrics.set(jobId, points);

    // Persist
    this.db.prepare(`
      INSERT INTO metrics (jobId, step, epoch, trainLoss, evalLoss, learningRate, gpuUtil, gpuVramMB, samplesPerSecond, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      jobId, point.step, point.epoch, point.trainLoss,
      point.evalLoss ?? null, point.learningRate,
      point.gpuUtil, point.gpuVramMB, point.samplesPerSecond, full.timestamp
    );
  }

  /** Parse a training log line and extract metrics */
  parseLogLine(jobId: string, line: string): boolean {
    // HuggingFace Transformers format
    // Example: {"loss": 2.345, "learning_rate": 0.0001, "epoch": 0.5, "step": 100}
    const hftMatch = line.match(/\{[^}]*"loss"[^}]*\}/);
    if (hftMatch) {
      try {
        const obj = JSON.parse(hftMatch[0]);
        this.recordMetric(jobId, {
          step: obj.step ?? 0,
          epoch: obj.epoch ?? 0,
          trainLoss: obj.loss ?? 0,
          evalLoss: obj.eval_loss,
          learningRate: obj.learning_rate ?? 0,
          gpuUtil: 0,
          gpuVramMB: 0,
          samplesPerSecond: 0,
        });
        return true;
      } catch {}
    }

    // Unsloth / TRL format
    // Example: Step 100 | Loss: 2.345 | LR: 0.0001 | Epoch: 0.5
    const unslothMatch = line.match(/Step\s+(\d+)\s*\|\s*Loss:\s*([\d.]+)\s*\|\s*LR:\s*([\d.e-]+)\s*\|\s*Epoch:\s*([\d.]+)/);
    if (unslothMatch) {
      this.recordMetric(jobId, {
        step: Number(unslothMatch[1]),
        epoch: Number(unslothMatch[4]),
        trainLoss: Number(unslothMatch[2]),
        learningRate: Number(unslothMatch[3]),
        gpuUtil: 0,
        gpuVramMB: 0,
        samplesPerSecond: 0,
      });
      return true;
    }

    // Simple format: "step=X loss=Y"
    const simpleMatch = line.match(/step[=:]\s*(\d+).*?loss[=:]\s*([\d.]+)/i);
    if (simpleMatch) {
      this.recordMetric(jobId, {
        step: Number(simpleMatch[1]),
        epoch: 0,
        trainLoss: Number(simpleMatch[2]),
        learningRate: 0,
        gpuUtil: 0,
        gpuVramMB: 0,
        samplesPerSecond: 0,
      });
      return true;
    }

    return false;
  }

  /** Parse a full training log */
  parseLog(jobId: string, logContent: string): number {
    let count = 0;
    for (const line of logContent.split("\n")) {
      if (this.parseLogLine(jobId, line.trim())) {
        count++;
      }
    }
    return count;
  }

  /** Get all metrics for a job */
  getMetrics(jobId: string): MetricPoint[] {
    // Try in-memory first
    const memoryPoints = this.metrics.get(jobId);
    if (memoryPoints && memoryPoints.length > 0) {
      return memoryPoints;
    }

    // Fall back to database
    const rows = this.db.prepare(
      "SELECT * FROM metrics WHERE jobId = ? ORDER BY step ASC"
    ).all(jobId) as any[];

    return rows.map(row => ({
      step: row.step,
      epoch: row.epoch,
      trainLoss: row.trainLoss,
      evalLoss: row.evalLoss ?? undefined,
      learningRate: row.learningRate,
      gpuUtil: row.gpuUtil,
      gpuVramMB: row.gpuVramMB,
      samplesPerSecond: row.samplesPerSecond,
      timestamp: row.timestamp,
    }));
  }

  /** Get the latest metric for a job */
  getLatestMetric(jobId: string): MetricPoint | undefined {
    const metrics = this.getMetrics(jobId);
    return metrics[metrics.length - 1];
  }

  /** Get training summary for a job */
  getTrainingSummary(jobId: string): {
    totalSteps: number;
    currentLoss: number;
    bestLoss: number;
    lossReduction: number;
    averageGpuUtil: number;
    averageSpeed: number;
  } {
    const metrics = this.getMetrics(jobId);
    if (metrics.length === 0) {
      return { totalSteps: 0, currentLoss: 0, bestLoss: 0, lossReduction: 0, averageGpuUtil: 0, averageSpeed: 0 };
    }

    const first = metrics[0]!;
    const last = metrics[metrics.length - 1]!;
    const bestMetric = metrics.reduce((best, m) => m.trainLoss < best.trainLoss ? m : best, metrics[0]!);

    return {
      totalSteps: last.step,
      currentLoss: last.trainLoss,
      bestLoss: bestMetric.trainLoss,
      lossReduction: first.trainLoss - last.trainLoss,
      averageGpuUtil: metrics.reduce((s, m) => s + m.gpuUtil, 0) / metrics.length,
      averageSpeed: metrics.reduce((s, m) => s + m.samplesPerSecond, 0) / metrics.length,
    };
  }

  /** Export metrics to JSON */
  exportMetrics(jobId: string): string {
    const metrics = this.getMetrics(jobId);
    return JSON.stringify({ jobId, metrics, summary: this.getTrainingSummary(jobId) }, null, 2);
  }

  /** Clear metrics for a job */
  clearMetrics(jobId: string): void {
    this.metrics.delete(jobId);
    this.db.prepare("DELETE FROM metrics WHERE jobId = ?").run(jobId);
  }

  /** Close the database */
  close(): void {
    this.db.close();
  }
}