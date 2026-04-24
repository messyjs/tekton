const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'skills');

const skills = [
  // software-development
  ["software-development/plan", "plan", "Plan mode: inspect context, write markdown plan, don't execute. Use when you need to analyze before acting.", "software-development", ["planning", "analysis", "architecture"], 0.8,
`# Plan Mode

## When to Use
- Before starting complex multi-step changes
- When requirements are ambiguous
- When the task affects multiple files or systems

## Procedure
1. Read all relevant files and context
2. Identify the scope of changes needed
3. Write a markdown plan with sections: Goal, Approach, Files to Change, Risk Assessment
4. Present plan to user for approval before executing
5. Do NOT write code or make changes until approved

## Pitfalls
- Don't start implementing during planning
- Don't skip reading existing code
- Don't assume requirements — ask clarifying questions

## Verification
- Plan covers all mentioned requirements
- User has approved the plan before execution begins`],

  ["software-development/requesting-code-review", "requesting-code-review", "Pre-commit verification pipeline: lint, type-check, test, format before requesting review.", "software-development", ["review", "quality", "ci", "pre-commit"], 0.8,
`# Requesting Code Review

## When to Use
- Before submitting a PR
- After completing a feature or fix
- When you want feedback on code quality

## Procedure
1. Run linter and fix all warnings
2. Run type checker
3. Run relevant tests and ensure all pass
4. Run formatter
5. Write clear PR description with: What, Why, How, Testing
6. Request review from appropriate team members

## Pitfalls
- Don't skip running tests locally
- Don't request review on failing CI
- Don't forget to self-review first

## Verification
- All CI checks pass
- PR description is complete
- Reviewer(s) assigned`],

  ["software-development/subagent-driven-development", "subagent-driven-development", "Dispatch delegate_task per independent task for parallel execution of unrelated work.", "software-development", ["parallel", "delegation", "sub-agents", "orchestration"], 0.7,
`# Sub-Agent Driven Development

## When to Use
- Multiple independent tasks can run in parallel
- Long-running tasks that don't depend on each other

## Procedure
1. Identify independent tasks from the current goal
2. Group tasks by dependency (parallel vs sequential)
3. For parallel group, use delegate_task with mode=parallel
4. For sequential group, use delegate_task with mode=sequential
5. Aggregate results and proceed
6. Verify combined output

## Pitfalls
- Don't delegate tasks with shared mutable state
- Don't assume sub-agents can see each other's context
- Keep task descriptions specific and self-contained

## Verification
- All delegated tasks completed
- Results aggregated correctly
- No conflicts between parallel outputs`],

  ["software-development/systematic-debugging", "systematic-debugging", "4-phase root cause investigation: reproduce, isolate, hypothesis, verify.", "software-development", ["debugging", "root-cause", "investigation"], 0.8,
`# Systematic Debugging

## When to Use
- Bug reports or unexpected behavior
- Intermittent failures
- Performance regressions

## Procedure
1. **Reproduce**: Create minimal reproduction case; document exact steps
2. **Isolate**: Binary search to narrow scope; check logs, add strategic prints
3. **Hypothesize**: List possible root causes; rank by likelihood
4. **Verify**: Apply fix for most likely cause; confirm it works; check for similar issues

## Pitfalls
- Don't skip reproduction — assumptions waste time
- Don't change multiple things at once during isolation
- Don't forget to check for similar bugs after fixing

## Verification
- Bug no longer reproduces
- Fix is minimal and targeted
- No regressions in related behavior`],

  ["software-development/test-driven-development", "test-driven-development", "RED-GREEN-REFACTOR cycle: write failing test, make it pass, then clean up.", "software-development", ["testing", "tdd", "red-green-refactor"], 0.8,
`# Test-Driven Development

## When to Use
- Writing new features
- Fixing bugs (write regression test first)
- Refactoring existing code

## Procedure
1. **RED**: Write a test that fails because the feature doesn't exist yet
2. **GREEN**: Write the minimum code to make the test pass
3. **REFACTOR**: Clean up the code while keeping tests green
4. Repeat for next requirement

## Pitfalls
- Don't skip the RED phase — the failure confirms the test is meaningful
- Don't write more code than needed to pass the current test
- Don't refactor without green tests

## Verification
- All tests pass (green)
- No dead code from over-implementation
- Test coverage is meaningful, not inflated`],

  ["software-development/writing-plans", "writing-plans", "Create comprehensive implementation plans with scope, approach, risks, and verification steps.", "software-development", ["planning", "implementation", "scope"], 0.7,
`# Writing Plans

## When to Use
- Starting a new feature or project
- Complex refactoring
- Multi-file changes

## Procedure
1. Define clear Goal statement
2. List all files/modules that need changes
3. Describe the Approach for each change
4. Identify Risks and mitigation strategies
5. Define Verification criteria
6. Break into ordered Steps with estimated effort

## Pitfalls
- Don't be vague — specific files and line ranges
- Don't skip risk assessment
- Don't forget rollback plan

## Verification
- Plan addresses the full requirement
- Each step is independently verifiable
- Risks have concrete mitigations`],

  // github
  ["github/github-auth", "github-auth", "Set up GitHub authentication: SSH keys, tokens, and gh CLI configuration.", "github", ["github", "auth", "ssh", "tokens"], 0.7,
`# GitHub Authentication

## When to Use
- First-time setup on a new machine
- When git push/pull fails with auth errors
- Setting up CI/CD pipelines

## Procedure
1. Check if gh CLI is installed: \`which gh\`
2. Authenticate: \`gh auth login\`
3. For SSH: generate key with \`ssh-keygen\`, add to GitHub
4. Verify: \`gh auth status\` and \`git remote -v\`

## Pitfalls
- Don't commit tokens to repositories
- Don't use personal tokens in CI — use GitHub Actions secrets
- SSH vs HTTPS mismatch causes push failures

## Verification
- \`gh auth status\` shows authenticated
- \`git push\` works without password prompt`],

  ["github/github-code-review", "github-code-review", "Review diffs and leave inline PR comments with constructive feedback.", "github", ["review", "pr", "diff", "feedback"], 0.6,
`# GitHub Code Review

## When to Use
- Reviewing pull requests
- Providing feedback on code changes
- Ensuring code quality before merge

## Procedure
1. Fetch PR diff: \`gh pr diff <number>\`
2. Review change summary, then dive into specifics
3. Check for: correctness, performance, security, style
4. Leave inline comments
5. Submit review: approve, request changes, or comment

## Pitfalls
- Don't review without understanding the context
- Don't leave vague comments — be specific
- Check both the what and the why

## Verification
- All files in the diff have been reviewed
- Comments are actionable and specific
- Review decision is justified`],

  ["github/github-issues", "github-issues", "Create, manage, triage, and close GitHub issues with labels and milestones.", "github", ["issues", "triage", "project-management"], 0.7,
`# GitHub Issues

## When to Use
- Tracking bugs, features, tasks
- Managing project backlog
- Triaging incoming reports

## Procedure
1. Create issue: \`gh issue create --title "..." --body "..."\`
2. Add labels: \`gh issue edit <number> --add-label bug,priority:high\`
3. Assign: \`gh issue edit <number> --assignee <user>\`
4. Set milestone: \`gh issue edit <number> --milestone v2.0\`
5. Close: \`gh issue close <number>\`

## Pitfalls
- Don't create duplicate issues — search first
- Don't leave issues without labels or assignees
- Write actionable titles, not vague descriptions

## Verification
- Issue has clear title, description, labels
- Issue is assigned and has a milestone
- Duplicate issues are linked`],

  ["github/github-pr-workflow", "github-pr-workflow", "Full PR lifecycle: branch, commit, push, open PR, address review, merge.", "github", ["pr", "branch", "merge", "workflow"], 0.7,
`# GitHub PR Workflow

## When to Use
- Contributing to any repository
- Feature development workflow
- Bug fix submission

## Procedure
1. Create branch: \`git checkout -b feature/my-change\`
2. Make changes and commit with clear message
3. Push: \`git push -u origin feature/my-change\`
4. Open PR: \`gh pr create --title "..." --body "..."\`
5. Address review comments and push fixes
6. Merge: \`gh pr merge <number>\`

## Pitfalls
- Don't push to main directly
- Don't forget to rebase on latest main before merge
- Write PR descriptions that explain Why, not just What

## Verification
- PR is merged (or closed with reason)
- Branch cleaned up after merge
- CI passed before merge`],

  ["github/github-repo-management", "github-repo-management", "Clone, create, fork, and configure GitHub repositories.", "github", ["repo", "clone", "fork", "create"], 0.7,
`# GitHub Repository Management

## When to Use
- Setting up new projects
- Forking repositories for contribution
- Configuring repo settings

## Procedure
1. Clone: \`gh repo clone owner/repo\`
2. Create: \`gh repo create my-repo --public --clone\`
3. Fork: \`gh repo fork owner/repo --clone\`
4. Configure: \`gh repo edit --description "..." --homepage URL\`
5. Manage collaborators

## Pitfalls
- Check .gitignore before pushing
- Set default branch protection on new repos
- Use SSH URLs for reliability

## Verification
- Repo is accessible
- Branch protection rules are set
- Collaborators have correct permissions`],

  ["github/codebase-inspection", "codebase-inspection", "LOC counting, language breakdown, dependency analysis, and codebase statistics.", "github", ["analysis", "metrics", "loc", "stats"], 0.6,
`# Codebase Inspection

## When to Use
- Understanding a new codebase
- Preparing for refactoring
- Generating project documentation

## Procedure
1. Count lines of code: \`find . -name '*.ts' | xargs wc -l | tail -1\`
2. Language breakdown: \`gh api repos/{owner}/{repo}/languages\`
3. Find largest files: \`find . -name '*.ts' -exec wc -l {} + | sort -rn | head -20\`
4. Check dependencies: \`cat package.json | jq '.dependencies | keys'\`
5. Analyze commit patterns: \`git log --oneline | head -50\`

## Pitfalls
- Don't count node_modules or build artifacts
- Use .gitignore-aware tools
- Distinguish between source and generated code

## Verification
- Stats match visual inspection
- No build artifacts included in counts`],

  // creative
  ["creative/architecture-diagram", "architecture-diagram", "Create dark-themed SVG system diagrams showing components and data flow.", "creative", ["diagram", "architecture", "svg", "visualization"], 0.6,
`# Architecture Diagram

## When to Use
- Documenting system design
- Explaining architecture to stakeholders
- Onboarding new team members

## Procedure
1. Identify components and their relationships
2. Choose layout: hierarchical, layered, or network
3. Create SVG with dark theme (#1a1a2e bg, #0f3460 nodes, #e94560 accents)
4. Add component boxes with labels
5. Draw arrows for data flow
6. Add legend and notes

## Pitfalls
- Don't over-complicate — focus on key components
- Use consistent styling for similar components
- Include directionality on all arrows

## Verification
- All major components are represented
- Data flows are correct and directional
- Diagram is readable at both small and large sizes`],

  ["creative/ascii-art", "ascii-art", "Generate ASCII art using pyfiglet, cowsay, and boxes for headers and decoration.", "creative", ["ascii", "art", "decoration", "banner"], 0.5,
`# ASCII Art

## When to Use
- Creating CLI banners and headers
- Decorating terminal output
- Adding visual emphasis to text

## Procedure
1. Install: \`pip install pyfiglet cowsay boxes\`
2. Generate banner: \`pyfiglet "Hello World"\`
3. Add box: \`echo "Hello World" | boxes -d boxblog\`
4. Add cow: \`cowsay "Hello World"\`

## Pitfalls
- Don't use in JSON or structured output
- Keep under 80 chars wide
- Test in both light and dark terminals

## Verification
- Art renders correctly in terminal
- Alignment is correct
- No wrapping at 80 columns`],

  ["creative/ascii-video", "ascii-video", "Pipeline for converting video to ASCII art animation frames.", "creative", ["video", "ascii", "animation", "conversion"], 0.4,
`# ASCII Video

## When to Use
- Creating terminal-based video content
- Visual demonstrations in text environments

## Procedure
1. Extract frames: \`ffmpeg -i input.mp4 frames/%04d.png\`
2. Convert each frame to ASCII using Python PIL
3. Resize to terminal dimensions
4. Assemble: loop through frames with clear screen between each
5. Optional: add color via ANSI codes

## Pitfalls
- Frame rate must match terminal refresh capability
- High resolution creates too many characters
- Color adds significant complexity

## Verification
- Animation plays smoothly
- Characters are recognizable
- Terminal size accommodates the output`],

  ["creative/excalidraw", "excalidraw", "Create hand-drawn style .excalidraw diagrams for quick visual explanations.", "creative", ["diagram", "excalidraw", "hand-drawn", "sketch"], 0.5,
`# Excalidraw

## When to Use
- Quick architectural sketches
- Brainstorming visual layouts
- Informal design discussions

## Procedure
1. Open excalidraw.com
2. Choose element type: box, arrow, text, diamond
3. Place components on canvas
4. Draw connections between elements
5. Label all components
6. Export as .excalidraw JSON or SVG/PNG

## Pitfalls
- Don't over-design — excalidraw is for quick sketches
- Export in multiple formats for compatibility
- Keep diagrams under 30 elements

## Verification
- Diagram loads in Excalidraw editor
- All elements are labeled
- Connections are clear and unambiguous`],

  ["creative/ideation", "ideation", "Creative project idea generation through brainstorming, SCAMPER, and lateral thinking.", "creative", ["ideas", "brainstorming", "creativity", "projects"], 0.5,
`# Ideation

## When to Use
- Starting a new project
- Stuck in creative block
- Generating variants of existing ideas

## Procedure
1. Define problem space or domain
2. Use SCAMPER: Substitute, Combine, Adapt, Modify, Put to other use, Eliminate, Reverse
3. Generate 10 ideas without filtering
4. Evaluate each: feasibility, novelty, impact
5. Select top 3 and develop brief pitches
6. Iterate with user feedback

## Pitfalls
- Don't filter during generation phase
- Don't confuse novelty with value
- Keep scope realistic

## Verification
- At least 10 distinct ideas generated
- Top ideas have feasibility assessment
- Clear next steps defined`],

  ["creative/manim-video", "manim-video", "3Blue1Brown-style math animations using Manim for educational content.", "creative", ["math", "animation", "manim", "video"], 0.4,
`# Manim Video

## When to Use
- Creating math/CS educational content
- Explaining algorithms visually

## Procedure
1. Install: \`pip install manim\`
2. Write scene class in Python
3. Define objects: Text, MathTex, Circle, Arrow
4. Animate: FadeIn, Transform, Write, MoveToTarget
5. Render: \`manim -pql scene.py SceneName\`

## Pitfalls
- Preview at LQ, final at HQ
- Coordinate system: x right, y up, origin center
- Don't forget self.wait() between animations

## Verification
- Animation plays without errors
- Visual elements positioned correctly
- Narrative flows logically`],

  ["creative/p5js", "p5js", "p5.js interactive generative art — create visual sketches with JavaScript.", "creative", ["generative-art", "p5js", "creative-coding", "visualization"], 0.5,
`# p5.js Generative Art

## When to Use
- Creating interactive visualizations
- Generative art projects
- Creative coding experiments

## Procedure
1. Create HTML with p5.js CDN
2. Write setup() — canvas size, initial state
3. Write draw() — animation loop
4. Use p5 primitives: circle(), rect(), line(), text()
5. Add interactivity: mousePressed(), keyPressed()
6. Export: saveCanvas() for PNG

## Pitfalls
- Watch performance in draw() — avoid allocations each frame
- Use noLoop() for static sketches
- Random seeds for reproducible art

## Verification
- Sketch runs in browser without errors
- Interaction works as expected
- Visual output matches intent`],

  ["creative/popular-web-designs", "popular-web-designs", "54 production design system implementations — common web UI patterns.", "creative", ["web", "design", "ui", "css", "patterns"], 0.5,
`# Popular Web Designs

## When to Use
- Building web UIs that need professional design
- Converting design mockups to code
- Implementing common UI patterns

## Procedure
1. Identify the pattern needed: dashboard, landing page, form, etc.
2. Reference established design systems (Tailwind UI, Shadcn, Radix)
3. Implement with consistent spacing, typography, colors
4. Ensure responsive behavior
5. Test dark mode support

## Pitfalls
- Don't reinvent the wheel — use established component libraries
- Maintain consistent spacing scale
- Test all interactive states

## Verification
- Design matches approved mockup
- Responsive at all breakpoints
- Accessible (WCAG 2.1 AA)`],

  ["creative/songwriting-and-ai-music", "songwriting-and-ai-music", "Songwriting craft (lyrics, structure, rhyme) plus AI music generation prompts.", "creative", ["music", "songwriting", "lyrics", "ai-music"], 0.4,
`# Songwriting and AI Music

## When to Use
- Creating song lyrics or music
- Generating AI music with tools like Suno, Udio
- Writing jingles or background music

## Procedure
1. Choose song structure (verse-chorus, AABA, etc.)
2. Write lyrics with consistent meter and rhyme scheme
3. Define genre, tempo, key, mood
4. For AI music: craft detailed prompts
5. Iterate on output
6. Mix and master the final version

## Pitfalls
- AI music tools need specific, detailed prompts
- Don't over-specify — leave room for creativity
- Copyright: verify AI-generated music is royalty-free

## Verification
- Song structure is consistent
- Lyrics scan naturally (read aloud)
- Music matches intended mood`],

  // mlops
  ["mlops/training/axolotl", "axolotl", "Fine-tune LLMs with Axolotl: config-driven, multi-GPU, LoRA/QLoRA support.", "mlops", ["training", "fine-tuning", "lora", "axolotl"], 0.5,
`# Axolotl Fine-Tuning

## When to Use
- Fine-tuning large language models
- Multi-GPU training with LoRA/QLoRA
- Config-driven training pipelines

## Procedure
1. Install: \`pip install axolotl\`
2. Create YAML config specifying base model, dataset, LoRA params
3. Prepare dataset in Axolotl format (instruction/completion)
4. Launch: \`accelerate launch -m axolotl.cli.train config.yml\`
5. Monitor with wandb
6. Export: merge LoRA weights or keep adapter separate

## Pitfalls
- OOM: reduce batch_size or enable gradient_checkpointing
- LoRA rank too high = slower, too low = underfitting
- Always validate on held-out data

## Verification
- Loss decreases monotonically
- Validation perplexity improves
- Model generates coherent completions`],

  ["mlops/training/unsloth", "unsloth", "Fast fine-tuning with Unsloth: 2x faster, 60% less memory for LLM training.", "mlops", ["training", "fine-tuning", "unsloth", "efficient"], 0.5,
`# Unsloth Fine-Tuning

## When to Use
- When training speed matters
- Limited GPU memory scenarios
- Quick iteration on fine-tuning experiments

## Procedure
1. Install: \`pip install unsloth\`
2. Load model with Unsloth optimizations
3. Apply LoRA: \`model = FastLanguageModel.get_peft_model(model, ...)\`
4. Train with SFTTrainer
5. Save: \`model.save_pretrained_merged()\`

## Pitfalls
- Some model architectures not supported
- Flash attention may conflict with other optimizations
- Verify numerical equivalence with standard training

## Verification
- Training throughput is ~2x standard
- Memory usage reduced vs baseline
- Model quality comparable to standard fine-tuning`],

  ["mlops/training/trl-fine-tuning", "trl-fine-tuning", "TRL library for SFT, DPO, and GRPO training on language models.", "mlops", ["training", "trl", "sft", "dpo", "grpo"], 0.5,
`# TRL Fine-Tuning

## When to Use
- Supervised fine-tuning (SFT)
- Direct Preference Optimization (DPO)
- Group Relative Policy Optimization (GRPO)

## Procedure
1. Install: \`pip install trl\`
2. SFT: \`SFTTrainer\` with dataset of completions
3. DPO: \`DPOTrainer\` with preference pairs
4. GRPO: \`GRPOTrainer\` with reward model
5. Log to wandb for experiment tracking

## Pitfalls
- DPO needs both chosen and rejected examples
- Learning rate too high causes training instability
- DPO can overfit the preference data — validate carefully

## Verification
- Reward model scores improve on validation
- Generated text quality is subjectively better
- No training loss spikes or NaN`],

  ["mlops/inference/llama-cpp", "llama-cpp", "llama.cpp inference engine: quantized LLM serving, GGUF conversion, hardware acceleration.", "mlops", ["inference", "llama-cpp", "gguf", "quantization"], 0.6,
`# llama.cpp Inference

## When to Use
- Running LLMs on consumer hardware
- CPU/GPU inference without Python overhead
- Converting models to GGUF format

## Procedure
1. Build: \`make\` or \`cmake --build\`
2. Convert model: \`python convert_hf_to_gguf.py /path/to/model\`
3. Quantize: \`./llama-quantize model.gguf Q4_K_M\`
4. Serve: \`./llama-server -m model-Q4_K_M.gguf -c 4096 --host 0.0.0.0\`
5. Chat: \`./llama-cli -m model-Q4_K_M.gguf\`

## Pitfalls
- Q4 trades quality for speed; Q5_K_M is better quality
- Context length directly impacts memory usage
- Flash attention requires specific GPU support

## Verification
- Model loads without errors
- Generation is coherent and responsive
- Memory usage matches expectations`],

  ["mlops/inference/vllm", "vllm", "vLLM high-throughput LLM serving with PagedAttention, continuous batching, and OpenAI-compatible API.", "mlops", ["inference", "vllm", "serving", "high-throughput"], 0.6,
`# vLLM Serving

## When to Use
- High-throughput LLM inference
- Production model serving
- Need OpenAI-compatible API

## Procedure
1. Install: \`pip install vllm\`
2. Serve: \`python -m vllm.entrypoints.openai.api_server --model <model> --port 8000\`
3. Use OpenAI client: \`client = OpenAI(base_url="http://localhost:8000/v1")\`
4. Configure: \`--max-model-len\`, \`--gpu-memory-utilization 0.9\`
5. Quantize: \`--quantization awq\` or \`gptq\`

## Pitfalls
- OOM: reduce gpu_memory_utilization or max_model_len
- First request is slow (model loading)
- Quantization may degrade quality significantly

## Verification
- API responds to /v1/models
- Throughput matches expected tokens/sec
- No OOM errors under load`],

  ["mlops/evaluation/lm-evaluation-harness", "lm-evaluation-harness", "Run 60+ academic benchmarks (MMLU, HellaSwag, etc.) on language models.", "mlops", ["evaluation", "benchmark", "mmlu", "harness"], 0.5,
`# LM Evaluation Harness

## When to Use
- Evaluating model capabilities
- Comparing models on standard benchmarks
- Academic evaluation before release

## Procedure
1. Install: \`pip install lm-eval\`
2. Run MMLU: \`lm_eval --model hf --model_args pretrained=<model> --tasks mmlu\`
3. Run HellaSwag: \`lm_eval --model hf --model_args pretrained=<model> --tasks hellaswag\`
4. Multiple tasks: \`--tasks mmlu,hellaswag,arc_challenge\`
5. Output: \`--output_path results.json\`

## Pitfalls
- Some tasks require specific prompt templates
- Few-shot settings vary by benchmark
- Results depend on generation parameters

## Verification
- Results in expected range for model size
- No errors in evaluation log
- Comparison is apples-to-apples (same settings)`],

  ["mlops/evaluation/weights-and-biases", "weights-and-biases", "W&B experiment tracking: log metrics, compare runs, visualize training progress.", "mlops", ["evaluation", "wandb", "tracking", "experiments"], 0.5,
`# Weights & Biases

## When to Use
- Tracking ML experiments
- Comparing training runs
- Visualizing metrics over time

## Procedure
1. Install: \`pip install wandb\`
2. Login: \`wandb login\`
3. Initialize: \`wandb.init(project="my-project", config={...})\`
4. Log metrics: \`wandb.log({"loss": loss, "lr": lr})\`
5. Finish: \`wandb.finish()\`

## Pitfalls
- Don't log every step — use commit=False for batched logging
- Set run names clearly for comparison
- Use tags for filtering

## Verification
- Dashboard shows metrics
- Runs are comparable
- No orphaned runs`],

  ["mlops/huggingface-hub", "huggingface-hub", "HF Hub CLI operations: upload, download, manage models and datasets.", "mlops", ["huggingface", "hub", "models", "datasets"], 0.6,
`# Hugging Face Hub

## When to Use
- Uploading/downloading models
- Managing datasets
- Sharing trained models

## Procedure
1. Install: \`pip install huggingface_hub\`
2. Login: \`huggingface-cli login\`
3. Download: \`huggingface-cli download <repo>\`
4. Upload: \`huggingface-cli upload <repo> <folder>\`
5. Create repo: \`huggingface-cli repo create <name> --model\`

## Pitfalls
- Use LFS for large files
- Set .gitattributes for model weights
- Check license before uploading

## Verification
- Model appears on hub
- Files are complete
- README and model card present`],

  // research
  ["research/arxiv", "arxiv", "Search and analyze arXiv papers — find, summarize, and extract key findings.", "research", ["arxiv", "papers", "research", "academic"], 0.5,
`# arXiv Search

## When to Use
- Finding relevant academic papers
- Literature review
- Staying current with research

## Procedure
1. Search arXiv API with keywords
2. Parse XML response for titles, authors, abstracts
3. Filter by date, category, relevance
4. Read abstract for relevance scoring
5. Download PDF for detailed reading

## Pitfalls
- arXiv API has rate limits
- Preprints are not peer-reviewed
- Search relevance can be noisy

## Verification
- Papers are from target domain
- Abstracts match search criteria
- Recent papers are prioritized`],

  ["research/research-paper-writing", "research-paper-writing", "End-to-end ML paper pipeline: outline, draft, figures, and LaTeX formatting.", "research", ["paper", "writing", "latex", "ml-research"], 0.4,
`# Research Paper Writing

## When to Use
- Writing ML research papers
- Preparing conference submissions
- Creating technical reports

## Procedure
1. Define hypothesis and key contributions
2. Write outline: Abstract, Intro, Related Work, Method, Experiments, Conclusion
3. Create figures and tables
4. Draft each section with clear structure
5. Format in LaTeX with conference template
6. Proofread and verify references

## Pitfalls
- Don't overclaim results
- Related work must be comprehensive
- Figures must be readable in print

## Verification
- Paper follows conference template
- All references cited correctly
- Results are reproducible`],

  ["research/blogwatcher", "blogwatcher", "Monitor RSS feeds for new content from tech blogs and news sources.", "research", ["rss", "monitoring", "blogs", "news"], 0.4,
`# Blogwatcher

## When to Use
- Monitoring tech blogs for new posts
- Tracking information sources
- Competitive intelligence

## Procedure
1. Collect RSS feed URLs
2. Parse feeds: use feedparser library
3. Extract title, link, date, summary
4. Filter by keywords
5. Deduplicate and sort by date
6. Summarize relevant posts

## Pitfalls
- Some sites have broken RSS
- Rate limits on frequent polling
- Handle encoding issues gracefully

## Verification
- All monitored feeds returning data
- No duplicates in output
- Key posts are not missed`],

  ["research/polymarket", "polymarket", "Prediction market data from Polymarket — analyze odds, trends, and market sentiment.", "research", ["prediction-market", "polymarket", "odds", "sentiment"], 0.3,
`# Polymarket

## When to Use
- Gauging market sentiment on events
- Analyzing prediction accuracy
- Understanding probability estimates

## Procedure
1. Access Polymarket API
2. Extract market prices (implied probabilities)
3. Analyze volume and liquidity
4. Track price movements over time
5. Compare with expert predictions

## Pitfalls
- Low-liquidity markets are unreliable
- Prices reflect betting, not true probability
- Market manipulation is possible

## Verification
- Market has sufficient liquidity
- Price movement is not anomalous
- Data timestamp is recent`],

  ["research/llm-wiki", "llm-wiki", "Build interlinked knowledge base — create, link, and query structured notes.", "research", ["wiki", "knowledge-base", "notes", "linking"], 0.4,
`# LLM Wiki

## When to Use
- Building a personal knowledge base
- Organizing research notes
- Creating interlinked documentation

## Procedure
1. Create notes with wiki-style [[links]]
2. Organize by topic with tags
3. Build backlinks index
4. Search via full-text search
5. Generate knowledge graph visualization

## Pitfalls
- Keep notes atomic — one concept per note
- Consistent naming conventions
- Don't forget to update backlinks

## Verification
- All links resolve correctly
- No orphaned notes
- Graph is connected and navigable`],

  // productivity
  ["productivity/google-workspace", "google-workspace", "Gmail, Calendar, Drive, Sheets, and Docs integration for productivity automation.", "productivity", ["google", "gmail", "calendar", "drive", "sheets"], 0.5,
`# Google Workspace

## When to Use
- Automating email workflows
- Managing calendar events
- Reading/writing Google Sheets
- Accessing Drive files

## Procedure
1. Enable Google Workspace APIs in Google Cloud Console
2. Create OAuth2 credentials
3. Authenticate with google-auth library
4. Use respective API clients
5. Handle pagination for large result sets

## Pitfalls
- OAuth scopes must be minimal
- Rate limits: respect quota
- Handle auth token refresh

## Verification
- API calls return expected data
- No permission errors
- Pagination works correctly`],

  ["productivity/notion", "notion", "Notion API for creating, updating, and querying pages and databases.", "productivity", ["notion", "wiki", "database", "pages"], 0.5,
`# Notion

## When to Use
- Managing project wikis
- Tracking tasks in databases
- Creating structured content

## Procedure
1. Create integration at notion.so/my-integrations
2. Get API key and share pages with integration
3. Create pages: POST /v1/pages
4. Query databases: POST /v1/databases/{id}/query
5. Update blocks: PATCH /v1/blocks/{id}

## Pitfalls
- Integration must be explicitly shared with pages
- Rate limit: 3 requests/second
- Rich text formatting is complex

## Verification
- Pages appear in Notion
- Database queries return expected results
- Content formatting is correct`],

  ["productivity/linear", "linear", "Linear issue management — create, update, search issues and projects.", "productivity", ["linear", "issues", "project-management", "tracking"], 0.5,
`# Linear

## When to Use
- Managing bugs and features
- Sprint planning
- Tracking project progress

## Procedure
1. Get API key from Linear Settings > API
2. Create issue: linear issue create
3. List issues: linear issue list --filter status:active
4. Update: linear issue update <id> --status done
5. Use GraphQL API for advanced queries

## Pitfalls
- Team IDs vary per workspace
- Status workflow may differ
- Use labels consistently

## Verification
- Issues appear in Linear UI
- Status transitions are valid
- Assignees and labels correct`],

  ["productivity/ocr-and-documents", "ocr-and-documents", "PDF text extraction, OCR, and document parsing.", "productivity", ["ocr", "pdf", "document", "extraction"], 0.5,
`# OCR and Documents

## When to Use
- Extracting text from PDFs
- Scanning documents
- Converting images to text

## Procedure
1. For digital PDFs: use PyMuPDF or pdfplumber
2. For scanned images: use Tesseract OCR
3. Extract text
4. For tables: use tabula-py or camelot
5. Clean extracted text: normalize whitespace, fix encoding

## Pitfalls
- Scanned PDFs need OCR, not text extraction
- OCR accuracy depends on image quality
- Tables in PDFs are notoriously hard to extract

## Verification
- Extracted text matches visual content
- No missing pages or sections
- Tables retain structure`],

  ["productivity/powerpoint", "powerpoint", "PPTX creation and editing — generate slides, add content, format presentations.", "productivity", ["powerpoint", "pptx", "slides", "presentation"], 0.4,
`# PowerPoint

## When to Use
- Creating presentations programmatically
- Generating reports as slides
- Batch-producing training materials

## Procedure
1. Install: pip install python-pptx
2. Create: prs = Presentation()
3. Add slide: slide = prs.slides.add_slide(layout)
4. Add content: text boxes, shapes, charts, images
5. Save: prs.save('output.pptx')

## Pitfalls
- Slide layouts vary by template
- Font sizing needs manual adjustment
- Images may need resizing

## Verification
- PPTX opens in PowerPoint/LibreOffice
- Content is on correct slides
- Formatting is consistent`],

  ["productivity/maps", "maps", "Geocoding, POI search, and directions using OpenStreetMap/OSM data.", "productivity", ["maps", "geocoding", "osm", "directions"], 0.4,
`# Maps

## When to Use
- Geocoding addresses
- Finding nearby POIs
- Getting directions

## Procedure
1. Geocode: use Nominatim API
2. Reverse geocode: lat/lng to address
3. POI search: use Overpass API
4. Directions: use OSRM or GraphHopper

## Pitfalls
- Nominatim has usage policy: max 1 req/sec
- Geocoding accuracy varies by region
- Rate limiting is strictly enforced

## Verification
- Geocoded coordinates are in expected area
- Directions are reasonable
- POI results match query`],

  ["productivity/nano-pdf", "nano-pdf", "Edit PDFs with natural language commands — add text, merge, split, annotate.", "productivity", ["pdf", "edit", "merge", "split"], 0.4,
`# Nano PDF

## When to Use
- Quick PDF edits
- Merging or splitting PDFs
- Adding annotations or text

## Procedure
1. Read PDF: use PyMuPDF or pdfplumber
2. Add text: locate page and insert text box
3. Merge: combine multiple PDFs
4. Split: extract specific pages
5. Annotate: add highlights, comments, shapes
6. Save: output modified PDF

## Pitfalls
- PDF editing is lossy
- Font embedding may break
- Large PDFs may be slow

## Verification
- Output PDF opens correctly
- Text additions are visible
- Pages are in correct order after merge/split`],

  // media
  ["media/youtube-content", "youtube-content", "Fetch YouTube transcripts, create summaries, and extract key information.", "media", ["youtube", "transcript", "summary", "video"], 0.6,
`# YouTube Content

## When to Use
- Extracting video transcripts
- Summarizing YouTube videos
- Creating notes from video content

## Procedure
1. Get video ID from URL
2. Fetch transcript: youtube-transcript-api or yt-dlp
3. Clean transcript text
4. Summarize key points
5. Extract timestamps for important sections

## Pitfalls
- Not all videos have transcripts
- Auto-generated captions may be inaccurate
- Rate limits on YouTube API

## Verification
- Transcript matches video content
- Summary captures main points
- Timestamps are accurate`],

  ["media/gif-search", "gif-search", "Search Tenor for GIFs to use in messages and responses.", "media", ["gif", "tenor", "search", "reaction"], 0.3,
`# GIF Search

## When to Use
- Adding visual reactions in chat
- Finding relevant GIFs for responses

## Procedure
1. Get Tenor API key from tenor.com
2. Search: Tenor API search endpoint
3. Parse results for GIF URLs
4. Select best match

## Pitfalls
- API key must be kept secret
- Some queries return unexpected results
- Rate limits: 10 req/sec for free tier

## Verification
- GIF URL is accessible
- Content is appropriate
- Matches the search query`],

  ["media/heartmula", "heartmula", "Music generation with AI — create melodies, beats, and full compositions.", "media", ["music", "generation", "ai", "audio"], 0.3,
`# Heartmula Music Generation

## When to Use
- Creating background music
- Generating audio content
- Prototyping musical ideas

## Procedure
1. Define genre, mood, tempo, key
2. Generate prompt for music AI
3. Iterate on output — adjust parameters
4. Post-process: normalize, EQ, compress
5. Export in target format (MP3, WAV)

## Pitfalls
- AI music may have artifacts
- Copyright concerns with AI-generated content
- Quality varies significantly by genre

## Verification
- Audio plays without glitches
- Musical structure makes sense
- Duration matches requirement`],

  ["media/songsee", "songsee", "Audio spectrogram visualization — analyze frequency content of audio files.", "media", ["audio", "spectrogram", "visualization", "analysis"], 0.3,
`# Songsee Audio Visualization

## When to Use
- Analyzing audio frequency content
- Visualizing music structure
- Debugging audio processing

## Procedure
1. Load audio file with librosa
2. Compute spectrogram: librosa.stft(audio)
3. Convert to dB scale
4. Display: matplotlib or plotly
5. Analyze: identify frequencies, onsets, patterns

## Pitfalls
- Different FFT sizes show different detail levels
- Time vs frequency resolution tradeoff
- Spectrograms can be confusing for non-experts

## Verification
- Spectrogram displays expected frequency ranges
- Audio matches visual representation
- Annotations align with actual audio events`],

  // email
  ["email/himalaya", "himalaya", "IMAP/SMTP email management via CLI — read, compose, send, and organize email.", "email", ["email", "imap", "smtp", "himalaya"], 0.4,
`# Himalaya Email

## When to Use
- Managing email from the terminal
- Automating email workflows
- Batch email operations

## Procedure
1. Install: cargo install himalaya
2. Configure IMAP/SMTP in config.toml
3. List: himalaya envelope list
4. Read: himalaya message read <id>
5. Compose and send

## Pitfalls
- IMAP sync can be slow on large mailboxes
- SMTP requires correct authentication
- Handle attachments carefully

## Verification
- Can list and read messages
- Sent messages appear in Sent folder
- Configuration persists across sessions`],

  // data-science
  ["data-science/jupyter-live-kernel", "jupyter-live-kernel", "Live Jupyter kernel access via hamelnb — execute code, get results.", "data-science", ["jupyter", "notebook", "kernel", "data-science"], 0.4,
`# Jupyter Live Kernel

## When to Use
- Interactive data analysis
- Running Python code in a notebook context
- Exploratory data science

## Procedure
1. Start Jupyter kernel
2. Use hamelnb for programmatic access
3. Execute cells and capture output
4. Visualize results with matplotlib/plotly
5. Save notebooks for reproducibility

## Pitfalls
- Kernel state persists between cells
- Long-running cells may timeout
- Memory leaks in long sessions

## Verification
- Code execution returns expected results
- Visualizations render correctly
- Notebook saves and reopens cleanly`],

  // mcp
  ["mcp/native-mcp", "native-mcp", "Built-in MCP client for connecting to MCP servers and using their tools.", "mcp", ["mcp", "protocol", "client", "tools"], 0.6,
`# Native MCP Client

## When to Use
- Connecting to Model Context Protocol servers
- Extending agent capabilities with external tools
- Using MCP-provided resources

## Procedure
1. Configure MCP servers in tekton config
2. Discover: tekton mcp discover
3. List tools: tekton mcp list-servers
4. Call tool: tekton mcp call <server> <tool> <args>
5. Use resources for context

## Pitfalls
- MCP servers must be running and accessible
- Tool schemas must match expected format
- Handle connection timeouts gracefully

## Verification
- MCP servers respond to discovery
- Tools execute and return results
- Resources are accessible`],

  // note-taking
  ["note-taking/obsidian", "obsidian", "Obsidian vault operations — create, search, link, and organize markdown notes.", "note-taking", ["obsidian", "notes", "markdown", "vault"], 0.5,
`# Obsidian

## When to Use
- Managing personal knowledge base
- Creating linked notes
- Organizing research

## Procedure
1. Locate Obsidian vault directory
2. Create notes as .md files with YAML frontmatter
3. Link notes with [[wiki-links]]
4. Use tags for categorization: #tag
5. Search with ripgrep across vault
6. Generate backlinks index

## Pitfalls
- Don't modify .obsidian config files directly
- Keep note titles unique in same folder
- Use consistent frontmatter schema

## Verification
- Notes appear in Obsidian
- Links resolve correctly
- Tags are consistent`],

  // devops
  ["devops/webhook-subscriptions", "webhook-subscriptions", "Set up and manage webhook subscriptions for automated notifications.", "devops", ["webhook", "notifications", "automation", "events"], 0.5,
`# Webhook Subscriptions

## When to Use
- Receiving automated notifications
- Event-driven integrations
- CI/CD pipeline triggers

## Procedure
1. Set up endpoint URL (HTTPS required)
2. Register webhook with provider
3. Verify signature on incoming payloads
4. Process events idempotently
5. Handle retries and failures

## Pitfalls
- Always verify webhook signatures
- Endpoints must be HTTPS
- Handle duplicate events (idempotency)

## Verification
- Webhook fires on expected events
- Endpoint receives and processes payload
- Signature verification passes`],

  // smart-home
  ["smart-home/openhue", "openhue", "Philips Hue control — lights, scenes, groups, and schedules.", "smart-home", ["hue", "lights", "smart-home", "automation"], 0.4,
`# OpenHue

## When to Use
- Controlling Philips Hue lights
- Setting up scenes and schedules
- Home automation routines

## Procedure
1. Discover bridge: curl https://discovery.meethue.com/
2. Register app: POST to /api with devicetype
3. Control lights: PUT /api/{username}/lights/{id}/state
4. Create scenes: PUT /api/{username}/scenes
5. Set schedules: PUT /api/{username}/schedules

## Pitfalls
- Bridge must be on same network
- Rate limit: max 10 commands per second
- Link button must be pressed for initial registration

## Verification
- Lights respond to commands
- Scenes activate correctly
- Schedules fire at configured times`],

  // social-media
  ["social-media/xurl", "xurl", "X/Twitter operations via xurl CLI — post, read, search, and manage tweets.", "social-media", ["twitter", "x", "social-media", "posting"], 0.4,
`# xurl — X/Twitter CLI

## When to Use
- Posting automated tweets
- Reading tweet timelines
- Searching Twitter/X

## Procedure
1. Install xurl CLI
2. Authenticate with X API credentials
3. Post: xurl tweet "Hello world"
4. Read: xurl timeline --count 10
5. Search: xurl search "#topic" --limit 20

## Pitfalls
- Rate limits are strict (300 tweets/3hr)
- API tiers have different access levels
- Don't expose API credentials

## Verification
- Posts appear on timeline
- Search returns relevant results
- Rate limits are respected`],

  // gaming
  ["gaming/minecraft-modpack-server", "minecraft-modpack-server", "Set up and manage Minecraft modded servers with modpack support.", "gaming", ["minecraft", "server", "modpack", "gaming"], 0.3,
`# Minecraft Modpack Server

## When to Use
- Hosting modded Minecraft
- Managing modpack updates
- Setting up multiplayer servers

## Procedure
1. Install Java 17+
2. Download server jar (Forge/Fabric/Quilt)
3. Accept EULA: echo eula=true > eula.txt
4. Install mods into mods/ directory
5. Configure server.properties
6. Start: java -Xmx4G -jar server.jar

## Pitfalls
- Allocate enough RAM (4G+ for modded)
- Mod version compatibility is critical
- Backup world before updates

## Verification
- Server starts without errors
- Players can connect
- Mods load correctly`],

  ["gaming/pokemon-player", "pokemon-player", "Auto-play Pokemon games using emulator control and AI decision-making.", "gaming", ["pokemon", "emulator", "ai-player", "gaming"], 0.2,
`# Pokemon Player

## When to Use
- AI-driven Pokemon gameplay
- Testing battle strategies
- Automating grinding

## Procedure
1. Set up emulator (mGBA recommended)
2. Configure memory mappings for game state
3. Implement battle AI: type effectiveness, switching logic
4. Route planning: minimize random encounters
5. Save state management for risk-free exploration

## Pitfalls
- Memory addresses differ between ROM versions
- Battle AI needs type matchup tables
- Soft locks in certain routes

## Verification
- AI can navigate routes
- Battle decisions are optimal
- No stuck states`],

  // security
  ["security/1password", "1password", "1Password CLI integration — retrieve secrets, manage vaults, automate credential access.", "security", ["1password", "secrets", "vault", "credentials"], 0.5,
`# 1Password

## When to Use
- Retrieving secrets in scripts
- Managing credentials programmatically
- CI/CD secret injection

## Procedure
1. Install: brew install 1password-cli
2. Sign in: op account add
3. List vaults: op vault list
4. Get item: op item get "My Credential" --fields password
5. Use in scripts: export DB_PASS=$(op read op://vault/item/field)

## Pitfalls
- Never echo secrets to console
- Use op read for non-interactive access
- Session timeout requires re-authentication

## Verification
- CLI returns expected credentials
- Secrets are not logged
- Script works in CI environment`],

  ["security/sherlock", "sherlock", "Username reconnaissance — search social media platforms for username availability.", "security", ["sherlock", "username", "osint", "reconnaissance"], 0.3,
`# Sherlock Username Search

## When to Use
- Checking username availability
- OSINT username research
- Account discovery

## Procedure
1. Install: pip install sherlock-project
2. Search: sherlock username
3. Filter results by platform
4. Analyze found accounts

## Pitfalls
- Some platforms rate-limit
- False positives from similar usernames
- Results may include deleted accounts

## Verification
- Confirmed accounts match username exactly
- Platform URLs are valid
- No false positives from similar names`],

  ["security/oss-forensics", "oss-forensics", "Open-source forensics — analyze repositories for security issues, license compliance, and supply chain risks.", "security", ["forensics", "security", "license", "supply-chain"], 0.4,
`# OSS Forensics

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
- SBOM is complete and accurate`],

  // tekton-internal
  ["tekton-internal/scp-delegate", "scp-delegate", "How to delegate tasks via the Sub-agent Communication Protocol (SCP).", "tekton-internal", ["scp", "delegation", "sub-agents", "protocol"], 0.8,
`# SCP Delegate

## When to Use
- Delegating tasks to sub-agents
- Parallel task execution
- Routing tasks to specialized agents

## Procedure
1. Create SCP delegate message with task_id, from, to, task description
2. Set priority: low, normal, or high
3. Optionally include skill_hint for agent routing
4. Optionally restrict tools the sub-agent can use
5. Wait for SCP result or SCP error response
6. Aggregate results from multiple delegates

## Pitfalls
- Always set timeout_ms for delegated tasks
- Don't delegate tasks that share mutable state
- Sub-agents can't see parent context

## Verification
- Result status is 'ok'
- Task completed within timeout
- Tokens used within budget`],

  ["tekton-internal/model-select", "model-select", "When to route to fast vs deep models based on task complexity.", "tekton-internal", ["routing", "models", "complexity", "fast-vs-deep"], 0.8,
`# Model Selection

## When to Use
- Deciding between fast and deep models
- Optimizing cost vs quality
- Routing based on task complexity

## Procedure
1. Score task complexity (0-1)
2. If complexity < 0.3: use fast model
3. If complexity > 0.6: use deep model
4. If 0.3-0.6: use fast model with skill support
5. Override with explicit routing mode if needed

## Pitfalls
- Don't over-route to deep models (costly)
- Simple tasks on deep models waste tokens
- Skill-matched tasks can use fast model even at medium complexity

## Verification
- Routing decision matches task difficulty
- Cost estimate is reasonable
- Quality of output matches expectations`],

  ["tekton-internal/caveman-compress", "caveman-compress", "Compression rules for reducing token usage in communication.", "tekton-internal", ["compression", "tokens", "caveman", "efficiency"], 0.7,
`# Caveman Compress

## When to Use
- Context window approaching limits
- Reduce token usage by 50-75%
- Preserve technical accuracy while cutting noise

## Procedure
1. Identify compression tier: none, lite, full, ultra
2. none: no compression
3. lite: remove articles, contractions, filler words
4. full: lite + phrase substitution + brevity patterns
5. ultra: full + abbreviation dictionary
6. Never compress code blocks, URLs, or quoted strings

## Pitfalls
- Don't compress code — it's already dense
- Ultra mode may lose important context
- Always preserve numbers and technical terms

## Verification
- Compressed version preserves all technical substance
- Compression ratio is 0.25-0.75
- Key terms are retained`],

  ["tekton-internal/self-improve", "self-improve", "Skill extraction procedure — learn from successful task completions.", "tekton-internal", ["learning", "improvement", "skill-extraction"], 0.7,
`# Self-Improve

## When to Use
- After successful task completion
- When a pattern repeats across sessions
- To build personal skill library

## Procedure
1. Review completed task and its evaluation
2. Identify reusable patterns (not one-off solutions)
3. Extract procedure steps from what worked
4. Write SKILL.md with frontmatter and procedure
5. Test the skill on similar tasks
6. Record usage and adjust confidence

## Pitfalls
- Don't extract skills from one-off solutions
- Don't overspecialize — keep skills general
- Always validate extracted skills

## Verification
- Skill follows agentskills.io format
- Confidence starts at 0.5 and adjusts with usage
- Skill is discoverable by search`],

  ["tekton-internal/context-hygiene", "context-hygiene", "Token budget management — keep context lean and relevant.", "tekton-internal", ["context", "tokens", "budget", "hygiene"], 0.8,
`# Context Hygiene

## When to Use
- Context window approaching limits
- After many conversation turns
- When response quality degrades

## Procedure
1. Check token count estimate
2. If < 50%: no action needed
3. If 50-75%: compress with lite tier
4. If 75-90%: compress with full tier, prune old messages
5. If > 90%: compress ultra + aggressive pruning
6. Always preserve: current task, recent tool results, user's latest message

## Pitfalls
- Don't remove the current task context
- Don't prune tool results the agent still needs
- Compression is lossy — accept some information loss

## Verification
- Context fits in window
- Key information preserved
- Agent can still perform the task`],

  ["tekton-internal/train-model", "train-model", "Training orchestration for fine-tuning LLMs — config, data, launch, monitor.", "tekton-internal", ["training", "fine-tuning", "lora", "orchestration"], 0.6,
`# Train Model

## When to Use
- Fine-tuning LLMs for specific tasks
- Creating custom models for your use case
- Experimenting with LoRA/QLoRA

## Procedure
1. Prepare dataset in instruction format
2. Choose base model and training framework (Axolotl, Unsloth, TRL)
3. Configure training: learning rate, epochs, batch size
4. Launch training with proper GPU allocation
5. Monitor loss and validation metrics
6. Evaluate on held-out data
7. Export or merge LoRA weights

## Pitfalls
- Overfitting: always validate on held-out data
- Learning rate too high causes training instability
- LoRA rank tradeoff: higher = better quality but slower
- Always use gradient checkpointing to save memory

## Verification
- Training loss decreases monotonically
- Validation perplexity improves
- Model generates coherent outputs on test prompts
- No NaN loss values`],
];

let count = 0;
for (const [dirPath, name, desc, cat, tags, conf, body] of skills) {
  const fullDir = path.join(BASE, dirPath);
  fs.mkdirSync(fullDir, { recursive: true });
  const tagsStr = tags.map(t => `"${t}"`).join(', ');
  const content = `---\nname: ${name}\ndescription: "${desc}"\nversion: 1.0.0\nmetadata:\n  tekton:\n    tags: [${tagsStr}]\n    category: ${cat}\n    confidence: ${conf}\n---\n\n${body}\n`;
  fs.writeFileSync(path.join(fullDir, 'SKILL.md'), content, 'utf-8');
  count++;
}

console.log(`Created ${count} skills`);