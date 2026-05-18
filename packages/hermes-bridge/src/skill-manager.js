/**
 * SkillManager — Full skill lifecycle management.
 * Discovery, loading, CRUD, confidence tracking, external directories.
 */
import fs from "node:fs";
import path from "node:path";
import { parseSkillMd, writeSkillMd, validateSkill, scanSkillDirectory, } from "./skill-format.js";
export class SkillManager {
    primaryDir;
    externalDirs;
    cache = new Map();
    dirty = true;
    usageTracker = new Map();
    usagePath;
    constructor(config) {
        this.primaryDir = config.primaryDir;
        this.externalDirs = config.externalDirs;
        this.usagePath = path.join(config.primaryDir, "skill-usage.json");
        if (!fs.existsSync(this.primaryDir)) {
            fs.mkdirSync(this.primaryDir, { recursive: true });
        }
        this.loadUsage();
    }
    // --- Discovery (Level 0 — summaries) ---
    listSkills() {
        this.ensureCache();
        const summaries = [];
        for (const skill of this.cache.values()) {
            if (skill.enabled) {
                summaries.push({
                    name: skill.name,
                    description: skill.description,
                    category: skill.metadata?.tekton?.category,
                    tags: skill.metadata?.tekton?.tags,
                    confidence: skill.metadata?.tekton?.confidence,
                    enabled: skill.enabled,
                    source: skill.source,
                });
            }
        }
        return summaries.sort((a, b) => a.name.localeCompare(b.name));
    }
    searchSkills(query) {
        const lower = query.toLowerCase();
        const all = this.listSkills();
        return all.filter(s => s.name.toLowerCase().includes(lower) ||
            s.description.toLowerCase().includes(lower) ||
            (s.tags?.some(t => t.toLowerCase().includes(lower)) ?? false) ||
            (s.category?.toLowerCase().includes(lower) ?? false));
    }
    // --- Loading (Level 1 — full content) ---
    getSkill(name) {
        this.ensureCache();
        return this.cache.get(name);
    }
    // --- Reference files (Level 2 — on-demand) ---
    getSkillReference(name, filePath) {
        const skill = this.getSkill(name);
        if (!skill)
            return undefined;
        const refPath = path.join(skill.directory, "references", filePath);
        if (!fs.existsSync(refPath))
            return undefined;
        return fs.readFileSync(refPath, "utf-8");
    }
    // --- CRUD ---
    createSkill(input) {
        const validation = validateSkill({ name: input.name, description: input.description });
        if (!validation.valid) {
            throw new Error(`Invalid skill: ${validation.errors.join(", ")}`);
        }
        const slug = input.name;
        const dir = path.join(this.primaryDir, slug);
        if (fs.existsSync(dir)) {
            throw new Error(`Skill already exists: ${slug}`);
        }
        fs.mkdirSync(dir, { recursive: true });
        const skill = {
            name: slug,
            description: input.description,
            version: input.version ?? "0.1.0",
            metadata: input.metadata,
            allowedTools: input.allowedTools,
            body: input.body,
            directory: dir,
            source: "local",
            enabled: true,
            references: [],
            scripts: [],
            assets: [],
        };
        const content = writeSkillMd(skill);
        fs.writeFileSync(path.join(dir, "SKILL.md"), content, "utf-8");
        this.cache.set(slug, skill);
        return skill;
    }
    updateSkill(name, update) {
        const skill = this.getSkill(name);
        if (!skill)
            throw new Error(`Skill not found: ${name}`);
        if (update.description !== undefined)
            skill.description = update.description;
        if (update.body !== undefined)
            skill.body = update.body;
        if (update.version !== undefined)
            skill.version = update.version;
        if (update.metadata !== undefined)
            skill.metadata = update.metadata;
        if (update.allowedTools !== undefined)
            skill.allowedTools = update.allowedTools;
        if (update.license !== undefined)
            skill.license = update.license;
        if (update.compatibility !== undefined)
            skill.compatibility = update.compatibility;
        this.saveSkill(skill);
        this.cache.set(name, skill);
        return skill;
    }
    patchSkill(name, oldString, newString) {
        const skill = this.getSkill(name);
        if (!skill)
            throw new Error(`Skill not found: ${name}`);
        // Patch the body
        if (skill.body.includes(oldString)) {
            skill.body = skill.body.replace(oldString, newString);
        }
        else {
            // Try fuzzy match: whitespace-normalized
            const norm = (s) => s.replace(/\s+/g, " ").trim();
            if (norm(skill.body).includes(norm(oldString))) {
                // Find and replace with normalized match — simple approach
                const bodyIdx = norm(skill.body).indexOf(norm(oldString));
                if (bodyIdx !== -1) {
                    // Approximate: just replace the body match area
                    skill.body = skill.body.replace(oldString, newString);
                }
            }
        }
        this.saveSkill(skill);
        this.cache.set(name, skill);
        return skill;
    }
    deleteSkill(name) {
        const skill = this.getSkill(name);
        if (!skill)
            throw new Error(`Skill not found: ${name}`);
        fs.rmSync(skill.directory, { recursive: true, force: true });
        this.cache.delete(name);
    }
    // --- File management ---
    writeSkillFile(name, filePath, content) {
        const skill = this.getSkill(name);
        if (!skill)
            throw new Error(`Skill not found: ${name}`);
        const subdir = filePath.startsWith("references/") || filePath.startsWith("scripts/") || filePath.startsWith("assets/")
            ? ""
            : "references/";
        const fullPath = path.join(skill.directory, subdir + filePath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, content, "utf-8");
        // Update computed file lists
        this.rescanSkill(name);
    }
    removeSkillFile(name, filePath) {
        const skill = this.getSkill(name);
        if (!skill)
            throw new Error(`Skill not found: ${name}`);
        const fullPath = path.join(skill.directory, filePath);
        if (fs.existsSync(fullPath)) {
            fs.rmSync(fullPath, { force: true });
        }
        this.rescanSkill(name);
    }
    // --- Import/Export ---
    exportSkill(name) {
        const skill = this.getSkill(name);
        if (!skill)
            throw new Error(`Skill not found: ${name}`);
        const exportDir = path.join(this.primaryDir, "..", "exports", name);
        if (fs.existsSync(exportDir)) {
            fs.rmSync(exportDir, { recursive: true, force: true });
        }
        fs.mkdirSync(exportDir, { recursive: true });
        // Copy entire skill directory
        copyDirRecursive(skill.directory, exportDir);
        return exportDir;
    }
    importSkill(dirPath) {
        if (!fs.existsSync(dirPath) || !fs.existsSync(path.join(dirPath, "SKILL.md"))) {
            throw new Error(`Invalid skill directory: ${dirPath}`);
        }
        const content = fs.readFileSync(path.join(dirPath, "SKILL.md"), "utf-8");
        const parsed = parseSkillMd(content);
        if (!parsed.name) {
            throw new Error("Skill must have a name in SKILL.md frontmatter");
        }
        const targetDir = path.join(this.primaryDir, parsed.name);
        if (fs.existsSync(targetDir)) {
            throw new Error(`Skill already exists: ${parsed.name}. Delete it first.`);
        }
        copyDirRecursive(dirPath, targetDir);
        const files = scanSkillDirectory(targetDir);
        const skill = {
            ...parsed,
            directory: targetDir,
            source: "local",
            enabled: true,
            references: files.references,
            scripts: files.scripts,
            assets: files.assets,
        };
        this.cache.set(skill.name, skill);
        return skill;
    }
    // --- Enable/Disable ---
    toggleSkill(name, enabled) {
        const skill = this.getSkill(name);
        if (!skill)
            throw new Error(`Skill not found: ${name}`);
        skill.enabled = enabled;
        this.saveSkill(skill);
        this.cache.set(name, skill);
    }
    // --- Confidence tracking ---
    recordUsage(name, success) {
        const record = this.usageTracker.get(name) ?? { success: 0, failure: 0 };
        if (success)
            record.success++;
        else
            record.failure++;
        this.usageTracker.set(name, record);
        // Update skill confidence
        const skill = this.getSkill(name);
        if (skill) {
            const total = record.success + record.failure;
            skill.metadata ??= {};
            skill.metadata.tekton ??= {};
            skill.metadata.tekton.confidence = total > 0 ? record.success / total : 0.5;
        }
        this.saveUsage();
    }
    getConfidence(name) {
        const record = this.usageTracker.get(name);
        if (!record)
            return 0.5;
        const total = record.success + record.failure;
        return total > 0 ? record.success / total : 0.5;
    }
    // --- Hub compatibility ---
    rescanExternalDirs() {
        for (const extDir of this.externalDirs) {
            if (!fs.existsSync(extDir))
                continue;
            const entries = fs.readdirSync(extDir, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory())
                    continue;
                const skillFile = path.join(extDir, entry.name, "SKILL.md");
                if (!fs.existsSync(skillFile))
                    continue;
                const content = fs.readFileSync(skillFile, "utf-8");
                const parsed = parseSkillMd(content);
                if (!parsed.name)
                    continue;
                const dir = path.join(extDir, entry.name);
                const files = scanSkillDirectory(dir);
                const skill = {
                    ...parsed,
                    directory: dir,
                    source: "external",
                    enabled: true,
                    references: files.references,
                    scripts: files.scripts,
                    assets: files.assets,
                };
                this.cache.set(skill.name, skill);
            }
        }
    }
    isHermesCompatible(skill) {
        // Check if skill follows Hermes agent format
        if (!skill.name || !skill.description)
            return false;
        // Hermes skills typically have metadata.hermes or follow our format
        if (skill.metadata?.hermes)
            return true;
        // Check if body has standard sections
        const body = skill.body.toLowerCase();
        return body.includes("when to use") || body.includes("procedure") || body.includes("steps");
    }
    // --- Private ---
    ensureCache() {
        if (!this.dirty)
            return;
        this.cache.clear();
        // Load primary skills
        this.loadFromDirectory(this.primaryDir, "local");
        // Load external skills
        for (const extDir of this.externalDirs) {
            this.loadFromDirectory(extDir, "external");
        }
        this.dirty = false;
    }
    loadFromDirectory(dir, source) {
        if (!fs.existsSync(dir))
            return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory())
                continue;
            const skillFile = path.join(dir, entry.name, "SKILL.md");
            if (!fs.existsSync(skillFile))
                continue;
            const content = fs.readFileSync(skillFile, "utf-8");
            const parsed = parseSkillMd(content);
            if (!parsed.name)
                continue;
            const skillDir = path.join(dir, entry.name);
            const files = scanSkillDirectory(skillDir);
            const skill = {
                ...parsed,
                directory: skillDir,
                source,
                enabled: true,
                references: files.references,
                scripts: files.scripts,
                assets: files.assets,
            };
            this.cache.set(skill.name, skill);
        }
    }
    saveSkill(skill) {
        const content = writeSkillMd(skill);
        const skillFile = path.join(skill.directory, "SKILL.md");
        fs.writeFileSync(skillFile, content, "utf-8");
    }
    rescanSkill(name) {
        const skill = this.cache.get(name);
        if (!skill)
            return;
        const files = scanSkillDirectory(skill.directory);
        skill.references = files.references;
        skill.scripts = files.scripts;
        skill.assets = files.assets;
    }
    loadUsage() {
        if (fs.existsSync(this.usagePath)) {
            try {
                const data = JSON.parse(fs.readFileSync(this.usagePath, "utf-8"));
                this.usageTracker = new Map(Object.entries(data));
            }
            catch {
                this.usageTracker = new Map();
            }
        }
    }
    saveUsage() {
        const dir = path.dirname(this.usagePath);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const data = Object.fromEntries(this.usageTracker);
        fs.writeFileSync(this.usagePath, JSON.stringify(data, null, 2), "utf-8");
    }
}
function copyDirRecursive(src, dest) {
    if (!fs.existsSync(dest))
        fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        }
        else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}
//# sourceMappingURL=skill-manager.js.map