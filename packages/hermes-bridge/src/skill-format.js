/**
 * SKILL.md parser/writer per agentskills.io specification.
 * Supports YAML frontmatter + markdown body.
 */
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
// --- Parsing ---
const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n/;
export function parseSkillMd(content) {
    const match = content.match(FRONTMATTER_RE);
    let frontmatter = {};
    let body = content;
    if (match) {
        body = content.slice(match[0].length);
        try {
            frontmatter = yaml.load(match[1]) ?? {};
        }
        catch {
            // If frontmatter is invalid YAML, treat entire content as body
            body = content;
        }
    }
    const name = String(frontmatter.name ?? "").trim();
    const description = String(frontmatter.description ?? "").trim();
    const skill = {
        name,
        description,
        body: body.trim(),
        references: [],
        scripts: [],
        assets: [],
    };
    if (frontmatter.version)
        skill.version = String(frontmatter.version);
    if (frontmatter.license)
        skill.license = String(frontmatter.license);
    if (frontmatter.compatibility)
        skill.compatibility = String(frontmatter.compatibility);
    if (frontmatter.allowedTools)
        skill.allowedTools = String(frontmatter.allowedTools);
    if (frontmatter.metadata && typeof frontmatter.metadata === "object") {
        skill.metadata = frontmatter.metadata;
    }
    return skill;
}
// --- Writing ---
export function writeSkillMd(skill) {
    const frontmatter = {
        name: skill.name,
        description: skill.description,
    };
    if (skill.version)
        frontmatter.version = skill.version;
    if (skill.allowedTools)
        frontmatter.allowedTools = skill.allowedTools;
    if (skill.metadata)
        frontmatter.metadata = skill.metadata;
    const yamlStr = yaml.dump(frontmatter, { lineWidth: -1, quotingType: '"' });
    return `---\n${yamlStr}---\n\n${skill.body}\n`;
}
// --- Validation ---
export function validateSkill(skill) {
    const errors = [];
    if (!skill.name) {
        errors.push("Skill name is required");
    }
    else {
        if (skill.name !== skill.name.toLowerCase()) {
            errors.push("Skill name must be lowercase");
        }
        if (skill.name.length > 64) {
            errors.push("Skill name must be max 64 characters");
        }
        if (!/^[a-z0-9-]+$/.test(skill.name)) {
            errors.push("Skill name must contain only lowercase letters, numbers, and hyphens");
        }
    }
    if (!skill.description) {
        errors.push("Skill description is required");
    }
    else if (skill.description.length > 1024) {
        errors.push("Skill description must be max 1024 characters");
    }
    if (skill.version && !/^\d+\.\d+\.\d+/.test(skill.version)) {
        errors.push("Version must be semver format");
    }
    if (skill.metadata?.tekton?.confidence !== undefined) {
        const c = skill.metadata.tekton.confidence;
        if (typeof c !== "number" || c < 0 || c > 1) {
            errors.push("Confidence must be a number between 0 and 1");
        }
    }
    return { valid: errors.length === 0, errors };
}
// --- Directory scanning ---
export function scanSkillDirectory(dir) {
    const result = {
        references: [],
        scripts: [],
        assets: [],
    };
    const refsDir = path.join(dir, "references");
    const scriptsDir = path.join(dir, "scripts");
    const assetsDir = path.join(dir, "assets");
    if (fs.existsSync(refsDir)) {
        result.references = fs.readdirSync(refsDir).filter(f => !f.startsWith("."));
    }
    if (fs.existsSync(scriptsDir)) {
        result.scripts = fs.readdirSync(scriptsDir).filter(f => !f.startsWith("."));
    }
    if (fs.existsSync(assetsDir)) {
        result.assets = fs.readdirSync(assetsDir).filter(f => !f.startsWith("."));
    }
    return result;
}
// --- Slugify ---
export function slugifySkillName(description) {
    return description
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 64);
}
//# sourceMappingURL=skill-format.js.map