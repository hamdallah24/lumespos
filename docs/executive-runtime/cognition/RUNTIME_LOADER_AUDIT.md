# RUNTIME LOADER AUDIT — What runtime loaders actually read

## Loader 1: Foundation Loader (`src/ai/runtime/foundation-loader.ts`)

### What it reads
- `.ai/foundation/` directory — all .md files with YAML frontmatter
- `.ai/runtime/` directory — blueprints and specs
- `.ai/adr/` directory — architecture decision records
- `.ai/CONSTITUTION.md` — if exists
- `.ai/PROJECT_CONTEXT.md` — if exists

### What it expects
- YAML frontmatter: `id`, `title`, `domain`, `artifact_type`, `knowledge_level`, `context_priority`, `loading_strategy`, `depends_on`, `consumers`, `stability`, `version`
- Files must have `id` in frontmatter to be loaded

### What it does NOT read
- ❌ `docs/executive-runtime/prompts/GLOBAL_SYSTEM_PROMPT.md` — no .ai/ path, no YAML
- ❌ `docs/executive-runtime/executives/*/SYSTEM_PROMPT.md` — same reason
- ❌ `docs/executive-runtime/executives/*/EXECUTIVE_SPEC.md` — same reason
- ❌ `docs/executive-runtime/executives/*/PLAYBOOK.md` — same reason
- ❌ `docs/executive-runtime/knowledge/*.md` — same reason
- ❌ `docs/executive-runtime/cognition/*.md` — same reason
- ❌ `docs/executive-runtime/EXECUTIVE_CONSTITUTION.md` — same reason
- ❌ `docs/executive-runtime/EXECUTIVE_CAPABILITY_MATRIX.md` — same reason
- ❌ `docs/Point-Of-Sale/PROJECT_CONTEXT.md` — wrong location (expected at root `.ai/`)

### Gap Analysis
| Gap | Severity | Detail |
|---|---|---|
| .ai/ directory does NOT exist | **CRITICAL** | Foundation loader returns empty assets; no knowledge loaded |
| No docs have YAML frontmatter | **CRITICAL** | Even if .ai/ existed, docs lack required metadata |
| No knowledge doc mapping | **HIGH** | All 6 knowledge docs inaccessible to runtime |
| No cognitive doc mapping | **HIGH** | All cognitive docs inaccessible to runtime |
| PROJECT_CONTEXT.md misplaced | MEDIUM | At `Point-Of-Sale/docs/` instead of root |

---

## Loader 2: Knowledge Loader (`src/ai/runtime/knowledge-loader.ts`)

### What it reads
- `knowledge-graph.ts` — built from foundation-loader assets
- `knowledge-repository.ts` — cache layer

### What it expects
- `KnowledgeNode` objects with: id, domain, knowledgeLevel, loadingStrategy, artifactType, etc.
- Strategy parameter: "always", "conditional", "on-demand", "all"

### What it does NOT read
- ❌ `knowledge/*.md` — no direct filesystem reads
- ❌ Content — uses `foundationLoader.load()` for content (which returns empty)
- ❌ Knowledge taxonomy — no taxonomy-based filtering
- ❌ Knowledge quality — no quality filtering
- ❌ Mental models — no mental model awareness
- ❌ Frameworks — no framework awareness

### Gap Analysis
| Gap | Severity | Detail |
|---|---|---|
| Returns empty (foundation-loader empty) | **CRITICAL** | Cascading from foundation-loader |
| No taxonomy-based filtering | MEDIUM | Knowledge graph not organized by taxonomy |
| No quality-aware filtering | LOW | Knowledge quality not factored |
| No cognitive integration | MEDIUM | Not called by CognitiveEngine |
| No content returned | **CRITICAL** | loadWithContent() returns empty assets |

---

## Loader 3: Prompt Assembler (`src/ai/runtime/prompt-assembler.ts`)

### What it reads
- `identity.ts` — AgentIdentity for role info
- `foundation-loader.ts` — KnowledgeAsset[] for foundation context
- `context-builder.ts` — ContextPackageV1 for context assembly

### What it does NOT read
- ❌ SYSTEM_PROMPT.md files — NOT directly; identity block is built from identity.ts
- ❌ GLOBAL_SYSTEM_PROMPT.md — NOT directly; foundation context comes from .ai/
- ❌ Executive SPEC docs — NOT directly
- ❌ Mental Model Library — NOT referenced
- ❌ Framework Library — NOT referenced
- ❌ Knowledge Taxonomy — NOT referenced
- ❌ Decision Pattern — NOT referenced

### Gap Analysis
| Gap | Severity | Detail |
|---|---|---|
| Prompt assembler constructs identity from code, not docs | MEDIUM | SYSTEM_PROMPT.md content should inform prompt assembly |
| Foundation context empty (cascading) | **CRITICAL** | No knowledge reaches the LLM |
| No mental model injection | MEDIUM | Mental models not included in prompt |
| No framework injection | MEDIUM | Frameworks not included in prompt |
| No decision pattern injection | MEDIUM | Decision patterns not part of prompt |

---

## Loader 4: Cognitive Engine (`src/executive-runtime/cognition/CognitiveEngine.ts`)

### What it reads
- `CognitiveContracts.ts` — types
- `CognitivePipeline.ts` — pipeline
- `ExecutiveThinkingProfiles.ts` — profiles

### What it does NOT read
- ❌ Any knowledge docs
- ❌ Any mental model docs (uses TypeScript built-in)
- ❌ Any framework docs (uses TypeScript built-in)
- ❌ RuntimeFacade (only type-imported, not actively used)
- ❌ Foundation loader
- ❌ Knowledge loader

### Gap Analysis
| Gap | Severity | Detail |
|---|---|---|
| NOT WIRED to executive-runtime/index.ts | **CRITICAL** | CognitiveEngine exists but never called |
| EvidenceBuilder uses simulation | MEDIUM | Should connect to knowledge-loader |
| NOT imported by any executive program | **CRITICAL** | CEOProgram, CTOProgram, etc. don't use it |
| No runtime bridge | MEDIUM | ThinkOptions accepts context but not wired to RuntimeFacade |

---

## Loader 5: Runtime Domain (`src/ai/runtime/foundation/domains/runtime-domain.ts`)

### What it reads (or tries to)
- `foundation-cache.ts` — getAsset("ceo-directive-v1"), getAsset("cto-directive-v1"), etc.

### What it expects
- Assets with IDs: ceo-directive-v1, cto-directive-v1, coo-directive-v1, cfo-directive-v1

### What it does NOT read
- ❌ CMO → missing asset ID
- ❌ CAIO → missing asset ID
- ❌ CKO → missing asset ID

### Gap Analysis
| Gap | Severity | Detail |
|---|---|---|
| CMO, CAIO, CKO have NO directives | HIGH | 3 executives missing from runtime-domain.ts |
| Foundation cache returns null | **CRITICAL** | No .ai/ files to load into cache |
| Authority hardcoded string checks | LOW | Not data-driven |

---

## Loader 6: Capability Domain (`src/ai/runtime/foundation/domains/capability-domain.ts`)

### What it reads
- Hardcoded `CAPABILITY_MATRIX` in code
- Attempts `getAssetContent("ceo-capability-v1")` but silently catches errors

### What it expects
- Assets: ceo-capability-v1, cto-capability-v1 (for future data-driven loading)

### What it does NOT read
- ❌ EXECUTIVE_CAPABILITY_MATRIX.md — not referenced
- ❌ CFO, CMO, CAIO, CKO, CHRO, CIO capabilities — all missing

### Gap Analysis
| Gap | Severity | Detail |
|---|---|---|
| 6 executives missing | **CRITICAL** | CFO, CMO, CAIO, CKO, CHRO, CIO have NO capabilities in code |
| Hardcoded instead of data-driven | MEDIUM | Should read from foundation assets |
| Silent catch on load | LOW | Failure hidden |

---

## Loader Health Summary

| Loader | Input Source | Status | Empty Result? | Missing Executives |
|---|---|---|---|---|
| Foundation Loader | .ai/ (filesystem) | ❌ BROKEN | ✅ (dir missing) | — |
| Knowledge Loader | KnowledgeGraph ← Foundation | ❌ BROKEN | ✅ (cascading) | — |
| Prompt Assembler | Identity + Foundation | ⚠️ PARTIAL | ✅ (context empty) | — |
| Cognitive Engine | TypeScript built-in | ❌ NOT WIRED | — | — |
| Runtime Domain | Foundation Cache | ❌ BROKEN | ✅ (cache empty) | CMO, CAIO, CKO |
| Capability Domain | Hardcoded | ⚠️ PARTIAL | — | CFO, CMO, CAIO, CKO, CHRO, CIO |

**Loaders in working state: 0/6**
**Loaders returning data: 2/6 (capability hardcoded + identity hardcoded)**
**Loaders fully functional: 0/6**
