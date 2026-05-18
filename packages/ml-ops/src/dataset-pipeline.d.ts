import type { DatasetConfig, DatasetInfo, DatasetFormat } from "./types.js";
export declare class DatasetPipeline {
    private readonly cacheDir;
    private datasets;
    constructor(cacheDir?: string);
    /** Prepare a dataset from config */
    prepareDataset(config: DatasetConfig): Promise<DatasetInfo>;
    /** Get cached dataset info */
    getDatasetInfo(name: string): DatasetInfo | undefined;
    /** List all known datasets */
    listDatasets(): DatasetInfo[];
    /** Generate a training/validation split */
    splitDataset(name: string, trainRatio?: number, seed?: number, outputDir?: string): Promise<{
        trainPath: string;
        valPath: string;
    }>;
    /** Tokenize a dataset for the given tokenizer */
    tokenizeDataset(name: string, tokenizer: string, maxSeqLength?: number): Promise<{
        numTokens: number;
        numShards: number;
    }>;
    /** Shard a large dataset into manageable pieces */
    shardDataset(name: string, shardsPerFile?: number): Promise<number>;
    /** Convert dataset between formats */
    convertFormat(name: string, targetFormat: DatasetFormat, outputDir?: string): Promise<string>;
    private downloadHuggingFace;
    private analyzeDataset;
    private generateSplitScript;
    private generateTokenizeScript;
    private generateConvertScript;
}
//# sourceMappingURL=dataset-pipeline.d.ts.map