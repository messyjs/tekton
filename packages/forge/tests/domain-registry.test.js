import { describe, it, expect, beforeAll } from "vitest";
import { loadDomains, getDomain, matchDomains, getTeamTemplate, listDomains } from "@tekton/forge";
describe("Domain Registry", () => {
    beforeAll(() => {
        // Ensure domains are loaded
        loadDomains();
    });
    it("loads all 9 domain configs", () => {
        const domains = listDomains();
        expect(domains).toHaveLength(9);
        expect(domains).toContain("vst-audio");
        expect(domains).toContain("web-app");
        expect(domains).toContain("windows-desktop");
        expect(domains).toContain("unreal-engine");
        expect(domains).toContain("android");
        expect(domains).toContain("ios");
        expect(domains).toContain("cad-physical");
        expect(domains).toContain("html-static");
        expect(domains).toContain("cross-platform");
    });
    it("each config has required fields", () => {
        for (const name of listDomains()) {
            const template = getDomain(name);
            expect(template).toBeDefined();
            expect(template.domain).toBe(name);
            expect(template.roles.length).toBeGreaterThan(0);
            expect(template.testRoles.length).toBeGreaterThan(0);
            expect(template.projectTemplate).toBeDefined();
            expect(template.requiredTools.length).toBeGreaterThan(0);
        }
    });
    it("getTeamTemplate returns correct template", () => {
        const template = getTeamTemplate("vst-audio");
        expect(template).toBeDefined();
        expect(template.domain).toBe("vst-audio");
        expect(template.roles).toHaveLength(4);
        expect(template.testRoles).toHaveLength(2);
    });
    it("matchDomains identifies VST synth", () => {
        const domains = matchDomains({ title: "VST Synth Plugin" });
        expect(domains).toContain("vst-audio");
    });
    it("matchDomains identifies web app", () => {
        const domains = matchDomains({ problemStatement: "A website with API for task management" });
        expect(domains).toContain("web-app");
    });
    it("matchDomains identifies multi-domain product", () => {
        const domains = matchDomains({ title: "VST synth plugin with web preset store" });
        expect(domains).toContain("vst-audio");
        expect(domains).toContain("web-app");
    });
    it("matchDomains identifies 3D printable product", () => {
        const domains = matchDomains({ title: "3D printable phone stand" });
        expect(domains).toContain("cad-physical");
    });
    it("matchDomains defaults to web-app for ambiguous input", () => {
        const domains = matchDomains({ title: "Something cool" });
        expect(domains).toContain("web-app");
    });
    it("matchDomains uses explicit domains when specified", () => {
        const domains = matchDomains({ title: "Generic project", domains: ["ios", "android"] });
        expect(domains).toContain("ios");
        expect(domains).toContain("android");
    });
    it("getDomain returns undefined for unknown domain", () => {
        expect(getDomain("unknown-domain")).toBeUndefined();
    });
});
//# sourceMappingURL=domain-registry.test.js.map