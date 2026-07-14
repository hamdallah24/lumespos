# DOCUMENT ADOPTION GRAPH — Runtime Document Flow

## Current Runtime Adoption Chain

```
User Question
    │
    ▼
[identity.ts] ───────────────────────────── IDENTITIES hardcoded
    │
    ▼
[foundation-loader.ts] ─── reads .ai/* (DOES NOT EXIST on disk)
    │   └── expects: CONSTITUTION.md, PROJECT_CONTEXT.md, foundation/, runtime/, adr/
    │   └── GLOBAL_SYSTEM_PROMPT.md? NO  ← NOT loaded
    │   └── Executive SYSTEM_PROMPT.md? NO  ← NOT loaded
    │   └── Knowledge docs? NO  ← NOT loaded
    │   └── Cognitive docs? NO  ← NOT loaded
    │
    ▼
[knowledge-graph.ts] ─── builds graph from foundation-loader assets
    │   └── Creates KnowledgeNode[] from .ai/ YAML metadata
    │   └── Does NOT read any docs/*.md directly
    │
    ▼
[knowledge-loader.ts] ─── filters + caches KnowledgeNode[]
    │   └── Strategy-based loading (always/conditional/on-demand)
    │
    ▼
[prompt-assembler.ts] ─── assembles LLM prompt
    │   ├── BLOCK 1: Identity → from identity.ts (hardcoded)
    │   ├── BLOCK 2: Foundation Context → from foundation-loader (.ai/)
    │   ├── BLOCK 3: Mission → from mission-engine
    │   ├── BLOCK 4: Decision Context → from context
    │   ├── BLOCK 5: Output Schema → from schema
    │   ├── BLOCK 5.5: Executive Results → from context
    │   ├── BLOCK 6: Tool Rules → from tool rules
    │   └── BLOCK 7: Footer → stream/error policies
    │
    ▼
[runtime-domain.ts] ─── role directives
    │   ├── CEO → "ceo-directive-v1" ← expects .ai/ YAML doc
    │   ├── CTO → "cto-directive-v1" ← expects .ai/ YAML doc
    │   ├── COO → "coo-directive-v1" ← expects .ai/ YAML doc
    │   ├── CFO → "cfo-directive-v1" ← expects .ai/ YAML doc
    │   ├── CMO → MISSING
    │   ├── CAIO → MISSING
    │   └── CKO → MISSING
    │
    ▼
[capability-domain.ts] ─── capability matrices
    │   ├── CEO → hardcoded (6 capabilities)
    │   ├── CTO → hardcoded (7 capabilities)
    │   ├── COO → hardcoded (4 capabilities)
    │   ├── CFO → MISSING
    │   ├── CMO → MISSING
    │   ├── CAIO → MISSING
    │   ├── CKO → MISSING
    │   ├── CHRO → MISSING
    │   └── CIO → MISSING
    │
    ▼
[CognitiveEngine.ts] ─── NEW, NOT WIRED
    │   └── src/executive-runtime/cognition/ BUT NOT IMPORTED by runtime
    │
    ▼
[Executive Programs] ─── CEOProgram, CTOProgram, COOProgram, etc.
    └── Each uses: identity.ts, foundation-loader, prompt-assembler, etc.
    └── None imports CognitiveEngine
    └── None imports ThinkingMode, MentalModelSelector, FrameworkSelector
```

## Documents That Appear in the Graph

| Document | Appears in Graph? | How? |
|---|---|---|
| GLOBAL_SYSTEM_PROMPT.md | ❌ | Never loaded by foundation-loader (no YAML, not in .ai/) |
| SYSTEM_PROMPT_CEO.md, etc. | ❌ | Never loaded by foundation-loader |
| EXECUTIVE_CONSTITUTION.md | ❌ | Never loaded by foundation-loader |
| EXECUTIVE_CAPABILITY_MATRIX.md | ❌ | capability-domain.ts hardcodes instead |
| EXECUTIVE_KNOWLEDGE_TAXONOMY.md | ❌ | Never loaded by runtime |
| KNOWLEDGE_LIFECYCLE.md | ❌ | Never loaded by runtime |
| KNOWLEDGE_VALIDATION_RULES.md | ❌ | Never loaded by runtime |
| KNOWLEDGE_QUALITY_MODEL.md | ❌ | Never loaded by runtime |
| KNOWLEDGE_RETRIEVAL_MODEL.md | ❌ | Never loaded by runtime |
| KNOWLEDGE_CLASSIFICATION.md | ❌ | Never loaded by runtime |
| MENTAL_MODEL_LIBRARY.md (EKS) | ❌ | ECS has its own TypeScript version |
| FRAMEWORK_LIBRARY.md (EKS) | ❌ | ECS has its own TypeScript version |
| PLAYBOOK_CEO.md, etc. | ❌ | Human only — never loaded |
| EXECUTIVE_SPEC.md (all 7) | ❌ | Not loaded by FS (but info mirrored in config.ts) |
| ADR-009 | ❌ | PROPOSED — never adopted |
| All cognition docs | ❌ | Source code exists but NOT wired to runtime |
| All knowledge docs | ❌ | Only exist as blueprints |

## Documents That DO Appear in the Graph

| Document | Appears in Graph? | How? |
|---|---|---|
| ADR-001 through ADR-008 (Set A) | ✅ | Adopted architecture decisions |
| EIOS_API_REFERENCE.md | ✅ | Referenced by eios-runtime/public/ |
| EXECUTIVE_CONFIGURATION.md | ✅ | Mirrors config.ts settings |

## What SHOULD Be in the Graph but ISN'T

1. **GLOBAL_SYSTEM_PROMPT.md** → should be loaded by foundation-loader
2. **All 7 SYSTEM_PROMPT.md files** → should be loaded per-role
3. **EXECUTIVE_CONSTITUTION.md** → should be loaded as foundational knowledge
4. **EXECUTIVE_CAPABILITY_MATRIX.md** → should drive capability-domain.ts
5. **All 6 Knowledge docs (K1-K6)** → should inform Knowledge Engine behavior
6. **Mental Model Library** → should be consumed by Cognitive Engine (partially done in TS)
7. **Framework Library** → should be consumed by Cognitive Engine (partially done in TS)
8. **Decision Pattern Reference** → should inform DecisionPattern.ts behavior
