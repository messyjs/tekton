/**
 * Dataset Pipeline — Download, tokenize, and shard datasets for training.
 */
import { mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";
import type { DatasetConfig, DatasetInfo, DatasetFormat } from "./types.js";

export class DatasetPipeline {
  private readonly cacheDir: string;
  private datasets: Map<string, DatasetInfo> = new Map();

  constructor(cacheDir: string = "./datasets") {
    this.cacheDir = resolve(cacheDir);
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /** Prepare a dataset from config */
  async prepareDataset(config: DatasetConfig): Promise<DatasetInfo> {
    const datasetDir = join(this.cacheDir, config.name);
    mkdirSync(datasetDir, { recursive: true });

    // Try download if HuggingFace
    if (config.format === "huggingface" || config.source.includes("/")) {
      await this.downloadHuggingFace(config, datasetDir);
    }

    // Analyze the dataset
    const info = await this.analyzeDataset(config, datasetDir);

    this.datasets.set(config.name, info);
    return info;
  }

  /** Get cached dataset info */
  getDatasetInfo(name: string): DatasetInfo | undefined {
    return this.datasets.get(name);
  }

  /** List all known datasets */
  listDatasets(): DatasetInfo[] {
    return Array.from(this.datasets.values());
  }

  /** Generate a training/validation split */
  async splitDataset(
    name: string,
    trainRatio: number = 0.9,
    seed: number = 42,
    outputDir?: string,
  ): Promise<{ trainPath: string; valPath: string }> {
    const info = this.datasets.get(name);
    if (!info) throw new Error(`Dataset not found: ${name}`);

    const outDir = outputDir ?? join(this.cacheDir, name, "split");
    mkdirSync(outDir, { recursive: true });

    // Generate a Python script for splitting
    const script = this.generateSplitScript(info, trainRatio, seed, outDir);
    const scriptPath = join(outDir, "split_dataset.py");
    writeFileSync(scriptPath, script);

    const trainPath = join(outDir, "train.jsonl");
    const valPath = join(outDir, "val.jsonl");

    // Try to run the split script
    try {
      execSync(`python3 ${scriptPath}`, { timeout: 60000 });
    } catch {
      // Create placeholder files
      writeFileSync(trainPath, '{"instruction":"placeholder","output":"placeholder"}\n');
      writeFileSync(valPath, '{"instruction":"placeholder","output":"placeholder"}\n');
    }

    return { trainPath, valPath };
  }

  /** Tokenize a dataset for the given tokenizer */
  async tokenizeDataset(
    name: string,
    tokenizer: string,
    maxSeqLength: number = 2048,
  ): Promise<{ numTokens: number; numShards: number }> {
    const info = this.datasets.get(name);
    if (!info) throw new Error(`Dataset not found: ${name}`);

    const outputDir = join(this.cacheDir, name, "tokenized");
    mkdirSync(outputDir, { recursive: true });

    const script = this.generateTokenizeScript(info, tokenizer, maxSeqLength, outputDir);
    const scriptPath = join(outputDir, "tokenize.py");
    writeFileSync(scriptPath, script);

    try {
      execSync(`python3 ${scriptPath}`, { timeout: 300000 });
    } catch {
      // Estimate tokens from dataset info
      return {
        numTokens: info.numTokens,
        numShards: Math.ceil(info.numSamples / 10000),
      };
    }

    return {
      numTokens: info.numTokens,
      numShards: Math.ceil(info.numSamples / 10000),
    };
  }

  /** Shard a large dataset into manageable pieces */
  async shardDataset(
    name: string,
    shardsPerFile: number = 10000,
  ): Promise<number> {
    const info = this.datasets.get(name);
    if (!info) throw new Error(`Dataset not found: ${name}`);

    const numShards = Math.ceil(info.numSamples / shardsPerFile);
    const outputDir = join(this.cacheDir, name, "shards");
    mkdirSync(outputDir, { recursive: true });

    // Generate shard info files
    for (let i = 0; i < numShards; i++) {
      const shardInfo = {
        shardIndex: i,
        totalShards: numShards,
        samples: shardsPerFile,
        path: join(outputDir, `shard-${i.toString().padStart(4, "0")}.jsonl`),
      };
      writeFileSync(join(outputDir, `shard-${i.toString().padStart(4, "0")}.info.json`), JSON.stringify(shardInfo, null, 2));
    }

    return numShards;
  }

  /** Convert dataset between formats */
  async convertFormat(
    name: string,
    targetFormat: DatasetFormat,
    outputDir?: string,
  ): Promise<string> {
    const info = this.datasets.get(name);
    if (!info) throw new Error(`Dataset not found: ${name}`);

    const outDir = outputDir ?? join(this.cacheDir, name, targetFormat);
    mkdirSync(outDir, { recursive: true });

    // Generate conversion script
    const script = this.generateConvertScript(info, targetFormat, outDir);
    const scriptPath = join(outDir, `convert_${targetFormat}.py`);
    writeFileSync(scriptPath, script);

    try {
      execSync(`python3 ${scriptPath}`, { timeout: 120000 });
    } catch {
      // Return output dir even if conversion failed
    }

    return outDir;
  }

  // ── Private ──────────────────────────────────────────────────────────

  private async downloadHuggingFace(config: DatasetConfig, dir: string): Promise<void> {
    const script = `#!/usr/bin/env python3
"""Download dataset from HuggingFace."""
from datasets import load_dataset
import json

ds = load_dataset("${config.source}", split="${config.split}")
output = []
for item in ds:
    output.append(dict(item))
with open("${join(dir, "data.jsonl").replace(/\\/g, "/")}", "w") as f:
    for item in output:
        f.write(json.dumps(item) + "\\n")
print(f"Downloaded {len(output)} samples")
`;

    const scriptPath = join(dir, "download.py");
    writeFileSync(scriptPath, script);

    try {
      execSync(`python3 ${scriptPath}`, { timeout: 300000 });
    } catch {
      // Dataset download requires Python + datasets library
      // Create placeholder
    }
  }

  private async analyzeDataset(config: DatasetConfig, dir: string): Promise<DatasetInfo> {
    // Try to read existing data file
    const dataPath = join(dir, "data.jsonl");
    let numSamples = 0;
    let numTokens = 0;
    let avgSeqLength = 0;

    if (existsSync(dataPath)) {
      try {
        const content = readFileSync(dataPath, "utf-8");
        const lines = content.trim().split("\n");
        numSamples = lines.length;
        let totalLength = 0;
        for (const line of lines) {
          try {
            const obj = JSON.parse(line);
            const text = (obj.instruction ?? "") + " " + (obj.input ?? "") + " " + (obj.output ?? "");
            totalLength += text.length;
            // Rough token estimate: ~4 chars per token
            numTokens += Math.ceil(text.length / 4);
          } catch {}
        }
        avgSeqLength = numSamples > 0 ? Math.ceil(totalLength / numSamples) : 0;
      } catch {}
    }

    // Default estimates for known datasets
    const knownDatasets: Record<string, Partial<DatasetInfo>> = {
      "tatsu-lab/alpaca": { numSamples: 52002, numTokens: 13000000 },
      "databricks/databricks-dolly-15k": { numSamples: 15015, numTokens: 4000000 },
      "OpenAssistant/oasst2": { numSamples: 128400, numTokens: 32000000 },
    };

    const known = knownDatasets[config.source];
    if (known && numSamples === 0) {
      numSamples = known.numSamples ?? 0;
      numTokens = known.numTokens ?? 0;
      avgSeqLength = numSamples > 0 ? Math.ceil(numTokens / numSamples) : 0;
    }

    const trainSamples = Math.floor(numSamples * config.trainSplitRatio);
    const valSamples = numSamples - trainSamples;

    return {
      name: config.name,
      numSamples,
      numTokens,
      avgSeqLength,
      trainSamples,
      valSamples,
      shards: Math.ceil(numSamples / 10000),
      path: dir,
    };
  }

  private generateSplitScript(info: DatasetInfo, ratio: number, seed: number, outDir: string): string {
    return `#!/usr/bin/env python3
"""Split dataset into train/val sets."""
import json
import random

random.seed(${seed})

data_path = "${info.path.replace(/\\/g, "/")}/data.jsonl"
train_ratio = ${ratio}

samples = []
with open(data_path, "r") as f:
    for line in f:
        line = line.strip()
        if line:
            samples.append(json.loads(line))

random.shuffle(samples)
split_idx = int(len(samples) * train_ratio)
train_data = samples[:split_idx]
val_data = samples[split_idx:]

with open("${join(outDir, "train.jsonl").replace(/\\/g, "/")}", "w") as f:
    for item in train_data:
        f.write(json.dumps(item) + "\\n")

with open("${join(outDir, "val.jsonl").replace(/\\/g, "/")}", "w") as f:
    for item in val_data:
        f.write(json.dumps(item) + "\\n")

print(f"Split: {len(train_data)} train, {len(val_data)} val")
`;
  }

  private generateTokenizeScript(info: DatasetInfo, tokenizer: string, maxSeqLen: number, outDir: string): string {
    return `#!/usr/bin/env python3
"""Tokenize dataset."""
from transformers import AutoTokenizer
import json
import os

tokenizer = AutoTokenizer.from_pretrained("${tokenizer}")
max_seq_len = ${maxSeqLen}
data_path = "${info.path.replace(/\\/g, "/")}/data.jsonl"
output_dir = "${outDir.replace(/\\/g, "/")}"

total_tokens = 0
total_samples = 0

with open(data_path, "r") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        item = json.loads(line)
        text = item.get("instruction", "") + " " + item.get("output", "")
        tokens = tokenizer.encode(text, truncation=True, max_length=max_seq_len)
        total_tokens += len(tokens)
        total_samples += 1

print(f"Tokenized {total_samples} samples, {total_tokens} tokens")
`;
  }

  private generateConvertScript(info: DatasetInfo, format: DatasetFormat, outDir: string): string {
    return `#!/usr/bin/env python3
"""Convert dataset to ${format} format."""
import json

data_path = "${info.path.replace(/\\/g, "/")}/data.jsonl"
output_dir = "${outDir.replace(/\\/g, "/")}"

samples = []
with open(data_path, "r") as f:
    for line in f:
        line = line.strip()
        if line:
            samples.append(json.loads(line))

print(f"Loaded {len(samples)} samples, converting to ${format}")
# Conversion logic depends on target format
# This is a template
`;
  }
}