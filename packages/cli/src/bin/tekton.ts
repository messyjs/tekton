#!/usr/bin/env node
import path from "node:path";
import os from "node:os";

// Point the Pi SDK to the existing ~/.pi/agent config (auth.json, models.json, settings.json)
// instead of ~/.tekton/ where the SDK wouldn't find provider/model/auth config.
if (!process.env.PI_CODING_AGENT_DIR) {
  process.env.PI_CODING_AGENT_DIR = path.join(os.homedir(), ".pi", "agent");
}

import { run } from "../run.js";

run(process.argv.slice(2)).catch((err) => {
  console.error("Tekton Agent fatal error:", err);
  process.exit(1);
});