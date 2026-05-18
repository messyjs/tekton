import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const DEFAULT_MAX_MEMORY_CHARS = 4000;
const DEFAULT_MAX_USER_MODEL_CHARS = 2000;
const DEFAULT_MAX_CONTEXT_CHARS = 2000;
const DEFAULT_USER_MODEL = {
    preferences: {},
    corrections: [],
    commonTasks: [],
    techStack: [],
    workingHours: "",
};
export class MemoryManager {
    tektonHome;
    memoryPath;
    userModelPath;
    contextDir;
    memoryCache = null;
    userModelCache = null;
    contextCaches = new Map();
    dirty = false;
    constructor(tektonHome) {
        this.tektonHome = tektonHome;
        this.memoryPath = path.join(tektonHome, "MEMORY.md");
        this.userModelPath = path.join(tektonHome, "USER.md");
        this.contextDir = path.join(tektonHome, "contexts");
        if (!fs.existsSync(tektonHome)) {
            fs.mkdirSync(tektonHome, { recursive: true });
        }
    }
    // --- MEMORY.md operations ---
    getMemory() {
        if (this.memoryCache !== null)
            return this.memoryCache;
        if (fs.existsSync(this.memoryPath)) {
            this.memoryCache = fs.readFileSync(this.memoryPath, "utf-8");
        }
        else {
            this.memoryCache = "";
        }
        return this.memoryCache;
    }
    addMemory(entry, category) {
        const current = this.getMemory();
        const timestamp = new Date().toISOString().split("T")[0];
        const section = category ? `## ${category}\n` : "";
        const line = category
            ? `${section}${timestamp}: ${entry}\n`
            : `${timestamp}: ${entry}\n`;
        this.memoryCache = current + (current.endsWith("\n") ? "" : "\n") + line;
        this.dirty = true;
    }
    searchMemory(query) {
        const memory = this.getMemory();
        if (!memory)
            return [];
        const lowerQuery = query.toLowerCase();
        const lines = memory.split("\n");
        return lines.filter(l => l.toLowerCase().includes(lowerQuery) && l.trim().length > 0);
    }
    clearMemory() {
        this.memoryCache = "";
        this.dirty = true;
    }
    // --- USER.md operations ---
    getUserModel() {
        if (this.userModelCache !== null)
            return this.userModelCache;
        if (fs.existsSync(this.userModelPath)) {
            const content = fs.readFileSync(this.userModelPath, "utf-8");
            this.userModelCache = this.parseUserModel(content);
        }
        else {
            this.userModelCache = { ...DEFAULT_USER_MODEL };
        }
        return this.userModelCache;
    }
    updateUserModel(update) {
        const current = this.getUserModel();
        this.userModelCache = { ...current, ...update };
        this.dirty = true;
    }
    // --- CONTEXT.md operations (per-cwd) ---
    getProjectContext(cwd) {
        const key = this.contextKey(cwd);
        if (this.contextCaches.has(key))
            return this.contextCaches.get(key);
        const contextPath = this.contextPath(cwd);
        if (fs.existsSync(contextPath)) {
            const content = fs.readFileSync(contextPath, "utf-8");
            this.contextCaches.set(key, content);
            return content;
        }
        this.contextCaches.set(key, "");
        return "";
    }
    updateProjectContext(cwd, context) {
        const key = this.contextKey(cwd);
        this.contextCaches.set(key, context);
        this.dirty = true;
    }
    // --- Flush ---
    async flush() {
        // Write MEMORY.md
        if (this.memoryCache !== null) {
            this.enforceLimit("MEMORY.md", DEFAULT_MAX_MEMORY_CHARS);
            fs.writeFileSync(this.memoryPath, this.memoryCache, "utf-8");
        }
        // Write USER.md
        if (this.userModelCache !== null) {
            const content = this.serializeUserModel(this.userModelCache);
            const truncated = this.truncateToChars(content, DEFAULT_MAX_USER_MODEL_CHARS);
            fs.writeFileSync(this.userModelPath, truncated, "utf-8");
        }
        // Write CONTEXT.md files
        if (!fs.existsSync(this.contextDir)) {
            fs.mkdirSync(this.contextDir, { recursive: true });
        }
        for (const [key, content] of this.contextCaches) {
            if (content) {
                const filePath = path.join(this.contextDir, `${key}.md`);
                const truncated = this.truncateToChars(content, DEFAULT_MAX_CONTEXT_CHARS);
                fs.writeFileSync(filePath, truncated, "utf-8");
            }
        }
        this.dirty = false;
    }
    // --- Character limit enforcement ---
    enforceLimit(file, maxChars = DEFAULT_MAX_MEMORY_CHARS) {
        if (file === "MEMORY.md" && this.memoryCache) {
            if (this.memoryCache.length > maxChars) {
                this.memoryCache = this.summarizeOldest(this.memoryCache, maxChars);
            }
        }
        else if (file === "USER.md" && this.userModelCache) {
            const serialized = this.serializeUserModel(this.userModelCache);
            if (serialized.length > maxChars) {
                // Remove oldest corrections first
                while (this.userModelCache.corrections.length > 0) {
                    this.userModelCache.corrections.shift();
                    const s = this.serializeUserModel(this.userModelCache);
                    if (s.length <= maxChars)
                        break;
                }
            }
        }
        else if (file === "CONTEXT.md") {
            for (const [key, content] of this.contextCaches) {
                if (content.length > maxChars) {
                    this.contextCaches.set(key, this.truncateToChars(content, maxChars));
                }
            }
        }
    }
    // --- Private helpers ---
    contextKey(cwd) {
        return crypto.createHash("sha256").update(cwd).digest("hex").slice(0, 16);
    }
    contextPath(cwd) {
        return path.join(this.contextDir, `${this.contextKey(cwd)}.md`);
    }
    parseUserModel(content) {
        const model = { ...DEFAULT_USER_MODEL };
        // Simple markdown parsing for USER.md
        const prefMatch = content.match(/## Preferences\n([\s\S]*?)(?=\n## |\n*$)/);
        if (prefMatch) {
            for (const line of prefMatch[1].split("\n")) {
                const m = line.match(/^- (.+?): (.+)$/);
                if (m)
                    model.preferences[m[1]] = m[2];
            }
        }
        const correctionsMatch = content.match(/## Corrections\n([\s\S]*?)(?=\n## |\n*$)/);
        if (correctionsMatch) {
            for (const line of correctionsMatch[1].split("\n")) {
                const m = line.match(/^- (.+?) → (.+?)(?: \(([^)]+)\))?$/);
                if (m) {
                    model.corrections.push({
                        original: m[1],
                        corrected: m[2],
                        timestamp: m[3] ?? new Date().toISOString(),
                    });
                }
            }
        }
        const stackMatch = content.match(/## Tech Stack\n([\s\S]*?)(?=\n## |\n*$)/);
        if (stackMatch) {
            model.techStack = stackMatch[1]
                .split("\n")
                .filter(l => l.startsWith("- "))
                .map(l => l.replace(/^- /, "").trim());
        }
        const tasksMatch = content.match(/## Common Tasks\n([\s\S]*?)(?=\n## |\n*$)/);
        if (tasksMatch) {
            for (const line of tasksMatch[1].split("\n")) {
                const m = line.match(/^- (.+?)(?:\s+x(\d+))?$/);
                if (m) {
                    model.commonTasks.push({
                        pattern: m[1],
                        frequency: parseInt(m[2] ?? "1", 10),
                    });
                }
            }
        }
        const hoursMatch = content.match(/## Working Hours\n(.+)$/m);
        if (hoursMatch) {
            model.workingHours = hoursMatch[1].trim();
        }
        return model;
    }
    serializeUserModel(model) {
        const lines = [];
        lines.push("# User Model\n");
        if (Object.keys(model.preferences).length > 0) {
            lines.push("## Preferences");
            for (const [key, value] of Object.entries(model.preferences)) {
                lines.push(`- ${key}: ${value}`);
            }
            lines.push("");
        }
        if (model.corrections.length > 0) {
            lines.push("## Corrections");
            for (const c of model.corrections) {
                lines.push(`- ${c.original} → ${c.corrected} (${c.timestamp})`);
            }
            lines.push("");
        }
        if (model.techStack.length > 0) {
            lines.push("## Tech Stack");
            for (const s of model.techStack) {
                lines.push(`- ${s}`);
            }
            lines.push("");
        }
        if (model.commonTasks.length > 0) {
            lines.push("## Common Tasks");
            for (const t of model.commonTasks) {
                lines.push(`- ${t.pattern} x${t.frequency}`);
            }
            lines.push("");
        }
        if (model.workingHours) {
            lines.push("## Working Hours");
            lines.push(model.workingHours);
        }
        return lines.join("\n");
    }
    summarizeOldest(text, maxChars) {
        // Remove oldest entries (top of file) until under limit
        const lines = text.split("\n");
        while (lines.join("\n").length > maxChars && lines.length > 1) {
            // Remove the first non-empty block (entry + its date line)
            let removed = false;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim() !== "") {
                    lines.splice(i, 1);
                    removed = true;
                    break;
                }
            }
            if (!removed)
                break;
        }
        return lines.join("\n");
    }
    truncateToChars(text, maxChars) {
        if (text.length <= maxChars)
            return text;
        return text.slice(0, maxChars);
    }
}
//# sourceMappingURL=memory-manager.js.map