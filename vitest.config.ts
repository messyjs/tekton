import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: [
      "tests/**/*.test.ts",
      "packages/*/tests/**/*.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@tekton/core": path.resolve(__dirname, "packages/core/src/index.ts"),
      "@tekton/core/agents": path.resolve(__dirname, "packages/core/src/agents/index.ts"),
      "@tekton/hermes-bridge": path.resolve(__dirname, "packages/hermes-bridge/src/index.ts"),
      "@tekton/tools": path.resolve(__dirname, "packages/tools/src/index.ts"),
      "@tekton/cli": path.resolve(__dirname, "packages/cli/src/index.ts"),
      "@tekton/gateway": path.resolve(__dirname, "packages/gateway/src/index.ts"),
      "@tekton/voice": path.resolve(__dirname, "packages/voice/src/index.ts"),
      "@tekton/dashboard": path.resolve(__dirname, "packages/dashboard/src/index.ts"),
      "@tekton/ml-ops": path.resolve(__dirname, "packages/ml-ops/src/index.ts"),
      "@tekton/forge": path.resolve(__dirname, "packages/forge/src/index.ts"),
      "@tekton/agentpilot": path.resolve(__dirname, "packages/agentpilot/src/index.ts"),
    },
  },
});