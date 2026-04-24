import { Type } from "@sinclair/typebox";
import type { ToolDefinition, ToolResult } from "../../registry.js";

const rlStubMsg = "Configure RL environment credentials (TINKER_API_KEY, WANDB_API_KEY) first. See docs/ML-OPS.md.";

function stubExecute(): Promise<ToolResult> {
  return Promise.resolve({ content: rlStubMsg });
}

export const rlListEnvironments: ToolDefinition = {
  name: "rl_list_environments", toolset: "rl",
  description: "List available RL training environments.",
  parameters: Type.Object({}),
  requiresEnv: ["TINKER_API_KEY"],
  execute: stubExecute,
};
export const rlSelectEnvironment: ToolDefinition = {
  name: "rl_select_environment", toolset: "rl",
  description: "Select an RL environment for training.",
  parameters: Type.Object({ environment_id: Type.String() }),
  requiresEnv: ["TINKER_API_KEY"],
  execute: stubExecute,
};
export const rlGetCurrentConfig: ToolDefinition = {
  name: "rl_get_current_config", toolset: "rl",
  description: "Get current RL configuration.",
  parameters: Type.Object({}),
  requiresEnv: ["TINKER_API_KEY"],
  execute: stubExecute,
};
export const rlEditConfig: ToolDefinition = {
  name: "rl_edit_config", toolset: "rl",
  description: "Edit RL training configuration.",
  parameters: Type.Object({ config: Type.Record(Type.String(), Type.Unknown()) }),
  requiresEnv: ["TINKER_API_KEY"],
  execute: stubExecute,
};
export const rlStartTraining: ToolDefinition = {
  name: "rl_start_training", toolset: "rl",
  description: "Start RL training run.",
  parameters: Type.Object({}),
  requiresEnv: ["TINKER_API_KEY"],
  execute: stubExecute,
};
export const rlStopTraining: ToolDefinition = {
  name: "rl_stop_training", toolset: "rl",
  description: "Stop current RL training run.",
  parameters: Type.Object({}),
  requiresEnv: ["TINKER_API_KEY"],
  execute: stubExecute,
};
export const rlCheckStatus: ToolDefinition = {
  name: "rl_check_status", toolset: "rl",
  description: "Check RL training status.",
  parameters: Type.Object({}),
  requiresEnv: ["TINKER_API_KEY"],
  execute: stubExecute,
};
export const rlListRuns: ToolDefinition = {
  name: "rl_list_runs", toolset: "rl",
  description: "List RL training run history.",
  parameters: Type.Object({}),
  requiresEnv: ["TINKER_API_KEY"],
  execute: stubExecute,
};
export const rlGetResults: ToolDefinition = {
  name: "rl_get_results", toolset: "rl",
  description: "Get results from an RL training run.",
  parameters: Type.Object({ run_id: Type.String() }),
  requiresEnv: ["TINKER_API_KEY"],
  execute: stubExecute,
};
export const rlTestInference: ToolDefinition = {
  name: "rl_test_inference", toolset: "rl",
  description: "Test RL model inference.",
  parameters: Type.Object({ run_id: Type.String() }),
  requiresEnv: ["TINKER_API_KEY"],
  execute: stubExecute,
};