#!/usr/bin/env node
/**
 * Skill Validator — Validate all SKILL.md files in the skills directories.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
const SKILL_DIRS = [
    join(homedir(), ".tekton", "skills"),
    process.argv[2] || "./skills",
];
const issues = [];
function validateSkillMd(filePath) {
    const content = readFileSync(filePath, "utf-8");
    // Check frontmatter
    if (!content.startsWith("---")) {
        issues.push({ file: filePath, issue: "Missing frontmatter (must start with ---)" });
        return;
    }
    const frontmatterEnd = content.indexOf("---", 3);
    if (frontmatterEnd === -1) {
        issues.push({ file: filePath, issue: "Unclosed frontmatter" });
        return;
    }
    const frontmatter = content.slice(3, frontmatterEnd).trim();
    // Required fields
    const nameMatch = frontmatter.match(/^name:\s*.+/m);
    if (!nameMatch) {
        issues.push({ file: filePath, issue: "Missing 'name' field in frontmatter" });
    }
    const confidenceMatch = frontmatter.match(/^confidence:\s*([\d.]+)/m);
    if (!confidenceMatch) {
        issues.push({ file: filePath, issue: "Missing 'confidence' field in frontmatter" });
    }
    else {
        const confidence = parseFloat(confidenceMatch[1]);
        if (confidence < 0 || confidence > 1) {
            issues.push({ file: filePath, issue: `Confidence ${confidence} out of range [0, 1]` });
        }
    }
    // Check body
    const body = content.slice(frontmatterEnd + 3).trim();
    if (body.length === 0) {
        issues.push({ file: filePath, issue: "Empty skill body" });
    }
    // Check for trigger section
    if (!body.toLowerCase().includes("trigger")) {
        issues.push({ file: filePath, issue: "Missing 'Trigger' section in body" });
    }
}
console.log("⚡ Skill Validator\n");
let totalFiles = 0;
let validFiles = 0;
for (const dir of SKILL_DIRS) {
    if (!existsSync(dir)) {
        console.log(`Directory not found: ${dir}`);
        continue;
    }
    const files = readdirSync(dir).filter(f => f.endsWith(".md") || f.endsWith(".skill.md"));
    for (const file of files) {
        totalFiles++;
        const filePath = join(dir, file);
        try {
            validateSkillMd(filePath);
            if (issues.filter(i => i.file === filePath).length === 0) {
                validFiles++;
            }
        }
        catch (err) {
            issues.push({ file: filePath, issue: `Error reading file: ${err.message}` });
        }
    }
}
console.log(`Files validated: ${totalFiles}`);
console.log(`Valid: ${validFiles}`);
console.log(`Issues: ${issues.length}`);
if (issues.length > 0) {
    console.log("\nIssues found:");
    for (const issue of issues) {
        console.log(`  ${issue.file}: ${issue.issue}`);
    }
    process.exit(1);
}
else {
    console.log("\n✓ All skills are valid!");
}
//# sourceMappingURL=skill-validate.js.map