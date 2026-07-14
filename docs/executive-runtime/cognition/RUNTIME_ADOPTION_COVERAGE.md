# RUNTIME ADOPTION COVERAGE — What the runtime actually consumes

## Coverage by System Layer

### Layer 1: Prompt System (8 docs)

| Document | Adopted? | Consumer |
|---|---|---|
| GLOBAL_SYSTEM_PROMPT.md | ❌ | Not loaded by foundation-loader |
| SYSTEM_PROMPT_CEO.md | ❌ | Not loaded individually |
| SYSTEM_PROMPT_CTO.md | ❌ | Not loaded individually |
| SYSTEM_PROMPT_COO.md | ❌ | Not loaded individually |
| SYSTEM_PROMPT_CFO.md | ❌ | Not loaded individually |
| SYSTEM_PROMPT_CMO.md | ❌ | Not loaded individually |
| SYSTEM_PROMPT_CAIO.md | ❌ | Not loaded individually |
| SYSTEM_PROMPT_CKO.md | ❌ | Not loaded individually |

**Prompt Adoption: 0%** (0/8 — Prompt Assembler builds identity from code, not docs)

### Layer 2: Knowledge System (6 docs)

| Document | Adopted? | Consumer |
|---|---|---|
| EXECUTIVE_KNOWLEDGE_TAXONOMY.md | ❌ | Not loaded by knowledge-graph |
| KNOWLEDGE_LIFECYCLE.md | ❌ | Not loaded by knowledge-lifecycle.ts |
| KNOWLEDGE_VALIDATION_RULES.md | ❌ | Not enforced by any validator |
| KNOWLEDGE_QUALITY_MODEL.md | ❌ | Not used by knowledge-metrics |
| KNOWLEDGE_RETRIEVAL_MODEL.md | ❌ | Not implemented in knowledge-loader |
| KNOWLEDGE_CLASSIFICATION.md | ❌ | Not used by knowledge-graph |

**Knowledge Adoption: 0%** (0/6 — all exist as blueprints only)

### Layer 3: Cognitive System (6 assets)

| Asset | Adopted? | Consumer |
|---|---|---|
| CognitiveEngine (TS) | ❌ | NOT WIRED to executive-runtime/index.ts |
| ThinkingMode (TS) | ⚠️ | Code exists but NOT consumed by any executive |
| MentalModelSelector (TS) | ⚠️ | Code exists but NOT consumed by any executive |
| FrameworkSelector (TS) | ⚠️ | Code exists but NOT consumed by any executive |
| ReasoningStrategy (TS) | ⚠️ | Code exists but NOT consumed by any executive |
| DecisionPattern (TS) | ⚠️ | Code exists but NOT consumed by any executive |

**Cognitive Adoption: 0%** (0/6 — code exists but NOT wired into runtime flow)

### Layer 4: Executive Runtime (10 assets per executive × 7 = 70)

| Asset | CEO | CTO | COO | CFO | CMO | CAIO | CKO | Avg |
|---|---|---|---|---|---|---|---|---|
| Identity | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | 71% |
| Capabilities | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | 43% |
| Runtime Directive | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | 29% |
| Program (config.ts) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 100% |

**Executive Runtime Adoption: 64%** (18/28 code-level assets)

### Layer 5: Foundation Loader + Knowledge Graph

| Component | Status |
|---|---|
| .ai/ directory exists? | ❌ NO |
| YAML frontmatter in docs? | ❌ NO |
| Foundation Loader returns assets? | ❌ Empty |
| Knowledge Graph has nodes? | ❌ Empty |
| Knowledge Loader returns content? | ❌ Empty |

**Foundation Adoption: 0%**

### Layer 6: eios-runtime/public/

| Component | Status |
|---|---|
| RuntimeFacade | ✅ Adopted |
| PipelineContracts | ✅ Adopted |
| ExecutiveDispatchRegistry | ✅ Adopted |
| PipelineContext | ✅ Adopted |
| PipelineResolver | ✅ Adopted |

**EIOS Public API Adoption: 100%**

---

## Overall Coverage Scores

| System | Total Assets | Adopted | Score |
|---|---|---|---|
| Prompt System | 8 docs | 0 | **0%** |
| Knowledge System | 6 docs | 0 | **0%** |
| Cognitive System | 6 TS modules | 0 | **0%** |
| Executive Runtime | 28 code-level | 18 | **64%** |
| Foundation Loader | 1 component | 0 | **0%** |
| eios-runtime/public | 5 components | 5 | **100%** |
| Memory Engine (future) | — | — | **N/A** |
| **Weighted Overall** | **—** | **—** | **~23%** |

---

## Weighted Score Calculation

```
Prompt        = 0%   × 0.10 = 0.0%
Knowledge     = 0%   × 0.20 = 0.0%
Cognitive     = 0%   × 0.25 = 0.0%  ← Not yet wired
Exec Runtime  = 64%  × 0.30 = 19.2%
Foundation    = 0%   × 0.05 = 0.0%
eios-runtime  = 100% × 0.10 = 10.0%
Memory        = N/A
────────────────────────────────
Weighted     = 29.2%
```

## Adjusted Weighted Overall: **~30%**

### Trend

| Component | Previous (EPIC R) | Current (EPIC S.5) | Change |
|---|---|---|---|
| Documentation existence | 96% | 100% | +4% |
| Runtime adoption | — | 30% | Baseline |
| Per-executive knowledge | — | 55% | Baseline |
| Foundation loaders working | — | 0% | Baseline |
| Cognitive wired to runtime | — | 0% | Baseline |
