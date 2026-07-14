# SOURCE OF TRUTH MATRIX — Canonical vs Derived

## Classification

| Status | Meaning |
|---|---|
| **Canonical** | Primary source of truth — single authority |
| **Derived** | Generated or summarized from Canonical |
| **Reference** | Human-readable description of Canonical |
| **Generated** | Produced by tooling (TypeScript compiler, etc.) |
| **Deprecated** | Should not be used |

---

## Domains and Their Source of Truth

### Domain: Executive Identity

| Asset | Status | Notes |
|---|---|---|
| `src/ai/runtime/identity.ts` | **Canonical** | Hardcoded IDENTITIES map |
| `docs/executive-runtime/EXECUTIVE_RUNTIME_HANDBOOK.md` | Reference | Human description |
| **Verdict**: ✅ Single canonical (code) — but missing CAIO, CKO | | |

### Domain: Capability Matrix

| Asset | Status | Notes |
|---|---|---|
| `docs/executive-runtime/EXECUTIVE_CAPABILITY_MATRIX.md` | **Canonical (should be)** | Doc defines full matrix |
| `src/ai/runtime/foundation/domains/capability-domain.ts` | **Duplicate** | Hardcoded subset (CEO/CTO/COO only) |
| `docs/executive-runtime/executives/*/EXECUTIVE_SPEC.md` | Reference | Per-executive description |
| **Verdict**: ⚠️ **DUAL CANONICAL** — doc and code disagree | | |

### Domain: Runtime Directives

| Asset | Status | Notes |
|---|---|---|
| `.ai/foundation/*` (expected) | **Canonical (intended)** | YAML frontmatter expected |
| `src/ai/runtime/foundation/domains/runtime-domain.ts` | **Canonical (actual)** | Hardcoded ROLE_DIRECTIVE_MAP |
| `docs/executive-runtime/executives/*/EXECUTIVE_SPEC.md` | Reference | Human description |
| **Verdict**: ⚠️ DUAL CANONICAL — .ai/ expected but not present; code uses hardcoded IDs | | |

### Domain: System Prompt

| Asset | Status | Notes |
|---|---|---|
| `docs/executive-runtime/executives/*/SYSTEM_PROMPT.md` | **Canonical** | Per-role prompt |
| `docs/executive-runtime/prompts/GLOBAL_SYSTEM_PROMPT.md` | **Canonical** | Global prompt |
| `src/ai/runtime/prompt-assembler.ts` | **Consumer** | Reads via Foundation Loader |
| **Verdict**: ✅ Single canonical per role — but NOT loaded by foundation-loader (no .ai/ YAML) | | |

### Domain: Mental Model Library

| Asset | Status | Notes |
|---|---|---|
| `docs/executive-runtime/knowledge/EXECUTIVE_MENTAL_MODEL_LIBRARY.md` | **Canonical (EKS)** | 46 models |
| `src/executive-runtime/cognition/MentalModelSelector.ts` | **Duplicate (ECS)** | 20 models |
| `docs/executive-runtime/cognition/MENTAL_MODEL_LIBRARY.md` | Reference | ECS summary |
| **Verdict**: ⚠️ **DUAL CANONICAL** — EKS has 46 models, ECS has 20; content differs | | |

### Domain: Framework Library

| Asset | Status | Notes |
|---|---|---|
| `docs/executive-runtime/knowledge/EXECUTIVE_FRAMEWORK_LIBRARY.md` | **Canonical (EKS)** | 29 frameworks |
| `src/executive-runtime/cognition/FrameworkSelector.ts` | **Duplicate (ECS)** | 27 frameworks |
| `docs/executive-runtime/cognition/FRAMEWORK_LIBRARY.md` | Reference | ECS summary |
| **Verdict**: ⚠️ **DUAL CANONICAL** — EKS has 29 frameworks, ECS has 27; content differs | | |

### Domain: Knowledge Taxonomy

| Asset | Status | Notes |
|---|---|---|
| `docs/executive-runtime/knowledge/EXECUTIVE_KNOWLEDGE_TAXONOMY.md` | **Canonical** | 15-branch hierarchy |
| `src/ai/runtime/knowledge-graph.ts` | Not consuming | Graph uses domain from .ai/ YAML, not taxonomy |
| **Verdict**: ⚠️ Canonical defined but NOT adopted by runtime | | |

### Domain: Knowledge Lifecycle

| Asset | Status | Notes |
|---|---|---|
| `docs/executive-runtime/knowledge/KNOWLEDGE_LIFECYCLE.md` | **Canonical** | 12-stage lifecycle |
| `src/ai/runtime/knowledge/knowledge-lifecycle.ts` | **Derived** | Implements different logic |
| **Verdict**: ⚠️ Canonical doc ≠ runtime implementation | | |

### Domain: Decision Pattern

| Asset | Status | Notes |
|---|---|---|
| `src/executive-runtime/cognition/DecisionPattern.ts` | **Canonical** | TypeScript implementation |
| `docs/executive-runtime/cognition/DECISION_PATTERN_REFERENCE.md` | Reference | Human-readable |
| **Verdict**: ✅ Single canonical (code) | | |

### Domain: ADR Records

| Asset | Status | Notes |
|---|---|---|
| `Point-Of-Sale/docs/architecture/ADR-001 through ADR-008` | **Canonical (Set A)** | Architecture decisions |
| `Point-Of-Sale/artifacts/api-server/docs/architecture/ADR-001 through ADR-008` | **Duplicate (Set B)** | Different content, same numbers |
| `docs/executive-runtime/knowledge/ADR-009-knowledge-system-unification.md` | **Canonical** | Proposed |
| **Verdict**: ⚠️ **DUAL CANONICAL** — ADR-001 through ADR-008 exist in TWO sets with DIFFERENT content | | |

### Domain: Thinking Mode

| Asset | Status | Notes |
|---|---|---|
| `src/executive-runtime/cognition/ThinkingMode.ts` | **Canonical** | TypeScript implementation |
| `docs/executive-runtime/cognition/THINKING_MODE_REFERENCE.md` | Reference | Human-readable |
| **Verdict**: ✅ Single canonical (code) | | |

### Domain: Capability (eios-runtime/public/)

| Asset | Status | Notes |
|---|---|---|
| `src/eios-runtime/public/ExecutiveDispatchRegistry.ts` | **Canonical** | Runtime public API |
| `src/eios-runtime/public/PipelineContext.ts` | **Canonical** | Pipeline context |
| `docs/Point-Of-Sale/EIOS_API_REFERENCE.md` | Reference | Human-readable |
| **Verdict**: ✅ Single canonical (code) | | |

---

## Summary

| Domain | Status | Action Required |
|---|---|---|
| Executive Identity | ✅ Canonical (code) | Add CAIO, CKO |
| Capability Matrix | ⚠️ Dual Canonical | Reconcile doc + code; add 5 missing executives |
| Runtime Directives | ⚠️ Dual Canonical | Align .ai/ expectations with runtime-domain.ts |
| System Prompt | ✅ Canonical (doc) | Add YAML frontmatter for foundation-loader |
| Mental Model Library | ⚠️ **DUAL CANONICAL** | Reconcile EKS (46) vs ECS (20) |
| Framework Library | ⚠️ **DUAL CANONICAL** | Reconcile EKS (29) vs ECS (27) |
| Knowledge Taxonomy | ⚠️ Canonical not adopted | Wire taxonomy into knowledge-graph |
| Knowledge Lifecycle | ⚠️ Doc ≠ Implementation | Align knowledge-lifecycle.ts with lifecycle doc |
| Decision Pattern | ✅ Canonical (code) | — |
| ADR Records | ⚠️ **DUAL SETS** | Rename Set A to WADR-001 through WADR-008 |
| Thinking Mode | ✅ Canonical (code) | — |

## Conflict Count

| Type | Count |
|---|---|
| ✅ Single canonical | 4 |
| ⚠️ Dual Canonical | 5 |
| ⚠️ Canonical not adopted | 3 |
| Total domains audited | 12 |
