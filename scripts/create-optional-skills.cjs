const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'optional-skills');

const optionalSkills = [
  // DevOps extended
  ["devops/docker", "docker", "Container management and Dockerfile authoring."],
  ["devops/kubernetes", "kubernetes", "Kubernetes deployment, services, and configuration."],
  ["devops/terraform", "terraform", "Infrastructure as code with Terraform."],
  ["devops/ansible", "ansible", "Configuration management with Ansible playbooks."],
  ["devops/ci-cd", "ci-cd", "CI/CD pipeline configuration for GitHub Actions, GitLab CI, etc."],
  ["devops/monitoring", "monitoring", "Application monitoring with Prometheus, Grafana, and alerting."],
  ["devops/nginx", "nginx", "Nginx configuration for reverse proxy, load balancing, SSL."],
  ["devops/database-admin", "database-admin", "PostgreSQL, MySQL, and SQLite administration and optimization."],
  // Testing extended
  ["testing/playwright", "playwright", "End-to-end browser testing with Playwright."],
  ["testing/cypress", "cypress", "End-to-end testing with Cypress."],
  ["testing/jest", "jest", "Unit and integration testing with Jest."],
  ["testing/k6", "k6", "Load and performance testing with k6."],
  // Data engineering
  ["data-engineering/etl", "etl", "Extract, transform, load pipeline design."],
  ["data-engineering/dbt", "dbt", "Data transformation with dbt."],
  ["data-engineering/airflow", "airflow", "Workflow orchestration with Apache Airflow."],
  // AI/ML extended
  ["ai/rag", "rag", "Retrieval-Augmented Generation implementation."],
  ["ai/agents-langchain", "agents-langchain", "LangChain agent development patterns."],
  ["ai/embeddings", "embeddings", "Embedding generation, storage, and similarity search."],
  ["ai/fine-tuning-data", "fine-tuning-data", "Dataset preparation for LLM fine-tuning."],
  ["ai/prompt-engineering", "prompt-engineering", "Systematic prompt optimization and evaluation."],
  ["ai/evaluation", "evaluation", "LLM output evaluation frameworks and benchmarks."],
  // Mobile
  ["mobile/react-native", "react-native", "React Native mobile app development."],
  ["mobile/flutter", "flutter", "Flutter cross-platform app development."],
  ["mobile/ios-swift", "ios-swift", "iOS app development with Swift and SwiftUI."],
  ["mobile/android-kotlin", "android-kotlin", "Android app development with Kotlin and Jetpack Compose."],
  // Web development
  ["web/nextjs", "nextjs", "Next.js full-stack web development."],
  ["web/remix", "remix", "Remix web framework development."],
  ["web/svelte", "svelte", "Svelte and SvelteKit web development."],
  ["web/tailwind", "tailwind", "Tailwind CSS utility-first styling."],
  ["web/graphql", "graphql", "GraphQL API design and implementation."],
  ["web/rest-api", "rest-api", "RESTful API design, versioning, and documentation."],
  ["web/testing-api", "testing-api", "API testing with Postman, Insomnia, and automation."],
  // Blockchain
  ["blockchain/solidity", "solidity", "Ethereum smart contract development with Solidity."],
  ["blockchain/web3", "web3", "Web3.js and ethers.js for blockchain interaction."],
  // Game development
  ["gamedev/unity", "unity", "Unity game development with C#."],
  ["gamedev/unreal", "unreal", "Unreal Engine development with Blueprint and C++."],
  ["gamedev/godot", "godot", "Godot game engine development with GDScript."],
  // Desktop
  ["desktop/tauri", "tauri", "Tauri desktop app development with Rust and web tech."],
  ["desktop/electron", "electron", "Electron desktop app development."],
  // Documentation
  ["docs/docusaurus", "docusaurus", "Documentation sites with Docusaurus."],
  ["docs/mintlify", "mintlify", "Beautiful documentation with Mintlify."],
  ["docs/api-docs", "api-docs", "API documentation with OpenAPI/Swagger."],
  // Audio
  ["audio/tts", "tts", "Text-to-speech generation and voice cloning."],
  ["audio/stt", "stt", "Speech-to-text transcription with Whisper."],
  ["audio/audio-processing", "audio-processing", "Audio processing with FFmpeg and SoX."],
  // Image
  ["image/comfyui", "comfyui", "ComfyUI workflows for image generation."],
  ["image/stable-diffusion", "stable-diffusion", "Stable Diffusion image generation and fine-tuning."],
  ["image/image-editing", "image-editing", "Programmatic image editing with Python PIL."],
  // Security extended
  ["security/penetration-testing", "penetration-testing", "Penetration testing methodology and tools."],
  ["security/sast", "sast", "Static application security testing with SonarQube, CodeQL."],
  ["security/dependency-audit", "dependency-audit", "Dependency vulnerability scanning and auditing."],
  // Cloud
  ["cloud/aws", "aws", "AWS service management and infrastructure."],
  ["cloud/gcp", "gcp", "Google Cloud Platform services and infrastructure."],
  ["cloud/azure", "azure", "Microsoft Azure services and infrastructure."],
];

for (const [dirPath, name, desc] of optionalSkills) {
  const fullDir = path.join(BASE, dirPath);
  fs.mkdirSync(fullDir, { recursive: true });
  const content = `---
name: ${name}
description: "${desc} Install with: tekton skills install official/${dirPath}"
version: 0.1.0
metadata:
  tekton:
    tags: ["optional"]
    category: ${dirPath.split('/')[0]}
    confidence: 0.3
---

# ${name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}

> This is an optional skill stub. Install the full version with:
> \`\`\`
> tekton skills install official/${dirPath}
> \`\`\`

## When to Use
${desc}

## Procedure
Install the full skill to access the complete procedure.

## Pitfalls
Not yet installed — run the install command above.

## Verification
Skill is installed when \`/tekton:skills info ${name}\` shows the full procedure.
`;
  fs.writeFileSync(path.join(fullDir, 'SKILL.md'), content, 'utf-8');
}

console.log(`Created ${optionalSkills.length} optional skill stubs`);