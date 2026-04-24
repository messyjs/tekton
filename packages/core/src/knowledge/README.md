# Knowledge Librarian

The Knowledge Librarian is a Tekton-level subsystem that auto-injects relevant reference material from a local document library into LLM conversations based on detected topics.

## Architecture

```
User drops documents → KnowledgeIngestor → KnowledgeIndexStore (SQLite + FTS5)
                                              ↓
User message → KnowledgeLibrarian.detectTopics() → keyword scan / LLM
                                              ↓
                                   searchByTopics() + searchByText()
                                              ↓
                              formatted injection → prepended to LLM context
```

## Components

### KnowledgeIngestor
- Parses PDF, DOCX, PPTX via Docling sidecar
- Reads MD, TXT directly
- Chunks documents (500-800 tokens, section-boundary-aware, 50-token overlap)
- Auto-tags topics per chunk (keyword heuristic + optional LLM)
- Detects duplicates via file hash

### KnowledgeIndexStore
- SQLite-backed with FTS5 full-text search
- Stores documents and chunks with topic tags
- Search by text (FTS5 or LIKE fallback), by topic, by document

### KnowledgeLibrarian
- Two-phase topic detection: fast keyword scan → LLM fallback
- Auto-injection: detects topics in conversation → finds relevant chunks → formats and injects
- Token budget: max 1500 tokens, max 3 chunks per injection
- Injection is NOT stored in conversation history — it's ephemeral

## Configuration

```yaml
knowledge:
  enabled: false          # Off by default until user adds documents
  storePath: ~/.tekton/knowledge/
  indexPath: ~/.tekton/knowledge/index/
  autoInject: true
  maxInjectTokens: 1500
  maxInjectChunks: 3
  embeddingModel: text-embedding-3-small
  topics: {}              # Populated by ingestor auto-tagging
```

## CLI Commands

```
/tekton:knowledge          — Show status
/tekton:knowledge add <path> — Ingest a file or directory
/tekton:knowledge list     — List all documents
/tekton:knowledge search "<query>" — Search the library
/tekton:knowledge topics  — List all detected topics
/tekton:knowledge remove <id> — Remove a document
/tekton:knowledge rebuild — Re-index all documents
/tekton:knowledge on      — Enable auto-injection
/tekton:knowledge off     — Disable auto-injection
```

## API Endpoints

```
GET  /api/knowledge/status        — enabled, document count, topics
GET  /api/knowledge/documents     — list all documents
GET  /api/knowledge/documents/:id — document detail
POST /api/knowledge/search        — search with query body
POST /api/knowledge/ingest        — ingest file
DELETE /api/knowledge/documents/:id — remove document
```

## Context Engineer

The Context Engineer is the default mode for active sessions, providing:
- **Precision Log**: Extracts exact values, file paths, decisions from conversation
- **Rolling Context Rewrites**: Summarizes older messages into clean prose
- **Raw Window**: Last N messages at full fidelity

### Configuration

```yaml
contextEngineer:
  enabled: true
  model: gemini-flash          # Cheap model for extraction/rewrite
  rawWindowSize: 12            # Messages kept at full fidelity
  rewriteInterval: 10          # Rewrite every N messages
  maxPrecisionLogTokens: 2000
  maxRollingContextTokens: 3000
  fallbackToCompression: caveman-compact

session:
  contextMode: context-engineer  # context-engineer | caveman | raw
```

### CLI Commands

```
/tekton:context          — Show status
/tekton:context on       — Enable Context Engineer
/tekton:context off      — Disable, fall back to caveman
/tekton:context stats    — Show compression ratio, precision items
/tekton:context pin "<text>" — Pin a precision item
/tekton:context log      — Show current precision log
/tekton:context mode <mode>  — Switch context mode
```

### API Endpoints

```
GET  /api/context/status  — enabled, stats
GET  /api/context/log     — current precision log
POST /api/context/pin     — pin an item
```