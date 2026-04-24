export const TOOLSET_PRESETS: Record<string, string[]> = {
  "tekton-cli": ["terminal", "file", "web", "browser", "vision", "skills", "memory", "delegation", "orchestration", "cron", "mcp"],
  "tekton-telegram": ["web", "file", "vision", "image_gen", "tts", "skills", "memory", "delegation"],
  "tekton-discord": ["web", "file", "vision", "image_gen", "tts", "skills", "memory", "delegation"],
  "tekton-minimal": ["terminal", "file", "skills", "memory"],
  "tekton-full": ["*"],
};