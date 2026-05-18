/**
 * Domain Registry — Loads and manages product domain configurations.
 *
 * Each domain (VST, web, desktop, etc.) has a TeamTemplate defining
 * roles, test roles, project templates, and build/test commands.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
// ── Config directory ──────────────────────────────────────────────────────
const CONFIGS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "configs", "domains");
// ── Domain Registry ───────────────────────────────────────────────────────
class DomainRegistry {
    _domains = new Map();
    _loaded = false;
    /** Get all domain templates as a Map */
    get domains() {
        this.load();
        return this._domains;
    }
    loaded = false;
    /** Load all domain configs from disk */
    load() {
        if (this._loaded)
            return;
        if (!existsSync(CONFIGS_DIR)) {
            throw new Error(`Domain configs directory not found: ${CONFIGS_DIR}`);
        }
        const files = readdirSync(CONFIGS_DIR).filter(f => f.endsWith(".json"));
        for (const file of files) {
            const filePath = join(CONFIGS_DIR, file);
            const content = readFileSync(filePath, "utf-8");
            const template = JSON.parse(content);
            this._domains.set(template.domain, template);
        }
        this._loaded = true;
    }
    /** Get a specific domain template by name */
    get(name) {
        this.load();
        return this._domains.get(name);
    }
    /** List all available domain names */
    list() {
        this.load();
        return [...this._domains.keys()].sort();
    }
    /** Get all domain templates */
    all() {
        this.load();
        return [...this._domains.values()];
    }
    /** Check if a domain exists */
    has(name) {
        this.load();
        return this._domains.has(name);
    }
    /** Match domains to a product brief based on keyword analysis */
    match(brief) {
        this.load();
        // If domains are explicitly specified, validate and return them
        if (brief.domains && brief.domains.length > 0) {
            const valid = brief.domains.filter(d => this.domains.has(d));
            if (valid.length > 0)
                return valid;
        }
        // Keyword matching
        const text = `${brief.title ?? ""} ${brief.problemStatement ?? ""} ${brief.technicalApproach ?? ""}`.toLowerCase();
        const matches = [];
        const keywordMap = {
            "vst-audio": ["vst", "plugin", "synth", "daw", "audio", "dsp", "juce", "compressor", "eq", "reverb", "oscillator", "envelope", "midi"],
            "web-app": ["website", "web app", "webapp", "react", "vue", "svelte", "nextjs", "api", "rest api", "frontend", "backend", "fullstack", "saas", "dashboard", "preset"],
            "windows-desktop": ["windows desktop", "winui", "wpf", "win32", ".net desktop", "c# desktop", "msix", "windows app"],
            "unreal-engine": ["unreal", "ue5", "ue4", "game engine", "game", "blueprint", "fps", "open world", "3d game"],
            "android": ["android", "kotlin android", "jetpack compose", "gradle android", "play store", "mobile app"],
            "ios": ["ios", "swiftui", "swift", "iphone app", "ipad app", "app store", "xcode"],
            "cad-physical": ["3d print", "cad", "physical", "openscad", "freecad", "stl", "3d model", "cnc", "laser cut", "mechanical", "prototype"],
            "html-static": ["static site", "landing page", "html email", "brochure", "portfolio", "static website", "jekyll", "hugo"],
            "cross-platform": ["electron", "tauri", "cross-platform desktop", "desktop app", "multi-platform", "react native windows"],
        };
        for (const [domain, keywords] of Object.entries(keywordMap)) {
            for (const keyword of keywords) {
                if (text.includes(keyword)) {
                    if (!matches.includes(domain)) {
                        matches.push(domain);
                    }
                    break;
                }
            }
        }
        // Default to web-app if nothing matched
        if (matches.length === 0) {
            matches.push("web-app");
        }
        return matches;
    }
    /** Get the full team template for a domain */
    getTeamTemplate(domain) {
        return this.get(domain);
    }
    /** Force reload of domain configs */
    reload() {
        this.domains.clear();
        this._loaded = false;
        this.load();
    }
}
// ── Singleton and convenience functions ────────────────────────────────────
const registry = new DomainRegistry();
export function loadDomains() {
    registry.load();
    return registry.domains;
}
export function getDomain(name) {
    return registry.get(name);
}
export function matchDomains(brief) {
    return registry.match(brief);
}
export function getTeamTemplate(domain) {
    return registry.getTeamTemplate(domain);
}
export function listDomains() {
    return registry.list();
}
export { DomainRegistry };
//# sourceMappingURL=domain-registry.js.map