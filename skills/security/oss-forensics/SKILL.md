---
name: oss-forensics
description: "Open-source forensics — analyze repositories for security issues, license compliance, and supply chain risks."
version: 1.0.0
metadata:
  tekton:
    tags: ["forensics", "security", "license", "supply-chain"]
    category: security
    confidence: 0.4
---

# OSS Forensics

## When to Use
- Auditing open-source dependencies
- License compliance checking
- Supply chain security analysis

## Procedure
1. Scan: scorecard --repo=github.com/org/repo
2. License check: license-checker --summary
3. Vulnerability scan: osv-scanner --lockfile=package-lock.json
4. SBOM: syft dir:.
5. Review results and prioritize fixes

## Pitfalls
- False positives in vulnerability scanners
- License compatibility is complex
- Check transitive dependencies

## Verification
- All critical CVEs addressed
- License compliance documented
- SBOM is complete and accurate
