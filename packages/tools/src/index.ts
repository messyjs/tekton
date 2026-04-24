export { ToolRegistry, registry } from "./registry.js";
export type { ToolDefinition, ToolContext, ToolResult, ToolSchema } from "./registry.js";
export { isDangerous } from "./approval.js";

// Toolset exports
export { terminalTool, processTool } from "./toolsets/terminal/index.js";
export { readFileTool, writeFileTool, patchTool, searchFilesTool, listDirTool, doclingParseTool, doclingBatchTool, isRichDocument, isRichContentType, RICH_FORMATS, RICH_MIMES } from "./toolsets/file/index.js";
export { doclingParse, doclingChunk, doclingOcr, doclingBatch, isDoclingAvailable, getDoclingHealth, getDoclingFormats, resetHealthCache } from "./toolsets/file/index.js";
export type { ExportFormat, TableMode, DoclingHealthResponse, DoclingParseResponse, DoclingChunkResponse, DoclingOcrResponse } from "./toolsets/file/index.js";
export { webSearchTool, webExtractTool } from "./toolsets/web/index.js";
export {
  browserNavigateTool, browserSnapshotTool, browserClickTool, browserTypeTool,
  browserPressTool, browserScrollTool, browserBackTool, browserConsoleTool,
  browserGetImagesTool, browserVisionTool, browserCdpTool,
} from "./toolsets/browser/index.js";
export { visionAnalyzeTool } from "./toolsets/vision/index.js";
export { imageGenerateTool } from "./toolsets/image_gen/index.js";
export { textToSpeechTool } from "./toolsets/tts/index.js";
export { memoryTool, sessionSearchTool } from "./toolsets/memory/index.js";
export { skillsListTool, skillViewTool, skillManageTool } from "./toolsets/skills/index.js";
export { delegateTaskTool, setGlobalPool, getGlobalPool } from "./toolsets/delegation/index.js";
export { todoTool, clarifyTool, executeCodeTool, mixtureOfAgentsTool } from "./toolsets/orchestration/index.js";
export { sendMessageTool } from "./toolsets/messaging/index.js";
export { cronjobTool } from "./toolsets/cron/index.js";
export { haListEntitiesTool, haGetStateTool, haCallServiceTool, haListServicesTool } from "./toolsets/homeassistant/index.js";
export { mcpDiscoverTool, mcpCallTool, mcpListServersTool } from "./toolsets/mcp/index.js";
export {
  rlListEnvironments, rlSelectEnvironment, rlGetCurrentConfig,
  rlEditConfig, rlStartTraining, rlStopTraining,
  rlCheckStatus, rlListRuns, rlGetResults, rlTestInference,
} from "./toolsets/rl/index.js";

export { TOOLSET_PRESETS } from "./presets.js";

// Registration helper: register all tools with the global registry
import { registry } from "./registry.js";
import { terminalTool, processTool } from "./toolsets/terminal/index.js";
import { readFileTool, writeFileTool, patchTool, searchFilesTool, listDirTool, doclingParseTool, doclingBatchTool } from "./toolsets/file/index.js";
import { webSearchTool, webExtractTool } from "./toolsets/web/index.js";
import {
  browserNavigateTool, browserSnapshotTool, browserClickTool, browserTypeTool,
  browserPressTool, browserScrollTool, browserBackTool, browserConsoleTool,
  browserGetImagesTool, browserVisionTool, browserCdpTool,
} from "./toolsets/browser/index.js";
import { visionAnalyzeTool } from "./toolsets/vision/index.js";
import { imageGenerateTool } from "./toolsets/image_gen/index.js";
import { textToSpeechTool } from "./toolsets/tts/index.js";
import { memoryTool, sessionSearchTool } from "./toolsets/memory/index.js";
import { skillsListTool, skillViewTool, skillManageTool } from "./toolsets/skills/index.js";
import { delegateTaskTool } from "./toolsets/delegation/index.js";
import { todoTool, clarifyTool, executeCodeTool, mixtureOfAgentsTool } from "./toolsets/orchestration/index.js";
import { sendMessageTool } from "./toolsets/messaging/index.js";
import { cronjobTool } from "./toolsets/cron/index.js";
import { haListEntitiesTool, haGetStateTool, haCallServiceTool, haListServicesTool } from "./toolsets/homeassistant/index.js";
import { mcpDiscoverTool, mcpCallTool, mcpListServersTool } from "./toolsets/mcp/index.js";
import {
  rlListEnvironments, rlSelectEnvironment, rlGetCurrentConfig,
  rlEditConfig, rlStartTraining, rlStopTraining,
  rlCheckStatus, rlListRuns, rlGetResults, rlTestInference,
} from "./toolsets/rl/index.js";

export function registerAllTools(): void {
  registry.register(terminalTool);
  registry.register(processTool);
  registry.register(readFileTool);
  registry.register(writeFileTool);
  registry.register(patchTool);
  registry.register(searchFilesTool);
  registry.register(listDirTool);
  registry.register(doclingParseTool);
  registry.register(doclingBatchTool);
  registry.register(webSearchTool);
  registry.register(webExtractTool);
  registry.register(browserNavigateTool);
  registry.register(browserSnapshotTool);
  registry.register(browserClickTool);
  registry.register(browserTypeTool);
  registry.register(browserPressTool);
  registry.register(browserScrollTool);
  registry.register(browserBackTool);
  registry.register(browserConsoleTool);
  registry.register(browserGetImagesTool);
  registry.register(browserVisionTool);
  registry.register(browserCdpTool);
  registry.register(visionAnalyzeTool);
  registry.register(imageGenerateTool);
  registry.register(textToSpeechTool);
  registry.register(memoryTool);
  registry.register(sessionSearchTool);
  registry.register(skillsListTool);
  registry.register(skillViewTool);
  registry.register(skillManageTool);
  registry.register(delegateTaskTool);
  registry.register(todoTool);
  registry.register(clarifyTool);
  registry.register(executeCodeTool);
  registry.register(mixtureOfAgentsTool);
  registry.register(sendMessageTool);
  registry.register(cronjobTool);
  registry.register(haListEntitiesTool);
  registry.register(haGetStateTool);
  registry.register(haCallServiceTool);
  registry.register(haListServicesTool);
  registry.register(mcpDiscoverTool);
  registry.register(mcpCallTool);
  registry.register(mcpListServersTool);
  registry.register(rlListEnvironments);
  registry.register(rlSelectEnvironment);
  registry.register(rlGetCurrentConfig);
  registry.register(rlEditConfig);
  registry.register(rlStartTraining);
  registry.register(rlStopTraining);
  registry.register(rlCheckStatus);
  registry.register(rlListRuns);
  registry.register(rlGetResults);
  registry.register(rlTestInference);
}