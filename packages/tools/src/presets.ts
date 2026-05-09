export const TOOLSET_PRESETS: Record<string, string[]> = {
  "tekton-cli": ["terminal", "file", "web", "browser", "vision", "skills", "memory", "delegation", "orchestration", "cron", "mcp", "pi"],
  "tekton-telegram": ["web", "file", "vision", "image_gen", "tts", "skills", "memory", "delegation", "pi"],
  "tekton-discord": ["web", "file", "vision", "image_gen", "tts", "skills", "memory", "delegation", "pi"],
  "tekton-minimal": ["terminal", "file", "skills", "memory"],
  "tekton-trading": ["pi", "mcp", "web", "file", "terminal", "memory"],
  "tekton-full": ["*"],
};